
import os

# Configure test environment before importing app.main
os.environ["DATABASE_URL"] = "sqlite:///./test_supportdesk.db"
os.environ["LLM_MODE"] = "mock"
os.environ["RAG_MODE"] = "keyword"

import pytest
from pydantic import ValidationError

from app.main import (
    MockLLM,
    process,
    check_refund_eligibility,
    Classification,
)


def test_classification():
    result = MockLLM().classify(
        "The product arrived broken"
    )
    assert result.category == "damaged_item"



def test_missing_order():
    _, evidence, draft = process(
        "My order is broken",
        None,
    )

    assert "order_id" in evidence["missing_information"]

    # Verify the fallback does not promise a refund.
    assert "requires verification and staff approval" in draft



def test_refund_requires_photo_and_review():
    result = check_refund_eligibility("ORD-2081")

    assert result["eligible"] is False

    result_with_photo = check_refund_eligibility(
        "ORD-2081",
        True,
    )

    assert result_with_photo["reason"] == "pending_staff_review"


def test_schema_rejects_invalid_category():
    with pytest.raises(ValidationError):
        Classification(
            category="invented",
            priority="high",
            missing_information=[],
            requested_tools=[],
        )

def test_damaged_item_priority_is_consistent():
    classification, evidence, draft = process(
        "My glass container arrived broken.",
        "ORD-2081",
    )

    assert classification.category == "damaged_item"
    assert classification.priority == "medium"
