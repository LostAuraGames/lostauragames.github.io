/* Lost Aura Games - shared account + coin store module (site header, Orbit Hills, MEOWTEOR).
   Talks to Supabase Auth (GoTrue) and PostgREST with plain fetch (no SDK), so it also works inside the
   single-file games. Session is kept in localStorage "lag.auth.v1", so every page on lostauragames.com
   shares it (same origin) and other tabs follow sign-in / sign-out through the storage event.
   Requires window.LAG_CONFIG (assets/js/lag-config.js). If COMMERCE_ENABLED is false, this module
   exposes LAGAccount.enabled=false and renders NOTHING (no header item, no buttons, no network calls).
   Language: follows localStorage "lag.lang" (shared with the site and the games). */
(function(){
'use strict';
var C=window.LAG_CONFIG||{};
var ENABLED=!!C.COMMERCE_ENABLED&&!!C.supabaseUrl&&!!C.supabaseKey;
var SCRIPT=document.currentScript&&document.currentScript.src||'';
var ROOT=SCRIPT?SCRIPT.replace(/assets\/js\/lag-account\.js.*$/,''):'/';
var API=String(C.supabaseUrl||'').replace(/\/+$/,''),KEY=C.supabaseKey,FN=(C.functionsUrl||API+'/functions/v1').replace(/\/+$/,'');
var SKEY='lag.auth.v1',PKEY='lag.checkout.pending';
var LEGAL={terms:ROOT+'legal/terms.html',privacy:ROOT+'legal/privacy.html',refunds:ROOT+'legal/refunds.html',contact:ROOT+'legal/contact.html'};
var CONTACT=C.contactEmail||'lostauragames@gmail.com';

// ------------------------------------------------------------------ i18n (en, es, fr, de, pt, it)
var L=['es','fr','de','pt','it'];
var T={
'Account':['Cuenta','Compte','Konto','Conta','Account'],
'Sign in':['Iniciar sesión','Se connecter','Anmelden','Entrar','Accedi'],
'Create account':['Crear cuenta','Créer un compte','Konto erstellen','Criar conta','Crea account'],
'Sign out':['Cerrar sesión','Se déconnecter','Abmelden','Sair','Esci'],
'Email':['Correo electrónico','E-mail','E-Mail','E-mail','Email'],
'Password':['Contraseña','Mot de passe','Passwort','Senha','Password'],
'New password':['Nueva contraseña','Nouveau mot de passe','Neues Passwort','Nova senha','Nuova password'],
'Forgot password?':['¿Olvidaste tu contraseña?','Mot de passe oublié ?','Passwort vergessen?','Esqueceu a senha?','Password dimenticata?'],
'Reset password':['Restablecer contraseña','Réinitialiser le mot de passe','Passwort zurücksetzen','Redefinir senha','Reimposta password'],
'Send reset link':['Enviar enlace','Envoyer le lien','Link senden','Enviar link','Invia link'],
'Save password':['Guardar contraseña','Enregistrer le mot de passe','Passwort speichern','Salvar senha','Salva password'],
'Close':['Cerrar','Fermer','Schließen','Fechar','Chiudi'],
'Back':['Volver','Retour','Zurück','Voltar','Indietro'],
'Have an account? Sign in':['¿Ya tienes cuenta? Inicia sesión','Déjà un compte ? Connecte-toi','Schon ein Konto? Anmelden','Já tem conta? Entre','Hai un account? Accedi'],
'New here? Create an account':['¿Eres nuevo? Crea una cuenta','Nouveau ? Crée un compte','Neu hier? Konto erstellen','Novo por aqui? Crie uma conta','Nuovo? Crea un account'],
'At least 8 characters.':['Al menos 8 caracteres.','Au moins 8 caractères.','Mindestens 8 Zeichen.','Pelo menos 8 caracteres.','Almeno 8 caratteri.'],
'I am 13 or older. If I am under 18, my parent or guardian agrees to the {terms} and {privacy}.':[
 'Tengo 13 años o más. Si soy menor de 18, mi madre, padre o tutor acepta los {terms} y la {privacy}.',
 "J'ai 13 ans ou plus. Si j'ai moins de 18 ans, mon parent ou tuteur accepte les {terms} et la {privacy}.",
 'Ich bin mindestens 13 Jahre alt. Wenn ich unter 18 bin, stimmen meine Eltern oder mein Vormund den {terms} und der {privacy} zu.',
 'Tenho 13 anos ou mais. Se tenho menos de 18, meu pai, mãe ou responsável concorda com os {terms} e a {privacy}.',
 'Ho almeno 13 anni. Se ho meno di 18 anni, un genitore o tutore accetta i {terms} e l\u2019{privacy}.'],
'Terms of Service':['Términos del servicio','Conditions d\u2019utilisation','Nutzungsbedingungen','Termos de serviço','Termini di servizio'],
'Privacy Policy':['Política de privacidad','Politique de confidentialité','Datenschutzerklärung','Política de privacidade','Informativa sulla privacy'],
'Refund Policy':['Política de reembolsos','Politique de remboursement','Rückerstattungsrichtlinie','Política de reembolso','Politica di rimborso'],
'Please enter a valid email.':['Introduce un correo válido.','Saisis une adresse e-mail valide.','Bitte gib eine gültige E-Mail ein.','Digite um e-mail válido.','Inserisci un\u2019email valida.'],
'Password must be at least 8 characters.':['La contraseña debe tener al menos 8 caracteres.','Le mot de passe doit contenir au moins 8 caractères.','Das Passwort muss mindestens 8 Zeichen haben.','A senha deve ter pelo menos 8 caracteres.','La password deve avere almeno 8 caratteri.'],
'Please tick the age and terms box.':['Marca la casilla de edad y términos.','Coche la case âge et conditions.','Bitte bestätige das Alters- und Bedingungsfeld.','Marque a caixa de idade e termos.','Spunta la casella di età e termini.'],
'Wrong email or password.':['Correo o contraseña incorrectos.','E-mail ou mot de passe incorrect.','E-Mail oder Passwort falsch.','E-mail ou senha incorretos.','Email o password errati.'],
'An account with this email already exists. Try signing in.':['Ya existe una cuenta con este correo. Prueba a iniciar sesión.','Un compte existe déjà avec cet e-mail. Essaie de te connecter.','Mit dieser E-Mail gibt es schon ein Konto. Melde dich an.','Já existe uma conta com este e-mail. Tente entrar.','Esiste già un account con questa email. Prova ad accedere.'],
'Too many attempts. Please wait a minute and try again.':['Demasiados intentos. Espera un minuto y vuelve a intentarlo.','Trop de tentatives. Attends une minute et réessaie.','Zu viele Versuche. Warte eine Minute und versuche es erneut.','Muitas tentativas. Aguarde um minuto e tente de novo.','Troppi tentativi. Attendi un minuto e riprova.'],
'Something went wrong. Please try again.':['Algo salió mal. Inténtalo de nuevo.','Un problème est survenu. Réessaie.','Etwas ist schiefgelaufen. Bitte versuche es erneut.','Algo deu errado. Tente novamente.','Qualcosa è andato storto. Riprova.'],
'Network error. Check your connection.':['Error de red. Revisa tu conexión.','Erreur réseau. Vérifie ta connexion.','Netzwerkfehler. Prüfe deine Verbindung.','Erro de rede. Verifique sua conexão.','Errore di rete. Controlla la connessione.'],
'If an account exists for {email}, a reset link is on its way. Check your inbox and spam folder.':[
 'Si existe una cuenta para {email}, te enviamos un enlace. Revisa tu bandeja de entrada y el spam.',
 'Si un compte existe pour {email}, un lien est en route. Vérifie ta boîte de réception et tes spams.',
 'Falls ein Konto für {email} existiert, ist ein Link unterwegs. Prüfe Posteingang und Spam.',
 'Se existir uma conta para {email}, um link está a caminho. Confira a caixa de entrada e o spam.',
 'Se esiste un account per {email}, il link è in arrivo. Controlla la posta in arrivo e lo spam.'],
'Choose a new password for {email}.':['Elige una nueva contraseña para {email}.','Choisis un nouveau mot de passe pour {email}.','Wähle ein neues Passwort für {email}.','Escolha uma nova senha para {email}.','Scegli una nuova password per {email}.'],
'Password saved. You are signed in.':['Contraseña guardada. Has iniciado sesión.','Mot de passe enregistré. Tu es connecté.','Passwort gespeichert. Du bist angemeldet.','Senha salva. Você está conectado.','Password salvata. Hai effettuato l\u2019accesso.'],
'Check your email to confirm your account, then sign in.':['Revisa tu correo para confirmar la cuenta y luego inicia sesión.','Vérifie tes e-mails pour confirmer ton compte, puis connecte-toi.','Bestätige dein Konto über die E-Mail und melde dich dann an.','Confira seu e-mail para confirmar a conta e depois entre.','Controlla l\u2019email per confermare l\u2019account, poi accedi.'],
'Signed in as {email}':['Sesión iniciada como {email}','Connecté en tant que {email}','Angemeldet als {email}','Conectado como {email}','Accesso come {email}'],
'Signed in!':['¡Sesión iniciada!','Connecté !','Angemeldet!','Conectado!','Accesso effettuato!'],
'Signed out.':['Sesión cerrada.','Déconnecté.','Abgemeldet.','Você saiu.','Disconnesso.'],
'Guests can play everything. You only need an account to buy coins.':['Los invitados pueden jugar a todo. Solo necesitas una cuenta para comprar monedas.','Les invités peuvent tout jouer. Un compte n\u2019est nécessaire que pour acheter des pièces.','Gäste können alles spielen. Ein Konto brauchst du nur zum Kaufen von Münzen.','Convidados podem jogar tudo. Você só precisa de conta para comprar moedas.','Gli ospiti possono giocare a tutto. L\u2019account serve solo per comprare monete.'],
'Your account keeps your coins safe on our server, on any device.':['Tu cuenta guarda tus monedas en nuestro servidor, en cualquier dispositivo.','Ton compte garde tes pièces sur notre serveur, sur tous tes appareils.','Dein Konto speichert deine Münzen sicher auf unserem Server, auf jedem Gerät.','Sua conta guarda suas moedas no nosso servidor, em qualquer dispositivo.','Il tuo account conserva le monete sul nostro server, su qualsiasi dispositivo.'],
'Your balances':['Tus saldos','Tes soldes','Deine Guthaben','Seus saldos','I tuoi saldi'],
'To delete your account and its data, email {email}.':['Para eliminar tu cuenta y sus datos, escribe a {email}.','Pour supprimer ton compte et ses données, écris à {email}.','Um dein Konto und seine Daten zu löschen, schreib an {email}.','Para excluir sua conta e seus dados, envie um e-mail para {email}.','Per eliminare l\u2019account e i suoi dati, scrivi a {email}.'],
'Get Coins':['Conseguir monedas','Obtenir des pièces','Münzen holen','Obter moedas','Ottieni monete'],
'Sign in to buy':['Inicia sesión para comprar','Connecte-toi pour acheter','Zum Kaufen anmelden','Entre para comprar','Accedi per acquistare'],
'Buying requires an account. Playing does not.':['Comprar requiere una cuenta. Jugar, no.','Acheter nécessite un compte. Jouer, non.','Zum Kaufen brauchst du ein Konto, zum Spielen nicht.','Comprar exige uma conta. Jogar, não.','Per acquistare serve un account, per giocare no.'],
'Purchases are for players 13+. If you are under 18, ask a parent or guardian for permission first.':[
 'Las compras son para jugadores de 13 años o más. Si eres menor de 18, pide permiso a tu madre, padre o tutor antes.',
 'Les achats sont réservés aux joueurs de 13 ans et plus. Si tu as moins de 18 ans, demande d\u2019abord la permission à un parent ou tuteur.',
 'Käufe sind für Spieler ab 13. Wenn du unter 18 bist, frag zuerst deine Eltern oder deinen Vormund um Erlaubnis.',
 'Compras são para jogadores com 13 anos ou mais. Se você tem menos de 18, peça permissão a um pai, mãe ou responsável antes.',
 'Gli acquisti sono per giocatori dai 13 anni in su. Se hai meno di 18 anni, chiedi prima il permesso a un genitore o tutore.'],
'Coins have no cash value and can only be used in this game. See the {terms} and {refunds}.':[
 'Las monedas no tienen valor monetario y solo se usan en este juego. Consulta los {terms} y la {refunds}.',
 'Les pièces n\u2019ont aucune valeur monétaire et ne servent que dans ce jeu. Voir les {terms} et la {refunds}.',
 'Münzen haben keinen Geldwert und gelten nur in diesem Spiel. Siehe {terms} und {refunds}.',
 'As moedas não têm valor em dinheiro e só podem ser usadas neste jogo. Veja os {terms} e a {refunds}.',
 'Le monete non hanno valore in denaro e si usano solo in questo gioco. Vedi i {terms} e la {refunds}.'],
'I want the coins delivered right away and understand that I lose my 14-day right of withdrawal once they are delivered.':[
 'Quiero recibir las monedas de inmediato y entiendo que pierdo mi derecho de desistimiento de 14 días una vez entregadas.',
 'Je veux recevoir les pièces tout de suite et je comprends que je perds mon droit de rétractation de 14 jours une fois qu\u2019elles sont livrées.',
 'Ich möchte die Münzen sofort erhalten und weiß, dass ich mit der Lieferung mein 14-tägiges Widerrufsrecht verliere.',
 'Quero receber as moedas imediatamente e entendo que perco meu direito de desistência de 14 dias quando elas forem entregues.',
 'Voglio ricevere subito le monete e so che, una volta consegnate, perdo il diritto di recesso di 14 giorni.'],
'Please tick the box above first.':['Primero marca la casilla de arriba.','Coche d\u2019abord la case ci-dessus.','Bitte setze zuerst oben das Häkchen.','Marque a caixa acima primeiro.','Spunta prima la casella qui sopra.'],
'Opening secure checkout...':['Abriendo el pago seguro...','Ouverture du paiement sécurisé...','Sichere Kasse wird geöffnet...','Abrindo o pagamento seguro...','Apertura del pagamento sicuro...'],
'Processing...':['Procesando...','Traitement...','Wird verarbeitet...','Processando...','Elaborazione...'],
'Waiting for the payment to be confirmed. This usually takes a few seconds.':['Esperando la confirmación del pago. Suele tardar unos segundos.','En attente de la confirmation du paiement. Cela prend en général quelques secondes.','Warte auf die Zahlungsbestätigung. Das dauert meist nur ein paar Sekunden.','Aguardando a confirmação do pagamento. Normalmente leva alguns segundos.','In attesa della conferma del pagamento. Di solito bastano pochi secondi.'],
'+{n} added to your balance!':['¡+{n} añadidas a tu saldo!','+{n} ajoutées à ton solde !','+{n} deinem Guthaben gutgeschrieben!','+{n} adicionadas ao seu saldo!','+{n} aggiunte al tuo saldo!'],
'Still processing. Your coins will appear automatically once the payment is confirmed. Contact us if they do not arrive within an hour.':[
 'Aún en proceso. Tus monedas aparecerán solas cuando se confirme el pago. Escríbenos si no llegan en una hora.',
 'Toujours en cours. Tes pièces apparaîtront automatiquement une fois le paiement confirmé. Contacte-nous si rien n\u2019arrive dans l\u2019heure.',
 'Wird noch verarbeitet. Deine Münzen erscheinen automatisch, sobald die Zahlung bestätigt ist. Melde dich, falls sie nicht innerhalb einer Stunde ankommen.',
 'Ainda processando. Suas moedas aparecerão automaticamente quando o pagamento for confirmado. Fale conosco se não chegarem em uma hora.',
 'Ancora in elaborazione. Le monete appariranno da sole quando il pagamento sarà confermato. Contattaci se non arrivano entro un\u2019ora.'],
'Checkout is not available right now. Please try again later.':['El pago no está disponible ahora. Inténtalo más tarde.','Le paiement n\u2019est pas disponible pour le moment. Réessaie plus tard.','Die Kasse ist gerade nicht verfügbar. Bitte versuche es später.','O pagamento não está disponível agora. Tente mais tarde.','Il pagamento non è disponibile ora. Riprova più tardi.'],
'Secure payment by {provider}, our reseller and merchant of record.':['Pago seguro con {provider}, nuestro revendedor y comerciante registrado.','Paiement sécurisé par {provider}, notre revendeur et marchand officiel.','Sichere Zahlung über {provider}, unseren Wiederverkäufer (Merchant of Record).','Pagamento seguro por {provider}, nosso revendedor e comerciante oficial.','Pagamento sicuro con {provider}, il nostro rivenditore e merchant of record.'],
'Balance':['Saldo','Solde','Guthaben','Saldo','Saldo'],
'{n} {cur} from this device were moved to your account.':['{n} {cur} de este dispositivo se movieron a tu cuenta.','{n} {cur} de cet appareil ont été transférées sur ton compte.','{n} {cur} von diesem Gerät wurden in dein Konto übertragen.','{n} {cur} deste dispositivo foram movidas para sua conta.','{n} {cur} di questo dispositivo sono state spostate nel tuo account.'],
'Daily earning limit reached. Play again tomorrow to earn more {cur}.':['Límite diario de ganancias alcanzado. Vuelve mañana para ganar más {cur}.','Limite de gains quotidienne atteinte. Reviens demain pour gagner plus de {cur}.','Tageslimit erreicht. Spiel morgen weiter, um mehr {cur} zu verdienen.','Limite diário de ganhos atingido. Volte amanhã para ganhar mais {cur}.','Limite giornaliero raggiunto. Torna domani per guadagnare altre {cur}.'],
'Could not reach the server. Please try again.':['No se pudo conectar con el servidor. Inténtalo de nuevo.','Impossible de joindre le serveur. Réessaie.','Server nicht erreichbar. Bitte versuche es erneut.','Não foi possível acessar o servidor. Tente novamente.','Impossibile raggiungere il server. Riprova.'],
'Signed in: coins are saved to your account.':['Sesión iniciada: las monedas se guardan en tu cuenta.','Connecté : les pièces sont enregistrées sur ton compte.','Angemeldet: Münzen werden in deinem Konto gespeichert.','Conectado: as moedas ficam salvas na sua conta.','Accesso effettuato: le monete sono salvate nel tuo account.'],
'Best value':['Mejor precio','Meilleure offre','Bester Preis','Melhor valor','Più conveniente']
};
function lang(){var l='en';try{l=localStorage.getItem('lag.lang')||'';}catch(e){}if(!l){var n=(navigator.language||'en').slice(0,2).toLowerCase();l=n;}return l==='en'||L.indexOf(l)>=0?l:'en';}
function t(k,v){var l=lang(),s=k;if(l!=='en'&&T[k])s=T[k][L.indexOf(l)]||k;if(v)s=s.replace(/\{(\w+)\}/g,function(m,x){return v[x]!=null?v[x]:m;});return s;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(n){return String(Math.floor(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function link(k,label){return '<a href="'+LEGAL[k]+'" target="_blank" rel="noopener">'+esc(t(label))+'</a>';}

// ------------------------------------------------------------------ session
var S=null,listeners=[],lastUid;
function readS(){try{var s=JSON.parse(localStorage.getItem(SKEY)||'null');return s&&s.access_token&&s.user&&s.user.id?s:null;}catch(e){return null;}}
function writeS(s){S=s;try{if(s)localStorage.setItem(SKEY,JSON.stringify(s));else localStorage.removeItem(SKEY);}catch(e){}emit();}
function user(){return S?{id:S.user.id,email:S.user.email}:null;}
function emit(){var u=user(),id=u&&u.id;if(id===lastUid)return;lastUid=id;listeners.slice().forEach(function(f){try{f(u);}catch(e){console.error(e);}});renderHeader();}
function onChange(f){listeners.push(f);return function(){listeners=listeners.filter(function(x){return x!==f;});};}
function fromAuth(j){return{access_token:j.access_token,refresh_token:j.refresh_token,expires_at:j.expires_at||Math.floor(Date.now()/1000)+(j.expires_in||3600),user:{id:j.user.id,email:j.user.email}};}
function http(url,opt){opt=opt||{};var h=Object.assign({apikey:KEY,'Content-Type':'application/json'},opt.headers||{});
  return fetch(url,{method:opt.method||'GET',headers:h,body:opt.body?JSON.stringify(opt.body):undefined,cache:'no-store'}).then(function(r){return r.text().then(function(x){var j=null;try{j=x?JSON.parse(x):null;}catch(e){}
    if(!r.ok){var e=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('HTTP '+r.status));e.status=r.status;e.code=j&&(j.error_code||j.code||j.error);e.body=j;throw e;}return j;});},function(e){var x=new Error('network');x.network=true;throw x;});}
function withLock(fn){if(navigator.locks&&navigator.locks.request)return navigator.locks.request('lag-auth-refresh',fn);return fn();}
var refreshing=null;
function token(){if(!S)return Promise.resolve(null);if(S.expires_at*1000-Date.now()>60000)return Promise.resolve(S.access_token);
  if(!refreshing)refreshing=withLock(function(){var cur=readS();if(cur&&cur.expires_at*1000-Date.now()>60000){S=cur;return cur.access_token;}
    var rt=(cur||S).refresh_token;return http(API+'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:rt}}).then(function(j){writeS(fromAuth(j));return S.access_token;},
      function(e){if(!e.network&&e.status>=400&&e.status<500)writeS(null);throw e;});}).then(function(x){refreshing=null;return x;},function(e){refreshing=null;throw e;});
  return refreshing;}
function signIn(email,pw){return http(API+'/auth/v1/token?grant_type=password',{method:'POST',body:{email:email,password:pw}}).then(function(j){writeS(fromAuth(j));return user();});}
function signUp(email,pw){return http(API+'/auth/v1/signup',{method:'POST',body:{email:email,password:pw,data:{age_ack:'13+',terms_ack:new Date().toISOString().slice(0,10)}}}).then(function(j){
  if(j&&j.access_token){writeS(fromAuth(j));return{user:user(),confirm:false};}return{user:null,confirm:true};});}
function signOut(){var tk=S&&S.access_token;writeS(null);try{sessionStorage.removeItem(PKEY);}catch(e){}if(tk)return http(API+'/auth/v1/logout',{method:'POST',headers:{Authorization:'Bearer '+tk}}).catch(function(){});return Promise.resolve();}
function cleanUrl(){var u=new URL(location.href);u.hash='';return u.toString();}
function requestReset(email){return http(API+'/auth/v1/recover?redirect_to='+encodeURIComponent(cleanUrl()),{method:'POST',body:{email:email}});}
function updatePassword(pw){return token().then(function(tk){return http(API+'/auth/v1/user',{method:'PUT',headers:{Authorization:'Bearer '+tk},body:{password:pw}});});}
function authed(path,opt){return token().then(function(tk){if(!tk){var e=new Error('not_signed_in');e.status=401;throw e;}opt=opt||{};opt.headers=Object.assign({Authorization:'Bearer '+tk},opt.headers||{});return http(API+path,opt);});}
function rpc(fn,args){return authed('/rest/v1/rpc/'+fn,{method:'POST',body:args||{}});}
function one(x){return Array.isArray(x)?x[0]:x;}
var wallet={
  get:function(g){return rpc('get_wallet',{p_game:g}).then(one);},
  spend:function(g,n,item){return rpc('spend',{p_game:g,p_amount:Math.floor(n),p_item_id:String(item).replace(/[^A-Za-z0-9_.:\-]/g,'_').slice(0,64)}).then(one);},
  earn:function(g,n,reason){return rpc('earn',{p_game:g,p_amount:Math.max(0,Math.floor(n)),p_reason:reason||'run'}).then(one);},
  mergeGuest:function(g,n){return rpc('merge_guest_balance',{p_game:g,p_amount:Math.max(0,Math.floor(n))}).then(one);},
  lastPurchaseId:function(){return authed('/rest/v1/purchases?select=id&order=id.desc&limit=1').then(function(r){return r&&r[0]?+r[0].id:0;});},
  purchasesAfter:function(g,id){return authed('/rest/v1/purchases?select=id,coins,game_id,status&game_id=eq.'+encodeURIComponent(g)+'&id=gt.'+(+id||0)+'&order=id.asc');}
};

// ------------------------------------------------------------------ auth redirect (password recovery link)
var RECOVERY=false;
(function(){if(!ENABLED||!location.hash||location.hash.indexOf('access_token=')<0)return;var p=new URLSearchParams(location.hash.slice(1));
  var at=p.get('access_token'),rt=p.get('refresh_token');if(!at||!rt)return;
  var exp=+p.get('expires_at')||Math.floor(Date.now()/1000)+(+p.get('expires_in')||3600);RECOVERY=p.get('type')==='recovery';
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  S={access_token:at,refresh_token:rt,expires_at:exp,user:{id:'',email:''}};
  http(API+'/auth/v1/user',{headers:{Authorization:'Bearer '+at}}).then(function(u){writeS({access_token:at,refresh_token:rt,expires_at:exp,user:{id:u.id,email:u.email}});if(RECOVERY)open('newpass');},function(){S=null;});})();

// ------------------------------------------------------------------ UI (pixel modal)
var CSS='.lagx{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:12px;font-family:"Courier New",Courier,monospace;font-weight:bold;color:#e8dcb5;-webkit-user-select:text;user-select:text;touch-action:auto;line-height:1.4}'+
'.lagx *{box-sizing:border-box}.lagx-box{position:relative;width:min(440px,100%);max-height:calc(100% - 8px);overflow:auto;background:#07090a;border:4px solid #b04cff;box-shadow:0 0 0 4px #000,8px 8px 0 4px #000,0 0 26px rgba(176,76,255,.55);padding:18px 18px 16px;font-size:15px}'+
'.lagx h2{margin:0 34px 10px 0;font-size:20px;letter-spacing:2px;text-transform:uppercase;color:#fff;text-shadow:3px 3px 0 #000}'+
'.lagx p{margin:6px 0;font-weight:normal}.lagx .lagx-small{font-size:12.5px;color:#c8b890;font-weight:normal}.lagx a{color:#9fc0ff}.lagx a:hover{color:#fff}'+
'.lagx label{display:block;margin:10px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:1px}'+
'.lagx input[type=email],.lagx input[type=password]{width:100%;font:inherit;font-size:16px;background:#000;color:#fff;border:3px solid #c8b890;padding:8px;outline:none;border-radius:0}'+
'.lagx input:focus{border-color:#ffd24a}.lagx .lagx-chk{display:flex;gap:8px;align-items:flex-start;margin:12px 0 4px;font-size:12.5px;font-weight:normal;text-transform:none;letter-spacing:0}.lagx .lagx-chk input{width:20px;height:20px;flex:0 0 auto;margin:0;accent-color:#ffd24a}'+
'.lagx-btn{display:inline-block;font:inherit;font-weight:bold;font-size:15px;text-transform:uppercase;letter-spacing:1px;color:#e8dcb5;background:#000;border:3px solid #e8dcb5;padding:9px 14px;cursor:pointer;box-shadow:4px 4px 0 #000,0 0 0 2px #000;text-decoration:none;border-radius:0}'+
'.lagx-btn:hover{color:#fff;background:#151515}.lagx-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #000}.lagx-btn[disabled]{opacity:.55;cursor:wait}'+
'.lagx-btn.gold{border-color:#ffd24a;color:#ffd24a}.lagx-btn.wide{width:100%;margin-top:14px}.lagx-link{background:none;border:0;padding:0;font:inherit;font-size:13px;color:#9fc0ff;text-decoration:underline;cursor:pointer}'+
'.lagx-x{position:absolute;right:8px;top:8px;width:34px;height:34px;padding:0;font-size:18px;line-height:28px;text-align:center}'+
'.lagx-err{color:#ff5a6a;min-height:1.2em;font-size:13px;margin-top:8px}.lagx-ok{color:#3cff5a;font-size:14px;margin-top:8px}'+
'.lagx-row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}'+
'.lagx-bundles{display:grid;gap:10px;margin:12px 0}.lagx-b{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#000;border:3px solid #3a7bff;padding:10px 12px;box-shadow:4px 4px 0 #000}'+
'.lagx-b .lagx-amt{font-size:20px;color:#ffd24a;text-shadow:2px 2px 0 #000}.lagx-b .lagx-tag{display:inline-block;margin-left:8px;font-size:11px;background:#3cff5a;color:#000;padding:1px 6px;text-transform:uppercase;vertical-align:middle}'+
'.lagx-spin{display:inline-block;width:14px;height:14px;background:#ffd24a;margin-right:8px;animation:lagxspin .8s steps(4) infinite;vertical-align:middle}@keyframes lagxspin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}'+
'.lagx-bal{display:flex;justify-content:space-between;border-bottom:2px dashed rgba(232,220,181,.25);padding:4px 0;font-weight:normal}'+
'.lagx-toast{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483001;background:#000;color:#e8dcb5;border:3px solid #3cff5a;padding:8px 14px;font:bold 14px "Courier New",monospace;box-shadow:4px 4px 0 #000;max-width:92vw;text-align:center}'+
'@media (max-height:540px) and (min-width:600px){.lagx-box{width:min(680px,100%);padding:12px 16px}.lagx h2{font-size:16px;margin-bottom:4px}.lagx p{margin:3px 0}.lagx-bundles{grid-template-columns:repeat(3,1fr);margin:8px 0}.lagx-b{flex-direction:column;padding:8px}.lagx .lagx-chk{margin:6px 0 2px}}'+
'@media (max-width:420px){.lagx-box{padding:14px 12px}.lagx h2{font-size:17px}.lagx-b .lagx-amt{font-size:17px}}';
function css(){if(document.getElementById('lagx-css'))return;var s=document.createElement('style');s.id='lagx-css';s.textContent=CSS;document.head.appendChild(s);}
var M=null,MRES=null,CTX={};
function close(v){if(!M)return;M.remove();M=null;if(POLL){clearTimeout(POLL);POLL=null;}var r=MRES;MRES=null;if(r)r(v===undefined?user():v);if(CTX.onClose)try{CTX.onClose();}catch(e){}}
function toast(msg,ms){css();var d=document.createElement('div');d.className='lagx-toast';d.setAttribute('role','status');d.setAttribute('data-i18n-skip','');d.textContent=msg;document.body.appendChild(d);setTimeout(function(){d.remove();},ms||3200);}
function errMsg(e){if(!e)return t('Something went wrong. Please try again.');if(e.network)return t('Network error. Check your connection.');
  var c=String(e.code||'')+' '+String(e.message||'');if(/invalid_credentials|Invalid login/i.test(c))return t('Wrong email or password.');
  if(/user_already_exists|already registered|email_exists/i.test(c))return t('An account with this email already exists. Try signing in.');
  if(e.status===429||/rate_limit/i.test(c))return t('Too many attempts. Please wait a minute and try again.');
  if(/weak_password|at least/i.test(c))return t('Password must be at least 8 characters.');return t('Something went wrong. Please try again.');}
function shell(title,body){css();if(!M){M=document.createElement('div');M.className='lagx';M.setAttribute('data-i18n-skip','');M.setAttribute('role','dialog');M.setAttribute('aria-modal','true');
  ['keydown','keyup','keypress','pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','click','wheel'].forEach(function(ev){M.addEventListener(ev,function(e){e.stopPropagation();if(ev==='keydown'&&e.key==='Escape')close(null);},false);});
  M.addEventListener('click',function(e){if(e.target===M)close(null);});document.body.appendChild(M);}
  M.setAttribute('aria-label',title);
  M.innerHTML='<div class="lagx-box"><button type="button" class="lagx-btn lagx-x" aria-label="'+esc(t('Close'))+'" data-a="close">&#10005;</button><h2>'+esc(title)+'</h2>'+body+'</div>';
  M.querySelector('[data-a=close]').onclick=function(){close(null);};
  [].forEach.call(M.querySelectorAll('[data-go]'),function(b){b.onclick=function(){open(b.getAttribute('data-go'),CTX);};});
  var f=M.querySelector('input,button.gold');if(f)setTimeout(function(){try{f.focus();}catch(e){}},30);return M;}
function busy(form,on){[].forEach.call(form.querySelectorAll('button,input'),function(b){b.disabled=on;});}
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);}
function views(v){
 var u=user();
 if(v==='signin'){var m=shell(t('Sign in'),'<form novalidate><label for="lagx-e">'+esc(t('Email'))+'</label><input id="lagx-e" type="email" autocomplete="email" required>'+
  '<label for="lagx-p">'+esc(t('Password'))+'</label><input id="lagx-p" type="password" autocomplete="current-password" required minlength="8">'+
  '<div class="lagx-err" aria-live="polite"></div><button class="lagx-btn gold wide" type="submit">'+esc(t('Sign in'))+'</button></form>'+
  '<div class="lagx-row"><button class="lagx-link" data-go="reset" type="button">'+esc(t('Forgot password?'))+'</button><button class="lagx-link" data-go="signup" type="button">'+esc(t('New here? Create an account'))+'</button></div>'+
  '<p class="lagx-small" style="margin-top:12px">'+esc(t('Guests can play everything. You only need an account to buy coins.'))+'</p>');
  var f=m.querySelector('form');f.onsubmit=function(e){e.preventDefault();var em=f.querySelector('#lagx-e').value.trim(),pw=f.querySelector('#lagx-p').value,er=f.querySelector('.lagx-err');
   if(!validEmail(em)){er.textContent=t('Please enter a valid email.');return;}if(pw.length<8){er.textContent=t('Password must be at least 8 characters.');return;}
   busy(f,true);signIn(em,pw).then(function(){toast(t('Signed in!'));after();},function(e){busy(f,false);er.textContent=errMsg(e);});};}
 else if(v==='signup'){var m2=shell(t('Create account'),'<form novalidate><label for="lagx-e">'+esc(t('Email'))+'</label><input id="lagx-e" type="email" autocomplete="email" required>'+
  '<label for="lagx-p">'+esc(t('Password'))+'</label><input id="lagx-p" type="password" autocomplete="new-password" required minlength="8"><div class="lagx-small">'+esc(t('At least 8 characters.'))+'</div>'+
  '<label class="lagx-chk"><input type="checkbox" id="lagx-age"><span>'+t('I am 13 or older. If I am under 18, my parent or guardian agrees to the {terms} and {privacy}.',{terms:link('terms','Terms of Service'),privacy:link('privacy','Privacy Policy')})+'</span></label>'+
  '<div class="lagx-err" aria-live="polite"></div><button class="lagx-btn gold wide" type="submit">'+esc(t('Create account'))+'</button></form>'+
  '<div class="lagx-row"><button class="lagx-link" data-go="signin" type="button">'+esc(t('Have an account? Sign in'))+'</button></div>'+
  '<p class="lagx-small" style="margin-top:12px">'+esc(t('Your account keeps your coins safe on our server, on any device.'))+'</p>');
  var f2=m2.querySelector('form');f2.onsubmit=function(e){e.preventDefault();var em=f2.querySelector('#lagx-e').value.trim(),pw=f2.querySelector('#lagx-p').value,er=f2.querySelector('.lagx-err');
   if(!validEmail(em)){er.textContent=t('Please enter a valid email.');return;}if(pw.length<8){er.textContent=t('Password must be at least 8 characters.');return;}
   if(!f2.querySelector('#lagx-age').checked){er.textContent=t('Please tick the age and terms box.');return;}
   busy(f2,true);signUp(em,pw).then(function(r){if(r.confirm){busy(f2,false);er.className='lagx-ok';er.textContent=t('Check your email to confirm your account, then sign in.');return;}toast(t('Signed in!'));after();},function(e){busy(f2,false);er.textContent=errMsg(e);});};}
 else if(v==='reset'){var m3=shell(t('Reset password'),'<form novalidate><label for="lagx-e">'+esc(t('Email'))+'</label><input id="lagx-e" type="email" autocomplete="email" required>'+
  '<div class="lagx-err" aria-live="polite"></div><button class="lagx-btn gold wide" type="submit">'+esc(t('Send reset link'))+'</button></form><div class="lagx-row"><button class="lagx-link" data-go="signin" type="button">&#9664; '+esc(t('Back'))+'</button></div>');
  var f3=m3.querySelector('form');f3.onsubmit=function(e){e.preventDefault();var em=f3.querySelector('#lagx-e').value.trim(),er=f3.querySelector('.lagx-err');if(!validEmail(em)){er.textContent=t('Please enter a valid email.');return;}
   busy(f3,true);requestReset(em).then(function(){er.className='lagx-ok';er.textContent=t('If an account exists for {email}, a reset link is on its way. Check your inbox and spam folder.',{email:em});},function(e){busy(f3,false);er.textContent=errMsg(e);});};}
 else if(v==='newpass'){var m4=shell(t('New password'),'<form novalidate><p>'+esc(t('Choose a new password for {email}.',{email:u?u.email:''}))+'</p><label for="lagx-p">'+esc(t('New password'))+'</label><input id="lagx-p" type="password" autocomplete="new-password" minlength="8">'+
  '<div class="lagx-small">'+esc(t('At least 8 characters.'))+'</div><div class="lagx-err" aria-live="polite"></div><button class="lagx-btn gold wide" type="submit">'+esc(t('Save password'))+'</button></form>');
  var f4=m4.querySelector('form');f4.onsubmit=function(e){e.preventDefault();var pw=f4.querySelector('#lagx-p').value,er=f4.querySelector('.lagx-err');if(pw.length<8){er.textContent=t('Password must be at least 8 characters.');return;}
   busy(f4,true);updatePassword(pw).then(function(){toast(t('Password saved. You are signed in.'));close();},function(e){busy(f4,false);er.textContent=errMsg(e);});};}
 else if(v==='account'){if(!u)return views('signin');var games=[['orbit-hills','Orbit Hills','&#9673;'],['meowteor','MEOWTEOR','&#9733;']];
  var m5=shell(t('Account'),'<p>'+esc(t('Signed in as {email}',{email:u.email}))+'</p><p class="lagx-small" style="margin-top:12px">'+esc(t('Your balances'))+'</p><div id="lagx-bals">'+games.map(function(g){return '<div class="lagx-bal"><span>'+g[1]+'</span><span data-g="'+g[0]+'">'+g[2]+' &hellip;</span></div>';}).join('')+'</div>'+
   '<button class="lagx-btn wide" type="button" data-a="out">'+esc(t('Sign out'))+'</button>'+
   '<p class="lagx-small" style="margin-top:12px">'+link('terms','Terms of Service')+' &middot; '+link('privacy','Privacy Policy')+' &middot; '+link('refunds','Refund Policy')+'</p>'+
   '<p class="lagx-small">'+t('To delete your account and its data, email {email}.',{email:'<a href="mailto:'+esc(CONTACT)+'">'+esc(CONTACT)+'</a>'})+'</p>');
  games.forEach(function(g){wallet.get(g[0]).then(function(w){var el=m5.querySelector('[data-g="'+g[0]+'"]');if(el)el.innerHTML=g[2]+' '+fmt(w.balance);},function(){});});
  m5.querySelector('[data-a=out]').onclick=function(){signOut().then(function(){toast(t('Signed out.'));close(null);});};}
 else if(v==='store')storeView();
}
function after(){var n=CTX.next;CTX.next=null;if(n){open(n,CTX);return;}close();}
function open(view,ctx){if(!ENABLED)return Promise.resolve(null);CTX=ctx||CTX||{};
  if(MRES&&!M)MRES=null;var p=MRES?null:new Promise(function(res){MRES=res;});views(view||(user()?'account':'signin'));return p||Promise.resolve(user());}

// ------------------------------------------------------------------ store
var POLL=null;var PROVIDER_NAME={lemonsqueezy:'Lemon Squeezy',paddle:'Paddle'};
function storeView(){var g=CTX.game,u=user(),list=(C.bundles||{})[g]||[];var icon=CTX.icon||'&#9673;';
 var rows=list.map(function(b,i){return '<div class="lagx-b"><div><span class="lagx-amt">'+icon+' '+fmt(b.coins)+'</span>'+(i===list.length-1?'<span class="lagx-tag">'+esc(t('Best value'))+'</span>':'')+'</div>'+
   '<button type="button" class="lagx-btn gold" data-buy="'+esc(b.key)+'">$'+b.usd+' USD</button></div>';}).join('');
 var m=shell(t('Get Coins'),(u?'<p class="lagx-small">'+esc(t('Signed in as {email}',{email:u.email}))+' &middot; <button type="button" class="lagx-link" data-go="account">'+esc(t('Account'))+'</button></p>':'<p>'+esc(t('Buying requires an account. Playing does not.'))+'</p>')+
  '<div class="lagx-bundles">'+rows+'</div>'+
  (u?'<label class="lagx-chk"><input type="checkbox" id="lagx-waive"><span>'+esc(t('I want the coins delivered right away and understand that I lose my 14-day right of withdrawal once they are delivered.'))+'</span></label>':'')+
  '<div class="lagx-err" aria-live="polite"></div>'+
  (u?'':'<button type="button" class="lagx-btn gold wide" data-a="login">'+esc(t('Sign in to buy'))+'</button>')+
  '<p class="lagx-small" style="margin-top:12px">'+esc(t('Purchases are for players 13+. If you are under 18, ask a parent or guardian for permission first.'))+'</p>'+
  '<p class="lagx-small">'+t('Coins have no cash value and can only be used in this game. See the {terms} and {refunds}.',{terms:link('terms','Terms of Service'),refunds:link('refunds','Refund Policy')})+'</p>'+
  '<p class="lagx-small">'+esc(t('Secure payment by {provider}, our reseller and merchant of record.',{provider:PROVIDER_NAME[C.provider]||C.provider}))+'</p>');
 var er=m.querySelector('.lagx-err');
 if(!u){m.querySelector('[data-a=login]').onclick=function(){CTX.next='store';views('signin');};
   [].forEach.call(m.querySelectorAll('[data-buy]'),function(b){b.onclick=function(){CTX.next='store';views('signin');};});return;}
 [].forEach.call(m.querySelectorAll('[data-buy]'),function(b){b.onclick=function(){var w=m.querySelector('#lagx-waive');if(!w.checked){er.textContent=t('Please tick the box above first.');w.focus();return;}
   er.textContent='';buy(g,b.getAttribute('data-buy'),m);};});}
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.defer=true;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
function buy(g,key,m){var bundle=((C.bundles||{})[g]||[]).filter(function(b){return b.key===key;})[0];if(!bundle)return;
 var btns=m.querySelectorAll('button');[].forEach.call(btns,function(b){b.disabled=true;});var er=m.querySelector('.lagx-err');er.className='lagx-ok';er.textContent=t('Opening secure checkout...');
 var pending;wallet.lastPurchaseId().then(function(last){pending={game:g,key:key,coins:bundle.coins,after:last,t:Date.now(),icon:CTX.icon};
   return token().then(function(tk){return fetch(FN+'/create-checkout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+tk,'Content-Type':'application/json'},
     body:JSON.stringify({product_key:key,return_url:cleanUrl().replace(/[?&]lag_checkout=[^&#]*/,'').replace(/[?&]lag_game=[^&#]*/,''),locale:lang(),withdrawal_waiver:true})});});})
 .then(function(r){return r.json().then(function(j){if(!r.ok)throw Object.assign(new Error(j&&j.error||'checkout'),{status:r.status});return j;});})
 .then(function(j){try{sessionStorage.setItem(PKEY,JSON.stringify(pending));}catch(e){}
   var mode=C.checkoutMode||'overlay';
   if(j.provider==='lemonsqueezy'){if(mode==='redirect'){location.href=j.url;return;}
     return loadScript('https://app.lemonsqueezy.com/js/lemon.js').then(function(){if(window.createLemonSqueezy)window.createLemonSqueezy();
       window.LemonSqueezy.Setup({eventHandler:function(ev){if(ev&&ev.event==='Checkout.Success'){try{window.LemonSqueezy.Url.Close();}catch(e){}processing(pending);}}});
       window.LemonSqueezy.Url.Open(j.url);er.textContent='';[].forEach.call(btns,function(b){b.disabled=false;});},function(){location.href=j.url;});}
   if(j.provider==='paddle'){return loadScript('https://cdn.paddle.com/paddle/v2/paddle.js').then(function(){var P=window.Paddle;if(j.environment==='sandbox')P.Environment.set('sandbox');
       P.Initialize({token:j.clientToken||(C.paddle||{}).clientToken,eventCallback:function(ev){if(ev&&ev.name==='checkout.completed'){setTimeout(function(){try{P.Checkout.close();}catch(e){}processing(pending);},1200);}}});
       P.Checkout.open({transactionId:j.transactionId,customer:j.email?{email:j.email}:undefined,settings:{displayMode:'overlay',locale:lang(),successUrl:mode==='redirect'?j.successUrl:undefined}});
       er.textContent='';[].forEach.call(btns,function(b){b.disabled=false;});});}
   throw new Error('unknown provider');})
 .catch(function(e){console.warn('[lag store]',e);er.className='lagx-err';er.textContent=e&&e.network?t('Network error. Check your connection.'):t('Checkout is not available right now. Please try again later.');[].forEach.call(btns,function(b){b.disabled=false;});});}
function processing(p){if(!p)return;CTX.game=p.game;CTX.icon=p.icon||CTX.icon;
 var m=shell(t('Processing...'),'<p><span class="lagx-spin" aria-hidden="true"></span>'+esc(t('Waiting for the payment to be confirmed. This usually takes a few seconds.'))+'</p><div class="lagx-err" aria-live="polite"></div>');
 var start=Date.now(),wait=1500;
 (function tick(){wallet.purchasesAfter(p.game,p.after).then(function(rows){rows=(rows||[]).filter(function(r){return r.status!=='chargeback';});
   if(rows.length){try{sessionStorage.removeItem(PKEY);}catch(e){}var n=rows.reduce(function(a,r){return a+(+r.coins||0);},0);
     return wallet.get(p.game).then(function(w){if(!M)return;shell(t('Get Coins'),'<p class="lagx-ok" style="font-size:18px">'+(p.icon||'')+' '+esc(t('+{n} added to your balance!',{n:fmt(n)}))+'</p><p>'+esc(t('Balance'))+': '+(p.icon||'')+' '+fmt(w.balance)+'</p><button type="button" class="lagx-btn gold wide" data-a="ok">OK</button>');
       M.querySelector('[data-a=ok]').onclick=function(){close();};if(CTX.onBalance)try{CTX.onBalance(+w.balance,n);}catch(e){}});}
   if(Date.now()-start>90000){try{sessionStorage.removeItem(PKEY);}catch(e){}var er=m.querySelector('.lagx-err');if(er){er.textContent=t('Still processing. Your coins will appear automatically once the payment is confirmed. Contact us if they do not arrive within an hour.');}
     var sp=m.querySelector('.lagx-spin');if(sp)sp.remove();return;}
   POLL=setTimeout(tick,wait);wait=Math.min(5000,wait*1.3);},function(){POLL=setTimeout(tick,4000);});})();}
function openStore(opts){if(!ENABLED)return Promise.resolve(null);opts=opts||{};return open('store',{game:opts.game,icon:opts.icon,onBalance:opts.onBalance,onClose:opts.onClose});}
// Call on game load: if we came back from a redirect checkout, show Processing... and poll.
function resumeCheckout(opts){if(!ENABLED)return false;opts=opts||{};var p=null;try{p=JSON.parse(sessionStorage.getItem(PKEY)||'null');}catch(e){}
 var back=/[?&]lag_checkout=return/.test(location.search);
 if(back){try{var u=new URL(location.href);u.searchParams.delete('lag_checkout');u.searchParams.delete('lag_game');history.replaceState(null,'',u.toString());}catch(e){}}
 if(!p||p.game!==opts.game||!user())return false;if(!back&&Date.now()-p.t>30*60000){try{sessionStorage.removeItem(PKEY);}catch(e){}return false;}
 if(!back)return false;CTX={game:opts.game,icon:opts.icon,onBalance:opts.onBalance,onClose:opts.onClose};if(!MRES)new Promise(function(r){MRES=r;});processing(p);return true;}

// ------------------------------------------------------------------ site header item
function renderHeader(){if(!ENABLED)return;var nav=document.querySelector('.site-header .nav');if(!nav)return;var li=nav.querySelector('.nav-account');
 if(!li){li=document.createElement('li');li.className='nav-account';li.setAttribute('data-i18n-skip','');li.innerHTML='<a href="#account"></a>';nav.appendChild(li);
   li.firstChild.addEventListener('click',function(e){e.preventDefault();open(user()?'account':'signin',{});});}
 var u=user();li.firstChild.textContent=(u?'\u25cf ':'')+t('Account');li.firstChild.title=u?t('Signed in as {email}',{email:u.email}):t('Sign in');}
if(ENABLED){S=readS();lastUid=S&&S.user.id;
 window.addEventListener('storage',function(e){if(e.key===SKEY){S=readS();emit();}if(e.key==='lag.lang')renderHeader();});
 document.addEventListener('lag:lang',renderHeader);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderHeader);else renderHeader();
 // keep a long-lived tab's token fresh
 setInterval(function(){if(S&&S.expires_at*1000-Date.now()<120000)token().catch(function(){});},60000);}

window.LAGAccount={enabled:ENABLED,t:t,user:user,onChange:onChange,open:open,close:close,toast:toast,signIn:signIn,signUp:signUp,signOut:signOut,
 requestReset:requestReset,updatePassword:updatePassword,token:token,rpc:rpc,wallet:wallet,openStore:openStore,resumeCheckout:resumeCheckout,legal:LEGAL,
 bundles:function(g){return ((C.bundles||{})[g]||[]).slice();}};
})();
