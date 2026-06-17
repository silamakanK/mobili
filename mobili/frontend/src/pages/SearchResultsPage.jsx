import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import { searchTrips } from '../services/trips'

const COMPANY_COLORS = [
  'bg-primary text-on-primary',
  'bg-secondary-container text-on-secondary-container',
  'bg-tertiary text-on-tertiary',
  'bg-surface-tint text-on-primary',
]

function TripCard({ trip, onReserve }) {
  const initials = (trip.company?.name || 'XX').slice(0, 2).toUpperCase()
  const colorClass = COMPANY_COLORS[(trip.company?.name?.charCodeAt(0) || 0) % COMPANY_COLORS.length]
  const lowSeats = trip.availableSeats > 0 && trip.availableSeats <= 5
  const full = trip.availableSeats === 0

  return (
    <div className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-5 shadow-card flex flex-col md:flex-row md:items-center gap-4 ${full ? 'opacity-60' : ''}`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-label-lg shrink-0 ${colorClass}`}>
        {initials}
      </div>

      <div className="flex-1">
        <p className="text-label-lg text-on-surface-variant mb-1">{trip.company?.name || 'Compagnie'}</p>
        <div className="flex items-center gap-3">
          <span className="text-headline-sm text-on-surface">{trip.departureTime}</span>
          <div className="flex items-center gap-1 flex-1">
            <div className="h-px flex-1 bg-outline-variant" />
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>directions_bus</span>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>
          <span className="text-headline-sm text-on-surface">{trip.arrivalTime || '—'}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {trip.duration && (
            <span className="text-body-sm text-on-surface-variant">{trip.duration}</span>
          )}
          {lowSeats && (
            <span className="bg-primary-container/20 text-primary text-label-md px-2 py-0.5 rounded-full">
              {trip.availableSeats} place{trip.availableSeats > 1 ? 's' : ''} restante{trip.availableSeats > 1 ? 's' : ''}
            </span>
          )}
          {full && (
            <span className="bg-error-container text-on-error-container text-label-md px-2 py-0.5 rounded-full">
              Complet
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <p className="text-headline-sm text-on-surface">
          {(trip.price || 0).toLocaleString('fr-FR')} FCFA
        </p>
        <button
          onClick={() => onReserve(trip.id)}
          disabled={full}
          className={`px-6 py-2 rounded-lg text-label-lg transition-colors ${
            full
              ? 'bg-surface-variant text-outline cursor-not-allowed'
              : 'bg-secondary text-on-secondary hover:bg-secondary-fixed-dim'
          }`}
        >
          {full ? 'Non disponible' : 'Réserver'}
        </button>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 animate-pulse flex gap-4">
      <div className="w-12 h-12 rounded-lg bg-surface-container shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-container rounded w-1/3" />
        <div className="h-6 bg-surface-container rounded w-1/2" />
        <div className="h-3 bg-surface-container rounded w-1/4" />
      </div>
      <div className="w-28 space-y-2">
        <div className="h-6 bg-surface-container rounded" />
        <div className="h-10 bg-surface-container rounded" />
      </div>
    </div>
  )
}

export default function SearchResultsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const from = params.get('from') || ''
  const to = params.get('to') || ''
  const date = params.get('date') || ''

  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState([])
  const [companyFilter, setCompanyFilter] = useState([])

  useEffect(() => {
    if (!from || !to || !date) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    searchTrips(from, to, date)
      .then((res) => setTrips(res.data?.data || res.data || []))
      .catch(() => setError('Impossible de charger les trajets. Veuillez réessayer.'))
      .finally(() => setLoading(false))
  }, [from, to, date])

  const companies = [...new Set(trips.map((t) => t.company?.name).filter(Boolean))]

  function toggleFilter(list, setList, value) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const filtered = trips.filter((t) => {
    const hour = parseInt(t.departureTime?.split(':')[0] || '0', 10)
    const matchTime =
      timeFilter.length === 0 ||
      (timeFilter.includes('matin') && hour < 12) ||
      (timeFilter.includes('après-midi') && hour >= 12 && hour < 18) ||
      (timeFilter.includes('soir') && hour >= 18)
    const matchCompany =
      companyFilter.length === 0 || companyFilter.includes(t.company?.name)
    return matchTime && matchCompany
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pb-24 md:pb-8">
        <div className="bg-surface-container-low border-b border-outline-variant px-4 py-5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-on-surface-variant text-body-sm mb-1">
              <span>{from}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              <span>{to}</span>
              <span className="mx-2">·</span>
              <span>{date ? new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</span>
            </div>
            <h1 className="text-headline-md text-on-surface">
              {from} → {to}
            </h1>
            {!loading && !error && (
              <p className="text-body-sm text-on-surface-variant mt-1">
                {filtered.length} trajet{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4">
              <p className="text-label-lg text-on-surface mb-3">Heure de départ</p>
              {['matin', 'après-midi', 'soir'].map((slot) => (
                <label key={slot} className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timeFilter.includes(slot)}
                    onChange={() => toggleFilter(timeFilter, setTimeFilter, slot)}
                    className="accent-primary"
                  />
                  <span className="text-body-sm text-on-surface capitalize">{slot}</span>
                </label>
              ))}

              {companies.length > 0 && (
                <>
                  <p className="text-label-lg text-on-surface mb-3 mt-5">Compagnie</p>
                  {companies.map((c) => (
                    <label key={c} className="flex items-center gap-2 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={companyFilter.includes(c)}
                        onChange={() => toggleFilter(companyFilter, setCompanyFilter, c)}
                        className="accent-primary"
                      />
                      <span className="text-body-sm text-on-surface">{c}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            {loading && [1, 2, 3].map((i) => <SkeletonCard key={i} />)}

            {!loading && error && (
              <div className="bg-error-container text-on-error-container rounded-xl p-5 flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                <p className="text-body-md">{error}</p>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '48px' }}>directions_bus</span>
                <p className="text-headline-sm text-on-surface mt-4 mb-2">Aucun trajet disponible</p>
                <p className="text-body-md text-on-surface-variant">
                  Essayez une autre date ou un autre itinéraire.
                </p>
              </div>
            )}

            {!loading && !error && filtered.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onReserve={(id) => navigate(`/seats?tripId=${id}`)}
              />
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
