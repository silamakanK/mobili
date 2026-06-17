import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getTripById } from '../services/trips'

function buildSeatGrid(seats) {
  if (!seats || seats.length === 0) {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i + 1,
      seatNumber: i + 1,
      isAvailable: true,
    }))
  }
  return seats
}

export default function SeatSelectionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tripId = params.get('tripId')

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    getTripById(tripId)
      .then((res) => setTrip(res.data?.data || res.data))
      .catch(() => setError('Impossible de charger ce trajet.'))
      .finally(() => setLoading(false))
  }, [tripId])

  const seats = buildSeatGrid(trip?.seats)

  function toggleSeat(seat) {
    if (!seat.isAvailable) return
    setSelected((prev) =>
      prev.includes(seat.seatNumber)
        ? prev.filter((n) => n !== seat.seatNumber)
        : [...prev, seat.seatNumber]
    )
  }

  function handleContinue() {
    navigate(`/payment?tripId=${tripId}&seats=${selected.join(',')}`)
  }

  const totalPrice = (trip?.price || 0) * selected.length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-error-container text-on-error-container rounded-xl p-6 text-center">
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>error</span>
            <p className="text-body-lg mt-2">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const rows = []
  for (let i = 0; i < seats.length; i += 4) {
    rows.push(seats.slice(i, i + 4))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-32">
      <Navbar />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {/* Trip summary */}
        {trip && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-label-lg shrink-0">
              {(trip.company?.name || 'XX').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-label-lg text-on-surface-variant">{trip.company?.name}</p>
              <p className="text-headline-sm text-on-surface">
                {trip.route?.origin || trip.origin} → {trip.route?.destination || trip.destination}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {trip.departureTime} · {trip.departureDate ? new Date(trip.departureDate).toLocaleDateString('fr-FR') : ''}
              </p>
            </div>
            <p className="text-headline-sm text-on-surface shrink-0">
              {(trip.price || 0).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        )}

        <h2 className="text-headline-sm text-on-surface mb-2">Choisissez votre siège</h2>
        <p className="text-body-sm text-on-surface-variant mb-6">
          Cliquez sur un siège libre pour le sélectionner.
        </p>

        {/* Bus plan */}
        <div className="max-w-[320px] mx-auto bg-surface-container-lowest border-2 border-outline-variant rounded-t-[3rem] rounded-b-xl pt-8 pb-4 px-6">
          {/* Driver row */}
          <div className="flex justify-end mb-6">
            <div className="w-11 h-11 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center cursor-not-allowed">
              <span className="material-symbols-outlined text-outline" style={{ fontSize: '18px' }}>steering</span>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, ri) => (
              <div key={ri} className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 40px 1fr 1fr' }}>
                {row.slice(0, 2).map((seat) => {
                  const isSelected = selected.includes(seat.seatNumber)
                  return (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat)}
                      disabled={!seat.isAvailable}
                      className={`w-11 h-11 rounded-lg text-label-md font-medium transition-colors relative ${
                        !seat.isAvailable
                          ? 'bg-surface-variant text-outline cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-on-primary border border-primary'
                          : 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {!seat.isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </span>
                      )}
                      {seat.isAvailable && seat.seatNumber}
                    </button>
                  )
                })}
                {/* Aisle */}
                <div className="w-10" />
                {row.slice(2, 4).map((seat) => {
                  const isSelected = selected.includes(seat.seatNumber)
                  return (
                    <button
                      key={seat.id}
                      onClick={() => toggleSeat(seat)}
                      disabled={!seat.isAvailable}
                      className={`w-11 h-11 rounded-lg text-label-md font-medium transition-colors relative ${
                        !seat.isAvailable
                          ? 'bg-surface-variant text-outline cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-on-primary border border-primary'
                          : 'bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {!seat.isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </span>
                      )}
                      {seat.isAvailable && seat.seatNumber}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-surface-container border border-outline-variant" />
            <span className="text-body-sm text-on-surface-variant">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-surface-variant border border-outline-variant" />
            <span className="text-body-sm text-on-surface-variant">Occupé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary" />
            <span className="text-body-sm text-on-surface-variant">Sélectionné</span>
          </div>
        </div>
      </main>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest border-t border-outline-variant px-4 py-4 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-body-sm text-on-surface-variant">
              {selected.length > 0
                ? `Siège${selected.length > 1 ? 's' : ''} ${selected.join(', ')}`
                : 'Aucun siège sélectionné'}
            </p>
            <p className="text-headline-sm text-on-surface">
              {totalPrice.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <button
            onClick={handleContinue}
            disabled={selected.length === 0}
            className={`bg-primary text-on-primary h-14 px-8 rounded-lg text-label-lg font-semibold transition-colors ${
              selected.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary-container'
            }`}
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  )
}
