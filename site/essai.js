/* ---------------------------------------------------------------
   Le bac à sable — Atlas, essayable depuis le site.

   Deux blocs, tous deux vivants :

   · `[data-essai]`  — la capture et la liste. On écrit, on garde, on
     classe, on archive, on annule. C'est le cœur du produit, et c'est
     la seule façon honnête de le montrer : une capture d'écran ne
     prouve pas qu'une idée se garde en cinq secondes.

   · `[data-formes]` — les six formes d'une note, en onglets, qui
     montrent la maquette correspondante.

   Rien n'est envoyé et rien n'est gardé au rechargement. C'est dit
   dans le bloc plutôt que caché : personne n'a envie de découvrir
   après coup où sont parties ses trois lignes.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var MQ = window.MQ || {};

  /* ==============================================================
     1. LE BAC À SABLE
     ============================================================== */

  var PROJETS = [
    { nom: 'Le roman', h: 18 },
    { nom: 'La chaîne', h: 205 },
    { nom: 'Perso', h: 140 }
  ];

  /* Deux idées d'avance : une liste vide ne montre rien, et on ne
     comprend pas ce qu'on est censé y faire. */
  var DEPART = [
    { texte: 'Et si le narrateur mentait depuis le début ?', p: 0, h: '09:12' },
    { texte: 'Lumière rasante pour la scène du quai. Deux focales, pas plus.', p: 1, h: '08:41' }
  ];

  function heure() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function echapper(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function monterEssai(hote) {
    var idees = DEPART.map(function (d, i) {
      return { id: 'd' + i, texte: d.texte, projet: d.p, heure: d.h };
    });
    var projetActif = 0;
    var compteur = 0;
    var annulation = null;

    hote.classList.add('essai', 'glass');
    hote.innerHTML =
      '<div class="essai__tete">' +
        '<span class="essai__main">Bonjour !</span>' +
        '<span class="essai__ref">Bac à sable · rien n’est envoyé</span>' +
      '</div>' +

      '<form class="essai__capture">' +
        '<textarea class="essai__champ" rows="2" aria-label="Écris une idée" ' +
          'placeholder="Une idée qui passe…"></textarea>' +
        '<div class="essai__chips" role="group" aria-label="Projet de rattachement">' +
          PROJETS.map(function (p, i) {
            return '<button type="button" class="essai__chip" data-projet="' + i + '" ' +
              'style="--h:' + p.h + '" aria-pressed="' + (i === 0) + '"><i></i>' + p.nom + '</button>';
          }).join('') +
        '</div>' +
        '<div class="essai__pied">' +
          '<span class="essai__astuce">⏎ pour garder · ⇧⏎ nouvelle ligne</span>' +
          '<button type="submit" class="btn btn--accent">Garder</button>' +
        '</div>' +
      '</form>' +

      '<p class="essai__jour">Aujourd’hui</p>' +
      '<div class="essai__liste" aria-live="polite"></div>' +
      '<div class="essai__rattrapage"></div>';

    var champ = hote.querySelector('.essai__champ');
    var form = hote.querySelector('.essai__capture');
    var liste = hote.querySelector('.essai__liste');
    var rattrapage = hote.querySelector('.essai__rattrapage');

    function dessiner(neuveId) {
      if (!idees.length) {
        liste.innerHTML = '<p class="essai__vide">Plus rien ici. Écris une ligne au-dessus : ' +
          'elle se posera tout de suite, et tu pourras la classer ensuite.</p>';
        return;
      }
      liste.innerHTML = idees.map(function (i) {
        var p = PROJETS[i.projet];
        return '<div class="essai__idee" data-id="' + i.id + '" style="--h:' + p.h + '"' +
          (i.id === neuveId ? ' data-neuve' : '') + '>' +
          '<span class="essai__marque"></span>' +
          '<div class="essai__corps">' +
            '<p class="essai__titre">' + echapper(i.texte) + '</p>' +
            '<p class="essai__meta"><span class="essai__projet">' + p.nom + '</span>' +
            '<span>·</span><span>' + i.heure + '</span></p>' +
          '</div>' +
          '<div class="essai__actions">' +
            '<button type="button" class="essai__action" data-action="classer">Classer</button>' +
            '<button type="button" class="essai__action" data-action="archiver">Archiver</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function garder() {
      var texte = champ.value.trim();
      if (!texte) { champ.focus(); return; }
      var id = 'n' + ++compteur;
      idees.unshift({ id: id, texte: texte, projet: projetActif, heure: heure() });
      champ.value = '';
      champ.style.height = '';
      dessiner(id);
      champ.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      garder();
    });

    /* Entrée garde, Maj+Entrée passe à la ligne — exactement comme
       dans l'app. C'est ce raccourci qui fait les cinq secondes. */
    champ.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        garder();
      }
    });

    /* Le champ grandit avec le texte, il ne défile pas sur lui-même. */
    champ.addEventListener('input', function () {
      champ.style.height = 'auto';
      champ.style.height = champ.scrollHeight + 'px';
    });

    hote.addEventListener('click', function (e) {
      var chip = e.target.closest('.essai__chip');
      if (chip) {
        projetActif = Number(chip.dataset.projet);
        hote.querySelectorAll('.essai__chip').forEach(function (c) {
          c.setAttribute('aria-pressed', String(Number(c.dataset.projet) === projetActif));
        });
        return;
      }

      var action = e.target.closest('[data-action]');
      if (!action) return;
      var idee = action.closest('.essai__idee');
      var id = idee.dataset.id;
      var rang = idees.findIndex(function (i) { return i.id === id; });
      if (rang < 0) return;

      /* CLASSER fait tourner le projet d'un cran. Dans l'app c'est une
         feuille de choix ; ici, un cycle suffit à montrer que le
         rangement se fait sans quitter la liste. */
      if (action.dataset.action === 'classer') {
        idees[rang].projet = (idees[rang].projet + 1) % PROJETS.length;
        dessiner();
        return;
      }

      /* ARCHIVER retire la ligne — et laisse un mot pour revenir en
         arrière. Rien ne se perd, jamais. */
      var partie = idees[rang];
      idee.setAttribute('data-part', '');
      annulation = { idee: partie, rang: rang };
      setTimeout(function () {
        idees.splice(rang, 1);
        dessiner();
        mot(partie.texte);
      }, 300);
    });

    function mot(texte) {
      var court = texte.length > 34 ? texte.slice(0, 34) + '…' : texte;
      rattrapage.innerHTML =
        '<div class="essai__mot"><span>« ' + echapper(court) + ' » est aux archives.</span>' +
        '<button type="button" class="essai__annuler">Annuler</button></div>';
      var t = setTimeout(function () { rattrapage.innerHTML = ''; }, 7000);
      rattrapage.querySelector('.essai__annuler').addEventListener('click', function () {
        clearTimeout(t);
        if (!annulation) return;
        idees.splice(Math.min(annulation.rang, idees.length), 0, annulation.idee);
        rattrapage.innerHTML = '';
        dessiner(annulation.idee.id);
        annulation = null;
      });
    }

    dessiner();
  }

  document.querySelectorAll('[data-essai]').forEach(monterEssai);

  /* ==============================================================
     2. LES SIX FORMES, EN ONGLETS
     ============================================================== */

  function monterFormes(hote) {
    if (!MQ.formes) return;

    var quoi = {
      Fiche: 'Titre, corps, image de couverture. Enregistré au fil de la frappe.',
      Carte: 'Des nœuds qui se ramifient : un plan, un univers, une arborescence.',
      Dessin: 'Un croquis au doigt ou à la souris, pour ce qu’une phrase ne dit pas.',
      Planche: 'Des images côte à côte pour poser une direction visuelle.',
      Table: 'Des colonnes typées, des étiquettes qui se colorent toutes seules.',
      Frise: 'Des événements posés dans l’ordre, sur un axe.'
    };

    hote.classList.add('formes-vives');
    hote.innerHTML =
      '<div class="formes-vives__onglets glass" role="tablist" aria-label="Les six formes d’une note">' +
        MQ.formes.map(function (f, i) {
          return '<button type="button" class="formes-vives__onglet" role="tab" ' +
            'data-forme="' + f + '" aria-selected="' + (i === 0) + '">' + f + '</button>';
        }).join('') +
      '</div>' +
      '<p class="texte formes-vives__quoi"></p>' +
      '<div class="maq formes-vives__vue"></div>';

    var vue = hote.querySelector('.formes-vives__vue');
    var legende = hote.querySelector('.formes-vives__quoi');

    function montrer(forme) {
      var corps = MQ.corps[forme];
      vue.innerHTML = '<div class="mq mq--note">' + MQ.fond() +
        '<div class="mq__scene">' +
          '<div class="mq-volet mq-verre" style="flex:1"><div class="mq-post">' +
            MQ.barreNote(forme) + corps() +
          '</div></div>' +
        '</div></div>';
      vue.setAttribute('role', 'img');
      vue.setAttribute('aria-label', 'Une note d’Atlas dans sa forme « ' + forme + ' ».');
      legende.textContent = quoi[forme];
    }

    hote.addEventListener('click', function (e) {
      var onglet = e.target.closest('[data-forme]');
      if (!onglet) return;
      hote.querySelectorAll('[data-forme]').forEach(function (o) {
        o.setAttribute('aria-selected', String(o === onglet));
      });
      montrer(onglet.dataset.forme);
    });

    /* Les flèches parcourent les onglets : c'est ce qu'attend
       quelqu'un qui navigue au clavier dans une liste d'onglets. */
    hote.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var onglets = [].slice.call(hote.querySelectorAll('[data-forme]'));
      var i = onglets.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var suivant = onglets[(i + (e.key === 'ArrowRight' ? 1 : onglets.length - 1)) % onglets.length];
      suivant.focus();
      suivant.click();
    });

    montrer(MQ.formes[0]);
  }

  document.querySelectorAll('[data-formes]').forEach(monterFormes);
})();
