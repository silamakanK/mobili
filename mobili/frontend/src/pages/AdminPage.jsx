import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCompanyStats, getGlobalStats } from '../services/stats'
import { listRoutes, createRoute, deleteRoute } from '../services/routes'
import { listVehicles, createVehicle, deleteVehicle } from '../services/vehicles'
import { listCompanyTrips, createTrip, cancelTrip } from '../services/trips-admin'
import { listUsers, createAgent } from '../services/users'

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
function DashboardSection({ user }) {
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
      color: 'text-primary',
    },
    {
      icon: 'confirmation_number',
      label: 'Réservations',
      value: stats?.totalReservations ?? '—',
      color: 'text-secondary',
    },
    {
      icon: 'directions_bus',
      label: 'Trajets du jour',
      value: stats?.activeTrips ?? '—',
      color: 'text-primary',
    },
    {
      icon: user.role === 'SUPER_ADMIN' ? 'business' : 'airport_shuttle',
      label: user.role === 'SUPER_ADMIN' ? 'Compagnies' : 'Véhicules',
      value: user.role === 'SUPER_ADMIN' ? (stats?.companies ?? '—') : (stats?.vehicles ?? '—'),
      color: 'text-tertiary',
    },
  ]

  const recent = stats?.recentReservations || []

  return (
    <>
      <h1 className="text-headline-md text-on-surface mb-6">Tableau de bord</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon, label, value, color }) => (
          <div key={label} className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5">
            <span className={`material-symbols-outlined ${color} mb-3 block`} style={{ fontSize: '28px' }}>{icon}</span>
            {loading ? (
              <div className="h-8 bg-surface-container rounded animate-pulse mb-1" />
            ) : (
              <p className="text-headline-sm text-on-surface mb-1">{value}</p>
            )}
            <p className="text-body-sm text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant">
          <h2 className="text-headline-sm text-on-surface">Réservations récentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Passager</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Trajet</th>
                <th className="text-left px-5 py-3 text-label-lg text-on-surface-variant">Départ</th>
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
                    {r.trip?.route?.origin || '—'} → {r.trip?.route?.destination || '—'}
                  </td>
                  <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                    {r.trip?.departureDate ? new Date(r.trip.departureDate).toLocaleDateString('fr-FR') : '—'}
                    {r.trip?.departureTime ? ` ${r.trip.departureTime}` : ''}
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
  const [form, setForm] = useState({
    routeId: '', vehicleId: '', departureDate: '', departureTime: '06:00', price: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const tripStatusLabel = { SCHEDULED: 'Prévu', COMPLETED: 'Terminé', CANCELLED: 'Annulé' }
  const tripStatusClass = {
    SCHEDULED: 'bg-secondary-container text-on-secondary-container',
    COMPLETED: 'bg-surface-variant text-on-surface-variant',
    CANCELLED: 'bg-error-container/50 text-tertiary',
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-md text-on-surface">Trajets</h1>
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
                        {t.status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleCancel(t.id)}
                            className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                            title="Annuler le trajet"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cancel</span>
                          </button>
                        )}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
    { key: 'vehicules', icon: 'directions_bus', label: 'Véhicules' },
    { key: 'trajets', icon: 'schedule', label: 'Trajets' },
    { key: 'agents', icon: 'badge', label: 'Agents' },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-surface-container-lowest border-r border-outline-variant z-40 pt-6 pb-6">
        <div className="px-6 mb-8">
          <p className="text-primary font-bold text-headline-sm">Mobili</p>
          <p className="text-body-sm text-on-surface-variant mt-1">Administration</p>
        </div>
        <nav className="flex-1 px-3 overflow-y-auto">
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
        <div className="px-6 mt-4">
          <p className="text-label-md text-on-surface-variant truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-label-sm text-on-surface-variant opacity-70">{user?.role}</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center gap-2 px-4 py-3">
        <p className="text-primary font-bold text-headline-sm flex-1">Mobili · Admin</p>
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
        {activeSection === 'dashboard' && <DashboardSection user={user} />}
        {activeSection === 'lignes' && <LignesSection />}
        {activeSection === 'vehicules' && <VehiculesSection />}
        {activeSection === 'trajets' && <TrajetsSection />}
        {activeSection === 'agents' && <AgentsSection />}
      </main>
    </div>
  )
}
