import { create } from 'zustand'

/* ---------------------------------------------------------------
   Thème : clair / nuit / automatique à l'heure, + couleur d'accent.
   Tout est stocké en canaux HSL pour que l'app entière (halos du fond
   compris) se reteinte à partir d'une seule valeur.
   --------------------------------------------------------------- */

export type ThemeMode = 'auto' | 'light' | 'dark'

/** La matière des surfaces : translucide, opaque, ou selon le système. */
export type Matiere = 'auto' | 'verre' | 'uni'
export type Resolved = 'light' | 'dark'

export type Accent = { h: number; s: number; l: number }

/* Pas de palette imposée : la couleur est CELLE DE L'UTILISATEUR, réglée
   au curseur. On ne garde qu'une valeur de départ — le rouge — et la
   précédente, pour pouvoir revenir en arrière après un essai.
   Doit rester synchronisée avec le bloc :root de tokens.css. */
export const ACCENT_DEFAUT: Accent = { h: 359, s: 92, l: 58 }

/** Bornes du mode automatique : clair de 8 h à 18 h, nuit le reste du temps. */
export const DAY_START = 8
export const DAY_END = 18

export function resolveMode(mode: ThemeMode, now = new Date()): Resolved {
  if (mode !== 'auto') return mode
  const h = now.getHours()
  return h >= DAY_START && h < DAY_END ? 'light' : 'dark'
}

/* --- persistance --- */

const KEY = 'atlas.ui.v1'

type Persisted = { mode: ThemeMode; accent: Accent; precedent: Accent | null; matiere: Matiere }

function load(): Persisted {
  const fallback: Persisted = { mode: 'auto', accent: ACCENT_DEFAUT, precedent: null, matiere: 'auto' }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const a = parsed.accent
    if (!a || typeof a.h !== 'number') return fallback
    const p = parsed.precedent
    return {
      mode: parsed.mode === 'light' || parsed.mode === 'dark' ? parsed.mode : 'auto',
      accent: { h: a.h, s: a.s ?? 90, l: a.l ?? 55 },
      precedent: p && typeof p.h === 'number' ? { h: p.h, s: p.s ?? 90, l: p.l ?? 55 } : null,
      matiere:
        parsed.matiere === 'verre' || parsed.matiere === 'uni' ? parsed.matiere : 'auto',
    }
  } catch {
    return fallback
  }
}

function save(state: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* mode privé, quota plein : le thème n'est pas critique, on continue */
  }
}

/* --- store --- */

type ThemeStore = Persisted & {
  resolved: Resolved
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
  setMatiere: (matiere: Matiere) => void
  /** Fige la couleur actuelle comme « précédente », au DÉBUT d'un réglage. */
  memoriser: () => void
  /** Rebascule sur la couleur précédente — et l'actuelle devient la précédente. */
  revenir: () => void
  /** Réévalue le thème automatique (appelé par l'horloge et au retour d'arrière-plan). */
  tick: () => void
}

const initial = load()

export const useTheme = create<ThemeStore>((set, get) => ({
  ...initial,
  resolved: resolveMode(initial.mode),

  setMode: (mode) => {
    save({ mode, accent: get().accent, precedent: get().precedent, matiere: get().matiere })
    set({ mode, resolved: resolveMode(mode) })
  },

  setAccent: (accent) => {
    save({ mode: get().mode, accent, precedent: get().precedent, matiere: get().matiere })
    set({ accent })
  },

  /* Appelé quand on SAISIT le curseur, pas à chaque pixel : sinon la
     « précédente » serait la couleur d'il y a un instant, ce qui ne
     permet de revenir nulle part. */
  memoriser: () => {
    const { mode, accent } = get()
    save({ mode, accent, precedent: accent, matiere: get().matiere })
    set({ precedent: accent })
  },

  /* Un aller-retour : la couleur quittée prend la place de la gardée,
     ce qui permet de comparer les deux d'un simple appui. */
  revenir: () => {
    const { mode, accent, precedent } = get()
    if (!precedent) return
    save({ mode, accent: precedent, precedent: accent, matiere: get().matiere })
    set({ accent: precedent, precedent: accent })
  },

  setMatiere: (matiere) => {
    const { mode, accent, precedent } = get()
    save({ mode, accent, precedent, matiere })
    set({ matiere })
  },

  tick: () => {
    const { mode, resolved } = get()
    const next = resolveMode(mode)
    if (next !== resolved) set({ resolved: next })
  },
}))

/* ---------------------------------------------------------------
   Application au DOM
   --------------------------------------------------------------- */

/** Luminance perçue d'une couleur HSL, pour décider de l'encre posée dessus. */
function luminance({ h, s, l }: Accent): number {
  const sN = s / 100
  const lN = l / 100
  const c = (1 - Math.abs(2 * lN - 1)) * sN
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lN - c / 2
  const seg = Math.floor(h / 60) % 6
  const rgb: [number, number, number] =
    seg === 0 ? [c, x, 0] :
    seg === 1 ? [x, c, 0] :
    seg === 2 ? [0, c, x] :
    seg === 3 ? [0, x, c] :
    seg === 4 ? [x, 0, c] : [c, 0, x]
  const [r, g, b] = rgb.map((v) => v + m)
  // pondération standard de la perception humaine : le vert pèse le plus
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/* « Auto » suit le réglage système « Réduire la transparence » : c'est le
   seul signal honnête dont on dispose, et il existe sur iOS comme sur Mac.
   Sans demande explicite, on garde le verre. */
export function resoudreMatiere(matiere: Matiere): 'verre' | 'uni' {
  if (matiere !== 'auto') return matiere
  try {
    return window.matchMedia('(prefers-reduced-transparency: reduce)').matches ? 'uni' : 'verre'
  } catch {
    return 'verre'
  }
}

export function applyTheme(resolved: Resolved, accent: Accent, matiere: Matiere = 'auto') {
  const root = document.documentElement
  root.dataset.theme = resolved
  root.dataset.matiere = resoudreMatiere(matiere)

  root.style.setProperty('--accent-h', String(accent.h))
  root.style.setProperty('--accent-s', `${accent.s}%`)
  root.style.setProperty('--accent-l', `${accent.l}%`)

  // Encre lisible SUR l'accent : presque noir sur un jaune, blanc sur un violet.
  root.style.setProperty(
    '--accent-ink',
    luminance(accent) > 0.55 ? `hsl(${accent.h} 45% 11%)` : '#ffffff',
  )

  // Les trois halos du fond dérivent de l'accent : changer la couleur
  // change l'ambiance entière, pas seulement les boutons.
  // Écart resserré (±44°) : assez pour donner de la profondeur, pas assez
  // pour qu'un halo parte dans une teinte étrangère à l'accent.
  root.style.setProperty('--aur-h1', String(accent.h))
  root.style.setProperty('--aur-h2', String((accent.h + 44) % 360))
  root.style.setProperty('--aur-h3', String((accent.h + 316) % 360))

  // Barre d'état iOS / barre d'URL Android accordées au thème
  const themeColor = resolved === 'dark' ? '#0b0d12' : '#eceff6'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', resolved === 'dark' ? 'black-translucent' : 'default')
}
