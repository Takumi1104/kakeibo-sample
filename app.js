const STORE_KEY = "kakeibo-v1";

const GENRES = [
  { g: "飲み物", emoji: "🥤", scenes: [["自販機", 200], ["コンビニ", 190], ["カフェ", 500]] },
  { g: "ごはん", emoji: "🍜", scenes: [["昼ごはん", 700], ["夜ごはん", 1000], ["外食", 1500], ["コンビニ", 650], ["飲み会", 4500]] },
  { g: "おやつ", emoji: "🍪", scenes: [["コンビニ", 300], ["スーパー", 500]] },
  { g: "遊び", emoji: "🎮", scenes: [["カラオケ", 1500], ["映画", 2000], ["ゲーム・課金", 1000], ["お出かけ", 3000]] },
  { g: "日用品", emoji: "🧺", scenes: [["コンビニ", 500], ["ドラッグストア", 1500], ["100均", 330]] },
  { g: "交通", emoji: "🚃", scenes: [["電車・バス", 400], ["タクシー", 1500], ["ガソリン", 6000]] },
  { g: "たまに", emoji: "🗓️", scenes: [["散髪・美容室", 4500], ["病院・くすり", 2000], ["服・くつ", 4000], ["プレゼント", 3000]] },
  { g: "その他", emoji: "📦", scenes: [["ちょっとした物", 500], ["大きめの買い物", 3000]] },
];

const GENRE_COLORS = {
  "飲み物": "#378ADD",
  "ごはん": "#D85A30",
  "おやつ": "#D4537E",
  "遊び": "#7F77DD",
  "日用品": "#1D9E75",
  "交通": "#EF9F27",
  "たまに": "#639922",
  "その他": "#888780",
};

const FIXED_PRESETS = [
  { id: "rent", label: "家賃", suggest: [30000, 50000, 70000, 100000] },
  { id: "utility", label: "光熱費(電気・ガス・水道)", suggest: [8000, 12000, 18000] },
  { id: "phone", label: "携帯・ネット", suggest: [3000, 8000, 12000] },
  { id: "subsc", label: "サブスク", suggest: [1000, 2000, 5000] },
];

let state = load();
let currentTab = "input";

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function yen(n) {
  return "¥" + Math.round(n).toLocaleString();
}
function roundRough(n) {
  if (n <= 500) return Math.round(n / 10) * 10;
  if (n <= 2000) return Math.round(n / 50) * 50;
  return Math.round(n / 100) * 100;
}
function roundAbout(n) {
  if (n >= 10000) return Math.round(n / 1000) * 1000;
  return Math.round(n / 100) * 100;
}
function sceneKey(g, s) {
  return g + "/" + s;
}
function estimate(g, s, base) {
  const learned = state.learned[sceneKey(g, s)];
  return learned != null ? roundRough(learned) : base;
}
function learn(g, s, amount) {
  const key = sceneKey(g, s);
  const genre = GENRES.find((x) => x.g === g);
  const scene = genre && genre.scenes.find((x) => x[0] === s);
  const prev = state.learned[key] != null ? state.learned[key] : scene ? scene[1] : amount;
  state.learned[key] = prev * 0.7 + amount * 0.3;
}

const app = document.getElementById("app");
const tabbar = document.getElementById("tabbar");
const modalRoot = document.getElementById("modal-root");

tabbar.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => {
    currentTab = b.dataset.tab;
    render();
  });
});

function render() {
  modalRoot.innerHTML = "";
  if (!state) {
    tabbar.classList.add("hidden");
    renderOnboarding(1);
    return;
  }
  tabbar.classList.remove("hidden");
  tabbar.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === currentTab));
  if (currentTab === "input") renderInput();
  else if (currentTab === "history") renderHistory();
  else renderSettings();
}

/* ---------- onboarding ---------- */
let onbFixed = {};

function renderOnboarding(step) {
  tabbar.classList.add("hidden");
  if (step === 1) {
    app.innerHTML = `
      <div class="onb-step">
        <div class="progress-dots"><span class="on"></span><span></span></div>
        <div class="big-emoji">🌱</div>
        <h1>このアプリに、<br>始める前の過去は入れられません</h1>
        <p>きょう(${todayStr().replaceAll("-", "/")})より前の記録は、この先ずっと入力できません。</p>
        <p>忘れた日があっても大丈夫。さかのぼって完璧にするより、ざっくりでも続いた人が勝ちです。</p>
        <div class="onb-actions">
          <button class="primary full" id="onb-next">今日からはじめる</button>
        </div>
      </div>`;
    document.getElementById("onb-next").addEventListener("click", () => renderOnboarding(2));
  } else {
    app.innerHTML = `
      <div class="onb-step">
        <div class="progress-dots"><span class="on"></span><span class="on"></span></div>
        <div class="big-emoji">🏠</div>
        <h1>毎月かかるお金を<br>ざっくり教えてください</h1>
        <p>家賃や光熱費など。正確じゃなくてOK、あとで変えられます。かからないものは「なし」のままで。</p>
        <div id="onb-fixed"></div>
        <div class="onb-actions">
          <button class="primary full" id="onb-done">これで始める</button>
        </div>
      </div>`;
    const wrap = document.getElementById("onb-fixed");
    FIXED_PRESETS.forEach((f) => {
      const div = document.createElement("div");
      div.innerHTML = `<div class="label" style="font-size:15px; font-weight:600; margin-top:14px;">${f.label}</div>`;
      const chips = document.createElement("div");
      chips.className = "chip-row";
      const options = [["なし", 0]].concat(f.suggest.map((v) => ["だいたい" + yen(v), v]));
      options.forEach(([label, v]) => {
        const c = document.createElement("button");
        c.textContent = label;
        if ((onbFixed[f.id] || 0) === v) c.classList.add("on");
        c.addEventListener("click", () => {
          onbFixed[f.id] = v;
          renderOnboarding(2);
        });
        chips.appendChild(c);
      });
      div.appendChild(chips);
      wrap.appendChild(div);
    });
    document.getElementById("onb-done").addEventListener("click", () => {
      state = {
        start: todayStr(),
        fixed: FIXED_PRESETS.map((f) => ({ id: f.id, label: f.label.split("(")[0], amount: onbFixed[f.id] || 0 })),
        learned: {},
        records: [],
        goal: 3,
      };
      save();
      currentTab = "input";
      render();
    });
  }
}

/* ---------- input ---------- */
function weekDaysDone() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setDate(now.getDate() - day);
  const monStr = mon.getFullYear() + "-" + String(mon.getMonth() + 1).padStart(2, "0") + "-" + String(mon.getDate()).padStart(2, "0");
  const days = new Set(state.records.filter((r) => r.date >= monStr).map((r) => r.date));
  return days.size;
}

function topbarHtml(title) {
  const done = weekDaysDone();
  const hit = done >= state.goal ? " 達成🎉" : "";
  return `<div class="topbar"><h1>${title}</h1><span class="streak-chip">今週 ${done}/${state.goal}日${hit}</span></div>`;
}

function renderInput() {
  app.innerHTML = topbarHtml("きろく") + `<p class="muted">なに買った?(タップだけ)</p><div class="genre-grid" id="grid"></div>`;
  const grid = document.getElementById("grid");
  GENRES.forEach((genre) => {
    const b = document.createElement("button");
    b.innerHTML = `<span class="emoji">${genre.emoji}</span>${genre.g}`;
    b.addEventListener("click", () => renderScenes(genre));
    grid.appendChild(b);
  });
}

function renderScenes(genre) {
  app.innerHTML = topbarHtml("きろく") + `<p class="muted">${genre.g} → どこで?</p><div class="scene-list" id="list"></div>`;
  const list = document.getElementById("list");
  genre.scenes.forEach(([s, base]) => {
    const price = estimate(genre.g, s, base);
    const b = document.createElement("button");
    b.innerHTML = `<span>${s}</span><span class="price">だいたい ${yen(price)}</span>`;
    b.addEventListener("click", () => {
      const rec = {
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        date: todayStr(),
        ts: Date.now(),
        genre: genre.g,
        scene: s,
        title: genre.g + "・" + s,
        amount: price,
      };
      state.records.push(rec);
      save();
      renderDone(rec);
    });
    list.appendChild(b);
  });
  const back = document.createElement("button");
  back.className = "ghost";
  back.textContent = "← もどる";
  back.addEventListener("click", renderInput);
  list.appendChild(back);
}

function renderDone(rec) {
  app.innerHTML = `
    <div class="done-wrap">
      <div class="done-check">✓</div>
      <div class="sub" id="done-title">${rec.title}</div>
      <div class="done-amount" id="done-amount">${yen(rec.amount)}</div>
      <p class="muted">で記録したよ。ズレてても気にしない</p>
    </div>
    <button class="primary full" id="done-close">とじる(このままでOK)</button>
    <button class="ghost full" id="done-edit" style="margin-top:8px;">金額・タイトルをなおす</button>`;
  document.getElementById("done-close").addEventListener("click", renderInput);
  document.getElementById("done-edit").addEventListener("click", () =>
    openEditModal(rec, () => {
      document.getElementById("done-title").textContent = rec.title;
      document.getElementById("done-amount").textContent = yen(rec.amount);
    })
  );
}

/* ---------- edit modal ---------- */
function openEditModal(rec, onSaved) {
  modalRoot.innerHTML = `
    <div class="modal-bg" id="modal-bg">
      <div class="modal">
        <h2 style="margin-bottom:14px;">記録をなおす</h2>
        <div class="field"><label>タイトル</label><input type="text" id="m-title" value="${rec.title.replace(/"/g, "&quot;")}"></div>
        <div class="field"><label>金額</label><input type="number" id="m-amount" inputmode="numeric" step="10" value="${rec.amount}"></div>
        <div class="field"><label>日付(${state.start.replaceAll("-", "/")} より前は選べません)</label>
          <input type="date" id="m-date" value="${rec.date}" min="${state.start}" max="${todayStr()}"></div>
        <div class="modal-actions">
          <button id="m-delete" style="color:var(--danger); flex:0 0 auto;">削除</button>
          <button id="m-cancel">やめる</button>
          <button class="primary" id="m-save">保存</button>
        </div>
      </div>
    </div>`;
  const close = () => (modalRoot.innerHTML = "");
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target.id === "modal-bg") close();
  });
  document.getElementById("m-cancel").addEventListener("click", close);
  document.getElementById("m-delete").addEventListener("click", () => {
    state.records = state.records.filter((r) => r.id !== rec.id);
    save();
    close();
    render();
  });
  document.getElementById("m-save").addEventListener("click", () => {
    const title = document.getElementById("m-title").value.trim() || rec.title;
    const amount = Math.max(0, Math.round(Number(document.getElementById("m-amount").value) || rec.amount));
    let date = document.getElementById("m-date").value;
    if (!date || date < state.start || date > todayStr()) date = rec.date;
    if (amount !== rec.amount) learn(rec.genre, rec.scene, amount);
    rec.title = title;
    rec.amount = amount;
    rec.date = date;
    save();
    close();
    if (onSaved) onSaved();
    else render();
  });
}

/* ---------- history ---------- */
function renderHistory() {
  const ym = todayStr().slice(0, 7);
  const monthRecs = state.records.filter((r) => r.date.startsWith(ym));
  const variable = monthRecs.reduce((a, r) => a + r.amount, 0);
  const fixedTotal = state.fixed.reduce((a, f) => a + f.amount, 0);
  const fixedRows = state.fixed
    .filter((f) => f.amount > 0)
    .map((f) => `<div class="summary-row"><span>${f.label}(固定)</span><span>${yen(f.amount)}</span></div>`)
    .join("");

  app.innerHTML =
    topbarHtml("きろく帳") +
    `<div class="card">
      <div class="muted">今月つかったの、だいたい</div>
      <div class="summary-amount">${yen(roundAbout(variable + fixedTotal))} <span style="font-size:15px; font-weight:400; color:var(--sub);">くらい</span></div>
      <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">
        <div class="summary-row"><span>買ったもの(${monthRecs.length}件)</span><span>${yen(roundAbout(variable))}</span></div>
        ${fixedRows}
      </div>
    </div>
    ${monthRecs.length > 0 ? `<div class="card">
      <h2 style="margin-bottom:12px;">今月のつかいみち</h2>
      <div style="display:flex; align-items:center; gap:18px;">
        <canvas id="pie"></canvas>
        <div id="legend" style="flex:1;"></div>
      </div>
    </div>` : ""}
    <div id="days"></div>`;

  if (monthRecs.length > 0) renderPie(monthRecs, variable);

  const days = document.getElementById("days");
  const byDate = {};
  state.records.slice().sort((a, b) => (a.date === b.date ? b.ts - a.ts : a.date < b.date ? 1 : -1)).forEach((r) => {
    (byDate[r.date] = byDate[r.date] || []).push(r);
  });
  const dates = Object.keys(byDate);
  if (dates.length === 0) {
    days.innerHTML = `<p class="muted" style="margin-top:24px; text-align:center;">まだ記録がありません。<br>買ったら「入力」からタップするだけ。</p>`;
    return;
  }
  dates.forEach((date) => {
    const group = document.createElement("div");
    group.className = "day-group";
    const d = new Date(date + "T00:00:00");
    const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    const label = date === todayStr() ? "きょう" : `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
    const dayTotal = byDate[date].reduce((a, r) => a + r.amount, 0);
    group.innerHTML = `<div class="day-label">${label} — ${yen(dayTotal)}</div>`;
    byDate[date].forEach((r) => {
      const item = document.createElement("div");
      item.className = "rec-item";
      const emoji = (GENRES.find((x) => x.g === r.genre) || { emoji: "📦" }).emoji;
      item.innerHTML = `<span class="title">${emoji} ${r.title}</span><span class="amount">${yen(r.amount)}</span>`;
      item.addEventListener("click", () => openEditModal(r));
      group.appendChild(item);
    });
    days.appendChild(group);
  });
}

function renderPie(monthRecs, variable) {
  const byGenre = {};
  monthRecs.forEach((r) => {
    byGenre[r.genre] = (byGenre[r.genre] || 0) + r.amount;
  });
  const data = GENRES.filter((g) => byGenre[g.g] > 0).map((g) => ({
    label: g.g,
    emoji: g.emoji,
    color: GENRE_COLORS[g.g] || "#888780",
    value: byGenre[g.g],
  }));

  const canvas = document.getElementById("pie");
  const dpr = window.devicePixelRatio || 1;
  const size = 150;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + "px";
  canvas.style.height = size + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const cx = size / 2, cy = size / 2, r1 = size / 2 - 4, r0 = size / 2 - 28;

  let ang = -Math.PI / 2;
  data.forEach((d) => {
    const sweep = (d.value / variable) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, ang, ang + sweep);
    ctx.arc(cx, cy, r0, ang + sweep, ang, true);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ang += sweep;
  });
  ctx.fillStyle = "#2c2c2a";
  ctx.font = "600 15px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(yen(roundAbout(variable)), cx, cy - 8);
  ctx.fillStyle = "#a3a29a";
  ctx.font = "12px -apple-system, sans-serif";
  ctx.fillText("くらい", cx, cy + 12);

  const legend = document.getElementById("legend");
  data.sort((a, b) => b.value - a.value).forEach((d) => {
    const pct = Math.round((d.value / variable) * 100);
    const row = document.createElement("div");
    row.className = "legend-row";
    row.innerHTML = `<span class="legend-dot" style="background:${d.color};"></span><span>${d.emoji} ${d.label}</span><span class="val">${yen(roundAbout(d.value))} <span style="color:var(--muted); font-weight:400;">${pct}%</span></span>`;
    legend.appendChild(row);
  });
}

/* ---------- settings ---------- */
function renderSettings() {
  const learnedRows = Object.keys(state.learned)
    .map((k) => `<div class="summary-row"><span>${k.replace("/", "・")}</span><span>だいたい ${yen(roundRough(state.learned[k]))}</span></div>`)
    .join("");

  app.innerHTML =
    topbarHtml("せってい") +
    `<div class="card">
      <h2>毎月の固定費(ざっくり)</h2>
      <p class="muted" style="margin-bottom:12px;">きろく帳の合計に足されます</p>
      <div id="fixed-list"></div>
    </div>
    <div class="card">
      <h2>おぼえた金額</h2>
      <p class="muted" style="margin-bottom:8px;">金額をなおすと、次からの「だいたい」が近づきます</p>
      ${learnedRows || '<p class="muted">まだありません</p>'}
    </div>
    <div class="card">
      <h2>データ</h2>
      <p class="muted" style="margin-bottom:12px;">はじめた日: ${state.start.replaceAll("-", "/")}(これより前は記録できません)</p>
      <button class="full" id="btn-export">JSONエクスポート</button>
      <button class="full" id="btn-demo" style="margin-top:8px;">サンプルデータを入れる(お試し用)</button>
      <button class="full" id="btn-reset" style="margin-top:8px; color:var(--danger);">全データ削除してやり直す</button>
    </div>`;

  const list = document.getElementById("fixed-list");
  state.fixed.forEach((f) => {
    const row = document.createElement("div");
    row.className = "fixed-row";
    row.innerHTML = `<span class="label">${f.label}</span>`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1000";
    input.value = f.amount;
    input.addEventListener("change", () => {
      f.amount = Math.max(0, Math.round(Number(input.value) || 0));
      input.value = f.amount;
      save();
    });
    row.appendChild(input);
    list.appendChild(row);
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kakeibo-export.json";
    a.click();
  });
  document.getElementById("btn-demo").addEventListener("click", () => {
    seedDemo();
    currentTab = "history";
    render();
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("全データを削除して最初からやり直しますか?")) {
      localStorage.removeItem(STORE_KEY);
      state = null;
      onbFixed = {};
      render();
    }
  });
}

function seedDemo() {
  const picks = [
    ["飲み物", "自販機"], ["ごはん", "昼ごはん"], ["遊び", "カラオケ"],
    ["おやつ", "コンビニ"], ["ごはん", "外食"], ["日用品", "100均"],
    ["交通", "電車・バス"], ["遊び", "映画"], ["飲み物", "カフェ"],
    ["たまに", "散髪・美容室"], ["ごはん", "コンビニ"], ["飲み物", "コンビニ"],
  ];
  const start = new Date(state.start + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const spanDays = Math.min(6, Math.round((today - start) / 86400000));
  for (let i = 0; i <= spanDays; i++) {
    if (i % 3 === 2) continue;
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const count = 1 + (i % 2);
    for (let j = 0; j < count; j++) {
      const [g, s] = picks[(i * 2 + j) % picks.length];
      const genre = GENRES.find((x) => x.g === g);
      const base = genre.scenes.find((x) => x[0] === s)[1];
      state.records.push({
        id: "demo-" + i + "-" + j,
        date: dateStr,
        ts: d.getTime() + j,
        genre: g,
        scene: s,
        title: g + "・" + s,
        amount: estimate(g, s, base),
      });
    }
  }
  save();
}

render();
