import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { isAuthenticated, user } = useAuth()

  return (
    <nav className="sticky top-0 z-50 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center px-container-padding-desktop">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-4">
        <Link to="/" className="text-primary font-bold text-headline-sm">
          Mobili
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link
            to="/search"
            className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Rechercher
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-body-md text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Mes Réservations
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg text-label-lg hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
                {user?.firstName || 'Mon compte'}
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-label-lg hover:bg-primary-container transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
