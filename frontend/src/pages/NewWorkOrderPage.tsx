import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useBuildings } from '../hooks/useBuildings'
import { createWorkOrder } from '../api/workOrders'
import { TriageOutputPanel } from '../components/work-orders/TriageOutputPanel'
import { LoadingState } from '../components/ui/LoadingState'
import type { WorkOrder } from '../types'

interface FormState {
  title: string
  description: string
  building_id: string
  location_details: string
  submitted_by: string
  estimated_cost: string
}

const INIT: FormState = {
  title: '', description: '', building_id: '',
  location_details: '', submitted_by: '', estimated_cost: '',
}

export function NewWorkOrderPage() {
  const navigate = useNavigate()
  const { data: buildings } = useBuildings()
  const [form, setForm] = useState<FormState>(INIT)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [created, setCreated] = useState<WorkOrder | null>(null)

  const mutation = useMutation({
    mutationFn: () => createWorkOrder({
      title: form.title,
      description: form.description,
      building_id: Number(form.building_id),
      location_details: form.location_details || undefined,
      submitted_by: form.submitted_by,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
    }),
    onSuccess: (wo) => setCreated(wo),
  })

  function set(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(prev => ({ ...prev, [k]: e.target.value }))
      if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }))
    }
  }

  function validate() {
    const e: Partial<FormState> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.description.trim()) e.description = 'Description is required'
    if (!form.building_id) e.building_id = 'Building is required'
    if (!form.submitted_by.trim()) e.submitted_by = 'Submitted by is required'
    if (form.estimated_cost && isNaN(Number(form.estimated_cost))) e.estimated_cost = 'Must be a number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  if (created) {
    return (
      <div className="detail-layout">
        <div className="detail-main">
          <div className="form-success" style={{ marginBottom: 16 }}>
            Work order <strong>{created.order_number}</strong> created successfully.
          </div>
          {created.triage_result && <TriageOutputPanel result={created.triage_result} />}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/work-orders/${created.id}`)}>
              View Work Order →
            </button>
            <button className="btn btn-neutral" onClick={() => { setCreated(null); setForm(INIT) }}>
              Submit Another
            </button>
          </div>
        </div>
        <div className="detail-side">
          <div className="panel" style={{ padding: 12 }}>
            <div className="field-group">
              <div className="field-label">Order Number</div>
              <div className="field-value mono">{created.order_number}</div>
            </div>
            <div className="field-group">
              <div className="field-label">Status</div>
              <div className="field-value">{created.status}</div>
            </div>
            <div className="field-group">
              <div className="field-label">SLA Deadline</div>
              <div className="field-value">{created.sla_hours}h from submission</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-layout">
      <div className="detail-main">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Work Order Details</span>
          </div>
          <form onSubmit={submit} style={{ padding: 16 }}>
            <div className="stack">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Title</label>
                  <input className={`form-input ${errors.title ? 'error' : ''}`} value={form.title} onChange={set('title')} placeholder="Brief description of the issue" />
                  {errors.title && <span className="form-error">{errors.title}</span>}
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-field">
                  <label className="form-label">Building</label>
                  <select className={`form-select ${errors.building_id ? 'error' : ''}`} value={form.building_id} onChange={set('building_id')}>
                    <option value="">Select a building…</option>
                    {(buildings ?? []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {errors.building_id && <span className="form-error">{errors.building_id}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">Location Details <span className="form-label-opt">optional</span></label>
                  <input className="form-input" value={form.location_details} onChange={set('location_details')} placeholder="e.g. 2nd floor, room 204" />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Description</label>
                  <textarea className={`form-textarea ${errors.description ? 'error' : ''}`} value={form.description} onChange={set('description')} placeholder="Describe the issue in detail — what is happening, when it started, any safety concerns…" rows={5} />
                  {errors.description && <span className="form-error">{errors.description}</span>}
                </div>
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-field">
                  <label className="form-label">Submitted By</label>
                  <input className={`form-input ${errors.submitted_by ? 'error' : ''}`} value={form.submitted_by} onChange={set('submitted_by')} placeholder="Your full name" />
                  {errors.submitted_by && <span className="form-error">{errors.submitted_by}</span>}
                </div>
                <div className="form-field">
                  <label className="form-label">Estimated Cost <span className="form-label-opt">optional</span></label>
                  <input className={`form-input ${errors.estimated_cost ? 'error' : ''}`} value={form.estimated_cost} onChange={set('estimated_cost')} placeholder="0.00" type="number" min="0" step="0.01" />
                  {errors.estimated_cost && <span className="form-error">{errors.estimated_cost}</span>}
                  <span className="form-helper">Approval required if cost exceeds $2,500</span>
                </div>
              </div>

              {mutation.isError && (
                <div className="form-error-banner">Submission failed. Please check your input and try again.</div>
              )}

              <div className="row">
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Running AI Triage…</>
                  ) : 'Submit Work Order'}
                </button>
                <button type="button" className="btn btn-neutral" onClick={() => navigate('/work-orders')}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="detail-side">
        <div className="panel" style={{ padding: 12 }}>
          <div className="form-section-title" style={{ marginBottom: 8 }}>What happens next</div>
          <div className="stack-sm">
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>1.</strong> The AI triage agent classifies the issue, assigns a priority, and routes it to the correct maintenance team.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>2.</strong> An SLA deadline is calculated based on the assigned priority.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>3.</strong> If a safety risk is detected, the order is automatically escalated.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>4.</strong> Costs above $2,500 require manager approval before work begins.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
