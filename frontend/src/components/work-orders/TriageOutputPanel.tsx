import type { TriageOutput } from '../../types'
import { PriorityBadge } from '../ui/PriorityBadge'
import { capitalize } from '../../utils/formatters'

interface Props {
  result: TriageOutput
  compact?: boolean
}

export function TriageOutputPanel({ result, compact }: Props) {
  return (
    <div className="triage-panel">
      <div className="triage-panel-header">
        <span className="triage-panel-title">AI Triage Assessment</span>
        <span className={`triage-mode-tag ${result.agent_mode === 'gemini' ? 'gemini' : ''}`}>
          {result.agent_mode === 'gemini' ? 'Gemini AI' : 'Rule-based'}
        </span>
      </div>

      <div className="triage-grid">
        <div className="triage-cell">
          <div className="triage-key">Category</div>
          <div className="triage-val">{result.category}</div>
        </div>
        <div className="triage-cell">
          <div className="triage-key">Priority</div>
          <div className="triage-val"><PriorityBadge priority={result.priority} /></div>
        </div>
        <div className="triage-cell">
          <div className="triage-key">Assigned Team</div>
          <div className="triage-val">{result.assigned_team}</div>
        </div>
        <div className="triage-cell">
          <div className="triage-key">SLA</div>
          <div className="triage-val">{result.estimated_sla_hours}h</div>
        </div>
        <div className="triage-cell">
          <div className="triage-key">Duplicate Risk</div>
          <div className="triage-val">{capitalize(result.duplicate_risk)}</div>
        </div>
        <div className="triage-cell">
          <div className="triage-key">Requires Approval</div>
          <div className="triage-val" style={{ color: result.requires_approval ? 'var(--s-pending-text)' : 'inherit' }}>
            {result.requires_approval ? 'Yes' : 'No'}
          </div>
        </div>
        <div className="triage-cell full">
          <div className="triage-key">Summary</div>
          <div className="triage-val prose">{result.short_summary}</div>
        </div>
        <div className="triage-cell full">
          <div className="triage-key">Next Action</div>
          <div className="triage-val prose">{result.recommended_next_action}</div>
        </div>
        {!compact && (
          <div className="triage-cell full">
            <div className="triage-key">Risk Reasoning</div>
            <div className="triage-val prose">{result.risk_reasoning}</div>
          </div>
        )}
      </div>

      {result.escalation_reason && (
        <div className="escalation-banner">
          <div className="escalation-label">Escalation Triggered</div>
          {result.escalation_reason}
        </div>
      )}

      {result.requires_approval && !result.escalation_reason && (
        <div className="approval-banner">
          <strong>Approval required</strong> — estimated cost exceeds approval threshold.
        </div>
      )}
    </div>
  )
}
