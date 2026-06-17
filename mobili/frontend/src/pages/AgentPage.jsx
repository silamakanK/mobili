import { useState, useEffect } from 'react'
import { Navigate, NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { searchTicket, validateTicket } from '../services/tickets'
import { getTodayTrips } from '../services/trips'

const AGENT_ROLES = ['AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN']

const VALIDATION_CONFIG = {
  VALID: { label: 'VALIDE', icon: 'check_circle', className: 'bg-primary-fixed text-on-primary-fixed' },
  ALREADY_USED: { label: 'DÉJÀ UTILISÉ', icon: 'warning', className: 'bg-secondary-fixed text-on-secondary-fixed' },
  INVALID: { label: 'INVALIDE', icon: 'cancel', className: 'bg-error-container text-on-error-container' },
  NOT_FOUND: { label: 'INTROUVABLE', icon: 'search_off', className: 'bg-surface-variant text-on-surface-variant' },
}

export default function AgentPage() {
  const { isAuthenticated, user } = useAuth()
  const [activeSection, setActiveSection] = useState('scan')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [validationStatus, setValidationStatus] = useState(null)
  const [todayTrips, setTodayTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)

  useEffect(() => {
    if (activeSection === 'departures') {
      setTripsLoading(true)
      getTodayTrips()
        .then((res) => setTodayTrips(res.data?.data || res.data || []))
        .catch(() => {})
        .finally(() => setTripsLoading(false))
    }
  }, [activeSection])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!AGENT_ROLES.includes(user?.role)) return <Navigate to="/" replace />

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setSearchResult(null)
    setValidationStatus(null)
    try {
      const res = await searchTicket(searchQuery.trim())
      setSearchResult(res.data?.data || res.data)
    } catch {
      setSearchError('Aucun billet trouvé.')
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleValidate(ticketCode) {
    try {
      const res = await validateTicket({ ticketCode })
      const status = res.data?.data?.status || res.data?.status || 'VALID'
      setValidationStatus(status)
    } catch {
      setValidationStatus('INVALID')
    }
  }

  const navLinks = [
    { key: 'scan', icon: 'qr_code_scanner', label: 'Contrôle' },
    { key: 'departures', icon: 'schedule', label: 'Départs du jour' },
    { key: 'manual', icon: 'manage_search', label: 'Recherche manuelle' },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-outline-variant z-40 pt-6 pb-6">
        <div className="px-6 mb-8">
          <p className="text-primary font-bold text-headline-sm">Mobili</p>
          <p className="text-body-sm text-on-surface-variant mt-1">Espace agent</p>
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

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center gap-2 px-4 py-3">
        <p className="text-primary font-bold text-headline-sm flex-1">Mobili · Agent</p>
      </div>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant z-40 flex">
        {navLinks.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
              activeSection === key ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{icon}</span>
            <span className="text-label-md">{label}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 px-4 md:px-8 py-8">
        {/* Scan section */}
        {activeSection === 'scan' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-headline-md text-on-surface mb-6">Contrôle des billets</h1>

            <button
              onClick={() => handleValidate('MOCK_SCAN')}
              className="w-full bg-primary text-on-primary rounded-xl py-12 flex flex-col items-center gap-3 hover:bg-primary-container transition-colors mb-6"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>qr_code_scanner</span>
              <span className="text-headline-sm">Scanner un QR Code</span>
              <span className="text-body-sm opacity-80">Appuyez pour activer la caméra</span>
            </button>

            {validationStatus && (() => {
              const cfg = VALIDATION_CONFIG[validationStatus] || VALIDATION_CONFIG.INVALID
              return (
                <div className={`rounded-xl p-6 text-center ${cfg.className}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>{cfg.icon}</span>
                  <p className="text-headline-md mt-2">{cfg.label}</p>
                </div>
              )
            })()}
          </div>
        )}

        {/* Departures section */}
        {activeSection === 'departures' && (
          <div className="max-w-2xl mx-auto">
            <h1 className="text-headline-md text-on-surface mb-6">Départs du jour</h1>
            {tripsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 animate-pulse h-20" />
                ))}
              </div>
            )}
            {!tripsLoading && todayTrips.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '48px' }}>directions_bus</span>
                <p className="text-body-md text-on-surface-variant mt-3">Aucun départ prévu aujourd&apos;hui</p>
              </div>
            )}
            <div className="space-y-3">
              {todayTrips.map((trip) => (
                <div key={trip.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shrink-0">
                    {trip.departureTime?.slice(0, 5) || '--'}
                  </div>
                  <div className="flex-1">
                    <p className="text-body-md font-medium text-on-surface">
                      {trip.route?.origin || trip.origin} → {trip.route?.destination || trip.destination}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">{trip.company?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm text-on-surface-variant">Embarqués</p>
                    <p className="text-headline-sm text-on-surface">
                      {trip.boardedCount || 0}/{trip.vehicle?.totalSeats || '?'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual search section */}
        {activeSection === 'manual' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-headline-md text-on-surface mb-6">Recherche manuelle</h1>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom, téléphone ou code billet..."
                className="flex-1 border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="bg-primary text-on-primary px-4 py-3 rounded-lg hover:bg-primary-container transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </form>

            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {searchError && (
              <div className="bg-surface-variant text-on-surface-variant rounded-xl p-5 text-center">
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>search_off</span>
                <p className="text-body-md mt-2">{searchError}</p>
              </div>
            )}

            {searchResult && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-headline-sm text-on-surface">
                      {searchResult.reservation?.user?.firstName} {searchResult.reservation?.user?.lastName}
                    </p>
                    <p className="text-body-sm text-on-surface-variant font-mono">{searchResult.ticketCode}</p>
                  </div>
                  <span className={`text-label-md px-2 py-1 rounded-full ${searchResult.isUsed ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                    {searchResult.isUsed ? 'Déjà utilisé' : 'Valide'}
                  </span>
                </div>
                {!searchResult.isUsed && (
                  <button
                    onClick={() => handleValidate(searchResult.ticketCode)}
                    className="w-full bg-primary text-on-primary py-3 rounded-lg text-label-lg font-medium hover:bg-primary-container transition-colors"
                  >
                    Valider ce billet
                  </button>
                )}
                {validationStatus && (() => {
                  const cfg = VALIDATION_CONFIG[validationStatus] || VALIDATION_CONFIG.INVALID
                  return (
                    <div className={`rounded-xl p-4 text-center mt-3 ${cfg.className}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>{cfg.icon}</span>
                      <p className="text-headline-sm mt-1">{cfg.label}</p>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
