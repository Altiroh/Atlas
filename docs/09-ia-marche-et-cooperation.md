# Atlas — L'IA, le marché, et la coopération

> Trois questions posées ensemble, parce qu'elles se répondent :
> **est-ce qu'Atlas tient face aux autres ?**, **combien coûte le compagnon ?**,
> et **peut-on travailler à plusieurs dedans ?**
>
> Suite de [08-economie.md](08-economie.md), qui chiffrait le stockage. Ici on chiffre
> l'intelligence — et on regarde ce qu'on vend, à qui, contre qui.
>
> Tarifs Anthropic relevés le 24/06/2026. Change retenu : **1,08 $ pour 1 €**.
> TVA française à 20 % : un prix affiché TTC vaut **prix ÷ 1,2** en recette réelle.

---

## PARTIE 1 — Est-ce qu'Atlas tient le comparatif ?

### 1.1 La réponse courte

**Oui sur la forme, oui sur les fondations, non sur l'écosystème — et le prix de 12,50 €
n'est défendable que si le compagnon existe vraiment.**

C'est le point à retenir avant tout le reste : à 12,50 €, Atlas se place **en haut de la
fourchette** des outils de notes personnels. Vendre ce prix pour « plus de place » serait
intenable. Le vendre pour « Atlas prend la parole » se défend — à condition que la parole
soit bonne. La décision de mettre l'IA dans le premier palier payant est donc la bonne :
c'est elle qui justifie le montant.

### 1.2 Où Atlas gagne vraiment

| Force | Pourquoi c'est rare |
|---|---|
| **Six formes dans une même note** | Fiche, carte mentale, dessin, planche, table, chronologie — en onglets, sur le même objet. Les autres séparent : un outil de tableau blanc, un outil de notes, un outil de planches. Atlas met le plan de chapitre et sa planche d'ambiance à un clic l'un de l'autre. |
| **Le hors-ligne vérifié** | Beaucoup l'annoncent, peu le tiennent. Atlas démarre serveur éteint, et ça a été testé. |
| **L'export sans dépendance** | Markdown lisible + JSON fidèle + images d'origine, écrit sans une seule bibliothèque. La plupart des exports concurrents perdent la structure ou les images. |
| **La capture en dix secondes** | L'app s'ouvre sur le curseur. C'est le territoire des outils de capture pure — et Atlas y ajoute tout le reste. |
| **La direction artistique** | Le verre, les halos, l'accent qui reteinte toute l'app. Sur un marché où tout est blanc et plat, c'est un argument réel auprès de créatifs. |
| **Le compagnon qui relance** | Personne ne fait bien la remontée spontanée de ce qu'on a oublié avoir écrit. C'est le vrai différenciateur — et il n'existe pas encore. |

### 1.3 Où Atlas perd, franchement

| Faiblesse | Gravité | Remédiable ? |
|---|---|---|
| **Pas de collaboration** | 🟠 ferme tout le marché des équipes | oui, voir partie 3 |
| **Application web installée, pas native** | 🔴 **le vrai handicap** : pas de widget d'écran d'accueil, pas d'intégration aux raccourcis du système, synchronisation en arrière-plan limitée, quota de stockage à la merci du navigateur | difficilement, sans une vraie app |
| **Pas de capture depuis le web** | 🟠 le partage système couvre une partie, pas tout | oui, effort moyen |
| **Pas d'écosystème d'extensions** | 🟡 c'est la douve d'un concurrent connu, pas un besoin de tous | non, et ce n'est pas grave |
| **Pas de recherche sémantique** | 🟡 la recherche est lexicale | oui, et c'est justement le sujet de la partie 2 |
| **Un seul développeur** | 🟠 objection réelle quand on confie des années de travail | l'export complet est la réponse, et il faut la mettre en avant |

**Le handicap natif est celui qui coûte le plus cher.** Le moment ⚡ — capturer en dix
secondes — repose sur la vitesse d'accès, et c'est exactement ce qu'une application web
installée fait moins bien qu'une application native. Un widget d'écran d'accueil et une
action de raccourci système valent plus, pour ce produit, que trois fonctions de plus.

### 1.4 Ce que le prix implique

Ordre de grandeur du marché des outils de pensée personnels : **4 à 12 € par mois**. Les
formules d'équipe montent plus haut, mais elles vendent des sièges, pas un usage
personnel. *(À revérifier avant publication : ces prix bougent.)*

Trois conséquences :

1. **12,50 € est un prix de haut de fourchette.** Il tient si l'acheteur comprend qu'il
   paie une intelligence, pas un disque dur.
2. **24,99 € sort de la fourchette du personnel.** C'est un prix de professionnel. Le plan
   Créatif doit donc s'adresser à quelqu'un qui produit tous les jours et pour qui Atlas
   remplace deux outils — et il faut que la page le dise.
3. **Le gratuit doit rester très large.** C'est lui qui fait entrer les gens, et c'est le
   seul canal d'acquisition d'un projet sans budget publicitaire.

---

## PARTIE 2 — Combien coûte le compagnon

### 2.1 La règle

> **Ce qui peut se calculer se calcule. Ce qui reste va au modèle.**

Atlas possède déjà trente-sept logiques déterministes, dont un moteur de mots
(`motsDe`, `nu()`, la bibliothèque de sujets). Ce moteur fait gratuitement le gros du
travail de rapprochement : il propose les candidats. Le modèle n'a plus qu'à **trancher et
formuler** sur une dizaine de candidats, au lieu de comparer dix mille notes entre elles.

C'est ce qui fait passer le coût d'un ordre de grandeur inabordable à quelques centimes.

**Les relances ne coûtent rien du tout.** `ceQuiDort`, `espaceDelaisse`, `tachesOuvertes`
existent déjà et sont purement déterministes. Il n'y a aucune raison d'y mettre un modèle.

### 2.2 Les trois leviers qui divisent la facture

| Levier | Effet | Où il s'applique |
|---|---|---|
| **Le lot** (Batch API) | **−50 %** sur tout | Le briefing et les rapprochements. Ils se calculent la nuit, ils ne sont pas interactifs. |
| **Le cache de prompt** | lecture à **0,1×** le prix d'entrée | La consigne système et le profil de l'utilisateur, stables d'un jour à l'autre. |
| **Le bon modèle au bon endroit** | **×5** entre Haiku et Opus | Haiku pour le briefing (résumer une liste), Sonnet pour les rapprochements et les plans (juger, structurer). |

Le briefing du matin **doit** être calculé en lot vers 4 h et servi tout prêt à l'ouverture.
C'est deux fois moins cher, et c'est en plus instantané pour l'utilisateur — au lieu
d'attendre le modèle en ouvrant l'app.

### 2.3 Ce que consomme un abonné, par mois

Hypothèses posées sur le profil « régulier » de [08](08-economie.md) : 3 000 notes,
ouverture 22 jours par mois.

| Usage | Fréquence | Entrée fraîche | Entrée en cache | Sortie |
|---|---|---|---|---|
| Briefing du matin | 22 | 4 000 | 2 000 | 400 |
| Rapprochements | 4 | 15 000 | 6 000 | 2 000 |
| Relances | 4 | 2 000 | — | 300 |
| **Total Compagnon** | | **156 000** | **68 000** | **18 000** |
| Plan proposé *(Créatif)* | 8 | 3 000 | — | 1 200 |
| Nettoyage de dictée *(Créatif)* | 4 | 4 000 | — | 4 000 |
| **Ajout Créatif** | | **40 000** | — | **25 600** |

### 2.4 Le coût, selon le modèle retenu

Tarifs : Haiku 4.5 **1 $ / 5 $** par million · Sonnet 5 **3 $ / 15 $** · Opus 5 **5 $ / 25 $**
(entrée / sortie). Lecture de cache à 0,1× l'entrée. Remise de lot de 50 % appliquée au
Compagnon uniquement — le Créatif est interactif, il ne peut pas attendre la nuit.

| | Tout Haiku | **Mixte recommandé** | Tout Sonnet | Tout Opus |
|---|---|---|---|---|
| **Compagnon** / mois | 0,13 $ | **0,23 $** | 0,38 $ | 0,63 $ |
| **Créatif** / mois (avec le Compagnon) | 0,35 $ | **0,85 $** | 1,01 $ | 1,68 $ |
| En euros | 0,12 € / 0,32 € | **0,21 € / 0,79 €** | 0,35 € / 0,94 € | 0,58 € / 1,56 € |

Le **mixte** = Haiku pour le briefing et les relances, Sonnet pour les rapprochements et
les plans. C'est le point d'équilibre : la qualité là où elle se voit, l'économie là où
elle ne se voit pas.

> ⚠️ **La dictée n'est pas dans ces chiffres.** Anthropic ne fait pas de reconnaissance
> vocale. Il faut un fournisseur séparé, à budgéter autour de **0,005 à 0,01 $ la minute**
> — soit ~0,12 $/mois pour vingt minutes. À vérifier chez le prestataire retenu.
> Alternative gratuite : la dictée du clavier système, déjà utilisée aujourd'hui. Dans ce
> cas le modèle ne fait que **remettre en forme** un texte déjà transcrit, ce qui est
> précisément ce qui est chiffré ci-dessus.

### 2.5 La marge, par abonné

| | Compagnon | Créatif |
|---|---|---|
| Prix affiché (TTC) | 12,50 € | 24,99 € |
| Recette réelle (HT, TVA 20 %) | **10,42 €** | **20,83 €** |
| Coût IA — *compagnon seul, sans conversation* | 0,21 € | 0,79 € |
| Hébergement (part) | 0,05 € | 0,10 € |
| Frais de paiement (1,5 % + 0,25 €) | **0,44 €** | **0,62 €** |
| **Marge brute** | **9,72 € — 93 %** | **19,31 € — 93 %** |

> ⚠️ **Ce tableau décrit le compagnon SANS la table de travail.** Avec la conversation
> ancrée, les mémoires d'espace et les écritures de cache, le coût IA passe à **2,58 €** et
> **8,77 €**, et la marge à **71 %** et **54 %**. Le compte à jour est au § 2.7.

**Ce qui reste vrai des deux côtés :** au tarif Compagnon, les frais de paiement pèsent
autant qu'une part notable de l'IA, et le poste qui décide vraiment n'est ni l'un ni
l'autre — **c'est l'acquisition.**

### 2.6 Le seul vrai risque : l'usage extrême

Le calcul ci-dessus décrit un usage normal. Quelqu'un qui demande deux cents plans par
jour change l'équation. Voici la marge de manœuvre exacte :

| Plan | L'abonnement est absorbé à… |
|---|---|
| Compagnon | **50 fois** l'usage type |
| Créatif | **26 fois** l'usage type |

> **Un plafond mensuel à dix fois l'usage type protège tout, sans que personne de normal
> ne le rencontre jamais.** C'est exactement le raisonnement du quota d'images de
> [08 § 3](08-economie.md) : on double — ou ici, on décuple — l'usage intense mesuré.

Trois gardes, par ordre d'efficacité :

1. **Un compteur d'appels par compte et par mois**, côté serveur. Une ligne dans la base,
   un déclencheur.
2. **Le briefing en lot uniquement**, jamais à la demande — sinon il devient une boucle
   qu'on peut appeler cent fois.
3. **Le plan proposé plafonné à N par jour**, avec un message qui le dit avant de le
   refuser.

### 2.7 Le prévisionnel — *corrigé*

> ⚠️ **Ce paragraphe donnait 117 €/mois à 100 inscrits. C'était faux, d'un facteur deux.**
> Il datait d'avant la table de travail : l'IA y coûtait 0,21 € par abonné. Avec la
> conversation, les mémoires d'espace et les écritures de cache
> ([11](11-la-table-de-travail.md)), elle en coûte **2,58 €**. Voici le vrai compte.

#### Ce que rapporte un abonné, net

| | Compagnon | Créatif |
|---|---:|---:|
| Prix affiché | 12,50 € | 24,99 € |
| Recette réelle (HT) | 10,42 € | 20,82 € |
| Coût IA *(conversation, mémoires, cache compris)* | −2,58 € | −8,77 € |
| Frais de paiement | −0,44 € | −0,62 € |
| **Net par abonné** | **7,40 €** | **11,43 €** |

> **Le Créatif coûte deux fois plus cher et ne rapporte que 1,54 fois plus.** C'est
> mécanique : son prix double, mais sa consommation quadruple. **Le Compagnon a la
> meilleure économie unitaire du catalogue** — et ça devrait décider vers quoi on pousse
> les gens.

#### Les charges fixes, quel que soit le nombre

| | |
|---|---:|
| Hébergement (palier payant : sauvegardes, pas de mise en veille) | 23,00 € |
| Nom de domaine | 1,20 € |
| Trafic des comptes gratuits | 2,00 € |
| **Total** | **26,20 €/mois** |

**Quatre abonnés Compagnon les couvrent.** En dessous, le projet coûte de l'argent ;
au-dessus, il en gagne. Le seuil est à **4 % de conversion sur 100 inscrits.**

#### Sur 100 inscrits

| Scénario | Abonnés | Recette TTC | Recette HT | IA | Paiement | Fixes | **Résultat** |
|---|---|---:|---:|---:|---:|---:|---:|
| **Prudent** (5 % / 1 %) | 5 + 1 | 87 € | 73 € | 22 € | 3 € | 26 € | **22 €/mois** |
| **Attendu** (8 % / 2 %) | 8 + 2 | 150 € | 125 € | 38 € | 5 € | 26 € | **56 €/mois** |
| **Favorable** (15 % / 4 %) | 15 + 4 | 287 € | 240 € | 74 € | 9 € | 26 € | **131 €/mois** |

#### Ce que ça veut dire, sans enjoliver

**Cent inscrits, c'est un projet qui se paie tout seul — et rien de plus.** Cinquante-six
euros par mois couvrent l'hébergement, le domaine, et il reste de quoi offrir un café. Ce
n'est pas un revenu, et il ne faut pas le présenter comme tel.

Trois conséquences à assumer :

1. **Le chiffre intéressant n'est pas 100, il est 1 000.** Chaque tranche de cent inscrits
   supplémentaires rapporte **82 €** une fois les charges fixes couvertes. Pour dégager
   **1 000 €/mois net, il faut environ 1 250 inscrits.**
2. **C'est avant de se payer.** Si le projet demande vingt heures par mois, cinquante-six
   euros font **2,80 € de l'heure.** À cent utilisateurs, on ne travaille pas pour de
   l'argent — on travaille pour savoir si ça prend.
3. **Cent inscrits ne restent pas cent.** Aucune de ces lignes ne tient compte du départ des
   abonnés. Sur un outil personnel, en perdre 3 à 5 % par mois est ordinaire : il faut donc
   **recruter en permanence rien que pour ne pas reculer.**

#### Le levier le plus direct

Le quota de la table de travail décide seul de la moitié du coût du Créatif :

| Échanges / mois | Coût IA | Net par abonné |
|---:|---:|---:|
| 600 | 8,77 € | 11,43 € |
| 500 | 7,77 € | **12,43 €** |
| 400 | 6,76 € | **13,44 €** |

**Cent échanges en moins, c'est un euro de plus par abonné et par mois** — soit, à 100
inscrits en scénario attendu, deux euros. À 1 000 inscrits, vingt. Ça ne se joue pas à cent
utilisateurs ; ça se prépare maintenant, parce qu'un quota se réduit très mal une fois
annoncé.

### 2.8 Ce que ça change pour la vie privée

Le briefing et les rapprochements **envoient le texte des notes** à un tiers. Trois
conséquences à assumer, et à écrire noir sur blanc :

1. **Il faut le dire sur la page Infos**, pas dans des conditions générales. Aujourd'hui
   elle promet que personne ne lit tes idées — ce sera à nuancer le jour où un modèle les
   lit pour les résumer.
2. **Le compagnon doit être coupable espace par espace.** Quelqu'un qui écrit un journal
   intime et un scénario dans le même Atlas ne veut pas le même traitement pour les deux.
3. **Le chiffrement des espaces et le compagnon s'excluent — sur un même espace.** On ne
   résume pas ce qu'on ne peut pas lire. Ce n'est donc pas un arbitrage à trancher une fois,
   mais **un interrupteur par espace** : le chiffrement s'active exactement là où l'IA est
   coupée. Voir [12-avec-ou-sans-ia.md](12-avec-ou-sans-ia.md), qui en fait un mode
   revendiqué plutôt qu'un compromis subi.

---

## PARTIE 3 — Travailler à plusieurs : envisageable ?

### 3.1 Ce qui bloque aujourd'hui

Le moteur de synchronisation fusionne **au plus récent, note entière**. Deux personnes qui
ouvrent la même note en même temps : la dernière qui enregistre écrase l'autre, sans
avertissement et sans trace. Pour un usage mono-utilisateur multi-appareils, c'est le bon
compromis. **Pour deux personnes, c'est une perte de travail silencieuse** — le pire défaut
possible dans un outil où l'on écrit.

Tout le reste est déjà là : la dorsale, les comptes, le cloisonnement, la file d'attente,
les pierres tombales.

### 3.2 Quatre paliers, du moins cher au plus cher

| # | Palier | Ce que ça donne | Ce qu'il faut écrire | Effort | Risque de perte |
|---|---|---|---|---|---|
| **1** | **Partage en lecture** | Un lien vers une note ou un projet. La personne voit, ne touche à rien. | Une table `partages`, une règle de lecture publique, une page de rendu | **quelques jours** | nul |
| **2** | **Passage de main** | Une seule personne édite à la fois. « Ouvert par Hélène depuis 12 min. » | Un verrou avec expiration + la présence Supabase | **1 à 2 semaines** | nul |
| **3** | **Fusion par élément** | Le plus récent gagne **par forme, par nœud, par ligne de table** — plus par note entière. Deux personnes sur la même note ne se marchent dessus que si elles touchent le même nœud. | Reprendre le moteur pour horodater à la granularité de l'élément | **3 à 5 semaines** | faible |
| **4** | **Temps réel véritable** | Curseurs visibles, frappe simultanée dans le même paragraphe. | Un type de données répliqué (Yjs, Automerge), la persistance, la synchro et les images à refaire | **plusieurs mois** | — |

### 3.3 Ce que je recommande

> **Faire le 1, préparer le 3, ne jamais faire le 4 sans un vrai marché en face.**

**Le palier 1 capture l'essentiel de la valeur créative pour 5 % du travail.** Envoyer une
planche d'ambiance à un client, faire lire un plan de chapitre à un co-auteur, montrer une
chronologie à un producteur : c'est ça, le besoin réel d'un créatif. Ce n'est pas taper à
deux dans le même paragraphe.

**Le palier 3 est le vrai bon investissement**, et il a une propriété précieuse : *il
améliore aussi le mono-utilisateur*. Quelqu'un qui édite la même note sur son téléphone et
sur son ordinateur avec une connexion capricieuse perd aujourd'hui la version la plus
ancienne. Avec la fusion par élément, il ne perd plus rien. **On peut donc le faire pour
soi, et il ouvre la collaboration en prime.**

Le modèle de données s'y prête déjà : `formes[]` porte des identifiants, les lignes de
table aussi, les nœuds de carte mentale aussi. La granularité existe — il ne manque que
l'horodatage à ce niveau.

**Le palier 4 est un autre produit.** Il change le positionnement (« un espace personnel »
devient « un outil d'équipe »), le modèle de prix (par siège), la charge de support, et il
demande des mois. Il ne se justifie que si des équipes le demandent en payant.

### 3.4 Ce que la coopération coûterait

| Poste | Effet |
|---|---|
| Connexions temps réel | Palier gratuit : 200 simultanées. Palier payant : 500. Suffisant très longtemps. |
| Trafic | Une note partagée est relue par plusieurs personnes → le cache local ne protège plus. **C'est le seul poste qui grossit vraiment.** |
| Stockage | Inchangé : on partage une référence, pas une copie. |
| Support | **Le vrai coût.** « Il a écrasé mon chapitre » est un ticket à traiter, et il arrive. |

### 3.5 Ce que ça ferait au produit

Deux avertissements, parce qu'ils comptent autant que la faisabilité technique :

- **La collaboration abîme le moment ⚡.** Un espace personnel où l'on jette une idée sans
  réfléchir n'est plus le même quand quelqu'un peut la lire. C'est le seul endroit où
  ajouter une fonction *retire* quelque chose.
- **Elle s'oppose aux espaces chiffrés.** On ne partage pas ce qu'on ne peut pas déchiffrer,
  sauf à monter une gestion de clés qui dépasse largement le cadre du projet.

Le partage en lecture n'a aucun de ces deux défauts : il est **explicite, par objet, et
révocable**. C'est ce qui en fait le bon premier pas.

---

## En trois phrases

1. **Atlas tient le comparatif** sur la forme, les fondations et la direction artistique —
   mais son prix ne tient que si le compagnon existe, et son vrai handicap est de ne pas
   être une application native.
2. **Un abonné Compagnon rapporte 7,40 € net, un Créatif 11,43 €** — le second coûte deux
   fois plus cher et ne rapporte que 1,54 fois plus. Quatre abonnés couvrent toutes les
   charges fixes ; **cent inscrits font vivre le projet et rien d'autre, il en faut mille
   deux cent cinquante pour en tirer un revenu.**
3. **La coopération est envisageable par paliers** : le partage en lecture en quelques
   jours, la fusion par élément en quelques semaines — et cette dernière améliore d'abord
   l'usage solo, ce qui en fait le meilleur investissement des deux.
