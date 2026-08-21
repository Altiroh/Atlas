# Atlas — La table de travail

> **Atlas n'écrit pas. Atlas fait penser.**
>
> Le plan Créatif ne vend pas une IA de rédaction — il en existe, elles sont bonnes, et
> ce n'est pas ce métier-là. Il vend **un lecteur qui connaît ton espace et qui te renvoie
> tes idées en face**. Atlas est une passerelle vers la création, pas la création.
>
> Ce document conçoit cette conversation, la chiffre, et tranche la question du compteur.
> Il **corrige le § 2.6 de [10](10-le-compagnon.md)**, qui recommandait de ne pas ouvrir
> de dialogue du tout.
>
> Tarifs Anthropic du 24/06/2026 · change 1,08 $/€ · TVA 20 %.

---

## 1. La ligne, et ce qu'elle rapporte

> **Il questionne, il rapproche, il contredit. Il ne rédige jamais à ta place.**

Ce n'est pas une limite technique, c'est le produit. Un assistant qui écrit ton chapitre te
retire la seule chose que tu étais venu faire. Et il y a une deuxième raison, moins noble
et tout aussi vraie : **c'est ce qui rend le plan tenable.**

| | Sortie moyenne | Coût par échange (Sonnet) |
|---|---:|---:|
| Un assistant qui **rédige** | 500 jetons | 0,0127 $ |
| **Atlas — qui questionne** | 300 jetons | **0,0097 $** |

**−24 % sur l'échange, et le pire cas s'effondre**, parce qu'un questionneur ne produit
jamais de pavés. La position et l'économie disent la même chose. C'est le signe qu'on tient
la bonne ligne.

### 1.1 Les quatre verbes

La frontière n'est pas « produire du texte ou non » — Atlas en produit. Elle est :
**produire *sur* ta matière, jamais produire ta matière.**

| Verbe | Ce que c'est | Qui le fait | Sortie |
|---|---|---|---|
| **Lire** | restituer, compter, croiser : « combien de personnages n'ont pas de scène ? » | **le code, gratuit** — c'est une requête sur une table | — |
| **Résumer** | condenser un ensemble de notes ou une table sans en perdre le sens | le modèle | ~300 jetons |
| **Récapituler** | produire **une note de synthèse déposée dans l'espace** | le modèle | ~1 000 jetons |
| **Rédiger** | produire de la matière créative — un chapitre, une scène | **personne** | bloqué |

**Lire est souvent gratuit, et c'est un point important.** Une table d'Atlas a des colonnes
typées — texte, nombre, date, étiquette, case, image. « Quels personnages n'ont pas encore
de date d'apparition » est une **requête**, pas une question à poser à un modèle. Les 37
logiques font déjà ce genre de chose. Le modèle ne sert que là où la requête ne sait pas
répondre : *« qu'est-ce que cette table raconte ? »*

### 1.2 La note récapitulative

C'est le geste le plus utile du lot, et il va plus loin que la conversation : Atlas lit un
espace — les notes, les tables, les chronologies — et **dépose une note de synthèse dedans**.
Une vraie note, qu'on relit, qu'on corrige, qu'on exporte.

- « Où en est Le Roman ? » → une note qui fait le point : ce qui est écrit, ce qui manque,
  les contradictions, les fils ouverts.
- « Résume-moi la table des personnages » → une note lisible à partir de quarante lignes.

**Coût : 0,068 $ la note** (Sonnet, entrée large, sortie 1 000 jetons). Moitié moins si elle
est programmée et calculée en lot.

Elle porte une marque : **c'est Atlas qui l'a écrite, et ça se voit.** Une synthèse qu'on
prend pour une note de sa propre main, c'est une mémoire falsifiée.

### 1.3 Où passe exactement la ligne — et comment on la tient

Tu as raison sur le fond : **techniquement, un modèle peut écrire un chapitre.** La limite
n'est donc pas une promesse, c'est un dispositif. Trois couches, et aucune ne suffit seule :

| Couche | Ce que c'est | Ce qu'elle arrête |
|---|---|---|
| **Le rôle** | la consigne système : Atlas questionne, rapproche, résume. Il ne rédige pas, il le dit, et il propose « Emporter ». | la demande de bonne foi |
| **Le plafond de sortie** | `max_tokens` ≈ **1 200 jetons** | **le chapitre. Physiquement.** Une note récapitulative passe, trois mille jetons de prose non. Ce n'est pas une règle qu'on discute, c'est un mur. |
| **Le quota** | 600 échanges par mois | celui qui découpe son chapitre en cinq morceaux : c'est possible, c'est pénible, ça consomme cinq échanges — **et c'est payé.** |

> **`max_tokens` est la vraie frontière du produit.** Une décision de positionnement qui
> tient en un paramètre, ça ne se contourne pas par la conversation.

### 1.4 La passerelle — *ce que « passerelle » doit vouloir dire dans l'app*

Si Atlas ne rédige pas, il doit **remettre la matière à celui qui rédige.**

> **Un bouton : « Emporter ».** Atlas compile la fiche d'espace, les notes épinglées et ce
> qui s'est dit dans la séance en **un brief autonome**, prêt à coller dans l'outil
> d'écriture de ton choix.

- Coût : **une seule génération**, ~0,02 $.
- C'est la philosophie de l'export appliquée à l'IA : [08 § 5](08-economie.md) dit que
  l'export est l'assurance-vie du projet. Là c'est l'inverse et c'est pareil — Atlas ne
  retient rien, pas même le travail de pensée.
- **Et ça rend la position lisible d'un seul geste.** Personne ne demande plus pourquoi
  Atlas n'écrit pas : il donne de quoi écrire ailleurs.


---

## 2. La mémoire d'un espace

Un espace peut contenir trois mille notes. On ne les envoie pas. Et surtout : **on ne
redécouvre pas ton roman à chaque séance.**

C'est là que se joue l'efficacité de tout le dispositif. **Trois mémoires, et les
confondre serait l'erreur** — elles ne retiennent pas la même chose, ne se fabriquent pas
pareil, et ne vivent pas aussi longtemps.

| Mémoire | Ce qu'elle retient | Comment elle se fait | Elle dure |
|---|---|---|---|
| **La fiche d'espace** | le fond : personnages, lieux, structure, fils ouverts | **dérivée** — recalculée en lot | une semaine |
| **Le carnet d'Atlas** | ce qu'il a appris **de toi** : tes partis pris, tes refus, tes décisions | **accumulée** — écrite, jamais recalculée | jusqu'à effacement |
| **Le fil de la séance** | ce qui vient de se dire | l'historique, en cache | la séance |

### 2.1 La fiche d'espace — le fond

Un résumé compilé : les personnages, les lieux, les thèmes récurrents, la structure, les
fils ouverts, les décisions déjà prises. **Environ 3 000 jetons.**

- **Recalculée en lot**, la nuit, et seulement si l'espace a bougé. Une fois par semaine.
- **0,08 $ la régénération** → six par mois pour deux espaces actifs = **0,49 $/mois.**

Sans elle, chaque échange coûterait dix fois plus. **Avec elle, Atlas connaît ton univers
dès le premier message.**

### 2.2 Le carnet d'Atlas — *la vraie réponse à « une mémoire d'espace »*

La fiche dit ce qu'il y a **dans** l'espace. Le carnet dit ce qu'Atlas a compris **en
travaillant avec toi** :

> *« Il déteste les flashbacks — écarté deux fois. »*
> *« Il a tranché contre le narrateur non fiable en mars, puis y est revenu en mai. »*
> *« Quand il dit "ça ne va pas", c'est le rythme, jamais le fond. »*
> *« L'acte II est le morceau sur lequel il bute depuis le début. »*

**C'est ce qui fait qu'on cesse de se répéter** — et c'est exactement ce qui rend les
formules d'IA efficaces plutôt que coûteuses.

| | Coût |
|---|---|
| Le carnet dans le préfixe (1 200 jetons, en cache) | **+0,00004 $ par échange** — invisible |
| Sa mise à jour (en lot, la nuit, 8 fois par mois) | **0,11 $/mois** |
| **Ce qu'il évite** : ~3 échanges de remise en contexte × 24 séances | **0,70 $/mois** |

> **Il coûte deux fois moins que ce qu'il fait gagner**, et le vrai bénéfice n'est même pas
> là : c'est de ne plus réexpliquer à Atlas qui tu es à chaque ouverture.

#### Quatre règles, et aucune n'est facultative

**1. Le carnet est une note de l'espace.** Pas un magasin caché quelque part. Une note
qu'on ouvre, qu'on lit, qu'on corrige, dont on supprime une ligne. Zéro interface à
inventer, et trois conséquences gratuites : il est **auditable**, il part dans **l'export
`.zip`**, et il se synchronise comme le reste.

> Une mémoire invisible qui façonne ce qu'Atlas te dit serait la seule chose du produit
> qu'on ne peut pas vérifier. C'est exactement ce que les 37 logiques refusent depuis le
> début : *« elle montre les éléments »*.

**2. Il s'écrit par proposition, jamais en douce.** En fin de séance : *« j'ai noté trois
choses — tu les gardes ? »*, décochables une par une. C'est la règle 2 des scripts, mot
pour mot, appliquée à la mémoire.

**3. Il oublie.** Plafonné à une quarantaine de lignes. Atlas propose aussi des
**retraits** : une décision revenue en arrière, un parti pris démenti. **Une mémoire qui ne
fait qu'accumuler devient un dossier** — et ce que le carnet oublie compte autant que ce
qu'il garde.

**4. Il ne contient que de la matière de travail.** Des partis pris créatifs, jamais des
faits personnels. C'est une règle de conception et une obligation : un carnet est une
donnée conservée, avec tout ce que ça implique côté RGPD. **Aucun secret, aucune donnée
sensible, jamais.**

#### Le mécanisme, côté API

L'API expose un outil de mémoire (`memory_20250818`) : un magasin de fichiers **hébergé par
nous**, que le modèle manipule par `view` / `create` / `str_replace` / `insert` / `delete`
/ `rename`. Le SDK TypeScript fournit l'ossature.

Il colle bien — à un détail près, et il est structurant : **l'outil laisse le modèle écrire
tout seul, pendant la conversation.** Ça contredit *« elle ne s'invite pas »*.

> **La conciliation : le magasin est en attente.** Le modèle écrit dans une version
> provisoire, Atlas montre le différentiel, l'utilisateur valide. C'est le format
> « proposition » qui existe déjà, avec son `Annulation`.

Le modèle gère la mémoire, l'utilisateur garde la main. Ni l'un ni l'autre seul.

### 2.3 Le fil de la séance

Ce qui vient de se dire, mis en cache. Deux réglages qui changent tout :

- **Un cache d'une heure** (`ttl: "1h"`) plutôt que cinq minutes : pendant une séance de
  travail, tout le préfixe — consigne, fiche, carnet, historique — reste chaud. On réfléchit
  entre deux questions, et ça ne coûte rien.
- **La compaction** pour une séance très longue : le serveur résume l'ancien contexte
  lui-même. Un piège à connaître — **il faut lui rendre ses blocs de compaction à chaque
  tour**, sinon l'état est perdu en silence.

### 2.4 Les deux autres couches de contexte

- **Les notes rapportées** — ton moteur lexical (`motsDe`, `nu`, `memeMot`) en ramène cinq
  à huit. **Gratuit** : c'est du code, pas un modèle.
- **Les notes épinglées** — tu poses explicitement ce dont tu veux parler. Le contexte
  devient déterministe, et personne ne demande plus pourquoi Atlas n'a pas vu telle note.

### 2.5 L'ordre, qui n'est pas négociable

```
[ consigne système   1 200 ]  ← figée
[ fiche d'espace     3 000 ]  ← une fois par semaine
[ carnet d'Atlas     1 200 ]  ← quelques lignes par semaine   } en cache (0,1×)
[ historique        ~4 000 ]  ← grandit, se remet en cache
────────────────────────────  rupture du cache
[ notes rapportées     800 ]  ← change à chaque échange
[ ta phrase            120 ]
```

**Le stable devant, le volatil derrière.** Une variable qui bouge placée trop haut annule
tout ce qui suit — c'est le piège classique du cache, et il est silencieux : on ne le voit
que sur la facture. **Le contrôle est `cache_read_input_tokens` : s'il reste à zéro d'une
requête à l'autre, quelque chose invalide le préfixe.**

### 2.6 Couper l'IA efface les deux mémoires

Un espace dont l'œil est fermé ([12](12-avec-ou-sans-ia.md)) n'a **ni fiche ni carnet**, et
couper les **supprime** — chez le tiers comme en local. Le carnet étant une note, sa
suppression est visible : elle se voit dans l'espace, comme n'importe quelle autre.


## 3. Une conversation par espace

C'est la différence de forme la plus importante avec un assistant généraliste, et elle
découle de tout ce qui précède.

> **Chez les autres, tu ouvres une conversation. Dans Atlas, tu ouvres un espace —
> et la conversation y était déjà.**

### 3.1 Le rangement de conversations n'a pas lieu d'être

Un assistant généraliste t'oblige à tenir **un deuxième classement** : une colonne de fils
qu'il faut nommer, retrouver, épingler, supprimer. Un système de rangement posé par-dessus
ton système de rangement.

Atlas en a déjà un : **les espaces**. Alors la conversation vit dedans.

| | Un assistant généraliste | Atlas |
|---|---|---|
| Combien de fils | des dizaines, à gérer | **un par espace** |
| Comment on retrouve | on cherche dans une liste | on ouvre le projet |
| Quand ça reprend | « Nouvelle conversation » | **là où on s'était arrêté** |
| Ce qu'il faut nommer | chaque fil | **rien** |

**Un espace = une conversation possible.** Trois espaces actifs, trois fils. Pas quarante.
Rien à archiver, rien à nommer, aucune navigation nouvelle à apprendre.

Et le fil est **permanent** : tu rouvres Le Roman trois semaines plus tard, la conversation
est là, avec le carnet qui a retenu ce qui comptait.

### 3.2 Le fil se replie dans le carnet

Une conversation permanente grandirait sans fin. Elle ne le fait pas, parce qu'elle a un
endroit où se déposer.

```
les 30 derniers échanges  →  gardés mot pour mot
plus anciens              →  distillés dans le carnet, la nuit, puis retirés
```

> **La conversation ne s'archive pas : elle devient de la mémoire.** C'est ce que fait un
> carnet de travail, et c'est ce qui évite d'avoir à inventer une gestion d'historique.

### 3.3 Atlas ne pense pas aux notes perdues — *et c'est une bonne nouvelle*

Une idée qui n'est dans aucun espace n'entre dans aucune fiche, dans aucun carnet, dans
aucune séance. **Atlas ne peut pas y réfléchir.**

Ce n'est pas une limite qu'on subit, c'est **le premier ressort de rangement que le produit
ait jamais eu.** Le cadrage a toujours dit : *« le rangement est le problème d'Atlas, pas le
tien »* — et c'était vrai pour la capture. Mais il manquait une raison de ranger un jour.
La voilà, et elle n'a rien d'une punition :

> **Ranger une idée, c'est la rendre pensable.**

La boucle se referme sur elle-même :

```
tu ranges  →  Atlas comprend mieux  →  il t'est plus utile  →  tu ranges plus
```

Et **le remède est déjà écrit, et gratuit.** Quand Atlas signale *« 42 idées ne sont dans
aucun espace — je ne les vois pas d'ici »*, le geste qui suit est l'un des scripts
déterministes qui existent : `rangerParNom`, `rangerParVoisinage`, `fourneeDuJour`.

**L'IA crée l'envie de ranger ; le code déjà en place la satisfait, sans coûter un centime.**

Une variante à retenir pour l'interface : si l'on veut parler d'une note libre, il suffit de
l'**épingler** dans la conversation d'un espace — et Atlas demande alors où elle va. *Parler
d'une idée devient la ranger.*

### 3.4 Ce que ça change à la facture

Un fil unique par espace, c'est le **même préfixe réutilisé pour tous les messages du mois**
— consigne, fiche, carnet. Le cache travaille au maximum de ce qu'il sait faire.

| | Coût des 600 échanges (préfixe seul) |
|---|---|
| Un fil neuf à chaque question, sans cache | **9,72 $** |
| **Un fil par espace, avec cache** | **1,46 $** |

**Six fois et demie moins**, uniquement grâce à la forme de la conversation.

> ⚠️ **Correction à mes chiffres précédents.** Je n'avais pas compté **l'écriture** du cache,
> qui se paie 1,25 fois le prix d'entrée. Le préfixe (5 400 jetons) se réécrit à chaque
> séance : **0,02 $ la séance, 0,49 $ par mois.** Les tableaux du § 5 en tiennent compte
> désormais. *(Le cache d'une heure coûte plus cher à écrire que celui de cinq minutes —
> multiplicateur à vérifier avant de le retenir.)*

### 3.5 Et la conversation qui n'appartient à aucun espace ?

Elle existe déjà, elle est gratuite, et elle est déterministe : **la `Causerie`**. La
séparation est nette et personne n'a besoin qu'on la lui explique :

| | La Causerie | La table de travail |
|---|---|---|
| Elle parle de | **Atlas** — « range mes trucs », « où en est ma place ? » | **ton projet** — « est-ce que l'acte II tient ? » |
| Où | partout | dans un espace |
| Qui répond | les 37 verbes | le modèle |
| Coût | **zéro** | le quota |

## 4. Le compteur : jetons dedans, jauge dehors

Ta proposition — vendre un plafond de jetons qui se réinitialise — est **la bonne réponse
pour la moitié technique, et la mauvaise pour la moitié visible.** Les deux se séparent
proprement.

### 4.1 Pourquoi le jeton est le bon compteur

- **C'est le seul proxy honnête du coût.** Une séance courte sur un gros espace coûte plus
  qu'une longue sur un petit ; compter les messages ferait payer le mauvais.
- **Un seul compteur pour tout** — échanges, plans, briefings, fiches, emporter.
- **Il faut le construire de toute façon** : c'est lui, le garde-fou contre l'automate
  ([10 § 5.5](10-le-compagnon.md) — 95 000 $ par jour sans plafond serveur).

### 4.2 Pourquoi il ne doit pas s'afficher

**Un créatif ne sait pas ce qu'est un jeton, et un compteur qu'on ne comprend pas ne rend
pas prudent : il rend craintif.** Les gens rationnent la jauge qu'ils ne lisent pas — ils
utilisent le produit *moins*, ce qui est exactement l'inverse du but. Un abonné qui n'ose
plus ouvrir la table de travail est un abonné qui résilie.

Deux raisons de plus :

- **Ça montre la plomberie.** Toute la DA consiste à ne pas la montrer.
- **Ça invite à comparer** ton prix au tarif brut d'une API. Tu ne vends pas des jetons, tu
  vends une lecture.

### 4.3 La réponse est déjà dans le code

Atlas sait déjà afficher un quota : `usage()` rend `partImages`, `proche` (au-delà de 80 %)
et `plein`. Le script `quotaProche` dit *« 62 % du quota d'images. Rien à signaler. »*

> **On réemploie exactement ce langage.** Une part, un seuil d'alerte à 80 %, une phrase
> d'Atlas. Pas un nombre de jetons, pas un décompte anxiogène.
>
> *« Tu as bien travaillé ce mois-ci — il te reste un cinquième de tes échanges. »*

Et le nombre exact reste accessible d'un appui, pour qui le veut. C'est le même contrat que
partout ailleurs dans le produit : la règle est à un geste de là.

### 4.4 La cadence de réinitialisation

Tu proposais jour, semaine ou mois. Aucune ne suffit seule :

| Cadence | Ce qu'elle fait bien | Ce qu'elle casse |
|---|---|---|
| **Jour** | borne la rafale, le pire cas est connu à l'avance | tue la grande séance du dimanche, qui est le vrai moment de travail d'un créatif |
| **Semaine** | épouse le rythme d'un projet | ne colle à aucune facture, il faut l'expliquer |
| **Mois** | aligné sur ce qu'on encaisse, généreux | on peut tout brûler le 1er à 9 h |

> **La bonne réponse est un mois généreux, avec un plafond quotidien qui ne mord jamais un
> usage normal.** Le mois est ce que tu vends ; la journée est ce qui te protège.

| Plan | Par mois | Par jour | Le plafond du jour mord-il ? |
|---|---:|---:|---|
| Compagnon | 150 échanges | 15 | non — 15 × 30 = 450, très au-dessus |
| Créatif | 600 échanges | 40 | non — 40 × 30 = 1 200, le double |

**Le reliquat ne se reporte pas.** Un report accumule une dette silencieuse : cinq mois
d'économies dépensés en une nuit, c'est le pire cas qu'on vient d'éliminer qui revient par
la fenêtre.

---

## 5. Les quotas et ce qu'ils laissent

Un échange coûte **0,0097 $** (Sonnet, contexte moyen, sortie 300 jetons).

| Plan | Échanges / mois | Notes récapitulatives | Coût IA total | **Marge** |
|---|---:|---:|---:|---:|
| **Compagnon** 12,50 € | **150** | **4** | 2,58 € | **7,35 € — 71 %** |
| **Créatif** 24,99 € | **600** | **20** | 8,77 € | **11,34 € — 54 %** |

*Fiches d'espace, carnet et écritures de cache compris (§ 3.4).*

**Six cents échanges, c'est vingt par jour ouvré.** Personne de normal ne les épuise. Et
celui qui les épuise trouvera l'abonnement bon marché.

> Comparé au modèle « séances » écarté (51 %), la marge remonte à **58 %** — et ça malgré
> l'ajout des notes récapitulatives, qui coûtent sept fois un échange pièce. **La position
> paie littéralement :** c'est la sortie courte qui finance la synthèse.

### 5.1 Le modèle en profondeur

Opus coûte 1,67 fois un échange Sonnet. Il ne doit pas être le défaut — il doit être un
geste : *« regarde ça sérieusement »*. **Un échange en profondeur compte double.** C'est
prudent, et ça se comprend sans notice.

### 5.2 Les recharges, et pourquoi elles ne doivent pas être un bon plan

| Recharge | Coût réel | Marge |
|---|---:|---:|
| +200 échanges à 3,99 € | 1,79 € | 1,54 € — **46 %** |
| +500 échanges à 7,99 € | 4,47 € | 2,19 € — **33 %** |

Une recharge rapporte **deux fois moins** qu'un abonnement, parce qu'elle n'amortit aucun
coût fixe. C'est un fait, pas un défaut à corriger — et il donne la bonne phrase à écrire
dans l'app :

> *« Tu as rechargé deux fois ce mois-ci. Le plan au-dessus te reviendrait moins cher. »*

Atlas qui conseille de payer moins : c'est exactement le ton du produit, et c'est vrai.

---

## 6. L'abus, une fois la ligne tenue

Les six scénarios du [§ 5 de 10](10-le-compagnon.md) tiennent toujours. La position en
désamorce quatre **sans une ligne de code défensif**.

| Scénario | Ce qu'il devient |
|---|---|
| **Le bavard** | Le quota le borne : 600 échanges = **5,80 $** au pire. Contre 247 $ sans quota. **Divisé par 43.** |
| **Le romancier gratuit** | `max_tokens` à 1 200 rend le chapitre impossible. Le découper en morceaux marche, coûte cinq échanges du quota, et donne un texte recousu. **Possible, pénible, et payé.** |
| **L'assistant généraliste** | *« Écris-moi un mail de relance client »* → Atlas ne rédige pas, et ça n'a rien à voir avec Le Roman. **Deux raisons de refuser, et aucune n'est un garde-fou** : ce sont des réponses de produit. |
| **Le casseur** | Le pire résultat qu'il obtient est une mauvaise critique de son propre texte. |
| **L'extracteur** | Rien de secret dans la consigne : un rôle, un ton, une règle de citation. |
| **L'injecteur** | ⚠️ **Reste, et grandit.** La fiche d'espace *lit les notes*. Une note reçue ou importée peut porter des ordres. **À régler avant le partage** ([09 § 3](09-ia-marche-et-cooperation.md)). |
| **L'automate** | ⚠️ **Inchangé.** Le compteur de jetons vit en base, jamais dans le navigateur. |

**Le pire abonné Créatif possible** : 600 échanges (6,01 $) + 20 notes récapitulatives
(1,37 $) + les fiches (0,49 $) + le carnet (0,11 $) + le reste à leurs plafonds (~1 $)
+ les écritures de cache (0,49 $) = **9,47 $ pour 22,50 $ encaissés.** Aucun usage,
malveillant ou non, ne rend un abonné déficitaire.

---

## 7. Ce que la page des prix doit dire

Le site vend aujourd'hui le Créatif sur « le plan proposé » et « la dictée transcrite ».
Ce n'est plus le sujet, et le nouveau se dit mieux :

> **Un lecteur qui connaît ton projet.**
> Il a lu tes notes, il se souvient de tes personnages, et il a le droit de te dire que ça
> ne tient pas. **Il n'écrira pas à ta place** — pour ça, emporte ton brief où tu veux.

Le Compagnon devient l'échantillon honnête. Et une ligne doit figurer quelque part, parce
qu'elle est la promesse entière du plan en huit mots :

> **Atlas ne fait pas le travail. Il fait penser.**

---

## 8. Ce qu'il faut construire, dans l'ordre

1. **Le point d'entrée serveur et le compteur de jetons.** Rien ne s'allume avant.
2. **Le plafond mensuel + le plafond quotidien**, `max_tokens` à 1 200, et l'affichage en
   part, jamais en jetons.
3. **La fiche d'espace**, en lot, avec le délimiteur anti-injection dès la première ligne.
4. **Le carnet d'Atlas** — une note de l'espace, écrite par proposition, plafonnée, qui
   oublie. C'est lui qui fait qu'on cesse de se répéter.
5. **Le fil de l'espace** — un seul, permanent, qui se replie dans le carnet au-delà de
   trente échanges. Pas de liste de conversations à gérer.
6. **Le rapport de notes** — le moteur lexical existe, il faut le brancher.
7. **L'épinglage** de notes dans la conversation.
8. **La note récapitulative** — Atlas dépose sa synthèse dans l'espace, marquée comme
   étant de lui.
9. **« Emporter »** — le brief autonome. C'est peu de code et ça rend la position lisible.
10. **La phrase sur la page Infos** : le contenu de l'espace part chez un tiers pendant une
   séance. Le même jour, pas après.
11. **L'interrupteur par espace** ([12](12-avec-ou-sans-ia.md)) — et couper efface les deux
    mémoires.

---

## En trois phrases

1. **Atlas produit *sur* ta matière, jamais ta matière** : il lit, il résume, il dépose une
   note récapitulative — il ne rédige pas un chapitre. Et cette frontière tient en un
   paramètre, `max_tokens` à 1 200, pas en une promesse.
2. **Le jeton est le bon compteur et le mauvais affichage** : on compte en jetons côté
   serveur, on montre une part et une phrase, exactement comme le quota d'images le fait
   déjà — un mois généreux, un plafond quotidien qui ne mord jamais, aucun report.
3. **Un espace = une conversation**, permanente, sans liste à gérer — et ce qui n'est rangé
   nulle part n'est pensable nulle part, ce qui donne enfin au rangement une récompense.
   600 échanges et 20 notes de synthèse coûtent 8,77 € sur 20,83 € encaissés : 54 % de
   marge, écritures de cache comprises.
