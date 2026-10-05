import { useMemo, useRef, useState } from 'react'
import { uid, norm } from '../utils'
import Field from './common/Field'
import { pick, toNumber, readRows } from '../excel'
import '../CssComponents/WorkOrders.css'

const EMPTY = { name: '', sku: '', ps: '', unit: '', qty: '' }

const UPLOAD = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12'

const tone = (s) => {
  const t = String(s || '').toLowerCase()
  if (t.includes('complete') || t.includes('done') || t.includes('full')) return 'ok'
  if (t.includes('part') || t.includes('pending') || t.includes('progress')) return 'warn'
  return 'idle'
}

export default function WorkOrderDetail({ db, set, go, view, rowsFor }) {
  const o = db.orders.find((x) => x.id === view.woId)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [note, setNote] = useState(null)
  const fileRef = useRef(null)

  const rows = o ? rowsFor(o.id) : []

  const list = useMemo(() => {
    const term = norm(q)
    if (!term) return rows
    return rows.filter((r) => {
      const master = db.products.find((p) => p.id === r.pid)?.sku || ''
      return norm([r.name, r.sku, master].filter(Boolean).join(' ')).includes(term)
    })
  }, [rows, q, db.products])

  if (!o) {
    return (
      <>
        <button type="button" className="wo-back" onClick={() => go('orders')}>← Work orders</button>
        <p className="wo-sub">This work order no longer exists.</p>
      </>
    )
  }

  const clientName = db.clients.find((c) => c.id === o.clientId)?.name || '-'
  const ordered = rows.reduce((s, r) => s + r.qty, 0)
  const dispatched = rows.reduce((s, r) => s + r.d, 0)
  const balance = rows.reduce((s, r) => s + r.bal, 0)

  const openNew = () => {
    setF(EMPTY)
    setErr('')
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setErr('')
  }

  const add = (e) => {
    e.preventDefault()
    const p = db.products.find((x) => norm(x.sku) === norm(f.ps))
    const unit = toNumber(f.unit)
    const qty = Number(f.qty)
    if (!f.name.trim()) return setErr('Item description is required.')
    if (f.ps.trim() && !p) return setErr('Master SKU not found in the catalog.')
    if (!Number.isFinite(unit) || unit < 0) return setErr('Unit must be a number, for example 10.')
    if (!(qty > 0)) return setErr('Ordered quantity must be greater than zero.')
    set('items', (l) => [...l, { id: uid(), woId: o.id, name: f.name.trim(), sku: f.sku.trim(), unit, qty, pid: p?.id }])
    close()
  }

  const toggleStatus = () =>
    set('orders', (l) => l.map((x) => (x.id === o.id ? { ...x, status: x.status === 'Open' ? 'Closed' : 'Open' } : x)))

  const upload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readRows(file)
      const seen = new Set(rows.map((r) => (r.pid ? 'p' + r.pid : 'n' + norm(r.name + r.sku))))
      const fresh = []
      let dup = 0
      let bad = 0
      data.forEach((r) => {
        const skuRaw = String(pick(r, ['mastersku', 'sku'])).trim()
        const master = skuRaw ? db.products.find((p) => norm(p.sku) === norm(skuRaw)) : null
        const name = String(pick(r, ['productname', 'itemdescription', 'name'])).trim() || master?.name || ''
        const qty = toNumber(pick(r, ['orderedqty', 'qty', 'quantity']))
        const unitRaw = pick(r, ['uom', 'unit'])
        const unit = unitRaw === '' ? Number(master?.unit) || 1 : toNumber(unitRaw)
        const clientSku = String(pick(r, ['clientsku'])).trim()
        if ((skuRaw && !master) || !name || !(qty > 0) || !Number.isFinite(unit) || unit < 0) {
          bad += 1
          return
        }
        const k = master ? 'p' + master.id : 'n' + norm(name + clientSku)
        if (seen.has(k)) {
          dup += 1
          return
        }
        seen.add(k)
        fresh.push({ id: uid(), woId: o.id, name, sku: clientSku || master?.sku || '', unit, qty, pid: master?.id })
      })
      if (fresh.length) set('items', (l) => [...l, ...fresh])
      setNote({ added: fresh.length, dup, bad })
    } catch {
      setNote({ error: 'Could not read this file. Upload a valid .xlsx or .xls file.' })
    }
  }

  return (
    <>
      <button type="button" className="wo-back" onClick={() => go('orders')}>← Work orders</button>

      <div className="wo-head">
        <div>
          <h2 className="wo-title">{o.no}</h2>
          <p className="wo-sub">{o.title || 'Untitled work order'}</p>
          <div className="wo-meta">
            <span>Client: <b>{clientName}</b></span>
            <span>Date: <b>{o.date || '-'}</b></span>
            <span className={'wo-pill ' + (o.status === 'Open' ? 'warn' : 'idle')}>{o.status}</span>
          </div>
        </div>
        <div className="wo-btns">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={upload} />
          <button className="wo-ghost" onClick={() => fileRef.current.click()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={UPLOAD} />
            </svg>
            Upload Excel
          </button>
          <button className="wo-add" onClick={openNew}>+ Add Item</button>
        </div>
      </div>

      <div className="wo-btns wo-sec">
        <button className="wo-ghost" onClick={() => go('import', o.id)}>Import challans</button>
        <button className="wo-ghost" onClick={() => go('recon', o.id)}>View reconciliation</button>
        <button className="wo-ghost" onClick={toggleStatus}>Mark {o.status === 'Open' ? 'closed' : 'open'}</button>
      </div>

      {note && (
        <div className={'wo-note' + (note.error ? ' err' : '')}>
          {note.error ? (
            <span>{note.error}</span>
          ) : (
            <div className="wo-note-body">
              <span className="wo-note-title">Excel import complete</span>
              <div className="wo-chips">
                <span className="wo-chip ok"><b>{note.added}</b> items added</span>
                <span className="wo-chip warn"><b>{note.dup}</b> duplicates skipped</span>
                <span className="wo-chip bad"><b>{note.bad}</b> invalid rows skipped</span>
              </div>
            </div>
          )}
          <button className="wo-note-x" onClick={() => setNote(null)} aria-label="Close">×</button>
        </div>
      )}

      <div className="wo-stats">
        <div className="wo-stat"><span>Items</span><b>{rows.length}</b></div>
        <div className="wo-stat"><span>Ordered qty</span><b>{ordered}</b></div>
        <div className="wo-stat"><span>Dispatched</span><b className="g">{dispatched}</b></div>
        <div className="wo-stat"><span>Balance</span><b className="a">{balance}</b></div>
      </div>

      <div className="wo-tools">
        <input
          className="wo-search"
          type="search"
          placeholder="Search by item, client SKU, master SKU..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="wo-icon" title="Clear search" onClick={() => setQ('')}>↻</button>
      </div>

      <p className="wo-count">Showing {list.length} of {rows.length} items</p>

      <div className="wo-wrap">
        <table className="wo-table">
          <thead>
            <tr>
              <th>Master SKU</th>
              <th>Item</th>
              <th>Unit</th>
              <th className="n">Ordered</th>
              <th className="n">Dispatched</th>
              <th className="n">Balance</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const master = db.products.find((p) => p.id === r.pid)
              return (
                <tr key={r.id}>
                  <td>{master ? <span className="wo-code">{master.sku}</span> : <span className="wo-unmapped">Not mapped</span>}</td>
                  <td><b>{r.name}</b>{r.sku && <small className="wo-small">{r.sku}</small>}</td>
                  <td>{r.unit}</td>
                  <td className="n">{r.qty}</td>
                  <td className="n">{r.d}</td>
                  <td className="n">{r.bal}</td>
                  <td><span className={'wo-pill ' + tone(r.st)}>{String(r.st ?? '-')}</span></td>
                  <td className="wo-actions">
                    {r.d === 0
                      ? <button className="wo-link del" onClick={() => set('items', (l) => l.filter((x) => x.id !== r.id))}>Delete</button>
                      : <small className="wo-small">Dispatched</small>}
                  </td>
                </tr>
              )
            })}
            {!list.length && (
              <tr>
                <td colSpan={8} className="wo-empty">
                  {q ? 'No item matches your search.' : 'No items yet. Add an item or upload an Excel file.'}
                  {q && <button className="wo-link" onClick={() => setQ('')}>Clear search</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="wo-overlay" onMouseDown={close}>
          <form className="wo-modal" onSubmit={add} onMouseDown={(e) => e.stopPropagation()} noValidate>
            <h3>Add item to {o.no}</h3>
            <div className="wo-grid">
              <Field label="Item description *">
                <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
              </Field>
              <Field label="Client SKU">
                <input value={f.sku} onChange={(e) => setF({ ...f, sku: e.target.value })} />
              </Field>
              <Field label="Master SKU (optional)">
                <input list="skus" value={f.ps} onChange={(e) => setF({ ...f, ps: e.target.value })} />
              </Field>
              <datalist id="skus">
                {db.products.map((p) => <option key={p.id} value={p.sku}>{p.name}</option>)}
              </datalist>
              <Field label="Unit (number) *">
                <input type="number" min="0" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
              </Field>
              <Field label="Ordered qty *">
                <input type="number" min="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
              </Field>
            </div>
            {err && <em className="wo-err">{err}</em>}
            <div className="wo-foot">
              <button type="button" className="wo-ghost" onClick={close}>Cancel</button>
              <button className="wo-add">Add item</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}