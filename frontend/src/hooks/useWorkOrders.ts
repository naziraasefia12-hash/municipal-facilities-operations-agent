import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkOrderFilters, WorkOrderCreate, StatusUpdate, AssignUpdate, ApprovePayload } from '../types'
import * as api from '../api/workOrders'

export function useWorkOrders(filters: WorkOrderFilters = {}) {
  return useQuery({
    queryKey: ['workOrders', filters],
    queryFn: () => api.getWorkOrders(filters),
  })
}

export function useWorkOrder(id: number) {
  return useQuery({
    queryKey: ['workOrder', id],
    queryFn: () => api.getWorkOrder(id),
    enabled: !!id,
  })
}

export function useCreateWorkOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: WorkOrderCreate) => api.createWorkOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workOrders'] }),
  })
}

export function useUpdateStatus(workOrderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: StatusUpdate) => api.updateStatus(workOrderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      qc.invalidateQueries({ queryKey: ['workOrders'] })
    },
  })
}

export function useAssignTeam(workOrderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignUpdate) => api.assignTeam(workOrderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      qc.invalidateQueries({ queryKey: ['workOrders'] })
    },
  })
}

export function useApproveWorkOrder(workOrderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ApprovePayload) => api.approveWorkOrder(workOrderId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      qc.invalidateQueries({ queryKey: ['workOrders'] })
    },
  })
}
