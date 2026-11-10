const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = v => { if(!v) return '—'; try{ const d=new Date(v); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch{ return String(v); } };
const todayISO = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const initials = v => { const t=String(v||'?').trim(); return t?t.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// (مصفوفات الخلفيات، الفلاتر، الإطارات، الملصقات - مختصرة هنا للتركيز على المحرر)
const PRESETS = ['https://i.postimg.cc/SsY3CNhB/06b2725f5d4eaed9019cdd45727369cb.jpg','https://i.postimg.cc/zBH6KXrP/189db98cca60bfab2425301f9554e569.jpg','https://i.postimg.cc/FRk83s4G/24120c0c61a7f0bea682cadbc2a2c864.jpg'];
const ONLINE_BACKGROUNDS = [{name:'رخام بني',tag:'ملمس',url:'https://images.unsplash.com/photo-1640900726922-d13d64b17efe?auto=format&fit=crop&w=1400&q=85'}];
const ONLINE_OVERLAYS = [{id:'warm-light',name:'ضوء ذهبي',mode:'screen',url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85'}];
const FILTERS = [{ id:'none', name:'الأصلي', cat:'basic', css:'none' },{ id:'grayscale', name:'رمادي', cat:'basic', css:'grayscale(1)' },{ id:'sepia', name:'سيبيا', cat:'warm', css:'sepia(.85)' },{ id:'invert', name:'عكسي', cat:'art', css:'invert(1)' },{ id:'vivid', name:'حيوي', cat:'warm', css:'saturate(1.6) contrast(1.15)' }];
const BORDERS = [{ id:'none', name:'بدون إطار', style:'none', type:'none' },{ id:'gallery', name:'معرض كلاسيكي', style:'gallery', type:'solid', color:'#f0e8dc', c1:'#f0e8dc', c2:'#c99570' }];
const STICKER_GROUPS = [{ id:'faces', name:'وجوه', items:[['😀','ابتسامة'],['😂','ضحك'],['😍','إعجاب']] }];
const STICKER_ITEMS = STICKER_GROUPS.flatMap(group => group.items.map(([emoji,label]) => ({ emoji, label, group:group.id })));
const BG_SWATCHES = ['#ffffff','#111210','#e0b884','#c99570','#c4783a'];

const toastEl = $('toast');
function toast(msg, type=''){ if(!toastEl) return; toastEl.className = 'toast show ' + type; toastEl.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 3600); }

/* Loader & Auth & API (محاكاة تعمل لتجربة الواجهة فوراً) */
const Loader = { run: async () => { let p=0; const f=$('ldFill'), pct=$('ldPct'); const t=setInterval(()=>{ p=Math.min(100,p+15); if(f)f.style.width=p+'%'; if(pct)pct.textContent=p+'%'; if(p>=100){clearInterval(t); $('loader').classList.add('hide');} }, 150); await wait(1500); } };
const Auth = { isPro:()=>true, isDev:()=>true, valid:async()=>({access_token:'dummy',user:{id:'123'}}), doLogout:()=>{ $('appScreen').classList.add('hidden'); $('authScreen').classList.remove('hidden'); }, profile:{username:'User',plan:'pro'} };
const API = { countToday:async()=>0, fetchOps:async()=>[], updateUser:async()=>({}), upload:async()=>('path'), getProfile:async()=>({}) };
const AuthUI = { init: () => { $('authForm').onsubmit = (e) => { e.preventDefault(); $('authScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden'); Editor.init(); }; } };
const Admin = { init:()=>{}, refresh:()=>{} };

/* Editor Module (القلب النابض للمحرر) */
const Editor = (() => {
  let originalImage = null, currentImage = null;
  let mainCanvas = null;
  let adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
  let filterId = 'none', artStyleId = 'none', visualFxId = 'none';
  let currentBg = { type:'original' };
  let bgImage = null;
  let imgScale = 1, imgAlpha = 1, imgOffsetX = 0, imgOffsetY = 0;
  let zoom = 1, fitScale = 1;
  let selectedId = null;
  let texts = [], stickers = [], strokes = [];
  let textIdCounter = 0, stickerIdCounter = 0;

  const $c = id => document.getElementById(id);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function init() {
    mainCanvas = $c('mainCanvas');
    $c('chooseBtn').onclick = () => $c('fileInput').click();
    $c('fileInput').onchange = (e) => {
      const f = e.target.files[0];
      if(!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        originalImage = img; currentImage = img;
        $c('uploadStage').classList.add('hidden');
        $c('workspace').classList.remove('hidden');
        $c('canvasDimensions').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        fitCanvasToWorkspace();
        render();
      };
      img.src = url;
    };

    document.querySelectorAll('.tool').forEach(btn => btn.onclick = () => {
      const name = btn.dataset.tool;
      $c('workspace').classList.add('has-panel');
      document.querySelectorAll('.ws-panels .panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== name));
      document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t === btn));
    });
    document.querySelectorAll('.panel-close').forEach(btn => btn.onclick = () => {
      $c('workspace').classList.remove('has-panel');
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
      $c(id).oninput = (e) => {
        const key = id.replace('range','').toLowerCase();
        adjustments[key] = +e.target.value;
        render();
      };
    });

    $c('btnSave').onclick = () => {
      if(!currentImage) return;
      render();
      mainCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'edited.png'; a.click();
        toast('تم التصدير بنجاح', 'ok');
      }, 'image/png');
    };
  }

  function fitCanvasToWorkspace() {
    if(!currentImage || !mainCanvas) return;
    const wrap = $c('canvasWrap');
    const scaleX = wrap.clientWidth / currentImage.naturalWidth;
    const scaleY = wrap.clientHeight / currentImage.naturalHeight;
    fitScale = Math.min(scaleX, scaleY) * 0.9;
    mainCanvas.style.width = `${currentImage.naturalWidth * fitScale}px`;
    mainCanvas.style.height = `${currentImage.naturalHeight * fitScale}px`;
  }

  function render() {
    if(!currentImage || !mainCanvas) return;
    const W = currentImage.naturalWidth, H = currentImage.naturalHeight;
    mainCanvas.width = W; mainCanvas.height = H;
    const ctx = mainCanvas.getContext('2d');

    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#111'; ctx.fillRect(0,0,W,H);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = W; tempCanvas.height = H;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) blur(${adjustments.blur}px)`;
    tCtx.drawImage(currentImage, 0, 0);

    if(artStyleId !== 'none') applyArtStyle(tCtx, W, H, artStyleId);

    ctx.drawImage(tempCanvas, 0, 0);

    if(visualFxId !== 'none') applyVisualEffect(ctx, W, H, visualFxId, 0.6);
  }

  // 🎨 خوارزميات التحويل الفني (مطورة)
  function applyArtStyle(ctx, W, H, style) {
    const scale = Math.min(1, 1200 / Math.max(W, H));
    const sw = Math.round(W * scale), sh = Math.round(H * scale);
    
    const source = document.createElement('canvas'); source.width = sw; source.height = sh;
    const sx = source.getContext('2d', { willReadFrequently: true });
    sx.drawImage(ctx.canvas, 0, 0, sw, sh);

    const stylized = document.createElement('canvas'); stylized.width = sw; stylized.height = sh;
    const out = stylized.getContext('2d', { willReadFrequently: true });

    if (style === 'pixel') {
      const small = document.createElement('canvas');
      small.width = Math.max(24, Math.round(sw / 30)); small.height = Math.max(24, Math.round(sh / 30));
      const sc = small.getContext('2d'); sc.imageSmoothingEnabled = true;
      sc.drawImage(source, 0, 0, small.width, small.height);
      out.imageSmoothingEnabled = false; out.drawImage(small, 0, 0, sw, sh);
    } else if (style === 'sketch') {
      const idata = sx.getImageData(0, 0, sw, sh), d = idata.data;
      for (let i = 0; i < d.length; i += 4) {
        const l = 255 - (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        d[i] = d[i + 1] = d[i + 2] = l;
      }
      const invC = document.createElement('canvas'); invC.width = sw; invC.height = sh;
      invC.getContext('2d').putImageData(idata, 0, 0);

      out.drawImage(source, 0, 0);
      out.globalCompositeOperation = 'color-dodge';
      const blurC = document.createElement('canvas'); blurC.width = sw; blurC.height = sh;
      const bx = blurC.getContext('2d');
      blurC.getContext('2d').filter = 'blur(8px) contrast(1.5)';
      bx.drawImage(invC, 0, 0);
      out.drawImage(blurC, 0, 0);
      out.globalCompositeOperation = 'source-over';
    } else if (style === 'anime' || style === 'cartoon') {
      out.filter = style === 'anime' ? 'saturate(1.6) contrast(1.15) brightness(1.05)' : 'contrast(1.4) saturate(1.8)';
      out.drawImage(source, 0, 0);
      out.filter = 'none';

      const idata = out.getImageData(0, 0, sw, sh), d = idata.data;
      const levels = style === 'anime' ? 10 : 4;
      const step = 255 / (levels - 1);
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / step) * step;
        d[i + 1] = Math.round(d[i + 1] / step) * step;
        d[i + 2] = Math.round(d[i + 2] / step) * step;
      }
      out.putImageData(idata, 0, 0);

      const oData = sx.getImageData(0, 0, sw, sh), od = oData.data;
      const lum = (x, y) => { x = clamp(x, 0, sw - 1); y = clamp(y, 0, sh - 1); const i = (y * sw + x) * 4; return .299 * od[i] + .587 * od[i + 1] + .114 * od[i + 2]; };
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const gx = -lum(x - 1, y - 1) + lum(x + 1, y - 1) - 2 * lum(x - 1, y) + 2 * lum(x + 1, y) - lum(x - 1, y + 1) + lum(x + 1, y + 1);
        const gy = -lum(x - 1, y - 1) - 2 * lum(x, y - 1) - lum(x + 1, y - 1) + lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1);
        const edge = Math.hypot(gx, gy);
        if (edge > (style === 'anime' ? 45 : 25)) { d[i] = 10; d[i + 1] = 10; d[i + 2] = 10; }
      }
      out.putImageData(idata, 0, 0);
    } else if (style === 'oil') {
      out.filter = 'saturate(1.4) contrast(1.2) blur(2px)';
      out.drawImage(source, 0, 0);
      out.filter = 'none';
      const idata = out.getImageData(0, 0, sw, sh), d = idata.data;
      const step = 255 / 5;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.round(d[i] / step) * step; d[i + 1] = Math.round(d[i + 1] / step) * step; d[i + 2] = Math.round(d[i + 2] / step) * step;
      }
      out.putImageData(idata, 0, 0);
    } else if (style === 'halftone') {
      out.fillStyle = '#fff'; out.fillRect(0, 0, sw, sh);
      const idata = sx.getImageData(0, 0, sw, sh), d = idata.data;
      const step = 6;
      for (let y = 0; y < sh; y += step) for (let x = 0; x < sw; x += step) {
        const i = (y * sw + x) * 4;
        const l = (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]) / 255;
        const r = (1 - l) * (step * 0.7);
        if (r > 0.5) { out.fillStyle = '#21170f'; out.beginPath(); out.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2); out.fill(); }
      }
    } else if (style === 'duotone') {
      out.drawImage(source, 0, 0);
      const idata = out.getImageData(0, 0, sw, sh), d = idata.data;
      const dark = [31, 21, 15], light = [226, 162, 105];
      for (let i = 0; i < d.length; i += 4) {
        const l = (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]) / 255;
        d[i] = dark[0] + (light[0] - dark[0]) * l; d[i + 1] = dark[1] + (light[1] - dark[1]) * l; d[i + 2] = dark[2] + (light[2] - dark[2]) * l;
      }
      out.putImageData(idata, 0, 0);
    } else if (style === 'blackwhite') {
      out.filter = 'grayscale(1) contrast(1.2)'; out.drawImage(source, 0, 0); out.filter = 'none';
    }

    ctx.clearRect(0, 0, W, H); ctx.drawImage(source, 0, 0, W, H);
    ctx.save(); ctx.imageSmoothingEnabled = style !== 'pixel';
    ctx.drawImage(stylized, 0, 0, W, H);
    ctx.restore(); ctx.imageSmoothingEnabled = true;
  }

  // 🌧️ خوارزميات المؤثرات البصرية (مطر، ثلج، نار، إلخ)
  function applyVisualEffect(ctx, W, H, id, amount = 0.55) {
    ctx.save();
    const alpha = Math.max(0, Math.min(1, amount));

    if (id === 'rain') {
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(180,200,220,${alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 200; i++) {
        let x = Math.random() * W, y = Math.random() * H, len = 20 + Math.random() * 40;
        ctx.moveTo(x, y); ctx.lineTo(x - len * 0.2, y + len);
      }
      ctx.stroke();
    } else if (id === 'snow') {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
      for (let i = 0; i < 300; i++) {
        let x = Math.random() * W, y = Math.random() * H, r = 1 + Math.random() * 3;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (id === 'fire') {
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 120; i++) {
        let x = Math.random() * W, y = H - Math.random() * H * 0.6, r = 3 + Math.random() * 10;
        let g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,200,50,${alpha * 0.6})`);
        g.addColorStop(0.6, `rgba(255,80,0,${alpha * 0.3})`);
        g.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (id === 'lightleak') {
      ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha * 0.7;
      let g = ctx.createRadialGradient(W * .08, H * .12, 0, W * .08, H * .12, Math.max(W, H) * .68);
      g.addColorStop(0, 'rgba(255,190,112,.9)'); g.addColorStop(.35, 'rgba(224,112,54,.28)'); g.addColorStop(1, 'rgba(224,112,54,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (id === 'bokeh') {
      ctx.globalCompositeOperation = 'screen';
      const spots = [[.12, .18, .08], [.82, .16, .06], [.72, .7, .1], [.2, .78, .055], [.48, .3, .04]];
      spots.forEach(([x, y, r]) => {
        const rad = Math.min(W, H) * r;
        const gr = ctx.createRadialGradient(W * x, H * y, rad * .12, W * x, H * y, rad);
        gr.addColorStop(0, `rgba(255,224,174,${.18 * alpha})`); gr.addColorStop(1, 'rgba(215,145,88,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(W * x, H * y, rad, 0, Math.PI * 2); ctx.fill();
      });
    } else if (id === 'grain') {
      const noise = document.createElement('canvas'); noise.width = 192; noise.height = 192;
      const nctx = noise.getContext('2d'); const idata = nctx.createImageData(192, 192); let seed = 19317;
      for (let i = 0; i < idata.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0; const v = seed & 255;
        idata.data[i] = v; idata.data[i + 1] = v; idata.data[i + 2] = v; idata.data[i + 3] = Math.round(255 * alpha * .16);
      }
      nctx.putImageData(idata, 0, 0); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = ctx.createPattern(noise, 'repeat'); ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  return { init };
})();

// Boot
(async function boot() {
  AuthUI.init();
  await Loader.run();
  $('loader').classList.add('hidden');
  $('authScreen').classList.remove('hidden');
})();
