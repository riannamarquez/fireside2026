// iOS-style bottom tab bar: the app's five sections, pinned to the bottom of the 430px column.
import { BookMarked, BookOpen, Mail, Map, Users } from 'lucide-react'
import { NavLink } from 'react-router'

export const TAB_BAR_HEIGHT = 64

const TABS = [
  { to: '/letterbox', label: 'Letters', Icon: Mail },
  { to: '/book', label: 'Book', Icon: BookOpen },
  { to: '/family', label: 'Family', Icon: Users },
  { to: '/life', label: 'Life map', Icon: Map },
  { to: '/chapters', label: 'Review', Icon: BookMarked },
]

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="bg-paper fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[430px] border-t border-hairline pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5" style={{ height: TAB_BAR_HEIGHT }}>
        {TABS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 font-serif text-[12px] ${isActive ? 'text-pine' : 'text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={23} strokeWidth={isActive ? 1.9 : 1.5} aria-hidden="true" />
                  <span className={isActive ? 'font-medium' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
