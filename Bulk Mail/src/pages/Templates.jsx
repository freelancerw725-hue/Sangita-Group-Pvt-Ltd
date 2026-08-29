import { useState } from 'react'
import { Modal, ConfirmDialog, useToast } from '../components/UI.jsx'
import { IconPlus, IconEdit, IconTrash, IconCopy, IconEye } from '../components/Icons.jsx'
import { templateCategories, templates as seed } from '../data/mock.js'

function TemplateModal({ open, onClose, initial, viewOnly }) {
  const toast = useToast()
  const [form, setForm] = useState(initial || { name: '', category: 'Initial Outreach', subject: '', body: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  return (
    <Modal
      open={open} onClose={onClose} wide title={viewOnly ? 'Template Preview' : initial ? 'Edit Template' : 'New Template'}
      footer={!viewOnly && (
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onClose(); toast('Template saved (demo)') }}>Save Template</button>
        </>
      )}
    >
      <div className="form-row">
        <div className="field">
          <label>Template Name</label>
          <input className="input" placeholder="e.g. 1st Message (v1)" value={form.name} onChange={set('name')} disabled={viewOnly} />
        </div>
        <div className="field">
          <label>Category</label>
          <select className="select" value={form.category} onChange={set('category')} disabled={viewOnly}>
            {templateCategories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Subject</label>
        <input className="input" placeholder="e.g. {{company}} Ji ke liye ek chhoti si idea…" value={form.subject} onChange={set('subject')} disabled={viewOnly} />
      </div>
      <div className="field">
        <label>Body</label>
        <textarea className="textarea" rows={9} placeholder="Write your email… use {{company}} as a variable" value={form.body} onChange={set('body')} disabled={viewOnly} />
      </div>
      <p className="hint">Variables: <span className="var-chip">{'{{company}}'}</span> — replaced per lead when sending.</p>
    </Modal>
  )
}

export default function Templates() {
  const toast = useToast()
  const [list, setList] = useState(seed)
  const [modal, setModal] = useState(null) // { mode: 'new'|'edit'|'view', tpl }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Templates</h2>
          <p>Manage your email templates with variable support</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'new' })}><IconPlus /> New Template</button>
      </div>

      {templateCategories.map((cat) => {
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
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setModal({ mode: 'view', tpl: t })} aria-label="Preview"><IconEye size={15} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setList(list.map((x) => x.id === t.id ? { ...x, id: Date.now(), name: x.name + ' (copy)' } : x)); toast('Template duplicated (demo)') }} aria-label="Duplicate"><IconCopy size={15} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setModal({ mode: 'edit', tpl: t })} aria-label="Edit"><IconEdit size={15} /></button>
                        <button className="icon-btn" style={{ width: 30, height: 30, color: 'var(--red)' }} onClick={() => { setList(list.filter((x) => x.id !== t.id)); toast('Template deleted (demo)') }} aria-label="Delete"><IconTrash size={15} /></button>
                      </div>
                    </div>
                    <div className="tpl-body-preview">{t.body}</div>
                    <div className="tpl-foot">
                      <span className="var-chip">{'{{company}}'}</span>
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
          open onClose={() => setModal(null)}
          initial={modal.mode === 'new' ? null : modal.tpl}
          viewOnly={modal.mode === 'view'}
        />
      )}
    </>
  )
}
