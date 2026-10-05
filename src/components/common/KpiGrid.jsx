export default function KpiGrid({ items }) {
  return (
    <div className={'kpi-grid' + (items.length === 4 ? ' four' : '')}>
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="kpi-card">
          <div><p className="kpi-label">{label}</p><h3 className="kpi-value" style={tone ? { color: tone } : undefined}>{value}</h3></div>
          <div className="kpi-icon-box"><Icon size={24} /></div>
        </div>
      ))}
    </div>
  )
}