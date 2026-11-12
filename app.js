/* ============================================================
   RemoveBG · Sandstorm Studio Pro — Full App
   ============================================================ */

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = v => { if(!v) return '—'; try{ const d=new Date(v); return d.toLocaleDateString('ar-EG',{year:'numeric',month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}); }catch{ return String(v); } };
const todayISO = () => { const d=new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const initials = v => { const t=String(v||'?').trim(); return t?t.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase():'?'; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// Keep the editor usable even when browser storage is unavailable (private mode / embedded browsers).
const CONFIG = window.CONFIG || (window.CONFIG = {
  SUPABASE_URL: '', SUPABASE_KEY: '', MATTE_PROXY: '',
  PIXELCUT_DIRECT: '', PIXELCUT_CLIENT_VERSION: '', BUCKET: 'user-images',
  SESSION_KEY: 'removebg_sandstorm_v2', SIGNED_URL_SECONDS: 900,
  DEFAULT_DAILY_LIMIT: 5, MAX_FILE_MB: 20, LOADER_MIN_MS: 1800
});
const SafeStore = (() => {
  const memory = new Map();
  return {
    get(key) {
      try { const value = window.localStorage.getItem(key); return value === null ? (memory.get(key) ?? null) : value; }
      catch { return memory.get(key) ?? null; }
    },
    set(key, value) {
      const text = String(value); memory.set(key, text);
      try { window.localStorage.setItem(key, text); } catch {}
    },
    remove(key) {
      memory.delete(key);
      try { window.localStorage.removeItem(key); } catch {}
    }
  };
})();
function withTimeout(task, ms, message = 'انتهت مهلة الاتصال') {
  let timer;
  return Promise.race([
    Promise.resolve(task),
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })
  ]).finally(() => clearTimeout(timer));
}

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

const ONLINE_BACKGROUNDS = [
  {name:'رخام بني',tag:'ملمس',url:'https://images.unsplash.com/photo-1640900726922-d13d64b17efe?auto=format&fit=crop&w=1400&q=85'},
  {name:'قمم جبلية',tag:'طبيعة',url:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=85'},
  {name:'بحيرة هادئة',tag:'طبيعة',url:'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=85'},
  {name:'غابة خضراء',tag:'طبيعة',url:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85'},
  {name:'غروب ذهبي',tag:'سماء',url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85'},
  {name:'سماء ليلية',tag:'سماء',url:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85'},
  {name:'شاطئ',tag:'بحر',url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85'},
  {name:'أمواج',tag:'بحر',url:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=85'},
  {name:'جبال ضبابية',tag:'طبيعة',url:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=85'},
  {name:'أشجار الصنوبر',tag:'طبيعة',url:'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1400&q=85'},
  {name:'مجرة',tag:'فضاء',url:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=85'},
  {name:'سماء ليلية',tag:'فضاء',url:'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1400&q=85'},
  {name:'صخور صحراوية',tag:'صحراء',url:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1400&q=85'},
  {name:'رمال ذهبية',tag:'صحراء',url:'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?auto=format&fit=crop&w=1400&q=85'},
  {name:'مدينة ليلية',tag:'مدينة',url:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=85'},
  {name:'أزهار',tag:'زهور',url:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=85'},
  {name:'كثبان صحراوية',tag:'صحراء',url:'https://images.unsplash.com/photo-1729433320144-ed1299fd4736?auto=format&fit=crop&w=1400&q=85'},
  {name:'تلال ذهبية',tag:'صحراء',url:'https://images.unsplash.com/photo-1677989350267-cf4feb7fbc50?auto=format&fit=crop&w=1400&q=85'},
  {name:'شلال جبلي',tag:'ماء',url:'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1400&q=85'},
  {name:'بحيرة في الغابة',tag:'طبيعة',url:'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1400&q=85'},
  {name:'قمم ثلجية',tag:'جبال',url:'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1400&q=85'},
  {name:'غابة ضبابية',tag:'طبيعة',url:'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=85'},
  {name:'أشعة الشمس',tag:'ضوء',url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85'},
  {name:'ممر بين الأشجار',tag:'طبيعة',url:'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=85'},
  {name:'ساحل صخري',tag:'بحر',url:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=85'},
  {name:'سماء وغيوم',tag:'سماء',url:'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1400&q=85'},
  {name:'مدينة عصرية',tag:'مدينة',url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1400&q=85'},
  {name:'مبنى معماري',tag:'عمارة',url:'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1400&q=85'},
  {name:'أوراق استوائية',tag:'نباتات',url:'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1400&q=85'},
  {name:'زهور قريبة',tag:'زهور',url:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=85'},
  {name:'نمط رخامي',tag:'ملمس',url:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=85'},
  {name:'خشب طبيعي',tag:'ملمس',url:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85'},
  {name:'مجرّة بنفسجية',tag:'فضاء',url:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=85'},
  {name:'موج فيروزي',tag:'بحر',url:'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1400&q=85'},
  {name:'نهر بين الجبال',tag:'طبيعة',url:'https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1400&q=85'},
  {name:'مرج أخضر',tag:'طبيعة',url:'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1400&q=85'}
];

const ONLINE_OVERLAYS = [
  {id:'warm-light',name:'ضوء ذهبي',mode:'screen',url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85'},
  {id:'night-bokeh',name:'أضواء ليلية',mode:'screen',url:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=85'},
  {id:'water-texture',name:'انعكاس مائي',mode:'soft-light',url:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1400&q=85'},
  {id:'forest-texture',name:'ملمس طبيعي',mode:'soft-light',url:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85'},
  {id:'star-glow',name:'وهج النجوم',mode:'screen',url:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1400&q=85'},
  {id:'flower-tone',name:'ألوان زهرية',mode:'overlay',url:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=85'},
  {id:'cloud-glow',name:'غيوم مضيئة',mode:'screen',url:'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=1400&q=85'},
  {id:'forest-haze',name:'ضباب الغابة',mode:'soft-light',url:'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=85'},
  {id:'ocean-blue',name:'انعكاس أزرق',mode:'soft-light',url:'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=1400&q=85'},
  {id:'desert-dust',name:'غبار الصحراء',mode:'screen',url:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1400&q=85'},
  {id:'golden-hour',name:'ساعة ذهبية',mode:'screen',url:'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1400&q=85'},
  {id:'flower-bloom',name:'توهج الزهور',mode:'soft-light',url:'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=85'},
  {id:'night-city',name:'أضواء المدينة',mode:'screen',url:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1400&q=85'},
  {id:'star-field',name:'سماء نجميّة',mode:'screen',url:'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1400&q=85'}
];

const OPENVERSE_API = 'https://api.openverse.org/v1/images/';
const OPENMOJI_DATA_URL = 'https://cdn.jsdelivr.net/npm/openmoji@17.0.0/data/openmoji.json';

const GRADIENTS = [
  'linear-gradient(135deg,#f3d7a5,#ad7142)',
  'linear-gradient(135deg,#f4e8d1,#b9a27b)',
  'linear-gradient(135deg,#d7c19a,#6c6048)',
  'linear-gradient(135deg,#d9e0d2,#71826d)',
  'linear-gradient(135deg,#b8c9bd,#456b5b)',
  'linear-gradient(135deg,#e6c7a5,#8b5539)',
  'linear-gradient(135deg,#e0b884,#c4783a)',
  'linear-gradient(135deg,#303630,#777b62)',
  'linear-gradient(135deg,#d6b08a,#8a5137)',
  'linear-gradient(135deg,#c8d9d4,#507d79)',
  'linear-gradient(135deg,#b8c49c,#657b4d)',
  'linear-gradient(135deg,#f0d6a4,#b97d43)',
  'linear-gradient(135deg,#efe3cd,#c29a67)',
  'linear-gradient(135deg,#202522,#4d574e,#a18a64)',
  'linear-gradient(135deg,#c6d4c9,#54716a)',
  'linear-gradient(135deg,#e7d2bb,#b77e59)',
  'linear-gradient(135deg,#26362f,#9d8054,#d8b878)',
  'linear-gradient(135deg,#76583c,#77917b)',
  'linear-gradient(135deg,#c4c9b7,#7c8977,#dfd3b6)',
  'linear-gradient(135deg,#e4c89b,#647e78)'
];

const BG_SWATCHES = ['#ffffff','#111210','#e0b884','#c99570','#c4783a','#84a88c','#e88c7a','#8ab4a8','#a8a27a','#fbbf24','#2d9d8f','#d68b62','#1a130c','#2a2015','#f5e8d4','#6d7b63'];
const BRUSH_SWATCHES = ['#ffffff','#111210','#e0b884','#c4783a','#c99570','#84a88c','#e88c7a','#8ab4a8','#a8a27a','#fbbf24','#2d9d8f','#6d7b63'];

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
  { id:'none', name:'بدون إطار', style:'none', type:'none' },
  { id:'gallery', name:'معرض كلاسيكي', style:'gallery', type:'solid', color:'#f0e8dc', c1:'#f0e8dc', c2:'#c99570' },
  { id:'polaroid', name:'بولارويد', style:'polaroid', type:'solid', color:'#f6f0e6', c1:'#f6f0e6', c2:'#d8c6ad' },
  { id:'double-gold', name:'ذهبي مزدوج', style:'double', type:'gradient', color:'#e3bd83', c1:'#f4d7a8', c2:'#a86a3f' },
  { id:'copper', name:'نحاسي فاخر', style:'luxury', type:'gradient', color:'#c99570', c1:'#f0c99e', c2:'#9a5632' },
  { id:'corner', name:'زوايا ذهبية', style:'corners', type:'solid', color:'#e0b884', c1:'#e0b884', c2:'#c99570' },
  { id:'film', name:'شريط سينمائي', style:'film', type:'solid', color:'#211a14', c1:'#e0b884', c2:'#211a14' },
  { id:'vintage', name:'عتيق', style:'vintage', type:'solid', color:'#b8875c', c1:'#e7c99d', c2:'#765036' },
  { id:'ornate', name:'زخرفة شرقية', style:'ornate', type:'gradient', color:'#c99570', c1:'#e6c18e', c2:'#80502f' },
  { id:'matte', name:'ورق عاجي', style:'matte', type:'solid', color:'#e8dfd1', c1:'#f1e8da', c2:'#b8875c' },
  { id:'minimal', name:'خط رفيع', style:'minimal', type:'solid', color:'#f0e8dc', c1:'#f0e8dc', c2:'#c99570' },
  { id:'dashed', name:'متقطع', style:'dashed', type:'solid', color:'#d7a574', c1:'#d7a574', c2:'#8f5f3e' },
  { id:'shadow', name:'ظل ناعم', style:'shadow', type:'solid', color:'#d4b18c', c1:'#e0b884', c2:'#8e6646' },
  { id:'gradient', name:'تدرج نحاسي', style:'gradient', type:'gradient', color:'#d7a574', c1:'#f0c99e', c2:'#a85e35' },
  { id:'olive', name:'زيتوني هادئ', style:'double', type:'gradient', color:'#a8a27a', c1:'#d5d1a7', c2:'#64734e' },
  { id:'dark', name:'أسود أنيق', style:'gallery', type:'solid', color:'#181411', c1:'#3b2b20', c2:'#d2a06f' },
  { id:'copper-lines', name:'خطوط نحاسية', style:'lines', type:'gradient', color:'#c99570', c1:'#f0c99e', c2:'#a85e35' },
  { id:'ornament-dots', name:'نقاط زخرفية', style:'dots', type:'solid', color:'#e0b884', c1:'#e0b884', c2:'#c99570' }
];

const STICKER_GROUPS = [
  { id:'faces', name:'وجوه', items:[['😀','ابتسامة'],['😂','ضحك'],['😍','إعجاب'],['🥰','حب'],['😎','نظارة'],['🤩','انبهار'],['🥳','احتفال'],['😇','ملاك'],['🤗','عناق'],['😴','نوم'],['🤔','تفكير'],['😏','ابتسامة جانبية'],['😌','هدوء'],['😜','مزاح'],['🤪','مرح'],['😋','لذيذ'],['😭','بكاء'],['🥹','تأثر'],['😡','غضب'],['🤯','دهشة'],['🤓','عبقري'],['🫶','قلب باليدين']] },
  { id:'love', name:'حب', items:[['❤️','قلب أحمر'],['💖','قلب لامع'],['💕','قلبان'],['💗','قلب وردي'],['💙','قلب أزرق'],['💚','قلب أخضر'],['💛','قلب أصفر'],['🧡','قلب برتقالي'],['🩶','قلب رمادي'],['🖤','قلب أسود'],['🤍','قلب أبيض'],['💘','سهم الحب'],['💝','هدية حب'],['💞','قلوب دوارة'],['💟','زخرفة قلب'],['💌','رسالة حب'],['🌹','وردة'],['🌷','زهرة'],['💐','باقة']] },
  { id:'nature', name:'طبيعة', items:[['🌸','زهرة'],['🌺','كركديه'],['🌻','عباد الشمس'],['🌼','زهرة صفراء'],['🌈','قوس قزح'],['⭐','نجمة'],['✨','لمعان'],['💫','دوامة نجوم'],['⚡','برق'],['🔥','نار'],['💧','قطرة'],['❄️','ثلج'],['🌙','قمر'],['☀️','شمس'],['☁️','سحابة'],['🌊','موجة'],['🍁','ورقة قيقب'],['🍃','ورق'],['🌿','نبات'],['🪴','نبتة'],['🦋','فراشة'],['🐝','نحلة'],['🐱','قطة'],['🐶','كلب'],['🐼','باندا'],['🦁','أسد'],['🦊','ثعلب'],['🐺','ذئب'],['🦄','وحيد القرن'],['🐉','تنين']] },
  { id:'food', name:'طعام', items:[['🍕','بيتزا'],['🍔','برغر'],['🍟','بطاطس'],['🍰','كعكة'],['🎂','عيد ميلاد'],['🍩','دونات'],['🍦','آيس كريم'],['🍫','شوكولاتة'],['🍓','فراولة'],['🍒','كرز'],['🍉','بطيخ'],['🍇','عنب'],['🍋','ليمون'],['🥑','أفوكادو'],['☕','قهوة'],['🧋','مشروب'],['🍹','عصير'],['🍪','بسكويت']] },
  { id:'travel', name:'سفر', items:[['🚀','صاروخ'],['✈️','طائرة'],['🚗','سيارة'],['🚲','دراجة'],['🚁','مروحية'],['🏝️','جزيرة'],['🏔️','جبل'],['🗽','تمثال الحرية'],['🏰','قلعة'],['🗼','برج'],['🌋','بركان'],['🌍','الأرض'],['🧭','بوصلة'],['⛵','قارب'],['🚆','قطار']] },
  { id:'sport', name:'رياضة', items:[['⚽','كرة قدم'],['🏀','كرة سلة'],['🎾','تنس'],['🏐','كرة طائرة'],['🏈','كرة قدم أمريكية'],['🏓','تنس طاولة'],['🥊','ملاكمة'],['🏆','كأس'],['🥇','ميدالية ذهبية'],['🎯','هدف'],['🎮','ألعاب'],['🎲','نرد'],['🎸','جيتار'],['🎤','ميكروفون'],['🎬','سينما'],['🎨','فن']] },
  { id:'symbols', name:'رموز', items:[['👑','تاج'],['💎','ألماس'],['💍','خاتم'],['🎁','هدية'],['🎈','بالون'],['🎉','احتفال'],['👍','إعجاب'],['👏','تصفيق'],['🙏','شكر'],['💪','قوة'],['✌️','سلام'],['🤝','اتفاق'],['💯','مئة'],['✅','صحيح'],['❌','خطأ'],['⚠️','تحذير'],['➕','إضافة'],['❤️‍🔥','قلب مشتعل'],['🔔','جرس'],['📌','دبوس'],['💬','محادثة'],['🏷️','وسم'],['🔖','إشارة مرجعية']] },
  { id:'animals', name:'حيوانات', items:[['🦓','حمار وحشي'],['🦒','زرافة'],['🦘','كنغر'],['🦥','كسلان'],['🦦','قضاعة'],['🦫','قندس'],['🦔','قنفذ'],['🦉','بومة'],['🦜','ببغاء'],['🦩','فلامنجو'],['🦚','طاووس'],['🦢','بجعة'],['🦭','فقمة'],['🐢','سلحفاة'],['🐬','دلفين'],['🐳','حوت'],['🦈','قرش'],['🐙','أخطبوط'],['🦀','سلطعون'],['🦞','كركند'],['🦕','ديناصور'],['🦖','تي ريكس'],['🐿️','سنجاب'],['🦝','راكون']] },
  { id:'objects', name:'أشياء', items:[['📷','كاميرا'],['📸','كاميرا فلاش'],['💻','حاسوب'],['📱','هاتف'],['⌚','ساعة'],['🎧','سماعات'],['🎹','بيانو'],['🪄','عصا سحرية'],['🧸','دبدوب'],['🪞','مرآة'],['🕯️','شمعة'],['🪩','كرة ديسكو'],['🛍️','حقائب تسوق'],['🎀','فيونكة'],['🧿','عين زرقاء'],['🪬','تميمة'],['🧩','لغز'],['🪄','عصا']] },
  { id:'fashion', name:'أزياء وجمال', items:[['👓','نظارة'],['🕶️','نظارة شمسية'],['👑','تاج ملكي'],['💄','أحمر شفاه'],['💅','طلاء أظافر'],['👠','حذاء كعب'],['👟','حذاء رياضي'],['👜','حقيبة'],['👒','قبعة'],['🧢','كاب'],['🧣','وشاح'],['🧤','قفاز'],['💍','خاتم'],['📿','سبحة'],['💎','جوهرة']] },
  { id:'celebration', name:'مناسبات', items:[['🎊','قصاصات احتفال'],['🪅','زينة'],['🎆','ألعاب نارية'],['🎇','شرارة'],['🧨','مفرقعة'],['🪄','سحر'],['🕊️','حمامة'],['🪷','زهرة لوتس'],['🎄','شجرة عيد'],['🎃','قرع'],['🧧','ظرف أحمر'],['🎐','جرس هواء'],['🎏','راية'],['🪻','صفيراء'],['🪻','زهرة بنفسجية']] },
  { id:'openmoji-featured', name:'ملصقات OpenMoji مختارة', items:[['😀','ابتسامة'],['😂','ضحك'],['😍','حب'],['🤩','انبهار'],['😎','نظارة'],['🐱','قطة'],['🐼','باندا'],['🦁','أسد'],['🦋','فراشة'],['🐸','ضفدع'],['🦊','ثعلب'],['🐻','دب'],['🐶','كلب'],['🍓','فراولة'],['🍉','بطيخ'],['🍕','بيتزا'],['☕','قهوة'],['🌻','زهرة'],['🌈','قوس قزح'],['🚀','صاروخ'],['🎮','ألعاب'],['⚽','كرة'],['🏀','سلة'],['🎧','سماعة'],['🎨','فن'],['💖','قلب لامع'],['🔥','نار']] }
];
const OPENMOJI_CODES = {
  '😀':'1F600','😂':'1F602','😍':'1F60D','🥳':'1F973','😎':'1F60E','🤔':'1F914','🤩':'1F929','😴':'1F634',
  '🐱':'1F431','🐼':'1F43C','🦁':'1F981','🦋':'1F98B','🐸':'1F438','🦊':'1F98A','🐻':'1F43B','🐶':'1F436',
  '🍓':'1F353','🍉':'1F349','🍕':'1F355','🍩':'1F369','☕':'2615','🌻':'1F33B','🌈':'1F308','⭐':'2B50',
  '🚀':'1F680','🎮':'1F3AE','⚽':'26BD','🏀':'1F3C0','🎧':'1F3A7','🎨':'1F3A8','💖':'1F496','🔥':'1F525'
};
const STICKER_ITEMS = STICKER_GROUPS.flatMap(group => group.items.map(([emoji,label]) => ({ emoji, label, group:group.id, assetCode:OPENMOJI_CODES[emoji] || '' })));
const STICKERS = STICKER_ITEMS.map(item => item.emoji);

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
    'تهيئة النظام...','الاتصال بالخادم...','تحضير أدوات التحرير...',
    'تحميل الموارد...','تجهيز المحرر...','اللمسات النهائية...','جاهز للعمل ✓'
  ];
  function particles(){
    const c = $('fx'); if(!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  function hide(){
    $('loader')?.classList.add('hide');
    if(raf){ cancelAnimationFrame(raf); raf = null; }
    setTimeout(() => $('loader')?.remove(), 1000);
  }
  async function run(){
    let tick = null;
    try {
      try { particles(); } catch(error) { console.warn('Loader animation unavailable:', error); }
      let p = 0;
      const fill = $('ldFill'), pct = $('ldPct'), stepEl = $('ldStep'), glowEl = $('ldGlow');
      tick = setInterval(() => {
        p = Math.min(98, p + Math.random()*4 + 2);
        if(fill) fill.style.width = p + '%';
        if(pct) pct.textContent = Math.round(p) + '%';
        if(glowEl) glowEl.style.left = `calc(${p}% - 50px)`;
        if(stepEl){
          const idx = Math.min(steps.length - 1, Math.floor(p / (100 / steps.length)));
          stepEl.textContent = steps[idx];
        }
      }, 200);
      const minMs = Math.max(0, Number(CONFIG.LOADER_MIN_MS) || 1800);
      const elapsed = performance.now() - START;
      await wait(Math.min(8000, Math.max(0, minMs - elapsed)));
      if(fill) fill.style.width = '100%';
      if(pct) pct.textContent = '100%';
      if(stepEl) stepEl.textContent = steps[steps.length - 1];
      if(glowEl) glowEl.style.left = 'calc(100% - 50px)';
      await wait(250);
    } finally {
      if(tick) clearInterval(tick);
      hide();
    }
  }
  return { run, hide };
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
  const updateUser = async (tk, data) => req('/auth/v1/user', { method:'PATCH', body: JSON.stringify({ data }) }, tk);
  const signout = async s => { if(!s?.access_token) return; try{ await fetch(CONFIG.SUPABASE_URL+'/auth/v1/logout', {method:'POST', headers:{ apikey: CONFIG.SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` }}); }catch{} };
  const forgot = async email => req('/auth/v1/recover', { method:'POST', body: JSON.stringify({ email }) });
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
    const mime = String(blob?.type || 'image/png').split(';')[0].toLowerCase();
    const extension = mime === 'image/webp' ? 'webp' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/gif' ? 'gif' : mime === 'image/avif' ? 'avif' : 'png';
    const name = `${uid}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${extension}`;
    const r = await fetch(`${CONFIG.SUPABASE_URL}/storage/v1/object/${CONFIG.BUCKET}/${name}`, { method:'POST', headers:{ Authorization:`Bearer ${tk}`, apikey: CONFIG.SUPABASE_KEY, 'Content-Type':mime, 'x-upsert':'false', 'cache-control':'3600' }, body: blob });
    if(!r.ok){ const t = await r.text().catch(()=> ''); throw new Error(`فشل الرفع (${r.status}) ${t}`); }
    return name;
  };
  const removeFiles = async (tk, paths) => { const clean = paths.map(extractPath).filter(Boolean); if(!clean.length) return; try{ await req(`/storage/v1/object/${CONFIG.BUCKET}`, { method:'DELETE', body: JSON.stringify({ prefixes: clean }) }, tk); }catch{} };
  const removeBg = async file => {
    if (!file || !(file instanceof Blob) || !file.size) throw new Error('ملف الصورة غير صالح للمعالجة.');
    const endpoint = CONFIG.MATTE_PROXY || CONFIG.PIXELCUT_DIRECT;
    if (!endpoint) throw new Error('عنوان خدمة إزالة الخلفية غير موجود في config.js.');
    const fd = new FormData();
    fd.append('format', 'png');
    fd.append('model', 'v1');
    fd.append('image', file, file.name || 'image.png');
    // نفس رؤوس الطلب وطريقة الإرسال المستخدمة في النسخة الأصلية التي كانت تعمل.
    const headers = { Accept:'application/json,text/plain,*/*', 'x-locale':'en' };
    if (!CONFIG.MATTE_PROXY && CONFIG.PIXELCUT_CLIENT_VERSION) headers['x-client-version'] = CONFIG.PIXELCUT_CLIENT_VERSION;
    let response;
    try {
      response = await fetch(endpoint, { method:'POST', headers, body:fd });
    } catch (error) {
      const e = new Error('تعذر الاتصال بخدمة إزالة الخلفية مباشرة. تحقق من الإنترنت أو من إتاحة الخدمة لهذا المتصفح.');
      e.cause = error;
      throw e;
    }
    if (!response.ok) {
      let detail = '';
      try {
        const data = await response.clone().json();
        detail = data?.message || data?.error || data?.detail || data?.msg || '';
      } catch {
        detail = (await response.text().catch(() => '')).slice(0, 240);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(detail || 'رفضت خدمة إزالة الخلفية الطلب. قد تكون صلاحية الاتصال قد تغيرت.');
      }
      if (response.status === 402) throw new Error(detail || 'خدمة إزالة الخلفية تحتاج إلى رصيد أو تفعيل الفوترة.');
      if (response.status === 429) throw new Error(detail || 'طلبات إزالة الخلفية كثيرة حاليًا. حاول بعد قليل.');
      throw new Error(detail || `فشلت خدمة إزالة الخلفية (${response.status}).`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType.startsWith('image/') || contentType.includes('application/octet-stream')) {
      const imageBlob = await response.blob();
      if (!imageBlob.size) throw new Error('أعادت خدمة إزالة الخلفية ملفًا فارغًا.');
      return imageBlob.type.startsWith('image/') ? imageBlob : new Blob([imageBlob], { type:'image/png' });
    }

    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('استجابة خدمة إزالة الخلفية غير مفهومة.'); }
    const externalUrl = (typeof payload === 'string' && /^https?:\/\//i.test(payload.trim())) ? payload.trim() : findImg(payload);
    if (!externalUrl) {
      const encoded = payload?.base64 || payload?.data?.base64;
      if (typeof encoded === 'string' && encoded.length) {
        const clean = encoded.replace(/^data:image\/[^;]+;base64,/, '');
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type:'image/png' });
      }
      throw new Error('لم تُرجع خدمة إزالة الخلفية ملفًا أو رابط نتيجة صالحًا.');
    }
    let resultResponse;
    try { resultResponse = await fetch(externalUrl); }
    catch { throw new Error('تمت المعالجة، لكن المتصفح لم يتمكن من تنزيل الصورة الناتجة من مصدرها.'); }
    if (!resultResponse.ok) throw new Error(`تعذر تنزيل النتيجة (${resultResponse.status}).`);
    const resultBlob = await resultResponse.blob();
    if (!resultBlob.size) throw new Error('الصورة الناتجة فارغة.');
    return resultBlob.type.startsWith('image/') ? resultBlob : new Blob([resultBlob], { type:'image/png' });
  };
  const findImg = data => { const ks = ['url','image','output','result','result_url','resultUrl','image_url','imageUrl','output_url','outputUrl','download_url','downloadUrl']; for(const k of ks){ const v = data?.[k]; if(typeof v==='string' && v.trim()) return v.trim(); } for(const k of ks){ const v = data?.data?.[k]; if(typeof v==='string' && v.trim()) return v.trim(); } return null; };
  const adminUsers = async (tk, s, lim=500) => { const d = await req('/rest/v1/rpc/admin_list_profiles', { method:'POST', body: JSON.stringify({ p_search: s||null, p_limit: lim }) }, tk); return Array.isArray(d)?d:[]; };
  const adminOps = async (tk, uid=null) => { const d = await req('/rest/v1/rpc/admin_list_operations', { method:'POST', body: JSON.stringify({ p_user_id: uid, p_limit: uid?200:100 }) }, tk); return Array.isArray(d)?d:[]; };
  const adminUpdate = async (tk, uid, plan, lim, ban) => req('/rest/v1/rpc/admin_update_user', { method:'POST', body: JSON.stringify({ p_user_id: uid, p_plan: plan, p_daily_limit: Number(lim), p_is_banned: !!ban }) }, tk);
  return { login, signup, refresh, getUser, updateUser, signout, forgot, getProfile, fetchOps, countToday, saveOp, delOp, resolveImg, upload, removeFiles, removeBg, adminUsers, adminOps, adminUpdate };
})();

/* AUTH */
const Auth = (() => {
  let session = null, profile = null;
  const save = s => { session = s; if(s) SafeStore.set(CONFIG.SESSION_KEY, JSON.stringify(s)); else SafeStore.remove(CONFIG.SESSION_KEY); };
  const saved = () => { try{ const r = SafeStore.get(CONFIG.SESSION_KEY); return r?JSON.parse(r):null; }catch{ SafeStore.remove(CONFIG.SESSION_KEY); return null; } };
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
    $('formTitle').textContent = reg ? 'أنشئ حسابك' : 'مرحباً بك';
    $('formSub').textContent = reg ? 'ابدأ رحلتك الإبداعية مجاناً' : 'سجّل دخولك لمتابعة إبداعك';
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

/* EDITOR */
const Editor = (() => {
  let originalImage = null, currentImage = null;
  let imageEditUndoStack = [];
  let bgRemoved = false;
  let fgCanvas = document.createElement('canvas');
  let mainCanvas = null;
  let strokes = [], texts = [], stickers = [];
  let textIdCounter = 0, stickerIdCounter = 0;
  let stickerCategory = 'all';
  let stickerFavorites = new Set();
  let recentStickerEmojis = [];
  let uploadedStickerUrls = [];
  let openMojiCatalog = null, openMojiLoading = null, openMojiVisible = 72;
  const openverseState = {
    background: { page:1, query:'', busy:false, canLoadMore:false, sequence:0, results:[], controller:null },
    overlay: { page:1, query:'', busy:false, canLoadMore:false, sequence:0, results:[], controller:null }
  };

  const STICKER_FAV_KEY = 'removebg_sticker_favorites_v1';
  const STICKER_RECENT_KEY = 'removebg_sticker_recent_v1';
  function loadStickerPrefs(){
    try{ stickerFavorites = new Set(JSON.parse(SafeStore.get(STICKER_FAV_KEY) || '[]')); }catch{ stickerFavorites = new Set(); }
    try{ recentStickerEmojis = JSON.parse(SafeStore.get(STICKER_RECENT_KEY) || '[]').slice(0,24); }catch{ recentStickerEmojis = []; }
  }
  function saveStickerPrefs(){
    try{ SafeStore.set(STICKER_FAV_KEY, JSON.stringify([...stickerFavorites])); }catch{}
    try{ SafeStore.set(STICKER_RECENT_KEY, JSON.stringify(recentStickerEmojis.slice(0,24))); }catch{}
  }
  let adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
  let filterId = 'none', filterIntensity = 1;
  let filterCategory = 'all';
  let artStyleId = 'none', artStyleIntensity = 1;
  let visualFxId = 'none', visualFxIntensity = .55;
  let onlineOverlayId = 'none', onlineOverlayMode = 'screen', onlineOverlayImage = null, onlineOverlayIntensity = .35;
  let border = { id:'none', name:'بدون إطار', style:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
  let brushColor = '#e0b884', brushSize = 8, brushOpacity = 1, drawMode = 'brush';
  let currentBg = { type:'original' };
  let bgImage = null, bgColorValue = '#e0b884';
  let drawing = false, currentStroke = null;
  let zoom = 1;
  let fitScale = 1;
  let fitObserver = null;
  let fitFrame = 0;
  let initDone = false;
  let finalBlob = null;
  let imgScale = 1, imgAlpha = 1, imgOffsetX = 0, imgOffsetY = 0;
  let activePanel = null;
  let exportRatio = 1;
  let drawLayerVisible = true;
  let selectedId = null;
  let dragMode = null, dragStartPt = null, dragItemState = null;
  let touchPoints = new Map(), pinchState = null;
  let renderQueued = false, renderImmediate = false, isPreparingExport = false;
  let cropActive = false;
  let cropRatio = 'free';
  let cropRect = null;
  let cropDragMode = null;
  let cropDragStart = null;
  let cropStartRect = null;

  const $c = id => document.getElementById(id);

  function setExportDimensionFields(width, height){
    exportRatio = Math.max(0.0001, Number(width || 1) / Math.max(1, Number(height || 1)));
    if ($c('exportWidth')) $c('exportWidth').value = Math.max(1, Math.min(12000, Math.round(width || 1080)));
    if ($c('exportHeight')) $c('exportHeight').value = Math.max(1, Math.min(12000, Math.round(height || 1080)));
    if ($c('exportPreset')) $c('exportPreset').value = 'original';
  }
  function syncExportDimensions(changed){
    const base = currentImage || originalImage;
    let w = Math.max(1, Math.min(12000, Math.round(Number($c('exportWidth')?.value) || (base?.naturalWidth || 1080))));
    let h = Math.max(1, Math.min(12000, Math.round(Number($c('exportHeight')?.value) || (base?.naturalHeight || 1080))));
    if ($c('exportLock')?.checked){
      const ratio = Math.max(0.0001, exportRatio || (base?.naturalWidth || 1)/(base?.naturalHeight || 1));
      if (changed === 'width') h = Math.max(1, Math.min(12000, Math.round(w / ratio)));
      else if (changed === 'height') w = Math.max(1, Math.min(12000, Math.round(h * ratio)));
    }
    if ($c('exportWidth')) $c('exportWidth').value = w;
    if ($c('exportHeight')) $c('exportHeight').value = h;
    if ($c('exportPreset')) $c('exportPreset').value = 'custom';
  }
  function applyExportPreset(value){
    const base = currentImage || originalImage;
    if (!base) return;
    const presets = {
      original:[base.naturalWidth,base.naturalHeight], square:[1080,1080],
      portrait:[1080,1350], story:[1080,1920], landscape:[1920,1080]
    };
    if (presets[value]){
      const [w,h] = presets[value];
      exportRatio = w / h;
      if ($c('exportWidth')) $c('exportWidth').value = w;
      if ($c('exportHeight')) $c('exportHeight').value = h;
      if ($c('exportLock')) $c('exportLock').checked = value === 'original';
    }
  }
  const SHAPE_PATHS = {
    circle:'<circle cx="128" cy="128" r="82"/>',
    square:'<rect x="52" y="52" width="152" height="152" rx="18"/>',
    triangle:'<path d="M128 35 226 210H30Z"/>',
    star:'<path d="m128 24 29 70 75 5-58 48 18 75-64-40-64 40 18-75-58-48 75-5z"/>',
    heart:'<path d="M128 218 42 132C-10 66 70 14 128 76c58-62 138-10 86 56z"/>',
    arrow:'<path d="M28 104h119V54l82 74-82 74v-50H28z"/>',
    diamond:'<path d="m128 24 98 104-98 104L30 128z"/>',
    bubble:'<path d="M46 48h164a16 16 0 0 1 16 16v100a16 16 0 0 1-16 16h-76l-48 34v-34H46a16 16 0 0 1-16-16V64a16 16 0 0 1 16-16z"/>'
  };
  function addShape(name){
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');
    const path = SHAPE_PATHS[name]; if (!path) return;
    const color = $c('shapeColor')?.value || '#c47c48';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><g fill="${color}" stroke="rgba(255,255,255,.18)" stroke-width="3">${path}</g></svg>`;
    const image = new Image();
    image.onload = () => {
      const id = 1000 + (++stickerIdCounter);
      const size = Math.min(900, Math.max(40, Number($c('shapeSize')?.value || 180)));
      const opacity = Math.max(.1, Math.min(1, Number($c('shapeOpacity')?.value || 100)/100));
      stickers.push({ id, type:'image', image, name:`shape-${name}`, x:base.naturalWidth/2, y:base.naturalHeight/2, size, rotation:0, opacity });
      selectedId = id; syncStickerEditor(); render();
      toast('تمت إضافة الشكل — اسحبه لتغيير مكانه', 'ok');
    };
    image.onerror = () => toast('تعذر إنشاء الشكل', 'err');
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  function addWatermark(){
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');
    const value = ($c('watermarkText')?.value || '').trim();
    if (!value) return toast('اكتب نص العلامة المائية أولاً', 'err');
    const id = ++textIdCounter;
    const relativeSize = Math.max(12, Math.min(100, Number($c('watermarkSize')?.value || 34)));
    const size = Math.max(16, Math.min(120, Math.min(base.naturalWidth, base.naturalHeight) * relativeSize / 1000));
    const opacity = Math.max(.1, Math.min(1, Number($c('watermarkOpacity')?.value || 72)/100));
    texts = texts.filter(t => t.kind !== 'watermark');
    texts.push({ id, kind:'watermark', text:value, x:base.naturalWidth*.965, y:base.naturalHeight*.955, size, relativeSize, align:'right', color:$c('watermarkColor')?.value || '#f1dfc7', font:"'Aref Ruqaa Ink',serif", bg:'none', shadow:'rgba(0,0,0,.78)', outlineColor:'#2b1a11', outlineWidth:1, opacity, locked:true });
    selectedId = null; render(); toast('تم تثبيت التوقيع في الركن السفلي الأيمن ✓', 'ok');
  }
  function removeWatermarks(){
    const before = texts.length;
    texts = texts.filter(t => t.kind !== 'watermark');
    if (texts.length === before) return toast('لا توجد علامة مائية لإزالتها', 'err');
    selectedId = null; render(); toast('تم حذف العلامات المائية', 'ok');
  }
  function renderLayers(){
    const list = $c('layersList'); if (!list) return;
    list.textContent = '';
    const records = [
      ...texts.map(item => ({kind:'text',item,id:item.id,label:item.kind === 'watermark' ? 'علامة مائية' : (item.text || 'نص جديد'),detail:item.kind === 'watermark' ? 'نص مائي' : 'نص',icon:item.kind === 'watermark' ? '©' : 'T',visible:item.visible !== false})),
      ...stickers.map(item => ({kind:'sticker',item,id:item.id,label:item.name || item.emoji || 'عنصر رسومي',detail:item.name?.startsWith('shape-') ? 'شكل هندسي' : 'ملصق أو صورة',icon:item.emoji || (item.name?.startsWith('shape-') ? '◆' : '✦'),visible:item.visible !== false}))
    ].reverse();
    if ($c('layersCount')) $c('layersCount').textContent = `${records.length + (strokes.length ? 1 : 0)} عناصر`;
    if (strokes.length){
      const row = document.createElement('div'); row.className = 'layer-row' + (selectedId === 'draw-layer' ? ' active' : '');
      const main = document.createElement('button'); main.type='button'; main.className='layer-main'; main.dataset.layerAction='select-draw';
      const icon=document.createElement('span'); icon.className='layer-icon'; icon.textContent='✎';
      const copy=document.createElement('span'); copy.className='layer-copy';
      const title=document.createElement('strong'); title.textContent='الرسم اليدوي';
      const detail=document.createElement('small'); detail.textContent=`${strokes.length} مسارات`;
      copy.append(title,detail); main.append(icon,copy);
      const controls=document.createElement('div'); controls.className='layer-controls';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='layer-control'; toggle.textContent=drawLayerVisible?'◉':'○'; toggle.title='إظهار أو إخفاء الرسم'; toggle.dataset.layerAction='toggle-draw';
      const del=document.createElement('button'); del.type='button'; del.className='layer-control danger'; del.textContent='×'; del.title='حذف الرسم'; del.dataset.layerAction='delete-draw';
      controls.append(toggle,del); row.append(main,controls); list.append(row);
    }
    for (const rec of records){
      const row=document.createElement('div'); row.className='layer-row'+(selectedId===rec.id?' active':'');
      const locked = rec.kind==='text' && rec.item.kind==='watermark';
      const main=document.createElement('button'); main.type='button'; main.className='layer-main'; main.dataset.layerAction=locked?'locked':'select'; main.dataset.layerKind=rec.kind; main.dataset.layerId=String(rec.id);
      const icon=document.createElement('span'); icon.className='layer-icon'; icon.textContent=locked?'🔒':rec.icon;
      const copy=document.createElement('span'); copy.className='layer-copy';
      const title=document.createElement('strong'); title.textContent=locked?'التوقيع الثابت':rec.label;
      const detail=document.createElement('small'); detail.textContent=locked?'موضع مقفل في الركن السفلي الأيمن':rec.detail;
      copy.append(title,detail); main.append(icon,copy);
      const controls=document.createElement('div'); controls.className='layer-controls';
      const toggle=document.createElement('button'); toggle.type='button'; toggle.className='layer-control'; toggle.textContent=rec.visible?'◉':'○'; toggle.title='إظهار أو إخفاء'; toggle.dataset.layerAction='toggle'; toggle.dataset.layerKind=rec.kind; toggle.dataset.layerId=String(rec.id);
      if (!locked){ const duplicate=document.createElement('button'); duplicate.type='button'; duplicate.className='layer-control'; duplicate.textContent='⧉'; duplicate.title='نسخ الطبقة'; duplicate.dataset.layerAction='duplicate'; duplicate.dataset.layerKind=rec.kind; duplicate.dataset.layerId=String(rec.id); controls.append(duplicate); }
      const del=document.createElement('button'); del.type='button'; del.className='layer-control danger'; del.textContent='×'; del.title='حذف الطبقة'; del.dataset.layerAction='delete'; del.dataset.layerKind=rec.kind; del.dataset.layerId=String(rec.id);
      controls.prepend(toggle); controls.append(del); row.append(main,controls); list.append(row);
    }
    if (!records.length && !strokes.length){
      const empty=document.createElement('div'); empty.className='layers-empty'; empty.textContent='أضف نصًا أو ملصقًا أو شكلاً لتظهر طبقاته هنا'; list.append(empty);
    }
  }
  function handleLayerAction(e){
    const control=e.target.closest('[data-layer-action]'); if(!control) return;
    const action=control.dataset.layerAction, kind=control.dataset.layerKind, id=Number(control.dataset.layerId);
    if (action === 'select-draw'){ selectedId=null; render(); toast('يمكنك إظهار الرسم أو حذفه من هنا'); return; }
    if (kind === 'draw'){
      if (action === 'toggle-draw'){ drawLayerVisible=!drawLayerVisible; render(); }
      if (action === 'delete-draw'){ strokes=[]; currentStroke=null; selectedId=null; render(); toast('تم حذف الرسم', 'ok'); }
      return;
    }
    const collection=kind === 'text' ? texts : stickers;
    const item=collection.find(x=>x.id===id); if(!item) return;
    if (action === 'locked' || (kind==='text' && item.kind==='watermark' && action==='select')){ toast('موضع التوقيع ثابت ولا يمكن تغييره.', 'ok'); return; }
    if (action === 'select'){ selectedId=id; render(); return; }
    if (action === 'toggle'){ item.visible=item.visible===false; if(!item.visible && selectedId===id) selectedId=null; render(); return; }
    if (action === 'delete'){
      if(kind==='text') texts=texts.filter(x=>x.id!==id); else stickers=stickers.filter(x=>x.id!==id);
      if(selectedId===id) selectedId=null; syncStickerEditor(); render(); toast('تم حذف الطبقة', 'ok'); return;
    }
    if (action === 'duplicate'){
      if (kind==='text' && item.kind==='watermark') return toast('لا يمكن نسخ التوقيع الثابت.', 'err');
      if(kind==='text'){ const copy={...item,id:++textIdCounter,x:item.x+24,y:item.y+24}; texts.push(copy); selectedId=copy.id; }
      else { const copy={...item,id:1000+(++stickerIdCounter),x:item.x+24,y:item.y+24}; stickers.push(copy); selectedId=copy.id; }
      render(); toast('تم نسخ الطبقة', 'ok');
    }
  }

  function init(){
    if (initDone) return; initDone = true;
    mainCanvas = $c('mainCanvas');
    const canvasWrap = $c('canvasWrap');
    if (canvasWrap && typeof ResizeObserver !== 'undefined'){
      fitObserver = new ResizeObserver(() => scheduleCanvasFit());
      fitObserver.observe(canvasWrap);
    }
    window.addEventListener('resize', scheduleCanvasFit, { passive:true });
    window.addEventListener('orientationchange', scheduleCanvasFit, { passive:true });

    const pw = $c('presets');
    if (pw) PRESETS.forEach(url => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'preset';
      el.setAttribute('aria-label', 'اختيار خلفية جاهزة');
      el.innerHTML = `<img src="${url}" alt="" loading="lazy" crossorigin="anonymous">`;
      const preview = el.querySelector('img');
      preview.addEventListener('error', () => { el.classList.add('asset-unavailable'); el.title = 'تعذر تحميل هذه الخلفية'; });
      el.addEventListener('click', async () => {
        if (!(currentImage || originalImage)) return toast('ارفع صورة أولاً لبدء التحرير', 'err');
        const oldDisabled = el.disabled;
        el.disabled = true;
        try {
          const ready = preview.complete && preview.naturalWidth ? preview : await loadCorsImage(url);
          document.querySelectorAll('.preset').forEach(x => x.classList.remove('active'));
          el.classList.add('active');
          const applied = await setBgSafe({ type:'preset', value:url, image:ready });
          if (!applied) el.classList.remove('active');
        } catch (error) {
          toast('تعذر تحميل هذه الخلفية. جرّب خلفية أخرى أو ارفع صورة من جهازك.', 'err');
        } finally { el.disabled = oldDisabled; }
      });
      pw.appendChild(el);
    });

    const onlineGrid = $c('onlineBackgrounds');
    if (onlineGrid) ONLINE_BACKGROUNDS.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'online-bg-card'; card.title = `استخدام ${item.name}`;
      const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.crossOrigin = 'anonymous';
      const proxiedUrl = getAssetDirectUrl(item.url); image.src = proxiedUrl || item.url;
      let directPreviewRetried = false;
      const meta = document.createElement('span'); meta.innerHTML = `<strong>${item.name}</strong><small>${item.tag} · Unsplash</small>`;
      card.append(image, meta);
      card.addEventListener('click', async () => {
        if (!(currentImage || originalImage)) return toast('ارفع صورة أولاً لبدء التحرير', 'err');
        const oldDisabled = card.disabled;
        card.disabled = true;
        try {
          const ready = image.complete && image.naturalWidth ? image : await loadCorsImage(item.url);
          const applied = await setBgSafe({type:'preset', value:item.url, image:ready, source:'Unsplash'});
          if (!applied) return;
          onlineGrid.querySelectorAll('.online-bg-card').forEach(x => x.classList.toggle('active', x === card));
          App.switchView('editor'); openPanel('background');
        } catch (error) {
          toast('تعذر تحميل الخلفية من المصدر. جرّب موردًا آخر.', 'err');
        } finally { card.disabled = oldDisabled; }
      });
      image.addEventListener('error', () => {
        if (!directPreviewRetried && proxiedUrl && image.src !== item.url){ directPreviewRetried = true; image.src = item.url; return; }
        card.classList.add('asset-unavailable'); meta.querySelector('small').textContent = 'المعاينة غير متاحة؛ جرّب فتح المورد';
      });
      onlineGrid.appendChild(card);
    });

    const overlayGrid = $c('onlineOverlaysGrid');
    if (overlayGrid){
      const clear = document.createElement('button'); clear.type='button'; clear.className='online-bg-card online-overlay-clear active'; clear.innerHTML='<span class="overlay-clear-icon">✕</span><span><strong>بدون تراكب</strong><small>الصورة الأصلية</small></span>';
      clear.addEventListener('click',()=>{ onlineOverlayId='none'; onlineOverlayImage=null; overlayGrid.querySelectorAll('.online-bg-card').forEach(x=>x.classList.toggle('active',x===clear)); render(); });
      overlayGrid.appendChild(clear);
      ONLINE_OVERLAYS.forEach(item=>{
        const card=document.createElement('button'); card.type='button'; card.className='online-bg-card'; card.title=`مزج ${item.name}`;
        const image=document.createElement('img'); image.alt=''; image.loading='lazy'; image.crossOrigin='anonymous';
        const proxiedUrl=getAssetDirectUrl(item.url); image.src=proxiedUrl || item.url;
        let directPreviewRetried=false;
        const meta=document.createElement('span'); meta.innerHTML=`<strong>${item.name}</strong><small>Unsplash · تراكب</small>`;
        card.append(image,meta);
        card.addEventListener('click', async ()=>{
          if (!(currentImage || originalImage)) return toast('ارفع صورة أولاً لبدء التحرير', 'err');
          const oldDisabled = card.disabled;
          card.disabled = true;
          try{
            const remote = image.complete && image.naturalWidth ? image : await loadCorsImage(item.url);
            onlineOverlayImage = remote;
            onlineOverlayId = item.id;
            onlineOverlayMode = item.mode;
            overlayGrid.querySelectorAll('.online-bg-card').forEach(x=>x.classList.toggle('active',x===card));
            render(); App.switchView('editor'); openPanel('effects');
            toast(`تم تطبيق ${item.name} ✓`,'ok');
          }catch(error){
            toast('تعذر استخدام هذا التراكب من المصدر. جرّب موردًا آخر أو ارفع صورة من جهازك.','err');
          }finally{ card.disabled = oldDisabled; }
        });
        image.addEventListener('error',()=>{
          if(!directPreviewRetried && proxiedUrl && image.src!==item.url){directPreviewRetried=true;image.src=item.url;return;}
          card.classList.add('asset-unavailable'); meta.querySelector('small').textContent='المعاينة غير متاحة؛ جرّب فتح المورد';
        });
        overlayGrid.appendChild(card);
      });
    }

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

    $c('imageEditRunBtn')?.addEventListener('click', () => runImageEdit({ operation:'edit-image' }));
    $c('imageEditPrompt')?.addEventListener('input', e => {
      const count = $c('imageEditPromptCount');
      if (count) count.textContent = `${e.target.value.length} / 3000`;
    });
    document.querySelectorAll('[data-image-prompt]').forEach(chip => chip.addEventListener('click', () => {
      const input = $c('imageEditPrompt');
      if (!input) return;
      input.value = chip.dataset.imagePrompt || '';
      const modeSelect = $c('imageEditMode');
      if (modeSelect && chip.dataset.imageMode) modeSelect.value = chip.dataset.imageMode;
      input.dispatchEvent(new Event('input', { bubbles:true }));
      input.focus();
    }));

    const bgGrid = $c('bordersGrid');
    if (bgGrid) BORDERS.forEach(b => {
      const el = document.createElement('div');
      el.className = 'border-item';
      el.dataset.border = b.id;
      const prev = document.createElement('div');
      prev.className = `bi-preview frame-preview frame-${b.style || b.type || 'minimal'}`;
      prev.style.setProperty('--frame-color', b.color || '#e0b884');
      prev.style.setProperty('--frame-accent', b.c2 || b.c1 || '#c99570');
      el.appendChild(prev);
      const lab = document.createElement('div');
      lab.className = 'bi-label';
      lab.textContent = b.name;
      el.appendChild(lab);
      el.addEventListener('click', () => {
        document.querySelectorAll('.border-item').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        border = { ...border, ...b, width:Number($c('rangeBorderWidth')?.value || border.width || 20) };
        if($c('framePrimaryColor')) $c('framePrimaryColor').value = b.color || b.c1 || '#e0b884';
        if($c('frameAccentColor')) $c('frameAccentColor').value = b.c2 || b.c1 || '#c99570';
        render();
      });
      bgGrid.appendChild(el);
    });

    initStickerLibrary();
    initOpenverseLibrary();
    $c('stickerUploadBtn')?.addEventListener('click', () => $c('stickerFile')?.click());
    $c('stickerFile')?.addEventListener('change', e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (file) handleStickerUpload(file);
    });
    $c('stickerSearch')?.addEventListener('input', () => renderStickerLibrary());
    $c('stickerSize')?.addEventListener('input', e => updateSelectedSticker({ size:+e.target.value }, 'valStickerSize', `${e.target.value}px`));
    $c('stickerRotate')?.addEventListener('input', e => updateSelectedSticker({ rotation:+e.target.value }, 'valStickerRotate', `${e.target.value}°`));
    $c('stickerOpacity')?.addEventListener('input', e => updateSelectedSticker({ opacity:+e.target.value/100 }, 'valStickerOpacity', `${e.target.value}%`));
    $c('btnStickerDelete')?.addEventListener('click', deleteSelectedSticker);
    $c('btnStickerDuplicate')?.addEventListener('click', duplicateSelectedSticker);

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
      if (m === 'online'){ App.switchView('assets'); App.setAssetTab('backgrounds'); return; }
      document.querySelectorAll('.subtab').forEach(x => x.classList.toggle('active', x === tab));
      document.querySelectorAll('.bg-content').forEach(c => c.classList.toggle('hidden', c.dataset.bgcontent !== m));
      if (m === 'transparent'){
        const ok = await autoRemoveBackground();
        if (ok){ setBg({ type:'transparent' }); $c('bgApplyHint')?.classList.add('hidden'); toast('تم تجهيز الصورة بخلفية شفافة ✓', 'ok'); }
        else { $c('bgApplyHint')?.classList.remove('hidden'); if ($c('bgApplyHint')) $c('bgApplyHint').textContent = 'تعذر تجهيز الشفافية. أعد المحاولة بعد التحقق من اتصال خدمة إزالة الخلفية.'; }
      }
      else if (m === 'original'){
        setBg({ type:'original' });
        $c('bgApplyHint')?.classList.add('hidden');
      }
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
    document.querySelectorAll('[data-art-style]').forEach(btn => btn.addEventListener('click', () => {
      selectImagePreset('art', btn.dataset.artStyle, btn);
    }));
    document.querySelectorAll('[data-visual-fx]').forEach(btn => btn.addEventListener('click', () => {
      selectImagePreset('effect', btn.dataset.visualFx, btn);
    }));
    $c('artIntensity')?.addEventListener('input', e => { artStyleIntensity = Number(e.target.value)/100; if($c('valArtIntensity')) $c('valArtIntensity').textContent = e.target.value+'%'; });
    $c('visualIntensity')?.addEventListener('input', e => { visualFxIntensity = Number(e.target.value)/100; if($c('valVisualIntensity')) $c('valVisualIntensity').textContent = e.target.value+'%'; });
    $c('onlineOverlayIntensity')?.addEventListener('input', e => { onlineOverlayIntensity=Number(e.target.value)/100; if($c('valOnlineOverlayIntensity')) $c('valOnlineOverlayIntensity').textContent=e.target.value+'%'; render(); });
    $c('openExternalOverlays')?.addEventListener('click', () => { App.switchView('assets'); App.setAssetTab('overlays'); });
    $c('resetArtEffects')?.addEventListener('click', () => {
      if (imageEditUndoStack.length) {
        currentImage = imageEditUndoStack[0] || originalImage;
        imageEditUndoStack.length = 0;
        if (currentImage) {
          const dimensions = $c('canvasDimensions');
          if (dimensions) dimensions.textContent = `${currentImage.naturalWidth} × ${currentImage.naturalHeight}`;
          setExportDimensionFields(currentImage.naturalWidth, currentImage.naturalHeight);
        }
      }
      artStyleId='none'; artStyleIntensity=1; visualFxId='none'; visualFxIntensity=.55; onlineOverlayId='none'; onlineOverlayImage=null; onlineOverlayIntensity=.35;
      $c('onlineOverlayIntensity') && ($c('onlineOverlayIntensity').value=35); if($c('valOnlineOverlayIntensity')) $c('valOnlineOverlayIntensity').textContent='35%';
      $c('onlineOverlaysGrid')?.querySelectorAll('.online-bg-card').forEach((x,i)=>x.classList.toggle('active',i===0));
      document.querySelectorAll('[data-art-style],[data-visual-fx]').forEach(x => x.classList.toggle('active', x.dataset.artStyle === 'none' || x.dataset.visualFx === 'none'));
      if($c('artIntensity')) $c('artIntensity').value=100; if($c('valArtIntensity')) $c('valArtIntensity').textContent='100%';
      if($c('visualIntensity')) $c('visualIntensity').value=55; if($c('valVisualIntensity')) $c('valVisualIntensity').textContent='55%';
      render(); scheduleCanvasFit(); toast('تمت إعادة الصورة إلى ما قبل التحويلات التوليدية وضبط المؤثرات.','ok');
    });
    $c('rangeScale')?.addEventListener('input', e => { imgScale = e.target.value/100; $c('valScale').textContent = e.target.value + '%'; render(); });
    $c('rangeAlpha')?.addEventListener('input', e => { imgAlpha = e.target.value/100; $c('valAlpha').textContent = e.target.value + '%'; render(); });
    $c('rangeBorderWidth')?.addEventListener('input', e => { border.width = +e.target.value; $c('valBorderWidth').textContent = e.target.value + 'px'; render(); });
    $c('framePrimaryColor')?.addEventListener('input', e => { border.color=e.target.value; border.c1=e.target.value; render(); });
    $c('frameAccentColor')?.addEventListener('input', e => { border.c2=e.target.value; render(); });
    $c('exportQuality')?.addEventListener('input', e => { $c('valExportQuality').textContent = e.target.value + '%'; });
    $c('exportWidth')?.addEventListener('change', () => syncExportDimensions('width'));
    $c('exportHeight')?.addEventListener('change', () => syncExportDimensions('height'));
    $c('exportLock')?.addEventListener('change', () => { const w = Number($c('exportWidth')?.value), h = Number($c('exportHeight')?.value); if (w > 0 && h > 0) exportRatio = w / h; });
    $c('exportPreset')?.addEventListener('change', e => applyExportPreset(e.target.value));
    $c('shapeSize')?.addEventListener('input', e => { if ($c('valShapeSize')) $c('valShapeSize').textContent = e.target.value + 'px'; });
    $c('shapeOpacity')?.addEventListener('input', e => { if ($c('valShapeOpacity')) $c('valShapeOpacity').textContent = e.target.value + '%'; });
    document.querySelectorAll('[data-shape]').forEach(btn => btn.addEventListener('click', () => addShape(btn.dataset.shape)));
    $c('watermarkOpacity')?.addEventListener('input', e => { if ($c('valWatermarkOpacity')) $c('valWatermarkOpacity').textContent = e.target.value + '%'; });
    $c('addWatermark')?.addEventListener('click', addWatermark);
    $c('removeWatermarks')?.addEventListener('click', removeWatermarks);
    $c('layersList')?.addEventListener('click', handleLayerAction);

    $c('textSize')?.addEventListener('input', e => { $c('valTextSize').textContent = e.target.value + 'px'; });
    $c('textOutlineWidth')?.addEventListener('input', e => { $c('valTextOutline').textContent = e.target.value + 'px'; });
    document.querySelectorAll('.text-preset').forEach(btn => btn.addEventListener('click', () => {
      const presets = {
        headline:{ size:72, color:'#ffffff', bg:'none', shadow:'rgba(0,0,0,.7)', outline:'#2b1a11', width:3 },
        caption:{ size:44, color:'#f5d8b0', bg:'none', shadow:'rgba(0,0,0,.7)', outline:'#2b1a11', width:2 },
        label:{ size:36, color:'#2b1a11', bg:'rgba(224,184,132,.9)', shadow:'none', outline:'#ffffff', width:0 }
      };
      const preset = presets[btn.dataset.preset]; if(!preset) return;
      $c('textSize').value=preset.size; $c('valTextSize').textContent=preset.size+'px';
      $c('textColor').value=preset.color; $c('textBg').value=preset.bg; $c('textShadow').value=preset.shadow;
      $c('textOutlineColor').value=preset.outline; $c('textOutlineWidth').value=preset.width; $c('valTextOutline').textContent=preset.width+'px';
      document.querySelectorAll('.text-preset').forEach(x => x.classList.toggle('active',x===btn));
    }));

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
        shadow: $c('textShadow').value, outlineColor:$c('textOutlineColor').value, outlineWidth:+$c('textOutlineWidth').value, opacity:1
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
    $c('bgColor')?.addEventListener('change', async e => { bgColorValue = e.target.value; await setBgSafe({ type:'color', value:bgColorValue }); });

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
    $c('zoomReset')?.addEventListener('click', () => { zoom = 1; fitCanvasToWorkspace(); });
    $c('toggleCanvasFocus')?.addEventListener('click', toggleWorkspaceFocus);
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && $c('workspace')?.classList.contains('canvas-focus-mode')) setWorkspaceFocus(false); });

    $c('btnUndo')?.addEventListener('click', undo);
    $c('btnReset')?.addEventListener('click', resetAll);
    $c('btnClearDraw')?.addEventListener('click', () => {
      if (!strokes.length && !texts.length && !stickers.length) return toast('لا يوجد شي', 'err');
      strokes = []; texts = []; stickers = []; drawLayerVisible = true; selectedId = null; syncStickerEditor(); render(); toast('تم المسح ✓', 'ok');
    });
    $c('btnResetAdjust')?.addEventListener('click', resetAdjustments);
    $c('btnAuto')?.addEventListener('click', autoEnhance);
    $c('btnRemoveBg')?.addEventListener('click', () => removeBackground(false));
    $c('btnSave')?.addEventListener('click', saveImage);
    $c('btnDownload')?.addEventListener('click', () => {
      if (!finalBlob) return toast('جهّز التصدير أولاً', 'err');
      const ext = finalBlob.type === 'image/jpeg' ? 'jpg' : finalBlob.type === 'image/webp' ? 'webp' : 'png';
      downloadBlob(finalBlob, `removebg-${Date.now()}.${ext}`);
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
    const base = currentImage || originalImage;
    FILTERS.forEach(f => {
      const el = document.createElement('div');
      el.className = 'filter-thumb' + (f.id === filterId ? ' active' : '');
      el.dataset.filter = f.id;
      el.dataset.cat = f.cat;
      const canvas = document.createElement('canvas');
      canvas.width = 144; canvas.height = 112;
      const ctx = canvas.getContext('2d');
      if (base?.naturalWidth && base?.naturalHeight){
        const scale = Math.max(canvas.width/base.naturalWidth, canvas.height/base.naturalHeight);
        const sw = canvas.width/scale, sh = canvas.height/scale;
        const sx = (base.naturalWidth-sw)/2, sy = (base.naturalHeight-sh)/2;
        try { ctx.filter = f.css && f.css !== 'none' ? f.css : 'none'; ctx.drawImage(base,sx,sy,sw,sh,0,0,canvas.width,canvas.height); ctx.filter='none'; }
        catch { ctx.drawImage(base,sx,sy,sw,sh,0,0,canvas.width,canvas.height); }
      } else {
        const grad = ctx.createLinearGradient(0,0,144,112);
        grad.addColorStop(0,'#e0b884'); grad.addColorStop(.5,'#c4783a'); grad.addColorStop(1,'#c99570');
        ctx.fillStyle=grad; ctx.fillRect(0,0,144,112);
      }
      el.appendChild(canvas);
      const lab = document.createElement('div'); lab.className='thumb-label'; lab.textContent=f.name; el.appendChild(lab);
      el.addEventListener('click', () => {
        document.querySelectorAll('.filter-thumb').forEach(x => x.classList.remove('active'));
        el.classList.add('active'); filterId=f.id; render();
      });
      grid.appendChild(el);
    });
    filterThumbsVisibility();
  }
  function filterThumbsVisibility(){
    document.querySelectorAll('.filter-thumb').forEach(el => {
      if (filterCategory === 'all' || el.dataset.cat === filterCategory) el.style.display = '';
      else el.style.display = 'none';
    });
  }

  function openverseTargetState(target){
    return openverseState[target === 'overlay' ? 'overlay' : 'background'];
  }

  async function searchOpenverse(query, target='background', append=false){
    const key = target === 'overlay' ? 'overlay' : 'background';
    const state = openverseTargetState(key);
    const gridId = key === 'overlay' ? 'openverseOverlayGrid' : 'openverseGrid';
    const grid = $c(gridId);
    if (!grid) return;
    const q = (String(query || '').trim() || (key === 'overlay' ? 'light texture overlay' : 'nature landscape background')).slice(0,200);
    if (append && (state.busy || !state.canLoadMore)) return;

    if (!append){
      state.controller?.abort();
      state.controller = new AbortController();
      state.page = 1;
      state.query = q;
      state.canLoadMore = false;
      state.results = [];
      state.sequence++;
      grid.innerHTML = '<div class="openverse-state"><span class="mini-spinner"></span> جارٍ البحث في المكتبة المفتوحة...</div>';
    } else {
      state.controller = new AbortController();
      grid.querySelector('.openverse-more')?.remove();
    }

    const sequence = state.sequence;
    const controller = state.controller;
    state.busy = true;
    const searchBtn = $c(key === 'overlay' ? 'openverseOverlaySearchBtn' : 'openverseSearchBtn');
    if (searchBtn) searchBtn.disabled = true;
    const meta = $c(key === 'overlay' ? 'openverseOverlayMeta' : 'openverseMeta');
    if (meta) meta.textContent = 'يتم جلب النتائج…';

    try{
      const params = new URLSearchParams({
        q,
        license:'cc0,pdm,by,by-sa',
        page:String(state.page),
        page_size:'16',
        mature:'false',
        filter_dead:'true',
        extension:'jpg,jpeg,png,webp'
      });
      const response = await fetch(`${OPENVERSE_API}?${params.toString()}`, {
        headers:{ Accept:'application/json' },
        mode:'cors',
        signal:controller.signal
      });
      if (!response.ok){
        if (response.status === 429) throw new Error('وصل البحث إلى الحد المؤقت للطلبات. انتظر قليلًا ثم أعد المحاولة.');
        if (response.status === 400) throw new Error('صيغة البحث غير مقبولة. جرّب كلمات أبسط.');
        throw new Error(`تعذر الوصول إلى مكتبة الصور (${response.status})`);
      }
      const data = await response.json();
      if (sequence !== state.sequence || controller.signal.aborted) return;
      const found = (Array.isArray(data.results) ? data.results : []).filter(item => item?.id && (item.thumbnail || item.url));
      state.results = append ? [...state.results, ...found] : found;
      state.canLoadMore = Number(data.page_count || 0) > state.page && found.length > 0;
      renderOpenverseCards(key, state.results);
      if (meta) meta.textContent = `${Number(data.result_count || state.results.length).toLocaleString('ar-EG')} نتيجة متاحة · اختر عملاً ثم راجع مصدره وترخيصه`;
      if (!found.length && !append) grid.innerHTML = '<div class="openverse-state">لم نعثر على نتائج مناسبة. جرّب عبارة بحث أخرى.</div>';
    }catch(error){
      if (error?.name === 'AbortError') return;
      if (sequence === state.sequence){
        if (!append) grid.innerHTML = `<div class="openverse-state">${esc(error.message || 'تعذر تحميل الصور')}<br><small>يمكنك استخدام الخلفيات الجاهزة أو إعادة المحاولة.</small><br><button class="btn-ghost small" type="button" data-openverse-retry="${key}">إعادة المحاولة</button></div>`;
        else {
          const more = document.createElement('button');
          more.type = 'button'; more.className = 'openverse-more'; more.textContent = 'تعذر تحميل المزيد · إعادة المحاولة';
          more.addEventListener('click', () => searchOpenverse(state.query, key, true));
          grid.appendChild(more);
        }
        toast(error.message || 'تعذر البحث في المكتبة المفتوحة', 'err');
      }
    }finally{
      if (sequence === state.sequence){
        state.busy = false;
        if (searchBtn) searchBtn.disabled = false;
      }
    }
  }

  function renderOpenverseCards(target, items){
    const key = target === 'overlay' ? 'overlay' : 'background';
    const state = openverseTargetState(key);
    const grid = $c(key === 'overlay' ? 'openverseOverlayGrid' : 'openverseGrid');
    if (!grid) return;
    grid.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('article'); card.className = 'openverse-card';
      const preview = document.createElement('img');
      preview.loading = 'lazy'; preview.alt = item.title || 'صورة مرخصة';
      // المعاينة للعرض فقط؛ لا نجعل تحميلها شرطًا لاستخدام الصورة الأصلية.
      const previewUrl = `https://api.openverse.org/v1/images/${encodeURIComponent(item.id)}/thumb/`;
      preview.src = item.thumbnail || previewUrl;
      let previewRetriedDirect = false;
      const info = document.createElement('div'); info.className = 'openverse-card-info';
      const title = document.createElement('strong'); title.textContent = item.title || 'صورة بدون عنوان';
      const license = document.createElement('small');
      license.textContent = `${item.license || 'ترخيص مفتوح'}${item.license_version ? ` ${item.license_version}` : ''} · ${item.creator || 'مصدر مفتوح'}`;
      const actions = document.createElement('div'); actions.className = 'openverse-card-actions';
      const use = document.createElement('button'); use.type = 'button'; use.className = 'btn-primary small';
      use.textContent = key === 'overlay' ? 'تطبيق التراكب' : 'استخدام الخلفية';
      const source = document.createElement('a');
      source.href = item.foreign_landing_url || item.detail_url || 'https://openverse.org/';
      source.target = '_blank'; source.rel = 'noopener noreferrer'; source.textContent = 'المصدر والترخيص';
      use.addEventListener('click', () => applyOpenverseAsset(item, key, use));
      actions.append(use, source); info.append(title, license, actions); card.append(preview, info);
      preview.addEventListener('error', () => {
        if (!previewRetriedDirect && item.thumbnail && preview.src !== item.thumbnail){
          previewRetriedDirect = true; preview.src = item.thumbnail; return;
        }
        preview.classList.add('failed'); preview.alt = 'تعذرت معاينة هذه الصورة؛ يمكنك تجربة استخدامها';
      });
      grid.appendChild(card);
    });
    if (state.canLoadMore){
      const more = document.createElement('button'); more.type = 'button'; more.className = 'openverse-more';
      more.textContent = 'تحميل نتائج إضافية';
      more.addEventListener('click', () => { if (state.busy || !state.canLoadMore) return; state.page++; searchOpenverse(state.query, key, true); });
      grid.appendChild(more);
    }
  }

  function getAssetDirectUrl(url){
    // تُحمّل مكتبة الصور من المصدر المباشر مع CORS دون وسيط خادمي.
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.protocol !== 'https:' && parsed.origin !== window.location.origin) return null;
      return parsed.href;
    } catch { return null; }
  }

  function loadCorsImage(url, timeoutMs=18000){
    const candidates = [...new Set([getAssetDirectUrl(url), url].filter(Boolean))];
    return new Promise((resolve, reject) => {
      let index = 0, lastError = null;
      const tryNext = () => {
        if (index >= candidates.length) return reject(lastError || new Error('تعذر تحميل الصورة من المصدر.'));
        const source = candidates[index++];
        const image = new Image();
        let done = false;
        const timer = setTimeout(() => finish(new Error('انتهت مهلة تحميل الصورة')), timeoutMs);
        function finish(error){
          if (done) return;
          done = true; clearTimeout(timer);
          image.onload = null; image.onerror = null;
          if (error){ lastError = error; tryNext(); }
          else resolve(image);
        }
        image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        image.onload = () => image.naturalWidth ? finish() : finish(new Error('ملف الصورة فارغ'));
        image.onerror = () => finish(new Error('تعذر تحميل الصورة أو أن المصدر لا يسمح باستخدامها داخل المحرر'));
        image.src = source;
      };
      tryNext();
    });
  }

  async function applyOpenverseAsset(item, target, button=null){
    const key = target === 'overlay' ? 'overlay' : 'background';
    if (!(currentImage || originalImage)) return toast('ارفع صورة أولاً ثم اختر المورد', 'err');
    const oldLabel = button?.textContent;
    if (button){ button.disabled = true; button.textContent = 'جارٍ التحميل…'; }
    const id = encodeURIComponent(item.id);
    const urls = [
      `https://api.openverse.org/v1/images/${id}/thumb/?full_size=true`,
      item.url,
      item.thumbnail,
      `https://api.openverse.org/v1/images/${id}/thumb/`
    ].filter((value,index,array)=>value && array.indexOf(value)===index);
    let remote = null, lastError = null;
    for (const url of urls){
      try{ remote = await loadCorsImage(url); break; }
      catch(error){ lastError = error; }
    }
    if (!remote){
      if (button){ button.disabled = false; button.textContent = oldLabel || 'إعادة المحاولة'; }
      toast(lastError?.message || 'تعذر تحميل الصورة. جرّب نتيجة أخرى.', 'err');
      return;
    }
    try{
      const credit = item.attribution || `${item.title || 'صورة'} — ${item.creator || 'Openverse'} · ${item.license || ''}`;
      if (key === 'overlay'){
        onlineOverlayImage = remote;
        onlineOverlayId = `openverse-${item.id}`;
        onlineOverlayMode = $c('onlineOverlayMode')?.value || 'screen';
        const creditEl = $c('openverseOverlayCredit');
        if (creditEl){ creditEl.textContent = credit; creditEl.classList.remove('hidden'); }
        render();
        App.switchView('editor'); openPanel('effects');
        toast('تمت إضافة التراكب إلى الصورة ✓', 'ok');
      } else {
        const applied = await setBgSafe({ type:'openverse', value:remote.currentSrc || remote.src, image:remote, attribution:credit, source:item.foreign_landing_url || item.detail_url || '', license:item.license || '' });
        if (!applied) return;
        const creditEl = $c('openverseSelectedCredit');
        if (creditEl){ creditEl.textContent = credit; creditEl.classList.remove('hidden'); }
        App.switchView('editor'); openPanel('background');
        toast('تم اختيار الخلفية من المكتبة المفتوحة ✓', 'ok');
      }
    }catch(error){
      toast(error.message || 'تعذر تطبيق المورد', 'err');
    }finally{
      if (button){ button.disabled = false; button.textContent = oldLabel || (key === 'overlay' ? 'تطبيق التراكب' : 'استخدام الخلفية'); }
    }
  }

  function initOpenverseLibrary(){
    document.addEventListener('click', event => {
      const retry = event.target.closest('[data-openverse-retry]');
      if (!retry) return;
      const key = retry.dataset.openverseRetry === 'overlay' ? 'overlay' : 'background';
      const input = $c(key === 'overlay' ? 'openverseOverlaySearch' : 'openverseSearch');
      searchOpenverse(input?.value || openverseTargetState(key).query, key, false);
    });
    const bind=(inputId,buttonId,target)=>{
      const input=$c(inputId),button=$c(buttonId);
      button?.addEventListener('click',()=>searchOpenverse(input?.value,target,false));
      input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchOpenverse(input.value,target,false);}});
    };
    bind('openverseSearch','openverseSearchBtn','background');
    bind('openverseOverlaySearch','openverseOverlaySearchBtn','overlay');
    document.querySelectorAll('[data-openverse-query]').forEach(btn=>btn.addEventListener('click',()=>{
      const input=$c('openverseSearch');if(input)input.value=btn.dataset.openverseQuery||'';searchOpenverse(btn.dataset.openverseQuery,'background',false);
    }));
    document.querySelectorAll('[data-openverse-overlay-query]').forEach(btn=>btn.addEventListener('click',()=>{
      const input=$c('openverseOverlaySearch');if(input)input.value=btn.dataset.openverseOverlayQuery||'';searchOpenverse(btn.dataset.openverseOverlayQuery,'overlay',false);
    }));
    $c('onlineOverlayMode')?.addEventListener('change',e=>{onlineOverlayMode=e.target.value;render();});
  }

  function initStickerLibrary(){
    loadStickerPrefs();
    const categories = $c('stickerCategories');
    if (categories){
      categories.innerHTML = '';
      const all = [
        { id:'all', name:'الكل' },
        { id:'favorites', name:'المفضلة' },
        { id:'recent', name:'الأخيرة' },
        { id:'openmoji-full', name:'آلاف الملصقات' },
        ...STICKER_GROUPS.map(({id,name}) => ({id,name}))
      ];
      all.forEach(group => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'sticker-category' + (group.id === stickerCategory ? ' active' : '');
        btn.textContent = group.name;
        btn.addEventListener('click', () => {
          stickerCategory = group.id;
          categories.querySelectorAll('.sticker-category').forEach(x => x.classList.toggle('active', x === btn));
          renderStickerLibrary();
        });
        categories.appendChild(btn);
      });
    }
    $c('clearStickerRecent')?.addEventListener('click', () => {
      recentStickerEmojis = []; saveStickerPrefs();
      if (stickerCategory === 'recent') renderStickerLibrary();
      toast('تم مسح الملصقات الأخيرة', 'ok');
    });
    renderStickerLibrary();
  }

  async function ensureOpenMojiCatalog(){
    if (openMojiCatalog) return openMojiCatalog;
    if (openMojiLoading) return openMojiLoading;
    openMojiLoading = fetch(OPENMOJI_DATA_URL, { mode:'cors', cache:'force-cache' })
      .then(response => { if(!response.ok) throw new Error('تعذر تحميل مكتبة OpenMoji'); return response.json(); })
      .then(data => {
        const seen = new Set();
        openMojiCatalog = (Array.isArray(data) ? data : []).map(item => {
          const hex = String(item.hexcode || '').toUpperCase();
          const emoji = String(item.emoji || '');
          if(!hex || !emoji || seen.has(hex) || !/^[0-9A-F-]+$/.test(hex)) return null;
          seen.add(hex);
          return { emoji, label:item.annotation || item.name || 'OpenMoji', group:'openmoji-full', assetCode:hex, assetSource:'openmoji', tags:[item.tags,item.openmoji_tags,item.group,item.subgroups].filter(Boolean).join(' ') };
        }).filter(Boolean);
        return openMojiCatalog;
      })
      .finally(() => { openMojiLoading = null; });
    return openMojiLoading;
  }

  function renderStickerLibrary(){
    const grid = $c('stickersGrid');
    if (!grid) return;
    const query = ($c('stickerSearch')?.value || '').trim().toLocaleLowerCase('ar');
    if (stickerCategory === 'openmoji-full' && !openMojiCatalog){
      grid.innerHTML = '<div class="sticker-empty"><span class="mini-spinner"></span> جارٍ تحميل مكتبة OpenMoji الكبيرة...</div>';
      ensureOpenMojiCatalog().then(() => renderStickerLibrary()).catch(() => { grid.innerHTML = '<div class="sticker-empty">تعذر تحميل المكتبة. تحقق من الاتصال ثم افتح التصنيف مجددًا.</div>'; });
      return;
    }
    let source = STICKER_ITEMS;
    if (stickerCategory === 'favorites') source = [...STICKER_ITEMS, ...(openMojiCatalog || [])].filter(item => stickerFavorites.has(item.emoji));
    else if (stickerCategory === 'recent') source = recentStickerEmojis.map(emoji => [...STICKER_ITEMS, ...(openMojiCatalog || [])].find(item => item.emoji === emoji)).filter(Boolean);
    else if (stickerCategory === 'openmoji-full') source = openMojiCatalog || [];
    else if (stickerCategory !== 'all') source = STICKER_ITEMS.filter(item => item.group === stickerCategory);
    const items = source.filter(item => !query || item.label.toLocaleLowerCase('ar').includes(query) || item.emoji.includes(query) || String(item.tags || '').toLocaleLowerCase('ar').includes(query));
    const limit = stickerCategory === 'openmoji-full' ? (query ? 120 : openMojiVisible) : items.length;
    const shown = items.slice(0, limit);
    grid.innerHTML = '';
    const count = $c('stickerCount');
    const results = $c('stickerResults');
    if (count) count.textContent = `${items.length.toLocaleString('ar-EG')} ملصق`;
    if (results) results.textContent = stickerCategory === 'favorites' ? 'ملصقاتك المفضلة' : stickerCategory === 'recent' ? 'أضيفت مؤخرًا' : stickerCategory === 'openmoji-full' ? `مكتبة مفتوحة · ${shown.length} من ${items.length}` : 'اختر من المكتبة';
    if (!items.length){
      grid.innerHTML = `<div class="sticker-empty">${stickerCategory === 'favorites' ? 'لم تضف ملصقات إلى المفضلة بعد' : stickerCategory === 'recent' ? 'لم تضف ملصقات مؤخرًا' : 'لا توجد ملصقات مطابقة للبحث'}</div>`;
      return;
    }
    shown.forEach(item => {
      const card = document.createElement('div');
      card.className = 'sticker-card';
      const pick = document.createElement('button');
      pick.type = 'button'; pick.className = 'sticker-item'; pick.title = item.label;
      pick.setAttribute('aria-label', `إضافة ${item.label}`);
      if (item.assetCode && (item.assetSource === 'openmoji' || item.group === 'openmoji-featured')){
        const img = document.createElement('img'); img.alt = item.label; img.loading = 'lazy'; img.crossOrigin = 'anonymous';
        img.src = `https://cdn.jsdelivr.net/npm/openmoji@17.0.0/color/svg/${item.assetCode}.svg`;
        img.addEventListener('error', () => { img.remove(); pick.textContent = item.emoji; });
        pick.appendChild(img);
      } else pick.textContent = item.emoji;
      pick.addEventListener('click', () => item.assetCode && (item.assetSource === 'openmoji' || item.group === 'openmoji-featured') ? addRemoteSticker(item) : addSticker(item.emoji));
      const fav = document.createElement('button');
      const isFav = stickerFavorites.has(item.emoji);
      fav.type = 'button'; fav.className = 'sticker-fav' + (isFav ? ' active' : '');
      fav.textContent = isFav ? '★' : '☆';
      fav.title = isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة';
      fav.setAttribute('aria-label', fav.title);
      fav.addEventListener('click', () => {
        if (stickerFavorites.has(item.emoji)) stickerFavorites.delete(item.emoji);
        else stickerFavorites.add(item.emoji);
        saveStickerPrefs(); renderStickerLibrary();
      });
      card.append(pick, fav);
      grid.appendChild(card);
    });
    if(stickerCategory === 'openmoji-full' && !query && shown.length < items.length){
      const more = document.createElement('button'); more.type='button'; more.className='sticker-load-more';
      more.textContent = `عرض المزيد · ${Math.min(72, items.length-shown.length)} ملصق`;
      more.addEventListener('click', () => { openMojiVisible += 72; renderStickerLibrary(); });
      grid.appendChild(more);
    }
  }

  function syncStickerEditor(){
    const editor = $c('stickerEditor');
    const sticker = typeof selectedId === 'number' && selectedId > 1000 ? stickers.find(x => x.id === selectedId) : null;
    editor?.classList.toggle('hidden', !sticker);
    if (!sticker) return;
    const size = $c('stickerSize'), rotate = $c('stickerRotate'), opacity = $c('stickerOpacity');
    if (size){ size.value = Math.round(sticker.size); $c('valStickerSize').textContent = `${Math.round(sticker.size)}px`; }
    if (rotate){ rotate.value = Math.round(sticker.rotation || 0); $c('valStickerRotate').textContent = `${Math.round(sticker.rotation || 0)}°`; }
    if (opacity){ opacity.value = Math.round((sticker.opacity ?? 1)*100); $c('valStickerOpacity').textContent = `${opacity.value}%`; }
  }

  function updateSelectedSticker(changes, labelId, label){
    const sticker = stickers.find(x => x.id === selectedId);
    if (!sticker) return;
    Object.assign(sticker, changes);
    const out = $c(labelId); if (out) out.textContent = label;
    render();
  }

  function deleteSelectedSticker(){
    const index = stickers.findIndex(x => x.id === selectedId);
    if (index < 0) return toast('حدد ملصقاً أولاً', 'err');
    stickers.splice(index, 1); selectedId = null; syncStickerEditor(); render();
    toast('تم حذف الملصق', 'ok');
  }

  function duplicateSelectedSticker(){
    const sticker = stickers.find(x => x.id === selectedId);
    if (!sticker) return toast('حدد ملصقاً أولاً', 'err');
    const copy = { ...sticker, id:1000 + (++stickerIdCounter), x:sticker.x + 24, y:sticker.y + 24 };
    stickers.push(copy); selectedId = copy.id; syncStickerEditor(); render();
    toast('تم نسخ الملصق', 'ok');
  }

  function handleStickerUpload(file){
    if (!/^image\/(png|webp|jpeg)$/.test(file.type)) return toast('اختر PNG أو WebP أو JPG', 'err');
    if (file.size > 12 * 1024 * 1024) return toast('حجم الملصق يجب ألا يتجاوز 12MB', 'err');
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      uploadedStickerUrls.push(url);
      const id = 1000 + (++stickerIdCounter);
      stickers.push({ id, type:'image', image, name:file.name, x:base.naturalWidth/2, y:base.naturalHeight/2, size:Math.round(base.naturalWidth/6), rotation:0, opacity:1 });
      selectedId = id; syncStickerEditor(); render();
      if (App && typeof App.switchView === 'function') App.switchView('editor');
      toast('تمت إضافة الملصق الخاص بك. يمكنك تعديله داخل الصورة.', 'ok');
    };
    image.onerror = () => { URL.revokeObjectURL(url); toast('تعذر قراءة صورة الملصق', 'err'); };
    image.src = url;
  }

  function addSticker(em){
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً', 'err');
    recentStickerEmojis = [em, ...recentStickerEmojis.filter(v => v !== em)].slice(0,24);
    saveStickerPrefs();
    const id = 1000 + (++stickerIdCounter);
    stickers.push({
      id, type:'emoji', emoji: em, rotation:0, opacity:1,
      x: base.naturalWidth / 2,
      y: base.naturalHeight / 2,
      size: Math.round(base.naturalWidth / 8)
    });
    selectedId = id;
    syncStickerEditor();
    render();
    if (App && typeof App.switchView === 'function') App.switchView('editor');
    toast('تمت إضافة الملصق. يمكنك تحريكه وتعديله داخل الصورة.', 'ok');
  }

  async function addRemoteSticker(item){
    const base = currentImage || originalImage;
    if (!base) return toast('ارفع صورة أولاً حتى تتمكن من إضافة الملصق', 'err');
    try {
      const url = `https://cdn.jsdelivr.net/npm/openmoji@17.0.0/color/svg/${item.assetCode}.svg`;
      const image = await loadCorsImage(url);
      recentStickerEmojis = [item.emoji, ...recentStickerEmojis.filter(v => v !== item.emoji)].slice(0,24); saveStickerPrefs();
      const id = 1000 + (++stickerIdCounter);
      stickers.push({id,type:'image',image,name:`OpenMoji · ${item.label}`,emoji:item.emoji,x:base.naturalWidth/2,y:base.naturalHeight/2,size:Math.round(base.naturalWidth/8),rotation:0,opacity:1});
      selectedId=id; syncStickerEditor(); render(); if (App && typeof App.switchView === 'function') App.switchView('editor'); toast('تمت إضافة الملصق الخارجي. يمكنك تعديله داخل الصورة.','ok');
    } catch (error) {
      addSticker(item.emoji);
      toast('تعذر تحميل ملف الملصق الخارجي؛ أُضيف الرمز البديل. يمكنك المحاولة مجددًا لاحقًا.', 'err');
    }
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

  let autoRemovePromise = null;
  let backgroundApplySequence = 0;
  async function autoRemoveBackground(){
    if (bgRemoved) return true;
    if (autoRemovePromise) return autoRemovePromise;
    autoRemovePromise = removeBackground(true).finally(() => { autoRemovePromise = null; });
    return autoRemovePromise;
  }
  async function setBgSafe(bg){
    const requestSequence = ++backgroundApplySequence;
    const base = currentImage || originalImage;
    if (!base){ toast('ارفع صورة أولاً ثم اختر الخلفية', 'err'); return false; }
    const needsCutout = !bgRemoved && ['preset','openverse','upload','color','gradient'].includes(bg.type);
    if (needsCutout){
      const hint = $c('bgApplyHint');
      if (hint){ hint.classList.remove('hidden'); hint.textContent = 'يجري فصل العنصر تلقائيًا ثم تطبيق الخلفية المختارة…'; }
      toast('جاري إزالة الخلفية وتطبيق اختيارك…', 'ok');
      const ok = await autoRemoveBackground();
      if (requestSequence !== backgroundApplySequence) return false;
      if (!ok){
        if (hint){ hint.classList.remove('hidden'); hint.textContent = 'لم يتم تطبيق الخلفية لأن فصل الصورة لم يكتمل. يمكنك إعادة المحاولة أو اختيار خلفية أخرى.'; }
        return false;
      }
    }
    setBg(bg);
    $c('bgApplyHint')?.classList.add('hidden');
    if (['preset','openverse','upload','color','gradient'].includes(bg.type)) toast('تم تطبيق الخلفية على الصورة ✓', 'ok');
    return true;
  }
  function setBg(bg){
    currentBg = bg;
    if (bg.type === 'preset' || bg.type === 'openverse' || bg.type === 'upload'){
      // أعد استخدام الصورة التي اجتازت التحميل مسبقاً؛ لا تعِد تنزيل الأصل.
      if (bg.image?.complete && bg.image.naturalWidth){
        bgImage = bg.image;
        render();
        return;
      }
      const nextImage = new Image();
      if (bg.type === 'preset' || bg.type === 'openverse') nextImage.crossOrigin = 'anonymous';
      nextImage.decoding = 'async';
      nextImage.onload = () => { bgImage = nextImage; render(); };
      nextImage.onerror = () => toast('تعذر تحميل الخلفية من المصدر. جرّب موردًا آخر.', 'err');
      nextImage.src = bg.value;
      bgImage = null;
    } else bgImage = null;
    render();
  }
  function handleBgUpload(file){
    if (!file.type.startsWith('image/')) return toast('صيغة غير مدعومة', 'err');
    if (file.size > 10*1024*1024) return toast('حجم الخلفية يجب ألا يتجاوز 10MB', 'err');
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      const applied = await setBgSafe({ type:'upload', value:url, image });
      if (applied) toast('تم اختيار الخلفية من جهازك ✓', 'ok');
      else toast('لم يتم تطبيق الخلفية لأن إزالة الخلفية لم تكتمل.', 'err');
    };
    image.onerror = () => { URL.revokeObjectURL(url); toast('تعذر قراءة ملف الخلفية', 'err'); };
    image.src = url;
  }

  function setWorkspaceFocus(enabled){
    const workspace=$c('workspace');
    const button=$c('toggleCanvasFocus');
    if(!workspace) return false;
    const on=!!enabled;
    workspace.classList.toggle('canvas-focus-mode',on);
    document.body.classList.toggle('canvas-focus-active',on);
    if(button){
      button.setAttribute('aria-pressed',String(on));
      button.title=on?'إنهاء وضع مساحة التحرير الموسّعة':'توسيع مساحة التحرير';
      button.setAttribute('aria-label',button.title);
    }
    scheduleCanvasFit();
    return on;
  }
  function toggleWorkspaceFocus(){ return setWorkspaceFocus(!$c('workspace')?.classList.contains('canvas-focus-mode')); }
  function openPanel(name){
    if(name !== 'stickers' && $c('workspace')?.classList.contains('canvas-focus-mode')) setWorkspaceFocus(false);
    if (name === 'stickers'){
      closePanel();
      App.switchView('assets');
      App.setAssetTab('stickers');
      return;
    }
    if (activePanel === name){ closePanel(name); return; }
    const displayPanel = name === 'layers' ? 'adjust' : name;
    activePanel = name;
    $c('workspace')?.classList.add('has-panel');
    scheduleCanvasFit();
    document.querySelectorAll('.ws-panels .panel[data-panel]').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== displayPanel));
    document.querySelectorAll('.tool').forEach(t => t.classList.toggle('active', t.dataset.tool === name));
    if (name === 'crop'){
      if (!currentImage && !originalImage){ toast('ارفع صورة أولاً', 'err'); activePanel = null; $c('workspace')?.classList.remove('has-panel'); document.querySelectorAll('.ws-panels .panel[data-panel]').forEach(p => p.classList.add('hidden')); document.querySelectorAll('.tool').forEach(t => t.classList.remove('active')); return; }
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
  }
  function closePanel(){
    activePanel = null;
    $c('workspace')?.classList.remove('has-panel');
    scheduleCanvasFit();
    cropActive = false;
    $c('cropOverlay')?.classList.add('hidden');
    document.querySelectorAll('.ws-panels .panel[data-panel]').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    if (mainCanvas) mainCanvas.classList.remove('tool-brush');
    selectedId = null;
    render();
  }
  function scheduleCanvasFit(){
    if (fitFrame) cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      fitFrame = 0;
      fitCanvasToWorkspace();
    });
  }
  function fitCanvasToWorkspace(){
    const base = currentImage || originalImage;
    const wrap = $c('canvasWrap');
    if (!base || !mainCanvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return;
    const css = getComputedStyle(wrap);
    const padX = (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0);
    const padY = (parseFloat(css.paddingTop) || 0) + (parseFloat(css.paddingBottom) || 0);
    const availableW = Math.max(40, wrap.clientWidth - padX - 8);
    const availableH = Math.max(40, wrap.clientHeight - padY - 8);
    const naturalW = Math.max(1, base.naturalWidth || base.width);
    const naturalH = Math.max(1, base.naturalHeight || base.height);
    const nextScale = Math.min(availableW / naturalW, availableH / naturalH);
    if (!Number.isFinite(nextScale) || nextScale <= 0) return;
    fitScale = nextScale;
    mainCanvas.style.width = `${Math.max(1, naturalW * fitScale)}px`;
    mainCanvas.style.height = `${Math.max(1, naturalH * fitScale)}px`;
    mainCanvas.style.maxWidth = 'none';
    mainCanvas.style.maxHeight = 'none';
    applyZoom();
  }
  function applyZoom(){
    if (mainCanvas){
      mainCanvas.style.transformOrigin = 'center center';
      mainCanvas.style.transform = `scale(${zoom})`;
    }
    if ($c('zoomVal')) $c('zoomVal').textContent = `${Math.round(zoom * fitScale * 100)}%`;
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
    buildFilterThumbs();
    openPanel('adjust');
    toast('الصورة جاهزة للتحرير ✓', 'ok');
  }
  function loadOriginal(file){
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        originalImage = img; currentImage = img; imageEditUndoStack.length = 0; drawLayerVisible = true;
        const dimLabel = $c('canvasDimensions'); if (dimLabel) dimLabel.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
        const fileLabel = $c('canvasFileName'); if (fileLabel) fileLabel.textContent = String(file.name || 'صورة').slice(0, 48);
        setExportDimensionFields(img.naturalWidth, img.naturalHeight);
        bgRemoved = false;
        $c('bgApplyHint')?.classList.add('hidden');
        strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0;
        currentBg = { type:'original' };
        adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
        filterId = 'none'; filterIntensity = 1; artStyleId='none'; artStyleIntensity=1; visualFxId='none'; visualFxIntensity=.55; onlineOverlayId='none'; onlineOverlayImage=null; onlineOverlayIntensity=.35;
        document.querySelectorAll('[data-art-style],[data-visual-fx]').forEach(x => x.classList.toggle('active', x.dataset.artStyle === 'none' || x.dataset.visualFx === 'none'));
        if($c('artIntensity')) $c('artIntensity').value=100; if($c('valArtIntensity')) $c('valArtIntensity').textContent='100%';
        if($c('visualIntensity')) $c('visualIntensity').value=55; if($c('valVisualIntensity')) $c('valVisualIntensity').textContent='55%';
        if($c('onlineOverlayIntensity')) $c('onlineOverlayIntensity').value=35; if($c('valOnlineOverlayIntensity')) $c('valOnlineOverlayIntensity').textContent='35%';
        $c('onlineOverlaysGrid')?.querySelectorAll('.online-bg-card').forEach((x,i)=>x.classList.toggle('active',i===0));
        border = { id:'none', name:'بدون إطار', style:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
        imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
        selectedId = null;
        syncStickerEditor();
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
        zoom = 1;
        applyZoom();
        scheduleCanvasFit();
        requestAnimationFrame(() => requestAnimationFrame(fitCanvasToWorkspace));
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
    let session = null, originalPath = null, resultPath = null, historySaved = false;
    if (btn) btn.disabled = true;
    if (loadingText) loadingText.textContent = 'جاري إزالة الخلفية…';
    loading?.classList.remove('hidden');
    try {
      session = await Auth.valid();
      if (!session?.access_token || !session?.user?.id){
        toast('انتهت الجلسة. سجّل الدخول ثم أعد المحاولة.', 'err');
        App.showAuth();
        return false;
      }
      Auth.session = session;
      if (!Auth.profile) Auth.profile = await API.getProfile(session.user.id, session.access_token);
      if (Auth.profile?.is_banned) throw new Error('الحساب موقوف ولا يمكنه استخدام إزالة الخلفية.');
      if (!Auth.isPro()){
        // فشل قراءة العداد لا يوقف اتصال المعالجة؛ يظل سجل قاعدة البيانات هو مصدر الاستخدام عند حفظ العملية.
        const today = await API.countToday(session.access_token, session.user.id).catch(() => null);
        const limit = Number(Auth.profile?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
        if (today !== null && limit > 0 && today >= limit) throw new Error(`وصلت إلى الحد اليومي المسموح (${limit} عمليات).`);
      }

      const canvas = document.createElement('canvas');
      canvas.width = base.naturalWidth || base.width;
      canvas.height = base.naturalHeight || base.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('تعذر تجهيز الصورة للمعالجة.');
      context.drawImage(base, 0, 0);
      const sourceBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!sourceBlob?.size) throw new Error('تعذر إنشاء ملف الصورة قبل الإزالة.');
      const sourceFile = new File([sourceBlob], 'source.png', { type:'image/png' });

      // يستخدم هذا المسار نقطة Pixelcut المباشرة التي كانت تعمل في النسخة الأصلية.
      const resultBlob = await API.removeBg(sourceFile);
      if (!(resultBlob instanceof Blob) || !resultBlob.size) throw new Error('لم تُرجع الخدمة صورة صالحة.');
      const normalizedBlob = resultBlob.type.startsWith('image/') ? resultBlob : new Blob([resultBlob], { type:'image/png' });

      // حمّل النتيجة في المحرر فور نجاح المعالجة؛ لا تجعل فشل تسجيل السجل يلغي الصورة الناتجة.
      const resultUrl = URL.createObjectURL(normalizedBlob);
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          currentImage = image;
          bgRemoved = true;
          imgScale = 1; imgOffsetX = 0; imgOffsetY = 0; imgAlpha = 1;
          $c('bgApplyHint')?.classList.add('hidden');
          render();
          URL.revokeObjectURL(resultUrl);
          resolve();
        };
        image.onerror = () => { URL.revokeObjectURL(resultUrl); reject(new Error('تعذر فتح ملف الصورة الناتجة.')); };
        image.src = resultUrl;
      });

      let historyWarning = '';
      try {
        originalPath = await API.upload(session.access_token, session.user.id, sourceFile, 'orig');
        resultPath = await API.upload(session.access_token, session.user.id, normalizedBlob, 'res');
        await API.saveOp(session.access_token, originalPath, resultPath);
        historySaved = true;
        if (App.refreshUsage) App.refreshUsage();
      } catch (historyError) {
        historyWarning = 'تعذر حفظ العملية في سجل الحساب.';
        console.warn('Background removal history save failed:', historyError);
      }

      if (!silent) toast(historyWarning ? 'تمت إزالة الخلفية بنجاح، لكن تعذر حفظ العملية في السجل.' : 'تمت إزالة الخلفية وحفظ العملية في السجل ✓', 'ok');
      return true;
    } catch(error){
      console.error('Remove background:', error);
      const message = error?.name === 'TypeError' && /fetch/i.test(error.message || '')
        ? 'تعذر الاتصال بخدمة إزالة الخلفية مباشرة. تحقق من الإنترنت ثم أعد المحاولة.'
        : (error.message || 'فشلت إزالة الخلفية.');
      toast(message, 'err');
      return false;
    } finally {
      if (!historySaved && session?.access_token && (originalPath || resultPath)) {
        await API.removeFiles(session.access_token, [originalPath, resultPath].filter(Boolean));
      }
      if (btn) btn.disabled = false;
      loading?.classList.add('hidden');
    }
  }

  const ART_STYLE_ENDPOINTS = Object.freeze({
    '3d':'to3d', anime:'toanime', cyberpunk:'tocyberpunk', disney:'todisney',
    ghibli:'toghibli', hitam:'tohitam', japanese:'tojepang', lego:'tolego',
    manga:'tomanga', oil:'tooil', pixar:'topixar', sketch:'tosketch'
  });

  const IMAGE_EFFECT_PROMPTS = Object.freeze({
    rain: 'أضف مطرًا سينمائيًا واقعيًا متعدد الطبقات: قطرات أمامية متفاوتة الحجم، خطوط مطر دقيقة في العمق، انعكاسات وبلل مائي على الأسطح المناسبة، تموجات صغيرة وإضاءة باردة متوازنة. لا تغيّر الأشخاص أو ملامحهم أو الملابس أو العناصر الأصلية ولا تحجب الوجه.',
    snow: 'أضف تساقط ثلوج واقعيًا بطبقات عمق متعددة: رقاقات ثلج واضحة أمام العدسة وأخرى صغيرة في الخلفية، اختلافات طبيعية في الحجم والتركيز، إضاءة باردة ناعمة. لا تغيّر هوية الأشخاص أو ملابسهم أو الخلفية ولا تغطِّ تفاصيل الوجه.',
    petals: 'أضف بتلات زهور وردية وحمراء رقيقة متطايرة في الهواء، بحركات واتجاهات وأحجام مختلفة، مع عمق مجال طبيعي وبعض البتلات القريبة غير الحادة. لا تحجب الوجوه ولا تغيّر أي عنصر أصلي أو هوية أو وضعية.',
    starlight: 'أضف نجومًا ولمعانًا ضوئيًا واقعيًا: نقاط نجوم دقيقة، ومضات نجمية صغيرة محدودة، وبوكيه ذهبي خفيف في مناطق الخلفية المناسبة. لا تحول المشهد إلى سماء جديدة ولا تضف نصوصًا، وحافظ على جميع العناصر الأصلية.',
    rays: 'أضف أشعة شمس ذهبية volumetric rays تنطلق من مصدر ضوء منطقي، تمر خلال الهواء أو الغيوم، مع غبار مضيء خفيف وظلال متسقة. اجعل الضوء واقعيًا وغير مبالغ فيه، ولا تغير ملامح الأشخاص أو ألوان ملابسهم أو التكوين.',
    fog: 'أضف ضبابًا سينمائيًا واقعيًا بطبقات عمق متفاوتة، كثافة خفيفة في المقدمة ومتوسطة في الخلفية، تشتت ضوئي ناعم وفصل واضح بين مستويات المشهد. أبقِ الموضوع الرئيسي والوجوه واضحة، ولا تستبدل الخلفية أو تحذف تفاصيلها.',
    lensflare: 'أضف وهج عدسة فوتوغرافيًا lens flare نابعًا من مصدر ضوء موجود أو منطقي، يتضمن وهجًا بصريًا ناعمًا وانعكاسات عدسية خفيفة وخطًا ضوئيًا مضبوطًا. لا تحجب الوجه أو التفاصيل المهمة ولا تضف مصدر ضوء ظاهرًا جديدًا.',
    lightning: 'أضف ومضة برق طبيعية بعيدة في السماء أو الخلفية فقط، مع تفرعات برق دقيقة وتوهج قصير وانعكاس إضاءة لحظي متسق مع المشهد. لا تجعل البرق يلامس أي شخص ولا تغير الأشخاص أو العناصر أو الخلفية الأصلية.',
    lightleak: 'أضف تسربًا ضوئيًا فوتوغرافيًا light leak بلون ذهبي/نحاسي دافئ يتسلل من أطراف الإطار، مع تدرج ضوئي عضوي ووهج فيلمي خفيف. لا تغطِّ الموضوع الرئيسي ولا تغيّر ألوان أو تفاصيل الأشخاص أو الأشياء.',
    bokeh: 'أضف بوكيه بصريًا احترافيًا في عمق الخلفية: دوائر ضوء ناعمة متفاوتة الحجم والسطوع، عزل بصري واقعي، وعمق مجال متناسق مع العدسة. لا تضع دوائر فوق الوجه أو تفاصيل الموضوع ولا تغيّر شكل المشهد.',
    grain: 'أضف ملمس حبيبات فيلم فوتوغرافي film grain ناعمًا ودقيقًا ومتجانسًا، مع حبيبات عضوية دقيقة وتباين سينمائي خفيف. لا تضف خدوشًا أو تلفًا أو ضوضاء رقمية قوية ولا تغير ألوان الأشخاص أو ملامحهم.',
    dust: 'أضف جسيمات غبار ذهبية صغيرة مضيئة عائمة في الهواء، بتوزيع طبيعي ودرجات تركيز ومسافات مختلفة، مع توهج دقيق وعمق ميداني. لا تغطِّ الوجه أو التفاصيل الأساسية ولا تضف أجسامًا كبيرة أو تغير عناصر الصورة.',
    glow: 'أضف توهجًا ضوئيًا محيطيًا ناعمًا bloom حول مصادر الإضاءة والانعكاسات الموجودة فقط، مع انتقالات مضيئة متدرجة وحفاظ على التفاصيل في المناطق الساطعة. لا تضف مصادر إضاءة جديدة ولا تجعل الصورة ضبابية.'
  });

  function selectImagePreset(kind, id, button){
    if (id && id !== 'none' && !(currentImage || originalImage)) return toast('ارفع صورة أولاً', 'err');
    if (kind === 'art') {
      document.querySelectorAll('[data-art-style]').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('[data-visual-fx]').forEach(item => item.classList.toggle('active', item.dataset.visualFx === 'none'));
    } else {
      document.querySelectorAll('[data-visual-fx]').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('[data-art-style]').forEach(item => item.classList.toggle('active', item.dataset.artStyle === 'none'));
    }

    artStyleId = kind === 'art' ? (id || 'none') : 'none';
    visualFxId = kind === 'effect' ? (id || 'none') : 'none';
    onlineOverlayId = 'none';
    onlineOverlayImage = null;

    if (!id || id === 'none') {
      if (imageEditUndoStack.length) {
        currentImage = imageEditUndoStack[0] || originalImage;
        imageEditUndoStack.length = 0;
        if (currentImage) {
          const dimensions = $c('canvasDimensions');
          if (dimensions) dimensions.textContent = `${currentImage.naturalWidth} × ${currentImage.naturalHeight}`;
          setExportDimensionFields(currentImage.naturalWidth, currentImage.naturalHeight);
        }
        render(); scheduleCanvasFit();
        toast('تمت استعادة الصورة قبل التحويلات التوليدية.', 'ok');
      } else {
        render(); toast('الصورة الحالية هي الأصلية.', 'ok');
      }
      return;
    }

    if (kind === 'art') {
      const operation = ART_STYLE_ENDPOINTS[id];
      if (!operation) return toast('هذا التحويل غير متاح حاليًا.', 'err');
      runImageEdit({ operation, mode:'style' });
      return;
    }

    const prompt = IMAGE_EFFECT_PROMPTS[id];
    if (!prompt) return toast('هذا المؤثر غير متاح حاليًا.', 'err');
    const intensityValue = Number($c('visualIntensity')?.value);
    const intensity = Number.isFinite(intensityValue) ? Math.max(0, Math.min(100, intensityValue)) : 55;
    if (intensity === 0) return toast('ارفع شدة المؤثر قبل التنفيذ.', 'err');
    const finalPrompt = `${prompt}\n\nشدة المؤثر: ${intensity} من 100. اضبط وضوح المؤثر وفق هذه الدرجة، مع إبقاء العناصر الأصلية كما هي.`;
    const promptInput = $c('imageEditPrompt');
    const modeSelect = $c('imageEditMode');
    if (promptInput) {
      promptInput.value = finalPrompt;
      promptInput.dispatchEvent(new Event('input', { bubbles:true }));
    }
    if (modeSelect) modeSelect.value = 'preserve';
    runImageEdit({ operation:'edit-image', prompt:finalPrompt, mode:'preserve' });
  }

  function buildImagePrompt(userPrompt, mode){
    const task = userPrompt.trim();
    const preserve = [
      'نفّذ تعديلًا على الصورة المرجعية نفسها، ولا تنشئ مشهدًا جديدًا أو صورة بديلة.',
      'ثبّت هوية كل شخص وملامح الوجه والعينين والأنف والفم وشكل الرأس والعمر الظاهري وتسريحة الشعر ولون البشرة والملابس والإكسسوارات والوضعية واتجاه النظر، ولا تستبدل الشخص أو تعِد تصميمه.',
      'حافظ على عدد الأشخاص والعناصر، وحدود الأجسام، والنسب والأحجام، والمنظور، وزاوية الكاميرا، والقص، وتوزيع العناصر، والخلفية، ما لم يطلب الوصف تغيير عنصر محدد منها صراحةً.',
      'حافظ على كل كتابة أو شعار أو رمز موجود أصلًا كما هو حرفيًا ما لم يطلب المستخدم تغييره. لا تضف أشخاصًا أو أشياء أو كتابات أو شعارات أو علامات مائية، ولا تحذف أي عنصر غير مذكور في الطلب.',
      'لا تنفذ تنميقًا تلقائيًا للوجه أو تغييرًا لشكل الجسم أو العمر أو لون البشرة أو نسب الأعضاء أو ملامح التعبير. حافظ على التفاصيل الدقيقة والملمس الطبيعي والعيوب والسمات الأصلية.',
      'غيّر الجزء أو الخاصية المطلوبة فقط، واترك كل ما عداه مطابقًا للصورة المرجعية قدر الإمكان. اجعل الإضاءة والظلال والانعكاسات الناتجة متسقة واقعيًا مع المشهد.'
    ];
    const style = [
      'نفّذ تحويلًا فنيًا للصورة المرجعية نفسها. يمكن تغيير أسلوب الرسم والخامات والألوان بما يلزم للأسلوب المطلوب، لكن يجب تثبيت هوية الأشخاص وملامحهم المميزة وأشكالهم ونسبهم ووضعياتهم وملابسهم وعدد العناصر وترتيبها وحدود المشهد.',
      'لا تستبدل الأشخاص أو تغيّر أعمارهم الظاهرية أو تعابيرهم أو تسريحاتهم، ولا تضف أو تحذف أي عنصر. لا تغيّر القص أو زاوية الكاميرا أو التكوين.'
    ];
    const rules = mode === 'style' ? style : preserve;
    return `${rules.join('\n')}\n\nالتعديل المطلوب من المستخدم:\n${task}\n\nأخرج صورة واحدة مكتملة عالية الجودة، من دون شرح أو نصوص إضافية داخل الصورة.`;
  }

  function blobFromCanvas(canvas, type='image/png', quality){
    return new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر تجهيز الصورة للإرسال.')), type, quality));
  }

  async function loadImageResult(blob){
    const objectUrl = URL.createObjectURL(blob);
    try{
      const image = await new Promise((resolve,reject) => {
        const next = new Image();
        next.onload = () => resolve(next);
        next.onerror = () => reject(new Error('أعاد النموذج ملفًا لا يمكن فتحه كصورة.'));
        next.src = objectUrl;
      });
      imageEditUndoStack.push(currentImage || originalImage);
      if (imageEditUndoStack.length > 12) imageEditUndoStack.shift();
      currentImage = image;
      imgScale = 1; imgOffsetX = 0; imgOffsetY = 0; imgAlpha = 1;
      const dimensions = $c('canvasDimensions');
      if (dimensions) dimensions.textContent = `${image.naturalWidth} × ${image.naturalHeight}`;
      setExportDimensionFields(image.naturalWidth, image.naturalHeight);
      selectedId = null;
      render();
      scheduleCanvasFit();
      return image;
    } finally { URL.revokeObjectURL(objectUrl); }
  }

  async function runImageEdit(action = {}){
    const promptInput = $c('imageEditPrompt');
    const mode = action.mode || $c('imageEditMode')?.value || 'preserve';
    const operation = action.operation || 'edit-image';
    const userPrompt = String(action.prompt ?? promptInput?.value ?? '').trim();
    const base = currentImage || originalImage;
    const button = $c('imageEditRunBtn');
    const status = $c('imageEditStatus');
    const loading = $c('canvasLoading');
    const loadingText = $c('canvasLoadingText');
    if (!base) return toast('ارفع صورة أولاً', 'err');
    if (operation === 'edit-image' && !userPrompt) { promptInput?.focus(); return toast('اكتب وصف التعديل أولاً', 'err'); }
    if (operation === 'edit-image' && userPrompt.length > 3000) return toast('الوصف يتجاوز الحد المسموح.', 'err');
    if (button?.disabled) return;

    let session = null, sourcePath = null, resultPath = null, historySaved = false;
    const previousLabel = button?.innerHTML;
    const isStyle = operation !== 'edit-image';
    const actionLabel = isStyle ? 'تحويل الصورة' : 'تعديل الصورة';
    if (button){ button.disabled = true; button.innerHTML = `<span>جارٍ ${actionLabel}...</span><b class="ai-edit-spinner"></b>`; }
    if (status){ status.classList.remove('hidden','error'); status.textContent = 'تجهيز الصورة للمعالجة…'; }
    if (loadingText) loadingText.textContent = 'يجري تنفيذ طلبك على الصورة…';
    loading?.classList.remove('hidden');

    try{
      session = await Auth.valid();
      if (!session?.access_token || !session?.user?.id){
        App.showAuth();
        throw new Error('انتهت جلسة الحساب. سجّل الدخول ثم أعد المحاولة.');
      }
      Auth.session = session;
      if (!Auth.profile) Auth.profile = await API.getProfile(session.user.id, session.access_token);
      if (Auth.profile?.is_banned) throw new Error('لا يمكن استخدام الخدمة بهذا الحساب.');
      if (!Auth.isPro()){
        const today = await API.countToday(session.access_token, session.user.id).catch(() => null);
        const limit = Number(Auth.profile?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
        if (today !== null && limit > 0 && today >= limit) throw new Error(`وصلت إلى الحد اليومي المسموح (${limit} عمليات).`);
      }

      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = base.naturalWidth || base.width;
      sourceCanvas.height = base.naturalHeight || base.height;
      const sourceContext = sourceCanvas.getContext('2d');
      if (!sourceContext) throw new Error('تعذر تجهيز الصورة الأساسية.');
      sourceContext.drawImage(base, 0, 0);
      let sourceBlob = await blobFromCanvas(sourceCanvas, 'image/png');
      if (!sourceBlob.size) throw new Error('ملف الصورة فارغ.');
      if (sourceBlob.size > 9 * 1024 * 1024) {
        if (status) status.textContent = 'تحسين حجم نسخة الإرسال…';
        const webpBlob = await blobFromCanvas(sourceCanvas, 'image/webp', 0.92);
        if (webpBlob.type === 'image/webp' && webpBlob.size < sourceBlob.size) sourceBlob = webpBlob;
      }
      if (sourceBlob.size > 10 * 1024 * 1024) throw new Error('حجم الصورة أكبر من الحد المسموح (10 ميجابايت).');

      if (status) status.textContent = 'حفظ نسخة العمل في حسابك…';
      sourcePath = await API.upload(session.access_token, session.user.id, sourceBlob, 'image-source');

      const requestForm = new FormData();
      requestForm.append('operation', operation);
      requestForm.append('media', sourceBlob, sourceBlob.type === 'image/webp' ? 'image.webp' : 'image.png');
      if (operation === 'edit-image') requestForm.append('prompt', buildImagePrompt(userPrompt, mode));

      if (status) status.textContent = isStyle ? 'تنفيذ التحويل الفني…' : 'تنفيذ التعديل وفق الوصف…';
      const response = await fetch('/api/image-process', {
        method:'POST',
        headers:{ 'Accept':'image/*,model/*,application/json,application/octet-stream', 'Authorization':`Bearer ${session.access_token}`, 'apikey':CONFIG.SUPABASE_KEY },
        body:requestForm
      });
      if (!response.ok){
        let message = '';
        try { const payload = await response.json(); message = payload?.error || payload?.message || ''; } catch {}
        throw new Error(message || 'تعذر إكمال معالجة الصورة حاليًا. أعد المحاولة بعد قليل.');
      }
      const resultBlob = await response.blob();
      if (!resultBlob.size) throw new Error('لم يتم استلام نتيجة صالحة.');

      const resultKind = response.headers.get('X-Result-Kind') || 'image';
      if (resultKind === 'model'){
        const extension = (response.headers.get('X-Result-Extension') || 'glb').replace(/[^a-z0-9]/gi, '') || 'glb';
        const modelUrl = URL.createObjectURL(resultBlob);
        const link = document.createElement('a');
        link.href = modelUrl;
        link.download = `image-3d-${Date.now()}.${extension}`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(modelUrl), 60000);
        if (status){ status.classList.remove('error'); status.textContent = 'اكتمل إنشاء الملف ثلاثي الأبعاد وبدأ تنزيله على جهازك.'; }
        toast('تم إنشاء الملف ثلاثي الأبعاد وبدء تنزيله ✓', 'ok');
        return;
      }

      if (status) status.textContent = 'إضافة النتيجة إلى مساحة التحرير…';
      await loadImageResult(resultBlob);

      let historyWarning = '';
      try{
        const resultCanvas = document.createElement('canvas');
        const resultImage = currentImage;
        resultCanvas.width = resultImage.naturalWidth;
        resultCanvas.height = resultImage.naturalHeight;
        const resultContext = resultCanvas.getContext('2d');
        resultContext.drawImage(resultImage, 0, 0);
        const historyBlob = await blobFromCanvas(resultCanvas, 'image/png');
        resultPath = await API.upload(session.access_token, session.user.id, historyBlob, 'result');
        await API.saveOp(session.access_token, sourcePath, resultPath);
        historySaved = true;
        if (App.refreshUsage) App.refreshUsage();
      }catch(historyError){
        historyWarning = 'اكتملت المعالجة، لكن تعذر حفظها في سجل العمليات.';
        console.warn('Image processing history save failed:', historyError);
      }

      if (status){ status.classList.remove('error'); status.textContent = historyWarning || 'اكتملت المعالجة؛ يمكنك متابعة التحرير أو تصدير الصورة.'; }
      toast(historyWarning || 'تمت معالجة الصورة وإضافتها إلى مساحة العمل ✓', historyWarning ? '' : 'ok');
    }catch(error){
      console.error('Image processing:', error);
      const rawMessage = String(error?.message || '');
      const message = /failed to fetch|fetch failed|networkerror|network error/i.test(rawMessage)
        ? 'تعذر الاتصال بخدمة معالجة الصور حاليًا. تحقق من اتصال الإنترنت ثم أعد المحاولة.'
        : /timeout|timed out|aborterror/i.test(rawMessage)
          ? 'استغرقت المعالجة وقتًا أطول من المعتاد. أعد المحاولة بعد قليل.'
          : rawMessage || 'تعذر إكمال معالجة الصورة حاليًا. أعد المحاولة.';
      if (status){ status.classList.remove('hidden'); status.classList.add('error'); status.textContent = message; }
      toast(message, 'err');
    }finally{
      if (!historySaved && session?.access_token && sourcePath) await API.removeFiles(session.access_token, [sourcePath, resultPath].filter(Boolean));
      if (button){ button.disabled = false; button.innerHTML = previousLabel || '<span>تنفيذ التعديل</span><b>✦</b>'; }
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
    const pad = t.size * .3 + (t.outlineWidth || 0) * 2;
    const w = tw + pad*2, h = t.size + pad*1.4;
    return { x: t.x - w/2, y: t.y - h/2, w, h, cx: t.x, cy: t.y };
  }
  function getStickerBox(s){
    const ratio = s.image?.naturalWidth && s.image?.naturalHeight ? s.image.naturalWidth / s.image.naturalHeight : 1;
    const w = ratio >= 1 ? s.size : s.size * ratio;
    const h = ratio >= 1 ? s.size / ratio : s.size;
    return { x: s.x - w/2, y: s.y - h/2, w, h, cx:s.x, cy:s.y };
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
      const s = stickers[i]; if (s.visible === false) continue; const box = getStickerBox(s);
      if (inBox(pt, box)){
        selectedId = s.id;
        syncStickerEditor();
        dragMode = 'move';
        dragStartPt = pt;
        dragItemState = { id: s.id, startX: s.x, startY: s.y };
        render();
        try{ mainCanvas.setPointerCapture(e.pointerId); }catch{}
        return;
      }
    }

    for (let i = texts.length - 1; i >= 0; i--){
      const t = texts[i]; if (t.visible === false || t.kind === 'watermark') continue; const box = getTextBox(t, ctx);
      if (inBox(pt, box)){
        selectedId = t.id;
        syncStickerEditor();
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
        syncStickerEditor();
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
        texts.push({ id, text, x: pt.x, y: pt.y, size: +$c('textSize').value, color: $c('textColor').value, font: $c('textFont').value, bg: $c('textBg').value, shadow: $c('textShadow').value, outlineColor:$c('textOutlineColor').value, outlineWidth:+$c('textOutlineWidth').value, opacity:1 });
        $c('textInput').value = '';
        selectedId = id;
        syncStickerEditor();
        render();
        toast('أضف النص ✓');
        return;
      }
    }

    selectedId = null;
    syncStickerEditor();
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
    if (!id || id === 'none') return;
    const amount = Math.max(0, Math.min(1, Number(intensity ?? 1)));
    if (amount <= 0) return;
    const spec = FILTERS.find(item => item.id === id);
    const cssFilter = spec?.css;
    if (!cssFilter || cssFilter === 'none') return;

    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    const original = document.createElement('canvas');
    original.width = W; original.height = H;
    const originalCtx = original.getContext('2d');
    if (!originalCtx) return;
    originalCtx.drawImage(canvas, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(original, 0, 0);

    // استخدم مرشح Canvas الحقيقي ثم امزج النتيجة مع الأصل حسب شدة التأثير.
    if ('filter' in ctx) {
      ctx.filter = cssFilter;
      ctx.globalAlpha = amount;
      ctx.drawImage(original, 0, 0);
      ctx.filter = 'none';
    } else {
      // تنفيذ معاملات CSS filter واحدةً تلو الأخرى للمتصفحات القديمة دون CanvasRenderingContext2D.filter.
      const imageData = originalCtx.getImageData(0, 0, W, H);
      const src = imageData.data;
      const output = ctx.createImageData(W, H);
      const dst = output.data;
      const operations = [];
      const re = /([a-z-]+)\(([^)]+)\)/gi;
      let match;
      while ((match = re.exec(cssFilter))) {
        const name = match[1].toLowerCase();
        const raw = match[2].trim();
        let value = Number.parseFloat(raw);
        if (!Number.isFinite(value)) continue;
        if (raw.endsWith('%')) value /= 100;
        operations.push({ name, value });
      }
      const clamp = v => Math.max(0, Math.min(255, v));
      const hueRotate = (r,g,b,degrees) => {
        const max = Math.max(r,g,b), min = Math.min(r,g,b), delta=max-min;
        let h=0, sat=0, light=(max+min)/2;
        if (delta !== 0) {
          sat = delta / (1 - Math.abs(2*light - 1));
          if (max===r) h=((g-b)/delta)%6;
          else if (max===g) h=(b-r)/delta+2;
          else h=(r-g)/delta+4;
          h = (h*60+degrees)%360; if(h<0) h+=360;
        }
        const c=(1-Math.abs(2*light-1))*sat, x=c*(1-Math.abs((h/60)%2-1)), m=light-c/2;
        let rr=0,gg=0,bb=0;
        if(h<60){rr=c;gg=x;} else if(h<120){rr=x;gg=c;} else if(h<180){gg=c;bb=x;} else if(h<240){gg=x;bb=c;} else if(h<300){rr=x;bb=c;} else {rr=c;bb=x;}
        return [rr+m,gg+m,bb+m];
      };
      for (let i=0; i<src.length; i+=4) {
        const r=src[i], g=src[i+1], b=src[i+2];
        let rr=r, gg=g, bb=b;
        for (const op of operations) {
          const v=op.value;
          if (op.name==='brightness') { rr*=v; gg*=v; bb*=v; }
          else if (op.name==='contrast') { rr=(rr-128)*v+128; gg=(gg-128)*v+128; bb=(bb-128)*v+128; }
          else if (op.name==='saturate') { const lum=.213*rr+.715*gg+.072*bb; rr=lum+(rr-lum)*v; gg=lum+(gg-lum)*v; bb=lum+(bb-lum)*v; }
          else if (op.name==='grayscale') { const a=Math.max(0,Math.min(1,v)); const lum=.2126*rr+.7152*gg+.0722*bb; rr+=(lum-rr)*a; gg+=(lum-gg)*a; bb+=(lum-bb)*a; }
          else if (op.name==='sepia') {
            const a=Math.max(0,Math.min(1,v));
            const sr=.393*rr+.769*gg+.189*bb, sg=.349*rr+.686*gg+.168*bb, sb=.272*rr+.534*gg+.131*bb;
            rr+=(sr-rr)*a; gg+=(sg-gg)*a; bb+=(sb-bb)*a;
          } else if (op.name==='invert') { const a=Math.max(0,Math.min(1,v)); rr+=(255-2*rr)*a; gg+=(255-2*gg)*a; bb+=(255-2*bb)*a; }
          else if (op.name==='hue-rotate') { [rr,gg,bb]=hueRotate(rr/255,gg/255,bb/255,v); rr*=255; gg*=255; bb*=255; }
        }
        dst[i]=clamp(r+(rr-r)*amount);
        dst[i+1]=clamp(g+(gg-g)*amount);
        dst[i+2]=clamp(b+(bb-b)*amount);
        dst[i+3]=src[i+3];
      }
      ctx.globalAlpha=1;
      ctx.putImageData(output,0,0);
    }
    ctx.restore();
  }

  function canvasGradientFromCss(ctx, value, width, height){
    const match = String(value || '').match(/^linear-gradient\(([^,]+),(.+)\)$/i);
    if (!match) return null;
    const direction = match[1].trim();
    const stops = match[2].split(',').map(part => {
      const color = part.trim().match(/(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)/i);
      return color ? color[1] : null;
    }).filter(Boolean);
    if (stops.length < 2) return null;

    let angle = 135;
    const deg = direction.match(/(-?\d+(?:\.\d+)?)deg/i);
    if (deg) angle = Number(deg[1]);
    const radians = (angle - 90) * Math.PI / 180;
    const dx = Math.cos(radians), dy = Math.sin(radians);
    const radius = Math.abs(width * dx) / 2 + Math.abs(height * dy) / 2;
    const cx = width / 2, cy = height / 2;
    const gradient = ctx.createLinearGradient(cx - dx * radius, cy - dy * radius, cx + dx * radius, cy + dy * radius);
    stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color));
    return gradient;
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
      ctx.fillStyle = ((x/s + y/s) % 2 === 0) ? '#17110c' : '#21170f';
      ctx.fillRect(x, y, s, s);
    }
  }
  function applyOnlineOverlay(ctx,W,H,image,mode='screen',amount=.35){
    if(!image?.complete || !image.naturalWidth || amount<=0) return;
    ctx.save();
    ctx.globalCompositeOperation=mode;
    ctx.globalAlpha=Math.max(0,Math.min(1,amount));
    ctx.drawImage(image,0,0,W,H);
    ctx.restore();
  }

  function drawBorder(ctx, W, H){
    if (!border || border.id === 'none' || border.style === 'none') return;
    const style = border.style || border.type || 'minimal';
    const color = border.color || border.c1 || '#e0b884';
    const accent = border.c2 || border.c1 || '#c99570';
    const unit = Math.max(2, Math.min(W,H) * (Math.max(5,Number(border.width)||20) / 1000));
    const line = (x,y,w,h,c,weight=unit) => { ctx.strokeStyle=c; ctx.lineWidth=weight; ctx.strokeRect(x+weight/2,y+weight/2,Math.max(0,w-weight),Math.max(0,h-weight)); };
    const mat = (pad, bottom, fill) => {
      ctx.fillStyle=fill;
      ctx.fillRect(0,0,W,pad);
      ctx.fillRect(0,H-pad-bottom,W,pad+bottom);
      ctx.fillRect(0,pad,pad,H-pad-bottom);
      ctx.fillRect(W-pad,pad,pad,H-pad-bottom);
    };
    const corner = (x,y,dx,dy,len,c,thick) => {
      ctx.strokeStyle=c; ctx.lineWidth=thick; ctx.lineCap='square';
      ctx.beginPath(); ctx.moveTo(x+dx*len,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*len); ctx.stroke();
    };
    ctx.save();
    ctx.lineJoin='miter'; ctx.lineCap='butt';
    if(style==='polaroid'){
      const pad=Math.max(unit*1.4,Math.min(W,H)*.045), bottom=Math.max(pad*2.1,Math.min(W,H)*.105);
      mat(pad,bottom,'#f2ede4');
      line(pad,pad,W-pad*2,H-pad-bottom-pad,'#c9bba7',Math.max(1,unit*.12));
      ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=unit*.3;ctx.strokeRect(pad*.55,pad*.55,W-pad*1.1,H-pad-bottom*.5);
    } else if(style==='film'){
      const side=Math.max(unit*2.8,W*.075), holeW=side*.46, holeH=Math.max(unit*.9,Math.min(W,H)*.018), step=holeH*2.2;
      ctx.fillStyle='#171411';ctx.fillRect(0,0,side,H);ctx.fillRect(W-side,0,side,H);
      ctx.fillStyle='#d6c8b7';
      for(let y=step*.45;y<H;y+=step){ roundRect(ctx,(side-holeW)/2,y,holeW,holeH,holeH*.2);ctx.fill();roundRect(ctx,W-side+(side-holeW)/2,y,holeW,holeH,holeH*.2);ctx.fill(); }
      line(side+unit*.45,unit*.45,W-(side+unit*.45)*2,H-unit*.9,accent,Math.max(1,unit*.12));
    } else if(style==='gallery' || style==='matte'){
      const pad=unit*(style==='gallery'?2.2:1.7);
      mat(pad,pad*1.45,style==='gallery'?'#eee4d6':'#e8dfd1');
      line(pad,pad,W-pad*2,H-pad*2.45,accent,Math.max(1,unit*.22));
      line(pad*1.35,pad*1.35,W-pad*2.7,H-pad*2.75,'rgba(70,47,29,.35)',Math.max(1,unit*.08));
    } else if(style==='double'){
      const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,border.c1||color);grad.addColorStop(1,accent);
      line(unit*.55,unit*.55,W-unit*1.1,H-unit*1.1,grad,unit*.82);
      line(unit*1.7,unit*1.7,W-unit*3.4,H-unit*3.4,color,Math.max(1,unit*.18));
      line(unit*2.25,unit*2.25,W-unit*4.5,H-unit*4.5,accent,Math.max(1,unit*.1));
    } else if(style==='luxury'){
      const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,border.c1||'#f4d7a8');grad.addColorStop(.5,color);grad.addColorStop(1,accent);
      line(unit*.6,unit*.6,W-unit*1.2,H-unit*1.2,grad,unit*1.1);
      line(unit*1.9,unit*1.9,W-unit*3.8,H-unit*3.8,'rgba(255,239,210,.72)',Math.max(1,unit*.18));
      line(unit*2.35,unit*2.35,W-unit*4.7,H-unit*4.7,accent,Math.max(1,unit*.12));
    } else if(style==='corners'){
      const len=Math.min(W,H)*.14, off=unit*.9, thick=unit*1.4;
      [[off,off,1,1],[W-off,off,-1,1],[off,H-off,1,-1],[W-off,H-off,-1,-1]].forEach(v=>corner(v[0],v[1],v[2],v[3],len,color,thick));
      const r=unit*.36;ctx.fillStyle=accent;
      [[off,off],[W-off,off],[off,H-off],[W-off,H-off]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});
    } else if(style==='vintage'){
      const pad=unit*1.3; line(pad,pad,W-pad*2,H-pad*2,'#714c32',unit*.8);
      line(pad*2.15,pad*2.15,W-pad*4.3,H-pad*4.3,color,Math.max(1,unit*.18));
      ctx.setLineDash([unit*.65,unit*.55]);line(pad*3,pad*3,W-pad*6,H-pad*6,accent,Math.max(1,unit*.12));ctx.setLineDash([]);
      ctx.fillStyle=color;[[W*.08,H*.08],[W*.92,H*.08],[W*.08,H*.92],[W*.92,H*.92]].forEach(([x,y])=>{ctx.beginPath();ctx.arc(x,y,unit*.6,0,Math.PI*2);ctx.fill();});
    } else if(style==='ornate'){
      line(unit,unit,W-unit*2,H-unit*2,accent,unit*.8);line(unit*2.4,unit*2.4,W-unit*4.8,H-unit*4.8,color,unit*.2);
      const r=unit*1.2;ctx.fillStyle=accent;
      [[W*.055,H*.055],[W*.945,H*.055],[W*.055,H*.945],[W*.945,H*.945]].forEach(([x,y])=>{ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillRect(-r/2,-r/2,r,r);ctx.restore();});
      ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,unit*.15);ctx.beginPath();ctx.moveTo(W*.08,H*.04);ctx.lineTo(W*.18,H*.04);ctx.moveTo(W*.82,H*.04);ctx.lineTo(W*.92,H*.04);ctx.moveTo(W*.08,H*.96);ctx.lineTo(W*.18,H*.96);ctx.moveTo(W*.82,H*.96);ctx.lineTo(W*.92,H*.96);ctx.stroke();
    } else if(style==='dashed'){
      ctx.setLineDash([unit*1.1,unit*.6]);line(unit,unit,W-unit*2,H-unit*2,color,Math.max(2,unit*.65));ctx.setLineDash([]);
      line(unit*2.4,unit*2.4,W-unit*4.8,H-unit*4.8,accent,Math.max(1,unit*.12));
    } else if(style==='shadow'){
      ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=unit*2.4;ctx.shadowOffsetX=unit*.55;ctx.shadowOffsetY=unit*.55;
      line(unit*1.2,unit*1.2,W-unit*2.4,H-unit*2.4,color,unit*1.1);ctx.shadowColor='transparent';
      line(unit*2.4,unit*2.4,W-unit*4.8,H-unit*4.8,accent,Math.max(1,unit*.15));
    } else if(style==='gradient'){
      const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,border.c1||color);grad.addColorStop(.5,color);grad.addColorStop(1,accent);
      line(unit,unit,W-unit*2,H-unit*2,grad,unit*1.25);line(unit*2.35,unit*2.35,W-unit*4.7,H-unit*4.7,'rgba(255,240,220,.5)',Math.max(1,unit*.12));
    } else if(style==='lines'){
      line(unit*.8,unit*.8,W-unit*1.6,H-unit*1.6,color,unit*.6);
      line(unit*1.8,unit*1.8,W-unit*3.6,H-unit*3.6,accent,unit*.18);
      line(unit*2.35,unit*2.35,W-unit*4.7,H-unit*4.7,color,unit*.12);
    } else if(style==='dots'){
      line(unit,unit,W-unit*2,H-unit*2,color,Math.max(1,unit*.13));
      const r=Math.max(1,unit*.25), gap=unit*1.1;ctx.fillStyle=accent;
      for(let x=unit*2;x<W-unit*2;x+=gap){for(const y of [unit*1.6,H-unit*1.6]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
      for(let y=unit*2;y<H-unit*2;y+=gap){for(const x of [unit*1.6,W-unit*1.6]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}}
    } else if(style==='minimal'){
      line(unit*.7,unit*.7,W-unit*1.4,H-unit*1.4,color,Math.max(1,unit*.22));
      line(unit*1.8,unit*1.8,W-unit*3.6,H-unit*3.6,accent,Math.max(1,unit*.08));
    } else {
      line(unit,unit,W-unit*2,H-unit*2,color,unit*.8);
    }
    ctx.restore();
  }

  function render(){
    // أي تعديل جديد يجعل ملف التصدير السابق قديمًا؛ أخفِ زر تنزيله حتى تجهيز نسخة محدثة.
    if (finalBlob && !isPreparingExport){
      finalBlob = null;
      $c('btnDownload')?.classList.add('hidden');
    }
    renderLayers();
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
    if (artStyleId !== 'none') applyArtStyle(fg, artStyleId, artStyleIntensity);

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

    if (drawLayerVisible){ for (const st of strokes) drawStroke(fg, st); if (currentStroke) drawStroke(fg, currentStroke); }

    for (const t of texts){
      if (t.visible === false) continue;
      fg.save();
      const isSignature = t.kind === 'watermark';
      const textSize = isSignature ? Math.max(16, Math.min(120, Math.min(W,H) * Number(t.relativeSize || 34) / 1000)) : t.size;
      const textX = isSignature ? W - Math.max(20, W * .028) : t.x;
      const textY = isSignature ? H - Math.max(22, H * .035) : t.y;
      fg.font = isSignature ? `${textSize}px 'Aref Ruqaa Ink',serif` : `bold ${textSize}px ${t.font}`;
      fg.textAlign = isSignature ? 'right' : (t.align || 'center'); fg.textBaseline = 'middle';
      if (isSignature) fg.direction = 'rtl';
      fg.globalAlpha = t.opacity ?? 1;
      const tw = fg.measureText(t.text).width;
      if (t.bg && t.bg !== 'none'){
        fg.fillStyle = t.bg;
        const pad = textSize * .3;
        const bx = isSignature ? textX - tw - pad : textX - tw/2 - pad;
        roundRect(fg, bx, textY - textSize/2 - pad*.6, tw + pad*2, textSize + pad*1.2, 8);
        fg.fill();
      }
      if (t.shadow && t.shadow !== 'none'){
        fg.shadowColor = t.shadow;
        fg.shadowBlur = isSignature ? Math.max(5,textSize*.28) : 12;
        fg.shadowOffsetY = isSignature ? Math.max(2,textSize*.08) : 4;
      }
      if (t.outlineWidth > 0){ fg.lineJoin = 'round'; fg.lineWidth = t.outlineWidth * 2; fg.strokeStyle = t.outlineColor || '#2b1a11'; fg.strokeText(t.text, textX, textY); }
      fg.fillStyle = t.color;
      fg.fillText(t.text, textX, textY);
      fg.restore();
    }

    for (const s of stickers){
      if (s.visible === false) continue;
      fg.save();
      fg.globalAlpha = s.opacity ?? 1;
      fg.translate(s.x, s.y);
      fg.rotate((s.rotation || 0) * Math.PI / 180);
      if (s.image?.complete && s.image.naturalWidth){
        const ratio = s.image.naturalWidth / s.image.naturalHeight;
        const w = ratio >= 1 ? s.size : s.size * ratio;
        const h = ratio >= 1 ? s.size / ratio : s.size;
        fg.drawImage(s.image, -w/2, -h/2, w, h);
      } else {
        fg.font = `${s.size}px sans-serif`;
        fg.textAlign = 'center'; fg.textBaseline = 'middle';
        fg.fillText(s.emoji || '✦', 0, 0);
      }
      fg.restore();
    }

    const ctx = mainCanvas.getContext('2d');
    ctx.clearRect(0,0,W,H);
    if (currentBg.type === 'color'){ ctx.fillStyle = currentBg.value; ctx.fillRect(0,0,W,H); }
    else if (currentBg.type === 'gradient'){ ctx.fillStyle = canvasGradientFromCss(ctx, currentBg.value, W, H) || '#8f6848'; ctx.fillRect(0,0,W,H); }
    else if (currentBg.type === 'original' || currentBg.type === 'checker'){ drawChecker(ctx, W, H); }
    else if (currentBg.type === 'transparent'){ /* keep alpha channel clear */ }
    else if ((currentBg.type === 'preset' || currentBg.type === 'openverse' || currentBg.type === 'upload') && bgImage?.complete && bgImage.naturalWidth){ drawCover(ctx, bgImage, W, H); }

    ctx.drawImage(fgCanvas, 0, 0);

    if (adjustments.vignette > 0){
      const v = ctx.createRadialGradient(W/2, H/2, Math.min(W,H) * .3, W/2, H/2, Math.max(W,H) * .7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(0,0,0,${adjustments.vignette/100})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }

    applyVisualEffect(ctx, W, H, visualFxId, visualFxIntensity);
    if (onlineOverlayImage?.complete && onlineOverlayImage.naturalWidth && onlineOverlayId !== 'none') applyOnlineOverlay(ctx,W,H,onlineOverlayImage,onlineOverlayMode,onlineOverlayIntensity);

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
  function applyArtStyle(ctx, style, amount=1){
    if (!style || style === 'none' || amount <= 0) return;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const scale = Math.min(1, 1450 / Math.max(W, H));
    const sw = Math.max(1, Math.round(W * scale));
    const sh = Math.max(1, Math.round(H * scale));
    const source = document.createElement('canvas');
    source.width = sw; source.height = sh;
    const sx = source.getContext('2d', { willReadFrequently:true });
    sx.drawImage(ctx.canvas, 0, 0, sw, sh);
    const stylized = document.createElement('canvas');
    stylized.width = sw; stylized.height = sh;
    const out = stylized.getContext('2d', { willReadFrequently:true });

    try {
      if (style === 'pixel') {
        const small = document.createElement('canvas');
        const block = Math.max(7, Math.round(Math.max(sw, sh) / 38));
        small.width = Math.max(18, Math.round(sw / block));
        small.height = Math.max(18, Math.round(sh / block));
        const sc = small.getContext('2d');
        sc.imageSmoothingEnabled = true;
        sc.drawImage(source, 0, 0, small.width, small.height);
        out.imageSmoothingEnabled = false;
        out.drawImage(small, 0, 0, sw, sh);
      } else {
        const src = sx.getImageData(0, 0, sw, sh);
        const dst = out.createImageData(sw, sh);
        const a = src.data, b = dst.data;
        const clamp = (v, lo=0, hi=255) => Math.max(lo, Math.min(hi, v));
        const quant = (v, levels) => Math.round(clamp(v) / 255 * (levels - 1)) * 255 / (levels - 1);
        const lumAt = (x, y) => {
          x = Math.max(0, Math.min(sw - 1, x));
          y = Math.max(0, Math.min(sh - 1, y));
          const i = (y * sw + x) * 4;
          return .2126 * a[i] + .7152 * a[i + 1] + .0722 * a[i + 2];
        };
        const mix = (x, y, t) => x + (y - x) * t;
        const colorDistance = (r1,g1,b1,r2,g2,b2) => Math.abs(r1-r2)*.3 + Math.abs(g1-g2)*.59 + Math.abs(b1-b2)*.11;

        for (let y = 0; y < sh; y++) {
          const row = y * sw;
          for (let x = 0; x < sw; x++) {
            const i = (row + x) * 4;
            const r = a[i], g = a[i+1], bl = a[i+2], alpha = a[i+3];
            const l = .2126*r + .7152*g + .0722*bl;
            const gx = lumAt(x+1,y) - lumAt(x-1,y);
            const gy = lumAt(x,y+1) - lumAt(x,y-1);
            const edge = Math.hypot(gx, gy);
            let nr = r, ng = g, nb = bl;

            if (style === 'anime') {
              // Edge-aware 5-tap smoothing, then a clean cel palette and ink contours.
              let sr = r * 2, sg = g * 2, sb = bl * 2, weight = 2;
              for (const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const xx = Math.max(0, Math.min(sw-1,x+ox)), yy = Math.max(0, Math.min(sh-1,y+oy));
                const ni = (yy*sw+xx)*4;
                const diff = colorDistance(r,g,bl,a[ni],a[ni+1],a[ni+2]);
                const w = diff < 34 ? .85 : diff < 62 ? .28 : .06;
                sr += a[ni]*w; sg += a[ni+1]*w; sb += a[ni+2]*w; weight += w;
              }
              const ar = sr/weight, ag = sg/weight, ab = sb/weight;
              const avg = (ar+ag+ab)/3;
              nr = quant(avg+(ar-avg)*1.38+7, 7);
              ng = quant(avg+(ag-avg)*1.38+7, 7);
              nb = quant(avg+(ab-avg)*1.38+7, 7);
              if (edge > 42) { const ink = clamp((edge-42)/86,.0,.72); nr=mix(nr,22,ink); ng=mix(ng,19,ink); nb=mix(nb,31,ink); }
              if (l > 222) { nr=mix(nr,255,.13); ng=mix(ng,250,.13); nb=mix(nb,245,.13); }
            } else if (style === 'cartoon' || style === 'comic' || style === 'poster') {
              const levels = style === 'comic' ? 4 : style === 'poster' ? 5 : 6;
              const avg = (r+g+bl)/3;
              const sat = style === 'poster' ? 1.52 : 1.28;
              nr = quant(avg+(r-avg)*sat, levels);
              ng = quant(avg+(g-avg)*sat, levels);
              nb = quant(avg+(bl-avg)*sat, levels);
              const threshold = style === 'comic' ? 48 : style === 'poster' ? 72 : 58;
              if (edge > threshold) {
                const strength = style === 'comic' ? .9 : .72;
                nr *= 1-strength; ng *= 1-strength; nb *= 1-strength;
              }
            } else if (style === 'manga') {
              const v = clamp((l-128)*1.75+128);
              const dot = (((x%7)-3)**2 + ((y%7)-3)**2);
              const radius = (255-v)/255*3.3;
              const inkDot = dot < radius*radius;
              const line = edge > 42;
              const shade = line ? 8 : inkDot ? 26 : clamp(v+23);
              nr=ng=nb=shade;
            } else if (style === 'sketch' || style === 'lineart') {
              const intensity = style === 'lineart' ? 1.42 : 1.12;
              const edgeInk = clamp(edge * intensity);
              const pencil = style === 'sketch' ? (255-l)*.14 : 0;
              const v = clamp(255-edgeInk-pencil);
              nr=ng=nb=v;
              if (style === 'sketch') { nr=clamp(v+3); ng=clamp(v+1); nb=clamp(v-5); }
            } else if (style === 'blackwhite') {
              const v = clamp((l-128)*1.28+128);
              nr=ng=nb=v;
            } else if (style === 'duotone') {
              const t = l/255;
              nr = mix(30, 239, t); ng = mix(20, 190, t); nb = mix(16, 130, t);
            } else if (style === 'pastel') {
              const avg = (r+g+bl)/3;
              nr = clamp(mix(avg+(r-avg)*.72, 255, .23));
              ng = clamp(mix(avg+(g-avg)*.72, 250, .23));
              nb = clamp(mix(avg+(bl-avg)*.72, 245, .23));
            } else if (style === 'cyberpunk') {
              const t = l/255;
              const left = x/sw;
              const shadow = [15, 13, 47], mid = left < .5 ? [120, 37, 135] : [18, 111, 151], high = [239, 88, 157];
              const base = t < .54 ? shadow.map((v,j)=>mix(v,mid[j],t/.54)) : mid.map((v,j)=>mix(v,high[j],(t-.54)/.46));
              nr=clamp(base[0]+(edge>55?18:0)); ng=clamp(base[1]+(edge>55?9:0)); nb=clamp(base[2]+(edge>55?25:0));
            } else if (style === 'oil') {
              // Broad pigment blocks with restrained color quantization.
              const xx = Math.max(0,Math.min(sw-1,x+(gx>0?1:-1)));
              const yy = Math.max(0,Math.min(sh-1,y+(gy>0?1:-1)));
              const ni=(yy*sw+xx)*4;
              nr=quant(mix(r,a[ni],.27),8); ng=quant(mix(g,a[ni+1],.27),8); nb=quant(mix(bl,a[ni+2],.27),8);
            } else if (style === 'watercolor') {
              let sr=r*3, sg=g*3, sb=bl*3, count=3;
              for (const [ox,oy] of [[-2,0],[2,0],[0,-2],[0,2]]) {
                const xx=Math.max(0,Math.min(sw-1,x+ox)), yy=Math.max(0,Math.min(sh-1,y+oy));
                const ni=(yy*sw+xx)*4; sr+=a[ni]; sg+=a[ni+1]; sb+=a[ni+2]; count++;
              }
              nr=clamp(quant(sr/count,7)*.92+18); ng=clamp(quant(sg/count,7)*.92+18); nb=clamp(quant(sb/count,7)*.92+18);
              if (edge>90) { nr*=.91; ng*=.91; nb*=.91; }
            } else if (style === 'halftone') {
              const v=clamp((l-128)*1.35+128);
              nr=ng=nb=v;
            } else {
              nr=r; ng=g; nb=bl;
            }
            b[i]=clamp(nr); b[i+1]=clamp(ng); b[i+2]=clamp(nb); b[i+3]=alpha;
          }
        }
        out.putImageData(dst,0,0);

        if (style === 'halftone' || style === 'manga') {
          const cell = style === 'manga' ? 7 : 6;
          out.save(); out.fillStyle = style === 'manga' ? 'rgba(10,8,7,.7)' : 'rgba(15,12,10,.58)';
          for (let y=0; y<sh; y+=cell) for (let x=0; x<sw; x+=cell) {
            const i=(Math.min(sh-1,y+Math.floor(cell/2))*sw+Math.min(sw-1,x+Math.floor(cell/2)))*4;
            const darkness=1-(.2126*b[i]+.7152*b[i+1]+.0722*b[i+2])/255;
            const radius=darkness*(cell*.43);
            if(radius>.55){ out.beginPath(); out.arc(x+cell/2,y+cell/2,radius,0,Math.PI*2); out.fill(); }
          }
          out.restore();
        }
        if (style === 'watercolor') {
          // A very light paper grain, fixed per render for predictable exports.
          out.save(); out.globalCompositeOperation='soft-light'; out.fillStyle='rgba(145,112,78,.08)';
          for(let y=0;y<sh;y+=9) for(let x=0;x<sw;x+=9) if(((x*13+y*7)%11)<3) out.fillRect(x,y,1.2,1.2);
          out.restore();
        }
      }

      const original = document.createElement('canvas');
      original.width = W; original.height = H;
      original.getContext('2d').drawImage(ctx.canvas,0,0);
      const previousSmoothing = ctx.imageSmoothingEnabled;
      ctx.clearRect(0,0,W,H);
      ctx.drawImage(original,0,0);
      ctx.save();
      ctx.globalAlpha = Math.max(0,Math.min(1,amount));
      ctx.imageSmoothingEnabled = style !== 'pixel';
      ctx.drawImage(stylized,0,0,W,H);
      ctx.restore();
      ctx.imageSmoothingEnabled = previousSmoothing;
    } catch (error) {
      console.warn('Art effect could not be rendered:', style, error);
    }
  }

  function applyVisualEffect(ctx,W,H,id,amount=.55){
    if(!id || id==='none' || amount<=0) return;
    const alpha=Math.max(0,Math.min(1,amount));
    let seed = ({rain:7193,snow:8311,petals:9413,starlight:1051,rays:2129,fog:3319,lensflare:4513,lightning:5711,dust:9031}[id] || 19317) >>> 0;
    const random = () => { seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
    ctx.save();
    if(id==='lightleak'){
      ctx.globalCompositeOperation='screen'; ctx.globalAlpha=alpha*.7;
      let g=ctx.createRadialGradient(W*.08,H*.12,0,W*.08,H*.12,Math.max(W,H)*.68);
      g.addColorStop(0,'rgba(255,190,112,.9)');g.addColorStop(.35,'rgba(224,112,54,.28)');g.addColorStop(1,'rgba(224,112,54,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      let g2=ctx.createLinearGradient(0,H*.65,W*.65,0);g2.addColorStop(0,'rgba(235,170,110,0)');g2.addColorStop(.45,'rgba(235,170,110,.16)');g2.addColorStop(1,'rgba(235,170,110,0)');ctx.fillStyle=g2;ctx.fillRect(0,0,W,H);
    } else if(id==='bokeh'){
      ctx.globalCompositeOperation='screen';
      const spots=[[.12,.18,.08],[.82,.16,.06],[.72,.7,.1],[.2,.78,.055],[.48,.3,.04],[.9,.48,.035],[.36,.62,.045],[.56,.88,.055],[.04,.56,.04],[.62,.1,.035],[.92,.88,.07],[.34,.12,.03]];
      spots.forEach(([x,y,r])=>{const rad=Math.min(W,H)*r;const gr=ctx.createRadialGradient(W*x,H*y,rad*.12,W*x,H*y,rad);gr.addColorStop(0,`rgba(255,224,174,${.22*alpha})`);gr.addColorStop(.72,`rgba(215,145,88,${.16*alpha})`);gr.addColorStop(1,'rgba(215,145,88,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(W*x,H*y,rad,0,Math.PI*2);ctx.fill();});
    } else if(id==='grain'){
      const noise=document.createElement('canvas');noise.width=192;noise.height=192;const nctx=noise.getContext('2d');const idata=nctx.createImageData(192,192);let nseed=19317;
      for(let i=0;i<idata.data.length;i+=4){nseed=(nseed*1664525+1013904223)>>>0;const v=nseed&255;idata.data[i]=v;idata.data[i+1]=v;idata.data[i+2]=v;idata.data[i+3]=Math.round(255*alpha*.2);}
      nctx.putImageData(idata,0,0);ctx.globalCompositeOperation='soft-light';ctx.fillStyle=ctx.createPattern(noise,'repeat');ctx.fillRect(0,0,W,H);
    } else if(id==='dust'){
      ctx.globalCompositeOperation='screen';ctx.fillStyle='#f5d6ae';
      for(let i=0;i<Math.min(260,Math.max(90,Math.round(W*H/9000)));i++){const x=random()*W,y=random()*H,r=.5+random()*2.2;ctx.globalAlpha=alpha*(.07+random()*.22);ctx.beginPath();ctx.arc(x,y,r*Math.max(.65,Math.min(2,W/1100)),0,Math.PI*2);ctx.fill();}
    } else if(id==='glow'){
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=alpha*.7;
      const gr=ctx.createRadialGradient(W*.5,H*.42,Math.min(W,H)*.08,W*.5,H*.42,Math.max(W,H)*.72);gr.addColorStop(0,'rgba(255,210,151,.3)');gr.addColorStop(.55,'rgba(173,105,57,.08)');gr.addColorStop(1,'rgba(173,105,57,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    } else if(id==='rain'){
      ctx.globalCompositeOperation='screen'; ctx.lineCap='round';
      const count=Math.min(900,Math.max(180,Math.round(W*H/5000)));
      for(let i=0;i<count;i++){
        const x=random()*W, y=random()*H, len=(.012+random()*.035)*Math.min(W,H);
        ctx.globalAlpha=alpha*(.12+random()*.33);
        ctx.strokeStyle=random()>.55?'rgba(205,222,235,.9)':'rgba(155,190,213,.82)';
        ctx.lineWidth=Math.max(.7,Math.min(2.4,W/850))*(.6+random()*.8);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-len*.24,y+len); ctx.stroke();
      }
    } else if(id==='snow'){
      ctx.globalCompositeOperation='screen';
      const count=Math.min(420,Math.max(90,Math.round(W*H/11000)));
      for(let i=0;i<count;i++){
        const x=random()*W,y=random()*H,r=Math.max(1,Math.min(5,W/230))*(.35+random()*1.1);
        ctx.globalAlpha=alpha*(.22+random()*.58);
        ctx.fillStyle=random()>.2?'#fff9ee':'#dcebf3';
        ctx.shadowColor='rgba(255,255,255,.75)';ctx.shadowBlur=r*2;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        if(r>2.3){ctx.lineWidth=Math.max(.6,r*.24);ctx.strokeStyle='rgba(255,255,255,.72)';for(let a=0;a<3;a++){const t=a*Math.PI/3;ctx.beginPath();ctx.moveTo(x-Math.cos(t)*r*1.9,y-Math.sin(t)*r*1.9);ctx.lineTo(x+Math.cos(t)*r*1.9,y+Math.sin(t)*r*1.9);ctx.stroke();}}
      }
      ctx.shadowBlur=0;
    } else if(id==='petals'){
      ctx.globalCompositeOperation='screen';
      const count=Math.min(110,Math.max(36,Math.round(W*H/42000)));
      for(let i=0;i<count;i++){
        const x=random()*W,y=random()*H,r=Math.max(4,Math.min(W,H)*(.006+random()*.012));
        ctx.save();ctx.translate(x,y);ctx.rotate(random()*Math.PI*2);ctx.globalAlpha=alpha*(.2+random()*.48);
        const grad=ctx.createLinearGradient(-r,-r,r,r);grad.addColorStop(0,'rgba(255,230,222,.96)');grad.addColorStop(1,'rgba(211,125,130,.72)');ctx.fillStyle=grad;
        ctx.beginPath();ctx.moveTo(0,r*1.55);ctx.bezierCurveTo(-r*1.35,r*.65,-r*1.05,-r*.95,0,-r);ctx.bezierCurveTo(r*1.05,-r*.95,r*1.35,r*.65,0,r*1.55);ctx.fill();ctx.restore();
      }
    } else if(id==='starlight'){
      ctx.globalCompositeOperation='screen';
      const count=Math.min(190,Math.max(55,Math.round(W*H/18000)));
      for(let i=0;i<count;i++){
        const x=random()*W,y=random()*H,r=Math.max(.8,Math.min(3.2,W/480))*(.35+random());
        ctx.globalAlpha=alpha*(.25+random()*.7);ctx.fillStyle='#fff2d7';ctx.shadowColor='#f4d6a2';ctx.shadowBlur=r*5;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
        if(i%7===0){ctx.lineWidth=Math.max(.7,r*.35);ctx.beginPath();ctx.moveTo(x-r*3,y);ctx.lineTo(x+r*3,y);ctx.moveTo(x,y-r*3);ctx.lineTo(x,y+r*3);ctx.strokeStyle='rgba(255,239,207,.8)';ctx.stroke();}
      }
      ctx.shadowBlur=0;
    } else if(id==='rays'){
      ctx.globalCompositeOperation='screen';
      const cx=W*(.12+random()*.3),cy=H*(.04+random()*.22), reach=Math.max(W,H)*1.2;
      for(let i=0;i<9;i++){
        const angle=(-.72+i*.18), spread=.028+random()*.026;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
        const grad=ctx.createLinearGradient(0,0,0,reach);grad.addColorStop(0,`rgba(255,225,176,${.1*alpha})`);grad.addColorStop(.45,`rgba(255,213,154,${.035*alpha})`);grad.addColorStop(1,'rgba(255,213,154,0)');
        ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(-reach*spread,0);ctx.lineTo(reach*spread,0);ctx.lineTo(reach*.5,reach);ctx.lineTo(-reach*.5,reach);ctx.closePath();ctx.fill();ctx.restore();
      }
    } else if(id==='fog'){
      ctx.globalCompositeOperation='screen';
      for(let i=0;i<5;i++){
        const x=W*(.08+random()*.84),y=H*(.12+random()*.82),rad=Math.max(W,H)*(.22+random()*.22);
        const g=ctx.createRadialGradient(x,y,rad*.05,x,y,rad);g.addColorStop(0,`rgba(231,222,204,${.13*alpha})`);g.addColorStop(.48,`rgba(207,199,188,${.075*alpha})`);g.addColorStop(1,'rgba(207,199,188,0)');
        ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      }
    } else if(id==='lensflare'){
      ctx.globalCompositeOperation='screen';
      const x=W*.23,y=H*.21,rad=Math.min(W,H)*.18;
      const g=ctx.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,`rgba(255,246,217,${.78*alpha})`);g.addColorStop(.12,`rgba(255,211,146,${.35*alpha})`);g.addColorStop(1,'rgba(255,185,105,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      ctx.globalAlpha=alpha*.36;ctx.strokeStyle='rgba(255,219,169,.8)';ctx.lineWidth=Math.max(1,W/900);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(W*.92,H*.79);ctx.stroke();
      for(let i=1;i<=6;i++){const t=i/7,cx=x+(W*.92-x)*t,cy=y+(H*.79-y)*t,r=rad*(.06+(i%3)*.035);ctx.globalAlpha=alpha*(.12+(i%2)*.08);ctx.fillStyle=i%2?'#f3c78b':'#b8c8d6';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();}
    } else if(id==='lightning'){
      ctx.globalCompositeOperation='screen';
      const bolts=2;
      for(let b=0;b<bolts;b++){
        let x=W*(.28+b*.42),y=0;const points=[[x,y]];
        while(y<H*(.55+random()*.35)){x+= (random()-.5)*W*.12;y+=H*(.035+random()*.055);points.push([x,y]);}
        ctx.lineJoin='round';ctx.lineCap='round';ctx.shadowColor='rgba(173,204,255,.95)';ctx.shadowBlur=Math.max(8,W*.018);
        ctx.strokeStyle=`rgba(207,224,255,${.65*alpha})`;ctx.lineWidth=Math.max(1.2,W/700);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();
        ctx.strokeStyle=`rgba(255,255,255,${.8*alpha})`;ctx.lineWidth=Math.max(.6,W/1800);ctx.stroke();ctx.shadowBlur=0;
      }
    }
    ctx.restore();
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
    if (stickers.length){ stickers.pop(); selectedId = null; syncStickerEditor(); render(); return toast('تراجع'); }
    if (strokes.length){ strokes.pop(); render(); return toast('تراجع'); }
    if (texts.length){ texts.pop(); selectedId = null; syncStickerEditor(); render(); return toast('تراجع'); }
    if (imageEditUndoStack.length){
      currentImage = imageEditUndoStack.pop() || originalImage;
      const dimensions = $c('canvasDimensions');
      if (dimensions && currentImage) dimensions.textContent = `${currentImage.naturalWidth} × ${currentImage.naturalHeight}`;
      setExportDimensionFields(currentImage?.naturalWidth || 1, currentImage?.naturalHeight || 1);
      render(); scheduleCanvasFit(); return toast('تم التراجع عن آخر تعديل بالذكاء الاصطناعي ✓', 'ok');
    }
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
    $c('bgApplyHint')?.classList.add('hidden');
    resetAdjustments();
    filterId = 'none'; filterIntensity = 1; artStyleId='none'; artStyleIntensity=1; visualFxId='none'; visualFxIntensity=.55; onlineOverlayId='none'; onlineOverlayImage=null; onlineOverlayIntensity=.35;
    document.querySelectorAll('[data-art-style],[data-visual-fx]').forEach(x => x.classList.toggle('active', x.dataset.artStyle === 'none' || x.dataset.visualFx === 'none'));
    if($c('artIntensity')) $c('artIntensity').value=100; if($c('valArtIntensity')) $c('valArtIntensity').textContent='100%';
    if($c('visualIntensity')) $c('visualIntensity').value=55; if($c('valVisualIntensity')) $c('valVisualIntensity').textContent='55%';
    if($c('onlineOverlayIntensity')) $c('onlineOverlayIntensity').value=35; if($c('valOnlineOverlayIntensity')) $c('valOnlineOverlayIntensity').textContent='35%';
    $c('onlineOverlaysGrid')?.querySelectorAll('.online-bg-card').forEach((x,i)=>x.classList.toggle('active',i===0));
    strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0; drawLayerVisible = true;
    imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
    border = { id:'none', name:'بدون إطار', style:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
    $c('rangeScale').value = 100; $c('valScale').textContent = '100%';
    $c('rangeAlpha').value = 100; $c('valAlpha').textContent = '100%';
    $c('rangeFilterIntensity').value = 100; $c('valFilterIntensity').textContent = '100%';
    document.querySelectorAll('.filter-thumb').forEach(x => x.classList.toggle('active', x.dataset.filter === 'none'));
    document.querySelectorAll('.border-item').forEach(x => x.classList.toggle('active', x.dataset.border === 'none'));
    selectedId = null;
    syncStickerEditor();
    if (cropActive) showDefaultCrop();
    render();
    toast('تم إعادة الضبط ✓', 'ok');
  }
  async function saveImage(){
    const base = currentImage || originalImage;
    if (!base) return toast('لا توجد صورة', 'err');
    const btn = $c('btnSave');
    if (btn.disabled) return;
    isPreparingExport = true;
    finalBlob = null;
    $c('btnDownload')?.classList.add('hidden');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = 'جارٍ تجهيز التصدير...';
    try{
      const wasCrop = cropActive;
      const previousSelection = selectedId;
      if (wasCrop){ cropActive = false; $c('cropOverlay')?.classList.add('hidden'); }
      selectedId = null;
      try{
        renderNow();
        const format = $c('exportFormat')?.value || 'image/png';
        const quality = Number($c('exportQuality')?.value || 92) / 100;
        const outW = Math.max(1, Math.min(12000, Math.round(Number($c('exportWidth')?.value) || mainCanvas.width)));
        const outH = Math.max(1, Math.min(12000, Math.round(Number($c('exportHeight')?.value) || mainCanvas.height)));
        let exportCanvas = mainCanvas;
        if (format === 'image/jpeg' || outW !== mainCanvas.width || outH !== mainCanvas.height){
          exportCanvas = document.createElement('canvas'); exportCanvas.width = outW; exportCanvas.height = outH;
          const exportCtx = exportCanvas.getContext('2d', { alpha: format !== 'image/jpeg' });
          if (format === 'image/jpeg'){ exportCtx.fillStyle = '#ffffff'; exportCtx.fillRect(0,0,outW,outH); }
          exportCtx.drawImage(mainCanvas,0,0,outW,outH);
        }
        const outBlob = await new Promise((resolve, reject) => exportCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('تعذر إنشاء الصورة')), format, quality));
        finalBlob = outBlob;
        $c('btnDownload')?.classList.remove('hidden');
        toast(`الصورة جاهزة بصيغة ${format.replace('image/','').toUpperCase()} · اضغط «تنزيل الصورة» لإخراج الملف`, 'ok');
      }finally{
        selectedId = previousSelection;
        render();
        if (wasCrop){ cropActive = true; $c('cropOverlay')?.classList.remove('hidden'); }
      }
    }catch(e){
      console.error(e);
      if (e?.name === 'SecurityError') toast('تعذر التصدير لأن أحد الموارد الخارجية لا يسمح بدمجه داخل الصورة. جرّب موردًا آخر أو ارفع الملف من جهازك.', 'err');
      else toast(e?.message || 'تعذر تجهيز الصورة للتصدير.', 'err');
    }
    finally{ isPreparingExport = false; btn.disabled = false; btn.innerHTML = orig; }
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
    originalImage = null; currentImage = null; imageEditUndoStack.length = 0; finalBlob = null;
    uploadedStickerUrls.forEach(url => URL.revokeObjectURL(url)); uploadedStickerUrls = [];
    bgRemoved = false;
    strokes = []; texts = []; stickers = []; textIdCounter = 0; stickerIdCounter = 0; drawLayerVisible = true;
    adjustments = { brightness:100, contrast:100, saturation:100, hue:0, blur:0, opacity:100, sharpen:0, temp:0, vignette:0 };
    filterId = 'none'; filterIntensity = 1; artStyleId='none'; artStyleIntensity=1; visualFxId='none'; visualFxIntensity=.55; onlineOverlayId='none'; onlineOverlayImage=null; onlineOverlayIntensity=.35;
    document.querySelectorAll('[data-art-style],[data-visual-fx]').forEach(x => x.classList.toggle('active', x.dataset.artStyle === 'none' || x.dataset.visualFx === 'none'));
    if($c('artIntensity')) $c('artIntensity').value=100; if($c('visualIntensity')) $c('visualIntensity').value=55; if($c('onlineOverlayIntensity')) $c('onlineOverlayIntensity').value=35;
    $c('onlineOverlaysGrid')?.querySelectorAll('.online-bg-card').forEach((x,i)=>x.classList.toggle('active',i===0));
    currentBg = { type:'original' };
    bgImage = null;
    border = { id:'none', name:'بدون إطار', style:'none', width:20, type:'none', color:'#fff', c1:'#fff', c2:'#000' };
    imgScale = 1; imgAlpha = 1; imgOffsetX = 0; imgOffsetY = 0;
    selectedId = null;
    syncStickerEditor();
    cropActive = false;
    cropRect = null;
    $c('uploadStage')?.classList.remove('hidden');
    $c('workspace')?.classList.add('hidden');
    $c('btnDownload')?.classList.add('hidden');
    closePanel();
  }

  function applyPreferences(prefs={}){
    const format=$c('exportFormat'), quality=$c('exportQuality');
    if(format && ['image/png','image/jpeg','image/webp'].includes(prefs.format)) format.value=prefs.format;
    if(quality && Number.isFinite(Number(prefs.quality))){ quality.value=Math.max(55,Math.min(100,Number(prefs.quality))); if($c('valExportQuality')) $c('valExportQuality').textContent=quality.value+'%'; }
  }

  return { init, reset, applyPreferences, openPanel, closePanel, setWorkspaceFocus };
})();

/* APP */
const App = (() => {
  let opsCache = [];
  const preferenceKey = userId => `removebg_export_preferences_${userId}`;
  function readExportPreferences(userId){ try{ return JSON.parse(SafeStore.get(preferenceKey(userId)) || '{}') || {}; }catch{ return {}; } }
  function applySavedExportPreferences(){ const uid=Auth.session?.user?.id; if(uid) Editor.applyPreferences(readExportPreferences(uid)); }
  const showAuth = () => { $('authScreen').classList.remove('hidden'); $('appScreen').classList.add('hidden'); };
  const showApp = () => { $('authScreen').classList.add('hidden'); $('appScreen').classList.remove('hidden'); };
  async function enterApp(){
    if(!Auth.profile && Auth.session?.user){ Auth.profile = await API.getProfile(Auth.session.user.id, Auth.session.access_token); }
    applySavedExportPreferences(); updateAdminVis(); updatePlanUI(); showApp(); switchView('editor'); await refreshUsage();
  }
  function setAssetTab(name){
    const allowed = ['backgrounds','overlays','stickers'];
    const tab = allowed.includes(name) ? name : 'backgrounds';
    document.querySelectorAll('[data-asset-tab]').forEach(button => button.classList.toggle('active', button.dataset.assetTab === tab));
    document.querySelectorAll('[data-asset-pane]').forEach(pane => pane.classList.toggle('hidden', pane.dataset.assetPane !== tab));
    return tab;
  }
  function switchView(name){
    if(name === 'admin' && !Auth.isDev()){ toast('لا تملك صلاحية', 'err'); return; }
    if (name !== 'editor'){ Editor.closePanel(); Editor.setWorkspaceFocus(false); }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    ['editor','assets','history','profile','admin'].forEach(v => { const el = $(v+'View'); if(el) el.classList.toggle('hidden', v !== name); });
    if(name === 'history') refreshHistory();
    if(name === 'profile') refreshProfile();
    if(name === 'admin') Admin.refresh();
    scrollTo({top:0, behavior:'smooth'});
  }
  function updateAdminVis(){ const d = Auth.isDev(); $('adminMini')?.classList.toggle('hidden', !d); $('adminNav')?.classList.toggle('hidden', !d); }
  function updatePlanUI(){
    const p = Auth.isPro();
    $('planPill')?.classList.toggle('pro', p);
    const pt = $('planTxt'); if(pt) pt.textContent = p ? 'احترافي • ∞' : 'مجاني';
    const pr = Auth.profile;
    const pp = $('pPlan');
    if(pp) pp.textContent = p ? 'احترافي — بلا حدود' : (pr?.plan === 'custom' ? `مخصصة — ${pr.daily_limit}` : 'مجانية — 5 يوميًا');
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
      if(!ops.length){ wrap.innerHTML = `<div class="empty"><div class="empty-icon">◌</div><h3>لا توجد عمليات</h3></div>`; return; }
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
      const un = s.user.user_metadata?.display_name || p?.username || s.user.user_metadata?.username || s.user.email?.split('@')[0] || '?';
      const em = p?.email || s.user.email || '—';
      const av = $('avatar');
      if(av){
        av.textContent = initials(un); av.style.backgroundImage = ''; av.classList.remove('has-photo');
        let avatarUrl = s.user.user_metadata?.avatar_path ? await API.resolveImg(s.user.user_metadata.avatar_path, s.access_token) : null;
        if(!avatarUrl){ try{ avatarUrl = SafeStore.get(`removebg_avatar_${s.user.id}`); }catch{} }
        if(avatarUrl){ av.textContent = ''; av.style.backgroundImage = `url(\"${avatarUrl.replace(/[\"\\]/g, '')}\")`; av.classList.add('has-photo'); }
      }
      const displayInput = $('profileDisplayName'); if(displayInput && document.activeElement !== displayInput) displayInput.value = un;
      const bioInput = $('profileBio'); if(bioInput && document.activeElement !== bioInput) bioInput.value = s.user.user_metadata?.bio || '';
      const exportPrefs=readExportPreferences(s.user.id);
      if($('profileExportFormat')) $('profileExportFormat').value=exportPrefs.format || 'image/png';
      if($('profileExportQuality')) $('profileExportQuality').value=Number(exportPrefs.quality || 92);
      if($('profileExportQualityValue')) $('profileExportQualityValue').textContent=`${Number(exportPrefs.quality || 92)}%`;
      const favCount = $('profileFavoritesCount'); if(favCount){ try{ favCount.textContent = JSON.parse(SafeStore.get('removebg_sticker_favorites_v1') || '[]').length; }catch{ favCount.textContent = '0'; } }
      const activity = $('profileRecentActivity'); if(activity){ const recent = ops.slice(0,4); activity.innerHTML = recent.length ? recent.map((op,i)=>`<div class="profile-activity-item"><span class="activity-dot"></span><div><strong>عملية تحرير محفوظة</strong><small>${esc(fmtDate(op.created_at))}</small></div><span class="activity-index">${String(i+1).padStart(2,'0')}</span></div>`).join('') : '<div class="profile-activity-empty">لا توجد عمليات محفوظة حتى الآن. ابدأ بتحرير صورتك الأولى.</div>'; }
      const planBadge = $('pPlanBadge'); if(planBadge) planBadge.textContent = Auth.isPro() ? 'الخطة الاحترافية' : 'الخطة المجانية';
      const pu = $('pUsername'); if(pu) pu.textContent = un;
      const pe = $('pEmail'); if(pe) pe.textContent = em;
      const pr = $('pRole'); if(pr){ pr.textContent = Auth.isDev() ? '✦ المطوّر' : '● مستخدم'; pr.classList.toggle('dev', Auth.isDev()); }
      const pj = $('pJoined'); if(pj) pj.textContent = p?.created_at ? `انضم في ${fmtDate(p.created_at)}` : '';
      const so = $('statOps'); if(so) so.textContent = ops.length;
      const sot = $('statOpsToday'); if(sot) sot.textContent = today;
      updatePlanUI();
      if(Auth.isPro()){ const sr = $('statRemain'); if(sr) sr.textContent = '∞'; }
      else { const lim = Number(p?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT); const sr = $('statRemain'); if(sr) sr.textContent = lim > 0 ? Math.max(0, lim - today) : '∞'; }
      const ps = $('pStatus'); if(ps) ps.textContent = p?.is_banned ? 'موقوف' : 'نشط';
      const usageText = $('usageText'), usageProgress = $('usageProgress');
      const limit = Auth.isPro() ? 0 : Number(p?.daily_limit ?? CONFIG.DEFAULT_DAILY_LIMIT);
      const used = today;
      const unlimited = Auth.isPro() || limit <= 0;
      if(usageText) usageText.textContent = unlimited ? `${used} عملية · بلا حدود` : `${used} من ${limit} عمليات`;
      if(usageProgress) usageProgress.style.width = unlimited ? '100%' : `${Math.min(100, used/limit*100)}%`;
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
    document.querySelectorAll('[data-asset-tab]').forEach(button => button.addEventListener('click', () => setAssetTab(button.dataset.assetTab)));
    $('assetBackToEditor')?.addEventListener('click', () => switchView('editor'));
    $('assetStickerBack')?.addEventListener('click', () => switchView('editor'));
    $('profileHistoryBtn')?.addEventListener('click', () => switchView('history'));
    $('profileEditorBtn')?.addEventListener('click', () => switchView('editor'));
    $('profileNewImageBtn')?.addEventListener('click', () => { switchView('editor'); $('fileInput')?.click(); });
    $('historyRefresh')?.addEventListener('click', async e => { e.currentTarget.disabled = true; try{ await refreshHistory(); } finally{ e.currentTarget.disabled = false; } });
    $('refreshProfile')?.addEventListener('click', async e => {
      e.currentTarget.disabled = true;
      try{ Auth.profile = await API.getProfile(Auth.session.user.id, Auth.session.access_token); updateAdminVis(); await refreshProfile(); await refreshUsage(); toast('تم التحديث ✓', 'ok'); }
      finally{ e.currentTarget.disabled = false; }
    });
    $('logoutBtn')?.addEventListener('click', () => Auth.doLogout(true));
    $('saveProfileName')?.addEventListener('click', saveProfileName);
    $('profileExportQuality')?.addEventListener('input',e=>{if($('profileExportQualityValue'))$('profileExportQualityValue').textContent=e.target.value+'%';});
    $('saveProfilePrefs')?.addEventListener('click',saveExportPreferences);
    $('avatarPickBtn')?.addEventListener('click', () => $('avatarFile')?.click());
    $('avatarFile')?.addEventListener('change', handleAvatarUpload);
  }
  function saveExportPreferences(){
    const uid=Auth.session?.user?.id;if(!uid)return toast('سجّل الدخول أولاً','err');
    const prefs={format:$('profileExportFormat')?.value || 'image/png',quality:Math.max(55,Math.min(100,Number($('profileExportQuality')?.value || 92)))};
    try{SafeStore.set(preferenceKey(uid),JSON.stringify(prefs));Editor.applyPreferences(prefs);toast('تم حفظ تفضيلات التصدير على هذا الجهاز ✓','ok');}
    catch{toast('تعذر حفظ التفضيلات على الجهاز','err');}
  }

  async function saveProfileName(){
    const input = $('profileDisplayName');
    const name = (input?.value || '').trim();
    if(!name || name.length < 2) return toast('اكتب اسماً من حرفين على الأقل', 'err');
    if(name.length > 30) return toast('الاسم طويل جداً', 'err');
    const btn = $('saveProfileName'); const old = btn?.textContent;
    if(btn){ btn.disabled = true; btn.textContent = 'جارٍ الحفظ...'; }
    try{
      const s = await Auth.valid(); if(!s?.access_token) throw new Error('انتهت الجلسة');
      const bio = ($('profileBio')?.value || '').trim().slice(0,120);
      const user = await API.updateUser(s.access_token, { ...(s.user.user_metadata || {}), display_name:name, bio });
      s.user = user || { ...s.user, user_metadata:{ ...(s.user.user_metadata || {}), display_name:name, bio } };
      Auth.save(s); Auth.session = s;
      await refreshProfile(); toast('تم تحديث بيانات الحساب ✓', 'ok');
    }catch(e){ toast(e.message || 'تعذر حفظ الاسم', 'err'); }
    finally{ if(btn){ btn.disabled = false; btn.textContent = old || 'حفظ بيانات الحساب'; } }
  }
  async function handleAvatarUpload(e){
    const file = e.target.files?.[0]; e.target.value = '';
    if(!file) return;
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast('اختر صورة PNG أو JPG أو WebP', 'err');
    if(file.size > 8 * 1024 * 1024) return toast('يجب ألا يتجاوز حجم الصورة 8MB', 'err');
    const btn = $('avatarPickBtn'); if(btn) btn.disabled = true;
    let savedLocally = false;
    try{
      const image = await new Promise((resolve,reject) => { const u=URL.createObjectURL(file); const im=new Image(); im.onload=()=>{ URL.revokeObjectURL(u); resolve(im); }; im.onerror=()=>{ URL.revokeObjectURL(u); reject(new Error('تعذر فتح الصورة')); }; im.src=u; });
      const size = 320, canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
      const ctx = canvas.getContext('2d'); const side=Math.min(image.naturalWidth,image.naturalHeight); const sx=(image.naturalWidth-side)/2, sy=(image.naturalHeight-side)/2;
      ctx.drawImage(image,sx,sy,side,side,0,0,size,size);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if(!blob) throw new Error('تعذر تجهيز الصورة');
      const s = await Auth.valid(); if(!s?.access_token) throw new Error('انتهت الجلسة');
      try{
        const path = await API.upload(s.access_token,s.user.id,blob,'avatar');
        const user = await API.updateUser(s.access_token,{ ...(s.user.user_metadata||{}), avatar_path:path });
        s.user = user || { ...s.user,user_metadata:{ ...(s.user.user_metadata||{}),avatar_path:path } };
        Auth.save(s); Auth.session=s;
        try{ SafeStore.remove(`removebg_avatar_${s.user.id}`); }catch{}
      }catch(uploadError){
        const localUrl = canvas.toDataURL('image/jpeg',.86);
        SafeStore.set(`removebg_avatar_${s.user.id}`,localUrl);
        savedLocally = true;
      }
      await refreshProfile();
      toast(savedLocally ? 'تعذر الرفع إلى الحساب؛ حُفظت الصورة على هذا الجهاز' : 'تم تحديث صورة الحساب ✓', savedLocally ? '' : 'ok');
    }catch(err){ toast(err.message || 'تعذر تحديث الصورة','err'); }
    finally{ if(btn) btn.disabled=false; }
  }
  return { showAuth, showApp, enterApp, switchView, setAssetTab, bindUI, refreshUsage };
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

/* BOOT — fail-safe startup */
(async function boot(){
  try {
    AuthUI.init();
    App.bindUI();
    Admin.init();
    Editor.init();
    await Loader.run();

    // Show the sign-in screen before contacting remote services.
    // A slow Supabase request must never leave the visitor on a blank page.
    App.showAuth();
    window.__REMOVE_BG_BOOT_READY = true;

    let session = null;
    try { session = await withTimeout(Auth.valid(), 8000, 'تعذر استعادة الجلسة بسبب بطء الاتصال. سجّل الدخول من جديد.'); }
    catch(error) { console.warn('Session restore skipped:', error); toast(error.message, ''); return; }
    if(!session) return;

    let user = null;
    try { user = await withTimeout(API.getUser(session), 8000, 'تعذر الاتصال بخدمة الحسابات. سجّل الدخول من جديد.'); }
    catch(error) { console.warn('User restore skipped:', error); Auth.save(null); toast(error.message, ''); return; }
    if(!user){ Auth.save(null); toast('انتهت الجلسة. سجّل الدخول مرة أخرى.', ''); return; }

    session.user = user;
    Auth.save(session);
    let profile = null;
    try { profile = await withTimeout(API.getProfile(user.id, session.access_token), 7000, 'تعذر تحميل بيانات الحساب.'); }
    catch(error) { console.warn('Profile restore skipped:', error); }

    if(profile?.is_banned){
      Auth.session = session;
      Auth.profile = profile;
      await Auth.doLogout(false);
      App.showAuth();
      toast('هذا الحساب موقوف.', 'err');
      return;
    }
    Auth.session = session;
    Auth.profile = profile;
    await App.enterApp();
  } catch(error) {
    console.error('RemoveBG startup error:', error);
    try { Loader.hide(); } catch {}
    try { App.showAuth(); } catch {}
    if(typeof window.__showRemoveBGStartupError === 'function') {
      window.__showRemoveBGStartupError(error?.message || 'حدث خطأ غير معروف أثناء تشغيل الموقع.');
    } else {
      const auth = document.getElementById('authScreen');
      if(auth) auth.classList.remove('hidden');
      document.body.insertAdjacentHTML('afterbegin', '<div style="position:fixed;z-index:999999;top:12px;left:12px;right:12px;padding:16px;background:#24160f;color:#fff;border:1px solid #c99570;border-radius:12px;direction:rtl">تعذر تشغيل RemoveBG. أعد تحميل الصفحة أو تحقق من ملفات app.js وconfig.js.</div>');
    }
  }
})();
