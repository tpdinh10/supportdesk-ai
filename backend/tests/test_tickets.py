
import os

# Use a separate SQLite database for tests.
os.environ["DATABASE_URL"] = "sqlite:///./test_supportdesk.db"
os.environ["LLM_MODE"] = "mock"
os.environ["RAG_MODE"] = "keyword"

from fastapi.testclient import TestClient
from app.main import app, Base, engine

client = TestClient(app)


def test_create_ticket_and_audit_history():
    Base.metadata.create_all(bind=engine)

    payload = {
        "customer": "Emily Carter",
        "message": "My glass container arrived broken.",
        "order_id": "ORD-2081",
    }

    response = client.post("/tickets", json=payload)

    assert response.status_code == 201

    ticket = response.json()

    assert ticket["customer"] == "Emily Carter"
    assert ticket["status"] == "new"
    assert ticket["id"]

    history_response = client.get(
        f"/tickets/{ticket['id']}/history"
    )

    assert history_response.status_code == 200

    history = history_response.json()

    assert len(history) == 1
    assert history[0]["action"] == "created"


def test_reject_order_ownership_mismatch():
    Base.metadata.create_all(bind=engine)

    response = client.post(
        "/tickets",
        json={
            "customer": "Alex Johnson",
            "message": "My glass container arrived broken.",
            "order_id": "ORD-2081",
        },
    )

    assert response.status_code == 201

    ticket_id = response.json()["id"]

    analyze_response = client.post(
        f"/tickets/{ticket_id}/analyze"
    )

    assert analyze_response.status_code == 403
    assert analyze_response.json()["detail"] == (
        "Order does not belong to this customer"
    )
