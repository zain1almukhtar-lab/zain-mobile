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
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>', chevL: '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    up: '<path d="M7 17 17 7M8 7h9v9"/>', cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    task: '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 12l3 3 5-5"/>',
    userPlus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', building: '<path d="M5 21V4h10v17M15 9h4v12M9 8h2M9 12h2M9 16h2"/>',
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
    tab: 'home', fin: 'expenses', month: null, expMonth: null, year: null,
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
  const TABS = [['home', 'الرئيسية', 'home'], ['invoices', 'الفواتير', 'receipt'], ['add', '', 'plus'], ['clients', 'العملاء', 'users'], ['finance', 'المالية', 'wallet']];

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
        <button class="icon-btn press" id="rf" aria-label="تحديث">${icon('refresh', 19)}</button>
        <button class="icon-btn press" id="lo" aria-label="خروج">${icon('logout', 19)}</button>
      </div></header>
      <main id="main"></main>
      <nav class="tabs"><div class="in">
        ${TABS.map(([k, l, i]) => (k === 'add'
          ? `<button data-tab="add" aria-label="إضافة"><span class="fab">${icon('plus', 26)}</span></button>`
          : `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(i, 23)}<span>${l}</span></button>`)).join('')}
      </div></nav>`;
    $app.querySelector('#rf').onclick = () => { refresh(); flushQueue(); };
    $app.querySelector('#lo').onclick = () => { if (confirm('تسجيل الخروج؟')) { LS.del('zm-session'); S.user = null; render(); } };
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
    main.innerHTML = ({ home: tabHome, invoices: tabInvoices, clients: tabClients, finance: tabFinance })[S.tab]();
    main.querySelectorAll('[data-act]').forEach((el) => { el.onclick = (e) => { e.stopPropagation(); act(el.dataset.act, el.dataset.v, el); }; });
    const q = main.querySelector('#q');
    if (q) q.oninput = () => { S.q = q.value; main.querySelector('#invlist').innerHTML = invoiceList(); bindRows(main); };
    const cq = main.querySelector('#cq');
    if (cq) cq.oninput = () => { S.cq = cq.value; main.querySelector('#clist').innerHTML = clientList(); bindRows(main); };
    bindRows(main);
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
    else if (a === 'year') S.year = step(years, S.year, Number(v));
    else if (a === 'day') S.invDay = v || null;
    else if (a === 'fin') S.fin = v;
    else if (a === 'tasks') return tasksSheet();
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

  // ═════════════ الرئيسية ═════════════
  function tabHome() {
    const sn = S.snap;
    const d = sn.months[S.month];
    const months = Object.keys(sn.months).sort();
    const isCurrent = S.month === months[months.length - 1];
    const tRow = (d.daily || []).find((x) => x.day === todayStr()) || { cash: 0, qi_card: 0, balance: 0 };
    const tTotal = tRow.cash + tRow.qi_card + (tRow.balance || 0);
    const tCount = sn.invoices.filter((x) => !x.is_void && x.created_at.slice(0, 10) === todayStr()).length;
    const diff = d.prevIncome ? Math.round(((d.monthIncome.total - d.prevIncome) / d.prevIncome) * 100) : null;
    const maxDay = Math.max(1, ...(d.daily || []).map((x) => x.cash + x.qi_card + (x.balance || 0)));
    const tasks = (sn.tasks || []).filter((t) => t.due_date <= todayStr());
    const emps = (sn.employees || []).filter((e) => e.today.count || e.today.cash || e.today.qi);
    const empMax = Math.max(1, ...emps.map((e) => e.today.total));
    const now = new Date();
    return `
      ${title('الرئيسية', `${WEEK[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`)}
      ${statusBars()}
      ${picker('month', monthName(S.month), months, S.month)}
      <div class="card hero">
        <div class="lbl">صافي الربح</div>
        <div class="big ${d.netProfit < 0 ? 'red' : ''}"><span class="num">${fmt(d.netProfit)}</span><small>د.ع</small></div>
        <div class="split"><div><span>الدخل</span><b class="num">${fmt(d.monthIncome.total)}</b></div><div><span>المصاريف</span><b class="num">${fmt(d.expensesTotal)}</b></div></div>
      </div>
      <div class="kpis">
        ${isCurrent ? kpi('دخل اليوم', money(tTotal), `${tCount} فاتورة · كاش ${fmt(tRow.cash)} · كي ${fmt(tRow.qi_card)}`, 'wide') : ''}
        ${kpi('كاش', money(d.monthIncome.cash), '', '', 'var(--green)')}
        ${kpi('كي كارد', money(d.monthIncome.qi_card), '', '', 'var(--blue)')}
        ${kpi('الديون المفتوحة', `<span class="red">${money(d.debts.total)}</span>`, `${d.debts.count} فاتورة`)}
        ${kpi('عدد الفواتير', `<span class="num">${fmt(d.salesCount)}</span>`, diff === null ? '' : `<span class="${diff >= 0 ? 'green' : 'red'}">${diff >= 0 ? '▲' : '▼'} <span class="num">${Math.abs(diff)}%</span></span> عن الشهر السابق`)}
        ${kpi('الخصومات', money(d.discountTotal))}
        ${kpi('مدخولك الخارجي', `<span class="gold">${money(d.externalTotal)}</span>`)}
      </div>

      <h2 class="sec">جدول الأعمال — اليوم والمتأخرة <button class="more" data-act="tasks">عرض الكل</button></h2>
      <div class="card flush">${tasks.length ? tasks.slice(0, 6).map(taskRow).join('') : '<div class="empty">لا توجد أعمال مطلوبة اليوم</div>'}
        ${pendingRows(['tasks:save', 'tasks:done', 'tasks:postpone'])}</div>

      ${isCurrent ? `<h2 class="sec">مبيعات الموظفين اليوم</h2>
      <div class="card flush">${emps.length ? emps.map((e) => `<div class="emp"><b>${esc(e.full_name)}</b><span class="t num">${fmt(e.today.total)}</span>
        <div class="bar"><i style="width:${(e.today.total / empMax) * 100}%"></i></div>
        <div class="s"><span>${e.today.count} فاتورة</span><span>كاش ${fmt(e.today.cash)}</span><span>كي ${fmt(e.today.qi)}</span>${e.today.due ? `<span class="red">آجل ${fmt(e.today.due)}</span>` : ''}</div></div>`).join('') : '<div class="empty">لا مبيعات اليوم بعد</div>'}</div>` : ''}

      <h2 class="sec">الدخل اليومي</h2>
      <div class="card">${(d.daily || []).length ? `<div class="chart">${d.daily.map((x) => `<div class="c ${x.day === todayStr() ? 'today' : ''}"><i style="height:${((x.cash + x.qi_card + (x.balance || 0)) / maxDay) * 100}%"></i><span>${Number(x.day.slice(8))}</span></div>`).join('')}</div>` : '<div class="empty">لا يوجد دخل في هذا الشهر</div>'}</div>
      ${d.byService.length ? `<h2 class="sec">أكثر الخدمات مبيعاً</h2><div class="card">${bars(d.byService, 'name', 'total')}</div>` : ''}
      ${d.discounts.length ? `<h2 class="sec">الخصومات</h2><div class="card flush">${d.discounts.slice(0, 15).map((x) => `<div class="item"><div class="av amber">٪</div><div class="m"><b>${esc(x.client_name)}</b><span>${esc(x.receipt_no)} · بواسطة ${esc(x.by_name)}</span></div><div class="e"><b class="amber num">-${fmt(x.discount_total)}</b></div></div>`).join('')}</div>` : ''}
      <div class="foot-note">آخر مزامنة ${new Date(sn.at).toLocaleString('ar-IQ-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })}</div>`;
  }

  function taskRow(t) {
    const late = t.due_date < todayStr();
    return `<div class="task">
      <button class="check ${late ? 'late' : ''}" data-act="done" data-v="${t.id}" aria-label="تم">${icon('check', 15)}</button>
      <div class="m" data-open="task:${t.id}"><b>${esc(t.title)}</b>
        <span>${[t.company, t.client_name].filter(Boolean).map(esc).join(' · ')}${t.company || t.client_name ? ' · ' : ''}<span class="${late ? 'red' : ''}" style="display:inline">${dayLabel(t.due_date)}</span> · ${esc(t.assigned_name)}${t.postponed ? ` · أُجّل ${t.postponed}` : ''}</span></div>
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
  function tabInvoices() {
    const days = [...new Set(S.snap.invoices.map((x) => x.created_at.slice(0, 10)))].slice(0, 30);
    const list = S.invDay ? S.snap.invoices.filter((x) => x.created_at.slice(0, 10) === S.invDay && !x.is_void) : null;
    return `
      ${title('الفواتير', 'آخر 90 يوماً', `<button class="btn btn-gold btn-sm press" onclick="window.__zm.newInvoice()">${icon('plus', 16)} فاتورة</button>`)}
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
        ${(x.items || []).map((i) => `<div class="kv"><span style="color:var(--ink)">${esc(i.name)}</span><span>${i.original_price && i.price < i.original_price ? `<s class="muted num">${fmt(i.original_price)}</s> ` : ''}<b class="num">${fmt(i.price)}</b></span></div>`).join('')}
        ${x.discount_total ? `<div class="kv"><span>الخصم</span><b class="amber num">-${fmt(x.discount_total)}</b></div>` : ''}
        <div class="kv"><span>المجموع</span><b class="gold num">${fmt(x.total_amount)}</b></div>
        <div class="kv"><span>المدفوع</span><b class="num">${fmt(x.paid_amount)}</b></div>
        ${rem > 0 && !x.is_void ? `<div class="kv"><span>المتبقي</span><b class="red num">${fmt(rem)}</b></div>` : ''}
        ${x.notes ? `<div class="kv"><span>ملاحظات</span><span>${esc(x.notes)}</span></div>` : ''}
      </div>
      ${x.is_void ? '<div class="alert">هذه الفاتورة ملغاة</div>' : `
      ${rem > 0 ? `<button class="btn btn-gold btn-block" id="pay">${icon('cash', 18)} تسجيل دفعة / تسديد</button>` : ''}
      <button class="btn btn-danger btn-block" id="void">إلغاء الفاتورة</button>`}`, (sb) => {
      sb.querySelector('#pay')?.addEventListener('click', () => paySheet(x, client));
      sb.querySelector('#void')?.addEventListener('click', () => {
        const reason = prompt('سبب إلغاء الفاتورة؟');
        if (reason && reason.trim()) sendOp('sales:void', { id: x.id, reason: reason.trim() }, `إلغاء ${x.receipt_no}`);
      });
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
      <div class="total-bar"><span class="ink2">المجموع</span><b class="num" id="total">0</b></div>
      <button class="btn btn-gold btn-block" id="ok">${icon('check', 18)} إصدار الفاتورة</button>`, (sb) => {
      const total = () => st.lines.reduce((a, l) => a + (l.price || 0), 0);
      const paintLines = () => {
        sb.querySelector('#lines').innerHTML = st.lines.map((l) => `<div class="line">${l.custom ? `<input class="input n" style="height:42px;font-size:15px" data-name="${l.k}" placeholder="اسم الخدمة" value="${esc(l.name)}">` : `<div class="n">${esc(l.name)}</div>`}
          <input class="p" inputmode="numeric" data-price="${l.k}" value="${l.price ? fmt(l.price) : ''}" placeholder="0"><button class="x" data-rm="${l.k}">${icon('x', 15)}</button></div>`).join('');
        sb.querySelectorAll('[data-price]').forEach((el) => { el.oninput = () => { const v = parseMoney(el.value); el.value = v ? fmt(v) : ''; st.lines.find((l) => l.k === Number(el.dataset.price)).price = v; paintTotal(); }; });
        sb.querySelectorAll('[data-name]').forEach((el) => { el.oninput = () => { st.lines.find((l) => l.k === Number(el.dataset.name)).name = el.value; }; });
        sb.querySelectorAll('[data-rm]').forEach((el) => { el.onclick = () => { st.lines = st.lines.filter((l) => l.k !== Number(el.dataset.rm)); paintLines(); paintTotal(); }; });
        sb.querySelectorAll('[data-svc]').forEach((el) => el.classList.toggle('in', st.lines.some((l) => String(l.service_id) === el.dataset.svc)));
      };
      const paintTotal = () => { sb.querySelector('#total').textContent = fmt(total()); paintPay(); };
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
        if (b.dataset.svc === 'custom') st.lines.push({ k: ++n, service_id: null, name: '', price: 0, custom: true });
        else { const s = sn.services.find((x) => String(x.id) === b.dataset.svc); st.lines.push({ k: ++n, service_id: s.id, name: s.name, price: s.default_price }); }
        paintLines(); paintTotal();
      });
      bindSeg(sb, 'kind', (v) => { st.kind = v; if (v === 'walk') st.client = null; paintParty(); paintPay(); });
      sb.querySelector('#ok').onclick = () => {
        if (!st.lines.length) return toast('أضف خدمة واحدة على الأقل', true);
        if (st.lines.some((l) => !l.price || !(l.name || '').trim())) return toast('أكمل اسم ومبلغ كل خدمة', true);
        if (st.kind === 'client' && !st.client) return toast('اختر العميل', true);
        const t = total();
        const account = st.pay === 'account';
        const payload = {
          items: st.lines.map((l) => ({ service_id: l.service_id, name: l.name.trim(), price: l.price })),
          client_id: st.client?.id || null,
          paid_amount: account ? Math.min(mval(sb, 'paid'), t) : t,
          method: account ? (st.pmethod?.() || 'cash') : st.pay,
          // الرصيد أولاً: يُسدَّد من المبلغ الذي للعميل على المكتب، والباقي كاش/كي كارد أو دين
          use_balance: !!st.client && (st.client.owed_to || 0) > 0 && st.useBal !== false,
          pay_rest: !account,
          company_name: val(sb, 'company') || null,
        };
        if (!st.client) { payload.customer_name = val(sb, 'cname') || null; payload.customer_phone = val(sb, 'phone') || null; }
        const who = st.client?.name || payload.company_name || payload.customer_name || 'زبون مباشر';
        sendOp('sales:create', payload, `فاتورة ${fmt(t)} — ${who}`);
      };
      paintParty(); paintPay();
    });
    return sh;
  }

  // ═════════════ العملاء والديون ═════════════
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
  function tabClients() {
    const sn = S.snap;
    const total = sn.debts.reduce((a, x) => a + (x.total_amount - x.paid_amount), 0);
    const owed = sn.payables.reduce((a, x) => a + x.amount, 0);
    return `
      ${title('العملاء', `${sn.clients.length} عميل مسجل`, `<button class="btn btn-ghost btn-sm press" data-act="newClient">${icon('userPlus', 16)} عميل</button>`)}
      ${statusBars()}
      <div class="kpis">
        ${kpi('ديون لنا على العملاء', `<span class="red">${money(total)}</span>`, `${sn.debts.length} فاتورة`)}
        ${kpi('مبالغ يطلبونها منا', `<span class="amber">${money(owed)}</span>`, `${sn.payables.length} مبلغ`)}
      </div>
      <div class="search">${icon('search', 18)}<input class="input" id="cq" type="search" placeholder="ابحث بالاسم أو الشركة أو الهاتف" value="${esc(S.cq)}"></div>
      ${pendingOf(['debts:settle', 'debts:settleClient', 'payables:create', 'payables:pay', 'payables:update', 'payables:delete', 'clients:save']).length ? `<div class="card flush">${pendingRows(['debts:settle', 'debts:settleClient', 'payables:create', 'payables:pay', 'payables:update', 'payables:delete', 'clients:save'])}</div>` : ''}
      <div class="card flush list" id="clist">${clientList()}</div>`;
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

  // ═════════════ المالية ═════════════
  function tabFinance() {
    const tabsHtml = seg('fin', [['expenses', 'المصاريف'], ['external', 'الخارجي'], ['year', 'السنوي'], ['cash', 'الصندوق']], S.fin);
    const body = ({ expenses: finExpenses, external: finExternal, year: finYear, cash: finCash })[S.fin]();
    setTimeout(() => bindSeg($app.querySelector('#main'), 'fin', (v) => { S.fin = v; paintMain(); }));
    return `${title('المالية', 'خاص بالمدير')}${statusBars()}${tabsHtml}${body}`;
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
      <div class="card flush list">${pendingRows(['expenses:create', 'expenses:update', 'expenses:delete'])}${rows.length ? rows.map((x) => `<button class="item" data-open="exp:${x.id}"><div class="av gray">${icon('wallet', 18)}</div><div class="m"><b>${esc(x.category)}</b><span>${dayLabel(x.expense_date)}${x.notes ? ` · ${esc(x.notes)}` : ''}</span></div><div class="e"><b class="num">${fmt(x.amount)}</b></div></button>`).join('') : '<div class="empty">لا توجد مصاريف في هذا الشهر</div>'}</div>`;
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
    return `
      <div class="kpis">${kpi('مطابقات آخر 30 يوماً', `<span class="num">${rows.length}</span>`)}${kpi('مجموع النقص', `<span class="${short ? 'red' : 'green'}">${money(Math.abs(short))}</span>`)}</div>
      <div class="card flush list">${rows.length ? rows.map((r) => `<div class="item"><div class="av ${r.difference < 0 ? 'red' : r.difference > 0 ? 'green' : 'gray'}">${initial(r.full_name)}</div>
        <div class="m"><b>${esc(r.full_name)}</b><span>${dayLabel(r.day)} · المتوقع ${fmt(r.expected_cash)} · المعدود ${fmt(r.counted_cash)}${r.notes ? ` · ${esc(r.notes)}` : ''}</span></div>
        <div class="e"><b class="num ${r.difference < 0 ? 'red' : r.difference > 0 ? 'green' : ''}">${r.difference > 0 ? '+' : ''}${fmt(r.difference)}</b><span class="chip ${r.difference ? (r.difference < 0 ? 'red' : 'green') : 'green'}">${r.difference === 0 ? 'مطابق' : r.difference < 0 ? 'نقص' : 'زيادة'}</span></div></div>`).join('') : '<div class="empty">لا توجد مطابقات صندوق بعد</div>'}</div>
      <div class="foot-note">يجرد الموظف صندوقه من برنامج المكتب (صفحة الصندوق)</div>`;
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
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>
      ${x ? `<button class="btn btn-danger btn-block" id="del">${icon('trash', 17)} حذف المصروف</button>` : ''}`, (sb) => {
      sb.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => { sb.querySelector('[name="category"]').value = b.dataset.cat; sb.querySelectorAll('[data-cat]').forEach((y) => y.classList.toggle('on', y === b)); }; });
      sb.querySelector('#ok').onclick = () => {
        const p = { category: val(sb, 'category'), amount: mval(sb, 'amount'), expense_date: val(sb, 'date'), notes: val(sb, 'notes') };
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

  // ═════════════ جدول الأعمال ═════════════
  function tasksSheet() {
    const list = S.snap.tasks || [];
    openSheet('جدول الأعمال', `
      <button class="btn btn-gold btn-block" id="new">${icon('plus', 17)} عمل جديد</button>
      <div class="card flush">${list.length ? list.map(taskRow).join('') : '<div class="empty">لا توجد أعمال مفتوحة</div>'}</div>`, (sb) => {
      sb.querySelector('#new').onclick = () => taskSheet();
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
      <div class="field"><label>مُسند إلى</label><select class="input" name="who">${users.map((u) => `<option value="${u.id}" ${(t ? t.assigned_to === u.id : u.role === 'admin') ? 'selected' : ''}>${esc(u.full_name)}</option>`).join('')}</select></div>
      <div class="field"><label>تفاصيل</label><textarea class="input" name="details" rows="2">${esc(t?.details || '')}</textarea></div>
      <button class="btn btn-gold btn-block" id="ok">حفظ</button>
      ${t ? `<div class="grid2"><button class="btn btn-green" id="done">${icon('check', 17)} تم</button><button class="btn btn-ghost" id="later">${icon('clock', 17)} تأجيل</button></div>` : ''}`, (sb) => {
      const dueEl = sb.querySelector('[name="due"]');
      sb.querySelectorAll('[data-d]').forEach((b) => { b.onclick = () => { due = b.dataset.d; dueEl.value = due; sb.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('on', x === b)); }; });
      sb.querySelector('#ok').onclick = () => {
        const p = { id: t?.id, title: val(sb, 'title'), company: val(sb, 'company'), client_name: val(sb, 'client'), phone: val(sb, 'phone'), details: val(sb, 'details'), due_date: dueEl.value, assigned_to: Number(val(sb, 'who')) || undefined };
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

  // ═════════════ زر الإضافة (+) ═════════════
  function addMenu() {
    const A = [
      ['inv', 'receipt', 'فاتورة جديدة', 'كاش، كي كارد أو على الحساب'],
      ['exp', 'wallet', 'مصروف', 'إيجار، رواتب، فواتير…'],
      ['ext', 'up', 'مدخول خارجي', 'دخلك الشخصي'],
      ['task', 'task', 'عمل / موعد', 'لليوم أو يوم آخر'],
      ['debt', 'cash', 'تسديد دين', 'دفعة من عميل'],
      ['client', 'userPlus', 'عميل جديد', 'للبيع على الحساب'],
    ];
    openSheet('إضافة', `<div class="actions">${A.map(([k, i, t, s]) => `<button class="action press" data-add="${k}"><span class="ic">${icon(i, 21)}</span><b>${t}</b><span>${s}</span></button>`).join('')}</div>`, (sb) => {
      sb.querySelectorAll('[data-add]').forEach((b) => {
        b.onclick = () => ({
          inv: () => invoiceForm(), exp: () => expenseSheet(), ext: () => externalSheet(), task: () => taskSheet(), client: () => clientForm(),
          debt: () => { S.tab = 'clients'; closeSheet(true); render(); toast('اختر العميل ثم «دفعة»'); },
        })[b.dataset.add]();
      });
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
    if (!a || !['q', 'cq'].includes(a.id)) paintMain();
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
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });
    navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => {});
  }
  boot();
})();
