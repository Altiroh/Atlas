# Atlas — L'économie

> Atlas n'est pas un produit à vendre. Mais dès qu'il est en ligne et que d'autres s'en servent,
> il doit être **cadré comme un produit** : savoir ce que coûte un utilisateur, et ne jamais payer
> pour les autres.
>
> Ce document ne cherche pas à gagner de l'argent. Il cherche à ce que la facture reste à zéro,
> et à savoir quoi faire le jour où elle ne l'est plus.

---

## 1. La règle

> **Le gratuit est borné par ce qu'il coûte, jamais par un chiffre inventé.**

Un plafond « parce que 200 Mo ça fait bien » ne se défend pas et se négocie mal. Un plafond calculé
sur le coût réel se défend tout seul : au-delà, quelqu'un paie — et ce ne sera pas toi.

---

## 2. Ce qui coûte, vraiment

Quatre postes, et un seul est dangereux.

| Poste | Ce qui le fait grossir | Danger |
|---|---|---|
| **Base de données** | le texte des posts | 🟢 faible — une note pèse ~500 octets |
| **Stockage fichiers** | les images | 🟠 réel — mais nos images font ~10 Ko après réencodage |
| **Trafic sortant** | les images **re-téléchargées** | 🔴 **le vrai piège** |
| **Comptes actifs** | les gens | 🟢 nul — 50 000/mois offerts |

**Le trafic est le poste qui surprend.** Le stockage se paie une fois ; le trafic se paie à chaque
lecture. Une image de 10 Ko relue cent fois par jour sur trois appareils coûte plus cher, à
l'année, que son stockage.

Deux choses nous protègent déjà, et elles n'ont pas été faites pour ça :

- **le service worker** met en cache tout ce qui a été téléchargé une fois ;
- **la base locale** garde les images : une image n'est rapatriée **qu'une seule fois par
  appareil**, jamais à chaque affichage.

C'est le bénéfice caché du « hors-ligne d'abord » : il divise la facture de trafic par le nombre de
consultations.

---

## 3. Le coût d'un utilisateur

Estimation à partir de nos vraies mesures — images WebP à ~10 Ko, posts à ~500 octets.

| Profil | Posts | Images | Base | Fichiers |
|---|---|---|---|---|
| **Léger** | 500 | 20 | 0,25 Mo | 0,2 Mo |
| **Régulier** | 3 000 | 200 | 1,5 Mo | 2 Mo |
| **Intense** (toi) | 10 000 | 2 000 | 5 Mo | 20 Mo |

**Un utilisateur intense coûte ~25 Mo.** C'est le chiffre à retenir : tout le reste en découle.

---

## 4. Où le gratuit casse

Palier gratuit : **500 Mo** de base, **1 Go** de fichiers.

| Contrainte | Plafond | Utilisateurs intenses | Utilisateurs réguliers |
|---|---|---|---|
| Fichiers (1 Go) | | **~50** | ~500 |
| Base (500 Mo) | | ~100 | ~330 |

**Le gratuit tient jusqu'à ~50 utilisateurs intenses**, ou quelques centaines d'utilisateurs
normaux. Pour un projet personnel partagé à des proches, on n'y arrivera jamais.

Au-delà, le palier suivant est à **~25 $/mois** — et il ouvre à 8 Go de base et 100 Go de
fichiers, soit **plus de mille utilisateurs intenses**. Il n'y a pas de progression douce : on
passe de zéro à vingt-cinq, puis on ne bouge plus très longtemps.

---

## 5. Le palier payant, s'il devient nécessaire

Il ne sert pas à gagner, il sert à **couvrir**. Le calcul est donc simple, et c'est ce qui le rend
défendable :

> 25 $/mois à couvrir. À **3 €/mois**, il faut **neuf payants**.
> Neuf payants sur cinquante utilisateurs, c'est 18 % — un taux ordinaire.

**Ce qui reste gratuit, toujours** — sinon Atlas trahit ce qu'il est :

- capturer, écrire, chercher, exporter ;
- la synchronisation **du texte** — c'est la promesse du produit, pas une option ;
- tout l'usage hors ligne.

**Ce que le palier payant ouvre :** de la place pour les images, et rien d'autre. On ne met jamais
une fonction derrière le mur — on met du **volume**. Une fonction retenue en otage se remarque et
se déteste ; un volume, ça se comprend.

---

## 6. Le trou dans ce qui existe

⚠️ **Le quota actuel est côté client. Ce n'est pas une protection, c'est une politesse.**

Il empêche un utilisateur de bonne foi de saturer sans le savoir. Il n'empêche personne de
contourner : il suffit d'appeler l'API directement.

Tant qu'Atlas n'a qu'un utilisateur, c'est sans conséquence. **Le jour où il s'ouvre, il faut un
plafond côté serveur** — sinon un seul compte peut consommer le palier gratuit de tous les autres.

Trois gardes, par ordre de rapport efficacité/effort :

1. **Limiter la taille d'un fichier** au niveau du bucket — une ligne, et ça bloque le cas le plus
   bête : le téléversement d'un fichier énorme.
2. **Limiter le nombre de lignes par compte** — un déclencheur qui compte, sur un index déjà là.
3. **Limiter la taille d'une ligne** — un dessin emballé peut grossir sans fin.

Les trois sont dans [`schema.sql`](schema.sql). Un plafond **au octet près** demanderait un
registre d'usage maintenu par déclencheurs : c'est de la sur-ingénierie tant qu'il n'y a pas
d'utilisateurs, et ça se rajoute sans rien casser.

---

## 7. Avant d'ouvrir à d'autres

Le jour où quelqu'un d'autre crée un compte, Atlas cesse d'être un projet perso. Ce qui devient
obligatoire, et qui n'existe pas encore :

- **la suppression de compte** — avec les données, pour de vrai, sans délai ;
- **l'export** (il existe déjà — c'est le seul point déjà réglé) ;
- **dire où vivent les données** et qui peut les lire ;
- **les plafonds côté serveur** du § 6 ;
- **une adresse de contact** qui répond.

Rien d'insurmontable, mais rien d'automatique non plus. **Tant que ce n'est pas fait, Atlas reste
mono-utilisateur** — et c'est très bien ainsi.
