import client from './client'
import type {
  WorkOrder, WorkOrderListItem, WorkOrderCreate,
  StatusUpdate, AssignUpdate, ApprovePayload, NoteCreate, WorkOrderNote,
  WorkOrderFilters,
} from '../types'

export const getWorkOrders = (filters: WorkOrderFilters = {}) => {
  const params: Record<string, string> = {}
  if (filters.status) params.status = filters.status
  if (filters.priority) params.priority = filters.priority
  if (filters.category) params.category = filters.category
  if (filters.building_id) params.building_id = filters.building_id
  if (filters.team_id) params.team_id = filters.team_id
  if (filters.search) params.search = filters.search
  return client.get<WorkOrderListItem[]>('/work-orders', { params }).then(r => r.data)
}

export const getWorkOrder = (id: number) =>
  client.get<WorkOrder>(`/work-orders/${id}`).then(r => r.data)

export const createWorkOrder = (data: WorkOrderCreate) =>
  client.post<WorkOrder>('/work-orders', data).then(r => r.data)

export const updateStatus = (id: number, data: StatusUpdate) =>
  client.patch<WorkOrder>(`/work-orders/${id}/status`, data).then(r => r.data)

export const assignTeam = (id: number, data: AssignUpdate) =>
  client.patch<WorkOrder>(`/work-orders/${id}/assign`, data).then(r => r.data)

export const approveWorkOrder = (id: number, data: ApprovePayload) =>
  client.post<WorkOrder>(`/work-orders/${id}/approve`, data).then(r => r.data)

export const addNote = (id: number, data: NoteCreate) =>
  client.post<WorkOrderNote>(`/work-orders/${id}/notes`, data).then(r => r.data)

export const getNotes = (id: number) =>
  client.get<WorkOrderNote[]>(`/work-orders/${id}/notes`).then(r => r.data)
