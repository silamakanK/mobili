import { Link, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/', icon: 'home', label: 'Accueil' },
  { to: '/search', icon: 'search', label: 'Rechercher' },
  { to: '/dashboard', icon: 'confirmation_number', label: 'Mes Voyages' },
  { to: '/dashboard', icon: 'person', label: 'Profil' },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-surface px-2 pb-2 pt-2 md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)] border-t border-outline-variant rounded-t-xl">
      {tabs.map(({ to, icon, label }) => {
        const active = pathname === to || (to === '/search' && pathname.startsWith('/search'))
        return (
          <Link
            key={label}
            to={to}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-colors ${
              active
                ? 'text-primary bg-primary-container/20'
                : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{icon}</span>
            <span className="text-label-md">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
