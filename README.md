# Pip's Learning Garden

Five talking learning games for young children, in one app: Animal Meadow (counting to 20, sums, letters, shapes,
patterns), Arrow Farm (directions and animal sounds), Honey Keys (finding letters and typing her name), Reading Nest
(first sounds, building and reading words) and Snail Trails (tracing letters, numbers and her name).

It is a web app that installs on an Android phone like a normal app: home-screen icon, full screen, landscape,
and it works offline after the first visit. Progress, stickers and settings stay on the device.

## Install on the phone
1. Open the site link in **Chrome** on the phone.
2. Tap the **⋮** menu, then **Install app** (or **Add to Home screen**).
3. Open **Pip's Garden** from the home screen. Turn the phone sideways.

## Grown-ups corner
On the garden screen, press and hold **Grown-ups** for about 2 seconds: progress, her name, Pip's voice,
which activities appear, and difficulty levels.

## Files
`index.html` is the whole app. `sw.js` keeps it working offline, `manifest.webmanifest` makes it installable,
and `fonts/` and `icons/` hold the fonts and the app icon. Hosted with GitHub Pages from the main branch.

## Changing the games
The app is built from `source/`: the five games (`animal-meadow`, `arrow-farm`, `honey-keys`, `reading-nest`,
`snail-trails`; Snail Trails is written directly for the shared code and is included as it is)
and the shared garden, voice and progress code in `source/learning-garden/src/`. After editing, rebuild from the
repository folder with:

    PIP_SOURCE=source/ PIP_APP=./ python3 source/learning-garden/src/build.py

That rewrites `index.html` and `sw.js` (with a new version number, so installed phones pick up the update).
