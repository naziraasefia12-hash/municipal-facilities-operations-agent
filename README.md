# Municipal Facilities Operations Agent

A full-stack platform for city staff to submit and manage internal building maintenance work orders. An AI triage agent classifies each request, assigns urgency, routes it to the correct maintenance team, estimates an SLA, and recommends a next action.

---

## What it does

- Staff submit a work order describing a building maintenance issue
- An AI agent (Gemini API or deterministic rule-based fallback) triages the request
- The agent outputs: category, priority, assigned team, SLA estimate, duplicate risk, summary, and recommended next action
- Work orders are tracked through a full status lifecycle with audit logging
- A dashboard and analytics pages give managers a real-time view of open, critical, and overdue items

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, SQLite |
| AI Agent | Google Gemini API (optional) + rule-based fallback |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query |
| Testing | pytest, httpx |

---

## Quick Start

### 1. Clone and set up environment variables

```bash
cp .env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY if you have one
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**  
Swagger docs: **http://localhost:8000/docs**

### 3. Frontend *(Phase 3 — not yet implemented)*

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | *(empty)* | Enables Gemini AI triage. Leave blank for rule-based fallback. |
| `GEMINI_MODEL` | No | `gemini-1.5-flash` | Gemini model name. Change without touching code. |
| `DATABASE_URL` | No | `sqlite:///./municipal_facilities.db` | SQLite file path. |
| `APP_ENV` | No | `development` | Set to `test` to suppress seed data in tests. |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/buildings` | List buildings |
| GET | `/api/teams` | List teams |
| GET | `/api/work-orders` | List work orders (filterable) |
| POST | `/api/work-orders` | Create work order (auto-triages) |
| GET | `/api/work-orders/{id}` | Work order detail |
| PATCH | `/api/work-orders/{id}/status` | Update status |
| PATCH | `/api/work-orders/{id}/assign` | Reassign team |
| POST | `/api/work-orders/{id}/notes` | Add internal note |
| GET | `/api/analytics` | Full analytics overview |
| GET | `/api/analytics/summary` | Summary counts |
| GET | `/api/audit-logs` | Audit event log |
| POST | `/api/triage` | Run triage only (no work order created) |
| POST | `/api/agent/triage-preview` | AI agent triage preview |

---

## Documentation

| File | Contents |
|------|----------|
| [BUSINESS_STATEMENT.md](BUSINESS_STATEMENT.md) | Problem, solution, and target users |
| [LOGICAL_STRUCTURE.md](LOGICAL_STRUCTURE.md) | Architecture, data flow, status lifecycle |
| [TECHNICAL_IMPLEMENTATION_GUIDE.md](TECHNICAL_IMPLEMENTATION_GUIDE.md) | Setup, extending the system, adding teams |
| [GEMINI_SYSTEM_PROMPT.md](GEMINI_SYSTEM_PROMPT.md) | The prompt loaded by the AI triage agent |
| [SAMPLE_TEST_PROMPTS.md](SAMPLE_TEST_PROMPTS.md) | Realistic test scenarios with expected outputs |

---

## Sample Buildings

City Hall · Public Works Yard · Police Administration Building · Fire Station 12  
Fleet Maintenance Garage · Central Library · Recreation Center · Parking Enforcement Office

## Sample Teams

HVAC Team · Plumbing Team · Electrical Team · Elevator Contractor  
Janitorial Services · Access Control Team · Fleet Maintenance · Emergency Response
