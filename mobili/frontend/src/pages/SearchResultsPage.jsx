import PropTypes from 'prop-types'
import { useState, useEffect, useCallback } from 'react'
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
          {trip.departureDate && (
            <span className="text-body-sm text-on-surface-variant">
              {new Date(trip.departureDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          )}
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

TripCard.propTypes = {
  trip: PropTypes.shape({
    id: PropTypes.string.isRequired,
    company: PropTypes.shape({ name: PropTypes.string }),
    departureTime: PropTypes.string,
    arrivalTime: PropTypes.string,
    departureDate: PropTypes.string,
    duration: PropTypes.string,
    availableSeats: PropTypes.number,
    price: PropTypes.number,
  }).isRequired,
  onReserve: PropTypes.func.isRequired,
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

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-label-md border transition-colors ${
        active
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:border-outline'
      }`}
    >
      {label}
    </button>
  )
}

FilterChip.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
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
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Filtres
  const [timeFilter, setTimeFilter] = useState([])
  const [companyFilter, setCompanyFilter] = useState([])
  const [dateFilter, setDateFilter] = useState(date)
  const [sortPrice, setSortPrice] = useState('') // '' | 'asc' | 'desc'

  useEffect(() => {
    if (!from || !to) { setLoading(false); return }
    setLoading(true)
    setError(null)
    searchTrips(from, to, date)
      .then((res) => setTrips(res.data?.data || res.data || []))
      .catch(() => setError('Impossible de charger les trajets. Veuillez réessayer.'))
      .finally(() => setLoading(false))
  }, [from, to, date])

  const companies = [...new Set(trips.map((t) => t.company?.name).filter(Boolean))]

  const toggleList = useCallback((list, setList, value) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }, [])

  const clearFilters = useCallback(() => {
    setTimeFilter([])
    setCompanyFilter([])
    setDateFilter(date)
    setSortPrice('')
  }, [date])

  const hasActiveFilters = timeFilter.length > 0 || companyFilter.length > 0 || dateFilter !== date || sortPrice !== ''

  let filtered = trips.filter((t) => {
    const hour = parseInt(t.departureTime?.split(':')[0] || '0', 10)
    const matchTime =
      timeFilter.length === 0 ||
      (timeFilter.includes('matin') && hour < 12) ||
      (timeFilter.includes('après-midi') && hour >= 12 && hour < 18) ||
      (timeFilter.includes('soir') && hour >= 18)
    const matchCompany =
      companyFilter.length === 0 || companyFilter.includes(t.company?.name)
    const matchDate = !dateFilter || (
      t.departureDate &&
      new Date(t.departureDate).toISOString().startsWith(dateFilter)
    )
    return matchTime && matchCompany && matchDate
  })

  if (sortPrice === 'asc') filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0))
  if (sortPrice === 'desc') filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0))

  const FilterPanel = (
    <div className="space-y-5">
      {/* Date */}
      <div>
        <p className="text-label-lg text-on-surface mb-2">Date</p>
        <input
          type="date"
          value={dateFilter}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface bg-surface-container focus:outline-none focus:border-primary"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-body-sm text-primary mt-1 hover:underline"
          >
            Toutes les dates
          </button>
        )}
      </div>

      {/* Heure de départ */}
      <div>
        <p className="text-label-lg text-on-surface mb-2">Heure de départ</p>
        {[
          { id: 'matin', label: 'Matin (avant 12h)' },
          { id: 'après-midi', label: 'Après-midi (12h–18h)' },
          { id: 'soir', label: 'Soir (après 18h)' },
        ].map(({ id, label }) => (
          <label key={id} className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={timeFilter.includes(id)}
              onChange={() => toggleList(timeFilter, setTimeFilter, id)}
              className="accent-primary"
            />
            <span className="text-body-sm text-on-surface">{label}</span>
          </label>
        ))}
      </div>

      {/* Compagnie */}
      {companies.length > 0 && (
        <div>
          <p className="text-label-lg text-on-surface mb-2">Compagnie</p>
          {companies.map((c) => (
            <label key={c} className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={companyFilter.includes(c)}
                onChange={() => toggleList(companyFilter, setCompanyFilter, c)}
                className="accent-primary"
              />
              <span className="text-body-sm text-on-surface">{c}</span>
            </label>
          ))}
        </div>
      )}

      {/* Tri par prix */}
      <div>
        <p className="text-label-lg text-on-surface mb-2">Trier par prix</p>
        {[
          { id: 'asc', label: '↑ Prix croissant' },
          { id: 'desc', label: '↓ Prix décroissant' },
        ].map(({ id, label }) => (
          <label key={id} className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="radio"
              name="sortPrice"
              checked={sortPrice === id}
              onChange={() => setSortPrice(sortPrice === id ? '' : id)}
              onClick={() => { if (sortPrice === id) setSortPrice('') }}
              className="accent-primary"
            />
            <span className="text-body-sm text-on-surface">{label}</span>
          </label>
        ))}
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full text-body-sm text-on-surface-variant border border-outline-variant rounded-lg py-2 hover:bg-surface-container transition-colors"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pb-24 md:pb-8">
        {/* Header de recherche */}
        <div className="bg-surface-container-low border-b border-outline-variant px-4 py-5">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-on-surface-variant text-body-sm mb-1 flex-wrap">
              <span>{from}</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
              <span>{to}</span>
              {date && (
                <>
                  <span className="mx-1">·</span>
                  <span>{new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </>
              )}
              {!date && <span className="mx-1">· Toutes les dates</span>}
            </div>
            <h1 className="text-headline-md text-on-surface">
              {from} → {to}
            </h1>
            <div className="flex items-center justify-between mt-1">
              {!loading && !error && (
                <p className="text-body-sm text-on-surface-variant">
                  {filtered.length} trajet{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="ml-3 text-primary hover:underline">
                      Effacer les filtres
                    </button>
                  )}
                </p>
              )}
              {/* Bouton filtres mobile */}
              <button
                onClick={() => setShowMobileFilters((v) => !v)}
                className="md:hidden flex items-center gap-1 text-label-md text-on-surface border border-outline-variant px-3 py-1.5 rounded-lg hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>tune</span>
                <span>Filtres</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-primary ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Chips de filtres actifs (mobile) */}
        {(companyFilter.length > 0 || timeFilter.length > 0 || dateFilter) && (
          <div className="md:hidden flex gap-2 overflow-x-auto px-4 py-2 border-b border-outline-variant bg-surface-container-low scrollbar-hide">
            {dateFilter && (
              <FilterChip
                label={new Date(dateFilter + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                active
                onClick={() => setDateFilter('')}
              />
            )}
            {companyFilter.map((c) => (
              <FilterChip key={c} label={c} active onClick={() => toggleList(companyFilter, setCompanyFilter, c)} />
            ))}
            {timeFilter.map((t) => (
              <FilterChip key={t} label={t} active onClick={() => toggleList(timeFilter, setTimeFilter, t)} />
            ))}
          </div>
        )}

        {/* Panneau filtres mobile (déroulant) */}
        {showMobileFilters && (
          <div className="md:hidden bg-surface-container-lowest border-b border-outline-variant px-4 py-5">
            {FilterPanel}
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
          {/* Sidebar desktop */}
          <aside className="hidden md:block w-56 shrink-0">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 sticky top-4">
              {FilterPanel}
            </div>
          </aside>

          {/* Résultats */}
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
                <p className="text-body-md text-on-surface-variant mb-4">
                  {hasActiveFilters
                    ? 'Aucun trajet ne correspond à vos filtres.'
                    : 'Essayez un autre itinéraire ou une autre date.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-lg text-label-lg hover:bg-secondary-fixed-dim transition-colors"
                  >
                    Effacer les filtres
                  </button>
                )}
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
