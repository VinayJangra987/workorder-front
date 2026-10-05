import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { uid, norm, str, sample } from '../utils'
import '../CssComponents/WorkOrders.css'
import '../CssComponents/ChallanImport.css'

const UPLOAD = 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12'

const COLUMNS = ['Challan No.', 'Challan Date', 'Work Order No.', 'Item Description', 'Client SKU', 'Qty', 'Unit']

export default function ChallanImport({ db, set, go, view }) {
  const [rows, setRows] = useState(null)
  const [msg, setMsg] = useState(null)
  const [fileName, setFileName] = useState('')
  const [onlyErr, setOnlyErr] = useState(false)
  const fileRef = useRef(null)

  const check = (raw) => {
    const out = raw.map((r, i) => {
      const n = {}
      Object.keys(r).forEach((k) => (n[norm(k)] = r[k]))
      const wo = db.orders.find((o) => norm(o.no) === norm(n.workorderno))
      const no = str(n.challanno)
      const qty = Number(n.qty)
      const item = wo && db.items.find((x) => x.woId === wo.id && ((str(n.clientsku) && norm(x.sku) === norm(n.clientsku)) || norm(x.name) === norm(n.itemdescription)))
      const err = []
      if (!wo) err.push('Unknown work order')
      if (!no) err.push('Missing challan no.')
      if (!(qty > 0)) err.push('Invalid quantity')
      if (wo && !item) err.push('No matching item in this work order')
      if (item && str(n.unit) && norm(String(n.unit)) !== norm(String(item.unit))) err.push('Unit mismatch')
      if (wo && db.challans.some((c) => c.woId === wo.id && norm(c.no) === norm(no))) err.push('Challan already confirmed')
      return { i, wo, no, date: str(n.challandate), qty, item, desc: str(n.itemdescription), err }
    })
    const dates = {}
    const run = {}
    out.forEach((r) => {
      if (r.wo) {
        const k = r.wo.id + norm(r.no)
        dates[k] = dates[k] || new Set()
        dates[k].add(r.date)
      }
    })
    out.forEach((r) => {
      if (!r.wo) return
      if (dates[r.wo.id + norm(r.no)].size > 1) r.err.push('Dates differ within this challan')
      if (r.item && r.qty > 0) {
        run[r.item.id] = (run[r.item.id] ?? db.challans.reduce((s, c) => s + c.lines.filter((l) => l.itemId === r.item.id).reduce((a, l) => a + l.qty, 0), 0)) + r.qty
        if (run[r.item.id] > r.item.qty) r.err.push(`Exceeds ordered qty (${r.item.qty})`)
      }
    })
    setRows(out)
    setMsg(null)
    setOnlyErr(false)
  }

  const loadSample = () => {
    setFileName('Sample rows')
    check(sample)
  }

  const upload = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setMsg({ type: 'err', text: 'Use an .xlsx, .xls or .csv file.' })
      return
    }
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const keys = data[0] ? Object.keys(data[0]).map((k) => norm(k)) : []
      if (!keys.includes('challanno') || !keys.includes('workorderno')) {
        setMsg({ type: 'err', text: 'This file has no Challan No. and Work Order No. columns. Challan Import needs a challan file, not a work order file.' })
        return
      }
      setFileName(file.name)
      check(data)
    } catch {
      setMsg({ type: 'err', text: 'Could not read this file. Upload a valid .xlsx, .xls or .csv file.' })
    }
  }

  const clear = () => {
    setRows(null)
    setFileName('')
    setOnlyErr(false)
  }

  const bad = rows?.some((r) => r.err.length)

  const confirm = () => {
    const g = {}
    rows.forEach((r) => {
      const k = r.wo.id + '|' + norm(r.no)
      ;(g[k] = g[k] || { id: uid(), woId: r.wo.id, no: r.no, date: r.date, lines: [] }).lines.push({ itemId: r.item.id, qty: r.qty })
    })
    set('challans', (l) => [...l, ...Object.values(g)])
    setMsg({ type: 'ok', text: `${Object.keys(g).length} challans and ${rows.length} lines posted.` })
    clear()
  }

  const total = rows ? rows.length : 0
  const errCount = rows ? rows.filter((r) => r.err.length).length : 0
  const groups = rows ? [...new Set(rows.map((r) => r.no))] : []

  const back = view?.woId
    ? { label: '← Work order', to: () => go('detail', view.woId) }
    : { label: '← Plugins', to: () => go('plugins') }

  return (
    <>
      <button type="button" className="wo-back" onClick={back.to}>{back.label}</button>

      <div className="wo-head">
        <div>
          <h2 className="wo-title">Challan Import</h2>
          <p className="wo-sub">Upload an Excel file of dispatch challans. Every row is checked against your work orders before anything is posted.</p>
        </div>
        <div className="wo-btns">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={upload} />
          <button className="wo-ghost" onClick={loadSample}>Load sample rows</button>
          <button className="wo-add" onClick={() => fileRef.current.click()}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={UPLOAD} />
            </svg>
            Upload Excel
          </button>
        </div>
      </div>

      <div className="ci-cols">
        <span className="ci-cols-label">Required columns</span>
        {COLUMNS.map((c) => <span key={c} className="ci-col">{c}</span>)}
      </div>

      {msg && (
        <div className={'wo-note' + (msg.type === 'err' ? ' err' : '')}>
          <span className={msg.type === 'ok' ? 'wo-note-title' : ''}>{msg.text}</span>
          <button className="wo-note-x" onClick={() => setMsg(null)} aria-label="Close">×</button>
        </div>
      )}

      {!rows && !msg && (
        <div className="ci-empty">
          <b>No file uploaded yet</b>
          <span>Upload an Excel file or load the sample rows to preview the checks.</span>
        </div>
      )}

      {rows && (
        <>
          <div className="wo-stats">
            <div className="wo-stat"><span>Rows in file</span><b>{total}</b></div>
            <div className="wo-stat"><span>Challans</span><b>{groups.length}</b></div>
            <div className="wo-stat"><span>Rows matched</span><b className="g">{total - errCount}</b></div>
            <div className="wo-stat"><span>Rows with errors</span><b className={errCount ? 'r' : 'm'}>{errCount}</b></div>
          </div>

          <div className="ci-bar">
            <span className="wo-count">File: <b>{fileName || 'Uploaded file'}</b></span>
            <div className="wo-btns">
              {errCount > 0 && (
                <button className="wo-ghost" onClick={() => setOnlyErr((v) => !v)}>
                  {onlyErr ? 'Show all rows' : 'Show errors only'}
                </button>
              )}
              <button className="wo-ghost" onClick={clear}>Clear</button>
            </div>
          </div>

          {groups.map((no) => {
            const all = rows.filter((r) => r.no === no)
            const shown = onlyErr ? all.filter((r) => r.err.length) : all
            if (!shown.length) return null
            const errs = all.filter((r) => r.err.length).length
            return (
              <div key={no || 'blank'} className="ci-card">
                <div className="ci-card-head">
                  <div>
                    <strong>{no || 'No challan number'}</strong>
                    <span className="ci-date">{all[0].date || 'No date'}</span>
                  </div>
                  <div className="ci-card-meta">
                    <span className="ci-lines">{all.length} lines</span>
                    <span className={'wo-pill ' + (errs ? 'bad' : 'ok')}>{errs ? `${errs} with errors` : 'Ready'}</span>
                  </div>
                </div>
                <div className="wo-wrap ci-inner">
                  <table className="wo-table ci-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Work Order</th>
                        <th>Item</th>
                        <th className="n">Qty</th>
                        <th>Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => (
                        <tr key={r.i}>
                          <td>{r.i + 2}</td>
                          <td>{r.wo ? <span className="wo-code">{r.wo.no}</span> : '-'}</td>
                          <td><b>{r.desc || '-'}</b></td>
                          <td className="n">{r.qty}</td>
                          <td>
                            {r.err.length ? (
                              <div className="ci-errs">
                                {r.err.map((m) => <span key={m} className="wo-pill bad">{m}</span>)}
                              </div>
                            ) : (
                              <span className="wo-pill ok">Matched {r.item.name}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          <div className="ci-confirm">
            <button className="wo-add" disabled={bad} onClick={confirm}>Confirm import</button>
            {bad && <span className="ci-hint">Fix the errors in the file and upload it again. Nothing is posted until every row passes.</span>}
          </div>
        </>
      )}
    </>
  )
}