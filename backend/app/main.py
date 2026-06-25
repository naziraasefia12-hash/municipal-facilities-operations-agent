from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import agent, analytics, audit_log, buildings, teams, triage, work_orders

app = FastAPI(
    title="Municipal Facilities Operations Agent",
    description="Work order management platform with AI triage for city facilities teams.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(buildings.router, prefix="/api/buildings", tags=["buildings"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(work_orders.router, prefix="/api/work-orders", tags=["work-orders"])
app.include_router(triage.router, prefix="/api/triage", tags=["triage"])
app.include_router(agent.router, prefix="/api/agent", tags=["agent"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(audit_log.router, prefix="/api/audit-logs", tags=["audit-log"])


@app.on_event("startup")
def on_startup() -> None:
    from .config import get_settings

    init_db()
    settings = get_settings()
    if settings.app_env != "test":
        from .seed.seed_data import seed_if_empty
        from .database import SessionLocal

        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "Municipal Facilities Operations Agent"}
