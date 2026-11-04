/* Pip core: the things every game shares (storage, voice, learning memory, play time, stickers, switching games) */
(() => {
  "use strict";
  const mkStore = prefix => ({
    get(k, d) { try { const v = localStorage.getItem(prefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(prefix + k, JSON.stringify(v)); } catch (e) {} }
  });
  // Each game keeps the storage keys it used as a separate file, so progress from the offline copies carries over
  const PREFIX = { meadow: "meadow.", arrow: "arrowfarm.", honey: "honeykeys.", reading: "readingnest.", trace: "snailtrails." };
  const GAME_IDS = Object.keys(PREFIX);
  const shared = mkStore("pip.");
  const storeFor = id => mkStore(PREFIX[id]);

  /* ---------- One-time move of name, voice, stickers and play time out of the separate games ---------- */
  if (!shared.get("migrated", false)) {
    const s = { voice: true, sfx: true, rate: 0.9, voiceName: "", first: "", last: "", words: [] };
    const taken = new Set(), stick = {}, time = {};
    for (const id of ["honey", "reading", "meadow", "arrow"]) {
      const st = storeFor(id), gs = st.get("settings", null);
      if (gs) {
        for (const k of ["voice", "sfx", "rate", "voiceName"]) if (gs[k] !== undefined && !taken.has(k)) { s[k] = gs[k]; taken.add(k); }
        if (id === "honey") { s.first = gs.first || ""; s.last = gs.last || ""; s.words = gs.words || []; }
      }
      for (const [e, n] of Object.entries(st.get("stickers", {}))) stick[e] = (stick[e] || 0) + n;
      for (const [d, m] of Object.entries(st.get("time", {}))) time[d] = (time[d] || 0) + m;
    }
    shared.set("settings", s); shared.set("stickers", stick); shared.set("time", time); shared.set("migrated", true);
  }

  const settings = Object.assign({ voice: true, sfx: true, rate: 0.9, voiceName: "", first: "", last: "", words: [] }, shared.get("settings", {}));
  const saveSettings = () => shared.set("settings", settings);
  const stickers = shared.get("stickers", {});
  const saveStickers = () => shared.set("stickers", stickers);

  /* ---------- Voice ---------- */
  const synth = window.speechSynthesis || null;
  let voice = null;
  // Edge lists its old desktop voices (David, Mark, Zira) before the clearer online "Natural" ones,
  // so rank every English voice instead of taking the first match
  const voiceScore = v => (/Natural/i.test(v.name) ? 100 : 0) + (/Samantha|Google US English|Google UK English Female/.test(v.name) ? 60 : 0)
    + (/Aria|Jenny|Ava|Emma|Libby|Sonia|Michelle/.test(v.name) ? 20 : 0) + (/en[-_](US|GB)/i.test(v.lang) ? 5 : 0) + (/Female/i.test(v.name) ? 3 : 0);
  const byScore = (a, b) => voiceScore(b) - voiceScore(a);
  const englishVoices = () => (synth ? synth.getVoices().filter(v => /^en/i.test(v.lang)).sort(byScore) : []);
  function chooseVoice() {
    if (!synth) return;
    const vs = englishVoices();
    voice = (settings.voiceName && vs.find(v => v.name === settings.voiceName)) || vs[0] || null;
  }
  if (synth) { chooseVoice(); synth.addEventListener("voiceschanged", chooseVoice); }
  let speechToken = 0;
  function stopSpeech() { speechToken++; if (synth) synth.cancel(); }
  function speakOne(text, onstart) {
    return new Promise(res => {
      if (!settings.voice || !synth) { onstart && onstart(); setTimeout(res, Math.max(450, text.length * 60)); return; }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-US";
      u.rate = settings.rate; u.pitch = 1; u.volume = 1;
      let done = false;
      const finish = () => { if (!done) { done = true; clearTimeout(guard); res(); } };
      const guard = setTimeout(finish, 2500 + text.length * 120); // some browsers skip onend
      u.onstart = () => onstart && onstart();
      u.onend = finish; u.onerror = finish;
      synth.speak(u);
    });
  }
  // Lines are plain strings or { text, onstart }. Resolves false if something else interrupted it.
  async function sayQueue(items) {
    const tok = speechToken;
    for (const it of items) {
      if (tok !== speechToken) return false;
      await speakOne(typeof it === "string" ? it : it.text, typeof it === "string" ? null : it.onstart);
    }
    return tok === speechToken;
  }
  function say(text) { stopSpeech(); return sayQueue([text]); }

  /* ---------- Learning memory ----------
     Every item (a number, letter, key, sound, word...) has a box from 0 to 5. Right first time moves it up
     a box; a mistake drops it to 0. Shaky and new items are picked more often, and known ones come back
     after a gap (1, 2, 4, 8 days) so they are not forgotten. Each game keeps its own list. */
  const memories = {};
  function memoryFor(id) {
    if (memories[id]) return memories[id];
    const st = storeFor(id);
    return (memories[id] = {
      data: st.get("memory", {}),
      rec(k) { return this.data[k] || (this.data[k] = { box: 0, seen: 0, right: 0, wrong: 0, last: 0 }); },
      result(k, firstTry) {
        const r = this.rec(k);
        r.seen++; r.last = Date.now();
        if (firstTry) { r.right++; r.box = Math.min(5, r.box + 1); } else { r.wrong++; r.box = 0; }
        st.set("memory", this.data);
      },
      weight(k) {
        const r = this.data[k];
        if (!r || !r.seen) return 3;
        const days = (Date.now() - r.last) / 864e5;
        const due = r.box >= 2 && days >= [0, 0, 1, 2, 4, 8][r.box];
        return [6, 3.5, 2, 1.2, 0.8, 0.5][r.box] + (due ? 2 : 0);
      },
      pick(ids, n) {
        const pool = ids.slice(), out = [];
        while (out.length < n && pool.length) {
          const ws = pool.map(k => this.weight(k)), total = ws.reduce((a, b) => a + b, 0);
          let x = Math.random() * total, i = 0;
          while (x > ws[i] && i < ws.length - 1) { x -= ws[i]; i++; }
          out.push(pool.splice(i, 1)[0]);
        }
        return out;
      },
      reset() { this.data = {}; st.set("memory", {}); }
    });
  }

  /* ---------- Games ---------- */
  const games = {};
  let active = null;
  // Each game lives in its own shadow root, so its ids and styles cannot clash with the others
  function defineGame(id, fn) {
    const host = document.getElementById("host-" + id);
    const root = host.attachShadow({ mode: "open" });
    root.appendChild(document.getElementById("tpl-" + id).content.cloneNode(true));
    games[id] = { host, root, progress: null };
    fn(root, host);
  }
  function registerGame(id, api) { Object.assign(games[id], api); }
  function openGame(id) {
    stopSpeech();
    active = id;
    document.getElementById("hub").hidden = true;
    GAME_IDS.forEach(g => { games[g].host.hidden = g !== id; });
    games[id].enter && games[id].enter();
  }
  function showHub() {
    if (active && games[active].leave) games[active].leave();
    active = null;
    stopSpeech();
    GAME_IDS.forEach(g => { games[g].host.hidden = true; });
    document.getElementById("hub").hidden = false;
    Pip.onHub && Pip.onHub();
  }

  /* ---------- Play time (counted only while a question is on screen) ---------- */
  const playTime = {
    data: shared.get("time", {}),
    day(t) { const d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); },
    tick() {
      const g = active && games[active];
      if (!g || document.hidden || !document.hasFocus()) return;
      const play = g.root.querySelector("#play");
      if (!play || play.hidden) return;
      const k = this.day(Date.now()); this.data[k] = (this.data[k] || 0) + 0.25; shared.set("time", this.data);
    },
    today() { return Math.round(this.data[this.day(Date.now())] || 0); },
    week() { let s = 0; for (let i = 0; i < 7; i++) s += this.data[this.day(Date.now() - i * 864e5)] || 0; return Math.round(s); }
  };
  setInterval(() => playTime.tick(), 15000);

  window.Pip = {
    GAME_IDS, storeFor, settings, saveSettings, stickers, saveStickers,
    say, sayQueue, stopSpeech, englishVoices, chooseVoice,
    memoryFor, playTime, games, defineGame, registerGame, openGame, showHub,
    activeGame: () => active,
    registerProgress(id, groups) { games[id].progress = groups; },
    goHub: () => Pip.showHub(),
    openGrownups: () => Pip.onGrownups && Pip.onGrownups(),
    onHub: null, onGrownups: null
  };
})();
