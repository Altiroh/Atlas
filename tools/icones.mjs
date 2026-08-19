/* ---------------------------------------------------------------
   Génère les icônes PNG de l'app, sans aucune dépendance.

   Le motif est L'ŒIL — le même qu'à l'écran de connexion et dans la
   bulle — sur un fond rouge, la couleur par défaut d'Atlas.

   Pourquoi pas un SVG : iOS exige un PNG pour `apple-touch-icon`, et
   c'est justement la plateforme cible (D5). On écrit donc de vrais
   PNG à la main — en-tête, données compressées par zlib, CRC de
   chaque bloc.

   Tout est fait de disques : pas de rastérisation de tracé, juste
   des distances au centre. C'est ce qui permet de rester net à
   32 pixels comme à 512.

     node tools/icones.mjs
   --------------------------------------------------------------- */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

/* ================= écriture PNG ================= */

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

function png(taille, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(taille, 0)
  ihdr.writeUInt32BE(taille, 4)
  ihdr[8] = 8 // 8 bits par canal
  ihdr[9] = 6 // RVBA
  // Chaque ligne est précédée de son octet de filtre (0 = aucun).
  const brut = Buffer.alloc(taille * (taille * 4 + 1))
  for (let y = 0; y < taille; y++) {
    const dep = y * (taille * 4 + 1)
    brut[dep] = 0
    rgba.copy(brut, dep + 1, y * taille * 4, (y + 1) * taille * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloc('IHDR', ihdr),
    bloc('IDAT', deflateSync(brut, { level: 9 })),
    bloc('IEND', Buffer.alloc(0)),
  ])
}

/* ================= couleurs ================= */

function hsl(h, s, l) {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const seg = Math.floor(h / 60) % 6
  const t =
    seg === 0 ? [c, x, 0] : seg === 1 ? [x, c, 0] : seg === 2 ? [0, c, x] :
    seg === 3 ? [0, x, c] : seg === 4 ? [x, 0, c] : [c, 0, x]
  return t.map((v) => (v + m) * 255)
}

// L'accent par défaut d'Atlas : le rouge, hsl(359 92% 58%).
const FOND_HAUT = hsl(357, 94, 63)
const FOND_BAS = hsl(10, 90, 47)
const BLANC = [251, 251, 253]
const IRIS_CLAIR = hsl(357, 88, 60)
const IRIS_VIF = hsl(357, 92, 44)
const IRIS_SOMBRE = hsl(357, 88, 24)
const PUPILLE = hsl(357, 55, 8)
// la paupière n'est pas blanche : c'est ce gris bleuté qui empêche
// l'œil de se dissoudre dans le verre (même choix que dans OeilAtlas)
const PAUPIERE = [176, 180, 196]

const melange = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

/* ================= dessin ================= */

const SS = 4 // sur-échantillonnage : 4×4 par pixel

const BLANC_PUR = [255, 255, 255]
const doux = (t) => t * t * (3 - 2 * t) // adoucit un bord net

/**
 * Distance signée au carré à coins arrondis — négative à l'intérieur.
 * Une distance plutôt qu'un booléen : c'est elle qui permet de poser
 * le liseré de verre le long du bord, à épaisseur constante y compris
 * dans les coins.
 */
function sdfCarre(px, py, r) {
  const dx = Math.abs(px - 0.5) - (0.5 - r)
  const dy = Math.abs(py - 0.5) - (0.5 - r)
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r
}

/* Les halos derrière le verre. Ce sont EUX qui font le verre : sans
   rien à travers quoi regarder, une plaque translucide ne se voit pas.
   Mêmes teintes que l'aurore de l'écran de connexion. */
const HALOS = [
  { x: 0.2, y: 0.16, r: 0.5, c: hsl(20, 100, 68), f: 0.85 },
  { x: 0.86, y: 0.34, r: 0.44, c: hsl(338, 92, 58), f: 0.7 },
  { x: 0.62, y: 0.95, r: 0.52, c: hsl(4, 84, 34), f: 0.8 },
  { x: 0.08, y: 0.82, r: 0.36, c: hsl(348, 88, 46), f: 0.55 },
]

function dessiner(taille, pleinBord) {
  const rgba = Buffer.alloc(taille * taille * 4)
  // masquable : le carré va bord à bord, c'est le lanceur qui découpe
  const rayonCoin = pleinBord ? 0 : 0.235
  // sur une icône masquable, les bords sont rognés : l'œil rétrécit
  const k = pleinBord ? 0.66 : 1

  /* L'amande — l'œil, pas un objectif photo. Elle naît de l'INTERSECTION
     DE DEUX GRANDS DISQUES, l'un posé au-dessus, l'autre en dessous :
     c'est la construction la moins chère qui donne deux vraies paupières
     courbes, et elle reste exacte à toutes les tailles. */
  const DEMI_L = 0.335 * k // demi-largeur
  const DEMI_H = 0.158 * k // demi-hauteur
  const R_ARC = (DEMI_L * DEMI_L + DEMI_H * DEMI_H) / (2 * DEMI_H)
  const ECART = R_ARC - DEMI_H // de quoi décaler chaque centre

  const R_IRIS = 0.133 * k
  const R_PUPILLE = 0.056 * k
  const R_LUEUR = 0.037 * k
  const R_ECLAT = 0.015 * k
  const TRAIT = Math.max(1.2 / taille, 0.008 * k) // la ligne de paupière

  // le liseré s'épaissit avec la taille, mais jamais sous un pixel
  const LISERE = Math.max(1.4 / taille, 0.011)

  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      let couleur = [0, 0, 0]
      let alpha = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = (x + (sx + 0.5) / SS) / taille
          const py = (y + (sy + 0.5) / SS) / taille
          const bord = sdfCarre(px, py, rayonCoin)
          if (bord > 0) continue

          /* ── 1. ce qu'il y a DERRIÈRE la vitre ───────────────── */
          let c = melange(FOND_HAUT, FOND_BAS, doux(py))
          for (const h of HALOS) {
            const t = Math.hypot(px - h.x, py - h.y) / h.r
            if (t < 1) c = melange(c, h.c, h.f * doux(1 - t) ** 1.6)
          }

          /* ── 2. la vitre : givre, reflet, liseré ─────────────── */
          // le givre — un voile blanc plus dense en haut, comme un
          // dépoli qui capte la lumière du jour
          c = melange(c, BLANC_PUR, 0.07 + 0.13 * (1 - doux(py)))
          // le reflet — une large bande diagonale, la signature du verre
          const bande = Math.abs(px + py * 0.85 - 0.62)
          if (bande < 0.3) c = melange(c, BLANC_PUR, 0.16 * doux(1 - bande / 0.3))
          // le liseré — vif en haut, presque éteint en bas : c'est ce
          // dégradé le long du bord qui donne l'épaisseur
          const d = -bord
          if (d < LISERE) {
            const haut = 1 - doux(Math.min(1, py * 1.15))
            c = melange(c, BLANC_PUR, (0.12 + 0.5 * haut) * doux(1 - d / LISERE))
          }

          /* ── 3. l'œil, POSÉ SUR la vitre ─────────────────────── */
          // distance restante avant chaque paupière : positive dedans
          const hautDispo = R_ARC - Math.hypot(px - 0.5, py - (0.5 + ECART))
          const basDispo = R_ARC - Math.hypot(px - 0.5, py - (0.5 - ECART))
          const dedans = Math.min(hautDispo, basDispo)

          if (dedans > 0) {
            c = BLANC
            const de = Math.hypot(px - 0.5, py - 0.5)
            if (de < R_IRIS) {
              // l'iris se creuse du centre vers le bord
              const t = de / R_IRIS
              c = t < 0.55 ? melange(IRIS_CLAIR, IRIS_VIF, t / 0.55) : melange(IRIS_VIF, IRIS_SOMBRE, (t - 0.55) / 0.45)
              if (de < R_PUPILLE) c = PUPILLE
            }

            // le globe garde un peu du reflet de la vitre : sans ça il
            // aurait l'air collé par-dessus, pas posé dedans
            c = melange(c, BLANC_PUR, 0.16 * doux(Math.max(0, 1 - py * 1.7)))

            // l'ombre de la paupière supérieure, puis le trait qui ferme
            // l'amande : sans lui, l'œil bave sur le verre
            if (hautDispo < 0.055 * k) {
              c = melange(c, PAUPIERE, 0.3 * doux(1 - hautDispo / (0.055 * k)))
            }
            if (dedans < TRAIT) c = melange(c, PAUPIERE, doux(1 - dedans / TRAIT))

            // la lueur ne déborde jamais de l'œil
            const dl = Math.hypot(px - (0.5 - 0.04 * k), py - (0.5 - 0.045 * k))
            if (dl < R_LUEUR) c = melange(c, BLANC_PUR, 1 - (dl / R_LUEUR) ** 2)

            const dc = Math.hypot(px - (0.5 + 0.052 * k), py - (0.5 + 0.05 * k))
            if (dc < R_ECLAT) c = melange(c, BLANC_PUR, 0.6 * (1 - dc / R_ECLAT))
          }

          couleur = [couleur[0] + c[0], couleur[1] + c[1], couleur[2] + c[2]]
          alpha++
        }
      }

      const i = (y * taille + x) * 4
      if (alpha > 0) {
        rgba[i] = Math.round(couleur[0] / alpha)
        rgba[i + 1] = Math.round(couleur[1] / alpha)
        rgba[i + 2] = Math.round(couleur[2] / alpha)
      }
      rgba[i + 3] = Math.round((alpha / (SS * SS)) * 255)
    }
  }
  return png(taille, rgba)
}

mkdirSync(new URL('../public/', import.meta.url), { recursive: true })

const sorties = [
  ['favicon-32.png', 32, false],
  ['favicon-48.png', 48, false],
  ['icone-180.png', 180, false],
  ['icone-192.png', 192, false],
  ['icone-512.png', 512, false],
  ['icone-maskable-512.png', 512, true],
]

for (const [nom, taille, plein] of sorties) {
  writeFileSync(new URL(`../public/${nom}`, import.meta.url), dessiner(taille, plein))
  console.log(`${nom} — ${taille}×${taille}`)
}
