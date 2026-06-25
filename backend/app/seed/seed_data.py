"""
Seed data for the Municipal Facilities Operations Agent.

Creates 8 buildings, 8 maintenance teams, and 8 realistic sample work orders
with triage results, notes, and audit log entries.  Runs only when the
corresponding tables are empty (idempotent).
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from ..models.audit_log import AuditLog
from ..models.building import Building
from ..models.team import Team
from ..models.triage_result import TriageResult
from ..models.work_order import WorkOrder
from ..models.work_order_note import WorkOrderNote
from ..services.sla_service import SLA_HOURS

# ── Static data ───────────────────────────────────────────────────────────────

BUILDINGS = [
    {"name": "City Hall", "address": "1 Civic Center Plaza", "building_code": "CH-001", "floors": 5},
    {"name": "Public Works Yard", "address": "400 Industrial Drive", "building_code": "PW-001", "floors": 1},
    {"name": "Police Administration Building", "address": "200 Justice Avenue", "building_code": "PAB-001", "floors": 4},
    {"name": "Fire Station 12", "address": "88 Engine Lane", "building_code": "FS-012", "floors": 2},
    {"name": "Fleet Maintenance Garage", "address": "300 Motor Court", "building_code": "FMG-001", "floors": 1},
    {"name": "Central Library", "address": "50 Knowledge Square", "building_code": "LIB-001", "floors": 3},
    {"name": "Recreation Center", "address": "700 Community Park Road", "building_code": "REC-001", "floors": 2},
    {"name": "Parking Enforcement Office", "address": "12 Meter Street", "building_code": "PEO-001", "floors": 1},
]

TEAMS = [
    {"name": "HVAC Team", "team_code": "HVAC", "specialty": "Heating, Ventilation, Air Conditioning", "contact_email": "hvac@city.gov"},
    {"name": "Plumbing Team", "team_code": "PLMB", "specialty": "Pipes, Water Systems, Drainage", "contact_email": "plumbing@city.gov"},
    {"name": "Electrical Team", "team_code": "ELEC", "specialty": "Electrical Systems, Lighting, Power", "contact_email": "electrical@city.gov"},
    {"name": "Elevator Contractor", "team_code": "ELEV", "specialty": "Elevators, Lifts, Escalators", "contact_email": "elevator@city.gov"},
    {"name": "Janitorial Services", "team_code": "JANI", "specialty": "Cleaning, Sanitation, Waste Management", "contact_email": "janitorial@city.gov"},
    {"name": "Access Control Team", "team_code": "ACCSS", "specialty": "Locks, Badges, Security Systems", "contact_email": "access@city.gov"},
    {"name": "Fleet Maintenance", "team_code": "FLEET", "specialty": "Municipal Vehicles and Equipment", "contact_email": "fleet@city.gov"},
    {"name": "Emergency Response", "team_code": "EMRG", "specialty": "Critical Incidents and Safety Hazards", "contact_email": "emergency@city.gov"},
]

# Each entry maps to one work order.
# days_ago: how long ago the work order was created (for realistic timestamps)
# resolved_in_hours: only set for resolved orders; hours after creation
SAMPLE_WORK_ORDERS = [
    {
        "order_number": "WO-2026-00001",
        "title": "Central HVAC Unit Not Cooling",
        "description": (
            "The main HVAC unit serving floors 2 through 4 stopped cooling. "
            "Building temperature has risen to 85°F and is affecting staff productivity. "
            "The unit appears to have failed overnight."
        ),
        "building_name": "City Hall",
        "location_details": "Rooftop mechanical room, Unit B",
        "category": "HVAC",
        "status": "open",
        "priority": "high",
        "team_name": "HVAC Team",
        "submitted_by": "Maria Santos",
        "estimated_cost": 1200.00,
        "days_ago": 1,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "High priority HVAC cooling failure at City Hall affecting multiple floors.",
            "recommended_next_action": "Assign to HVAC Team and dispatch technician within 2 hours.",
            "risk_reasoning": (
                "Category 'HVAC' identified by keyword match. Priority 'high' based on multi-floor "
                "system failure affecting staff. Duplicate risk 'low' — specific unit reference provided."
            ),
            "requires_approval": False,
            "escalation_reason": None,
            "agent_mode": "rule_based",
        },
        "note": None,
    },
    {
        "order_number": "WO-2026-00002",
        "title": "Passenger Elevator Stuck Between Floors",
        "description": (
            "The main passenger elevator in the Central Library is stuck between the 1st and 2nd floors. "
            "No occupants are currently trapped, but the elevator is out of service. "
            "Staff report hearing grinding noises before it stopped."
        ),
        "building_name": "Central Library",
        "location_details": "Main lobby elevator bank",
        "category": "Elevator",
        "status": "escalated",
        "priority": "critical",
        "team_name": "Elevator Contractor",
        "submitted_by": "David Chen",
        "estimated_cost": 3500.00,
        "days_ago": 0,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Critical elevator failure at Central Library with mechanical grinding reported.",
            "recommended_next_action": "Dispatch Elevator Contractor immediately. Post out-of-service notice. Verify no occupants are trapped.",
            "risk_reasoning": (
                "Category 'Elevator' identified by keyword match. Priority 'critical' — "
                "elevator stuck with abnormal mechanical noise indicates structural risk. "
                "Duplicate risk 'low' — specific unit and symptom described. "
                "Approval required: estimated cost $3,500.00 exceeds $2,500 manager threshold."
            ),
            "requires_approval": True,
            "escalation_reason": "Mechanical elevator failure with abnormal grinding noise — immediate safety inspection required.",
            "agent_mode": "rule_based",
        },
        "note": "Elevator Contractor dispatched. Estimated on-site arrival in 45 minutes. Lobby elevator bank roped off.",
    },
    {
        "order_number": "WO-2026-00003",
        "title": "Water Leak Under Restroom Sink",
        "description": (
            "There is a visible water leak under the sink in the second floor men's restroom. "
            "Water is pooling on the tile floor and beginning to seep toward the hallway. "
            "The shutoff valve is partially responsive. Wet floor signs have been placed."
        ),
        "building_name": "Police Administration Building",
        "location_details": "2nd floor, men's restroom",
        "category": "Plumbing",
        "status": "in_progress",
        "priority": "high",
        "team_name": "Plumbing Team",
        "submitted_by": "Officer Williams",
        "estimated_cost": None,
        "days_ago": 2,
        "triage": {
            "duplicate_risk": "medium",
            "short_summary": "Active water leak in Police Administration Building restroom causing floor pooling.",
            "recommended_next_action": "Assign Plumbing Team. Place wet floor signs. Identify and stop leak source.",
            "risk_reasoning": (
                "Category 'Plumbing' identified by keyword match. Priority 'high' — active leak with "
                "floor pooling and hallway seepage creates slip hazard. Duplicate risk 'medium' — "
                "sink leaks are a common report type."
            ),
            "requires_approval": False,
            "escalation_reason": None,
            "agent_mode": "rule_based",
        },
        "note": "Plumbing team on site. Temporary shutoff applied. Full repair scheduled for tomorrow morning.",
    },
    {
        "order_number": "WO-2026-00004",
        "title": "North Parking Lot Lights Not Illuminating",
        "description": (
            "Four of the six overhead lights in the north parking lot are not illuminating after dark. "
            "This creates a visibility and safety concern for evening program attendees. "
            "The remaining two lights are functioning normally."
        ),
        "building_name": "Recreation Center",
        "location_details": "North parking lot, rows A and B",
        "category": "Electrical",
        "status": "open",
        "priority": "medium",
        "team_name": "Electrical Team",
        "submitted_by": "James Okonkwo",
        "estimated_cost": 450.00,
        "days_ago": 3,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Medium priority lighting failure in north parking lot at Recreation Center.",
            "recommended_next_action": "Schedule Electrical Team inspection within 3 business days. Check individual fixtures and circuit breaker.",
            "risk_reasoning": (
                "Category 'Electrical' identified by keyword match. Priority 'medium' — partial lighting "
                "failure affects evening safety but is not an immediate emergency. Duplicate risk 'low'."
            ),
            "requires_approval": False,
            "escalation_reason": None,
            "agent_mode": "rule_based",
        },
        "note": None,
    },
    {
        "order_number": "WO-2026-00005",
        "title": "Possible Gas Odor in Boiler Room",
        "description": (
            "Station crew reports a strong gas odor emanating from the boiler room adjacent to the apparatus bay. "
            "The affected area has been evacuated and ventilated. Gas service has been shut off at the meter. "
            "Immediate inspection is required."
        ),
        "building_name": "Fire Station 12",
        "location_details": "Boiler room, adjacent to apparatus bay",
        "category": "Plumbing",
        "status": "escalated",
        "priority": "critical",
        "team_name": "Emergency Response",
        "submitted_by": "Captain Rodriguez",
        "estimated_cost": None,
        "days_ago": 0,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Critical safety incident — confirmed gas odor at Fire Station 12 boiler room. Area evacuated.",
            "recommended_next_action": "Dispatch Emergency Response immediately. Contact utility company. Do not re-enter until cleared.",
            "risk_reasoning": (
                "Category 'Plumbing' identified — gas line issue. Priority 'critical' — gas odor with "
                "evacuation indicates active leak risk. Fire station apparatus bay proximity raises "
                "explosion risk. Duplicate risk 'low'."
            ),
            "requires_approval": False,
            "escalation_reason": "Confirmed gas odor at occupied fire station — active safety emergency.",
            "agent_mode": "rule_based",
        },
        "note": "Utility company notified. Building cleared. Emergency Response coordinator on scene. Do not restore gas until inspection complete.",
    },
    {
        "order_number": "WO-2026-00006",
        "title": "Cracked Window in Administrative Office",
        "description": (
            "A window in the administrative office has a large crack spanning the full width of the pane. "
            "The window is not fully sealed, posing a security and weather risk. "
            "The damage appears to have occurred overnight and may be from an impact."
        ),
        "building_name": "Public Works Yard",
        "location_details": "Administrative office, east-facing window",
        "category": "General",
        "status": "open",
        "priority": "medium",
        "team_name": "Janitorial Services",
        "submitted_by": "Supervisor Thompson",
        "estimated_cost": 320.00,
        "days_ago": 4,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Cracked window at Public Works Yard administrative office requires replacement.",
            "recommended_next_action": "Apply temporary weatherproof seal. Schedule glass replacement within 3 business days.",
            "risk_reasoning": (
                "Category 'General' — no specific keyword match for other categories. "
                "Priority 'medium' — full-width crack compromises weather seal and building security "
                "but is not an immediate safety emergency. Duplicate risk 'low'."
            ),
            "requires_approval": False,
            "escalation_reason": None,
            "agent_mode": "rule_based",
        },
        "note": None,
    },
    {
        "order_number": "WO-2026-00007",
        "title": "Unit 44 — Brake System Failure",
        "description": (
            "Unit 44 (2019 Ford F-250) experienced significant brake degradation during morning operations. "
            "The vehicle has been pulled from service and is parked in bay 3. "
            "Brake fluid appears to be leaking and pedal pressure is insufficient under load."
        ),
        "building_name": "Fleet Maintenance Garage",
        "location_details": "Vehicle bay 3",
        "category": "Fleet",
        "status": "in_progress",
        "priority": "critical",
        "team_name": "Fleet Maintenance",
        "submitted_by": "Fleet Coordinator Hayes",
        "estimated_cost": 1800.00,
        "days_ago": 1,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Critical fleet vehicle brake failure — Unit 44 removed from service.",
            "recommended_next_action": "Assign Fleet Maintenance for immediate brake system inspection. Vehicle must not return to service until cleared.",
            "risk_reasoning": (
                "Category 'Fleet' identified by keyword match. Priority 'critical' — brake failure on "
                "active city vehicle is a direct safety risk to operators and the public. "
                "Duplicate risk 'low' — specific unit referenced."
            ),
            "requires_approval": False,
            "escalation_reason": "Active city vehicle with brake failure — safety risk to operators and public.",
            "agent_mode": "rule_based",
        },
        "note": "Vehicle grounded. Brake line inspection underway. Replacement parts ordered, estimated arrival tomorrow.",
    },
    {
        "order_number": "WO-2026-00008",
        "title": "Graffiti on Exterior South Wall",
        "description": (
            "Graffiti was found on the south exterior wall during morning rounds. "
            "The tagging covers approximately 20 square feet. Content is non-threatening. "
            "The building is otherwise secure."
        ),
        "building_name": "Parking Enforcement Office",
        "location_details": "South exterior wall, street level",
        "category": "Janitorial",
        "status": "resolved",
        "priority": "low",
        "team_name": "Janitorial Services",
        "submitted_by": "Administrative Clerk Monroe",
        "estimated_cost": 150.00,
        "days_ago": 7,
        "resolved_in_hours": 48,
        "triage": {
            "duplicate_risk": "low",
            "short_summary": "Low priority graffiti removal needed on Parking Enforcement Office exterior wall.",
            "recommended_next_action": "Schedule Janitorial Services for graffiti removal within the week.",
            "risk_reasoning": (
                "Category 'Janitorial' identified by keyword match. Priority 'low' — non-threatening "
                "cosmetic issue, no safety or security risk. Duplicate risk 'low'."
            ),
            "requires_approval": False,
            "escalation_reason": None,
            "agent_mode": "rule_based",
        },
        "note": "Graffiti removed. Area cleaned and treated with anti-graffiti coating.",
    },
]


# ── Seed functions ────────────────────────────────────────────────────────────

def _seed_buildings(db: Session) -> None:
    for b in BUILDINGS:
        db.add(Building(**b))
    db.commit()


def _seed_teams(db: Session) -> None:
    for t in TEAMS:
        db.add(Team(**t))
    db.commit()


def _seed_work_orders(db: Session) -> None:
    import json

    for spec in SAMPLE_WORK_ORDERS:
        building = db.query(Building).filter(Building.name == spec["building_name"]).first()
        team = db.query(Team).filter(Team.name == spec["team_name"]).first()
        if not building or not team:
            continue

        days_ago = spec.get("days_ago", 0)
        created_at = datetime.utcnow() - timedelta(days=days_ago)
        sla_hours = SLA_HOURS.get(spec["priority"], 72)
        sla_deadline = created_at + timedelta(hours=sla_hours)

        resolved_at = None
        if spec["status"] == "resolved":
            resolved_in = spec.get("resolved_in_hours", sla_hours - 2)
            resolved_at = created_at + timedelta(hours=resolved_in)

        wo = WorkOrder(
            order_number=spec["order_number"],
            title=spec["title"],
            description=spec["description"],
            building_id=building.id,
            location_details=spec.get("location_details"),
            category=spec["category"],
            status=spec["status"],
            priority=spec["priority"],
            assigned_team_id=team.id,
            submitted_by=spec["submitted_by"],
            estimated_cost=spec.get("estimated_cost"),
            sla_deadline=sla_deadline,
            sla_hours=sla_hours,
            requires_approval=spec["triage"]["requires_approval"],
            resolved_at=resolved_at,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(wo)
        db.flush()

        t_spec = spec["triage"]
        triage_record = TriageResult(
            work_order_id=wo.id,
            category=spec["category"],
            priority=spec["priority"],
            assigned_team=spec["team_name"],
            estimated_sla_hours=sla_hours,
            duplicate_risk=t_spec["duplicate_risk"],
            short_summary=t_spec["short_summary"],
            recommended_next_action=t_spec["recommended_next_action"],
            risk_reasoning=t_spec["risk_reasoning"],
            requires_approval=t_spec["requires_approval"],
            escalation_reason=t_spec["escalation_reason"],
            agent_mode=t_spec["agent_mode"],
            created_at=created_at,
        )
        db.add(triage_record)

        if spec.get("note"):
            note = WorkOrderNote(
                work_order_id=wo.id,
                author="Facilities System",
                content=spec["note"],
                note_type="internal",
                created_at=created_at + timedelta(hours=1),
            )
            db.add(note)

        # Audit log entries for seed records
        db.add(AuditLog(
            event_type="work_order_created",
            work_order_id=wo.id,
            work_order_number=wo.order_number,
            actor=spec["submitted_by"],
            details=json.dumps({"order_number": wo.order_number, "title": wo.title}),
            created_at=created_at,
        ))
        db.add(AuditLog(
            event_type="triage_completed",
            work_order_id=wo.id,
            work_order_number=wo.order_number,
            actor="agent",
            details=json.dumps({
                "agent_mode": t_spec["agent_mode"],
                "category": spec["category"],
                "priority": spec["priority"],
                "assigned_team": spec["team_name"],
            }),
            created_at=created_at,
        ))
        if t_spec["escalation_reason"]:
            db.add(AuditLog(
                event_type="escalated",
                work_order_id=wo.id,
                work_order_number=wo.order_number,
                actor="agent",
                details=json.dumps({"reason": t_spec["escalation_reason"]}),
                created_at=created_at,
            ))

    db.commit()


def seed_if_empty(db: Session) -> None:
    """Seed reference data only when the tables are empty."""
    if db.query(Building).count() == 0:
        _seed_buildings(db)
    if db.query(Team).count() == 0:
        _seed_teams(db)
    if db.query(WorkOrder).count() == 0:
        _seed_work_orders(db)
