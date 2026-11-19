
import json

from sqlalchemy import text

from app.main import engine
from app.seed_policies import get_embedding


def search_policies(query: str, limit: int = 2) -> list[dict]:
    query_embedding = get_embedding(query)

    sql = text("""
        SELECT
            id,
            content,
            1 - (embedding <=> CAST(:embedding AS vector))
                AS similarity
        FROM support_policies
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
    """)

    with engine.connect() as connection:
        rows = connection.execute(
            sql,
            {
                "embedding": json.dumps(query_embedding),
                "limit": limit,
            },
        ).mappings().all()

    return [
        {
            "id": row["id"],
            "text": row["content"],
            "similarity": round(float(row["similarity"]), 4),
        }
        for row in rows
    ]


if __name__ == "__main__":
    query = "My glass container arrived broken. Can I get a refund?"

    results = search_policies(query)

    for result in results:
        print(result)
