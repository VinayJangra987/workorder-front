import { useEffect, useState } from 'react'

export default function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    loader()
      .then((data) => live && setState({ data, loading: false, error: '' }))
      .catch((e) => live && setState({ data: null, loading: false, error: e.message }))
    return () => { live = false }
  }, [...deps, tick])
  return { ...state, reload: () => setTick((t) => t + 1) }
}