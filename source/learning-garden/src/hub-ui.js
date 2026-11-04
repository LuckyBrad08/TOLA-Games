/* Hub: the garden home screen, the shared sticker book and the one Grown-ups corner */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const { settings, saveSettings, stickers, saveStickers, say, stopSpeech } = Pip;

  const STICKERS = [
    ["🦁", "lion"], ["🐯", "tiger"], ["🐻", "bear"], ["🐼", "panda"], ["🐨", "koala"], ["🐵", "monkey"],
    ["🦊", "fox"], ["🐰", "bunny"], ["🐸", "frog"], ["🐷", "pig"], ["🐮", "cow"], ["🐔", "hen"],
    ["🐧", "penguin"], ["🦉", "owl"], ["🦄", "unicorn"], ["🐙", "octopus"], ["🐳", "whale"], ["🐬", "dolphin"],
    ["🦒", "giraffe"], ["🦓", "zebra"], ["🐘", "elephant"], ["🦛", "hippo"], ["🐢", "turtle"], ["🦜", "parrot"]
  ];
  // What the Grown-ups corner can change in each game (stored in that game's own settings)
  const GAMES = {
    meadow: { name: "Animal Meadow", acts: [["count", "Counting"], ["letters", "Letters"], ["shapes", "Shapes and colours"], ["patterns", "Patterns"]], levels: "levels" },
    arrow: { name: "Arrow Farm", acts: [["snack", "Snack time"], ["numbers", "Number path"], ["sounds", "Who says moo?"], ["letters", "Letter path"]], level: "level",
      extras: [["sayDir", "Say the direction on every step (\"Up!\", \"Left!\")", true]] },
    honey: { name: "Honey Keys", acts: [], levels: "levels", levelNames: { hunt: "Letter hunt", words: "Animal words", name: "My name", mine: "My words" },
      extras: [["glow", "Always light up the next key (turn off once she knows the keyboard a bit)", false]] },
    reading: { name: "Reading Nest", acts: [["sounds", "First sounds"], ["build", "Build a word"], ["read", "Read it!"], ["sight", "Little words"]], levels: "levels" }
  };

  let interacted = false;
  window.addEventListener("pointerdown", () => { interacted = true; }, { once: true });

  function show(id) { ["hubHome", "hubBookScreen"].forEach(s => { $("#" + s).hidden = s !== id; }); }
  function renderHub() { $("#hubStickerCount").textContent = Object.keys(stickers).length; show("hubHome"); }
  Pip.onHub = () => { renderHub(); if (interacted) say("Which game shall we play?"); };

  const doorWords = { meadow: "Animal Meadow!", arrow: "Arrow Farm!", honey: "Honey Keys!", reading: "Reading Nest!" };
  document.querySelectorAll(".door").forEach(d => {
    d.addEventListener("mouseenter", () => { if (interacted && !Pip.activeGame()) say(doorWords[d.dataset.game]); });
    d.addEventListener("click", () => Pip.openGame(d.dataset.game));
  });
  $("#pipHub").addEventListener("click", () => say(`Hi${settings.first ? " " + settings.first : ""}! I'm Pip. Which game shall we play today?`));

  /* ---------- Sticker book ---------- */
  function openBook() {
    stopSpeech();
    const have = STICKERS.filter(s => stickers[s[0]]).length;
    $("#hubBookCount").textContent = `${have} / ${STICKERS.length}`;
    $("#hubBookGrid").innerHTML = STICKERS.map(([e, n]) => {
      const c = stickers[e] || 0;
      return `<button class="slotb ${c ? "have" : "empty"}" data-name="${n}" data-have="${c ? 1 : 0}" aria-label="${c ? n : "Sticker not found yet"}"><span>${e}</span>${c > 1 ? `<span class="n">×${c}</span>` : ""}</button>`;
    }).join("");
    show("hubBookScreen");
    if (interacted) say(have ? `You have ${have} sticker${have === 1 ? "" : "s"}! Every game adds to this book.` : "Play any game to win your first sticker!");
  }
  $("#hubBook").addEventListener("click", openBook);
  $("#hubBookBack").addEventListener("click", () => { renderHub(); say("Which game shall we play?"); });
  $("#hubBookGrid").addEventListener("click", e => {
    const b = e.target.closest(".slotb"); if (!b) return;
    say(b.dataset.have === "1" ? cap(b.dataset.name) + "!" : "Keep playing to find this one!");
  });

  /* ---------- Grown-ups corner (press and hold so little fingers don't open it) ---------- */
  const gb = $("#grownBtn");
  let holdTimer = null;
  const startHold = () => { gb.classList.add("holding"); holdTimer = setTimeout(() => { endHold(); openSheet(false); }, 1500); };
  const endHold = () => { gb.classList.remove("holding"); clearTimeout(holdTimer); };
  gb.addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => gb.addEventListener(ev, endHold));
  gb.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && !e.repeat) { e.preventDefault(); startHold(); } });
  gb.addEventListener("keyup", endHold);
  // A game asks for this when she picks "My name" before a name has been added
  Pip.onGrownups = () => openSheet(true);

  function renderProgress() {
    const chip = (cls, t) => `<span class="chip ${cls}">${t}</span>`;
    let html = "", any = false;
    for (const id of Pip.GAME_IDS) {
      const groups = Pip.games[id].progress || [], mem = Pip.memoryFor(id);
      let part = "";
      for (const g of groups) {
        const ids = typeof g.ids === "function" ? g.ids() : g.ids;
        if (!ids.length) continue;
        const name = x => esc(g.show ? g.show(x) : x);
        const seen = ids.map(x => ({ x, r: mem.data[g.prefix + x] })).filter(o => o.r && o.r.seen);
        if (!seen.length) continue;
        any = true;
        const work = seen.filter(o => o.r.box <= 1 && o.r.wrong > 0).sort((a, b) => b.r.wrong - a.r.wrong);
        const good = seen.filter(o => o.r.box >= 3);
        const mid = seen.length - work.length - good.length, unseen = ids.length - seen.length;
        part += `<div class="prog-group"><b>${g.label}</b>`
          + (work.length ? `<div class="chips"><span class="chip-label">Working on</span>${work.map(o => chip("work", name(o.x))).join("")}</div>` : "")
          + (good.length ? `<div class="chips"><span class="chip-label">Knows well</span>${good.map(o => chip("good", name(o.x))).join("")}</div>` : "")
          + `<p class="prog-note">${[mid ? `${mid} still practising` : "", unseen ? `${unseen} not met yet` : ""].filter(Boolean).join(" · ")}</p></div>`;
      }
      if (part) html += `<div class="prog-game"><h5>${GAMES[id].name}</h5>${part}</div>`;
    }
    $("#progress").innerHTML = `<p class="prog-time">Played ${Pip.playTime.today()} min today, ${Pip.playTime.week()} min in the last 7 days.</p>`
      + (any ? html : "<p>Nothing recorded yet. This fills in as she plays.</p>");
  }
  function resetMemRow() {
    $("#memReset").innerHTML = `<button class="sbtn" id="clearMem">Forget progress and start fresh</button>`;
    $("#clearMem").addEventListener("click", () => {
      $("#memReset").innerHTML = `<span>Forget everything she has learned in all four games?</span><button class="sbtn danger" id="yesMem">Yes, start fresh</button><button class="sbtn" id="noMem">Keep it</button>`;
      $("#yesMem").addEventListener("click", () => { Pip.GAME_IDS.forEach(id => Pip.memoryFor(id).reset()); renderProgress(); $("#memReset").innerHTML = "<span>Progress cleared.</span>"; });
      $("#noMem").addEventListener("click", resetMemRow);
    });
  }

  function gameSettings(id) { return Pip.storeFor(id).get("settings", {}); }
  function renderGameOptions() {
    let html = "";
    for (const [id, g] of Object.entries(GAMES)) {
      const st = gameSettings(id), en = st.enabled || {};
      html += `<h5>${g.name}</h5>`;
      html += g.acts.map(([a, label]) => `<label><input type="checkbox" data-game="${id}" data-act="${a}"${en[a] === false ? "" : " checked"}> ${label}</label>`).join("");
      html += (g.extras || []).map(([k, label, dflt]) => `<label><input type="checkbox" data-game="${id}" data-extra="${k}"${(st[k] === undefined ? dflt : st[k]) ? " checked" : ""}> ${label}</label>`).join("");
    }
    $("#gameOptions").innerHTML = html;
  }
  $("#gameOptions").addEventListener("change", e => {
    const c = e.target, id = c.dataset.game; if (!id) return;
    const st = gameSettings(id);
    if (c.dataset.act) {
      st.enabled = Object.assign({}, st.enabled || {});
      st.enabled[c.dataset.act] = c.checked;
      // keep at least one activity in each game
      if (!GAMES[id].acts.some(([a]) => st.enabled[a] !== false)) { st.enabled[c.dataset.act] = true; c.checked = true; }
    } else st[c.dataset.extra] = c.checked;
    Pip.storeFor(id).set("settings", st);
  });

  function renderLevels() {
    let html = "";
    for (const [id, g] of Object.entries(GAMES)) {
      const st = Pip.storeFor(id);
      let rows;
      if (g.level) rows = [["All puzzles", st.get("level", 1)]];
      else {
        const lv = st.get("levels", {});
        const names = g.levelNames || Object.fromEntries(g.acts);
        rows = Object.keys(names).map(a => [names[a], lv[a] || 1]);
      }
      html += `<h5>${g.name}</h5><div class="levels">${rows.map(([n, l]) => `<span>${n}</span><span>Level ${l} of 3</span>`).join("")}</div>`;
    }
    $("#levelList").innerHTML = html;
  }
  $("#resetLevels").addEventListener("click", () => {
    for (const [id, g] of Object.entries(GAMES)) {
      const st = Pip.storeFor(id);
      if (g.level) st.set("level", 1); else st.set("levels", {});
    }
    renderLevels();
  });

  function fillVoices() {
    const sel = $("#optVoiceName");
    sel.innerHTML = `<option value="">Best available (automatic)</option>` + Pip.englishVoices().map(v => `<option value="${esc(v.name)}">${esc(v.name)}</option>`).join("");
    sel.value = settings.voiceName || "";
  }
  $("#optVoice").addEventListener("change", e => { settings.voice = e.target.checked; saveSettings(); });
  $("#optSfx").addEventListener("change", e => { settings.sfx = e.target.checked; saveSettings(); });
  $("#optRate").addEventListener("change", e => { settings.rate = parseFloat(e.target.value); saveSettings(); say("This is how fast I talk."); });
  $("#optVoiceName").addEventListener("change", e => { settings.voiceName = e.target.value; saveSettings(); Pip.chooseVoice(); say("Hi! I'm Pip. Can you hear me?"); });
  $("#testVoice").addEventListener("click", () => say("Hi! I'm Pip. Can you hear me?"));

  function resetStickerRow() {
    $("#stickerReset").innerHTML = `<button class="sbtn danger" id="clearStickers">Clear sticker book</button>`;
    $("#clearStickers").addEventListener("click", () => {
      $("#stickerReset").innerHTML = `<span>Remove every sticker?</span><button class="sbtn danger" id="yesClear">Yes, clear them</button><button class="sbtn" id="noClear">Keep them</button>`;
      $("#yesClear").addEventListener("click", () => {
        Object.keys(stickers).forEach(k => delete stickers[k]); saveStickers();
        $("#stickerReset").innerHTML = "<span>Sticker book cleared.</span>";
      });
      $("#noClear").addEventListener("click", resetStickerRow);
    });
  }

  let returnTo = null;
  function openSheet(focusName) {
    stopSpeech();
    returnTo = Pip.activeGame();
    $("#firstName").value = settings.first; $("#lastName").value = settings.last; $("#myWords").value = settings.words.join("\n");
    $("#optVoice").checked = settings.voice; $("#optSfx").checked = settings.sfx; $("#optRate").value = String(settings.rate);
    fillVoices(); renderProgress(); resetMemRow(); renderGameOptions(); renderLevels(); resetStickerRow();
    $("#sheetWrap").hidden = false;
    $(".sheet").scrollTop = 0;
    if (focusName) { $("#firstName").scrollIntoView({ block: "center" }); $("#firstName").focus(); }
    else $("#closeSheet").focus({ preventScroll: true });
  }
  function closeSheet() {
    settings.first = $("#firstName").value.trim().replace(/\s+/g, " ");
    settings.last = $("#lastName").value.trim().replace(/\s+/g, " ");
    settings.words = $("#myWords").value.split("\n").map(w => w.trim().replace(/\s+/g, " ")).filter(w => w && /\p{L}/u.test(w)).slice(0, 40);
    saveSettings();
    $("#sheetWrap").hidden = true;
    // the game that asked (Honey Keys "My name") picks up the new name straight away
    if (returnTo && Pip.games[returnTo].enter) Pip.games[returnTo].enter(); else renderHub();
  }
  $("#closeSheet").addEventListener("click", closeSheet);
  $("#sheetWrap").addEventListener("click", e => { if (e.target.id === "sheetWrap") closeSheet(); });
  window.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheetWrap").hidden) closeSheet(); });
  Pip.sheetOpen = () => !$("#sheetWrap").hidden;

  // Android's Back gesture takes her back to the garden instead of closing the app
  const openGame = Pip.openGame;
  let wakeLock = null;
  Pip.openGame = id => {
    history.pushState({ game: id }, "");
    openGame(id);
    // keep the screen from dimming in the middle of a game (allowed to fail)
    if (navigator.wakeLock) navigator.wakeLock.request("screen").then(l => { wakeLock = l; }, () => {});
  };
  Pip.goHub = () => (history.state && history.state.game ? history.back() : Pip.showHub());
  window.addEventListener("popstate", () => {
    if (!$("#sheetWrap").hidden) closeSheet();
    if (Pip.activeGame()) Pip.showHub();
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  });
  // a long press would otherwise open the phone's copy/share menu
  document.addEventListener("contextmenu", e => { if (!e.target.closest || !e.target.closest("input, textarea")) e.preventDefault(); });

  renderHub();
})();
