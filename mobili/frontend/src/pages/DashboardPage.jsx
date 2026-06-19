import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { getMyReservations } from '../services/reservations'

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Payé', className: 'bg-secondary-container text-on-secondary-container' },
  COMPLETED: { label: 'Terminé', className: 'bg-surface-variant text-on-surface-variant' },
  CANCELLED: { label: 'Annulé', className: 'bg-error-container/50 text-tertiary' },
  PENDING: { label: 'En attente', className: 'bg-surface-container text-on-surface-variant' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  return (
    <span className={`text-label-md px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function ReservationRow({ reservation }) {
  const trip = reservation.trip
  const origin = trip?.route?.origin || trip?.origin || '—'
  const destination = trip?.route?.destination || trip?.destination || '—'

  return (
    <div className="flex items-center gap-4 py-3 border-b border-outline-variant last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-body-md text-on-surface font-medium truncate">
          {origin} → {destination}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {trip?.departureDate ? new Date(trip.departureDate).toLocaleDateString('fr-FR') : '—'}
          {trip?.departureTime ? ` · ${trip.departureTime}` : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-body-md text-on-surface mb-1">
          {(reservation.totalAmount || 0).toLocaleString('fr-FR')} FCFA
        </p>
        <StatusBadge status={reservation.status} />
      </div>
      {reservation.ticket?.id && (
        <Link
          to={`/ticket/${reservation.ticket.id}`}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>receipt</span>
        </Link>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { isAuthenticated, user, logout } = useAuth()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return
    getMyReservations()
      .then((res) => setReservations(res.data?.data || res.data || []))
      .catch(() => setError('Impossible de charger vos réservations.'))
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const upcoming = reservations.find((r) => r.status === 'CONFIRMED')
  const history = reservations.filter((r) => r.status !== 'CONFIRMED')

  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  const thisMonthCount = reservations.filter((r) => {
    if (!r.createdAt) return false
    const d = new Date(r.createdAt)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Profile card — col 4 */}
          <aside className="md:col-span-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-card">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center text-headline-md font-bold mb-3">
                  {initials}
                </div>
                <p className="text-headline-sm text-on-surface">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-body-sm text-on-surface-variant">{user?.email}</p>
              </div>

              <div className="bg-surface-container rounded-xl p-4 mb-5 text-center">
                <p className="text-headline-md text-on-surface font-bold">{thisMonthCount}</p>
                <p className="text-body-sm text-on-surface-variant">trajet{thisMonthCount !== 1 ? 's' : ''} ce mois</p>
              </div>

              <div className="space-y-2">
                <Link
                  to="/search"
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-secondary-container text-on-secondary-container text-label-lg font-medium hover:bg-secondary-fixed-dim transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>
                  Nouveau trajet
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-outline-variant text-on-surface-variant text-label-lg hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                  Se déconnecter
                </button>
              </div>
            </div>
          </aside>

          {/* Main content — col 8 */}
          <div className="md:col-span-8 space-y-6">
            {loading && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 animate-pulse space-y-4">
                <div className="h-6 bg-surface-container rounded w-1/3" />
                <div className="h-20 bg-surface-container rounded" />
              </div>
            )}

            {!loading && error && (
              <div className="bg-error-container text-on-error-container rounded-xl p-5 flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                <p className="text-body-md">{error}</p>
              </div>
            )}

            {/* Upcoming trip */}
            {!loading && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-card">
                <h2 className="text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>flight_takeoff</span>
                  Voyage à venir
                </h2>
                {upcoming ? (
                  <div className="bg-primary-fixed/20 border border-primary-fixed rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg">
                        {(upcoming.trip?.company?.name || 'XX').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-body-md font-medium text-on-surface">
                          {upcoming.trip?.route?.origin || upcoming.trip?.origin} → {upcoming.trip?.route?.destination || upcoming.trip?.destination}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">
                          {upcoming.trip?.departureDate
                            ? new Date(upcoming.trip.departureDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                            : '—'}
                          {upcoming.trip?.departureTime ? ` · ${upcoming.trip.departureTime}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-body-md text-on-surface">
                        {(upcoming.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                      </span>
                      {upcoming.ticket?.id && (
                        <Link
                          to={`/ticket/${upcoming.ticket.id}`}
                          className="flex items-center gap-1 text-primary text-label-lg font-medium hover:underline"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt</span>
                          Voir le billet
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '40px' }}>directions_bus</span>
                    <p className="text-body-md text-on-surface-variant mt-2">Aucun voyage confirmé</p>
                    <Link
                      to="/search"
                      className="inline-block mt-4 bg-secondary-container text-on-secondary-container px-5 py-2 rounded-lg text-label-lg hover:bg-secondary-fixed-dim transition-colors"
                    >
                      Rechercher un trajet
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* History */}
            {!loading && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-card">
                <h2 className="text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '22px' }}>history</span>
                  Historique
                </h2>
                {history.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant text-center py-6">
                    Aucune réservation terminée pour l&apos;instant.
                  </p>
                ) : (
                  <div>
                    {history.map((r) => (
                      <ReservationRow key={r.id} reservation={r} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
