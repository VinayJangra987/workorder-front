import { tone } from '../utils'
import '../CssComponents/DashboardGrid.css'

const icon = {
  clients: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.6 3 6" /></>,
  products: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  orders: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></>,
  import: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  recon: <path d="M4 7h13l-3-3M20 17H7l3 3" />,
}

export default function DashboardGrid({ db, go, rowsFor }) {
  const orders = db.orders.map((o) => ({ ...o, rows: rowsFor(o.id) }))
  const all = orders.flatMap((o) => o.rows.map((r) => ({ ...r, wo: o.no })))
  const ordered = all.reduce((s, r) => s + r.qty, 0)
  const sent = all.reduce((s, r) => s + r.d, 0)
  const exc = all.filter((r) => r.st === 'Exceeded').length
  const attention = all.filter((r) => r.st !== 'Complete').sort((a, b) => Math.abs(b.bal) - Math.abs(a.bal)).slice(0, 5)
  const kpis = [['Work orders', orders.length, '#2446ff'], ['Units ordered', ordered, '#0a1226'], ['Units dispatched', sent, '#12a36b'], ['Over-dispatched items', exc, exc ? '#e5484d' : '#62708f']]
  const tiles = [
    ['clients', 'Clients', `${db.clients.length} on record`, 'Add, search and deactivate the companies you supply.', '#2446ff'],
    ['products', 'Master Products', `${db.products.length} SKUs`, 'One catalog of SKUs, names and units.', '#7c3aed'],
    ['orders', 'Work Orders', `${orders.length} orders`, 'Create orders and manage their inventory.', '#0e9f9a'],
    ['import', 'Challan Import', `${db.challans.length} confirmed`, 'Upload Excel, review every row, then confirm.', '#e08a00'],
    ['recon', 'Reconciliation', `${exc} exceptions`, 'Ordered vs dispatched, column per challan.', '#e5484d'],
  ]
  return (<>
    <h2>Dashboard</h2>
    <section className="kpis">{kpis.map(([t, v, c]) => <div key={t} className="kpi" style={{ '--c': c }}><b>{v}</b><span>{t}</span></div>)}</section>

    <section className="duo">
      <div className="panel"><h3>Work order progress</h3>
        {orders.map((o) => {
          const q = o.rows.reduce((s, r) => s + r.qty, 0), d = o.rows.reduce((s, r) => s + Math.min(r.d, r.qty), 0)
          const p = q ? Math.round((d / q) * 100) : 0
          return <button key={o.id} className="prog" onClick={() => go('detail', o.id)}>
            <span><b>{o.no}</b><small>{o.title}</small></span><span className="meter"><i style={{ width: p + '%' }} /></span><em>{p}%</em></button>
        })}
      </div>
      <div className="panel"><h3>Needs attention</h3>
        {attention.length === 0 && <p className="empty">Every item is fully dispatched.</p>}
        {attention.map((r) => <div key={r.id} className="att"><span><b>{r.name}</b><small>{r.wo}</small></span>
          <span className={'pill ' + tone[r.st]}>{r.st}</span><em className={r.bal < 0 ? 'red' : ''}>{r.bal < 0 ? '+' + -r.bal : r.bal} {r.unit}</em></div>)}
      </div>
    </section>

    <section className="tiles">{tiles.map(([k, t, m, d, c]) => (
      <button key={k} className="tile" style={{ '--c': c }} onClick={() => go(k)}>
        <span className="chip"><svg viewBox="0 0 24 24">{icon[k]}</svg></span><h3>{t}</h3><b>{m}</b><p>{d}</p>
      </button>))}</section>
  </>)
}
