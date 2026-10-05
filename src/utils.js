export const uid = () => Math.random().toString(36).slice(2, 9)
export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
export const str = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '').trim())
export const tone = { 'Not dispatched': 'idle', Partial: 'warn', Complete: 'ok', Exceeded: 'bad' }
export const status = (d, o) => (d === 0 ? 'Not dispatched' : d < o ? 'Partial' : d === o ? 'Complete' : 'Exceeded')

export const seed = {
  clients: [{ id: 'c1', code: 'ACME', name: 'Acme Fabricators', active: true }],
  products: [
    { id: 'p1', sku: 'M-BOLT-10', name: 'Steel Bolt M10', unit: 'pcs' },
    { id: 'p2', sku: 'M-WASH-01', name: 'Steel Washer', unit: 'pcs' },
  ],
  orders: [{ id: 'w1', no: 'WO-2026-001', clientId: 'c1', title: 'Plant A fasteners', status: 'Open' }],
  items: [
    { id: 'i1', woId: 'w1', name: 'Steel Bolt M10', sku: 'BOLT-10', unit: 'pcs', qty: 500, pid: 'p1' },
    { id: 'i2', woId: 'w1', name: 'Steel Washer', sku: 'WASH-01', unit: 'pcs', qty: 300, pid: 'p2' },
  ],
  challans: [{ id: 'h1', woId: 'w1', no: 'CH-001', date: '2026-09-10', lines: [{ itemId: 'i1', qty: 120 }] }],
}
export const sample = [
  { 'Challan No.': 'CH-002', 'Challan Date': '2026-09-12', 'Work Order No.': 'WO-2026-001', 'Item Description': 'Steel Bolt M10', 'Client SKU': 'BOLT-10', Qty: 50, Unit: 'pcs' },
  { 'Challan No.': 'CH-002', 'Challan Date': '2026-09-12', 'Work Order No.': 'WO-2026-001', 'Item Description': 'Steel Washer', 'Client SKU': 'WASH-01', Qty: 80, Unit: 'pcs' },
  { 'Challan No.': 'CH-003', 'Challan Date': '2026-09-14', 'Work Order No.': 'WO-2026-001', 'Item Description': 'Steel Bolt M10', 'Client SKU': 'BOLT-10', Qty: 900, Unit: 'pcs' },
]

