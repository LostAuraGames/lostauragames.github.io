# Lost Aura Games: website

*Lost light, found in pixels.*

This is the website for **Lost Aura Games** (https://lostauragames.com). It's a plain static site made of HTML, CSS and JavaScript files.
There's **no build step**, so GitHub Pages can serve the files exactly as they are.

## What's in here

```
index.html                     Home page (hero, featured game, game grid, about blurb)
about.html                     About page
404.html                       "Page not found" page (GitHub Pages uses it automatically)
games/croak-and-dagger.html    Info page for Croak & Dagger (description, screenshots, controls)
games/croak-and-dagger/        The game itself (one self-contained index.html)
assets/css/site.css            All the site styling
assets/js/games.js             >>> THE GAME LIST <<< (the home page grid is built from this)
assets/js/site.js              Draws the background and logos, and builds the game grid
assets/js/pixel.js             Pixel font, logo and emblem drawing, animated background
assets/js/keyart-croak.js      Animated pixel key art for Croak & Dagger (wakes up on hover/focus/tap)
assets/img/                    Favicons, social share image (og.png), game pictures
CNAME                          Tells GitHub Pages to use lostauragames.com
.nojekyll                      Tells GitHub Pages to serve the files as-is
robots.txt, sitemap.xml        For search engines
site.webmanifest               App name and icons for phones
```

No analytics, tracking or outside services are used. Everything loads from this folder.

## Preview it on your own computer

1. Open a terminal in this folder.
2. Run `python3 -m http.server 8000` (any simple web server works).
3. Visit http://localhost:8000 in your browser.

You can also double-click `index.html`. Use the local server to be sure everything works the way it will online.

## How to add a new game (step by step)

1. **Put the game in its own folder.** Make a new folder inside `games/`, such as `games/my-new-game/`,
   and copy your game's files into it. The game's main page must be named `index.html`.
2. **Add a picture.** Save a screenshot (16:9 works best, e.g. 640x360) as
   `assets/img/games/my-new-game/cover.png`.
3. **Add it to the list.** Open `assets/js/games.js` in any text editor. Copy the whole `{ ... }` block
   for Croak & Dagger, paste it after it, and put a comma between the two blocks. Then change the values:
   ```js
   ,
   {
     id: "my-new-game",
     title: "My New Game",
     subtitle: "A catchy subtitle",
     blurb: "One or two sentences about the game.",
     genre: "Puzzle",
     status: "Play now",                 // or "Coming soon"
     play: "games/my-new-game/",         // leave "" if it isn't playable yet
     info: "",                           // optional info page, e.g. "games/my-new-game.html"
     image: "assets/img/games/my-new-game/cover.png",
     // art: "my-new-game",               // optional: an animated canvas key art script instead of the picture
     tags: ["Single player", "Browser"],
     featured: false                     // set true to show it in the big Featured box instead
   }
   ```
   Save the file. The home page shows the new card automatically.
4. **(Optional) Make an info page.** Copy `games/croak-and-dagger.html` to `games/my-new-game.html`
   and change the text, screenshots and Play link. Then put that path in `info` in step 3.
5. **(Optional) Tell search engines.** Add the new pages to `sitemap.xml`, copying an existing `<url>` line.
6. Preview it locally (see above), then commit and push.

Croak & Dagger's cover is animated pixel key art, drawn in code by `assets/js/keyart-croak.js` (`art: "croak-and-dagger"`).
It stays still until a visitor hovers, focuses or taps it. A new game can use a normal picture instead: just leave out `art`.

Only one game should have `featured: true`. If none do, the first game in the list is featured.

## Updating Croak & Dagger

The game lives in `games/croak-and-dagger/index.html`. It's a copy of the game's single HTML file,
with a few extra lines added:

- **Search and social tags** in the `<head>` (description, Open Graph, favicon).
- A small **"Lost Aura Games" back link** before `</body>` that only shows on the game's title screen.
  When you replace the file with a new version of the game, copy this block back in before `</body>`:

```html
<a id="lag-back" href="../../" aria-label="Back to Lost Aura Games" style="position:fixed;left:10px;top:10px;z-index:9999;display:none;font:bold 13px 'Courier New',monospace;color:#e8dcb5;background:rgba(0,0,0,.78);border:3px solid #e8dcb5;box-shadow:3px 3px 0 #000;padding:5px 10px;text-decoration:none;letter-spacing:1px;text-transform:uppercase;opacity:.8">&#9664; Lost Aura Games</a>
<script>(function(){var a=document.getElementById('lag-back');function u(){var t;try{t=(typeof CUR!=='undefined')?CUR:null;}catch(e){t=null;}a.style.display=(t==='title')?'block':'none';}setInterval(u,400);u();})();</script>
```

Player saves are kept in the browser's localStorage under the key `croakDagger_v1`. They belong to the
web address, so players keep their progress when you update the game, as long as the domain stays the same.
(Saves made on the temporary `*.github.io` address won't carry over to `lostauragames.com`.
Players can use **Settings → Export** in the game to move a save.)

## Putting it online with GitHub Pages (when you're ready)

1. Create a GitHub repository (for example `lostauragames-site`) and upload or push **the contents of this folder**
   to it. `index.html` must be at the top level of the repo.
2. On GitHub, go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**,
   pick the `main` branch and the `/ (root)` folder, then click **Save**.
3. **Buy the domain** `lostauragames.com` from any domain registrar.
4. At your registrar, add DNS records for GitHub Pages
   (see GitHub's guide "Managing a custom domain for your GitHub Pages site"):
   - `A` records for `@` pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
   - (optional, for IPv6) `AAAA` records `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`
   - a `CNAME` record for `www` pointing to `YOUR-GITHUB-USERNAME.github.io`
5. Back in **Settings → Pages**, type `lostauragames.com` in **Custom domain** (the `CNAME` file already contains it).
   Once the DNS check passes, tick **Enforce HTTPS**. This can take a few minutes to a day.
6. Optional but recommended: verify the domain in your GitHub account settings (Pages → verified domains),
   so nobody else can claim it.

Note: `404.html` uses links that start with `/`, which is right for `lostauragames.com`. If you visit the site at
`username.github.io/repo-name/` before the domain is set up, the 404 page's links and styling won't work fully.
Every other page uses relative links and works at both addresses.

## Changing the look

- Colors are at the top of `assets/css/site.css` (`--bone`, `--purple`, `--blue`, ...).
- The tagline is in `index.html` (class `tagline`) and `about.html`.
- The logo and emblem are drawn in code in `assets/js/pixel.js` (`logo()` and `emblem()`).
  The PNG versions (favicons, `og.png`) are in `assets/img/`. Remake them if you change the logo.
- Animations turn off automatically for visitors who choose "reduce motion" in their system settings.
