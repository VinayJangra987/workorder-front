import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import DashboardGrid from './components/DashboardGrid'
import Plugins from './components/Plugins'
import Clients from './components/Clients'
import MasterInventory from './components/MasterInventory'
import WorkOrders from './components/WorkOrders'
import WorkOrderDetail from './components/WorkOrderDetail'
import ChallanImport from './components/ChallanImport'
import Reconciliation from './components/Reconciliation'
import { seed, status } from './utils'
import './App.css'

const pages = { dash: DashboardGrid, plugins: Plugins, clients: Clients, products: MasterInventory, orders: WorkOrders, detail: WorkOrderDetail, import: ChallanImport, recon: Reconciliation }

const DB_KEY = 'workorder-db-v1'
const VIEW_KEY = 'workorder-view-v1'

const read = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const loadDb = () => {
  const base = typeof seed === 'function' ? seed() : seed
  const saved = read(DB_KEY)
  return saved ? { ...base, ...saved } : base
}

const loadView = () => {
  const saved = read(VIEW_KEY)
  return saved && pages[saved.page] ? saved : { page: 'dash' }
}

export default function App() {
  const [db, setDb] = useState(loadDb)
  const [view, setView] = useState(loadView)

  useEffect(() => {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { return }
  }, [db])

  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)) } catch { return }
  }, [view])

  const go = (page, woId) => setView({ page, woId })
  const set = (k, fn) => setDb((d) => ({ ...d, [k]: fn(d[k]) }))
  const dispatched = (id) => db.challans.reduce((s, c) => s + c.lines.filter((l) => l.itemId === id).reduce((a, l) => a + l.qty, 0), 0)
  const rowsFor = (woId) => db.items.filter((i) => i.woId === woId).map((i) => {
    const d = dispatched(i.id)
    return { ...i, d, bal: i.qty - d, st: status(d, i.qty) }
  })
  const Page = pages[view.page]
  return (<>
    <div className="shell">
    <Navbar go={go} page={view.page} />
    <main className="wrap"><Page db={db} set={set} go={go} view={view} dispatched={dispatched} rowsFor={rowsFor} /></main>
    </div>
  </>)
}