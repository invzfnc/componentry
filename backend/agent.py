import json, re
import os
from dotenv import load_dotenv
from google import genai
from compat import check_compatibility

load_dotenv()

SYSTEM_PROMPT = """
You are a technical sales engineer at a PC hardware supplier.
Select one product per category that fits the client brief within budget.

RULES:
- Select exactly one product per category
- Total price must not exceed the budget
- Only select products where stock > 0
- CPU socket MUST match motherboard socket
- RAM type MUST match motherboard RAM type
- PSU wattage must exceed CPU TDP + GPU TDP + 150W overhead
- Cooler must support the CPU socket

Return ONLY valid JSON. No explanation, no markdown:
{
  "selected": {
    "cpu":         "<product_id>",
    "motherboard": "<product_id>",
    "gpu":         "<product_id>",
    "ram":         "<product_id>",
    "storage":     "<product_id>",
    "psu":         "<product_id>",
    "cooler":      "<product_id>",
    "case":        "<product_id>"
  },
  "reasoning": {
    "cpu":         "One sentence why.",
    "motherboard": "One sentence why.",
    "gpu":         "One sentence why.",
    "ram":         "One sentence why.",
    "storage":     "One sentence why.",
    "psu":         "One sentence why.",
    "cooler":      "One sentence why.",
    "case":        "One sentence why."
  },
  "alternatives": {
    "cpu":         { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "motherboard": { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "gpu":         { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "ram":         { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "storage":     { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "psu":         { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "cooler":      { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } },
    "case":        { "down": { "id": "<product_id>", "tradeoff": "What they save and lose." }, "up": { "id": "<product_id>", "tradeoff": "What they gain and pay more." } }
  }
}
"""

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

def generate_quote(brief: str, budget: float, catalog: dict, inventory: dict,
                   on_status=None) -> dict:

    def emit(step: str, message: str, **extra):
        print(f"[{step}] {message}")
        if on_status:
            on_status({"step": step, "message": message, **extra})

    # Step 1 — filter to in-stock products only
    emit("filtering", "Scanning inventory for in-stock products...")
    available = {
        pid: product
        for pid, product in catalog.items()
        if inventory.get(pid, {}).get("stock", 0) > 0
    }
    emit("filtering", f"{len(available)} products available across all categories.")

    user_message = f"""
CLIENT BRIEF: {brief}
BUDGET: RM {budget:,.0f}
AVAILABLE CATALOG: {json.dumps(available)}

Total of all selected parts must be <= RM {budget:,.0f}.
"""

    for attempt in range(3):

        # Step 2 — call the AI
        emit("ai", f"Asking Gemini to select parts (attempt {attempt + 1}/3)...")
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_message,
            config={"system_instruction": SYSTEM_PROMPT},
        )
        emit("ai", "Gemini responded. Parsing selection...")

        raw = response.text

        # Step 3 — parse JSON (strip markdown fences if present)
        cleaned = re.sub(r"```json|```", "", raw).strip()
        result  = json.loads(cleaned)

        # Step 4 — resolve product IDs to full product objects
        emit("resolving", "Resolving product IDs from catalog...")
        parts = {
            category: available[pid]
            for category, pid in result["selected"].items()
            if pid in available
        }
        for cat, pid in result["selected"].items():
            name = available.get(pid, {}).get("name", pid)
            emit("resolving", f"  {cat}: {name}", category=cat, product_id=pid, product_name=name)

        # Step 5 — check budget
        total = sum(p.get("price", 0) for p in parts.values())
        emit("budget", f"Calculating total cost... RM {total:,.0f} / RM {budget:,.0f}", total=total, budget=budget)
        if total > budget:
            overage = total - budget
            emit("budget", f"Over budget by RM {overage:,.0f}. Retrying with cheaper parts.", overage=overage)
            user_message += f"\n\nBudget exceeded by RM {overage:,.0f} (total RM {total:,.0f}, limit RM {budget:,.0f}). Choose cheaper parts."
            continue

        emit("budget", f"Budget OK. RM {budget - total:,.0f} remaining.", savings=budget - total)

        # Step 6 — run compatibility engine
        emit("compat", "Running compatibility checks...")
        emit("compat", "  Checking CPU and motherboard socket...")
        emit("compat", "  Checking RAM type...")
        emit("compat", "  Checking PSU wattage...")
        emit("compat", "  Checking cooler socket support & TDP...")
        emit("compat", "  Checking case form factor...")
        errors = check_compatibility(parts)

        if not errors:
            emit("done", "All checks passed. Build is valid!", total=total)
            return result

        # Step 7 — failed, inject errors and retry
        emit("compat", f"Compatibility issues found: {errors}. Retrying...", errors=errors)
        user_message += f"\n\nFix these compatibility issues: {errors}"

    raise ValueError("Could not generate a valid build after 3 attempts.")
