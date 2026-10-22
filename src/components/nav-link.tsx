import { useRouter } from '@tanstack/react-router'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'

type NavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  active: boolean
}

/**
 * Menu link whose active state comes from the current section (see lib/nav-section.ts).
 * The router Link marks itself active by URL match, which would light up both "Início" and
 * "Mercado" on the home page, since both point to "/".
 */
export function NavLink({ href, active, onClick, ...props }: NavLinkProps) {
  const router = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    // Let the browser handle new tabs and other modified clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }
    event.preventDefault()
    void router.navigate({ href })
  }

  return (
    <a
      {...props}
      href={href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      data-active={active || undefined}
    />
  )
}
