// Sujet E (CE2-CM1-CM2) du Kangourou des Mathématiques.
// Corrigés officiels : une lettre par question, de la question 1 à 24.
export const ANSWER_KEYS = {
  "2004": "EBABEBCBDDCBCCEEBECAAEAC",
  "2005": "ECCABBCECCDCBBDDACCEADCD",
  "2006": "DEDACEBBCBDAEBDCEDDEBCEB",
  "2007": "CCCACEBCCCCCAABAEBBCABDE",
  "2008": "DDCDCBAAEBCBEDDDCCADEEDB",
  "2009": "DBEDBBDEDADBDBBEBBADBDAE",
  "2010": "EEAEABCDCBBCADCBEACEDDDB",
  "2011": "BDBBDCEEEADBABDCDBCEDAEC",
  "2012": "BDBDCCADCEBDBCBDCEBDCDCE",
  "2013": "ADDECDBEBDDBEADBBDCBDCDC",
  "2014": "BAECAEDCECDBDBCBDBECDADD",
  "2015": "DCEEEABDBCBACEBCCDDCCBDC",
  "2016": "DECDEAABBEDBBCCEDADBCBCD",
  "2017": "AEBEBCAECABEEBCDDDCDBDCB",
  "2018": "BDBDBECBDCBECDEACDAACDAB",
  "2019": "EDCCCBAACDEDDCBCBCDCEABD",
  "2020": "EBAECAECBDCDCBBDBADBCDDD",
  "2021": "CCBBECCDDDEEACEDBDBDDADA",
  "2022": "EDDCCEDDCCABCDAEBDEEBBAD",
  "2023": "DBCCAAEECCECBBADABBBDCDE",
  "2024": "DDECDCECBABEAADBDAECDDCE",
  "2025": "DDBDCEEEDCCCEBCEADAABCCD"
};

// Énoncés retranscrits (utilisés comme texte alternatif des figures).
export const QUESTION_TEXTS = {
  2025: {
    "1": "Quel chiffre est à l'extérieur du cercle ?",
    "2": "Elsa rajoute des cubes un par un pour réaliser un grand cube de 3×3×3. Voici 5 étapes de sa construction. Dans quel ordre ont-elles été réalisées ?",
    "3": "Alex marche sur des traces au sol. Quel dessin peut représenter les traces sur lesquelles il a posé son pied ?",
    "4": "Quel est le plus grand nombre de 4 chiffres qu'on peut écrire en utilisant deux fois le chiffre 2 et une fois les chiffres 5 et 0 ?",
    "5": "Voici le parasol de Gabin vu de dessus. Lequel des dessins suivants montre aussi le parasol de Gabin vu de dessus ?",
    "6": "Dans le jeu d'Océane, une coquille vaut 6 et une bille vaut 1. Lequel de ces dessins représente une valeur de 16 ?",
    "7": "Une seule de ces cordes fait un nœud si on tire sur ses deux extrémités. Laquelle ?",
    "8": "Léa veut couper sa pizza en deux moitiés. Elle veut que chaque moitié contienne le même nombre d'olives. Pour cela, elle coupe le long d'un des traits dessinés en pointillé. Lequel ?",
    "9": "Le trajet de l'école au zoo peut être codé. Si un kangourou sort du zoo et suit le trajet codé, où arrivera-t-il ?",
    "10": "Un dé normal a des faces avec 1, 2, 3, 4, 5 et 6 points et la somme des points de deux faces opposées vaut toujours 7. Dans les dés vus ci-dessous, un seul peut être un dé normal. Lequel?",
    "11": "Quelle est la pièce à poser pour compléter le damier ?",
    "12": "Les six moutons de Jean-Pierre mangent au total 14 kg de foin chaque jour. Le petit mouton mange le double d'un mouton adulte. Quelle quantité de foin mange chaque jour le petit mouton ?",
    "13": "Voici 3 tiges. Un des petits moulins dessinés ci-dessous a été fabriqué avec ces 3 tiges. Lequel ?",
    "14": "Issa a commencé à remplir trois enclos avec des kangourous. Il reste 15 kangourous à faire rentrer dans les enclos. À la fin, il doit y avoir le même nombre de kangourous dans chaque enclos. Combien de kangourous Issa doit-il rajouter dans l'enclos 1 ?",
    "15": "Inès place dans les cercles les nombres 1, 2, 3, 4, 5, 6 et 7, de telle sorte que chaque cercle du bas contienne la somme des deux nombres juste au-dessus. Quel nombre doit-elle mettre dans le cercle grisé ?",
    "16": "Rose doit former un carré. En plus des trois pièces données, elle va utiliser l'une des pièces ci-dessous. Laquelle ?",
    "17": "Léon a tracé le symétrique du nombre 2025 par rapport à la droite noire. Mais une partie est cachée. Quelle est la somme de 2025 et du nombre que Léon a obtenu par symétrie?",
    "18": "Lucas a 6 coccinelles, toutes différentes. Il a fait 4 photos. Sur chaque photo on voit 3 coccinelles. Chaque coccinelle se trouve sur deux des photos. Mais la quatrième photo est ratée. Combien de points au total verrait-on sur la quatrième photo si elle était réussie ?",
    "19": "Si le mois débute un dimanche, quelle sera la date du troisième lundi du mois ?",
    "20": "Lola a fait une addition mais une tache d'encre a caché certains chiffres. Elle se souvient de trois choses : tous les nombres étaient plus grands que 10 ; un des nombres était le double d'un autre ; il y avait deux nombres égaux. Quel était le nombre en haut de son addition ?",
    "21": "Toutes les pièces du jeu de Tom sont identiques. Il a bâti la construction ci-contre que l'on voit de face. Chaque pièce a une épaisseur de 1 cm. Quelles sont, en cm, la largeur et la longueur d'une pièce de ce jeu ?",
    "22": "Dans 5 tubes identiques, on a mis des billes identiques puis rajouté de l'eau. La hauteur d'eau est la même dans chacun des trois premiers tubes. Dans les deux derniers, la hauteur d'eau est le double de celle des trois premiers. Quel tube contient le moins d'eau?",
    "23": "Les deux balances ci-contre sont en déséquilibre. Les objets de même forme ont la même masse. Les masses des objets, en kg, sont des nombres entiers inférieurs à 6. Quelle est la masse d'une étoile?",
    "24": "Nina a bâti une pyramide avec 30 cubes noirs ou gris. Dans sa pyramide, deux cubes ayant une face en commun ne sont pas de la même couleur. Le dessin montre l'emplacement d'un des cubes gris de Nina. Que voit-on en se plaçant au-dessus de la pyramide de Nina ?"
  }
};

// Explications vérifiées contre le corrigé officiel.
export const EXPLANATIONS = {
  2025: {
    "1": "Les chiffres à l'intérieur du cercle sont: 0, 2, 3, 8. Le chiffre 5 est donc à l'extérieur.",
    "4": "Pour avoir le plus grand nombre, on place le chiffre le plus grand en premier (5), puis 2, 2, et 0 à la fin: 5220.",
    "11": "La pièce C complète parfaitement le damier manquant.",
    "12": "Si un adulte mange x kg, le petit mange 2x kg. Avec 5 adultes et 1 petit: 5x + 2x = 14, donc 7x = 14, x = 2. Le petit mange 2×2 = 4 kg.",
    "18": "En comptant les points sur les 3 premières photos et en déduisant les coccinelles manquantes, on obtient 12 points.",
    "19": "Si le mois commence un dimanche: 1er lundi = 2, 2e lundi = 9, 3e lundi = 16.",
    "21": "En analysant les dimensions de la construction (18 cm et 35 cm) et le nombre de pièces, on trouve 3 cm et 12 cm.",
    "22": "Le tube C contient plus de billes, donc moins d'eau pour la même hauteur."
  }
};
