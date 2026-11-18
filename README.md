# lostauragames.com

Static site on GitHub Pages (branch `main`, root, custom domain via `CNAME`).

**Status (2026-11-17): under construction.** The whole site was replaced by a single
"Under Construction" page (`index.html`; `404.html` shows the same page). Only the legal
pages stay online: `legal/privacy.html`, `legal/terms.html`, `legal/refunds.html`,
`legal/contact.html` (built from `_legal/*.body.html` with `python3 _legal/build.py`).

MEOWTEOR NFT features were removed (no NFTs were ever minted). The previous full site,
including the games, is preserved at tag `pre-construction-20261117`.

Restore the old site: `git checkout pre-construction-20261117 -- .` (or revert the
under-construction commit) and push.
