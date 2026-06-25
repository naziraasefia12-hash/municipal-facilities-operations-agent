# Business Statement

## Problem

City facilities teams handle dozens of maintenance requests each week across multiple buildings. Without a structured intake process, requests arrive by email, phone call, or verbal report — each with varying levels of detail. This creates several operational gaps:

- **No consistent triage.** Staff with different experience levels interpret urgency differently. A critical plumbing failure may sit in the same queue as a burned-out light bulb.
- **No audit trail.** When a work order changes hands or a status update happens, there is often no record of who made the decision or why.
- **No SLA visibility.** Facility managers cannot tell at a glance which open items are overdue, which require manager approval, or which buildings have the highest maintenance burden.
- **Reactive, not proactive.** Without analytics, it is difficult to identify repeat failures, seasonal HVAC patterns, or buildings that need preventive attention.

## Solution

The **Municipal Facilities Operations Agent** provides a structured work order intake platform with an AI triage agent at its core. When city staff submit a work order, the agent:

1. **Classifies** the issue into a maintenance category (HVAC, Plumbing, Electrical, etc.)
2. **Assigns urgency** (critical / high / medium / low) based on the description and detected safety keywords
3. **Routes** the request to the appropriate maintenance team
4. **Calculates an SLA deadline** (2 h · 24 h · 72 h · 168 h depending on priority)
5. **Flags duplicate risk** if the request appears generic or common
6. **Detects safety escalations** and auto-escalates when a hazard is detected in the description
7. **Checks approval thresholds** — requests with estimated costs above $2,500 require manager sign-off; above $10,000 require director approval

Every action — creation, triage decision, status change, team assignment, escalation, approval — is written to an immutable audit log.

## Target Users

| Role | How they use the system |
|------|------------------------|
| **Facilities staff** | Submit work orders, add internal notes, update status |
| **Maintenance team leads** | View assigned work orders, update progress, flag completion |
| **Facilities manager** | Monitor open/critical/overdue items, approve high-cost work orders |
| **Facilities director** | Review analytics, approve high-dollar requests, audit trail review |

## Scope of This Version

This version covers:
- Work order intake, triage, and lifecycle management
- AI triage agent (Gemini API with rule-based fallback)
- Buildings and teams management
- Analytics dashboard
- Full audit logging

Not covered in this version:
- User authentication and role-based access (planned for a future phase)
- Email or SMS notifications
- Mobile-native interface
- Integration with external purchasing or HR systems

## Why an AI Agent?

The rule-based fallback already handles common cases reliably. The Gemini-powered agent adds value when descriptions are nuanced — for example, distinguishing a minor HVAC complaint from a sign of refrigerant leak, or recognizing that "water in the electrical room" is a cross-category critical safety event that rule matching alone might classify incorrectly. The system is designed so that either agent path produces the same structured output, making it easy to compare, validate, and improve over time.
