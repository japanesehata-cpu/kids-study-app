/** Where the last tap/click started, in viewport coordinates — read by App.tsx to open a
 * new screen out of the card that was tapped, and by tapSparkles.ts. */
export let lastPointer: { x: number; y: number } | null = null

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => {
      lastPointer = { x: e.clientX, y: e.clientY }
    },
    { capture: true, passive: true },
  )
}
