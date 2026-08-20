import { useAtlas } from '../store/atlas'
import { lisible, QUOTA_IMAGES, QUOTA_POSTS, usage } from '../store/quota'

/* ---------------------------------------------------------------
   LE RAPPEL DE PLACE OCCUPÉE — un composant, deux domiciles.

   Il suit la question à laquelle il répond, et cette question change
   selon qu'on est connecté ou non :

   · SANS COMPTE, la place est celle de CET APPAREIL, et rien d'autre
     ne la garde. C'est un réglage de l'app : il vit dans Réglages.
   · AVEC UN COMPTE, la même place devient celle du nuage — ce qu'on
     consomme chez l'hébergeur, ce qui se synchronise, ce qu'un plafond
     finira par arrêter. C'est une affaire de compte : il déménage.

   Un seul composant, jamais deux : deux jauges côte à côte finiraient
   par diverger, et c'est précisément le genre de chiffre que personne
   ne va vérifier.

   Deux jauges à l'intérieur, en revanche : le texte et les images ne
   coûtent pas la même chose, et les additionner effacerait ce qui
   compte (docs/08 § 3).
   --------------------------------------------------------------- */
export function Stockage() {
  const posts = useAtlas((s) => s.posts)
  const espaces = useAtlas((s) => s.espaces)
  // dépendances de recalcul : la lecture est instantanée grâce au registre
  void posts
  void espaces
  const u = usage()

  const barre = (part: number) => Math.min(100, Math.max(1.5, Math.round(part * 100)))
  const etat = (part: number) => (part >= 1 ? 'plein' : part >= 0.8 ? 'proche' : 'ok')

  return (
    <section className="setting glass">
      <div className="setting__label">Place occupée</div>
      <div className="setting__hint">
        Le plafond n'est pas un chiffre choisi : c'est un usage intense mesuré, doublé. Quelqu'un
        de normal ne doit jamais le rencontrer.
      </div>

      <div className="setting__body">
        <div className="quota" data-etat={etat(u.partImages)}>
          <div className="quota__ligne">
            <span className="quota__titre">Images</span>
            <span className="quota__chiffre">
              {lisible(u.octetsImages)} <span>sur {lisible(QUOTA_IMAGES)}</span>
            </span>
          </div>
          <div className="quota__barre">
            <span style={{ width: `${barre(u.partImages)}%` }} />
          </div>
          <p className="quota__note">
            {u.images} image{u.images > 1 ? 's' : ''} — réduites et réencodées, elles pèsent une
            dizaine de kilo-octets chacune. C'est le seul poste qui coûte vraiment.
          </p>
        </div>

        <div className="quota" data-etat={etat(u.partPosts)} style={{ marginTop: 18 }}>
          <div className="quota__ligne">
            <span className="quota__titre">Notes</span>
            <span className="quota__chiffre">
              {u.posts} <span>sur {QUOTA_POSTS.toLocaleString('fr-FR')}</span>
            </span>
          </div>
          <div className="quota__barre">
            <span style={{ width: `${barre(u.partPosts)}%` }} />
          </div>
          <p className="quota__note">
            {lisible(u.octetsTexte)} de texte. <strong>Écrire n'est jamais bloqué</strong> — c'est
            la promesse d'Atlas, un plafond ne doit pas l'empêcher.
          </p>
        </div>

        {u.plein && (
          <p className="field__erreur" role="alert" style={{ marginTop: 16, marginBottom: 0 }}>
            Plafond d'images atteint. Retires-en quelques-unes, ou supprime des posts qui en
            portent. Le texte, lui, continue de passer.
          </p>
        )}
      </div>
    </section>
  )
}