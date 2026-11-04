"""Builds Pip's Learning Garden (one file) from the four separate games plus the shared hub."""
import os, re, sys

# PIP_SOURCE: folder holding the four game folders and learning-garden/ (defaults to this session's layout)
HOME = os.environ.get("PIP_SOURCE", "/home/user/")
SRC = HOME + "learning-garden/src/"
GAMES = [("meadow", "animal-meadow"), ("arrow", "arrow-farm"), ("honey", "honey-keys"), ("reading", "reading-nest")]

def once(s, old, new, what):
    n = s.count(old)
    assert n == 1, f"{what}: expected 1 match, found {n}"
    return s.replace(old, new)

def resub(s, pattern, repl, what, flags=re.S, count=1):
    out, n = re.subn(pattern, repl, s, flags=flags)
    assert n == count, f"{what}: expected {count} match(es), found {n}"
    return out

ENTER = {
"meadow": '''  Pip.registerGame("meadow", {
    enter() {
      const st = store.get("settings", {});
      settings.enabled = Object.assign({ count: true, letters: true, shapes: true, patterns: true }, st.enabled || {});
      levels = Object.assign({ count: 1, letters: 1, shapes: 1, patterns: 1 }, store.get("levels", {}));
      goHome();
    },
    leave() { game = null; stopSpeech(); }
  });''',
"arrow": '''  Pip.registerGame("arrow", {
    enter() {
      const st = store.get("settings", {});
      settings.enabled = Object.assign({ snack: true, numbers: true, sounds: true, letters: true }, st.enabled || {});
      if (st.sayDir !== undefined) settings.sayDir = st.sayDir;
      level = store.get("level", 1);
      interacted = true; gate.hidden = true; // she already clicked to get here
      goStart();
    },
    leave() { game = null; P = null; clearIdle(); clearHint(); stopSpeech(); }
  });''',
"honey": '''  Pip.registerGame("honey", {
    enter() {
      const st = store.get("settings", {});
      if (st.glow !== undefined) settings.glow = st.glow;
      levels = Object.assign({ hunt: 1, words: 1, name: 1, mine: 1 }, store.get("levels", {}));
      gate.hidden = true;
      goHome();
    },
    leave() { goHome(false); }
  });''',
"reading": '''  Pip.registerGame("reading", {
    enter() {
      const st = store.get("settings", {});
      settings.enabled = Object.assign({ sounds: true, build: true, read: true, sight: true }, st.enabled || {});
      levels = Object.assign({ sounds: 1, build: 1, read: 1, sight: 1 }, store.get("levels", {}));
      goHome();
    },
    leave() { game = null; stopSpeech(); }
  });''',
}


PHONE_COMMON = """
/* ---- touch screens and phones held sideways (added when the games were merged) ---- */
:host { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
/* no physical keyboard on a touch screen: hide the "click so the keyboard works" screen and key hints */
@media (pointer: coarse) { .gate, .how, .hint-line { display: none !important; } }
@media (max-height: 520px) {
  .screen { gap: 6px; padding-block: 6px; }
  .round-btn { width: 44px; height: 44px; font-size: 21px; box-shadow: 0 4px 0 var(--paper-edge); }
  .paws { gap: 5px; }
  .paw { width: 28px; height: 28px; font-size: 14px; border-width: 2px; }
  .bubble-row { gap: 10px; }
  .bubble-row .pip, .pip.small { width: 44px; height: 44px; font-size: 30px; box-shadow: 0 4px 0 var(--paper-edge); }
  .bubble { font-size: 19px; padding: 6px 14px; border-radius: 16px; box-shadow: 0 4px 0 var(--paper-edge); }
  .bubble::before { left: -10px; margin-top: -8px; border-width: 8px; border-right-width: 11px; }
  h1 { font-size: 34px; }
  h2 { font-size: 24px; }
  .home-head, .start-head { margin-top: 0; gap: 12px; }
  .home-head .pip, .start-head .pip, #pipHome { width: 64px; height: 64px; font-size: 42px; box-shadow: 0 4px 0 var(--paper-edge); }
  .home-sub, .start-sub { font-size: 17px; margin-top: 2px; }
  .tiles { margin-top: 4px; gap: 12px; grid-template-columns: repeat(4, minmax(0, 170px)); }
  .tile { min-height: 0; padding: 8px; border-radius: 24px; gap: 6px; box-shadow: 0 7px 0 var(--edge, var(--paper-edge)), 0 10px 18px rgba(0, 0, 0, .12); }
  .tile-art { min-height: 92px; border-radius: 18px; }
  .tile-name { font-size: 18px; }
  .pill { padding: 8px 16px; font-size: 17px; }
  .pill .emoji { font-size: 22px; }
  .sticker-big { width: 120px; font-size: 76px; border-width: 6px; }
  .eyebrow { font-size: 14px; }
  .book { padding: 14px; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
  .slotb { font-size: 42px; border-radius: 18px; }
  .stage { min-height: 0; }
}
"""
PHONE_GAME = {
"meadow": """@media (max-height: 520px) {
  .choices { gap: 14px; padding-bottom: 10px; }
  .choice { width: 92px; border-radius: 22px; box-shadow: 0 6px 0 var(--paper-edge), 0 8px 14px rgba(34, 48, 74, .14); }
  .choice .num { font-size: 50px; }
  .choice .pic { font-size: 48px; }
  .choice .word { font-size: 16px; }
  .choice .dots { max-width: 60px; gap: 3px; }
  .choice .dots i { width: 8px; height: 8px; }
  .field { gap: 4px 10px; }
  .critter { font-size: 34px; padding: 3px; }
  .critter.counted::after { width: 20px; height: 20px; font-size: 13px; top: -4px; right: -4px; }
  .letter-card { font-size: 64px; padding: 2px 24px 6px; border-radius: 22px; box-shadow: 0 6px 0 #ef8fa3; }
  .friend .emoji { font-size: 58px; }
  .friend .want { width: 60px; font-size: 32px; }
  .seq { gap: 6px; }
  .seq .slot { width: 50px; font-size: 32px; border-radius: 14px; }
  .sun { width: 56px; height: 56px; }
}""",
"arrow": """@media (max-height: 520px) {
  .field-row { flex-direction: row; gap: 28px; }
  .board { --bs: min(calc(100vh - 116px), 560px, calc(100vw - 280px)); min-width: 0; min-height: 0; border-width: 8px; border-radius: 14px; }
  .pad { gap: 8px; }
  .key { width: 68px; border-radius: 16px; box-shadow: 0 6px 0 #b7c6d3, inset 0 0 0 3px #e6eef5; }
  .key span { font-size: 14px; }
  .pickers { gap: 10px; margin-top: 6px; }
  .pick { width: 100px; border-radius: 22px; }
  .pick .emoji { font-size: 50px; }
  .pick span:last-child { font-size: 16px; }
  .how { margin-top: 4px; padding: 8px 16px; font-size: 18px; }
}""",
"honey": """@media (max-height: 520px) {
  .bubble-row { display: none; }
  .stage { flex-direction: row; gap: 16px; }
  .stage-pic { font-size: 48px; }
  .comb { --w: 46px; }
  .big-letter { font-size: 64px; padding: 0 24px 6px; border-radius: 22px; box-shadow: 0 6px 0 #ef8fa3; }
  .is-for { font-size: 20px; gap: 8px; }
  .kb { --k: min(62px, calc((100vw - 110px) / 10)); padding: 8px; gap: 5px; border-radius: 16px; box-shadow: 0 5px 0 #24243a; }
  .kb-row { gap: 5px; }
  .k { height: 46px; font-size: 22px; border-radius: 9px; }
  .k.space { height: 36px; font-size: 13px; }
  .art-keys span { width: 36px; height: 36px; font-size: 19px; }
  .art-word { font-size: 26px; }
  .art-word .emoji { font-size: 36px; }
  .art-name { font-size: 22px; }
}""",
"reading": """@media (max-height: 520px) {
  .choices { gap: 14px; padding-bottom: 10px; }
  .choice { width: 92px; border-radius: 22px; box-shadow: 0 6px 0 var(--paper-edge), 0 8px 14px rgba(38, 50, 74, .14); }
  .choice .pic { font-size: 48px; }
  .choice.wordcard { height: 66px; min-width: 92px; padding: 6px 16px; }
  .choice .word { font-size: 32px; }
  .stage { gap: 6px; }
  .card-key { padding: 4px 20px; border-radius: 18px; box-shadow: 0 6px 0 var(--egg); }
  .card-key .emoji { font-size: 46px; }
  .card-key .w { font-size: 18px; }
  .letter-card { font-size: 60px; padding: 2px 22px 6px; border-radius: 20px; box-shadow: 0 6px 0 #ef8fa3; }
  .reveal { font-size: 17px; }
  .big-word { font-size: 52px; padding: 2px 24px 6px; border-radius: 20px; box-shadow: 0 6px 0 var(--egg); }
  .big-word.sentence { font-size: 28px; }
  .helpme { font-size: 14px; padding: 4px 12px; }
  .build { gap: 14px; }
  .build .emoji.big { font-size: 56px; }
  .slots { gap: 6px; }
  .slot { width: 50px; height: 60px; font-size: 38px; border-radius: 12px; border-width: 3px; }
  .tile-l { width: 56px; height: 64px; font-size: 38px; border-radius: 14px; box-shadow: 0 6px 0 #ef8fa3; }
  .art-sounds { font-size: 34px; }
  .art-sounds b { font-size: 36px; }
  .art-build span { width: 34px; height: 40px; font-size: 22px; }
  .art-read { font-size: 32px; }
  .art-read .emoji { font-size: 28px; }
  .art-sight { font-size: 18px; }
  .sunball { width: 54px; height: 54px; }
}""",
}

def touch_arrow(js, markup):
    """Arrow Farm was built around the arrow keys and Space; on a touch screen she taps instead."""
    js = once(js, 'const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;',
              'const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;\n'
              '  const touch = window.matchMedia && matchMedia("(pointer: coarse)").matches;', "arrow touch flag")
    # one tap on an animal starts the game (with a keyboard, the first click only chooses)
    js = once(js, "if (i === settings.animal) startRound(); else choose(i);",
              "if (i === settings.animal || touch) { if (i !== settings.animal) choose(i, false); startRound(); } else choose(i);", "arrow picker tap")
    js = once(js, 'say("Use the arrows to choose your animal. Then press the big space bar!")',
              'say(touch ? "Tap the animal you want to be!" : "Use the arrows to choose your animal. Then press the big space bar!")', "arrow pip hint")
    js = once(js, "${bigger} Press space to play again.`", '${bigger}${touch ? "" : " Press space to play again."}`', "arrow reward line")
    markup = once(markup, '<button class="pill" id="rewardBook"', '<button class="pill" id="againBtn" tabindex="-1"><span class="emoji">🔁</span> Play again</button>\n      <button class="pill" id="rewardBook"', "arrow play again button")
    return js, markup

HUB_BTN = '<button class="pill" id="hubBtn"><span class="emoji">🗺️</span> All games</button>'
VOICE_SHIM = '''/* ---------- Voice (shared: Pip's one voice for every game) ---------- */
  const synth = window.speechSynthesis || null; // only used to keep effects quieter while Pip talks
  const { say, sayQueue, stopSpeech } = Pip;
'''

def build_game(gid, folder):
    src = open(HOME + folder + "/game.html").read()
    style = re.search(r"<style>(.*?)</style>", src, re.S).group(1)
    js = re.search(r"<script>(.*?)</script>", src, re.S).group(1)
    markup = src[src.index("</style>") + len("</style>"): src.index("<script>")]

    # --- styles: the game's page rules now apply to its shadow host
    style = once(style, ":root {", ":host {", f"{gid} :root")
    style = once(style, "html, body { height: 100%; }", ":host { display: block; height: 100%; }", f"{gid} html,body")
    style = resub(style, r"\nbody \{", "\n:host {", f"{gid} body", flags=0)

    # --- markup: drop the game's own Grown-ups corner, put an "All games" button where its button was
    markup = markup[: markup.index('<div class="sheet-wrap"')]
    markup = resub(markup, r'<button class="grownup".*?</button>', HUB_BTN, f"{gid} grown-up button")
    style += PHONE_COMMON + PHONE_GAME[gid] + "\n"

    # --- script
    js = once(js, '(() => {\n  "use strict";', f'Pip.defineGame("{gid}", (root, host) => {{\n  "use strict";', f"{gid} head")
    tail = js.rstrip()
    assert tail.endswith("})();"), f"{gid} tail"
    js = tail[: -len("})();")] + "});\n"

    progress = re.search(r"  const PROGRESS = \[.*?\n  \];", js, re.S).group(0)
    js = resub(js, r"  /\* ---------- Grown-ups corner.*?(?=\n  render(Home|Start)\(\);\n\}\);)",
               progress + f'\n  Pip.registerProgress("{gid}", PROGRESS);\n\n'
               + '  root.querySelector("#hubBtn").addEventListener("click", () => Pip.goHub());\n' + ENTER[gid], f"{gid} grown-ups section")

    js = js.replace("document.querySelectorAll(", "root.querySelectorAll(").replace("document.querySelector(", "root.querySelector(")
    js = js.replace("document.body.appendChild(", "root.appendChild(")
    js = resub(js, r"  const store = \{.*?\n  \};", f'  const store = Pip.storeFor("{gid}");', f"{gid} store")
    js = resub(js, r"/\* ---------- Learning memory.*?setInterval\(\(\) => playTime\.tick\(\), 15000\);", f'const memory = Pip.memoryFor("{gid}");', f"{gid} memory")

    vb = re.search(r"/\* ---------- Voice ---------- \*/.*?(?=/\* ---------- Sound effects)", js, re.S).group(0)
    extras = "".join(l + "\n" for l in vb.split("\n") if re.match(r"\s*(// Some voices|// how a sight word|const (letterSay|L|spell|wordSay) =)", l))
    js = js.replace(vb, VOICE_SHIM + extras + "\n  ")

    js = re.sub(r"(?<!Pip\.)\bsettings\.(sfx|voice|rate|first|last|words)\b", r"Pip.settings.\1", js)
    js = once(js, 'let stickers = store.get("stickers", {});', "const stickers = Pip.stickers;", f"{gid} stickers load")
    js = once(js, 'store.set("stickers", stickers);', "Pip.saveStickers();", f"{gid} stickers save")
    js = js.replace('$("#sheetWrap").hidden', "!Pip.sheetOpen()")
    n_kd = js.count('window.addEventListener("keydown", e => {')
    js = js.replace('window.addEventListener("keydown", e => {', 'window.addEventListener("keydown", e => {\n    if (host.hidden || Pip.sheetOpen()) return;')
    js = js.replace('window.addEventListener("blur", () => {', 'window.addEventListener("blur", () => {\n    if (host.hidden) return;')
    if gid == "honey":
        js = once(js, "openSheet(true);", "Pip.openGrownups();", "honey name prompt")
    if gid == "reading":
        js = add_find_your_name(js)
    if gid == "arrow":
        js, markup = touch_arrow(js, markup)
        js = once(js, '  Pip.registerGame("arrow", {', '  root.querySelector("#againBtn").addEventListener("click", () => startRound());\n  Pip.registerGame("arrow", {', "arrow play again handler")

    leftovers = [w for w in ("openSheet", "closeSheet()", "document.querySelector", "localStorage", "speechSynthesis.speak", "fillVoices", "renderProgress") if w in js]
    for w in leftovers:
        # closeSheet() survives only inside guards that can no longer run (the game has no sheet now)
        assert w == "closeSheet()", f"{gid}: leftover {w}"
    print(f"{gid}: ok ({n_kd} keyboard handlers guarded)")
    return f'<template id="tpl-{gid}"><style>{style}</style>{markup}</template>\n', f"<script>\n{js}</script>\n"

def add_find_your_name(js):
    js = once(js, '    return shuffle(items);\n  }\n\n  function renderPaws',
              '    // once her name is in the Grown-ups corner, one question asks her to find it among other names\n'
              '    if (Pip.settings.first && Math.random() < 0.6) items[0] = { id: "sight:@name", sight: "@name", name: Pip.settings.first };\n'
              '    return shuffle(items);\n  }\n\n  function renderPaws', "reading round")
    js = once(js, "  function setupSight(q, lv) {\n", "  function setupSight(q, lv) {\n    if (q.item.name) return setupName(q, lv);\n", "reading setupSight")
    js = once(js, "  function setupSentence(q) {", '''  function setupName(q, lv) {
    const me = q.item.name, low = s => s.toLowerCase();
    const NAMES = ["Sam", "Ben", "Mia", "Leo", "Ava", "Max", "Tom", "Lily", "Noah", "Zara", "Tess", "Kai"];
    // level 1 uses names that start with a different letter; later levels mix in your family words
    const pool = NAMES.filter(n => low(n) !== low(me) && (lv > 1 || low(n[0]) !== low(me[0])))
      .concat(lv > 1 ? Pip.settings.words.filter(w => low(w) !== low(me)) : []);
    const others = shuffle(pool).slice(0, lv === 1 ? 2 : 3);
    const show = x => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const opts = shuffle([me, ...others]).map(x => ({ correct: x === me, label: x, word: x, html: `<span class="word">${show(x)}</span>` }));
    $("#stage").innerHTML = `<div class="card-key"><span class="emoji">😊</span><span class="w">Where is your name?</span></div>`;
    q.prompt = "Find your name!";
    q.intro = () => say("Can you find your name?");
    addChoices(opts, q, "wordcard"); markRight(opts);
    q.wrong = opt => say(`That says ${opt.word}. Find your name!`);
    q.celebrate = () => say(`Yes! That says ${me}. That's your name!`);
  }
  function setupSentence(q) {''', "reading setupName")
    js = once(js, '{ label: "Little words", prefix: "sight:", ids: SIGHT2 }',
              '{ label: "Little words", prefix: "sight:", ids: () => Pip.settings.first ? SIGHT2.concat("@name") : SIGHT2, show: w => w === "@name" ? "her name" : w }', "reading progress")
    return js

templates, scripts = "", ""
for gid, folder in GAMES:
    t, s = build_game(gid, folder)
    templates += t; scripts += s

page = (open(SRC + "hub.html").read() + "\n" + templates
        + "<script>\n" + open(SRC + "pip-core.js").read() + "</script>\n"
        + scripts
        + "<script>\n" + open(SRC + "hub-ui.js").read() + "</script>\n")
out = HOME + "learning-garden/game.html"
open(out, "w").write(page)
head = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
open(HOME + "learning-garden/learning-garden.html", "w").write(head + page + "\n</html>\n")
print("built", out, len(page) // 1024, "KB")

import hashlib, os, json
APP = os.environ.get("PIP_APP", HOME + "pip-garden-app/")
FONT_LINKS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Baloo+2:wght@600;800&display=swap">"""
app_page = once(page, FONT_LINKS, '<link rel="stylesheet" href="fonts/fonts.css">', "app fonts")
app_head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#86cc72">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
"""
sw_register = """<script>
// Works offline once installed: the service worker keeps a copy of every file on the phone
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
</script>
"""
open(APP + "index.html", "w").write(app_head + app_page + sw_register + "</html>\n")
manifest = {
    "name": "Pip's Learning Garden", "short_name": "Pip's Garden", "id": "./", "start_url": "./", "scope": "./",
    "display": "fullscreen", "orientation": "landscape", "background_color": "#c9ecfa", "theme_color": "#86cc72",
    "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
              {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
}
open(APP + "manifest.webmanifest", "w").write(json.dumps(manifest, indent=2) + "\n")
files = ["index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "fonts/fonts.css"] + sorted("fonts/" + f for f in os.listdir(APP + "fonts") if f.endswith(".woff2"))
digest = hashlib.sha256(b"".join(open(APP + f, "rb").read() for f in files)).hexdigest()[:10]
sw = open(SRC + "sw.js").read().replace("__VERSION__", digest).replace("__FILES__", json.dumps(["./"] + files))
open(APP + "sw.js", "w").write(sw)
open(APP + ".nojekyll", "w").write("")
print("built app", APP, "version", digest)
