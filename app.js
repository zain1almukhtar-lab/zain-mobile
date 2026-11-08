/* مكتب زين المختار — نسخة الآيفون (PWA) — للمدير فقط
 *
 * القراءة: آخر "لقطة" مشفّرة رفعها الجهاز الرئيسي إلى GitHub (فرع data) تُفك على الآيفون نفسه.
 * الكتابة: كل عملية (مصروف، مدخول، فاتورة، تسديد، مهمة…) تُشفّر هنا وتوضع في فرع inbox،
 *          والجهاز الرئيسي يطبّقها خلال دقيقة من تشغيله، ثم تظهر في اللقطة التالية.
 * الدخول: اسم وكلمة مرور المدير فقط (bcrypt) — لا يوجد إنشاء حسابات.
 */
(() => {
  'use strict';

  // ═════════════ أدوات عامة ═════════════
  const $app = document.getElementById('app');
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('en-US');
  const fmt = (n) => nf.format(Math.round(n || 0));
  const money = (n) => `<span class="num">${fmt(n)}</span> <small>د.ع</small>`;
  const parseMoney = (s) => Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;
  const METHOD = { cash: 'كاش', qi_card: 'كي كارد', balance: 'من رصيده' };
  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const WEEK = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const monthName = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
  const pad = (n) => String(n).padStart(2, '0');
  const ds = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => ds(new Date());
  const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return ds(d); };
  const to12 = (h, m) => `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'ص' : 'م'}`;
  const time = (dt) => (dt ? to12(Number(dt.slice(11, 13)), Number(dt.slice(14, 16))) : '');
  const daysSince = (dt) => Math.max(0, Math.floor((Date.now() - new Date(String(dt).replace(' ', 'T')).getTime()) / 86400000));
  const dayLabel = (d) => (d === todayStr() ? 'اليوم' : d === addDays(todayStr(), -1) ? 'أمس' : d === addDays(todayStr(), 1) ? 'غداً' : `${WEEK[new Date(`${d}T12:00:00`).getDay()]} ${d.slice(5).replace('-', '/')}`);
  const dayTime = (dt) => `${dayLabel(dt.slice(0, 10))} · ${time(dt)}`;
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} د`;
    const h = Math.round(m / 60);
    if (h < 24) return `قبل ${h} س`;
    return `قبل ${Math.round(h / 24)} يوم`;
  };
  const initial = (s) => esc((s || '؟').trim().charAt(0));
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 15h4"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>', chevL: '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chat: '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    up: '<path d="M7 17 17 7M8 7h9v9"/>', cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    task: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 12l3 3 5-5"/>',
    userPlus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', building: '<path d="M5 21V4h10v17M15 9h4v12M9 8h2M9 12h2M9 16h2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>', eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    hand: '<path d="M7 11V6a2 2 0 0 1 4 0v4M11 10V4a2 2 0 0 1 4 0v6M15 10V6a2 2 0 0 1 4 0v8a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-2-4a2 2 0 0 1 3-2l1 2"/>',
  };
  const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

  let toastT;
  function toast(msg, err = false) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = `toast ${err ? 'err' : ''}`;
    el.innerHTML = `${icon(err ? 'x' : 'check', 18)}<span>${esc(msg)}</span>`;
    document.body.appendChild(el);
    clearTimeout(toastT);
    toastT = setTimeout(() => el.remove(), 3200);
  }

  // ═════════════ الربط والتشفير ═════════════
  function readPairing() {
    let c = LS.get('zm-cfg') || {};
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('k')) {
      c = { k: h.get('k'), o: h.get('o') || c.o, r: h.get('r') || c.r };
      LS.set('zm-cfg', c); LS.del('zm-snap'); LS.del('zm-session');
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (!c.o && /\.github\.io$/i.test(location.hostname)) {
      c.o = location.hostname.split('.')[0];
      const seg = location.pathname.split('/').filter(Boolean)[0];
      c.r = seg && !/\.html$/.test(seg) ? seg : location.hostname;
    }
    return c;
  }
  let cfg = readPairing();

  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64url = (s) => b64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const toB64 = (buf) => { const a = new Uint8Array(buf); let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const keyOf = (usage) => crypto.subtle.importKey('raw', b64url(cfg.k), 'AES-GCM', false, [usage]);

  async function decrypt(text) {
    const env = JSON.parse(text);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(env.iv) }, await keyOf('decrypt'), b64(env.ct));
    return JSON.parse(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  async function encrypt(obj) {
    const gz = await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyOf('encrypt'), gz);
    return JSON.stringify({ v: 1, at: obj.at, iv: toB64(iv), ct: toB64(ct) });
  }

  const repo = () => `https://api.github.com/repos/${encodeURIComponent(cfg.o)}/${encodeURIComponent(cfg.r)}`;
  async function fetchEnvelope() {
    const tries = [
      () => fetch(`${repo()}/contents/snapshot.json?ref=data&t=${Date.now()}`, { headers: { Accept: 'application/vnd.github.raw' }, cache: 'no-store' }),
      () => fetch(`https://raw.githubusercontent.com/${encodeURIComponent(cfg.o)}/${encodeURIComponent(cfg.r)}/data/snapshot.json?t=${Date.now()}`, { cache: 'no-store' }),
    ];
    let last;
    for (const t of tries) {
      try {
        const res = await t();
        if (res.ok) { const text = await res.text(); const env = JSON.parse(text); if (env.iv && env.ct) return text; }
        last = new Error(res.status === 404 ? 'NOT_FOUND' : `HTTP ${res.status}`);
      } catch (e) { last = e; }
    }
    throw last || new Error('NET');
  }

  // ═════════════ الحالة ═════════════
  const S = {
    snap: null, offline: false, loading: false, error: null, user: null,
    tab: 'today', fin: 'cash', oseg: 'txns', txf: 'open', gq: '', month: null, expMonth: null, year: null,
    invDay: null, q: '', cq: '',
  };

  // ═════════════ عمليات الآيفون (قائمة الانتظار) ═════════════
  const queue = () => LS.get('zm-queue') || [];
  const saveQueue = (q) => LS.set('zm-queue', q);
  const fails = () => LS.get('zm-fail') || [];

  async function sendOp(type, payload, label) {
    if (!S.snap?.gh?.token) { toast('الإرسال من الآيفون غير مفعّل — حدّث برنامج المكتب', true); return false; }
    const op = { id: uid(), type, payload, user: S.user.username, at: new Date().toISOString() };
    saveQueue([...queue(), { ...op, label, sent: false }]);
    closeSheet();
    toast('تم الحفظ — يُطبَّق في المكتب خلال دقيقة');
    render();
    flushQueue();
    return true;
  }

  let flushing = false;
  async function flushQueue() {
    const token = S.snap?.gh?.token;
    if (!token || flushing || !navigator.onLine) return;
    flushing = true;
    try {
      for (const item of queue().filter((x) => !x.sent)) {
        const { label, sent, ...op } = item; // eslint-disable-line no-unused-vars
        const body = JSON.stringify({ message: 'op', content: btoa(await encrypt(op)), branch: 'inbox' });
        const res = await fetch(`${repo()}/contents/ops/${op.id}.json`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }, body,
        }).catch(() => null);
        if (res && (res.ok || res.status === 422)) {
          saveQueue(queue().map((x) => (x.id === op.id ? { ...x, sent: true } : x)));
        } else break; // نعيد المحاولة لاحقاً
      }
    } finally { flushing = false; }
    paintTop();
  }

  // بعد كل تحديث: نزيل العمليات التي طُبقت، ونحفظ التي فشلت لعرض السبب
  function reconcile() {
    if (!S.snap) return;
    const applied = new Map((S.snap.applied || []).map((a) => [a.id, a]));
    const keep = []; const failed = fails();
    for (const x of queue()) {
      const a = applied.get(x.id);
      if (!a) keep.push(x);
      else if (!a.ok) failed.push({ id: x.id, label: x.label, message: a.message || 'تعذر التطبيق' });
    }
    saveQueue(keep);
    LS.set('zm-fail', failed.slice(-10));
  }
  const pendingOf = (types) => queue().filter((x) => types.includes(x.type));

  // ═════════════ الجلب ═════════════
  async function refresh({ silent = false } = {}) {
    if (!cfg.k || !cfg.o) return;
    S.loading = true; if (!silent) paintTop();
    try {
      const text = await fetchEnvelope();
      S.snap = await decrypt(text);
      LS.set('zm-snap', text);
      S.offline = false; S.error = null;
    } catch (e) {
      if (!S.snap) { const c = LS.get('zm-snap'); if (c) { try { S.snap = await decrypt(c); } catch { /* ignore */ } } }
      S.offline = true;
      S.error = e?.name === 'OperationError' ? 'رمز الربط لا يطابق — افتح رابط الربط الجديد من برنامج المكتب'
        : e?.message === 'NOT_FOUND' ? 'لم تصل بيانات بعد — فعّل المزامنة من برنامج المكتب (الإعدادات ← تطبيق الموبايل)' : null;
    }
    S.loading = false;
    reconcile();
    checkSession();
    render();
    flushQueue();
  }

  // ═════════════ الدخول ═════════════
  const SESSION_MS = 12 * 60 * 60 * 1000;
  function checkSession() {
    const s = LS.get('zm-session');
    if (!s || !S.snap || Date.now() > s.exp) { S.user = null; return; }
    const a = S.snap.admins.find((x) => x.username.toLowerCase() === s.u && x.hash.slice(-16) === s.h);
    S.user = a || null;
    if (!a) LS.del('zm-session');
  }
  function login(username, password) {
    return new Promise((resolve) => {
      const lock = LS.get('zm-lock') || { n: 0, at: 0 };
      if (lock.n >= 5 && Date.now() - lock.at < 60000) return resolve('محاولات كثيرة خاطئة. حاول بعد دقيقة.');
      const u = String(username || '').trim().toLowerCase();
      const a = S.snap.admins.find((x) => x.username.toLowerCase() === u);
      const fail = () => { LS.set('zm-lock', { n: lock.n + 1, at: Date.now() }); resolve('اسم المستخدم أو كلمة المرور غير صحيحة'); };
      if (!a) { setTimeout(fail, 400); return; }
      dcodeIO.bcrypt.compare(String(password || ''), a.hash, (err, ok) => {
        if (err || !ok) return fail();
        LS.del('zm-lock');
        LS.set('zm-session', { u, h: a.hash.slice(-16), exp: Date.now() + SESSION_MS });
        S.user = a;
        resolve(null);
      });
    });
  }

  // ═════════════ الورقة المنزلقة ═════════════
  let sheetEl = null;
  function openSheet(title, body, mount) {
    closeSheet(true);
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = `<div class="grab"></div><div class="sh"><h3>${title}</h3><button class="icon-btn" data-close>${icon('x', 18)}</button></div><div class="sb">${body}</div>`;
    document.body.append(bg, sh);
    sheetEl = { bg, sh };
    requestAnimationFrame(() => { bg.classList.add('open'); sh.classList.add('open'); });
    bg.onclick = () => closeSheet();
    sh.querySelector('[data-close]').onclick = () => closeSheet();
    // سحب للأسفل للإغلاق
    let y0 = null;
    sh.querySelector('.grab').addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    sh.querySelector('.grab').addEventListener('touchend', (e) => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 60) closeSheet(); y0 = null; });
    bindMoney(sh);
    mount?.(sh.querySelector('.sb'), sh);
    return sh;
  }
  function closeSheet(instant = false) {
    if (!sheetEl) return;
    const { bg, sh } = sheetEl; sheetEl = null;
    if (instant) { bg.remove(); sh.remove(); return; }
    bg.classList.remove('open'); sh.classList.remove('open');
    setTimeout(() => { bg.remove(); sh.remove(); }, 300);
  }

  // حقول المبالغ: فواصل آلاف أثناء الكتابة + لوحة أرقام
  const moneyField = (name, label, value = 0, extra = '') => `<div class="field"><label>${label}</label><div class="money-in"><input class="input" name="${name}" inputmode="numeric" data-money value="${value ? fmt(value) : ''}" placeholder="0" ${extra}><span>د.ع</span></div></div>`;
  function bindMoney(root) {
    root.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.matches('[data-money]')) return;
      const v = parseMoney(el.value);
      el.value = v ? fmt(v) : '';
    });
  }
  const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  function bindSeg(root, name, onChange) {
    const el = root.querySelector(`[data-seg="${name}"]`);
    if (!el) return () => null;
    el.querySelectorAll('button').forEach((b) => { b.onclick = () => { el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); onChange?.(b.dataset.v); }; });
    return () => el.querySelector('.on')?.dataset.v;
  }
  const val = (root, n) => (root.querySelector(`[name="${n}"]`)?.value || '').trim();
  const mval = (root, n) => parseMoney(root.querySelector(`[name="${n}"]`)?.value);

  // ═════════════ شاشة الربط ═════════════
  function viewPair() {
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    $app.innerHTML = `
      <div class="auth">
        <div class="brand">
          <img class="dark" src="icons/icon-192.png" alt="">
          <h1>مكتب زين المختار</h1>
          <p>لربط هذا الآيفون افتح <b>رابط الربط</b> من برنامج المكتب<br>(الإعدادات ← تطبيق الموبايل)، أو الصق <b>رمز الربط</b> هنا.</p>
        </div>
        <div class="field"><label>رمز الربط</label><input class="input ltr" id="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="الصق الرمز هنا"></div>
        <div id="err"></div>
        <button class="btn btn-ghost btn-block" id="paste">لصق من الحافظة</button>
        <button class="btn btn-gold btn-block" id="go">ربط</button>
        ${standalone ? '' : '<div class="note">بعد الربط: اضغط زر المشاركة ⬆︎ في Safari ثم «إضافة إلى الشاشة الرئيسية».</div>'}
      </div>`;
    const code = $app.querySelector('#code');
    $app.querySelector('#paste').onclick = async () => { try { code.value = (await navigator.clipboard.readText()).trim(); } catch { code.focus(); } };
    $app.querySelector('#go').onclick = () => {
      let v = code.value.trim();
      const m = v.match(/#k=([^&\s]+)/); if (m) v = decodeURIComponent(m[1]);
      if (!/^[A-Za-z0-9_-]{40,}$/.test(v)) { $app.querySelector('#err').innerHTML = '<div class="alert">الرمز غير صحيح — انسخه مجدداً من برنامج المكتب</div>'; return; }
      const om = code.value.match(/[#&]o=([^&\s]+)/); const rm = code.value.match(/[#&]r=([^&\s]+)/);
      cfg = { ...cfg, k: v, ...(om ? { o: decodeURIComponent(om[1]) } : {}), ...(rm ? { r: decodeURIComponent(rm[1]) } : {}) };
      LS.set('zm-cfg', cfg); LS.del('zm-snap');
      boot();
    };
  }

  // ═════════════ شاشة الدخول ═════════════
  function viewLogin() {
    const o = S.snap?.office || {};
    $app.innerHTML = `
      <div class="auth">
        <div class="brand">
          <img src="${o.logo ? esc(o.logo) : 'icons/icon-192.png'}" ${o.logo ? '' : 'class="dark"'} alt="">
          <h1>${esc(o.name || 'مكتب زين المختار')}</h1>
          <p>${S.snap ? 'دخول المدير' : 'جارٍ تحميل البيانات…'}</p>
        </div>
        ${S.error ? `<div class="alert">${esc(S.error)}</div>` : ''}
        ${S.snap ? `
          <form id="f" style="display:flex;flex-direction:column;gap:12px" autocomplete="on">
            <div class="field"><label>اسم المستخدم</label><input class="input ltr" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></div>
            <div class="field"><label>كلمة المرور</label><input class="input ltr" name="password" type="password" autocomplete="current-password" required></div>
            <div id="err"></div>
            <button class="btn btn-gold btn-block" id="go">${icon('lock', 18)} دخول</button>
          </form>` : '<button class="btn btn-ghost btn-block" id="retry">إعادة المحاولة</button>'}
        <div class="foot-note">${S.snap ? `آخر مزامنة ${ago(S.snap.at)}` : ''}</div>
      </div>`;
    const f = $app.querySelector('#f');
    if (f) {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const btn = f.querySelector('#go'); btn.disabled = true; btn.textContent = 'جارٍ التحقق…';
        const err = await login(f.username.value, f.password.value);
        if (err) { f.querySelector('#err').innerHTML = `<div class="alert">${esc(err)}</div>`; btn.disabled = false; btn.innerHTML = `${icon('lock', 18)} دخول`; return; }
        render();
        flushQueue();
      };
    }
    const r = $app.querySelector('#retry'); if (r) r.onclick = () => refresh();
  }

  // ═════════════ الهيكل ═════════════
  const TABS = [['today', 'اليوم', 'home'], ['office', 'المكتب', 'building'], ['add', '', 'plus'], ['money', 'الفلوس', 'wallet'], ['more', 'المزيد', 'grid']];

  function viewShell() {
    const sn = S.snap;
    const months = Object.keys(sn.months).sort().reverse();
    if (!S.month || !sn.months[S.month]) S.month = months[0];
    if (!S.expMonth) S.expMonth = months[0];
    if (!S.year || !sn.years[S.year]) S.year = Object.keys(sn.years).sort().reverse()[0];
    $app.innerHTML = `
      <header class="top"><div class="top-row">
        <img src="${sn.office.logo ? esc(sn.office.logo) : 'icons/icon-192.png'}" alt="">
        <div class="t"><b>${esc(sn.office.name || 'مكتب زين المختار')}</b><span class="sync" id="sync"></span></div>
        <button class="icon-btn press" id="eye" aria-label="إخفاء الأرقام">${icon(LS.get('zm-hide') ? 'eyeOff' : 'eye', 19)}</button>
        <button class="icon-btn press" id="nb" aria-label="الإشعارات">${icon('bell', 19)}</button>
        <button class="icon-btn press" id="rf" aria-label="تحديث">${icon('refresh', 19)}</button>
      </div></header>
      <main id="main"></main>
      <nav class="tabs"><div class="in">
        ${TABS.map(([k, l, i]) => (k === 'add'
          ? `<button data-tab="add" aria-label="إضافة"><span class="fab">${icon('plus', 26)}</span></button>`
          : `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(i, 23)}<span>${l}</span></button>`)).join('')}
      </div></nav>`;
    $app.querySelector('#rf').onclick = () => { refresh(); flushQueue(); };
    $app.querySelector('#nb').onclick = () => notifSheet();
    // إخفاء الأرقام (إذا أحد جنبك يشوف الشاشة)
    $app.querySelector('#eye').onclick = () => { const h = !LS.get('zm-hide'); LS.set('zm-hide', h); document.body.classList.toggle('hid', h); $app.querySelector('#eye').innerHTML = icon(h ? 'eyeOff' : 'eye', 19); };
    document.body.classList.toggle('hid', !!LS.get('zm-hide'));
    $app.querySelectorAll('.tabs button').forEach((b) => {
      b.onclick = () => {
        if (b.dataset.tab === 'add') return addMenu();
        S.tab = b.dataset.tab; render(); window.scrollTo(0, 0);
      };
    });
    paintTop();
    paintMain();
  }

  function paintTop() {
    const s = $app.querySelector('#sync'); const rf = $app.querySelector('#rf');
    if (!s || !S.snap) return;
    const q = queue();
    s.className = `sync ${S.offline ? 'off' : ''}`;
    s.innerHTML = `<i></i>${S.offline ? 'غير متصل · ' : ''}مزامنة ${ago(S.snap.at)}${q.length ? ` · ${q.length} بالانتظار` : ''}`;
    rf.classList.toggle('spin', S.loading);
  }

  function paintMain() {
    const main = $app.querySelector('#main');
    if (!main) return;
    main.innerHTML = ({ today: tabToday, office: tabOffice, money: tabMoney, more: tabMore })[S.tab]();
    mountEmbeds(main);
    main.querySelectorAll('[data-act]').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); act(el.dataset.act, el.dataset.v, el); }; });
    const q = main.querySelector('#q');
    if (q) q.oninput = () => { S.q = q.value; main.querySelector('#invlist').innerHTML = invoiceList(); bindRows(main); };
    const gs = main.querySelector('#gs');
    if (gs) gs.oninput = () => { S.gq = gs.value; main.querySelector('#gsr').innerHTML = searchResults(); bindRows(main); bindSearch(main); };
    bindSearch(main);
    main.querySelectorAll('[data-go]').forEach((el) => { el.onclick = () => goAction(el.dataset.go); });
    main.querySelectorAll('[data-more]').forEach((el) => { el.onclick = () => moreAction(el.dataset.more); });
    const cq = main.querySelector('#cq');
    if (cq) cq.oninput = () => { S.cq = cq.value; main.querySelector('#clist').innerHTML = clientList(); bindRows(main); };
    bindRows(main);
    bindAudit(main);
    bindOffice(main);
    main.querySelectorAll('[data-day]').forEach((el) => { el.onclick = () => daySheet(el.dataset.day); });
  }
  function bindRows(root) {
    root.querySelectorAll('[data-open]').forEach((el) => {
      el.onclick = () => {
        const [kind, id] = el.dataset.open.split(':');
        ({ inv: invoiceSheet, client: clientSheet, exp: expenseSheet, ext: externalSheet, task: taskSheet, debt: debtSheet })[kind]?.(id);
      };
    });
  }

  function act(a, v) {
    const months = Object.keys(S.snap.months).sort();
    const years = Object.keys(S.snap.years).sort();
    const step = (list, cur, d) => list[Math.min(list.length - 1, Math.max(0, list.indexOf(cur) + d))];
    if (a === 'month') S.month = step(months, S.month, Number(v));
    else if (a === 'expMonth') S.expMonth = step(months, S.expMonth, Number(v));
    else if (a === 'dMonth') S.dMonth = step(months, S.dMonth, Number(v));
    else if (a === 'year') S.year = step(years, S.year, Number(v));
    else if (a === 'day') S.invDay = v || null;
    else if (a === 'fin') S.fin = v;
    else if (a === 'tasks') return tasksSheet();
    else if (a === 'activity') return activitySheet();
    else if (a === 'newExp') return expenseSheet();
    else if (a === 'newExt') return externalSheet();
    else if (a === 'newClient') return clientForm();
    else if (a === 'done') return doneTask(v);
    else if (a === 'later') return postponeSheet(v);
    else if (a === 'dismiss') { LS.del('zm-fail'); }
    paintMain();
  }

  const picker = (kind, label, list, cur) => {
    const i = list.indexOf(cur);
    return `<div class="picker">
      <button class="icon-btn" data-act="${kind}" data-v="-1" ${i <= 0 ? 'disabled' : ''}>${icon('chevR', 20)}</button>
      <div class="lbl">${label}</div>
      <button class="icon-btn" data-act="${kind}" data-v="1" ${i >= list.length - 1 ? 'disabled' : ''}>${icon('chevL', 20)}</button>
    </div>`;
  };
  const kpi = (l, v, s = '', cls = '', dot = '') => `<div class="kpi ${cls}"><div class="l">${dot ? `<i style="background:${dot}"></i>` : ''}${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  const bars = (rows, labelK, valK) => {
    const max = Math.max(1, ...rows.map((r) => Math.abs(r[valK])));
    return rows.map((r) => `<div class="bar-row"><span class="n">${esc(r[labelK])}</span><span class="b"><i class="${r[valK] < 0 ? 'neg' : ''}" style="width:${Math.max(2, (Math.abs(r[valK]) / max) * 100)}%"></i></span><span class="v num">${fmt(r[valK])}</span></div>`).join('');
  };
  const title = (t, sub = '', extra = '') => `<div class="title"><div style="flex:1"><h1>${t}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div>${extra}</div>`;
  const statusBars = () => {
    const q = queue(); const f = fails();
    return `${q.length ? `<div class="pending-bar"><span class="dot"></span><span style="flex:1">${q.length} عملية بانتظار برنامج المكتب${q.some((x) => !x.sent) ? ' (لم تُرسل بعد — تحقق من الإنترنت)' : ''}</span></div>` : ''}
      ${f.length ? `<div class="fail-bar">${icon('x', 18)}<span style="flex:1">تعذر تطبيق: ${f.map((x) => `${esc(x.label)} — ${esc(x.message)}`).join('، ')}</span><button class="chip red" data-act="dismiss">إخفاء</button></div>` : ''}`;
  };
  const pendingRows = (types) => pendingOf(types).map((x) => `<div class="item pending noic"><div class="m"><b>${esc(x.label)}</b><span>${x.sent ? 'بانتظار برنامج المكتب' : 'لم تُرسل بعد'}</span></div><div class="e"><span class="chip gold">${icon('clock', 12)} بالانتظار</span></div></div>`).join('');

  // ═════════════ الهيكل الجديد (2.6.0): اليوم · المكتب · + · الفلوس · المزيد ═════════════
  // embed: يبني محتوى «شيت» موجود داخل التبويب بدل ما يفتحه فوق (نفس الكود، بدون تكرار)
  let embeds = [];
  function embed(fn, ...args) {
    let cap = null; const real = openSheet;
    openSheet = (t, body, mount) => { cap = { body, mount }; };
    try { fn(...args); } finally { openSheet = real; }
    if (!cap) return '<div class="empty">لا توجد بيانات — حدّث برنامج المكتب</div>';
    if (cap.mount) embeds.push(cap.mount);
    return cap.body;
  }
  function mountEmbeds(main) { const list = embeds; embeds = []; bindMoney(main); list.forEach((m) => m(main, main)); }

  const greetNow = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; };
  // تنتظرك: كل شي يحتاج قرارك اليوم — وكل سطر بيه زر يسوّي الشغل مباشرة
  const nm = (v) => `<span class="num">${fmt(v)}</span>`;
  function waiting() {
    const o = OF(); const out = [];
    const D = S.snap.sal?.dueToday;
    if (D && !pendingOf(['sal:pay']).length) out.push({ c: 'var(--gold-2)', b: `رواتب اليوم — ${nm(D.total)}`, s: D.short ? `الصندوق ينقص ${nm(D.short)}` : D.due.map((x) => esc(x.name)).join('، '), go: 'صرف', a: 'sal' });
    (o?.installments || []).filter((x) => x.status === 'overdue').slice(0, 3).forEach((x) => out.push({ c: 'var(--red)', b: `قسط متأخر — ${esc(x.party_name)}`, s: `${nm(x.left)} · من ${x.overdue_days} يوم`, go: 'ذكّره', a: 'contracts' }));
    const open = openTx();
    open.filter((t) => t.stage === 'ready').slice(0, 3).forEach((t) => out.push({ c: 'var(--green)', b: `${esc(t.title)} — جاهزة`, s: `${esc(t.party_name || t.client_name || '')} · بلّغ الزبون`, go: 'فتح', a: `tx:${t.id}` }));
    open.filter((t) => t.late).slice(0, 3).forEach((t) => out.push({ c: 'var(--red)', b: `${esc(t.title)} — متأخرة`, s: `${esc(t.party_name || t.client_name || '')} · ${t.late_days} يوم`, go: 'فتح', a: `tx:${t.id}` }));
    const pend = (o?.pending || []).length;
    if (pend) out.push({ c: 'var(--amber)', b: `${pend} ${pend > 1 ? 'عقود' : 'عقد'} بانتظار التوقيع`, s: 'الزبون يوقّع بإصبعه هنا', go: 'توقيع', a: 'contracts' });
    const exp = (o?.expiries || []).filter((e) => daysTo(e.expires_on) <= 7 && daysTo(e.expires_on) >= -30);
    if (exp.length) out.push({ c: 'var(--amber)', b: `${exp.length} ${exp.length > 1 ? 'تجديدات' : 'تجديد'} خلال أسبوع أو منتهية`, s: exp.slice(0, 2).map((e) => esc(e.title)).join('، '), go: 'تذكير', a: 'expiries' });
    const tasks = (S.snap.tasks || []).filter((t) => t.due_date <= todayStr());
    if (tasks.length) out.push({ c: 'var(--blue)', b: `${tasks.length} ${tasks.length > 1 ? 'أعمال' : 'عمل'} اليوم والمتأخرة`, s: esc(tasks[0].title), go: 'عرض', a: 'tasks' });
    const pAbs = (S.snap.sal?.staff || []).reduce((t, u) => t + (u.pending || []).length, 0);
    if (pAbs && !D) out.push({ c: 'var(--muted)', b: `${pAbs} خصم ينتظر الراتب الجاي`, s: 'غياب / تأخير', go: 'عرض', a: 'abs' });
    return out.slice(0, 6); // أهم 6 بس حتى تبقى الشاشة قصيرة
  }
  function goAction(a) {
    if (a.startsWith('tx:')) return txnSheet(Number(a.slice(3)));
    if (a.startsWith('add:')) return addAction(a.slice(4));
    ({ sal: salPaySheet, contracts: contractsSheet, expiries: expiriesSheet, tasks: tasksSheet, abs: absSheet, activity: activitySheet, cash: () => { S.tab = 'money'; S.fin = 'cash'; render(); } })[a]?.();
  }
  function tabToday() {
    const sn = S.snap; const now = new Date();
    const d = sn.months[Object.keys(sn.months).sort().pop()];
    const tRow = (d?.daily || []).find((x) => x.day === todayStr()) || { cash: 0, qi_card: 0, balance: 0 };
    const tCount = sn.invoices.filter((x) => !x.is_void && x.created_at.slice(0, 10) === todayStr()).length;
    const newDebt = sn.invoices.filter((x) => !x.is_void && x.created_at.slice(0, 10) === todayStr()).reduce((a, x) => a + Math.max(0, x.total_amount - x.paid_amount), 0);
    const box = sn.cashToday ? sn.cashToday.expected : null;
    const W = waiting();
    const emps = (sn.employees || []).filter((e) => e.today.count || e.today.cash || e.today.qi);
    const last = auditList().slice(0, 3);
    return `
      ${title(`${greetNow()}، ${esc((S.user?.full_name || '').split(' ')[0] || '')}`, `${WEEK[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`)}
      ${statusBars()}
      <div class="search">${icon('search', 18)}<input class="input" id="gs" type="search" placeholder="ابحث: عميل، فاتورة، معاملة، هاتف…" value="${esc(S.gq)}" autocomplete="off"></div>
      <div id="gsr">${searchResults()}</div>
      <div class="card hero today" data-go="cash">
        <div class="lbl">دخل اليوم <span>${tCount} فاتورة</span></div>
        <div class="big"><span class="num">${fmt(tRow.cash + tRow.qi_card + (tRow.balance || 0))}</span><small>د.ع</small></div>
        <div class="g3"><div><span>بالصندوق</span><b class="num">${box === null ? '—' : fmt(box)}</b></div><div><span>كي كارد</span><b class="num">${fmt(tRow.qi_card)}</b></div><div><span>ديون جديدة</span><b class="num">${fmt(newDebt)}</b></div></div>
      </div>
      <h2 class="sec">تنتظرك ${W.length ? `<span class="cnt">${W.length}</span>` : ''}</h2>
      <div class="card flush inbox">${W.length ? W.map((w) => `<button class="it" data-go="${w.a}"><span class="bar" style="background:${w.c}"></span><div class="m"><b>${w.b}</b><span>${w.s}</span></div><span class="go">${w.go}</span></button>`).join('') : '<div class="empty">ماكو شي ينتظرك — كلشي ماشي ✓</div>'}</div>
      <div class="qa">${[['inv', 'receipt', 'فاتورة'], ['exp', 'wallet', 'مصروف'], ['debt', 'cash', 'تسديد'], ['req', 'chat', 'متطلبات']].map(([k, i, t]) => `<button class="press" data-go="add:${k}">${icon(i, 22)}<span>${t}</span></button>`).join('')}</div>
      <h2 class="sec">المكتب هسه <button class="more" data-go="activity">كل النشاط</button></h2>
      <div class="card flush">
        ${emps.length ? emps.map((e) => `<div class="item noic"><div class="m"><b>${esc(e.full_name)}</b><span>${e.today.count} فاتورة · كاش ${fmt(e.today.cash)} · كي ${fmt(e.today.qi)}</span></div><div class="e"><b class="num">${fmt(e.today.total)}</b></div></div>`).join('') : '<div class="item noic"><div class="m"><b>ما انقطعت فواتير اليوم بعد</b></div></div>'}
        ${last.map(auditRow).join('')}
      </div>
      <div class="foot-note">آخر مزامنة ${ago(sn.at)}</div>`;
  }

  // بحث واحد: العملاء + الفواتير + المعاملات
  function searchResults() {
    const q = (S.gq || '').trim().toLowerCase();
    if (q.length < 2) return '';
    const has = (t) => String(t || '').toLowerCase().includes(q);
    const cl = S.snap.clients.filter((c) => has(`${c.name} ${c.company || ''} ${c.phone || ''}`)).slice(0, 5);
    const inv = S.snap.invoices.filter((x) => has(`${x.receipt_no} ${x.client_name} ${x.company_name || ''} ${x.client_phone || ''} ${x.service_name}`)).slice(0, 5);
    const tx = (OF()?.txns || []).filter((t) => has(`${t.title} ${t.party_name || ''} ${t.client_name || ''} ${t.receipt_no || ''}`)).slice(0, 5);
    if (!cl.length && !inv.length && !tx.length) return '<div class="card"><div class="empty">ما لكيت شي بهالاسم</div></div>';
    return `${cl.length ? `<h2 class="sec">العملاء</h2><div class="card flush">${cl.map((c) => `<button class="item" data-open="client:${c.id}"><div class="av ${c.balance ? 'red' : 'gray'}">${initial(c.name)}</div><div class="m"><b>${esc(c.name)}</b><span>${esc(c.company || c.phone || '')}</span></div><div class="e">${c.balance ? `<b class="red num">${fmt(c.balance)}</b>` : ''}</div></button>`).join('')}</div>` : ''}
      ${inv.length ? `<h2 class="sec">الفواتير</h2><div class="card flush">${inv.map((x) => `<button class="item noic" data-open="inv:${x.id}"><div class="m"><b class="num">${esc(x.receipt_no)}</b><span>${esc(x.company_name || x.client_name)} · ${esc(x.service_name)}</span></div><div class="e"><b class="num">${fmt(x.total_amount)}</b></div></button>`).join('')}</div>` : ''}
      ${tx.length ? `<h2 class="sec">المعاملات</h2><div class="card flush">${tx.map(txnRow).join('')}</div>` : ''}`;
  }
  function bindSearch(root) { root.querySelectorAll('#gsr [data-tx]').forEach((b) => { b.onclick = () => txnSheet(Number(b.dataset.tx)); }); }

  // ───── المكتب ─────
  function tabOffice() {
    const o = OF(); const open = openTx();
    const segs = [['txns', 'المعاملات'], ['clients', 'العملاء'], ['couriers', 'العهدة'], ['contracts', 'العقود'], ['tasks', 'الجدول']];
    setTimeout(() => bindSeg($app.querySelector('#main'), 'oseg', (v) => { S.oseg = v; paintMain(); }));
    const body = ({
      txns: () => (o ? embed(txnsSheet, S.txf) : '<div class="empty">حدّث برنامج المكتب</div>'),
      clients: () => tabClients(true),
      couriers: () => embed(couriersSheet),
      contracts: () => `${embed(contractsSheet)}<button class="btn btn-ghost btn-block" data-go="expiries">${icon('clock', 17)} التجديدات وتواريخ الانتهاء</button>`,
      tasks: () => embed(tasksSheet),
    })[S.oseg]();
    return `${title('المكتب', `${open.length} مفتوحة · ${open.filter((t) => t.late).length} متأخرة · ${open.filter((t) => t.stage === 'ready').length} جاهزة`, S.oseg === 'clients' ? `<button class="btn btn-ghost btn-sm press" data-act="newClient">${icon('userPlus', 16)} عميل</button>` : '')}
      ${statusBars()}<div class="seg scroll" data-seg="oseg">${segs.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === S.oseg ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  }

  // ───── المزيد: كل الإدارة بمكان واحد ─────
  function tabMore() {
    const sn = S.snap; const me = sn.me; const L = sn.sal;
    const r = (k, i, c, t, sub = '') => `<button class="item" data-more="${k}"><div class="av" style="background:${c}22;color:${c}">${icon(i, 18)}</div><div class="m"><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</div><div class="e">${icon('chevL', 16)}</div></button>`;
    return `${title('المزيد', `${esc(S.user?.full_name || '')} · المدير`)}${statusBars()}
      <h2 class="sec">إلك بس</h2><div class="card flush">
        ${r('me', 'lock', '#e3c37b', 'ماليتي', me ? `يبقى إلك ${fmt(me.left)}${me.officeOwes ? ` · المكتب مدين إلك ${fmt(me.officeOwes)}` : ''}` : '')}
        ${L ? r('dep', 'hand', '#e3c37b', 'حطيت فلوس من عندي', L.owed ? `المكتب مدين إلك ${fmt(L.owed)}` : 'إيداع بالصندوق') : ''}</div>
      ${L ? `<h2 class="sec">الموظفين</h2><div class="card flush">
        ${r('staff', 'users', '#6e98f5', 'الموظفون والصلاحيات', `${(sn.staff || []).filter((u) => u.role !== 'admin').length} موظف`)}
        ${r('sal', 'cash', '#2fc28c', 'صرف الرواتب', L.dueToday ? `اليوم ${fmt(L.dueToday.total)}` : '')}
        ${r('abs', 'clock', '#f5b452', 'الغياب والإجازات', L.staff.reduce((t, u) => t + (u.pending || []).length, 0) ? 'خصومات تنتظر الراتب' : '')}</div>` : ''}
      <h2 class="sec">المكتب</h2><div class="card flush">
        ${r('svc', 'receipt', '#f5b452', 'الخدمات والأسعار', `${(sn.servicesAll || []).length} خدمة`)}
        ${r('guide', 'task', '#6e98f5', 'دليل المتطلبات', `${(sn.guide || []).length} موضوع`)}
        ${r('req', 'chat', '#2fc28c', 'إرسال متطلبات لزبون')}
        ${r('expiries', 'clock', '#f06a80', 'التجديدات')}
        ${r('log', 'clock', '#7f879b', 'سجل النشاط')}</div>
      <h2 class="sec">الآيفون</h2><div class="card flush">
        ${r('notif', 'bell', '#7f879b', 'الإشعارات')}
        ${r('logout', 'logout', '#f06a80', 'تسجيل الخروج')}</div>`;
  }
  function moreAction(k) {
    if (k === 'logout') { if (confirm('تسجيل الخروج؟')) { LS.del('zm-session'); S.user = null; render(); } return; }
    ({ me: meSheet, dep: depositSheet, staff: staffSheet, sal: salPaySheet, abs: absSheet, svc: servicesSheet, guide: guideSheet, req: () => reqSheet(), expiries: expiriesSheet, log: activitySheet, notif: notifSheet })[k]?.();
  }
  const hm12 = (t) => { const h = Number(t.slice(0, 2)); return `${((h + 11) % 12) + 1}:${t.slice(3, 5)} ${h < 12 ? 'ص' : 'م'}`; };
  const REACT = { star: '⭐ ممتاز', thanks: '👍 شكراً', note: '💬 ملاحظة' };
  function taskRow(t) {
    const late = t.due_date < todayStr();
    return `<div class="task">
      <button class="check ${late ? 'late' : ''}" data-act="done" data-v="${t.id}" aria-label="تم">${icon('check', 15)}</button>
      <div class="m" data-open="task:${t.id}"><b>${esc(t.title)}</b>
        <span>${[t.company, t.client_name].filter(Boolean).map(esc).join(' · ')}${t.company || t.client_name ? ' · ' : ''}<span class="${late ? 'red' : ''}" style="display:inline">${dayLabel(t.due_date)}</span>${t.remind_at ? ` · ⏰ ${hm12(t.remind_at)}` : ''}${t.priority ? ` · <span class="${t.priority === 2 ? 'red' : 'amber'}" style="display:inline">${t.priority === 2 ? 'عاجل' : 'مهم'}</span>` : ''} · ${esc(t.assigned_name)}${t.postponed ? ` · أُجّل ${t.postponed}` : ''}</span>${t.sale_receipt ? `<span class="green" style="display:block">✓ مستلم ${fmt(t.sale_paid)}${t.sale_total > t.sale_paid ? ` · متبقي ${fmt(t.sale_total - t.sale_paid)}` : ''}</span>` : ''}</div>
      <button class="later" data-act="later" data-v="${t.id}">تأجيل</button>
    </div>`;
  }

  // ═════════════ الفواتير ═════════════
  function invoiceList() {
    const q = S.q.trim().toLowerCase();
    let rows = S.snap.invoices;
    if (S.invDay && !q) rows = rows.filter((x) => x.created_at.slice(0, 10) === S.invDay);
    if (q) rows = rows.filter((x) => `${x.receipt_no} ${x.client_name} ${x.company_name || ''} ${x.service_name} ${(x.items || []).map((i) => i.name).join(' ')} ${x.client_phone || ''}`.toLowerCase().includes(q));
    rows = rows.slice(0, 250);
    const pend = q ? '' : pendingRows(['sales:create', 'sales:pay', 'sales:void']);
    if (!rows.length) return pend || '<div class="empty">لا توجد فواتير</div>';
    return pend + rows.map((x) => {
      const rem = x.total_amount - x.paid_amount;
      const st = x.is_void ? '<span class="chip red">ملغاة</span>'
        : x.debt_status === 'open' ? `<span class="chip red">متبقي ${fmt(rem)}</span>`
          : x.debt_status === 'settled' ? '<span class="chip green">سُدد</span>'
            : `<span class="chip">${METHOD[x.method] || 'مدفوع'}</span>`;
      return `<button class="item ${x.is_void ? 'void' : ''}" data-open="inv:${x.id}">
          <div class="av ${x.debt_status === 'open' ? 'red' : ''}">${initial(x.company_name || x.client_name)}</div>
          <div class="m"><b>${esc(x.company_name || x.client_name)}</b><span>${x.company_name ? `${esc(x.client_name)} · ` : ''}${esc(x.service_name)} · ${dayTime(x.created_at)}</span></div>
          <div class="e"><b class="num">${fmt(x.total_amount)}</b>${st}</div>
        </button>`;
    }).join('');
  }
  function tabInvoices(inline = false) {
    const days = [...new Set(S.snap.invoices.map((x) => x.created_at.slice(0, 10)))].slice(0, 30);
    const list = S.invDay ? S.snap.invoices.filter((x) => x.created_at.slice(0, 10) === S.invDay && !x.is_void) : null;
    return `
      ${inline ? '' : title('الفواتير', (S.snap.invoiceDays || 90) > 300 ? 'آخر سنة' : 'آخر 90 يوماً', `<button class="btn btn-gold btn-sm press" onclick="window.__zm.newInvoice()">${icon('plus', 16)} فاتورة</button>`)}
      <div class="search">${icon('search', 18)}<input class="input" id="q" type="search" placeholder="الشركة، العميل، الخدمة، رقم الفاتورة" value="${esc(S.q)}"></div>
      <div class="chips">
        <button class="${S.invDay ? '' : 'on'}" data-act="day" data-v="">الكل</button>
        ${days.map((d) => `<button class="${S.invDay === d ? 'on' : ''}" data-act="day" data-v="${d}">${dayLabel(d)}</button>`).join('')}
      </div>
      ${list ? `<div class="kpis">${kpi('فواتير اليوم المحدد', `<span class="num">${list.length}</span>`)}${kpi('مجموعها', money(list.reduce((a, x) => a + x.total_amount, 0)))}</div>` : ''}
      <div class="card flush list" id="invlist">${invoiceList()}</div>`;
  }

  function invoiceSheet(id) {
    const x = S.snap.invoices.find((i) => String(i.id) === String(id));
    if (!x) return;
    const rem = x.total_amount - x.paid_amount;
    const client = x.client_id ? S.snap.clients.find((c) => c.id === x.client_id) : null;
    openSheet(esc(x.receipt_no), `
      <div class="card">
        <div class="kv"><span>العميل</span><b>${esc(x.client_name)}</b></div>
        ${x.company_name ? `<div class="kv"><span>الشركة</span><b>${esc(x.company_name)}</b></div>` : ''}
        ${x.client_phone ? `<div class="kv"><span>الهاتف</span><a class="num" href="tel:${esc(x.client_phone)}">${esc(x.client_phone)}</a></div>` : ''}
        <div class="kv"><span>التاريخ</span><b>${dayTime(x.created_at)}</b></div>
        <div class="kv"><span>أصدرها</span><b>${esc(x.by_name)}</b></div>
        ${x.updated_at ? `<div class="kv"><span>آخر تعديل</span><b>${dayTime(x.updated_at)}</b></div>` : ''}
      </div>
      <div class="card">
        ${(x.items || []).map((i) => `<div class="kv"><span style="color:var(--ink)">${esc(i.name)}${(i.qty || 1) > 1 ? ` <span class="chip gray num">× ${i.qty}</span>` : ''}</span><span>${i.original_price && i.price < i.original_price ? `<s class="muted num">${fmt(i.original_price)}</s> ` : ''}<b class="num">${fmt(i.price)}</b></span></div>`).join('')}
        ${x.discount_total ? `<div class="kv"><span>الخصم</span><b class="amber num">-${fmt(x.discount_total)}</b></div>` : ''}
        <div class="kv"><span>المجموع</span><b class="gold num">${fmt(x.total_amount)}</b></div>
        <div class="kv"><span>المدفوع</span><b class="num">${fmt(x.paid_amount)}</b></div>
        ${rem > 0 && !x.is_void ? `<div class="kv"><span>المتبقي</span><b class="red num">${fmt(rem)}</b></div>` : ''}
        ${x.notes ? `<div class="kv"><span>ملاحظات</span><span>${esc(x.notes)}</span></div>` : ''}
      </div>
      ${(x.payments || []).length ? `<h2 class="sec" style="margin:0 4px">تفاصيل التسديد</h2><div class="card flush">${x.payments.map((p) => `<div class="item noic"><div class="m"><b>${METHOD[p.method] || p.method} · ${({ initial: 'عند الإصدار', partial: 'دفعة', settlement: 'تسديد الدين', offset: 'من رصيده' })[p.kind] || ''}</b><span>${dayTime(p.created_at)} · استلمها ${esc(p.by_name)}</span></div><div class="e"><b class="green num">${fmt(p.amount)}</b>${!x.is_void && x.client_id && p.method !== 'balance' && p.id ? `<button class="chip amber" data-undo="${p.id}">${icon('undo', 12)} تراجع</button>` : ''}</div></div>`).join('')}</div>` : '<div class="note">لم يُدفع أي مبلغ بعد (آجل)</div>'}
      ${(() => { const h = (S.snap.audit || []).filter((a) => a.entity === 'sale' && a.entity_id === x.id); return h.length ? `<h2 class="sec" style="margin:0 4px">سجل الفاتورة</h2><div class="card flush">${h.map(auditRow).join('')}</div>` : ''; })()}
      ${x.is_void ? '<div class="alert">هذه الفاتورة ملغاة</div>' : `
      ${rem > 0 ? `<button class="btn btn-gold btn-block" id="pay">${icon('cash', 18)} تسجيل دفعة / تسديد</button>` : ''}
      ${x.is_swap ? '<div class="note">دين «كي كارد مقابل كاش» — يُسدَّد مثل أي دين، ولا يُحسب دخلاً</div>' : `<button class="btn btn-ghost btn-block" id="swp">${icon('card', 17)} كي كارد مقابل كاش لهذه الفاتورة</button>
      <div class="grid2"><button class="btn btn-ghost btn-block" id="edit">${icon('edit', 17)} تعديل</button><button class="btn btn-ghost btn-block" id="void">إلغاء الفاتورة</button></div>`}`}
      <button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف الفاتورة نهائياً</button>`, (sb) => {
      bindAudit(sb);
      sb.querySelectorAll('[data-undo]').forEach((b) => {
        b.onclick = () => {
          const p = x.payments.find((y) => String(y.id) === b.dataset.undo);
          const reason = prompt(`التراجع عن ${fmt(p.amount)} د.ع — يرجع ديناً على ${x.company_name || x.client_name}.\nاكتب السبب:`);
          if (reason && reason.trim()) sendOp('payments:undo', { id: p.id, reason: reason.trim() }, `تراجع عن ${fmt(p.amount)} على ${x.receipt_no}`);
        };
      });
      sb.querySelector('#edit')?.addEventListener('click', () => invoiceEditSheet(x));
      sb.querySelector('#swp')?.addEventListener('click', () => swapSheet(x));
      sb.querySelector('#del')?.addEventListener('click', () => {
        const reason = prompt(`حذف الفاتورة ${x.receipt_no} نهائياً؟ اكتب السبب:`);
        if (reason && reason.trim()) sendOp('sales:delete', { ids: [x.id], renumber: false, reason: reason.trim() }, `حذف ${x.receipt_no}`);
      });
      sb.querySelector('#pay')?.addEventListener('click', () => paySheet(x, client));
      sb.querySelector('#void')?.addEventListener('click', () => {
        const reason = prompt('سبب إلغاء الفاتورة؟');
        if (reason && reason.trim()) sendOp('sales:void', { id: x.id, reason: reason.trim() }, `إلغاء ${x.receipt_no}`);
      });
    });
  }

  // ═════════════ تعديل فاتورة صادرة (المدير) ═════════════
  function invoiceEditSheet(x) {
    const sn = S.snap;
    let n = 0;
    const st = { lines: (x.items || []).map((i) => { const q = i.qty || 1; return { k: ++n, id: i.id, service_id: i.service_id, name: i.name, price: Math.round(i.price / q), qty: q }; }) };
    const walk = !x.client_id;
    openSheet(`تعديل ${esc(x.receipt_no)}`, `
      <div id="elines" style="display:flex;flex-direction:column;gap:8px"></div>
      <select class="input" id="eadd"><option value="">+ إضافة خدمة…</option>${sn.services.map((v) => `<option value="${v.id}">${esc(v.name)}${v.default_price ? ` — ${fmt(v.default_price)}` : ''}</option>`).join('')}<option value="custom">خدمة أخرى</option></select>
      ${walk ? `<input class="input" name="cname" placeholder="اسم الزبون" value="${esc(x.client_name === 'زبون مباشر' ? '' : x.client_name)}">` : ''}
      <div class="grid2"><input class="input" name="company" placeholder="الشركة" value="${esc(x.company_name || '')}"><input class="input" name="phone" inputmode="tel" placeholder="الهاتف" value="${esc(x.client_phone || '')}"></div>
      <input class="input" name="notes" placeholder="ملاحظات" value="${esc(x.notes || '')}">
      <input class="input" name="reason" placeholder="سبب التعديل (اختياري)">
      <div class="total-bar"><span class="ink2">المجموع الجديد</span><b class="num" id="etot">0</b></div>
      <div id="epay"></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ التعديل</button>`, (sb) => {
      const total = () => st.lines.reduce((a, l) => a + (l.price || 0) * (l.qty || 1), 0);
      const paint = () => {
        sb.querySelector('#elines').innerHTML = st.lines.map((l) => `<div class="line two">${l.service_id ? `<div class="n">${esc(l.name)}</div>` : `<input class="input n" style="height:42px;font-size:15px" data-name="${l.k}" placeholder="اسم الخدمة" value="${esc(l.name)}">`}
          <span class="qty"><button type="button" data-dec="${l.k}">−</button><b class="num">${l.qty}</b><button type="button" data-inc="${l.k}">+</button></span>
          <input class="p" inputmode="numeric" data-price="${l.k}" value="${l.price ? fmt(l.price) : ''}" placeholder="0"><button class="x" data-rm="${l.k}">${icon('x', 15)}</button></div>`).join('');
        const L = (k) => st.lines.find((l) => l.k === Number(k));
        sb.querySelectorAll('[data-price]').forEach((el) => { el.oninput = () => { const v = parseMoney(el.value); el.value = v ? fmt(v) : ''; L(el.dataset.price).price = v; paintT(); }; });
        sb.querySelectorAll('[data-name]').forEach((el) => { el.oninput = () => { L(el.dataset.name).name = el.value; }; });
        sb.querySelectorAll('[data-inc]').forEach((el) => { el.onclick = () => { const l = L(el.dataset.inc); l.qty = Math.min(999, l.qty + 1); paint(); }; });
        sb.querySelectorAll('[data-dec]').forEach((el) => { el.onclick = () => { const l = L(el.dataset.dec); l.qty = Math.max(1, l.qty - 1); paint(); }; });
        sb.querySelectorAll('[data-rm]').forEach((el) => { el.onclick = () => { if (st.lines.length > 1) { st.lines = st.lines.filter((l) => l.k !== Number(el.dataset.rm)); paint(); } }; });
        paintT();
      };
      const paintT = () => {
        const t = total(); sb.querySelector('#etot').textContent = fmt(t);
        const extra = t - x.paid_amount;
        const box = sb.querySelector('#epay');
        if (walk && extra > 0) {
          if (!box.dataset.on) { box.dataset.on = 1; box.innerHTML = `<div class="note">زبون مباشر: الفرق <b class="num" id="ediff"></b> يُدفع الآن</div>${seg('epm', [['cash', 'كاش'], ['qi_card', 'كي كارد']], 'cash')}`; st.pm = bindSeg(box, 'epm'); }
          box.querySelector('#ediff').textContent = fmt(extra);
        } else { box.dataset.on = ''; box.innerHTML = extra < 0 ? `<div class="note red">المجموع الجديد أقل من المدفوع (${fmt(x.paid_amount)})</div>` : ''; }
      };
      sb.querySelector('#eadd').onchange = (e) => {
        const v = e.target.value; e.target.value = '';
        if (v === 'custom') st.lines.push({ k: ++n, service_id: null, name: '', price: 0, qty: 1 });
        else if (v) { const sv = sn.services.find((y) => String(y.id) === v); st.lines.push({ k: ++n, service_id: sv.id, name: sv.name, price: sv.default_price, qty: 1 }); }
        paint();
      };
      paint();
      sb.querySelector('#ok').onclick = () => {
        if (st.lines.some((l) => !l.price || !(l.name || '').trim())) return toast('أكمل اسم ومبلغ كل خدمة', true);
        const t = total();
        if (t < x.paid_amount) return toast('المجموع أقل من المبلغ المدفوع', true);
        const payload = {
          id: x.id, items: st.lines.map((l) => ({ id: l.id, service_id: l.service_id, name: l.name.trim(), price: l.price, qty: l.qty })),
          company_name: val(sb, 'company'), customer_phone: val(sb, 'phone'), notes: val(sb, 'notes'), reason: val(sb, 'reason') || null,
        };
        if (walk) payload.customer_name = val(sb, 'cname');
        if (walk && t > x.paid_amount) payload.pay_now = { amount: t - x.paid_amount, method: st.pm?.() || 'cash' };
        sendOp('sales:update', payload, `تعديل ${x.receipt_no} — ${fmt(t)}`);
      };
    });
  }


  // ═════════════ متطلبات التقديم: رسالة جاهزة بالأوراق المطلوبة لأي زبون (حتى غير مسجّل) ═════════════
  // نفس منطق src/lib/reqs.js (برنامج الحاسبة)
  const RQ_LINE = '━━━━━━━━━━━━━━';
  const RQ_ICONS = ['🏢', '🧾', '📑', '🗂️', '📌', '🏛️'];
  const RQ_NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

  // الملاحظات: كل جملة مفصولة بسطر جديد أو · ← نقطة مستقلة
  const splitNotes = (t) => String(t || '').split(/\n|·|•/).map((x) => x.trim()).filter(Boolean);

  function reqTextFull(topics, { name = '', office = '', phone = '', address = '', style = 'sections' } = {}) {
    const S = topics.map((s) => ({
      name: s.title,
      must: (s.docs || []).filter((d) => !d.optional).map((d) => d.name),
      opt: (s.docs || []).filter((d) => d.optional).map((d) => d.name),
      steps: (s.steps || []).map((x) => x.text).filter(Boolean),
      notes: splitNotes(s.notes), platform: s.platform || '', link: s.link || '', duration: s.duration || '',
    }));
    if (!S.length) return '';
    const multi = S.length > 1;
    // الأوراق المشتركة: موجودة بموضوعين أو أكثر من المختارة
    const count = new Map();
    S.forEach((s) => new Set(s.must).forEach((d) => count.set(d, (count.get(d) || 0) + 1)));
    const shared = multi ? [...count.keys()].filter((d) => count.get(d) > 1) : [];
    const notes = [...new Set(S.flatMap((s) => s.notes))];
    const plats = S.filter((s) => s.platform || s.link).map((s) => ({ p: s.platform, l: s.link, svc: s.name }));
    const sign = [`_${office || 'المكتب'}_`, [address && `📍 ${address}`, phone && `📞 ${phone}`].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
    const stepsOf = (s) => s.steps.map((x, i) => `${RQ_NUM[i] || `${i + 1}.`} ${x}`).join('\n');
    const out = [`السلام عليكم${name ? ` ${name}` : ''} 🌿`];

    if (style === 'checklist') {
      const lines = [`✅ *قائمة تجهيز: ${S.map((s) => s.name).join(' + ')}*`, 'أشّر على كل ورقة تجهّزها 👇'];
      const all = [...new Set(S.flatMap((s) => s.must))];
      const opts = [...new Set(S.flatMap((s) => s.opt))].filter((d) => !all.includes(d));
      lines.push('', ...all.map((d) => `☐ ${d}`), ...opts.map((d) => `☐ ${d} _(إن وُجدت)_`));
      if (!all.length && !opts.length) lines.push('', '☐ نتواصل معك لتحديد الأوراق المطلوبة');
      out.push(lines.join('\n'));
      if (notes.length) out.push(`💡 *انتبه:* ${notes.join('، ')}.`);
      if (plats.length) out.push(`🌐 نقدّمها على: ${plats.map((x) => x.p || x.l).join('، ')}`);
      out.push('📤 صوّرها وأرسلها هنا — ونبلّغك أول ما تخلص.');
      out.push(sign);
      return out.join('\n\n');
    }

    // ── أقسام مرتّبة ──
    out[0] += `\n${multi ? `متطلبات *${S.length === 2 ? 'معاملتين' : `${S.length} معاملات`}* لدى *${office || 'المكتب'}*` : `هذه متطلبات معاملتكم لدى *${office || 'المكتب'}*`}`;
    let n = 0;
    const num = (d) => `${++n}. ${d}`;
    if (!multi) {
      const s = S[0];
      out.push(`${RQ_LINE}\n📋 *${s.name}*${s.duration ? `\n⏱️ المدة التقريبية: ${s.duration}` : ''}\n${RQ_LINE}`);
      out.push(s.must.length ? `*📄 الأوراق المطلوبة:*\n${s.must.map(num).join('\n')}` : '*📄 الأوراق المطلوبة:*\nنتواصل معك لتحديدها حسب حالتك');
      if (s.opt.length) out.push(`*📎 إن وُجدت / عند الحاجة:*\n${s.opt.map((d) => `▫️ ${d}`).join('\n')}`);
      if (s.steps.length) out.push(`*🧭 خطوات الإجراء:*\n${stepsOf(s)}`);
    } else {
      if (shared.length) out.push(`*📄 أوراق مشتركة (مرة وحدة تكفي):*\n${shared.map(num).join('\n')}`);
      S.forEach((s, i) => {
        const own = s.must.filter((d) => !shared.includes(d));
        const lines = [`*${RQ_ICONS[i % RQ_ICONS.length]} ${s.name}${shared.length ? ' — تضيف' : ''}:*`];
        if (s.duration) lines.push(`⏱️ ${s.duration}`);
        if (own.length) lines.push(...own.map(num));
        else if (!s.must.length) lines.push('▫️ نتواصل معك لتحديد الأوراق');
        else lines.push('▫️ ما تحتاج أوراق إضافية');
        if (s.opt.length) lines.push(`▫️ _إن وُجدت:_ ${s.opt.join('، ')}`);
        if (s.steps.length) lines.push(`🧭 الخطوات: ${s.steps.join(' ← ')}`);
        out.push(lines.join('\n'));
      });
    }
    if (notes.length) out.push(`*⚠️ ملاحظات مهمة:*\n${notes.map((x) => `▫️ ${x}`).join('\n')}`);
    if (plats.length) {
      out.push(`*🌐 التقديم إلكترونياً:*\n${plats.length === 1 && !multi
        ? [plats[0].p, plats[0].l].filter(Boolean).join('\n')
        : plats.map((x) => `▫️ ${x.p || x.svc}${x.l ? `\n${x.l}` : ''}`).join('\n')}`);
    }
    out.push('*📤 طريقة الإرسال:*\nصوّر كل ورقة بوضوح (صورة واضحة أو PDF) وأرسلها هنا، ونقدّمها إلكترونياً ونبلّغك بكل مرحلة.');
    out.push(`${RQ_LINE}\n${sign}`);
    return out.join('\n\n');
  }

  // عرض نص واتساب (*غامق* و _مائل_) داخل فقاعة المعاينة
  function waHtmlR(t) {
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>').replace(/(https?:\/\/\S+)/g, '<span class="lnk">$1</span>');
  }
  const reqText = (list, name, style) => reqTextFull(list, { name, office: S.snap.office?.name, phone: S.snap.office?.phone, address: S.snap.office?.address, style });

  function reqSheet(pre = []) {
    const all = S.snap.guide || [];
    if (!all.length) return toast('أضف مواضيع بـ«دليل المتطلبات» من برنامج المكتب أو من الإدارة', true);
    const sel = new Set(pre);
    openSheet('إرسال متطلبات للزبون', `
      <div class="search">${icon('search', 18)}<input class="input" id="rq" type="search" placeholder="ابحث عن موضوع"></div>
      <div class="card flush" id="rlist" style="max-height:300px;overflow-y:auto"></div>
      <div class="grid2"><div class="field"><label>اسم الزبون (اختياري)</label><input class="input" name="nm"></div><div class="field"><label>رقمه (اختياري)</label><input class="input ltr" name="ph" inputmode="tel" placeholder="07xx"></div></div>
      ${seg('st', [['sections', 'أقسام مرتّبة'], ['checklist', 'قائمة تجهيز ☐']], LS.get('zm-req-style') === 'checklist' ? 'checklist' : 'sections')}
      <h2 class="sec" style="margin:0 4px">هكذا توصل للزبون <button class="more" id="ed">تعديل النص</button></h2>
      <div class="wa-prev"><div class="wa-bub" id="bub"><span class="muted">اختر خدمة…</span></div><textarea class="input" name="tx" hidden></textarea></div>
      <div class="grid2"><button class="btn btn-gold" id="wa">${icon('chat', 17)} واتساب</button><button class="btn btn-ghost" id="sh">مشاركة / نسخ</button></div>
      <div class="foot-note">المواضيع تُكتب من «الإدارة ← دليل المتطلبات»</div>`, (sb) => {
      const tx = sb.querySelector('[name=tx]'); const bub = sb.querySelector('#bub'); let edited = false;
      let st = LS.get('zm-req-style') === 'checklist' ? 'checklist' : 'sections';
      bindSeg(sb, 'st', (v) => { st = v; LS.set('zm-req-style', v); edited = false; build(); });
      const show = () => { bub.innerHTML = tx.value.trim() ? waHtmlR(tx.value) : '<span class="muted">اختر خدمة…</span>'; };
      const build = () => { if (edited) return; tx.value = sel.size ? reqText(all.filter((s) => sel.has(s.id)), val(sb, 'nm'), st) : ''; show(); };
      sb.querySelector('#ed').onclick = () => { const on = tx.hidden; tx.hidden = !on; bub.hidden = on; sb.querySelector('#ed').textContent = on ? 'معاينة' : 'تعديل النص'; if (!on) show(); };
      const paint = () => {
        const q = (sb.querySelector('#rq').value || '').trim();
        sb.querySelector('#rlist').innerHTML = all.filter((s) => !q || `${s.title} ${s.category || ''}`.includes(q)).map((s) => `<label class="item noic dk"><input type="checkbox" data-s="${s.id}" ${sel.has(s.id) ? 'checked' : ''}><div class="m"><b>${esc(s.title)}</b><span>${esc(s.category || 'أخرى')} · ${(s.docs || []).length} أوراق${(s.steps || []).length ? ` · ${s.steps.length} خطوات` : ''}</span></div></label>`).join('');
        sb.querySelectorAll('[data-s]').forEach((c) => { c.onchange = () => { const id = Number(c.dataset.s); if (c.checked) sel.add(id); else sel.delete(id); edited = false; build(); }; });
      };
      sb.querySelector('#rq').oninput = paint;
      sb.querySelector('[name=nm]').oninput = () => { edited = false; build(); };
      tx.oninput = () => { edited = true; };
      paint(); build();
      sb.querySelector('#wa').onclick = () => {
        if (!tx.value.trim()) return toast('اختر خدمة', true);
        const ph = val(sb, 'ph');
        const url = ph ? waLink(ph, tx.value) : `https://wa.me/?text=${encodeURIComponent(tx.value)}`;
        if (!url) return toast('رقم الهاتف غير صحيح', true);
        window.open(url, '_blank');
      };
      sb.querySelector('#sh').onclick = async () => {
        if (!tx.value.trim()) return toast('اختر خدمة', true);
        try { if (navigator.share) await navigator.share({ text: tx.value }); else { await navigator.clipboard.writeText(tx.value); toast('تم النسخ'); } } catch { /* أُلغيت المشاركة */ }
      };
    });
  }


  // ───── دليل المتطلبات (الإدارة) ─────
  function guideSheet() {
    const list = S.snap.guide || [];
    const cats = [...new Set(list.map((t) => t.category || 'أخرى'))];
    openSheet('دليل المتطلبات', `
      <div class="grid2"><button class="btn btn-gold" id="nw">${icon('plus', 17)} موضوع</button><button class="btn btn-ghost" id="sd">${icon('chat', 17)} إرسال لزبون</button></div>
      ${pendingRows(['guide:save', 'guide:delete'])}
      ${cats.map((c) => `<h2 class="sec" style="margin:0 4px">${esc(c)}</h2><div class="card flush">${list.filter((t) => (t.category || 'أخرى') === c).map((t) => `<button class="item noic" data-t="${t.id}"><div class="m"><b>${esc(t.title)}</b><span>${t.docs.length} أوراق${t.steps.length ? ` · ${t.steps.length} خطوات` : ''}${t.duration ? ` · ${esc(t.duration)}` : ''}</span></div></button>`).join('')}</div>`).join('') || '<div class="empty">لا توجد مواضيع بعد</div>'}`, (sb) => {
      sb.querySelector('#nw').onclick = () => topicSheet();
      sb.querySelector('#sd').onclick = () => reqSheet();
      sb.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => topicSheet(Number(b.dataset.t)); });
    });
  }
  function topicSheet(id) {
    const t = id ? (S.snap.guide || []).find((x) => x.id === id) : null;
    const lines = (a) => esc(a.join('\n'));
    openSheet(t ? 'تعديل موضوع' : 'موضوع جديد', `
      <div class="field"><label>العنوان</label><input class="input" name="ti" value="${esc(t?.title || '')}" placeholder="مثال: تقديم الحسابات الختامية للهيئة"></div>
      <div class="grid2"><div class="field"><label>القسم</label><input class="input" name="ca" value="${esc(t?.category || '')}"></div><div class="field"><label>المدة التقريبية</label><input class="input" name="du" value="${esc(t?.duration || '')}"></div></div>
      <div class="field"><label>الأوراق (كل ورقة بسطر — اكتب «اختياري:» قبل الاختيارية)</label><textarea class="input" name="dc" rows="6" style="height:auto;line-height:1.7;padding-top:10px">${lines((t?.docs || []).map((d) => `${d.optional ? 'اختياري: ' : ''}${d.name}`))}</textarea></div>
      <div class="field"><label>خطوات الإجراء (كل خطوة بسطر — والشرح بعد «:»)</label><textarea class="input" name="st" rows="5" style="height:auto;line-height:1.7;padding-top:10px">${lines((t?.steps || []).map((x) => `${x.text}${x.note ? `: ${x.note}` : ''}`))}</textarea></div>
      <div class="field"><label>ملاحظات (كل ملاحظة بسطر)</label><textarea class="input" name="no" rows="3" style="height:auto;line-height:1.7;padding-top:10px">${esc(t?.notes || '')}</textarea></div>
      <div class="grid2"><div class="field"><label>المنصة</label><input class="input" name="pl" value="${esc(t?.platform || '')}"></div><div class="field"><label>رابطها</label><input class="input ltr" name="ln" value="${esc(t?.link || '')}" placeholder="https://"></div></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ</button>
      ${t ? `<button class="btn btn-ghost btn-block" id="sd">${icon('chat', 17)} إرسال للزبون</button><button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف</button>` : ''}`, (sb) => {
      const L = (n) => (sb.querySelector(`[name=${n}]`).value || '').split('\n').map((x) => x.trim()).filter(Boolean);
      sb.querySelector('#ok').onclick = () => {
        const title = val(sb, 'ti'); if (!title) return toast('اكتب العنوان', true);
        const link = val(sb, 'ln'); if (link && !/^https?:\/\//i.test(link)) return toast('الرابط يجب أن يبدأ بـ https://', true);
        const docs = L('dc').map((l) => (/^اختياري\s*[:：]/.test(l) ? { name: l.replace(/^اختياري\s*[:：]\s*/, ''), optional: true } : { name: l, optional: false }));
        const steps = L('st').map((l) => { const i = l.indexOf(':'); return i > 0 ? { text: l.slice(0, i).trim(), note: l.slice(i + 1).trim() } : { text: l, note: '' }; });
        sendOp('guide:save', { id: t?.id, title, category: val(sb, 'ca'), duration: val(sb, 'du'), docs, steps, notes: sb.querySelector('[name=no]').value.trim(), platform: val(sb, 'pl'), link }, `${t ? 'تعديل' : 'إضافة'} موضوع: ${title}`);
      };
      sb.querySelector('#sd')?.addEventListener('click', () => reqSheet([t.id]));
      sb.querySelector('#del')?.addEventListener('click', () => { if (confirm(`حذف «${t.title}»؟`)) sendOp('guide:delete', { id: t.id }, `حذف موضوع: ${t.title}`); });
    });
  }

  // ═════════════ دورة المعاملة: المعاملات، عهدة المحامين والأشخاص، العقود والأقساط، التجديدات ═════════════
  const OF = () => S.snap?.ofc || null;
  const STG = [['docs', 'بانتظار الأوراق'], ['office', 'قيد الإنجاز'], ['courier', 'عند المحامي'], ['ready', 'جاهزة'], ['delivered', 'سُلّمت']];
  const STL = { docs: 'بانتظار الأوراق', office: 'قيد الإنجاز بالمكتب', courier: 'عند المحامي / الدائرة', ready: 'جاهزة للتسليم', delivered: 'سُلّمت', cancelled: 'ملغاة' };
  const daysTo = (d) => Math.round((new Date(`${d}T12:00:00`) - new Date(`${todayStr()}T12:00:00`)) / 86400000);
  const openTx = () => (OF()?.txns || []).filter((t) => ['docs', 'office', 'courier', 'ready'].includes(t.stage));

  // بطاقات المكتب في الرئيسية
  function bindOffice(root) {
    root.querySelectorAll('[data-ofc]').forEach((b) => { b.onclick = () => ({ txns: txnsSheet, couriers: couriersSheet, contracts: contractsSheet, expiries: expiriesSheet, sal: salPaySheet, dep: depositSheet, owes: owesSheet, abs: absSheet })[b.dataset.ofc](); });
  }

  // ───── المعاملات ─────
  function txnRow(t) {
    const chips = [];
    if (t.stage === 'docs' && t.missing) chips.push(`<span class="chip amber">ناقص ${t.missing}</span>`);
    if (t.courier_name) chips.push(`<span class="chip gold">${esc(t.courier_name)}</span>`);
    if (t.late) chips.push(`<span class="chip red">متأخرة ${t.late_days} يوم</span>`);
    if (t.remaining > 0 && (t.stage === 'ready' || t.stage === 'delivered')) chips.push(`<span class="chip red">دين ${fmt(t.remaining)}</span>`);
    return `<button class="item noic" data-tx="${t.id}"><div class="m"><b>${esc(t.title)}</b><span>${esc(t.party_name || t.client_name || '—')} · ${STL[t.stage]}</span>${chips.length ? `<div class="tx-chips">${chips.join('')}</div>` : ''}</div></button>`;
  }
  function txnsSheet(filter = 'open') {
    const all = OF()?.txns || [];
    const sets = { open: openTx(), missing: openTx().filter((t) => t.missing > 0), late: openTx().filter((t) => t.late), ready: all.filter((t) => t.stage === 'ready'), done: all.filter((t) => t.stage === 'delivered' || t.stage === 'cancelled') };
    const list = sets[filter] || [];
    openSheet('المعاملات', `
      <div class="chips wrap">${[['open', `مفتوحة ${sets.open.length}`], ['missing', `ناقصها أوراق ${sets.missing.length}`], ['late', `متأخرة ${sets.late.length}`], ['ready', `جاهزة ${sets.ready.length}`], ['done', 'المنتهية']].map(([k, l]) => `<button class="${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      ${pendingRows(['txn:stage', 'txn:update', 'txn:note']).length ? `<div class="card flush">${pendingRows(['txn:stage', 'txn:update', 'txn:note'])}</div>` : ''}
      <div class="card flush list">${list.map(txnRow).join('') || '<div class="empty">لا توجد معاملات</div>'}</div>`, (sb) => {
      sb.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { if (S.tab === 'office' && !sheetEl) { S.txf = b.dataset.f; paintMain(); } else txnsSheet(b.dataset.f); }; });
      sb.querySelectorAll('[data-tx]').forEach((b) => { b.onclick = () => txnSheet(Number(b.dataset.tx)); });
    });
  }
  function txnSheet(id) {
    const t = (OF()?.txns || []).find((x) => x.id === id);
    if (!t) return;
    const idx = STG.findIndex(([k]) => k === t.stage);
    const docs = (t.docs || []).map((d) => ({ ...d }));
    const office = S.snap.office?.name || 'المكتب';
    const waMsg = `السلام عليكم ${t.client_name || t.party_name || ''}،\nبخصوص معاملة ${t.title}${t.receipt_no ? ` (فاتورة ${t.receipt_no})` : ''} لدى ${office}:\n${({ docs: t.missing ? `باقي علينا من الأوراق:\n${docs.filter((d) => !d.got && !d.optional).map((d) => `• ${d.name}`).join('\n')}\nنرجو جلبها بأقرب وقت.` : 'استلمنا أوراقكم وباشرنا بالمعاملة.', office: 'معاملتكم قيد الإنجاز في المكتب.', courier: 'معاملتكم الآن لدى الدائرة المختصة.', ready: 'معاملتكم جاهزة للتسليم — تفضلوا بمراجعة المكتب.', delivered: 'تم تسليم المعاملة. شكراً لثقتكم.' })[t.stage] || ''}`;
    const wa = t.client_phone ? waLink(t.client_phone, waMsg) : '';
    openSheet(esc(t.title), `
      <div class="card">
        <div class="kv"><span>الجهة</span><b>${esc(t.party_name || t.client_name || '—')}</b></div>
        ${t.receipt_no ? `<div class="kv"><span>الفاتورة</span><b class="num">${esc(t.receipt_no)}</b></div>` : ''}
        ${t.total !== undefined && t.sale_id ? `<div class="kv"><span>المبلغ / المدفوع</span><b class="num">${fmt(t.total)} / ${fmt(t.paid)}</b></div>` : ''}
        ${t.remaining > 0 ? `<div class="kv"><span>الباقي دين</span><b class="red num">${fmt(t.remaining)}</b></div>` : ''}
        ${t.courier_name ? `<div class="kv"><span>المحامي / الشخص</span><b>${esc(t.courier_name)}</b></div>` : ''}
        ${t.due_date ? `<div class="kv"><span>الموعد المتوقع</span><b class="${t.late ? 'red' : ''}">${dayLabel(t.due_date)}${t.late ? ` (متأخرة ${t.late_days} يوم)` : ''}</b></div>` : ''}
        <div class="kv"><span>فُتحت</span><b>${dayTime(t.created_at)}</b></div>
      </div>
      ${t.stage === 'cancelled' ? `<div class="alert">ملغاة — ${esc(t.cancel_info?.reason || '')}</div>` : `
      <h2 class="sec" style="margin:0 4px">المرحلة</h2>
      <div class="stg">${STG.map(([k, l], i) => `<button data-st="${k}" class="${i < idx ? 'done' : i === idx ? 'cur' : ''}"><i>${i < idx ? icon('check', 13) : i + 1}</i>${l}</button>`).join('')}</div>`}
      ${docs.length ? `<h2 class="sec" style="margin:0 4px">الأوراق — ${docs.filter((d) => d.got).length} من ${docs.length}</h2>
      <div class="card flush">${docs.map((d, i) => `<label class="item noic dk"><input type="checkbox" data-dk="${i}" ${d.got ? 'checked' : ''}><div class="m"><b>${esc(d.name)}</b>${d.optional ? '<span>اختياري</span>' : ''}</div></label>`).join('')}</div>
      <button class="btn btn-ghost btn-block" id="svd" hidden>${icon('check', 17)} حفظ الأوراق</button>` : ''}
      ${wa ? `<a class="btn btn-ghost btn-block" href="${wa}" target="_blank" rel="noopener">${icon('chat', 17)} إبلاغ الزبون بالمرحلة (واتساب)</a>` : ''}
      ${(t.events || []).length ? `<h2 class="sec" style="margin:0 4px">السجل</h2><div class="card flush">${t.events.map((e) => `<div class="item noic"><div class="m"><b style="white-space:normal">${esc(e.text)}</b><span>${dayTime(e.created_at)} · ${esc(e.by_name || '')}</span></div></div>`).join('')}</div>` : ''}
      <div class="field"><label>ملاحظة</label><input class="input" name="note" placeholder="اكتب ملاحظة…"></div>
      <button class="btn btn-ghost btn-block" id="nt">إضافة الملاحظة</button>`, (sb) => {
      sb.querySelectorAll('[data-st]').forEach((b) => {
        b.onclick = () => { const st = b.dataset.st; if (st === t.stage) return; if (confirm(`نقل المعاملة إلى: ${STL[st]}؟`)) sendOp('txn:stage', { id: t.id, stage: st }, `${t.title} ← ${STL[st]}`); };
      });
      const svd = sb.querySelector('#svd');
      sb.querySelectorAll('[data-dk]').forEach((c) => { c.onchange = () => { docs[Number(c.dataset.dk)].got = c.checked; if (svd) svd.hidden = false; }; });
      if (svd) svd.onclick = () => sendOp('txn:update', { id: t.id, docs }, `أوراق: ${t.title}`);
      sb.querySelector('#nt').onclick = () => { const n = val(sb, 'note'); if (!n) return toast('اكتب الملاحظة', true); sendOp('txn:note', { id: t.id, text: n }, `ملاحظة: ${t.title}`); };
    });
  }

  // ───── عهدة المحامين والأشخاص ─────
  function couriersSheet() {
    const c = OF()?.couriers; if (!c) return;
    openSheet('عهدة المحامين والأشخاص', `
      <div class="card hero"><div class="lbl">لسه عند المحامين والأشخاص</div><div class="big"><span class="num">${fmt(c.totals.open)}</span><small>د.ع</small></div>
        <div class="split"><div><span>اليوم: عهدة</span><b class="num">${fmt(c.today.given)}</b></div><div><span>اليوم: رجع للصندوق</span><b class="num">${fmt(c.today.returned)}</b></div></div></div>
      ${pendingRows(['courier:move']).length ? `<div class="card flush">${pendingRows(['courier:move'])}</div>` : ''}
      <div class="card flush list">${c.rows.filter((k) => k.is_active || k.balance).map((k) => `<button class="item" data-k="${k.id}"><div class="av ${k.balance > 0 ? 'amber' : k.balance < 0 ? 'red' : 'green'}">${initial(k.name)}</div><div class="m"><b>${esc(k.name)}</b><span>${k.kind ? `${esc(k.kind)} · ` : ''}${k.open_txns ? `${k.open_txns} معاملة مفتوحة` : 'لا معاملات مفتوحة'}</span></div><div class="e"><b class="num ${k.balance > 0 ? 'amber' : k.balance < 0 ? 'red' : 'green'}">${fmt(Math.abs(k.balance))}</b><span class="chip">${k.balance > 0 ? 'عنده' : k.balance < 0 ? 'له' : 'مسوّى'}</span></div></button>`).join('') || '<div class="empty">أضف المحامين والأشخاص من برنامج المكتب</div>'}</div>
      <div class="foot-note">العهدة من الصندوق أو من خارجه (تختار كل مرة)، والوصولات تنسجّل مصروف رسوم على المعاملة</div>`, (sb) => {
      sb.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => courierSheet(Number(b.dataset.k)); });
    });
  }
  function courierSheet(id) {
    const k = OF()?.couriers?.rows.find((x) => x.id === id); if (!k) return;
    const KL = { give: 'عهدة', receipt: 'وصل رسوم', return: 'إرجاع' };
    openSheet(esc(k.name), `
      <div class="kpis">${kpi(k.balance >= 0 ? 'باقي عنده' : 'له على المكتب', `<span class="${k.balance > 0 ? 'amber' : k.balance < 0 ? 'red' : 'green'}">${money(Math.abs(k.balance))}</span>`, '', 'wide')}</div>
      <div class="grid2"><button class="btn btn-gold" data-mv="give">${icon('plus', 17)} عهدة</button><button class="btn btn-ghost" data-mv="receipt">${icon('receipt', 17)} وصل رسوم</button></div>
      ${k.balance > 0 ? `<button class="btn btn-ghost btn-block" data-mv="return">${icon('cash', 17)} استلام الباقي ${fmt(k.balance)}</button>` : ''}
      ${k.phone ? `<a class="btn btn-ghost btn-block" href="tel:${esc(k.phone)}">${icon('phone', 17)} اتصال</a>` : ''}
      <h2 class="sec" style="margin:0 4px">الحركات</h2>
      <div class="card flush">${(k.moves || []).map((m) => `<div class="item noic"><div class="m"><b>${KL[m.kind]}${m.kind !== 'receipt' && m.from_box === 0 ? ' (خارج الصندوق)' : ''}${m.notes ? ` — ${esc(m.notes)}` : ''}</b><span>${dayTime(m.created_at)}${m.txn_title ? ` · ${esc(m.txn_title)}` : ''}${m.receipt_no ? ` · وصل ${esc(m.receipt_no)}` : ''}</span></div><div class="e"><b class="num ${m.kind === 'give' ? 'red' : 'green'}">${m.kind === 'give' ? '' : '−'}${fmt(m.amount)}</b></div></div>`).join('') || '<div class="empty">لا توجد حركات</div>'}</div>`, (sb) => {
      sb.querySelectorAll('[data-mv]').forEach((b) => { b.onclick = () => courierMoveSheet(k, b.dataset.mv); });
    });
  }
  function courierMoveSheet(k, kind) {
    const T = { give: 'إعطاء عهدة', receipt: 'وصل رسوم', return: 'استلام الباقي' };
    const box0 = LS.get('zm-courier-box') !== false;
    const tx = openTx();
    openSheet(T[kind], `
      ${moneyField('amount', 'المبلغ', kind === 'return' ? Math.max(0, k.balance) : 0)}
      ${kind !== 'receipt' ? `<div class="field"><label>${kind === 'give' ? 'الفلوس منين؟' : 'الباقي وين يروح؟'}</label>${seg('box', [['1', kind === 'give' ? 'من الصندوق' : 'للصندوق'], ['0', kind === 'give' ? 'من خارجه (جيبي)' : 'استلمته أنا']], box0 ? '1' : '0')}</div>` : ''}
      ${kind !== 'return' ? `<div class="field"><label>للمعاملة (اختياري)</label><select class="input" name="txn"><option value="">—</option>${tx.map((t) => `<option value="${t.id}" ${t.courier_id === k.id ? '' : ''}>${esc(t.title)}${t.party_name ? ` — ${esc(t.party_name)}` : ''}</option>`).join('')}</select></div>` : ''}
      ${kind === 'receipt' ? '<div class="field"><label>رقم الوصل (اختياري)</label><input class="input" name="rno" inputmode="numeric"></div>' : ''}
      <div class="field"><label>${kind === 'receipt' ? 'البيان (مثال: رسوم تسجيل — دائرة التسجيل)' : 'ملاحظة (اختياري)'}</label><input class="input" name="notes"></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ — ${esc(k.name)}</button>`, (sb) => {
      const box = bindSeg(sb, 'box');
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amount'); if (!amount) return toast('اكتب المبلغ', true);
        const fromBox = kind === 'receipt' ? true : (box() || (box0 ? '1' : '0')) === '1';
        if (kind !== 'receipt') LS.set('zm-courier-box', fromBox);
        if (kind === 'return' && amount > k.balance) return toast(`أكبر مما عنده (${fmt(k.balance)})`, true);
        const notes = val(sb, 'notes'); const txn = Number(val(sb, 'txn')) || null;
        if (kind === 'receipt' && !notes && !txn) return toast('اكتب البيان أو اختر المعاملة', true);
        sendOp('courier:move', { courier_id: k.id, kind, amount, txn_id: txn, notes, receipt_no: val(sb, 'rno'), from_box: fromBox }, `${T[kind]}${kind === 'receipt' ? '' : fromBox ? ' (الصندوق)' : ' (خارج الصندوق)'} — ${k.name} ${fmt(amount)}`);
      };
    });
  }

  // ───── التجديدات ─────
  function expiriesSheet() {
    const list = (OF()?.expiries || []).slice().sort((a, b) => a.expires_on.localeCompare(b.expires_on));
    const row = (e) => {
      const n = daysTo(e.expires_on);
      const cls = n < 0 ? 'red' : n <= 30 ? 'amber' : 'green';
      const wa = e.client_phone ? waLink(e.client_phone, `السلام عليكم ${e.client_name}،\nنود تذكيركم بأن «${e.title}»${e.client_company ? ` لـ${e.client_company}` : ''} ${n < 0 ? `انتهت بتاريخ ${e.expires_on}` : `تنتهي بتاريخ ${e.expires_on} (بعد ${n} يوم)`}.\nيسعدنا إنجاز التجديد لكم — تواصلوا معنا.`) : '';
      return `<div class="item"><div class="av ${cls}" style="font-size:11px;line-height:1.1;text-align:center">${n < 0 ? `${-n}<br>يوم` : n > 99 ? `${Math.round(n / 30)}<br>شهر` : `${n}<br>يوم`}</div><div class="m"><b>${esc(e.title)}</b><span>${esc(e.client_company || e.client_name)} · ${e.expires_on}</span></div><div class="e">${wa && n <= 45 ? `<a class="chip green" href="${wa}" target="_blank" rel="noopener">${icon('chat', 12)} تذكير</a>` : ''}</div></div>`;
    };
    const soon = list.filter((e) => daysTo(e.expires_on) <= 30);
    const later = list.filter((e) => daysTo(e.expires_on) > 30);
    openSheet('التجديدات وتواريخ الانتهاء', `
      ${soon.length ? `<h2 class="sec" style="margin:0 4px">منتهية أو خلال 30 يوم</h2><div class="card flush">${soon.map(row).join('')}</div>` : '<div class="note">لا توجد تجديدات قريبة ✓</div>'}
      ${later.length ? `<h2 class="sec" style="margin:0 4px">لاحقاً</h2><div class="card flush">${later.slice(0, 80).map(row).join('')}</div>` : ''}
      <div class="foot-note">تُضاف التواريخ من برنامج المكتب: العملاء ← ملف الشركة</div>`);
  }

  // ───── العقود والأقساط + التوقيع ─────
  const KIND = { service: 'عقد خدمة', handover: 'محضر تسليم', debt: 'إقرار بدين', external: 'سند خدمة خارجية' };
  function contractsSheet() {
    const o = OF(); if (!o) return;
    const inst = o.installments || [];
    openSheet('العقود والأقساط', `
      ${(o.pending || []).length ? `<h2 class="sec" style="margin:0 4px">بانتظار التوقيع</h2><div class="card flush">${o.pending.map((p) => `<button class="item" data-sign="${p.id}"><div class="av amber">${icon('edit', 18)}</div><div class="m"><b>${esc(p.party_name)}</b><span>${KIND[p.kind]} · ${esc(p.no)}${p.amount ? ` · ${fmt(p.amount)}` : ''}</span></div><div class="e"><span class="chip gold">توقيع</span></div></button>`).join('')}</div>` : ''}
      ${pendingRows(['contract:sign']).length ? `<div class="card flush">${pendingRows(['contract:sign'])}</div>` : ''}
      ${inst.length ? `<h2 class="sec" style="margin:0 4px">الأقساط — متأخرة ومستحقة هذا الشهر</h2><div class="card flush">${inst.map((x) => {
        const c = S.snap.clients.find((y) => y.id === x.client_id);
        const wa = x.phone ? waLink(x.phone, `السلام عليكم ${x.party_name}،\nنود تذكيركم بالقسط ${x.n} من ${x.count} حسب الإقرار رقم ${x.no} بمبلغ ${fmt(x.left)} د.ع${x.status === 'overdue' ? ` المستحق بتاريخ ${x.due}` : ` المستحق بتاريخ ${x.due}`}.\nشكراً لكم.`) : '';
        return `<div class="item"><div class="av ${x.status === 'overdue' ? 'red' : 'amber'}">${x.n}</div><div class="m"><b>${esc(x.party_name)}</b><span>${x.status === 'overdue' ? `<span class="red" style="display:inline">متأخر ${x.overdue_days} يوم</span>` : dayLabel(x.due)} · قسط ${x.n}/${x.count} · ${esc(x.no)}</span></div><div class="e"><b class="num">${fmt(x.left)}</b>${wa ? `<a class="chip green" href="${wa}" target="_blank" rel="noopener">${icon('chat', 12)} تذكير</a>` : ''}${c && c.balance > 0 ? `<button class="chip gold" data-pay="${c.id}">تسديد</button>` : ''}</div></div>`;
      }).join('')}</div>` : ''}
      <h2 class="sec" style="margin:0 4px">كل العقود</h2>
      <div class="card flush">${(o.contracts || []).slice(0, 120).map((c) => `<div class="item noic"><div class="m"><b>${esc(c.party_name)}</b><span>${KIND[c.kind]} · ${esc(c.no)} · ${esc(c.subject || '')}</span></div><div class="e"><b class="num">${fmt(c.amount)}</b><span class="chip ${c.state.cls === 'gray' ? '' : c.state.cls}">${esc(c.state.text)}</span></div></div>`).join('') || '<div class="empty">لا توجد عقود بعد</div>'}</div>
      <div class="foot-note">تنظيم العقود والطباعة من برنامج المكتب — والتوقيع يصير هنا بإصبع الزبون</div>`, (sb) => {
      sb.querySelectorAll('[data-sign]').forEach((b) => { b.onclick = () => signSheet(Number(b.dataset.sign)); });
      sb.querySelectorAll('[data-pay]').forEach((b) => { b.onclick = () => { closeSheet(true); clientSheet(b.dataset.pay); }; });
    });
  }
  const rich = (t) => esc(t).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  function docHtml(d) {
    return `<div class="mdoc">
      <div class="mdoc-hd"><b>${esc(d.office.name)}</b><span>${esc(d.no_label)}: ${esc(d.no)} · ${esc(d.date)}</span></div>
      <h3>${esc(d.title)}</h3>${d.sub ? `<div class="sub">${esc(d.sub)}</div>` : ''}
      ${d.blocks.map((b) => {
        if (b.t === 'h') return `<div class="art">${esc(b.text)}</div>`;
        if (b.t === 'p') return `<p>${rich(b.text)}</p>`;
        if (b.t === 'box') return `<div class="box">${b.big ? `<div class="big">${esc(b.big)}</div>` : ''}${rich(b.text)}</div>`;
        if (b.t === 'parties') return b.items.map((x) => `<div class="box"><b>${esc(x.h)}</b><br>${rich(x.text)}</div>`).join('');
        if (b.t === 'table') return `<table>${b.head ? `<tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>` : ''}${b.rows.map((r) => `<tr>${r.map((c, k) => (b.kv && k === 0 ? `<th>${rich(c)}</th>` : `<td>${rich(c)}</td>`)).join('')}</tr>`).join('')}</table>`;
        return '';
      }).join('')}
    </div>`;
  }
  function signSheet(id) {
    const p = (OF()?.pending || []).find((x) => x.id === id); if (!p) return;
    openSheet(`توقيع ${esc(p.doc.signer)}`, `
      <div class="card"><div class="kv"><span>${KIND[p.kind]}</span><b class="num">${esc(p.no)}</b></div><div class="kv"><span>يوقّع</span><b>${esc(p.party_name)}</b></div>${p.amount ? `<div class="kv"><span>المبلغ</span><b class="num">${fmt(p.amount)}</b></div>` : ''}</div>
      <button class="btn btn-ghost btn-block" id="rd">${icon('receipt', 17)} قراءة النص كامل</button>
      <div id="docbox" hidden>${docHtml(p.doc)}</div>
      <label class="agree"><input type="checkbox" id="ag"> قرأت ${p.kind === 'debt' ? 'الإقرار' : p.kind === 'handover' ? 'المحضر' : p.kind === 'external' ? 'السند' : 'العقد'} وأوافق على ما فيه${p.kind === 'service' ? '، ومنها شروط الإلغاء والإرجاع' : ''}</label>
      <div class="mpad"><canvas id="pad"></canvas><span>وقّع هنا بإصبعك</span></div>
      <div class="grid2"><button class="btn btn-ghost" id="clr">مسح</button><button class="btn btn-gold" id="ok" disabled>${icon('check', 18)} توقيع وحفظ</button></div>`, (sb) => {
      sb.querySelector('#rd').onclick = () => { const d = sb.querySelector('#docbox'); d.hidden = !d.hidden; };
      const cv = sb.querySelector('#pad'); const r = window.devicePixelRatio || 1;
      requestAnimationFrame(() => {
        cv.width = cv.clientWidth * r; cv.height = cv.clientHeight * r;
        const g = cv.getContext('2d'); g.scale(r, r); g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#1b2d5b';
        let down = false; let last = null; let has = false;
        const pos = (e) => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
        const ok = sb.querySelector('#ok'); const ag = sb.querySelector('#ag');
        const upd = () => { ok.disabled = !(has && ag.checked); };
        ag.onchange = upd;
        cv.addEventListener('pointerdown', (e) => { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
        cv.addEventListener('pointermove', (e) => { if (!down) return; const q = pos(e); g.beginPath(); g.moveTo(...last); g.lineTo(...q); g.stroke(); last = q; has = true; upd(); e.preventDefault(); });
        cv.addEventListener('pointerup', () => { down = false; });
        sb.querySelector('#clr').onclick = () => { g.clearRect(0, 0, cv.width, cv.height); has = false; upd(); };
        ok.onclick = () => {
          // صورة مصغّرة للتوقيع (تُرفع مشفّرة)
          const o = document.createElement('canvas'); const s = Math.min(1, 500 / cv.width); o.width = Math.round(cv.width * s); o.height = Math.round(cv.height * s);
          o.getContext('2d').drawImage(cv, 0, 0, o.width, o.height);
          sendOp('contract:sign', { id: p.id, signature: o.toDataURL('image/png'), via: 'iphone' }, `توقيع ${KIND[p.kind]} ${p.no} — ${p.party_name}`);
        };
      });
    });
  }

  // ═════════════ «ماليتي» — للمدير فقط (من S.snap.me) ═════════════
  const ME_UNLOCK = 'zm-me-unlocked';
  function meSheet() {
    const m = S.snap.me;
    if (!m) return toast('حدّث برنامج المكتب على الحاسبة الرئيسية', true);
    let ok = false; try { ok = sessionStorage.getItem(ME_UNLOCK) === '1'; } catch { /* ignore */ }
    if (m.pin && !ok) {
      openSheet('ماليتي', `<div class="me-lk">${icon('lock', 34)}<b>خاص بالمدير</b><span>اكتب الرمز السري</span>
        <input class="input" name="pin" type="password" inputmode="numeric" style="text-align:center;letter-spacing:8px;max-width:200px">
        <button class="btn btn-gold btn-block" id="ok">فتح</button></div>`, (sb) => {
        const go = () => dcodeIO.bcrypt.compare(val(sb, 'pin'), m.pin, (err, good) => {
          if (err || !good) return toast('الرمز غير صحيح', true);
          try { sessionStorage.setItem(ME_UNLOCK, '1'); } catch { /* ignore */ }
          meSheet();
        });
        sb.querySelector('#ok').onclick = go;
        sb.querySelector('[name=pin]').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        setTimeout(() => sb.querySelector('[name=pin]').focus(), 300);
      });
      return;
    }
    const bud = m.cfg.budgets || {};
    const cats = m.cats.filter((c) => bud[c] || m.byCat[c]);
    const st = m.steps.find((x) => x.n === m.current);
    const bar = (pct, c) => `<div class="mbar"><i style="width:${Math.min(100, pct)}%;background:${c}"></i></div>`;
    openSheet('ماليتي', `
      <div class="card hero"><div class="lbl">اللي بقى إلك — هالشهر</div><div class="big">${fmt(m.left)}<small>د.ع</small></div>
        <div class="me-sp"><div><span>سحبت من المكتب</span><b>${fmt(m.withdraw)}</b></div><div><span>مصاريفك</span><b class="red">${fmt(m.expense)}</b></div>
        <div><span>أقساط ديون</span><b>${fmt(m.debtPay)}</b></div><div><span>${m.forecast ? `نهاية الشهر (${m.forecast.daysLeft} يوم)` : 'ادّخرت'}</span><b dir="ltr" style="display:inline-block" class="${m.forecast && m.forecast.left < 0 ? 'red' : 'green'}">${fmt(m.forecast ? m.forecast.left : m.saved)}</b></div></div></div>
      <div class="grid2" style="margin-bottom:10px"><button class="btn btn-gold" id="ex">${icon('plus', 17)} مصروف</button><button class="btn btn-ghost" id="wd">${icon('wallet', 17)} سحب</button></div>
      ${pendingRows(['me:move', 'me:moveDelete', 'owner:back'])}
      ${m.officeOwes ? `<button class="card item noic press" data-ofc="owes" style="width:100%;margin-bottom:10px"><div class="m"><b>المكتب مدين إلك</b><span>إكمال رواتب وإيداعات من جيبك — اضغط للاسترجاع</span></div><div class="e"><b class="gold num">${fmt(m.officeOwes)}</b></div></button>` : ''}
      ${cats.length ? `<h2 class="sec" style="margin:4px 4px 0">ميزانيتك</h2><div class="card">${cats.map((c) => { const sp = m.byCat[c] || 0; const b = bud[c] || 0; const over = b && sp > b;
        return `<div class="me-row"><div class="h"><b>${esc(c)}</b><span><b class="${over ? 'red' : ''}">${fmt(sp)}</b>${b ? ` / ${fmt(b)}` : ''}</span></div>${bar(b ? (sp / b) * 100 : 100, over ? 'var(--red)' : 'var(--gold)')}</div>`; }).join('')}</div>` : ''}
      <h2 class="sec" style="margin:4px 4px 0">المكتب — الربح أولاً</h2>
      <div class="card">${[['owner', 'راتبك', 'var(--gold)'], ['opex', 'مصاريف المكتب', 'var(--blue)'], ['annual', 'الالتزامات السنوية', 'var(--amber)'], ['profit', 'ربح المكتب', 'var(--green)']].map(([k, t, c]) => { const x = m.buckets[k];
        return `<div class="me-row"><div class="h"><b>${t}</b><span>${x.pct}% · الهدف ${x.target}%</span></div>${bar(x.pct * 1.6, c)}</div>`; }).join('')}
        <div class="foot-note" style="margin-top:6px">دخل المكتب المستلم: ${fmt(m.income)} د.ع</div></div>
      <div class="kpis">
        <div class="kpi"><div class="l">خطوتك الحالية</div><div class="v">${m.current}/5</div><div class="s">${esc(st?.title || 'كل الخطوات تمت ✓')}</div></div>
        <div class="kpi"><div class="l">الاحتياطي</div><div class="v">${m.reserveMonths} شهر</div><div class="s">${fmt(m.reserve)}${m.reserveTarget ? ` من ${fmt(m.reserveTarget)}` : ''}</div></div>
        <div class="kpi"><div class="l">باقي ديونك</div><div class="v ${m.debtLeft ? 'red' : 'green'}">${fmt(m.debtLeft)}</div><div class="s">${m.debtLeft ? (m.payoffMonths ? `تخلص خلال ${m.payoffMonths} شهر` : 'حدد الأقساط') : 'ما عليك ديون'}</div></div>
      </div>
      ${m.moves.length ? `<h2 class="sec" style="margin:4px 4px 0">حركاتك</h2><div class="card flush">${m.moves.slice(0, 15).map((x) => `<div class="item noic"><div class="m"><b>${esc(x.category || x.debt_name || ({ withdraw: x.from_box ? 'سحب من الصندوق' : 'سحب من خارج الصندوق', reserve_in: 'إيداع بالاحتياطي', reserve_out: 'سحب من الاحتياطي' })[x.kind] || '')}</b><span>${esc(x.notes || '')} ${x.day || ''}</span></div><div class="e"><b>${fmt(x.amount)}</b></div></div>`).join('')}</div>` : ''}
      <div class="foot-note">الإعدادات والديون والتوزيع من برنامج المكتب</div>`, (sb) => {
      bindOffice(sb);
      sb.querySelector('#ex').onclick = () => meMoveSheet('expense');
      sb.querySelector('#wd').onclick = () => meMoveSheet('withdraw');
    });
  }
  function meMoveSheet(kind) {
    const cats = S.snap.me.cats;
    openSheet(kind === 'expense' ? 'مصروف شخصي' : 'سحبت من المكتب', `
      ${moneyField('amt', 'المبلغ')}
      ${kind === 'expense' ? `<div class="field me-cat"><label>القسم</label>${seg('cat', cats.slice(0, 4).map((c) => [c, c]), cats[0])}<div style="height:6px"></div>${seg('cat2', cats.slice(4).map((c) => [c, c]), '')}</div>`
        : `<div class="field"><label>من وين؟</label>${seg('fb', [['1', 'من صندوق المكتب'], ['0', 'من البنك / خارج']], '1')}</div>`}
      <div class="field"><label>ملاحظة (اختياري)</label><input class="input" name="no"></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ</button>`, (sb) => {
      let cat = cats[0];
      const a = bindSeg(sb, 'cat', (v) => { cat = v; sb.querySelectorAll('[data-seg="cat2"] button').forEach((b) => b.classList.remove('on')); });
      bindSeg(sb, 'cat2', (v) => { cat = v; sb.querySelectorAll('[data-seg="cat"] button').forEach((b) => b.classList.remove('on')); });
      const fb = bindSeg(sb, 'fb'); void a;
      setTimeout(() => sb.querySelector('[name=amt]').focus(), 300);
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amt'); if (!amount) return toast('اكتب المبلغ', true);
        const notes = val(sb, 'no');
        if (kind === 'expense') sendOp('me:move', { kind, amount, category: cat, notes }, `مصروف شخصي: ${cat} ${fmt(amount)}`);
        else { const from_box = fb() !== '0'; sendOp('me:move', { kind, amount, from_box, notes }, `سحب شخصي ${from_box ? 'من الصندوق' : 'من خارج الصندوق'} ${fmt(amount)}`); }
      };
    });
  }

  // ═════════════ الرواتب وفلوس المدير على المكتب (S.snap.sal) ═════════════
  function salBanner() {
    const D = S.snap?.sal?.dueToday;
    if (!D || pendingOf(['sal:pay']).length) return '';
    return `<button class="card press sal-al" data-ofc="sal"><div class="m"><b>💵 اليوم يوم الرواتب — ${D.day}</b><span>${D.due.map((x) => `${esc(x.name)} ${fmt(x.amount)}`).join(' · ')}</span>
      ${D.short ? `<span class="red" style="font-weight:800">⚠️ بالصندوق ${fmt(D.box)} بس — ينقص ${fmt(D.short)}</span>` : ''}</div><span class="chip gold">صرف</span></button>`;
  }
  function salPaySheet() {
    const L = S.snap.sal; if (!L) return toast('حدّث برنامج المكتب على الحاسبة الرئيسية', true);
    const staff = L.staff.filter((u) => u.is_active);
    const box = Math.max(0, L.box || 0);
    const base = (u) => u.salary || u.last?.amount || 0;
    openSheet('صرف الرواتب', `
      ${pendingRows(['sal:pay'])}
      <div class="card flush">${staff.map((u) => `<label class="item noic" style="gap:8px;flex-wrap:wrap"><input type="checkbox" data-u="${u.id}" ${u.due ? 'checked' : ''} style="width:22px;height:22px"><div class="m"><b>${esc(u.full_name)}</b><span>${u.salary_period === 'monthly' ? 'شهري' : 'أسبوعي'} · الراتب ${fmt(base(u))}${u.last ? ` · آخر راتب ${u.last.day}` : ''}</span>
        ${(u.pending || []).map((a) => `<div class="ded"><input type="checkbox" data-d="${a.id}" data-du="${u.id}" checked><b class="red">− ${fmt(a.deduct)}</b><i>${esc(L.abs?.[a.kind] || '')} ${a.date_from.slice(5)}${a.notes ? ` · ${esc(a.notes)}` : ''}</i></div>`).join('')}</div>
        <div class="money-in" style="width:150px"><input class="input" style="font-size:15px;padding-left:50px" data-a="${u.id}" inputmode="numeric" data-money value="${fmt(Math.max(0, base(u) - (u.pending || []).reduce((t, a) => t + a.deduct, 0)))}"><span>د.ع</span></div></label>`).join('') || '<div class="empty">ما عندك موظفين</div>'}</div>
      <div class="kpis" style="margin:10px 0"><div class="kpi"><div class="l">المجموع</div><div class="v" id="tt">0</div></div><div class="kpi"><div class="l">بالصندوق (آخر مزامنة)</div><div class="v">${fmt(box)}</div></div></div>
      ${moneyField('bx', 'من صندوق المكتب')}
      <div class="note" id="ow"></div>
      <div class="field"><label>اللي من عندي</label>${seg('od', [['1', 'دين — يرجعلي'], ['0', 'هدية — ما يرجع']], '1')}</div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} صرف الرواتب</button>`, (sb) => {
      const od = bindSeg(sb, 'od');
      let touched = false;
      const ded = (u) => [...sb.querySelectorAll(`[data-du="${u.id}"]`)];
      // علامة الخصم: شيلها ← مسامَح، والراتب يتحدّث
      sb.querySelectorAll('[data-d]').forEach((c) => c.addEventListener('change', () => {
        const u = staff.find((x) => x.id === Number(c.dataset.du));
        const pend = u.pending.filter((a) => sb.querySelector(`[data-d="${a.id}"]`).checked).reduce((t, a) => t + a.deduct, 0);
        sb.querySelector(`[data-a="${u.id}"]`).value = fmt(Math.max(0, base(u) - pend));
      }));
      const items = () => staff.filter((u) => sb.querySelector(`[data-u="${u.id}"]`).checked).map((u) => ({ user_id: u.id, name: u.full_name, amount: parseMoney(sb.querySelector(`[data-a="${u.id}"]`).value),
        apply: ded(u).filter((c) => c.checked).map((c) => Number(c.dataset.d)), waive: ded(u).filter((c) => !c.checked).map((c) => Number(c.dataset.d)) })).filter((x) => x.amount > 0);
      const calc = () => {
        const it = items(); const total = it.reduce((a, x) => a + x.amount, 0);
        const bxEl = sb.querySelector('[name=bx]');
        if (!touched) bxEl.value = fmt(Math.min(box, total));
        const fromBox = Math.min(total, parseMoney(bxEl.value));
        sb.querySelector('#tt').textContent = fmt(total);
        sb.querySelector('#ow').innerHTML = total ? `من الصندوق <b>${fmt(fromBox)}</b> + أكمّله من عندي <b>${fmt(total - fromBox)}</b>` : 'اختر الموظفين';
        return { it, total, fromBox };
      };
      sb.querySelector('[name=bx]').addEventListener('input', () => { touched = true; calc(); });
      sb.addEventListener('input', calc); sb.addEventListener('change', calc); calc();
      sb.querySelector('#ok').onclick = () => {
        const { it, total, fromBox } = calc();
        if (!it.length) return toast('اختر موظفاً', true);
        sendOp('sal:pay', { items: it.map(({ user_id, amount, apply, waive }) => ({ user_id, amount, apply, waive })), box_amount: fromBox, owed: od() !== '0' }, `رواتب ${fmt(total)}: ${it.map((x) => x.name).join('، ')}${total - fromBox ? ` (من جيبك ${fmt(total - fromBox)})` : ''}`);
      };
    });
  }
  function absSheet() {
    const L = S.snap.sal; if (!L?.abs) return toast('حدّث برنامج المكتب على الحاسبة الرئيسية', true);
    const staff = L.staff.filter((u) => u.is_active);
    if (!staff.length) return toast('ما عندك موظفين', true);
    const t = todayStr();
    openSheet('تسجيل غياب / إجازة', `
      ${pendingRows(['abs:save'])}
      <div class="field"><label>الموظف</label><select class="input" name="u">${staff.map((u) => `<option value="${u.id}">${esc(u.full_name)}</option>`).join('')}</select></div>
      <div class="field"><label>النوع</label>${seg('k', [['absent', 'غياب'], ['leave', 'إجازة'], ['sick', 'مرضية'], ['late', 'تأخير']], 'absent')}</div>
      <div class="grid2"><div class="field"><label>من</label><input class="input" type="date" name="f" value="${t}"></div><div class="field" id="tof"><label>إلى</label><input class="input" type="date" name="t" value="${t}"></div></div>
      <div class="field"><label>الخصم — قرارك إنت</label>${seg('m', [['none', 'بدون'], ['days', 'بالأيام'], ['amount', 'مبلغ']], 'none')}</div>
      <div id="amt" style="display:none">${moneyField('a', 'مبلغ الخصم')}</div>
      <div class="note" id="inf"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input class="input" name="no"></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} تسجيل</button>`, (sb) => {
      let kind = 'absent'; let mode = 'none';
      const info = () => {
        const u = staff.find((x) => x.id === Number(val(sb, 'u')));
        const f = val(sb, 'f'); const to = kind === 'late' ? f : val(sb, 't');
        const n = kind === 'late' ? 0 : Math.max(0, Math.round((new Date(`${to}T12:00:00`) - new Date(`${f}T12:00:00`)) / 86400000) + 1);
        sb.querySelector('#tof').style.display = kind === 'late' ? 'none' : '';
        sb.querySelector('#amt').style.display = mode === 'amount' ? '' : 'none';
        sb.querySelector('#inf').textContent = mode === 'days' ? (n ? `${n} ${n === 1 ? 'يوم' : 'أيام'} × اليومية ${fmt(u.day_rate || 0)} = ${fmt(n * (u.day_rate || 0))} — ينخصم بالراتب الجاي` : 'التأخير يُخصم بمبلغ') : mode === 'amount' ? 'ينخصم بالراتب الجاي — وتكدر تسامحه وقت الصرف' : 'بدون خصم — ينسجّل للعلم بس';
      };
      bindSeg(sb, 'k', (v) => { kind = v; info(); }); bindSeg(sb, 'm', (v) => { mode = v; info(); });
      sb.addEventListener('change', info); info();
      sb.querySelector('#ok').onclick = () => {
        const f = val(sb, 'f'); const to = kind === 'late' ? f : val(sb, 't');
        if (!f || to < f) return toast('التاريخ غير صحيح', true);
        if (mode === 'amount' && !mval(sb, 'a')) return toast('اكتب مبلغ الخصم', true);
        if (mode === 'days' && kind === 'late') return toast('التأخير يُخصم بمبلغ', true);
        const u = staff.find((x) => x.id === Number(val(sb, 'u')));
        sendOp('abs:save', { user_id: u.id, kind, from: f, to, mode, amount: mval(sb, 'a'), notes: val(sb, 'no') }, `${L.abs[kind]} ${u.full_name} ${f}${mode === 'none' ? ' — بدون خصم' : ''}`);
      };
    });
  }
  function depositSheet() {
    const R = S.snap.sal?.reasons || ['إكمال رواتب', 'إيجار', 'عهدة محامي', 'فكّة / صرف', 'أخرى'];
    openSheet('حطيت فلوس بالصندوق من عندي', `
      ${moneyField('amt', 'المبلغ')}
      <div class="field"><label>ليش؟</label>${seg('rs', R.slice(0, 3).map((r) => [r, r]), R[0])}<div style="height:6px"></div>${seg('rs2', R.slice(3).map((r) => [r, r]), '')}</div>
      <div class="field"><label>ملاحظة (اختياري)</label><input class="input" name="no"></div>
      <div class="field">${seg('od', [['1', 'دين — يرجعلي'], ['0', 'هدية — ما يرجع']], '1')}</div>
      <div class="note">يدخل جرد الصندوق اليوم — وما ينحسب دخل للمكتب ولا ربح.</div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} تسجيل الإيداع</button>`, (sb) => {
      let reason = R[0];
      bindSeg(sb, 'rs', (v) => { reason = v; sb.querySelectorAll('[data-seg="rs2"] button').forEach((b) => b.classList.remove('on')); });
      bindSeg(sb, 'rs2', (v) => { reason = v; sb.querySelectorAll('[data-seg="rs"] button').forEach((b) => b.classList.remove('on')); });
      const od = bindSeg(sb, 'od');
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amt'); if (!amount) return toast('اكتب المبلغ', true);
        sendOp('owner:deposit', { amount, reason, notes: val(sb, 'no'), owed: od() !== '0' }, `حطيت ${fmt(amount)} بالصندوق — ${reason}`);
      };
    });
  }
  function owesSheet() {
    const L = S.snap.sal; const o = L?.owed || 0;
    if (!o) return toast('المكتب ما مدين إلك بشي');
    openSheet('المكتب مدين إلك', `
      <div class="card hero"><div class="lbl">اللي حطيته من جيبك وما رجعلك</div><div class="big">${fmt(o)}<small>د.ع</small></div></div>
      <div class="card flush">${(L.moves || []).slice(0, 12).map((x) => `<div class="item noic"><div class="m"><b>${x.kind === 'back' ? 'استرجعت من الصندوق' : x.kind === 'paid' ? `إكمال راتب ${esc(x.employee || x.notes || '')}` : `إيداع — ${esc(x.reason || '')}`}</b><span>${x.day}${!x.owed && x.kind !== 'back' ? ' · هدية' : ''}</span></div><div class="e"><b class="num ${x.kind === 'back' ? 'green' : 'gold'}">${x.kind === 'back' ? '−' : ''}${fmt(x.amount)}</b></div></div>`).join('')}</div>
      ${moneyField('amt', 'أسترجع من الصندوق', Math.min(o, Math.max(0, L.box || 0)))}
      <button class="btn btn-gold btn-block" id="ok">${icon('undo', 18)} استرجاع من الصندوق</button>`, (sb) => {
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amt'); if (!amount) return toast('اكتب المبلغ', true);
        if (amount > o) return toast(`المكتب مدين إلك ${fmt(o)} بس`, true);
        sendOp('owner:back', { amount }, `استرجعت ${fmt(amount)} من الصندوق`);
      };
    });
  }

  // ═════════════ الإدارة من الآيفون: الموظفون والصلاحيات + الخدمات والأسعار ═════════════
  function staffSheet() {
    const list = S.snap.staff.filter((u) => u.role !== 'admin');
    openSheet('الموظفون', `<div class="card flush list">${list.map((u) => `<button class="item" data-u="${u.id}"><div class="av ${u.is_active ? '' : 'gray'}">${initial(u.full_name)}</div>
      <div class="m"><b>${esc(u.full_name)}</b><span>${u.is_active ? `${u.permissions.length} صلاحية${u.permissions.includes('cash.blind') ? ' · جرد أعمى' : u.permissions.includes('cash.close') ? ' · جرد اليوم' : ''}` : 'الحساب موقوف'}</span></div>
      <div class="e">${u.is_active ? '<span class="chip green">فعّال</span>' : '<span class="chip red">موقوف</span>'}</div></button>`).join('') || '<div class="empty">لا يوجد موظفون</div>'}</div>
      <div class="foot-note">إضافة موظف جديد أو تغيير كلمة المرور من برنامج المكتب</div>`, (sb) => {
      sb.querySelectorAll('[data-u]').forEach((b) => { b.onclick = () => userSheet(Number(b.dataset.u)); });
    });
  }
  function userSheet(id) {
    const u = S.snap.staff.find((x) => x.id === id);
    const cat = S.snap.permsCatalog || [];
    const groups = [...new Set(cat.map((p) => p.group))];
    openSheet(esc(u.full_name), `
      <div class="card flush"><label class="ntg"><span><b>الحساب فعّال</b><small>إذا أوقفته لا يكدر يدخل للبرنامج</small></span><input type="checkbox" name="active" ${u.is_active ? 'checked' : ''}><i></i></label></div>
      ${groups.map((g) => `<h2 class="sec" style="margin:4px 4px 0">${esc(g)}</h2><div class="card flush">${cat.filter((p) => p.group === g).map((p) => `<label class="ntg"><span><b style="font-size:14px;font-weight:600">${esc(p.label)}</b></span><input type="checkbox" data-p="${p.key}" ${u.permissions.includes(p.key) ? 'checked' : ''}><i></i></label>`).join('')}</div>`).join('')}
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ</button>`, (sb) => {
      sb.querySelector('#ok').onclick = () => {
        const perms = [...sb.querySelectorAll('[data-p]')].filter((c) => c.checked).map((c) => c.dataset.p);
        const active = sb.querySelector('[name="active"]').checked;
        const changedPerms = perms.slice().sort().join() !== u.permissions.slice().sort().join();
        if (changedPerms) sendOp('users:update', { id: u.id, full_name: u.full_name, username: u.username, role: u.role, permissions: perms }, `صلاحيات ${u.full_name}`);
        if (!!active !== !!u.is_active) sendOp('users:setActive', { id: u.id, active }, `${active ? 'تفعيل' : 'إيقاف'} ${u.full_name}`);
        if (!changedPerms && !!active === !!u.is_active) closeSheet();
      };
    });
  }
  function servicesSheet() {
    const list = S.snap.servicesAll || [];
    openSheet('الخدمات والأسعار', `<button class="btn btn-gold btn-block" id="new">${icon('plus', 18)} خدمة جديدة</button>
      <div class="card flush list">${list.map((v) => `<button class="item noic" data-s="${v.id}"><div class="m"><b>${esc(v.name)}</b><span>${esc(v.category || '')}</span></div>
      <div class="e"><b class="num ${v.is_active ? '' : 'muted'}">${v.default_price ? fmt(v.default_price) : 'حسب الطلب'}</b>${v.is_active ? '' : '<span class="chip red">موقوفة</span>'}</div></button>`).join('')}</div>`, (sb) => {
      sb.querySelector('#new').onclick = () => serviceSheet(null);
      sb.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => serviceSheet(Number(b.dataset.s)); });
    });
  }
  function serviceSheet(id) {
    const v = id ? S.snap.servicesAll.find((x) => x.id === id) : null;
    const cats = [...new Set((S.snap.servicesAll || []).map((x) => x.category).filter(Boolean))];
    openSheet(v ? 'تعديل خدمة' : 'خدمة جديدة', `
      <div class="field"><label>اسم الخدمة</label><input class="input" name="name" value="${esc(v?.name || '')}"></div>
      ${moneyField('price', 'السعر (اتركه 0 إذا حسب الطلب)', v?.default_price || 0)}
      <div class="field"><label>القسم</label><input class="input" name="cat" list="svccats" value="${esc(v?.category || '')}"><datalist id="svccats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} حفظ</button>
      ${v ? `<button class="btn btn-ghost btn-block" id="tg">${v.is_active ? 'إيقاف الخدمة' : 'تفعيل الخدمة'}</button>` : ''}`, (sb) => {
      sb.querySelector('#ok').onclick = () => {
        const name = val(sb, 'name'); if (!name) return toast('اكتب اسم الخدمة', true);
        sendOp('services:save', { id: v?.id, name, default_price: mval(sb, 'price') || 0, icon: v?.icon || 'file', category: val(sb, 'cat') || 'أخرى' }, `${v ? 'تعديل' : 'إضافة'} خدمة ${name}`);
      };
      sb.querySelector('#tg')?.addEventListener('click', () => sendOp('services:toggle', { id: v.id }, `${v.is_active ? 'إيقاف' : 'تفعيل'} ${v.name}`));
    });
  }

  function paySheet(x, client) {
    const rem = x.total_amount - x.paid_amount;
    const owed = client?.owed_to || 0;
    openSheet(`دفعة على ${esc(x.receipt_no)}`, `
      <div class="total-bar"><span class="ink2">المتبقي</span><b class="num">${fmt(rem)}</b></div>
      ${moneyField('amount', 'المبلغ المستلم', rem)}
      ${seg('method', [['cash', 'كاش'], ['qi_card', 'كي كارد'], ...(owed ? [['balance', `من رصيده ${fmt(owed)}`]] : [])], 'cash')}
      <button class="btn btn-gold btn-block" id="ok">تسجيل</button>`, (sb) => {
      const method = bindSeg(sb, 'method');
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amount');
        if (!amount || amount > rem) return toast('المبلغ غير صحيح', true);
        sendOp('sales:pay', { id: x.id, amount, method: method() }, `دفعة ${fmt(amount)} على ${x.receipt_no}`);
      };
    });
  }

  // ═════════════ فاتورة جديدة ═════════════
  function invoiceForm(preClientId = null) {
    const sn = S.snap;
    const st = { lines: [], client: preClientId ? sn.clients.find((c) => c.id === Number(preClientId)) : null, kind: preClientId ? 'client' : 'walk', pay: 'cash' };
    if (st.client) st.pay = 'account';
    let n = 0;
    const sh = openSheet('فاتورة جديدة', `
      <div class="svc-grid" id="svcs">${sn.services.map((s) => `<button class="svc press" data-svc="${s.id}"><b>${esc(s.name)}</b><span class="num">${s.default_price ? fmt(s.default_price) : 'حسب الطلب'}</span></button>`).join('')}
        <button class="svc press" data-svc="custom"><b>${icon('plus', 16)} خدمة أخرى</b><span class="muted">اسم ومبلغ</span></button></div>
      <div id="lines" style="display:flex;flex-direction:column;gap:8px"></div>
      ${seg('kind', [['walk', 'زبون مباشر'], ['client', 'عميل مسجل']], st.kind)}
      <div id="party"></div>
      <div id="paybox"></div>
      <div class="card flush"><label class="ntg"><span><b>💳 دفعت عنه بالكي كارد (يسلّمه كاش)</b><small>لا يُطبع في الفاتورة — يُضاف الكاش للصندوق</small></span><input type="checkbox" name="swapon"><i></i></label></div>
      <div id="swapbox" hidden><div style="display:flex;flex-direction:column;gap:10px"><div class="grid2">${moneyField('swap', 'دفعت بالكي كارد', 0)}${moneyField('swapcash', 'استلمت كاش', 0)}</div><div id="swapmsg"></div><input class="input" name="swapnote" placeholder="السبب (اختياري)"></div></div>
      <div class="total-bar"><span class="ink2">المجموع</span><b class="num" id="total">0</b></div>
      <div class="total-bar" id="swaptot" hidden><span class="ink2">تستلم منه كاش بالمجموع</span><b class="num green" id="swapsum">0</b></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} إصدار الفاتورة</button>`, (sb) => {
      const total = () => st.lines.reduce((a, l) => a + (l.price || 0) * (l.qty || 1), 0);
      const paintLines = () => {
        sb.querySelector('#lines').innerHTML = st.lines.map((l) => `<div class="line two">${l.custom ? `<input class="input n" style="height:42px;font-size:15px" data-name="${l.k}" placeholder="اسم الخدمة" value="${esc(l.name)}">` : `<div class="n">${esc(l.name)}</div>`}
          <span class="qty"><button type="button" data-dec="${l.k}">−</button><b class="num">${l.qty || 1}</b><button type="button" data-inc="${l.k}">+</button></span>
          <input class="p" inputmode="numeric" data-price="${l.k}" value="${l.price ? fmt(l.price) : ''}" placeholder="0"><button class="x" data-rm="${l.k}">${icon('x', 15)}</button></div>`).join('');
        const bump = (k, d) => { const l = st.lines.find((x) => x.k === k); l.qty = Math.max(1, Math.min(999, (l.qty || 1) + d)); paintLines(); paintTotal(); };
        sb.querySelectorAll('[data-inc]').forEach((el) => { el.onclick = () => bump(Number(el.dataset.inc), 1); });
        sb.querySelectorAll('[data-dec]').forEach((el) => { el.onclick = () => bump(Number(el.dataset.dec), -1); });
        sb.querySelectorAll('[data-price]').forEach((el) => { el.oninput = () => { const v = parseMoney(el.value); el.value = v ? fmt(v) : ''; st.lines.find((l) => l.k === Number(el.dataset.price)).price = v; paintTotal(); }; });
        sb.querySelectorAll('[data-name]').forEach((el) => { el.oninput = () => { st.lines.find((l) => l.k === Number(el.dataset.name)).name = el.value; }; });
        sb.querySelectorAll('[data-rm]').forEach((el) => { el.onclick = () => { st.lines = st.lines.filter((l) => l.k !== Number(el.dataset.rm)); paintLines(); paintTotal(); }; });
        sb.querySelectorAll('[data-svc]').forEach((el) => el.classList.toggle('in', st.lines.some((l) => String(l.service_id) === el.dataset.svc)));
      };
      const swapAmt = () => (sb.querySelector('[name="swapon"]').checked ? mval(sb, 'swap') : 0);
      // الكاش المستلم مقابل الكي كارد: افتراضياً نفس المبلغ إلى أن يغيّره المستخدم
      let swapCashTouched = false;
      sb.querySelector('[name="swapcash"]').addEventListener('input', () => { swapCashTouched = true; });
      sb.querySelector('[name="swap"]').addEventListener('input', () => { if (!swapCashTouched) { const el = sb.querySelector('[name="swapcash"]'); const v = mval(sb, 'swap'); el.value = v ? fmt(v) : ''; } });
      const swapGot = () => (swapAmt() ? (swapCashTouched ? mval(sb, 'swapcash') : swapAmt()) : 0);
      const paintSwap = () => {
        const short = swapAmt() - swapGot();
        const msg = sb.querySelector('#swapmsg');
        msg.innerHTML = short > 0 ? `<div class="note ${st.client ? 'amber' : 'red'}">${st.client ? `الباقي <b class="num">${fmt(short)}</b> يُسجَّل ديناً على ${esc(st.client.name)}` : 'سلّم أقل؟ اختر «عميل مسجل» حتى يُسجَّل الباقي ديناً'}</div>` : short < 0 ? `<div class="note green">العمولة <b class="num">${fmt(-short)}</b> تُسجّل مدخولاً للمكتب</div>` : '';
        sb.querySelector('#ok').innerHTML = `${icon('check', 18)} ${!st.lines.length && swapAmt() ? 'تسجيل كي كارد مقابل كاش (بدون فاتورة)' : 'إصدار الفاتورة'}`;
        const w = swapGot(); const box = sb.querySelector('#swaptot'); box.hidden = !swapAmt();
        const cashInv = st.pay === 'cash' || (st.pay === 'account' && (st.pmethod?.() || 'cash') === 'cash') ? (st.pay === 'account' ? mval(sb, 'paid') : total()) : 0;
        sb.querySelector('#swapsum').textContent = fmt(cashInv + w);
      };
      const paintTotal = () => { sb.querySelector('#total').textContent = fmt(total()); paintPay(); paintSwap(); };
      sb.querySelector('[name="swapon"]').onchange = (e) => { sb.querySelector('#swapbox').hidden = !e.target.checked; paintSwap(); };
      sb.addEventListener('input', () => paintSwap());
      sb.addEventListener('click', () => setTimeout(paintSwap, 0));
      const paintParty = () => {
        const p = sb.querySelector('#party');
        if (st.kind === 'walk') {
          p.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">
            <input class="input" name="cname" placeholder="اسم الزبون (اختياري)">
            <div class="grid2"><input class="input" name="company" placeholder="اسم الشركة"><input class="input" name="phone" inputmode="tel" placeholder="الهاتف"></div></div>`;
        } else if (!st.client) {
          p.innerHTML = `<div class="search">${icon('search', 18)}<input class="input" id="csearch" type="search" placeholder="ابحث عن العميل"></div><div class="client-pick list" id="cpick"></div>`;
          const paint = (q = '') => {
            const list = sn.clients.filter((c) => !q || `${c.name} ${c.company || ''} ${c.phone || ''}`.includes(q)).slice(0, 40);
            p.querySelector('#cpick').innerHTML = list.map((c) => `<button class="item" data-pick="${c.id}"><div class="av">${initial(c.name)}</div><div class="m"><b>${esc(c.name)}</b><span>${esc(c.company || c.phone || '')}</span></div><div class="e">${c.balance ? `<span class="chip red">عليه ${fmt(c.balance)}</span>` : ''}${c.owed_to ? `<span class="chip amber">له ${fmt(c.owed_to)}</span>` : ''}</div></button>`).join('') || '<div class="empty">لا يوجد عميل بهذا الاسم</div>';
            p.querySelectorAll('[data-pick]').forEach((b) => { b.onclick = () => { st.client = sn.clients.find((c) => c.id === Number(b.dataset.pick)); paintParty(); paintPay(); }; });
          };
          paint();
          p.querySelector('#csearch').oninput = (e) => paint(e.target.value.trim());
        } else {
          p.innerHTML = `<div class="card flush"><div class="item"><div class="av">${initial(st.client.name)}</div><div class="m"><b>${esc(st.client.name)}</b><span>${st.client.balance ? `عليه ${fmt(st.client.balance)}` : 'لا ديون'}${st.client.owed_to ? ` · له ${fmt(st.client.owed_to)}` : ''}</span></div><button class="chip gold" id="chg">تغيير</button></div></div>
            <input class="input" name="company" placeholder="الشركة على الفاتورة" value="${esc(st.client.company || '')}">`;
          p.querySelector('#chg').onclick = () => { st.client = null; paintParty(); paintPay(); };
        }
      };
      const paintPay = () => {
        const box = sb.querySelector('#paybox');
        const opts = [['cash', 'كاش'], ['qi_card', 'كي كارد'], ...(st.kind === 'client' && st.client ? [['account', 'على الحساب']] : [])];
        if (!opts.some(([v]) => v === st.pay)) st.pay = 'cash';
        const owed = st.client?.owed_to || 0;
        if (st.useBal === undefined) st.useBal = true;
        box.innerHTML = `${owed ? `<label class="card" style="display:flex;gap:10px;align-items:center;padding:12px 14px;margin-bottom:12px"><input type="checkbox" id="usebal" ${st.useBal ? 'checked' : ''} style="width:20px;height:20px;accent-color:#d4af37"><span style="flex:1;font-size:14px">تسديد من المبلغ الذي له على المكتب <b class="amber num">${fmt(owed)}</b></span></label>` : ''}
          ${seg('pay', opts, st.pay)}
          ${st.pay === 'account' ? `<div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
            ${moneyField('paid', 'المدفوع الآن (اختياري)', 0)}
            ${seg('pmethod', [['cash', 'كاش'], ['qi_card', 'كي كارد']], 'cash')}</div>` : ''}`;
        bindSeg(box, 'pay', (v) => { st.pay = v; paintPay(); });
        const ub = box.querySelector('#usebal'); if (ub) ub.onchange = () => { st.useBal = ub.checked; };
        st.pmethod = bindSeg(box, 'pmethod');
      };
      sb.querySelector('#svcs').addEventListener('click', (e) => {
        const b = e.target.closest('[data-svc]'); if (!b) return;
        if (b.dataset.svc === 'custom') st.lines.push({ k: ++n, service_id: null, name: '', price: 0, qty: 1, custom: true });
        else {
          const s = sn.services.find((x) => String(x.id) === b.dataset.svc);
          const ex = st.lines.find((l) => l.service_id === s.id);
          if (ex) ex.qty = Math.min(999, (ex.qty || 1) + 1); // الضغط مرة ثانية يزيد العدد
          else st.lines.push({ k: ++n, service_id: s.id, name: s.name, price: s.default_price, qty: 1 });
        }
        paintLines(); paintTotal();
      });
      bindSeg(sb, 'kind', (v) => { st.kind = v; if (v === 'walk') st.client = null; paintParty(); paintPay(); });
      sb.querySelector('#ok').onclick = () => {
        const swapOnly = !st.lines.length && swapAmt() > 0;
        if (!st.lines.length && !swapOnly) return toast('أضف خدمة واحدة على الأقل', true);
        if (swapAmt() - swapGot() > 0 && !st.client) return toast('اختر العميل حتى يُسجَّل الباقي ديناً عليه', true);
        if (st.lines.some((l) => !l.price || !(l.name || '').trim())) return toast('أكمل اسم ومبلغ كل خدمة', true);
        if (st.kind === 'client' && !st.client) return toast('اختر العميل', true);
        if (sb.querySelector('[name="swapon"]').checked && !mval(sb, 'swap')) return toast('أدخل مبلغ الكي كارد أو أطفئ الخيار', true);
        const t = total();
        const account = st.pay === 'account';
        const payload = {
          items: st.lines.map((l) => ({ service_id: l.service_id, name: l.name.trim(), price: l.price, qty: l.qty || 1 })),
          client_id: st.client?.id || null,
          paid_amount: account ? Math.min(mval(sb, 'paid'), t) : t,
          method: account ? (st.pmethod?.() || 'cash') : st.pay,
          // الرصيد أولاً: يُسدَّد من المبلغ الذي للعميل على المكتب، والباقي كاش/كي كارد أو دين
          use_balance: !!st.client && (st.client.owed_to || 0) > 0 && st.useBal !== false,
          pay_rest: !account,
          company_name: val(sb, 'company') || null,
          swap: swapAmt() > 0 ? { card_amount: swapAmt(), cash_amount: swapGot(), notes: val(sb, 'swapnote') || null, day: todayStr() } : null,
        };
        if (!st.client) { payload.customer_name = val(sb, 'cname') || null; payload.customer_phone = val(sb, 'phone') || null; }
        const who = st.client?.name || payload.company_name || payload.customer_name || 'زبون مباشر';
        sendOp('sales:create', payload, swapOnly ? `كي كارد مقابل كاش ${fmt(swapAmt())} — ${who}` : `فاتورة ${fmt(t)} — ${who}`);
      };
      paintParty(); paintPay();
    });
    return sh;
  }

  // ═════════════ العملاء والديون ═════════════
  // واتساب: رسالة جاهزة (المستخدم يضغط إرسال بنفسه)
  function waLink(phone, text) {
    let d = String(phone || '').replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith('0')) d = `964${d.slice(1)}`;
    else if (d.length === 10 && d.startsWith('7')) d = `964${d}`;
    return /^\d{8,15}$/.test(d) ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : '';
  }
  function debtGroups() {
    const sn = S.snap; const m = new Map();
    sn.debts.forEach((x) => {
      const key = x.client_id ? `c${x.client_id}` : `n${x.company_name || x.client_name}`;
      const c = x.client_id ? sn.clients.find((k) => k.id === x.client_id) : null;
      if (!m.has(key)) m.set(key, { key, client_id: x.client_id, name: c ? c.name : (x.company_name || x.client_name), phone: (c && c.phone) || x.client_phone || '', total: 0, oldest: 0, inv: [] });
      const g = m.get(key); const due = x.total_amount - x.paid_amount; const age = daysSince(x.created_at);
      g.total += due; g.oldest = Math.max(g.oldest, age); g.inv.push({ ...x, due, age });
    });
    return [...m.values()].sort((a, b) => b.oldest - a.oldest || b.total - a.total);
  }
  const ageTxt = (n) => (n === 0 ? 'اليوم' : n === 1 ? 'منذ يوم' : n === 2 ? 'منذ يومين' : `منذ ${n} ${n <= 10 ? 'أيام' : 'يوماً'}`);
  function reminder(g) {
    return `السلام عليكم ${g.name}،\nنود تذكيركم بأن المبلغ المتبقي على حسابكم لدى ${S.snap.office.name || 'المكتب'} هو ${fmt(g.total)} دينار عراقي.\n${g.inv.slice(0, 6).map((i) => `• ${i.receipt_no} — ${i.service_name || ''}: ${fmt(i.due)}`).join('\n')}\nشكراً لتعاملكم معنا.`;
  }
  function debtsView() {
    const gs = debtGroups(); const b = { f: 0, m: 0, o: 0 };
    gs.forEach((g) => g.inv.forEach((i) => { b[i.age < 30 ? 'f' : i.age <= 60 ? 'm' : 'o'] += i.due; }));
    return `
      <div class="aging">
        <div class="ag" style="--c:var(--green)"><span>أقل من 30 يوماً</span><b class="num">${fmt(b.f)}</b></div>
        <div class="ag" style="--c:var(--amber)"><span>30 – 60 يوماً</span><b class="num">${fmt(b.m)}</b></div>
        <div class="ag" style="--c:var(--red)"><span>أكثر من 60</span><b class="num">${fmt(b.o)}</b></div>
      </div>
      <div class="card flush list">${gs.length ? gs.map((g) => { const wa = g.phone ? waLink(g.phone, reminder(g)) : ''; return `<div class="item dg">
        <button class="av ${g.oldest > 60 ? 'red' : g.oldest > 30 ? 'amber' : 'gray'}" data-open="${g.client_id ? `client:${g.client_id}` : `debt:${g.inv[0].id}`}">${initial(g.name)}</button>
        <button class="m" data-open="${g.client_id ? `client:${g.client_id}` : `debt:${g.inv[0].id}`}"><b>${esc(g.name)}</b><span>أقدمها ${ageTxt(g.oldest)} · ${g.inv.length} فاتورة</span></button>
        <div class="e"><b class="red num">${fmt(g.total)}</b>${wa ? `<a class="chip green" href="${wa}" target="_blank" rel="noopener">${icon('chat', 13)} تذكير</a>` : '<span class="chip">بلا رقم</span>'}</div></div>`; }).join('') : '<div class="empty">لا توجد ديون مفتوحة ✓</div>'}</div>`;
  }

  function clientList() {
    const q = S.cq.trim();
    const rows = S.snap.clients.filter((c) => !q || `${c.name} ${c.company || ''} ${c.phone || ''}`.includes(q))
      .sort((a, b) => (b.balance + b.owed_to) - (a.balance + a.owed_to));
    if (!rows.length) return '<div class="empty">لا يوجد عملاء</div>';
    return rows.map((c) => `<button class="item" data-open="client:${c.id}">
      <div class="av ${c.balance ? 'red' : c.owed_to ? 'amber' : 'gray'}">${initial(c.name)}</div>
      <div class="m"><b>${esc(c.name)}</b><span>${esc(c.company || c.phone || '—')}</span></div>
      <div class="e">${c.balance ? `<b class="red num">${fmt(c.balance)}</b>` : ''}${c.owed_to ? `<span class="chip amber">له ${fmt(c.owed_to)}</span>` : ''}${!c.balance && !c.owed_to ? '<span class="chip green">لا ديون</span>' : ''}</div>
    </button>`).join('');
  }
  function tabClients(inline = false) {
    const sn = S.snap;
    const total = sn.debts.reduce((a, x) => a + (x.total_amount - x.paid_amount), 0);
    const owed = sn.payables.reduce((a, x) => a + x.amount, 0);
    setTimeout(() => bindSeg($app.querySelector('#main'), 'cview', (v) => { S.cview = v; paintMain(); }));
    return `
      ${inline ? '' : `${title('العملاء', `${sn.clients.length} عميل مسجل`, `<button class="btn btn-ghost btn-sm press" data-act="newClient">${icon('userPlus', 16)} عميل</button>`)}${statusBars()}`}
      <div class="kpis">
        ${kpi('ديون لنا على العملاء', `<span class="red">${money(total)}</span>`, `${sn.debts.length} فاتورة`)}
        ${kpi('مبالغ يطلبونها منا', `<span class="amber">${money(owed)}</span>`, `${sn.payables.length} مبلغ`)}
      </div>
      ${seg('cview', [['list', 'العملاء'], ['debts', 'الديون حسب العمر']], S.cview || 'list')}
      ${(S.cview || 'list') === 'debts' ? debtsView() : `<div class="search">${icon('search', 18)}<input class="input" id="cq" type="search" placeholder="ابحث بالاسم أو الشركة أو الهاتف" value="${esc(S.cq)}"></div>`}
      ${pendingOf(['debts:settle', 'debts:settleClient', 'payables:create', 'payables:pay', 'payables:update', 'payables:delete', 'clients:save']).length ? `<div class="card flush">${pendingRows(['debts:settle', 'debts:settleClient', 'payables:create', 'payables:pay', 'payables:update', 'payables:delete', 'clients:save'])}</div>` : ''}
      ${(S.cview || 'list') === 'list' ? `<div class="card flush list" id="clist">${clientList()}</div>` : ''}`;
  }

  function clientSheet(id) {
    const sn = S.snap;
    const c = sn.clients.find((x) => String(x.id) === String(id));
    if (!c) return;
    const debts = sn.debts.filter((d) => d.client_id === c.id);
    const pays = sn.payables.filter((p) => p.client_id === c.id);
    openSheet(esc(c.name), `
      <div class="card" style="display:flex;gap:12px;align-items:center">
        <div class="av" style="width:52px;height:52px;font-size:20px">${initial(c.name)}</div>
        <div style="flex:1;min-width:0"><b style="font-size:16px">${esc(c.company || c.name)}</b><div class="muted" style="font-size:13px;margin-top:2px">${c.company && c.company !== c.name ? `${esc(c.name)} · ` : ''}<span class="num">${esc(c.phone || '')}</span></div></div>
        ${c.phone ? `<a class="icon-btn" style="color:var(--green)" href="tel:${esc(c.phone)}">${icon('phone', 19)}</a>` : ''}
        ${c.phone && c.balance && waLink(c.phone, 'x') ? `<a class="icon-btn" style="color:var(--green)" target="_blank" rel="noopener" href="${waLink(c.phone, reminder(debtGroups().find((g) => g.client_id === c.id) || { name: c.name, total: c.balance, inv: [] }))}">${icon('chat', 19)}</a>` : ''}
      </div>
      <div class="kpis">${kpi('عليه للمكتب', `<span class="red">${money(c.balance)}</span>`, `${c.open_count} فاتورة`)}${kpi('له على المكتب', `<span class="amber">${money(c.owed_to)}</span>`)}</div>
      <div class="grid2">
        <button class="btn btn-gold" id="inv">${icon('receipt', 17)} فاتورة جديدة</button>
        <button class="btn btn-ghost" id="addp">${icon('plus', 17)} مبلغ له</button>
      </div>
      ${c.balance ? `<button class="btn btn-green btn-block" id="all">${icon('check', 18)} تسديد كل الديون ${fmt(c.balance)}</button>` : ''}
      ${debts.length ? `<h2 class="sec" style="margin-top:0">الديون المفتوحة</h2><div class="card flush">${debts.map((d) => `<button class="item" data-open="debt:${d.id}"><div class="m"><b>${esc(d.receipt_no)} · ${esc(d.service_name)}</b><span>${esc(d.company_name || '')}${d.company_name ? ' · ' : ''}${daysSince(d.created_at) ? `منذ ${daysSince(d.created_at)} يوم` : 'اليوم'} · مدفوع ${fmt(d.paid_amount)}</span></div><div class="e"><b class="red num">${fmt(d.total_amount - d.paid_amount)}</b><span class="chip gold">دفعة</span></div></button>`).join('')}</div>` : ''}
      ${pays.length ? `<h2 class="sec" style="margin-top:0">مبالغ له على المكتب</h2><div class="card flush">${pays.map((p) => `<button class="item noic" data-pay="${p.id}"><div class="m"><b>${esc(p.reason)}</b><span>${p.created_at.slice(0, 10)}</span></div><div class="e"><b class="amber num">${fmt(p.amount)}</b><span class="chip">إدارة</span></div></button>`).join('')}</div>` : ''}`, (sb) => {
      sb.querySelector('#inv').onclick = () => invoiceForm(c.id);
      sb.querySelector('#addp').onclick = () => payableSheet(c);
      sb.querySelector('#all')?.addEventListener('click', () => settleAllSheet(c));
      bindRows(sb);
      sb.querySelectorAll('[data-pay]').forEach((b) => { b.onclick = () => payableSheet(c, pays.find((p) => String(p.id) === b.dataset.pay)); });
    });
  }
  function debtSheet(id) {
    const d = S.snap.debts.find((x) => String(x.id) === String(id));
    const inv = S.snap.invoices.find((x) => String(x.id) === String(id)) || { ...d, receipt_no: d.receipt_no };
    paySheet(inv, S.snap.clients.find((c) => c.id === d.client_id));
  }
  function settleAllSheet(c) {
    openSheet('تسديد كل الديون', `
      <div class="total-bar"><span class="ink2">${esc(c.name)}</span><b class="num">${fmt(c.balance)}</b></div>
      ${seg('method', [['cash', 'كاش'], ['qi_card', 'كي كارد']], 'cash')}
      <button class="btn btn-green btn-block" id="ok">${icon('check', 18)} تم التسديد</button>`, (sb) => {
      const m = bindSeg(sb, 'method');
      sb.querySelector('#ok').onclick = () => sendOp('debts:settleClient', { client_id: c.id, method: m() }, `تسديد ديون ${c.name} ${fmt(c.balance)}`);
    });
  }
  function payableSheet(c, p = null) {
    openSheet(p ? 'مبلغ له على المكتب' : `مبلغ يطلبه ${esc(c.name)}`, `
      ${moneyField('amount', 'المبلغ', p?.amount || 0)}
      <div class="field"><label>السبب</label><input class="input" name="reason" value="${esc(p?.reason || '')}" placeholder="مثال: مبلغ زائد، أمانة، استرجاع رسوم"></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>
      ${p ? `<h2 class="sec" style="margin:4px 4px 0">دفع المبلغ للعميل</h2>${seg('method', [['cash', 'كاش'], ['qi_card', 'كي كارد']], 'cash')}
        <button class="btn btn-green btn-block" id="paid">${icon('hand', 18)} تم الدفع له</button>
        <button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف المبلغ</button>` : ''}`, (sb) => {
      const m = bindSeg(sb, 'method');
      sb.querySelector('#ok').onclick = () => {
        const amount = mval(sb, 'amount'); const reason = val(sb, 'reason');
        if (!amount || !reason) return toast('أدخل المبلغ والسبب', true);
        if (p) sendOp('payables:update', { id: p.id, amount, reason }, `تعديل مبلغ ${c.name} → ${fmt(amount)}`);
        else sendOp('payables:create', { client_id: c.id, amount, reason, settle_debts: true }, `مبلغ لـ ${c.name} ${fmt(amount)}${c.balance ? ' (يُسدَّد منه دينه تلقائياً)' : ''}`);
      };
      sb.querySelector('#paid')?.addEventListener('click', () => sendOp('payables:pay', { id: p.id, method: m(), as_expense: false }, `دفع ${fmt(p.amount)} لـ ${c.name}`));
      sb.querySelector('#del')?.addEventListener('click', () => { if (confirm('حذف هذا المبلغ؟')) sendOp('payables:delete', { id: p.id }, `حذف مبلغ ${c.name}`); });
    });
  }
  function clientForm() {
    openSheet('عميل جديد', `
      <div class="field"><label>الاسم *</label><input class="input" name="name"></div>
      <div class="field"><label>الشركة</label><input class="input" name="company"></div>
      <div class="field"><label>الهاتف</label><input class="input ltr" name="phone" inputmode="tel" placeholder="07xx xxx xxxx"></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>`, (sb) => {
      sb.querySelector('#ok').onclick = () => {
        const name = val(sb, 'name'); if (!name) return toast('اكتب اسم العميل', true);
        sendOp('clients:save', { name, company: val(sb, 'company'), phone: val(sb, 'phone') }, `عميل جديد: ${name}`);
      };
    });
  }

  // ═════════════ الفلوس ═════════════
  function tabMoney() {
    const F = [['cash', 'اليوم'], ['invoices', 'الفواتير'], ['debts', 'الديون'], ['days', 'اليومي'], ['expenses', 'المصاريف'], ['year', 'السنوي'], ['external', 'الخارجي']];
    if (!F.some(([k]) => k === S.fin)) S.fin = 'cash';
    const body = ({ cash: finCash, invoices: () => tabInvoices(true), debts: debtsView, days: finDays, expenses: finExpenses, external: finExternal, year: finYear })[S.fin]();
    setTimeout(() => bindSeg($app.querySelector('#main'), 'fin', (v) => { S.fin = v; paintMain(); }));
    return `${title('الفلوس', 'خاص بالمدير', S.fin === 'invoices' ? `<button class="btn btn-gold btn-sm press" onclick="window.__zm.newInvoice()">${icon('plus', 16)} فاتورة</button>` : '')}${statusBars()}
      <div class="seg scroll" data-seg="fin">${F.map(([v, l]) => `<button type="button" data-v="${v}" class="${v === S.fin ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  }
  // ═════════════ الدخل اليومي: كل يوم بالتفصيل (كاش / كي كارد) لأي شهر ═════════════
  function dayIncome(day) {
    const d = S.snap.months[day.slice(0, 7)];
    const r = (d?.daily || []).find((x) => x.day === day) || { cash: 0, qi_card: 0, balance: 0 };
    return { ...r, total: r.cash + r.qi_card + (r.balance || 0) };
  }
  function finDays() {
    const sn = S.snap;
    const months = Object.keys(sn.months).sort();
    if (!S.dMonth || !sn.months[S.dMonth]) S.dMonth = months[months.length - 1];
    const d = sn.months[S.dMonth];
    const [y, m] = S.dMonth.split('-').map(Number);
    const last = S.dMonth === todayStr().slice(0, 7) ? Number(todayStr().slice(8)) : new Date(y, m, 0).getDate();
    const rows = Array.from({ length: last }, (_, i) => `${S.dMonth}-${String(last - i).padStart(2, '0')}`).map((day) => ({ day, ...dayIncome(day) }));
    const max = Math.max(1, ...rows.map((r) => r.total));
    const inv = (day) => sn.invoices.filter((x) => !x.is_void && !x.is_swap && x.created_at.slice(0, 10) === day).length;
    const withData = rows.filter((r) => r.total);
    const best = withData.length ? withData.reduce((a, r) => (r.total > a.total ? r : a)) : null;
    return `
      ${picker('dMonth', monthName(S.dMonth), months, S.dMonth)}
      <div class="kpis">${kpi('دخل الشهر', `<span class="gold">${money(d.monthIncome.total)}</span>`, `${withData.length} يوم فيه دخل · المعدل ${fmt(withData.length ? Math.round(d.monthIncome.total / withData.length) : 0)} باليوم`, 'wide')}${kpi('كاش', money(d.monthIncome.cash), '', '', 'var(--green)')}${kpi('كي كارد', money(d.monthIncome.qi_card), '', '', 'var(--blue)')}
        ${best ? kpi('أعلى يوم', money(best.total), dayLabel(best.day), 'wide') : ''}</div>
      <div class="card flush list days">${rows.map((r) => {
        const n = inv(r.day);
        return `<button class="item noic day-row ${r.total ? '' : 'zero'}" data-day="${r.day}">
          <div class="dnum"><b class="num">${Number(r.day.slice(8))}</b><span>${WEEK[new Date(`${r.day}T12:00:00`).getDay()]}</span></div>
          <div class="m"><div class="dbar"><i class="c" style="width:${(r.cash / max) * 100}%"></i><i class="q" style="width:${(r.qi_card / max) * 100}%"></i></div>
            <div class="dvals">${r.total ? `<i class="green">كاش <em class="num">${fmt(r.cash)}</em></i><i class="blue">كي <em class="num">${fmt(r.qi_card)}</em></i>${r.balance ? `<i>رصيد <em class="num">${fmt(r.balance)}</em></i>` : ''}` : '<i>لا يوجد دخل</i>'}${n ? `<i class="muted">${n} فاتورة</i>` : ''}</div></div>
          <div class="e"><b class="num">${r.total ? fmt(r.total) : '—'}</b></div></button>`;
      }).join('')}</div>
      <div class="foot-note">اضغط على أي يوم لتفاصيله · الفواتير متوفرة لآخر ${sn.invoiceDays || 90} يوماً</div>`;
  }
  function daySheet(day) {
    const sn = S.snap;
    const r = dayIncome(day);
    const invs = sn.invoices.filter((x) => x.created_at.slice(0, 10) === day);
    const exps = (sn.expenses || []).filter((e) => e.expense_date === day);
    const close = (sn.closings || []).find((k) => k.day === day);
    const pays = invs.flatMap((x) => (x.payments || []).filter((p) => p.created_at.slice(0, 10) === day).map((p) => ({ ...p, receipt_no: x.receipt_no })));
    const oldInv = day < addDays(todayStr(), -(sn.invoiceDays || 90));
    const [, mm, dd] = day.split('-');
    openSheet(`${WEEK[new Date(`${day}T12:00:00`).getDay()]} ${Number(dd)} ${MONTHS[Number(mm) - 1]}`, `
      <div class="card hero" style="margin:0"><div class="lbl">دخل اليوم</div><div class="big"><span class="num">${fmt(r.total)}</span><small>د.ع</small></div>
        <div class="split"><div><span>كاش</span><b class="num">${fmt(r.cash)}</b></div><div><span>كي كارد</span><b class="num">${fmt(r.qi_card)}</b></div>${r.balance ? `<div><span>من الرصيد</span><b class="num">${fmt(r.balance)}</b></div>` : ''}</div></div>
      ${close ? `<div class="card"><div class="kv"><span>جرد الصندوق</span><b>${esc(close.full_name)}</b></div><div class="kv"><span>الكاش: المفروض / المعدود</span><b class="num">${fmt(close.expected_cash)} / ${fmt(close.counted_cash)}</b></div>${close.difference ? `<div class="kv"><span>فرق الكاش</span><b class="num ${close.difference < 0 ? 'red' : 'green'}">${close.difference > 0 ? '+' : ''}${fmt(close.difference)}</b></div>` : ''}${close.counted_qi != null ? `<div class="kv"><span>الكي كارد: المسجّل / الجهاز</span><b class="num">${fmt(close.expected_qi)} / ${fmt(close.counted_qi)}</b></div>` : ''}${close.notes ? `<div class="kv"><span>السبب</span><span>${esc(close.notes)}</span></div>` : ''}</div>` : ''}
      ${oldInv ? `<div class="note">تفاصيل الفواتير متوفرة لآخر ${sn.invoiceDays || 90} يوماً — الأرقام أعلاه للدخل الكامل لهذا اليوم</div>` : `
      <h2 class="sec" style="margin:0 4px">فواتير اليوم (${invs.filter((x) => !x.is_void).length})</h2>
      <div class="card flush list">${invs.length ? invs.map((x) => `<button class="item noic" data-open="inv:${x.id}"><div class="m"><b>${esc(x.company_name || x.client_name)}${x.is_void ? ' <span class="chip red">ملغاة</span>' : ''}</b><span>${esc(x.receipt_no)} · ${esc(x.service_name || '')} · ${esc(x.by_name)}</span></div><div class="e"><b class="num">${fmt(x.total_amount)}</b>${x.total_amount > x.paid_amount && !x.is_void ? `<span class="chip red">متبقي ${fmt(x.total_amount - x.paid_amount)}</span>` : `<span class="chip gray">${METHOD[x.method] || ''}</span>`}</div></button>`).join('') : '<div class="empty">لا توجد فواتير</div>'}</div>
      ${pays.filter((p) => p.kind !== 'initial').length ? `<h2 class="sec" style="margin:0 4px">تسديدات ديون بهذا اليوم</h2><div class="card flush list">${pays.filter((p) => p.kind !== 'initial').map((p) => `<div class="item noic"><div class="m"><b>${esc(p.receipt_no)}</b><span>${METHOD[p.method] || ''} · ${esc(p.by_name)}</span></div><div class="e"><b class="green num">${fmt(p.amount)}</b></div></div>`).join('')}</div>` : ''}`}
      ${exps.length ? `<h2 class="sec" style="margin:0 4px">مصاريف اليوم</h2><div class="card flush list">${exps.map((e) => `<div class="item noic"><div class="m"><b>${esc(e.category)}${e.from_box ? ' <span class="chip gray">من الصندوق</span>' : ''}</b><span>${esc(e.notes || '')}</span></div><div class="e"><b class="red num">−${fmt(e.amount)}</b></div></div>`).join('')}</div>` : ''}`, (sb) => { bindRows(sb); });
  }

  function finExpenses() {
    const months = Object.keys(S.snap.months).sort();
    const rows = S.snap.expenses.filter((x) => x.expense_date.slice(0, 7) === S.expMonth);
    const total = rows.reduce((a, x) => a + x.amount, 0);
    const byCat = Object.values(rows.reduce((m, x) => { (m[x.category] ||= { category: x.category, total: 0 }).total += x.amount; return m; }, {})).sort((a, b) => b.total - a.total);
    return `
      ${picker('expMonth', monthName(S.expMonth), months, S.expMonth)}
      <div class="card hero"><div class="lbl">مصاريف الشهر</div><div class="big"><span class="num">${fmt(total)}</span><small>د.ع</small></div>
        <button class="btn btn-gold btn-sm press" data-act="newExp">${icon('plus', 16)} مصروف جديد</button></div>
      ${byCat.length ? `<div class="card">${bars(byCat, 'category', 'total')}</div>` : ''}
      <div class="card flush list">${pendingRows(['expenses:create', 'expenses:update', 'expenses:delete'])}${rows.length ? rows.map((x) => `<button class="item" data-open="exp:${x.id}"><div class="av gray">${icon('wallet', 18)}</div><div class="m"><b>${esc(x.category)}</b><span>${dayLabel(x.expense_date)}${x.from_box ? ' · من الصندوق' : ''}${x.notes ? ` · ${esc(x.notes)}` : ''}</span></div><div class="e"><b class="num">${fmt(x.amount)}</b></div></button>`).join('') : '<div class="empty">لا توجد مصاريف في هذا الشهر</div>'}</div>`;
  }
  function finExternal() {
    const y = String(new Date().getFullYear());
    const rows = S.snap.external.filter((x) => x.income_date.slice(0, 4) === y);
    const total = rows.reduce((a, x) => a + x.amount, 0);
    return `
      <div class="card hero"><div class="lbl">مدخولك الخارجي — سنة <span class="num">${y}</span></div><div class="big"><span class="num">${fmt(total)}</span><small>د.ع</small></div>
        <button class="btn btn-gold btn-sm press" data-act="newExt">${icon('plus', 16)} مدخول جديد</button></div>
      <div class="card flush list">${pendingRows(['external:create', 'external:delete'])}${rows.length ? rows.map((x) => `<button class="item" data-open="ext:${x.id}"><div class="av green">${icon('up', 18)}</div><div class="m"><b>${esc(x.source)}</b><span>${dayLabel(x.income_date)}${x.notes ? ` · ${esc(x.notes)}` : ''}</span></div><div class="e"><b class="green num">${fmt(x.amount)}</b></div></button>`).join('') : '<div class="empty">لا يوجد مدخول خارجي هذه السنة</div>'}</div>`;
  }
  function finYear() {
    const y = S.snap.years[S.year];
    const years = Object.keys(S.snap.years).sort();
    const months = y.months.filter((m) => m.income || m.expenses || m.external).map((m) => ({ ...m, name: MONTHS[m.month - 1] }));
    return `
      ${picker('year', `سنة <span class="num">${S.year}</span>`, years, S.year)}
      <div class="card hero"><div class="lbl">صافي الأرباح السنوي</div>
        <div class="big ${y.net < 0 ? 'red' : ''}"><span class="num">${fmt(y.net)}</span><small>د.ع</small></div>
        <div class="split"><div><span>الدخل</span><b class="num">${fmt(y.income)}</b></div><div><span>المصاريف</span><b class="num">${fmt(y.expenses)}</b></div></div></div>
      <div class="kpis">${kpi('المدخول الخارجي', `<span class="green">${money(y.external)}</span>`)}${kpi('الخصومات', money(y.discounts))}${kpi('الأرباح + الخارجي', `<span class="gold">${money(y.net + y.external)}</span>`, '', 'wide')}</div>
      <h2 class="sec">صافي الربح لكل شهر</h2>
      <div class="card">${months.length ? bars(months, 'name', 'net') : '<div class="empty">لا توجد بيانات</div>'}</div>
      ${y.externalBySource.length ? `<h2 class="sec">المدخول الخارجي حسب المصدر</h2><div class="card">${bars(y.externalBySource, 'source', 'total')}</div>` : ''}`;
  }
  function finCash() {
    const rows = S.snap.closings || [];
    const short = rows.filter((r) => r.difference < 0).reduce((a, r) => a + r.difference, 0);
    const qiShort = rows.filter((r) => r.qi_difference < 0).reduce((a, r) => a + r.qi_difference, 0);
    const bad = (r) => r.difference < 0 || r.qi_difference < 0;
    const lab = (v, lo, hi) => (v === 0 ? 'مطابق' : v < 0 ? lo : hi);
    const c = S.snap.cashToday;
    const today = c ? `<h2 class="sec">الصندوق اليوم</h2>
      <div class="kpis">${kpi('المفروض بالصندوق', `<span class="gold">${money(c.expected)}</span>`, `كاش ${fmt(c.cashIn + (c.swapIn || 0))} − مصاريف ${fmt(c.spendOut)} − لعملاء ${fmt(c.cashOut)}`, 'wide')}${kpi('كي كارد اليوم', money(c.qiIn), `${c.moves} حركة`)}${kpi('الجرد', c.closing ? (c.closing.difference || c.closing.qi_difference ? '<span class="red">بيه فرق</span>' : '<span class="green">مطابق</span>') : '<span class="muted">لم يُجرد</span>', c.closing ? `${esc(c.closing.closed_by_name)} · ${c.closing.difference ? `كاش ${c.closing.difference > 0 ? '+' : ''}${fmt(c.closing.difference)}` : 'كاش مطابق'}` : '')}</div>
      ${c.closing && (c.closing.reason || c.closing.qi_reason) ? `<div class="note">السبب: ${esc([c.closing.reason, c.closing.qi_reason].filter(Boolean).join(' / '))}</div>` : ''}
      ${(c.employees || []).length ? `<div class="card flush list">${c.employees.map((e) => `<div class="item noic"><div class="m"><b>${esc(e.full_name)}</b><span>${e.count} فاتورة · كاش ${fmt(e.cash)} · كي كارد ${fmt(e.qi)}</span></div><div class="e"><b class="num">${fmt(e.total)}</b></div></div>`).join('')}</div>` : ''}
      ${(c.spends || []).length || (c.swaps || []).length ? `<div class="card flush list">${(c.spends || []).map((e) => `<div class="item noic"><div class="m"><b>مصروف: ${esc(e.category)}</b><span>${esc(e.by_name)}${e.notes ? ` · ${esc(e.notes)}` : ''}</span></div><div class="e"><b class="red num">−${fmt(e.amount)}</b><button class="chip red" data-spdel="${e.id}">${icon('trash', 12)}</button></div></div>`).join('')}
        ${(c.swaps || []).map((w) => `<div class="item noic"><div class="m"><b>كي كارد مقابل كاش${w.party ? ` · ${esc(w.party)}` : ''}</b><span>${esc(w.by_name)}${w.receipt_no ? ` · مع ${esc(w.receipt_no)}` : ''}${w.notes ? ` · ${esc(w.notes)}` : ''}</span></div><div class="e"><b class="green num">+${fmt(w.cash_amount)}</b><button class="chip red" data-swdel="${w.id}">${icon('trash', 12)}</button></div></div>`).join('')}</div>` : ''}
      <h2 class="sec">سجل الجرد</h2>` : '';
    setTimeout(() => {
      const m = $app.querySelector('#main'); if (!m) return;
      m.querySelectorAll('[data-spdel]').forEach((b) => { b.onclick = () => { if (confirm('حذف هذا المصروف من الصندوق؟')) sendOp('cash:spendDelete', { id: Number(b.dataset.spdel) }, 'حذف مصروف من الصندوق'); }; });
      m.querySelectorAll('[data-swdel]').forEach((b) => { b.onclick = () => { if (confirm('حذف عملية الكي كارد مقابل كاش؟')) sendOp('cash:swapDelete', { id: Number(b.dataset.swdel) }, 'حذف كي كارد مقابل كاش'); }; });
    });
    return `${today}
      <div class="kpis">${kpi('أيام الجرد (30 يوماً)', `<span class="num">${rows.length}</span>`)}${kpi('نقص الكاش', `<span class="${short ? 'red' : 'green'}">${money(Math.abs(short))}</span>`)}${kpi('فرق الكي كارد (نقص)', `<span class="${qiShort ? 'red' : 'green'}">${money(Math.abs(qiShort))}</span>`, '', 'wide')}</div>
      <div class="card flush list">${rows.length ? rows.map((r) => {
        const hasQi = r.counted_qi != null;
        const qd = r.qi_difference || 0;
        return `<div class="item"><div class="av ${bad(r) ? 'red' : (r.difference > 0 || qd > 0) ? 'green' : 'gray'}">${initial(r.full_name)}</div>
        <div class="m"><b>${dayLabel(r.day)}</b><span>جرده ${esc(r.full_name)} · الكاش: المتوقع ${fmt(r.expected_cash)} · المعدود ${fmt(r.counted_cash)}${r.notes ? ` · ${esc(r.notes)}` : ''}</span>
          <span>الكي كارد: المسجّل ${fmt(r.expected_qi)}${hasQi ? ` · الجهاز ${fmt(r.counted_qi)}${qd ? ` · <b class="${qd < 0 ? 'red' : 'green'}">${qd > 0 ? '+' : ''}${fmt(qd)}</b>` : ''}${r.qi_reason ? ` · ${esc(r.qi_reason)}` : ''}` : ' · لم يُطابق'}</span></div>
        <div class="e"><b class="num ${r.difference < 0 ? 'red' : r.difference > 0 ? 'green' : ''}">${r.difference > 0 ? '+' : ''}${fmt(r.difference)}</b><span class="chip ${r.difference < 0 ? 'red' : 'green'}">كاش ${lab(r.difference, 'نقص', 'زيادة')}</span>${hasQi ? `<span class="chip ${qd < 0 ? 'red' : 'green'}">كي ${lab(qd, 'نقص', 'زيادة')}</span>` : ''}</div></div>`;
      }).join('') : '<div class="empty">لا توجد مطابقات صندوق بعد</div>'}</div>
      <div class="foot-note">جرد الصندوق (الكاش والكي كارد) يتم من برنامج المكتب — صفحة الصندوق</div>`;
  }

  function expenseSheet(id = null) {
    const x = id ? S.snap.expenses.find((e) => String(e.id) === String(id)) : null;
    const cats = S.snap.categories?.length ? S.snap.categories : ['إيجار', 'رواتب', 'كهرباء', 'إنترنت', 'قرطاسية', 'ضيافة', 'نقل'];
    openSheet(x ? 'تعديل مصروف' : 'مصروف جديد', `
      ${moneyField('amount', 'المبلغ', x?.amount || 0, x ? '' : 'autofocus')}
      <div class="field"><label>البند</label><input class="input" name="category" value="${esc(x?.category || '')}" placeholder="مثال: إيجار"></div>
      <div class="chips wrap">${cats.map((c) => `<button type="button" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${x?.expense_date || todayStr()}"></div>
      <div class="field"><label>ملاحظات</label><input class="input" name="notes" value="${esc(x?.notes || '')}"></div>
      <div class="card flush"><label class="ntg"><span><b>دُفع من صندوق المكتب</b><small>فعّله إذا أُخذ المبلغ من صندوق المكتب — يُخصم عند الجرد</small></span><input type="checkbox" name="box" ${x?.from_box ? 'checked' : ''}><i></i></label></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>
      ${x ? `<button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف المصروف</button>` : ''}`, (sb) => {
      sb.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => { sb.querySelector('[name="category"]').value = b.dataset.cat; sb.querySelectorAll('[data-cat]').forEach((y) => y.classList.toggle('on', y === b)); }; });
      sb.querySelector('#ok').onclick = () => {
        const p = { category: val(sb, 'category'), amount: mval(sb, 'amount'), expense_date: val(sb, 'date'), notes: val(sb, 'notes'), from_box: sb.querySelector('[name="box"]').checked };
        if (!p.category || !p.amount || !p.expense_date) return toast('أدخل المبلغ والبند والتاريخ', true);
        if (x) sendOp('expenses:update', { id: x.id, ...p }, `تعديل مصروف ${p.category} ${fmt(p.amount)}`);
        else sendOp('expenses:create', p, `مصروف ${p.category} ${fmt(p.amount)}`);
      };
      sb.querySelector('#del')?.addEventListener('click', () => { if (confirm('حذف هذا المصروف؟')) sendOp('expenses:delete', { id: x.id }, `حذف مصروف ${x.category}`); });
    });
  }
  function externalSheet(id = null) {
    const x = id ? S.snap.external.find((e) => String(e.id) === String(id)) : null;
    if (x) {
      return openSheet('مدخول خارجي', `<div class="card"><div class="kv"><span>المصدر</span><b>${esc(x.source)}</b></div><div class="kv"><span>المبلغ</span><b class="green num">${fmt(x.amount)}</b></div><div class="kv"><span>التاريخ</span><b>${x.income_date}</b></div>${x.notes ? `<div class="kv"><span>ملاحظات</span><span>${esc(x.notes)}</span></div>` : ''}</div>
        <button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف</button>`, (sb) => {
        sb.querySelector('#del').onclick = () => { if (confirm('حذف هذا المدخول؟')) sendOp('external:delete', { id: x.id }, `حذف مدخول ${x.source}`); };
      });
    }
    return openSheet('مدخول خارجي جديد', `
      ${moneyField('amount', 'المبلغ', 0, 'autofocus')}
      <div class="field"><label>مصدر المدخول</label><input class="input" name="source" placeholder="مثال: إيجار عقار، أرباح شراكة"></div>
      <div class="field"><label>التاريخ</label><input class="input" type="date" name="date" value="${todayStr()}"></div>
      <div class="field"><label>ملاحظات</label><input class="input" name="notes"></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>`, (sb) => {
      sb.querySelector('#ok').onclick = () => {
        const p = { source: val(sb, 'source'), amount: mval(sb, 'amount'), income_date: val(sb, 'date'), notes: val(sb, 'notes') };
        if (!p.source || !p.amount) return toast('أدخل المبلغ والمصدر', true);
        sendOp('external:create', p, `مدخول ${p.source} ${fmt(p.amount)}`);
      };
    });
  }

  // ═════════════ دفع بالكي كارد عن زبون مقابل استلام كاش ═════════════
  function swapSheet(sale = null) {
    const sn = S.snap;
    const clients = (sn.clients || []);
    openSheet(sale ? `كي كارد مقابل كاش — ${esc(sale.receipt_no)}` : 'دفع بالكي كارد مقابل كاش', `
      <div class="muted" style="font-size:13.5px;line-height:1.8">دفعت من حساب الكي كارد عن الزبون، وهو يسلّمك كاش. الكاش يدخل الصندوق، وإذا سلّم أقل يبقى الباقي ديناً عليه.</div>
      ${sale ? `<div class="card"><div class="kv"><span>الفاتورة</span><b>${esc(sale.receipt_no)} · ${esc(sale.company_name || sale.client_name)}</b></div></div>` : `<div class="field"><label>العميل (مطلوب إذا يبقى عليه دين)</label><select class="input" name="client"><option value="">زبون مباشر / بدون عميل</option>${clients.map((c) => `<option value="${c.id}">${esc(c.name)}${c.company ? ` — ${esc(c.company)}` : ''}</option>`).join('')}</select></div>
      <div class="field" id="partyf"><label>اسم الزبون / الشركة</label><input class="input" name="party"></div>`}
      <div class="grid2">${moneyField('card', 'دفعت بالكي كارد', 0, 'autofocus')}${moneyField('cash', 'استلمت كاش', 0)}</div>
      <div id="swmsg"></div>
      <div class="field"><label>السبب</label><input class="input" name="notes" placeholder="مثال: رسوم تسجيل"></div>
      <div class="total-bar"><span class="ink2">يدخل الصندوق كاش</span><b class="num green" id="sw-total">0</b></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} تسجيل</button>`, (sb) => {
      let touched = false;
      const cid = () => (sale ? sale.client_id : Number(val(sb, 'client')) || null);
      sb.querySelector('[name="cash"]').addEventListener('input', () => { touched = true; });
      const cashOf = () => (touched ? mval(sb, 'cash') : mval(sb, 'card'));
      const paint = () => {
        if (!touched) { const v = mval(sb, 'card'); sb.querySelector('[name="cash"]').value = v ? fmt(v) : ''; }
        const short = mval(sb, 'card') - cashOf();
        sb.querySelector('#sw-total').textContent = fmt(cashOf() || 0);
        sb.querySelector('#swmsg').innerHTML = short > 0 ? `<div class="note ${cid() ? 'amber' : 'red'}">${cid() ? `الباقي <b class="num">${fmt(short)}</b> يُسجَّل ديناً على العميل` : 'سلّم أقل؟ اختر العميل حتى يُسجَّل الباقي ديناً'}</div>` : short < 0 ? `<div class="note green">العمولة <b class="num">${fmt(-short)}</b> تُسجّل مدخولاً للمكتب</div>` : '';
        const pf = sb.querySelector('#partyf'); if (pf) pf.hidden = !!cid();
      };
      sb.addEventListener('input', paint); sb.addEventListener('change', paint);
      sb.querySelector('#ok').onclick = () => {
        const card = mval(sb, 'card'); const cash = cashOf();
        if (!card) return toast('أدخل المبلغ المدفوع بالكي كارد', true);
        if (cash < card && !cid()) return toast('اختر العميل حتى يُسجَّل الباقي ديناً عليه', true);
        const p = { card_amount: card, cash_amount: cash, notes: val(sb, 'notes'), day: todayStr() };
        if (sale) p.sale_id = sale.id; else if (cid()) p.client_id = cid(); else p.party = val(sb, 'party');
        const who = sale ? sale.receipt_no : (clients.find((c) => c.id === cid())?.name || p.party || '');
        sendOp('cash:swap', p, `كي كارد مقابل كاش ${fmt(card)}${who ? ` — ${who}` : ''}${cash < card ? ` (دين ${fmt(card - cash)})` : ''}`);
      };
    });
  }


  // ═════════════ جدول الأعمال ═════════════
  // ───── سجل النشاط (كل التعديلات على النظام) ─────
  function auditRow(a) {
    const red = /delete|void/.test(a.action || ''); const amber = /update/.test(a.action || '');
    return `<button class="item noic" data-audit="${a.id}" style="align-items:flex-start">
      <span style="width:9px;height:9px;border-radius:50%;margin-top:7px;flex:none;background:${red ? 'var(--red)' : amber ? 'var(--amber)' : 'var(--gold)'}"></span>
      <div class="m"><b style="white-space:normal;line-height:1.5">${esc(a.summary)}</b>
        ${a.reason ? `<span class="amber" style="white-space:normal">السبب: ${esc(a.reason)}</span>` : ''}
        <span>${dayTime(a.at)}${a.user_name ? ` · ${esc(a.user_name)}` : ''}${a.source ? ` · ${esc(a.source)}` : ''}</span></div></button>`;
  }
  function auditDetail(a) {
    const d = a.details; let body = '';
    if (d?.before) {
      const b = d.before; const f = d.after; const rows = [];
      const cmp = (l, x, y, mny) => { if ((x ?? '') !== (y ?? '')) rows.push(`<div class="kv"><span>${l}</span><span><s class="muted">${esc(mny ? fmt(x) : x || '—')}</s> ← <b>${esc(mny ? fmt(y) : y || '—')}</b></span></div>`); };
      cmp('المجموع', b.total, f.total, 1); cmp('المدفوع', b.paid, f.paid, 1); cmp('العميل', b.client, f.client); cmp('الشركة', b.company, f.company); cmp('ملاحظات', b.notes, f.notes);
      const k = (i) => `${i.name}|${i.price}`; const bi = b.items.map(k); const fi = f.items.map(k);
      b.items.filter((i) => !fi.includes(k(i))).forEach((i) => rows.push(`<div class="kv"><span class="red">حُذفت</span><span>${esc(i.name)} ${fmt(i.price)}</span></div>`));
      f.items.filter((i) => !bi.includes(k(i))).forEach((i) => rows.push(`<div class="kv"><span class="green">أضيفت</span><span>${esc(i.name)} ${fmt(i.price)}</span></div>`));
      if (d.payment) rows.push(`<div class="kv"><span class="green">دفعة</span><span>${fmt(d.payment.amount)} ${METHOD[d.payment.method] || ''}</span></div>`);
      body = `<div class="card">${rows.join('') || '<div class="muted">لا فرق ظاهر</div>'}</div>`;
    } else if (d?.deleted) {
      body = `<div class="card flush">${d.deleted.map((x) => `<div class="item noic"><div class="m"><b>${esc(x.receipt_no)} · ${esc(x.company_name || x.client_name)}</b><span style="white-space:normal">${x.items.map((i) => `${esc(i.name)} ${fmt(i.price)}`).join('، ')}</span></div><div class="e"><b class="num red">${fmt(x.total_amount)}</b></div></div>`).join('')}</div>`;
    }
    openSheet('تفاصيل العملية', `<div class="card"><b style="line-height:1.6">${esc(a.summary)}</b>
      ${a.reason ? `<div class="kv"><span>السبب</span><b class="amber">${esc(a.reason)}</b></div>` : ''}
      <div class="kv"><span>بواسطة</span><b>${esc(a.user_name || '—')}</b></div><div class="kv"><span>الجهاز</span><b>${esc(a.source || '—')}</b></div><div class="kv"><span>الوقت</span><b>${dayTime(a.at)}</b></div></div>${body}
      <button class="btn btn-ghost btn-block red" id="adel">${icon('trash', 17)} حذف من السجل</button>`, (sb) => {
      sb.querySelector('#adel').onclick = () => { if (confirm('حذف هذا النشاط من السجل؟')) sendOp('audit:delete', { ids: [a.id] }, `حذف نشاط: ${a.summary.slice(0, 40)}`); };
    });
  }
  // الأنشطة المحذوفة من الآيفون تختفي فوراً (قبل أن يطبقها جهاز المكتب)
  const auditHidden = () => { const h = new Set(); queue().filter((o) => o.type === 'audit:delete').forEach((o) => (o.payload.ids || []).forEach((i) => h.add(i))); return h; };
  const auditList = () => { const h = auditHidden(); return (S.snap.audit || []).filter((a) => !h.has(a.id)); };
  function bindAudit(root) {
    root.querySelectorAll('[data-audit]').forEach((el) => { el.onclick = () => { const a = (S.snap.audit || []).find((x) => String(x.id) === el.dataset.audit); if (a) auditDetail(a); }; });
  }
  function activitySheet() {
    const all = auditList();
    const types = [['', 'الكل'], ['sale', 'الفواتير'], ['client', 'العملاء'], ['expense', 'المصاريف'], ['task', 'الأعمال']];
    let type = ''; let q = '';
    openSheet('سجل النشاط', `
      <div class="search">${icon('search', 18)}<input class="input" id="aq" type="search" placeholder="بحث: فاتورة، اسم، سبب"></div>
      <div class="chips" id="at">${types.map(([k, l]) => `<button data-t="${k}" class="${k === type ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="card flush" id="alist"></div>
      <button class="btn btn-ghost btn-block" id="dlogin">${icon('trash', 17)} حذف كل تسجيلات الدخول من السجل</button>`, (sb) => {
      sb.querySelector('#dlogin').onclick = () => { const ids = all.filter((a) => a.action === 'auth:login').map((a) => a.id); if (!ids.length) return toast('لا توجد تسجيلات دخول', true); if (confirm(`حذف ${ids.length} من تسجيلات الدخول؟`)) sendOp('audit:delete', { ids }, `حذف ${ids.length} تسجيل دخول من السجل`); };
      const paint = () => {
        const rows = all.filter((a) => (!type || a.entity === type) && (!q || `${a.summary} ${a.reason || ''} ${a.user_name || ''}`.includes(q)));
        sb.querySelector('#alist').innerHTML = rows.length ? rows.map(auditRow).join('') : '<div class="empty">لا يوجد</div>';
        bindAudit(sb);
      };
      sb.querySelector('#aq').oninput = (e) => { q = e.target.value.trim(); paint(); };
      sb.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { type = b.dataset.t; sb.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); paint(); }; });
      paint();
    });
  }

  function tasksSheet() {
    const list = S.snap.tasks || [];
    openSheet('جدول الأعمال', `
      <button class="btn btn-gold btn-block" id="new">${icon('plus', 17)} عمل جديد</button>
      <div class="card flush">${list.length ? list.map(taskRow).join('') : '<div class="empty">لا توجد أعمال مفتوحة</div>'}</div>
      <h2 class="sec" style="margin:4px 4px 0">إنجازات الموظفين — آخر 3 أيام</h2>
      <div class="card flush">${(S.snap.doneTasks || []).length ? S.snap.doneTasks.map((t) => {
        const sent = queue().find((o) => o.type === 'tasks:react' && o.payload.id === t.id);
        const r = sent ? sent.payload.reaction : t.reaction;
        return `<div class="item noic" style="align-items:flex-start"><div class="m"><b style="white-space:normal">${esc(t.done_name || '')} أنجز: ${esc(t.title)}</b>
          <span>${esc(t.company || t.client_name || '')}${t.company || t.client_name ? ' · ' : ''}${dayTime(t.done_at)}</span>
          ${t.done_note ? `<span style="white-space:normal">«${esc(t.done_note)}»</span>` : ''}
          <div class="chips" style="margin-top:6px">${Object.entries(REACT).map(([k, l]) => `<button data-react="${t.id}:${k}" class="${r === k ? 'on' : ''}">${l}</button>`).join('')}</div></div></div>`;
      }).join('') : '<div class="empty">لا توجد إنجازات حديثة</div>'}</div>`, (sb) => {
      sb.querySelector('#new').onclick = () => taskSheet();
      sb.querySelectorAll('[data-react]').forEach((b) => { b.onclick = () => {
        const [id, reaction] = b.dataset.react.split(':'); const t = S.snap.doneTasks.find((x) => String(x.id) === id);
        if (reaction === 'note') {
          openSheet('ملاحظة للموظف', `<div class="card"><b>${esc(t.title)}</b></div><input class="input" name="n" placeholder="اكتب ملاحظتك"><button class="btn btn-gold btn-block" id="ok">إرسال</button>`, (s2) => {
            s2.querySelector('#ok').onclick = () => { const n = val(s2, 'n'); if (!n) return toast('اكتب الملاحظة', true); sendOp('tasks:react', { id: t.id, reaction, note: n }, `رد على إنجاز: ${t.title}`); };
          });
        } else sendOp('tasks:react', { id: t.id, reaction }, `${REACT[reaction]} — ${t.title}`);
      }; });
      sb.querySelectorAll('[data-act]').forEach((el) => { el.onclick = () => act(el.dataset.act, el.dataset.v); });
      bindRows(sb);
    });
  }
  function taskSheet(id = null) {
    const t = id ? (S.snap.tasks || []).find((x) => String(x.id) === String(id)) : null;
    const users = S.snap.users || [];
    const td = todayStr();
    let due = t?.due_date || td;
    openSheet(t ? 'تعديل العمل' : 'عمل جديد', `
      <div class="field"><label>العمل المطلوب *</label><textarea class="input" name="title" rows="2" placeholder="مثال: مراجعة دائرة التسجيل لاستلام الشهادة">${esc(t?.title || '')}</textarea></div>
      <div class="grid2"><input class="input" name="company" placeholder="الشركة" value="${esc(t?.company || '')}"><input class="input" name="client" placeholder="العميل" value="${esc(t?.client_name || '')}"></div>
      <input class="input" name="phone" inputmode="tel" placeholder="الهاتف" value="${esc(t?.phone || '')}">
      <div class="field"><label>اليوم</label><div class="chips wrap" id="days">${[['اليوم', td], ['غداً', addDays(td, 1)], ['بعد يومين', addDays(td, 2)], ['بعد أسبوع', addDays(td, 7)]].map(([l, d]) => `<button type="button" data-d="${d}" class="${d === due ? 'on' : ''}">${l}</button>`).join('')}</div>
        <input class="input" type="date" name="due" value="${due}"></div>
      <div class="grid2"><div class="field"><label>وقت التذكير</label><input class="input" type="time" name="remind" value="${esc(t?.remind_at || '')}"></div>
        <div class="field"><label>الأهمية</label><select class="input" name="pri">${[[0, 'عادي'], [1, 'مهم'], [2, 'عاجل']].map(([v, l]) => `<option value="${v}" ${(t?.priority || 0) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="field"><label>مُسند إلى</label><select class="input" name="who">${users.map((u) => `<option value="${u.id}" ${(t ? t.assigned_to === u.id : u.role === 'admin') ? 'selected' : ''}>${esc(u.full_name)}</option>`).join('')}</select></div>
      <div class="field"><label>تفاصيل</label><textarea class="input" name="details" rows="2">${esc(t?.details || '')}</textarea></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>
      ${t ? `<div class="grid2"><button class="btn btn-green" id="done">${icon('check', 17)} تم</button><button class="btn btn-ghost" id="later">${icon('clock', 17)} تأجيل</button></div>` : ''}`, (sb) => {
      const dueEl = sb.querySelector('[name="due"]');
      sb.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { due = b.dataset.d; dueEl.value = due; sb.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      sb.querySelector('#ok').onclick = () => {
        const p = { id: t?.id, title: val(sb, 'title'), company: val(sb, 'company'), client_name: val(sb, 'client'), phone: val(sb, 'phone'), details: val(sb, 'details'), due_date: dueEl.value, assigned_to: Number(val(sb, 'who')) || undefined, remind_at: val(sb, 'remind') || null, priority: Number(val(sb, 'pri')) || 0 };
        if (!p.title || !p.due_date) return toast('اكتب العمل واختر اليوم', true);
        sendOp('tasks:save', p, `${t ? 'تعديل' : 'عمل'}: ${p.title}`);
      };
      sb.querySelector('#done')?.addEventListener('click', () => doneTask(t.id));
      sb.querySelector('#later')?.addEventListener('click', () => postponeSheet(t.id));
    });
  }
  function doneTask(id) {
    const t = (S.snap.tasks || []).find((x) => String(x.id) === String(id));
    if (t) sendOp('tasks:done', { id: t.id }, `إنجاز: ${t.title}`);
  }
  function postponeSheet(id) {
    const t = (S.snap.tasks || []).find((x) => String(x.id) === String(id));
    if (!t) return;
    const td = todayStr();
    let d = addDays(t.due_date > td ? t.due_date : td, 1);
    openSheet('تأجيل إلى يوم آخر', `
      <div class="card"><b>${esc(t.title)}</b></div>
      <div class="chips wrap">${[['غداً', addDays(td, 1)], ['بعد يومين', addDays(td, 2)], ['بعد 3 أيام', addDays(td, 3)], ['الأسبوع القادم', addDays(td, 7)]].map(([l, x]) => `<button type="button" data-d="${x}" class="${x === d ? 'on' : ''}">${l}</button>`).join('')}</div>
      <input class="input" type="date" name="due" min="${td}" value="${d}">
      <div class="field"><label>سبب التأجيل (اختياري)</label><input class="input" name="note" placeholder="مثال: الدائرة مغلقة"></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('clock', 17)} تأجيل</button>`, (sb) => {
      const el = sb.querySelector('[name="due"]');
      sb.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { d = b.dataset.d; el.value = d; sb.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      sb.querySelector('#ok').onclick = () => { if (!el.value || el.value === t.due_date) return toast('اختر يوماً مختلفاً', true); sendOp('tasks:postpone', { id: t.id, due_date: el.value, note: val(sb, 'note') }, `تأجيل: ${t.title} → ${dayLabel(el.value)}`); };
    });
  }

  // ═════════════ إشعارات الهاتف (تصل حتى والتطبيق مغلق) ═════════════
  // الحاسبة الرئيسية ترسل الإشعار مباشرة عبر خدمة إشعارات Apple عند كل فاتورة / مصروف / خصم / إلغاء…
  const PUSH_DEFAULT = { inv: true, invMin: 0, disc: true, discMin: 0, exp: true, expMin: 0, danger: true, pay: false, cash: true, mine: false };
  const pushPrefs = () => ({ ...PUSH_DEFAULT, ...(LS.get('zm-push-prefs') || {}) });
  const keyBytes = (b64) => { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  async function currentSub() {
    try { const r = await navigator.serviceWorker?.getRegistration(); return (await r?.pushManager?.getSubscription()) || null; } catch { return null; }
  }
  async function notifSheet() {
    const standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const key = S.snap?.push?.key;
    const sub = supported ? await currentSub() : null;
    const onOffice = sub && (S.snap?.push?.devices || []).some((d) => sub.endpoint.endsWith(d.endpoint));
    const pending = queue().some((o) => o.type === 'push:subscribe');
    const P = pushPrefs();
    const tg = (k, label, sub2 = '') => `<label class="ntg"><span><b>${label}</b>${sub2 ? `<small>${sub2}</small>` : ''}</span><input type="checkbox" data-k="${k}" ${P[k] ? 'checked' : ''}><i></i></label>`;
    let warn = '';
    if (!standalone) warn = 'لتصلك الإشعارات: افتح التطبيق من أيقونته على الشاشة الرئيسية (وليس من Safari). إذا لم تضفه بعد: زر المشاركة ← «إضافة إلى الشاشة الرئيسية».';
    else if (!supported) warn = 'الإشعارات تحتاج iOS 16.4 أو أحدث — حدّث الآيفون من الإعدادات ← عام ← تحديث البرنامج.';
    else if (!key) warn = 'حدّث برنامج المكتب على الحاسبة الرئيسية للنسخة الجديدة حتى تعمل الإشعارات.';
    else if (Notification.permission === 'denied') warn = 'الإشعارات مرفوضة لهذا التطبيق — فعّلها من إعدادات الآيفون ← الإشعارات ← مكتب زين المختار.';
    const status = warn ? `<div class="card" style="border-color:var(--amber);color:var(--amber);line-height:1.8;font-size:14px">${warn}</div>`
      : `<div class="card" style="display:flex;gap:10px;align-items:center"><span class="av ${onOffice ? 'green' : pending ? 'amber' : 'gray'}">${icon(onOffice ? 'check' : 'bell', 18)}</span><div style="flex:1"><b>${onOffice ? 'الإشعارات مفعّلة على هذا الآيفون' : pending ? 'بانتظار تأكيد الحاسبة الرئيسية…' : sub ? 'غير مسجّل في المكتب بعد' : 'الإشعارات غير مفعّلة'}</b><div class="muted" style="font-size:12.5px;margin-top:2px">تصلك حتى والتطبيق مغلق، ما دامت الحاسبة الرئيسية شغالة ومتصلة بالإنترنت</div></div></div>`;
    openSheet('الإشعارات', `${status}
      <h2 class="sec" style="margin:4px 4px 0">ما الذي يصلك؟</h2>
      <div class="card flush">
        ${tg('inv', '🧾 الفواتير الجديدة')}
        ${tg('disc', '🏷️ الخصومات')}
        ${tg('exp', '💸 المصاريف')}
        ${tg('danger', '⚠️ إلغاء أو حذف أو تعديل فاتورة', 'ومبالغ العملاء — مهم')}
        ${tg('cash', '📦 نقص أو زيادة في جرد الصندوق')}
        ${tg('pay', '💵 تسديد الديون والدفعات')}
        ${tg('mine', 'عملياتي أنا أيضاً', 'عادةً تصلك عمليات الموظفين فقط')}
      </div>
      <h2 class="sec" style="margin:4px 4px 0">المهم فقط (اتركه فارغاً لاستلام الكل)</h2>
      ${moneyField('invMin', 'الفواتير التي مبلغها أكثر من', P.invMin)}
      ${moneyField('discMin', 'الخصومات الأكثر من', P.discMin)}
      ${moneyField('expMin', 'المصاريف الأكثر من', P.expMin)}
      <button class="btn btn-gold btn-block" id="on" ${warn ? 'disabled' : ''}>${icon('bell', 18)} ${onOffice ? 'حفظ الإعدادات' : 'تفعيل الإشعارات'}</button>
      ${sub ? `<button class="btn btn-ghost btn-block" id="off">إيقاف الإشعارات على هذا الآيفون</button>` : ''}
      <div class="foot-note">بعد التفعيل يصلك إشعار تجريبي خلال دقيقة تقريباً</div>`, (sb) => {
      sb.querySelector('#on').onclick = async () => {
        const prefs = { ...P };
        sb.querySelectorAll('[data-k]').forEach((c) => { prefs[c.dataset.k] = c.checked; });
        ['invMin', 'discMin', 'expMin'].forEach((k) => { prefs[k] = mval(sb, k) || 0; });
        LS.set('zm-push-prefs', prefs);
        try {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') return toast('لم تسمح بالإشعارات', true);
          const reg = await navigator.serviceWorker.ready;
          let s2 = await reg.pushManager.getSubscription();
          if (!s2) s2 = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
          sendOp('push:subscribe', { sub: s2.toJSON(), prefs, device: 'آيفون', test: !onOffice }, onOffice ? 'تحديث إعدادات الإشعارات' : 'تفعيل الإشعارات');
        } catch (e) { toast(`تعذّر التفعيل: ${e.message || e}`, true); }
      };
      sb.querySelector('#off')?.addEventListener('click', async () => {
        try { const s2 = await currentSub(); if (s2) { const ep = s2.endpoint; await s2.unsubscribe(); sendOp('push:unsubscribe', { endpoint: ep }, 'إيقاف الإشعارات'); } } catch (e) { toast(String(e.message || e), true); }
      });
    });
  }

  // ═════════════ زر (+): كل عمليات المكتب من مكان واحد ═════════════
  const ADD = [
    ['inv', 'receipt', 'فاتورة'], ['debt', 'cash', 'تسديد دين'], ['exp', 'wallet', 'مصروف'],
    ['req', 'chat', 'إرسال متطلبات'], ['task', 'task', 'عمل لموظف'], ['swap', 'card', 'كي كارد بكاش'],
    ['sal', 'users', 'صرف رواتب'], ['abs', 'clock', 'غياب / إجازة'], ['dep', 'hand', 'إيداع من جيبي'],
    ['courier', 'building', 'عهدة لمحامي'], ['client', 'userPlus', 'عميل جديد'], ['ext', 'up', 'مدخول خارجي'],
  ];
  function addAction(k) {
    LS.set('zm-recent', [k, ...(LS.get('zm-recent') || []).filter((x) => x !== k)].slice(0, 3));
    ({
      inv: () => invoiceForm(), exp: () => expenseSheet(), req: () => reqSheet(), task: () => taskSheet(), swap: () => swapSheet(), client: () => clientForm(), ext: () => externalSheet(),
      sal: salPaySheet, abs: absSheet, dep: depositSheet, courier: couriersSheet,
      debt: () => { S.tab = 'office'; S.oseg = 'clients'; closeSheet(true); render(); toast('اختر العميل ثم «دفعة»'); },
    })[k]?.();
  }
  function addMenu() {
    const sal = !!S.snap.sal;
    const list = ADD.filter(([k]) => sal || !['sal', 'abs', 'dep'].includes(k));
    const recent = (LS.get('zm-recent') || []).map((k) => ADD.find((a) => a[0] === k)).filter(Boolean);
    openSheet('شنو تريد تسوي؟', `<div class="grid3">${list.map(([k, i, t], n) => `<button class="press ${n === 0 ? 'pri' : ''}" data-add="${k}">${icon(i, 24)}<span>${t}</span></button>`).join('')}</div>
      ${recent.length ? `<div class="recent"><span>آخر شي سويته:</span>${recent.map(([k, , t]) => `<button data-add="${k}">${t}</button>`).join('')}</div>` : ''}`, (sb) => {
      sb.querySelectorAll('[data-add]').forEach((b) => { b.onclick = () => addAction(b.dataset.add); });
    });
  }
  // ═════════════ التشغيل ═════════════
  window.__zm = { newInvoice: () => invoiceForm() };
  function render() {
    if (!cfg.k || !cfg.o) return viewPair();
    if (!S.snap || !S.user) { closeSheet(true); return viewLogin(); }
    if (!$app.querySelector('.tabs')) return viewShell();
    $app.querySelectorAll('.tabs button[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    paintTop();
    const a = document.activeElement;
    if (!a || !['q', 'cq', 'gs'].includes(a.id)) paintMain();
  }

  async function boot() {
    cfg = readPairing();
    if (!cfg.k || !cfg.o) return viewPair();
    const cached = LS.get('zm-snap');
    if (cached) { try { S.snap = await decrypt(cached); reconcile(); checkSession(); } catch { /* ignore */ } }
    render();
    refresh({ silent: true });
  }

  window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) { S.snap = null; S.user = null; boot(); } });
  window.addEventListener('online', () => flushQueue());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh({ silent: true }); });
  setInterval(() => { if (document.visibilityState === 'visible' && S.user && !sheetEl) refresh({ silent: true }); }, 45000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // عند رفع نسخة جديدة من التطبيق إلى GitHub: يُحمَّل التحديث في الخلفية ثم يُعاد فتح الصفحة مرة واحدة
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'refresh' && S.snap) refresh(); });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});
  }
  boot();
})();
