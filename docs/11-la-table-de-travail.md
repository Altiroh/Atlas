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

## 2. Comment Atlas connaît l'espace

Un espace peut contenir trois mille notes. On ne les envoie pas. Quatre couches, de la plus
stable à la plus volatile — et c'est cet ordre qui fait tenir le cache.

### 2.1 La fiche d'espace — *la pièce qui change tout*

Un résumé compilé : les personnages, les lieux, les thèmes récurrents, la structure, les
fils ouverts, les décisions déjà prises. **Environ 3 000 jetons.**

- **Recalculée en lot**, la nuit, et seulement si l'espace a bougé. Une fois par semaine.
- **0,08 $ la régénération** → six par mois pour deux espaces actifs = **0,49 $/mois.**
- C'est elle qui fait qu'Atlas « connaît » ton univers dès le premier message.

Sans elle, chaque échange coûterait dix fois plus et Atlas redécouvrirait ton roman à
chaque phrase. **Avec elle, il s'en souvient.**

### 2.2 Les trois autres couches

- **Les notes rapportées** — ton moteur lexical (`motsDe`, `nu`, `memeMot`) en ramène cinq
  à huit. **Gratuit** : c'est du code, pas un modèle.
- **Les notes épinglées** — tu poses explicitement ce dont tu veux parler. Le contexte
  devient déterministe, et personne ne se demande plus pourquoi Atlas n'a pas vu telle note.
- **L'historique de la séance**, mis en cache lui aussi.

### 2.3 L'ordre, qui n'est pas négociable

```
[ consigne système   1 200 ]  ← figée
[ fiche d'espace     3 000 ]  ← une fois par semaine     } en cache (0,1× le prix)
[ historique        ~4 000 ]  ← grandit, se remet en cache
────────────────────────────  rupture du cache
[ notes rapportées     800 ]  ← change à chaque échange
[ ta phrase            120 ]
```

**Le stable devant, le volatil derrière.** C'est la règle du cache de prompt, et elle
divise la facture par trois. Une variable qui bouge placée trop haut annule tout ce qui
suit — c'est le piège classique, et il est silencieux.

---

## 3. Le compteur : jetons dedans, jauge dehors

Ta proposition — vendre un plafond de jetons qui se réinitialise — est **la bonne réponse
pour la moitié technique, et la mauvaise pour la moitié visible.** Les deux se séparent
proprement.

### 3.1 Pourquoi le jeton est le bon compteur

- **C'est le seul proxy honnête du coût.** Une séance courte sur un gros espace coûte plus
  qu'une longue sur un petit ; compter les messages ferait payer le mauvais.
- **Un seul compteur pour tout** — échanges, plans, briefings, fiches, emporter.
- **Il faut le construire de toute façon** : c'est lui, le garde-fou contre l'automate
  ([10 § 5.5](10-le-compagnon.md) — 95 000 $ par jour sans plafond serveur).

### 3.2 Pourquoi il ne doit pas s'afficher

**Un créatif ne sait pas ce qu'est un jeton, et un compteur qu'on ne comprend pas ne rend
pas prudent : il rend craintif.** Les gens rationnent la jauge qu'ils ne lisent pas — ils
utilisent le produit *moins*, ce qui est exactement l'inverse du but. Un abonné qui n'ose
plus ouvrir la table de travail est un abonné qui résilie.

Deux raisons de plus :

- **Ça montre la plomberie.** Toute la DA consiste à ne pas la montrer.
- **Ça invite à comparer** ton prix au tarif brut d'une API. Tu ne vends pas des jetons, tu
  vends une lecture.

### 3.3 La réponse est déjà dans le code

Atlas sait déjà afficher un quota : `usage()` rend `partImages`, `proche` (au-delà de 80 %)
et `plein`. Le script `quotaProche` dit *« 62 % du quota d'images. Rien à signaler. »*

> **On réemploie exactement ce langage.** Une part, un seuil d'alerte à 80 %, une phrase
> d'Atlas. Pas un nombre de jetons, pas un décompte anxiogène.
>
> *« Tu as bien travaillé ce mois-ci — il te reste un cinquième de tes échanges. »*

Et le nombre exact reste accessible d'un appui, pour qui le veut. C'est le même contrat que
partout ailleurs dans le produit : la règle est à un geste de là.

### 3.4 La cadence de réinitialisation

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

## 4. Les quotas et ce qu'ils laissent

Un échange coûte **0,0097 $** (Sonnet, contexte moyen, sortie 300 jetons).

| Plan | Échanges / mois | Coût IA total | **Marge** |
|---|---:|---:|---:|
| **Compagnon** 12,50 € | **150** | 2,06 € | **7,87 € — 76 %** |
| **Créatif** 24,99 € | **600** | 6,75 € | **13,36 € — 64 %** |

**Six cents échanges, c'est vingt par jour ouvré.** Personne de normal ne les épuise. Et
celui qui les épuise trouvera l'abonnement bon marché.

> Comparé au modèle « séances » écarté : la marge remonte de 51 % à **64 %** sur le Créatif,
> uniquement parce qu'Atlas ne rédige plus. **La position paie littéralement.**

### 4.1 Le modèle en profondeur

Opus coûte 1,67 fois un échange Sonnet. Il ne doit pas être le défaut — il doit être un
geste : *« regarde ça sérieusement »*. **Un échange en profondeur compte double.** C'est
prudent, et ça se comprend sans notice.

### 4.2 Les recharges, et pourquoi elles ne doivent pas être un bon plan

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

## 5. L'abus, une fois la ligne tenue

Les six scénarios du [§ 5 de 10](10-le-compagnon.md) tiennent toujours. La position en
désamorce quatre **sans une ligne de code défensif**.

| Scénario | Ce qu'il devient |
|---|---|
| **Le bavard** | Le quota le borne : 600 échanges = **5,80 $** au pire. Contre 247 $ sans quota. **Divisé par 43.** |
| **L'assistant généraliste** | *« Écris-moi un mail de relance client »* → Atlas ne rédige pas, et ça n'a rien à voir avec Le Roman. **Deux raisons de refuser, et aucune n'est un garde-fou** : ce sont des réponses de produit. |
| **Le casseur** | Le pire résultat qu'il obtient est une mauvaise critique de son propre texte. |
| **L'extracteur** | Rien de secret dans la consigne : un rôle, un ton, une règle de citation. |
| **L'injecteur** | ⚠️ **Reste, et grandit.** La fiche d'espace *lit les notes*. Une note reçue ou importée peut porter des ordres. **À régler avant le partage** ([09 § 3](09-ia-marche-et-cooperation.md)). |
| **L'automate** | ⚠️ **Inchangé.** Le compteur de jetons vit en base, jamais dans le navigateur. |

**Le pire abonné Créatif possible** : 600 échanges (5,80 $) + fiches (0,49 $) + le reste à
leurs plafonds (~1 $) = **7,29 $ pour 22,50 $ encaissés.** Aucun usage, malveillant ou non,
ne rend un abonné déficitaire.

---

## 6. Ce que la page des prix doit dire

Le site vend aujourd'hui le Créatif sur « le plan proposé » et « la dictée transcrite ».
Ce n'est plus le sujet, et le nouveau se dit mieux :

> **Un lecteur qui connaît ton projet.**
> Il a lu tes notes, il se souvient de tes personnages, et il a le droit de te dire que ça
> ne tient pas. **Il n'écrira pas à ta place** — pour ça, emporte ton brief où tu veux.

Le Compagnon devient l'échantillon honnête. Et une ligne doit figurer quelque part, parce
qu'elle est la promesse entière du plan en huit mots :

> **Atlas ne fait pas le travail. Il fait penser.**

---

## 7. Ce qu'il faut construire, dans l'ordre

1. **Le point d'entrée serveur et le compteur de jetons.** Rien ne s'allume avant.
2. **Le plafond mensuel + le plafond quotidien**, et l'affichage en part, jamais en jetons.
3. **La fiche d'espace**, en lot, avec le délimiteur anti-injection dès la première ligne.
4. **La séance** : un objet en base, ouverte / comptée / fermée.
5. **Le rapport de notes** — le moteur lexical existe, il faut le brancher.
6. **L'épinglage** de notes dans la conversation.
7. **« Emporter »** — le brief autonome. C'est peu de code et ça rend la position lisible.
8. **La phrase sur la page Infos** : le contenu de l'espace part chez un tiers pendant une
   séance. Le même jour, pas après.
9. **L'interrupteur par espace.** Un journal intime n'est pas une table de travail.

---

## En trois phrases

1. **Atlas questionne, il ne rédige pas** — et cette ligne, prise pour ce qu'est le produit,
   fait tomber le coût de 24 % et supprime la moitié des scénarios d'abus sans une ligne de
   code défensif.
2. **Le jeton est le bon compteur et le mauvais affichage** : on compte en jetons côté
   serveur, on montre une part et une phrase, exactement comme le quota d'images le fait
   déjà — un mois généreux, un plafond quotidien qui ne mord jamais, aucun report.
3. **600 échanges pour 6,75 € de coût sur 20,83 € encaissés** — 64 % de marge, et le pire
   abonné possible reste rentable.
