import { useMemo, useRef, useState } from 'react'
import { uid, norm } from '../utils'
import Field from './common/Field'
import { pick, toNumber, fmtDate, readRows } from '../excel'
import '../CssComponents/WorkOrders.css'

const COLS = [
  { key: 'no', label: 'Order No' },
  { key: 'client', label: 'Client' },
  { key: 'title', label: 'Title' },
  { key: 'date', label: 'Order Date' },
  { key: 'items', label: 'Items' },
  { key: 'qty', label: 'Ordered Qty' },
  { key: 'status', label: 'Status' },
]

const EMPTY = { no: '', clientId: '', title: '', date: '' }

const UPLOAD = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12'

export default function WorkOrders({ db, set, go }) {
  const [q, setQ] = useState('')
  const [fc, setFc] = useState('all')
  const [fs, setFs] = useState('all')
  const [sort, setSort] = useState({ key: 'no', dir: 1 })
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [note, setNote] = useState(null)
  const fileRef = useRef(null)

  const clientName = (id) => db.clients.find((c) => c.id === id)?.name || ''

  const rows = useMemo(
    () =>
      db.orders.map((o) => {
        const its = db.items.filter((i) => i.woId === o.id)
        return { ...o, client: clientName(o.clientId), items: its.length, qty: its.reduce((s, i) => s + i.qty, 0) }
      }),
    [db.orders, db.items, db.clients]
  )

  const list = useMemo(() => {
    const term = norm(q)
    return rows
      .filter((o) => fc === 'all' || o.clientId === fc)
      .filter((o) => fs === 'all' || o.status === fs)
      .filter((o) => !term || norm([o.no, o.client, o.title, o.date].filter(Boolean).join(' ')).includes(term))
      .sort((a, b) => {
        const x = a[sort.key] ?? ''
        const y = b[sort.key] ?? ''
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sort.dir
      })
  }, [rows, q, fc, fs, sort])

  const filtered = q || fc !== 'all' || fs !== 'all'
  const openCount = db.orders.filter((o) => o.status === 'Open').length

  const reset = () => {
    setQ('')
    setFc('all')
    setFs('all')
    setSort({ key: 'no', dir: 1 })
  }

  const toggleSort = (k) => setSort((s) => (s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: 1 }))

  const openNew = () => {
    setF({ ...EMPTY, date: new Date().toISOString().slice(0, 10) })
    setErr('')
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setErr('')
  }

  const save = (e) => {
    e.preventDefault()
    if (!f.no.trim()) return setErr('Order number is required.')
    if (db.orders.some((o) => norm(o.no) === norm(f.no))) return setErr('This work order number already exists.')
    if (!f.clientId) return setErr('Select a client.')
    set('orders', (l) => [...l, { id: uid(), no: f.no.trim(), clientId: f.clientId, title: f.title.trim(), date: f.date, status: 'Open' }])
    close()
  }

  const remove = (o) => {
    if (o.items) return
    if (window.confirm('Delete work order ' + o.no + '?')) set('orders', (l) => l.filter((x) => x.id !== o.id))
  }

  const upload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readRows(file)
      const fallback = db.clients.find((c) => c.active)
      const byNo = new Map(db.orders.map((o) => [norm(o.no), o]))
      const seen = new Set(db.items.filter((i) => i.pid).map((i) => i.woId + '|' + i.pid))
      const newOrders = []
      const newItems = []
      let dup = 0
      let bad = 0
      data.forEach((r) => {
        const no = String(pick(r, ['workorderno', 'orderno', 'wono', 'workorder'])).trim()
        const clientRaw = String(pick(r, ['clientcode', 'client', 'clientname'])).trim()
        const skuRaw = String(pick(r, ['mastersku', 'sku'])).trim()
        const client = clientRaw
          ? db.clients.find((c) => norm(c.code) === norm(clientRaw) || norm(c.name) === norm(clientRaw))
          : fallback
        const master = db.products.find((p) => skuRaw && norm(p.sku) === norm(skuRaw))
        const qty = toNumber(pick(r, ['orderedqty', 'qty', 'quantity']))
        const unitRaw = pick(r, ['uom', 'unit'])
        const unit = unitRaw === '' ? Number(master?.unit) || 1 : toNumber(unitRaw)
        if (!no || !client || !master || !(qty > 0) || !Number.isFinite(unit) || unit < 0) {
          bad += 1
          return
        }
        let order = byNo.get(norm(no))
        if (order && order.clientId !== client.id) {
          bad += 1
          return
        }
        if (!order) {
          order = {
            id: uid(),
            no,
            clientId: client.id,
            title: String(pick(r, ['title'])).trim() || 'Imported from Excel',
            date: fmtDate(pick(r, ['orderdate', 'date'])),
            status: 'Open',
          }
          byNo.set(norm(no), order)
          newOrders.push(order)
        }
        const k = order.id + '|' + master.id
        if (seen.has(k)) {
          dup += 1
          return
        }
        seen.add(k)
        newItems.push({
          id: uid(),
          woId: order.id,
          name: String(pick(r, ['productname', 'itemdescription', 'name'])).trim() || master.name,
          sku: String(pick(r, ['clientsku'])).trim() || master.sku,
          unit,
          qty,
          pid: master.id,
        })
      })
      if (newOrders.length) set('orders', (l) => [...l, ...newOrders])
      if (newItems.length) set('items', (l) => [...l, ...newItems])
      setNote({ orders: newOrders.length, lines: newItems.length, dup, bad })
    } catch {
      setNote({ error: 'Could not read this file. Upload a valid .xlsx or .xls file.' })
    }
  }

  return (
    <>
      <button type="button" className="wo-back" onClick={() => go('plugins')}>← Plugins</button>

      <div className="wo-head">
        <div>
          <h2 className="wo-title">Work Orders</h2>
          <p className="wo-sub">Orders received from clients. Open an order to add items and track dispatches.</p>
        </div>
        <div className="wo-btns">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={upload} />
          <button className="wo-ghost" onClick={() => fileRef.current.click()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={UPLOAD} />
            </svg>
            Upload Excel
          </button>
          <button className="wo-add" onClick={openNew}>+ New Work Order</button>
        </div>
      </div>

      {note && (
        <div className={'wo-note' + (note.error ? ' err' : '')}>
          {note.error ? (
            <span>{note.error}</span>
          ) : (
            <div className="wo-note-body">
              <span className="wo-note-title">Excel import complete</span>
              <div className="wo-chips">
                <span className="wo-chip ok"><b>{note.orders}</b> orders created</span>
                <span className="wo-chip ok"><b>{note.lines}</b> item lines added</span>
                <span className="wo-chip warn"><b>{note.dup}</b> duplicates skipped</span>
                <span className="wo-chip bad"><b>{note.bad}</b> invalid rows skipped</span>
              </div>
            </div>
          )}
          <button className="wo-note-x" onClick={() => setNote(null)} aria-label="Close">×</button>
        </div>
      )}

      <div className="wo-stats">
        <div className="wo-stat"><span>Total orders</span><b>{db.orders.length}</b></div>
        <div className="wo-stat"><span>Open</span><b className="a">{openCount}</b></div>
        <div className="wo-stat"><span>Closed</span><b className="m">{db.orders.length - openCount}</b></div>
        <div className="wo-stat"><span>Total items</span><b>{db.items.length}</b></div>
      </div>

      <div className="wo-tools">
        <input
          className="wo-search"
          type="search"
          placeholder="Search by order no, client, title, date..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={fc} onChange={(e) => setFc(e.target.value)}>
          <option value="all">All Clients</option>
          {db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={fs} onChange={(e) => setFs(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <button className="wo-icon" title="Reset filters" onClick={reset}>↻</button>
      </div>

      <p className="wo-count">Showing {list.length} of {db.orders.length} work orders</p>

      <div className="wo-wrap">
        <table className="wo-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="wo-sort" onClick={() => toggleSort(c.key)}>
                  {c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="wo-row" onClick={() => go('detail', o.id)}>
                <td><span className="wo-code">{o.no}</span></td>
                <td>{o.client || '-'}</td>
                <td><b>{o.title || '-'}</b></td>
                <td>{o.date || '-'}</td>
                <td>{o.items}</td>
                <td>{o.qty}</td>
                <td><span className={'wo-pill ' + (o.status === 'Open' ? 'warn' : 'idle')}>{o.status}</span></td>
                <td className="wo-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="wo-link" onClick={() => go('detail', o.id)}>Open</button>
                  {!o.items && <button className="wo-link del" onClick={() => remove(o)}>Delete</button>}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={COLS.length + 1} className="wo-empty">
                  {filtered ? 'No work order matches your search or filters.' : 'No work orders yet. Create one or upload an Excel file.'}
                  {filtered && <button className="wo-link" onClick={reset}>Clear filters</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="wo-overlay" onMouseDown={close}>
          <form className="wo-modal" onSubmit={save} onMouseDown={(e) => e.stopPropagation()} noValidate>
            <h3>New work order</h3>
            <div className="wo-grid">
              <Field label="Order no. *">
                <input value={f.no} onChange={(e) => setF({ ...f, no: e.target.value })} autoFocus />
              </Field>
              <Field label="Client *">
                <select value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>
                  <option value="">Select client</option>
                  {db.clients.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Title">
                <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </Field>
              <Field label="Order date">
                <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
              </Field>
            </div>
            {err && <em className="wo-err">{err}</em>}
            <div className="wo-foot">
              <button type="button" className="wo-ghost" onClick={close}>Cancel</button>
              <button className="wo-add">Create order</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}