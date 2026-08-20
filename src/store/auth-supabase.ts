import type { AuthError, User } from '@supabase/supabase-js'
import {
  verifierEmail,
  verifierMotDePasse,
  type Authentification,
  type Demande,
  type Session,
} from './compte'
import { supabase } from './supabase'

/* ---------------------------------------------------------------
   Le compte, pour de vrai.

   Remplace `AuthLocale` sans qu'un seul écran ne change : c'est
   exactement ce que la maquette locale servait à prouver.

   Deux points qui ne s'improvisent pas :

   · LES MESSAGES D'ERREUR NE DOIVENT RIEN RÉVÉLER. Supabase répond
     « Invalid login credentials » que l'adresse existe ou non — on
     garde ce principe et on traduit sans le trahir.
   · L'INSCRIPTION PEUT NE PAS OUVRIR DE SESSION. Si la confirmation
     par e-mail est activée sur le projet, `signUp` rend un
     utilisateur SANS session. L'écran sait déjà l'afficher.
   --------------------------------------------------------------- */

function versSession(user: User): Session {
  const nom =
    (user.user_metadata?.nom as string | undefined)?.trim() ||
    user.email?.split('@')[0] ||
    'Moi'
  return {
    id: user.id,
    email: user.email ?? '',
    nom,
    depuis: Date.parse(user.last_sign_in_at ?? user.created_at) || Date.now(),
  }
}

/** Traduit sans jamais indiquer si l'adresse existe. */
function traduire(e: AuthError): Error {
  const m = e.message.toLowerCase()
  if (m.includes('invalid login')) return new Error('Adresse ou mot de passe incorrect')
  if (m.includes('already registered') || m.includes('already exists')) {
    return new Error('Un compte existe déjà avec cette adresse')
  }
  if (m.includes('password')) return new Error('Le mot de passe doit faire au moins 8 caractères')
  if (m.includes('rate limit') || m.includes('too many')) {
    return new Error('Trop de tentatives — réessaie dans quelques minutes')
  }
  if (m.includes('not confirmed')) return new Error('Confirme d’abord ton adresse par e-mail')
  return new Error('Connexion impossible')
}

export class AuthSupabase implements Authentification {
  readonly nom = 'Supabase'

  async session(): Promise<Session | null> {
    const { data } = await supabase().auth.getSession()
    const user = data.session?.user
    return user ? versSession(user) : null
  }

  async creer(email: string, motDePasse: string, nom: string): Promise<Demande> {
    const adresse = verifierEmail(email)
    verifierMotDePasse(motDePasse)

    const { data, error } = await supabase().auth.signUp({
      email: adresse,
      password: motDePasse,
      options: { data: { nom: nom.trim() || adresse.split('@')[0] } },
    })
    if (error) throw traduire(error)

    // pas de session = le projet exige une confirmation par e-mail
    if (!data.session || !data.user) return { confirmationEnvoyee: true }
    return { session: versSession(data.user) }
  }

  async connecter(email: string, motDePasse: string): Promise<Demande> {
    const adresse = verifierEmail(email)
    const { data, error } = await supabase().auth.signInWithPassword({
      email: adresse,
      password: motDePasse,
    })
    if (error) throw traduire(error)
    if (!data.user) throw new Error('Adresse ou mot de passe incorrect')
    return { session: versSession(data.user) }
  }

  async deconnecter(): Promise<void> {
    await supabase().auth.signOut()
  }

  /**
   * Le lien de réinitialisation.
   *
   * L'ERREUR EST AVALÉE, sauf la limitation de débit. Supabase répond
   * la même chose que l'adresse existe ou non, mais un échec réseau
   * ou une adresse malformée feraient malgré tout apparaître un
   * message différent selon les cas — et c'est par ces différences-là
   * qu'on énumère les comptes d'un service. On répond donc toujours
   * « si un compte existe, le lien part ».
   *
   * `redirectTo` ramène sur l'app : sans lui, Supabase renvoie sur
   * l'adresse du projet, qui n'affiche rien d'utile.
   */
  async reinitialiser(email: string): Promise<void> {
    const adresse = verifierEmail(email)
    const { error } = await supabase().auth.resetPasswordForEmail(adresse, {
      redirectTo: `${window.location.origin}/`,
    })
    if (error && /rate limit|too many/i.test(error.message)) throw traduire(error)
  }

  /**
   * Changer de mot de passe, session ouverte.
   *
   * ── ON REVÉRIFIE L'ANCIEN, ET SUPABASE NE LE FAIT PAS
   *
   * `updateUser({ password })` accepte n'importe quel nouveau mot de
   * passe du moment que la session est valide : il ne demande jamais
   * l'ancien. Or une session dure des semaines. Sans cette
   * vérification, un téléphone déverrouillé prêté deux minutes suffit
   * à changer le mot de passe et à mettre le propriétaire dehors.
   *
   * On rejoue donc une connexion avec l'ancien mot de passe avant de
   * poser le nouveau. Elle ne casse pas la session en cours — elle la
   * renouvelle.
   */
  async changerMotDePasse(actuel: string, nouveau: string): Promise<void> {
    verifierMotDePasse(nouveau)
    const session = await this.session()
    if (!session?.email) throw new Error('Aucune session')
    if (actuel === nouveau) throw new Error('Le nouveau mot de passe est identique à l’ancien')

    const verif = await supabase().auth.signInWithPassword({
      email: session.email,
      password: actuel,
    })
    if (verif.error) throw new Error('Le mot de passe actuel est incorrect')

    const { error } = await supabase().auth.updateUser({ password: nouveau })
    if (error) throw traduire(error)
  }

  async majProfil(nom: string): Promise<Session> {
    const { data, error } = await supabase().auth.updateUser({ data: { nom: nom.trim() } })
    if (error) throw traduire(error)
    if (!data.user) throw new Error('Aucune session')
    return versSession(data.user)
  }
}
