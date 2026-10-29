/* مكتب زين المختار — نسخة الآيفون (PWA)
 * تعرض للمدير فقط آخر نسخة مشفّرة رفعها الجهاز الرئيسي إلى GitHub.
 *   1) الربط: مفتاح التشفير يصل مرة واحدة عبر "رابط الربط" (#k=...) أو بلصق "رمز الربط"
 *   2) الجلب: snapshot.json من فرع data في المستودع (مشفّر — GitHub لا يستطيع قراءته)
 *   3) فك التشفير على الآيفون نفسه (AES-256-GCM) ثم الدخول باسم وكلمة مرور المدير (bcrypt)
 * لا يوجد إنشاء حسابات، ولا يمكن لأي موظف الدخول من هنا.
 */
(() => {
  'use strict';

  // ───────── أدوات عامة ─────────
  const $app = document.getElementById('app');
  const LS = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = new Intl.NumberFormat('en-US');
  const fmt = (n) => nf.format(Math.round(n || 0));
  const money = (n) => `<span class="num">${fmt(n)}</span> د.ع`;
  const METHOD = { cash: 'كاش', qi_card: 'كي كارد' };
  const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const monthName = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const to12 = (h, m) => `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'ص' : 'م'}`;
  const time = (dt) => (dt ? to12(Number(dt.slice(11, 13)), Number(dt.slice(14, 16))) : '');
  const daysSince = (dt) => Math.max(0, Math.floor((Date.now() - new Date(String(dt).replace(' ', 'T')).getTime()) / 86400000));
  const dayLabel = (d) => {
    const t = todayStr();
    const y = new Date(Date.now() - 86400000);
    if (d === t) return 'اليوم';
    if (d === `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`) return 'أمس';
    return d.slice(5).replace('-', '/');
  };
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `قبل ${m} دقيقة`;
    const h = Math.round(m / 60);
    if (h < 24) return `قبل ${h} ساعة`;
    return `قبل ${Math.round(h / 24)} يوم`;
  };
  const localDT = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} · ${to12(d.getHours(), d.getMinutes())}`; };

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    chevR: '<path d="m9 6 6 6-6 6"/>',
    chevL: '<path d="m15 6-6 6 6 6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  };
  const icon = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

  // ───────── الربط: المفتاح + المستودع ─────────
  function readPairing() {
    let cfg = LS.get('zm-cfg') || {};
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('k')) {
      cfg = { k: h.get('k'), o: h.get('o') || cfg.o, r: h.get('r') || cfg.r };
      LS.set('zm-cfg', cfg);
      LS.del('zm-snap'); LS.del('zm-session');
      history.replaceState(null, '', location.pathname + location.search); // نحذف المفتاح من شريط العنوان
    }
    // المستودع يُستنتج من عنوان GitHub Pages إن لم يكن محفوظاً
    if (!cfg.o && /\.github\.io$/i.test(location.hostname)) {
      cfg.o = location.hostname.split('.')[0];
      const seg = location.pathname.split('/').filter(Boolean)[0];
      cfg.r = seg && !/\.html$/.test(seg) ? seg : location.hostname;
    }
    return cfg;
  }
  let cfg = readPairing();

  // ───────── الجلب وفك التشفير ─────────
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const b64url = (s) => b64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));

  async function fetchEnvelope() {
    const o = encodeURIComponent(cfg.o); const r = encodeURIComponent(cfg.r);
    const tries = [
      () => fetch(`https://api.github.com/repos/${o}/${r}/contents/snapshot.json?ref=data&t=${Date.now()}`, { headers: { Accept: 'application/vnd.github.raw' }, cache: 'no-store' }),
      () => fetch(`https://raw.githubusercontent.com/${o}/${r}/data/snapshot.json?t=${Date.now()}`, { cache: 'no-store' }),
    ];
    let last;
    for (const t of tries) {
      try {
        const res = await t();
        if (res.ok) {
          const text = await res.text();
          const env = JSON.parse(text);
          if (env.iv && env.ct) return text;
        }
        last = new Error(res.status === 404 ? 'NOT_FOUND' : `HTTP ${res.status}`);
      } catch (e) { last = e; }
    }
    throw last || new Error('NET');
  }

  async function decrypt(text, keyStr) {
    const env = JSON.parse(text);
    const key = await crypto.subtle.importKey('raw', b64url(keyStr), 'AES-GCM', false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(env.iv) }, key, b64(env.ct));
    const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }

  // ───────── الحالة ─────────
  const S = {
    snap: null, offline: false, loading: false, error: null,
    user: null, tab: 'home', month: null, expMonth: null, year: null,
    invDay: null, q: '', open: null,
  };

  async function refresh({ silent = false } = {}) {
    if (!cfg.k || !cfg.o) return;
    S.loading = true; if (!silent) paintTop();
    try {
      const text = await fetchEnvelope();
      const snap = await decrypt(text, cfg.k);
      LS.set('zm-snap', text);
      S.snap = snap; S.offline = false; S.error = null;
    } catch (e) {
      if (!S.snap) {
        const cached = LS.get('zm-snap');
        if (cached) { try { S.snap = await decrypt(cached, cfg.k); } catch { /* ignore */ } }
      }
      S.offline = true;
      if (e && e.name === 'OperationError') S.error = 'رمز الربط لا يطابق — افتح رابط الربط الجديد من الجهاز الرئيسي';
      else if (e && e.message === 'NOT_FOUND') S.error = 'لم تصل أي بيانات بعد — فعّل المزامنة من الجهاز الرئيسي (الإعدادات ← تطبيق الموبايل)';
      else S.error = null;
    }
    S.loading = false;
    checkSession();
    render();
  }

  // ───────── الدخول (المدير فقط) ─────────
  const SESSION_MS = 12 * 60 * 60 * 1000;
  function checkSession() {
    const s = LS.get('zm-session');
    if (!s || !S.snap || Date.now() > s.exp) { S.user = null; return; }
    // إذا تغيّرت كلمة المرور على الجهاز الرئيسي تنتهي الجلسة هنا أيضاً
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
  function logout() { LS.del('zm-session'); S.user = null; render(); }

  // ───────── الشاشات: الربط ─────────
  function viewPair() {
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    $app.innerHTML = `
      <div class="auth">
        <div class="brand">
          <img class="dark" src="icons/icon-192.png" alt="">
          <h1>مكتب زين المختار</h1>
          <p>لربط هذا الآيفون بالمكتب افتح <b>رابط الربط</b> المنسوخ من الجهاز الرئيسي<br>(الإعدادات ← تطبيق الموبايل)، أو الصق <b>رمز الربط</b> هنا.</p>
        </div>
        <div class="field">
          <label>رمز الربط</label>
          <input class="input ltr" id="code" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="الصق الرمز هنا">
        </div>
        <div id="err"></div>
        <button class="btn btn-ghost btn-block" id="paste">لصق من الحافظة</button>
        <button class="btn btn-gold btn-block" id="go">ربط</button>
        ${standalone ? '' : '<div class="note">بعد الربط: اضغط زر المشاركة ⬆︎ في Safari ثم «إضافة إلى الشاشة الرئيسية».</div>'}
      </div>`;
    const code = $app.querySelector('#code');
    $app.querySelector('#paste').onclick = async () => { try { code.value = (await navigator.clipboard.readText()).trim(); } catch { code.focus(); } };
    $app.querySelector('#go').onclick = () => {
      let v = code.value.trim();
      const m = v.match(/#k=([^&\s]+)/); if (m) v = decodeURIComponent(m[1]); // لو لُصق الرابط كاملاً
      if (!/^[A-Za-z0-9_-]{40,}$/.test(v)) { $app.querySelector('#err').innerHTML = '<div class="alert">الرمز غير صحيح — انسخه مجدداً من الجهاز الرئيسي</div>'; return; }
      const om = code.value.match(/[#&]o=([^&\s]+)/); const rm = code.value.match(/[#&]r=([^&\s]+)/);
      cfg = { ...cfg, k: v, ...(om ? { o: decodeURIComponent(om[1]) } : {}), ...(rm ? { r: decodeURIComponent(rm[1]) } : {}) };
      LS.set('zm-cfg', cfg); LS.del('zm-snap');
      boot();
    };
  }

  // ───────── الشاشات: الدخول ─────────
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
          <form id="f" class="field" style="gap:12px" autocomplete="on">
            <div class="field"><label>اسم المستخدم</label><input class="input ltr" name="username" autocomplete="username" autocapitalize="off" spellcheck="false" required></div>
            <div class="field"><label>كلمة المرور</label><input class="input ltr" name="password" type="password" autocomplete="current-password" required></div>
            <div id="err"></div>
            <button class="btn btn-gold btn-block" id="go">${icon('lock', 18)} دخول</button>
          </form>` : `<button class="btn btn-ghost btn-block" id="retry">إعادة المحاولة</button>`}
        <div class="foot">${S.snap ? `آخر مزامنة ${ago(S.snap.at)}` : ''}</div>
      </div>`;
    const f = $app.querySelector('#f');
    if (f) {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const btn = f.querySelector('#go'); btn.disabled = true; btn.textContent = 'جارٍ التحقق…';
        const err = await login(f.username.value, f.password.value);
        if (err) { f.querySelector('#err').innerHTML = `<div class="alert">${esc(err)}</div>`; btn.disabled = false; btn.innerHTML = `${icon('lock', 18)} دخول`; return; }
        render();
      };
    }
    const r = $app.querySelector('#retry'); if (r) r.onclick = () => refresh();
  }

  // ───────── الهيكل بعد الدخول ─────────
  const TABS = [['home', 'الرئيسية', 'home'], ['invoices', 'الفواتير', 'receipt'], ['debts', 'الديون', 'users'], ['expenses', 'المصاريف', 'wallet'], ['year', 'السنوي', 'chart']];

  function viewShell() {
    const sn = S.snap;
    const months = Object.keys(sn.months).sort().reverse();
    if (!S.month || !sn.months[S.month]) S.month = months[0];
    if (!S.expMonth) S.expMonth = months[0];
    if (!S.year || !sn.years[S.year]) S.year = Object.keys(sn.years).sort().reverse()[0];
    $app.innerHTML = `
      <header class="top"><div class="top-row">
        <img src="${sn.office.logo ? esc(sn.office.logo) : 'icons/icon-192.png'}" alt="">
        <div class="t"><b>${esc(sn.office.name || 'مكتب زين المختار')}</b><span id="sync"></span></div>
        <button class="icon-btn" id="rf" aria-label="تحديث">${icon('refresh', 20)}</button>
        <button class="icon-btn" id="lo" aria-label="خروج">${icon('logout', 20)}</button>
      </div><div id="off"></div></header>
      <main id="main"></main>
      <nav class="tabs"><div class="in">
        ${TABS.map(([k, l, i]) => `<button data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${icon(i, 23)}<span>${l}</span></button>`).join('')}
      </div></nav>`;
    $app.querySelector('#rf').onclick = () => refresh();
    $app.querySelector('#lo').onclick = () => { if (confirm('تسجيل الخروج؟')) logout(); };
    $app.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => { S.tab = b.dataset.tab; S.open = null; render(); window.scrollTo(0, 0); }; });
    paintTop();
    paintMain();
  }

  function paintTop() {
    const s = $app.querySelector('#sync'); const off = $app.querySelector('#off'); const rf = $app.querySelector('#rf');
    if (!s || !S.snap) return;
    s.textContent = `آخر مزامنة ${ago(S.snap.at)} · ${localDT(S.snap.at)}`;
    rf.classList.toggle('spin', S.loading);
    off.innerHTML = S.error ? `<div class="offline">${esc(S.error)}</div>`
      : S.offline ? '<div class="offline">لا يوجد اتصال — تُعرض آخر بيانات محفوظة</div>' : '';
  }

  function paintMain() {
    const main = $app.querySelector('#main');
    main.innerHTML = ({ home: tabHome, invoices: tabInvoices, debts: tabDebts, expenses: tabExpenses, year: tabYear })[S.tab]();
    main.querySelectorAll('[data-act]').forEach((el) => { el.onclick = () => act(el.dataset.act, el.dataset.v); });
    const q = main.querySelector('#q');
    if (q) q.oninput = () => { S.q = q.value; const l = main.querySelector('#invlist'); if (l) { l.innerHTML = invoiceList(); bindList(main); } };
    bindList(main);
  }
  function bindList(main) {
    main.querySelectorAll('[data-inv]').forEach((el) => { el.onclick = () => { S.open = S.open === el.dataset.inv ? null : el.dataset.inv; const l = main.querySelector('#invlist'); l.innerHTML = invoiceList(); bindList(main); }; });
  }

  function act(a, v) {
    const months = Object.keys(S.snap.months).sort();
    const years = Object.keys(S.snap.years).sort();
    const step = (list, cur, d) => list[Math.min(list.length - 1, Math.max(0, list.indexOf(cur) + d))];
    if (a === 'month') S.month = step(months, S.month, Number(v));
    if (a === 'expMonth') S.expMonth = step(months, S.expMonth, Number(v));
    if (a === 'year') S.year = step(years, S.year, Number(v));
    if (a === 'day') { S.invDay = v || null; S.open = null; }
    paintMain();
  }

  const picker = (kind, label, list, cur) => {
    const i = list.indexOf(cur);
    // RTL: السهم الأيمن = السابق (أقدم)، الأيسر = التالي (أحدث)
    return `<div class="picker">
      <button class="icon-btn" data-act="${kind}" data-v="-1" ${i <= 0 ? 'disabled' : ''}>${icon('chevR')}</button>
      <div class="lbl">${label}</div>
      <button class="icon-btn" data-act="${kind}" data-v="1" ${i >= list.length - 1 ? 'disabled' : ''}>${icon('chevL')}</button>
    </div>`;
  };
  const kpi = (l, v, s = '', cls = '') => `<div class="kpi ${cls}"><div class="l">${l}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
  const bars = (rows, labelK, valK) => {
    const max = Math.max(1, ...rows.map((r) => Math.abs(r[valK])));
    return rows.map((r) => `<div class="bar-row"><span class="n">${esc(r[labelK])}</span><span class="b"><i class="${r[valK] < 0 ? 'neg' : ''}" style="width:${Math.max(2, (Math.abs(r[valK]) / max) * 100)}%"></i></span><span class="v num">${fmt(r[valK])}</span></div>`).join('');
  };

  // ───────── تبويب: الرئيسية ─────────
  function tabHome() {
    const d = S.snap.months[S.month];
    const months = Object.keys(S.snap.months).sort();
    const isCurrent = S.month === months[months.length - 1];
    const todayRow = (d.daily || []).find((x) => x.day === todayStr()) || { cash: 0, qi_card: 0 };
    const todayTotal = todayRow.cash + todayRow.qi_card;
    const todayCount = S.snap.invoices.filter((x) => !x.is_void && x.created_at.slice(0, 10) === todayStr()).length;
    const diff = d.prevIncome ? Math.round(((d.monthIncome.total - d.prevIncome) / d.prevIncome) * 100) : null;
    const maxDay = Math.max(1, ...(d.daily || []).map((x) => x.cash + x.qi_card));
    return `
      ${picker('month', monthName(S.month), months, S.month)}
      <div class="card hero">
        <div class="lbl">صافي الربح — ${monthName(S.month)}</div>
        <div class="big ${d.netProfit < 0 ? 'red' : ''}">${money(d.netProfit)}</div>
        <div class="sub"><span>الدخل ${money(d.monthIncome.total)}</span><span>المصاريف ${money(d.expensesTotal)}</span></div>
      </div>
      <div class="kpis">
        ${isCurrent ? kpi('دخل اليوم', money(todayTotal), `${todayCount} فاتورة · كاش ${fmt(todayRow.cash)} · كي ${fmt(todayRow.qi_card)}`, 'wide') : ''}
        ${kpi('كاش', money(d.monthIncome.cash))}
        ${kpi('كي كارد', money(d.monthIncome.qi_card))}
        ${kpi('الديون المفتوحة', money(d.debts.total), `${d.debts.count} فاتورة`)}
        ${kpi('عدد الفواتير', `<span class="num">${fmt(d.salesCount)}</span>`, diff === null ? '' : `<span class="${diff >= 0 ? 'green' : 'red'}">${diff >= 0 ? '▲' : '▼'} <span class="num">${Math.abs(diff)}%</span></span> عن الشهر السابق`)}
        ${kpi('الخصومات', money(d.discountTotal))}
        ${kpi('مدخول خارجي (شخصي)', money(d.externalTotal))}
      </div>
      <h2 class="sec">الدخل اليومي</h2>
      <div class="card">${(d.daily || []).length ? `<div class="chart">${d.daily.map((x) => `<div class="c"><i style="height:${((x.cash + x.qi_card) / maxDay) * 100}%"></i><span>${Number(x.day.slice(8))}</span></div>`).join('')}</div>` : '<div class="empty">لا يوجد دخل في هذا الشهر</div>'}</div>
      ${d.byService.length ? `<h2 class="sec">أكثر الخدمات مبيعاً</h2><div class="card">${bars(d.byService, 'name', 'total')}</div>` : ''}
      ${d.expensesByCategory.length ? `<h2 class="sec">المصاريف حسب النوع</h2><div class="card">${bars(d.expensesByCategory, 'category', 'total')}</div>` : ''}
      ${d.discounts.length ? `<h2 class="sec">الخصومات <span class="chip gold">${money(d.discountTotal)}</span></h2>
        <div class="card tight list">${d.discounts.map((x) => `<div class="item"><div class="ic">٪</div><div class="m"><b>${esc(x.client_name)}</b><span>${esc(x.receipt_no)} · بواسطة ${esc(x.by_name)} · ${x.created_at.slice(5, 10).replace('-', '/')}</span></div><div class="e"><b class="gold num">-${fmt(x.discount_total)}</b></div></div>`).join('')}</div>` : ''}
      <div class="foot">عرض فقط · التعديل من برنامج المكتب</div>`;
  }

  // ───────── تبويب: الفواتير ─────────
  function invoiceList() {
    const q = S.q.trim().toLowerCase();
    let rows = S.snap.invoices;
    if (S.invDay) rows = rows.filter((x) => x.created_at.slice(0, 10) === S.invDay);
    if (q) rows = rows.filter((x) => `${x.receipt_no} ${x.client_name} ${x.service_name} ${x.by_name}`.toLowerCase().includes(q));
    rows = rows.slice(0, 300);
    if (!rows.length) return '<div class="empty">لا توجد فواتير</div>';
    return rows.map((x) => {
      const remaining = x.total_amount - x.paid_amount;
      const st = x.is_void ? '<span class="chip red">ملغاة</span>'
        : x.debt_status === 'open' ? `<span class="chip red">دين ${fmt(remaining)}</span>`
          : x.debt_status === 'settled' ? '<span class="chip green">تم التسديد</span>'
            : `<span class="chip">${METHOD[x.method] || 'مدفوع'}</span>`;
      const open = S.open === String(x.id);
      return `<button class="item ${x.is_void ? 'void' : ''}" data-inv="${x.id}">
          <div class="ic">${esc((x.client_name || '؟').trim().charAt(0))}</div>
          <div class="m"><b>${esc(x.client_name)}</b><span>${esc(x.service_name)} · ${dayLabel(x.created_at.slice(0, 10))} ${time(x.created_at)}</span></div>
          <div class="e"><b class="num">${fmt(x.total_amount)}</b>${st}</div>
        </button>
        ${open ? `<div class="details">
          <div class="row"><span class="muted">رقم الفاتورة</span><b class="num">${esc(x.receipt_no)}</b></div>
          ${(x.items || []).map((i) => `<div class="row"><span>${esc(i.name)}</span><span>${i.original_price && i.price < i.original_price ? `<s class="muted num">${fmt(i.original_price)}</s> ` : ''}<b class="num">${fmt(i.price)}</b></span></div>`).join('')}
          ${x.discount_total ? `<div class="row"><span class="muted">الخصم</span><b class="gold num">-${fmt(x.discount_total)}</b></div>` : ''}
          <div class="row"><span class="muted">المدفوع</span><b class="num">${fmt(x.paid_amount)}</b></div>
          ${remaining > 0 && !x.is_void ? `<div class="row"><span class="muted">المتبقي</span><b class="red num">${fmt(remaining)}</b></div>` : ''}
          <div class="row"><span class="muted">أصدرها</span><span>${esc(x.by_name)}</span></div>
          ${x.notes ? `<div class="row"><span class="muted">ملاحظات</span><span>${esc(x.notes)}</span></div>` : ''}
        </div>` : ''}`;
    }).join('');
  }
  function tabInvoices() {
    const days = [...new Set(S.snap.invoices.map((x) => x.created_at.slice(0, 10)))].slice(0, 30);
    const list = S.invDay ? S.snap.invoices.filter((x) => x.created_at.slice(0, 10) === S.invDay && !x.is_void) : null;
    const dayTotal = list ? list.reduce((a, x) => a + x.total_amount, 0) : 0;
    return `
      <div class="search">${icon('search', 18)}<input class="input" id="q" placeholder="بحث بالاسم أو رقم الفاتورة" value="${esc(S.q)}"></div>
      <div class="chips">
        <button class="${S.invDay ? '' : 'on'}" data-act="day" data-v="">الكل</button>
        ${days.map((d) => `<button class="${S.invDay === d ? 'on' : ''}" data-act="day" data-v="${d}">${dayLabel(d)}</button>`).join('')}
      </div>
      ${list ? `<div class="kpis">${kpi('فواتير اليوم المحدد', `<span class="num">${list.length}</span>`)}${kpi('مجموعها', money(dayTotal))}</div>` : ''}
      <div class="card tight list" id="invlist">${invoiceList()}</div>
      <div class="foot">آخر 90 يوماً</div>`;
  }

  // ───────── تبويب: الديون ─────────
  function tabDebts() {
    const sn = S.snap;
    const total = sn.debts.reduce((a, x) => a + (x.total_amount - x.paid_amount), 0);
    const owed = sn.payables.reduce((a, x) => a + x.amount, 0);
    const clients = sn.clients.filter((c) => c.balance > 0);
    return `
      <div class="kpis">
        ${kpi('ديون لنا على العملاء', `<span class="red">${money(total)}</span>`, `${sn.debts.length} فاتورة`)}
        ${kpi('مبالغ يطلبها العملاء منا', `<span class="gold">${money(owed)}</span>`, `${sn.payables.length} مبلغ`)}
      </div>
      <h2 class="sec">العملاء المدينون</h2>
      <div class="card tight list">${clients.length ? clients.map((c) => `
        <div class="item">
          <div class="ic">${esc(c.name.trim().charAt(0))}</div>
          <div class="m"><b>${esc(c.name)}</b><span>${c.open_count} فاتورة${c.company ? ` · ${esc(c.company)}` : ''}</span></div>
          <div class="e"><b class="red num">${fmt(c.balance)}</b>${c.phone ? `<a class="chip gold" href="tel:${esc(c.phone)}">${icon('phone', 13)} اتصال</a>` : ''}</div>
        </div>`).join('') : '<div class="empty">لا توجد ديون مفتوحة</div>'}</div>
      ${sn.debts.length ? `<h2 class="sec">تفاصيل الديون</h2>
        <div class="card tight list">${sn.debts.map((x) => `
          <div class="item"><div class="m"><b>${esc(x.client_name)}</b><span>${esc(x.receipt_no)} · ${esc(x.service_name)} · منذ ${daysSince(x.created_at)} يوم</span></div>
          <div class="e"><b class="red num">${fmt(x.total_amount - x.paid_amount)}</b><span class="muted num" style="font-size:12px">من ${fmt(x.total_amount)}</span></div></div>`).join('')}</div>` : ''}
      ${sn.payables.length ? `<h2 class="sec">مبالغ يطلبها العملاء من المكتب</h2>
        <div class="card tight list">${sn.payables.map((p) => `
          <div class="item"><div class="m"><b>${esc(p.client_name)}</b><span>${esc(p.reason)} · ${p.created_at.slice(0, 10)}</span></div>
          <div class="e"><b class="gold num">${fmt(p.amount)}</b></div></div>`).join('')}</div>` : ''}`;
  }

  // ───────── تبويب: المصاريف ─────────
  function tabExpenses() {
    const months = Object.keys(S.snap.months).sort();
    const rows = S.snap.expenses.filter((x) => x.expense_date.slice(0, 7) === S.expMonth);
    const total = rows.reduce((a, x) => a + x.amount, 0);
    const byCat = Object.values(rows.reduce((m, x) => { (m[x.category] ||= { category: x.category, total: 0 }).total += x.amount; return m; }, {})).sort((a, b) => b.total - a.total);
    return `
      ${picker('expMonth', monthName(S.expMonth), months, S.expMonth)}
      <div class="card hero"><div class="lbl">مجموع المصاريف</div><div class="big">${money(total)}</div><div class="sub"><span>${rows.length} مصروف</span></div></div>
      ${byCat.length ? `<div class="card">${bars(byCat, 'category', 'total')}</div>` : ''}
      <div class="card tight list">${rows.length ? rows.map((x) => `
        <div class="item"><div class="ic">${icon('wallet', 18)}</div><div class="m"><b>${esc(x.category)}</b><span>${x.expense_date}${x.notes ? ` · ${esc(x.notes)}` : ''}</span></div>
        <div class="e"><b class="num">${fmt(x.amount)}</b></div></div>`).join('') : '<div class="empty">لا توجد مصاريف في هذا الشهر</div>'}</div>`;
  }

  // ───────── تبويب: السنوي ─────────
  function tabYear() {
    const y = S.snap.years[S.year];
    const years = Object.keys(S.snap.years).sort();
    const months = y.months.filter((m) => m.income || m.expenses || m.external).map((m) => ({ ...m, name: MONTHS[m.month - 1] }));
    const ext = S.snap.external.filter((x) => x.income_date.slice(0, 4) === String(S.year));
    return `
      ${picker('year', `سنة <span class="num">${S.year}</span>`, years, S.year)}
      <div class="card hero">
        <div class="lbl">صافي الأرباح السنوي</div>
        <div class="big ${y.net < 0 ? 'red' : ''}">${money(y.net)}</div>
        <div class="sub"><span>الدخل ${money(y.income)}</span><span>المصاريف ${money(y.expenses)}</span></div>
      </div>
      <div class="kpis">
        ${kpi('المدخول الخارجي', money(y.external))}
        ${kpi('الخصومات', money(y.discounts))}
        ${kpi('المجموع مع الخارجي', money(y.net + y.external), '', 'wide')}
      </div>
      <h2 class="sec">صافي الربح لكل شهر</h2>
      <div class="card">${months.length ? bars(months, 'name', 'net') : '<div class="empty">لا توجد بيانات لهذه السنة</div>'}</div>
      ${y.externalBySource.length ? `<h2 class="sec">المدخول الخارجي حسب المصدر</h2><div class="card">${bars(y.externalBySource, 'source', 'total')}</div>` : ''}
      ${ext.length ? `<div class="card tight list">${ext.map((x) => `
        <div class="item"><div class="m"><b>${esc(x.source)}</b><span>${x.income_date}${x.notes ? ` · ${esc(x.notes)}` : ''}</span></div>
        <div class="e"><b class="green num">${fmt(x.amount)}</b></div></div>`).join('')}</div>` : ''}`;
  }

  // ───────── التشغيل ─────────
  function render() {
    if (!cfg.k || !cfg.o) return viewPair();
    if (!S.snap || !S.user) return viewLogin();
    if (!$app.querySelector('.tabs')) return viewShell();
    // تحديث بدون إعادة بناء الهيكل (يحافظ على التبويب ومكان التمرير)
    $app.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === S.tab));
    paintTop();
    if (!document.activeElement || document.activeElement.id !== 'q') paintMain();
  }

  async function boot() {
    cfg = readPairing();
    if (!cfg.k || !cfg.o) return viewPair();
    const cached = LS.get('zm-snap');
    if (cached) { try { S.snap = await decrypt(cached, cfg.k); checkSession(); } catch { /* ignore */ } }
    render();
    refresh({ silent: true });
  }

  window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) { S.snap = null; S.user = null; boot(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh({ silent: true }); });
  setInterval(() => { if (document.visibilityState === 'visible' && S.user) refresh({ silent: true }); }, 60000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  boot();
})();
