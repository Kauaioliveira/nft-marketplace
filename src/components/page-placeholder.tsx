import type { ReactNode } from 'react'

/** Temporary body for screens that are routed but not built yet. */
export function PagePlaceholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-12 md:px-[120px]">
      <h1 className="text-2xl font-bold uppercase md:text-[28px]">{title}</h1>
      {children}
    </section>
  )
}
