import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCompanyStats, getGlobalStats } from '../services/stats'
import { listRoutes, createRoute, deleteRoute } from '../services/routes'
import { listVehicles, createVehicle, deleteVehicle } from '../services/vehicles'
import { listCompanyTrips, createTrip, updateTrip, cancelTrip, getTripPassengers } from '../services/trips-admin'
import { listUsers, createAgent, updateUser } from '../services/users'
import { listCompanyReservations } from '../services/reservations'
import { listSeats, updateSeat } from '../services/seats'

const ADMIN_ROLES = ['ADMIN_COMPANY', 'SUPER_ADMIN']

const STATUS_CONFIG = {
  CONFIRMED: { label: 'Payé', className: 'bg-secondary-container text-on-secondary-container' },
  COMPLETED: { label: 'Terminé', className: 'bg-surface-variant text-on-surface-variant' },
  CANCELLED: { label: 'Annulé', className: 'bg-error-container/50 text-tertiary' },
  PENDING: { label: 'En attente', className: 'bg-surface-container text-on-surface-variant' },
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
      <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>{icon}</span>
      <p className="text-body-md">{text}</p>
    </div>
  )
}

function ErrorMsg({ msg }) {
  if (!msg) return null
  return (
    <p className="text-body-sm text-error bg-error-container/30 rounded-lg px-3 py-2">{msg}</p>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
function DashboardSection({ user, onNavigate }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = user.role === 'SUPER_ADMIN'
      ? getGlobalStats()
      : getCompanyStats(user.companyId)
    fetch
      .then((res) => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const statCards = [
    {
      icon: 'payments',
      label: 'Ventes du jour',
      value: stats?.dailySales != null ? `${stats.dailySales.toLocaleString('fr-FR')} FCFA` : '—',
      sub: '+12% vs hier',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: 'confirmation_number',
      label: 'Réservations',
      value: stats?.totalReservations ?? '—',
      sub: `${stats?.pendingReservations ?? 0} en attente`,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      icon: 'directions_bus',
      label: 'Trajets actifs',
      value: stats?.activeTrips ?? '—',
      sub: `Sur ${stats?.totalTrips ?? 0} planifiés`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: 'warning',
      label: 'Alertes',
      value: stats?.pendingReservations ?? '—',
      sub: 'Réservations en attente',
      color: 'text-error',
      bg: 'bg-error/10',
    },
  ]

  const recent = stats?.recentReservations || []

  const quickActions = [
    { icon: 'route', title: 'Trajets & Itinéraires', sub: 'Gérer les lignes', section: 'horaires' },
    { icon: 'directions_bus', title: 'Flotte de Véhicules', sub: `${stats?.vehicles ?? 0} bus actifs`, section: 'bus' },
    { icon: 'badge', title: 'Agents & Chauffeurs', sub: 'Planning du jour', section: 'agents' },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline-md text-on-surface">Vue d&apos;ensemble</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Gérez vos opérations de transport en temps réel.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '16px' }}>calendar_today</span>
          <span className="text-body-sm text-on-surface-variant">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon, label, value, sub, color, bg }) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <span className={`material-symbols-outlined ${color}`} style={{ fontSize: '20px' }}>{icon}</span>
            </div>
            {loading ? (
              <div className="h-8 bg-surface-container rounded animate-pulse mb-1" />
            ) : (
              <p className="text-headline-sm text-on-surface mb-1">{value}</p>
            )}
            <p className="text-label-lg text-on-surface mb-0.5">{label}</p>
            <p className="text-body-sm text-on-surface-variant">{sub}</p>
          </div>
        ))}
      </div>

      {/* Gestion Rapide */}
      <div className="mb-8">
        <h2 className="text-headline-sm text-on-surface mb-4">Gestion Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map(({ icon, title, sub, section }) => (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:bg-surface-container transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>{icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-on-surface font-medium">{title}</p>
                <p className="text-body-sm text-on-surface-variant">{sub}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          ))}
        </div>
      </div>

      {/* Réservations récentes */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-headline-sm text-on-surface">Réservations Récentes</h2>
          <button
            onClick={() => onNavigate('reservations')}
            className="text-primary text-label-lg hover:underline"
          >
            Voir tout
          </button>
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
                <tr><td colSpan={4} className="py-8"><Spinner /></td></tr>
              )}
              {!loading && recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-body-md text-on-surface-variant">
                    Aucune réservation récente
                  </td>
                </tr>
              )}
              {!loading && recent.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-label-lg text-primary font-bold">
                          {r.user ? r.user.firstName[0] : '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-body-md text-on-surface font-medium">
                          {r.user ? `${r.user.firstName} ${r.user.lastName}` : '—'}
                        </p>
                        <p className="text-body-sm text-on-surface-variant">#{r.reservationCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-body-sm text-on-surface">
                      {r.trip?.route?.origin || '—'} → {r.trip?.route?.destination || '—'}
                    </p>
                    <p className="text-body-sm text-on-surface-variant">
                      {r.trip?.departureDate ? new Date(r.trip.departureDate).toLocaleDateString('fr-FR') : '—'}
                      {r.trip?.departureTime ? ` à ${r.trip.departureTime}` : ''}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    {r.payment ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                        <span className="text-body-sm text-on-surface-variant">
                          {r.payment.method?.replace('_', ' ') || '—'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-body-sm text-on-surface-variant">—</span>
                    )}
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
  )
}

// ── Lignes ─────────────────────────────────────────────────────────────────────
function LignesSection() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ origin: '', destination: '', distance: '', estimatedDuration: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listRoutes()
      .then((res) => setRoutes(res.data?.data?.routes || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createRoute({
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        distance: Number(form.distance),
        estimatedDuration: Number(form.estimatedDuration),
      })
      setForm({ origin: '', destination: '', distance: '', estimatedDuration: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver cette ligne ?')) return
    try {
      await deleteRoute(id)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md text-on-surface">Lignes</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-lg hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Nouvelle ligne
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="text-headline-sm text-on-surface col-span-full">Créer une ligne</h2>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Origine</label>
            <input
              required
              value={form.origin}
              onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ex. Bamako"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Destination</label>
            <input
              required
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ex. Kayes"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Distance (km)</label>
            <input
              required
              type="number"
              min={1}
              value={form.distance}
              onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Durée estimée (min)</label>
            <input
              required
              type="number"
              min={1}
              value={form.estimatedDuration}
              onChange={(e) => setForm((f) => ({ ...f, estimatedDuration: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="col-span-full flex gap-3 items-center">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Enregistrement…' : 'Créer la ligne'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant text-label-lg hover:underline">
              Annuler
            </button>
            <ErrorMsg msg={error} />
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : routes.length === 0 ? (
          <EmptyState icon="route" text="Aucune ligne configurée" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Ligne</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Distance</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Durée</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                  <td className="px-5 py-3 text-body-md text-on-surface font-medium">
                    {r.origin} → {r.destination}
                  </td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">{r.distance} km</td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                    {Math.floor(r.estimatedDuration / 60)}h{String(r.estimatedDuration % 60).padStart(2, '0')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                      title="Désactiver"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ── Véhicules ──────────────────────────────────────────────────────────────────
function VehiculesSection() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ registrationNumber: '', type: 'BUS', totalSeats: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listVehicles()
      .then((res) => setVehicles(res.data?.data?.vehicles || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createVehicle({
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        type: form.type,
        totalSeats: Number(form.totalSeats),
      })
      setForm({ registrationNumber: '', type: 'BUS', totalSeats: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Désactiver ce véhicule ?')) return
    try {
      await deleteVehicle(id)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    }
  }

  const vehicleTypeLabel = { BUS: 'Bus', MINIBUS: 'Minibus', VAN: 'Van' }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md text-on-surface">Véhicules</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-lg hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Nouveau véhicule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <h2 className="text-headline-sm text-on-surface col-span-full">Ajouter un véhicule</h2>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Immatriculation</label>
            <input
              required
              value={form.registrationNumber}
              onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary uppercase"
              placeholder="ex. BA-1234-AB"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="BUS">Bus</option>
              <option value="MINIBUS">Minibus</option>
              <option value="VAN">Van</option>
            </select>
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Nombre de sièges</label>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.totalSeats}
              onChange={(e) => setForm((f) => ({ ...f, totalSeats: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="col-span-full flex gap-3 items-center">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Enregistrement…' : 'Créer le véhicule'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant text-label-lg hover:underline">
              Annuler
            </button>
            <ErrorMsg msg={error} />
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : vehicles.length === 0 ? (
          <EmptyState icon="directions_bus" text="Aucun véhicule enregistré" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Immatriculation</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Type</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Sièges</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                  <td className="px-5 py-3 text-body-md text-on-surface font-medium font-mono">{v.registrationNumber}</td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">{vehicleTypeLabel[v.type] || v.type}</td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">{v.totalSeats} places</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                      title="Désactiver"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ── Trajets ────────────────────────────────────────────────────────────────────
function TrajetsSection() {
  const [trips, setTrips] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [form, setForm] = useState({
    routeId: '', vehicleId: '', departureDate: '', departureTime: '06:00', price: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingTrip, setEditingTrip] = useState(null)
  const [editForm, setEditForm] = useState({ price: '', departureTime: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      listCompanyTrips({ limit: 50 }),
      listRoutes({ limit: 100 }),
      listVehicles({ limit: 100 }),
    ])
      .then(([tripsRes, routesRes, vehiclesRes]) => {
        setTrips(tripsRes.data?.data?.trips || [])
        setRoutes(routesRes.data?.data?.routes || [])
        setVehicles(vehiclesRes.data?.data?.vehicles || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createTrip({
        routeId: form.routeId,
        vehicleId: form.vehicleId,
        departureDate: form.departureDate,
        departureTime: form.departureTime,
        price: Number(form.price),
      })
      setForm({ routeId: '', vehicleId: '', departureDate: '', departureTime: '06:00', price: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.message || 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Annuler ce trajet ? Les passagers seront notifiés.')) return
    try {
      await cancelTrip(id)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    }
  }

  const handleEditOpen = (t) => {
    setEditingTrip(t)
    setEditForm({ price: String(t.price), departureTime: t.departureTime })
    setEditError('')
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      await updateTrip(editingTrip.id, {
        price: Number(editForm.price),
        departureTime: editForm.departureTime,
      })
      setEditingTrip(null)
      load()
    } catch (err) {
      setEditError(err.response?.data?.error || 'Erreur lors de la mise à jour.')
    } finally {
      setEditSaving(false)
    }
  }

  const tripStatusLabel = { SCHEDULED: 'Prévu', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
  const tripStatusClass = {
    SCHEDULED: 'bg-secondary-container text-on-secondary-container',
    COMPLETED: 'bg-surface-variant text-on-surface-variant',
    CANCELLED: 'bg-error-container/50 text-tertiary',
  }

  return (
    <>
      {selectedTrip && (
        <PassengersModal trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}

      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h2 className="text-headline-sm text-on-surface">Modifier le trajet</h2>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {editingTrip.route?.origin} → {editingTrip.route?.destination} · {new Date(editingTrip.departureDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setEditingTrip(null)}
                className="p-1 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-label-lg text-on-surface-variant block mb-1">Prix (FCFA)</label>
                <input
                  required
                  type="number"
                  min={100}
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-label-lg text-on-surface-variant block mb-1">Heure de départ</label>
                <input
                  required
                  type="time"
                  value={editForm.departureTime}
                  onChange={(e) => setEditForm((f) => ({ ...f, departureTime: e.target.value }))}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {editError && <ErrorMsg msg={editError} />}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="text-on-surface-variant text-label-lg hover:underline"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md text-on-surface">Horaires</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-lg hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Nouveau trajet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="text-headline-sm text-on-surface col-span-full">Planifier un trajet</h2>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Ligne</label>
            <select
              required
              value={form.routeId}
              onChange={(e) => setForm((f) => ({ ...f, routeId: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sélectionner une ligne…</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Véhicule</label>
            <select
              required
              value={form.vehicleId}
              onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sélectionner un véhicule…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.totalSeats} places)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Date de départ</label>
            <input
              required
              type="date"
              value={form.departureDate}
              onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Heure de départ</label>
            <input
              required
              type="time"
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Prix (FCFA)</label>
            <input
              required
              type="number"
              min={100}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="ex. 8000"
            />
          </div>
          <div className="col-span-full flex gap-3 items-center flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Enregistrement…' : 'Créer le trajet'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant text-label-lg hover:underline">
              Annuler
            </button>
            <ErrorMsg msg={error} />
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : trips.length === 0 ? (
          <EmptyState icon="schedule" text="Aucun trajet planifié" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Ligne</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Date</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Heure</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Prix</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Places</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const confirmed = t.reservations?.length || 0
                  return (
                    <tr key={t.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                      <td className="px-5 py-3 text-body-md text-on-surface font-medium">
                        {t.route?.origin} → {t.route?.destination}
                      </td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                        {new Date(t.departureDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">{t.departureTime}</td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                        {t.price.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                        {confirmed}/{t.vehicle?.totalSeats ?? t.availableSeats}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-label-md px-2 py-0.5 rounded-full ${tripStatusClass[t.status] || ''}`}>
                          {tripStatusLabel[t.status] || t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedTrip(t)}
                            className="text-primary hover:bg-primary/10 p-1 rounded-lg transition"
                            title="Voir les passagers"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
                          </button>
                          {t.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleEditOpen(t)}
                              className="text-on-surface-variant hover:bg-surface-container p-1 rounded-lg transition"
                              title="Modifier prix / heure"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                            </button>
                          )}
                          {t.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleCancel(t.id)}
                              className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                              title="Annuler le trajet"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ── Agents ─────────────────────────────────────────────────────────────────────
function AgentsSection() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    listUsers({ limit: 100 })
      .then((res) => {
        const all = res.data?.data?.users || []
        setAgents(all.filter((u) => u.role === 'AGENT'))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggleActive = async (agent) => {
    try {
      await updateUser(agent.id, { isActive: !agent.isActive })
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createAgent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      })
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md text-on-surface">Agents</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl text-label-lg hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
          Nouvel agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h2 className="text-headline-sm text-on-surface col-span-full">Créer un compte agent</h2>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Prénom</label>
            <input
              required
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Nom</label>
            <input
              required
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-label-lg text-on-surface-variant block mb-1">Téléphone</label>
            <input
              required
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="+22376000000"
            />
          </div>
          <div className="col-span-full">
            <label className="text-label-lg text-on-surface-variant block mb-1">Mot de passe</label>
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="col-span-full flex gap-3 items-center flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-on-surface-variant text-label-lg hover:underline">
              Annuler
            </button>
            <ErrorMsg msg={error} />
          </div>
        </form>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : agents.length === 0 ? (
          <EmptyState icon="badge" text="Aucun agent enregistré" />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Nom</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Email</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Téléphone</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Statut</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                  <td className="px-5 py-3 text-body-md text-on-surface font-medium">
                    {a.firstName} {a.lastName}
                  </td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">{a.email}</td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">{a.phone}</td>
                  <td className="px-5 py-3">
                    <span className={`text-label-md px-2 py-0.5 rounded-full ${a.isActive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                      {a.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(a)}
                      className={`p-1 rounded-lg transition ${a.isActive ? 'text-error hover:bg-error-container/30' : 'text-secondary hover:bg-secondary-container/30'}`}
                      title={a.isActive ? 'Désactiver' : 'Réactiver'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {a.isActive ? 'person_off' : 'person'}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

// ── Modal Passagers ────────────────────────────────────────────────────────────
function PassengersModal({ trip, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTripPassengers(trip.id)
      .then((res) => setData(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [trip.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm text-on-surface">Liste des passagers</h2>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {trip.route?.origin} → {trip.route?.destination} · {new Date(trip.departureDate).toLocaleDateString('fr-FR')} à {trip.departureTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? <Spinner /> : !data || data.passengers.length === 0 ? (
            <EmptyState icon="group" text="Aucun passager confirmé pour ce trajet" />
          ) : (
            <>
              <div className="px-5 py-3 border-b border-outline-variant bg-surface-container">
                <p className="text-label-lg text-on-surface-variant">{data.total} passager{data.total > 1 ? 's' : ''} confirmé{data.total > 1 ? 's' : ''}</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Siège</th>
                    <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Passager</th>
                    <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Téléphone</th>
                    <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Billet</th>
                    <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Embarqué</th>
                  </tr>
                </thead>
                <tbody>
                  {data.passengers.map((p) => (
                    <tr key={p.reservationCode} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                      <td className="px-5 py-3">
                        <span className={`text-label-md px-2 py-0.5 rounded-full ${p.seatType === 'VIP' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                          {p.seat}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-body-md text-on-surface font-medium">{p.firstName} {p.lastName}</p>
                      </td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant font-mono">{p.phone}</td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant font-mono">{p.ticketCode || '—'}</td>
                      <td className="px-5 py-3">
                        {p.boarded ? (
                          <span className="flex items-center gap-1 text-secondary text-label-md">
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                            Oui
                          </span>
                        ) : (
                          <span className="text-on-surface-variant text-label-md">Non</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Places ─────────────────────────────────────────────────────────────────────
function PlacesSection() {
  const [vehicles, setVehicles] = useState([])
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [seats, setSeats] = useState([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    listVehicles({ limit: 100 })
      .then((res) => {
        const v = res.data?.data?.vehicles || []
        setVehicles(v)
        if (v.length > 0) setSelectedVehicleId(v[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingVehicles(false))
  }, [])

  useEffect(() => {
    if (!selectedVehicleId) return
    setLoadingSeats(true)
    listSeats(selectedVehicleId)
      .then((res) => setSeats(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingSeats(false))
  }, [selectedVehicleId])

  const handleToggleType = async (seat) => {
    setUpdating(seat.id)
    try {
      const newType = seat.type === 'VIP' ? 'STANDARD' : 'VIP'
      await updateSeat(seat.id, { type: newType })
      setSeats((prev) => prev.map((s) => s.id === seat.id ? { ...s, type: newType } : s))
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    } finally {
      setUpdating(null)
    }
  }

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
  const vipCount = seats.filter((s) => s.type === 'VIP').length
  const availableCount = seats.filter((s) => s.isAvailable).length

  return (
    <>
      <div className="mb-6">
        <h1 className="text-headline-md text-on-surface">Places</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">Gérez la disposition des sièges par véhicule.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
        <label className="text-label-lg text-on-surface-variant block mb-2">Sélectionner un véhicule</label>
        {loadingVehicles ? (
          <div className="h-10 bg-surface-container rounded-lg animate-pulse w-64" />
        ) : (
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full md:w-72 border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {vehicles.length === 0 && <option value="">Aucun véhicule enregistré</option>}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.registrationNumber} ({v.totalSeats} places)</option>
            ))}
          </select>
        )}
        {selectedVehicle && !loadingSeats && seats.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-3 text-body-sm text-on-surface-variant">
            <span>{availableCount}/{seats.length} places disponibles</span>
            <span>{vipCount} place{vipCount !== 1 ? 's' : ''} VIP</span>
            <span>{seats.length - vipCount} place{(seats.length - vipCount) !== 1 ? 's' : ''} Standard</span>
          </div>
        )}
      </div>

      {selectedVehicleId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="text-headline-sm text-on-surface mb-4">Disposition des sièges</h2>
          {loadingSeats ? (
            <Spinner />
          ) : seats.length === 0 ? (
            <EmptyState icon="airline_seat_recline_extra" text="Aucun siège configuré pour ce véhicule" />
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-5 text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-surface-container border border-outline-variant inline-block" />
                  Standard
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-tertiary-container inline-block" />
                  VIP
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-error-container/30 inline-block" />
                  Réservé
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {seats.map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => !seat.isAvailable ? null : handleToggleType(seat)}
                    disabled={updating === seat.id || !seat.isAvailable}
                    title={seat.isAvailable
                      ? `Siège ${seat.seatNumber} — ${seat.type} (clic pour basculer en ${seat.type === 'VIP' ? 'Standard' : 'VIP'})`
                      : `Siège ${seat.seatNumber} — Réservé`
                    }
                    className={`
                      flex flex-col items-center justify-center rounded-lg py-2 px-1 border transition text-label-sm font-medium gap-0.5
                      ${!seat.isAvailable
                        ? 'bg-error-container/20 border-error-container/40 text-error cursor-not-allowed opacity-60'
                        : seat.type === 'VIP'
                          ? 'bg-tertiary-container text-on-tertiary-container border-tertiary hover:opacity-75 cursor-pointer'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high cursor-pointer'
                      }
                      ${updating === seat.id ? 'opacity-40' : ''}
                    `}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>airline_seat_recline_extra</span>
                    <span>{seat.seatNumber}</span>
                  </button>
                ))}
              </div>
              <p className="text-body-sm text-on-surface-variant mt-4">
                Cliquez sur un siège disponible pour basculer entre Standard et VIP.
              </p>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ── Réservations ───────────────────────────────────────────────────────────────
function ReservationsSection() {
  const [reservations, setReservations] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const load = useCallback(() => {
    setLoading(true)
    listCompanyReservations({ page, limit, ...(statusFilter ? { status: statusFilter } : {}) })
      .then((res) => {
        const data = res.data?.data
        setReservations(data?.reservations || [])
        setTotal(data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  const statusTabs = [
    { key: '', label: 'Toutes' },
    { key: 'CONFIRMED', label: 'Confirmées' },
    { key: 'PENDING', label: 'En attente' },
    { key: 'CANCELLED', label: 'Annulées' },
  ]

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-headline-md text-on-surface">Réservations</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {total} réservation{total !== 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {statusTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-label-lg transition ${
              statusFilter === key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : reservations.length === 0 ? (
          <EmptyState icon="confirmation_number" text="Aucune réservation trouvée" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Passager</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Trajet</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Date</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Siège</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Montant</th>
                  <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Statut</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-body-md text-on-surface font-medium">
                        {r.user ? `${r.user.firstName} ${r.user.lastName}` : '—'}
                      </p>
                      <p className="text-body-sm text-on-surface-variant font-mono">{r.reservationCode}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-body-sm text-on-surface">
                        {r.trip?.route?.origin || '—'} → {r.trip?.route?.destination || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-body-sm text-on-surface-variant whitespace-nowrap">
                      {r.trip?.departureDate ? new Date(r.trip.departureDate).toLocaleDateString('fr-FR') : '—'}
                      {r.trip?.departureTime ? ` à ${r.trip.departureTime}` : ''}
                    </td>
                    <td className="px-5 py-3">
                      {r.seat ? (
                        <span className={`text-label-md px-2 py-0.5 rounded-full ${r.seat.type === 'VIP' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface-variant'}`}>
                          {r.seat.seatNumber}
                        </span>
                      ) : <span className="text-on-surface-variant">—</span>}
                    </td>
                    <td className="px-5 py-3 text-body-sm text-on-surface-variant whitespace-nowrap">
                      {(r.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-label-md px-2 py-0.5 rounded-full ${STATUS_CONFIG[r.status]?.className || STATUS_CONFIG.PENDING.className}`}>
                        {STATUS_CONFIG[r.status]?.label || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-40 hover:bg-surface-container-high transition text-label-lg"
          >
            ‹ Préc.
          </button>
          <span className="text-body-sm text-on-surface-variant">Page {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-40 hover:bg-surface-container-high transition text-label-lg"
          >
            Suiv. ›
          </button>
        </div>
      )}
    </>
  )
}

// ── Rapports ───────────────────────────────────────────────────────────────────
function RapportsSection({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = user.role === 'SUPER_ADMIN'
      ? getGlobalStats()
      : getCompanyStats(user.companyId)
    fetch
      .then((res) => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const kpis = [
    { label: 'Total réservations', value: stats?.totalReservations, icon: 'confirmation_number', color: 'text-primary' },
    { label: 'Réservations confirmées', value: stats?.confirmedReservations, icon: 'check_circle', color: 'text-secondary' },
    { label: 'Réservations annulées', value: stats?.cancelledReservations, icon: 'cancel', color: 'text-error' },
    { label: 'Trajets planifiés', value: stats?.totalTrips, icon: 'directions_bus', color: 'text-primary' },
    { label: 'Trajets actifs', value: stats?.activeTrips, icon: 'schedule', color: 'text-secondary' },
    { label: 'Véhicules', value: stats?.vehicles, icon: 'airport_shuttle', color: 'text-tertiary' },
  ]

  return (
    <>
      <div className="mb-6">
        <h1 className="text-headline-md text-on-surface">Rapports</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">Indicateurs de performance de votre compagnie.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {kpis.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5">
            <span className={`material-symbols-outlined ${color} mb-3 block`} style={{ fontSize: '28px' }}>{icon}</span>
            {loading ? (
              <div className="h-8 bg-surface-container rounded animate-pulse mb-1" />
            ) : (
              <p className="text-headline-sm text-on-surface mb-1">{value ?? '—'}</p>
            )}
            <p className="text-body-sm text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      {stats?.dailySales != null && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5">
          <h2 className="text-headline-sm text-on-surface mb-2">Ventes du jour</h2>
          <p className="text-display-sm text-primary font-bold">
            {stats.dailySales.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1">Paiements confirmés aujourd&apos;hui</p>
        </div>
      )}
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isAuthenticated, user } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!ADMIN_ROLES.includes(user?.role)) return <Navigate to="/" replace />

  const navLinks = [
    { key: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
    { key: 'lignes', icon: 'route', label: 'Lignes' },
    { key: 'bus', icon: 'directions_bus', label: 'Véhicules' },
    { key: 'places', icon: 'airline_seat_recline_extra', label: 'Places' },
    { key: 'horaires', icon: 'schedule', label: 'Horaires' },
    { key: 'reservations', icon: 'confirmation_number', label: 'Réservations' },
    { key: 'agents', icon: 'badge', label: 'Agents' },
    { key: 'rapports', icon: 'bar_chart', label: 'Rapports' },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-outline-variant z-40">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '18px' }}>directions_bus</span>
            </div>
            <p className="text-primary font-bold text-title-lg">Gestion Mobili</p>
          </div>
          <p className="text-body-sm text-on-surface-variant ml-11">Portail Partenaire</p>
        </div>

        {/* CTA */}
        <div className="px-4 py-4">
          <button
            onClick={() => setActiveSection('horaires')}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-label-lg hover:opacity-90 transition font-medium"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Ajouter un trajet
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {navLinks.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-body-md transition-colors text-left ${
                activeSection === key
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-outline-variant">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors text-left">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>settings</span>
            Paramètres
          </button>
          <div className="px-3 pt-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-label-lg text-primary font-bold">{user?.firstName?.[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="text-label-md text-on-surface truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-label-sm text-on-surface-variant opacity-70 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center gap-2 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '16px' }}>directions_bus</span>
        </div>
        <p className="text-primary font-bold text-title-md flex-1">Gestion Mobili</p>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant z-40 flex overflow-x-auto">
        {navLinks.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex-1 min-w-[60px] flex flex-col items-center py-2 gap-0.5 transition-colors ${
              activeSection === key ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
            <span className="text-label-sm truncate px-1">{label}</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-24 md:pb-0 px-4 md:px-8 py-8">
        {activeSection === 'dashboard' && <DashboardSection user={user} onNavigate={setActiveSection} />}
        {activeSection === 'lignes' && <LignesSection />}
        {activeSection === 'bus' && <VehiculesSection />}
        {activeSection === 'places' && <PlacesSection />}
        {activeSection === 'horaires' && <TrajetsSection />}
        {activeSection === 'reservations' && <ReservationsSection />}
        {activeSection === 'agents' && <AgentsSection />}
        {activeSection === 'rapports' && <RapportsSection user={user} />}
      </main>
    </div>
  )
}
