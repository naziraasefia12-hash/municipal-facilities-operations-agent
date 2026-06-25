import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WorkOrderNote } from '../../types'
import { addNote } from '../../api/workOrders'
import { formatDateTime } from '../../utils/formatters'

interface Props {
  workOrderId: number
  notes: WorkOrderNote[]
}

export function NoteThread({ workOrderId, notes }: Props) {
  const [author, setAuthor] = useState('')
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => addNote(workOrderId, { author, content, note_type: 'internal' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      setAuthor('')
      setContent('')
      setErrors({})
    },
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!author.trim()) e.author = 'Author is required'
    if (!content.trim()) e.content = 'Note content is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  return (
    <div>
      {notes.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '12px 0' }}>
          No notes yet.
        </div>
      ) : (
        <div className="note-list">
          {notes.map(note => (
            <div key={note.id} className="note-item">
              <div className="note-meta">
                <span className="note-author">{note.author}</span>
                <span className="note-type-tag">{note.note_type}</span>
                <span className="note-date">{formatDateTime(note.created_at)}</span>
              </div>
              <div className="note-text">{note.content}</div>
            </div>
          ))}
        </div>
      )}

      <div className="note-add-form">
        <div className="form-section-title">Add Note</div>
        <form onSubmit={submit} className="stack-sm">
          <div className="form-grid form-grid-2">
            <div className="form-field">
              <label className="form-label">Author</label>
              <input
                className={`form-input ${errors.author ? 'error' : ''}`}
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Your name"
              />
              {errors.author && <span className="form-error">{errors.author}</span>}
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Note</label>
            <textarea
              className={`form-textarea ${errors.content ? 'error' : ''}`}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add an internal note…"
              rows={3}
            />
            {errors.content && <span className="form-error">{errors.content}</span>}
          </div>
          {mutation.isError && (
            <div className="form-error-banner">Failed to add note. Please try again.</div>
          )}
          <div>
            <button type="submit" className="btn btn-neutral" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
