import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Guarantees no child-facing screen can ever scroll (and so never rubber-band on iOS),
 * whatever the device height: if a screen's natural layout is taller than the visible
 * area, the whole screen is scaled down to fit instead of overflowing. The per-component
 * clamp()/vh sizing still does the real work on ordinary phones — this is the safety net
 * for the heights no fixed set of clamp() values can anticipate (small iPhones with both
 * Safari toolbars showing, landscape, split view).
 *
 * transform (not CSS `zoom`) so offsetHeight keeps reporting the untransformed layout
 * height — the measurement never depends on the current scale, so there's no feedback
 * loop and no browser-specific zoom semantics to rely on. */
export function FitToViewport({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const fit = () => {
      const scale = Math.min(1, outer.clientHeight / inner.offsetHeight)
      // No transform at all at full size — a transformed ancestor becomes the containing
      // block for position:fixed descendants (the floating next-button, RewardRain), which
      // is harmless when scaled-to-fit but pointless to impose when nothing needs scaling.
      inner.style.transform = scale < 0.999 ? `scale(${scale})` : ''
    }

    fit()
    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(outer)
    resizeObserver.observe(inner)
    // ResizeObserver only reports at the next rendered frame; re-fitting right after React
    // commits a new screen (DOM mutation, delivered as a microtask) means the very first
    // painted frame of a too-tall screen is already scaled, never briefly overflowing.
    const mutationObserver = new MutationObserver(fit)
    mutationObserver.observe(inner, { childList: true, subtree: true, characterData: true })
    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  return (
    <div ref={outerRef} className="fit-viewport">
      <div ref={innerRef} className="fit-viewport-inner">
        {children}
      </div>
    </div>
  )
}
