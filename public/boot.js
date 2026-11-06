/* Filet de sécurité au démarrage (ES5, sans dépendance) : si l'appli ne s'affiche pas,
   on explique pourquoi au lieu de laisser un écran vide, avec la version du navigateur. */
(function () {
  var errors = [];
  window.addEventListener('error', function (e) {
    errors.push((e && e.message) || 'erreur inconnue');
  });
  setTimeout(function () {
    var root = document.getElementById('root');
    if (!root || root.childNodes.length > 0) return;
    var box = document.createElement('div');
    box.className = 'boot-error';
    var title = document.createElement('h1');
    title.appendChild(document.createTextNode("L'appli n'a pas pu démarrer sur ce navigateur"));
    var p1 = document.createElement('p');
    p1.appendChild(document.createTextNode(
      'Essaie de mettre à jour le navigateur, ou installe Firefox ou Chrome, puis rouvre cette page.'
    ));
    var p2 = document.createElement('p');
    p2.appendChild(document.createTextNode('Informations à transmettre si le problème continue :'));
    var pre = document.createElement('pre');
    pre.appendChild(document.createTextNode(navigator.userAgent + (errors.length ? '\n' + errors.join('\n') : '')));
    box.appendChild(title);
    box.appendChild(p1);
    box.appendChild(p2);
    box.appendChild(pre);
    root.appendChild(box);
  }, 12000);
})();
