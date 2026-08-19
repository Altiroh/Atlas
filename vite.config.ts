import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* ---------------------------------------------------------------
   La version est LUE AU MOMENT DE LA CONSTRUCTION, jamais écrite à
   la main : une constante qu'il faut penser à changer est une
   constante fausse.

   Trois sources, dans cet ordre de précision :
   · le numéro de `package.json` — ce qu'on décide ;
   · le repère git — le dernier tag, plus la distance parcourue
     depuis, plus l'empreinte du commit. Sans tag, l'empreinte seule ;
   · la date, qui tranche quand deux mises en ligne se ressemblent.
   --------------------------------------------------------------- */

const paquet = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

function repereGit(): string {
  try {
    // --dirty signale une mise en ligne faite sur un dossier non commité :
    // c'est précisément ce qu'on veut voir apparaître quand ça arrive
    const decrit = execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim()
    if (decrit) return decrit
  } catch {
    /* on tente la suite */
  }
  /* L'hébergeur construit souvent depuis une copie SUPERFICIELLE du
     dépôt : les tags n'y sont pas, et `git describe` échoue. Vercel
     expose alors l'empreinte du commit dans l'environnement — c'est
     moins précis qu'un tag, mais ça reste un repère vérifiable, et
     c'est très exactement ce qu'on veut lire quand une mise en ligne
     se comporte mal. */
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (sha) return sha.slice(0, 7)
  return 'sans-repere'
}

export default defineConfig({
  plugins: [react()],
  define: {
    __ATLAS_VERSION__: JSON.stringify(paquet.version),
    __ATLAS_REPERE__: JSON.stringify(repereGit()),
    __ATLAS_DATE__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 3870,
    // écoute sur le réseau local : indispensable pour tester depuis l'iPhone et l'iPad
    host: true,
    strictPort: true,
  },
})
