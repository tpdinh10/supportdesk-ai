
import json
import os
import urllib.request

from sqlalchemy import text
from app.main import engine, POLICIES

OLLAMA_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://host.docker.internal:11434"
)
EMBED_MODEL = "nomic-embed-text"


def get_embedding(content: str) -> list[float]:
    payload = {
        "model": EMBED_MODEL,
        "input": content,
    }

    request = urllib.request.Request(
        f"{OLLAMA_URL}/api/embed",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        result = json.load(response)

    embedding = result["embeddings"][0]

    if len(embedding) != 768:
        raise ValueError("Expected 768-dimensional embedding")

    return embedding


def seed_policies():
    with engine.begin() as connection:
        for policy in POLICIES:
            embedding = get_embedding(policy["text"])

            connection.execute(
                text("""
                    INSERT INTO support_policies
                        (id, content, embedding)
                    VALUES
                        (:id, :content, CAST(:embedding AS vector))
                    ON CONFLICT (id)
                    DO UPDATE SET
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding
                """),
                {
                    "id": policy["id"],
                    "content": policy["text"],
                    "embedding": json.dumps(embedding),
                },
            )

            print(f"Seeded: {policy['id']}")


if __name__ == "__main__":
    seed_policies()
