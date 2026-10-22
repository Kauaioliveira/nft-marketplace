import { createFileRoute, Outlet } from '@tanstack/react-router'

/** Pathless layout that will hold the session guard for every private screen. */
export const Route = createFileRoute('/_authenticated')({
  component: Outlet,
})
