import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { IconCheck, IconX } from './Icons.jsx'

// ---------------- Modal ----------------
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><IconX size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ---------------- Confirm dialog ----------------
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ fontSize: 14.5, color: 'var(--text-2)' }}>{message}</p>
    </Modal>
  )
}

// ---------------- Toast ----------------
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((msg) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast"><IconCheck size={16} /> {t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
