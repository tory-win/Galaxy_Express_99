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
  logo = false,
  back = false,
  onBack,
  actions,
  className = '',
}) {
  return (
    <header className={`kr-app-header ${className}`}>
      <div className="kr-app-header__leading">
        {back && (
          <button type="button" className="kr-back-button" aria-label="뒤로" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
        )}
        {logo ? <img className="kr-wordmark" src={assetUrl('korail-logo.png')} alt="KORAIL" /> : <h1>{title}</h1>}
      </div>
      {actions && <div className="kr-app-header__actions">{actions}</div>}
    </header>
  )
}
