/* ============================================================
   RemoveBG · Sandstorm Studio — Unified Editor
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
const BG_SWATCHES = ['#ffffff','#000000','#e0b884','#d4a5a5','#c4783a','#84d896','#e88c7a','#8ab4f8','#c084fc','#fbbf24','#2dd4bf','#f472b6','#1a130c','#2a2015','#f5e8d4','#e0aeb0'];
const BRUSH_SWATCHES = ['#ffffff','#000000','#e0b884','#c4783a','#d4a5a5','#84d896','#e88c7a','#8ab4f8','#c084fc','#fbbf24','#2dd4bf','#f472b6'];
const FILTERS = [
  { id:'none', name:'الأصلي' },
  { id:'grayscale', name:'رمادي' },
  { id:'sepia', name:'دافئ' },
  { id:'invert', name:'عكسي' },
  { id:'vivid', name:'حيوي' },
  { id:'cool', name:'بارد' },
  { id:'warm', name:'دافئ' },
  { id:'dramatic', name:'درامي' },
  { id:'fade', name:'باهت' }
];

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

/* ========== LOADER ========== */
const Loader = (() => {
  const START = performance.now(); let raf;
  function particles(){
    const c = $('fx'); if(!c) return;
    const ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio, 2);
    let w, h, parts = [];
    const resize = () => { w=c.width=innerWidth*dpr; h=c.height=innerHeight*dpr; c.style.width=innerWidth+'px'; c.style.height=innerHeight+'px'; };
    resize(); addEventListener('resize', resize);
    const n = Math.min(40, Math.floor(innerWidth/28));
    for(let i=0;i<n;i++) parts.push({ x:Math.random()*w, y:Math.random()*h, vx:(Math.random()-.5)*.22*dpr, vy:(Math.random()-.5)*.22*dpr, r:(Math.random()*1.3+.4)*dpr, a:Math.random()*.5+.3, hue: 32+Math.random()*14 });
    function loop(){
      ctx.clearRect(0,0,w,h);
      for(const p of parts){
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>w)p.vx*=-1; if(p.y<0||p.y>h)p.vy*=-1;
        ctx.beginPath(); ctx.fillStyle = `hsla(${p.hue},75%,62%,${p.a})`; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    loop();
  }
  async function run(){
    particles();
    let p = 0; const fill = $('ldFill'), pct = $('ldPct');
    const tick = setInterval(() => { p = Math.min(98, p + Math.random()*7 + 3); if(fill) fill.style.width = p + '%'; if(pct) pct.textContent = Math.round(p) + '%'; }, 130);
    const el = performance.now() - START;
    await wait(Math.max(0, CONFIG.LOADER_MIN_MS - el));
    clearInterval(tick); if(fill) fill.style.width = '100%'; if(pct) pct.textContent = '100%';
    await wait(320); $('loader')?.classList.add('hide');
    if(raf) cancelAnimationFrame(raf);
    setTimeout(() => $('loader')?.remove(), 900);
  }
  return { run };
})();

/* ========== API ========== */
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

/* ========== AUTH ========== */
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

/* ========== AUTH UI ========== */
const AuthUI = (() => {
  let mode = 'login';
  const setErr = (input, el, msg) => { input.classList.toggle('bad', !!msg); el.textContent = msg; el.classList.toggle('show', !!msg); };
  const clearErr = () => { ['username','email','password','confirm'].forEach(k => { const i = $(k), e = $('err'+k[0].toUpperCase()+k.slice(1)); if(i) i.classList.remove('bad','ok'); if(e){ e.textContent=''; e.classList.remove('show'); } }); };
  const msg = (txt, type='') => { const m = $('authMsg'); if(!m) return; m.className = 'msg show ' + type; m.textContent = txt; };
  const clearMsg = () => { const m = $('authMsg'); if(!m) return; m.className = 'msg'; m.textContent = ''; };
  const setMode = m => {
    mode = m; clearErr(); clearMsg();
    const reg = m === 'register';
    $('formTitle').textContent = reg ? 'أنشئ حسابك' : 'مرحباً بك';
    $('formSub').textContent = reg ? 'ابدأ رحلتك الإبداعية مجاناً' : 'سجّل دخولك لمتابعة إبداعك';
    $('fUsername').classList.toggle('hidden', !reg);
    $('fConfirm').classList.toggle('hidden', !reg);
    $('reqs').classList.toggle('hidden', !reg);
    $('strength').classList.toggle('hidden', !reg);
    $('submitBtn').querySelector('.btn-text').textContent = reg ? 'إنشاء الحساب' : 'تسجيل الدخول';
    $('password').placeholder = reg ? '8 أحرف + رقم + حرف كبير' : '••••••••';
    $('password').setAttribute('autocomplete', reg ? 'new-password' : 'current-password');
    const st = $('switchText');
    const sb = $('switchBtn');
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
  const eye = (input, btn) => { const v = input.type === 'text'; input.type = v?'password':'text'; btn.style.color = v ? '' : 'var(--sand)'; };
  function translateError(e){
    const m = String(e?.message || '').toLowerCase();
    if(m.includes('invalid login') || m.includes('invalid credentials')) return 'البريد أو كلمة المرور غير صحيحة';
    if(m.includes('already registered') || m.includes('already been registered') || m.includes('user already')) return 'هذا البريد مسجّل بالفعل';
    if(m.includes('email not confirmed')) return 'يرجى تأكيد بريدك الإلكتروني أولًا';
    if(m.includes('password should be at least')) return 'كلمة المرور قصيرة جدًا (6+ أحرف)';
    if(m.includes('invalid email')) return 'البريد الإلكتروني غير صحيح';
    if(m.includes('rate limit') || m.includes('too many')) return 'محاولات كثيرة، حاول لاحقًا';
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
        if(!/^[a-zA-Z0-9_]{3,20}$/.test(un)){ setErr($('username'), $('errUsername'), 'أحرف وأرقام و _ فقط (3-20)'); return; }
        const { valid } = checkPwd(pwd);
        if(!valid){ setErr($('password'), $('errPassword'), 'كلمة المرور لا تحقق الشروط'); return; }
        if($('confirm').value !== pwd){ setErr($('confirm'), $('errConfirm'), 'كلمتا المرور غير متطابقتين'); return; }
      } else { if(pwd.length < 1){ setErr($('password'), $('errPassword'), 'أدخل كلمة المرور'); return; } }
      const btn = $('submitBtn'); const txt = btn.querySelector('.btn-text'); const original = txt.textContent;
      btn.disabled = true; txt.textContent = mode === 'login' ? 'جاري الدخول...' : 'جاري الإنشاء...';
      try{
        if(mode === 'login'){
          await Auth.doLogin(email, pwd);
          if(Auth.profile?.is_banned){ await Auth.doLogout(false); msg('هذا الحساب موقوف', 'err'); return; }
          toast(`أهلًا ${Auth.profile?.username || ''} 🏜️`, 'ok');
          await App.enterApp();
        } else {
          const r = await Auth.doSignup(email, pwd, $('username').value.trim());
          if(r.needsConfirmation){ msg('تم إنشاء الحساب ✓\nتحقق من بريدك لتفعيله.', 'ok'); return; }
          toast('تم إنشاء الحساب 🏜️', 'ok'); await App.enterApp();
        }
        ['email','password','username','confirm'].forEach(k => { const el = $(k); if(el) el.value = ''; });
      }catch(err){ msg(translateError(err), 'err'); }
      finally{ btn.disabled = false; txt.textContent = original; checkSubmit(); }
    });
  }
  return { init, checkSubmit };
})();

/* ========== EDITOR ========== */
const Editor = (() => {
  let originalImage = null;
  let currentImage = null;
  let fgCanvas = document.createElement('canvas');
  let mainCanvas = null;
  let strokes = [];
  let texts = [];
  let adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
  let filterId = 'none';
  let filterIntensity = 1;
  let brushColor = '#e0b884';
  let brushSize = 8;
  let brushOpacity = 1;
  let drawMode = 'brush';
  let currentBg = { type:'original' };
  let bgImage = null;
  let bgColorValue = '#e0b884';
  let drawing = false;
  let currentStroke = null;
  let zoom = 1;
  let initDone = false;
  let finalBlob = null;
  let imgScale = 1;
  let imgAlpha = 1;
  let activePanel = null;

  const $c = id => document.getElementById(id);

  function init(){
    if (initDone) return;
    initDone = true;
    mainCanvas = $c('mainCanvas');

    /* Presets */
    const pw = $c('presets');
    if (pw){
      PRESETS.forEach(url => {
        const el = document.createElement('div');
        el.className = 'preset';
        el.innerHTML = `<img src="${url}" alt="" loading="lazy" crossorigin="anonymous">`;
        el.addEventListener('click', () => {
          document.querySelectorAll('.preset').forEach(x => x.classList.remove('active'));
          el.classList.add('active');
          setBg({ type:'preset', value:url });
        });
        pw.appendChild(el);
      });
    }

    /* Brush swatches */
    const bs = $c('brushSwatches');
    if (bs){
      BRUSH_SWATCHES.forEach(c => {
        const s = document.createElement('div');
        s.className = 'swatch';
        s.style.background = c;
        s.addEventListener('click', () => {
          brushColor = c;
          $c('brushColor').value = c;
          document.querySelectorAll('#brushSwatches .swatch').forEach(x => x.classList.remove('active'));
          s.classList.add('active');
        });
        bs.appendChild(s);
      });
    }

    /* Bg swatches */
    const bgs = $c('bgSwatches');
    if (bgs){
      BG_SWATCHES.forEach(c => {
        const s = document.createElement('div');
        s.className = 'swatch';
        s.style.background = c;
        s.addEventListener('click', () => {
          bgColorValue = c;
          $c('bgColor').value = c;
          document.querySelectorAll('#bgSwatches .swatch').forEach(x => x.classList.remove('active'));
          s.classList.add('active');
          setBg({ type:'color', value:c });
        });
        bgs.appendChild(s);
      });
    }

    /* Filters grid */
    const fg = $c('filtersGrid');
    if (fg){
      FILTERS.forEach(f => {
        const el = document.createElement('div');
        el.className = 'filter-item' + (f.id === 'none' ? ' active' : '');
        el.textContent = f.name;
        el.dataset.filter = f.id;
        el.addEventListener('click', () => {
          document.querySelectorAll('.filter-item').forEach(x => x.classList.remove('active'));
          el.classList.add('active');
          filterId = f.id;
          render();
        });
        fg.appendChild(el);
      });
    }

    /* Tabs */
    document.querySelectorAll('.tool').forEach(btn => {
      btn.addEventListener('click', () => openPanel(btn.dataset.tool));
    });
    document.querySelectorAll('.panel-close').forEach(btn => {
      btn.addEventListener('click', () => closePanel(btn.dataset.closePanel));
    });

    /* Subtabs bg */
    document.querySelectorAll('.subtab').forEach(tab => {
      tab.addEventListener('click', () => {
        const m = tab.dataset.bg;
        document.querySelectorAll('.subtab').forEach(x => x.classList.toggle('active', x === tab));
        document.querySelectorAll('.bg-content').forEach(c => c.classList.toggle('hidden', c.dataset.bgcontent !== m));
        if (m === 'transparent') setBg({ type:'checker' });
        if (m === 'original') setBg({ type:'original' });
      });
    });

    /* Draw mode */
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        drawMode = btn.dataset.drawmode;
      });
    });

    /* Brush controls */
    $c('brushSize')?.addEventListener('input', e => { brushSize = +e.target.value; $c('valBrushSize').textContent = brushSize + 'px'; });
    $c('brushColor')?.addEventListener('input', e => { brushColor = e.target.value; });
    $c('brushOpacity')?.addEventListener('input', e => { brushOpacity = e.target.value/100; $c('valBrushOpacity').textContent = e.target.value + '%'; });

    /* Adjust sliders */
    const adj = [
      ['rangeBrightness','brightness','valBrightness','%'],
      ['rangeContrast','contrast','valContrast','%'],
      ['rangeSaturation','saturation','valSaturation','%'],
      ['rangeHue','hue','valHue','°'],
      ['rangeBlur','blur','valBlur','px'],
      ['rangeOpacity','opacity','valOpacity','%']
    ];
    adj.forEach(([id, key, valId, suffix]) => {
      $c(id)?.addEventListener('input', e => {
        const v = +e.target.value;
        adjustments[key] = v;
        if ($c(valId)) $c(valId).textContent = v + suffix;
        render();
      });
    });

    /* Filter intensity */
    $c('rangeFilterIntensity')?.addEventListener('input', e => {
      filterIntensity = e.target.value / 100;
      $c('valFilterIntensity').textContent = e.target.value + '%';
      render();
    });

    /* Scale + alpha */
    $c('rangeScale')?.addEventListener('input', e => {
      imgScale = e.target.value / 100;
      $c('valScale').textContent = e.target.value + '%';
      render();
    });
    $c('rangeAlpha')?.addEventListener('input', e => {
      imgAlpha = e.target.value / 100;
      $c('valAlpha').textContent = e.target.value + '%';
      render();
    });

    /* Text size */
    $c('textSize')?.addEventListener('input', e => { $c('valTextSize').textContent = e.target.value + 'px'; });

    /* Add text */
    $c('btnAddText')?.addEventListener('click', () => {
      const text = $c('textInput').value.trim();
      if (!text) return toast('اكتب نصاً أولاً', 'err');
      const base = currentImage || originalImage;
      if (!base) return;
      const size = +$c('textSize').value;
      const color = $c('textColor').value;
      const font = $c('textFont').value;
      const bg = $c('textBg').value;
      texts.push({ text, x: base.naturalWidth/2, y: base.naturalHeight/2, size, color, font, bg });
      $c('textInput').value = '';
      render();
      toast('تمت إضافة النص ✓', 'ok');
    });

    /* Bg upload */
    const uz = $c('bgUploadZone');
    const fi = $c('bgFile');
    $c('bgChoose')?.addEventListener('click', e => { e.stopPropagation(); fi.click(); });
    uz?.addEventListener('click', () => fi.click());
    uz?.addEventListener('dragover', e => { e.preventDefault(); });
    uz?.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleBgUpload(f); });
    fi?.addEventListener('change', () => { const f = fi.files?.[0]; fi.value = ''; if (f) handleBgUpload(f); });

    /* Bg color picker */
    $c('bgColor')?.addEventListener('input', e => { bgColorValue = e.target.value; setBg({ type:'color', value:bgColorValue }); });

    /* Canvas events */
    if (mainCanvas){
      mainCanvas.addEventListener('pointerdown', onPointerDown);
      mainCanvas.addEventListener('pointermove', onPointerMove);
      mainCanvas.addEventListener('pointerup', onPointerUp);
      mainCanvas.addEventListener('pointercancel', onPointerUp);
    }

    /* Zoom */
    $c('zoomIn')?.addEventListener('click', () => { zoom = Math.min(3, zoom + .1); applyZoom(); });
    $c('zoomOut')?.addEventListener('click', () => { zoom = Math.max(.3, zoom - .1); applyZoom(); });
    $c('zoomReset')?.addEventListener('click', () => { zoom = 1; applyZoom(); });

    /* Actions */
    $c('btnUndo')?.addEventListener('click', () => {
      if (strokes.length){ strokes.pop(); render(); return toast('تراجع'); }
      if (texts.length){ texts.pop(); render(); return toast('تراجع'); }
      toast('لا يوجد شي للتراجع', 'err');
    });
    $c('btnReset')?.addEventListener('click', () => {
      if (!originalImage) return;
      adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
      filterId = 'none'; filterIntensity = 1;
      strokes = []; texts = [];
      imgScale = 1; imgAlpha = 1;
      ['Brightness','Contrast','Saturation','Hue','Blur','Opacity'].forEach(k => {
        const id = 'range'+k;
        const vId = 'val'+k;
        const defaults = { Brightness:100, Contrast:100, Saturation:100, Hue:0, Blur:0, Opacity:100 };
        const sfx = { Brightness:'%', Contrast:'%', Saturation:'%', Hue:'°', Blur:'px', Opacity:'%' };
        if($c(id)) $c(id).value = defaults[k];
        if($c(vId)) $c(vId).textContent = defaults[k] + sfx[k];
      });
      if($c('rangeScale')) $c('rangeScale').value = 100;
      if($c('rangeAlpha')) $c('rangeAlpha').value = 100;
      if($c('rangeFilterIntensity')) $c('rangeFilterIntensity').value = 100;
      if($c('valScale')) $c('valScale').textContent = '100%';
      if($c('valAlpha')) $c('valAlpha').textContent = '100%';
      if($c('valFilterIntensity')) $c('valFilterIntensity').textContent = '100%';
      document.querySelectorAll('.filter-item').forEach(x => x.classList.toggle('active', x.dataset.filter === 'none'));
      render();
      toast('تم إعادة الضبط ✓', 'ok');
    });
    $c('btnClearDraw')?.addEventListener('click', () => {
      if (!strokes.length && !texts.length) return toast('لا يوجد رسم أو نص', 'err');
      strokes = []; texts = []; render(); toast('تم المسح ✓', 'ok');
    });
    $c('btnResetAdjust')?.addEventListener('click', () => {
      adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
      ['Brightness','Contrast','Saturation','Hue','Blur','Opacity'].forEach(k => {
        const id = 'range'+k;
        const vId = 'val'+k;
        const defaults = { Brightness:100, Contrast:100, Saturation:100, Hue:0, Blur:0, Opacity:100 };
        const sfx = { Brightness:'%', Contrast:'%', Saturation:'%', Hue:'°', Blur:'px', Opacity:'%' };
        if($c(id)) $c(id).value = defaults[k];
        if($c(vId)) $c(vId).textContent = defaults[k] + sfx[k];
      });
      render();
      toast('تم إعادة التعديلات ✓', 'ok');
    });

    /* Remove BG */
    $c('btnRemoveBg')?.addEventListener('click', removeBackground);

    /* Save / Download / New */
    $c('btnSave')?.addEventListener('click', saveImage);
    $c('btnDownload')?.addEventListener('click', () => {
      if (!finalBlob) return toast('احفظ أولاً', 'err');
      downloadBlob(finalBlob, `removebg-${Date.now()}.png`);
      toast('تم التحميل ✓', 'ok');
    });
    $c('btnNewImg')?.addEventListener('click', () => {
      reset();
      toast('ارفع صورة جديدة');
    });

    /* File input + drag */
    const stage = $c('uploadStage');
    const fileInput = $c('fileInput');
    $c('chooseBtn')?.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
    stage?.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      fileInput.click();
    });
    ['dragenter','dragover'].forEach(n => stage?.addEventListener(n, e => {
      e.preventDefault(); stage.classList.add('drag');
    }));
    ['dragleave','drop'].forEach(n => stage?.addEventListener(n, e => {
      e.preventDefault(); stage.classList.remove('drag');
    }));
    stage?.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f) handleFile(f); });
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0]; fileInput.value = '';
      if (f) handleFile(f);
    });
  }

  /* ===== PANEL MANAGEMENT ===== */
  function openPanel(name){
    if (activePanel === name){
      closePanel(name);
      return;
    }
    activePanel = name;
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
    document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t.dataset.tool === name));
    if (name === 'draw') mainCanvas.classList.add('tool-brush');
    else mainCanvas.classList.remove('tool-brush','tool-eraser');
    document.querySelector('.ws-panels')?.scrollIntoView({behavior:'smooth', block:'nearest'});
  }
  function closePanel(name){
    activePanel = null;
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    if (mainCanvas) mainCanvas.classList.remove('tool-brush','tool-eraser');
  }

  function applyZoom(){
    if (mainCanvas) mainCanvas.style.transform = `scale(${zoom})`;
    if ($c('zoomVal')) $c('zoomVal').textContent = Math.round(zoom*100) + '%';
  }

  /* ===== FILE HANDLING ===== */
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
        originalImage = img;
        currentImage = img;
        strokes = []; texts = [];
        currentBg = { type:'original' };
        adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
        filterId = 'none'; filterIntensity = 1;
        imgScale = 1; imgAlpha = 1;
        if ($c('rangeScale')) $c('rangeScale').value = 100;
        if ($c('rangeAlpha')) $c('rangeAlpha').value = 100;
        if ($c('valScale')) $c('valScale').textContent = '100%';
        if ($c('valAlpha')) $c('valAlpha').textContent = '100%';
        closePanel();
        render();
        applyZoom();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ===== REMOVE BACKGROUND ===== */
  async function removeBackground(){
    const btn = $c('btnRemoveBg');
    const loading = $c('canvasLoading');
    const loadingText = $c('canvasLoadingText');
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');

    const s = await Auth.valid();
    if (!s?.access_token || !s?.user?.id){ toast('انتهت الجلسة', 'err'); App.showAuth(); return; }
    Auth.session = s;
    if (!Auth.profile) Auth.profile = await API.getProfile(s.user.id, s.access_token);
    if (Auth.profile?.is_banned) return toast('الحساب موقوف', 'err');
    if (!Auth.isPro()){
      const today = await API.countToday(s.access_token, s.user.id).catch(()=>0);
      const lim = Number(Auth.profile?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
      if (lim > 0 && today >= lim) return toast(`وصلت للحد اليومي (${lim})`, 'err');
    }

    if (btn) btn.disabled = true;
    if (loadingText) loadingText.textContent = 'جاري إزالة الخلفية...';
    loading?.classList.remove('hidden');

    try {
      const c = document.createElement('canvas');
      c.width = base.naturalWidth;
      c.height = base.naturalHeight;
      c.getContext('2d').drawImage(base, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const file = new File([blob], 'source.png', { type: 'image/png' });

      const origPath = await API.upload(s.access_token, s.user.id, file, 'orig').catch(()=>null);
      const resultBlob = await API.removeBg(file);
      const resPath = await API.upload(s.access_token, s.user.id, resultBlob, 'res').catch(()=>null);
      if (origPath && resPath) await API.saveOp(s.access_token, origPath, resPath).catch(()=>{});

      await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(resultBlob);
        const img = new Image();
        img.onload = () => { currentImage = img; render(); resolve(); };
        img.onerror = reject;
        img.src = url;
      });

      /* Switch to transparent */
      currentBg = { type:'checker' };
      document.querySelectorAll('.subtab').forEach(x => x.classList.toggle('active', x.dataset.bg === 'transparent'));
      document.querySelectorAll('.bg-content').forEach(c => c.classList.toggle('hidden', c.dataset.bgcontent !== 'transparent'));
      render();

      if (App.refreshUsage) App.refreshUsage();
      toast('تمت إزالة الخلفية ✓', 'ok');
    } catch(e){
      console.error(e);
      toast(e.message || 'فشلت العملية', 'err');
    } finally {
      if (btn) btn.disabled = false;
      loading?.classList.add('hidden');
    }
  }

  /* ===== CANVAS INTERACTION ===== */
  function getPointer(e){
    const rect = mainCanvas.getBoundingClientRect();
    const sx = mainCanvas.width / rect.width;
    const sy = mainCanvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }
  function onPointerDown(e){
    const base = currentImage || originalImage;
    if (!base) return;
    if (activePanel !== 'draw' && activePanel !== 'text') return;
    const p = getPointer(e);

    if (activePanel === 'text'){
      const text = $c('textInput').value.trim() || 'نص';
      const size = +$c('textSize').value;
      const color = $c('textColor').value;
      const font = $c('textFont').value;
      const bg = $c('textBg').value;
      texts.push({ text, x:p.x, y:p.y, size, color, font, bg });
      render();
      toast('تمت إضافة النص');
      return;
    }
    if (activePanel === 'draw'){
      drawing = true;
      currentStroke = { tool: drawMode, color: brushColor, size: brushSize, opacity: brushOpacity, points: [p] };
      mainCanvas.classList.add('dragging');
      try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
    }
  }
  function onPointerMove(e){
    if (!drawing || !currentStroke) return;
    const p = getPointer(e);
    currentStroke.points.push(p);
    render();
  }
  function onPointerUp(e){
    if (drawing && currentStroke){
      strokes.push(currentStroke);
      currentStroke = null;
      drawing = false;
      mainCanvas.classList.remove('dragging');
    }
  }

  /* ===== RENDER ===== */
  function applyFilter(id, intensity, ctx){
    /* intensity between 0 and 1 */
    const t = intensity;
    if (id === 'none') return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    if (id === 'grayscale'){
      ctx.fillStyle = `rgba(128,128,128,${t})`;
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'sepia'){
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(200,150,80,${t*.6})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'invert'){
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = `rgba(255,255,255,${t})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'vivid'){
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(255,100,150,${t*.3})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'cool'){
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(150,200,255,${t*.4})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'warm'){
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(255,180,100,${t*.5})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'dramatic'){
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(0,0,0,${t*.3})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    } else if (id === 'fade'){
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255,245,220,${t*.25})`;
      ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);
    }
    ctx.restore();
  }

  function render(){
    const base = currentImage || originalImage;
    if (!base || !mainCanvas) return;

    const W = base.naturalWidth;
    const H = base.naturalHeight;
    mainCanvas.width = W;
    mainCanvas.height = H;

    /* Foreground */
    fgCanvas.width = W;
    fgCanvas.height = H;
    const fg = fgCanvas.getContext('2d');
    fg.clearRect(0,0,W,H);

    const b = adjustments.brightness;
    const c = adjustments.contrast;
    const s = adjustments.saturation;
    const h = adjustments.hue;
    const blur = adjustments.blur;
    const op = adjustments.opacity;
    fg.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) blur(${blur}px)`;
    fg.globalAlpha = imgAlpha * (op/100);
    const scaledW = W * imgScale;
    const scaledH = H * imgScale;
    const dx = (W - scaledW) / 2;
    const dy = (H - scaledH) / 2;
    fg.drawImage(base, dx, dy, scaledW, scaledH);
    fg.filter = 'none';
    fg.globalAlpha = 1;

    /* Apply filter on fg */
    if (filterId !== 'none') applyFilter(filterId, filterIntensity, fg);

    /* Strokes */
    for (const st of strokes) drawStroke(fg, st);
    if (currentStroke) drawStroke(fg, currentStroke);

    /* Texts */
    for (const t of texts){
      fg.save();
      fg.font = `bold ${t.size}px ${t.font}`;
      fg.textAlign = 'center';
      fg.textBaseline = 'middle';
      const tw = fg.measureText(t.text).width;
      if (t.bg && t.bg !== 'none'){
        fg.fillStyle = t.bg;
        const pad = t.size * .3;
        roundRect(fg, t.x - tw/2 - pad, t.y - t.size/2 - pad*.6, tw + pad*2, t.size + pad*1.2, 8);
        fg.fill();
      }
      fg.fillStyle = t.color;
      fg.fillText(t.text, t.x, t.y);
      fg.restore();
    }

    /* Main */
    const ctx = mainCanvas.getContext('2d');
    ctx.clearRect(0,0,W,H);

    if (currentBg.type === 'color'){
      ctx.fillStyle = currentBg.value;
      ctx.fillRect(0,0,W,H);
    } else if (currentBg.type === 'original'){
      drawChecker(ctx, W, H);
    } else if ((currentBg.type === 'preset' || currentBg.type === 'upload') && bgImage?.complete && bgImage.naturalWidth){
      drawCover(ctx, bgImage, W, H);
    } else if (currentBg.type === 'checker'){
      drawChecker(ctx, W, H);
    }

    ctx.drawImage(fgCanvas, 0, 0);
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  function drawStroke(ctx, st){
    ctx.save();
    if (st.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = st.opacity ?? 1;
    ctx.beginPath();
    const pts = st.points;
    if (pts.length === 1){
      ctx.arc(pts[0].x, pts[0].y, st.size/2, 0, Math.PI*2);
      ctx.fillStyle = st.color;
      ctx.fill();
    } else {
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawCover(ctx, img, w, h){
    const ir = img.width / img.height;
    const cr = w / h;
    let sw, sh, sx, sy;
    if (ir > cr){ sh = img.height; sw = sh * cr; sx = (img.width - sw) / 2; sy = 0; }
    else { sw = img.width; sh = sw / cr; sx = 0; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  }
  function drawChecker(ctx, w, h){
    const s = Math.max(12, Math.round(w/60));
    for (let y = 0; y < h; y += s){
      for (let x = 0; x < w; x += s){
        ctx.fillStyle = ((x/s + y/s) % 2 === 0) ? '#160d18' : '#1e1422';
        ctx.fillRect(x, y, s, s);
      }
    }
  }

  function setBg(bg){
    currentBg = bg;
    if (bg.type === 'preset'){
      bgImage = new Image();
      bgImage.crossOrigin = 'anonymous';
      bgImage.onload = render;
      bgImage.onerror = () => toast('تعذر تحميل الخلفية', 'err');
      bgImage.src = bg.value;
    } else if (bg.type === 'upload'){
      bgImage = new Image();
      bgImage.onload = render;
      bgImage.src = bg.value;
    } else {
      bgImage = null;
    }
    render();
  }
  function handleBgUpload(file){
    if (!file.type.startsWith('image/')) return toast('صيغة غير مدعومة', 'err');
    if (file.size > 10*1024*1024) return toast('الحجم > 10MB', 'err');
    const url = URL.createObjectURL(file);
    setBg({ type:'upload', value:url });
    toast('تم تحميل الخلفية ✓', 'ok');
  }

  /* ===== SAVE / DOWNLOAD ===== */
  async function saveImage(){
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const btn = $c('btnSave');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = 'جاري الحفظ...';
    try{
      render();
      const outBlob = await new Promise(r => mainCanvas.toBlob(r, 'image/png'));
      finalBlob = outBlob;
      $c('btnDownload')?.classList.remove('hidden');
      toast('تم الحفظ ✓ اضغط تحميل', 'ok');
    }catch(e){
      console.error(e);
      toast('فشل الحفظ', 'err');
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
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
    strokes = []; texts = [];
    adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
    filterId = 'none'; filterIntensity = 1;
    currentBg = { type:'original' };
    bgImage = null;
    imgScale = 1; imgAlpha = 1;
    $c('uploadStage')?.classList.remove('hidden');
    $c('workspace')?.classList.add('hidden');
    $c('btnDownload')?.classList.add('hidden');
    closePanel();
  }

  async function openWithBlob(blob){
    await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        originalImage = img; currentImage = img;
        strokes = []; texts = [];
        currentBg = { type:'original' };
        adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100 };
        filterId = 'none'; filterIntensity = 1;
        imgScale = 1; imgAlpha = 1;
        render(); applyZoom();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
    $c('uploadStage')?.classList.add('hidden');
    $c('workspace')?.classList.remove('hidden');
    $c('btnDownload')?.classList.add('hidden');
    finalBlob = null;
  }

  return { init, openWithBlob, reset };
})();

/* ========== APP ========== */
const App = (() => {
  let opsCache = [];
  const showAuth = () => { $('authScreen').classList.remove('hidden'); $('appScreen').classList.add('hidden'); };
  const showApp = () => { $('authScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden'); };
  async function enterApp(){
    if(!Auth.profile && Auth.session?.user){ Auth.profile = await API.getProfile(Auth.session.user.id, Auth.session.access_token); }
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
      if(!ops.length){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">◌</div><h3>لا توجد عمليات</h3><p>ابدأ من الاستوديو</p></div>`; return; }
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
        if(b.dataset.act === 'dl'){ b.disabled=true; b.textContent='...'; try{ const u = await API.resolveImg(op.result_url, s.access_token); if(!u) throw new Error('تعذر التجهيز'); await downloadFromUrl(u, `removebg-${String(op.id).slice(0,8)}.png`); }catch(err){ toast(err.message||'فشل التحميل','err'); } finally{ b.disabled=false; b.textContent='⬇ تحميل'; } }
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

/* ========== ADMIN ========== */
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
    if(!ops.length) aw.innerHTML = `<div class="empty"><div class="empty-icon">◌</div><h3>لا عمليات</h3></div>`;
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

/* ========== BOOT ========== */
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
