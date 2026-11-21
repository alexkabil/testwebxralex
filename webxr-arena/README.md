## Déplacements

- **Client non VR (PC)** : ZQSD / WASD / flèches directionnelles pour se déplacer sur le plan
  (X/Z, hauteur fixe), `Maj` pour courir. La caméra orbite ensuite avec la souris (OrbitControls).
- **Casque VR** : téléportation façon exemple three.js `webxr_vr_teleport` — un **anneau bleu**
  apparaît au sol là où pointe le rayon d'un contrôleur ; appuyer sur la gâchette téléporte le
  joueur à cet endroit (la caméra est portée par un groupe « dolly » déplacé). Si le rayon touche
  un objet interactif à la place du sol, la gâchette sélectionne/désélectionne l'objet.