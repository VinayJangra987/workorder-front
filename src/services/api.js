import { status } from '../utils'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const id = (x) => x?._id ?? x?.id ?? x
const qs = (o = {}) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v)).toString()
  return s ? `?${s}` : ''
}

const call = async (path, { method = 'GET', body } = {}) => {
  const form = body instanceof FormData
  const res = await fetch(BASE + path, {
    method,
    headers: form || !body ? undefined : { 'Content-Type': 'application/json' },
    body: form || !body ? body : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false) throw new Error(json.message || json.error?.message || `Request failed (${res.status})`)
  return json.data ?? json
}
const list = (path, map) => (q) => call(path + qs(q)).then((a) => a.map(map))

const client = (c) => ({ id: id(c), code: c.code, name: c.name, contact: c.contact, phone: c.phone, city: c.city, active: c.isActive ?? true })
const product = (p) => ({ id: id(p), sku: p.sku, name: p.name, category: p.category || 'General', uom: p.uom, minStock: p.minStock ?? 0, description: p.description })
const order = (o) => ({ id: id(o), no: o.workOrderNumber, title: o.title, due: o.dueDate?.slice(0, 10), status: o.status, clientId: id(o.clientId), client: o.clientId?.name ?? o.clientName })
const item = (i) => ({ id: id(i), name: i.itemName, sku: i.clientSku, unit: i.unit, qty: i.orderedQuantity, pid: id(i.masterProductId), masterSku: i.masterProductId?.sku })
const importRow = (r) => ({
  id: id(r), i: r.rowNumber, no: r.parsedData?.challanNumber ?? '-', date: r.parsedData?.challanDate?.slice?.(0, 10) ?? '',
  desc: r.parsedData?.itemDescription ?? '', qty: r.parsedData?.quantity ?? '', err: (r.validationErrors ?? []).map((e) => e.message ?? e), match: r.selectedInventoryItemId?.itemName,
})
const recon = (r) => ({
  cols: (r.challans ?? []).map((c) => ({ id: id(c), no: c.challanNumber })),
  rows: (r.rows ?? []).map((x) => {
    const d = x.dispatched ?? 0
    return { id: x.inventoryItemId ?? id(x), name: x.itemName, sku: x.masterSku, unit: x.unit, qty: x.orderedQuantity, q: x.challanQuantities ?? {}, d, bal: x.orderedQuantity - d, st: status(d, x.orderedQuantity) }
  }),
})

export const api = {
  clients: {
    list: list('/clients', client),
    create: (b) => call('/clients', { method: 'POST', body: { code: b.code, name: b.name, contact: b.contact, phone: b.phone, city: b.city } }),
    setActive: (cid, active) => call(`/clients/${cid}/status`, { method: 'PATCH', body: { isActive: active } }),
  },
  products: {
    list: list('/master-products', product),
    create: (b) => call('/master-products', { method: 'POST', body: b }),
  },
  orders: {
    list: list('/work-orders', order),
    create: (b) => call('/work-orders', { method: 'POST', body: { workOrderNumber: b.no, clientId: b.clientId, title: b.title, dueDate: b.due || undefined } }),
    setStatus: (oid, s) => call(`/work-orders/${oid}/status`, { method: 'PATCH', body: { status: s } }),
  },
  inventory: {
    create: (oid, b) => call(`/work-orders/${oid}/inventory`, { method: 'POST', body: { itemName: b.name, clientSku: b.sku, unit: b.unit, orderedQuantity: Number(b.qty), masterProductId: b.pid || undefined } }),
    remove: (iid) => call(`/inventory/${iid}`, { method: 'DELETE' }),
  },
  reconciliation: { get: (oid) => call(`/work-orders/${oid}/reconciliation`).then(recon) },
  imports: {
    upload: (oid, file) => {
      const f = new FormData()
      f.append('file', file)
      return call(`/work-orders/${oid}/challans/upload`, { method: 'POST', body: f }).then((b) => b.batchId ?? id(b))
    },
    validate: (bid) => call(`/imports/${bid}/validate`, { method: 'POST' }),
    rows: (bid) => call(`/imports/${bid}/rows`).then((a) => a.map(importRow)),
    confirm: (bid) => call(`/imports/${bid}/confirm`, { method: 'POST' }),
  },
  detail: async (oid) => {
    const [o, inv, rec, products] = await Promise.all([
      call(`/work-orders/${oid}`).then(order), call(`/work-orders/${oid}/inventory`).then((a) => a.map(item)), api.reconciliation.get(oid), api.products.list({}),
    ])
    const byId = Object.fromEntries(rec.rows.map((r) => [r.id, r]))
    const rows = inv.map((i) => {
      const d = byId[i.id]?.d ?? 0
      return { ...i, d, bal: i.qty - d, st: status(d, i.qty) }
    })
    return { o, rows, products }
  },
  dashboard: async () => {
    const [clients, products, orders] = await Promise.all([api.clients.list(), api.products.list(), api.orders.list()])
    const recs = await Promise.all(orders.map((o) => api.reconciliation.get(o.id).catch(() => ({ cols: [], rows: [] }))))
    return {
      db: { clients, products, challans: [...new Set(recs.flatMap((r) => r.cols.map((c) => c.id)))] },
      orders: orders.map((o, i) => ({ ...o, rows: recs[i].rows })),
    }
  },
}