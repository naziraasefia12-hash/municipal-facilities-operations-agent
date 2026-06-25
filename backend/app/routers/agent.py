from fastapi import APIRouter
from ..schemas.triage import TriageInput, TriageOutput
from ..services.triage_agent import run_triage

router = APIRouter()


@router.post("/triage-preview", response_model=TriageOutput)
def agent_triage_preview(payload: TriageInput):
    """
    AI agent triage preview endpoint.

    Runs the full triage pipeline — Gemini if configured, rule-based fallback
    otherwise — and returns a structured assessment without persisting a work
    order. Useful for testing agent output and previewing classifications before
    submission.
    """
    return run_triage(payload)
