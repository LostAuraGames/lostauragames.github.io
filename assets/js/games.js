/* =====================================================================
   LOST AURA GAMES - GAME LIST
   This is the ONE place to add a game to the website.
   Copy one { ... } block, paste it below the last one (keep the comma
   between blocks), and change the values. See README.md for details.
   ===================================================================== */
window.LAG_GAMES = [
  {
    id: "croak-and-dagger",                      // short name, no spaces (used in links)
    title: "Croak & Dagger",
    subtitle: "100 Frogs Must Fall",
    blurb: "A slapstick pixel deckbuilder. Melt frogs with lasers, bonk them with frying pans and outwit 100 dressed-up bosses across a haunted pond.",
    genre: "Card battler / Deckbuilder",
    status: "Play now",                          // e.g. "Play now", "Coming soon", "Demo"
    play: "games/croak-and-dagger/",             // where the Play button goes (leave "" if not playable yet)
    info: "games/croak-and-dagger.html",         // the game's info page (optional, "" for none)
    image: "assets/img/games/croak-and-dagger/cover.png", // card picture, 16:9 works best (used if there is no animated art)
    art: "croak-and-dagger",                     // optional animated pixel key art (assets/js/keyart-croak.js); remove to use the image
    artAlt: "Croak & Dagger key art: a hooded hero with a dagger faces a top-hatted frog on a lily pad under a full moon",
    tags: ["Single player", "Browser", "Mouse / Touch / Keyboard"],
    featured: true                               // true = shown in the big "Featured" box on the home page
  }
  // , { id: "my-next-game", title: "My Next Game", ... }
];
