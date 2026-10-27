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
  },
  {
    id: "orbit-hills",
    title: "Orbit Hills",
    subtitle: "A Galaxy Climb Racer",
    blurb: "A pixel-art hill-climb racer across 10 worlds. Floor it over procedural hills, flip in low gravity and don't land on your roof.",
    genre: "Racing / Hill climb",
    status: "Play now",
    play: "games/orbit-hills/",
    info: "games/orbit-hills.html",
    image: "assets/img/games/orbit-hills/cover.png",
    art: "orbit-hills",                          // animated pixel key art (assets/js/keyart-orbit.js)
    artAlt: "Orbit Hills key art: a little red buggy cresting a purple moon hill under a ringed planet and a starfield",
    tags: ["Single player", "Browser", "Keyboard / Touch"],
    featured: false
  }
  // , { id: "my-next-game", title: "My Next Game", ... }
];
