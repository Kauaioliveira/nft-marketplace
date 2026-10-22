import type { KeyboardEvent } from 'react'

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab and Shift+Tab cycling inside a modal surface. The focus guards of the dialog
 * primitive let focus escape to the page in our tests, so the popups handle the edges themselves.
 */
export function trapTabKey(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const container = event.currentTarget
  const items = [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  )
  if (items.length === 0) {
    event.preventDefault()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === container)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
