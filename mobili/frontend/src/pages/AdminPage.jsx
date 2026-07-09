import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getCompanyStats, getGlobalStats } from '../services/stats'
import { listRoutes, createRoute, updateRoute, deleteRoute } from '../services/routes'
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/vehicles'
import { listCompanyTrips, createTrip, updateTrip, cancelTrip, getTripPassengers } from '../services/trips-admin'
import { listUsers, createAgent, updateUser } from '../services/users'
import { listCompanyReservations } from '../services/reservations'
import { listSeats, updateSeat, getTripSeats, blockTripSeat, unblockTripSeat, initVehicleSeats } from '../services/seats'
import { listRecurringTrips, createRecurringTrip, generateTrips, deleteRecurringTrip, replaceVehicle } from '../services/recurring-trips'

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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setLoading(true)
    const fetch = user.role === 'SUPER_ADMIN'
      ? getGlobalStats(selectedDate)
      : getCompanyStats(user.companyId, selectedDate)
    fetch
      .then((res) => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, selectedDate])

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
          <input
            type="date"
            value={selectedDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-body-sm text-on-surface-variant bg-transparent border-none outline-none cursor-pointer"
          />
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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ distance: '', estimatedDuration: '' })
  const [editSaving, setEditSaving] = useState(false)

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

  const startEdit = (r) => {
    setEditingId(r.id)
    setEditForm({ distance: r.distance, estimatedDuration: r.estimatedDuration })
  }

  const handleEditSave = async (id) => {
    setEditSaving(true)
    try {
      await updateRoute(id, { distance: Number(editForm.distance), estimatedDuration: Number(editForm.estimatedDuration) })
      setEditingId(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    } finally {
      setEditSaving(false)
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
                  {editingId === r.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={1}
                          value={editForm.distance}
                          onChange={(e) => setEditForm((f) => ({ ...f, distance: e.target.value }))}
                          className="w-24 border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="ml-1 text-body-sm text-on-surface-variant">km</span>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={1}
                          value={editForm.estimatedDuration}
                          onChange={(e) => setEditForm((f) => ({ ...f, estimatedDuration: e.target.value }))}
                          className="w-24 border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="ml-1 text-body-sm text-on-surface-variant">min</span>
                      </td>
                      <td className="px-3 py-2 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditSave(r.id)}
                          disabled={editSaving}
                          className="text-primary hover:bg-primary/10 p-1 rounded-lg transition disabled:opacity-50"
                          title="Enregistrer"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-on-surface-variant hover:bg-surface-container p-1 rounded-lg transition"
                          title="Annuler"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">{r.distance} km</td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">
                        {Math.floor(r.estimatedDuration / 60)}h{String(r.estimatedDuration % 60).padStart(2, '0')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => startEdit(r)}
                            className="text-on-surface-variant hover:bg-surface-container p-1 rounded-lg transition"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                            title="Désactiver"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
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
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ registrationNumber: '', type: 'BUS', totalSeats: '' })
  const [editSaving, setEditSaving] = useState(false)

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

  const startEdit = (v) => {
    setEditingId(v.id)
    setEditForm({ registrationNumber: v.registrationNumber, type: v.type, totalSeats: v.totalSeats })
  }

  const handleEditSave = async (id) => {
    setEditSaving(true)
    try {
      await updateVehicle(id, {
        registrationNumber: editForm.registrationNumber.trim().toUpperCase(),
        type: editForm.type,
        totalSeats: Number(editForm.totalSeats),
      })
      setEditingId(null)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    } finally {
      setEditSaving(false)
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
                  {editingId === v.id ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          value={editForm.registrationNumber}
                          onChange={(e) => setEditForm((f) => ({ ...f, registrationNumber: e.target.value }))}
                          className="w-36 border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-surface uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                          className="border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="BUS">Bus</option>
                          <option value="MINIBUS">Minibus</option>
                          <option value="VAN">Van</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={1} max={100}
                          value={editForm.totalSeats}
                          onChange={(e) => setEditForm((f) => ({ ...f, totalSeats: e.target.value }))}
                          className="w-20 border border-outline-variant rounded-lg px-2 py-1 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="ml-1 text-body-sm text-on-surface-variant">places</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEditSave(v.id)}
                            disabled={editSaving}
                            className="text-primary hover:bg-primary/10 p-1 rounded-lg transition disabled:opacity-50"
                            title="Enregistrer"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-on-surface-variant hover:bg-surface-container p-1 rounded-lg transition"
                            title="Annuler"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-5 py-3 text-body-md text-on-surface font-medium font-mono">{v.registrationNumber}</td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">{vehicleTypeLabel[v.type] || v.type}</td>
                      <td className="px-5 py-3 text-body-sm text-on-surface-variant">{v.totalSeats} places</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => startEdit(v)}
                            className="text-on-surface-variant hover:bg-surface-container p-1 rounded-lg transition"
                            title="Modifier"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="text-error hover:bg-error-container/30 p-1 rounded-lg transition"
                            title="Désactiver"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
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
  const [replacingTrip, setReplacingTrip] = useState(null)
  const [replaceVehicleId, setReplaceVehicleId] = useState('')
  const [replaceSaving, setReplaceSaving] = useState(false)
  const [replaceError, setReplaceError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOrigin, setFilterOrigin] = useState('')
  const [filterDestination, setFilterDestination] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [activePeriod, setActivePeriod] = useState('all')

  const load = useCallback((p = 1, opts = {}) => {
    setLoading(true)
    const params = {
      page: p,
      limit: LIMIT,
      status: opts.status ?? filterStatus || undefined,
      origin: opts.origin ?? filterOrigin || undefined,
      destination: opts.destination ?? filterDestination || undefined,
      from: opts.from ?? filterFrom || undefined,
      to: opts.to ?? filterTo || undefined,
    }
    Promise.all([
      listCompanyTrips(params),
      listRoutes({ limit: 100 }),
      listVehicles({ limit: 100 }),
    ])
      .then(([tripsRes, routesRes, vehiclesRes]) => {
        setTrips(tripsRes.data?.data?.trips || [])
        setTotal(tripsRes.data?.data?.total || 0)
        setRoutes(routesRes.data?.data?.routes || [])
        setVehicles(vehiclesRes.data?.data?.vehicles || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filterStatus, filterOrigin, filterDestination, filterFrom, filterTo])

  useEffect(() => { load(1) }, [load])

  const applyPeriod = (period) => {
    setActivePeriod(period)
    const now = new Date()
    if (period === 'all') { setFilterFrom(''); setFilterTo(''); load(1, { from: '', to: '' }); return }
    if (period === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1)
      const end = new Date(start); end.setDate(start.getDate() + 6)
      const from = start.toISOString().slice(0, 10); const to = end.toISOString().slice(0, 10)
      setFilterFrom(from); setFilterTo(to); load(1, { from, to }); return
    }
    if (period === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      setFilterFrom(from); setFilterTo(to); load(1, { from, to }); return
    }
  }

  const applyFilters = () => { setPage(1); load(1) }
  const resetFilters = () => {
    setFilterStatus(''); setFilterOrigin(''); setFilterDestination(''); setFilterFrom(''); setFilterTo(''); setActivePeriod('all')
    load(1, { status: '', origin: '', destination: '', from: '', to: '' })
  }

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
      load(page)
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur.')
    }
  }

  const handleEditOpen = (t) => {
    setEditingTrip(t)
    setEditForm({
      price: String(t.price),
      departureTime: t.departureTime,
      departureDate: t.departureDate ? new Date(t.departureDate).toISOString().slice(0, 10) : '',
    })
    setEditError('')
  }

  const handleReplaceOpen = (t) => {
    setReplacingTrip(t)
    setReplaceVehicleId('')
    setReplaceError('')
  }

  const handleReplaceSubmit = async (e) => {
    e.preventDefault()
    if (!replaceVehicleId) return
    setReplaceError('')
    setReplaceSaving(true)
    try {
      await replaceVehicle(replacingTrip.id, replaceVehicleId)
      setReplacingTrip(null)
      load(page)
    } catch (err) {
      setReplaceError(err.response?.data?.error || 'Erreur lors du remplacement.')
    } finally {
      setReplaceSaving(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSaving(true)
    try {
      await updateTrip(editingTrip.id, {
        price: Number(editForm.price),
        departureTime: editForm.departureTime,
        departureDate: editForm.departureDate,
      })
      setEditingTrip(null)
      load(page)
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

      {replacingTrip && (() => {
        const confirmed = replacingTrip.reservations?.length || 0
        const selectedVehicle = vehicles.find((v) => v.id === replaceVehicleId)
        const seatDiff = selectedVehicle ? selectedVehicle.totalSeats - (replacingTrip.vehicle?.totalSeats ?? 0) : 0
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl w-full max-w-md">
              <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                <div>
                  <h2 className="text-headline-sm text-on-surface">Remplacer le véhicule</h2>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    {replacingTrip.route?.origin} → {replacingTrip.route?.destination} · {new Date(replacingTrip.departureDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => setReplacingTrip(null)}
                  className="p-1 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                </button>
              </div>
              <form onSubmit={handleReplaceSubmit} className="p-5 space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-tertiary/10 border border-tertiary/20">
                  <span className="material-symbols-outlined text-tertiary mt-0.5" style={{ fontSize: '20px' }}>warning</span>
                  <div className="text-body-sm text-on-surface-variant">
                    <p className="font-medium text-on-surface">Véhicule actuel : {replacingTrip.vehicle?.registrationNumber ?? '—'}</p>
                    <p>{replacingTrip.vehicle?.type} · {replacingTrip.vehicle?.totalSeats ?? '?'} places · <span className="font-medium">{confirmed} réservation(s) en cours</span></p>
                  </div>
                </div>

                <div>
                  <label className="text-label-lg text-on-surface-variant block mb-1">Véhicule de remplacement</label>
                  <select
                    required
                    value={replaceVehicleId}
                    onChange={(e) => setReplaceVehicleId(e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">— Choisir un véhicule —</option>
                    {vehicles
                      .filter((v) => v.id !== replacingTrip.vehicleId && v.isActive !== false)
                      .map((v) => (
                        <option key={v.id} value={v.id} disabled={v.totalSeats < confirmed}>
                          {v.registrationNumber} · {v.type} · {v.totalSeats} places{v.totalSeats < confirmed ? ' (insuffisant)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {selectedVehicle && (
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${seatDiff >= 0 ? 'bg-primary/5 border-primary/20' : 'bg-error-container/30 border-error/20'}`}>
                    <span className={`material-symbols-outlined mt-0.5 ${seatDiff >= 0 ? 'text-primary' : 'text-error'}`} style={{ fontSize: '20px' }}>
                      {seatDiff >= 0 ? 'check_circle' : 'error'}
                    </span>
                    <div className="text-body-sm text-on-surface-variant">
                      <p>{selectedVehicle.totalSeats} places disponibles — {confirmed} réservée(s) = <span className="font-medium text-on-surface">{selectedVehicle.totalSeats - confirmed} places libres</span></p>
                      {seatDiff !== 0 && (
                        <p className="mt-0.5">
                          {seatDiff > 0 ? `+${seatDiff} places supplémentaires` : `${seatDiff} places en moins`} par rapport au véhicule actuel
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {replaceError && <ErrorMsg msg={replaceError} />}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={replaceSaving || !replaceVehicleId}
                    className="bg-tertiary text-on-tertiary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {replaceSaving ? 'Remplacement…' : 'Confirmer le remplacement'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplacingTrip(null)}
                    className="text-on-surface-variant text-label-lg hover:underline"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      })()}

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
                <label className="text-label-lg text-on-surface-variant block mb-1">Date de départ</label>
                <input
                  required
                  type="date"
                  value={editForm.departureDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, departureDate: e.target.value }))}
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

      {/* ── Filtres ─────────────────────────────────────────────────── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Origine</label>
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Toutes</option>
              {[...new Set(routes.map((r) => r.origin))].sort().map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Destination</label>
            <select
              value={filterDestination}
              onChange={(e) => setFilterDestination(e.target.value)}
              className="border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Toutes</option>
              {[...new Set(routes.map((r) => r.destination))].sort().map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Statut</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Tous</option>
              <option value="SCHEDULED">Prévu</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
          </div>
          <div>
            <label className="text-label-sm text-on-surface-variant block mb-1">Période</label>
            <div className="flex gap-1">
              {[['all', 'Tout'], ['week', 'Semaine'], ['month', 'Mois']].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => applyPeriod(k)}
                  className={`px-3 py-1.5 rounded-lg text-label-sm border transition ${activePeriod === k ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {activePeriod === 'all' && (
            <>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1">Du</label>
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-label-sm text-on-surface-variant block mb-1">Au</label>
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                  className="border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={applyFilters} className="bg-primary text-on-primary px-4 py-1.5 rounded-lg text-label-sm hover:opacity-90 transition">
              Filtrer
            </button>
            <button onClick={resetFilters} className="border border-outline-variant text-on-surface-variant px-4 py-1.5 rounded-lg text-label-sm hover:bg-surface-container transition">
              Réinitialiser
            </button>
          </div>
        </div>
        {total > 0 && (
          <p className="text-body-sm text-on-surface-variant mt-2">{total} trajet{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}</p>
        )}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card overflow-hidden">
        {loading ? <Spinner /> : trips.length === 0 ? (
          <EmptyState icon="schedule" text="Aucun trajet trouvé" />
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
                              onClick={() => handleReplaceOpen(t)}
                              className="text-tertiary hover:bg-tertiary/10 p-1 rounded-lg transition"
                              title="Remplacer le véhicule (panne)"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>directions_bus</span>
                            </button>
                          )}
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

      {/* ── Pagination ───────────────────────────────────────────────── */}
      {total > LIMIT && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-body-sm text-on-surface-variant">
            Page {page} / {Math.ceil(total / LIMIT)}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => { const p = page - 1; setPage(p); load(p) }}
              className="flex items-center gap-1 border border-outline-variant px-3 py-1.5 rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>
              Précédent
            </button>
            <button
              disabled={page >= Math.ceil(total / LIMIT) || loading}
              onClick={() => { const p = page + 1; setPage(p); load(p) }}
              className="flex items-center gap-1 border border-outline-variant px-3 py-1.5 rounded-lg text-label-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition"
            >
              Suivant
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}
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
                        <span className="text-label-md px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
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
  const [trips, setTrips] = useState([])
  const [selectedTripId, setSelectedTripId] = useState('')
  const [seats, setSeats] = useState([])
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [error, setError] = useState('')
  const [initializingSeats, setInitializingSeats] = useState(false)

  useEffect(() => {
    listCompanyTrips({ limit: 200, status: 'SCHEDULED' })
      .then((res) => {
        const t = res.data?.data?.trips || []
        setTrips(t)
        if (t.length > 0) setSelectedTripId(t[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingTrips(false))
  }, [])

  const loadSeats = useCallback((tripId) => {
    if (!tripId) return
    setLoadingSeats(true)
    setSeats([])
    getTripSeats(tripId)
      .then((res) => setSeats(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingSeats(false))
  }, [])

  useEffect(() => { loadSeats(selectedTripId) }, [selectedTripId, loadSeats])

  const handleInitSeats = async () => {
    if (!selectedTrip?.vehicle?.id) return
    setInitializingSeats(true)
    setError('')
    try {
      await initVehicleSeats(selectedTrip.vehicle.id)
      loadSeats(selectedTripId)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'initialisation.')
    } finally {
      setInitializingSeats(false)
    }
  }

  const handleToggle = async (seat) => {
    if (seat.isReserved) return
    if (!seat.isAvailable && !seat.isTripBlocked) return
    setUpdating(seat.id)
    setError('')
    try {
      if (seat.isTripBlocked) {
        await unblockTripSeat(selectedTripId, seat.id)
      } else {
        await blockTripSeat(selectedTripId, seat.id)
      }
      loadSeats(selectedTripId)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur.')
    } finally {
      setUpdating(null)
    }
  }

  const selectedTrip = trips.find((t) => t.id === selectedTripId)
  const availableCount = seats.filter((s) => s.isAvailable && !s.isReserved && !s.isTripBlocked).length
  const reservedCount = seats.filter((s) => s.isReserved).length
  const blockedCount = seats.filter((s) => s.isTripBlocked).length

  return (
    <>
      <div className="mb-6">
        <h1 className="text-headline-md text-on-surface">Places</h1>
        <p className="text-body-sm text-on-surface-variant mt-1">Gérez la disponibilité des sièges par trajet.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
        <label className="text-label-lg text-on-surface-variant block mb-2">Sélectionner un trajet</label>
        {loadingTrips ? (
          <div className="h-10 bg-surface-container rounded-lg animate-pulse w-64" />
        ) : (
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {trips.length === 0 && <option value="">Aucun trajet planifié</option>}
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {new Date(t.departureDate).toLocaleDateString('fr-FR')} · {t.departureTime?.slice(0,5)} · {t.route?.origin} → {t.route?.destination}
              </option>
            ))}
          </select>
        )}
        {selectedTrip && !loadingSeats && seats.length > 0 && (
          <div className="flex flex-wrap gap-4 mt-3 text-body-sm text-on-surface-variant">
            <span className="text-primary font-medium">{availableCount} libre{availableCount !== 1 ? 's' : ''}</span>
            <span className="text-error font-medium">{reservedCount} réservé{reservedCount !== 1 ? 's' : ''}</span>
            {blockedCount > 0 && <span className="text-on-surface-variant font-medium">{blockedCount} bloqué{blockedCount !== 1 ? 's' : ''} manuellement</span>}
          </div>
        )}
      </div>

      {selectedTripId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5">
          <h2 className="text-headline-sm text-on-surface mb-4">Disposition des sièges</h2>
          {loadingSeats ? (
            <Spinner />
          ) : seats.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '40px' }}>airline_seat_recline_extra</span>
              <p className="text-body-md text-on-surface-variant">Aucun siège configuré pour ce véhicule</p>
              {selectedTrip?.vehicle?.totalSeats > 0 && (
                <button
                  onClick={handleInitSeats}
                  disabled={initializingSeats}
                  className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-xl text-label-lg hover:opacity-90 disabled:opacity-50 transition"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_fix_high</span>
                  {initializingSeats ? 'Création…' : `Créer les ${selectedTrip.vehicle.totalSeats} sièges automatiquement`}
                </button>
              )}
              {error && <ErrorMsg msg={error} />}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 mb-5 text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-secondary-container inline-block" />
                  Disponible
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-error/80 inline-block" />
                  Réservé
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-surface-variant border border-outline-variant inline-block" />
                  Bloqué (ce trajet)
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {seats.map((seat) => {
                  const isReserved = seat.isReserved
                  const isTripBlocked = seat.isTripBlocked
                  const isBroken = !seat.isAvailable && !isReserved && !isTripBlocked
                  const canToggle = !isReserved && !isBroken
                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleToggle(seat)}
                      disabled={updating === seat.id || !canToggle}
                      title={
                        isReserved ? `Siège ${seat.seatNumber} — Réservé`
                        : isTripBlocked ? `Siège ${seat.seatNumber} — Bloqué pour ce trajet (clic pour libérer)`
                        : isBroken ? `Siège ${seat.seatNumber} — Hors service`
                        : `Siège ${seat.seatNumber} — Disponible (clic pour bloquer)`
                      }
                      className={`
                        flex flex-col items-center justify-center rounded-lg py-2 px-1 border transition text-label-sm font-medium gap-0.5
                        ${isReserved ? 'bg-error/80 text-on-primary border-error cursor-default'
                          : isTripBlocked ? 'bg-surface-variant text-on-surface-variant border-outline-variant hover:opacity-75 cursor-pointer'
                          : isBroken ? 'bg-error-container/20 text-error/50 border-error/20 cursor-default'
                          : 'bg-secondary-container text-on-secondary-container border-secondary/30 hover:opacity-75 cursor-pointer'
                        }
                        ${updating === seat.id ? 'opacity-40' : ''}
                      `}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
                        {isReserved ? 'person' : isTripBlocked ? 'block' : 'airline_seat_recline_extra'}
                      </span>
                      <span>{seat.seatNumber}</span>
                    </button>
                  )
                })}
              </div>
              {error && <ErrorMsg msg={error} />}
              <p className="text-body-sm text-on-surface-variant mt-4">
                Cliquez sur un siège disponible pour le bloquer pour ce trajet uniquement.
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
const PERIODS = [
  { key: 'daily', label: "Aujourd'hui" },
  { key: 'monthly', label: 'Ce mois' },
  { key: 'annual', label: 'Cette année' },
]

function RapportsSection({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('monthly')

  useEffect(() => {
    setLoading(true)
    const params = { period }
    const req = user.role === 'SUPER_ADMIN'
      ? getGlobalStats(params)
      : getCompanyStats(user.companyId, params)
    req
      .then((res) => setStats(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, period])

  const kpis = [
    { label: 'Total réservations', value: stats?.totalReservations, icon: 'confirmation_number', color: 'text-primary' },
    { label: 'Réservations confirmées', value: stats?.confirmedReservations, icon: 'check_circle', color: 'text-secondary' },
    { label: 'Réservations annulées', value: stats?.cancelledReservations, icon: 'cancel', color: 'text-error' },
    { label: 'Trajets planifiés', value: stats?.totalTrips, icon: 'directions_bus', color: 'text-primary' },
    { label: 'Trajets actifs', value: stats?.activeTrips, icon: 'schedule', color: 'text-secondary' },
    { label: 'Véhicules', value: stats?.vehicles, icon: 'airport_shuttle', color: 'text-tertiary' },
  ]

  const rates = [
    { label: 'Succès paiement', value: stats?.paymentSuccessRate != null ? `${stats.paymentSuccessRate}%` : null, icon: 'payments', color: 'text-secondary' },
    { label: "Taux d'annulation", value: stats?.cancellationRate != null ? `${stats.cancellationRate}%` : null, icon: 'cancel', color: 'text-error' },
    { label: 'Taux de remplissage', value: stats?.fillRate != null ? `${stats.fillRate}%` : null, icon: 'event_seat', color: 'text-tertiary' },
  ]

  const revenueLabel = period === 'daily' ? "Paiements confirmés aujourd'hui" : period === 'monthly' ? 'Paiements confirmés ce mois' : 'Paiements confirmés cette année'

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md text-on-surface">Rapports</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Indicateurs de performance de votre compagnie.</p>
        </div>
        <div className="flex gap-2 sm:ml-auto flex-wrap">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-colors ${
                period === key
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {stats?.dailySales != null && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5 mb-6">
          <h2 className="text-title-sm text-on-surface-variant mb-1">Chiffre d&apos;affaires</h2>
          <p className="text-display-sm text-primary font-bold">
            {(stats.dailySales || 0).toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-body-sm text-on-surface-variant mt-1">{revenueLabel}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {rates.map(({ label, value, icon, color }) => (
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

      {stats?.topRoutes?.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-card p-5">
          <h2 className="text-headline-sm text-on-surface mb-4">Top lignes</h2>
          <div className="space-y-3">
            {stats.topRoutes.map((route, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-label-sm flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                <span className="flex-1 text-body-md text-on-surface truncate">{route.label}</span>
                <span className="text-label-md text-on-surface-variant shrink-0">{route.count} rés.</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Trajets Récurrents ─────────────────────────────────────────────────────────
const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function RecurringTripsSection({ user }) {
  const [templates, setTemplates] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ routeId: '', vehicleId: '', dayOfWeek: '1', departureTime: '08:00', price: '', validFrom: '' })
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, rRes, vRes] = await Promise.all([
        listRecurringTrips(user.companyId),
        listRoutes(),
        listVehicles(),
      ])
      setTemplates(tRes.data?.data || [])
      setRoutes(rRes.data?.data || [])
      setVehicles(vRes.data?.data || [])
    } catch {
      setError('Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }, [user.companyId])

  useEffect(() => { load() }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await createRecurringTrip({
        ...form,
        dayOfWeek: parseInt(form.dayOfWeek, 10),
        price: parseInt(form.price, 10),
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
      })
      setShowForm(false)
      setForm({ routeId: '', vehicleId: '', dayOfWeek: '1', departureTime: '08:00', price: '', validFrom: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerate(id) {
    setGenerating(id)
    setError(null)
    try {
      const res = await generateTrips(id, 4)
      const created = res.data?.data?.created ?? 0
      alert(`${created} trajet(s) généré(s) pour les 4 prochaines semaines.`)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la génération.')
    } finally {
      setGenerating(null)
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('Désactiver ce modèle de trajet récurrent ?')) return
    try {
      await deleteRecurringTrip(id)
      load()
    } catch {
      setError('Erreur lors de la désactivation.')
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md text-on-surface">Trajets récurrents</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Modèles de trajets générés automatiquement chaque semaine.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-label-lg hover:opacity-90 transition font-medium sm:ml-auto"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Annuler' : 'Nouveau modèle'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container/20 border border-error/30 rounded-xl text-error text-body-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h2 className="text-title-md text-on-surface col-span-full">Nouveau modèle de trajet récurrent</h2>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Ligne</label>
            <select
              required
              value={form.routeId}
              onChange={(e) => setForm((f) => ({ ...f, routeId: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            >
              <option value="">Sélectionner une ligne</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Véhicule</label>
            <select
              required
              value={form.vehicleId}
              onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            >
              <option value="">Sélectionner un véhicule</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>{v.registrationNumber} ({v.totalSeats} places)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Jour de la semaine</label>
            <select
              value={form.dayOfWeek}
              onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            >
              {DAY_LABELS.map((label, i) => (
                <option key={i} value={String(i)}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Heure de départ</label>
            <input
              type="time"
              required
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            />
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Prix (FCFA)</label>
            <input
              type="number"
              required
              min="0"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="ex : 15000"
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            />
          </div>
          <div>
            <label className="text-label-md text-on-surface-variant mb-1 block">Valide à partir du (optionnel)</label>
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-md bg-surface text-on-surface"
            />
          </div>
          <div className="col-span-full flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-label-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition">
              Annuler
            </button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg hover:opacity-90 transition disabled:opacity-50">
              {submitting ? 'Création…' : 'Créer le modèle'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Spinner />
      ) : templates.length === 0 ? (
        <EmptyState icon="repeat" text="Aucun modèle de trajet récurrent." />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-title-sm text-on-surface font-medium">
                  {t.route?.origin ?? '?'} → {t.route?.destination ?? '?'}
                </p>
                <p className="text-body-sm text-on-surface-variant mt-0.5">
                  {DAY_LABELS[t.dayOfWeek]} à {t.departureTime} · {t.vehicle?.registrationNumber ?? '?'} · {(t.price ?? 0).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">
                  {t._count?.trips ?? 0} trajet(s) généré(s) ·{' '}
                  {t.isActive
                    ? <span className="text-secondary">Actif</span>
                    : <span className="text-error">Inactif</span>}
                </p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => handleGenerate(t.id)}
                  disabled={generating === t.id || !t.isActive}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-label-md hover:bg-primary/20 transition disabled:opacity-40"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                  {generating === t.id ? 'Génération…' : 'Générer 4 sem.'}
                </button>
                {t.isActive && (
                  <button
                    onClick={() => handleDeactivate(t.id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-error/10 text-error text-label-md hover:bg-error/20 transition"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>block</span>
                    Désactiver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isAuthenticated, user, logout } = useAuth()
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
    { key: 'trajets-recurrents', icon: 'repeat', label: 'Trajets récurrents' },
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
          <div className="px-3 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-label-lg text-primary font-bold">{user?.firstName?.[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="text-label-md text-on-surface truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-label-sm text-on-surface-variant opacity-70 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md text-error hover:bg-error-container/20 transition-colors text-left"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-surface-container-lowest border-b border-outline-variant z-40 flex items-center gap-2 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '16px' }}>directions_bus</span>
        </div>
        <p className="text-primary font-bold text-title-md flex-1">Gestion Mobili</p>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-error hover:bg-error-container/20 px-2 py-1 rounded-lg transition-colors"
          title="Se déconnecter"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span>
        </button>
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
        {activeSection === 'trajets-recurrents' && <RecurringTripsSection user={user} />}
      </main>
    </div>
  )
}
