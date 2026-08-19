/* ---------------------------------------------------------------
   Génère les icônes PNG de l'app, sans aucune dépendance.

   Pourquoi pas un SVG : iOS exige un PNG pour `apple-touch-icon`,
   et c'est justement la plateforme cible (D5). On écrit donc de
   vrais PNG à la main — en-tête, données compressées par zlib,
   CRC de chaque bloc.

     node tools/icones.mjs
   --------------------------------------------------------------- */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

/* --- CRC32, exigé par le format PNG --- */

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

function png(largeur, hauteur, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largeur, 0)
  ihdr.writeUInt32BE(hauteur, 4)
  ihdr[8] = 8 // 8 bits par canal
  ihdr[9] = 6 // RVBA
  // Chaque ligne est précédée de son octet de filtre (0 = aucun).
  const brut = Buffer.alloc(hauteur * (largeur * 4 + 1))
  for (let y = 0; y < hauteur; y++) {
    const dep = y * (largeur * 4 + 1)
    brut[dep] = 0
    rgba.copy(brut, dep + 1, y * largeur * 4, (y + 1) * largeur * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ])
}

/* --- dessin --- */

// L'éclair d'Atlas, en coordonnées 0..1
const ECLAIR = [
  [0.585, 0.055],
  [0.225, 0.55],
  [0.455, 0.55],
  [0.415, 0.945],
  [0.775, 0.45],
  [0.545, 0.45],
]

function dansPolygone(px, py, pts) {
  let dedans = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) dedans = !dedans
  }
  return dedans
}

/** Carré à coins arrondis, en coordonnées 0..1 */
function dansCarre(px, py, r) {
  const dx = Math.max(r - px, 0, px - (1 - r))
  const dy = Math.max(r - py, 0, py - (1 - r))
  return dx * dx + dy * dy <= r * r
}

function hslRgb(h, s, l) {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const seg = Math.floor(h / 60) % 6
  const t =
    seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x] :
    seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x]
  return t.map((v) => Math.round((v + m) * 255))
}

// « Ciel », l'accent par défaut, et une variante plus profonde pour le dégradé
const HAUT = hslRgb(196, 95, 66)
const BAS = hslRgb(214, 92, 52)
const ENCRE = hslRgb(206, 60, 12)

const SS = 4 // sur-échantillonnage : 4×4 par pixel, pour des bords nets

function dessiner(taille, pleinBord) {
  const rgba = Buffer.alloc(taille * taille * 4)
  const rayon = pleinBord ? 0 : 0.235
  // sur une icône masquable, iOS/Android rognent les bords : on réduit l'éclair
  const echelle = pleinBord ? 0.66 : 1
  const decal = (1 - echelle) / 2

  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let fond = 0
      let trait = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / taille
          const py = (y + (sy + 0.5) / SS) / taille
          if (!dansCarre(px, py, rayon)) continue
          fond++
          if (dansPolygone((px - decal) / echelle, (py - decal) / echelle, ECLAIR)) trait++
        }
      }
      const n = SS * SS
      const aFond = fond / n
      const aTrait = trait / n
      const t = y / taille
      const base = [
        HAUT[0] + (BAS[0] - HAUT[0]) * t,
        HAUT[1] + (BAS[1] - HAUT[1]) * t,
        HAUT[2] + (BAS[2] - HAUT[2]) * t,
      ]
      const i = (y * taille + x) * 4
      for (let c = 0; c < 3; c++) {
        rgba[i + c] = Math.round(base[c] * (1 - aTrait) + ENCRE[c] * aTrait)
      }
      rgba[i + 3] = Math.round(aFond * 255)
    }
  }
  return png(taille, taille, rgba)
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })

const sorties = [
  ['icone-180.png', 180, false],
  ['icone-192.png', 192, false],
  ['icone-512.png', 512, false],
  ['icone-maskable-512.png', 512, true],
]

for (const [nom, taille, plein] of sorties) {
  const chemin = new URL(`../public/${nom}`, import.meta.url)
  writeFileSync(chemin, dessiner(taille, plein))
  console.log(`${nom} — ${taille}×${taille}`)
}
