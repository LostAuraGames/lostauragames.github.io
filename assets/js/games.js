/* =====================================================================
   LOST AURA GAMES - GAME LIST
   This is the ONE place to add a game to the website.
   Copy one { ... } block, paste it below the last one (keep the comma
   between blocks), and change the values. See README.md for details.
   ===================================================================== */
window.LAG_GAMES = [
  {
    id: "meowteor",
    title: "MEOWTEOR",
    subtitle: "A Space Cat Tap-Flyer",
    blurb: "Tap to hop a pixel space cat through endless gaps in an asteroid belt. Unlock 51 cosmetics and 17 trails, and race for the global top 100.",
    genre: "Arcade / Tap-flyer",
    status: "Play now",
    play: "games/meowteor/",
    info: "games/meowteor.html",
    image: "assets/img/games/meowteor/cover.png",
    art: "meowteor",                             // animated pixel key art (assets/js/keyart-meowteor.js)
    artAlt: "MEOWTEOR key art: a pixel space cat in a bubble helmet hops through a gap between asteroid pillars, trailing sparkly stardust past stars and meteors",
    tags: ["Single player", "Browser", "Global leaderboard", "Tap / Click / Keyboard"],
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
  },
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
    featured: false                              // true = shown in the big "Featured" box on the home page
  },
  {
    id: "mythweald",
    title: "Mythweald",
    subtitle: "The Hollow Crown",
    blurb: "A top-down mythological MMO: 4 classes, a huge world, dungeons from level 20, max level 200, trading, the Unity of the Trade market, parties of up to 4 and chat.",
    genre: "Online RPG / MMO",
    status: "Open Beta",
    badge: "beta",                               // optional extra badge style ("beta" = orange Open Beta badge)
    play: "games/mythweald/",
    info: "games/mythweald.html",
    image: "assets/img/games/mythweald/cover.png",
    tags: ["Online multiplayer", "Browser", "Open Beta", "Keyboard / Mouse / Touch"],
    featured: false                              // MEOWTEOR stays the featured game
  }
  // , { id: "my-next-game", title: "My Next Game", ... }
];
