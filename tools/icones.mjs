/* ---------------------------------------------------------------
   Génère les icônes de l'app à partir de `tools/logo-source.png`.

   SANS AUCUNE DÉPENDANCE — ni sharp, ni canvas, ni ImageMagick. Ce
   fichier lit un PNG, le rééchantillonne et le réécrit à la main.
   C'est plus long qu'un `npm install`, et c'est le but : l'outillage
   d'un projet personnel qu'on rouvrira dans deux ans ne doit pas
   dépendre d'un binaire natif qui ne compilera plus.

   Ce qu'il faut savoir d'un PNG pour en lire un :

   · Il est fait de BLOCS (longueur, type, données, CRC). Seuls trois
     nous intéressent : IHDR (dimensions, format), PLTE (palette) et
     IDAT (les pixels, compressés par zlib — d'où `inflateSync`).
   · Les données décompressées ne sont PAS les pixels : chaque ligne
     est précédée d'un octet de FILTRE, et le filtre se défait en
     fonction du pixel de gauche et de celui du dessus. Sans ça on
     obtient une bouillie diagonale — c'est l'erreur classique.

     node tools/icones.mjs
   --------------------------------------------------------------- */

import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

/* ================= CRC et blocs ================= */

const TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  TABLE[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function bloc(type, data) {
  const long = Buffer.alloc(4)
  long.writeUInt32BE(data.length)
  const corps = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corps))
  return Buffer.concat([long, corps, crc])
}

/* ================= lecture ================= */

/** Rend `{ l, h, px }` où `px` est du RVBA brut, 4 octets par pixel. */
function lirePng(chemin) {
  const buf = readFileSync(chemin)
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${chemin} : ce n'est pas un PNG`)

  let i = 8
  let l = 0
  let h = 0
  let profondeur = 8
  let couleur = 6
  let palette = null
  let alphaPalette = null
  const morceaux = []

  while (i < buf.length) {
    const taille = buf.readUInt32BE(i)
    const type = buf.toString('ascii', i + 4, i + 8)
    const data = buf.subarray(i + 8, i + 8 + taille)
    if (type === 'IHDR') {
      l = data.readUInt32BE(0)
      h = data.readUInt32BE(4)
      profondeur = data[8]
      couleur = data[9]
      if (data[12] !== 0) throw new Error('PNG entrelacé (Adam7) : non pris en charge')
      if (profondeur !== 8) throw new Error(`profondeur ${profondeur} bits : non prise en charge`)
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') alphaPalette = Buffer.from(data)
    else if (type === 'IDAT') morceaux.push(data)
    else if (type === 'IEND') break
    i += 12 + taille
  }

  // canaux par pixel selon le type de couleur : 0 gris, 2 RVB, 3 palette, 4 gris+A, 6 RVBA
  const canaux = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[couleur]
  if (!canaux) throw new Error(`type de couleur ${couleur} inconnu`)

  const brut = inflateSync(Buffer.concat(morceaux))
  const parLigne = l * canaux
  const lignes = Buffer.alloc(h * parLigne)

  /* Défiltrage. `a` = pixel de gauche, `b` = celui du dessus,
     `c` = celui en haut à gauche. Les cinq filtres du format. */
  for (let y = 0; y < h; y++) {
    const filtre = brut[y * (parLigne + 1)]
    const src = y * (parLigne + 1) + 1
    const dst = y * parLigne
    const prec = dst - parLigne
    for (let x = 0; x < parLigne; x++) {
      const v = brut[src + x]
      const a = x >= canaux ? lignes[dst + x - canaux] : 0
      const b = y > 0 ? lignes[prec + x] : 0
      const c = y > 0 && x >= canaux ? lignes[prec + x - canaux] : 0
      let out
      if (filtre === 0) out = v
      else if (filtre === 1) out = v + a
      else if (filtre === 2) out = v + b
      else if (filtre === 3) out = v + ((a + b) >> 1)
      else if (filtre === 4) {
        // Paeth : on garde celui des trois voisins le plus proche de a+b−c
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        out = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      } else throw new Error(`filtre ${filtre} inconnu`)
      lignes[dst + x] = out & 0xff
    }
  }

  // tout ramener en RVBA, quel que soit le format d'origine
  const px = Buffer.alloc(l * h * 4)
  for (let n = 0; n < l * h; n++) {
    const s = n * canaux
    const d = n * 4
    if (couleur === 6) {
      px[d] = lignes[s]
      px[d + 1] = lignes[s + 1]
      px[d + 2] = lignes[s + 2]
      px[d + 3] = lignes[s + 3]
    } else if (couleur === 2) {
      px[d] = lignes[s]
      px[d + 1] = lignes[s + 1]
      px[d + 2] = lignes[s + 2]
      px[d + 3] = 255
    } else if (couleur === 0) {
      px[d] = px[d + 1] = px[d + 2] = lignes[s]
      px[d + 3] = 255
    } else if (couleur === 4) {
      px[d] = px[d + 1] = px[d + 2] = lignes[s]
      px[d + 3] = lignes[s + 1]
    } else {
      const idx = lignes[s]
      px[d] = palette[idx * 3]
      px[d + 1] = palette[idx * 3 + 1]
      px[d + 2] = palette[idx * 3 + 2]
      px[d + 3] = alphaPalette && idx < alphaPalette.length ? alphaPalette[idx] : 255
    }
  }

  return { l, h, px }
}

/* ================= rééchantillonnage ================= */

/**
 * Réduction par MOYENNE DE BOÎTE, avec `srcX/srcY/srcL/srcH` pour ne
 * prendre qu'une partie de la source.
 *
 * La moyenne est faite EN ALPHA PRÉMULTIPLIÉ. Sans ça, les pixels
 * entièrement transparents — dont la couleur est arbitraire, souvent
 * du noir — entrent dans la moyenne au même titre que les autres, et
 * tout le contour du logo se borde d'un liseré sombre. C'est le
 * défaut le plus répandu des redimensionnements faits à la main.
 */
function reduire(src, taille, srcX = 0, srcY = 0, srcL = src.l, srcH = src.h) {
  const out = Buffer.alloc(taille * taille * 4)
  const pas = srcL / taille

  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      const x0 = Math.floor(srcX + x * pas)
      const x1 = Math.max(x0 + 1, Math.floor(srcX + (x + 1) * pas))
      const y0 = Math.floor(srcY + y * (srcH / taille))
      const y1 = Math.max(y0 + 1, Math.floor(srcY + (y + 1) * (srcH / taille)))

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = y0; sy < y1; sy++) {
        if (sy < 0 || sy >= src.h) continue
        for (let sx = x0; sx < x1; sx++) {
          if (sx < 0 || sx >= src.l) continue
          const i = (sy * src.l + sx) * 4
          const al = src.px[i + 3] / 255
          r += src.px[i] * al
          g += src.px[i + 1] * al
          b += src.px[i + 2] * al
          a += al
          n++
        }
      }

      const d = (y * taille + x) * 4
      if (n === 0 || a === 0) {
        out[d + 3] = 0
      } else {
        // on redivise par l'alpha cumulé : retour en couleur droite
        out[d] = Math.round(r / a)
        out[d + 1] = Math.round(g / a)
        out[d + 2] = Math.round(b / a)
        out[d + 3] = Math.round((a / n) * 255)
      }
    }
  }
  return out
}

/** Pose l'image sur un fond opaque. iOS ne sait pas gérer la
    transparence d'une `apple-touch-icon` : il la remplit de noir. */
function surFond(px, taille, fond) {
  const out = Buffer.alloc(taille * taille * 4)
  for (let i = 0; i < taille * taille; i++) {
    const a = px[i * 4 + 3] / 255
    for (let c = 0; c < 3; c++) {
      out[i * 4 + c] = Math.round(px[i * 4 + c] * a + fond[c] * (1 - a))
    }
    out[i * 4 + 3] = 255
  }
  return out
}

/** Recentre l'image dans un cadre plus grand — la zone sûre d'une
    icône masquable, que les lanceurs Android rognent jusqu'à 20 %. */
function marger(px, taille, part) {
  const out = Buffer.alloc(taille * taille * 4)
  const dedans = Math.round(taille * part)
  const petit = reduireBuffer(px, taille, dedans)
  const dep = Math.round((taille - dedans) / 2)
  for (let y = 0; y < dedans; y++) {
    for (let x = 0; x < dedans; x++) {
      const s = (y * dedans + x) * 4
      const d = ((y + dep) * taille + (x + dep)) * 4
      out[d] = petit[s]
      out[d + 1] = petit[s + 1]
      out[d + 2] = petit[s + 2]
      out[d + 3] = petit[s + 3]
    }
  }
  return out
}

function reduireBuffer(px, de, vers) {
  return reduire({ l: de, h: de, px }, vers)
}

/* ================= écriture ================= */

function ecrirePng(chemin, taille, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(taille, 0)
  ihdr.writeUInt32BE(taille, 4)
  ihdr[8] = 8 // 8 bits par canal
  ihdr[9] = 6 // RVBA
  const brut = Buffer.alloc(taille * (taille * 4 + 1))
  for (let y = 0; y < taille; y++) {
    const dep = y * (taille * 4 + 1)
    brut[dep] = 0 // filtre « aucun »
    rgba.copy(brut, dep + 1, y * taille * 4, (y + 1) * taille * 4)
  }
  writeFileSync(
    chemin,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      bloc('IHDR', ihdr),
      bloc('IDAT', deflateSync(brut, { level: 9 })),
      bloc('IEND', Buffer.alloc(0)),
    ]),
  )
}

/* ================= la fabrication ================= */

const source = lirePng(new URL('./logo-source.png', import.meta.url))
console.log(`source : ${source.l} × ${source.h}`)

/* On RECADRE SUR LE DESSIN avant de réduire. Un logo exporté traîne
   presque toujours une marge transparente ; la garder reviendrait à
   fabriquer des icônes qui paraissent plus petites que les voisines
   sur l'écran d'accueil. */
let x0 = source.l
let y0 = source.h
let x1 = 0
let y1 = 0
for (let y = 0; y < source.h; y++) {
  for (let x = 0; x < source.l; x++) {
    if (source.px[(y * source.l + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
}
// un cadre CARRÉ autour du dessin : réduire un rectangle le déformerait
const cx = (x0 + x1) / 2
const cy = (y0 + y1) / 2
const cote = Math.max(x1 - x0, y1 - y0) * 1.04
console.log(`dessin utile : ${Math.round(x1 - x0)} × ${Math.round(y1 - y0)}`)

const cadre = { x: cx - cote / 2, y: cy - cote / 2, c: cote }

/** Le fond des icônes opaques : le blanc cassé du thème clair. */
const FOND = [252, 250, 251]

/* LE FAVICON N'EST PAS L'ICÔNE EN PETIT.

   À 16 pixels, le logo entier rend une tache rouge : les flammes
   remplissent tout, et l'œil — la seule chose reconnaissable —
   n'occupe plus que six pixels. On RECADRE donc sur l'œil, en ne
   gardant des flammes que ce qui déborde du cadre. On perd la
   composition, on garde le sujet ; à cette taille, c'est le bon
   échange. Les grandes icônes, elles, montrent le logo entier. */
const OEIL = 0.56

const sorties = [
  // le favicon garde sa transparence : l'onglet a sa propre couleur
  ['favicon-32.png', 32, 'transparent', OEIL],
  ['favicon-48.png', 48, 'transparent', OEIL],
  // iOS remplit de noir toute transparence : on pose donc le fond
  ['icone-180.png', 180, 'opaque', 1],
  ['icone-192.png', 192, 'opaque', 1],
  ['icone-512.png', 512, 'opaque', 1],
  // masquable : le lanceur rogne jusqu'à 20 %, le dessin recule
  ['icone-maskable-512.png', 512, 'masquable', 1],
]

for (const [nom, taille, mode, part] of sorties) {
  const c = cadre.c * part
  let px = reduire(source, taille, cx - c / 2, cy - c / 2, c, c)
  if (mode === 'masquable') px = surFond(marger(px, taille, 0.74), taille, FOND)
  else if (mode === 'opaque') px = surFond(px, taille, FOND)
  ecrirePng(new URL(`../public/${nom}`, import.meta.url), taille, px)
  console.log(`${nom} — ${taille}×${taille} (${mode}${part < 1 ? ', recadré sur l’œil' : ''})`)
}
