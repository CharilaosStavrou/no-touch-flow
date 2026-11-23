import { useCallback, useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Smoothly animates a number towards `target` (eased). Instant when reduced motion is set. */
export function useTween(target: number, durationMs = 650): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)

  useEffect(() => {
    const duration = prefersReducedMotion() ? 0 : durationMs
    const from = valueRef.current
    if (from === target) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = duration === 0 ? 1 : Math.min(1, (now - start) / duration)
      const eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
      valueRef.current = from + (target - from) * eased
      setValue(valueRef.current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}

export interface PanZoom {
  k: number
  x: number
  y: number
}

const MIN_K = 0.4
const MAX_K = 4
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k))

/**
 * Pan and zoom for an SVG. Transform is applied in SVG user units on an inner <g>.
 * Wheel zooms around the pointer, dragging the background pans, keyboard is handled by the caller.
 */
export function usePanZoom(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [pz, setPz] = useState<PanZoom>({ k: 1, x: 0, y: 0 })
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number } | null>(null)

  const toSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (!svg || !ctm) return { x: 0, y: 0 }
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    },
    [svgRef],
  )

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setPz((s) => {
      const k = clampK(s.k * factor)
      const f = k / s.k
      return { k, x: cx - (cx - s.x) * f, y: cy - (cy - s.y) * f }
    })
  }, [])

  const zoomCenter = useCallback(
    (factor: number) => {
      const vb = svgRef.current?.viewBox.baseVal
      if (!vb) return
      zoomAt(factor, vb.x + vb.width / 2, vb.y + vb.height / 2)
    },
    [svgRef, zoomAt],
  )

  const panBy = useCallback((dx: number, dy: number) => setPz((s) => ({ ...s, x: s.x + dx, y: s.y + dy })), [])
  const reset = useCallback(() => setPz({ k: 1, x: 0, y: 0 }), [])

  // non-passive wheel listener so the page does not scroll while zooming
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const p = toSvg(e.clientX, e.clientY)
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [svgRef, toSvg, zoomAt])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    if ((e.target as Element).closest('[data-interactive]')) return
    const p = toSvg(e.clientX, e.clientY)
    drag.current = { id: e.pointerId, sx: p.x, sy: p.y, ox: pz.x, oy: pz.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = toSvg(e.clientX, e.clientY)
    setPz((s) => ({ ...s, x: d.ox + (p.x - d.sx), y: d.oy + (p.y - d.sy) }))
  }
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  return {
    pz,
    zoomCenter,
    panBy,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  }
}
