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
    meadow: { name: "Animal Meadow", acts: [["count", "Counting (to 10, then to 20)"], ["sums", "Sums (more or less, adding, taking away, making 10)"], ["letters", "Letters"], ["shapes", "Shapes and colours"], ["patterns", "Patterns"]], levels: "levels", maxLevel: { count: 4, sums: 4 } },
    arrow: { name: "Arrow Farm", acts: [["snack", "Snack time"], ["numbers", "Number path"], ["sounds", "Who says moo?"], ["letters", "Letter path"]], level: "level",
      levelLabel: "Hop around", extraLevels: [["planLevel", "Plan the path"]],
      extras: [["sayDir", "Say the direction on every step (\"Up!\", \"Left!\")", true]] },
    honey: { name: "Honey Keys", acts: [], levels: "levels", levelNames: { hunt: "Letter hunt", words: "Animal words", spell: "Spell it", name: "My name", mine: "My words" },
      extras: [["glow", "Always light up the next key (turn off once she knows the keyboard a bit)", false]] },
    reading: { name: "Reading Nest", acts: [["sounds", "First sounds"], ["build", "Build a word"], ["read", "Read it!"], ["sight", "Little words"]], levels: "levels" },
    trace: { name: "Snail Trails", acts: [["big", "Big letters"], ["small", "Small letters"], ["numbers", "Numbers"], ["name", "Writing her name"]], levels: "levels" },
    story: { name: "Story Time", acts: [], level: "level", levelLabel: "Story shelf (level 2 and 3 add longer stories)" },
    pairs: { name: "Memory Pairs", acts: [["animals", "Animal pairs"], ["letters", "Letters and animals"], ["numbers", "Numbers and dots"], ["case", "Big and small letters"]], levels: "levels" }
  };

  let interacted = false;
  window.addEventListener("pointerdown", () => { interacted = true; }, { once: true });

  function show(id) { ["hubHome", "hubBookScreen"].forEach(s => { $("#" + s).hidden = s !== id; }); }
  function renderHub() { $("#hubStickerCount").textContent = Object.keys(stickers).length; show("hubHome"); }
  Pip.onHub = () => { endSession(); renderHub(); if (interacted) say("Which game shall we play?"); };

  const doorWords = { meadow: "Animal Meadow!", arrow: "Arrow Farm!", honey: "Honey Keys!", reading: "Reading Nest!", trace: "Snail Trails!", story: "Story Time!", pairs: "Memory Pairs!" };
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
      if (g.level) rows = [[g.levelLabel || "All", st.get("level", 1)], ...(g.extraLevels || []).map(([k, n]) => [n, st.get(k, 1)])];
      else {
        const lv = st.get("levels", {});
        const names = g.levelNames || Object.fromEntries(g.acts);
        rows = Object.keys(names).map(a => [names[a], lv[a] || 1, (g.maxLevel || {})[a]]);
      }
      html += `<h5>${g.name}</h5><div class="levels">${rows.map(([n, l, max]) => `<span>${n}</span><span>Level ${l} of ${max || 3}</span>`).join("")}</div>`;
    }
    $("#levelList").innerHTML = html;
  }
  $("#resetLevels").addEventListener("click", () => {
    for (const [id, g] of Object.entries(GAMES)) {
      const st = Pip.storeFor(id);
      if (g.level) { st.set("level", 1); (g.extraLevels || []).forEach(([k]) => st.set(k, 1)); } else st.set("levels", {});
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

  let returnTo = null, openedAt = 0;
  function openSheet(focusName) {
    stopSpeech();
    returnTo = Pip.activeGame();
    openedAt = Date.now();
    $("#firstName").value = settings.first; $("#lastName").value = settings.last; $("#myWords").value = settings.words.join("\n");
    $("#optVoice").checked = settings.voice; $("#optSfx").checked = settings.sfx; $("#optRate").value = String(settings.rate);
    fillVoices(); renderRec("first"); renderRec("last"); renderProgress(); resetMemRow(); renderGameOptions(); renderLevels(); resetStickerRow();
    $("#sheetWrap").hidden = false;
    $(".sheet").scrollTop = 0;
    if (focusName) { $("#firstName").scrollIntoView({ block: "center" }); $("#firstName").focus(); }
    else $("#closeSheet").focus({ preventScroll: true });
  }
  function closeSheet() {
    if (recorder) recorder.stop();
    settings.first = $("#firstName").value.trim().replace(/\s+/g, " ");
    settings.last = $("#lastName").value.trim().replace(/\s+/g, " ");
    settings.words = $("#myWords").value.split("\n").map(w => w.trim().replace(/\s+/g, " ")).filter(w => w && /\p{L}/u.test(w)).slice(0, 40);
    saveSettings();
    $("#sheetWrap").hidden = true;
    // the game that asked (Honey Keys "My name") picks up the new name straight away
    if (returnTo && Pip.games[returnTo].enter) Pip.games[returnTo].enter(); else renderHub();
  }
  $("#closeSheet").addEventListener("click", closeSheet);
  // Lifting the finger after the long press sends a tap to whatever is now underneath it, which can be
  // "Save and close" or the dimmed background. Ignore every tap in the corner's first moment.
  $("#sheetWrap").addEventListener("click", e => { if (Date.now() - openedAt < 800) { e.stopPropagation(); e.preventDefault(); } }, true);
  $("#sheetWrap").addEventListener("click", e => { if (e.target.id === "sheetWrap") closeSheet(); });
  window.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#sheetWrap").hidden) closeSheet(); });
  Pip.sheetOpen = () => !$("#sheetWrap").hidden;

  /* ---------- Pip's 5 minutes ----------
     Three short rounds back to back, one from each of the three games where she has the most to practise:
     items she got wrong recently count most, then items due for a refresh, then things she hasn't tried. */
  const ACTIVITIES = [
    ["meadow", "count", "Counting", ["count:"]], ["meadow", "sums", "Sums", ["more:", "add:", "sub:", "bond:"]],
    ["meadow", "letters", "Letters", ["letter:"]], ["meadow", "shapes", "Shapes", ["shape:", "colour:"]], ["meadow", "patterns", "Patterns", ["pattern:"]],
    ["arrow", "hop", "Arrow Farm", ["sound:", "num:", "abc:", "dir:"]], ["arrow", "plan", "Plan the path", ["plan:"]],
    ["honey", "hunt", "Letter hunt", ["key:"]], ["honey", "words", "Animal words", ["word:"]], ["honey", "spell", "Spell it", ["spell:"]], ["honey", "name", "Typing your name", ["name:"]],
    ["reading", "sounds", "First sounds", ["snd:"]], ["reading", "build", "Build a word", ["word:"]], ["reading", "read", "Read it", ["read:"]], ["reading", "sight", "Little words", ["sight:"]],
    ["trace", "big", "Big letters", ["up:"]], ["trace", "small", "Small letters", ["low:"]], ["trace", "numbers", "Writing numbers", ["num:"]], ["trace", "name", "Writing your name", ["name:"]],
    ["story", "story", "Story time", ["q:"]],
    ["pairs", "animals", "Animal pairs", ["pic:"]], ["pairs", "letters", "Letter pairs", ["abc:"]], ["pairs", "numbers", "Number pairs", ["num:"]], ["pairs", "case", "Big and small pairs", ["case:"]]
  ];
  function needScore(gid, prefixes) {
    const now = Date.now();
    let work = 0, due = 0, seen = 0;
    for (const [k, r] of Object.entries(Pip.memoryFor(gid).data)) {
      if (!r.seen || !prefixes.some(p => k.startsWith(p))) continue;
      seen++;
      if (r.box <= 1 && r.wrong > 0) work++;
      else if (r.box >= 2 && (now - r.last) / 864e5 >= [0, 0, 1, 2, 4, 8][r.box]) due++;
    }
    return work * 3 + due + (seen ? 0 : 1.5);
  }
  function available([gid, act]) {
    const en = gameSettings(gid).enabled || {};
    if (en[act] === false) return false;
    if (act === "name" && !settings.first.trim()) return false;
    return true;
  }
  function choosePicks() {
    const scored = ACTIVITIES.filter(available).map(([game, act, label, pre]) => ({ game, act, label, score: needScore(game, pre) + Math.random() }));
    scored.sort((a, b) => b.score - a.score);
    const picks = [], used = new Set();
    for (const s of scored) if (picks.length < 3 && !used.has(s.game)) { picks.push(s); used.add(s.game); }
    return picks;
  }
  let session = null;
  function endSession() { session = null; $("#nextBtn").hidden = true; }
  function launch() {
    const p = session.picks[session.i];
    session.ready = false; session.nudged = false;
    Pip.openGame(p.game);
    Pip.games[p.game].play(p.act);
  }
  $("#fiveBtn").addEventListener("click", () => {
    const picks = choosePicks();
    if (!picks.length) return;
    session = { picks, i: 0 };
    stopSpeech();
    say(`Pip's five minutes! First, ${picks[0].label}!`).then(() => { if (session && session.i === 0 && !Pip.activeGame()) launch(); });
  });
  Pip.roundDone = () => { if (session) session.ready = true; };
  // the Next button shows only on the game's "Round finished" screen
  setInterval(() => {
    const btn = $("#nextBtn"), id = Pip.activeGame();
    const show = !!(session && session.ready && id && !Pip.games[id].root.querySelector("#reward").hidden);
    if (show && btn.hidden) {
      const next = session.picks[session.i + 1];
      btn.innerHTML = next ? `Next: ${next.label} <span class="emoji">➡️</span>` : `All done! <span class="emoji">⭐</span>`;
      if (!session.nudged) {
        session.nudged = true;
        setTimeout(() => { if (session && !btn.hidden) say(next ? `Tap Next for ${next.label}!` : "That's Pip's five minutes! Tap All done."); }, 5000);
      }
    }
    btn.hidden = !show;
  }, 400);
  $("#nextBtn").addEventListener("click", () => {
    $("#nextBtn").hidden = true;
    if (!session) return;
    session.i++;
    if (session.i < session.picks.length) { stopSpeech(); launch(); return; }
    endSession();
    Pip.goHub();
    setTimeout(() => say("Well done! That's Pip's five minutes. See you next time!"), 400);
  });

  /* ---------- Her name in your voice ---------- */
  let recorder = null;
  function renderRec(which) {
    const box = $(which === "first" ? "#recFirst" : "#recLast");
    const has = !!Pip.nameAudio[which];
    box.innerHTML = `<span class="rec-label">${which === "first" ? "First name" : "Surname"}</span>`
      + `<button type="button" class="sbtn" data-rec="${which}">🎙️ ${has ? "Record again" : "Record"}</button>`
      + (has ? `<button type="button" class="sbtn" data-play="${which}">▶ Play</button><button type="button" class="sbtn danger" data-del="${which}">Remove</button>` : "");
  }
  async function record(which, btn) {
    if (recorder) { recorder.stop(); return; } // a second tap stops early
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) {
      $("#recNote").textContent = "The microphone isn't available here. Open Pip's Garden from its home-screen icon or the GitHub link, then allow the microphone when asked.";
      return;
    }
    stopSpeech();
    const chunks = [];
    // a low bitrate is plenty for one spoken name and keeps it small enough to store on the phone
    try { recorder = new MediaRecorder(stream, { audioBitsPerSecond: 32000 }); } catch (e) { recorder = new MediaRecorder(stream); }
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    let left = 3;
    const tick = setInterval(() => { left--; if (left <= 0) { if (recorder && recorder.state === "recording") recorder.stop(); } else btn.textContent = `■ Stop (${left})`; }, 1000);
    recorder.onstop = () => {
      clearInterval(tick);
      stream.getTracks().forEach(t => t.stop());
      recorder = null;
      if (!chunks.length) { renderRec(which); return; }
      const fr = new FileReader();
      fr.onload = () => { Pip.nameAudio[which] = fr.result; Pip.saveNameAudio(); renderRec(which); Pip.playClip(fr.result); };
      fr.readAsDataURL(new Blob(chunks, { type: chunks[0].type || "audio/webm" }));
    };
    recorder.start();
    btn.textContent = `■ Stop (${left})`;
  }
  ["#recFirst", "#recLast"].forEach(sel => $(sel).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.rec) record(b.dataset.rec, b);
    else if (b.dataset.play) Pip.playClip(Pip.nameAudio[b.dataset.play]);
    else if (b.dataset.del) { delete Pip.nameAudio[b.dataset.del]; Pip.saveNameAudio(); renderRec(b.dataset.del); }
  }));

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
