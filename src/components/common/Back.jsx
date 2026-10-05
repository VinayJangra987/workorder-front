import Button from './Button'
export default function Back({ go }) {
  return <Button variant="back" onClick={() => go('dash')}>← Dashboard</Button>
}
