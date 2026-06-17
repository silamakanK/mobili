import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGlobalStats } from '../services/stats'
import { getMyReservations } from '../services/reservations'

const ADMIN_ROLES = ['ADMIN_COMPANY', 'SUPER_ADMIN']

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Payé', className: 'bg-secondary-container text-on-secondary-container' },
  COMPLETED: { label: 'Terminé', className: 'bg-surface-variant text-on-surface-variant' },
  CANCELLED: { label: 'Annulé', className: 'bg-error-container/50 text-tertiary' },
  PENDING: { label: 'En attente', className: 'bg-surface-container text-on-surface-variant' },
}

export default function AdminPage() {
  const { isAuthenticated, user } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([
      getGlobalStats().catch(() => ({ data: null })),
      getMyReservations().catch(() => ({ data: [] })),
    ]).then(([statsRes, resRes]) => {
      setStats(statsRes.data?.data || statsRes.data)
      setReservations(resRes.data?.data || resRes.data || [])
    }).finally(() => setLoading(false))
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!ADMIN_ROLES.includes(user?.role)) return <Navigate to="/" replace />

  const navLinks = [
    { key: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
    { key: 'buses', icon: 'directions_bus', label: 'Gestion des bus' },
    { key: 'schedules', icon: 'schedule', label: 'Horaires' },
    { key: 'reports', icon: 'bar_chart', label: 'Rapports' },
  ]

  const statCards = [
    {
      icon: 'payments',
      label: 'Ventes du jour',
      value: stats?.dailySales ? `${stats.dailySales.toLocaleString('fr-FR')} FCFA` : '—',
      color: 'text-primary',
    },
    {
      icon: 'confirmation_number',
      label: 'Réservations',
      value: stats?.totalReservations ?? reservations.length,
      color: 'text-secondary',
    },
    {
      icon: 'directions_bus',
      label: 'Trajets actifs',
      value: stats?.activeTrips ?? '—',
      color: 'text-primary',
    },
    {
      icon: 'warning',
      label: 'Alertes',
      value: stats?.alerts ?? 0,
      color: 'text-tertiary',
    },
  ]

  const recent = reservations.slice(0, 10)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-outline-variant z-40 pt-6 pb-6">
        <div className="px-6 mb-8">
          <p className="text-primary font-bold text-headline-sm">Mobili</p>
          <p className="text-body-sm text-on-surface-variant mt-1">Administration</p>
        </div>
        <nav className="flex-1 px-3">
          {navLinks.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-body-md transition-colors text-left ${
                activeSection === key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="px-6">
          <p className="text-label-md text-on-surface-variant">{user?.firstName} {user?.lastName}</p>
          <p className="text-label-md text-on-surface-variant">{user?.role}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center gap-2 px-4 py-3">
        <p className="text-primary font-bold text-headline-sm flex-1">Mobili · Admin</p>
      </div>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant z-40 flex">
        {navLinks.slice(0, 4).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              activeSection === key ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
            <span className="text-label-md">{label}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 px-4 md:px-8 py-8">
        {activeSection === 'dashboard' && (
          <>
            <h1 className="text-headline-md text-on-surface mb-6">Tableau de bord</h1>

            {/* Bento grid stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map(({ icon, label, value, color }) => (
                <div
                  key={label}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5"
                >
                  <span className={`material-symbols-outlined ${color} mb-3 block`} style={{ fontSize: '28px' }}>
                    {icon}
                  </span>
                  {loading ? (
                    <div className="h-8 bg-surface-container rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-headline-sm text-on-surface mb-1">{value}</p>
                  )}
                  <p className="text-body-sm text-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>

            {/* Recent reservations table */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-outline-variant">
                <h2 className="text-headline-sm text-on-surface">Réservations Récentes</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Passager</th>
                      <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Trajet</th>
                      <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Paiement</th>
                      <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        </td>
                      </tr>
                    )}
                    {!loading && recent.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-body-md text-on-surface-variant">
                          Aucune réservation
                        </td>
                      </tr>
                    )}
                    {!loading && recent.map((r) => (
                      <tr key={r.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                        <td className="px-5 py-3 text-body-md text-on-surface">
                          {r.user ? `${r.user.firstName} ${r.user.lastName}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                          {r.trip?.route?.origin || r.trip?.origin || '—'} → {r.trip?.route?.destination || r.trip?.destination || '—'}
                        </td>
                        <td className="px-5 py-3 text-body-md text-on-surface">
                          {(r.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-label-md px-2 py-0.5 rounded-full ${STATUS_CONFIG[r.status]?.className || STATUS_CONFIG.PENDING.className}`}>
                            {STATUS_CONFIG[r.status]?.label || 'En attente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeSection !== 'dashboard' && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <span className="material-symbols-outlined text-outline" style={{ fontSize: '64px' }}>
              {navLinks.find((n) => n.key === activeSection)?.icon}
            </span>
            <p className="text-headline-sm text-on-surface-variant">
              {navLinks.find((n) => n.key === activeSection)?.label}
            </p>
            <p className="text-body-md text-on-surface-variant">Cette section est en cours de développement.</p>
          </div>
        )}
      </main>
    </div>
  )
}
