import { useState } from 'react'
import { tone } from '../utils'
import Field from './common/Field'
import Back from './common/Back'
import DataTable from './common/DataTable'
import '../CssComponents/Screens.css'

export default function Reconciliation({ db, go, view, rowsFor }) {
  const [id, setId] = useState(view.woId || db.orders[0]?.id)
  const cols = db.challans.filter((c) => c.woId === id)
  const rows = rowsFor(id)
  const q = (r, c) => c.lines.filter((l) => l.itemId === r.id).reduce((a, l) => a + l.qty, 0)
  const exportCsv = () => {
    const head = ['Master SKU', 'Item', 'Unit', 'Ordered', ...cols.map((c) => c.no), 'Dispatched', 'Balance', 'Status']
    const body = rows.map((r) => [db.products.find((p) => p.id === r.pid)?.sku ?? 'Not mapped', r.name, r.unit, r.qty, ...cols.map((c) => q(r, c)), r.d, r.bal, r.st])
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head, ...body].map((l) => l.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = 'reconciliation.csv'; a.click()
  }
  return (<><Back go={go} /><h2>Reconciliation</h2>
    <div className="bar"><Field label="Work order"><select value={id} onChange={(e) => setId(e.target.value)}>{db.orders.map((o) => <option key={o.id} value={o.id}>{o.no}</option>)}</select></Field>
      <button className="btn" onClick={exportCsv}>Export CSV</button></div>
    <DataTable><thead><tr><th>Master SKU</th><th>Item</th><th>Unit</th><th className="n">Ordered</th>
      {cols.map((c) => <th key={c.id} className="n ch">{c.no}</th>)}<th className="n">Dispatched</th><th className="n">Balance</th><th>Fulfilment</th><th>Status</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td>{db.products.find((p) => p.id === r.pid)?.sku ?? 'Not mapped'}</td><td><b>{r.name}</b></td><td>{r.unit}</td><td className="n">{r.qty}</td>
        {cols.map((c) => <td key={c.id} className="n">{q(r, c) || '–'}</td>)}<td className="n">{r.d}</td><td className={'n strong ' + (r.bal < 0 ? 'red' : '')}>{r.bal}</td><td><span className="meter wide"><i style={{ width: Math.min(100, Math.round((r.d / r.qty) * 100)) + '%' }} /></span></td><td><span className={'pill ' + tone[r.st]}>{r.st}</span></td></tr>)}
    </tbody></DataTable></>)
}
