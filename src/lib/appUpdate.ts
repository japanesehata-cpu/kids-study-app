/* When a new version has been deployed, the service worker takes over in the background and
 * the page has to reload to actually run it (see main.tsx). Reloading mid-quiz dropped the
 * child back on Home and lost that round's answers, so the reload waits until the app is at
 * a safe point — Home (docs/functional-design.md F-15). */

let updateReady = false
let atSafePoint = true // the app starts on Home
let reloaded = false
let reloadPage = () => window.location.reload()

function reloadIfReady(): void {
  if (!updateReady || !atSafePoint || reloaded) return
  reloaded = true
  reloadPage()
}

/** The new version is in control and only needs a reload to run. */
export function markUpdateReady(): void {
  updateReady = true
  reloadIfReady()
}

/** App calls this on every screen change: true on Home. */
export function setAtSafePoint(next: boolean): void {
  atSafePoint = next
  reloadIfReady()
}

/** Test hook. */
export function resetAppUpdateForTest(reload: () => void): void {
  updateReady = false
  atSafePoint = true
  reloaded = false
  reloadPage = reload
}
