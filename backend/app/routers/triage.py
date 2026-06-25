from fastapi import APIRouter
from ..schemas.triage import TriageInput, TriageOutput
from ..services.triage_agent import run_triage

router = APIRouter()


@router.post("", response_model=TriageOutput)
def triage_preview(payload: TriageInput):
    """Run triage on the provided input without creating a work order."""
    return run_triage(payload)
