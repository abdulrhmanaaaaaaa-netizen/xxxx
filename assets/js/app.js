/* ============================================================
   RemoveBG · Sandstorm Studio Pro — Full App
   ============================================================ */

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = v => { if(!v) return '—'; try{ const d=new Date(v); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch{ return String(v); } };
const todayISO = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const initials = v => { const t=String(v||'?').trim(); return t?t.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const PRESETS = [
  'https://i.postimg.cc/SsY3CNhB/06b2725f5d4eaed9019cdd45727369cb.jpg',
  'https://i.postimg.cc/zBH6KXrP/189db98cca60bfab2425301f9554e569.jpg',
  'https://i.postimg.cc/FRk83s4G/24120c0c61a7f0bea682cadbc2a2c864.jpg',
  'https://i.postimg.cc/6qsS0JWS/301993462c1c3a8dc18ab3c8d45abb96.jpg',
  'https://i.postimg.cc/gJLQ8kWK/31eebd1cd36d9712c6b0082084de34f5.jpg',
  'https://i.postimg.cc/sXGq7Dr8/38f9db786eee7e7a5e309d021eb50dbd.jpg',
  'https://i.postimg.cc/JnHvZ4LS/3a2576ec62e621b866369d4c64702cf7.jpg',
  'https://i.postimg.cc/NM2SmfcJ/3e13500046726d734ef24e3338557ae5.jpg',
  'https://i.postimg.cc/yxq5P41r/512ab0e4cc8524d55ea0c31d2814d15a.jpg',
  'https://i.postimg.cc/76Jd0Y4v/5b54a19d12bb826c9bae7e4f34532f5a.jpg',
  'https://i.postimg.cc/0jg3fRk4/5ee8c4afd82e9093f5efd8d3217172a7.jpg',
  'https://i.postimg.cc/J0wgqVrv/6bbe938f0420e527a4f34eee3d6a7a68.jpg',
  'https://i.postimg.cc/9MwKZFhJ/85a439f7feafb7a57852b8a530830711.jpg',
  'https://i.postimg.cc/SsY3CNh3/96ea037e6edca786b9fde92910536087.jpg',
  'https://i.postimg.cc/QtKw1xDG/d1560c2999545107f9150ea4e12c8e66.jpg',
  'https://i.postimg.cc/Tw5FgY6q/e7f13771a9e2e5d5b453073fc8711238.jpg',
  'https://i.postimg.cc/RFJyKVBd/ef21469b3e8c02e7566287c25ec70c92.jpg',
  'https://i.postimg.cc/vBxkfHsK/ff31ed3961d79e2488345ca2c089050d.jpg'
];

const GRADIENTS = [
  'linear-gradient(135deg,#ffd89b,#19547b)',
  'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(135deg,#fbc2eb,#a6c1ee)',
  'linear-gradient(135deg,#fdcbf1,#e6dee9)',
  'linear-gradient(135deg,#c1dfc4,#deecdd)',
  'linear-gradient(135deg,#d4a5a5,#a1c4fd)',
  'linear-gradient(135deg,#e0b884,#c4783a)',
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a78bfa,#ec4899)',
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(135deg,#00c6ff,#0072ff)',
  'linear-gradient(135deg,#ff9a9e,#fecfef)',
  'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)',
  'linear-gradient(135deg,#5f2c82,#49a09d)',
  'linear-gradient(135deg,#7f7fd5,#86a8e7,#91eae4)',
  'linear-gradient(135deg,#ff6e7f,#bfe9ff)'
];

const BG_SWATCHES = ['#ffffff','#000000','#e0b884','#d4a5a5','#c4783a','#84d896','#e88c7a','#8ab4f8','#c084fc','#fbbf24','#2dd4bf','#f472b6','#1a130c','#2a2015','#f5e8d4','#e0aeb0'];
const BRUSH_SWATCHES = ['#ffffff','#000000','#e0b884','#c4783a','#d4a5a5','#84d896','#e88c7a','#8ab4f8','#c084fc','#fbbf24','#2dd4bf','#f472b6'];

const FILTERS = [
  { id:'none', name:'الأصلي', cat:'basic', css:'none' },
  { id:'grayscale', name:'رمادي', cat:'basic', css:'grayscale(1)' },
  { id:'sepia', name:'سيبيا', cat:'warm', css:'sepia(.85)' },
  { id:'invert', name:'عكسي', cat:'art', css:'invert(1)' },
  { id:'vivid', name:'حيوي', cat:'warm', css:'saturate(1.6) contrast(1.15)' },
  { id:'cool', name:'بارد', cat:'cool', css:'hue-rotate(180deg) saturate(1.1)' },
  { id:'warm', name:'دافئ', cat:'warm', css:'sepia(.3) saturate(1.4)' },
  { id:'dramatic', name:'درامي', cat:'art', css:'contrast(1.5) brightness(.9)' },
  { id:'fade', name:'باهت', cat:'art', css:'contrast(.8) brightness(1.1) saturate(.85)' },
  { id:'vintage', name:'عتيق', cat:'art', css:'sepia(.5) saturate(.7) contrast(1.1)' },
  { id:'noir', name:'نوار', cat:'art', css:'grayscale(1) contrast(1.4) brightness(.9)' },
  { id:'ocean', name:'محيط', cat:'cool', css:'hue-rotate(190deg) saturate(1.3)' },
  { id:'sunset', name:'غروب', cat:'warm', css:'hue-rotate(-25deg) saturate(1.5) brightness(1.05)' },
  { id:'forest', name:'غابة', cat:'cool', css:'hue-rotate(80deg) saturate(1.2)' },
  { id:'rose', name:'وردي', cat:'warm', css:'hue-rotate(-40deg) saturate(1.3) brightness(1.08)' },
  { id:'cyan', name:'فيروزي', cat:'cool', css:'hue-rotate(160deg) saturate(1.4)' },
  { id:'neon', name:'نيون', cat:'art', css:'saturate(2) contrast(1.3) brightness(1.1)' },
  { id:'lomo', name:'لومو', cat:'art', css:'saturate(1.4) contrast(1.3) brightness(.9)' },
  { id:'polaroid', name:'بولارويد', cat:'warm', css:'sepia(.25) contrast(1.15) brightness(1.05) saturate(1.1)' },
  { id:'clarendon', name:'كلارندون', cat:'cool', css:'contrast(1.2) saturate(1.35)' },
  { id:'gingham', name:'جنجهام', cat:'cool', css:'brightness(1.05) hue-rotate(-10deg) contrast(.95) saturate(.85)' },
  { id:'moon', name:'قمر', cat:'cool', css:'grayscale(1) brightness(1.1) contrast(.9)' },
  { id:'lark', name:'لارك', cat:'cool', css:'contrast(.9) brightness(1.1) saturate(.85)' },
  { id:'reyes', name:'رييس', cat:'warm', css:'sepia(.22) brightness(1.1) contrast(.85) saturate(.75)' },
  { id:'juno', name:'جونو', cat:'warm', css:'saturate(1.4) brightness(1.05) contrast(1.05) hue-rotate(-8deg)' },
  { id:'aden', name:'عدن', cat:'warm', css:'hue-rotate(-20deg) contrast(.9) saturate(.85) brightness(1.1)' },
  { id:'perpetua', name:'بيربيتوا', cat:'cool', css:'brightness(1.05) contrast(1.1) hue-rotate(15deg)' },
  { id:'mayfair', name:'ميفير', cat:'warm', css:'contrast(1.1) saturate(1.1) brightness(1.05) hue-rotate(-15deg)' },
  { id:'amaro', name:'أمارو', cat:'cool', css:'hue-rotate(-12deg) saturate(1.5) brightness(1.05)' },
  { id:'xpro', name:'إكسبرو', cat:'art', css:'sepia(.3) saturate(1.5) hue-rotate(-15deg) contrast(1.2)' },
  { id:'toaster', name:'توستر', cat:'warm', css:'sepia(.2) contrast(1.4) brightness(.95)' },
  { id:'walden', name:'والدن', cat:'cool', css:'brightness(1.1) hue-rotate(-10deg) saturate(1.5)' }
];

const BORDERS = [
  { id:'none', name:'بدون', type:'none' },
  { id:'white', name:'أبيض', type:'solid', color:'#ffffff' },
  { id:'black', name:'أسود', type:'solid', color:'#000000' },
  { id:'gold', name:'ذهبي', type:'solid', color:'#e0b884' },
  { id:'rose', name:'وردي', type:'solid', color:'#e0aeb0' },
  { id:'violet', name:'بنفسجي', type:'solid', color:'#a78bfa' },
  { id:'cyan', name:'سماوي', type:'solid', color:'#67e8f9' },
  { id:'green', name:'أخضر', type:'solid', color:'#84d896' },
  { id:'red', name:'أحمر', type:'solid', color:'#e88c7a' },
  { id:'gradient1', name:'تدرج ذهبي', type:'gradient', c1:'#f5d8b0', c2:'#c4783a' },
  { id:'gradient2', name:'تدرج وردي', type:'gradient', c1:'#ecc8ca', c2:'#a78bfa' },
  { id:'gradient3', name:'تدرج سماوي', type:'gradient', c1:'#67e8f9', c2:'#3b82f6' }
];

const STICKERS = ['😀','😂','😍','🥰','😎','🤩','🥳','😇','🤗','😴','🤔','😏','😌','😜','🤪','😋','🍕','🍔','🍟','🍰','🎂','🍩','🍦','🍫','☕','🍷','🍹','🌹','🌸','🌺','🌻','🌼','🌈','⭐','✨','💫','⚡','🔥','💧','❄️','🌙','☀️','☁️','🌊','🎵','🎶','🎸','🎤','🎬','🎨','🎭','⚽','🏀','🎾','🎯','🎮','🎲','👑','💎','💍','🎁','🎈','🎉','❤️','💖','💕','💙','💚','💛','🧡','💜','🖤','🤍','👍','👏','🙏','💪','✌️','🤝','💯','✅','❌','⚠️','🚀','🚁','✈️','🚗','🏝️','🏔️','🗽','🏰','🗼','🌋','🐱','🐶','🐼','🦁','🦊','🐺','🦄','🐉','🦋','🐝'];

const toastEl = $('toast');
function toast(msg, type=''){
  if(!toastEl) return;
  toastEl.className = 'toast show ' + type;
  toastEl.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 3600);
}
const isEmailValid = e => { if(!e || e.length > 254) return false; return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); };
const checkPwd = p => {
  const r = { len: p.length>=8, num:/\d/.test(p), upper:/[A-Z]/.test(p), lower:/[a-z]/.test(p) };
  const valid = r.len && r.num && r.upper && r.lower;
  let lvl = 0;
  const cnt = [r.len,r.num,r.upper,r.lower].filter(Boolean).length;
  if(cnt<=1) lvl=1; else if(cnt===2) lvl=2; else if(cnt===3) lvl=3; else if(cnt===4 && p.length>=10) lvl=4; else lvl=3;
  const labels = ['','ضعيفة','متوسطة','قوية','ممتازة'];
  return { reqs:r, lvl, label:labels[lvl], valid };
};

/* LOADER */
const Loader = (() => {
  const START = performance.now(); let raf;
  const steps = [
    'بنجهّز مساحتك...', 'بنرتّب أدواتك...', 'لحظات ونبدأ...',
    'بنجهّز آخر لمسة...', 'كل شيء بقى جاهز ✨'
  ];
  function particles(){
    const c = $('fx'); if(!c) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio, 2);
    let w, h, parts = [];
    const resize = () => { w=c.width=innerWidth*dpr; h=c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; };
    resize(); addEventListener('resize', resize);
    const n = Math.min(80, Math.floor(innerWidth/18));
    for(let i=0;i<n;i++) parts.push({ x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.24*dpr, vy:(Math.random()-.5)*.24*dpr, r:(Math.random()*1.5+.4)*dpr, a:Math.random()*.5+.3, hue: 30+Math.random()*20 });
    function loop(){
      ctx.clearRect(0,0,w,h);
      for(const p of parts){
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${p.hue},75%,62%,${p.a})`;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    loop();
  }
  async function run(){
    particles();
    let p = 0;
    const fill = $('ldFill'), pct = $('ldPct'), stepEl = $('ldStep'), glowEl = $('ldGlow');
    const tick = setInterval(() => {
      p = Math.min(98, p + Math.random()*4 + 2);
      if(fill) fill.style.width = p + '%';
      if(pct) pct.textContent = Math.round(p) + '%';
      if(glowEl) glowEl.style.left = `calc(${p}% - 50px)`;
      if(stepEl){
        const idx = Math.min(steps.length - 1, Math.floor(p / (100 / steps.length)));
        stepEl.textContent = steps[idx];
      }
    }, 200);
    const el = performance.now() - START;
    await wait(Math.max(0, CONFIG.LOADER_MIN_MS - el));
    clearInterval(tick);
    if(fill) fill.style.width = '100%';
    if(pct) pct.textContent = '100%';
    if(stepEl) stepEl.textContent = steps[steps.length - 1];
    if(glowEl) glowEl.style.left = 'calc(100% - 50px)';
    await wait(250);
    $('loader')?.classList.add('hide');
    if(raf) cancelAnimationFrame(raf);
    setTimeout(() => $('loader')?.remove(), 1000);
  }
  return { run };
})();

/* API */
const API = (() => {
  async function req(path, opt={}, token=null){
    const headers = { apikey: CONFIG.SUPABASE_KEY, 'Content-Type': 'application/json', ...(opt.headers || {}) };
    if(token) headers.Authorization = `Bearer ${token}`;
    let res;
    try{ res = await fetch(CONFIG.SUPABASE_URL + path, {...opt, headers}); } catch{ const e = new Error('فشل الاتصال'); e.status = 0; throw e; }
    const text = await res.text();
    let data = null;
    try{ data = text ? JSON.parse(text) : null; }catch{ data = text; }
    if(!res.ok){ const msg = data?.message || data?.msg || data?.error_description || data?.error || data?.hint || `HTTP ${res.status}`; const e = new Error(msg); e.status = res.status; e.data = data; throw e; }
    return data;
  }
  const norm = d => ({ access_token:d.access_token, refresh_token:d.refresh_token, expires_in:d.expires_in, expires_at: Date.now()+(d.expires_in||3600)*1000, user:d.user||null });
  const login = async (email, password) => norm(await req('/auth/v1/token?grant_type=password', { method:'POST', body: JSON.stringify({email, password}) }));
  const signup = async (email, password, username) => {
    const d = await req('/auth/v1/signup', { method:'POST', body: JSON.stringify({ email, password, data:{ username } }) });
    if(!d?.access_token) return { needsConfirmation:true, user:d?.user||null };
    return norm(d);
  };
  const refresh = async s => { if(!s?.refresh_token) return null; try{ return norm(await req('/auth/v1/token?grant_type=refresh_token', { method:'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) })); }catch{ return null; } };
  const getUser = async s => { if(!s?.access_token) return null; try{ return await req('/auth/v1/user', {method:'GET'}, s.access_token); }catch{ return null; } };
  const signout = async s => { if(!s?.access_token) return; try{ await fetch(CONFIG.SUPABASE_URL+'/auth/v1/logout', {method:'POST', headers:{ apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` }}); }catch{} };
  const forgot = async email => req('/auth/v1/recover', { method:'POST', body: JSON.stringify({ email }) });
  const getProfile = async (uid, tk) => { try{ const d = await req(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=*`, {method:'GET'}, tk); return Array.isArray(d)?d[0]||null:null; }catch{ return null; } };
  const fetchOps = async (tk, uid) => { const d = await req(`/rest/v1/operations?user_id=eq.${encodeURIComponent(uid)}&deleted_at=is.null&select=*&order=created_at.desc&limit=100`, {method:'GET'}, tk); return Array.isArray(d)?d:[]; };
  const countToday = async (tk, uid) => { const d = await req(`/rest/v1/operations?user_id=eq.${encodeURIComponent(uid)}&created_at=gte.${encodeURIComponent(todayISO())}&select=id`, {method:'GET'}, tk); return Array.isArray(d)?d.length:0; };
  const saveOp = async (tk, op, rp) => { const d = await req('/rest/v1/rpc/create_removebg_operation', { method:'POST', body: JSON.stringify({ p_original_path: op, p_result_path: rp }) }, tk); return Array.isArray(d)?d[0]||null:d; };
  const delOp = async (tk, id) => req('/rest/v1/rpc/soft_delete_operation', { method:'POST', body: JSON.stringify({ p_operation_id: id }) }, tk);
  const extractPath = v => { if(!v) return null; const t = String(v); const marks = [`/storage/v1/object/public/${CONFIG.BUCKET}/`, `/storage/v1/object/${CONFIG.BUCKET}/`]; for(const m of marks){ if(t.includes(m)) return t.split(m)[1]?.split('?')[0]||null; } if(t.startsWith(`${CONFIG.BUCKET}/`)) return t.slice(CONFIG.BUCKET.length+1); if(t.startsWith('http')) return null; return t.replace(/^\/+/, '').split('?')[0]; };
  const signedUrl = async (tk, path, sec = CONFIG.SIGNED_URL_SECONDS) => { if(!path) return null; const clean = String(path).replace(/^\/+/, '').split('?')[0]; const enc = clean.split('/').map(encodeURIComponent).join('/'); try{ const d = await req(`/storage/v1/object/sign/${CONFIG.BUCKET}/${enc}`, { method:'POST', body: JSON.stringify({ expiresIn: sec }) }, tk); const u = d?.signedURL || d?.signedUrl || d?.url || d?.signed_url; if(!u) return null; return u.startsWith('http')?u:CONFIG.SUPABASE_URL+u; }catch{ return null; } };
  const publicUrl = path => { if(!path) return null; const clean = String(path).replace(/^\/+/, '').split('?')[0]; const enc = clean.split('/').map(encodeURIComponent).join('/'); return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.BUCKET}/${enc}`; };
  const resolveImg = async (v, tk) => { if(!v) return null; const p = extractPath(v); if(!p) return v; const s = await signedUrl(tk, p); return s || publicUrl(p); };
  const upload = async (tk, uid, blob, folder) => {
    const name = `${uid}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.png`;
    const r = await fetch(`${CONFIG.SUPABASE_URL}/storage/v1/object/${CONFIG.BUCKET}/${name}`, { method:'POST', headers:{ Authorization:`Bearer ${tk}`, apikey: CONFIG.SUPABASE_KEY, 'Content-Type':'image/png', 'x-upsert':'false', 'cache-control':'3600' }, body: blob });
    if(!r.ok){ const t = await r.text().catch(()=> ''); throw new Error(`فشل الرفع (${r.status}) ${t}`); }
    return name;
  };
  const removeFiles = async (tk, paths) => { const clean = paths.map(extractPath).filter(Boolean); if(!clean.length) return; try{ await req(`/storage/v1/object/${CONFIG.BUCKET}`, { method:'DELETE', body: JSON.stringify({ prefixes: clean }) }, tk); }catch{} };
  const removeBg = async file => {
    const fd = new FormData();
    fd.append('format','png'); fd.append('model','v1'); fd.append('image', file, file.name || 'image.png');
    const endpoint = CONFIG.MATTE_PROXY || CONFIG.PIXELCUT_DIRECT;
    const headers = { Accept:'application/json,text/plain,*/*', 'x-locale':'en' };
    if(!CONFIG.MATTE_PROXY && CONFIG.PIXELCUT_CLIENT_VERSION) headers['x-client-version'] = CONFIG.PIXELCUT_CLIENT_VERSION;
    const res = await fetch(endpoint, {method:'POST', headers, body: fd});
    if(!res.ok){ let err=null; try{ err = await res.json(); }catch{} throw new Error(err?.message || `فشل (${res.status})`); }
    const ct = res.headers.get('content-type') || '';
    let blob=null, ext=null;
    if(ct.includes('image/')) blob = await res.blob();
    else{ const data = await res.json(); ext = findImg(data); if(ext){ const r2 = await fetch(ext); if(!r2.ok) throw new Error('تعذر تحميل النتيجة'); blob = await r2.blob(); } }
    if(!blob) throw new Error('لا توجد نتيجة');
    return blob;
  };
  const findImg = data => { const ks = ['url','image','output','result','image_url','imageUrl','output_url','outputUrl','download_url','downloadUrl']; for(const k of ks){ const v = data?.[k]; if(typeof v==='string' && v.trim()) return v.trim(); } for(const k of ks){ const v = data?.data?.[k]; if(typeof v==='string' && v.trim()) return v.trim(); } return null; };
  const adminUsers = async (tk, s, lim=500) => { const d = await req('/rest/v1/rpc/admin_list_profiles', { method:'POST', body: JSON.stringify({ p_search: s||null, p_limit: lim }) }, tk); return Array.isArray(d)?d:[]; };
  const adminOps = async (tk, uid=null) => { const d = await req('/rest/v1/rpc/admin_list_operations', { method:'POST', body: JSON.stringify({ p_user_id: uid, p_limit: uid?200:100 }) }, tk); return Array.isArray(d)?d:[]; };
  const adminUpdate = async (tk, uid, plan, lim, ban) => req('/rest/v1/rpc/admin_update_user', { method:'POST', body: JSON.stringify({ p_user_id: uid, p_plan: plan, p_daily_limit: Number(lim), p_is_banned: !!ban }) }, tk);
  return { login, signup, refresh, getUser, signout, forgot, getProfile, fetchOps, countToday, saveOp, delOp, resolveImg, upload, removeFiles, removeBg, adminUsers, adminOps, adminUpdate };
})();

/* AUTH */
const Auth = (() => {
  let session = null, profile = null;
  const save = s => { session = s; if(s) localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(CONFIG.SESSION_KEY); };
  const saved = () => { try{ const r = localStorage.getItem(CONFIG.SESSION_KEY); return r?JSON.parse(r):null; }catch{ localStorage.removeItem(CONFIG.SESSION_KEY); return null; } };
  async function valid(){
    const s = session || saved();
    if(!s) return null;
    const exp = s.expires_at || 0;
    if(exp && Date.now() < exp - 60000){ session = s; return s; }
    const r = await API.refresh(s); save(r); return r;
  }
  async function doLogin(email, pwd){ const s = await API.login(email, pwd); if(!s.user) s.user = await API.getUser(s); if(!s.user) throw new Error('تعذر التحقق'); save(s); profile = await API.getProfile(s.user.id, s.access_token); return s; }
  async function doSignup(email, pwd, username){ const r = await API.signup(email, pwd, username); if(r.needsConfirmation) return r; if(!r.user) r.user = await API.getUser(r); if(!r.user) throw new Error('تعذر الإنشاء'); save(r); profile = await API.getProfile(r.user.id, r.access_token); return r; }
  async function doLogout(show = true){ const s = await valid(); await API.signout(s); save(null); session = null; profile = null; App.showAuth(); if(show) toast('تم تسجيل الخروج'); }
  return { valid, doLogin, doSignup, doLogout, save, get session(){ return session; }, set session(s){ session = s; }, get profile(){ return profile; }, set profile(p){ profile = p; }, isDev(){ return profile?.role === 'developer'; }, isPro(){ return profile?.plan === 'pro'; } };
})();

/* AUTH UI */
const AuthUI = (() => {
  let mode = 'login';
  const setErr = (i, el, m) => { i.classList.toggle('bad', !!m); el.textContent = m; el.classList.toggle('show', !!m); };
  const clearErr = () => { ['username','email','password','confirm'].forEach(k => { const i = $(k), e = $('err'+k[0].toUpperCase()+k.slice(1)); if(i) i.classList.remove('bad','ok'); if(e){ e.textContent=''; e.classList.remove('show'); } }); };
  const msg = (txt, type='') => { const m = $('authMsg'); if(!m) return; m.className = 'msg show ' + type; m.textContent = txt; };
  const clearMsg = () => { const m = $('authMsg'); if(!m) return; m.className = 'msg'; m.textContent = ''; };
  const setMode = m => {
    mode = m; clearErr(); clearMsg();
    const reg = m === 'register';
    $('formTitle').textContent = reg ? 'يلا نبدأ حكاية جديدة' : 'أهلًا بيك، نورتنا';
    $('formSub').textContent = reg ? 'أنشئ حسابك وابدأ مجانًا، خطوة بخطوة.' : 'سجّل دخولك وكمّل من حيث تحب.';
    $('fUsername').classList.toggle('hidden', !reg);
    $('fConfirm').classList.toggle('hidden', !reg);
    $('reqs').classList.toggle('hidden', !reg);
    $('strength').classList.toggle('hidden', !reg);
    $('submitBtn').querySelector('.btn-text').textContent = reg ? 'إنشاء الحساب' : 'تسجيل الدخول';
    $('password').placeholder = reg ? '8 أحرف + رقم + حرف كبير' : '••••••••';
    const st = $('switchText'); const sb = $('switchBtn');
    if (st) st.textContent = reg ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟';
    if (sb) sb.textContent = reg ? 'سجّل الدخول' : 'أنشئ حساباً';
    updateReqs(); checkSubmit();
  };
  const updateReqs = () => {
    if(mode !== 'register') return;
    const p = $('password').value; const c = $('confirm').value;
    const { reqs, lvl, label } = checkPwd(p);
    const all = {...reqs, match: c && c === p};
    const bars = document.querySelector('.bars'); if(bars) bars.dataset.lvl = lvl;
    const st = $('strengthTxt'); if(st) st.textContent = label;
    document.querySelectorAll('.reqs li').forEach(li => li.classList.toggle('ok', !!all[li.dataset.r]));
  };
  const checkSubmit = () => {
    const email = $('email').value.trim(); const pwd = $('password').value;
    const reg = mode === 'register';
    let ok = isEmailValid(email);
    if(reg){ const { valid } = checkPwd(pwd); ok = ok && valid; ok = ok && $('username').value.trim().length >= 3; ok = ok && $('confirm').value === pwd && $('confirm').value.length > 0; }
    else { ok = ok && pwd.length >= 1; }
    $('submitBtn').disabled = !ok;
  };
  const eye = (i, b) => { const v = i.type === 'text'; i.type = v?'password':'text'; b.style.color = v ? '' : 'var(--sand)'; };
  function translateError(e){
    const m = String(e?.message || '').toLowerCase();
    if(m.includes('invalid login')) return 'البريد أو كلمة المرور غير صحيحة';
    if(m.includes('already registered')) return 'هذا البريد مسجّل بالفعل';
    if(m.includes('email not confirmed')) return 'يرجى تأكيد بريدك أولًا';
    if(m.includes('rate limit')) return 'محاولات كثيرة، حاول لاحقًا';
    if(e?.status === 0) return 'فشل الاتصال بالإنترنت';
    return e?.message || 'حدث خطأ';
  }
  function init(){
    setMode('login');
    $('switchBtn')?.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
    $('eyePass')?.addEventListener('click', () => eye($('password'), $('eyePass')));
    $('eyeConfirm')?.addEventListener('click', () => eye($('confirm'), $('eyeConfirm')));
    const emailI = $('email');
    emailI.addEventListener('input', () => { if(isEmailValid(emailI.value.trim())){ emailI.classList.add('ok'); emailI.classList.remove('bad'); } else emailI.classList.remove('ok'); checkSubmit(); });
    $('password').addEventListener('input', () => { updateReqs(); checkSubmit(); });
    $('confirm').addEventListener('input', () => { updateReqs(); checkSubmit(); });
    $('username').addEventListener('input', checkSubmit);
    $('forgotBtn').addEventListener('click', async () => {
      const email = emailI.value.trim();
      if(!isEmailValid(email)){ msg('أدخل بريدك الإلكتروني أولًا', 'err'); return; }
      try{ await API.forgot(email); msg('تم إرسال رابط إعادة التعيين ✓', 'ok'); }catch(e){ msg(translateError(e), 'err'); }
    });
    $('authForm').addEventListener('submit', async e => {
      e.preventDefault(); clearErr(); clearMsg();
      const email = emailI.value.trim(); const pwd = $('password').value;
      if(!isEmailValid(email)){ setErr(emailI, $('errEmail'), 'بريد غير صحيح'); return; }
      if(mode === 'register'){
        const un = $('username').value.trim();
        if(!/^[a-zA-Z0-9_]{3,20}$/.test(un)){ setErr($('username'), $('errUsername'), 'أحرف وأرقام و _ (3-20)'); return; }
        const { valid } = checkPwd(pwd);
        if(!valid){ setErr($('password'), $('errPassword'), 'كلمة المرور ضعيفة'); return; }
        if($('confirm').value !== pwd){ setErr($('confirm'), $('errConfirm'), 'كلمتا المرور مختلفتان'); return; }
      } else { if(pwd.length < 1){ setErr($('password'), $('errPassword'), 'أدخل كلمة المرور'); return; } }
      const btn = $('submitBtn'); const txt = btn.querySelector('.btn-text'); const original = txt.textContent;
      btn.disabled = true; txt.textContent = mode === 'login' ? 'جاري الدخول...' : 'جاري الإنشاء...';
      try{
        if(mode === 'login'){
          await Auth.doLogin(email, pwd);
          if(Auth.profile?.is_banned){ await Auth.doLogout(false); msg('هذا الحساب موقوف', 'err'); return; }
          toast(`أهلًا ${Auth.profile?.username || 'بيك'}، نورت الاستوديو ✨`, 'ok');
          await App.enterApp();
        } else {
          const r = await Auth.doSignup(email, pwd, $('username').value.trim());
          if(r.needsConfirmation){ msg('تم إنشاء الحساب ✓\nتحقق من بريدك لتفعيله.', 'ok'); return; }
          toast('حسابك جاهز — أهلًا بيك في الاستوديو ✨', 'ok'); await App.enterApp();
        }
        ['email','password','username','confirm'].forEach(k => { const el = $(k); if(el) el.value = ''; });
      }catch(err){ msg(translateError(err), 'err'); }
      finally{ btn.disabled = false; txt.textContent = original; checkSubmit(); }
    });
  }
  return { init, checkSubmit };
})();

/* EDITOR */
const Editor = (() => {
  let originalImage = null, currentImage = null;
  let bgRemoved = false;
  let fgCanvas = document.createElement('canvas');
  let mainCanvas = null;
  let strokes = [], texts = [], stickers = [];
  let textIdCounter = 0, stickerIdCounter = 0;
  let adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
  let filterId = 'none', filterIntensity = 1;
  let filterCategory = 'all';
  let border = { id:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
  let brushColor = '#e0b884', brushSize = 8, brushOpacity = 1, drawMode = 'brush';
  let currentBg = { type:'original' };
  let bgImage = null, bgColorValue = '#e0b884';
  let drawing = false, currentStroke = null;
  let zoom = 1;
  let initDone = false;
  let finalBlob = null;
  let imgScale = 1, imgAlpha = 1, imgOffsetX = 0, imgOffsetY = 0;
  let activePanel = null;
  let selectedId = null;
  let dragMode = null, dragStartPt = null, dragItemState = null;
  let touchPoints = new Map(), pinchState = null;
  let renderQueued = false, renderImmediate = false;
  let cropActive = false;
  let cropRatio = 'free';
  let cropRect = null;
  let cropDragMode = null;
  let cropDragStart = null;
  let cropStartRect = null;

  const $c = id => document.getElementById(id);

  function init(){
    if (initDone) return; initDone = true;
    mainCanvas = $c('mainCanvas');

    const pw = $c('presets');
    if (pw) PRESETS.forEach(url => {
      const el = document.createElement('div');
      el.className = 'preset';
      el.innerHTML = `<img src="${url}" alt="" loading="lazy" crossorigin="anonymous">`;
      el.addEventListener('click', async () => {
        document.querySelectorAll('.preset').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        await setBgSafe({ type:'preset', value:url });
      });
      pw.appendChild(el);
    });

    const gg = $c('gradientsGrid');
    if (gg) GRADIENTS.forEach((g, idx) => {
      const el = document.createElement('div');
      el.className = 'gradient-item';
      el.style.background = g;
      el.addEventListener('click', async () => {
        document.querySelectorAll('.gradient-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        await setBgSafe({ type:'gradient', value:g });
      });
      gg.appendChild(el);
    });

    const bs = $c('brushSwatches');
    if (bs) BRUSH_SWATCHES.forEach(c => {
      const s = document.createElement('div');
      s.className = 'swatch'; s.style.background = c;
      s.addEventListener('click', () => {
        brushColor = c; $c('brushColor').value = c;
        document.querySelectorAll('#brushSwatches .swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
      });
      bs.appendChild(s);
    });

    const bgs = $c('bgSwatches');
    if (bgs) BG_SWATCHES.forEach(c => {
      const s = document.createElement('div');
      s.className = 'swatch'; s.style.background = c;
      s.addEventListener('click', async () => {
        bgColorValue = c; $c('bgColor').value = c;
        document.querySelectorAll('#bgSwatches .swatch').forEach(x => x.classList.remove('active'));
        s.classList.add('active');
        await setBgSafe({ type:'color', value:c });
      });
      bgs.appendChild(s);
    });

    buildFilterThumbs();

    const bgGrid = $c('bordersGrid');
    if (bgGrid) BORDERS.forEach(b => {
      const el = document.createElement('div');
      el.className = 'border-item';
      el.dataset.border = b.id;
      const prev = document.createElement('div');
      prev.className = 'bi-preview';
      if (b.type === 'solid'){ prev.style.border = `6px solid ${b.color}`; prev.style.background = 'transparent'; }
      else if (b.type === 'gradient'){ prev.style.background = `linear-gradient(135deg,${b.c1},${b.c2})`; }
      el.appendChild(prev);
      const lab = document.createElement('div');
      lab.className = 'bi-label';
      lab.textContent = b.name;
      el.appendChild(lab);
      el.addEventListener('click', () => {
        document.querySelectorAll('.border-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        border.id = b.id;
        border.type = b.type;
        border.color = b.color;
        border.c1 = b.c1;
        border.c2 = b.c2;
        render();
      });
      bgGrid.appendChild(el);
    });

    const sg = $c('stickersGrid');
    if (sg) STICKERS.forEach(em => {
      const el = document.createElement('div');
      el.className = 'sticker-item';
      el.textContent = em;
      el.addEventListener('click', () => addSticker(em));
      sg.appendChild(el);
    });

    document.querySelectorAll('.fc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fc-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        filterCategory = btn.dataset.fc;
        filterThumbsVisibility();
      });
    });

    document.querySelectorAll('.tool').forEach(btn => btn.addEventListener('click', () => openPanel(btn.dataset.tool)));
    document.querySelectorAll('.panel-close').forEach(btn => btn.addEventListener('click', () => closePanel(btn.dataset.closePanel)));

    document.querySelectorAll('.subtab').forEach(tab => tab.addEventListener('click', async () => {
      const m = tab.dataset.bg;
      document.querySelectorAll('.subtab').forEach(x => x.classList.toggle('active', x === tab));
      document.querySelectorAll('.bg-content').forEach(c => c.classList.toggle('hidden', c.dataset.bgcontent !== m));
      if (m === 'transparent'){ if (!bgRemoved){ await autoRemoveBackground(); } setBg({ type:'checker' }); }
      else if (m === 'original'){ setBg({ type:'original' }); }
    }));

    document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
      btn.classList.add('active'); drawMode = btn.dataset.drawmode;
    }));

    $c('brushSize')?.addEventListener('input', e => { brushSize = +e.target.value; $c('valBrushSize').textContent = brushSize + 'px'; });
    $c('brushColor')?.addEventListener('input', e => { brushColor = e.target.value; });
    $c('brushOpacity')?.addEventListener('input', e => { brushOpacity = e.target.value/100; $c('valBrushOpacity').textContent = e.target.value + '%'; });

    const adjMap = [
      ['rangeBrightness','brightness','valBrightness','%'],
      ['rangeContrast','contrast','valContrast','%'],
      ['rangeSaturation','saturation','valSaturation','%'],
      ['rangeSharpen','sharpen','valSharpen','%'],
      ['rangeHue','hue','valHue','°'],
      ['rangeTemp','temp','valTemp',''],
      ['rangeBlur','blur','valBlur','px'],
      ['rangeVignette','vignette','valVignette','%'],
      ['rangeOpacity','opacity','valOpacity','%']
    ];
    adjMap.forEach(([id, key, valId, sfx]) => $c(id)?.addEventListener('input', e => {
      adjustments[key] = +e.target.value;
      if ($c(valId)) $c(valId).textContent = e.target.value + sfx;
      render();
    }));

    $c('rangeFilterIntensity')?.addEventListener('input', e => { filterIntensity = e.target.value/100; $c('valFilterIntensity').textContent = e.target.value + '%'; render(); });
    $c('rangeScale')?.addEventListener('input', e => { imgScale = e.target.value/100; $c('valScale').textContent = e.target.value + '%'; render(); });
    $c('rangeAlpha')?.addEventListener('input', e => { imgAlpha = e.target.value/100; $c('valAlpha').textContent = e.target.value + '%'; render(); });
    $c('rangeBorderWidth')?.addEventListener('input', e => { border.width = +e.target.value; $c('valBorderWidth').textContent = e.target.value + 'px'; render(); });

    $c('textSize')?.addEventListener('input', e => { $c('valTextSize').textContent = e.target.value + 'px'; });

    $c('btnAddText')?.addEventListener('click', () => {
      const text = $c('textInput').value.trim();
      if (!text) return toast('اكتب نصاً أولاً', 'err');
      const base = currentImage || originalImage;
      if (!base) return;
      const id = ++textIdCounter;
      texts.push({
        id, text,
        x: base.naturalWidth/2, y: base.naturalHeight/2,
        size: +$c('textSize').value,
        color: $c('textColor').value,
        font: $c('textFont').value,
        bg: $c('textBg').value,
        shadow: $c('textShadow').value
      });
      $c('textInput').value = '';
      selectedId = id;
      render();
      toast('أضف النص ✓ اسحبه على الصورة', 'ok');
    });

    const uz = $c('bgUploadZone'); const fi = $c('bgFile');
    $c('bgChoose')?.addEventListener('click', e => { e.stopPropagation(); fi.click(); });
    uz?.addEventListener('click', () => fi.click());
    fi?.addEventListener('change', () => { const f = fi.files?.[0]; fi.value = ''; if (f) handleBgUpload(f); });
    $c('bgColor')?.addEventListener('input', async e => { bgColorValue = e.target.value; await setBgSafe({ type:'color', value:bgColorValue }); });

    if (mainCanvas){
      mainCanvas.style.touchAction = 'none';
      mainCanvas.addEventListener('pointerdown', onPointerDown, { passive:false });
      mainCanvas.addEventListener('pointermove', onPointerMove, { passive:false });
      mainCanvas.addEventListener('pointerup', onPointerUp);
      mainCanvas.addEventListener('pointercancel', onPointerUp);
      mainCanvas.addEventListener('wheel', onWheel, { passive:false });
      mainCanvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    $c('zoomIn')?.addEventListener('click', () => { zoom = Math.min(3, zoom + .1); applyZoom(); });
    $c('zoomOut')?.addEventListener('click', () => { zoom = Math.max(.3, zoom - .1); applyZoom(); });
    $c('zoomReset')?.addEventListener('click', () => { zoom = 1; applyZoom(); });

    $c('btnUndo')?.addEventListener('click', undo);
    $c('btnReset')?.addEventListener('click', resetAll);
    $c('btnClearDraw')?.addEventListener('click', () => {
      if (!strokes.length && !texts.length && !stickers.length) return toast('لا يوجد شي', 'err');
      strokes = []; texts = []; stickers = []; selectedId = null; render(); toast('تم المسح ✓', 'ok');
    });
    $c('btnResetAdjust')?.addEventListener('click', resetAdjustments);
    $c('btnAuto')?.addEventListener('click', autoEnhance);
    $c('btnRemoveBg')?.addEventListener('click', () => removeBackground(false));
    $c('btnSave')?.addEventListener('click', saveImage);
    $c('btnDownload')?.addEventListener('click', () => {
      if (!finalBlob) return toast('احفظ أولاً', 'err');
      downloadBlob(finalBlob, `removebg-${Date.now()}.png`);
      toast('تم التحميل ✓', 'ok');
    });
    $c('btnNewImg')?.addEventListener('click', () => { reset(); toast('ارفع صورة جديدة'); });

    initCrop();
    initCropDrag();

    const stage = $c('uploadStage'); const fileInput = $c('fileInput');
    $c('chooseBtn')?.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    stage?.addEventListener('click', e => { if (e.target.closest('button')) return; fileInput.click(); });
    ['dragenter','dragover'].forEach(n => stage?.addEventListener(n, e => { e.preventDefault(); stage.classList.add('drag'); }));
    ['dragleave','drop'].forEach(n => stage?.addEventListener(n, e => { e.preventDefault(); stage.classList.remove('drag'); }));
    stage?.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); });
    fileInput.addEventListener('change', () => { const f = fileInput.files?.[0]; fileInput.value = ''; if (f) handleFile(f); });
  }

  function buildFilterThumbs(){
    const grid = $c('filtersGrid');
    if (!grid) return;
    grid.innerHTML = '';
    FILTERS.forEach(f => {
      const el = document.createElement('div');
      el.className = 'filter-thumb' + (f.id === 'none' ? ' active' : '');
      el.dataset.filter = f.id;
      el.dataset.cat = f.cat;

      const canvas = document.createElement('canvas');
      canvas.width = 120; canvas.height = 120;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 120, 120);
      grad.addColorStop(0, '#e0b884');
      grad.addColorStop(.5, '#c4783a');
      grad.addColorStop(1, '#e0aeb0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 120, 120);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.arc(70, 45, 25, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(15, 75, 90, 30);
      if (f.css !== 'none'){ canvas.style.filter = f.css; }

      el.appendChild(canvas);

      const lab = document.createElement('div');
      lab.className = 'thumb-label';
      lab.textContent = f.name;
      el.appendChild(lab);

      el.addEventListener('click', () => {
        document.querySelectorAll('.filter-thumb').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        filterId = f.id;
        render();
      });
      grid.appendChild(el);
    });
  }
  function filterThumbsVisibility(){
    document.querySelectorAll('.filter-thumb').forEach(el => {
      if (filterCategory === 'all' || el.dataset.cat === filterCategory) el.style.display = '';
      else el.style.display = 'none';
    });
  }

  function addSticker(em){
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');
    const id = 1000 + (++stickerIdCounter);
    stickers.push({
      id, emoji: em,
      x: base.naturalWidth / 2,
      y: base.naturalHeight / 2,
      size: Math.round(base.naturalWidth / 8)
    });
    selectedId = id;
    render();
    toast('أضف الملصق ✓ اسحبه على الصورة', 'ok');
  }

  function autoEnhance(){
    if (!originalImage && !currentImage) return toast('لا توجد صورة', 'err');
    adjustments.brightness = 108;
    adjustments.contrast = 112;
    adjustments.saturation = 115;
    adjustments.sharpen = 25;
    adjustments.hue = 0;
    adjustments.temp = 8;
    adjustments.blur = 0;
    adjustments.vignette = 12;
    $c('rangeBrightness').value = 108; $c('valBrightness').textContent = '108%';
    $c('rangeContrast').value = 112; $c('valContrast').textContent = '112%';
    $c('rangeSaturation').value = 115; $c('valSaturation').textContent = '115%';
    $c('rangeSharpen').value = 25; $c('valSharpen').textContent = '25%';
    $c('rangeTemp').value = 8; $c('valTemp').textContent = '8';
    $c('rangeVignette').value = 12; $c('valVignette').textContent = '12%';
    render();
    toast('✨ تم تحسين الصورة تلقائياً', 'ok');
  }

  function initCrop(){
    document.querySelectorAll('.crop-ratio').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.crop-ratio').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        cropRatio = btn.dataset.ratio;
        if (cropActive) applyRatioToCrop();
      });
    });
    document.querySelectorAll('.crop-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'rot-left') rotateImage(-90);
        if (act === 'rot-right') rotateImage(90);
        if (act === 'flip-h') flipImage('h');
        if (act === 'flip-v') flipImage('v');
      });
    });
    $c('btnCropReset')?.addEventListener('click', () => {
      if (!cropActive) return;
      cropRatio = 'free';
      document.querySelectorAll('.crop-ratio').forEach(x => x.classList.toggle('active', x.dataset.ratio === 'free'));
      showDefaultCrop();
      toast('تم إعادة الضبط');
    });
    $c('btnCropApply')?.addEventListener('click', applyCrop);
  }
  function initCropDrag(){
    const box = $c('cropBox');
    if (!box) return;
    box.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('crop-handle')){
        cropDragMode = 'resize';
        cropDragStart = { x: e.clientX, y: e.clientY };
        cropStartRect = { ...cropRect, handle: e.target.dataset.h };
      } else {
        cropDragMode = 'move';
        cropDragStart = { x: e.clientX, y: e.clientY };
        cropStartRect = { ...cropRect };
      }
      try{ box.setPointerCapture(e.pointerId); }catch{}
      e.stopPropagation(); e.preventDefault();
    });
    box.addEventListener('pointermove', e => {
      if (!cropDragMode) return;
      const canvasRect = mainCanvas.getBoundingClientRect();
      const sx = mainCanvas.width / canvasRect.width;
      const sy = mainCanvas.height / canvasRect.height;
      const dx = (e.clientX - cropDragStart.x) * sx;
      const dy = (e.clientY - cropDragStart.y) * sy;
      if (cropDragMode === 'move'){
        cropRect.x = clamp(cropStartRect.x + dx, 0, mainCanvas.width - cropRect.w);
        cropRect.y = clamp(cropStartRect.y + dy, 0, mainCanvas.height - cropRect.h);
      } else {
        const h = cropStartRect.handle;
        let x = cropStartRect.x, y = cropStartRect.y, w = cropStartRect.w, hh = cropStartRect.h;
        const minSize = 30;
        if (h === 'tl'){ x = cropStartRect.x + dx; y = cropStartRect.y + dy; w = cropStartRect.w - dx; hh = cropStartRect.h - dy; }
        if (h === 'tr'){ y = cropStartRect.y + dy; w = cropStartRect.w + dx; hh = cropStartRect.h - dy; }
        if (h === 'bl'){ x = cropStartRect.x + dx; w = cropStartRect.w - dx; hh = cropStartRect.h + dy; }
        if (h === 'br'){ w = cropStartRect.w + dx; hh = cropStartRect.h + dy; }
        if (h === 't'){ y = cropStartRect.y + dy; hh = cropStartRect.h - dy; }
        if (h === 'b'){ hh = cropStartRect.h + dy; }
        if (h === 'l'){ x = cropStartRect.x + dx; w = cropStartRect.w - dx; }
        if (h === 'r'){ w = cropStartRect.w + dx; }
        if (w < minSize){ w = minSize; if (h.includes('l')) x = cropStartRect.x + cropStartRect.w - minSize; }
        if (hh < minSize){ hh = minSize; if (h.includes('t')) y = cropStartRect.y + cropStartRect.h - minSize; }
        if (cropRatio !== 'free'){
          const [rw, rh] = cropRatio.split(':').map(Number);
          const targetR = rw / rh;
          if (h === 'br' || h === 'tl' || h === 'tr' || h === 'bl') hh = w / targetR;
        }
        cropRect = { x, y, w, h: hh };
      }
      cropRect.x = clamp(cropRect.x, 0, mainCanvas.width);
      cropRect.y = clamp(cropRect.y, 0, mainCanvas.height);
      cropRect.w = Math.min(cropRect.w, mainCanvas.width - cropRect.x);
      cropRect.h = Math.min(cropRect.h, mainCanvas.height - cropRect.y);
      updateCropOverlay();
    });
    box.addEventListener('pointerup', e => { cropDragMode = null; try{ box.releasePointerCapture(e.pointerId); }catch{} });
    box.addEventListener('pointercancel', e => { cropDragMode = null; try{ box.releasePointerCapture(e.pointerId); }catch{} });
  }
  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function showDefaultCrop(){
    if (!mainCanvas) return;
    const w = mainCanvas.width * .8;
    const h = mainCanvas.height * .8;
    cropRect = { x: (mainCanvas.width - w) / 2, y: (mainCanvas.height - h) / 2, w, h };
    cropActive = true;
    $c('cropOverlay')?.classList.remove('hidden');
    updateCropOverlay();
  }
  function applyRatioToCrop(){
    if (!cropRect || cropRatio === 'free') return;
    const [rw, rh] = cropRatio.split(':').map(Number);
    const targetR = rw / rh;
    const cx = cropRect.x + cropRect.w / 2;
    const cy = cropRect.y + cropRect.h / 2;
    let nw = cropRect.w;
    let nh = nw / targetR;
    if (nh > cropRect.h){ nh = cropRect.h; nw = nh * targetR; }
    cropRect.x = cx - nw / 2;
    cropRect.y = cy - nh / 2;
    cropRect.w = nw; cropRect.h = nh;
    if (cropRect.x < 0) cropRect.x = 0;
    if (cropRect.y < 0) cropRect.y = 0;
    if (cropRect.x + cropRect.w > mainCanvas.width) cropRect.x = mainCanvas.width - cropRect.w;
    if (cropRect.y + cropRect.h > mainCanvas.height) cropRect.y = mainCanvas.height - cropRect.h;
    updateCropOverlay();
  }
  function updateCropOverlay(){
    if (!cropRect || !mainCanvas) return;
    const canvasRect = mainCanvas.getBoundingClientRect();
    const wrapRect = $c('canvasWrap').getBoundingClientRect();
    const sx = canvasRect.width / mainCanvas.width;
    const sy = canvasRect.height / mainCanvas.height;
    const x = (canvasRect.left - wrapRect.left) + cropRect.x * sx;
    const y = (canvasRect.top - wrapRect.top) + cropRect.y * sy;
    const w = cropRect.w * sx;
    const h = cropRect.h * sy;
    const box = $c('cropBox');
    box.style.left = x + 'px'; box.style.top = y + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    const overlay = $c('cropOverlay');
    overlay.querySelector('.crop-mask.t').style.height = y + 'px';
    overlay.querySelector('.crop-mask.b').style.height = (wrapRect.height - y - h) + 'px';
    overlay.querySelector('.crop-mask.l').style.width = x + 'px';
    overlay.querySelector('.crop-mask.l').style.top = y + 'px';
    overlay.querySelector('.crop-mask.l').style.height = h + 'px';
    overlay.querySelector('.crop-mask.r').style.width = (wrapRect.width - x - w) + 'px';
    overlay.querySelector('.crop-mask.r').style.top = y + 'px';
    overlay.querySelector('.crop-mask.r').style.height = h + 'px';
    const dimEl = $c('cropDim');
    if (dimEl) dimEl.textContent = `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)}`;
  }
  function applyCrop(){
    if (!cropActive || !cropRect) return toast('فعّل أداة القص أولاً', 'err');
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const c = document.createElement('canvas');
    c.width = Math.round(cropRect.w);
    c.height = Math.round(cropRect.h);
    c.getContext('2d').drawImage(base, Math.round(cropRect.x), Math.round(cropRect.y), Math.round(cropRect.w), Math.round(cropRect.h), 0, 0, c.width, c.height);
    const img = new Image();
    img.onload = () => {
      currentImage = img; originalImage = img;
      imgScale = 1; imgOffsetX = 0; imgOffsetY = 0;
      if ($c('rangeScale')) $c('rangeScale').value = 100;
      if ($c('valScale')) $c('valScale').textContent = '100%';
      cropActive = false;
      $c('cropOverlay')?.classList.add('hidden');
      render();
      toast('تم القص ✓', 'ok');
    };
    img.src = c.toDataURL('image/png');
  }
  function rotateImage(deg){
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const W = base.naturalWidth, H = base.naturalHeight;
    const rad = deg * Math.PI / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const newW = Math.round(W * cos + H * sin);
    const newH = Math.round(W * sin + H * cos);
    const c = document.createElement('canvas');
    c.width = newW; c.height = newH;
    const ctx = c.getContext('2d');
    ctx.translate(newW/2, newH/2); ctx.rotate(rad);
    ctx.drawImage(base, -W/2, -H/2);
    const img = new Image();
    img.onload = () => {
      currentImage = img; originalImage = img;
      imgScale = 1; imgOffsetX = 0; imgOffsetY = 0;
      if ($c('rangeScale')) $c('rangeScale').value = 100;
      if ($c('valScale')) $c('valScale').textContent = '100%';
      render();
      if (cropActive) showDefaultCrop();
      toast('تم التدوير ✓', 'ok');
    };
    img.src = c.toDataURL('image/png');
  }
  function flipImage(dir){
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const W = base.naturalWidth, H = base.naturalHeight;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    if (dir === 'h'){ ctx.translate(W, 0); ctx.scale(-1, 1); }
    else { ctx.translate(0, H); ctx.scale(1, -1); }
    ctx.drawImage(base, 0, 0);
    const img = new Image();
    img.onload = () => {
      currentImage = img; originalImage = img;
      render();
      if (cropActive) showDefaultCrop();
      toast('تم الانعكاس ✓', 'ok');
    };
    img.src = c.toDataURL('image/png');
  }

  async function setBgSafe(bg){
    if (!bgRemoved && (bg.type === 'preset' || bg.type === 'upload' || bg.type === 'color' || bg.type === 'gradient')){
      const ok = await autoRemoveBackground();
      if (!ok) return;
    }
    setBg(bg);
  }
  async function autoRemoveBackground(){
    if (bgRemoved) return true;
    toast('جاري إزالة الخلفية تلقائياً...', 'ok');
    return await removeBackground(true);
  }
  function setBg(bg){
    currentBg = bg;
    if (bg.type === 'preset' || bg.type === 'upload'){
      bgImage = new Image();
      if (bg.type === 'preset') bgImage.crossOrigin = 'anonymous';
      bgImage.onload = render;
      bgImage.onerror = () => toast('تعذر تحميل الخلفية', 'err');
      bgImage.src = bg.value;
    } else bgImage = null;
    render();
  }
  function handleBgUpload(file){
    if (!file.type.startsWith('image/')) return toast('صيغة غير مدعومة', 'err');
    if (file.size > 10*1024*1024) return toast('الحجم > 10MB', 'err');
    const url = URL.createObjectURL(file);
    setBgSafe({ type:'upload', value:url });
    toast('تم تحميل الخلفية ✓', 'ok');
  }

  function openPanel(name){
    if (activePanel === name){ closePanel(name); return; }
    activePanel = name;
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
    document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t.dataset.tool === name));
    if (name === 'crop'){
      if (!currentImage && !originalImage){ toast('ارفع صورة أولاً', 'err'); activePanel = null; document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden')); document.querySelectorAll('.tool').forEach(t => t.classList.remove('active')); return; }
      showDefaultCrop();
      toast('اسحب الحواف لتحديد منطقة القص ✓', 'ok');
    } else if (name === 'draw'){
      cropActive = false;
      $c('cropOverlay')?.classList.add('hidden');
      if (mainCanvas) mainCanvas.classList.add('tool-brush');
    } else {
      cropActive = false;
      $c('cropOverlay')?.classList.add('hidden');
      if (name !== 'text' && name !== 'stickers'){ selectedId = null; render(); }
    }
    if (name !== 'draw' && mainCanvas) mainCanvas.classList.remove('tool-brush');
    document.querySelector('.ws-panels')?.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  function closePanel(){
    activePanel = null;
    cropActive = false;
    $c('cropOverlay')?.classList.add('hidden');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    if (mainCanvas) mainCanvas.classList.remove('tool-brush');
    selectedId = null;
    render();
  }
  function applyZoom(){
    if (mainCanvas) mainCanvas.style.transform = `scale(${zoom})`;
    if ($c('zoomVal')) $c('zoomVal').textContent = Math.round(zoom*100) + '%';
    if (cropActive) updateCropOverlay();
  }

  async function handleFile(file){
    const allowed = ['image/png','image/jpeg','image/webp'];
    if (!allowed.includes(file.type)) return toast('صيغة غير مدعومة', 'err');
    if (file.size > (CONFIG.MAX_FILE_MB * 1024 * 1024)) return toast(`الحجم > ${CONFIG.MAX_FILE_MB}MB`, 'err');
    await loadOriginal(file);
    $c('uploadStage')?.classList.add('hidden');
    $c('workspace')?.classList.remove('hidden');
    $c('btnDownload')?.classList.add('hidden');
    finalBlob = null;
    toast('الصورة جاهزة ✓', 'ok');
  }
  function loadOriginal(file){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        originalImage = img; currentImage = img;
        bgRemoved = false;
        strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0;
        currentBg = { type:'original' };
        adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
        filterId = 'none'; filterIntensity = 1;
        border = { id:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
        imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
        selectedId = null;
        const defs = { rangeBrightness:100, rangeContrast:100, rangeSaturation:100, rangeSharpen:0, rangeHue:0, rangeTemp:0, rangeBlur:0, rangeVignette:0, rangeOpacity:100 };
        Object.keys(defs).forEach(id => { const el = $c(id); if(el) el.value = defs[id]; });
        $c('valBrightness').textContent = '100%';
        $c('valContrast').textContent = '100%';
        $c('valSaturation').textContent = '100%';
        $c('valSharpen').textContent = '0%';
        $c('valHue').textContent = '0°';
        $c('valTemp').textContent = '0';
        $c('valBlur').textContent = '0px';
        $c('valVignette').textContent = '0%';
        $c('valOpacity').textContent = '100%';
        $c('rangeScale').value = 100; $c('valScale').textContent = '100%';
        $c('rangeAlpha').value = 100; $c('valAlpha').textContent = '100%';
        document.querySelectorAll('.filter-thumb').forEach(x => x.classList.toggle('active', x.dataset.filter === 'none'));
        document.querySelectorAll('.border-item').forEach(x => x.classList.toggle('active', x.dataset.border === 'none'));
        document.querySelectorAll('.gradient-item').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.subtab').forEach(x => x.classList.toggle('active', x.dataset.bg === 'original'));
        document.querySelectorAll('.bg-content').forEach(c => c.classList.toggle('hidden', c.dataset.bgcontent !== 'original'));
        closePanel();
        render();
        applyZoom();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function removeBackground(silent = false){
    const btn = $c('btnRemoveBg');
    const loading = $c('canvasLoading');
    const loadingText = $c('canvasLoadingText');
    const base = currentImage || originalImage;
    if (!base){ if(!silent) toast('ارفع صورة أولاً', 'err'); return false; }
    const s = await Auth.valid();
    if (!s?.access_token || !s?.user?.id){ toast('انتهت الجلسة', 'err'); App.showAuth(); return false; }
    Auth.session = s;
    if (!Auth.profile) Auth.profile = await API.getProfile(s.user.id, s.access_token);
    if (Auth.profile?.is_banned){ if(!silent) toast('الحساب موقوف', 'err'); return false; }
    if (!Auth.isPro()){
      const today = await API.countToday(s.access_token, s.user.id).catch(()=>0);
      const lim = Number(Auth.profile?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
      if (lim > 0 && today >= lim){ toast(`وصلت للحد اليومي (${lim})`, 'err'); return false; }
    }
    if (btn) btn.disabled = true;
    if (loadingText) loadingText.textContent = 'جاري إزالة الخلفية...';
    loading?.classList.remove('hidden');
    try {
      const c = document.createElement('canvas');
      c.width = base.naturalWidth; c.height = base.naturalHeight;
      c.getContext('2d').drawImage(base, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'source.png', { type:'image/png' });
      const origPath = await API.upload(s.access_token, s.user.id, file, 'orig').catch(()=>null);
      const resultBlob = await API.removeBg(file);
      const resPath = await API.upload(s.access_token, s.user.id, resultBlob, 'res').catch(()=>null);
      if (origPath && resPath) await API.saveOp(s.access_token, origPath, resPath).catch(()=>{});
      await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(resultBlob);
        const img = new Image();
        img.onload = () => { currentImage = img; bgRemoved = true; render(); resolve(); };
        img.onerror = reject;
        img.src = url;
      });
      if (App.refreshUsage) App.refreshUsage();
      if (!silent) toast('تمت إزالة الخلفية ✓', 'ok');
      return true;
    } catch(e){
      console.error(e); toast(e.message || 'فشلت العملية', 'err'); return false;
    } finally {
      if (btn) btn.disabled = false;
      loading?.classList.add('hidden');
    }
  }

  function getCanvasPoint(e){
    const rect = mainCanvas.getBoundingClientRect();
    const sx = mainCanvas.width / rect.width;
    const sy = mainCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }
  function getImageBox(){
    const base = currentImage || originalImage;
    if (!base) return null;
    const W = base.naturalWidth, H = base.naturalHeight;
    const w = W * imgScale, h = H * imgScale;
    const cx = W/2 + imgOffsetX, cy = H/2 + imgOffsetY;
    return { x: cx - w/2, y: cy - h/2, w, h, cx, cy };
  }
  function getTextBox(t, ctx){
    ctx.save(); ctx.font = `bold ${t.size}px ${t.font}`;
    const tw = ctx.measureText(t.text).width; ctx.restore();
    const pad = t.size * .3;
    const w = tw + pad*2, h = t.size + pad*1.4;
    return { x: t.x - w/2, y: t.y - h/2, w, h, cx: t.x, cy: t.y };
  }
  function getStickerBox(s){
    return { x: s.x - s.size/2, y: s.y - s.size/2, w: s.size, h: s.size, cx: s.x, cy: s.y };
  }
  function hitHandle(pt, box, r){
    const cs = [
      { x: box.x, y: box.y, c:'tl' },
      { x: box.x + box.w, y: box.y, c:'tr' },
      { x: box.x, y: box.y + box.h, c:'bl' },
      { x: box.x + box.w, y: box.y + box.h, c:'br' }
    ];
    for (const c of cs) if (Math.hypot(pt.x - c.x, pt.y - c.y) <= r) return c.c;
    return null;
  }
  function inBox(pt, box){ return pt.x >= box.x && pt.x <= box.x + box.w && pt.y >= box.y && pt.y <= box.y + box.h; }

  function onPointerDown(e){
    if (cropActive) return;
    const base = currentImage || originalImage;
    if (!base) return;
    renderImmediate = true;
    touchPoints.set(e.pointerId, { x:e.clientX, y:e.clientY });

    if (touchPoints.size === 2){
      const pts = [...touchPoints.values()];
      pinchState = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), item: selectedId };
      if (selectedId === 'image') pinchState.startScale = imgScale;
      else if (typeof selectedId === 'number' && selectedId > 1000){
        const s = stickers.find(x => x.id === selectedId); if(s) pinchState.startSize = s.size;
      } else if (typeof selectedId === 'number'){
        const t = texts.find(x => x.id === selectedId); if (t) pinchState.startSize = t.size;
      }
      return;
    }

    const pt = getCanvasPoint(e);
    const ctx = mainCanvas.getContext('2d');
    const handleR = Math.max(24, mainCanvas.width * 0.05);

    if (activePanel === 'draw' && selectedId === null){
      drawing = true;
      currentStroke = { tool: drawMode, color: brushColor, size: brushSize, opacity: brushOpacity, points:[pt] };
      mainCanvas.classList.add('dragging');
      try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
      return;
    }

    if (selectedId !== null){
      let selBox = null;
      if (selectedId === 'image') selBox = getImageBox();
      else if (selectedId > 1000){ const s = stickers.find(x => x.id === selectedId); if(s) selBox = getStickerBox(s); }
      else { const t = texts.find(x => x.id === selectedId); if (t) selBox = getTextBox(t, ctx); }
      if (selBox){
        const h = hitHandle(pt, selBox, handleR);
        if (h){
          dragMode = 'resize';
          dragStartPt = pt;
          dragItemState = { id: selectedId, startScale: imgScale, startBox: {...selBox} };
          if (selectedId === 'image') dragItemState.startSize = null;
          else if (selectedId > 1000){ const s = stickers.find(x => x.id === selectedId); dragItemState.startSize = s?.size; }
          else { const t = texts.find(x => x.id === selectedId); dragItemState.startSize = t?.size; }
          try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
          return;
        }
      }
    }

    for (let i = stickers.length - 1; i >= 0; i--){
      const s = stickers[i]; const box = getStickerBox(s);
      if (inBox(pt, box)){
        selectedId = s.id;
        dragMode = 'move';
        dragStartPt = pt;
        dragItemState = { id: s.id, startX: s.x, startY: s.y };
        render();
        try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
        return;
      }
    }

    for (let i = texts.length - 1; i >= 0; i--){
      const t = texts[i]; const box = getTextBox(t, ctx);
      if (inBox(pt, box)){
        selectedId = t.id;
        dragMode = 'move';
        dragStartPt = pt;
        dragItemState = { id: t.id, startX: t.x, startY: t.y };
        render();
        try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
        return;
      }
    }

    if (activePanel !== 'text' && activePanel !== 'stickers'){
      const box = getImageBox();
      if (box && inBox(pt, box)){
        selectedId = 'image';
        dragMode = 'move';
        dragStartPt = pt;
        dragItemState = { id: 'image', startOffsetX: imgOffsetX, startOffsetY: imgOffsetY };
        render();
        try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
        return;
      }
    }

    if (activePanel === 'text'){
      const text = $c('textInput').value.trim();
      if (text){
        const id = ++textIdCounter;
        texts.push({ id, text, x: pt.x, y: pt.y, size: +$c('textSize').value, color: $c('textColor').value, font: $c('textFont').value, bg: $c('textBg').value, shadow: $c('textShadow').value });
        $c('textInput').value = '';
        selectedId = id;
        render();
        toast('أضف النص ✓');
        return;
      }
    }

    selectedId = null;
    render();
  }

  function onPointerMove(e){
    if (cropActive) return;
    if (touchPoints.has(e.pointerId)) touchPoints.set(e.pointerId, { x:e.clientX, y:e.clientY });

    if (pinchState && touchPoints.size === 2){
      const pts = [...touchPoints.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / pinchState.dist;
      if (pinchState.item === 'image' && pinchState.startScale){
        imgScale = Math.max(.2, Math.min(4, pinchState.startScale * ratio));
        if ($c('rangeScale')) $c('rangeScale').value = Math.round(imgScale * 100);
        if ($c('valScale')) $c('valScale').textContent = Math.round(imgScale*100) + '%';
      } else if (typeof pinchState.item === 'number' && pinchState.startSize){
        if (pinchState.item > 1000){ const s = stickers.find(x => x.id === pinchState.item); if(s) s.size = Math.max(20, Math.min(1000, pinchState.startSize * ratio)); }
        else { const t = texts.find(x => x.id === pinchState.item); if (t) t.size = Math.max(10, Math.min(400, pinchState.startSize * ratio)); }
      }
      render(); return;
    }

    if (drawing && currentStroke){ currentStroke.points.push(getCanvasPoint(e)); render(); return; }

    if (dragMode === 'move' && dragItemState){
      const pt = getCanvasPoint(e);
      const dx = pt.x - dragStartPt.x, dy = pt.y - dragStartPt.y;
      if (dragItemState.id === 'image'){ imgOffsetX = dragItemState.startOffsetX + dx; imgOffsetY = dragItemState.startOffsetY + dy; }
      else if (dragItemState.id > 1000){ const s = stickers.find(x => x.id === dragItemState.id); if (s){ s.x = dragItemState.startX + dx; s.y = dragItemState.startY + dy; } }
      else { const t = texts.find(x => x.id === dragItemState.id); if (t){ t.x = dragItemState.startX + dx; t.y = dragItemState.startY + dy; } }
      render(); return;
    }

    if (dragMode === 'resize' && dragItemState){
      const pt = getCanvasPoint(e);
      const b = dragItemState.startBox;
      const startDist = Math.hypot(dragStartPt.x - b.cx, dragStartPt.y - b.cy);
      const nowDist = Math.hypot(pt.x - b.cx, pt.y - b.cy);
      if (startDist > 1){
        const ratio = nowDist / startDist;
        if (dragItemState.id === 'image'){
          imgScale = Math.max(.2, Math.min(4, dragItemState.startScale * ratio));
          if ($c('rangeScale')) $c('rangeScale').value = Math.round(imgScale * 100);
          if ($c('valScale')) $c('valScale').textContent = Math.round(imgScale*100) + '%';
        } else if (dragItemState.id > 1000){
          const s = stickers.find(x => x.id === dragItemState.id);
          if (s) s.size = Math.max(20, Math.min(1000, dragItemState.startSize * ratio));
        } else {
          const t = texts.find(x => x.id === dragItemState.id);
          if (t) t.size = Math.max(10, Math.min(400, dragItemState.startSize * ratio));
        }
      }
      render(); return;
    }
  }

  function onPointerUp(e){
    if (cropActive) return;
    touchPoints.delete(e.pointerId);
    if (touchPoints.size < 2) pinchState = null;
    if (drawing && currentStroke){ strokes.push(currentStroke); currentStroke = null; drawing = false; mainCanvas.classList.remove('dragging'); }
    dragMode = null; dragItemState = null;
    renderImmediate = false;
    render();
  }

  function onWheel(e){
    if (cropActive) return;
    if (selectedId === 'image' || !selectedId){
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      imgScale = Math.max(.2, Math.min(4, imgScale + delta));
      if ($c('rangeScale')) $c('rangeScale').value = Math.round(imgScale * 100);
      if ($c('valScale')) $c('valScale').textContent = Math.round(imgScale*100) + '%';
      render();
    } else if (typeof selectedId === 'number'){
      e.preventDefault();
      if (selectedId > 1000){ const s = stickers.find(x => x.id === selectedId); if(s){ s.size = Math.max(20, Math.min(1000, s.size + (e.deltaY > 0 ? -5 : 5))); render(); } }
      else { const t = texts.find(x => x.id === selectedId); if (t){ t.size = Math.max(10, Math.min(400, t.size + (e.deltaY > 0 ? -3 : 3))); render(); } }
    }
  }

  function applyFilter(id, intensity, ctx){
    const t = intensity;
    if (id === 'none') return;
    ctx.save();
    if (id === 'grayscale'){ ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${t})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'sepia'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(200,150,80,${t*.7})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'invert'){ ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(255,255,255,${t})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'vivid'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,100,150,${t*.35})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'cool'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,200,255,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'warm'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,180,100,${t*.55})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'dramatic'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(0,0,0,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'fade'){ ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = `rgba(255,245,220,${t*.3})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'vintage'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(180,140,90,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'noir'){ ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${t})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(200,200,200,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'ocean'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(100,180,255,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'sunset'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,140,80,${t*.55})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'forest'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(100,200,100,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'rose'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,150,200,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'cyan'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(100,255,255,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'neon'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,80,255,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'lomo'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,120,60,${t*.35})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'polaroid'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,220,180,${t*.35})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'clarendon'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(100,150,255,${t*.35})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'gingham'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(220,220,240,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'moon'){ ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${t})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(180,200,255,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'lark'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(240,255,240,${t*.3})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'reyes'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(230,200,170,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'juno'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,150,80,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'aden'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,180,200,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'perpetua'){ ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(180,230,255,${t*.35})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'mayfair'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,200,180,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'amaro'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(180,200,255,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'xpro'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,150,100,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'toaster'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,180,100,${t*.5})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    else if (id === 'walden'){ ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = `rgba(255,240,180,${t*.4})`; ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height); }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
  }
  function drawStroke(ctx, st){
    ctx.save();
    if (st.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = st.color; ctx.lineWidth = st.size;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = st.opacity ?? 1;
    ctx.beginPath();
    const pts = st.points;
    if (pts.length === 1){ ctx.arc(pts[0].x, pts[0].y, st.size/2, 0, Math.PI*2); ctx.fillStyle = st.color; ctx.fill(); }
    else { ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
    ctx.restore();
  }
  function drawCover(ctx, img, w, h){
    const ir = img.width / img.height, cr = w / h;
    let sw, sh, sx, sy;
    if (ir > cr){ sh = img.height; sw = sh * cr; sx = (img.width - sw)/2; sy = 0; }
    else { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh)/2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  function drawChecker(ctx, w, h){
    const s = Math.max(12, Math.round(w/60));
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s){
      ctx.fillStyle = ((x/s + y/s) % 2 === 0) ? '#0a0510' : '#150a20';
      ctx.fillRect(x, y, s, s);
    }
  }
  function drawBorder(ctx, W, H){
    if (border.id === 'none') return;
    const bw = border.width;
    if (border.type === 'solid'){ ctx.strokeStyle = border.color; }
    else if (border.type === 'gradient'){
      const grd = ctx.createLinearGradient(0,0,W,H);
      grd.addColorStop(0, border.c1); grd.addColorStop(1, border.c2);
      ctx.strokeStyle = grd;
    }
    ctx.lineWidth = bw * 2;
    ctx.strokeRect(0, 0, W, H);
  }

  function render(){
    if (renderImmediate) return renderNow();
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderNow(); });
  }
  function renderNow(){
    const base = currentImage || originalImage;
    if (!base || !mainCanvas) return;
    const W = base.naturalWidth, H = base.naturalHeight;
    mainCanvas.width = W; mainCanvas.height = H;

    fgCanvas.width = W; fgCanvas.height = H;
    const fg = fgCanvas.getContext('2d');
    fg.clearRect(0,0,W,H);

    fg.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hue + adjustments.temp * .5}deg) blur(${adjustments.blur}px)`;
    fg.globalAlpha = imgAlpha * (adjustments.opacity/100);
    const sw = W * imgScale, sh = H * imgScale;
    const dx = (W - sw)/2 + imgOffsetX, dy = (H - sh)/2 + imgOffsetY;
    fg.drawImage(base, dx, dy, sw, sh);
    fg.filter = 'none'; fg.globalAlpha = 1;

    if (filterId !== 'none') applyFilter(filterId, filterIntensity, fg);

    if (adjustments.sharpen > 0){
      try {
        const data = fg.getImageData(0, 0, W, H);
        const blurCopy = document.createElement('canvas');
        blurCopy.width = W; blurCopy.height = H;
        const bx = blurCopy.getContext('2d');
        bx.filter = 'blur(2px)';
        bx.drawImage(fgCanvas, 0, 0);
        const blurData = bx.getImageData(0, 0, W, H);
        const amt = adjustments.sharpen / 100;
        const d = data.data, b = blurData.data;
        for (let i = 0; i < d.length; i += 4){
          d[i] = Math.max(0, Math.min(255, d[i] + (d[i] - b[i]) * amt));
          d[i+1] = Math.max(0, Math.min(255, d[i+1] + (d[i+1] - b[i+1]) * amt));
          d[i+2] = Math.max(0, Math.min(255, d[i+2] + (d[i+2] - b[i+2]) * amt));
        }
        fg.putImageData(data, 0, 0);
      } catch {}
    }

    for (const st of strokes) drawStroke(fg, st);
    if (currentStroke) drawStroke(fg, currentStroke);

    for (const t of texts){
      fg.save();
      fg.font = `bold ${t.size}px ${t.font}`;
      fg.textAlign = 'center'; fg.textBaseline = 'middle';
      const tw = fg.measureText(t.text).width;
      if (t.bg && t.bg !== 'none'){
        fg.fillStyle = t.bg;
        const pad = t.size * .3;
        roundRect(fg, t.x - tw/2 - pad, t.y - t.size/2 - pad*.6, tw + pad*2, t.size + pad*1.2, 8);
        fg.fill();
      }
      if (t.shadow && t.shadow !== 'none'){
        fg.shadowColor = t.shadow;
        fg.shadowBlur = 12;
        fg.shadowOffsetY = 4;
      }
      fg.fillStyle = t.color;
      fg.fillText(t.text, t.x, t.y);
      fg.restore();
    }

    for (const s of stickers){
      fg.save();
      fg.font = `${s.size}px sans-serif`;
      fg.textAlign = 'center'; fg.textBaseline = 'middle';
      fg.fillText(s.emoji, s.x, s.y);
      fg.restore();
    }

    const ctx = mainCanvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    if (currentBg.type === 'color'){ ctx.fillStyle = currentBg.value; ctx.fillRect(0,0,W,H); }
    else if (currentBg.type === 'gradient'){ ctx.fillStyle = currentBg.value; ctx.fillRect(0,0,W,H); }
    else if (currentBg.type === 'original' || currentBg.type === 'checker'){ drawChecker(ctx, W, H); }
    else if ((currentBg.type === 'preset' || currentBg.type === 'upload') && bgImage?.complete && bgImage.naturalWidth){ drawCover(ctx, bgImage, W, H); }

    ctx.drawImage(fgCanvas, 0, 0);

    if (adjustments.vignette > 0){
      const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H) * .3, W/2, H/2, Math.max(W,H) * .7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${adjustments.vignette/100})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    drawBorder(ctx, W, H);

    if (selectedId !== null){
      let box = null;
      if (selectedId === 'image') box = getImageBox();
      else if (selectedId > 1000){ const s = stickers.find(x => x.id === selectedId); if(s) box = getStickerBox(s); }
      else { const t = texts.find(x => x.id === selectedId); if (t) box = getTextBox(t, ctx); }
      if (box) drawSelection(ctx, box);
    }

    if (cropActive) setTimeout(updateCropOverlay, 0);
  }
  function drawSelection(ctx, box){
    const sf = mainCanvas.width / 800;
    const pad = 6 * sf;
    ctx.save();
    ctx.strokeStyle = 'rgba(224,184,132,.95)';
    ctx.lineWidth = 2 * sf;
    ctx.setLineDash([8*sf, 6*sf]);
    ctx.beginPath();
    ctx.rect(box.x - pad, box.y - pad, box.w + pad*2, box.h + pad*2);
    ctx.stroke();
    ctx.setLineDash([]);
    const handleR = Math.max(6, 10 * sf);
    const cs = [
      { x: box.x - pad, y: box.y - pad },
      { x: box.x + box.w + pad, y: box.y - pad },
      { x: box.x - pad, y: box.y + box.h + pad },
      { x: box.x + box.w + pad, y: box.y + box.h + pad }
    ];
    for (const c of cs){
      ctx.beginPath(); ctx.arc(c.x, c.y, handleR, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(224,184,132,1)'; ctx.fill();
      ctx.lineWidth = 2 * sf; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
    }
    ctx.restore();
  }

  function undo(){
    if (stickers.length){ stickers.pop(); render(); return toast('تراجع'); }
    if (strokes.length){ strokes.pop(); render(); return toast('تراجع'); }
    if (texts.length){ texts.pop(); render(); return toast('تراجع'); }
    toast('لا يوجد شي للتراجع', 'err');
  }
  function resetAdjustments(){
    adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
    const def = { rangeBrightness:100, rangeContrast:100, rangeSaturation:100, rangeSharpen:0, rangeHue:0, rangeTemp:0, rangeBlur:0, rangeVignette:0, rangeOpacity:100 };
    Object.keys(def).forEach(id => { const el = $c(id); if(el) el.value = def[id]; });
    $c('valBrightness').textContent = '100%';
    $c('valContrast').textContent = '100%';
    $c('valSaturation').textContent = '100%';
    $c('valSharpen').textContent = '0%';
    $c('valHue').textContent = '0°';
    $c('valTemp').textContent = '0';
    $c('valBlur').textContent = '0px';
    $c('valVignette').textContent = '0%';
    $c('valOpacity').textContent = '100%';
    render();
    toast('تم إعادة التعديلات ✓', 'ok');
  }
  function resetAll(){
    if (!originalImage) return;
    resetAdjustments();
    filterId = 'none'; filterIntensity = 1;
    strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0;
    imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
    border = { id:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
    $c('rangeScale').value = 100; $c('valScale').textContent = '100%';
    $c('rangeAlpha').value = 100; $c('valAlpha').textContent = '100%';
    $c('rangeFilterIntensity').value = 100; $c('valFilterIntensity').textContent = '100%';
    document.querySelectorAll('.filter-thumb').forEach(x => x.classList.toggle('active', x.dataset.filter === 'none'));
    document.querySelectorAll('.border-item').forEach(x => x.classList.toggle('active', x.dataset.border === 'none'));
    selectedId = null;
    if (cropActive) showDefaultCrop();
    render();
    toast('تم إعادة الضبط ✓', 'ok');
  }
  async function saveImage(){
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const btn = $c('btnSave');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = 'جاري الحفظ...';
    try{
      const wasCrop = cropActive;
      if (wasCrop){ cropActive = false; $c('cropOverlay')?.classList.add('hidden'); }
      renderNow();
      const outBlob = await new Promise(r => mainCanvas.toBlob(r, 'image/png'));
      finalBlob = outBlob;
      $c('btnDownload')?.classList.remove('hidden');
      if (wasCrop){ cropActive = true; $c('cropOverlay')?.classList.remove('hidden'); }
      toast('تم الحفظ ✓ اضغط تحميل', 'ok');
    }catch(e){ console.error(e); toast('فشل الحفظ', 'err'); }
    finally{ btn.disabled = false; btn.innerHTML = orig; }
  }
  function downloadBlob(blob, name){
    if (!blob){ toast('لا يوجد ملف', 'err'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  function reset(){
    originalImage = null; currentImage = null; finalBlob = null;
    bgRemoved = false;
    strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0;
    adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
    filterId = 'none'; filterIntensity = 1;
    currentBg = { type:'original' };
    bgImage = null;
    border = { id:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
    imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
    selectedId = null;
    cropActive = false;
    cropRect = null;
    $c('uploadStage')?.classList.remove('hidden');
    $c('workspace')?.classList.add('hidden');
    $c('btnDownload')?.classList.add('hidden');
    closePanel();
  }

  return { init, reset };
})();

/* APP */
const App = (() => {
  let opsCache = [];
  const showAuth = () => { $('authScreen').classList.remove('hidden'); $('appScreen').classList.add('hidden'); };
  const showApp = () => { $('authScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden'); };
  async function enterApp(){
    if(!Auth.profile && Auth.session?.user){ Auth.profile = await API.getProfile(Auth.session.user.id, Auth.session.access_token); }
    const greeting = $('brandGreeting');
    if(greeting){
      const name = Auth.profile?.username || Auth.session?.user?.user_metadata?.username || Auth.session?.user?.email?.split('@')[0];
      greeting.textContent = name ? `أهلًا ${name}، دي مساحتك` : 'مساحتك الصغيرة للإبداع';
    }
    updateAdminVis(); updatePlanUI(); showApp(); switchView('editor'); await refreshUsage();
  }
  function switchView(name){
    if(name === 'admin' && !Auth.isDev()){ toast('لا تملك صلاحية', 'err'); return; }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    ['editor','history','profile','admin'].forEach(v => { const el = $(v+'View'); if(el) el.classList.toggle('hidden', v !== name); });
    if(name === 'history') refreshHistory();
    if(name === 'profile') refreshProfile();
    if(name === 'admin') Admin.refresh();
    scrollTo({top:0, behavior:'smooth'});
  }
  function updateAdminVis(){ const d = Auth.isDev(); $('adminMini')?.classList.toggle('hidden', !d); $('adminNav')?.classList.toggle('hidden', !d); }
  function updatePlanUI(){
    const p = Auth.isPro();
    $('planPill')?.classList.toggle('pro', p);
    const pt = $('planTxt'); if(pt) pt.textContent = p ? 'Pro • ∞' : 'Free';
    const pr = Auth.profile;
    const pp = $('pPlan');
    if(pp) pp.textContent = p ? 'Pro — بلا حدود' : (pr?.plan === 'custom' ? `Custom — ${pr.daily_limit}` : 'Free — 5/يوم');
  }
  async function refreshUsage(){
    const s = Auth.session; if(!s?.user) return;
    try{
      const t = await API.countToday(s.access_token, s.user.id);
      if(Auth.isPro()){ const sr = $('statRemain'); if(sr) sr.textContent = '∞'; return; }
      const lim = Number(Auth.profile?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
      const sr = $('statRemain'); if(sr) sr.textContent = Math.max(0, lim - t);
    }catch{}
  }
  async function refreshHistory(){
    const s = Auth.session; if(!s?.user) return;
    const wrap = $('historyContent'); if(!wrap) return;
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">⌛</div><h3>جاري التحميل...</h3></div>`;
    try{
      const ops = await API.fetchOps(s.access_token, s.user.id);
      opsCache = ops;
      const today = await API.countToday(s.access_token, s.user.id);
      const st = $('statTotal'); if(st) st.textContent = ops.length;
      const std = $('statToday'); if(std) std.textContent = today;
      if(!ops.length){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">✦</div><h3>لسه بنبدأ الحكاية</h3><p>أول صورة تعدّلها وتحفظها هتظهر هنا، عشان تقدر ترجع لها وقت ما تحب.</p></div>`; return; }
      const grid = document.createElement('div'); grid.className = 'history-grid';
      for(const op of ops){
        const c = document.createElement('div'); c.className = 'hist-card';
        c.innerHTML = `<div class="hist-date">${esc(fmtDate(op.created_at))}</div><div class="hist-thumb"><img alt="" loading="lazy"></div><div class="hist-actions"><button class="btn-success" data-act="dl" data-id="${esc(op.id)}" type="button">⬇ تحميل</button><button class="btn-danger" data-act="del" data-id="${esc(op.id)}" type="button">🗑 حذف</button></div>`;
        grid.appendChild(c);
        const url = await API.resolveImg(op.result_url, s.access_token);
        if(url) c.querySelector('img').src = url;
      }
      wrap.innerHTML = ''; wrap.appendChild(grid);
      grid.addEventListener('click', async e => {
        const b = e.target.closest('[data-act]'); if(!b) return;
        const op = opsCache.find(o => String(o.id) === String(b.dataset.id)); if(!op) return;
        if(b.dataset.act === 'dl'){ b.disabled=true; b.textContent='...'; try{ const u = await API.resolveImg(op.result_url, s.access_token); if(!u) throw new Error('تعذر التجهيز'); downloadFromUrl(u, `removebg-${String(op.id).slice(0,8)}.png`); }catch(err){ toast(err.message||'فشل التحميل','err'); } finally{ b.disabled=false; b.textContent='⬇ تحميل'; } }
        if(b.dataset.act === 'del'){ if(!confirm('حذف هذه العملية؟')) return; b.disabled=true; b.textContent='...'; try{ await API.delOp(s.access_token, op.id); await API.removeFiles(s.access_token, [op.original_url, op.result_url]); toast('تم الحذف ✓','ok'); await refreshHistory(); }catch(err){ toast(err.message||'فشل الحذف','err'); b.disabled=false; b.textContent='🗑 حذف'; } }
      });
    }catch(e){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">!</div><h3>تعذر التحميل</h3><p>${esc(e.message)}</p></div>`; }
  }
  async function refreshProfile(){
    const s = Auth.session; if(!s?.user) return;
    try{
      if(!Auth.profile) Auth.profile = await API.getProfile(s.user.id, s.access_token);
      const p = Auth.profile;
      const ops = await API.fetchOps(s.access_token, s.user.id);
      const today = await API.countToday(s.access_token, s.user.id);
      const un = p?.username || s.user.user_metadata?.username || s.user.email?.split('@')[0] || '?';
      const em = p?.email || s.user.email || '—';
      const av = $('avatar'); if(av) av.textContent = initials(un);
      const pu = $('pUsername'); if(pu) pu.textContent = un;
      const pe = $('pEmail'); if(pe) pe.textContent = em;
      const pr = $('pRole'); if(pr){ pr.textContent = Auth.isDev() ? '✦ المطوّر' : '● مستخدم'; pr.classList.toggle('dev', Auth.isDev()); }
      const pj = $('pJoined'); if(pj) pj.textContent = p?.created_at ? `انضم في ${fmtDate(p.created_at)}` : '';
      const so = $('statOps'); if(so) so.textContent = ops.length;
      const sot = $('statOpsToday'); if(sot) sot.textContent = today;
      updatePlanUI();
      if(Auth.isPro()){ const sr = $('statRemain'); if(sr) sr.textContent = '∞'; }
      else { const lim = Number(p?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT); const sr = $('statRemain'); if(sr) sr.textContent = Math.max(0, lim - today); }
      const ps = $('pStatus'); if(ps) ps.textContent = p?.is_banned ? 'موقوف' : 'نشط';
    }catch(e){ toast(e.message, 'err'); }
  }
  function downloadBlob(blob, name){
    if(!blob){ toast('لا يوجد ملف', 'err'); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
  async function downloadFromUrl(url, name){
    try{ const r = await fetch(url, {mode:'cors'}); if(!r.ok) throw new Error(); const b = await r.blob(); downloadBlob(b, name); }
    catch{ const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  }
  function bindUI(){
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    $('adminMini')?.addEventListener('click', () => switchView('admin'));
    $('historyRefresh')?.addEventListener('click', async e => { e.currentTarget.disabled = true; try{ await refreshHistory(); } finally{ e.currentTarget.disabled = false; } });
    $('refreshProfile')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      try{ Auth.profile = await API.getProfile(Auth.session.user.id, Auth.session.access_token); updateAdminVis(); await refreshProfile(); await refreshUsage(); toast('تم التحديث ✓', 'ok'); }
      finally{ e.currentTarget.disabled = false; }
    });
    $('logoutBtn')?.addEventListener('click', () => Auth.doLogout(true));
  }
  return { showAuth, showApp, enterApp, switchView, bindUI, refreshUsage };
})();

/* ADMIN */
const Admin = (() => {
  let usersCache = [], opsCache = [];
  async function refresh(){
    if(!Auth.isDev()) return;
    const list = $('usersList'); if(!list) return;
    list.innerHTML = `<div class="empty"><div class="empty-icon">⌛</div><h3>جاري التحميل...</h3></div>`;
    try{
      const tk = Auth.session.access_token;
      const search = $('adminSearch').value.trim() || null;
      const [users, ops] = await Promise.all([API.adminUsers(tk, search), API.adminOps(tk)]);
      usersCache = users; opsCache = ops;
      const today = new Date(); today.setHours(0,0,0,0);
      const to = opsCache.filter(o => new Date(o.created_at) >= today);
      const act = new Set(to.map(o => o.user_id));
      if($('mUsers')) $('mUsers').textContent = usersCache.length;
      if($('mOps')) $('mOps').textContent = opsCache.length;
      if($('mToday')) $('mToday').textContent = to.length;
      if($('mActive')) $('mActive').textContent = act.size;
      renderUsers(); await renderOps();
    }catch(e){ list.innerHTML = `<div class="empty"><div class="empty-icon">!</div><h3>تعذر التحميل</h3><p>${esc(e.message)}</p></div>`; }
  }
  function renderUsers(){
    const q = $('adminSearch').value.trim().toLowerCase();
    const list = usersCache.filter(p => !q || [p.username,p.email,p.id].join(' ').toLowerCase().includes(q));
    const ul = $('usersLabel'); if(ul) ul.textContent = `${list.length} حساب`;
    const wrap = $('usersList'); if(!wrap) return;
    wrap.innerHTML = '';
    if(!list.length){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">⌕</div><h3>لا نتائج</h3></div>`; return; }
    list.forEach(p => {
      const r = document.createElement('div'); r.className = 'user-row';
      const st = p.is_banned ? 'موقوف' : (p.plan === 'pro' ? 'Pro' : (p.plan === 'custom' ? 'Custom' : 'Free'));
      const sc = p.is_banned ? 'banned' : (p.plan === 'pro' ? 'pro' : '');
      r.innerHTML = `<div class="user-avatar">${esc(initials(p.username || p.email || '?'))}</div><div class="user-main"><strong>${esc(p.username || 'بدون اسم')}</strong><span>${esc(p.email || p.id || '—')}</span><div class="user-state ${sc}">${esc(st)}</div></div><div class="user-meta"><strong>${esc(p.operations_count || 0)}</strong><small>اليوم ${esc(p.today_operations || 0)}</small></div><button class="manage-btn" type="button">إدارة</button>`;
      r.querySelector('.manage-btn').addEventListener('click', () => openUser(p));
      wrap.appendChild(r);
    });
  }
  async function renderOps(){
    const wrap = $('opsList'); if(!wrap) return;
    wrap.innerHTML = '';
    if(!opsCache.length){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">◌</div><h3>لا عمليات</h3></div>`; return; }
    const map = new Map(usersCache.map(p => [String(p.id), p]));
    for(const op of opsCache){
      const c = document.createElement('div'); c.className = 'op-card';
      c.innerHTML = `<div class="op-thumb"><img alt="" loading="lazy"></div><div class="op-body"><strong>—</strong><span>${esc(fmtDate(op.created_at))}</span></div>`;
      const p = map.get(String(op.user_id));
      c.querySelector('strong').textContent = p?.username || p?.email || 'مستخدم';
      wrap.appendChild(c);
      const u = await API.resolveImg(op.result_url, Auth.session.access_token);
      if(u) c.querySelector('img').src = u;
    }
  }
  async function openUser(profile){
    const ops = await API.adminOps(Auth.session.access_token, profile.id);
    const curLim = Number(profile.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
    $('modalTitle').textContent = 'إدارة الحساب';
    $('modalBody').innerHTML = `
      <div class="summary"><div class="summary-av">${esc(initials(profile.username || profile.email || '?'))}</div><div><div class="summary-name">${esc(profile.username || 'بدون اسم')}</div><div class="summary-email">${esc(profile.email || '—')}</div><div class="summary-pills"><div class="summary-pill">${esc(profile.plan || 'free')}</div><div class="summary-pill">${esc(profile.operations_count || 0)} عملية</div><div class="summary-pill">اليوم ${esc(profile.today_operations || 0)}</div></div></div></div>
      <div class="mg-grid"><div class="mg-box"><label>الخطة</label><select id="aPlan" class="plan-select"><option value="free" ${profile.plan==='free'?'selected':''}>Free</option><option value="pro" ${profile.plan==='pro'?'selected':''}>Pro</option><option value="custom" ${profile.plan==='custom'?'selected':''}>Custom</option></select></div><div class="mg-box"><label>الحد اليومي</label><input id="aLimit" class="limit-input" type="number" min="0" value="${curLim}"></div></div>
      <div class="ban-row"><span>إيقاف الحساب</span><button id="aBan" class="switch ${profile.is_banned?'active':''}" type="button"></button></div>
      <div class="modal-actions"><button id="aSave" class="btn-primary" type="button" style="min-height:46px">حفظ</button><button id="aClose" class="btn-ghost" type="button">إغلاق</button></div>
      <div class="modal-section-title">عمليات المستخدم</div><div id="aOps" class="ops-grid"></div>
    `;
    $('modal').classList.add('show');
    const ban = $('aBan'); let banned = !!profile.is_banned;
    ban.addEventListener('click', () => { banned = !banned; ban.classList.toggle('active', banned); });
    const plan = $('aPlan'); const lim = $('aLimit');
    plan.addEventListener('change', () => { if(plan.value === 'pro') lim.value = 0; else if(plan.value === 'free') lim.value = 5; });
    $('aClose').addEventListener('click', closeModal);
    $('aSave').addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true;
      try{ let l = Number(lim.value); if(!Number.isFinite(l) || l < 0) throw new Error('الحد غير صحيح'); if(plan.value === 'free') l = 5; if(plan.value === 'pro') l = 0; await API.adminUpdate(Auth.session.access_token, profile.id, plan.value, l, banned); toast('تم التحديث ✓','ok'); await refresh(); }catch(err){ toast(err.message,'err'); } finally{ b.disabled = false; }
    });
    const aw = $('aOps');
    if(!ops.length) aw.innerHTML = `<div class="empty"><div class="empty-icon">✦</div><h3>لسه مفيش صور محفوظة</h3><p>الصور اللي تتحفظ هتظهر هنا.</p></div>`;
    else{ for(const op of ops.slice(0,20)){ const c = document.createElement('div'); c.className = 'op-card'; c.innerHTML = `<div class="op-thumb"><img alt="" loading="lazy"></div><div class="op-body"><strong>${esc(fmtDate(op.created_at))}</strong><span>RemoveBG</span></div>`; aw.appendChild(c); const u = await API.resolveImg(op.result_url, Auth.session.access_token); if(u) c.querySelector('img').src = u; } }
  }
  function closeModal(){ $('modal').classList.remove('show'); }
  function init(){
    $('modalClose')?.addEventListener('click', closeModal);
    $('modal')?.addEventListener('click', e => { if(e.target === $('modal')) closeModal(); });
    $('adminSearch')?.addEventListener('input', renderUsers);
    $('adminRefresh')?.addEventListener('click', async e => { e.currentTarget.disabled = true; try{ await refresh(); toast('تم التحديث ✓','ok'); } finally{ e.currentTarget.disabled = false; } });
    $('adminBack')?.addEventListener('click', () => App.switchView('editor'));
  }
  return { init, refresh };
})();

/* BOOT */
(async function boot(){
  AuthUI.init();
  App.bindUI();
  Admin.init();
  Editor.init();

  let session = await Auth.valid();
  let profile = null, user = null;
  if(session){ user = await API.getUser(session); if(user){ session.user = user; Auth.save(session); profile = await API.getProfile(user.id, session.access_token); } }
  await Loader.run();
  if(!session || !user || profile?.is_banned){
    if(profile?.is_banned) await Auth.doLogout(false);
    App.showAuth();
    return;
  }
  Auth.session = session;
  Auth.profile = profile;
  await App.enterApp();
})();
