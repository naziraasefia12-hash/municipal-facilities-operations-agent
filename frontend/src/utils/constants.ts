export const CATEGORIES = ['HVAC', 'Plumbing', 'Electrical', 'Elevator', 'Janitorial', 'Access Control', 'Fleet', 'General']

export const STATUSES = ['open', 'in_progress', 'pending_approval', 'escalated', 'resolved', 'closed']

export const PRIORITIES = ['critical', 'high', 'medium', 'low']

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'pending_approval', 'escalated', 'closed'],
  in_progress: ['pending_approval', 'resolved', 'escalated', 'closed'],
  pending_approval: ['in_progress', 'escalated', 'closed'],
  escalated: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: [],
}

export const CHART_COLORS = {
  primary: '#2457A0',
  critical: '#B03030',
  high: '#C07020',
  medium: '#A09010',
  low: '#2A8050',
  neutral: '#6B7E90',
  bars: ['#2457A0', '#3A6BBF', '#5285CC', '#6B9ED9', '#85B7E6', '#9ECFF2'],
}

export const SLA_HOURS: Record<string, number> = {
  critical: 2,
  high: 24,
  medium: 72,
  low: 168,
}
