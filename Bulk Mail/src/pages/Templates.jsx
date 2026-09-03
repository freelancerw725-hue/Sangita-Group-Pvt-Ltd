import { useState, useEffect } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconPlus, IconEdit, IconTrash, IconCopy, IconEye } from '../components/Icons.jsx'

function TemplateModal({ open, onClose, initial, viewOnly, onSave }) {
  const toast = useToast()
  const [form, setForm] = useState(initial || { name: '', category: 'Initial Outreach', subject: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState(['Initial Outreach', 'Followup 1', 'Followup 2', 'Proposal', 'Meeting Reminder'])
  
  useEffect(() => {
    if (initial) {
      setForm(initial)
    }
  }, [initial])
  
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  
  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast('Please fill all required fields')
      return
    }
    
    setLoading(true)
    try {
      const url = initial?.id ? `/api/templates/${initial.id}` : '/api/templates'
      const method = initial?.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          subject: form.subject,
          body: form.body,
        }),
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to save template')
      }
      
      toast(`Template ${initial?.id ? 'updated' : 'created'} successfully`)
      onClose()
      onSave()
    } catch (err) {
      toast(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Modal
      open={open} onClose={onClose} wide title={viewOnly ? 'Template Preview' : initial?.id ? 'Edit Template' : 'New Template'}
      footer={!viewOnly && (
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Template'}
          </button>
        </>
      )}
    >
      <div className="form-row">
        <div className="field">
          <label>Template Name *</label>
          <input className="input" placeholder="e.g. 1st Message (v1)" value={form.name} onChange={set('name')} disabled={viewOnly} />
        </div>
        <div className="field">
          <label>Category *</label>
          <select className="select" value={form.category} onChange={set('category')} disabled={viewOnly}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Subject *</label>
        <input className="input" placeholder="e.g. {{company}} Ji ke liye ek chhoti si idea…" value={form.subject} onChange={set('subject')} disabled={viewOnly} />
      </div>
      <div className="field">
        <label>Body *</label>
        <textarea className="textarea" rows={9} placeholder="Write your email… use {{company}} as a variable" value={form.body} onChange={set('body')} disabled={viewOnly} />
      </div>
      <p className="hint">Variables: <span className="var-chip">{'{{company}}'}</span> <span className="var-chip">{'{{contact}}'}</span> — replaced per lead when sending.</p>
    </Modal>
  )
}

export default function Templates() {
  const toast = useToast()
  const [list, setList] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { mode: 'new'|'edit'|'view', tpl }
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setList(data.data || [])
      setCategories(data.categories || [])
    } catch (err) {
      console.error(err)
      toast('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleDuplicate = async (template) => {
    try {
      const res = await fetch(`/api/templates/${template.id}/duplicate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to duplicate template')
      toast('Template duplicated successfully')
      fetchTemplates()
    } catch (err) {
      toast(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete template')
      toast('Template deleted successfully')
      setConfirmDelete(null)
      fetchTemplates()
    } catch (err) {
      toast(err.message)
    }
  }

  if (loading) {
    return (
      <div className="card card-pad" style={{ textAlign: 'center', padding: '2rem' }}>
        Loading templates...
      </div>
    )
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Templates</h2>
          <p>Manage your email templates with variable support</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'new' })}><IconPlus /> New Template</button>
      </div>

      {categories.map((cat) => {
        const items = list.filter((t) => t.category === cat)
        return (
          <div className="tpl-section" key={cat}>
            <h3>{cat}</h3>
            {items.length === 0 ? (
              <div className="tpl-empty">No templates in this category</div>
            ) : (
              <div className="tpl-grid">
                {items.map((t) => (
                  <div className="card tpl-card" key={t.id}>
                    <div className="tpl-card-head">
                      <div>
                        <div className="tpl-name">{t.name}</div>
                        <div className="tpl-subject">{t.subject}</div>
                      </div>
                      <div className="camp-actions">
                        <button 
                          className="icon-btn" 
                          style={{ width: 30, height: 30 }} 
                          onClick={() => setModal({ mode: 'view', tpl: t })} 
                          aria-label="Preview"
                        >
                          <IconEye size={15} />
                        </button>
                        <button 
                          className="icon-btn" 
                          style={{ width: 30, height: 30 }} 
                          onClick={() => handleDuplicate(t)} 
                          aria-label="Duplicate"
                        >
                          <IconCopy size={15} />
                        </button>
                        <button 
                          className="icon-btn" 
                          style={{ width: 30, height: 30 }} 
                          onClick={() => setModal({ mode: 'edit', tpl: t })} 
                          aria-label="Edit"
                        >
                          <IconEdit size={15} />
                        </button>
                        <button 
                          className="icon-btn" 
                          style={{ width: 30, height: 30, color: 'var(--red)' }} 
                          onClick={() => setConfirmDelete(t)} 
                          aria-label="Delete"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="tpl-body-preview">{t.body}</div>
                    <div className="tpl-foot">
                      {t.variables && t.variables.length > 0 && (
                        <>
                          {t.variables.map((v) => (
                            <span key={v} className="var-chip">{`{{${v}}}`}</span>
                          ))}
                        </>
                      )}
                      <span className="hint">Updated {t.updatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {modal && (
        <TemplateModal
          key={modal.tpl?.id || 'new'}
          open 
          onClose={() => setModal(null)}
          initial={modal.mode === 'new' ? null : modal.tpl}
          viewOnly={modal.mode === 'view'}
          onSave={fetchTemplates}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Template"
        message={`Delete template "${confirmDelete?.name}"? This action cannot be undone.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
      />
    </>
  )
}

