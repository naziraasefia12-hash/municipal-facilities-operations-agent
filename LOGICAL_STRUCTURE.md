# Logical Structure

## Module Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  Dashboard · Work Orders · New WO · Detail · Buildings · Teams  │
│           Analytics · Audit Log · Agent Test                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (JSON)
┌───────────────────────────▼─────────────────────────────────────┐
│                      FastAPI Backend                             │
│                                                                  │
│  Routers                    Services                            │
│  ├── /api/buildings         ├── triage_agent.py                 │
│  ├── /api/teams             │     ├── run_gemini_triage()       │
│  ├── /api/work-orders       │     └── run_rule_based_triage()   │
│  ├── /api/triage            ├── sla_service.py                  │
│  ├── /api/agent             │     ├── calculate_sla_deadline()  │
│  ├── /api/analytics         │     └── is_overdue()             │
│  └── /api/audit-logs        └── audit_service.py               │
│                                   └── log_event()               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQLAlchemy ORM
┌───────────────────────────▼─────────────────────────────────────┐
│                        SQLite Database                           │
│  buildings · teams · work_orders · triage_results               │
│  work_order_notes · audit_logs                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Work Order Lifecycle

```
                       ┌──────────┐
         submit WO ──► │  open    │
                       └────┬─────┘
                            │ assign team / start work
                       ┌────▼──────────┐
                       │  in_progress  │
                       └────┬──────────┘
                            │
              ┌─────────────┼──────────────────┐
              │             │                  │
   cost > $2500        mark resolved     safety risk
              │             │            detected at
   ┌──────────▼───────┐ ┌───▼──────┐     triage
   │ pending_approval │ │ resolved │         │
   └──────────┬───────┘ └───┬──────┘    ┌───▼──────────┐
              │             │           │   escalated  │
         approved      close out        └──────────────┘
              │             │
              └──────►  ┌───▼──────┐
                         │  closed  │
                         └──────────┘
```

| Status | Meaning |
|--------|---------|
| `open` | Submitted, awaiting assignment or start |
| `in_progress` | Actively being worked on |
| `pending_approval` | Awaiting manager or director approval before proceeding |
| `resolved` | Work completed; awaiting closure confirmation |
| `closed` | Fully closed out |
| `escalated` | Auto-escalated by the AI agent due to detected safety risk |

---

## AI Triage Data Flow

```
Staff submits work order
        │
        ▼
  POST /api/work-orders
        │
        ▼
  triage_agent.run_triage(TriageInput)
        │
        ├─── GEMINI_API_KEY set? ──YES──► run_gemini_triage()
        │                                      │
        │                                 Parse JSON response
        │                                      │
        │                    parse fails? ──► fallback to rule-based
        │
        └─── NO ──────────────────────► run_rule_based_triage()
                                              │
                                        keyword → category
                                        keyword → priority
                                        category → team
                                        priority → SLA hours
                                        cost → approval flag
                                        safety → escalation

        TriageOutput
        ┌───────────────────────────────┐
        │ category                      │
        │ priority                      │
        │ assigned_team                 │
        │ estimated_sla_hours           │
        │ duplicate_risk                │
        │ short_summary                 │
        │ recommended_next_action       │
        │ risk_reasoning                │
        │ requires_approval             │
        │ escalation_reason             │
        │ agent_mode (gemini/rule_based)│
        └───────────────────────────────┘
                │
                ▼
        WorkOrder row created
        TriageResult row saved
        AuditLog row written (work_order_created)
        AuditLog row written (triage_completed)
```

---

## SLA Rules

| Priority | SLA Hours | Use Case |
|----------|-----------|---------|
| `critical` | 2 h | Safety hazard, structural risk, gas/fire/flood |
| `high` | 24 h | System failure affecting building operations |
| `medium` | 72 h | Significant but non-urgent maintenance need |
| `low` | 168 h | Cosmetic, routine, or low-impact issue |

**Auto-escalation:** if the AI agent detects safety-critical keywords (gas leak, fire, smoke, carbon monoxide, structural collapse, etc.), the work order status is set to `escalated` immediately on creation, regardless of who submits it.

---

## Approval Thresholds

| Estimated Cost | Required Approval |
|----------------|-------------------|
| ≤ $2,500 | None |
| $2,501 – $10,000 | Facilities Manager |
| > $10,000 | Facilities Director |

---

## Audit Event Types

| Event | Triggered by |
|-------|-------------|
| `work_order_created` | New work order submission |
| `triage_completed` | AI agent triage finishes |
| `status_changed` | Status update via PATCH /status |
| `team_assigned` | Team assignment via PATCH /assign |
| `escalated` | Safety escalation detected at triage |
| `approval_requested` | Cost threshold exceeded at triage |
| `approved` | Manager/Director approves via POST /approve |

---

## Database Table Relationships

```
buildings ─────────────────────────────────────────────┐
     │ (building_id)                                    │
     ▼                                                  │
work_orders ──── triage_results (1 per work order)     │
     │                                                  │
     ├──── work_order_notes (0..many)                   │
     │                                                  │
     └──── audit_logs (0..many)                         │
                                                        │
teams ──────────────────────────────────────────────────┘
     │ (assigned_team_id)
     └──► work_orders
```
