# Componentry

> An AI-native Configure, Price, Quote (CPQ) system that lets PC hardware suppliers generate compatibility-guaranteed quotations in under a minute.

---

## The problem

When a PC store receives a customer's build request, they relay it to their hardware supplier for a quotation. Today that process looks like this:

- Sales staff manually cross-reference component lists against an outdated spreadsheet
- Compatibility is checked from memory — wrong socket types and undersized PSUs happen
- Each quote takes **20 to 40 minutes** to produce
- By the time the quote reaches the customer, stock may already be gone

Existing CPQ software (Salesforce CPQ, Oracle CPQ, SAP CPQ) costs hundreds of dollars per user per month and requires months of IT implementation. SME hardware suppliers have no viable option.

## The solution

Componentry is an AI agent that takes a plain-English brief and a budget, then autonomously:

1. Filters the supplier's catalog to in-stock products only
2. Selects a compatible set of components within the budget, weighted by use case
3. Validates every hard compatibility constraint through a rule-based engine
4. Self-corrects and retries if any constraint fails
5. Returns a professional quote with per-part reasoning and cheaper/premium alternatives

**End-to-end in under a minute. No IT team. No configuration.**

---

## Architecture

```
                        ┌─────────────────────────────────┐
                        │           FastAPI backend        │
                        │                                  │
 POST /quote/stream ───►│  1. Filter in-stock products     │
 { brief, budget }      │  2. AI agent selects components  │
                        │  3. Compatibility engine checks  │◄── compat.py
                        │  4. Retry loop if checks fail    │    (6 hard rules)
                        │  5. Enrich with names + reasoning│
                        │  6. Stream status events via SSE │
                        └────────────────┬────────────────┘
                                         │ Server-Sent Events
                                         ▼
                        ┌─────────────────────────────────┐
                        │         Next.js frontend         │
                        │                                  │
                        │  Live step-by-step status feed   │
                        │  Full quote with alternatives    │
                        │  Per-part reasoning display      │
                        └─────────────────────────────────┘
```

### How the agent works

The system uses a **hybrid AI + rule-based architecture**. The AI handles judgment (use-case understanding, budget allocation, part selection). The compatibility engine handles facts (hard rules that cannot be left to model discretion).

```
Brief + budget
      │
      ▼
Filter catalog → in-stock only
      │
      ▼
Gemini 2.5 Flash selects 8 parts (CPU, GPU, motherboard, RAM, storage, PSU, cooler, case)
      │
      ▼
Budget check → over budget? inject overage into prompt → retry
      │
      ▼
Compatibility engine (compat.py)
   ├── CPU socket == motherboard socket
   ├── RAM type == motherboard RAM type
   ├── PSU wattage >= CPU TDP + GPU TDP + 150W overhead
   ├── Cooler supports CPU socket
   ├── Cooler TDP capacity >= CPU TDP
   └── Case form factor fits motherboard
      │
      ├── Errors found? inject into prompt → retry (max 3 attempts)
      │
      └── All clear → format quote → stream result
```

The compatibility engine is deterministic and fast — it never delegates hard constraints to the model. If the AI selects an AM5 CPU with an LGA1700 motherboard, the engine catches it and the agent re-selects with the specific error injected back into context.

---

## Project structure

```
componentry/
├── backend/
│   ├── agent.py          # AI agent — Gemini call, retry loop, SSE status events
│   ├── compat.py         # Rule-based compatibility engine (6 rules, 0 AI)
│   ├── main.py           # FastAPI app — /quote and /quote/stream endpoints
│   ├── test_system.py    # Unit + integration test suite (pytest)
│   └── data/
│       ├── catalog.json  # 32 SKUs across 8 categories (supplier's product list)
│       └── inventory.json# Stock levels per product ID
└── frontend/
    └── ...               # Next.js interface
```

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env and add your key
echo "GEMINI_API_KEY=your_key_here" > .env

python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`. The backend API runs at `http://localhost:8000`.

---

## API reference

### `POST /quote`

Generates a quote synchronously.

**Request**
```json
{
  "brief": "4K gaming build, some light video editing",
  "budget": 8000
}
```

**Response**
```json
{
  "quote_id": "NX-A3K9XZ",
  "brief": "4K gaming build, some light video editing",
  "budget": 8000,
  "total": 7650,
  "savings": 350,
  "generated_at": "2025-01-15 14:32",
  "parts": {
    "gpu": {
      "id": "gpu-003",
      "name": "NVIDIA RTX 4070",
      "price": 2399,
      "reasoning": "Best 1440p/4K performance within the allocated budget tier.",
      "alternatives": {
        "down": { "id": "gpu-002", "tradeoff": "Saves RM500 — suited for 1080p only." },
        "up":   { "id": "gpu-004", "tradeoff": "+25% performance — better for native 4K." }
      }
    }
  }
}
```

Minimum budget: RM 3,800.

### `POST /quote/stream`

Same as `/quote` but streams live status events via Server-Sent Events as the agent works. The frontend uses this endpoint to show real-time progress.

```
data: {"step": "filtering",  "message": "Scanning inventory for in-stock products..."}
data: {"step": "ai",         "message": "Asking Gemini to select parts (attempt 1/3)..."}
data: {"step": "compat",     "message": "Running compatibility checks..."}
data: {"step": "done",       "message": "All checks passed. Build is valid!"}
data: {"step": "result",     "data": { ...full quote object... }}
```

### `GET /health`

Returns `{"status": "ok"}`.

---

## Compatibility rules

The engine in `compat.py` enforces six hard rules. These run after every AI selection and after every retry.

| Rule | Constraint |
|---|---|
| CPU ↔ motherboard socket | Must match exactly (e.g. AM5 = AM5, LGA1700 = LGA1700) |
| RAM ↔ motherboard type | DDR4 board requires DDR4 RAM; DDR5 board requires DDR5 RAM |
| PSU wattage | Must meet or exceed CPU TDP + GPU TDP + 150W system overhead |
| Cooler socket support | Cooler must explicitly list the CPU socket in its support array |
| Cooler TDP capacity | Must meet or exceed CPU TDP rating |
| Case form factor | ATX case fits ATX/mATX/mITX; mATX fits mATX/mITX only |

---

## Running tests

```bash
cd backend

# Fast tests only (no API calls, no quota used)
pytest test_system.py -m "not integration"

# Full suite including real Gemini calls (slow, costs quota)
pytest test_system.py -m integration -s

# Verify compatibility engine in isolation
python compat.py
```

The test suite covers input validation, response structure, agent unit behaviour, compatibility edge cases, and end-to-end integration tests with real AI calls.

---

## Why existing solutions don't work for SMEs

| Product | Cost | Deployment |
|---|---|---|
| Salesforce CPQ | ~RM 350–700 / user / month | Months of IT implementation |
| Oracle CPQ | Six-figure annual contracts | Dedicated implementation team |
| SAP CPQ | Enterprise pricing | Global IT infrastructure required |
| **Componentry** | **Fraction of the cost** | **Running in under a day** |

Beyond cost, traditional CPQ requires a human to manually configure every compatibility rule — "if CPU socket is LGA1700, motherboard must also be LGA1700" — across thousands of product combinations. That work takes months and breaks every time a new product launches.

Componentry is AI-native. Compatibility is understood from the model's training, not configured by a human. A supplier uploads their catalog and is quoting in minutes.

---

## Scalability

The current implementation uses JSON files for the catalog and inventory. In a production deployment:

- `catalog.json` and `inventory.json` are replaced with Supabase (PostgreSQL) queries — the agent interface does not change
- A `catalog/loader.py` script handles CSV/Excel imports from the supplier's existing spreadsheets
- Multiple suppliers are supported through row-level security on the Supabase tables
- The FastAPI backend deploys to any cloud provider; the stateless design scales horizontally

---

## Built with

- [FastAPI](https://fastapi.tiangolo.com/) — backend API and SSE streaming
- [Google Gemini 2.5 Flash](https://deepmind.google/technologies/gemini/) — AI component selection and reasoning
- [Next.js](https://nextjs.org/) — frontend
- [pytest](https://pytest.org/) — test suite