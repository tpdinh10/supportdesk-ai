
# SupportDesk AI — Architecture

## Overview

SupportDesk AI is a full-stack customer support application built with FastAPI, React, PostgreSQL, and a local LLM.

The system analyzes customer tickets, retrieves relevant support policies, and generates draft responses for human review.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI, SQLAlchemy
- Database: PostgreSQL with pgvector
- LLM: Ollama (Qwen3 4B)
- Embeddings: nomic-embed-text
- Testing: pytest
- Infrastructure: Docker Compose

## Workflow

1. A customer support ticket is created through the React dashboard.
2. FastAPI stores the ticket in PostgreSQL.
3. Qwen3 classifies the ticket.
4. The backend executes allowlisted, read-only tools.
5. Semantic search retrieves relevant policies using pgvector.
6. The LLM generates a draft response using policy evidence.
7. Safety checks validate the draft. A fallback template is used if generation fails validation.
8. A human reviews, edits, approves, or rejects the draft.
9. Actions are recorded in the audit history.

## Design Decisions

- Local LLMs avoid paid API dependencies.
- Structured outputs validate model classifications.
- Business rules and tool execution remain controlled by the backend.
- Human review is required before a response can be used.
- Audit events provide visibility into ticket processing.
- All customer and order data is synthetic.

## Limitations

This is a portfolio project, not a production support platform.

- No authentication or role-based access control
- No real customer communication or refund execution
- No production deployment
- Limited policy dataset and evaluation coverage
- Database tables are initialized locally without migrations
