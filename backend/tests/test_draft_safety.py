
import pytest

from app.draft_generator import validate_draft


def test_valid_draft():
    draft = "Please provide a photo for staff review."
    assert validate_draft(draft) == draft


@pytest.mark.parametrize(
    "draft",
    [
        "Your order ORD-2081 is ready.",
        "Your product SKU-GLASS is damaged.",
        "We will process a replacement.",
        "We can arrange your replacement.",
        "<think>Internal reasoning</think> Hello.",
        "word " * 101,
    ],
)
def test_unsafe_drafts_are_rejected(draft):
    with pytest.raises(ValueError):
        validate_draft(draft)
