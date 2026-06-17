import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getTripById } from '../services/trips'
import { createReservation } from '../services/reservations'
import { initiatePayment } from '../services/payments'

const PAYMENT_METHODS = [
  { id: 'ORANGE_MONEY', label: 'Orange Money', icon: 'phone_iphone' },
  { id: 'WAVE', label: 'Wave', icon: 'waves' },
  { id: 'MOOV_MONEY', label: 'Moov Money', icon: 'smartphone' },
  { id: 'CARD', label: 'Carte Bancaire', icon: 'credit_card' },
]

export default function PaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const tripId = params.get('tripId')
  const seatParams = params.get('seats') || ''
  const seats = seatParams.split(',').filter(Boolean).map(Number)

  const [trip, setTrip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('ORANGE_MONEY')

  useEffect(() => {
    if (!tripId) { setLoading(false); return }
    getTripById(tripId)
      .then((res) => setTrip(res.data?.data || res.data))
      .catch(() => setError('Impossible de charger ce trajet.'))
      .finally(() => setLoading(false))
  }, [tripId])

  const totalPrice = (trip?.price || 0) * seats.length

  async function handlePay() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const reservationRes = await createReservation({
        tripId,
        seatNumbers: seats,
        totalAmount: totalPrice,
      })
      const reservation = reservationRes.data?.data || reservationRes.data
      const paymentRes = await initiatePayment({
        reservationId: reservation.id,
        method: paymentMethod,
        amount: totalPrice,
      })
      const payment = paymentRes.data?.data || paymentRes.data
      if (payment?.redirectUrl) {
        window.location.href = payment.redirectUrl
      } else if (payment?.ticketId || reservation?.ticketId) {
        navigate(`/ticket/${payment?.ticketId || reservation?.ticketId}`)
      } else {
        navigate(`/ticket/${reservation?.id}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.')
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <h1 className="text-headline-md text-on-surface mb-6">Finaliser la réservation</h1>

        {/* Reservation summary */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
          <p className="text-label-lg text-on-surface-variant mb-3">Récapitulatif</p>
          {trip && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant">Trajet</span>
                <span className="text-body-md text-on-surface">
                  {trip.route?.origin || trip.origin} → {trip.route?.destination || trip.destination}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant">Départ</span>
                <span className="text-body-md text-on-surface">
                  {trip.departureTime} · {trip.departureDate ? new Date(trip.departureDate).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant">Siège{seats.length > 1 ? 's' : ''}</span>
                <span className="text-body-md text-on-surface">{seats.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body-md text-on-surface-variant">Compagnie</span>
                <span className="text-body-md text-on-surface">{trip.company?.name}</span>
              </div>
              <div className="border-t border-outline-variant pt-2 mt-2 flex justify-between">
                <span className="text-label-lg text-on-surface">Total</span>
                <span className="text-headline-sm text-on-surface">{totalPrice.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6">
          <p className="text-label-lg text-on-surface-variant mb-4">Mode de paiement</p>
          <div className="space-y-3">
            {PAYMENT_METHODS.map(({ id, label, icon }) => (
              <label
                key={id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === id
                    ? 'border-primary shadow-[inset_0_0_0_1px_#00503a] bg-primary-fixed/10'
                    : 'border-outline-variant hover:border-outline'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={id}
                  checked={paymentMethod === id}
                  onChange={() => setPaymentMethod(id)}
                  className="sr-only"
                />
                <span className="material-symbols-outlined text-primary">{icon}</span>
                <span className="text-body-md text-on-surface flex-1">{label}</span>
                {paymentMethod === id && (
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>check_circle</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 bg-surface-container-low rounded-full px-4 py-2 mb-6 w-fit mx-auto">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: '18px' }}>lock</span>
          <span className="text-body-sm text-on-surface-variant">Paiement sécurisé par cryptage SSL</span>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span>
            <p className="text-body-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={submitting}
          className="w-full bg-primary text-on-primary text-headline-sm py-4 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>payment</span>
              Payer maintenant ({totalPrice.toLocaleString('fr-FR')} FCFA)
            </>
          )}
        </button>
      </main>
    </div>
  )
}
