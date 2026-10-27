#!/usr/bin/env python3
"""Builds legal/*.html from _legal/*.body.html + _legal/legal-config.json.
Usage: python3 _legal/build.py     (from the site root or anywhere)
Placeholders look like {{NAME}}; values come from legal-config.json. A value that is still a {{PLACEHOLDER}}
is rendered highlighted so it is easy to spot. The _legal folder is published as plain files (the site
uses .nojekyll); it contains nothing secret."""
import json,os,re,html
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(HERE)
C=json.load(open(os.path.join(HERE,'legal-config.json')))
PAGES=[
 ('terms','Terms of Service','Terms of Service for Lost Aura Games: accounts, the game license, virtual currency with no cash value, purchases, termination and disputes.'),
 ('privacy','Privacy Policy','Privacy Policy for Lost Aura Games: what is stored in your browser, accounts and Coins on Supabase, payments through our merchant of record, your rights and children.'),
 ('refunds','Refund Policy','Refund Policy for Lost Aura Games coin bundles: immediate delivery, the 14-day withdrawal waiver, when refunds are given and how to ask.'),
 ('contact','Contact & Imprint','Contact Lost Aura Games and operator (imprint) information.'),
]
def fill(s):
    def r(m):
        k=m.group(1);v=C.get(k)
        if v is None or re.fullmatch(r'\{\{\w+\}\}',str(v)):return '<mark class="ph">{{'+k+'}}</mark>'
        return html.escape(str(v),quote=True) if k not in ('BUSINESS_FORM',) else html.escape(str(v))
    return re.sub(r'\{\{(\w+)\}\}',r,s)
def footer_nav(pre):
    return ('<nav aria-label="Footer"><a href="%s">Home</a><a href="%sindex.html#games">Games</a><a href="%sabout.html">About</a>'
            '<a href="%slegal/terms.html">Terms</a><a href="%slegal/privacy.html">Privacy</a><a href="%slegal/refunds.html">Refunds</a><a href="%slegal/contact.html">Contact</a></nav>')%((pre or './'),pre,pre,pre,pre,pre,pre)
SHELL='''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} - Lost Aura Games</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://lostauragames.com/legal/{slug}.html">
<meta name="theme-color" content="#020403">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lost Aura Games">
<meta property="og:title" content="{title} - Lost Aura Games">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://lostauragames.com/legal/{slug}.html">
<meta property="og:image" content="https://lostauragames.com/assets/img/og.png">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">
<link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
<link rel="manifest" href="../site.webmanifest">
<link rel="stylesheet" href="../assets/css/site.css">
</head>
<body data-root="../">
<a class="skip" href="#main">Skip to content</a>
<canvas id="bg" aria-hidden="true"></canvas>
<header class="site-header">
 <div class="wrap">
  <a class="brand" href="../" aria-label="Lost Aura Games home"><canvas class="pixel-logo" data-size="4" aria-hidden="true"></canvas></a>
  <nav aria-label="Main"><ul class="nav"><li><a href="../">Home</a></li><li><a href="../index.html#games">Games</a></li><li><a href="../about.html">About</a></li></ul></nav>
 </div>
</header>
<main id="main" class="wrap">
 <section class="legal-head" aria-labelledby="lg-h">
  <p class="kicker">Legal</p>
  <h1 id="lg-h" style="font-size:clamp(26px,4.6vw,40px)">{title}</h1>
  <p class="muted">Last updated: {date}</p>
  <div class="panel tmpl-note"><p><b>Template, not legal advice.</b> These pages are a starting point written for Lost Aura Games and have not been reviewed by a lawyer.</p><p>The legal text below is only available in English.</p>{storenote}</div>
  <nav class="legal-nav" aria-label="Legal pages">{lnav}</nav>
 </section>
 <article class="panel legal" lang="en" data-i18n-skip>
{body}
 </article>
</main>
<footer class="site-footer">
 <div class="wrap">
  <p style="margin:0"><canvas class="pixel-emblem" data-size="1" aria-hidden="true" width="32" height="32"></canvas>&copy; Lost Aura Games 2026</p>
  {footer}
 </div>
</footer>
<script src="../assets/js/pixel.js"></script>
<script src="../assets/js/games.js"></script>
<script src="../assets/js/site.js"></script>
<script src="../assets/js/i18n-dict.js"></script>
<script src="../assets/js/i18n.js"></script>
<script src="../assets/js/lag-config.js"></script>
<script src="../assets/js/lag-account.js"></script>
</body>
</html>
'''
os.makedirs(os.path.join(ROOT,'legal'),exist_ok=True)
for slug,title,desc in PAGES:
    body=fill(open(os.path.join(HERE,slug+'.body.html')).read())
    lnav=''.join('<a class="btn%s" href="%s.html"%s>%s</a>'%(' gold' if s==slug else '',s,' aria-current="page"' if s==slug else '',t) for s,t,_ in PAGES)
    store='' if C.get('STORE_LIVE') else '<p>Coin purchases are not open yet. The purchase sections apply once they launch.</p>'
    out=SHELL.format(title=html.escape(title),desc=html.escape(desc),slug=slug,date=fill('{{EFFECTIVE_DATE}}'),body=body,lnav=lnav,storenote=store,footer=footer_nav('../'))
    open(os.path.join(ROOT,'legal',slug+'.html'),'w').write(out)
    left=sorted(set(re.findall(r'\{\{(\w+)\}\}',out)))
    print('legal/%s.html'%slug,len(out),'unfilled:',','.join(left) or 'none')
