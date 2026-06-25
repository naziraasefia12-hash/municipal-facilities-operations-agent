# Technical Implementation Guide

## Prerequisites

- Python 3.11 or later
- Node.js 18 or later (for frontend, Phase 3)
- A Gemini API key (optional — rule-based triage works without one)

---

## Initial Setup

### 1. Environment file

Copy the example environment file into the backend directory:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and fill in any values you want to override. At minimum, add your `GEMINI_API_KEY` if you have one.

### 2. Python virtual environment

```bash
cd backend
python -m venv .venv

# Activate (Linux / macOS)
source .venv/bin/activate

# Activate (Windows PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 3. Start the API server

```bash
# From the backend/ directory
uvicorn app.main:app --reload
```

- API: http://localhost:8000  
- Swagger UI: http://localhost:8000/docs  
- ReDoc: http://localhost:8000/redoc

On first startup, the application:
1. Creates all database tables (SQLite file: `municipal_facilities.db`)
2. Seeds 8 buildings, 8 maintenance teams, and 8 sample work orders with triage results

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Run a specific test file:
```bash
pytest tests/test_triage_rule_based.py -v
```

Run tests with output (print statements visible):
```bash
pytest tests/ -v -s
```

Tests use an in-memory SQLite database and do not touch the main `municipal_facilities.db` file.

---

## Configuration Reference

All settings live in `backend/app/config.py` and are loaded from environment variables (or `backend/.env`).

| Setting | Env Var | Default | Notes |
|---------|---------|---------|-------|
| Gemini API key | `GEMINI_API_KEY` | *(empty)* | Leave blank for rule-based fallback |
| Gemini model | `GEMINI_MODEL` | `gemini-1.5-flash` | Change to any valid Gemini model ID |
| Database URL | `DATABASE_URL` | `sqlite:///./municipal_facilities.db` | Relative to `backend/` |
| App environment | `APP_ENV` | `development` | Set to `test` to skip seed data |

---

## Project Layout

```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, router registration, startup
│   ├── config.py          # Settings loaded from .env
│   ├── database.py        # SQLAlchemy engine, session factory, Base
│   ├── models/            # SQLAlchemy ORM table definitions
│   ├── schemas/           # Pydantic v2 request/response models
│   ├── routers/           # FastAPI route handlers
│   ├── services/          # Business logic (triage, SLA, audit)
│   └── seed/              # Initial data loader
├── tests/
│   ├── conftest.py        # Shared pytest fixtures
│   └── test_*.py          # Test modules
├── requirements.txt
└── pytest.ini
```

---

## How the AI Triage Agent Works

The triage agent lives in `backend/app/services/triage_agent.py`.

**At runtime**, `run_triage(inp)` checks whether `GEMINI_API_KEY` is set:
- If **set**: calls `run_gemini_triage()`, which sends a structured prompt to the Gemini API and parses the JSON response. On any parse or validation error, it automatically falls back to the rule-based engine.
- If **not set**: calls `run_rule_based_triage()` directly.

**Both paths** return a `TriageOutput` Pydantic model with identical fields. The `agent_mode` field tells you which path ran (`"gemini"` or `"rule_based"`).

### Changing the Gemini model

Set `GEMINI_MODEL` in your `.env` file:

```env
GEMINI_MODEL=gemini-2.0-flash-exp
```

No code changes required.

### Testing the agent interactively

Send a POST request to `/api/agent/triage-preview`:

```json
{
  "title": "Elevator stuck between floors",
  "description": "Passenger elevator stopped between 2nd and 3rd floors. Door is not opening. No occupants trapped.",
  "building": "Central Library",
  "location_details": "Main lobby elevator bank",
  "estimated_cost": null
}
```

The response includes all triage fields plus `agent_mode` so you can see which path ran.

---

## How to Add a New Building

Option A — via the API:
```bash
curl -X POST http://localhost:8000/api/buildings \
  -H "Content-Type: application/json" \
  -d '{"name": "Animal Services Center", "address": "900 Pound Road", "building_code": "ASC-001", "floors": 1}'
```

Option B — in the seed data:
Add an entry to `BUILDINGS` in `backend/app/seed/seed_data.py`. The `seed_if_empty` function only runs when no buildings exist; to re-seed with new data, delete `municipal_facilities.db` and restart the server.

---

## How to Add a New Maintenance Team

Same options as buildings, using the `/api/teams` endpoint or `TEAMS` list in `seed_data.py`.

After adding a team, update `CATEGORY_TO_TEAM` in `triage_agent.py` if the new team should be auto-assigned for a category.

---

## How to Extend the Triage Agent

### Add a new category

1. Add keywords to `CATEGORY_KEYWORDS` in `triage_agent.py`
2. Map the new category to a team in `CATEGORY_TO_TEAM`
3. Update `TriageOutput.category` `Literal` in `schemas/triage.py`

### Add a safety keyword

Add to `CRITICAL_KEYWORDS` in `triage_agent.py`. Any description containing this phrase will receive `priority = "critical"` and be auto-escalated.

### Change SLA hours

Edit `SLA_HOURS` in `backend/app/services/sla_service.py`:

```python
SLA_HOURS = {
    "critical": 2,    # hours
    "high": 24,
    "medium": 72,
    "low": 168,
}
```

---

## How to Swap the LLM

The Gemini client is isolated in `run_gemini_triage()` inside `triage_agent.py`. To swap in a different provider:

1. Replace the `google-generativeai` import and API call with your chosen SDK
2. Keep the same prompt template and JSON parsing logic
3. Return a `TriageOutput` with `agent_mode="<your-provider>"`
4. Update `requirements.txt` with the new dependency

The rest of the application — routers, schemas, seed data, tests — does not need to change.

---

## Resetting the Database

To start fresh:

```bash
# From the backend/ directory
rm municipal_facilities.db
uvicorn app.main:app --reload  # re-seeds automatically on startup
```
