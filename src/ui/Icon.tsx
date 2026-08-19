/* Jeu d'icônes minimal, tracé uniforme, hérite de la couleur du texte.
   Inline plutôt qu'une police ou un sprite : zéro requête, zéro FOUC. */

import type { CSSProperties } from 'react'

type Props = { size?: number; className?: string; style?: CSSProperties }

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const IconBolt = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
  </svg>
)

export const IconFlux = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M3 7.5h18M3 12h18M3 16.5h12" />
  </svg>
)

export const IconEspaces = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <rect x="3" y="3" width="7.5" height="7.5" rx="2.2" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" />
  </svg>
)

export const IconSearch = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconSettings = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </svg>
)

export const IconSun = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </svg>
)

export const IconMoon = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
)

export const IconAuto = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v17" />
    <path d="M12 3.5A8.5 8.5 0 0 1 12 20.5Z" fill="currentColor" stroke="none" />
  </svg>
)

export const IconBack = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M14.5 5 8 12l6.5 7" />
  </svg>
)

export const IconPlus = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconFocus = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </svg>
)

export const IconImage = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="15" rx="3" />
    <circle cx="8.5" cy="10" r="1.6" />
    <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17M14 14.5l1.6-1.6a2 2 0 0 1 2.8 0L20 14.5" />
  </svg>
)

export const IconTrash = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M4 6.5h16M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
    <path d="M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5" />
  </svg>
)

export const IconArchive = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <rect x="3" y="4" width="18" height="4.5" rx="1.6" />
    <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
    <path d="M10 12.5h4" />
  </svg>
)

export const IconOeil = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.9" />
  </svg>
)

export const IconOeilBarre = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M9.9 6.1A8.6 8.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3 3.7M6.2 8.1A17.4 17.4 0 0 0 2.5 12S6 18.2 12 18.2c1.3 0 2.4-.3 3.4-.7" />
    <path d="M10 10a2.9 2.9 0 0 0 4 4" />
    <path d="m4 4 16 16" />
  </svg>
)

export const IconProfil = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <circle cx="12" cy="8.2" r="3.9" />
    <path d="M4.5 20.2a7.5 7.5 0 0 1 15 0" />
  </svg>
)

/** Variante pleine : c'est elle qui dit « tu es connecté ». */
export const IconProfilPlein = ({ size = 20, className, style }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={style}
    aria-hidden="true"
  >
    <circle cx="12" cy="8.2" r="4.4" />
    <path d="M12 13.6c4.2 0 7.6 3 8 6.9H4c.4-3.9 3.8-6.9 8-6.9Z" />
  </svg>
)

export const IconSync = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M20.5 11a8.5 8.5 0 0 0-15.3-4.2M3.5 13a8.5 8.5 0 0 0 15.3 4.2" />
    <path d="M4.5 2.5V7H9M19.5 21.5V17H15" />
  </svg>
)

export const IconRestore = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M4 11a8 8 0 1 1 2.3 5.7" />
    <path d="M3.5 5.5V11H9" />
  </svg>
)

export const IconFolder = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M3 7a2 2 0 0 1 2-2h3.7a2 2 0 0 1 1.5.7l1 1.3H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
  </svg>
)

export const IconPencil = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M14.8 4.6a1.9 1.9 0 0 1 2.7 0l1.9 1.9a1.9 1.9 0 0 1 0 2.7L9.3 19.3l-4.8 1 1-4.8Z" />
  </svg>
)

export const IconClose = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
)

export const IconReturn = ({ size = 20, className, style }: Props) => (
  <svg {...base(size)} className={className} style={style} aria-hidden="true">
    <path d="M20 5v5.5a3 3 0 0 1-3 3H5" />
    <path d="m9 9.5-4 4 4 4" />
  </svg>
)
