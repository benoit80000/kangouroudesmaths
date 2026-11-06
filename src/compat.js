// Détecte l'absence de « gap » dans les rangées flex (Chrome < 84, Safari < 14.1)
// pour activer des marges de repli dans styles.css.
export function detectFlexGap() {
  try {
    const box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    box.appendChild(document.createElement('div'));
    box.appendChild(document.createElement('div'));
    document.body.appendChild(box);
    const supported = box.scrollHeight === 1;
    box.remove();
    if (!supported) document.documentElement.classList.add('no-flex-gap');
  } catch {
    // sans conséquence
  }
}
