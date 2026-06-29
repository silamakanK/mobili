import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getTripById } from '../services/trips'
import { createReservation, getReservationById } from '../services/reservations'
import { initiatePayment, simulateWebhook } from '../services/payments'

export default function PaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // Mode 1: depuis SeatSelectionPage
  const tripId = params.get('tripId')
  const seatIdsParam = params.get('seatIds') // "id1,id2"
  const seatNumbersParam = params.get('seatNumbers') // "01,02"

  // Mode 2: depuis Dashboard "Payer"
  const reservationIdParam = params.get('reservationId')

  const seatIds = seatIdsParam ? seatIdsParam.split(',').filter(Boolean) : []
  const seatNumbers = seatNumbersParam ? seatNumbersParam.split(',').filter(Boolean) : []

  const [trip, setTrip] = useState(null)
  const [reservation, setReservation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (reservationIdParam) {
      getReservationById(reservationIdParam)
        .then((res) => {
          const r = res.data?.data || res.data
          setReservation(r)
          setTrip(r.trip)
        })
        .catch(() => setError('Impossible de charger cette réservation.'))
        .finally(() => setLoading(false))
    } else if (tripId) {
      getTripById(tripId)
        .then((res) => setTrip(res.data?.data || res.data))
        .catch(() => setError('Impossible de charger ce trajet.'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
      setError('Paramètres de paiement manquants.')
    }
  }, [tripId, reservationIdParam])

  const pricePerSeat = trip?.price || reservation?.totalAmount || 0
  const seatCount = reservation ? 1 : seatIds.length || 1
  const totalAmount = reservation ? reservation.totalAmount : pricePerSeat * seatCount
  const displaySeatNumbers = reservation
    ? [reservation.seat?.seatNumber].filter(Boolean)
    : seatNumbers

  async function handlePay() {
    if (submitting) return
    setSubmitting(true)
    setError(null)

    try {
      let reservationIds

      if (reservationIdParam) {
        reservationIds = [reservationIdParam]
      } else {
        const created = []
        for (const seatId of seatIds) {
          const res = await createReservation({ tripId, seatId })
          const r = res.data?.data || res.data
          created.push(r.id)
        }
        reservationIds = created
      }

      const payRes = await initiatePayment({ reservationIds })
      const payment = payRes.data?.data || payRes.data

      if (payment?.redirectUrl) {
        sessionStorage.setItem('pendingPaymentId', payment.paymentId)
        window.location.assign(payment.redirectUrl)
        return
      }

      // Mode simulation (aucun provider configuré)
      const codes = payment?.reservationCodes || []
      for (let i = 0; i < codes.length; i++) {
        await simulateWebhook({
          reservationCode: codes[i],
          transactionId: i === 0 ? `SIM-${Date.now()}` : undefined,
          status: 'success',
        })
      }

      if (reservationIds.length > 0) {
        const updatedRes = await getReservationById(reservationIds[0])
        const updated = updatedRes.data?.data || updatedRes.data
        navigate(updated?.ticket?.id ? `/ticket/${updated.ticket.id}` : '/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.message
        || err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || 'Une erreur est survenue. Veuillez réessayer.'
      setError(msg)
      setSubmitting(false)
    }
  }

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

  const origin = trip?.route?.origin || trip?.origin || '—'
  const destination = trip?.route?.destination || trip?.destination || '—'
  const companyName = trip?.route?.company?.name || trip?.company?.name || '—'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <h1 className="text-headline-md text-on-surface mb-6">Finaliser la réservation</h1>

        {/* Récapitulatif */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
          <p className="text-label-lg text-on-surface-variant mb-4">Récapitulatif</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body-md text-on-surface-variant">Trajet</span>
              <span className="text-body-md text-on-surface font-medium">{origin} → {destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-md text-on-surface-variant">Compagnie</span>
              <span className="text-body-md text-on-surface">{companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-md text-on-surface-variant">Départ</span>
              <span className="text-body-md text-on-surface">
                {trip?.departureTime || '—'}
                {trip?.departureDate ? ` · ${new Date(trip.departureDate).toLocaleDateString('fr-FR')}` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body-md text-on-surface-variant">
                {seatCount > 1 ? `Sièges (${seatCount})` : 'Siège'}
              </span>
              <span className="text-body-md text-on-surface">
                {displaySeatNumbers.length > 0 ? displaySeatNumbers.join(', ') : '—'}
              </span>
            </div>
            {seatCount > 1 && (
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant">Prix par siège</span>
                <span className="text-body-md text-on-surface">{pricePerSeat.toLocaleString('fr-FR')} FCFA</span>
              </div>
            )}
            <div className="border-t border-outline-variant pt-3 mt-3 flex justify-between items-baseline">
              <span className="text-label-lg text-on-surface">Total</span>
              <span className="text-headline-sm text-on-surface">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>

        {/* Badge sécurité Stripe */}
        <div className="flex items-center justify-center gap-2 bg-surface-container-low rounded-full px-5 py-2 mb-6 w-fit mx-auto">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>lock</span>
          <span className="text-body-sm text-on-surface-variant">Paiement sécurisé via Stripe</span>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
            <p className="text-body-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={submitting || (!reservationIdParam && seatIds.length === 0)}
          className="w-full bg-primary text-on-primary text-headline-sm py-4 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
              <span>Redirection vers Stripe…</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>payment</span>
              Payer {totalAmount.toLocaleString('fr-FR')} FCFA
            </>
          )}
        </button>
      </main>
    </div>
  )
}
