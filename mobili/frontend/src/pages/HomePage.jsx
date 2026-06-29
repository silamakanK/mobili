import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'

const VILLES = [
  'Bamako', 'Ségou', 'Kayes', 'Sikasso', 'Mopti',
  'Gao', 'Tombouctou', 'Koutiala', 'Kati', 'San',
]

const HOW_IT_WORKS = [
  {
    icon: 'search',
    title: 'Recherchez',
    desc: 'Indiquez votre départ, destination et date de voyage parmi nos destinations.',
  },
  {
    icon: 'event_seat',
    title: 'Réservez',
    desc: 'Choisissez votre siège et payez en toute sécurité via Orange Money, Wave ou carte.',
  },
  {
    icon: 'directions_bus',
    title: 'Voyagez',
    desc: 'Présentez votre e-ticket QR code à l\'embarquement. Bon voyage !',
  },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    if (!from || !to) return
    const q = new URLSearchParams({ from, to })
    if (date) q.set('date', date)
    navigate(`/search?${q.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Hero */}
        <section className="bg-surface-container-low border-b border-outline-variant px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-headline-lg-mobile md:text-headline-xl text-on-surface mb-3">
              Voyagez au Mali, simplement.
            </h1>
            <p className="text-body-lg text-on-surface-variant mb-8">
              Recherchez, réservez et payez votre billet de bus en quelques minutes. Disponible sur tous les grands axes.
            </p>

            <form onSubmit={handleSearch} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-6 shadow-card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-label-lg text-on-surface-variant mb-1">Départ</label>
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    required
                    className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
                  >
                    <option value="">Choisir une ville</option>
                    {VILLES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-label-lg text-on-surface-variant mb-1">Arrivée</label>
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    required
                    className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
                  >
                    <option value="">Choisir une ville</option>
                    {VILLES.filter((v) => v !== from).map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-label-lg text-on-surface-variant mb-1">
                    Date <span className="text-body-sm text-on-surface-variant font-normal">(optionnelle)</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim font-semibold py-3 rounded-lg text-body-md transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                Rechercher un trajet
              </button>
            </form>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-headline-md text-on-surface mb-2 text-center">Comment ça marche ?</h2>
          <p className="text-body-md text-on-surface-variant text-center mb-10">
            Réservez votre billet en 3 étapes simples
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-card flex flex-col items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary-fixed">{icon}</span>
                </div>
                <div>
                  <span className="text-label-md text-on-surface-variant">Étape {i + 1}</span>
                  <h3 className="text-headline-sm text-on-surface mt-1 mb-2">{title}</h3>
                  <p className="text-body-sm text-on-surface-variant">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  )
}
