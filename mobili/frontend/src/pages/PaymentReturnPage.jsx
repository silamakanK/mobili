import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getPaymentStatus } from '../services/payments'
import { getReservationById } from '../services/reservations'

const MAX_POLLS = 20
const POLL_INTERVAL_MS = 2000

export default function PaymentReturnPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)
  const [tickets, setTickets] = useState([]) // { ticketId, reservationCode, seatNumber }
  const pollCount = useRef(0)
  const timerId = useRef(null)

  useEffect(() => {
    const paymentId = sessionStorage.getItem('pendingPaymentId')
    const reservationIds = JSON.parse(sessionStorage.getItem('pendingReservationIds') || '[]')

    if (!paymentId) {
      setStatus('failed')
      setError('Aucun paiement en attente trouvé.')
      return
    }

    async function fetchAllTickets(ids) {
      const results = await Promise.all(ids.map((id) => getReservationById(id).catch(() => null)))
      return results
        .map((r) => {
          const res = r?.data?.data || r?.data
          return {
            ticketId: res?.ticket?.id,
            reservationCode: res?.reservationCode,
            seatNumber: res?.seat?.seatNumber,
            origin: res?.trip?.route?.origin,
            destination: res?.trip?.route?.destination,
          }
        })
        .filter((t) => t.ticketId)
    }

    async function poll() {
      try {
        const res = await getPaymentStatus(paymentId)
        const payment = res.data?.data || res.data

        if (payment.status === 'CONFIRMED') {
          sessionStorage.removeItem('pendingPaymentId')
          sessionStorage.removeItem('pendingReservationIds')

          if (reservationIds.length > 1) {
            // Multi-sièges : récupère tous les billets
            const allTickets = await fetchAllTickets(reservationIds)
            setTickets(allTickets)
            setStatus('confirmed-multi')
          } else {
            setStatus('confirmed')
            const ticketId = payment.reservation?.ticket?.id
            setTimeout(() => navigate(ticketId ? `/ticket/${ticketId}` : '/dashboard'), 1500)
          }
          return
        }

        if (payment.status === 'FAILED') {
          sessionStorage.removeItem('pendingPaymentId')
          sessionStorage.removeItem('pendingReservationIds')
          setStatus('failed')
          setError('Le paiement a échoué. Veuillez réessayer.')
          return
        }

        pollCount.current += 1
        if (pollCount.current >= MAX_POLLS) { setStatus('timeout'); return }
        timerId.current = setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (err.response?.status === 401) { navigate('/login'); return }
        setStatus('failed')
        setError('Erreur lors de la vérification du paiement.')
      }
    }

    poll()
    return () => clearTimeout(timerId.current)
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">

          {status === 'checking' && (
            <>
              <div className="animate-spin w-14 h-14 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
              <h1 className="text-headline-md text-on-surface mb-2">Vérification du paiement…</h1>
              <p className="text-body-md text-on-surface-variant">
                Nous confirmons votre paiement. Veuillez patienter.
              </p>
            </>
          )}

          {status === 'confirmed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>check_circle</span>
              </div>
              <h1 className="text-headline-md text-on-surface mb-2">Paiement confirmé !</h1>
              <p className="text-body-md text-on-surface-variant">Votre billet est prêt. Redirection en cours…</p>
            </>
          )}

          {status === 'confirmed-multi' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>check_circle</span>
              </div>
              <h1 className="text-headline-md text-on-surface mb-3">Paiement confirmé !</h1>
              <p className="text-body-md text-on-surface-variant mb-6">
                {tickets.length} billet{tickets.length > 1 ? 's' : ''} généré{tickets.length > 1 ? 's' : ''} avec succès.
              </p>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-6 text-left">
                {tickets.map((t, i) => (
                  <div
                    key={t.ticketId}
                    className={`flex items-center justify-between px-5 py-4 ${i < tickets.length - 1 ? 'border-b border-outline-variant' : ''}`}
                  >
                    <div>
                      <p className="text-body-md text-on-surface font-medium">
                        {t.origin && t.destination ? `${t.origin} → ${t.destination}` : `Billet ${i + 1}`}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        Siège {t.seatNumber || '—'} · #{t.reservationCode}
                      </p>
                    </div>
                    <Link
                      to={`/ticket/${t.ticketId}`}
                      className="flex items-center gap-1.5 bg-primary text-on-primary text-label-md px-4 py-2 rounded-lg hover:opacity-90 transition shrink-0"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>receipt</span>
                      Voir
                    </Link>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="text-on-surface-variant text-label-lg hover:underline"
              >
                Retour à mes réservations
              </button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-on-error-container" style={{ fontSize: '40px' }}>cancel</span>
              </div>
              <h1 className="text-headline-md text-on-surface mb-2">Paiement échoué</h1>
              <p className="text-body-md text-on-surface-variant mb-6">
                {error || 'Le paiement n\'a pas pu être traité.'}
              </p>
              <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary px-6 py-3 rounded-xl text-body-lg">
                Retour au tableau de bord
              </button>
            </>
          )}

          {status === 'timeout' && (
            <>
              <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontSize: '40px' }}>hourglass_empty</span>
              </div>
              <h1 className="text-headline-md text-on-surface mb-2">Confirmation en attente</h1>
              <p className="text-body-md text-on-surface-variant mb-6">
                La confirmation n'est pas encore arrivée. Si vous avez payé,
                vos billets apparaîtront sous quelques minutes dans votre espace personnel.
              </p>
              <button onClick={() => navigate('/dashboard')} className="bg-primary text-on-primary px-6 py-3 rounded-xl text-body-lg">
                Voir mes réservations
              </button>
            </>
          )}

        </div>
      </main>
    </div>
  )
}
