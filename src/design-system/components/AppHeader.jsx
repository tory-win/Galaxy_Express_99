import { ChevronLeft } from './icons.jsx'
import { assetUrl } from '../../lib/assets.js'

export function AssetButton({ src, label, onClick, className = '' }) {
  return (
    <button type="button" className={`kr-asset-button ${className}`} aria-label={label} onClick={onClick}>
      <img src={src} alt="" />
    </button>
  )
}

export function AppHeader({
  title,
  eyebrow,
  logo = false,
  back = false,
  backLabel = '뒤로',
  onBack,
  actions,
  className = '',
}) {
  return (
    <header className={`kr-app-header ${className}`}>
      <div className="kr-app-header__leading">
        {back && (
          <button type="button" className="kr-back-button" aria-label={backLabel} onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
        )}
        {logo ? <img className="kr-wordmark" src={assetUrl('korail-logo.png')} alt="KORAIL" /> : <div className="kr-app-header__titles">{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1></div>}
      </div>
      {actions && <div className="kr-app-header__actions">{actions}</div>}
    </header>
  )
}
