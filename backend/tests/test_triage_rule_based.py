from app.schemas.triage import TriageInput
from app.services.triage_agent import run_rule_based_triage


def _inp(**kwargs) -> TriageInput:
    defaults = {
        "title": "Test issue",
        "description": "A test description with enough words to avoid duplicate risk.",
        "building": "City Hall",
        "location_details": "",
        "estimated_cost": None,
    }
    defaults.update(kwargs)
    return TriageInput(**defaults)


# ── Category classification ───────────────────────────────────────────────────

def test_hvac_category():
    result = run_rule_based_triage(_inp(
        title="AC not cooling",
        description="The air conditioning unit in room 201 stopped producing cold air.",
    ))
    assert result.category == "HVAC"
    assert result.assigned_team == "HVAC Team"


def test_plumbing_category():
    result = run_rule_based_triage(_inp(
        title="Sink water leak",
        description="There is a water leak under the sink in the break room. Water is pooling on the floor.",
    ))
    assert result.category == "Plumbing"
    assert result.assigned_team == "Plumbing Team"


def test_electrical_category():
    result = run_rule_based_triage(_inp(
        title="Lighting outage",
        description="The circuit breaker for the east wing tripped and power went out to several offices.",
    ))
    assert result.category == "Electrical"
    assert result.assigned_team == "Electrical Team"


def test_elevator_category():
    result = run_rule_based_triage(_inp(
        title="Elevator stuck",
        description="The elevator in the main lobby stopped between the 2nd and 3rd floors. No one is inside.",
    ))
    assert result.category == "Elevator"
    assert result.assigned_team == "Elevator Contractor"


def test_fleet_category():
    result = run_rule_based_triage(_inp(
        title="City vehicle brake issue",
        description="Unit 44 truck has brake pedal going soft during morning patrol. Brake fluid leak visible.",
    ))
    assert result.category == "Fleet"
    assert result.assigned_team == "Fleet Maintenance"


def test_janitorial_category():
    result = run_rule_based_triage(_inp(
        title="Graffiti on south wall",
        description="Graffiti was found on the south exterior wall during morning rounds. Non-threatening content.",
    ))
    assert result.category == "Janitorial"
    assert result.assigned_team == "Janitorial Services"


def test_general_category_fallback():
    result = run_rule_based_triage(_inp(
        title="Broken window",
        description="A window in the office has a large crack. The pane needs replacement.",
    ))
    assert result.category == "General"


# ── Priority classification ───────────────────────────────────────────────────

def test_critical_priority_gas_keywords():
    result = run_rule_based_triage(_inp(
        title="Gas odor detected",
        description="Staff reported a strong gas smell in the boiler room. Area has been evacuated.",
    ))
    assert result.priority == "critical"
    assert result.estimated_sla_hours == 2
    # Gas safety must route to Emergency Response, not HVAC (boiler should not win)
    assert result.assigned_team == "Emergency Response"
    assert result.category == "Plumbing"
    assert result.escalation_reason is not None


def test_critical_priority_smoke():
    result = run_rule_based_triage(_inp(
        title="Smoke in server room",
        description="Visible smoke coming from the server rack in the IT room. Alarm triggered.",
    ))
    assert result.priority == "critical"


def test_high_priority_not_working():
    result = run_rule_based_triage(_inp(
        title="HVAC not working",
        description="The main heating system failed overnight and the building has no heat this morning.",
    ))
    assert result.priority == "high"
    assert result.estimated_sla_hours == 24


def test_medium_priority_cracked():
    result = run_rule_based_triage(_inp(
        title="Cracked tile in hallway",
        description="A cracked floor tile in the 3rd floor hallway poses a minor trip hazard. Needs repair.",
    ))
    assert result.priority == "medium"
    assert result.estimated_sla_hours == 72


def test_low_priority_default():
    result = run_rule_based_triage(_inp(
        title="Touch-up paint needed",
        description="The paint on the north wall of the conference room is scuffed and needs touch-up work.",
    ))
    assert result.priority == "low"
    assert result.estimated_sla_hours == 168


# ── Approval thresholds ───────────────────────────────────────────────────────

def test_no_approval_below_threshold(client=None):
    result = run_rule_based_triage(_inp(estimated_cost=2000.00))
    assert result.requires_approval is False


def test_manager_approval_above_2500():
    result = run_rule_based_triage(_inp(estimated_cost=3000.00))
    assert result.requires_approval is True


def test_director_approval_above_10000():
    result = run_rule_based_triage(_inp(estimated_cost=15000.00))
    assert result.requires_approval is True


def test_no_approval_when_cost_is_none():
    result = run_rule_based_triage(_inp(estimated_cost=None))
    assert result.requires_approval is False


# ── Escalation ────────────────────────────────────────────────────────────────

def test_escalation_set_for_critical():
    result = run_rule_based_triage(_inp(
        title="Structural collapse risk",
        description="Part of the ceiling appears to be structurally compromised.",
    ))
    assert result.priority == "critical"
    assert result.escalation_reason is not None


def test_no_escalation_for_low_priority():
    result = run_rule_based_triage(_inp(
        title="Light bulb out",
        description="A single overhead light bulb in the break room needs replacing.",
    ))
    assert result.escalation_reason is None


# ── Duplicate risk ────────────────────────────────────────────────────────────

def test_high_duplicate_risk_short_plumbing():
    # 2-word title + description containing "pipe" → classifies as Plumbing → high dup risk
    result = run_rule_based_triage(_inp(
        title="Pipe leak",
        description="There is a pipe leak under the sink in the restroom.",
    ))
    assert result.category == "Plumbing"
    assert result.duplicate_risk == "high"


def test_agent_mode_is_rule_based():
    result = run_rule_based_triage(_inp())
    assert result.agent_mode == "rule_based"


# ── Compound hazard: water near electrical equipment ──────────────────────────

def test_water_near_electrical_panel_is_critical():
    result = run_rule_based_triage(_inp(
        title="Water leaking near electrical panel",
        description=(
            "Water is leaking from a burst pipe directly onto an exposed electrical panel "
            "in the utility room. The area has been cordoned off."
        ),
    ))
    assert result.priority == "critical"
    assert result.estimated_sla_hours == 2
    assert result.assigned_team == "Emergency Response"
    assert result.category == "Electrical"
    assert result.escalation_reason is not None
    assert "electrical" in result.escalation_reason.lower()


def test_water_near_breaker_box_is_critical():
    result = run_rule_based_triage(_inp(
        title="Roof leak dripping onto breaker box",
        description=(
            "A roof leak has water dripping into the breaker box in the basement. "
            "Staff have stayed clear of the area."
        ),
    ))
    assert result.priority == "critical"
    assert result.assigned_team == "Emergency Response"
    assert result.escalation_reason is not None


def test_water_leak_without_electrical_is_not_compound():
    # Plain sink leak with no electrical terms must NOT trigger compound hazard
    result = run_rule_based_triage(_inp(
        title="Sink water leak",
        description="There is a water leak under the sink in the break room. Water is pooling on the floor.",
    ))
    assert result.category == "Plumbing"
    assert result.assigned_team == "Plumbing Team"
    assert result.priority != "critical"


# ── Public-facing area priority bump ─────────────────────────────────────────

def test_ac_not_cooling_public_lobby_is_high():
    result = run_rule_based_triage(_inp(
        title="AC not cooling in public lobby",
        description=(
            "The air conditioning is not cooling the main public lobby. "
            "Visitors are complaining about the heat."
        ),
    ))
    assert result.priority == "high"
    assert result.estimated_sla_hours == 24
    assert result.assigned_team == "HVAC Team"
    assert result.category == "HVAC"


def test_hvac_failure_non_public_area_is_medium():
    result = run_rule_based_triage(_inp(
        title="AC not cooling in storage room",
        description=(
            "The AC unit in the storage room is not cooling. "
            "The room is rarely occupied and not public-facing."
        ),
    ))
    assert result.priority == "medium"
    assert result.estimated_sla_hours == 72
    assert result.assigned_team == "HVAC Team"


def test_critical_priority_not_lowered_by_public_area_bump():
    # Elevator stuck (critical keyword) in a lobby must stay critical, not get bumped down
    result = run_rule_based_triage(_inp(
        title="Elevator stuck in lobby",
        description=(
            "The passenger elevator stopped between floors in the main public lobby. "
            "Passengers may be trapped inside."
        ),
    ))
    assert result.priority == "critical"
    assert result.estimated_sla_hours == 2


def test_low_priority_bumped_to_medium_in_public_area():
    result = run_rule_based_triage(_inp(
        title="Scuff marks on reception wall",
        description=(
            "There are cosmetic scuff marks on the wall behind the front desk reception area. "
            "No functional issue, purely cosmetic."
        ),
    ))
    # "front desk" is a public area → low bumps to medium
    assert result.priority == "medium"


# ── HVAC failure keyword coverage ────────────────────────────────────────────

def test_hvac_stopped_heating_is_medium():
    result = run_rule_based_triage(_inp(
        title="Heating stopped working",
        description=(
            "The heating system has stopped heating the building. "
            "Affects only internal staff work areas in the basement."
        ),
    ))
    assert result.category == "HVAC"
    assert result.priority == "medium"


def test_no_air_conditioning_phrase_is_at_least_medium():
    result = run_rule_based_triage(_inp(
        title="No air conditioning in break room",
        description=(
            "There is no air conditioning running in the employee break room. "
            "The unit has been silent since yesterday morning."
        ),
    ))
    assert result.category == "HVAC"
    assert result.priority in ("medium", "high")  # medium or higher, never low


# ── recommended_next_action SLA alignment ────────────────────────────────────

def test_recommended_next_action_critical_mentions_2_hours():
    result = run_rule_based_triage(_inp(
        title="Gas leak in boiler room",
        description="Strong gas smell in the boiler room. Area has been evacuated. Immediate response needed.",
    ))
    assert result.priority == "critical"
    assert "2 hour" in result.recommended_next_action.lower()


def test_recommended_next_action_high_mentions_24_hours():
    result = run_rule_based_triage(_inp(
        title="HVAC system completely failed",
        description="The main HVAC system has failed. The building has no heat and staff are cold.",
    ))
    assert result.priority == "high"
    assert "24" in result.recommended_next_action


def test_recommended_next_action_medium_mentions_72_hours():
    result = run_rule_based_triage(_inp(
        title="Intermittent HVAC noise",
        description=(
            "The HVAC unit is making an intermittent buzzing sound. "
            "The unit is still cooling but the noise should be investigated."
        ),
    ))
    assert result.priority == "medium"
    assert "72" in result.recommended_next_action


def test_recommended_next_action_low_mentions_168_hours():
    result = run_rule_based_triage(_inp(
        title="Touch-up painting needed",
        description="The paint on the conference room wall has scuff marks. Cosmetic issue only.",
    ))
    assert result.priority == "low"
    assert "168" in result.recommended_next_action


# ── Compound hazard: gas safety events ───────────────────────────────────────

def test_gas_odor_boiler_room_exact_scenario():
    """Exact scenario reported as failing: boiler keyword must NOT win over gas smell."""
    result = run_rule_based_triage(_inp(
        title="Gas odor in boiler room",
        description=(
            "There is a strong gas smell in the boiler room at Fire Station 12. "
            "Staff evacuated the area."
        ),
        building="Fire Station 12",
    ))
    assert result.priority == "critical"
    assert result.estimated_sla_hours == 2
    assert result.assigned_team == "Emergency Response"
    assert result.category == "Plumbing"
    assert result.escalation_reason is not None
    assert "gas" in result.escalation_reason.lower()
    # Next action must reference utility company and no re-entry
    action_lower = result.recommended_next_action.lower()
    assert "utility" in action_lower or "gas" in action_lower
    assert "re-enter" in action_lower or "evacuated" in action_lower or "safe" in action_lower


def test_natural_gas_phrase_triggers_gas_safety():
    result = run_rule_based_triage(_inp(
        title="Natural gas concern",
        description="Smell of natural gas coming from the utility closet on the ground floor.",
    ))
    assert result.priority == "critical"
    assert result.assigned_team == "Emergency Response"
    assert result.category == "Plumbing"


def test_evacuation_plus_boiler_triggers_gas_safety():
    """Evacuation combined with boiler context should trigger gas safety even without explicit gas odor phrase."""
    result = run_rule_based_triage(_inp(
        title="Boiler room evacuation",
        description=(
            "Staff were evacuated from the boiler room due to an unusual smell. "
            "The source has not been identified yet."
        ),
    ))
    assert result.priority == "critical"
    assert result.assigned_team == "Emergency Response"
    assert result.escalation_reason is not None


def test_boiler_maintenance_without_gas_is_hvac():
    """A plain boiler maintenance request with no gas/evacuation context stays as HVAC."""
    result = run_rule_based_triage(_inp(
        title="Boiler annual service due",
        description=(
            "The heating boiler is due for its annual service and inspection. "
            "No issues reported. System is running normally."
        ),
    ))
    assert result.category == "HVAC"
    assert result.assigned_team == "HVAC Team"
    assert result.priority != "critical"


# ── Four required regression checks ──────────────────────────────────────────

def test_r1_gas_odor_boiler_room_is_critical_emergency_response():
    """R1: Gas odor in boiler room → critical + Plumbing + Emergency Response."""
    result = run_rule_based_triage(_inp(
        title="Gas odor in boiler room",
        description="Strong gas smell detected in boiler room. Staff have evacuated.",
    ))
    assert result.priority == "critical"
    assert result.category == "Plumbing"
    assert result.assigned_team == "Emergency Response"
    assert result.escalation_reason is not None


def test_r2_ac_not_cooling_lobby_is_hvac_high():
    """R2: AC not cooling in public lobby → HVAC + high (public bump) — not critical unless safety risk."""
    result = run_rule_based_triage(_inp(
        title="AC not cooling in public lobby",
        description=(
            "The air conditioning is not cooling the main public lobby. "
            "Visitors are complaining about the heat."
        ),
    ))
    assert result.category == "HVAC"
    assert result.assigned_team == "HVAC Team"
    assert result.priority == "high"        # public area bump: medium → high
    assert result.priority != "critical"    # no safety risk, must not reach critical


def test_r3_water_near_electrical_panel_is_critical_emergency():
    """R3: Water near electrical panel → critical + Electrical + Emergency Response."""
    result = run_rule_based_triage(_inp(
        title="Water leaking onto electrical panel",
        description=(
            "Water is dripping from a burst pipe directly onto the electrical panel "
            "in the basement utility room."
        ),
    ))
    assert result.priority == "critical"
    assert result.category == "Electrical"
    assert result.assigned_team == "Emergency Response"
    assert result.escalation_reason is not None


def test_r4_graffiti_is_low_janitorial():
    """R4: Graffiti → low priority + Janitorial Services."""
    result = run_rule_based_triage(_inp(
        title="Graffiti on south wall",
        description=(
            "Graffiti was found on the south exterior wall during morning rounds. "
            "Content is non-threatening. Building is otherwise secure."
        ),
    ))
    assert result.category == "Janitorial"
    assert result.assigned_team == "Janitorial Services"
    assert result.priority == "low"
    assert result.escalation_reason is None
