import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { uid, norm } from '../utils'
import AddProductModal from './AddProductModal'
import '../CssComponents/MasterCatalog.css'

const COLS = [
  { key: 'sku', label: 'Master SKU' },
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'UOM' },
  { key: 'minStock', label: 'Min Stock' },
  { key: 'status', label: 'Status' },
]

const isActive = (p) => p.status !== 'Inactive'

const key = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '')

const pick = (row, names) => {
  const k = Object.keys(row).find((x) => names.includes(key(x)))
  return k ? row[k] : ''
}

const toNumber = (v) => {
  if (v === '' || v === null || v === undefined) return NaN
  return Number(v)
}

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const LAYERS = 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5'
const CHECK = 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01l-3-3'
const UPLOAD = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12'

export default function MasterInventory({ db, set, go }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState({ key: 'sku', dir: 1 })
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(null)
  const fileRef = useRef(null)

  const products = db.products

  const categories = useMemo(
    () => [...new Set(products.map((p) => (p.category || '').trim()).filter(Boolean))].sort(),
    [products]
  )

  const list = useMemo(() => {
    const term = norm(q)
    return products
      .filter((p) => (category === 'all' ? true : (p.category || '').trim() === category))
      .filter((p) => (status === 'all' ? true : status === 'active' ? isActive(p) : !isActive(p)))
      .filter((p) => !term || norm([p.sku, p.name, p.category, p.unit].filter((v) => v !== undefined && v !== '').join(' ')).includes(term))
      .sort((a, b) => {
        const x = sort.key === 'status' ? (isActive(a) ? 'Active' : 'Inactive') : a[sort.key] ?? ''
        const y = sort.key === 'status' ? (isActive(b) ? 'Active' : 'Inactive') : b[sort.key] ?? ''
        if (typeof x === 'number' && typeof y === 'number') return (x - y) * sort.dir
        return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' }) * sort.dir
      })
  }, [products, q, category, status, sort])

  const filtered = q || category !== 'all' || status !== 'all'
  const activeCount = products.filter(isActive).length

  const reset = () => {
    setQ('')
    setCategory('all')
    setStatus('all')
    setSort({ key: 'sku', dir: 1 })
  }

  const toggleSort = (k) => setSort((s) => (s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: 1 }))

  const add = (f) => {
    if (products.some((p) => norm(p.sku) === norm(f.sku))) return `SKU ${f.sku} already exists (409).`
    const unit = toNumber(f.unit)
    if (!Number.isFinite(unit) || unit < 0) return 'Unit must be a number, for example 10.'
    set('products', (l) => [...l, { id: uid(), status: 'Active', minStock: 0, ...f, unit }])
    setOpen(false)
  }

  const toggle = (id) =>
    set('products', (l) => l.map((p) => (p.id === id ? { ...p, status: isActive(p) ? 'Inactive' : 'Active' } : p)))

  const remove = (p) => {
    if (window.confirm('Delete product ' + p.sku + ' - ' + p.name + '?')) set('products', (l) => l.filter((x) => x.id !== p.id))
  }

  const upload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const seen = new Set(products.map((p) => norm(p.sku)))
      const fresh = []
      let dup = 0
      let bad = 0
      rows.forEach((r) => {
        const sku = String(pick(r, ['mastersku', 'sku'])).trim()
        const name = String(pick(r, ['productname', 'name'])).trim()
        const unit = toNumber(pick(r, ['uom', 'unit']))
        const minRaw = pick(r, ['minstock', 'minimumstock'])
        const minStock = minRaw === '' ? 0 : Number(minRaw)
        if (!sku || !name || !Number.isFinite(unit) || unit < 0 || !Number.isFinite(minStock)) {
          bad += 1
          return
        }
        if (seen.has(norm(sku))) {
          dup += 1
          return
        }
        seen.add(norm(sku))
        fresh.push({
          id: uid(),
          sku: sku.toUpperCase(),
          name,
          category: String(pick(r, ['category'])).trim(),
          unit,
          minStock,
          status: 'Active',
        })
      })
      if (fresh.length) set('products', (l) => [...l, ...fresh])
      setNote({ added: fresh.length, dup, bad })
    } catch {
      setNote({ error: 'Could not read this file. Upload a valid .xlsx or .xls file.' })
    }
  }

  return (
    <>
      <button type="button" className="mi-back" onClick={() => go('plugins')}>← Plugins</button>

      <div className="mi-head">
        <div>
          <h2 className="mi-title">Master Product Catalog</h2>
          <p className="mi-sub">Standard inventory directory of supplied products. Work order SKUs map directly against these items.</p>
        </div>
        <div className="mi-btns">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={upload} />
          <button className="mi-ghost" onClick={() => fileRef.current.click()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={UPLOAD} />
            </svg>
            Upload Excel
          </button>
          <button className="mi-add" onClick={() => setOpen(true)}>+ Add Master Product</button>
        </div>
      </div>

      {note && (
        <div className={'mi-note' + (note.error ? ' err' : '')}>
          {note.error ? (
            <span>{note.error}</span>
          ) : (
            <div className="mi-note-body">
              <span className="mi-note-title">Excel import complete</span>
              <div className="mi-chips">
                <span className="mi-chip ok"><b>{note.added}</b> added</span>
                <span className="mi-chip warn"><b>{note.dup}</b> duplicates skipped</span>
                <span className="mi-chip bad"><b>{note.bad}</b> invalid rows skipped</span>
              </div>
            </div>
          )}
          <button className="mi-note-x" onClick={() => setNote(null)} aria-label="Close">×</button>
        </div>
      )}

      <div className="mi-stats">
        <div className="mi-stat">
          <div><span>Total master SKUs</span><b>{products.length}</b></div>
          <i className="mi-ico">📦</i>
        </div>
        <div className="mi-stat">
          <div><span>Categories</span><b>{categories.length}</b></div>
          <i className="mi-ico"><Icon d={LAYERS} /></i>
        </div>
        <div className="mi-stat">
          <div><span>Active products</span><b className="g">{activeCount}</b></div>
          <i className="mi-ico g"><Icon d={CHECK} /></i>
        </div>
      </div>

      <div className="mi-tools">
        <input
          className="mi-search"
          type="search"
          placeholder="Search by SKU, product name, category..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="mi-icon" title="Reset filters" onClick={reset}>↻</button>
      </div>

      <p className="mi-count">Showing {list.length} of {products.length} products</p>

      <div className="mi-wrap">
        <table className="mi-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="mi-sort" onClick={() => toggleSort(c.key)}>
                  {c.label}{sort.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td><span className="mi-sku">{p.sku}</span></td>
                <td><b>{p.name}</b></td>
                <td>{p.category || '-'}</td>
                <td>{p.unit ?? '-'}</td>
                <td>{p.minStock ?? 0}</td>
                <td>
                  <span className={'mi-pill ' + (isActive(p) ? 'ok' : 'idle')}>
                    <span className="mi-dot" />
                    {isActive(p) ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="mi-actions">
                  <button className="mi-link" onClick={() => toggle(p.id)}>{isActive(p) ? 'Deactivate' : 'Activate'}</button>
                  <button className="mi-link del" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={COLS.length + 1} className="mi-empty">
                  {filtered ? 'No product matches your search or filters.' : 'No master products registered in catalog.'}
                  {filtered && <button className="mi-link" onClick={reset}>Clear filters</button>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <AddProductModal onAdd={add} onClose={() => setOpen(false)} />}
    </>
  )
}