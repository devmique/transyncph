"use client"
import { usePathname } from 'next/navigation'
import CursorGridReveal from '@/components/CursorGridReveal'

export default function FixedBackground() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const isMap = pathname?.startsWith('/map')
  const isPasswordPage =
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  if (isDashboard || isMap || isPasswordPage) {
    return <div className="fixed inset-0 -z-10 bg-slate-950 pointer-events-none" />
  }

  // Marketing pages: a soft directional wash as the base layer. On the landing
  // page the old grid sits on top of it, revealed only around the cursor.
  // The wash is also the fallback that reveal degrades to under reduced motion
  // and on touch, so it stays regardless.
  return (
    <div className="fixed inset-0 -z-10 bg-slate-950 pointer-events-none overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.03) 22%, transparent 55%)',
        }}
      />
      {pathname === '/' && <CursorGridReveal />}
    </div>
  )
}
