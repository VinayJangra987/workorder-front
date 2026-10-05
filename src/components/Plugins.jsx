import '../CssComponents/DashboardGrid.css'

const icon = {
  clients: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.6 3 6" /></>,
  products: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />,
  orders: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 10h6M9 14h6" /></>,
  import: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
}

export default function Plugins({ db, go }) {
  const tiles = [
    ['clients', 'Clients', `${db.clients.length} on record`, 'Add, search and deactivate the companies you supply.', '#2446ff'],
    ['products', 'Master Products', `${db.products.length} SKUs`, 'One catalog of SKUs, names and units.', '#7c3aed'],
    ['orders', 'Work Orders', `${db.orders.length} orders`, 'Create orders and manage their inventory.', '#0e9f9a'],
    ['import', 'Challan Import', `${db.challans.length} confirmed`, 'Upload Excel, review every row, then confirm.', '#e08a00'],
  ]
  return (<>
    <h2>Plugins</h2>
    <p className="sub">The modules available in this workspace.</p>
    <section className="tiles">{tiles.map(([k, t, m, d, c]) => (
      <button key={k} className="tile" style={{ '--c': c }} onClick={() => go(k)}>
        <span className="chip"><svg viewBox="0 0 24 24">{icon[k]}</svg></span><h3>{t}</h3><b>{m}</b><p>{d}</p>
      </button>))}</section>
  </>)
}
