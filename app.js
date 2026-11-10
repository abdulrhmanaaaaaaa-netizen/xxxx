const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = v => { if(!v) return '—'; try{ const d=new Date(v); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch{ return String(v); } };
const todayISO = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const initials = v => { const t=String(v||'?').trim(); return t?t.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; };
const wait = ms => new Promise(r => setTimeout(r, ms));

const PRESETS = [
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=400&q=80',
];

const FILTERS = [
  { id:'none', name:'الأصلي', cat:'basic', css:'none' },
  { id:'grayscale', name:'رمادي', cat:'basic', css:'grayscale(1)' },
  { id:'sepia', name:'سيبيا', cat:'warm', css:'sepia(.85)' },
  { id:'invert', name:'عكسي', cat:'art', css:'invert(1)' },
  { id:'vivid', name:'حيوي', cat:'warm', css:'saturate(1.6) contrast(1.15)' },
  { id:'cool', name:'بارد', cat:'cool', css:'hue-rotate(180deg) saturate(1.1)' },
  { id:'warm', name:'دافئ', cat:'warm', css:'sepia(.3) saturate(1.4)' },
  { id:'dramatic', name:'درامي', cat:'art', css:'contrast(1.5) brightness(.9)' },
  { id:'vintage', name:'عتيق', cat:'art', css:'sepia(.5) saturate(.7) contrast(1.1)' }
];

const Loader = (() => {
  async function run(){
    let p = 0;
    const fill = $('ldFill'), pct = $('ldPct'), stepEl = $('ldStep');
    const steps = ['تهيئة النظام...', 'تحميل المكتبات...', 'تجهيز المحرر...', 'جاهز ✓'];
    const tick = setInterval(() => {
      p = Math.min(100, p + Math.random()*15 + 5);
      if(fill) fill.style.width = p + '%';
      if(pct) pct.textContent = Math.round(p) + '%';
      if(stepEl) stepEl.textContent = steps[Math.min(3, Math.floor(p / 25))];
      if(p >= 100) clearInterval(tick);
    }, 150);
    await wait(2000);
    $('loader').classList.add('hide');
  }
  return { run };
})();

// نظام المصادقة (Supabase كامل كما في كودك)
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
  const updateUser = async (tk, data) => req('/auth/v1/user', { method:'PATCH', body: JSON.stringify({ data }) }, tk);
  const signout = async s => { if(!s?.access_token) return; try{ await fetch(CONFIG.SUPABASE_URL+'/auth/v1/logout', {method:'POST', headers:{ apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` }}); }catch{} };
  const getProfile = async (uid, tk) => { try{ const d = await req(`/rest/v1/profiles?id=eq.${encodeURIComponent(uid)}&select=*`, {method:'GET'}, tk); return Array.isArray(d)?d[0]||null:null; }catch{ return null; } };
  const fetchOps = async (tk, uid) => { const d = await req(`/rest/v1/operations?user_id=eq.${encodeURIComponent(uid)}&deleted_at=is.null&select=*&order=created_at.desc&limit=100`, {method:'GET'}, tk); return Array.isArray(d)?d:[]; };
  const countToday = async (tk, uid) => { const d = await req(`/rest/v1/operations?user_id=eq.${encodeURIComponent(uid)}&created_at=gte.${encodeURIComponent(todayISO())}&select=id`, {method:'GET'}, tk); return Array.isArray(d)?d.length:0; };
  const saveOp = async (tk, op, rp) => { const d = await req('/rest/v1/rpc/create_removebg_operation', { method:'POST', body: JSON.stringify({ p_original_path: op, p_result_path: rp }) }, tk); return Array.isArray(d)?d[0]||null:d; };
  const delOp = async (tk, id) => req('/rest/v1/rpc/soft_delete_operation', { method:'POST', body: JSON.stringify({ p_operation_id: id }) }, tk);
  const extractPath = v => { if(!v) return null; const t = String(v); const marks = [`/storage/v1/object/public/${CONFIG.BUCKET}/`, `/storage/v1/object/${CONFIG.BUCKET}/`]; for(const m of marks){ if(t.includes(m)) return t.split(m)[1]?.split('?')[0]||null; } if(t.startsWith(`${CONFIG.BUCKET}/`)) return t.slice(CONFIG.BUCKET.length+1); if(t.startsWith('http')) return null; return t.replace(/^\/+/, '').split('?')[0]; };
  const signedUrl = async (tk, path, sec = CONFIG.SIGNED_URL_SECONDS) => {
    if(!path) return null;
    const clean = String(path).replace(/^\/+/, '').split('?')[0];
    const enc = clean.split('/').map(encodeURIComponent).join('/');
    try {
      const d = await req(`/storage/v1/object/sign/${CONFIG.BUCKET}/${enc}`, { method:'POST', body: JSON.stringify({ expiresIn: sec }) }, tk);
      const raw = d?.signedURL || d?.signedUrl || d?.url || d?.signed_url;
      if(!raw) return null;
      if(/^https:\/\//i.test(raw)) return raw;
      const base = CONFIG.SUPABASE_URL.replace(/\/$/, '');
      if(raw.startsWith('/storage/v1/')) return base + raw;
      if(raw.startsWith('/object/')) return base + '/storage/v1' + raw;
      return base + '/storage/v1/' + raw.replace(/^\/+/, '');
    } catch { return null; }
  };
  const publicUrl = path => { if(!path) return null; const clean = String(path).replace(/^\/+/, '').split('?')[0]; const enc = clean.split('/').map(encodeURIComponent).join('/'); return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${CONFIG.BUCKET}/${enc}`; };
  const resolveImg = async (v, tk) => { if(!v) return null; const p = extractPath(v); if(!p) return v; const s = await signedUrl(tk, p); return s || publicUrl(p); };
  const upload = async (tk, uid, blob, folder) => {
    const name = `${uid}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.png`;
    const r = await fetch(`${CONFIG.SUPABASE_URL}/storage/v1/object/${CONFIG.BUCKET}/${name}`, { method:'POST', headers:{ Authorization:`Bearer ${tk}`, apikey: CONFIG.SUPABASE_KEY, 'Content-Type':'image/png', 'x-upsert':'false', 'cache-control':'3600' }, body: blob });
    if(!r.ok){ const t = await r.text().catch(()=> ''); throw new Error(`فشل الرفع (${r.status}) ${t}`); }
    return name;
  };
  const removeBg = async file => {
    if (!file || !(file instanceof Blob) || !file.size) throw new Error('ملف الصورة غير صالح للمعالجة.');
    const endpoint = CONFIG.MATTE_PROXY || CONFIG.PIXELCUT_DIRECT;
    const fd = new FormData();
    fd.append('format', 'png');
    fd.append('model', 'v1');
    fd.append('image', file, file.name || 'image.png');
    const headers = { Accept:'application/json,text/plain,*/*', 'x-locale':'en' };
    if (!CONFIG.MATTE_PROXY && CONFIG.PIXELCUT_CLIENT_VERSION) headers['x-client-version'] = CONFIG.PIXELCUT_CLIENT_VERSION;
    let response = await fetch(endpoint, { method:'POST', headers, body:fd });
    if (!response.ok) throw new Error('فشلت خدمة إزالة الخلفية');
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('image/')) return await response.blob();
    throw new Error('لم تُرجع الخدمة صورة صالحة.');
  };
  return { login, signup, refresh, getUser, updateUser, signout, getProfile, fetchOps, countToday, saveOp, delOp, resolveImg, upload, removeBg };
})();

const Auth = (() => {
  let session = null, profile = null;
  const save = s => { session = s; if(s) localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(CONFIG.SESSION_KEY); };
  const saved = () => { try{ const r = localStorage.getItem(CONFIG.SESSION_KEY); return r?JSON.parse(r):null; }catch{ return null; } };
  async function valid(){
    const s = session || saved();
    if(!s) return null;
    const exp = s.expires_at || 0;
    if(exp && Date.now() < exp - 60000){ session = s; return s; }
    const r = await API.refresh(s); save(r); return r;
  }
  async function doLogin(email, pwd){ const s = await API.login(email, pwd); if(!s.user) s.user = await API.getUser(s); save(s); profile = await API.getProfile(s.user.id, s.access_token); return s; }
  async function doSignup(email, pwd, username){ const r = await API.signup(email, pwd, username); save(r); profile = await API.getProfile(r.user.id, r.access_token); return r; }
  async function doLogout(){ save(null); session = null; profile = null; App.showAuth(); }
  return { valid, doLogin, doSignup, doLogout, save, get session(){ return session; }, set session(s){ session = s; }, get profile(){ return profile; }, set profile(p){ profile = p; }, isPro(){ return profile?.plan === 'pro'; } };
})();

const AuthUI = (() => {
  let mode = 'login';
  const setMode = m => {
    mode = m;
    const reg = m === 'register';
    $('formTitle').textContent = reg ? 'أنشئ حسابك' : 'مرحباً بك';
    $('fUsername').classList.toggle('hidden', !reg);
    $('fConfirm').classList.toggle('hidden', !reg);
    $('submitBtn').querySelector('.btn-text').textContent = reg ? 'إنشاء الحساب' : 'تسجيل الدخول';
    $('switchText').textContent = reg ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟';
    $('switchBtn').textContent = reg ? 'سجّل الدخول' : 'أنشئ حساباً';
  };
  function init(){
    setMode('login');
    $('switchBtn').onclick = () => setMode(mode === 'login' ? 'register' : 'login');
    $('authForm').onsubmit = async e => {
      e.preventDefault();
      const email = $('email').value; const pwd = $('password').value;
      const btn = $('submitBtn'); btn.disabled = true;
      try{
        if(mode === 'login') await Auth.doLogin(email, pwd);
        else await Auth.doSignup(email, pwd, $('username').value);
        App.showApp();
      }catch(err){ $('authMsg').textContent = err.message; $('authMsg').classList.add('show'); }
      finally{ btn.disabled = false; }
    };
  }
  return { init };
})();

const App = {
  showAuth: () => { $('authScreen').classList.remove('hidden'); $('appScreen').classList.add('hidden'); },
  showApp: () => { $('authScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden'); Editor.init(); },
  switchView: (name) => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    ['editor','assets','history','profile'].forEach(v => {
      const el = $(v+'View');
      if(el) el.classList.toggle('hidden', v !== name);
    });
  }
};

const Editor = (() => {
  let originalImage = null, currentImage = null;
  let mainCanvas = null;
  let adjustments = { brightness:100, contrast:100, saturation:100, blur:0 };
  let filterId = 'none', filterIntensity = 1, artStyleId = 'none', visualFxId = 'none';
  let currentBg = { type:'original' };
  let bgImage = null;

  function init(){
    if (mainCanvas) return;
    mainCanvas = $('mainCanvas');
    
    const pw = $('presets');
    if (pw) PRESETS.forEach(url => {
      const el = document.createElement('button'); el.className = 'preset';
      el.innerHTML = `<img src="${url}" alt="" crossorigin="anonymous">`;
      el.onclick = async () => {
        if(!currentImage) return toast('ارفع صورة أولاً', 'err');
        const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
        img.onload = () => { bgImage = img; currentBg = { type:'preset' }; render(); };
      };
      pw.appendChild(el);
    });

    const fg = $('filtersGrid');
    if (fg) FILTERS.forEach(f => {
      const el = document.createElement('div'); el.className = 'filter-thumb';
      el.innerHTML = `<canvas width="50" height="50"></canvas><div class="thumb-label" style="font-size:10px;text-align:center;color:#fff;background:#000a;padding:2px;">${f.name}</div>`;
      el.onclick = () => { filterId = f.id; document.querySelectorAll('.filter-thumb').forEach(x=>x.classList.remove('active')); el.classList.add('active'); render(); };
      fg.appendChild(el);
    });

    document.querySelectorAll('.tool').forEach(btn => btn.onclick = () => {
      const name = btn.dataset.tool;
      $('workspace').classList.add('has-panel');
      document.querySelectorAll('.ws-panels .panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
      document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t === btn));
    });
    
    document.querySelectorAll('.panel-close').forEach(btn => btn.onclick = () => {
      $('workspace').classList.remove('has-panel');
      document.querySelectorAll('.ws-panels .panel').forEach(p => p.classList.add('hidden'));
      document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    });

    document.querySelectorAll('[data-art-style]').forEach(btn => btn.onclick = () => {
      artStyleId = btn.dataset.artStyle;
      document.querySelectorAll('[data-art-style]').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });
    document.querySelectorAll('[data-visual-fx]').forEach(btn => btn.onclick = () => {
      visualFxId = btn.dataset.visualFx;
      document.querySelectorAll('[data-visual-fx]').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });

    ['rangeBrightness','rangeContrast','rangeSaturation','rangeBlur'].forEach(id => {
      $(id).oninput = (e) => {
        const key = id.replace('range','').toLowerCase();
        adjustments[key] = +e.target.value;
        render();
      };
    });

    $('chooseBtn').onclick = () => $('fileInput').click();
    $('fileInput').onchange = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        originalImage = img; currentImage = img;
        $('uploadStage').classList.add('hidden');
        $('workspace').classList.remove('hidden');
        $('canvasDimensions').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        render();
      };
      img.src = url;
    };

    $('btnRemoveBg').onclick = async () => {
      if(!currentImage) return;
      $('canvasLoading').classList.remove('hidden');
      try {
        const canvas = document.createElement('canvas'); canvas.width = currentImage.width; canvas.height = currentImage.height;
        canvas.getContext('2d').drawImage(currentImage, 0, 0);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const res = await API.removeBg(blob);
        const newUrl = URL.createObjectURL(res);
        const newImg = new Image();
        newImg.onload = () => { currentImage = newImg; render(); toast('تمت الإزالة', 'ok'); };
        newImg.src = newUrl;
      } catch(e) { toast(e.message, 'err'); }
      finally { $('canvasLoading').classList.add('hidden'); }
    };

    $('btnSave').onclick = () => {
      if(!currentImage) return;
      render();
      mainCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'edited.png'; a.click();
        toast('تم التصدير', 'ok');
      }, 'image/png');
    };
    
    $('btnReset').onclick = () => { if(originalImage) { currentImage = originalImage; adjustments = { brightness:100, contrast:100, saturation:100, blur:0 }; filterId='none'; artStyleId='none'; visualFxId='none'; currentBg={type:'original'}; bgImage=null; render(); } };
  }

  function render(){
    if(!currentImage || !mainCanvas) return;
    const W = currentImage.naturalWidth, H = currentImage.naturalHeight;
    mainCanvas.width = W; mainCanvas.height = H;
    const ctx = mainCanvas.getContext('2d');

    ctx.clearRect(0,0,W,H);
    if(currentBg.type === 'preset' && bgImage){
      const scale = Math.max(W / bgImage.width, H / bgImage.height);
      const sw = bgImage.width * scale, sh = bgImage.height * scale;
      ctx.drawImage(bgImage, (W-sw)/2, (H-sh)/2, sw, sh);
    } else {
      ctx.fillStyle = '#111'; ctx.fillRect(0,0,W,H);
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W; tempCanvas.height = H;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`;
    tCtx.drawImage(currentImage, 0, 0);

    if(filterId !== 'none'){
      const f = FILTERS.find(x => x.id === filterId);
      if(f && f.css !== 'none'){ tCtx.filter = f.css; tCtx.drawImage(tempCanvas, 0, 0); }
    }

    if(artStyleId !== 'none') applyArtStyle(tCtx, W, H, artStyleId);
    ctx.drawImage(tempCanvas, 0, 0);
    if(visualFxId !== 'none') applyVisualEffect(ctx, W, H, visualFxId, 0.6);
  }

  function applyArtStyle(ctx, W, H, style){
    const imgData = ctx.getImageData(0, 0, W, H); const data = imgData.data;
    if(style === 'anime' || style === 'cartoon'){
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], b = data[i+2]; const avg = (r+g+b)/3;
        r = avg + (r - avg) * 1.5; g = avg + (g - avg) * 1.5; b = avg + (b - avg) * 1.5;
        data[i] = r; data[i+1] = g; data[i+2] = b;
      }
      const levels = style === 'anime' ? 6 : 4; const step = 255 / (levels - 1);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step; data[i+1] = Math.round(data[i+1] / step) * step; data[i+2] = Math.round(data[i+2] / step) * step;
      }
      const output = ctx.createImageData(W, H);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const i = (y * W + x) * 4;
          const getLum = (px, py) => { const idx = (py * W + px) * 4; return data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114; };
          const gx = -getLum(x-1,y-1) + getLum(x+1,y-1) - 2*getLum(x-1,y) + 2*getLum(x+1,y) - getLum(x-1,y+1) + getLum(x+1,y+1);
          const gy = -getLum(x-1,y-1) - 2*getLum(x,y-1) - getLum(x+1,y-1) + getLum(x-1,y+1) + 2*getLum(x,y+1) + getLum(x+1,y+1);
          const mag = Math.sqrt(gx*gx + gy*gy);
          if(mag > 60){ output.data[i] = 20; output.data[i+1] = 20; output.data[i+2] = 20; output.data[i+3] = 255; }
          else { output.data[i] = data[i]; output.data[i+1] = data[i+1]; output.data[i+2] = data[i+2]; output.data[i+3] = 255; }
        }
      }
      ctx.putImageData(output, 0, 0);
    }
  }

  function applyVisualEffect(ctx, W, H, id, alpha){
    ctx.save();
    if(id === 'rain'){
      ctx.strokeStyle = `rgba(180, 200, 220, ${alpha * 0.4})`; ctx.lineWidth = 1.5; ctx.beginPath();
      for(let i=0; i<200; i++){ let x = Math.random() * W; let y = Math.random() * H; let len = 20 + Math.random() * 40; ctx.moveTo(x, y); ctx.lineTo(x - len*0.2, y + len); }
      ctx.stroke();
    } else if(id === 'snow'){
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for(let i=0; i<300; i++){ let x = Math.random() * W; let y = Math.random() * H; let r = 1 + Math.random() * 3; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); }
    } else if(id === 'fire'){
      ctx.globalCompositeOperation = 'screen';
      for(let i=0; i<120; i++){
        let x = Math.random() * W; let y = H - Math.random() * H * 0.6; let r = 3 + Math.random() * 10;
        let g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,200,50,${alpha * 0.6})`); g.addColorStop(0.6, `rgba(255,80,0,${alpha * 0.3})`); g.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if(id === 'grain'){
      const imgData = ctx.getImageData(0,0,W,H); const data = imgData.data;
      for(let i=0; i<data.length; i+=4){ const noise = (Math.random() - 0.5) * 40; data[i] += noise; data[i+1] += noise; data[i+2] += noise; }
      ctx.putImageData(imgData, 0, 0);
    }
    ctx.restore();
  }

  return { init };
})();

function toast(msg, type=''){
  const el = $('toast');
  el.className = 'toast show ' + type;
  el.textContent = msg;
  setTimeout(() => el.classList.remove('show'), 3000);
}

(async function() {
  AuthUI.init();
  await Loader.run();
  const session = await Auth.valid();
  if(session){ App.showApp(); } else { App.showAuth(); }
})();
