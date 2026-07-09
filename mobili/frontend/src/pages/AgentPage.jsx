import { useState, useEffect, useRef, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { searchTicket, validateTicket } from '../services/tickets'
import { getTodayTrips, getTripPassengers } from '../services/trips'

const AGENT_ROLES = ['AGENT', 'ADMIN_COMPANY', 'SUPER_ADMIN']

const VALIDATION_CONFIG = {
  VALID: { label: 'Valide', icon: 'check_circle', className: 'bg-primary-fixed text-on-primary-fixed' },
  ALREADY_USED: { label: 'Déjà utilisé', icon: 'warning', className: 'bg-secondary-fixed text-on-secondary-fixed' },
  INVALID: { label: 'Invalide', icon: 'cancel', className: 'bg-error-container text-on-error-container' },
  NOT_FOUND: { label: 'Introuvable', icon: 'search_off', className: 'bg-surface-variant text-on-surface-variant' },
}

// ── Sous-composant : liste passagers ──────────────────────────────────────────

function PassengerList({ trip, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    getTripPassengers(trip.id)
      .then((res) => setData(res.data?.data || res.data))
      .catch(() => setError('Impossible de charger les passagers.'))
      .finally(() => setLoading(false))
  }, [trip.id])

  const passengers = data?.passengers ?? []
  const filtered = filter.trim()
    ? passengers.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(filter.toLowerCase()) ||
          p.phone?.includes(filter)
      )
    : passengers

  const boardedCount = passengers.filter((p) => p.boarded).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '22px' }}>
            arrow_back
          </span>
        </button>
        <div>
          <h2 className="text-headline-sm text-on-surface">
            {trip.route?.origin} → {trip.route?.destination}
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            {trip.departureTime?.slice(0, 5)} · {trip.vehicle?.type}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-4 flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
          <p className="text-body-sm">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* Stats rapides */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-headline-md text-on-surface font-bold">{data.total}</p>
              <p className="text-label-md text-on-surface-variant">Réservés</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-headline-md text-primary font-bold">{boardedCount}</p>
              <p className="text-label-md text-on-surface-variant">Embarqués</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-center">
              <p className="text-headline-md text-on-surface-variant font-bold">
                {data.total - boardedCount}
              </p>
              <p className="text-label-md text-on-surface-variant">En attente</p>
            </div>
          </div>

          {/* Filtre */}
          <div className="relative mb-4">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant"
              style={{ fontSize: '20px' }}
            >
              search
            </span>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrer par nom ou téléphone…"
              className="w-full border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
            />
          </div>

          {/* Table */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-body-md text-on-surface-variant text-center py-8">Aucun passager trouvé.</p>
            ) : (
              filtered.map((p, i) => (
                <div
                  key={p.reservationCode}
                  className={`flex items-center gap-3 px-4 py-3 ${i < filtered.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  {/* Siège */}
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-label-lg font-bold shrink-0">
                    {p.seat}
                  </div>

                  {/* Infos passager */}
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md text-on-surface font-medium truncate">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">{p.phone}</p>
                  </div>

                  {/* Statut embarquement */}
                  {p.boarded ? (
                    <span className="flex items-center gap-1 text-label-md text-primary shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                      Embarqué
                    </span>
                  ) : (
                    <span className="text-label-md text-on-surface-variant shrink-0">En attente</span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AgentPage() {
  const { isAuthenticated, user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('scan')

  // Scan state: idle | scanning | loading | result
  const [scanState, setScanState] = useState('idle')
  const [validationResult, setValidationResult] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [manualQR, setManualQR] = useState('')
  const [barcodeSupported] = useState(() => 'BarcodeDetector' in globalThis)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)

  // Départs state
  const [todayTrips, setTodayTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)

  // Recherche manuelle state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [validatingId, setValidatingId] = useState(null)

  useEffect(() => {
    if (activeSection === 'departures') {
      setTripsLoading(true)
      setSelectedTrip(null)
      getTodayTrips()
        .then((res) => setTodayTrips(res.data?.data || res.data || []))
        .catch(() => {})
        .finally(() => setTripsLoading(false))
    }
  }, [activeSection])

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (activeSection !== 'scan') {
      stopCamera()
      setScanState('idle')
    }
  }, [activeSection, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!AGENT_ROLES.includes(user?.role)) return <Navigate to="/" replace />

  // ── Scan handlers ──

  async function callValidate(qrCode) {
    setScanState('loading')
    try {
      const res = await validateTicket({ qrCode })
      setValidationResult(res.data?.data || res.data)
    } catch (err) {
      setValidationResult(
        err.response?.data?.data || { status: 'INVALID', message: 'Erreur de validation.', ticket: null }
      )
    } finally {
      setScanState('result')
    }
  }

  async function startScan() {
    setScanError(null)
    try {
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanState('scanning')

      async function detect() {
        if (!videoRef.current || !streamRef.current) return
        try {
          const codes = await detectorRef.current.detect(videoRef.current)
          if (codes.length > 0) {
            stopCamera()
            await callValidate(codes[0].rawValue)
          } else {
            rafRef.current = requestAnimationFrame(detect)
          }
        } catch {
          rafRef.current = requestAnimationFrame(detect)
        }
      }
      detect()
    } catch (err) {
      setScanError(
        err.name === 'NotAllowedError'
          ? "Accès à la caméra refusé. Autorisez l'accès dans les paramètres."
          : "Impossible d'accéder à la caméra."
      )
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualQR.trim()) return
    await callValidate(manualQR.trim())
  }

  function resetScan() {
    stopCamera()
    setScanState('idle')
    setValidationResult(null)
    setScanError(null)
    setManualQR('')
  }

  // ── Recherche handlers ──

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchError(null)
    setSearchResults([])
    try {
      const res = await searchTicket(searchQuery.trim())
      const data = res.data?.data || res.data
      setSearchResults(Array.isArray(data) ? data : [data].filter(Boolean))
    } catch {
      setSearchError('Aucun billet trouvé.')
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleValidateFromSearch(ticket) {
    setValidatingId(ticket.id)
    try {
      const res = await validateTicket({ qrCode: ticket.qrCode })
      const result = res.data?.data || res.data
      setSearchResults((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? { ...t, isUsed: result.status === 'VALID' ? true : t.isUsed, _result: result }
            : t
        )
      )
    } catch (err) {
      const result = err.response?.data?.data || { status: 'INVALID', message: 'Erreur.' }
      setSearchResults((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, _result: result } : t))
      )
    } finally {
      setValidatingId(null)
    }
  }

  // ── Nav ──

  const navLinks = [
    { key: 'scan', icon: 'qr_code_scanner', label: 'Scanner' },
    { key: 'departures', icon: 'schedule', label: 'Départs' },
    { key: 'manual', icon: 'manage_search', label: 'Recherche' },
  ]

  // ── Render ──

  return (
    <div className="min-h-screen bg-background flex">

      {/* Sidebar desktop */}
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
        <div className="px-6 space-y-0.5">
          <p className="text-label-md text-on-surface font-medium">{user?.firstName} {user?.lastName}</p>
          <p className="text-label-sm text-on-surface-variant">{user?.role}</p>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-label-md text-error hover:underline mt-2 pt-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center px-4 py-3">
        <p className="text-primary font-bold text-headline-sm flex-1">Mobili · Agent</p>
        <button onClick={logout} title="Se déconnecter" className="text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>logout</span>
        </button>
      </div>

      {/* Mobile bottom nav */}
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

      {/* Contenu principal */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 px-4 md:px-8 py-8">

        {/* ══ SCAN QR ══════════════════════════════════════════════════════════ */}
        {activeSection === 'scan' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-headline-md text-on-surface mb-6">Contrôle des billets</h1>

            {/* Idle */}
            {scanState === 'idle' && (
              <div className="space-y-5">
                {barcodeSupported && (
                  <button
                    onClick={startScan}
                    className="w-full bg-primary text-on-primary rounded-2xl py-14 flex flex-col items-center gap-3 hover:opacity-90 active:scale-[0.98] transition"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '72px' }}>
                      qr_code_scanner
                    </span>
                    <span className="text-headline-sm font-semibold">Scanner un billet</span>
                    <span className="text-body-sm opacity-75">Appuyez pour activer la caméra</span>
                  </button>
                )}

                {scanError && (
                  <div className="bg-error-container text-on-error-container rounded-xl p-4 flex items-start gap-2">
                    <span className="material-symbols-outlined shrink-0" style={{ fontSize: '20px' }}>
                      warning
                    </span>
                    <p className="text-body-sm">{scanError}</p>
                  </div>
                )}

                {barcodeSupported === false && (
                  <p className="text-body-sm text-on-surface-variant">
                    Scan caméra non disponible sur ce navigateur. Saisissez le code de secours :
                  </p>
                )}

                <div>
                  {barcodeSupported && (
                    <p className="text-label-md text-on-surface-variant text-center mb-3">
                      — ou saisir le code de secours —
                    </p>
                  )}
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={manualQR}
                      onChange={(e) => setManualQR(e.target.value)}
                      placeholder="TKT-XXXXXXXX ou code QR complet"
                      className="flex-1 border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!manualQR.trim()}
                      className="bg-primary text-on-primary px-4 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined">check</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Scanning — flux caméra */}
            {scanState === 'scanning' && (
              <div
                className="relative rounded-2xl overflow-hidden bg-black"
                style={{ aspectRatio: '3/4', maxHeight: '70vh' }}
              >
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="w-56 h-56 rounded-2xl border-2 border-white"
                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                  />
                </div>
                <p className="absolute top-4 inset-x-0 text-center text-white text-body-sm drop-shadow">
                  Pointez vers le QR code du billet
                </p>
                <div className="absolute bottom-5 inset-x-0 flex justify-center">
                  <button
                    onClick={() => { stopCamera(); setScanState('idle') }}
                    className="bg-black/50 text-white backdrop-blur-sm px-6 py-2.5 rounded-full text-label-md"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {scanState === 'loading' && (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="animate-spin w-14 h-14 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-body-md text-on-surface-variant">Vérification…</p>
              </div>
            )}

            {/* Résultat */}
            {scanState === 'result' && validationResult && (() => {
              const cfg = VALIDATION_CONFIG[validationResult.status] || VALIDATION_CONFIG.INVALID
              const t = validationResult.ticket
              return (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-8 text-center ${cfg.className}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>
                      {cfg.icon}
                    </span>
                    <p className="text-display-sm font-bold mt-3">{cfg.label}</p>
                    {validationResult.message && (
                      <p className="text-body-md mt-1 opacity-75">{validationResult.message}</p>
                    )}
                  </div>

                  {t && (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-label-md text-on-surface-variant">Passager</p>
                          <p className="text-body-md text-on-surface font-medium">{t.passenger}</p>
                        </div>
                        <div>
                          <p className="text-label-md text-on-surface-variant">Téléphone</p>
                          <p className="text-body-md text-on-surface">{t.phone}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-label-md text-on-surface-variant">Trajet</p>
                          <p className="text-body-md text-on-surface font-medium">{t.route}</p>
                        </div>
                        <div>
                          <p className="text-label-md text-on-surface-variant">Départ</p>
                          <p className="text-body-md text-on-surface">{t.departureTime}</p>
                        </div>
                        <div>
                          <p className="text-label-md text-on-surface-variant">Siège</p>
                          <p className="text-body-md text-on-surface">{t.seatNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetScan}
                    className="w-full bg-primary text-on-primary py-3.5 rounded-xl text-label-lg font-medium hover:opacity-90 transition"
                  >
                    Scanner un autre billet
                  </button>
                </div>
              )
            })()}
          </div>
        )}

        {/* ══ DÉPARTS DU JOUR ══════════════════════════════════════════════════ */}
        {activeSection === 'departures' && (
          <div className="max-w-2xl mx-auto">
            {/* Vue passagers d'un trajet */}
            {selectedTrip ? (
              <PassengerList trip={selectedTrip} onBack={() => setSelectedTrip(null)} />
            ) : (
              <>
                <h1 className="text-headline-md text-on-surface mb-6">Départs du jour</h1>

                {tripsLoading && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 animate-pulse h-24"
                      />
                    ))}
                  </div>
                )}

                {!tripsLoading && todayTrips.length === 0 && (
                  <div className="text-center py-16">
                    <span className="material-symbols-outlined text-outline" style={{ fontSize: '56px' }}>
                      directions_bus
                    </span>
                    <p className="text-body-md text-on-surface-variant mt-3">
                      Aucun départ prévu aujourd&apos;hui
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {todayTrips.map((trip) => {
                    const confirmed = trip.reservations?.length ?? 0
                    const total = trip.vehicle?.totalSeats ?? '?'
                    return (
                      <div
                        key={trip.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          {/* Heure */}
                          <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shrink-0">
                            {trip.departureTime?.slice(0, 5) || '--'}
                          </div>

                          {/* Infos */}
                          <div className="flex-1 min-w-0">
                            <p className="text-body-md font-medium text-on-surface truncate">
                              {trip.route?.origin} → {trip.route?.destination}
                            </p>
                            <p className="text-body-sm text-on-surface-variant">
                              {trip.vehicle?.type} · {confirmed}/{total} places
                            </p>
                          </div>

                          {/* Bouton passagers */}
                          <button
                            onClick={() => setSelectedTrip(trip)}
                            className="shrink-0 flex items-center gap-1.5 bg-secondary-container text-on-secondary-container text-label-md px-3 py-2 rounded-lg hover:opacity-90 transition"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                              group
                            </span>
                            Passagers
                          </button>
                        </div>

                        {/* Barre de remplissage */}
                        {typeof total === 'number' && total > 0 && (
                          <div className="mt-3 h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min((confirmed / total) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ RECHERCHE MANUELLE ═══════════════════════════════════════════════ */}
        {activeSection === 'manual' && (
          <div className="max-w-lg mx-auto">
            <h1 className="text-headline-md text-on-surface mb-6">Recherche manuelle</h1>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom ou téléphone du passager…"
                className="flex-1 border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="bg-primary text-on-primary px-4 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60"
              >
                <span className="material-symbols-outlined">search</span>
              </button>
            </form>

            {searchLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {searchError && !searchLoading && (
              <div className="text-center py-10">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '40px' }}>
                  search_off
                </span>
                <p className="text-body-md text-on-surface-variant mt-2">{searchError}</p>
              </div>
            )}

            <div className="space-y-3">
              {searchResults.map((ticket) => {
                const res = ticket.reservation
                const resultCfg = ticket._result
                  ? VALIDATION_CONFIG[ticket._result.status] || VALIDATION_CONFIG.INVALID
                  : null
                return (
                  <div
                    key={ticket.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="text-body-md text-on-surface font-medium">
                          {res?.user?.firstName} {res?.user?.lastName}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">{res?.user?.phone}</p>
                        <p className="text-body-sm text-on-surface-variant font-mono mt-0.5">
                          {ticket.ticketCode}
                        </p>
                      </div>
                      <span
                        className={`text-label-md px-2 py-1 rounded-full shrink-0 ml-2 ${
                          ticket.isUsed
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-primary-fixed text-on-primary-fixed'
                        }`}
                      >
                        {ticket.isUsed ? 'Utilisé' : 'Valide'}
                      </span>
                    </div>

                    <p className="text-body-sm text-on-surface-variant mb-4">
                      {res?.trip?.route?.origin} → {res?.trip?.route?.destination}
                      {res?.seat?.seatNumber ? ` · Siège ${res.seat.seatNumber}` : ''}
                    </p>

                    {!ticket.isUsed && !ticket._result && (
                      <button
                        onClick={() => handleValidateFromSearch(ticket)}
                        disabled={validatingId === ticket.id}
                        className="w-full bg-primary text-on-primary py-2.5 rounded-lg text-label-lg font-medium hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {validatingId === ticket.id && (
                          <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full" />
                        )}
                        Valider ce billet
                      </button>
                    )}

                    {ticket._result && resultCfg && (
                      <div className={`rounded-lg p-3 flex items-center justify-center gap-2 ${resultCfg.className}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                          {resultCfg.icon}
                        </span>
                        <p className="text-label-lg font-bold">{resultCfg.label}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
