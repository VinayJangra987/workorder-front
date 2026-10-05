import '../../CssComponents/Button.css'
const cls = { primary: 'btn', ghost: 'ghost', back: 'back' }
export default function Button({ variant = 'primary', ...props }) {
  return <button className={cls[variant]} {...props} />
}
