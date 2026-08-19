import { create } from 'zustand'

/* ---------------------------------------------------------------
   L'écran de bienvenue : vu une fois, revoyable à volonté depuis le
   profil. On ne garde qu'un drapeau — il n'y a rien d'autre à retenir.
   --------------------------------------------------------------- */

const CLE = 'atlas.bienvenue.v1'

function lire(): boolean {
  try {
    return localStorage.getItem(CLE) === 'vu'
  } catch {
    // si on ne peut pas lire, on ne veut surtout pas le remontrer en boucle
    return true
  }
}

function ecrire(vu: boolean) {
  try {
    if (vu) localStorage.setItem(CLE, 'vu')
    else localStorage.removeItem(CLE)
  } catch {
    /* sans importance */
  }
}

type BienvenueStore = {
  vue: boolean
  terminer: () => void
  revoir: () => void
}

export const useBienvenue = create<BienvenueStore>((set) => ({
  vue: lire(),
  terminer: () => {
    ecrire(true)
    set({ vue: true })
  },
  revoir: () => {
    ecrire(false)
    set({ vue: false })
  },
}))
