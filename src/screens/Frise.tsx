import { useMemo, useState } from 'react'
import { idDans, type Evenement } from '../store/formes'
import { IconChevron, IconFrise, IconPlus, IconTrash } from '../ui/Icon'
import { BarreCanevas, OutilCanevas, SeparateurCanevas } from '../ui/BarreCanevas'

/* ---------------------------------------------------------------
   LA CHRONOLOGIE.

   Un axe, des jalons. Elle sert d'abord au mode Bouquin (docs/01
   § 10, V3) : un roman se tient à sa timeline, et une timeline de
   fiction NE SE DATE PAS. « Au printemps suivant », « an 12 du
   règne », « trois ans plus tôt » — un vrai champ date obligerait à
   inventer des dates fausses pour pouvoir placer les choses.

   D'où la décision qui structure tout : `ordre` est un NOMBRE qui
   place, `quand` est du TEXTE LIBRE qui raconte. L'un n'est jamais
   déduit de l'autre.

   L'ESPACEMENT EST RÉGULIER, jamais proportionnel. Puisqu'il n'y a
   pas de métrique, mettre deux fois plus de place entre deux
   événements affirmerait une durée que personne n'a saisie. Les
   colonnes se suivent donc à intervalle constant : elles disent
   l'ordre, et rien d'autre.

   `ordre` est FRACTIONNAIRE. Insérer entre deux jalons prend la
   moyenne des deux, et rien d'autre n'est renuméroté — une
   renumérotation générale à chaque insertion, c'est toute la note
   réécrite, et la synchronisation qui repart avec.

   Deux événements de même `ordre` partagent leur colonne : c'est
   exactement ce qu'on attend de deux fils parallèles — le récit et
   l'histoire réelle, ou deux personnages qui vivent la même scène.
   --------------------------------------------------------------- */

/** En deçà, deux `ordre` voisins ne se distinguent plus en flottant. */
const GRAIN = 1e-6

/**
 * Renumérote de 0, 1, 2… quand les moyennes successives ont fini par
 * se toucher. Une cinquantaine d'insertions au même endroit suffit ;
 * ça n'arrivera probablement jamais, et le jour où ça arrive, la
 * frise cesserait silencieusement d'accepter des jalons.
 */
function assainir(evs: Evenement[]): Evenement[] {
  const ordres = [...new Set(evs.map((e) => e.ordre))].sort((a, b) => a - b)
  const serre = ordres.some((o, i) => i > 0 && o - ordres[i - 1] < GRAIN)
  if (!serre) return evs
  const rang = new Map(ordres.map((o, i) => [o, i]))
  return evs.map((e) => ({ ...e, ordre: rang.get(e.ordre) ?? 0 }))
}

export function Frise({
  evenements,
  ecrire,
}: {
  evenements: Evenement[]
  ecrire: (e: Evenement[]) => void
}) {
  const [selection, setSelection] = useState<string | null>(null)
  /** pistes demandées à la main, en plus de celles que les données imposent */
  const [pistesVoulues, setPistesVoulues] = useState(1)

  const colonnes = useMemo(
    () => [...new Set(evenements.map((e) => e.ordre))].sort((a, b) => a - b),
    [evenements],
  )
  const pistes = Math.max(pistesVoulues, ...evenements.map((e) => (e.piste ?? 0) + 1), 1)

  const poser = (evs: Evenement[]) => ecrire(assainir(evs))

  const ajouter = (ordre: number, piste: number) => {
    const e: Evenement = { id: idDans('ev'), titre: '', ordre, piste }
    poser([...evenements, e])
    setSelection(e.id)
  }

  const maj = (id: string, patch: Partial<Evenement>) =>
    poser(evenements.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const retirer = (id: string) => {
    poser(evenements.filter((e) => e.id !== id))
    setSelection(null)
  }

  /**
   * Déplacer d'une colonne : l'événement se pose dans un intervalle
   * VIDE, entre sa voisine et l'avant-voisine. Le poser sur l'`ordre`
   * de la voisine le ferait entrer dans sa colonne au lieu de la
   * dépasser — ce qui ressemble à un bug alors que c'est une fusion.
   */
  const decaler = (e: Evenement, sens: -1 | 1) => {
    const i = colonnes.indexOf(e.ordre)
    if (sens < 0) {
      if (i <= 0) return
      const avant = colonnes[i - 1]
      const encoreAvant = colonnes[i - 2] ?? avant - 2
      maj(e.id, { ordre: (avant + encoreAvant) / 2 })
    } else {
      if (i < 0 || i >= colonnes.length - 1) return
      const apres = colonnes[i + 1]
      const encoreApres = colonnes[i + 2] ?? apres + 2
      maj(e.id, { ordre: (apres + encoreApres) / 2 })
    }
  }

  const choisi = evenements.find((e) => e.id === selection) ?? null

  /* La suite des emplacements : un intervalle, une colonne, un
     intervalle… Les intervalles sont de vraies cellules et non des
     marges, parce que c'est là qu'on clique pour insérer. */
  const emplacements: ({ type: 'entre'; ordre: number } | { type: 'colonne'; ordre: number })[] = []
  if (!colonnes.length) {
    emplacements.push({ type: 'entre', ordre: 0 })
  } else {
    emplacements.push({ type: 'entre', ordre: colonnes[0] - 1 })
    colonnes.forEach((o, i) => {
      emplacements.push({ type: 'colonne', ordre: o })
      const suivant = colonnes[i + 1]
      emplacements.push({ type: 'entre', ordre: suivant === undefined ? o + 1 : (o + suivant) / 2 })
    })
  }

  return (
    <div className="frise">
      <div className="frise__defile">
        <div
          className="frise__grille"
          style={{
            gridTemplateColumns: emplacements
              .map((e) => (e.type === 'entre' ? '30px' : '218px'))
              .join(' '),
            gridTemplateRows: `repeat(${pistes}, minmax(132px, auto))`,
          }}
        >
          {Array.from({ length: pistes }).flatMap((_, piste) =>
            emplacements.map((emp, i) => {
              const ici = evenements.filter(
                (e) => e.ordre === emp.ordre && (e.piste ?? 0) === piste,
              )
              return (
                <div
                  key={`${piste}-${i}`}
                  className="frise__case"
                  data-entre={emp.type === 'entre' || undefined}
                >
                  {emp.type === 'colonne' && ici.length > 0 ? (
                    ici.map((e) => (
                      <Carte
                        key={e.id}
                        e={e}
                        actif={selection === e.id}
                        choisir={() => setSelection(e.id)}
                        maj={maj}
                      />
                    ))
                  ) : (
                    <button
                      className="frise__ajout"
                      aria-label="Ajouter un événement ici"
                      onClick={() => ajouter(emp.ordre, piste)}
                    >
                      <IconPlus size={15} />
                    </button>
                  )}
                </div>
              )
            }),
          )}
        </div>
      </div>

      <BarreCanevas>
        <OutilCanevas
          titre="Ajouter un événement à la fin"
          onClick={() => ajouter((colonnes[colonnes.length - 1] ?? -1) + 1, 0)}
        >
          <IconPlus size={17} />
        </OutilCanevas>
        <OutilCanevas titre="Ajouter une piste" onClick={() => setPistesVoulues(pistes + 1)}>
          <IconFrise size={17} />
        </OutilCanevas>

        {choisi && (
          <>
            <SeparateurCanevas />
            <OutilCanevas
              titre="Plus tôt"
              desactive={colonnes.indexOf(choisi.ordre) <= 0}
              onClick={() => decaler(choisi, -1)}
            >
              <IconChevron size={17} />
            </OutilCanevas>
            <OutilCanevas
              titre="Plus tard"
              desactive={colonnes.indexOf(choisi.ordre) >= colonnes.length - 1}
              onClick={() => decaler(choisi, 1)}
            >
              <IconChevron size={17} style={{ transform: 'rotate(180deg)' }} />
            </OutilCanevas>
            <OutilCanevas
              titre="Monter d’une piste"
              desactive={(choisi.piste ?? 0) === 0}
              onClick={() => maj(choisi.id, { piste: Math.max(0, (choisi.piste ?? 0) - 1) })}
            >
              <IconChevron size={17} style={{ transform: 'rotate(90deg)' }} />
            </OutilCanevas>
            <OutilCanevas
              titre="Descendre d’une piste"
              onClick={() => {
                const suivante = (choisi.piste ?? 0) + 1
                if (suivante >= pistes) setPistesVoulues(suivante + 1)
                maj(choisi.id, { piste: suivante })
              }}
            >
              <IconChevron size={17} style={{ transform: 'rotate(-90deg)' }} />
            </OutilCanevas>
            <OutilCanevas titre="Retirer" onClick={() => retirer(choisi.id)}>
              <IconTrash size={16} />
            </OutilCanevas>
          </>
        )}
      </BarreCanevas>

      {!evenements.length && (
        <div className="frise__vide">
          <IconFrise size={26} />
          <p>Rien sur l’axe.</p>
          <button className="btn btn--accent" onClick={() => ajouter(0, 0)}>
            Poser le premier jalon
          </button>
          <span>
            La date s’écrit comme on la dit — « au printemps suivant » vaut le 12 mars.
          </span>
        </div>
      )}
    </div>
  )
}

/* ================= un jalon ================= */

function Carte({
  e,
  actif,
  choisir,
  maj,
}: {
  e: Evenement
  actif: boolean
  choisir: () => void
  maj: (id: string, patch: Partial<Evenement>) => void
}) {
  return (
    <article className="jalon" data-actif={actif || undefined} onPointerDown={choisir}>
      <span className="jalon__point" aria-hidden="true" />
      <input
        className="jalon__quand"
        value={e.quand ?? ''}
        placeholder="Quand"
        onChange={(v) => maj(e.id, { quand: v.target.value })}
        onFocus={choisir}
        aria-label="Quand"
      />
      <input
        className="jalon__titre"
        value={e.titre}
        placeholder="Ce qui arrive"
        onChange={(v) => maj(e.id, { titre: v.target.value })}
        onFocus={choisir}
        aria-label="Événement"
      />
      {/* La note ne s'ouvre qu'à la demande : trente jalons avec chacun
          trois lignes de commentaire, ce n'est plus une frise. */}
      {(actif || e.note?.trim()) && (
        <textarea
          className="jalon__note"
          value={e.note ?? ''}
          placeholder="Note"
          rows={2}
          onChange={(v) => maj(e.id, { note: v.target.value })}
          onFocus={choisir}
          aria-label="Note"
        />
      )}
    </article>
  )
}
