import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import Navbar from '../components/Navbar'
import { getTicket } from '../services/tickets'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function ETicketPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    getTicket(id)
      .then((res) => {
        const data = res.data?.data || res.data
        setTicket(data)
        if (data?.qrCode) {
          QRCode.toDataURL(data.qrCode, { width: 200, margin: 1 }).then(setQrDataUrl)
        }
      })
      .catch(() => setError('Impossible de charger votre billet.'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDownload() {
    setDownloading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/tickets/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur téléchargement')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `billet-${ticket?.ticketCode || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Impossible de télécharger le billet.')
    } finally {
      setDownloading(false)
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

  const reservation = ticket?.reservation
  const trip = reservation?.trip
  const origin = trip?.route?.origin || trip?.origin || '—'
  const destination = trip?.route?.destination || trip?.destination || '—'
  const originCode = origin.slice(0, 3).toUpperCase()
  const destCode = destination.slice(0, 3).toUpperCase()

  return (
    <div className="min-h-screen bg-background flex flex-col pb-8">
      <Navbar />

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '64px' }}>check_circle</span>
          <h1 className="text-headline-md text-on-surface mt-3 mb-1">Réservation confirmée !</h1>
          <p className="text-body-md text-on-surface-variant">Votre billet a été généré avec succès.</p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-card mb-6">
          <div className="bg-primary text-on-primary px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-md opacity-80">Compagnie</p>
                <p className="text-headline-sm">{trip?.route?.company?.name || trip?.company?.name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-label-md opacity-80">Réf. billet</p>
                <p className="text-label-lg font-mono">{ticket?.ticketCode || id}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-outline-variant">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-headline-lg text-on-surface">{originCode}</p>
                <p className="text-body-sm text-on-surface-variant">{origin}</p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center w-full gap-1">
                  <div className="h-px flex-1 bg-outline-variant" />
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>directions_bus</span>
                  <div className="h-px flex-1 bg-outline-variant" />
                </div>
                {trip?.departureTime && (
                  <p className="text-body-sm text-on-surface-variant">{trip.departureTime}</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-headline-lg text-on-surface">{destCode}</p>
                <p className="text-body-sm text-on-surface-variant">{destination}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-dashed border-outline-variant">
            <div>
              <p className="text-label-md text-on-surface-variant">Passager</p>
              <p className="text-body-md text-on-surface">
                {reservation?.user ? `${reservation.user.firstName} ${reservation.user.lastName}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant">Siège</p>
              <p className="text-body-md text-on-surface">{reservation?.seat?.seatNumber || '—'}</p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant">Date</p>
              <p className="text-body-md text-on-surface">
                {trip?.departureDate ? new Date(trip.departureDate).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
            <div>
              <p className="text-label-md text-on-surface-variant">Prix payé</p>
              <p className="text-body-md text-on-surface">
                {(reservation?.totalAmount || 0).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          <div className="px-6 py-5 flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code du billet"
                className="w-48 h-48 bg-white p-2 rounded-lg border border-outline-variant"
              />
            ) : (
              <div className="w-48 h-48 bg-surface-container border border-outline-variant rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-outline" style={{ fontSize: '64px' }}>qr_code_2</span>
              </div>
            )}
            <p className="text-label-lg font-mono text-on-surface-variant mt-3 tracking-widest">
              {ticket?.ticketCode || id}
            </p>
            <p className="text-label-md text-on-surface-variant mt-1">Code de secours</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-primary text-on-primary py-4 rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-60"
          >
            {downloading ? (
              <span className="animate-spin w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full" />
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                Télécharger le billet (PDF)
              </>
            )}
          </button>
          <Link
            to="/dashboard"
            className="w-full border border-outline-variant text-on-surface py-4 rounded-xl text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>confirmation_number</span>
            Voir mes réservations
          </Link>
        </div>
      </main>
    </div>
  )
}
