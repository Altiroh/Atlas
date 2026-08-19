# Atlas — Scope produit

> Document de cadrage. Aucune décision technique ici : on définit **quoi** et **pourquoi**, pas **comment**.
> Statut : v0.2 — les 4 arbitrages fondateurs sont tranchés (§ 0).

---

## 0. Décisions actées

Quatre arbitrages fondateurs, tranchés le 14/08/2026. Ils font foi pour tout le reste du document.

| # | Décision | Ce que ça implique |
|---|---|---|
| **D1** | **Atlas est un compagnon qui relance** | Il prend l'initiative : briefing, rapprochements, relances sur ce que tu délaisses. **Discret par défaut, curseur réglable.** C'est ce qui justifie le projet face à un simple Notion. |
| **D2** | **Cloud grand public** | On s'appuie sur un service existant pour sortir vite. Contrepartie assumée : tes notes vivent chez un tiers → **l'export markdown complet devient non négociable** (cf. § 9), et les espaces sensibles doivent pouvoir être chiffrés. |
| **D3** | **La V0 attaque la capture pure** | On règle « l'idée qui s'évapore » et la reprise multi-appareil avant tout le reste. Bouquin et Vidéos sont des **modes de la V3**, pas le point de départ. |
| **D4** | **Texte uniquement au début** | Pas de dictée intégrée, pas de voix. **Le moment « éclair » repose donc entièrement sur l'ergonomie du texte** — voir § 4 pour les conséquences, qui sont fortes. |



**Atlas est un second cerveau qui parle.**
La structure d'un Notion, l'usage d'un Jarvis : un espace où déposer, faire mûrir et fabriquer
ses idées — accessible partout, et qui *répond*.

La différence avec un Notion : Notion est **passif**. Il stocke ce que tu ranges, et il attend.
Atlas est **actif** — il écoute, il range à ta place, il te relance, il relie ce que tu avais oublié
avoir écrit.

---

## 2. Le client

Toi. Un seul utilisateur, un seul avis à satisfaire, aucun compromis de comité.

Conséquences directes, et ce sont des **avantages** :
- l'app peut être **opinionated à l'extrême** — pas besoin qu'elle plaise à quelqu'un d'autre ;
- pas d'onboarding, pas de tutoriel, pas de gestion d'équipe, pas de permissions ;
- l'IA peut te connaître **très** intimement (ton style, tes projets, tes tics) sans problème de vie privée tierce ;
- le succès se mesure à un seul critère : **est-ce que tu l'ouvres tous les jours ?**

Risque miroir : personne pour te dire que tu construis une usine à gaz. Le scope doit se défendre tout seul.

---

## 3. Le besoin réel

Tu ne cherches pas « une app de notes ». Tu cherches à résoudre **trois frustrations précises** :

1. **L'idée qui s'évapore.** Une idée de bouquin, un détail de scène, un angle de vidéo — ça arrive
   en marchant, sous la douche, dans le métro. Si la capture prend plus de 5 secondes, c'est perdu.
2. **La matière éparpillée.** Des bouts dans Notes Apple, des bouts dans un carnet, des bouts dans
   un doc Google, des vocaux jamais réécoutés. Rien ne se parle. Rien ne remonte au bon moment.
3. **La reprise impossible.** Tu écris 20 minutes sur le Mac, tu voudrais continuer 10 minutes sur
   le téléphone dans la file d'attente. Aujourd'hui c'est une friction telle que tu ne le fais pas.

Atlas ne réussit que s'il tue ces trois-là. Tout le reste est bonus.

---

## 4. Les trois moments d'usage

C'est **le cœur du cadrage**. Atlas n'est pas « une app responsive » : c'est **trois expériences
différentes** selon le contexte, sur une même matière.

### ⚡ L'éclair — mobile, 10 secondes
Une idée surgit. Objectif : **zéro décision**.
Tu ouvres, tu tapes, tu fermes. Pas de choix de dossier, pas de titre, pas de tag.
Le rangement, c'est le problème d'Atlas, pas le tien.
→ Écran d'accueil mobile = un champ de capture, point. Le reste est en dessous.

**Conséquence de D4 (pas de voix).** Sans dictée intégrée, ce moment ne tient que si le chemin
vers le champ de saisie est **plus court que dans n'importe quelle app de notes**. C'est un
engagement de conception, pas un détail :
- l'app **s'ouvre directement sur le curseur clignotant**, clavier déjà levé — jamais sur une liste ;
- **widget d'écran d'accueil** et raccourci de verrouillage pour sauter l'ouverture de l'app ;
- **cible de partage système** : depuis n'importe quelle app (navigateur, vidéo, photo) → capture dans Atlas ;
- la **dictée native du clavier** (iOS/Android) reste disponible — on ne construit pas de moteur vocal,
  mais on ne coupe pas le micro du système pour autant. C'est le repli gratuit pour capturer en marchant.

### 🌊 La rumination — tablette, 20 minutes, canapé
Tu relis, tu tries l'inbox, tu annotes, tu fais des liens, tu laisses mûrir.
C'est un moment de **lecture et de conversation**, pas de production.
→ Interface de lecture confortable, gestes tactiles, Atlas en interlocuteur (« ces 4 captures
parlent toutes du même personnage, je les regroupe ? »).

### 🔨 L'atelier — desktop, 2 heures
Tu écris pour de vrai. Un chapitre, un script, un plan.
**L'IA se met en retrait** — disponible mais silencieuse. Plein écran, focus, clavier.
→ Éditeur sérieux, raccourcis, panneaux latéraux repliables, mode sans distraction.

> Une seule base, trois postures. Si un écran ne sert aucun de ces trois moments, il ne doit pas exister.

---

## 5. Ce qu'Atlas contient (les objets)

| Objet | Rôle | Exemple |
|---|---|---|
| **Capture** | Matière brute non classée, arrivée en 5 s | « idée : et si le narrateur mentait ? » |
| **Note** | Document riche, structuré en blocs | Chapitre 3, script vidéo « X », compte-rendu |
| **Espace** | Grand contenant thématique | Le Bouquin · La Chaîne · Perso · Veille |
| **Fiche** | Entité réutilisable et reliable | un personnage, un lieu, un concept, une source |
| **Lien** | La relation entre deux objets — le vrai trésor | « ce détail sert le chapitre 7 » |
| **Tâche** | Prochaine action concrète | « relire le chap. 2 », « tourner l'intro » |
| **Conversation** | Tes échanges avec Atlas, eux-mêmes archivables | une séance de brainstorm exploitable plus tard |

Principe : **la Capture est le point d'entrée unique**. Tout le reste naît d'une capture promue,
jamais d'un formulaire vide.

---

## 6. Les cinq piliers fonctionnels

1. **Capturer sans friction** — texte, photo, partage depuis une autre app, widget. Hors ligne.
   *(dictée = celle du clavier système ; pas de moteur vocal Atlas avant la V3 — cf. D4)*
2. **Structurer sans corvée** — Atlas propose le classement, les tags, le titre, les liens. **Tu valides
   d'un geste.** Jamais d'auto-rangement silencieux : tu gardes la main.
3. **Retrouver par le sens** — pas seulement par mot-clé. « c'était quoi mon idée sur les jumeaux ? »
   doit marcher, même si tu n'as jamais écrit le mot « jumeaux ».
4. **Créer avec** — co-écriture *contextuelle* : Atlas a lu ton univers, connaît tes personnages,
   ton ton, tes 12 idées de vidéos précédentes. Il continue, il propose, il relance. Il n'écrit pas à ta place.
5. **Continuer partout** — reprise à l'endroit exact, sur n'importe quel appareil, y compris hors ligne.

---

## 7. La part « Jarvis »

Ce qui sépare Atlas d'un Notion + ChatGPT collés ensemble :

- **Une identité.** Atlas a un nom, un ton, une voix. Il te tutoie/vouvoie de façon constante.
  Ce n'est pas une fonctionnalité gadget : c'est ce qui rend l'ouverture quotidienne agréable.
- **De la proactivité, dosée** — c'est le cœur de **D1**. Un briefing (« 12 captures non triées, dont
  3 pour le Bouquin ; tu n'as pas touché au chapitre 4 depuis 9 jours »). Des rapprochements
  spontanés (« ce que tu viens d'écrire contredit la fiche de Marc »). Des relances sur ce qui dort.
- **Il agit.** « Range ça dans le Bouquin, crée une fiche pour ce personnage et lie-la au chapitre 3 »
  → c'est fait, et tu peux annuler.
- **La voix arrive plus tard** (D4). L'identité d'Atlas passe donc d'abord par **l'écrit** : son ton,
  sa façon de formuler un briefing, sa concision. À soigner d'autant plus qu'il n'a pas de voix pour porter son caractère.

⚠️ Garde-fou, et il est central puisqu'on a choisi le compagnon proactif : la proactivité est le
premier truc qui rend une app insupportable. Trois règles :
1. Atlas est **discret par défaut** ; c'est toi qui montes le curseur ;
2. il se manifeste **à des moments choisis** (ouverture, rituel de tri), pas en continu ;
3. **une seule sollicitation à la fois** — jamais une liste de reproches.

---

## 8. Ce qu'Atlas n'est PAS (non-objectifs)

À relire à chaque fois qu'une idée de feature arrive.

- ❌ Un outil **collaboratif** — pas de partage, pas de commentaires, pas de multi-utilisateur.
- ❌ Un **gestionnaire de projet** — pas de Gantt, pas de sprints, pas de kanban d'équipe.
- ❌ Un **clone de Notion** — pas de bases de données relationnelles génériques, pas de formules,
  pas de 47 types de vues. Atlas fait *ce que toi* tu fais, très bien.
- ❌ Un **traitement de texte de publication** — la mise en page finale du bouquin se fait ailleurs
  (export propre = suffisant).
- ❌ Un **tracker d'habitudes / agenda / CRM**.
- ❌ Un **produit à vendre** (pour l'instant). Si ça arrive un jour, tant mieux, mais ça ne dicte aucune décision.

---

## 9. Contraintes et principes non négociables

- **Offline-first.** Le métro, l'avion, le mauvais réseau : ça doit marcher, toujours. La sync rattrape après.
- **Tes données t'appartiennent.** Export complet et lisible à tout moment (texte brut / markdown).
  Aucun format prisonnier. Si Atlas meurt, tes 3 ans de notes survivent.
  **Renforcé par D2** : puisqu'on héberge chez un tiers, l'export n'est pas un confort, c'est
  l'assurance-vie du projet. Il doit exister **dès la V0**, et tourner automatiquement.
- **Vitesse.** Ouvrir → capturer doit être sous les 2 secondes, montre en main. C'est un critère
  d'acceptation, pas une intention.
- **Rien ne se perd.** Pas de suppression sèche, historique des versions sur les notes longues.
- **L'IA ne modifie jamais sans validation.** Suggestion, pas action silencieuse.
- **Coût maîtrisé.** C'est un projet perso : la facture mensuelle (hébergement + IA) doit rester
  raisonnable et prévisible.

---

## 10. Phasage proposé

Chaque phase doit être **utilisable au quotidien** à sa sortie. Pas de tunnel de 6 mois.

**V0 — « Le carnet »** · *l'app existe et tu t'en sers* — **c'est le terrain choisi (D3)**
Capture texte ultra-rapide (app + widget + partage système), inbox, notes, espaces,
recherche simple, sync 3 appareils, hors ligne, export automatique.
Zéro IA. Objectif : remplacer Notes/Keep dès la première semaine.

**V1 — « Atlas s'éveille »** · *l'IA devient utile*
Tri assisté de l'inbox, titres/tags proposés, recherche sémantique, conversation avec ta base,
co-écriture contextuelle dans l'éditeur.

**V2 — « Le compagnon »** · *la relation (D1)*
Briefings, proactivité réglable, relances, rapprochements automatiques entre notes,
actions exécutées sur la base avec annulation.

**V3 — « L'atelier »** · *les métiers, + la voix*
Modes spécialisés : **Bouquin** (chapitres, personnages, timeline, cohérence) et
**Vidéo** (idée → angle → script → plan de tournage → statut de publication).
C'est aussi ici qu'arrive la **voix** si le besoin s'est confirmé à l'usage (D4).

---

## 11. Critères de succès (à 6 mois)

Volontairement personnels et mesurables :

1. Tu as **désinstallé mentalement** les autres apps de notes — tu n'ouvres plus que celle-là.
2. Tu captures **≥ 3 idées par jour** sans y penser.
3. Tu retrouves une idée vieille de 6 mois **en moins de 30 secondes**.
4. Tu as commencé **au moins un vrai chapitre / un vrai script** dedans, pas juste des notes.
5. Le passage Mac → téléphone → tablette est devenu **un non-sujet**.

---

## 12. Risques identifiés

| Risque | Parade prévue |
|---|---|
| Le cimetière à notes (on capture, on ne relit jamais) | Rituel de tri + proactivité d'Atlas qui fait remonter l'ancien |
| La sur-structuration (2 h à ranger, 0 à écrire) | Le rangement est proposé par l'IA, jamais imposé à l'utilisateur |
| Le scope qui gonfle (« et si on ajoutait… ») | La section 8 fait foi, et les 3 moments d'usage arbitrent |
| Sync = le sujet le plus dur techniquement | Traité tôt, dès la V0, jamais bricolé après coup |
| Coût de l'IA qui dérape | L'IA arrive en V1 seulement, sur une app déjà utile sans elle |
| L'abandon en cours de route | Chaque phase est livrable et utilisable seule |

---

## 13. Questions ouvertes

Les 4 arbitrages fondateurs sont tranchés (§ 0). Restent les questions du **cadrage fonctionnel**,
à traiter au prochain tour :

1. **Le rituel de tri** — quand vides-tu ton inbox ? Un moment dédié (soir, week-end) ou au fil de l'eau ?
   Ça détermine si Atlas doit avoir un vrai « écran de tri » ou juste des gestes rapides sur la liste.
2. **La profondeur de structure** — combien de niveaux ? Espace → Note suffit-il, ou il te faut
   Espace → Dossier → Note ? *(l'instinct : le moins possible, quitte à ajouter plus tard)*
3. **Les captures non textuelles** — photo d'un carnet papier, capture d'écran, lien web : dans le scope V0
   ou plus tard ? La photo change pas mal de choses côté stockage.
4. **Le ton d'Atlas** — vouvoiement ou tutoiement, sobre ou complice ? Puisqu'il n'a pas de voix (D4),
   son écriture *est* sa personnalité.
5. **Les 3 appareils exacts** — Mac + quelle tablette + quel téléphone ? Ça conditionne tout le chapitre suivant.
