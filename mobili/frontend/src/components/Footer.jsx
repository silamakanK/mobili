import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="py-10 bg-surface-container-highest border-t border-outline-variant">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="text-primary font-bold text-headline-sm mb-2">Mobili</p>
          <p className="text-body-sm text-on-surface-variant">
            © {new Date().getFullYear()} Mobili.<br />Tous droits réservés.
          </p>
        </div>
        <div>
          <p className="text-label-lg text-on-surface mb-3">À propos</p>
          <ul className="space-y-2">
            <li><Link to="#" className="text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">À propos</Link></li>
            <li><Link to="#" className="text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">Contact</Link></li>
            <li><Link to="#" className="text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">Mentions légales</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-label-lg text-on-surface mb-3">Paiement accepté</p>
          <ul className="space-y-2">
            <li className="text-body-sm text-on-surface-variant">Orange Money</li>
            <li className="text-body-sm text-on-surface-variant">Wave</li>
            <li className="text-body-sm text-on-surface-variant">Moov Africa</li>
          </ul>
        </div>
        <div>
          <p className="text-label-lg text-on-surface mb-3">Compagnies partenaires</p>
          <ul className="space-y-2">
            <li className="text-body-sm text-on-surface-variant">Diarra Transport</li>
            <li className="text-body-sm text-on-surface-variant">Tilemsi</li>
            <li className="text-body-sm text-on-surface-variant">Sonef</li>
            <li className="text-body-sm text-on-surface-variant">Benso</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
