/* ---------------------------------------------------------------
   La version de l'app, telle qu'elle a été construite.

   Elle sert à une seule chose, mais elle est irremplaçable : quand
   quelque chose cloche, savoir SI l'appareil tourne bien la dernière
   mise en ligne. Un service worker qui a gardé une vieille version
   est indétectable autrement.
   --------------------------------------------------------------- */

/* Ces trois constantes sont injectées à la construction (vite.config).
   On ne les lit JAMAIS en direct : un serveur de développement démarré
   avant l'ajout du `define` ne les connaît pas, et une constante
   d'affichage n'a pas le droit d'écrouler l'application entière.
   `typeof` sur un identifiant absent est la seule lecture qui ne jette
   pas — et quand le `define` a bien eu lieu, il est remplacé avant
   même d'être évalué. */
const injecte = (lire: () => string, defaut: string) => {
  try {
    return lire() ?? defaut
  } catch {
    return defaut
  }
}

export const VERSION = injecte(
  () => (typeof __ATLAS_VERSION__ === 'string' ? __ATLAS_VERSION__ : '0.0.0'),
  '0.0.0',
)
export const REPERE = injecte(
  () => (typeof __ATLAS_REPERE__ === 'string' ? __ATLAS_REPERE__ : 'developpement'),
  'developpement',
)
export const CONSTRUITE_LE = injecte(
  () => (typeof __ATLAS_DATE__ === 'string' ? __ATLAS_DATE__ : ''),
  '',
)

/** « 0.1.0 · v0.1.0-3-ga1b2c3d » — ou l'empreinte seule s'il n'y a pas de tag. */
export function versionCourte(): string {
  return REPERE.startsWith(`v${VERSION}`) ? REPERE : `${VERSION} · ${REPERE}`
}

export function dateConstruction(): string {
  const d = new Date(CONSTRUITE_LE)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}
