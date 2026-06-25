import json
import logging
from typing import Optional
from ..schemas.triage import TriageInput, TriageOutput
from .sla_service import SLA_HOURS

logger = logging.getLogger(__name__)

# ── Category keyword mapping ──────────────────────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "HVAC": [
        "hvac", "air conditioning", "heating", "ventilation", "ac unit", "furnace",
        "duct", "thermostat", "heat pump", "boiler", "cooling", "no heat", "no ac",
        "temperature", "chiller", "rooftop unit",
    ],
    "Plumbing": [
        "pipe", "water leak", "drain", "toilet", "sink", "faucet", "sewage",
        "flood", "plumbing", "clog", "overflow", "hot water", "gas leak", "gas odor",
        "gas smell", "standing water", "water intrusion", "roof leak",
    ],
    "Electrical": [
        "electrical", "power outage", "outlet", "circuit breaker", "wiring",
        "generator", "light fixture", "sparks", "ups", "no power", "breaker",
        "lighting", "lamp", "ballast",
    ],
    "Elevator": [
        "elevator", "lift", "escalator", "stuck", "cab", "trapped", "elevator door",
    ],
    "Access Control": [
        "lock", "key card", "badge", "door access", "security camera", "alarm",
        "gate", "entry", "security breach", "keypad", "card reader",
    ],
    "Fleet": [
        "vehicle", "truck", "fleet", "tire", "oil change", "engine", "brake",
        "transmission", "city vehicle", "unit 22", "unit 44", "pickup",
    ],
    "Janitorial": [
        "clean", "mop", "spill", "trash", "restroom", "bathroom", "sanitation",
        "odor", "graffiti", "vandalism", "janitorial", "waste",
    ],
}

# ── Compound hazard detection ─────────────────────────────────────────────────
# These detectors run BEFORE category classification so that life-safety signals
# cannot be overridden by a coincidental keyword match (e.g. "boiler" → HVAC).

# Gas safety — direct odour/smell terms always trigger; evacuation + boiler context
# also triggers because a gas smell near a boiler is not an HVAC issue.
_GAS_SAFETY_PRIMARY: list[str] = [
    "gas odor", "gas smell", "smell of gas", "odor of gas",
    "natural gas", "gas fumes", "gas leak", "leak smell",
]
_GAS_BOILER_CONTEXT: list[str] = ["boiler", "gas line", "gas pipe", "gas main"]
_GAS_EVACUATION_TERMS: list[str] = ["evacuated", "evacuation", "cleared the area", "vacated"]

# Water + electrical equipment compound hazard.
# Intentionally broad — safety systems should be conservative.
_WATER_HAZARD_TERMS: list[str] = [
    "water", "leak", "flood", "wet", "moisture", "drip", "pipe",
]
_ELECTRICAL_HAZARD_TERMS: list[str] = [
    "electrical panel", "exposed wire", "live wire", "outlet",
    "circuit breaker", "breaker panel", "breaker box", "wiring",
    "sparks", "electrical room", "server rack", "power panel",
    "electrical equipment", "junction box", "fuse box",
]

# ── Priority keyword mapping ──────────────────────────────────────────────────
CRITICAL_KEYWORDS: list[str] = [
    "fire", "gas leak", "gas odor", "gas smell", "flood", "electrocution",
    "structural collapse", "emergency", "severe injury", "injury", "safety hazard",
    "smoke", "carbon monoxide", "exposed wire", "sparks", "explosion",
    "brake failure", "elevator stuck", "stuck elevator", "trapped", "structural",
]

HIGH_KEYWORDS: list[str] = [
    "broken", "not working", "failed", "outage", "urgent", "no heat", "no ac",
    "no hot water", "security breach", "lock failure", "standing water",
    "water leak", "leaking", "out of service", "offline", "not operational",
]

# HVAC system failure phrases that indicate a unit has stopped functioning.
# These are not in HIGH_KEYWORDS by default; they get at least "medium".
# A public-area bump applied afterward can raise them to "high".
HVAC_FAILURE_KEYWORDS: list[str] = [
    "not cooling", "stopped cooling", "ac stopped", "heat outage",
    "no air conditioning", "not heating", "stopped heating", "ac failed",
    "hvac failed", "no cooling", "no heating", "hvac not working",
    "air conditioning stopped", "heating stopped",
]

MEDIUM_KEYWORDS: list[str] = [
    "slow", "intermittent", "reduced", "minor", "occasionally", "inspection needed",
    "cracked", "damaged", "malfunctioning", "partial", "dim", "worn",
]

# ── Public-facing area detection ──────────────────────────────────────────────
# Issues in public or high-occupancy spaces affect more people and warrant
# a one-level priority increase (capped at "high"; only compound hazards reach "critical").
PUBLIC_AREA_KEYWORDS: list[str] = [
    # Multi-word phrases first to avoid broad substring false positives
    "public lobby", "main lobby", "building lobby",
    "public hallway", "public hall", "public entrance", "main entrance",
    "public counter", "service counter", "public restroom", "library public",
    "waiting room", "community room", "common area",
    # Specific single words unlikely to appear in negated context
    "lobby", "visitors", "visitor", "courtroom",
    "front desk", "reception",
]

# ── Team routing ──────────────────────────────────────────────────────────────
CATEGORY_TO_TEAM: dict[str, str] = {
    "HVAC": "HVAC Team",
    "Plumbing": "Plumbing Team",
    "Electrical": "Electrical Team",
    "Elevator": "Elevator Contractor",
    "Access Control": "Access Control Team",
    "Fleet": "Fleet Maintenance",
    "Janitorial": "Janitorial Services",
    "General": "Janitorial Services",
}

MANAGER_APPROVAL_THRESHOLD = 2_500.0
DIRECTOR_APPROVAL_THRESHOLD = 10_000.0

_PRIORITY_SCALE = ["low", "medium", "high", "critical"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _has_gas_safety_event(text: str) -> bool:
    """
    True when a gas safety emergency is indicated.

    Triggers on:
    - Any direct gas smell/odour term ("gas odor", "gas smell", "natural gas", …)
    - Evacuation/cleared-area language combined with a boiler/gas-line context
      (catches "staff evacuated the boiler room" even without "gas smell" in text)
    """
    if any(term in text for term in _GAS_SAFETY_PRIMARY):
        return True
    has_boiler_context = any(t in text for t in _GAS_BOILER_CONTEXT)
    has_evacuation = any(t in text for t in _GAS_EVACUATION_TERMS)
    return has_boiler_context and has_evacuation


def _has_water_electrical_hazard(text: str) -> bool:
    """True when both water/liquid terms and electrical equipment terms appear together."""
    has_water = any(t in text for t in _WATER_HAZARD_TERMS)
    has_electrical = any(t in text for t in _ELECTRICAL_HAZARD_TERMS)
    return has_water and has_electrical


def _is_public_area(text: str) -> bool:
    """True when the description references a public-facing or high-occupancy space."""
    return any(kw in text for kw in PUBLIC_AREA_KEYWORDS)


def _classify_category(text: str) -> str:
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return category
    return "General"


def _classify_priority(text: str) -> str:
    """
    Keyword-based priority. Compound hazard detection runs separately in
    run_rule_based_triage and overrides this when triggered.

    Order of precedence:
      1. CRITICAL_KEYWORDS  — immediate safety risk
      2. HIGH_KEYWORDS      — system failure / significant impact
      3. HVAC_FAILURE_KEYWORDS — HVAC stopped functioning (baseline: medium)
      4. MEDIUM_KEYWORDS    — degraded but not failed
      5. default low
    """
    if any(kw in text for kw in CRITICAL_KEYWORDS):
        return "critical"
    is_hvac_failure = any(kw in text for kw in HVAC_FAILURE_KEYWORDS)
    if any(kw in text for kw in HIGH_KEYWORDS):
        return "high"
    if is_hvac_failure:
        # HVAC failures get medium by default; public-area bump can raise to high
        return "medium"
    if any(kw in text for kw in MEDIUM_KEYWORDS):
        return "medium"
    return "low"


def _apply_public_area_bump(priority: str, text: str) -> str:
    """
    Raise priority one step when the issue is in a public-facing space.
    Capped at "high" — only compound hazard detection can produce "critical".
    Never lowers an already-critical priority.
    """
    if priority == "critical" or not _is_public_area(text):
        return priority
    idx = _PRIORITY_SCALE.index(priority)
    bumped_idx = min(idx + 1, _PRIORITY_SCALE.index("high"))
    return _PRIORITY_SCALE[bumped_idx]


def _approval_info(estimated_cost: Optional[float]) -> tuple[bool, Optional[str]]:
    if estimated_cost is None:
        return False, None
    if estimated_cost > DIRECTOR_APPROVAL_THRESHOLD:
        return True, "director"
    if estimated_cost > MANAGER_APPROVAL_THRESHOLD:
        return True, "manager"
    return False, None


def _duplicate_risk(title: str, description: str, category: str) -> str:
    word_count = len(description.split())
    title_words = len(title.split())
    if title_words <= 2 and category in ("Plumbing", "Electrical", "HVAC"):
        return "high"
    if word_count < 20:
        return "medium"
    return "low"


def _next_action(priority: str, team: str, hazard: str = "") -> str:
    """
    Recommended next action aligned with SLA hours per priority level.
    The optional hazard tag produces a more specific instruction for known
    compound hazard types ("gas", "water_electrical").
    """
    if hazard == "gas":
        return (
            f"Dispatch {team} immediately. "
            "Contact the gas utility company for emergency shutoff verification. "
            "Keep the area fully evacuated — do not allow re-entry until authorized "
            "personnel confirm the space is safe. Response required within 2 hours."
        )
    if hazard == "water_electrical":
        return (
            f"Dispatch {team} immediately. "
            "Isolate affected electrical panels. Stop water source if safe to do so. "
            "Do not enter until both hazards are controlled. Response required within 2 hours."
        )
    if priority == "critical":
        return f"Dispatch {team} immediately — response required within 2 hours"
    if priority == "high":
        return f"Assign to {team} and ensure on-site response within 24 hours"
    if priority == "medium":
        return f"Schedule with {team} within 72 hours (3 business days)"
    return f"Add to {team} routine maintenance queue — address within 168 hours (1 week)"


# ── Public API ────────────────────────────────────────────────────────────────

def run_rule_based_triage(inp: TriageInput) -> TriageOutput:
    text = (inp.title + " " + inp.description).lower()

    # ── 1. Compound hazard checks (run before ALL category classification) ────
    # Life-safety signals must not be overridden by coincidental keyword matches
    # (e.g. "boiler" → HVAC, or "pipe" → Plumbing) when a gas or water+electrical
    # emergency is the actual issue.
    compound_hazard_escalation: Optional[str] = None

    if _has_gas_safety_event(text):
        # Gas safety: always Plumbing (gas lines) routed to Emergency Response.
        # "boiler" keyword must NOT pull this into HVAC.
        category = "Plumbing"
        priority = "critical"
        team = "Emergency Response"
        compound_hazard_escalation = (
            "Gas safety event detected — possible gas odor or gas leak. "
            "Area must remain evacuated. Contact the gas utility company for emergency "
            "shutoff verification. Do not re-enter until cleared by authorized personnel."
        )
    elif _has_water_electrical_hazard(text):
        # Water near electrical equipment — cross-category safety emergency.
        category = "Electrical"
        priority = "critical"
        team = "Emergency Response"
        compound_hazard_escalation = (
            "Water detected in proximity to electrical equipment — "
            "simultaneous water and electrical risk requires immediate emergency response."
        )
    else:
        # ── 2. Standard classification ────────────────────────────────────────
        category = _classify_category(text)
        priority = _classify_priority(text)
        # Raise priority for public-facing spaces (max: high)
        priority = _apply_public_area_bump(priority, text)
        team = CATEGORY_TO_TEAM.get(category, "Janitorial Services")
        if priority == "critical" and category == "General":
            team = "Emergency Response"

    sla_hours = SLA_HOURS[priority]
    requires_approval, approval_level = _approval_info(inp.estimated_cost)
    dup_risk = _duplicate_risk(inp.title, inp.description, category)

    # ── 3. Escalation reason ──────────────────────────────────────────────────
    escalation_reason: Optional[str] = compound_hazard_escalation
    if escalation_reason is None and priority == "critical":
        escalation_reason = (
            f"Safety risk detected in work order for {inp.building}. "
            "Immediate response required based on issue description."
        )

    # ── 4. Output assembly ────────────────────────────────────────────────────
    # Determine which compound hazard type fired (if any) for the next-action message.
    _hazard_tag = ""
    if compound_hazard_escalation:
        if "gas" in compound_hazard_escalation.lower():
            _hazard_tag = "gas"
        elif "electrical" in compound_hazard_escalation.lower():
            _hazard_tag = "water_electrical"

    short_summary = f"{priority.capitalize()} {category} issue at {inp.building}: {inp.title[:80]}"
    recommended_next_action = _next_action(priority, team, hazard=_hazard_tag)

    risk_parts = [
        f"Category '{category}' identified by keyword match in title and description.",
        f"Priority '{priority}' assigned based on "
        + (
            "gas safety compound hazard detected — gas odor/smell overrides normal category matching."
            if _hazard_tag == "gas"
            else "water-electrical compound hazard detected."
            if _hazard_tag == "water_electrical"
            else "safety-critical keywords detected."
            if priority == "critical"
            else "issue severity and operational impact."
        ),
    ]
    if _is_public_area(text) and not compound_hazard_escalation:
        risk_parts.append(
            "Public-facing area detected — priority raised one level to reflect visitor and operational impact."
        )
    risk_parts.append(f"Duplicate risk '{dup_risk}' based on description specificity.")
    if requires_approval and inp.estimated_cost is not None:
        threshold = (
            DIRECTOR_APPROVAL_THRESHOLD if approval_level == "director" else MANAGER_APPROVAL_THRESHOLD
        )
        risk_parts.append(
            f"Approval required: estimated cost ${inp.estimated_cost:,.2f} exceeds "
            f"${threshold:,.0f} {approval_level} threshold."
        )
    risk_reasoning = " ".join(risk_parts)

    return TriageOutput(
        category=category,
        priority=priority,
        assigned_team=team,
        estimated_sla_hours=sla_hours,
        duplicate_risk=dup_risk,
        short_summary=short_summary,
        recommended_next_action=recommended_next_action,
        risk_reasoning=risk_reasoning,
        requires_approval=requires_approval,
        escalation_reason=escalation_reason,
        agent_mode="rule_based",
    )


def run_gemini_triage(inp: TriageInput, api_key: str, model_name: str) -> TriageOutput:
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)

        cost_str = f"${inp.estimated_cost:,.2f}" if inp.estimated_cost is not None else "Not provided"
        prompt = f"""You are an AI triage agent for a municipal facilities operations system.
Analyze this maintenance work order and return ONLY a valid JSON object — no markdown, no explanation.

Title: {inp.title}
Description: {inp.description}
Building: {inp.building}
Location Details: {inp.location_details}
Estimated Cost: {cost_str}

Return JSON with exactly these fields:
- category: one of HVAC, Plumbing, Electrical, Elevator, Janitorial, Access Control, Fleet, General
- priority: one of critical, high, medium, low
- assigned_team: team name as a string
- estimated_sla_hours: integer — 2, 24, 72, or 168
- duplicate_risk: one of low, medium, high
- short_summary: 1-2 sentence plain-English summary
- recommended_next_action: aligned with SLA — critical=2h, high=24h, medium=72h, low=168h
- risk_reasoning: explanation of priority, team, and risk assessment
- requires_approval: true or false
- escalation_reason: string describing the safety concern, or null"""

        response = model.generate_content(prompt)
        raw = response.text.strip()

        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]).strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()

        data = json.loads(raw)
        data["agent_mode"] = "gemini"
        return TriageOutput(**data)

    except Exception as exc:
        logger.warning("Gemini triage failed (%r). Falling back to rule-based engine.", exc)
        return run_rule_based_triage(inp)


def run_triage(inp: TriageInput) -> TriageOutput:
    from ..config import get_settings

    settings = get_settings()
    if settings.gemini_api_key:
        return run_gemini_triage(inp, settings.gemini_api_key, settings.gemini_model)
    return run_rule_based_triage(inp)
