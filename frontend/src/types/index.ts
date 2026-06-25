export interface Building {
  id: number
  name: string
  address?: string
  building_code?: string
  floors?: number
  is_active: boolean
  created_at: string
}

export interface Team {
  id: number
  name: string
  team_code?: string
  specialty?: string
  contact_email?: string
  is_active: boolean
  created_at: string
}

export interface TeamWorkload {
  team_id: number
  team_name: string
  open_count: number
  critical_count: number
}

export interface TriageResult {
  id: number
  work_order_id: number
  category: string
  priority: string
  assigned_team: string
  estimated_sla_hours: number
  duplicate_risk: 'low' | 'medium' | 'high'
  short_summary: string
  recommended_next_action: string
  risk_reasoning: string
  requires_approval: boolean
  escalation_reason?: string
  agent_mode: 'gemini' | 'rule_based'
  created_at: string
}

export interface WorkOrderNote {
  id: number
  work_order_id: number
  author: string
  content: string
  note_type: string
  created_at: string
}

export interface WorkOrder {
  id: number
  order_number: string
  title: string
  description: string
  building_id?: number
  building_name?: string
  location_details?: string
  category: string
  status: string
  priority: string
  assigned_team_id?: number
  assigned_team_name?: string
  submitted_by: string
  estimated_cost?: number
  actual_cost?: number
  sla_deadline?: string
  sla_hours?: number
  requires_approval: boolean
  approval_level?: string
  approved_by?: string
  approved_at?: string
  resolved_at?: string
  created_at: string
  updated_at: string
  triage_result?: TriageResult
  notes?: WorkOrderNote[]
}

export interface WorkOrderListItem {
  id: number
  order_number: string
  title: string
  building_name?: string
  category: string
  status: string
  priority: string
  assigned_team_name?: string
  submitted_by: string
  sla_deadline?: string
  requires_approval: boolean
  created_at: string
}

export interface WorkOrderCreate {
  title: string
  description: string
  building_id: number
  location_details?: string
  submitted_by: string
  estimated_cost?: number
}

export interface StatusUpdate {
  status: string
  actor: string
}

export interface AssignUpdate {
  assigned_team_id: number
  actor: string
}

export interface ApprovePayload {
  approved_by: string
  notes?: string
}

export interface NoteCreate {
  author: string
  content: string
  note_type?: string
}

export interface AnalyticsSummary {
  total_work_orders: number
  open_work_orders: number
  in_progress_work_orders: number
  critical_work_orders: number
  overdue_work_orders: number
  pending_approval_work_orders: number
}

export interface CategoryCount { category: string; count: number }
export interface BuildingCount { building_name: string; count: number }
export interface TeamWorkloadItem {
  team_name: string
  open_count: number
  in_progress_count: number
  critical_count: number
}
export interface SlaPerformanceItem {
  priority: string
  target_hours: number
  average_actual_hours?: number
  count: number
}
export interface AnalyticsOverview {
  summary: AnalyticsSummary
  by_category: CategoryCount[]
  by_building: BuildingCount[]
  by_team: TeamWorkloadItem[]
  sla_performance: SlaPerformanceItem[]
}

export interface AuditLog {
  id: number
  event_type: string
  work_order_id?: number
  work_order_number?: string
  actor: string
  details: string
  old_value?: string
  new_value?: string
  created_at: string
}

export interface TriageInput {
  title: string
  description: string
  building: string
  location_details?: string
  estimated_cost?: number
}

export interface TriageOutput {
  category: string
  priority: string
  assigned_team: string
  estimated_sla_hours: number
  duplicate_risk: string
  short_summary: string
  recommended_next_action: string
  risk_reasoning: string
  requires_approval: boolean
  escalation_reason?: string
  agent_mode: string
}

export interface WorkOrderFilters {
  status?: string
  priority?: string
  category?: string
  building_id?: string
  team_id?: string
  search?: string
}

export interface AuditFilters {
  event_type?: string
  actor?: string
  work_order_id?: number
}
