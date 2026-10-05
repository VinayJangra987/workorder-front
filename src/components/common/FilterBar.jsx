import { Search, Filter, RefreshCw } from 'lucide-react'
import Button from './Button'

export default function FilterBar({ search, onSearch, placeholder, filter, onReset, children }) {
  return (
    <div className="filter-bar">
      {onSearch ? (
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input className="search-input" placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
        </div>
      ) : <span />}
      <div className="filter-actions">
        {filter && (
          <div className="filter-select"><Filter size={16} />
            <select className="category-select" value={filter.value} onChange={(e) => filter.onChange(e.target.value)}>
              {filter.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        {onReset && <Button variant="secondary" icon={RefreshCw} onClick={onReset} title="Clear filters" />}
        {children}
      </div>
    </div>
  )
}