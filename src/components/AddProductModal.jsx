import { useState } from 'react'
import Field from './common/Field'
import Button from './common/Button'
import '../CssComponents/AddProductModal.css'
export default function AddProductModal({ onAdd, onClose }) {
  const [f, setF] = useState({ sku: '', name: '', unit: 'pcs' }); const [err, setErr] = useState('')
  const submit = (e) => { e.preventDefault(); const r = onAdd(f); if (r) setErr(r) }
  const bind = (k) => ({ value: f[k], required: true, onChange: (e) => setF({ ...f, [k]: e.target.value }) })
  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>Add product</h3>
        <Field label="SKU"><input {...bind('sku')} /></Field>
        <Field label="Name"><input {...bind('name')} /></Field>
        <Field label="Unit"><input {...bind('unit')} /></Field>
        {err && <em className="err">{err}</em>}
        <div className="actions"><Button variant="ghost" type="button" onClick={onClose}>Cancel</Button><Button>Save product</Button></div>
      </form>
    </div>
  )
}
