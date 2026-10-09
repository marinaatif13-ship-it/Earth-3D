# Earth — Our Home Planet (3D website)

A scroll-driven 3D website built from the "Earth: Our Home Planet" presentation.
A real-time 3D Earth (Three.js) stays fixed behind the page and moves, rotates and re-lights as you scroll through 15 sections.

## Project structure

```
earth-3d-website/
├── index.html                 ← all sections / content
├── css/styles.css             ← layout, glass cards, navigation, responsive rules
├── js/
│   ├── scene.js               ← the 3D world (Earth, clouds, atmosphere, Moon, stars, lava/ocean/aurora backdrops)
│   └── main.js                ← scroll → 3D state, nav, counters, drag-to-rotate, card tilt
├── libs/three.min.js          ← Three.js r128 (local copy, no CDN needed)
├── assets/textures/           ← Earth day/night/specular/clouds + Moon textures
└── README.md
```

## How to run

Textures are loaded by WebGL, so the site must be served over HTTP (opening `index.html` by double-click will not load them).

- **VS Code:** right-click `index.html` → *Open with Live Server*
- **Python:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000
- **Deploy:** upload the whole folder to GitHub Pages, Netlify or any static host.

Google Fonts (Poppins, Space Grotesk) load from the internet; the site falls back to system fonts if offline.

## Sections

| # | id | Content | 3D behaviour |
|---|----|---------|--------------|
| 1 | `home` | EARTH — Our Home Planet | Earth right, drag to rotate |
| 2 | `about` | Introduction | Earth left, Africa/Europe |
| 3 | `highlights` | Three key facts | Planet horizon with glowing atmosphere |
| 4 | `facts` | Fact of Earth | Pacific night/day terminator, Moon at the edge |
| 5 | `structure` | Crust / Mantle / Outer & Inner core | Earth at night (city lights) |
| 6 | `tectonics` | Tectonic plates | Animated lava shader backdrop |
| 7 | `atmosphere` | 78 % / 21 % / 1 % | Earth centred, nebula, animated counters |
| 8 | `water` | Water cycle | Animated ocean shader + foam panel |
| 9 | `layers` | 5 atmosphere layers | Horizon view |
| 10 | `climate` | Climate zones & biodiversity | Aurora shader backdrop |
| 11 | `space` | Rotation & revolution | Earth + two planets, crescent lighting |
| 12 | `pollution` | Climate change & pollution | Drifting ice floes |
| 13 | `conservation` | Reduce / Reuse / Recycle | Horizon + rotating recycling symbol |
| 14 | `summary` | Key points | Earth horizon |
| 15 | `thanks` | Thank you | Returns to the hero view |

## Interactions

- **Scroll** — the planet flies between positions, rotation, and lighting.
- **Drag** the planet (sections 1, 2, 4, 11, 15) — rotate with inertia. On touch screens, drag horizontally.
- **Navigation pill** — Home / About / More (menu with every section).
- **Hover** on cards — 3D tilt. **Counters** animate when a section appears.
- Respects `prefers-reduced-motion`. Falls back to a gradient background if WebGL is unavailable.

## Editing the content

Change text directly in `index.html`. Each `<section>` controls the 3D scene through `data-*` attributes:

| attribute | meaning |
|-----------|---------|
| `data-nx`, `data-ny` | Earth centre, from -1 to 1 (fraction of half width / half height). Values beyond ±2 move it off-screen |
| `data-r` | Earth radius as a fraction of half the screen height |
| `data-lon` | Longitude that faces the camera (e.g. `20` = Africa, `-70` = Americas) |
| `data-sun` | Sun direction `x,y,z` — controls the day/night line |
| `data-flare` | `1` shows the lens flare |
| `data-fx` | Backdrop shader: `lava`, `ocean`, `aurora` |
| `data-mx`, `data-my`, `data-mr` | Moon position and size |
| `data-planets`, `data-nebula`, `data-ice`, `data-dim` | Extra effects |

Colours and fonts are CSS variables at the top of `css/styles.css`.

## Testing helper

Add `?settle` to the URL (e.g. `index.html?settle`) to make the 3D scene snap instantly to each section instead of easing — useful for screenshots.

## Credits

- 3D engine: [Three.js](https://threejs.org) r128 (MIT).
- Earth and Moon textures: from the Three.js examples repository (`examples/textures/planets`).
- Slide design: the supplied "Earth – Our Home Planet" presentation.
- Placeholder text from the slides was replaced with short original copy; swap in your own.
