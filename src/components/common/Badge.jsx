const cls = { ok: 'completed', warn: 'pending', bad: 'over', idle: 'idle' }

export default function Badge({ tone = 'idle', children }) {
  return <span className={`badge-status badge-status-${cls[tone]}`}><span className="status-dot" />{children}</span>
}