import { useQuery } from '@tanstack/react-query'
import { getAnalyticsOverview, getAnalyticsSummary } from '../api/analytics'

export function useAnalyticsOverview() {
  return useQuery({ queryKey: ['analytics'], queryFn: getAnalyticsOverview })
}

export function useAnalyticsSummary() {
  return useQuery({ queryKey: ['analyticsSummary'], queryFn: getAnalyticsSummary, refetchInterval: 30000 })
}
