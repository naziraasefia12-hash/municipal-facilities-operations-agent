# Municipal Facilities Operations Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack public-sector facilities work order platform with an AI triage agent that classifies, prioritizes, routes, and summarizes maintenance requests.

**Architecture:** Python FastAPI backend with SQLite via SQLAlchemy ORM; React + Vite + TypeScript frontend with Tailwind CSS; AI triage runs Gemini API when `GEMINI_API_KEY` is present and falls back to a deterministic rule-based engine otherwise.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, SQLite, pytest, React 18, Vite, TypeScript, Tailwind CSS, React Query, React Router v6, Recharts, Google Generative AI SDK

---

## 1. Folder Structure

```
municipal-facilities-operations-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app factory, CORS, router registration
│   │   ├── config.py                 # Settings, env var loading
│   │   ├── database.py               # SQLAlchemy engine, session, Base
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── building.py           # Building ORM model
│   │   │   ├── team.py               # Team ORM model
│   │   │   ├── work_order.py         # WorkOrder ORM model
│   │   │   ├── work_order_note.py    # WorkOrderNote ORM model
│   │   │   ├── triage_result.py      # TriageResult ORM model
│   │   │   └── audit_log.py          # AuditLog ORM model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── building.py           # Pydantic schemas for buildings
│   │   │   ├── team.py               # Pydantic schemas for teams
│   │   │   ├── work_order.py         # Pydantic schemas for work orders
│   │   │   ├── triage.py             # Pydantic schemas for triage I/O
│   │   │   ├── analytics.py          # Pydantic schemas for analytics
│   │   │   └── audit_log.py          # Pydantic schemas for audit log
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── buildings.py          # GET/POST/PATCH /api/buildings
│   │   │   ├── teams.py              # GET/POST/PATCH /api/teams
│   │   │   ├── work_orders.py        # Full work order CRUD + notes + approval
│   │   │   ├── triage.py             # POST /api/triage (standalone + create)
│   │   │   ├── analytics.py          # GET /api/analytics/*
│   │   │   └── audit_log.py          # GET /api/audit-logs
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── triage_agent.py       # Gemini + rule-based triage engine
│   │   │   ├── sla_service.py        # SLA deadline calculation + overdue check
│   │   │   └── audit_service.py      # Structured audit event writer
│   │   └── seed/
│   │       ├── __init__.py
│   │       └── seed_data.py          # Buildings + teams seed records
│   ├── tests/
│   │   ├── conftest.py               # Pytest fixtures: test DB, test client
│   │   ├── test_buildings.py
│   │   ├── test_teams.py
│   │   ├── test_work_orders.py
│   │   ├── test_triage_rule_based.py
│   │   ├── test_sla_service.py
│   │   └── test_analytics.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx                  # React root mount
│   │   ├── App.tsx                   # Router setup, layout wrapper
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance with base URL
│   │   │   ├── workOrders.ts         # API calls for work orders
│   │   │   ├── buildings.ts          # API calls for buildings
│   │   │   ├── teams.ts              # API calls for teams
│   │   │   ├── triage.ts             # API calls for triage
│   │   │   ├── analytics.ts          # API calls for analytics
│   │   │   └── auditLog.ts           # API calls for audit log
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   │   │   ├── TopBar.tsx        # Page header bar
│   │   │   │   └── AppLayout.tsx     # Sidebar + TopBar + outlet
│   │   │   ├── ui/
│   │   │   │   ├── StatusBadge.tsx   # Color-coded status pill
│   │   │   │   ├── PriorityBadge.tsx # Color-coded priority pill
│   │   │   │   ├── StatCard.tsx      # Summary stat card
│   │   │   │   ├── DataTable.tsx     # Sortable table wrapper
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── EmptyState.tsx
│   │   │   └── work-orders/
│   │   │       ├── WorkOrderFilters.tsx  # Status/priority/category filter bar
│   │   │       ├── TriageResultPanel.tsx # Displays AI triage output
│   │   │       └── NoteForm.tsx          # Add internal note form
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── WorkOrdersPage.tsx
│   │   │   ├── NewWorkOrderPage.tsx
│   │   │   ├── WorkOrderDetailPage.tsx
│   │   │   ├── BuildingsPage.tsx
│   │   │   ├── TeamsPage.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── AuditLogPage.tsx
│   │   │   └── AgentTestPage.tsx
│   │   ├── hooks/
│   │   │   ├── useWorkOrders.ts
│   │   │   ├── useBuildings.ts
│   │   │   ├── useTeams.ts
│   │   │   ├── useAnalytics.ts
│   │   │   └── useAuditLog.ts
│   │   ├── types/
│   │   │   └── index.ts              # All shared TypeScript interfaces
│   │   └── utils/
│   │       ├── formatters.ts         # Date, currency, status label formatting
│   │       └── constants.ts          # Priority colors, status labels, category list
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── package.json
├── docs/
│   ├── README.md
│   ├── BUSINESS_STATEMENT.md
│   ├── LOGICAL_STRUCTURE.md
│   ├── TECHNICAL_IMPLEMENTATION_GUIDE.md
│   ├── GEMINI_SYSTEM_PROMPT.md
│   ├── SAMPLE_TEST_PROMPTS.md
│   └── superpowers/
│       └── plans/
│           └── 2026-06-25-municipal-facilities-agent.md
└── .gitignore
```

---

## 2. Database Schema

### buildings
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL, UNIQUE |
| address | TEXT | |
| building_code | TEXT | UNIQUE |
| floors | INTEGER | |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT now |

Seed records: City Hall, Public Works Yard, Police Administration Building, Fire Station 12, Fleet Maintenance Garage, Central Library, Recreation Center, Parking Enforcement Office

### teams
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| name | TEXT | NOT NULL, UNIQUE |
| team_code | TEXT | UNIQUE |
| specialty | TEXT | |
| contact_email | TEXT | |
| is_active | BOOLEAN | DEFAULT TRUE |
| created_at | TIMESTAMP | DEFAULT now |

Seed records: HVAC Team, Plumbing Team, Electrical Team, Elevator Contractor, Janitorial Services, Access Control Team, Fleet Maintenance, Emergency Response

### work_orders
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| order_number | TEXT | NOT NULL, UNIQUE (e.g. WO-2026-00001) |
| title | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| building_id | INTEGER | FK → buildings.id |
| location_details | TEXT | |
| category | TEXT | NOT NULL (HVAC/Plumbing/Electrical/Elevator/Janitorial/Access Control/Fleet/General) |
| status | TEXT | DEFAULT 'open' (open/in_progress/pending_approval/resolved/closed/escalated) |
| priority | TEXT | DEFAULT 'medium' (critical/high/medium/low) |
| assigned_team_id | INTEGER | FK → teams.id |
| submitted_by | TEXT | NOT NULL |
| estimated_cost | REAL | |
| actual_cost | REAL | |
| sla_deadline | TIMESTAMP | |
| sla_hours | INTEGER | |
| requires_approval | BOOLEAN | DEFAULT FALSE |
| approval_level | TEXT | (manager/director/none) |
| approved_by | TEXT | |
| approved_at | TIMESTAMP | |
| resolved_at | TIMESTAMP | |
| created_at | TIMESTAMP | DEFAULT now |
| updated_at | TIMESTAMP | DEFAULT now |

### triage_results
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| work_order_id | INTEGER | NOT NULL, FK → work_orders.id |
| category | TEXT | NOT NULL |
| priority | TEXT | NOT NULL |
| assigned_team | TEXT | NOT NULL |
| estimated_sla_hours | INTEGER | NOT NULL |
| duplicate_risk | TEXT | NOT NULL (low/medium/high) |
| short_summary | TEXT | NOT NULL |
| recommended_next_action | TEXT | NOT NULL |
| risk_reasoning | TEXT | NOT NULL |
| requires_approval | BOOLEAN | NOT NULL |
| escalation_reason | TEXT | nullable |
| agent_mode | TEXT | NOT NULL (gemini/rule_based) |
| raw_response | TEXT | nullable (raw JSON from Gemini) |
| created_at | TIMESTAMP | DEFAULT now |

### work_order_notes
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| work_order_id | INTEGER | NOT NULL, FK → work_orders.id |
| author | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| note_type | TEXT | DEFAULT 'internal' (internal/status_change/escalation/approval) |
| created_at | TIMESTAMP | DEFAULT now |

### audit_logs
| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PK, autoincrement |
| event_type | TEXT | NOT NULL (work_order_created/triage_completed/status_changed/team_assigned/escalated/approval_requested/approved) |
| work_order_id | INTEGER | nullable, FK → work_orders.id |
| work_order_number | TEXT | nullable (denormalized for log readability) |
| actor | TEXT | NOT NULL (system / user name / agent) |
| details | TEXT | NOT NULL (JSON-serialized dict) |
| old_value | TEXT | nullable |
| new_value | TEXT | nullable |
| created_at | TIMESTAMP | DEFAULT now |

---

## 3. API Endpoint List

### Buildings — `/api/buildings`
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/buildings | List all active buildings |
| GET | /api/buildings/{id} | Get building by ID |
| POST | /api/buildings | Create building |
| PATCH | /api/buildings/{id} | Update building fields |

### Teams — `/api/teams`
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/teams | List all active teams |
| GET | /api/teams/{id} | Get team by ID |
| POST | /api/teams | Create team |
| PATCH | /api/teams/{id} | Update team fields |
| GET | /api/teams/{id}/workload | Open + critical work order counts for team |

### Work Orders — `/api/work-orders`
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/work-orders | List with filters: status, priority, category, building_id, team_id, search (title/description) |
| POST | /api/work-orders | Create work order (runs triage automatically) |
| GET | /api/work-orders/{id} | Get full detail including triage result and notes |
| PATCH | /api/work-orders/{id}/status | Update status field + audit log |
| PATCH | /api/work-orders/{id}/assign | Assign/reassign team + audit log |
| POST | /api/work-orders/{id}/notes | Add internal note |
| GET | /api/work-orders/{id}/notes | List notes for work order |
| POST | /api/work-orders/{id}/approve | Record approval decision |

### Triage — `/api/triage`
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/triage | Run triage on input without creating a work order (Agent Test page use) |

### Analytics — `/api/analytics`
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/summary | Total, open, critical, overdue counts |
| GET | /api/analytics/by-category | Work order counts grouped by category |
| GET | /api/analytics/by-building | Work order counts grouped by building |
| GET | /api/analytics/by-team | Open work order counts per team (workload) |
| GET | /api/analytics/sla-performance | Average SLA hours by priority (target vs actual) |

### Audit Log — `/api/audit-logs`
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/audit-logs | List with filters: event_type, work_order_id, start_date, end_date, actor |

---

## 4. Frontend Page & Component Plan

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| DashboardPage | `/` | Stat cards (total/open/critical/overdue), recent work orders table, quick actions |
| WorkOrdersPage | `/work-orders` | Filterable/searchable list of all work orders |
| NewWorkOrderPage | `/work-orders/new` | Form to submit a new work order; shows live triage result after AI runs |
| WorkOrderDetailPage | `/work-orders/:id` | Full detail: triage panel, status history, notes, approval controls |
| BuildingsPage | `/buildings` | Card grid of all buildings with open work order counts |
| TeamsPage | `/teams` | Card grid of all teams with workload indicators |
| AnalyticsPage | `/analytics` | Charts: by category, by building, by team, SLA performance |
| AuditLogPage | `/audit-log` | Filterable event log table |
| AgentTestPage | `/agent-test` | Free-form triage input form + raw AI output display |

### Key Components

**Layout**
- `AppLayout.tsx` — persistent sidebar + top bar wrapper using React Router `<Outlet>`
- `Sidebar.tsx` — nav links with active state, city branding
- `TopBar.tsx` — page title + breadcrumb

**UI Primitives**
- `StatusBadge.tsx` — pill with color per status: open=blue, in_progress=yellow, pending_approval=orange, resolved=green, closed=gray, escalated=red
- `PriorityBadge.tsx` — pill with color per priority: critical=red, high=orange, medium=yellow, low=green
- `StatCard.tsx` — icon + number + label card for dashboard
- `DataTable.tsx` — thead/tbody table with sortable column headers
- `LoadingSpinner.tsx` — centered spinner overlay
- `EmptyState.tsx` — illustration + message when list is empty

**Work Order Components**
- `WorkOrderFilters.tsx` — dropdowns for status, priority, category, building, team; text search input
- `TriageResultPanel.tsx` — structured display of all triage output fields with color highlights
- `NoteForm.tsx` — textarea + submit for internal notes

### Data Fetching
All API calls use **TanStack Query (React Query)** for caching and loading states. Custom hooks in `src/hooks/` wrap `useQuery`/`useMutation` calls.

---

## 5. AI Triage Agent Logic Plan

### Input Interface
```
title: str
description: str
building: str
location_details: str
estimated_cost: float | None
```

### Output Interface
```
category: HVAC | Plumbing | Electrical | Elevator | Janitorial | Access Control | Fleet | General
priority: critical | high | medium | low
assigned_team: str (team name)
estimated_sla_hours: int
duplicate_risk: low | medium | high
short_summary: str (1-2 sentences)
recommended_next_action: str
risk_reasoning: str
requires_approval: bool
escalation_reason: str | None
agent_mode: gemini | rule_based
```

### Rule-Based Engine (fallback)

**Step 1 — Category classification via keyword matching**

Text = lowercase(title + " " + description)

| Category | Keywords |
|----------|----------|
| HVAC | hvac, air conditioning, heating, ventilation, ac unit, furnace, duct, thermostat, heat pump, boiler, cooling |
| Plumbing | pipe, water leak, drain, toilet, sink, faucet, sewage, flood, plumbing, clog, overflow |
| Electrical | electrical, power outage, outlet, circuit breaker, wiring, generator, light fixture, sparks, ups |
| Elevator | elevator, lift, escalator, stuck, cab, door open |
| Access Control | lock, key card, badge, door access, security camera, alarm, gate, entry |
| Fleet | vehicle, truck, fleet, tire, oil change, engine, brake, transmission |
| Janitorial | clean, mop, spill, trash, restroom, bathroom, sanitation, odor, graffiti |
| General | (default if no match) |

**Step 2 — Priority classification**

Check for safety/critical keywords first (highest priority wins):

- `critical` if text contains any of: fire, gas leak, flood, electrocution, structural collapse, no power entire building, emergency, severe injury, safety hazard, smoke, carbon monoxide, exposed wire, sparks, explosion
- `high` if text contains any of: broken, not working, failed, outage, urgent, no heat, no ac, no hot water, security breach, lock failure, elevator stuck, standing water
- `medium` if text contains any of: slow, intermittent, reduced, minor, occasionally, inspection needed
- `low` — default

**Step 3 — Team assignment**

| Category | Team |
|----------|------|
| HVAC | HVAC Team |
| Plumbing | Plumbing Team |
| Electrical | Electrical Team |
| Elevator | Elevator Contractor |
| Access Control | Access Control Team |
| Fleet | Fleet Maintenance |
| Janitorial | Janitorial Services |
| General | Emergency Response (if critical) else Janitorial Services |

**Step 4 — SLA hours**

| Priority | Hours |
|----------|-------|
| critical | 2 |
| high | 24 |
| medium | 72 |
| low | 168 |

**Step 5 — Escalation**

Auto-escalate to `escalated` status + set `escalation_reason` if priority is `critical` OR text contains safety keywords from critical list.

**Step 6 — Approval logic**

- `estimated_cost > 2500` → `requires_approval = True`, `approval_level = "manager"`
- `estimated_cost > 10000` → `requires_approval = True`, `approval_level = "director"`
- Otherwise → `requires_approval = False`

**Step 7 — Duplicate risk**

Heuristic (no DB query in rule-based mode): score based on generic/common terms.
- `high` if title is very short (< 5 words) AND category is Plumbing or Electrical
- `medium` if description < 30 words
- `low` otherwise

**Step 8 — Summary + next action**

Short summary: `"{priority.capitalize()} {category} issue at {building}: {title[:80]}"`

Recommended next action:
- critical → "Dispatch Emergency Response immediately and notify facility manager"
- high → "Assign to {team}, contact within 2 hours"
- medium → "Schedule with {team} within 3 business days"
- low → "Add to {team} maintenance queue"

### Gemini Mode

Uses `google-generativeai` SDK with model `gemini-1.5-flash`.

System prompt is loaded from `docs/GEMINI_SYSTEM_PROMPT.md` at service startup.

User prompt template:
```
Analyze this municipal facilities work order and return ONLY a JSON object:

Title: {title}
Description: {description}
Building: {building}
Location: {location_details}
Estimated Cost: {estimated_cost or "Not provided"}

Return JSON with exactly these fields: category, priority, assigned_team,
estimated_sla_hours, duplicate_risk, short_summary, recommended_next_action,
risk_reasoning, requires_approval, escalation_reason
```

Response handling:
1. Extract JSON from response text (strip markdown code fences if present)
2. Validate against output schema with Pydantic
3. On any parse/validation error → fall back to rule-based engine, log warning
4. Set `agent_mode = "gemini"` on success, `"rule_based"` on fallback

---

## 6. Implementation Phases

### Phase 1 — Project Scaffolding
Create folder structure, dependency files, config, database init, and seed runner.

### Phase 2 — Data Models & Seed Data
SQLAlchemy ORM models for all 6 tables, Pydantic schemas, DB session factory, and seed script.

### Phase 3 — Buildings & Teams Endpoints
CRUD routers for buildings and teams, plus tests.

### Phase 4 — Work Orders Endpoints
Work order CRUD, filtering, status updates, notes, approval, plus tests.

### Phase 5 — Triage Agent & SLA Service
Rule-based engine, Gemini integration, SLA calculator, audit service, plus tests.

### Phase 6 — Analytics & Audit Log Endpoints
All analytics aggregations, audit log router, plus tests.

### Phase 7 — Frontend Scaffolding
Vite + React + TypeScript + Tailwind setup, Axios client, shared types, layout components.

### Phase 8 — Frontend Pages
All 9 pages implemented with real API integration and full interactivity.

### Phase 9 — Documentation
All 6 required Markdown documentation files.

---

## Tasks

### Task 1: Backend Project Scaffolding

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/seed/__init__.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.36
pydantic==2.9.2
pydantic-settings==2.5.2
python-dotenv==1.0.1
google-generativeai==0.8.3
pytest==8.3.3
httpx==0.27.2
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Create .env.example**

```
GEMINI_API_KEY=
DATABASE_URL=sqlite:///./municipal_facilities.db
APP_ENV=development
```

- [ ] **Step 3: Create backend/app/config.py**

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    gemini_api_key: str = ""
    database_url: str = "sqlite:///./municipal_facilities.db"
    app_env: str = "development"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Create backend/app/database.py**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from .models import building, team, work_order, work_order_note, triage_result, audit_log  # noqa
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 5: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import buildings, teams, work_orders, triage, analytics, audit_log

app = FastAPI(title="Municipal Facilities Operations Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(buildings.router, prefix="/api/buildings", tags=["buildings"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(work_orders.router, prefix="/api/work-orders", tags=["work-orders"])
app.include_router(triage.router, prefix="/api/triage", tags=["triage"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(audit_log.router, prefix="/api/audit-logs", tags=["audit-log"])


@app.on_event("startup")
def startup():
    init_db()
    from .seed.seed_data import seed_if_empty
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Create stub routers** (empty files with APIRouter) for buildings, teams, work_orders, triage, analytics, audit_log

```python
# Each of these 6 files has only this content initially:
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 7: Create conftest.py**

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test_municipal.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 8: Verify server starts**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Expected: server starts on http://127.0.0.1:8000, GET /api/health returns `{"status":"ok"}`

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: backend project scaffolding with FastAPI, SQLAlchemy, config"
```

---

### Task 2: ORM Models

**Files:**
- Create: `backend/app/models/building.py`
- Create: `backend/app/models/team.py`
- Create: `backend/app/models/work_order.py`
- Create: `backend/app/models/work_order_note.py`
- Create: `backend/app/models/triage_result.py`
- Create: `backend/app/models/audit_log.py`

- [ ] **Step 1: Write test for model imports**

```python
# tests/test_models.py
def test_models_import():
    from app.models.building import Building
    from app.models.team import Team
    from app.models.work_order import WorkOrder
    from app.models.work_order_note import WorkOrderNote
    from app.models.triage_result import TriageResult
    from app.models.audit_log import AuditLog
    assert Building.__tablename__ == "buildings"
    assert WorkOrder.__tablename__ == "work_orders"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_models.py -v
```
Expected: FAIL with ModuleNotFoundError

- [ ] **Step 3: Create backend/app/models/building.py**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    address = Column(String)
    building_code = Column(String, unique=True)
    floors = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 4: Create backend/app/models/team.py**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    team_code = Column(String, unique=True)
    specialty = Column(String)
    contact_email = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 5: Create backend/app/models/work_order.py**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.sql import func
from ..database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    building_id = Column(Integer, ForeignKey("buildings.id"))
    location_details = Column(String)
    category = Column(String, nullable=False)
    status = Column(String, nullable=False, default="open")
    priority = Column(String, nullable=False, default="medium")
    assigned_team_id = Column(Integer, ForeignKey("teams.id"))
    submitted_by = Column(String, nullable=False)
    estimated_cost = Column(Float)
    actual_cost = Column(Float)
    sla_deadline = Column(DateTime(timezone=True))
    sla_hours = Column(Integer)
    requires_approval = Column(Boolean, default=False)
    approval_level = Column(String)
    approved_by = Column(String)
    approved_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 6: Create backend/app/models/work_order_note.py**

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base


class WorkOrderNote(Base):
    __tablename__ = "work_order_notes"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    author = Column(String, nullable=False)
    content = Column(String, nullable=False)
    note_type = Column(String, default="internal")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 7: Create backend/app/models/triage_result.py**

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    category = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    assigned_team = Column(String, nullable=False)
    estimated_sla_hours = Column(Integer, nullable=False)
    duplicate_risk = Column(String, nullable=False)
    short_summary = Column(String, nullable=False)
    recommended_next_action = Column(String, nullable=False)
    risk_reasoning = Column(String, nullable=False)
    requires_approval = Column(Boolean, nullable=False)
    escalation_reason = Column(String)
    agent_mode = Column(String, nullable=False)
    raw_response = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 8: Create backend/app/models/audit_log.py**

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    work_order_id = Column(Integer, ForeignKey("work_orders.id"))
    work_order_number = Column(String)
    actor = Column(String, nullable=False)
    details = Column(String, nullable=False)
    old_value = Column(String)
    new_value = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
```

- [ ] **Step 9: Run model import test**

```bash
pytest tests/test_models.py -v
```
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add backend/app/models/
git commit -m "feat: SQLAlchemy ORM models for all 6 tables"
```

---

### Task 3: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/building.py`
- Create: `backend/app/schemas/team.py`
- Create: `backend/app/schemas/work_order.py`
- Create: `backend/app/schemas/triage.py`
- Create: `backend/app/schemas/analytics.py`
- Create: `backend/app/schemas/audit_log.py`

- [ ] **Step 1: Create backend/app/schemas/building.py**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BuildingBase(BaseModel):
    name: str
    address: Optional[str] = None
    building_code: Optional[str] = None
    floors: Optional[int] = None


class BuildingCreate(BuildingBase):
    pass


class BuildingUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    building_code: Optional[str] = None
    floors: Optional[int] = None
    is_active: Optional[bool] = None


class BuildingOut(BuildingBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Create backend/app/schemas/team.py**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TeamBase(BaseModel):
    name: str
    team_code: Optional[str] = None
    specialty: Optional[str] = None
    contact_email: Optional[str] = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    team_code: Optional[str] = None
    specialty: Optional[str] = None
    contact_email: Optional[str] = None
    is_active: Optional[bool] = None


class TeamOut(TeamBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TeamWorkload(BaseModel):
    team_id: int
    team_name: str
    open_count: int
    critical_count: int
```

- [ ] **Step 3: Create backend/app/schemas/work_order.py**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from .triage import TriageResultOut


class WorkOrderCreate(BaseModel):
    title: str
    description: str
    building_id: int
    location_details: Optional[str] = None
    submitted_by: str
    estimated_cost: Optional[float] = None


class WorkOrderStatusUpdate(BaseModel):
    status: str
    actor: str = "system"


class WorkOrderAssignUpdate(BaseModel):
    assigned_team_id: int
    actor: str = "system"


class WorkOrderApprove(BaseModel):
    approved_by: str
    notes: Optional[str] = None


class NoteCreate(BaseModel):
    author: str
    content: str
    note_type: str = "internal"


class NoteOut(BaseModel):
    id: int
    work_order_id: int
    author: str
    content: str
    note_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WorkOrderOut(BaseModel):
    id: int
    order_number: str
    title: str
    description: str
    building_id: Optional[int]
    building_name: Optional[str] = None
    location_details: Optional[str]
    category: str
    status: str
    priority: str
    assigned_team_id: Optional[int]
    assigned_team_name: Optional[str] = None
    submitted_by: str
    estimated_cost: Optional[float]
    actual_cost: Optional[float]
    sla_deadline: Optional[datetime]
    sla_hours: Optional[int]
    requires_approval: bool
    approval_level: Optional[str]
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    triage_result: Optional[TriageResultOut] = None
    notes: List[NoteOut] = []

    model_config = {"from_attributes": True}


class WorkOrderListItem(BaseModel):
    id: int
    order_number: str
    title: str
    building_name: Optional[str] = None
    category: str
    status: str
    priority: str
    assigned_team_name: Optional[str] = None
    submitted_by: str
    sla_deadline: Optional[datetime]
    requires_approval: bool
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Create backend/app/schemas/triage.py**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal


class TriageInput(BaseModel):
    title: str
    description: str
    building: str
    location_details: str = ""
    estimated_cost: Optional[float] = None


class TriageOutput(BaseModel):
    category: Literal["HVAC", "Plumbing", "Electrical", "Elevator", "Janitorial", "Access Control", "Fleet", "General"]
    priority: Literal["critical", "high", "medium", "low"]
    assigned_team: str
    estimated_sla_hours: int
    duplicate_risk: Literal["low", "medium", "high"]
    short_summary: str
    recommended_next_action: str
    risk_reasoning: str
    requires_approval: bool
    escalation_reason: Optional[str] = None
    agent_mode: Literal["gemini", "rule_based"] = "rule_based"


class TriageResultOut(BaseModel):
    id: int
    work_order_id: int
    category: str
    priority: str
    assigned_team: str
    estimated_sla_hours: int
    duplicate_risk: str
    short_summary: str
    recommended_next_action: str
    risk_reasoning: str
    requires_approval: bool
    escalation_reason: Optional[str]
    agent_mode: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 5: Create backend/app/schemas/analytics.py**

```python
from pydantic import BaseModel
from typing import List


class AnalyticsSummary(BaseModel):
    total_work_orders: int
    open_work_orders: int
    in_progress_work_orders: int
    critical_work_orders: int
    overdue_work_orders: int
    pending_approval_work_orders: int


class CategoryCount(BaseModel):
    category: str
    count: int


class BuildingCount(BaseModel):
    building_name: str
    count: int


class TeamWorkloadItem(BaseModel):
    team_name: str
    open_count: int
    in_progress_count: int
    critical_count: int


class SlaPerformanceItem(BaseModel):
    priority: str
    target_hours: int
    average_actual_hours: Optional[float]
    count: int

from typing import Optional
```

- [ ] **Step 6: Create backend/app/schemas/audit_log.py**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AuditLogOut(BaseModel):
    id: int
    event_type: str
    work_order_id: Optional[int]
    work_order_number: Optional[str]
    actor: str
    details: str
    old_value: Optional[str]
    new_value: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: Pydantic v2 schemas for all modules"
```

---

### Task 4: Seed Data

**Files:**
- Create: `backend/app/seed/seed_data.py`

- [ ] **Step 1: Write test for seed function**

```python
# tests/test_seed.py
def test_seed_creates_buildings_and_teams(db):
    from app.seed.seed_data import seed_if_empty
    from app.models.building import Building
    from app.models.team import Team
    seed_if_empty(db)
    buildings = db.query(Building).all()
    teams = db.query(Team).all()
    assert len(buildings) == 8
    assert len(teams) == 8
    assert any(b.name == "City Hall" for b in buildings)
    assert any(t.name == "HVAC Team" for t in teams)


def test_seed_is_idempotent(db):
    from app.seed.seed_data import seed_if_empty
    from app.models.building import Building
    seed_if_empty(db)
    seed_if_empty(db)
    buildings = db.query(Building).all()
    assert len(buildings) == 8
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_seed.py -v
```
Expected: FAIL with ImportError

- [ ] **Step 3: Create backend/app/seed/seed_data.py**

```python
from sqlalchemy.orm import Session
from ..models.building import Building
from ..models.team import Team

BUILDINGS = [
    {"name": "City Hall", "address": "1 Civic Center Plaza", "building_code": "CH-001", "floors": 5},
    {"name": "Public Works Yard", "address": "400 Industrial Drive", "building_code": "PW-001", "floors": 1},
    {"name": "Police Administration Building", "address": "200 Justice Avenue", "building_code": "PAB-001", "floors": 4},
    {"name": "Fire Station 12", "address": "88 Engine Lane", "building_code": "FS-012", "floors": 2},
    {"name": "Fleet Maintenance Garage", "address": "300 Motor Court", "building_code": "FMG-001", "floors": 1},
    {"name": "Central Library", "address": "50 Knowledge Square", "building_code": "LIB-001", "floors": 3},
    {"name": "Recreation Center", "address": "700 Community Park Rd", "building_code": "REC-001", "floors": 2},
    {"name": "Parking Enforcement Office", "address": "12 Meter Street", "building_code": "PEO-001", "floors": 1},
]

TEAMS = [
    {"name": "HVAC Team", "team_code": "HVAC", "specialty": "Heating, Ventilation, Air Conditioning", "contact_email": "hvac@city.gov"},
    {"name": "Plumbing Team", "team_code": "PLMB", "specialty": "Pipes, Water Systems, Drainage", "contact_email": "plumbing@city.gov"},
    {"name": "Electrical Team", "team_code": "ELEC", "specialty": "Electrical Systems, Lighting, Power", "contact_email": "electrical@city.gov"},
    {"name": "Elevator Contractor", "team_code": "ELEV", "specialty": "Elevators, Lifts, Escalators", "contact_email": "elevator@city.gov"},
    {"name": "Janitorial Services", "team_code": "JANI", "specialty": "Cleaning, Sanitation, Waste", "contact_email": "janitorial@city.gov"},
    {"name": "Access Control Team", "team_code": "ACCSS", "specialty": "Locks, Badges, Security Systems", "contact_email": "access@city.gov"},
    {"name": "Fleet Maintenance", "team_code": "FLEET", "specialty": "Municipal Vehicles, Equipment", "contact_email": "fleet@city.gov"},
    {"name": "Emergency Response", "team_code": "EMRG", "specialty": "Critical Incidents, Safety Hazards", "contact_email": "emergency@city.gov"},
]


def seed_if_empty(db: Session):
    if db.query(Building).count() == 0:
        for b in BUILDINGS:
            db.add(Building(**b))
        db.commit()
    if db.query(Team).count() == 0:
        for t in TEAMS:
            db.add(Team(**t))
        db.commit()
```

- [ ] **Step 4: Run seed test**

```bash
pytest tests/test_seed.py -v
```
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/seed/ backend/tests/test_seed.py
git commit -m "feat: seed data for 8 buildings and 8 teams"
```

---

### Task 5: Buildings & Teams Routers

**Files:**
- Modify: `backend/app/routers/buildings.py`
- Modify: `backend/app/routers/teams.py`
- Create: `backend/tests/test_buildings.py`
- Create: `backend/tests/test_teams.py`

- [ ] **Step 1: Write building tests**

```python
# tests/test_buildings.py
def test_list_buildings_empty(client):
    response = client.get("/api/buildings")
    assert response.status_code == 200
    assert response.json() == []


def test_create_building(client):
    payload = {"name": "Test Hall", "address": "1 Main St", "building_code": "TH-001", "floors": 3}
    response = client.post("/api/buildings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Hall"
    assert data["id"] is not None
    assert data["is_active"] is True


def test_get_building_by_id(client):
    create = client.post("/api/buildings", json={"name": "City Hall", "building_code": "CH"}).json()
    response = client.get(f"/api/buildings/{create['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "City Hall"


def test_get_building_not_found(client):
    response = client.get("/api/buildings/999")
    assert response.status_code == 404


def test_update_building(client):
    create = client.post("/api/buildings", json={"name": "Old Name"}).json()
    response = client.patch(f"/api/buildings/{create['id']}", json={"name": "New Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
```

- [ ] **Step 2: Run building tests to verify they fail**

```bash
pytest tests/test_buildings.py -v
```
Expected: FAIL (404 on all routes)

- [ ] **Step 3: Implement backend/app/routers/buildings.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.building import Building
from ..schemas.building import BuildingCreate, BuildingUpdate, BuildingOut

router = APIRouter()


@router.get("", response_model=List[BuildingOut])
def list_buildings(db: Session = Depends(get_db)):
    return db.query(Building).filter(Building.is_active == True).all()


@router.get("/{building_id}", response_model=BuildingOut)
def get_building(building_id: int, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.post("", response_model=BuildingOut)
def create_building(payload: BuildingCreate, db: Session = Depends(get_db)):
    building = Building(**payload.model_dump())
    db.add(building)
    db.commit()
    db.refresh(building)
    return building


@router.patch("/{building_id}", response_model=BuildingOut)
def update_building(building_id: int, payload: BuildingUpdate, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(building, field, value)
    db.commit()
    db.refresh(building)
    return building
```

- [ ] **Step 4: Run building tests**

```bash
pytest tests/test_buildings.py -v
```
Expected: PASS (all 5 tests)

- [ ] **Step 5: Write team tests**

```python
# tests/test_teams.py
def test_list_teams_empty(client):
    response = client.get("/api/teams")
    assert response.status_code == 200
    assert response.json() == []


def test_create_team(client):
    payload = {"name": "HVAC Team", "team_code": "HVAC", "specialty": "Heating"}
    response = client.post("/api/teams", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "HVAC Team"
    assert data["is_active"] is True


def test_get_team_not_found(client):
    response = client.get("/api/teams/999")
    assert response.status_code == 404


def test_get_team_workload(client):
    team = client.post("/api/teams", json={"name": "Test Team"}).json()
    response = client.get(f"/api/teams/{team['id']}/workload")
    assert response.status_code == 200
    data = response.json()
    assert "open_count" in data
    assert "critical_count" in data
```

- [ ] **Step 6: Implement backend/app/routers/teams.py**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.team import Team
from ..models.work_order import WorkOrder
from ..schemas.team import TeamCreate, TeamUpdate, TeamOut, TeamWorkload

router = APIRouter()


@router.get("", response_model=List[TeamOut])
def list_teams(db: Session = Depends(get_db)):
    return db.query(Team).filter(Team.is_active == True).all()


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.post("", response_model=TeamOut)
def create_team(payload: TeamCreate, db: Session = Depends(get_db)):
    team = Team(**payload.model_dump())
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@router.patch("/{team_id}", response_model=TeamOut)
def update_team(team_id: int, payload: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.commit()
    db.refresh(team)
    return team


@router.get("/{team_id}/workload", response_model=TeamWorkload)
def get_team_workload(team_id: int, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    open_count = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == team_id,
        WorkOrder.status.in_(["open", "in_progress"])
    ).count()
    critical_count = db.query(WorkOrder).filter(
        WorkOrder.assigned_team_id == team_id,
        WorkOrder.priority == "critical",
        WorkOrder.status.in_(["open", "in_progress"])
    ).count()
    return TeamWorkload(
        team_id=team_id,
        team_name=team.name,
        open_count=open_count,
        critical_count=critical_count
    )
```

- [ ] **Step 7: Run all tests**

```bash
pytest tests/test_buildings.py tests/test_teams.py -v
```
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add backend/app/routers/buildings.py backend/app/routers/teams.py backend/tests/
git commit -m "feat: buildings and teams CRUD endpoints with tests"
```

---

### Task 6: SLA Service & Audit Service

**Files:**
- Create: `backend/app/services/sla_service.py`
- Create: `backend/app/services/audit_service.py`
- Create: `backend/tests/test_sla_service.py`

- [ ] **Step 1: Write SLA service tests**

```python
# tests/test_sla_service.py
from datetime import datetime, timezone
from app.services.sla_service import calculate_sla_deadline, is_overdue, SLA_HOURS

def test_sla_hours_config():
    assert SLA_HOURS["critical"] == 2
    assert SLA_HOURS["high"] == 24
    assert SLA_HOURS["medium"] == 72
    assert SLA_HOURS["low"] == 168


def test_calculate_sla_deadline_critical():
    now = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
    deadline = calculate_sla_deadline("critical", now)
    assert deadline.hour == 14  # 12:00 + 2h


def test_calculate_sla_deadline_low():
    from datetime import timedelta
    now = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    deadline = calculate_sla_deadline("low", now)
    assert deadline == now + timedelta(hours=168)


def test_is_overdue_past_deadline():
    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    assert is_overdue(past, "open") is True


def test_is_overdue_future_deadline():
    from datetime import timedelta
    future = datetime.now(timezone.utc) + timedelta(hours=10)
    assert is_overdue(future, "open") is False


def test_is_overdue_resolved_not_counted():
    past = datetime(2020, 1, 1, tzinfo=timezone.utc)
    assert is_overdue(past, "resolved") is False
```

- [ ] **Step 2: Run SLA tests to verify fail**

```bash
pytest tests/test_sla_service.py -v
```
Expected: FAIL (ImportError)

- [ ] **Step 3: Create backend/app/services/sla_service.py**

```python
from datetime import datetime, timedelta, timezone
from typing import Optional

SLA_HOURS = {
    "critical": 2,
    "high": 24,
    "medium": 72,
    "low": 168,
}

CLOSED_STATUSES = {"resolved", "closed"}


def calculate_sla_deadline(priority: str, created_at: datetime) -> datetime:
    hours = SLA_HOURS.get(priority, 72)
    return created_at + timedelta(hours=hours)


def is_overdue(sla_deadline: Optional[datetime], status: str) -> bool:
    if status in CLOSED_STATUSES:
        return False
    if sla_deadline is None:
        return False
    now = datetime.now(timezone.utc)
    if sla_deadline.tzinfo is None:
        sla_deadline = sla_deadline.replace(tzinfo=timezone.utc)
    return now > sla_deadline
```

- [ ] **Step 4: Create backend/app/services/audit_service.py**

```python
import json
from sqlalchemy.orm import Session
from ..models.audit_log import AuditLog


def log_event(
    db: Session,
    event_type: str,
    actor: str,
    details: dict,
    work_order_id: int = None,
    work_order_number: str = None,
    old_value: str = None,
    new_value: str = None,
):
    entry = AuditLog(
        event_type=event_type,
        work_order_id=work_order_id,
        work_order_number=work_order_number,
        actor=actor,
        details=json.dumps(details),
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    db.commit()
```

- [ ] **Step 5: Run SLA tests**

```bash
pytest tests/test_sla_service.py -v
```
Expected: PASS (all 6 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/ backend/tests/test_sla_service.py
git commit -m "feat: SLA service with deadline calculation and audit event writer"
```

---

### Task 7: Triage Agent (Rule-Based + Gemini)

**Files:**
- Create: `backend/app/services/triage_agent.py`
- Create: `backend/tests/test_triage_rule_based.py`
- Modify: `backend/app/routers/triage.py`

- [ ] **Step 1: Write triage agent tests**

```python
# tests/test_triage_rule_based.py
from app.services.triage_agent import run_rule_based_triage
from app.schemas.triage import TriageInput

def make_input(**kwargs):
    defaults = {"title": "Test", "description": "Test description", "building": "City Hall", "location_details": ""}
    defaults.update(kwargs)
    return TriageInput(**defaults)


def test_hvac_category():
    inp = make_input(title="AC not working", description="The air conditioning unit in room 201 stopped cooling")
    result = run_rule_based_triage(inp)
    assert result.category == "HVAC"
    assert result.assigned_team == "HVAC Team"


def test_plumbing_category():
    inp = make_input(title="Burst pipe", description="There is a water leak under the sink in the breakroom")
    result = run_rule_based_triage(inp)
    assert result.category == "Plumbing"
    assert result.assigned_team == "Plumbing Team"


def test_critical_priority_safety_keywords():
    inp = make_input(title="Gas leak detected", description="Strong smell of gas in boiler room, possible gas leak emergency")
    result = run_rule_based_triage(inp)
    assert result.priority == "critical"
    assert result.estimated_sla_hours == 2
    assert result.escalation_reason is not None


def test_high_priority_broken():
    inp = make_input(title="Elevator stuck", description="Elevator stuck between floors, people inside")
    result = run_rule_based_triage(inp)
    assert result.priority in ("critical", "high")
    assert result.estimated_sla_hours <= 24


def test_approval_manager_threshold():
    inp = make_input(title="HVAC replacement", description="Need to replace HVAC unit", estimated_cost=3000.0)
    result = run_rule_based_triage(inp)
    assert result.requires_approval is True


def test_approval_director_threshold():
    inp = make_input(title="Roof repair", description="Full roof replacement needed", estimated_cost=15000.0)
    result = run_rule_based_triage(inp)
    assert result.requires_approval is True


def test_no_approval_low_cost():
    inp = make_input(title="Light bulb out", description="Single light bulb needs replacing", estimated_cost=10.0)
    result = run_rule_based_triage(inp)
    assert result.requires_approval is False


def test_sla_hours_match_priority():
    from app.services.sla_service import SLA_HOURS
    inp = make_input(title="Minor cleaning needed", description="Floor needs mopping in hallway")
    result = run_rule_based_triage(inp)
    assert result.estimated_sla_hours == SLA_HOURS[result.priority]


def test_agent_mode_is_rule_based():
    result = run_rule_based_triage(make_input())
    assert result.agent_mode == "rule_based"
```

- [ ] **Step 2: Run triage tests to verify fail**

```bash
pytest tests/test_triage_rule_based.py -v
```
Expected: FAIL (ImportError)

- [ ] **Step 3: Create backend/app/services/triage_agent.py**

```python
import json
import logging
from typing import Optional
from ..schemas.triage import TriageInput, TriageOutput
from .sla_service import SLA_HOURS

logger = logging.getLogger(__name__)

CATEGORY_KEYWORDS = {
    "HVAC": ["hvac", "air conditioning", "heating", "ventilation", "ac unit", "furnace", "duct", "thermostat", "heat pump", "boiler", "cooling", "no heat", "no ac"],
    "Plumbing": ["pipe", "water leak", "drain", "toilet", "sink", "faucet", "sewage", "flood", "plumbing", "clog", "overflow", "hot water"],
    "Electrical": ["electrical", "power outage", "outlet", "circuit breaker", "wiring", "generator", "light fixture", "sparks", "ups", "no power"],
    "Elevator": ["elevator", "lift", "escalator", "stuck", "cab", "door open"],
    "Access Control": ["lock", "key card", "badge", "door access", "security camera", "alarm", "gate", "entry", "security breach"],
    "Fleet": ["vehicle", "truck", "fleet", "tire", "oil change", "engine", "brake", "transmission"],
    "Janitorial": ["clean", "mop", "spill", "trash", "restroom", "bathroom", "sanitation", "odor", "graffiti"],
}

CRITICAL_KEYWORDS = ["fire", "gas leak", "flood", "electrocution", "structural collapse", "no power entire building", "emergency", "severe injury", "safety hazard", "smoke", "carbon monoxide", "exposed wire", "sparks", "explosion"]
HIGH_KEYWORDS = ["broken", "not working", "failed", "outage", "urgent", "no heat", "no ac", "no hot water", "security breach", "lock failure", "elevator stuck", "standing water"]
MEDIUM_KEYWORDS = ["slow", "intermittent", "reduced", "minor", "occasionally", "inspection needed"]

CATEGORY_TO_TEAM = {
    "HVAC": "HVAC Team",
    "Plumbing": "Plumbing Team",
    "Electrical": "Electrical Team",
    "Elevator": "Elevator Contractor",
    "Access Control": "Access Control Team",
    "Fleet": "Fleet Maintenance",
    "Janitorial": "Janitorial Services",
    "General": "Janitorial Services",
}

MANAGER_APPROVAL_THRESHOLD = 2500.0
DIRECTOR_APPROVAL_THRESHOLD = 10000.0


def _classify_category(text: str) -> str:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "General"


def _classify_priority(text: str) -> str:
    if any(kw in text for kw in CRITICAL_KEYWORDS):
        return "critical"
    if any(kw in text for kw in HIGH_KEYWORDS):
        return "high"
    if any(kw in text for kw in MEDIUM_KEYWORDS):
        return "medium"
    return "low"


def _get_approval_info(estimated_cost: Optional[float]) -> tuple[bool, Optional[str]]:
    if estimated_cost is None:
        return False, None
    if estimated_cost > DIRECTOR_APPROVAL_THRESHOLD:
        return True, "director"
    if estimated_cost > MANAGER_APPROVAL_THRESHOLD:
        return True, "manager"
    return False, None


def _get_duplicate_risk(title: str, description: str, category: str) -> str:
    word_count = len(description.split())
    title_words = len(title.split())
    if title_words < 5 and category in ("Plumbing", "Electrical"):
        return "high"
    if word_count < 30:
        return "medium"
    return "low"


def _build_next_action(priority: str, team: str) -> str:
    if priority == "critical":
        return f"Dispatch {team} immediately and notify facility manager"
    if priority == "high":
        return f"Assign to {team} and contact within 2 hours"
    if priority == "medium":
        return f"Schedule with {team} within 3 business days"
    return f"Add to {team} maintenance queue"


def run_rule_based_triage(inp: TriageInput) -> TriageOutput:
    text = (inp.title + " " + inp.description).lower()
    category = _classify_category(text)
    priority = _classify_priority(text)
    team = CATEGORY_TO_TEAM.get(category, "Emergency Response") if priority == "critical" and category == "General" else CATEGORY_TO_TEAM.get(category, "Janitorial Services")
    if priority == "critical" and category == "General":
        team = "Emergency Response"
    sla_hours = SLA_HOURS[priority]
    requires_approval, approval_level = _get_approval_info(inp.estimated_cost)
    duplicate_risk = _get_duplicate_risk(inp.title, inp.description, category)
    escalation_reason = None
    if priority == "critical":
        escalation_reason = f"Safety risk detected: critical priority issue at {inp.building}"
    short_summary = f"{priority.capitalize()} {category} issue at {inp.building}: {inp.title[:80]}"
    recommended_next_action = _build_next_action(priority, team)
    risk_reasoning = (
        f"Category '{category}' determined by keyword match. "
        f"Priority '{priority}' based on {'safety keywords in description' if priority == 'critical' else 'issue severity keywords'}. "
        f"Duplicate risk '{duplicate_risk}' based on description length and category. "
        f"{'Approval required due to estimated cost $' + str(inp.estimated_cost) + '.' if requires_approval else 'No approval required.'}"
    )
    return TriageOutput(
        category=category,
        priority=priority,
        assigned_team=team,
        estimated_sla_hours=sla_hours,
        duplicate_risk=duplicate_risk,
        short_summary=short_summary,
        recommended_next_action=recommended_next_action,
        risk_reasoning=risk_reasoning,
        requires_approval=requires_approval,
        escalation_reason=escalation_reason,
        agent_mode="rule_based",
    )


def run_gemini_triage(inp: TriageInput, api_key: str) -> TriageOutput:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""You are an AI triage agent for a municipal facilities operations system.
Analyze this work order and return ONLY a valid JSON object with no markdown formatting.

Title: {inp.title}
Description: {inp.description}
Building: {inp.building}
Location: {inp.location_details}
Estimated Cost: {inp.estimated_cost if inp.estimated_cost is not None else "Not provided"}

Return JSON with exactly these fields:
- category: one of HVAC, Plumbing, Electrical, Elevator, Janitorial, Access Control, Fleet, General
- priority: one of critical, high, medium, low
- assigned_team: the name of the team that should handle this
- estimated_sla_hours: integer (2, 24, 72, or 168)
- duplicate_risk: one of low, medium, high
- short_summary: 1-2 sentence plain English summary
- recommended_next_action: specific next step
- risk_reasoning: explanation of priority and risk assessment
- requires_approval: boolean
- escalation_reason: string or null"""

        response = model.generate_content(prompt)
        raw = response.text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        result = TriageOutput(**data, agent_mode="gemini")
        return result
    except Exception as e:
        logger.warning(f"Gemini triage failed ({e}), falling back to rule-based")
        return run_rule_based_triage(inp)


def run_triage(inp: TriageInput) -> TriageOutput:
    from ..config import get_settings
    settings = get_settings()
    if settings.gemini_api_key:
        return run_gemini_triage(inp, settings.gemini_api_key)
    return run_rule_based_triage(inp)
```

- [ ] **Step 4: Implement backend/app/routers/triage.py**

```python
from fastapi import APIRouter
from ..schemas.triage import TriageInput, TriageOutput
from ..services.triage_agent import run_triage

router = APIRouter()


@router.post("", response_model=TriageOutput)
def triage_work_order(payload: TriageInput):
    return run_triage(payload)
```

- [ ] **Step 5: Run triage tests**

```bash
pytest tests/test_triage_rule_based.py -v
```
Expected: PASS (all 9 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/triage_agent.py backend/app/routers/triage.py backend/tests/test_triage_rule_based.py
git commit -m "feat: rule-based triage agent with Gemini integration and fallback"
```

---

### Task 8: Work Orders Router

**Files:**
- Modify: `backend/app/routers/work_orders.py`
- Create: `backend/tests/test_work_orders.py`

- [ ] **Step 1: Write work order tests**

```python
# tests/test_work_orders.py
import pytest


@pytest.fixture
def seeded_client(client, db):
    from app.seed.seed_data import seed_if_empty
    seed_if_empty(db)
    return client


def test_create_work_order(seeded_client):
    payload = {
        "title": "AC not cooling",
        "description": "The air conditioning in room 101 is not working properly",
        "building_id": 1,
        "location_details": "Room 101, second floor",
        "submitted_by": "Jane Smith",
        "estimated_cost": None,
    }
    response = seeded_client.post("/api/work-orders", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "AC not cooling"
    assert data["order_number"].startswith("WO-")
    assert data["category"] is not None
    assert data["priority"] is not None
    assert data["triage_result"] is not None


def test_list_work_orders(seeded_client):
    seeded_client.post("/api/work-orders", json={
        "title": "Broken sink", "description": "Sink drain is clogged", "building_id": 1,
        "submitted_by": "Bob", "estimated_cost": None
    })
    response = seeded_client.get("/api/work-orders")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1


def test_filter_by_status(seeded_client):
    seeded_client.post("/api/work-orders", json={
        "title": "Light out", "description": "Light bulb needs replacing", "building_id": 1,
        "submitted_by": "Alice", "estimated_cost": None
    })
    response = seeded_client.get("/api/work-orders?status=open")
    assert response.status_code == 200
    for item in response.json():
        assert item["status"] == "open"


def test_get_work_order_detail(seeded_client):
    created = seeded_client.post("/api/work-orders", json={
        "title": "Leak under sink", "description": "Water pipe leaking",
        "building_id": 1, "submitted_by": "Tom", "estimated_cost": None
    }).json()
    response = seeded_client.get(f"/api/work-orders/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_status(seeded_client):
    created = seeded_client.post("/api/work-orders", json={
        "title": "Power outage", "description": "No power in wing B",
        "building_id": 1, "submitted_by": "Manager", "estimated_cost": None
    }).json()
    response = seeded_client.patch(
        f"/api/work-orders/{created['id']}/status",
        json={"status": "in_progress", "actor": "Electrical Team"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_add_note(seeded_client):
    created = seeded_client.post("/api/work-orders", json={
        "title": "Graffiti on wall", "description": "Spray paint on east wall",
        "building_id": 1, "submitted_by": "Security", "estimated_cost": None
    }).json()
    response = seeded_client.post(
        f"/api/work-orders/{created['id']}/notes",
        json={"author": "Supervisor", "content": "Team dispatched", "note_type": "internal"}
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Team dispatched"
```

- [ ] **Step 2: Run tests to verify fail**

```bash
pytest tests/test_work_orders.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement backend/app/routers/work_orders.py**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from ..database import get_db
from ..models.work_order import WorkOrder
from ..models.work_order_note import WorkOrderNote
from ..models.triage_result import TriageResult
from ..models.building import Building
from ..models.team import Team
from ..schemas.work_order import (
    WorkOrderCreate, WorkOrderOut, WorkOrderListItem,
    WorkOrderStatusUpdate, WorkOrderAssignUpdate, WorkOrderApprove,
    NoteCreate, NoteOut,
)
from ..services.triage_agent import run_triage
from ..services.sla_service import calculate_sla_deadline
from ..services.audit_service import log_event
from ..schemas.triage import TriageInput

router = APIRouter()


def _generate_order_number(db: Session) -> str:
    year = datetime.now().year
    count = db.query(WorkOrder).count() + 1
    return f"WO-{year}-{count:05d}"


def _enrich_work_order(wo: WorkOrder, db: Session) -> dict:
    data = {c.name: getattr(wo, c.name) for c in wo.__table__.columns}
    building = db.query(Building).filter(Building.id == wo.building_id).first()
    team = db.query(Team).filter(Team.id == wo.assigned_team_id).first()
    triage = db.query(TriageResult).filter(TriageResult.work_order_id == wo.id).first()
    notes = db.query(WorkOrderNote).filter(WorkOrderNote.work_order_id == wo.id).order_by(WorkOrderNote.created_at).all()
    data["building_name"] = building.name if building else None
    data["assigned_team_name"] = team.name if team else None
    data["triage_result"] = triage
    data["notes"] = notes
    return data


@router.get("", response_model=List[WorkOrderListItem])
def list_work_orders(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    building_id: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(WorkOrder)
    if status:
        q = q.filter(WorkOrder.status == status)
    if priority:
        q = q.filter(WorkOrder.priority == priority)
    if category:
        q = q.filter(WorkOrder.category == category)
    if building_id:
        q = q.filter(WorkOrder.building_id == building_id)
    if team_id:
        q = q.filter(WorkOrder.assigned_team_id == team_id)
    if search:
        q = q.filter(
            WorkOrder.title.ilike(f"%{search}%") | WorkOrder.description.ilike(f"%{search}%")
        )
    work_orders = q.order_by(WorkOrder.created_at.desc()).all()
    results = []
    for wo in work_orders:
        building = db.query(Building).filter(Building.id == wo.building_id).first()
        team = db.query(Team).filter(Team.id == wo.assigned_team_id).first()
        item = WorkOrderListItem(
            id=wo.id, order_number=wo.order_number, title=wo.title,
            building_name=building.name if building else None,
            category=wo.category, status=wo.status, priority=wo.priority,
            assigned_team_name=team.name if team else None,
            submitted_by=wo.submitted_by, sla_deadline=wo.sla_deadline,
            requires_approval=wo.requires_approval, created_at=wo.created_at,
        )
        results.append(item)
    return results


@router.post("", response_model=WorkOrderOut)
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    building = db.query(Building).filter(Building.id == payload.building_id).first()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    triage_input = TriageInput(
        title=payload.title,
        description=payload.description,
        building=building.name,
        location_details=payload.location_details or "",
        estimated_cost=payload.estimated_cost,
    )
    triage_out = run_triage(triage_input)

    team = db.query(Team).filter(Team.name == triage_out.assigned_team).first()
    now = datetime.now(timezone.utc)
    sla_deadline = calculate_sla_deadline(triage_out.priority, now)

    wo = WorkOrder(
        order_number=_generate_order_number(db),
        title=payload.title,
        description=payload.description,
        building_id=payload.building_id,
        location_details=payload.location_details,
        category=triage_out.category,
        status="escalated" if triage_out.escalation_reason else "open",
        priority=triage_out.priority,
        assigned_team_id=team.id if team else None,
        submitted_by=payload.submitted_by,
        estimated_cost=payload.estimated_cost,
        sla_deadline=sla_deadline,
        sla_hours=triage_out.estimated_sla_hours,
        requires_approval=triage_out.requires_approval,
        approval_level=None,
    )
    db.add(wo)
    db.flush()

    triage_record = TriageResult(
        work_order_id=wo.id,
        category=triage_out.category,
        priority=triage_out.priority,
        assigned_team=triage_out.assigned_team,
        estimated_sla_hours=triage_out.estimated_sla_hours,
        duplicate_risk=triage_out.duplicate_risk,
        short_summary=triage_out.short_summary,
        recommended_next_action=triage_out.recommended_next_action,
        risk_reasoning=triage_out.risk_reasoning,
        requires_approval=triage_out.requires_approval,
        escalation_reason=triage_out.escalation_reason,
        agent_mode=triage_out.agent_mode,
    )
    db.add(triage_record)
    db.commit()
    db.refresh(wo)

    log_event(db, "work_order_created", payload.submitted_by,
              {"order_number": wo.order_number, "title": wo.title, "building": building.name},
              work_order_id=wo.id, work_order_number=wo.order_number)
    log_event(db, "triage_completed", "agent",
              {"agent_mode": triage_out.agent_mode, "category": triage_out.category,
               "priority": triage_out.priority, "assigned_team": triage_out.assigned_team},
              work_order_id=wo.id, work_order_number=wo.order_number)

    return WorkOrderOut(**_enrich_work_order(wo, db))


@router.get("/{work_order_id}", response_model=WorkOrderOut)
def get_work_order(work_order_id: int, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    return WorkOrderOut(**_enrich_work_order(wo, db))


@router.patch("/{work_order_id}/status", response_model=WorkOrderOut)
def update_status(work_order_id: int, payload: WorkOrderStatusUpdate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    old_status = wo.status
    wo.status = payload.status
    if payload.status == "resolved":
        wo.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(wo)
    log_event(db, "status_changed", payload.actor,
              {"order_number": wo.order_number},
              work_order_id=wo.id, work_order_number=wo.order_number,
              old_value=old_status, new_value=payload.status)
    return WorkOrderOut(**_enrich_work_order(wo, db))


@router.patch("/{work_order_id}/assign", response_model=WorkOrderOut)
def assign_team(work_order_id: int, payload: WorkOrderAssignUpdate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    team = db.query(Team).filter(Team.id == payload.assigned_team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    old_team_id = wo.assigned_team_id
    wo.assigned_team_id = payload.assigned_team_id
    db.commit()
    db.refresh(wo)
    log_event(db, "team_assigned", payload.actor,
              {"order_number": wo.order_number, "new_team": team.name},
              work_order_id=wo.id, work_order_number=wo.order_number,
              old_value=str(old_team_id), new_value=str(payload.assigned_team_id))
    return WorkOrderOut(**_enrich_work_order(wo, db))


@router.post("/{work_order_id}/notes", response_model=NoteOut)
def add_note(work_order_id: int, payload: NoteCreate, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    note = WorkOrderNote(work_order_id=work_order_id, **payload.model_dump())
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{work_order_id}/notes", response_model=List[NoteOut])
def list_notes(work_order_id: int, db: Session = Depends(get_db)):
    return db.query(WorkOrderNote).filter(WorkOrderNote.work_order_id == work_order_id).all()


@router.post("/{work_order_id}/approve", response_model=WorkOrderOut)
def approve_work_order(work_order_id: int, payload: WorkOrderApprove, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    wo.approved_by = payload.approved_by
    wo.approved_at = datetime.now(timezone.utc)
    wo.status = "in_progress"
    db.commit()
    db.refresh(wo)
    log_event(db, "approved", payload.approved_by,
              {"order_number": wo.order_number, "notes": payload.notes or ""},
              work_order_id=wo.id, work_order_number=wo.order_number)
    return WorkOrderOut(**_enrich_work_order(wo, db))
```

- [ ] **Step 4: Run work order tests**

```bash
pytest tests/test_work_orders.py -v
```
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/work_orders.py backend/tests/test_work_orders.py
git commit -m "feat: work orders CRUD with auto-triage, status management, notes, approval"
```

---

### Task 9: Analytics & Audit Log Routers

**Files:**
- Modify: `backend/app/routers/analytics.py`
- Modify: `backend/app/routers/audit_log.py`
- Create: `backend/tests/test_analytics.py`

- [ ] **Step 1: Write analytics tests**

```python
# tests/test_analytics.py
import pytest

@pytest.fixture
def client_with_work_orders(client, db):
    from app.seed.seed_data import seed_if_empty
    seed_if_empty(db)
    work_orders = [
        {"title": "AC broken", "description": "Air conditioning not working at all", "building_id": 1, "submitted_by": "Alice"},
        {"title": "Pipe leak", "description": "Water leak under sink in bathroom", "building_id": 2, "submitted_by": "Bob"},
        {"title": "Power outage", "description": "No power in wing B, circuit breaker tripped", "building_id": 1, "submitted_by": "Charlie"},
    ]
    for wo in work_orders:
        client.post("/api/work-orders", json={**wo, "estimated_cost": None})
    return client


def test_analytics_summary(client_with_work_orders):
    response = client_with_work_orders.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_work_orders"] >= 3
    assert "open_work_orders" in data
    assert "critical_work_orders" in data
    assert "overdue_work_orders" in data


def test_analytics_by_category(client_with_work_orders):
    response = client_with_work_orders.get("/api/analytics/by-category")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert all("category" in item and "count" in item for item in data)


def test_analytics_by_building(client_with_work_orders):
    response = client_with_work_orders.get("/api/analytics/by-building")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_analytics_by_team(client_with_work_orders):
    response = client_with_work_orders.get("/api/analytics/by-team")
    assert response.status_code == 200


def test_analytics_sla_performance(client_with_work_orders):
    response = client_with_work_orders.get("/api/analytics/sla-performance")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    priorities = [item["priority"] for item in data]
    assert "critical" in priorities
```

- [ ] **Step 2: Run tests to verify fail**

```bash
pytest tests/test_analytics.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement backend/app/routers/analytics.py**

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timezone

from ..database import get_db
from ..models.work_order import WorkOrder
from ..models.building import Building
from ..models.team import Team
from ..schemas.analytics import (
    AnalyticsSummary, CategoryCount, BuildingCount,
    TeamWorkloadItem, SlaPerformanceItem
)
from ..services.sla_service import SLA_HOURS, is_overdue

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_summary(db: Session = Depends(get_db)):
    total = db.query(WorkOrder).count()
    open_count = db.query(WorkOrder).filter(WorkOrder.status == "open").count()
    in_progress = db.query(WorkOrder).filter(WorkOrder.status == "in_progress").count()
    critical = db.query(WorkOrder).filter(WorkOrder.priority == "critical", WorkOrder.status.notin_(["resolved", "closed"])).count()
    pending_approval = db.query(WorkOrder).filter(WorkOrder.status == "pending_approval").count()
    all_open = db.query(WorkOrder).filter(WorkOrder.status.notin_(["resolved", "closed"])).all()
    overdue = sum(1 for wo in all_open if wo.sla_deadline and is_overdue(wo.sla_deadline, wo.status))
    return AnalyticsSummary(
        total_work_orders=total, open_work_orders=open_count,
        in_progress_work_orders=in_progress, critical_work_orders=critical,
        overdue_work_orders=overdue, pending_approval_work_orders=pending_approval,
    )


@router.get("/by-category", response_model=List[CategoryCount])
def by_category(db: Session = Depends(get_db)):
    rows = db.query(WorkOrder.category, func.count(WorkOrder.id)).group_by(WorkOrder.category).all()
    return [CategoryCount(category=r[0], count=r[1]) for r in rows]


@router.get("/by-building", response_model=List[BuildingCount])
def by_building(db: Session = Depends(get_db)):
    rows = (
        db.query(Building.name, func.count(WorkOrder.id))
        .join(WorkOrder, WorkOrder.building_id == Building.id, isouter=True)
        .group_by(Building.name)
        .all()
    )
    return [BuildingCount(building_name=r[0], count=r[1] or 0) for r in rows]


@router.get("/by-team", response_model=List[TeamWorkloadItem])
def by_team(db: Session = Depends(get_db)):
    teams = db.query(Team).filter(Team.is_active == True).all()
    result = []
    for team in teams:
        open_count = db.query(WorkOrder).filter(WorkOrder.assigned_team_id == team.id, WorkOrder.status == "open").count()
        in_progress = db.query(WorkOrder).filter(WorkOrder.assigned_team_id == team.id, WorkOrder.status == "in_progress").count()
        critical = db.query(WorkOrder).filter(WorkOrder.assigned_team_id == team.id, WorkOrder.priority == "critical", WorkOrder.status.notin_(["resolved", "closed"])).count()
        result.append(TeamWorkloadItem(team_name=team.name, open_count=open_count, in_progress_count=in_progress, critical_count=critical))
    return result


@router.get("/sla-performance", response_model=List[SlaPerformanceItem])
def sla_performance(db: Session = Depends(get_db)):
    result = []
    for priority, target_hours in SLA_HOURS.items():
        resolved = db.query(WorkOrder).filter(
            WorkOrder.priority == priority,
            WorkOrder.status == "resolved",
            WorkOrder.resolved_at.isnot(None),
        ).all()
        count = db.query(WorkOrder).filter(WorkOrder.priority == priority).count()
        avg_hours = None
        if resolved:
            durations = []
            for wo in resolved:
                if wo.created_at and wo.resolved_at:
                    created = wo.created_at.replace(tzinfo=timezone.utc) if wo.created_at.tzinfo is None else wo.created_at
                    resolved_at = wo.resolved_at.replace(tzinfo=timezone.utc) if wo.resolved_at.tzinfo is None else wo.resolved_at
                    durations.append((resolved_at - created).total_seconds() / 3600)
            avg_hours = sum(durations) / len(durations) if durations else None
        result.append(SlaPerformanceItem(priority=priority, target_hours=target_hours, average_actual_hours=avg_hours, count=count))
    return result
```

- [ ] **Step 4: Implement backend/app/routers/audit_log.py**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models.audit_log import AuditLog
from ..schemas.audit_log import AuditLogOut

router = APIRouter()


@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    event_type: Optional[str] = Query(None),
    work_order_id: Optional[int] = Query(None),
    actor: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if work_order_id:
        q = q.filter(AuditLog.work_order_id == work_order_id)
    if actor:
        q = q.filter(AuditLog.actor.ilike(f"%{actor}%"))
    if start_date:
        q = q.filter(AuditLog.created_at >= start_date)
    if end_date:
        q = q.filter(AuditLog.created_at <= end_date)
    return q.order_by(AuditLog.created_at.desc()).limit(500).all()
```

- [ ] **Step 5: Run analytics tests**

```bash
pytest tests/test_analytics.py -v
```
Expected: PASS (all 5 tests)

- [ ] **Step 6: Run full backend test suite**

```bash
pytest backend/tests/ -v
```
Expected: all tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/analytics.py backend/app/routers/audit_log.py backend/tests/test_analytics.py
git commit -m "feat: analytics and audit log endpoints with full test coverage"
```

---

### Task 10: Frontend Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/utils/constants.ts`
- Create: `frontend/src/utils/formatters.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Initialize frontend project**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query axios react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer @types/node
npx tailwindcss init -p
```

- [ ] **Step 2: Configure tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        city: {
          blue: '#1e3a5f',
          gold: '#c9973b',
        }
      }
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: Configure vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 4: Create frontend/src/types/index.ts**

```typescript
export interface Building {
  id: number
  name: string
  address?: string
  building_code?: string
  floors?: number
  is_active: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  team_code?: string
  specialty?: string
  contact_email?: string
  is_active: boolean
  created_at: string
}

export interface TeamWorkload {
  team_id: number
  team_name: string
  open_count: number
  critical_count: number
}

export interface TriageResult {
  id: number
  work_order_id: number
  category: string
  priority: string
  assigned_team: string
  estimated_sla_hours: number
  duplicate_risk: 'low' | 'medium' | 'high'
  short_summary: string
  recommended_next_action: string
  risk_reasoning: string
  requires_approval: boolean
  escalation_reason?: string
  agent_mode: 'gemini' | 'rule_based'
  created_at: string
}

export interface WorkOrderNote {
  id: number
  work_order_id: number
  author: string
  content: string
  note_type: string
  created_at: string
}

export interface WorkOrder {
  id: number
  order_number: string
  title: string
  description: string
  building_id?: number
  building_name?: string
  location_details?: string
  category: string
  status: string
  priority: string
  assigned_team_id?: number
  assigned_team_name?: string
  submitted_by: string
  estimated_cost?: number
  actual_cost?: number
  sla_deadline?: string
  sla_hours?: number
  requires_approval: boolean
  approval_level?: string
  approved_by?: string
  approved_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  triage_result?: TriageResult
  notes?: WorkOrderNote[]
}

export interface WorkOrderListItem {
  id: number
  order_number: string
  title: string
  building_name?: string
  category: string
  status: string
  priority: string
  assigned_team_name?: string
  submitted_by: string
  sla_deadline?: string
  requires_approval: boolean
  created_at: string
}

export interface AnalyticsSummary {
  total_work_orders: number
  open_work_orders: number
  in_progress_work_orders: number
  critical_work_orders: number
  overdue_work_orders: number
  pending_approval_work_orders: number
}

export interface CategoryCount { category: string; count: number }
export interface BuildingCount { building_name: string; count: number }
export interface TeamWorkloadItem {
  team_name: string
  open_count: number
  in_progress_count: number
  critical_count: number
}
export interface SlaPerformanceItem {
  priority: string
  target_hours: number
  average_actual_hours?: number
  count: number
}

export interface AuditLog {
  id: number
  event_type: string
  work_order_id?: number
  work_order_number?: string
  actor: string
  details: string
  old_value?: string
  new_value?: string
  created_at: string
}

export interface TriageInput {
  title: string
  description: string
  building: string
  location_details?: string
  estimated_cost?: number
}

export interface TriageOutput {
  category: string
  priority: string
  assigned_team: string
  estimated_sla_hours: number
  duplicate_risk: string
  short_summary: string
  recommended_next_action: string
  risk_reasoning: string
  requires_approval: boolean
  escalation_reason?: string
  agent_mode: string
}
```

- [ ] **Step 5: Create frontend/src/utils/constants.ts**

```typescript
export const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
  escalated: 'bg-red-100 text-red-800',
}

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_approval: 'Pending Approval',
  resolved: 'Resolved',
  closed: 'Closed',
  escalated: 'Escalated',
}

export const CATEGORIES = ['HVAC', 'Plumbing', 'Electrical', 'Elevator', 'Janitorial', 'Access Control', 'Fleet', 'General']
export const STATUSES = Object.keys(STATUS_LABELS)
export const PRIORITIES = ['critical', 'high', 'medium', 'low']
```

- [ ] **Step 6: Create frontend/src/utils/formatters.ts**

```typescript
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatCurrency(amount?: number): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function isOverdue(slaDeadline?: string, status?: string): boolean {
  if (!slaDeadline || status === 'resolved' || status === 'closed') return false
  return new Date(slaDeadline) < new Date()
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

- [ ] **Step 7: Create frontend/src/api/client.ts**

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export default client
```

- [ ] **Step 8: Create all API modules** (`workOrders.ts`, `buildings.ts`, `teams.ts`, `triage.ts`, `analytics.ts`, `auditLog.ts`)

Each file exports typed async functions calling client. Example for `buildings.ts`:
```typescript
import client from './client'
import type { Building, BuildingCreate } from '../types'

export const getBuildings = () => client.get<Building[]>('/buildings').then(r => r.data)
export const getBuilding = (id: number) => client.get<Building>(`/buildings/${id}`).then(r => r.data)
export const createBuilding = (data: Partial<Building>) => client.post<Building>('/buildings', data).then(r => r.data)
```

Similar pattern for all other modules, matching the endpoint list in section 3.

- [ ] **Step 9: Create AppLayout, Sidebar, TopBar components**

`AppLayout.tsx` wraps `Sidebar + TopBar + <Outlet>` with Tailwind flex layout.

`Sidebar.tsx` renders nav links using `NavLink` from react-router-dom with city branding header ("Municipal Facilities Operations Agent") and links to all 9 pages with appropriate icons (use emoji or simple SVG paths).

`TopBar.tsx` renders current page title from a prop + city logo placeholder.

- [ ] **Step 10: Create shared UI components**

`StatusBadge.tsx`:
```typescript
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants'
export function StatusBadge({ status }: { status: string }) {
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>{STATUS_LABELS[status] ?? status}</span>
}
```

`PriorityBadge.tsx`, `StatCard.tsx`, `LoadingSpinner.tsx`, `EmptyState.tsx` — similar focused components.

- [ ] **Step 11: Create App.tsx with routing**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
// ... import all pages

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/work-orders/new" element={<NewWorkOrderPage />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetailPage />} />
            <Route path="/buildings" element={<BuildingsPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/agent-test" element={<AgentTestPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 12: Verify frontend starts**

```bash
cd frontend && npm run dev
```
Expected: app runs at http://localhost:5173 with sidebar visible

- [ ] **Step 13: Commit**

```bash
git add frontend/
git commit -m "feat: React + Vite frontend scaffolding with routing, types, API client"
```

---

### Task 11: Frontend Pages

**Files:** All files under `frontend/src/pages/` and `frontend/src/hooks/`

- [ ] **Step 1: Create custom hooks**

`useWorkOrders.ts` — wraps `useQuery` for list + `useMutation` for create/status update/assign/add note
`useBuildings.ts` — wraps `useQuery` for list
`useTeams.ts` — wraps `useQuery` for list + workload
`useAnalytics.ts` — wraps `useQuery` for all 5 analytics endpoints
`useAuditLog.ts` — wraps `useQuery` with filter params

- [ ] **Step 2: DashboardPage**

Displays 4 `StatCard` components (Total, Open, Critical, Overdue), then a `DataTable` of last 10 work orders with `StatusBadge` and `PriorityBadge`. Includes a "New Work Order" quick-action button.

- [ ] **Step 3: WorkOrdersPage**

Renders `WorkOrderFilters` at top. Calls `useWorkOrders` with active filter state. Shows results in `DataTable`. Each row is clickable, navigating to `/work-orders/:id`.

- [ ] **Step 4: NewWorkOrderPage**

Form fields: title (text), description (textarea), building (select from API), location_details (text), submitted_by (text), estimated_cost (number, optional). On submit: POST to `/api/work-orders`. On success: navigate to the new work order's detail page. Shows a loading state during submission.

- [ ] **Step 5: WorkOrderDetailPage**

Fetches full work order by ID. Displays all fields. Renders `TriageResultPanel` for triage output. Shows notes list + `NoteForm`. Status update dropdown for allowed transitions. Approval button if `requires_approval` is true.

- [ ] **Step 6: BuildingsPage**

Card grid. Each card shows building name, code, address, floor count, and a link to filtered work orders for that building.

- [ ] **Step 7: TeamsPage**

Card grid. Each card shows team name, specialty, contact, and open/critical work order counts from workload endpoint.

- [ ] **Step 8: AnalyticsPage**

Uses Recharts:
- `BarChart` for work orders by category
- `BarChart` for work orders by building  
- `BarChart` for team workload (grouped: open + critical)
- `BarChart` for SLA performance (target vs actual hours)

- [ ] **Step 9: AuditLogPage**

Filter bar for event_type and actor. `DataTable` showing event_type, work_order_number, actor, details (parsed JSON pretty-printed), old/new value, timestamp.

- [ ] **Step 10: AgentTestPage**

Free-form form with all TriageInput fields. On submit calls `POST /api/triage`. Renders `TriageResultPanel` with full output. Shows agent_mode badge (gemini vs rule_based). Includes a "Use these results to create a work order" button that navigates to NewWorkOrderPage with pre-filled form values.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/pages/ frontend/src/hooks/ frontend/src/components/
git commit -m "feat: all 9 frontend pages with React Query, filtering, and Recharts analytics"
```

---

### Task 12: Documentation

**Files:**
- Create: `docs/README.md`
- Create: `docs/BUSINESS_STATEMENT.md`
- Create: `docs/LOGICAL_STRUCTURE.md`
- Create: `docs/TECHNICAL_IMPLEMENTATION_GUIDE.md`
- Create: `docs/GEMINI_SYSTEM_PROMPT.md`
- Create: `docs/SAMPLE_TEST_PROMPTS.md`

- [ ] **Step 1: Write docs/GEMINI_SYSTEM_PROMPT.md** (used at runtime by triage_agent.py)

```markdown
# Gemini Triage Agent System Prompt

You are a municipal facilities AI triage agent for a city government operations system. Your job is to analyze incoming maintenance work orders submitted by city staff and produce a structured triage assessment.

## Your responsibilities:
- Classify the work order into the correct maintenance category
- Assign the appropriate priority based on safety risk, operational impact, and urgency
- Identify which maintenance team should handle the request
- Estimate the service level agreement (SLA) in hours
- Flag duplicate risk if the request seems generic or common
- Generate a concise summary and recommended next action
- Identify if approval is required based on estimated cost
- Flag safety risks that require immediate escalation

## Categories:
- HVAC — heating, ventilation, air conditioning, boilers
- Plumbing — pipes, water, drainage, sewage
- Electrical — power, wiring, lighting, generators
- Elevator — elevators, lifts, escalators
- Janitorial — cleaning, sanitation, waste
- Access Control — locks, badges, security cameras, alarms
- Fleet — municipal vehicles and equipment
- General — anything that does not clearly fit another category

## Priority levels:
- critical — immediate safety risk, affects building operations severely (SLA: 2 hours)
- high — significant issue affecting staff or building function (SLA: 24 hours)
- medium — moderate impact, non-emergency (SLA: 72 hours)
- low — routine maintenance, cosmetic issues (SLA: 168 hours)

## Approval thresholds:
- Estimated cost > $2,500 → requires manager approval
- Estimated cost > $10,000 → requires director approval

## Response format:
Always return ONLY a raw JSON object. No markdown, no explanation. Use exactly these field names.
```

- [ ] **Step 2: Write remaining documentation files**

`README.md` — project overview, quick start instructions for backend and frontend, environment variable setup

`BUSINESS_STATEMENT.md` — problem statement (manual work orders are slow, inconsistent, lack AI triage), solution, target users (city staff, facilities managers), expected outcomes

`LOGICAL_STRUCTURE.md` — module diagram, data flow (submit → triage → create work order → audit), status lifecycle diagram in markdown

`TECHNICAL_IMPLEMENTATION_GUIDE.md` — detailed setup, how to run tests, how to add a new building/team, how to extend the triage agent, how to swap in a different LLM

`SAMPLE_TEST_PROMPTS.md` — 10+ realistic work order scenarios with expected triage output for each:
- HVAC failure in winter
- Elevator stuck with occupants (critical)
- Burst pipe flooding a server room (critical, high cost)
- Vandalism/graffiti (janitorial, low)
- Generator test needed (electrical, medium)
- Security camera offline (access control)
- Fleet vehicle brake failure (fleet, critical)
- Library roof leak (high, requires approval)

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: complete documentation set including Gemini system prompt and sample test prompts"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Work Orders (create, list, filter, status update, notes) — Tasks 8
- ✅ AI Triage Agent with all 10 output fields — Task 7
- ✅ Buildings Module with 8 seed records — Tasks 2, 4, 5
- ✅ Teams Module with 8 seed records — Tasks 2, 4, 5
- ✅ SLA + escalation + approval logic — Task 6
- ✅ Analytics Dashboard (all 6 metrics) — Task 9
- ✅ Audit Log (all 7 event types) — Tasks 6, 8, 9
- ✅ All 9 required pages — Tasks 10, 11
- ✅ All 6 required documentation files — Task 12
- ✅ Gemini + rule-based fallback — Task 7
- ✅ 8 required buildings seeded — Task 4
- ✅ 8 required teams seeded — Task 4

**Type consistency check:**
- `TriageOutput.agent_mode` defined in schemas/triage.py Task 3, used in triage_agent.py Task 7 ✅
- `WorkOrderOut` references `TriageResultOut` from schemas/triage.py ✅
- `_enrich_work_order` returns a dict consumed by `WorkOrderOut(**...)` ✅
- `SLA_HOURS` dict defined in sla_service.py Task 6, imported in triage_agent.py Task 7 ✅
- `seed_if_empty` defined in Task 4, called in main.py Task 1 startup ✅
