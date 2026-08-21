/* ---------------------------------------------------------------
   Atlas — la vitrine, sa mécanique.

   Un seul fichier, aucune dépendance, aucun outil de compilation :
   ce site doit pouvoir être ouvert et corrigé dans deux ans sans
   qu'un `npm install` ait à réussir. C'est la même règle que pour
   l'outillage du projet (tools/icones.mjs).

   Quatre choses seulement :
   · le thème (clair / nuit / automatique à l'heure) ;
   · l'accent, réglable, qui reteinte tout, halos compris ;
   · l'œil d'Atlas, engendré en SVG ;
   · deux babioles d'interface (le menu, l'apparition au défilement).
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  /* ==============================================================
     1. LE THÈME

     Bornes reprises de src/theme/theme.ts : clair de 8 h à 18 h,
     nuit le reste du temps. Le mode automatique est le défaut, et
     c'est volontaire — un site qui s'allume en pleine nuit est le
     seul détail que personne ne pardonne.
     ============================================================== */

  var CLEF = 'atlas.site.v1';
  var JOUR_DEBUT = 8;
  var JOUR_FIN = 18;

  /* L'accent par défaut, synchronisé avec ACCENT_DEFAUT de l'app. */
  var ACCENT_DEFAUT = { h: 359, s: 92, l: 58 };

  var etat = charger();

  function charger() {
    var defaut = { mode: 'auto', accent: ACCENT_DEFAUT };
    try {
      var brut = localStorage.getItem(CLEF);
      if (!brut) return defaut;
      var lu = JSON.parse(brut);
      var a = lu && lu.accent;
      return {
        mode: lu.mode === 'light' || lu.mode === 'dark' ? lu.mode : 'auto',
        accent: a && typeof a.h === 'number' ? { h: a.h, s: a.s || 92, l: a.l || 58 } : ACCENT_DEFAUT
      };
    } catch (e) {
      /* navigation privée, stockage plein : le thème n'est pas
         critique, on continue avec les valeurs par défaut. */
      return defaut;
    }
  }

  function ranger() {
    try {
      localStorage.setItem(CLEF, JSON.stringify(etat));
    } catch (e) {}
  }

  function resoudre(mode) {
    if (mode !== 'auto') return mode;
    var h = new Date().getHours();
    return h >= JOUR_DEBUT && h < JOUR_FIN ? 'light' : 'dark';
  }

  /* Luminance perçue, pour décider de l'encre POSÉE SUR l'accent :
     presque noir sur un jaune, blanc sur un violet. Le vert pèse le
     plus dans la perception humaine, d'où les coefficients. */
  function luminance(a) {
    var sN = a.s / 100;
    var lN = a.l / 100;
    var c = (1 - Math.abs(2 * lN - 1)) * sN;
    var x = c * (1 - Math.abs(((a.h / 60) % 2) - 1));
    var m = lN - c / 2;
    var seg = Math.floor(a.h / 60) % 6;
    var rgb =
      seg === 0 ? [c, x, 0] :
      seg === 1 ? [x, c, 0] :
      seg === 2 ? [0, c, x] :
      seg === 3 ? [0, x, c] :
      seg === 4 ? [x, 0, c] : [c, 0, x];
    return 0.2126 * (rgb[0] + m) + 0.7152 * (rgb[1] + m) + 0.0722 * (rgb[2] + m);
  }

  function appliquer() {
    var resolu = resoudre(etat.mode);
    var a = etat.accent;

    root.dataset.theme = resolu;
    root.style.setProperty('--accent-h', String(a.h));
    root.style.setProperty('--accent-s', a.s + '%');
    root.style.setProperty('--accent-l', a.l + '%');
    root.style.setProperty(
      '--accent-ink',
      luminance(a) > 0.55 ? 'hsl(' + a.h + ' 45% 11%)' : '#ffffff'
    );

    /* Les trois halos du fond dérivent de l'accent : changer la
       couleur change l'ambiance entière, pas seulement les boutons.
       Écart resserré (±44°), sinon un halo part dans une teinte
       étrangère à l'accent. */
    root.style.setProperty('--aur-h1', String(a.h));
    root.style.setProperty('--aur-h2', String((a.h + 44) % 360));
    root.style.setProperty('--aur-h3', String((a.h + 316) % 360));

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolu === 'dark' ? '#0b0d12' : '#eceff6');

    // les boutons de réglage reflètent l'état courant
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === etat.mode));
    });
    document.querySelectorAll('.teinte').forEach(function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.h) === a.h));
    });
    document.querySelectorAll('.roue').forEach(function (r) {
      if (document.activeElement !== r) r.value = String(a.h);
    });

    var libelle = etat.mode === 'auto' ? 'Thème : automatique à l’heure'
      : etat.mode === 'light' ? 'Thème : toujours clair'
      : 'Thème : toujours sombre';
    document.querySelectorAll('.bascule-theme').forEach(function (b) {
      b.setAttribute('title', libelle);
      b.setAttribute('aria-label', libelle);
    });
  }

  /* Le thème est posé AVANT la première image, sinon la page
     s'affiche en clair puis bascule — c'est le clignotement blanc
     que tout le monde connaît. La classe `theme-ready`, elle, n'est
     ajoutée qu'ensuite : elle autorise la TRANSITION de couleur, qui
     ne doit surtout pas jouer au chargement. */
  appliquer();
  requestAnimationFrame(function () {
    root.classList.add('theme-ready');
  });

  /* Le mode automatique se réévalue : quelqu'un qui laisse la page
     ouverte à 18 h doit voir la nuit tomber. Une fois par minute
     suffit largement. */
  setInterval(function () {
    if (etat.mode === 'auto') appliquer();
  }, 60000);

  document.addEventListener('click', function (e) {
    var bascule = e.target.closest('.bascule-theme');
    if (bascule) {
      // auto → clair → sombre → auto
      etat.mode = etat.mode === 'auto' ? 'light' : etat.mode === 'light' ? 'dark' : 'auto';
      ranger();
      appliquer();
      return;
    }

    var mode = e.target.closest('[data-mode]');
    if (mode) {
      etat.mode = mode.dataset.mode;
      ranger();
      appliquer();
      return;
    }

    var teinte = e.target.closest('.teinte');
    if (teinte) {
      etat.accent = {
        h: Number(teinte.dataset.h),
        s: Number(teinte.dataset.s || 92),
        l: Number(teinte.dataset.l || 58)
      };
      ranger();
      appliquer();
    }
  });

  document.addEventListener('input', function (e) {
    if (!e.target.classList.contains('roue')) return;
    etat.accent = { h: Number(e.target.value), s: etat.accent.s, l: etat.accent.l };
    appliquer();
  });

  document.addEventListener('change', function (e) {
    if (e.target.classList.contains('roue')) ranger();
  });

  /* ==============================================================
     2. L'ŒIL D'ATLAS

     Portage fidèle de src/ui/OeilAtlas.tsx. Le dessin est ENGENDRÉ,
     pas recopié : treize langues le long d'une spirale, six braises
     en orbite, vingt-deux stries d'iris. Les paramètres dérivent de
     l'indice plutôt que d'un tirage au sort — le dessin doit être le
     même d'un rendu à l'autre.
     ============================================================== */

  var CADRE = 180;
  var CENTRE = CADRE / 2;
  var TAU = Math.PI * 2;

  /* La courbe est INTÉGRÉE, pas paramétrée en polaire : on suit une
     direction qui pivote de plus en plus (θ = θ₀ + k·t²) et on avance
     pas à pas. La langue part droit, puis s'enroule en spirale d'un
     rayon petit — c'est le geste d'une flamme qui lèche. En polaire,
     un crochet serré est tout simplement inexprimable : la pointe
     balaie un arc immense au lieu de s'enrouler. */
  function langue(a0, rBase, longueur, virage, inclinaison, largeur) {
    var n = 44;
    var x = CENTRE + Math.cos(a0) * rBase;
    var y = CENTRE + Math.sin(a0) * rBase;

    var axe = [];
    var pas = longueur / n;
    for (var i = 0; i <= n; i++) {
      axe.push([x, y]);
      var t = i / n;
      var theta = a0 + inclinaison + virage * t * t;
      x += Math.cos(theta) * pas;
      y += Math.sin(theta) * pas;
    }

    var gauche = [];
    var droite = [];
    for (var j = 0; j <= n; j++) {
      var tt = j / n;
      var a = axe[Math.max(0, j - 1)];
      var b = axe[Math.min(n, j + 1)];
      var L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      var nx = -(b[1] - a[1]) / L;
      var ny = (b[0] - a[0]) / L;
      /* Épaisse au pied, effilée à la pointe — et jamais nulle au
         départ, puisque le départ est caché sous le globe. Une langue
         large jusqu'au bout ressemble à un pétale ; treize pétales
         font un anneau. */
      var w = largeur * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * tt)), 0.5) * (1 - 0.55 * tt);
      gauche.push([axe[j][0] + nx * w, axe[j][1] + ny * w]);
      droite.push([axe[j][0] - nx * w, axe[j][1] - ny * w]);
    }

    var pts = gauche.concat(droite.reverse());
    return 'M' + pts.map(function (p) {
      return p[0].toFixed(1) + ' ' + p[1].toFixed(1);
    }).join('L') + 'Z';
  }

  var LANGUES = [];
  for (var i = 0; i < 13; i++) {
    /* Le sens du crochet suit un cycle de 3 sur 13 éléments : il ne
       se répète donc jamais deux tours de suite au même endroit. Un
       sens qui alterne simplement donne une roue à aubes. */
    var sens = i % 3 === 0 ? -1 : 1;
    LANGUES.push({
      d: langue(
        (i / 13) * TAU + (((i * 0.37) % 1) - 0.5) * 0.2,
        40,
        40 + ((i * 7) % 5) * 5,
        sens * (1.55 + ((i * 5) % 4) * 0.28),
        sens * 0.5,
        6 + ((i * 7) % 4) * 1.5
      ),
      ton: i % 3,
      duree: 2.6 + ((i * 7) % 6) * 0.43,
      retard: ((i * 13) % 11) * 0.29
    });
  }

  /* Les braises : de petites boules détachées, en orbite lente. Elles
     font respirer le vide entre les langues — sans elles la couronne
     s'arrête net. */
  var BRAISES = [];
  for (var k = 0; k < 6; k++) {
    var ang = (k / 6) * TAU + 0.5;
    var ray = 60 + ((k * 5) % 4) * 3.6;
    BRAISES.push({
      x: CENTRE + Math.cos(ang) * ray,
      y: CENTRE + Math.sin(ang) * ray,
      r: 2.2 + ((k * 3) % 3) * 0.9,
      ton: (k + 1) % 3,
      duree: 4.2 + ((k * 5) % 5) * 0.47,
      retard: ((k * 7) % 6) * 0.42
    });
  }

  var STRIES = [];
  for (var m = 0; m < 22; m++) {
    var an = (m / 22) * TAU;
    // longueur irrégulière : des stries toutes identiques se remarquent
    var dedans = 11 + ((m * 7) % 5) * 0.5;
    var dehors = 20 + ((m * 5) % 6) * 0.55;
    STRIES.push({
      x1: 50 + Math.cos(an) * dedans,
      y1: 50 + Math.sin(an) * dedans,
      x2: 50 + Math.cos(an) * dehors,
      y2: 50 + Math.sin(an) * dehors,
      o: 0.1 + ((m * 3) % 5) * 0.045
    });
  }

  /* `flux` : la couronne. Coupée d'office en dessous de 34 px — à
     cette taille les langues font moins de trois pixels de large et
     ne rendent qu'une bouillie autour de l'œil. */
  /* Chaque œil porte SES propres dégradés et masques, donc ses propres
     identifiants. Les nommer d'après la taille ne suffit pas : deux
     yeux de 26 px — celui de l'en-tête et celui du pied — produiraient
     le même identifiant, et le second irait chercher les dégradés du
     premier. Un compteur règle la question une fois pour toutes. */
  var noOeil = 0;

  function oeilSvg(taille, avecFlux) {
    var flux = avecFlux === undefined ? taille >= 34 : avecFlux;
    var cote = flux ? taille * 1.8 : taille;
    var vb = flux ? '0 0 ' + CADRE + ' ' + CADRE : '0 0 100 100';
    var uid = 'o' + ++noOeil;

    var s = '<svg class="oeil" width="' + cote + '" height="' + cote + '" viewBox="' + vb +
      '" role="img" aria-label="Atlas">';

    s += '<defs>' +
      '<radialGradient id="iris-' + uid + '" cx="38%" cy="34%" r="72%">' +
        '<stop offset="0%" stop-color="var(--iris-clair)"/>' +
        '<stop offset="55%" stop-color="var(--iris-vif)"/>' +
        '<stop offset="100%" stop-color="var(--iris-sombre)"/>' +
      '</radialGradient>' +
      /* le centre décalé creuse la pupille au lieu de l'aplatir */
      '<radialGradient id="pup-' + uid + '" cx="42%" cy="38%" r="78%">' +
        '<stop offset="0%" stop-color="var(--pupille-coeur)"/>' +
        '<stop offset="62%" stop-color="var(--pupille-bord)"/>' +
        '<stop offset="100%" stop-color="var(--pupille-halo)"/>' +
      '</radialGradient>' +
      '<linearGradient id="pau-' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="var(--paupiere-haut)"/>' +
        '<stop offset="100%" stop-color="var(--paupiere-bas)"/>' +
      '</linearGradient>' +
      '<filter id="lue-' + uid + '" x="-60%" y="-60%" width="220%" height="220%">' +
        '<feGaussianBlur stdDeviation="2.6"/></filter>' +
      '<filter id="omb-' + uid + '" x="-30%" y="-40%" width="160%" height="200%">' +
        '<feGaussianBlur stdDeviation="3"/></filter>' +
      '<clipPath id="glo-' + uid + '"><circle cx="50" cy="50" r="45"/></clipPath>' +
      '</defs>';

    /* La couronne passe SOUS l'œil dans l'ordre de peinture : les
       langues partent de derrière le globe, ce qui les fait sortir de
       lui au lieu de flotter à côté. */
    if (flux) {
      s += '<g class="oeil__couronne" aria-hidden="true">';
      LANGUES.forEach(function (l) {
        s += '<path class="oeil__langue" data-ton="' + l.ton + '" d="' + l.d +
          '" style="animation-duration:' + l.duree + 's;animation-delay:-' + l.retard + 's"/>';
      });
      BRAISES.forEach(function (b) {
        s += '<circle class="oeil__braise" data-ton="' + b.ton + '" cx="' + b.x.toFixed(1) +
          '" cy="' + b.y.toFixed(1) + '" r="' + b.r + '" style="animation-duration:' +
          b.duree + 's;animation-delay:-' + b.retard + 's"/>';
      });
      s += '</g>';
    }

    s += '<g' + (flux ? ' transform="translate(' + (CENTRE - 50) + ' ' + (CENTRE - 50) + ')"' : '') + '>';
    s += '<circle class="oeil__blanc" cx="50" cy="50" r="45"/>';
    s += '<g clip-path="url(#glo-' + uid + ')">';
    s += '<g class="oeil__regard">';
    s += '<circle class="oeil__iris" cx="50" cy="50" r="23" fill="url(#iris-' + uid + ')"/>';
    STRIES.forEach(function (t) {
      s += '<line class="oeil__strie" x1="' + t.x1.toFixed(1) + '" y1="' + t.y1.toFixed(1) +
        '" x2="' + t.x2.toFixed(1) + '" y2="' + t.y2.toFixed(1) +
        '" style="opacity:' + t.o.toFixed(3) + '"/>';
    });
    s += '<circle class="oeil__anneau" cx="50" cy="50" r="23"/>';
    s += '<circle class="oeil__pupille" cx="50" cy="50" r="10" fill="url(#pup-' + uid + ')"/>';
    s += '<circle class="oeil__lueur" cx="42" cy="41" r="6.5" filter="url(#lue-' + uid + ')"/>';
    s += '<circle class="oeil__eclat" cx="58" cy="59" r="2.6"/>';
    s += '</g>';

    /* Deux groupes imbriqués, et c'est nécessaire : la paupière porte
       DEUX mouvements à la fois — le clignement, brusque et complet,
       et le suivi du regard, minuscule et permanent. Deux `transform`
       sur un même élément s'écrasent. */
    s += '<g class="oeil__voile"><g class="oeil__paupiere">';
    s += '<ellipse class="oeil__ombre" cx="50" cy="0" rx="52" ry="10" filter="url(#omb-' + uid + ')"/>';
    s += '<rect x="-6" y="-108" width="112" height="108" fill="url(#pau-' + uid + ')"/>';
    s += '<ellipse cx="50" cy="-1" rx="56" ry="9" fill="var(--paupiere-bas)"/>';
    s += '<path class="oeil__cil" d="M -6 -1 Q 50 9, 106 -1"/>';
    s += '</g></g>';
    s += '</g>';
    s += '<circle class="oeil__cerne" cx="50" cy="50" r="45"/>';
    s += '</g></svg>';

    return s;
  }

  document.querySelectorAll('[data-oeil]').forEach(function (hote) {
    var taille = Number(hote.dataset.oeil) || 74;
    var flux = hote.dataset.flux !== 'non';
    hote.innerHTML = oeilSvg(taille, flux);
  });

  /* ==============================================================
     3. LE MENU (largeur compacte)
     ============================================================== */

  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var ouvert = nav.dataset.ouvert === 'true';
      nav.dataset.ouvert = String(!ouvert);
      burger.setAttribute('aria-expanded', String(!ouvert));
    });
    // un lien choisi referme le menu : sinon il masque la cible
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.dataset.ouvert = 'false';
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* La bordure de l'en-tête n'apparaît qu'une fois la page défilée :
     posée d'emblée, elle coupe l'ouverture en deux. */
  var entete = document.querySelector('.entete');
  if (entete) {
    var majEntete = function () {
      entete.dataset.defile = String(window.scrollY > 8);
    };
    majEntete();
    window.addEventListener('scroll', majEntete, { passive: true });
  }

  /* ==============================================================
     4. L'APPARITION AU DÉFILEMENT

     Une seule fois, jamais en sens inverse : un contenu qui
     disparaît quand on remonte est une farce, pas une animation.
     ============================================================== */

  var reveles = document.querySelectorAll('.revele');
  if (reveles.length && 'IntersectionObserver' in window) {
    var guet = new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.dataset.vu = 'true';
          guet.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    reveles.forEach(function (el) {
      guet.observe(el);
    });
  } else {
    reveles.forEach(function (el) {
      el.dataset.vu = 'true';
    });
  }

  /* ==============================================================
     5. LA PAGE COURANTE DANS LA NAVIGATION
     ============================================================== */

  /* Certains hébergeurs servent `tarifs.html` à l'adresse `/tarifs`,
     d'autres non. On compare donc les noms DÉBARRASSÉS de l'extension,
     sinon la page courante n'est marquée que sur la moitié des
     hébergements — et le défaut ne se voit qu'une fois en ligne. */
  function nomDePage(chemin) {
    var dernier = (chemin || '').split(/[?#]/)[0].split('/').pop();
    if (!dernier) return 'index';
    return dernier.replace(/\.html$/, '');
  }

  var ici = nomDePage(location.pathname);
  document.querySelectorAll('.nav__lien').forEach(function (a) {
    if (nomDePage(a.getAttribute('href')) === ici) {
      a.setAttribute('aria-current', 'page');
    }
  });
})();
