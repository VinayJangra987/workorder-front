// 



import React from 'react';
import { Package, Loader2 } from 'lucide-react';
import '../../CssComponents/DataTable.css';

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  rowClassName,
  className = ''
}) {
  return (
    <div className={`table-container ${className}`}>
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    textAlign: col.align || 'left',
                    minWidth: col.minWidth || 'auto',
                    width: col.width || 'auto'
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length || 1} className="table-empty-state">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-xs">Loading data...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="table-empty-state">
                  <Package className="table-empty-icon" />
                  <p className="font-semibold text-slate-700">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const customRowClass = typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : rowClassName || '';
                return (
                  <tr
                    key={row._id || row.id || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={col.key || colIdx}
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
