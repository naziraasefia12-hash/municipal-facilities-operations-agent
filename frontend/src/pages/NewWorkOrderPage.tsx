import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useBuildings } from '../hooks/useBuildings'
import { createWorkOrder } from '../api/workOrders'
import { TriageOutputPanel } from '../components/work-orders/TriageOutputPanel'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PriorityBadge } from '../components/ui/PriorityBadge'
import type { WorkOrder } from '../types'
import { formatCurrency } from '../utils/formatters'

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

// ── Post-submission result view ───────────────────────────────────────────────
function SubmissionResult({
  wo,
  onReset,
}: {
  wo: WorkOrder
  onReset: () => void
}) {
  const navigate = useNavigate()
  const tr = wo.triage_result

  return (
    <div className="stack">
      <div className="form-success">
        Work order <strong>{wo.order_number}</strong> submitted and triaged successfully.
      </div>

      <div className="submit-result-grid">
        {/* Left — triage output */}
        <div>
          {tr && <TriageOutputPanel result={tr} />}
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/work-orders/${wo.id}`)}>
              Open Work Order →
            </button>
            <button className="btn btn-neutral" onClick={onReset}>
              Submit Another
            </button>
          </div>
        </div>

        {/* Right — order summary */}
        <div className="submit-summary-panel">
          <div className="submit-summary-header">Order Summary</div>
          <div className="submit-summary-body">
            <div className="submit-summary-row">
              <span className="submit-summary-key">Order #</span>
              <span className="submit-summary-val" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {wo.order_number}
              </span>
            </div>
            <div className="submit-summary-row">
              <span className="submit-summary-key">Priority</span>
              <span className="submit-summary-val">
                <PriorityBadge priority={wo.priority} />
              </span>
            </div>
            <div className="submit-summary-row">
              <span className="submit-summary-key">Status</span>
              <span className="submit-summary-val">
                <StatusBadge status={wo.status} />
              </span>
            </div>
            <div className="submit-summary-row">
              <span className="submit-summary-key">SLA</span>
              <span className="submit-summary-val">{wo.sla_hours}h</span>
            </div>
            {tr && (
              <div className="submit-summary-row">
                <span className="submit-summary-key">Team</span>
                <span className="submit-summary-val" style={{ fontSize: 11 }}>{tr.assigned_team}</span>
              </div>
            )}
            <div className="submit-summary-row">
              <span className="submit-summary-key">Approval</span>
              <span className="submit-summary-val" style={{ color: wo.requires_approval ? 'var(--s-pending-text)' : 'inherit' }}>
                {wo.requires_approval ? `Required (${wo.approval_level ?? 'manager'})` : 'Not required'}
              </span>
            </div>
            {wo.estimated_cost != null && (
              <div className="submit-summary-row">
                <span className="submit-summary-key">Est. Cost</span>
                <span className="submit-summary-val">{formatCurrency(wo.estimated_cost)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main form view ────────────────────────────────────────────────────────────
export function NewWorkOrderPage() {
  const navigate = useNavigate()
  const { data: buildings } = useBuildings()
  const [form, setForm] = useState<FormState>(INIT)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [created, setCreated] = useState<WorkOrder | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createWorkOrder({
        title: form.title,
        description: form.description,
        building_id: Number(form.building_id),
        location_details: form.location_details || undefined,
        submitted_by: form.submitted_by,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
      }),
    onSuccess: (wo) => setCreated(wo),
  })

  function field(k: keyof FormState) {
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
    if (!form.submitted_by.trim()) e.submitted_by = 'Your name is required'
    if (form.estimated_cost && isNaN(Number(form.estimated_cost))) e.estimated_cost = 'Must be a number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutation.mutate()
  }

  if (created) {
    return <SubmissionResult wo={created} onReset={() => { setCreated(null); setForm(INIT) }} />
  }

  return (
    <div className="detail-layout">

      {/* ── Form panel ─────────────────────────────────────────────── */}
      <div className="detail-main">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">New Work Order</span>
            <span className="panel-meta">Fields marked * are required</span>
          </div>

          <form onSubmit={submit} style={{ padding: '0 var(--sp-4) var(--sp-4)' }}>

            {/* ── Section 1: Request Details ── */}
            <div className="form-section-divider">Request Details</div>
            <div className="stack-sm">
              <div className="form-field">
                <label className="form-label">Title *</label>
                <input
                  className={`form-input ${errors.title ? 'error' : ''}`}
                  value={form.title}
                  onChange={field('title')}
                  placeholder="Brief description of the issue"
                />
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">Description *</label>
                <textarea
                  className={`form-textarea ${errors.description ? 'error' : ''}`}
                  value={form.description}
                  onChange={field('description')}
                  placeholder="Describe the issue in detail — what is happening, when it started, any safety concerns or hazards observed…"
                  rows={5}
                />
                {errors.description && <span className="form-error">{errors.description}</span>}
                <span className="form-helper">
                  More detail improves AI triage accuracy. Include any safety keywords (gas smell, water near electrical, etc.) if relevant.
                </span>
              </div>
            </div>

            {/* ── Section 2: Location ── */}
            <div className="form-section-divider">Location</div>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label">Building *</label>
                <select
                  className={`form-select ${errors.building_id ? 'error' : ''}`}
                  value={form.building_id}
                  onChange={field('building_id')}
                >
                  <option value="">Select a building…</option>
                  {(buildings ?? []).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.building_id && <span className="form-error">{errors.building_id}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">
                  Location Details <span className="form-label-opt">optional</span>
                </label>
                <input
                  className="form-input"
                  value={form.location_details}
                  onChange={field('location_details')}
                  placeholder="Floor, room, area, equipment ID…"
                />
              </div>
            </div>

            {/* ── Section 3: Submitter & Cost ── */}
            <div className="form-section-divider">Submitter & Cost</div>
            <div className="form-grid form-grid-2">
              <div className="form-field">
                <label className="form-label">Submitted By *</label>
                <input
                  className={`form-input ${errors.submitted_by ? 'error' : ''}`}
                  value={form.submitted_by}
                  onChange={field('submitted_by')}
                  placeholder="Full name"
                />
                {errors.submitted_by && <span className="form-error">{errors.submitted_by}</span>}
              </div>

              <div className="form-field">
                <label className="form-label">
                  Estimated Cost <span className="form-label-opt">optional</span>
                </label>
                <input
                  className={`form-input ${errors.estimated_cost ? 'error' : ''}`}
                  value={form.estimated_cost}
                  onChange={field('estimated_cost')}
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.01"
                />
                {errors.estimated_cost && <span className="form-error">{errors.estimated_cost}</span>}
                <span className="form-helper">
                  Costs over $2,500 trigger manager approval · over $10,000 require director approval
                </span>
              </div>
            </div>

            {/* ── Submit area ── */}
            <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-4)', borderTop: '1px solid var(--border-row)' }}>
              {mutation.isError && (
                <div className="form-error-banner" style={{ marginBottom: 12 }}>
                  Submission failed. Please check your input and try again.
                </div>
              )}
              <div className="row">
                <button type="submit" className="btn btn-primary btn-lg" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 1.5 }} /> Running AI Triage…</>
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

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="detail-side">
        <div className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-header">
            <span className="panel-title">How Submission Works</span>
          </div>
          <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
            <div className="how-steps">
              <div className="how-step">
                <span className="how-step-num">1</span>
                <span className="how-step-text">
                  The AI triage agent classifies the issue by category, assigns a priority level, and routes it to the correct maintenance team.
                </span>
              </div>
              <div className="how-step">
                <span className="how-step-num">2</span>
                <span className="how-step-text">
                  An SLA deadline is set automatically: Critical = 2 h · High = 24 h · Medium = 72 h · Low = 168 h.
                </span>
              </div>
              <div className="how-step">
                <span className="how-step-num">3</span>
                <span className="how-step-text">
                  Safety keywords (gas smell, water near electrical, smoke, etc.) trigger an automatic escalation to Emergency Response.
                </span>
              </div>
              <div className="how-step">
                <span className="how-step-num">4</span>
                <span className="how-step-text">
                  Estimated costs above $2,500 require manager approval. Above $10,000 require director sign-off before work begins.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ overflow: 'hidden', marginTop: 'var(--sp-4)' }}>
          <div className="panel-header">
            <span className="panel-title">SLA Reference</span>
          </div>
          <div style={{ padding: 0 }}>
            {[
              { p: 'Critical', h: '2 h', color: 'var(--p-critical-text)', bg: 'var(--p-critical-bg)', border: 'var(--p-critical-border)' },
              { p: 'High', h: '24 h', color: 'var(--p-high-text)', bg: 'var(--p-high-bg)', border: 'var(--p-high-border)' },
              { p: 'Medium', h: '72 h', color: 'var(--p-medium-text)', bg: 'var(--p-medium-bg)', border: 'var(--p-medium-border)' },
              { p: 'Low', h: '168 h', color: 'var(--p-low-text)', bg: 'var(--p-low-bg)', border: 'var(--p-low-border)' },
            ].map(row => (
              <div key={row.p} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 16px', borderBottom: '1px solid var(--border-row)',
              }}>
                <span style={{ display: 'inline-block', padding: '2px 6px', fontSize: 11, fontWeight: 500, borderRadius: 2, border: `1px solid ${row.border}`, color: row.color, background: row.bg }}>
                  {row.p}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{row.h}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
