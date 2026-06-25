# Sample Test Prompts

Use these scenarios to test the AI triage agent via `POST /api/agent/triage-preview` or the Agent Test page.

---

## Scenario 1 — HVAC Failure (High Priority)

**Input:**
```json
{
  "title": "AC stopped cooling on upper floors",
  "description": "The central air conditioning unit serving floors 3 through 5 at City Hall is no longer producing cold air. Building temperature on those floors has risen to 84°F. Staff are working in uncomfortable conditions. The unit was last serviced six months ago.",
  "building": "City Hall",
  "location_details": "Rooftop mechanical room, Unit B",
  "estimated_cost": 1200.00
}
```

**Expected output:**
- `category`: HVAC
- `priority`: high
- `assigned_team`: HVAC Team
- `estimated_sla_hours`: 24
- `requires_approval`: false
- `escalation_reason`: null

---

## Scenario 2 — Elevator Stuck (Critical)

**Input:**
```json
{
  "title": "Elevator stuck — possible occupant inside",
  "description": "A library patron reported that the passenger elevator appears to be stuck between the 1st and 2nd floors. The door is not opening and there may be a person inside. Staff have not been able to confirm whether anyone is trapped.",
  "building": "Central Library",
  "location_details": "Main lobby elevator bank",
  "estimated_cost": null
}
```

**Expected output:**
- `category`: Elevator
- `priority`: critical
- `assigned_team`: Elevator Contractor
- `estimated_sla_hours`: 2
- `escalation_reason`: (non-null — trapped occupant risk)
- `requires_approval`: false

---

## Scenario 3 — Gas Odor (Critical, Escalated)

**Input:**
```json
{
  "title": "Strong gas smell in boiler room",
  "description": "Station crew reports a strong smell of gas coming from the boiler room near the apparatus bay. The area has been evacuated. Gas has been shut off at the meter. We need immediate inspection to confirm whether there is an active gas leak.",
  "building": "Fire Station 12",
  "location_details": "Boiler room, adjacent to apparatus bay",
  "estimated_cost": null
}
```

**Expected output:**
- `category`: Plumbing
- `priority`: critical
- `assigned_team`: Emergency Response (or Plumbing Team)
- `estimated_sla_hours`: 2
- `escalation_reason`: (non-null — gas leak safety risk)
- `requires_approval`: false

---

## Scenario 4 — Pipe Leak with Standing Water (High Priority)

**Input:**
```json
{
  "title": "Water leak under restroom sink — water on floor",
  "description": "There is an active water leak under the sink in the 2nd floor men's restroom. Water is pooling on the tile floor and beginning to seep toward the hallway. The shutoff valve is partially responsive. Wet floor signs have been placed.",
  "building": "Police Administration Building",
  "location_details": "2nd floor, men's restroom",
  "estimated_cost": null
}
```

**Expected output:**
- `category`: Plumbing
- `priority`: high
- `assigned_team`: Plumbing Team
- `estimated_sla_hours`: 24
- `duplicate_risk`: medium (leak reports are common)
- `requires_approval`: false

---

## Scenario 5 — Partial Parking Lot Lighting (Medium Priority)

**Input:**
```json
{
  "title": "4 of 6 parking lot lights not working",
  "description": "Four of the six overhead pole lights in the north parking lot at the Recreation Center are not turning on after dark. Evening program attendees are walking to their vehicles in reduced visibility. The two remaining lights are working normally.",
  "building": "Recreation Center",
  "location_details": "North parking lot, rows A and B",
  "estimated_cost": 450.00
}
```

**Expected output:**
- `category`: Electrical
- `priority`: medium
- `assigned_team`: Electrical Team
- `estimated_sla_hours`: 72
- `requires_approval`: false
- `escalation_reason`: null

---

## Scenario 6 — Graffiti (Low Priority)

**Input:**
```json
{
  "title": "Graffiti on south wall",
  "description": "Graffiti was found on the exterior south-facing wall of the Parking Enforcement Office during morning rounds. The tagging covers about 20 square feet. Content is non-threatening. The building is otherwise secure.",
  "building": "Parking Enforcement Office",
  "location_details": "South exterior wall, street level",
  "estimated_cost": 150.00
}
```

**Expected output:**
- `category`: Janitorial
- `priority`: low
- `assigned_team`: Janitorial Services
- `estimated_sla_hours`: 168
- `requires_approval`: false
- `escalation_reason`: null

---

## Scenario 7 — High-Cost HVAC Replacement (Approval Required)

**Input:**
```json
{
  "title": "Boiler needs full replacement — beyond repair",
  "description": "The heating boiler in the basement of City Hall has failed and the vendor has determined it cannot be repaired. A full unit replacement is required. Staff on lower floors have no heat. Winter conditions are forecast this week.",
  "building": "City Hall",
  "location_details": "Basement mechanical room",
  "estimated_cost": 18500.00
}
```

**Expected output:**
- `category`: HVAC
- `priority`: high or critical (no heat in winter)
- `assigned_team`: HVAC Team
- `requires_approval`: true
- `estimated_cost` exceeds $10,000 → director approval

---

## Scenario 8 — Fleet Brake Failure (Critical)

**Input:**
```json
{
  "title": "Unit 22 — brake failure reported during patrol",
  "description": "The driver of Unit 22 (2020 Chevy Silverado) reported that the brakes felt soft and the vehicle pulled to one side during a morning patrol. The vehicle has been pulled from service and is in the lot. Brake fluid may be leaking.",
  "building": "Fleet Maintenance Garage",
  "location_details": "Exterior parking lot",
  "estimated_cost": 2200.00
}
```

**Expected output:**
- `category`: Fleet
- `priority`: critical (brake failure on active city vehicle)
- `assigned_team`: Fleet Maintenance
- `estimated_sla_hours`: 2
- `requires_approval`: false ($2,200 < $2,500 threshold)
- `escalation_reason`: (non-null — safety risk to operators)

---

## Scenario 9 — Security Camera Offline (Medium Priority)

**Input:**
```json
{
  "title": "Security camera in east stairwell is offline",
  "description": "The security camera mounted in the east stairwell on the 3rd floor of the Police Administration Building has been offline for two days. The monitor at the security desk shows a black screen for that feed. Other cameras in the building are functioning normally.",
  "building": "Police Administration Building",
  "location_details": "3rd floor, east stairwell",
  "estimated_cost": 300.00
}
```

**Expected output:**
- `category`: Access Control
- `priority`: medium
- `assigned_team`: Access Control Team
- `estimated_sla_hours`: 72
- `requires_approval`: false

---

## Scenario 10 — Roof Leak into Server Room (Critical, High Cost)

**Input:**
```json
{
  "title": "Roof leak dripping into network equipment room",
  "description": "Following last night's storm, water is actively dripping through the ceiling of the IT network equipment room on the 4th floor. Two server racks are getting wet. The room has been partially evacuated but servers are still running. Immediate containment and roof repair needed.",
  "building": "City Hall",
  "location_details": "4th floor, IT server room",
  "estimated_cost": 12000.00
}
```

**Expected output:**
- `category`: Plumbing (or General — water intrusion)
- `priority`: critical (water near active electrical/server equipment)
- `assigned_team`: Plumbing Team or Emergency Response
- `estimated_sla_hours`: 2
- `requires_approval`: true (> $10,000 → director approval)
- `escalation_reason`: (non-null — water near electrical equipment)

---

## Scenario 11 — Elevator Routine Inspection (Low Priority)

**Input:**
```json
{
  "title": "Annual elevator inspection due",
  "description": "The passenger elevator in the Central Library is due for its annual state-required inspection. The elevator is currently operational and there are no reported issues. We need to schedule the inspection with our licensed elevator contractor.",
  "building": "Central Library",
  "location_details": "Main lobby elevator bank",
  "estimated_cost": 800.00
}
```

**Expected output:**
- `category`: Elevator
- `priority`: low (no operational issue)
- `assigned_team`: Elevator Contractor
- `estimated_sla_hours`: 168
- `requires_approval`: false
- `escalation_reason`: null

---

## Scenario 12 — Vague / Short Description (Duplicate Risk)

**Input:**
```json
{
  "title": "Leak",
  "description": "There is a leak.",
  "building": "City Hall",
  "location_details": "",
  "estimated_cost": null
}
```

**Expected output:**
- `category`: Plumbing
- `priority`: medium or low
- `duplicate_risk`: high (very short, generic)
- `recommended_next_action`: includes a note to gather more details before dispatching
