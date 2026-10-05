import '../CssComponents/Navbar.css'

const I = {
  brand: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 11h6l-2-2M15 16H9l2 2" /></>,
  dash: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  plugins: <path d="M10 4a2 2 0 114 0v2h4v4h-2a2 2 0 100 4h2v4H6v-4h2a2 2 0 100-4H6V6h4z" />,
}
const pluginPages = ['plugins', 'clients', 'products', 'orders', 'detail', 'import']
const Icon = ({ n }) => <svg className="ico" viewBox="0 0 24 24">{I[n]}</svg>

export default function Navbar({ go, page }) {
  const inPlugins = pluginPages.includes(page)
  return (
    <aside className="side">
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); go('dash') }}>
        <span className="brand-ico"><Icon n="brand" /></span>
        <span>{import.meta.env.VITE_APP_NAME}</span>
      </a>
      <div className="divider" />
      <nav className="menu">
        <button className={'item' + (page === 'dash' ? ' on' : '')} onClick={() => go('dash')}><Icon n="dash" />Dashboard</button>
        <button className={'item' + (inPlugins ? ' on' : '')} onClick={() => go('plugins')}><Icon n="plugins" />Plugins</button>
      </nav>
    </aside>
  )
}