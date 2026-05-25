from fastapi.testclient import TestClient

from main import app


CHEAPEST_VALID = {
    "cpu": "cpu-004",
    "motherboard": "mb-004",
    "gpu": "gpu-001",
    "ram": "ram-001",
    "storage": "storage-001",
    "psu": "psu-001",
    "cooler": "cooler-001",
    "case": "case-001",
}


client = TestClient(app)


def test_compat_endpoint_enriches_catalog_specs_from_ids():
    items = [
        {"component": {"id": pid, "category": cat, "specs": {}}}
        for cat, pid in CHEAPEST_VALID.items()
    ]

    response = client.post("/compat", json={"items": items})

    assert response.status_code == 200
    body = response.json()
    assert body["compatible"] is True
    assert body["verifier"] == "rules_engine"
    assert "Rule-based" in body["summary"]
    assert any(check["label"] == "PSU headroom" for check in body["checks"])
    assert body["errors"] == []
    assert body["warnings"] == []


def test_compat_endpoint_blocks_unknown_items_without_specs():
    items = [
        {"component": {"id": pid, "category": cat, "specs": {}}}
        for cat, pid in CHEAPEST_VALID.items()
    ]
    items[0] = {
        "component": {
            "id": "custom-cpu",
            "name": "Custom CPU",
            "category": "CPU",
            "specs": {},
        }
    }

    response = client.post("/compat", json={"items": items})

    assert response.status_code == 200
    body = response.json()
    assert body["compatible"] is False
    assert body["verifier"] == "rules_engine"
    assert body["summary"]
    assert body["warnings"]
    assert "Custom CPU" in body["warnings"][0]
