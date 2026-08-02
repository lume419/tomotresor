/* ---------- Thème clair / sombre (localStorage uniquement, aucun cookie) ---------- */
const THEME_KEY = "tomodachi-theme";

function getTheme(){
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyThemeButtonLabel(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  const isDark = getTheme() === 'dark';
  btn.textContent = isDark ? '☀️ Clair' : '🌙 Sombre';
  btn.setAttribute('aria-label', isDark ? 'Passer au thème clair' : 'Passer au thème sombre');
}

function toggleTheme(){
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  if(next === 'dark'){
    document.documentElement.setAttribute('data-theme','dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){ console.warn('Impossible de sauvegarder le thème', e); }
  applyThemeButtonLabel();
}

function imageUrl(id){
  return `img/img_catalogue/${id}.webp`;
}

function computeBox(id){
  if(PETITE_IDS.includes(id)) return "Petite";
  if(MOYENNE_IDS.includes(id)) return "Moyenne";
  if(GRANDE_IDS.includes(id)) return "Grande";
  return "Autre";
}

let treasures = RAW.map(([id,name,slug,cat]) => ({ id, name, slug, cat, box: computeBox(id) }));

const STORAGE_KEY_STATE = "tomodachi-treasures-state";
const PRICE_STATS_VISIBLE_KEY = "tomodachi-price-stats-visible";

function isPriceStatsVisible(){
  try{
    const raw = localStorage.getItem(PRICE_STATS_VISIBLE_KEY);
    if(raw === null) return true; // ouverte par défaut
    return raw === "1";
  }catch(e){ return true; }
}
function setPriceStatsVisible(visible){
  try{ localStorage.setItem(PRICE_STATS_VISIBLE_KEY, visible ? "1" : "0"); }
  catch(e){ console.warn('Impossible de sauvegarder l\'état de la case stats', e); }
}
function togglePriceStats(){
  const selection = window.getSelection ? window.getSelection().toString() : '';
  if(selection.length > 0) return; // ne pas replier si l'utilisateur sélectionne du texte
  const next = !isPriceStatsVisible();
  setPriceStatsVisible(next);
  applyPriceStatsVisibility();
}
function applyPriceStatsVisibility(){
  const el = document.getElementById('priceStats');
  const btn = document.getElementById('priceStatsToggle');
  if(!el) return;
  const visible = isPriceStatsVisible();
  el.classList.toggle('collapsed', !visible);
  el.setAttribute('aria-expanded', String(visible));
  el.setAttribute('aria-label', visible ? 'Masquer ces statistiques' : 'Afficher ces statistiques');
  if(btn){
    btn.textContent = visible ? '▾' : '▸';
  }
}

let state = { obtained: {}, hideDone: false };
let currentTab = "tous";

/* ---------- Persistence (localStorage = stockage local du PC) ---------- */
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY_STATE);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed.obtained) state.obtained = parsed.obtained;
      if(typeof parsed.hideDone === 'boolean') state.hideDone = parsed.hideDone;
      if(typeof parsed.lastTab === 'string') currentTab = parsed.lastTab;
    }
  }catch(e){ console.warn("Pas de progression sauvegardée trouvée.", e); }
  document.getElementById('hideDone').checked = !!state.hideDone;
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({...state, lastTab: currentTab})); }
  catch(e){ console.error('Erreur de sauvegarde locale', e); }
}

function normalize(str){ return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }

function buildTabs(){
  const tabsEl = document.getElementById('tabs');
  const counts = {petite:0, moyenne:0, grande:0, autre:0};
  treasures.forEach(t=> counts[t.box.toLowerCase()]++ );
  counts.tous = treasures.length;

  const fmtPrice = n => (n % 1 === 0 ? n : n.toFixed(2)) + " €";
  const priceRange = {};
  ["petite","moyenne","grande"].forEach(key => {
    const prices = treasures.filter(t => t.box.toLowerCase() === key).map(t => SELL_PRICE[t.id] || 0);
    if(prices.length){
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      priceRange[key] = `${fmtPrice(min)} - ${fmtPrice(max)}`;
    }
  });

  const order = ["tous", "petite","moyenne","grande","autre"];
  tabsEl.innerHTML = order.map(key => `
    <button class="tab ${currentTab===key?'active':''}" data-tab="${key}" onclick="setTab('${key}')">
      <span class="tab-main"><span class="tab-name">${TAB_LABEL[key]}</span> <span class="count">${counts[key]}</span></span>
      ${priceRange[key] ? `<span class="tab-price-range">${priceRange[key]}</span>` : ''}
    </button>
  `).join('');
}

function setTab(key){ currentTab = key; render(); }

function toggleObtained(id){
  state.obtained[id] = !state.obtained[id];
  saveState();
  render();
}

function computeChance(boxKey){
  const list = treasures.filter(t => t.box.toLowerCase() === boxKey);
  const total = list.length;
  const done = list.filter(t => state.obtained[t.id]).length;
  const remaining = total - done;
  const pct = total ? Math.round((remaining/total)*100) : 0;
  return {total, done, remaining, pct};
}

function renderBestChance(){
  const boxes = ["petite","moyenne","grande"];
  const results = boxes.map(key => ({key, ...computeChance(key)}));
  const best = results.reduce((a,b)=> b.pct > a.pct ? b : a);
  const el = document.getElementById('bestChance');
  if(best.remaining === 0){
    el.innerHTML = `<span class="trophy">🏆</span> Tu as déjà obtenu tous les trésors des boîtes Petite, Moyenne et Grande !`;
  } else {
    el.innerHTML = `<span class="trophy">🏆</span> La <b>${TAB_LABEL[best.key]}</b> a le plus de chances de contenir un nouveau trésor : <b>${best.pct}%</b>`;
  }
}

function renderPriceStats(){
  const boxes = ["petite","moyenne","grande"];
  let maxItem = null, maxItemBoxKey = null;
  const avgByBox = {};
  boxes.forEach(key=>{
    const list = treasures.filter(t => t.box.toLowerCase() === key);
    const prices = list.map(t => SELL_PRICE[t.id] || 0);
    const sum = prices.reduce((a,b)=>a+b, 0);
    avgByBox[key] = list.length ? sum/list.length : 0;
    list.forEach(t=>{
      const p = SELL_PRICE[t.id] || 0;
      if(!maxItem || p > maxItem.price){
        maxItem = { price: p, name: t.name };
        maxItemBoxKey = key;
      }
    });
  });
  const bestAvgKey = boxes.reduce((a,b)=> avgByBox[b] > avgByBox[a] ? b : a);

  const fmt = n => (n % 1 === 0 ? n : n.toFixed(2)) + " €";
  const el = document.getElementById('priceStats');
  el.innerHTML = `
    <span id="priceStatsToggle" class="price-stats-toggle" aria-hidden="true">▾</span>
    <div class="price-stats-collapsed-label">Informations utiles</div>
    <div class="price-stats-content">
      <div class="price-stat-row"><span class="trophy">💰</span> La <b>${TAB_LABEL[maxItemBoxKey]}</b> contient l'objet le plus cher : <b>${maxItem.name}</b> (${fmt(maxItem.price)})</div>
      <div class="price-stat-row"><span class="trophy">📊</span> La <b>${TAB_LABEL[bestAvgKey]}</b> a la moyenne de revente la plus élevée : <b>${fmt(avgByBox[bestAvgKey])}</b></div>
    </div>
  `;
  applyPriceStatsVisibility();
}

function render(){
  buildTabs();
  renderBestChance();
  renderPriceStats();

  const search = normalize(document.getElementById('search').value || "");
  state.hideDone = document.getElementById('hideDone').checked;
  saveState();

  const list = currentTab === "tous" ? treasures : treasures.filter(t => t.box.toLowerCase() === currentTab);
  const total = list.length;
  const done = list.filter(t => state.obtained[t.id]).length;
  const remaining = total - done;

  const ring = document.getElementById('ring');

  if(currentTab === "autre" || currentTab === "tous"){
    ring.style.display = "none";
    const icon = currentTab === "tous" ? "📚" : "🎁";
    document.getElementById('progLabel').textContent = icon + " " + TAB_LABEL[currentTab];
    document.getElementById('progSub').innerHTML = currentTab === "tous"
      ? `<b>${done} sur ${total}</b> trésors obtenus au total, toutes tailles de boîte confondues.`
      : `Trésors obtenus autrement que par une boîte (rêves, mini-jeux, événements…) — <b>${done} sur ${total}</b> obtenus. Pas de pourcentage ici, ce ne sont pas des tirages aléatoires.`;
  } else {
    ring.style.display = "flex";
    const chancePct = total ? Math.round((remaining/total)*100) : 0;
    ring.style.setProperty('--pct', chancePct);
    ring.style.setProperty('--ring-color', TAB_COLOR[currentTab]);
    document.getElementById('ringPct').textContent = chancePct + "%";
    document.getElementById('progLabel').textContent = "🎲 " + TAB_LABEL[currentTab];
    document.getElementById('progSub').innerHTML = remaining > 0
      ? `<b>${chancePct}% de chance</b> d'obtenir un nouveau trésor en ouvrant cette boîte (${remaining} restant${remaining>1?'s':''} sur ${total})`
      : `Tous les trésors de cette boîte sont déjà obtenus ! 🎉 (0% de chance d'en avoir un nouveau)`;
  }

  let searchFiltered = list.filter(t => normalize(t.name).includes(search));
  let visible = state.hideDone ? searchFiltered.filter(t => !state.obtained[t.id]) : searchFiltered;

  const content = document.getElementById('content');
  const emptyMsg = document.getElementById('emptyMsg');

  if(visible.length === 0){
    content.innerHTML = "";
    emptyMsg.style.display = "block";
    emptyMsg.textContent = list.length === 0
      ? "Aucun trésor dans cette catégorie pour l'instant."
      : (state.hideDone ? "Tous les trésors de cette boîte sont déjà obtenus ! 🎉" : "Aucun trésor ne correspond à ta recherche.");
    return;
  }

  emptyMsg.style.display = "none";

  let html = "";
  CAT_ORDER.forEach(cat=>{
    const items = visible.filter(t=>t.cat===cat);
    if(items.length === 0) return;
    const catAll = searchFiltered.filter(t=>t.cat===cat);
    const catDone = catAll.filter(t=>state.obtained[t.id]).length;
    const catTotal = catAll.length;
    const catMissing = catTotal - catDone;
    const badgeText = state.hideDone
      ? `${catMissing} manquant${catMissing>1?'s':''}`
      : `${catDone}/${catTotal}`;
    html += `<div class="cat-group">
      <div class="cat-heading">${CAT_ICON[cat]} ${CAT_LABEL[cat]} <span class="badge-count">${badgeText}</span></div>
      <div class="grid">
        ${items.map(t => {
          const img = imageUrl(t.id);
          const iconHtml = `<img src="${img}" alt="" loading="lazy" onerror="this.outerHTML='<div class=&quot;icon-plate&quot;>${CAT_ICON[t.cat]}</div>';">`;
          const unlockHtml = (t.box === "Autre" && UNLOCK_METHOD[t.id])
            ? `<div class="unlock-tag">${UNLOCK_METHOD[t.id]}</div>`
            : "";
          const price = SELL_PRICE[t.id];
          const priceHtml = (typeof price === 'number' && price > 0)
            ? `<div class="price-tag">${price % 1 === 0 ? price : price.toFixed(2)} €</div>`
            : "";
          return `
          <div class="card ${state.obtained[t.id]?'done':''}" onclick="toggleObtained(${t.id})" title="Marquer comme obtenu">
            <div class="num-badge">#${t.id}</div>
            <div class="stamp">${state.obtained[t.id]?'✓':''}</div>
            ${iconHtml}
            <div class="meta">
              <div class="name">${t.name}</div>
              ${priceHtml}
              ${unlockHtml}
            </div>
          </div>
        `;}).join('')}
      </div>
    </div>`;
  });
  content.innerHTML = html;
}

/* ---------- Menu déroulant Sauvegarde ---------- */
function toggleSaveMenu(){
  const dd = document.getElementById('saveDropdown');
  dd.classList.toggle('open');
}
document.addEventListener('click', function(e){
  const dd = document.getElementById('saveDropdown');
  if(dd && !dd.contains(e.target)){
    dd.classList.remove('open');
  }
});

/* ---------- Chiffrement du fichier de sauvegarde (Web Crypto API, AES-GCM 256) ---------
   Le fichier exporté n'est lisible/restaurable que par TomoTrésor : la clé de déchiffrement
   est dérivée d'un secret propre à l'application (jamais du contenu du fichier lui-même),
   donc un fichier ouvert dans un éditeur de texte n'affiche que du texte chiffré illisible. */
const APP_SECRET = "TomoTresor-ile-aux-miis-v1-\u{1F5DD}\u{FE0F}";
const APP_SALT = new TextEncoder().encode("TomoTresor-salt-247-tresors");
const FILE_MAGIC = "TOMOTRESOR-ENC-V1:";

let _cryptoKeyPromise = null;
function getCryptoKey(){
  if(!_cryptoKeyPromise){
    _cryptoKeyPromise = (async () => {
      const baseKey = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(APP_SECRET), "PBKDF2", false, ["deriveKey"]
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: APP_SALT, iterations: 150000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt","decrypt"]
      );
    })();
  }
  return _cryptoKeyPromise;
}

function bufToB64(buf){
  let bin = "";
  const bytes = new Uint8Array(buf);
  for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBuf(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function encryptText(plainText){
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, key, new TextEncoder().encode(plainText));
  return FILE_MAGIC + bufToB64(iv) + "." + bufToB64(cipherBuf);
}

async function decryptText(fileText){
  if(!fileText.startsWith(FILE_MAGIC)){
    throw new Error("not-encrypted");
  }
  const body = fileText.slice(FILE_MAGIC.length).trim();
  const [ivB64, cipherB64] = body.split(".");
  const key = await getCryptoKey();
  const plainBuf = await crypto.subtle.decrypt(
    { name:"AES-GCM", iv: new Uint8Array(b64ToBuf(ivB64)) },
    key,
    b64ToBuf(cipherB64)
  );
  return new TextDecoder().decode(plainBuf);
}

/* Horodatage complet (date + heure locale + ISO) pour le contenu et le nom du fichier */
function fullTimestamp(){
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const filenameSafe = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}m${pad(now.getSeconds())}`;
  const readableLocal = now.toLocaleString('fr-FR', { dateStyle:'full', timeStyle:'medium' });
  return { iso: now.toISOString(), filenameSafe, readableLocal };
}

/* ---------- Sauvegarde / restauration (fichier .txt chiffré) ---------- */
async function exportData(){
  document.getElementById('saveDropdown').classList.remove('open');
  const ts = fullTimestamp();
  const payload = {
    app: "TomoTresor",
    exportedAtISO: ts.iso,
    exportedAtLocal: ts.readableLocal,
    state: state
  };
  try{
    const encrypted = await encryptText(JSON.stringify(payload));
    const blob = new Blob([encrypted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tomotresor-sauvegarde-${ts.filenameSafe}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(err){
    console.error(err);
    alert("Le chiffrement de la sauvegarde a échoué (ton navigateur doit supporter Web Crypto). Réessaie ou change de navigateur.");
  }
}

async function importData(event){
  document.getElementById('saveDropdown').classList.remove('open');
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async function(e){
    const rawText = e.target.result;
    try{
      let jsonText;
      try{
        jsonText = await decryptText(rawText);
      }catch(decryptErr){
        if(decryptErr && decryptErr.message === "not-encrypted"){
          // Compatibilité avec d'anciennes sauvegardes non chiffrées
          jsonText = rawText;
        } else {
          throw decryptErr;
        }
      }
      const payload = JSON.parse(jsonText);
      const incoming = payload && payload.state ? payload.state : payload;
      if(!incoming || typeof incoming.obtained !== 'object'){
        alert("Ce fichier ne semble pas être une sauvegarde valide de TomoTrésor.");
        return;
      }
      state.obtained = incoming.obtained || {};
      if(typeof incoming.hideDone === 'boolean') state.hideDone = incoming.hideDone;
      saveState();
      document.getElementById('hideDone').checked = !!state.hideDone;
      render();
      const when = payload.exportedAtLocal ? ` (sauvegarde du ${payload.exportedAtLocal})` : "";
      alert("Sauvegarde restaurée avec succès" + when + " !");
    }catch(err){
      console.error(err);
      alert("Impossible de lire ce fichier. Vérifie que c'est bien une sauvegarde TomoTrésor non modifiée.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

/* ---------- Réinitialisation (conserve le thème) ---------- */
function openResetModal(){
  document.getElementById('saveDropdown').classList.remove('open');
  document.getElementById('resetModal').classList.add('open');
}
function closeResetModal(){
  document.getElementById('resetModal').classList.remove('open');
}
function confirmReset(){
  try{
    localStorage.removeItem(STORAGE_KEY_STATE);
  }catch(e){ console.warn('Erreur lors de la réinitialisation', e); }
  state = { obtained: {}, hideDone: false };
  document.getElementById('hideDone').checked = false;
  closeResetModal();
  render();
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape') closeResetModal();
});

/* ---------- Init ---------- */
applyThemeButtonLabel();
loadState();
render();
