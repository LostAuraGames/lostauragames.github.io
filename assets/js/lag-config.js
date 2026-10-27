/* Lost Aura Games - shared public config for accounts + the coin store.
   Everything in this file is PUBLIC (it ships to every browser). Never put a secret here:
   the Supabase service key, the provider API key and the webhook secret live ONLY in Supabase function secrets.

   FEATURE FLAG: while COMMERCE_ENABLED is false, no Account menu, login button, store button or
   payment code is shown anywhere on the site or in the games. Flip it to true only after the payment
   provider approved the store and the product ids + secrets are wired (see lostaura-commerce/README.md). */
window.LAG_CONFIG = {
  COMMERCE_ENABLED: false,

  supabaseUrl: 'https://fugfgorircipfntzopon.supabase.co',
  supabaseKey: 'sb_publishable_9yZM4c8UaklP2z4Vj8NrpQ_4lRRKC0O',   // publishable (public) key
  functionsUrl: null,                     // default: supabaseUrl + '/functions/v1'

  provider: 'lemonsqueezy',               // 'lemonsqueezy' | 'paddle' (must match the PAYMENT_PROVIDER secret)
  checkoutMode: 'overlay',                // 'overlay' (Lemon.js / Paddle.js popup) or 'redirect' (full page)
  paddle: { clientToken: null, environment: 'sandbox' },   // only used if provider = 'paddle' (client token is public)

  contactEmail: 'lostauragames@gmail.com',

  // Display copy of the bundles. The server (public.coin_products) is the source of truth for
  // what a payment credits; keep these in sync with it.
  bundles: {
    'orbit-hills': [
      { key: 'orbit-hills.coins.1000',  coins: 1000,  usd: 2 },
      { key: 'orbit-hills.coins.2500',  coins: 2500,  usd: 5 },
      { key: 'orbit-hills.coins.10000', coins: 10000, usd: 15 }
    ],
    'meowteor': [
      { key: 'meowteor.coins.100',  coins: 100,  usd: 2 },
      { key: 'meowteor.coins.250',  coins: 250,  usd: 5 },
      { key: 'meowteor.coins.1000', coins: 1000, usd: 15 }
    ]
  }
};
