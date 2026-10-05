import { useMemo, useState } from 'react'
import { uid, norm } from '../utils'
import Field from './common/Field'
import '../CssComponents/Screens.css'
import '../CssComponents/Client.css'

const EMPTY = { code: '', name: '', contact: '', phone: '', email: '', gst: '', city: '', address: '' }

const COLS = [
  { key: 'code', label: 'Client Code' },
  { key: 'name', label: 'Client Name' },
  { key: 'contact', label: 'Contact Person' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'gst', label: 'GST No' },
  { key: 'city', label: 'City' },
  { key: 'active', label: 'Status' },
]

const searchText = (c) => [c.code, c.name, c.contact, c.phone, c.email, c.gst, c.city, c.address].filter(Boolean).join(' ')

export default function Clients({ db, set, go }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [city, setCity] = useState('all')
  const [sort, setSort] = useState({ key: 'code', dir: 1 })
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [f, setF] = useState(EMPTY)
  const [errs, setErrs] = useState({})

  const clients = db.clients
  const cities = useMemo(() => [...new Set(clients.map((c) => (c.city || '').trim()).filter(Boolean))].sort(), [clients])
  const activeCount = clients.filter((c) => c.active).length

  const list = useMemo(() => {
    const term = norm(q)
    return clients
      .filter((c) => (status === 'all' ? true : status === 'active' ? c.active : !c.active))
      .filter((c) => (city === 'all' ? true : (c.city || '').trim() === city))
      .filter((c) => !term || norm(searchText(c)).includes(term))
      .sort((a, b) => {
        const x = a[sort.key] ?? ''
        const y = b[sort.key] ?? ''
        if (typeof x === 'boolean') return (Number(y) - Number(x)) * sort.dir
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sort.dir
      })
  }, [clients, q, status, city, sort])

  const filtered = q || status !== 'all' || city !== 'all'
  const reset = () => { setQ(''); setStatus('all'); setCity('all'); setSort({ key: 'code', dir: 1 }) }
  const toggleSort = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }))

  const openAdd = () => { setEditId(null); setF(EMPTY); setErrs({}); setOpen(true) }
  const openEdit = (c) => { setEditId(c.id); setF({ ...EMPTY, ...c }); setErrs({}); setOpen(true) }
  const close = () => { setOpen(false); setEditId(null); setF(EMPTY); setErrs({}) }
  const change = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const validate = () => {
    const e = {}
    if (!f.code.trim()) e.code = 'Client code is required.'
    else if (clients.some((c) => c.id !== editId && norm(c.code) === norm(f.code))) e.code = 'This client code already exists.'
    if (!f.name.trim()) e.name = 'Client name is required.'
    if (f.phone && !/^[0-9+\-\s]{8,15}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
    if (f.gst && !/^[0-9A-Z]{15}$/.test(f.gst.trim().toUpperCase())) e.gst = 'GST number must be 15 characters.'
    return e
  }

  const save = (e) => {
    e.preventDefault()
    const found = validate()
    setErrs(found)
    if (Object.keys(found).length) return
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
    clean.code = clean.code.toUpperCase()
    clean.gst = (clean.gst || '').toUpperCase()
    if (editId) set('clients', (l) => l.map((x) => (x.id === editId ? { ...x, ...clean } : x)))
    else set('clients', (l) => [...l, { ...clean, id: uid(), active: true }])
    close()
  }

  const toggle = (id) => set('clients', (l) => l.map((x) => (x.id === id ? { ...x, active: !x.active } : x)))
  const remove = (c) => { if (window.confirm('Delete client ' + c.code + ' - ' + c.name + '?')) set('clients', (l) => l.filter((x) => x.id !== c.id)) }

  const exportCsv = () => {
    const head = COLS.map((c) => c.label).concat('Address')
    const rows = list.map((c) => [c.code, c.name, c.contact, c.phone, c.email, c.gst, c.city, c.active ? 'Active' : 'Inactive', c.address])
    const csv = [head, ...rows].map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'clients.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <button type="button" className="cl-back" onClick={() => go('plugins')}>← Plugins</button>
      <div className="cl-head">
        <div>
          <h2 className="cl-title">Client Directory</h2>
          <p className="cl-sub">Companies you supply to. Work orders and challans are linked to these clients.</p>
        </div>
        <button className="cl-add" onClick={openAdd}>+ Add Client</button>
      </div>

      <div className="cl-stats">
        <div className="cl-stat"><span>Total clients</span><b>{clients.length}</b></div>
        <div className="cl-stat"><span>Active</span><b className="g">{activeCount}</b></div>
        <div className="cl-stat"><span>Inactive</span><b className="m">{clients.length - activeCount}</b></div>
        <div className="cl-stat"><span>Cities</span><b>{cities.length}</b></div>
      </div>

      <div className="cl-tools">
        <input
          className="cl-search"
          type="search"
          placeholder="Search by code, name, contact, phone, email, GST, city..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="all">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="cl-icon" title="Reset filters" onClick={reset}>↻</button>
        <button className="cl-ghost" onClick={exportCsv} disabled={!list.length}>Export CSV</button>
      </div>

      <p className="cl-count">Showing {list.length} of {clients.length} clients</p>

      <div className="cl-wrap">
      <table className="cl-table">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} className="cl-sort" onClick={() => toggleSort(c.key)}>
                {c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}>
              <td><span className="cl-code">{c.code}</span></td>
              <td><b>{c.name}</b>{c.address && <small className="cl-addr">{c.address}</small>}</td>
              <td>{c.contact || '-'}</td>
              <td>{c.phone || '-'}</td>
              <td>{c.email || '-'}</td>
              <td>{c.gst || '-'}</td>
              <td>{c.city || '-'}</td>
              <td><span className={'pill ' + (c.active ? 'ok' : 'idle')}>{c.active ? 'Active' : 'Inactive'}</span></td>
              <td className="n cl-actions">
                <button className="ghost" onClick={() => openEdit(c)}>Edit</button>
                <button className="ghost" onClick={() => toggle(c.id)}>{c.active ? 'Deactivate' : 'Activate'}</button>
                <button className="ghost cl-del" onClick={() => remove(c)}>Delete</button>
              </td>
            </tr>
          ))}
          {!list.length && (
            <tr>
              <td colSpan={COLS.length + 1} className="cl-empty">
                {filtered ? 'No client matches your search or filters.' : 'No clients yet. Add your first client to get started.'}
                {filtered && <button className="ghost" onClick={reset}>Clear filters</button>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {open && (
        <div className="cl-overlay" onMouseDown={close}>
          <form className="cl-modal" onSubmit={save} onMouseDown={(e) => e.stopPropagation()} noValidate>
            <h3>{editId ? 'Edit client' : 'Add client'}</h3>
            <div className="cl-grid">
              <Field label="Client code *">
                <input value={f.code} onChange={change('code')} autoFocus />
                {errs.code && <em className="err">{errs.code}</em>}
              </Field>
              <Field label="Client name *">
                <input value={f.name} onChange={change('name')} />
                {errs.name && <em className="err">{errs.name}</em>}
              </Field>
              <Field label="Contact person">
                <input value={f.contact} onChange={change('contact')} />
              </Field>
              <Field label="Phone">
                <input value={f.phone} onChange={change('phone')} />
                {errs.phone && <em className="err">{errs.phone}</em>}
              </Field>
              <Field label="Email">
                <input type="email" value={f.email} onChange={change('email')} />
                {errs.email && <em className="err">{errs.email}</em>}
              </Field>
              <Field label="GST number">
                <input value={f.gst} onChange={change('gst')} maxLength={15} />
                {errs.gst && <em className="err">{errs.gst}</em>}
              </Field>
              <Field label="City">
                <input value={f.city} onChange={change('city')} />
              </Field>
              <Field label="Address">
                <input value={f.address} onChange={change('address')} />
              </Field>
            </div>
            <div className="cl-foot">
              <button type="button" className="cl-ghost" onClick={close}>Cancel</button>
              <button className="cl-add">{editId ? 'Save changes' : 'Add client'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}