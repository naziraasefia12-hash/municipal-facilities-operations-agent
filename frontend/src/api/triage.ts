import client from './client'
import type { TriageInput, TriageOutput } from '../types'

export const runTriage = (data: TriageInput) =>
  client.post<TriageOutput>('/triage', data).then(r => r.data)

export const runAgentTriagePreview = (data: TriageInput) =>
  client.post<TriageOutput>('/agent/triage-preview', data).then(r => r.data)
