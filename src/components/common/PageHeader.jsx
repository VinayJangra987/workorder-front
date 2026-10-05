import '../../CssComponents/MasterInventory.css'

export default function PageHeader({ title, badge, subtitle, action }) {
  return (
    <div className="master-header-banner">
      <div className="master-header-info">
        <div className="master-title-row"><h2 className="master-title">{title}</h2>{badge && <span className="phase-badge">{badge}</span>}</div>
        <p className="master-subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}