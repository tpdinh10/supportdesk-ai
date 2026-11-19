
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

// ============================================================
// Types
// ============================================================

type TicketStatus =
  | "new"
  | "pending_review"
  | "approved"
  | "rejected"
  | "edited";

interface Policy {
  id: string;
  text: string;
  similarity?: number;
}

interface TicketEvidence {
  tools?: Record<string, unknown>;
  policies?: Policy[];
  missing_information?: string[];
  latency_ms?: number;
  llm_mode?: string;
  draft_fallback?: boolean;
}

interface Ticket {
  id: string;
  customer: string;
  message: string;
  order_id: string | null;
  status: TicketStatus;
  category: string | null;
  priority: string | null;
  draft: string | null;
  evidence: TicketEvidence | null;
}

interface AuditEvent {
  action: string;
  details: Record<string, unknown>;
  at: string;
}

interface TicketForm {
  customer: string;
  order_id: string;
  message: string;
}

type ReviewAction = "approve" | "reject" | "edit";

const API = "/api";

// ============================================================
// API Helpers
// ============================================================

async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Request failed (${response.status}): ${errorText}`
    );
  }

  return response.json() as Promise<T>;
}

const ticketApi = {
  list: () => apiRequest<Ticket[]>("/tickets"),

  create: (form: TicketForm) =>
    apiRequest<Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify({
        customer: form.customer,
        order_id: form.order_id.trim() || null,
        message: form.message,
      }),
    }),

  analyze: (id: string) =>
    apiRequest<Ticket>(`/tickets/${id}/analyze`, {
      method: "POST",
    }),

  decide: (
    id: string,
    action: ReviewAction,
    editedResponse?: string
  ) =>
    apiRequest<Ticket>(`/tickets/${id}/decision`, {
      method: "POST",
      body: JSON.stringify({
        action,
        ...(action === "edit"
          ? { edited_response: editedResponse }
          : {}),
      }),
    }),

  history: (id: string) =>
    apiRequest<AuditEvent[]>(`/tickets/${id}/history`),
};

// ============================================================
// Formatting Helpers
// ============================================================


function formatLabel(value: string | null): string {
  if (!value) {
    return "Unclassified";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}


function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function getStatusClass(status: string): string {
  switch (status) {
    case "approved":
      return "status-approved";
    case "pending_review":
      return "status-pending";
    case "rejected":
      return "status-rejected";
    case "edited":
      return "status-edited";
    default:
      return "status-new";
  }
}

// ============================================================
// Header
// ============================================================

function Header() {
  return (
    <header className="app-header">
      <div>
        <div className="brand">
          <div className="brand-icon">S</div>

          <h1>
            SupportDesk <span>AI</span>
          </h1>
        </div>

        <p className="subtitle">
          AI-powered customer support with human oversight
        </p>
      </div>

      <div className="demo-badge">
        <span className="live-dot" />
        Local Demo
      </div>
    </header>
  );
}

// ============================================================
// Dashboard Statistics
// ============================================================

function DashboardStats({ tickets }: { tickets: Ticket[] }) {
  const total = tickets.length;

  const pending = tickets.filter(
    (ticket) => ticket.status === "pending_review"
  ).length;

  const completed = tickets.filter((ticket) =>
    ["approved", "rejected", "edited"].includes(ticket.status)
  ).length;

  return (
    <section className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Tickets</div>
        <div className="stat-value">{total}</div>
        <div className="stat-description">All support requests</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Pending Review</div>
        <div className="stat-value warning">{pending}</div>
        <div className="stat-description">
          Waiting for human approval
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Completed</div>
        <div className="stat-value success">{completed}</div>
        <div className="stat-description">
          Reviewed by support staff
        </div>
      </div>
    </section>
  );
}

// ============================================================
// New Ticket Form
// ============================================================

interface NewTicketFormProps {
  busy: boolean;
  onCreate: (form: TicketForm) => Promise<void>;
}

function NewTicketForm({
  busy,
  onCreate,
}: NewTicketFormProps) {
  const [form, setForm] = useState<TicketForm>({
    customer: "Emily Carter",
    order_id: "ORD-2081",
    message:
      "My glass container arrived damaged. Can I get a replacement?",
  });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onCreate(form);
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Create Ticket</h2>
        <span className="section-label">NEW REQUEST</span>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        <label htmlFor="customer">Customer Name</label>

        <input
          id="customer"
          value={form.customer}
          required
          maxLength={120}
          onChange={(event) =>
            setForm({ ...form, customer: event.target.value })
          }
          placeholder="Customer name"
        />

        <label htmlFor="order">Order ID</label>

        <input
          id="order"
          value={form.order_id}
          onChange={(event) =>
            setForm({ ...form, order_id: event.target.value })
          }
          placeholder="Optional order ID"
        />

        <label htmlFor="message">Customer Message</label>

        <textarea
          id="message"
          value={form.message}
          required
          minLength={5}
          maxLength={5000}
          onChange={(event) =>
            setForm({ ...form, message: event.target.value })
          }
          placeholder="Describe the customer issue..."
          rows={5}
        />

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={busy}
        >
          {busy ? "Processing..." : "+ Create Ticket"}
        </button>
      </form>
    </section>
  );
}

// ============================================================
// Ticket Inbox
// ============================================================

interface TicketInboxProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (ticket: Ticket) => void;
}

function TicketInbox({
  tickets,
  selectedId,
  onSelect,
}: TicketInboxProps) {
  return (
    <section className="panel inbox-panel">
      <div className="panel-heading">
        <h2>Ticket Inbox</h2>
        <span className="count-badge">{tickets.length}</span>
      </div>

      {tickets.length === 0 ? (
        <p className="empty-state">
          No tickets yet. Create your first support request.
        </p>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className={`ticket-item ${
                selectedId === ticket.id ? "selected" : ""
              }`}
              onClick={() => onSelect(ticket)}
            >
              <div className="ticket-item-top">
                <strong>{ticket.customer}</strong>

                <span
                  className={`status-badge ${getStatusClass(
                    ticket.status
                  )}`}
                >
                  {formatLabel(ticket.status)}
                </span>
              </div>

              <p>{ticket.message}</p>

              <div className="ticket-item-bottom">
                <span>{ticket.order_id || "No order"}</span>
                <span>{formatLabel(ticket.category)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// AI Evidence Panel
// ============================================================

function EvidencePanel({
  evidence,
}: {
  evidence: TicketEvidence | null;
}) {
  if (!evidence) return null;

  return (
    <section className="evidence-section">
      <h3>AI Evidence &amp; Reasoning Context</h3>

      <div className="evidence-summary">
        <span>
          <strong>Model:</strong> {evidence.llm_mode || "Unknown"}
        </span>

        {typeof evidence.latency_ms === "number" && (
          <span>
            <strong>Latency:</strong>{" "}
            {(evidence.latency_ms / 1000).toFixed(2)}s
          </span>
        )}

        {evidence.draft_fallback && (
          <span className="fallback-label">
            Safety fallback used
          </span>
        )}
      </div>

      {Boolean(evidence.missing_information?.length) && (
        <div className="info-box warning-box">
          <strong>Missing Information</strong>

          <ul>
            {evidence.missing_information?.map((item) => (
              <li key={item}>{formatLabel(item)}</li>
            ))}
          </ul>
        </div>
      )}

      <h4>Retrieved Policies (Semantic RAG)</h4>

      {evidence.policies?.length ? (
        <div className="policy-list">
          {evidence.policies.map((policy) => (
            <div key={policy.id} className="policy-card">
              <div className="policy-header">
                <strong>{policy.id}</strong>

                {typeof policy.similarity === "number" && (
                  <span>
                    Similarity:{" "}
                    {(policy.similarity * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              <p>{policy.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No policies retrieved.</p>
      )}

      <details className="technical-details">
        <summary>View Tool Execution Results</summary>

        <pre>
          {JSON.stringify(evidence.tools || {}, null, 2)}
        </pre>
      </details>
    </section>
  );
}

// ============================================================
// Audit History
// ============================================================

function AuditHistory({
  events,
}: {
  events: AuditEvent[];
}) {
  return (
    <section className="audit-section">
      <h3>Audit History</h3>

      {events.length === 0 ? (
        <p className="muted">No audit events available.</p>
      ) : (
        <div className="audit-list">
          {events.map((event, index) => (
            <div className="audit-item" key={index}>
              <div className="audit-dot" />

              <div>
                <strong>{formatLabel(event.action)}</strong>
                <p>{formatDate(event.at)}</p>

                {Object.keys(event.details || {}).length > 0 && (
                  <details>
                    <summary>Event details</summary>

                    <pre>
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================
// Ticket Review
// ============================================================

interface TicketReviewProps {
  ticket: Ticket | null;
  history: AuditEvent[];
  busy: boolean;
  onAnalyze: () => Promise<void>;
  onDecision: (
    action: ReviewAction,
    editedResponse?: string
  ) => Promise<void>;
}

function TicketReview({
  ticket,
  history,
  busy,
  onAnalyze,
  onDecision,
}: TicketReviewProps) {
  const [editedDraft, setEditedDraft] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditedDraft(ticket?.draft || "");
    setEditing(false);
  }, [ticket?.id, ticket?.draft]);

  if (!ticket) {
    return (
      <section className="panel review-panel">
        <h2>Ticket Review</h2>

        <div className="empty-review">
          <div className="empty-icon">✉</div>
          <h3>No ticket selected</h3>
          <p>Select a ticket from the inbox to get started.</p>
        </div>
      </section>
    );
  }

  const canAnalyze = ticket.status === "new";
  const canReview = ticket.status === "pending_review";

  return (
    <section className="panel review-panel">
      <div className="panel-heading">
        <h2>Ticket Review</h2>

        <span
          className={`status-badge ${getStatusClass(
            ticket.status
          )}`}
        >
          {formatLabel(ticket.status)}
        </span>
      </div>

      <div className="ticket-details">
        <div className="detail-row">
          <span>Customer</span>
          <strong>{ticket.customer}</strong>
        </div>

        <div className="detail-row">
          <span>Order</span>
          <strong>{ticket.order_id || "Not provided"}</strong>
        </div>

        <div className="detail-row">
          <span>Category</span>
          <strong>{formatLabel(ticket.category)}</strong>
        </div>

        <div className="detail-row">
          <span>Priority</span>
          <strong>{formatLabel(ticket.priority)}</strong>
        </div>
      </div>

      <div className="customer-message">
        <h3>Customer Message</h3>
        <p>{ticket.message}</p>
      </div>

      {canAnalyze && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={onAnalyze}
        >
          {busy ? "Analyzing..." : "Analyze with AI"}
        </button>
      )}

      {ticket.draft && (
        <section className="draft-section">
          <div className="section-heading">
            <h3>AI Suggested Response</h3>
            <span className="ai-label">AI GENERATED</span>
          </div>

          {editing ? (
            <textarea
              className="draft-editor"
              value={editedDraft}
              onChange={(event) =>
                setEditedDraft(event.target.value)
              }
              rows={6}
            />
          ) : (
            <div className="draft-preview">{ticket.draft}</div>
          )}

          {canReview && (
            <div className="review-actions">
              {editing ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !editedDraft.trim()}
                    onClick={() =>
                      onDecision("edit", editedDraft.trim())
                    }
                  >
                    Save Edited Response
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={busy}
                    onClick={() => onDecision("approve")}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => setEditing(true)}
                  >
                    Edit Draft
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => onDecision("reject")}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          )}

          {canReview && (
            <p className="review-note">
              Human approval is required. No response is sent
              automatically.
            </p>
          )}
        </section>
      )}

      <EvidencePanel evidence={ticket.evidence} />

      <AuditHistory events={history} />
    </section>
  );
}

// ============================================================
// Main Application
// ============================================================

function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<AuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadTickets(): Promise<void> {
    const items = await ticketApi.list();

    setTickets(items);

    setSelected((previous) => {
      if (!previous) return items[0] || null;

      return (
        items.find((ticket) => ticket.id === previous.id) ||
        items[0] ||
        null
      );
    });
  }

  useEffect(() => {
    loadTickets().catch((err) => setError(String(err)));
  }, []);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    ticketApi
      .history(selected.id)
      .then((events) => {
        if (!cancelled) setHistory(events);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id, selected?.status]);

  async function runAction(
    action: () => Promise<Ticket>
  ): Promise<void> {
    setBusy(true);
    setError("");

    try {
      const updated = await action();

      await loadTickets();
      setSelected(updated);

      const events = await ticketApi.history(updated.id);
      setHistory(events);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(
    form: TicketForm
  ): Promise<void> {
    await runAction(() => ticketApi.create(form));
  }

  async function handleAnalyze(): Promise<void> {
    if (!selected) return;

    await runAction(() => ticketApi.analyze(selected.id));
  }

  async function handleDecision(
    action: ReviewAction,
    editedResponse?: string
  ): Promise<void> {
    if (!selected) return;

    await runAction(() =>
      ticketApi.decide(selected.id, action, editedResponse)
    );
  }

  return (
    <main className="app-container">
      <Header />

      {error && (
        <div className="error-banner" role="alert">
          <strong>Something went wrong</strong>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <DashboardStats tickets={tickets} />

      <div className="workspace">
        <aside className="sidebar">
          <NewTicketForm
            busy={busy}
            onCreate={handleCreate}
          />

          <TicketInbox
            tickets={tickets}
            selectedId={selected?.id || null}
            onSelect={setSelected}
          />
        </aside>

        <TicketReview
          ticket={selected}
          history={history}
          busy={busy}
          onAnalyze={handleAnalyze}
          onDecision={handleDecision}
        />
      </div>

      <footer className="app-footer">
        SupportDesk AI · Synthetic data only · Human-in-the-loop
        workflow · No real customer messages or refunds
      </footer>
    </main>
  );
}

// ============================================================
// React Entry Point
// ============================================================

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
