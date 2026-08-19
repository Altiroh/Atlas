import { memo } from 'react'

/* Le fond de l'app.

   Deux couches qui se répondent :

   · LES HALOS — teintés par l'accent, déplacés en transform seul.
     Jamais de flou animé, qui écroulerait le rendu sur iPhone.
   · LA TRAME — la planche à dessin. C'est elle qui raccorde l'app à
     l'écran d'entrée : les volets en verre se lisent alors comme des
     feuilles POSÉES sur une planche, et non comme des cartes en
     apesanteur.

   La trame reste sous le seuil de perception consciente. Le décor
   appartient au fond ; le contenu, lui, ne se décore pas. */

export const Aurora = memo(function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__blob aurora__blob--1" />
      <div className="aurora__blob aurora__blob--2" />
      <div className="aurora__blob aurora__blob--3" />
      <div className="trame" />
    </div>
  )
})
