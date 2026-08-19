import { create } from 'zustand'

/* ---------------------------------------------------------------
   Le compte : création, connexion, profil, déconnexion.

   Parti pris : LA CONNEXION NE GARDE PAS L'APP. Atlas s'ouvre et
   s'utilise sans compte, hors ligne, sans écran d'accueil — c'est le
   moment ⚡ qui l'exige. Se connecter sert uniquement à activer la
   synchronisation, et c'est un choix, pas un péage.

   Comme pour la dorsale, l'interface est petite et deux
   implémentations la remplissent : une locale pour éprouver le
   parcours sans serveur, et Supabase quand les clés arriveront.
   --------------------------------------------------------------- */

export type Session = {
  /** identifiant stable — c'est lui qui possède les données */
  id: string
  email: string
  nom: string
  depuis: number
}

/** Une demande aboutit tout de suite, ou attend une confirmation par e-mail. */
export type Demande = { session: Session } | { confirmationEnvoyee: true }

export interface Authentification {
  readonly nom: string
  session(): Promise<Session | null>
  creer(email: string, motDePasse: string, nom: string): Promise<Demande>
  connecter(email: string, motDePasse: string): Promise<Demande>
  deconnecter(): Promise<void>
  majProfil(nom: string): Promise<Session>
}

/* ================= validations partagées ================= */

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function verifierEmail(email: string) {
  if (!EMAIL.test(email.trim())) throw new Error('Adresse e-mail invalide')
  return email.trim().toLowerCase()
}

export function verifierMotDePasse(mdp: string) {
  if (mdp.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères')
  return mdp
}

/* ================= implémentation locale ================= */

const CLE_SESSION = 'atlas.compte.session'
const CLE_COMPTES = 'atlas.compte.comptes'

type CompteStocke = { id: string; email: string; nom: string; sel: string; empreinte: string }

/** Empreinte SHA-256 du mot de passe salé. */
async function empreinter(mdp: string, sel: string) {
  const data = new TextEncoder().encode(`${sel}:${mdp}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function lireComptes(): CompteStocke[] {
  try {
    return JSON.parse(localStorage.getItem(CLE_COMPTES) ?? '[]') as CompteStocke[]
  } catch {
    return []
  }
}

function ecrireComptes(comptes: CompteStocke[]) {
  try {
    localStorage.setItem(CLE_COMPTES, JSON.stringify(comptes))
  } catch {
    /* sans importance */
  }
}

/**
 * Compte local, pour éprouver le parcours de bout en bout sans serveur.
 *
 * ⚠️ Ce n'est PAS de la sécurité. Le mot de passe est salé et haché pour
 * ne pas traîner en clair, mais tout vit dans ce navigateur : n'importe
 * qui y ayant accès peut tout lire. La vraie protection viendra du
 * serveur, dont c'est le métier. Ne jamais s'en servir en vrai.
 */
export class AuthLocale implements Authentification {
  readonly nom = 'Compte local (test)'

  async session(): Promise<Session | null> {
    try {
      const brut = localStorage.getItem(CLE_SESSION)
      return brut ? (JSON.parse(brut) as Session) : null
    } catch {
      return null
    }
  }

  private ouvrir(compte: CompteStocke): Session {
    const session: Session = {
      id: compte.id,
      email: compte.email,
      nom: compte.nom,
      depuis: Date.now(),
    }
    try {
      localStorage.setItem(CLE_SESSION, JSON.stringify(session))
    } catch {
      /* sans importance */
    }
    return session
  }

  async creer(email: string, motDePasse: string, nom: string): Promise<Demande> {
    const adresse = verifierEmail(email)
    verifierMotDePasse(motDePasse)
    const comptes = lireComptes()
    if (comptes.some((c) => c.email === adresse)) {
      throw new Error('Un compte existe déjà avec cette adresse')
    }
    const sel = crypto.randomUUID()
    const compte: CompteStocke = {
      id: `u${crypto.randomUUID()}`,
      email: adresse,
      nom: nom.trim() || adresse.split('@')[0],
      sel,
      empreinte: await empreinter(motDePasse, sel),
    }
    ecrireComptes([...comptes, compte])
    return { session: this.ouvrir(compte) }
  }

  async connecter(email: string, motDePasse: string): Promise<Demande> {
    const adresse = verifierEmail(email)
    const compte = lireComptes().find((c) => c.email === adresse)
    // même message dans les deux cas : on n'indique pas si l'adresse existe
    const echec = () => new Error('Adresse ou mot de passe incorrect')
    if (!compte) throw echec()
    if ((await empreinter(motDePasse, compte.sel)) !== compte.empreinte) throw echec()
    return { session: this.ouvrir(compte) }
  }

  async deconnecter(): Promise<void> {
    try {
      localStorage.removeItem(CLE_SESSION)
    } catch {
      /* sans importance */
    }
  }

  async majProfil(nom: string): Promise<Session> {
    const session = await this.session()
    if (!session) throw new Error('Aucune session')
    const comptes = lireComptes().map((c) =>
      c.id === session.id ? { ...c, nom: nom.trim() || c.nom } : c,
    )
    ecrireComptes(comptes)
    const maj = { ...session, nom: nom.trim() || session.nom }
    try {
      localStorage.setItem(CLE_SESSION, JSON.stringify(maj))
    } catch {
      /* sans importance */
    }
    return maj
  }
}

/* ================= store ================= */

type CompteStore = {
  auth: Authentification
  session: Session | null
  confirmationEnvoyee: string | null
  erreur: string | null
  occupe: boolean

  reprendre: () => Promise<Session | null>
  creer: (email: string, mdp: string, nom: string) => Promise<Session | null>
  connecter: (email: string, mdp: string) => Promise<Session | null>
  deconnecter: () => Promise<void>
  renommer: (nom: string) => Promise<void>
  oublierErreur: () => void
}

export const useCompte = create<CompteStore>((set, get) => ({
  /* La maquette par défaut. Si le serveur est configuré, App la remplace
     au démarrage par l adaptateur Supabase, chargé à la demande. */
  auth: new AuthLocale(),
  session: null,
  confirmationEnvoyee: null,
  erreur: null,
  occupe: false,

  reprendre: async () => {
    const session = await get().auth.session()
    set({ session })
    return session
  },

  creer: (email, mdp, nom) => tenter(set, () => get().auth.creer(email, mdp, nom)),
  connecter: (email, mdp) => tenter(set, () => get().auth.connecter(email, mdp)),

  deconnecter: async () => {
    await get().auth.deconnecter()
    set({ session: null, confirmationEnvoyee: null, erreur: null })
  },

  renommer: async (nom) => {
    const session = await get().auth.majProfil(nom)
    set({ session })
  },

  oublierErreur: () => set({ erreur: null }),
}))

/** Enveloppe commune : occupé, erreur lisible, session ou confirmation. */
async function tenter(
  set: (partiel: Partial<CompteStore>) => void,
  action: () => Promise<Demande>,
): Promise<Session | null> {
  set({ occupe: true, erreur: null, confirmationEnvoyee: null })
  try {
    const r = await action()
    if ('session' in r) {
      set({ session: r.session, occupe: false })
      return r.session
    }
    set({ confirmationEnvoyee: 'oui', occupe: false })
    return null
  } catch (e) {
    set({ erreur: e instanceof Error ? e.message : 'Opération impossible', occupe: false })
    return null
  }
}
