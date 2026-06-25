import client from './client'
import type { AnalyticsOverview, AnalyticsSummary } from '../types'

export const getAnalyticsOverview = () =>
  client.get<AnalyticsOverview>('/analytics').then(r => r.data)

export const getAnalyticsSummary = () =>
  client.get<AnalyticsSummary>('/analytics/summary').then(r => r.data)
