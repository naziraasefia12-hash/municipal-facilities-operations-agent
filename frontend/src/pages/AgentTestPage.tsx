import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { runAgentTriagePreview } from '../api/triage'
import { TriageOutputPanel } from '../components/work-orders/TriageOutputPanel'
import { LoadingState } from '../components/ui/LoadingState'
import type { TriageInput, TriageOutput } from '../types'
import { useNavigate } from 'react-router-dom'

const EXAMPLES = [
  {
    label: 'Gas odor (critical)',
    data: { title: 'Possible gas odor in boiler room', description: 'Station crew reports a strong gas smell in the boiler room adjacent to the apparatus bay. Area has been evacuated. Gas shut off at meter. Immediate inspection required.', building: 'Fire Station 12', location_details: 'Boiler room, adjacent to apparatus bay' },
  },
  {
    label: 'AC not cooling in lobby (high)',
    data: { title: 'AC not cooling in public lobby', description: 'The air conditioning is not cooling the main public lobby. Visitors are complaining about the heat. Temperatures in the lobby are approaching 85°F.', building: 'City Hall', location_details: 'Main lobby, ground floor' },
  },
  {
    label: 'Water near electrical (critical)',
    data: { title: 'Water leaking near electrical panel', description: 'Water is leaking from a burst pipe directly onto an exposed electrical panel in the utility room. Area has been cordoned off. Immediate response required.', building: 'Public Works Yard', location_details: 'Basement utility room' },
  },
  {
    label: 'Graffiti (low)',
    data: { title: 'Graffiti on south exterior wall', description: 'Graffiti was found on the south wall during morning rounds. Non-threatening content, covers about 20 square feet. Building is otherwise secure.', building: 'Parking Enforcement Office', location_details: 'South exterior wall, street level' },
  },
]

const INIT: TriageInput = { title: '', description: '', building: '', location_details: '', estimated_cost: undefined }

export function AgentTestPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<TriageInput>(INIT)
  const [result, setResult] = useState<TriageOutput | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof TriageInput, string>>>({})

  const mutation = useMutation({
    mutationFn: () => runAgentTriagePreview(form),
    onSuccess: (data) => setResult(data),
  })

  function set(k: keyof TriageInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = k === 'estimated_cost' ? (e.target.value ? Number(e.target.value) : undefined) : e.target.value
      setForm(prev => ({ ...prev, [k]: val }))
      if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }))
    }
  }

  function validate() {
    const e: Partial<Record<keyof TriageInput, string>> = {}
    if (!form.title.trim()) e.title = 'Required'
    if (!form.description.trim()) e.description = 'Required'
    if (!form.building.trim()) e.building = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) { setResult(null); mutation.mutate() }
  }

  function loadExample(ex: typeof EXAMPLES[0]) {
    setForm({ ...INIT, ...ex.data })
    setResult(null)
  }

  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 600 }}>
      <div className="panel-header">
        <span className="panel-title">Agent Triage Preview</span>
        <span className="panel-meta">POST /api/agent/triage-preview</span>
      </div>

      <div className="agent-split" style={{ flex: 1 }}>
        {/* Input pane */}
        <div className="agent-input-pane">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Examples:</span>
            {EXAMPLES.map(ex => (
              <button key={ex.label} className="btn btn-neutral btn-sm" onClick={() => loadExample(ex)}>
                {ex.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="stack">
            <div className="form-field">
              <label className="form-label">Title</label>
              <input className={`form-input ${errors.title ? 'error' : ''}`} value={form.title} onChange={set('title')} placeholder="Brief issue title" />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea className={`form-textarea ${errors.description ? 'error' : ''}`} value={form.description} onChange={set('description')} placeholder="Detailed description of the issue…" rows={5} />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </div>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label">Building</label>
                <input className={`form-input ${errors.building ? 'error' : ''}`} value={form.building} onChange={set('building')} placeholder="Building name" />
                {errors.building && <span className="form-error">{errors.building}</span>}
              </div>
              <div className="form-field">
                <label className="form-label">Location Details <span className="form-label-opt">optional</span></label>
                <input className="form-input" value={form.location_details ?? ''} onChange={set('location_details')} placeholder="Floor, room, area…" />
              </div>
            </div>
            <div className="form-field" style={{ maxWidth: 200 }}>
              <label className="form-label">Estimated Cost <span className="form-label-opt">optional</span></label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.estimated_cost ?? ''} onChange={set('estimated_cost')} placeholder="$0.00" />
            </div>
            {mutation.isError && <div className="form-error-banner">Triage request failed. Is the backend running?</div>}
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                {mutation.isPending ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Running…</> : 'Run Triage Agent'}
              </button>
              <button type="button" className="btn btn-neutral" onClick={() => { setForm(INIT); setResult(null) }}>Clear</button>
            </div>
          </form>
        </div>

        {/* Output pane */}
        <div className="agent-output-pane">
          {!result && !mutation.isPending && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, paddingTop: 24, textAlign: 'center' }}>
              Fill in the form and click <strong>Run Triage Agent</strong> to see the AI classification output.
            </div>
          )}

          {mutation.isPending && <LoadingState message="Running triage agent…" />}

          {result && (
            <>
              <div className="agent-output-header">
                Result
                <span className={`triage-mode-tag ${result.agent_mode === 'gemini' ? 'gemini' : ''}`}>
                  {result.agent_mode === 'gemini' ? 'Gemini AI' : 'Rule-based'}
                </span>
              </div>
              <TriageOutputPanel result={result} />
              <div className="row" style={{ marginTop: 4 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate('/work-orders/new', { state: { prefill: form } })}
                >
                  Use to Create Work Order →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
