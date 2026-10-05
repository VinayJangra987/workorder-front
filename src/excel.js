import * as XLSX from 'xlsx'

const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

export const pick = (row, names) => {
  const k = Object.keys(row).find((x) => names.includes(key(x)))
  return k ? row[k] : ''
}

export const toNumber = (v) => {
  if (v === '' || v === null || v === undefined) return NaN
  return Number(v)
}

export const fmtDate = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  return String(v ?? '').trim()
}

export const readRows = async (file) => {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
}