from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio, json, random, string, time
from agent import generate_quote

app = FastAPI()
app.add_middleware(CORSMiddleware,
                   allow_origins=["*"],
                   allow_methods=["*"],
                   allow_headers=["*"])

with open("data/catalog.json")   as f: CATALOG   = json.load(f)
with open("data/inventory.json") as f: INVENTORY = json.load(f)

class QuoteRequest(BaseModel):
    brief:  str
    budget: float

@app.post("/quote")
async def create_quote(req: QuoteRequest):
    if req.budget < 3800:
        raise HTTPException(400, "Minimum budget is RM 3,800.")
    if not req.brief.strip():
        raise HTTPException(400, "Brief cannot be empty.")

    try:
        result = generate_quote(req.brief, req.budget, CATALOG, INVENTORY)
    except ValueError as e:
        raise HTTPException(422, str(e))

    # Build enriched parts response
    enriched = {}
    total    = 0
    for category, pid in result["selected"].items():
        product = CATALOG.get(pid, {})
        price   = product.get("price", 0)
        total  += price
        enriched[category] = {
            "id":           pid,
            "name":         product.get("name", pid),
            "price":        price,
            "specs":        product.get("specs", {}),
            "reasoning":    result["reasoning"].get(category, ""),
            "alternatives": result["alternatives"].get(category, {})
        }

    quote_id = "NX-" + "".join(
        random.choices(string.ascii_uppercase + string.digits, k=6)
    )

    return {
        "quote_id":     quote_id,
        "brief":        req.brief,
        "budget":       req.budget,
        "total":        total,
        "savings":      req.budget - total,
        "parts":        enriched,
        "generated_at": time.strftime("%Y-%m-%d %H:%M")
    }

@app.post("/quote/stream")
async def stream_quote(req: QuoteRequest):
    if req.budget < 3800:
        raise HTTPException(400, "Minimum budget is RM 3,800.")
    if not req.brief.strip():
        raise HTTPException(400, "Brief cannot be empty.")

    async def event_stream():
        queue: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def on_status(event: dict):
            asyncio.run_coroutine_threadsafe(queue.put(event), loop)

        async def run_agent():
            try:
                result = await loop.run_in_executor(
                    None,
                    lambda: generate_quote(req.brief, req.budget, CATALOG, INVENTORY, on_status),
                )
                # Enrich result the same way as /quote
                enriched = {}
                total    = 0
                for category, pid in result["selected"].items():
                    product = CATALOG.get(pid, {})
                    price   = product.get("price", 0)
                    total  += price
                    enriched[category] = {
                        "id":           pid,
                        "name":         product.get("name", pid),
                        "price":        price,
                        "specs":        product.get("specs", {}),
                        "reasoning":    result["reasoning"].get(category, ""),
                        "alternatives": result["alternatives"].get(category, {}),
                    }
                quote_id = "NX-" + "".join(
                    random.choices(string.ascii_uppercase + string.digits, k=6)
                )
                final = {
                    "quote_id":     quote_id,
                    "brief":        req.brief,
                    "budget":       req.budget,
                    "total":        total,
                    "savings":      req.budget - total,
                    "parts":        enriched,
                    "generated_at": time.strftime("%Y-%m-%d %H:%M"),
                }
                await queue.put({"step": "result", "data": final})
            except ValueError as e:
                await queue.put({"step": "error", "message": str(e)})

        asyncio.create_task(run_agent())

        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event["step"] in ("result", "error"):
                break

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/health")
async def health():
    return {"status": "ok"}