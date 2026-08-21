/* ---------------------------------------------------------------
   Les écrans d'Atlas, engendrés.

   Chaque maquette est une fonction qui rend du HTML. Les pages ne
   portent qu'un `<div class="maq" data-maq="flux-bureau">` : le
   dessin vit ici, en un seul endroit, et le même écran peut donc
   apparaître sur deux pages sans être recopié.

   Le contenu montré est du VRAI contenu de travail — des idées de
   chapitre, des notes de tournage. Du faux-texte latin dans une
   maquette de produit dit au visiteur qu'on ne lui montre rien.

   Les dimensions sont en pixels de plan : voir l'en-tête de
   maquettes.css pour l'unité `--k`.

   Les morceaux sont exposés dans `window.MQ` : le bac à sable de
   `demo.js` reprend EXACTEMENT les mêmes, ce qui garantit que ce
   qu'on essaie et ce qu'on regarde sont le même écran.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  /* ==============================================================
     Les pictogrammes — mêmes tracés que src/ui/Icon.tsx
     ============================================================== */

  var ICONES = {
    eclair: '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"/>',
    flux: '<path d="M3 7.5h18M3 12h18M3 16.5h12"/>',
    espaces:
      '<rect x="3" y="3" width="7.5" height="7.5" rx="2.2"/>' +
      '<rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2"/>' +
      '<rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2"/>' +
      '<rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2"/>',
    reglages:
      '<path d="M4 7h16M4 12h16M4 17h16"/>' +
      '<circle cx="9" cy="7" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="17" r="2"/>',
    loupe: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    dossier: '<path d="M3 7.5A2 2 0 0 1 5 5.5h3.6l1.6 2H19a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
  };

  function icone(nom) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nom] + '</svg>';
  }

  /* ==============================================================
     Les morceaux communs
     ============================================================== */

  function fond() {
    return '<div class="mq__halo" aria-hidden="true"></div>' +
      '<div class="mq__trame" aria-hidden="true"></div>';
  }

  /** Le rail : quatre destinations, l'œil d'Atlas en bas. */
  function rail(actif) {
    var items = [
      { id: 'capture', nom: 'Capturer', ic: 'eclair' },
      { id: 'flux', nom: 'Idées', ic: 'flux' },
      { id: 'espaces', nom: 'Projets', ic: 'espaces' },
      { id: 'reglages', nom: 'Réglages', ic: 'reglages' }
    ];
    var s = '<div class="mq-rail mq-verre">';
    items.forEach(function (i) {
      s += '<div class="mq-rail__item"' + (i.id === actif ? ' data-actif' : '') + '>' +
        icone(i.ic) + '<span>' + i.nom + '</span></div>';
    });
    s += '<div class="mq-rail__vide"></div>';
    /* La couronne est gardée jusqu'ici : un Atlas sans son feu n'est
       plus Atlas, c'est un pictogramme d'œil. */
    s += '<div class="mq-rail__oeil" data-oeil="26"></div>';
    s += '</div>';
    return s;
  }

  /* Les idées montrées. Chacune porte son projet et sa teinte : c'est
     ce qui fait lire « trois projets » sans qu'on ait à l'écrire. */
  var IDEES = [
    {
      titre: 'Et si le narrateur mentait depuis le début ?',
      extrait: 'Reprendre le chapitre 3 avec ça en tête. Les descriptions du port deviennent suspectes.',
      projet: 'Le roman', h: 18, im: 1, actif: true
    },
    {
      titre: 'Plan de tournage — la scène du quai',
      extrait: 'Lumière rasante, fin de journée. Prévoir deux focales, pas plus.',
      projet: 'La chaîne', h: 205, im: 2
    },
    {
      titre: 'Marc ne dit jamais « je »',
      extrait: 'Tic de langage à tenir sur tout le livre. Vérifier les dialogues déjà écrits.',
      projet: 'Le roman', h: 18
    },
    {
      titre: 'Palette pour la couverture',
      extrait: 'Bleu de nuit, un seul point chaud. Chercher du côté des affiches polonaises.',
      projet: 'Le roman', h: 18, im: 4
    },
    {
      titre: 'Racheter des piles pour le micro-cravate',
      extrait: '',
      projet: '', h: 0
    },
    {
      titre: 'Structure en trois actes, version courte',
      extrait: 'L’acte II tient en une phrase : il cherche quelqu’un qui ne veut pas être trouvé.',
      projet: 'La chaîne', h: 205
    }
  ];

  function ligne(o) {
    var s = '<div class="mq-item"' + (o.actif ? ' data-actif' : '') +
      (o.id ? ' data-id="' + o.id + '"' : '') + '>';
    s += o.im
      ? '<div class="mq-item__vignette mq-im" data-im="' + o.im + '"></div>'
      : '<div class="mq-item__vignette"></div>';
    s += '<div class="mq-item__corps">';
    s += '<div class="mq-item__titre">' + o.titre + '</div>';
    if (o.extrait) s += '<div class="mq-item__extrait">' + o.extrait + '</div>';
    s += '<div class="mq-item__meta">';
    if (o.projet) {
      s += '<span class="mq-item__espace" style="--h:' + o.h + '"><i></i>' + o.projet + '</span><span>·</span>';
    }
    s += '<span>' + (o.heure || '09:12') + '</span>';
    s += '</div></div></div>';
    return s;
  }

  /** La colonne des idées : bonjour manuscrit, recherche, journées. */
  function listeIdees(n) {
    var s = '<div class="mq-volet mq-volet--liste mq-verre">';
    s += '<div class="mq-tete"><span class="mq-tete__main">Bonjour, Ewen !</span>' +
      '<span class="mq-rond">+</span></div>';
    s += '<div class="mq-recherche">' + icone('loupe') + '<span>Chercher une idée</span></div>';
    s += '<div class="mq-jour">Aujourd’hui</div>';
    s += ligne(IDEES[0]) + ligne(IDEES[1]) + ligne(IDEES[2]);
    if (n > 3) {
      s += '<div class="mq-jour">Hier</div>';
      s += ligne(IDEES[3]) + ligne(IDEES[4]);
    }
    s += '</div>';
    return s;
  }

  var FORMES = ['Fiche', 'Carte', 'Dessin', 'Planche', 'Table', 'Frise'];

  /** La barre d'une note ouverte, avec ses onglets de forme. */
  function barreNote(actif, vivant) {
    var s = '<div class="mq-post__bar"><span class="mq-post__nom">Le roman</span>';
    s += '<div class="mq-onglets">';
    FORMES.forEach(function (f) {
      s += (vivant ? '<button type="button"' : '<span') +
        ' class="mq-onglet"' + (f === actif ? ' data-actif' : '') +
        (vivant ? ' data-forme="' + f + '"' : '') + '>' + f +
        (vivant ? '</button>' : '</span>');
    });
    s += '</div></div>';
    return s;
  }

  /* ==============================================================
     Les corps de note, une fonction par forme
     ============================================================== */

  function corpsFiche(titre, texte) {
    return '<div class="mq-corps">' +
      '<div class="mq-couverture mq-im" data-im="1"></div>' +
      '<div class="mq-titre">' + (titre || 'Et si le narrateur mentait<br>depuis le début ?') + '</div>' +
      '<p class="mq-texte">' + (texte ||
        'Reprendre le chapitre 3 avec ça en tête. Toutes les descriptions du port deviennent ' +
        'suspectes dès qu’on sait qu’il n’y était pas.') + '</p>' +
      '<div class="mq-lignes"><span style="width:96%"></span><span style="width:88%"></span>' +
      '<span style="width:92%"></span><span style="width:54%"></span></div>' +
      '</div>';
  }

  function corpsCarte(racine) {
    var noeuds = [
      { x: 40, y: 150, t: racine || 'Le roman', racine: true },
      { x: 268, y: 60, t: 'Acte I — le port' },
      { x: 268, y: 150, t: 'Acte II — la fuite', actif: true },
      { x: 268, y: 240, t: 'Acte III — l’aveu' },
      { x: 496, y: 24, t: 'Le narrateur ment' },
      { x: 496, y: 114, t: 'Marc ne dit pas « je »' },
      { x: 496, y: 204, t: 'La scène du quai' }
    ];
    var svg = '<svg viewBox="0 0 720 360" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M212 174 C 240 174, 240 84, 268 84"/>' +
      '<path d="M212 174 L 268 174"/>' +
      '<path d="M212 174 C 240 174, 240 264, 268 264"/>' +
      '<path d="M440 84 C 468 84, 468 48, 496 48"/>' +
      '<path d="M440 174 C 468 174, 468 138, 496 138"/>' +
      '<path d="M440 264 C 468 264, 468 228, 496 228"/>' +
      '</svg>';
    var html = noeuds.map(function (n) {
      return '<div class="mq-noeud"' + (n.racine ? ' data-racine' : '') +
        (n.actif ? ' data-actif' : '') +
        ' style="left:calc(' + n.x + '*var(--k));top:calc(' + n.y + '*var(--k))">' +
        n.t + '</div>';
    }).join('');
    return '<div class="mq-carte">' + svg + html + '</div>';
  }

  function corpsDessin() {
    var svg = '<svg viewBox="0 0 720 360" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M96 240 C 150 120, 232 96, 288 168 C 336 230, 400 236, 448 176" stroke-width="3"/>' +
      '<path d="M288 168 L 288 288" stroke-width="2.4"/>' +
      '<path d="M448 176 C 500 120, 566 132, 596 192" stroke-width="2.4"/>' +
      '<path d="M120 300 L 620 300" stroke-width="1.6"/>' +
      '<path d="M470 92 C 508 60, 556 66, 572 104" stroke-width="3.4" data-accent="1"/>' +
      '<path d="M556 66 L 572 104 L 534 100" stroke-width="3.4" data-accent="1"/>' +
      '</svg>';
    return '<div class="mq-dessin">' + svg +
      '<div class="mq-outils mq-verre"><i data-actif></i><i></i><i></i><i></i></div></div>';
  }

  function corpsPlanche() {
    var im = '';
    [1, 2, 3, 4, 5, 6, 2].forEach(function (n) {
      im += '<div class="mq-im" data-im="' + n + '"></div>';
    });
    return '<div class="mq-planche">' + im + '</div>';
  }

  function corpsTable() {
    var lignes = [
      { p: 'Marc', e: 'Protagoniste', h: 18, d: '12 mars', c: true },
      { p: 'Hélène', e: 'Second rôle', h: 205, d: '3 avril', c: true },
      { p: 'Le gardien', e: 'Silhouette', h: 140, d: '18 avril', c: false },
      { p: 'La femme du port', e: 'Second rôle', h: 205, d: '2 mai', c: false },
      { p: 'Tomas', e: 'Antagoniste', h: 340, d: '9 mai', c: false }
    ];
    var corps = '<div class="mq-tr mq-tr--tete"><span>Personnage</span><span>Rôle</span>' +
      '<span>Apparaît</span><span>Écrit</span></div>';
    lignes.forEach(function (l) {
      corps += '<div class="mq-tr"><span>' + l.p + '</span>' +
        '<span><span class="mq-etiq" style="--h:' + l.h + '">' + l.e + '</span></span>' +
        '<span>' + l.d + '</span>' +
        '<span class="mq-case"' + (l.c ? ' data-coche' : '') + '></span></div>';
    });
    return '<div class="mq-table">' + corps + '</div>';
  }

  function corpsFrise() {
    var evts = [
      { d: 'Jour 1', n: 'Il arrive au port', q: 'Ouverture. Personne ne l’attend, et c’est ce qui le rassure.' },
      { d: 'Jour 3', n: 'La rencontre', q: 'Hélène le prend pour quelqu’un d’autre. Il ne corrige pas.' },
      { d: 'Jour 9', n: 'La lettre', q: 'Premier indice que le récit ment. Une date qui ne colle pas.' },
      { d: 'Jour 14', n: 'La fuite', q: 'Fin de l’acte II.' }
    ];
    var corps = '<div class="mq-frise"><span class="mq-frise__axe"></span>';
    evts.forEach(function (e) {
      corps += '<div class="mq-evt"><span class="mq-evt__pastille"></span>' +
        '<span class="mq-evt__date">' + e.d + '</span>' +
        '<span><span class="mq-evt__nom">' + e.n + '</span>' +
        '<span class="mq-evt__quoi">' + e.q + '</span></span></div>';
    });
    return corps + '</div>';
  }

  var CORPS = {
    Fiche: corpsFiche,
    Carte: corpsCarte,
    Dessin: corpsDessin,
    Planche: corpsPlanche,
    Table: corpsTable,
    Frise: corpsFrise
  };

  /** Une note ouverte en pleine largeur, sur l'onglet demandé. */
  function note(onglet, corps) {
    return '<div class="mq" style="--mq-w:760;--mq-h:480">' + fond() +
      '<div class="mq__scene">' +
        '<div class="mq-volet mq-verre" style="flex:1"><div class="mq-post">' +
          barreNote(onglet) + corps +
        '</div></div>' +
      '</div></div>';
  }

  /* ==============================================================
     Les maquettes
     ============================================================== */

  var MAQUETTES = {

    'flux-bureau': {
      alt: 'Atlas sur un grand écran : le rail de navigation, la liste des idées et la note ouverte côte à côte.',
      html: function () {
        return '<div class="mq" style="--mq-w:1100;--mq-h:660">' + fond() +
          '<div class="mq__scene">' +
            rail('flux') +
            listeIdees(5) +
            '<div class="mq-volet mq-volet--detail mq-verre"><div class="mq-post">' +
              barreNote('Fiche') + corpsFiche() +
            '</div></div>' +
          '</div></div>';
      }
    },

    'flux-tablette': {
      alt: 'Atlas sur tablette : la liste des idées à gauche, la note ouverte à droite.',
      html: function () {
        return '<div class="mq" style="--mq-w:820;--mq-h:580">' + fond() +
          '<div class="mq__scene">' +
            rail('flux') +
            '<div class="mq-volet mq-volet--liste mq-verre" style="width:calc(300*var(--k))">' +
              '<div class="mq-tete"><span class="mq-tete__main">Bonjour, Ewen !</span>' +
              '<span class="mq-rond">+</span></div>' +
              '<div class="mq-recherche">' + icone('loupe') + '<span>Chercher une idée</span></div>' +
              '<div class="mq-jour">Aujourd’hui</div>' +
              ligne(IDEES[0]) + ligne(IDEES[1]) + ligne(IDEES[2]) +
            '</div>' +
            '<div class="mq-volet mq-volet--detail mq-verre"><div class="mq-post">' +
              barreNote('Fiche') +
              '<div class="mq-corps">' +
                '<div class="mq-titre">Et si le narrateur mentait<br>depuis le début ?</div>' +
                '<p class="mq-texte">Reprendre le chapitre 3 avec ça en tête. Toutes les ' +
                'descriptions du port deviennent suspectes.</p>' +
                '<div class="mq-lignes"><span style="width:94%"></span><span style="width:86%"></span>' +
                '<span style="width:90%"></span><span style="width:48%"></span></div>' +
              '</div>' +
            '</div></div>' +
          '</div></div>';
      }
    },

    'capture-mobile': {
      alt: 'L’écran de capture d’Atlas sur téléphone : un champ, un curseur qui clignote, et les pastilles de projets.',
      html: function () {
        return '<div class="mq mq--tel" style="--mq-w:300;--mq-h:620">' + fond() +
          '<div class="mq__scene">' +
            '<div class="mq-tel__haut"><span>9:41</span>' +
              '<span class="mq-tel__signal"><i></i><i></i><i></i></span></div>' +
            '<div class="mq-tel__corps">' +
              '<div class="mq-capture mq-verre">' +
                '<div class="mq-capture__champ">Une idée ?<span class="mq-curseur"></span></div>' +
                '<div class="mq-chips">' +
                  '<span class="mq-chip" data-actif style="--h:18"><i></i>Le roman</span>' +
                  '<span class="mq-chip" style="--h:205"><i></i>La chaîne</span>' +
                  '<span class="mq-chip" style="--h:140"><i></i>Perso</span>' +
                '</div>' +
                '<div class="mq-capture__pied"><span>⏎ pour garder · ⇧⏎ nouvelle ligne</span></div>' +
              '</div>' +
              '<div class="mq-tabbar mq-verre">' +
                '<span class="mq-tab" data-actif>' + icone('eclair') + '<span>Capturer</span></span>' +
                '<span class="mq-tab">' + icone('flux') + '<span>Idées</span></span>' +
                '<span class="mq-tab">' + icone('espaces') + '<span>Projets</span></span>' +
                '<span class="mq-tab">' + icone('reglages') + '<span>Réglages</span></span>' +
              '</div>' +
            '</div>' +
          '</div></div>';
      }
    },

    'flux-balayage': {
      alt: 'Une idée balayée vers la droite dans la liste : l’action « Classer » apparaît sous la ligne.',
      html: function () {
        return '<div class="mq" style="--mq-w:460;--mq-h:400">' + fond() +
          '<div class="mq__scene">' +
            '<div class="mq-volet mq-verre" style="flex:1">' +
              '<div class="mq-tete"><span class="mq-tete__titre">Idées</span>' +
              '<span class="mq-rond">+</span></div>' +
              '<div class="mq-jour">Aujourd’hui</div>' +
              ligne(IDEES[0]) +
              '<div class="mq-balaye">' +
                '<div class="mq-balaye__fond">' + icone('dossier') + '<span>Classer</span></div>' +
                ligne(IDEES[1]) +
              '</div>' +
              ligne(IDEES[2]) +
              ligne(IDEES[4]) +
            '</div>' +
          '</div></div>';
      }
    },

    'espaces': {
      alt: 'Les projets dans Atlas : six cartes, chacune avec sa teinte, son nom et son nombre d’idées.',
      html: function () {
        var projets = [
          { nom: 'Le roman', n: 148, h: 18 },
          { nom: 'La chaîne', n: 62, h: 205 },
          { nom: 'Perso', n: 37, h: 140 },
          { nom: 'Le court-métrage', n: 24, h: 272 },
          { nom: 'Lectures', n: 91, h: 45 },
          { nom: 'À trier', n: 12, h: 0 }
        ];
        var cartes = projets.map(function (p) {
          return '<div class="mq-espace" style="--h:' + p.h + '">' +
            '<span class="mq-espace__halo"></span>' +
            '<span class="mq-espace__filigrane">' + p.n + '</span>' +
            '<span class="mq-espace__marque"></span>' +
            '<span class="mq-espace__nom">' + p.nom + '</span>' +
            '<span class="mq-espace__compte">' + p.n + ' idées</span>' +
            '</div>';
        }).join('');

        return '<div class="mq" style="--mq-w:820;--mq-h:520">' + fond() +
          '<div class="mq__scene">' +
            rail('espaces') +
            '<div class="mq-volet mq-verre" style="flex:1">' +
              '<div class="mq-tete"><span class="mq-tete__titre">Projets</span>' +
              '<span class="mq-rond">+</span></div>' +
              '<div class="mq-espaces">' + cartes + '</div>' +
            '</div>' +
          '</div></div>';
      }
    },

    'forme-fiche': {
      alt: 'Une fiche ouverte dans Atlas : image de couverture, titre et corps de texte.',
      html: function () { return note('Fiche', corpsFiche()); }
    },
    'forme-carte': {
      alt: 'Une carte mentale dans Atlas : un nœud racine et ses branches reliées sur un canevas.',
      html: function () { return note('Carte', corpsCarte()); }
    },
    'forme-dessin': {
      alt: 'Un croquis en cours dans Atlas : un tracé à main levée et la barre d’outils du canevas.',
      html: function () { return note('Dessin', corpsDessin()); }
    },
    'forme-planche': {
      alt: 'Une planche d’images dans Atlas : sept visuels d’ambiance disposés en mosaïque.',
      html: function () { return note('Planche', corpsPlanche()); }
    },
    'forme-table': {
      alt: 'Une table dans Atlas : des colonnes typées, des étiquettes colorées et des cases à cocher.',
      html: function () { return note('Table', corpsTable()); }
    },
    'forme-frise': {
      alt: 'Une chronologie dans Atlas : quatre événements posés dans l’ordre le long d’un axe.',
      html: function () { return note('Frise', corpsFrise()); }
    },

    'reglages': {
      alt: 'Les réglages d’Atlas : le choix du thème, la couleur d’accent et sa roue de teinte.',
      html: function () {
        return '<div class="mq" style="--mq-w:460;--mq-h:560">' + fond() +
          '<div class="mq__scene">' +
            '<div class="mq-volet mq-verre" style="flex:1">' +
              '<div class="mq-tete"><span class="mq-tete__titre">Réglages</span></div>' +
              '<div class="mq-reglages">' +

                '<div class="mq-reglage mq-verre">' +
                  '<div class="mq-reglage__label">Thème</div>' +
                  '<div class="mq-reglage__aide">Clair de 8 h à 18 h, sombre le reste du temps.</div>' +
                  '<div class="mq-reglage__corps"><div class="mq-segments">' +
                    '<span class="mq-segment" data-actif>Automatique</span>' +
                    '<span class="mq-segment">Clair</span>' +
                    '<span class="mq-segment">Sombre</span>' +
                  '</div>' +
                  '<span class="mq-maintenant">Il est 9 h 41, donc clair.</span></div>' +
                '</div>' +

                '<div class="mq-reglage mq-verre">' +
                  '<div class="mq-reglage__label">Couleur</div>' +
                  '<div class="mq-reglage__aide">Elle teinte aussi le fond, pas seulement les boutons.</div>' +
                  '<div class="mq-reglage__corps">' +
                    '<div class="mq-pastilles">' +
                      '<span class="mq-pastille" data-actif style="--h:var(--accent-h)"></span>' +
                      '<span class="mq-pastille" style="--h:205"></span>' +
                      '<span class="mq-pastille" style="--h:48"></span>' +
                      '<span class="mq-pastille" style="--h:158"></span>' +
                      '<span class="mq-pastille" style="--h:272"></span>' +
                    '</div>' +
                    '<div class="mq-roue"></div>' +
                  '</div>' +
                '</div>' +

                '<div class="mq-reglage mq-verre">' +
                  '<div class="mq-reglage__label">Matière</div>' +
                  '<div class="mq-reglage__aide">Du verre, ou des surfaces opaques.</div>' +
                  '<div class="mq-reglage__corps"><div class="mq-segments">' +
                    '<span class="mq-segment">Système</span>' +
                    '<span class="mq-segment" data-actif>Verre</span>' +
                    '<span class="mq-segment">Uni</span>' +
                  '</div></div>' +
                '</div>' +

              '</div>' +
            '</div>' +
          '</div></div>';
      }
    }
  };

  /* ==============================================================
     La pose

     Une maquette est une IMAGE : elle ne réagit à rien et ne prend
     pas le clavier. On l'annonce donc comme telle, avec sa
     description — sans quoi un lecteur d'écran énumérerait une à une
     les quarante bribes de texte du dessin.
     ============================================================== */

  document.querySelectorAll('[data-maq]').forEach(function (hote) {
    var m = MAQUETTES[hote.dataset.maq];
    if (!m) return;
    hote.innerHTML = m.html();
    hote.setAttribute('role', 'img');
    hote.setAttribute('aria-label', m.alt);
  });

  /* Ce que le bac à sable réemploie. */
  window.MQ = {
    icone: icone,
    fond: fond,
    rail: rail,
    ligne: ligne,
    barreNote: barreNote,
    corps: CORPS,
    formes: FORMES,
    idees: IDEES
  };
})();
