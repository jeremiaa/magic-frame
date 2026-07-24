#!/usr/bin/env python3
"""Magic Frame 3D weather icon generator.

Eigene Icons in der DNA des alten celestial-Sets (IconScout), aber mit
komplett eigener Geometrie: Wolken aus Kreis-Clustern in 3 Tonschichten
+ Ellipsen-Glanz, zweifarbige 3D-Tropfen, Flammen-Petal-Sonne mit
Doppelscheiben-Körper, orange-rote Comic-Blitze, blaue Strich-Flocken.
viewBox 0 0 512 512 (Original: 5000x5000 — bewusst anderes System).
"""
import math, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons3d")

# CSS-Animationen — leben IM SVG, funktionieren daher auch via <img>.
# Alle Namen mf3d-präfixiert (kollisionsfrei beim Inlinen), Motion subtil,
# prefers-reduced-motion wird respektiert.
ANIM_CSS = (
    "<style>"
    "@keyframes mf3dspin{to{transform:rotate(360deg)}}"
    ".a-spin{animation:mf3dspin 80s linear infinite;transform-box:fill-box;transform-origin:center}"
    "@keyframes mf3dbob{0%,100%{transform:translateX(0)}50%{transform:translateX(9px)}}"
    ".a-bob{animation:mf3dbob 7s ease-in-out infinite}"
    "@keyframes mf3dbob2{0%,100%{transform:translateX(0)}50%{transform:translateX(-11px)}}"
    ".a-bob2{animation:mf3dbob2 9s ease-in-out infinite}"
    "@keyframes mf3dfall{0%{transform:translateY(-12px);opacity:0}22%{opacity:1}70%{opacity:1}100%{transform:translateY(24px);opacity:0}}"
    ".a-fall{animation:mf3dfall 1.7s linear infinite}"
    "@keyframes mf3ddrift{0%{transform:translate(0,-12px) rotate(0deg);opacity:0}25%{opacity:1}70%{opacity:1}100%{transform:translate(7px,22px) rotate(38deg);opacity:0}}"
    ".a-drift{animation:mf3ddrift 3.2s linear infinite;transform-box:fill-box;transform-origin:center}"
    "@keyframes mf3dflash{0%,7%,100%{opacity:1}2%{opacity:.1}4%{opacity:.95}5%{opacity:.5}}"
    ".a-flash{animation:mf3dflash 3.8s linear infinite}"
    "@keyframes mf3dslide{0%,100%{transform:translateX(0)}50%{transform:translateX(14px)}}"
    ".a-slide{animation:mf3dslide 6s ease-in-out infinite}"
    "@keyframes mf3dslider{0%,100%{transform:translateX(0)}50%{transform:translateX(-14px)}}"
    ".a-slide-r{animation:mf3dslider 6s ease-in-out infinite}"
    "@keyframes mf3dtwinkle{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}"
    ".a-twinkle{animation:mf3dtwinkle 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center}"
    "@media (prefers-reduced-motion:reduce){*{animation:none!important}}"
    "</style>"
)
os.makedirs(OUT, exist_ok=True)

# ── Palette (Familie des Originals, eigene Werte) ────────────────────
CLOUD_TOP    = "#f7fafd"   # Wolken-Körper oben
CLOUD_BOT    = "#d9e5f5"   # Wolken-Körper unten
CLOUD_SHADOW = "#c2d3ee"   # Unterschatten im Körper
CLOUD_DEEP   = "#b3c6e8"   # Rücken-Wolke / Tiefe
CLOUD_HI     = "#ffffff"   # Glanz-Ellipsen
DARK_TOP     = "#d3e0f3"   # Overcast-Front oben
DARK_BOT     = "#a9c0e6"   # Overcast-Front unten
DARK_SHADOW  = "#8ca7d8"
RAIN_LIGHT   = "#4a8dfd"
RAIN_DARK    = "#3a70ea"
BOLT_LIGHT   = "#ffc247"
BOLT_MID     = "#ffa413"
BOLT_RED     = "#fb4634"
SUN_TOP      = "#ffd757"
SUN_BOT      = "#ffa514"
SUN_SHADOW   = "#ff9800"
PETAL_TIP    = "#fcb340"
PETAL_MID    = "#f8951f"
PETAL_BASE   = "#f2582b"
MOON_TOP     = "#eef4fc"
MOON_BOT     = "#a7bce6"
MOON_CRATER  = "#8ba6d8"
STAR_GOLD    = "#ffb023"
STAR_GOLD2   = "#fcb646"
FLAKE_BLUE   = "#4a8dfd"
FLAKE_DARK   = "#3a70ea"


def svg(defs, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
            f'<defs>{defs}</defs>{body}</svg>')


def lingrad(gid, c1, c2, x1=0, y1=0, x2=0, y2=1):
    return (f'<linearGradient id="{gid}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>'
            f'</linearGradient>')


# ── Wolke: Kreis-Cluster, eigene Lobe-Anordnung ──────────────────────
def cloud_lobes(prefix=""):
    """Silhouette: Basisrechteck + 3 Lappen (links mittel, mitte gross, rechts klein)."""
    return (f'<rect x="132" y="210" width="248" height="100" rx="46"/>'
            f'<circle cx="172" cy="244" r="64"/>'
            f'<circle cx="258" cy="214" r="88"/>'
            f'<circle cx="342" cy="246" r="60"/>')


def cloud(gid_body, shadow=CLOUD_SHADOW, deep=CLOUD_DEEP, clip_id="cl0",
          transform=None, small_buddy=False, hi=CLOUD_HI):
    """3-Schicht-Wolke + Glanz. gid_body = Gradient-Id fuer den Koerper."""
    t = f' transform="{transform}"' if transform else ''
    parts = [f'<g{t}>', '<g class="a-bob">']
    # Tiefen-Rücken: gleicher Cluster, nach oben-rechts versetzt
    # Original-Rezept (Layer-Analyse der IconScout-Wolken): Schattierung
    # liegt an den KANTEN, nicht im Körper — dünner dunkler Saum, der hinter
    # der oberen Kontur hervorlugt, + dunklere Unterlippe am Boden. Der
    # Körper selbst bleibt sauber (nur Verlauf + Glanz).
    # Variante D (User-Wahl): kein Hintergrund-Schatten. Nur Unterlippe
    # unterm Körper — der Körper selbst bleibt sauber.
    parts.append(f'<g fill="{shadow}" transform="translate(3,13)">{cloud_lobes()}</g>')
    parts.append(f'<g fill="url(#{gid_body})">{cloud_lobes()}</g>')
    # Glanz auf den Kuppen (Mitte-Lappen + linker Lappen)
    parts.append(f'<ellipse cx="234" cy="158" rx="24" ry="8" fill="{hi}" opacity="0.85" transform="rotate(-14 234 158)"/>')
    parts.append(f'<ellipse cx="156" cy="214" rx="12" ry="6" fill="{hi}" opacity="0.65" transform="rotate(-30 156 214)"/>')
    parts.append('</g>')
    if small_buddy:
        parts.append(f'<g class="a-bob2"><g transform="translate(296,262) scale(0.44)">'
                     f'<g fill="{shadow}" transform="translate(3,13)">{cloud_lobes()}</g>'
                     f'<g fill="url(#{gid_body})">{cloud_lobes()}</g>'
                     f'<ellipse cx="234" cy="158" rx="22" ry="8" fill="{hi}" opacity="0.8" transform="rotate(-14 234 158)"/>'
                     f'</g></g>')
    parts.append('</g>')
    return ''.join(parts)


# ── Tropfen: zweifarbig (Schatten + Licht) wie im Original ───────────
def drop(cx, cy, scale=1.0, tilt=-6, delay=0.0):
    d_dark = ('M0,-34 C11,-14 21,2 21,15 A21,21 0 1 1 -21,15 C-21,2 -11,-14 0,-34 Z')
    d_light = ('M-3,-30 C7,-12 15,2 15,14 A17,17 0 1 1 -19,14 C-19,2 -12,-13 -3,-30 Z')
    return (f'<g class="a-fall" style="animation-delay:{delay}s">'
            f'<g transform="translate({cx},{cy}) rotate({tilt}) scale({scale})">'
            f'<path d="{d_dark}" fill="{RAIN_DARK}"/>'
            f'<path d="{d_light}" fill="{RAIN_LIGHT}"/>'
            f'<ellipse cx="-7" cy="8" rx="4.5" ry="7" fill="#ffffff" opacity="0.55"/>'
            f'</g></g>')


# ── Schneeflocke: 6 Arme mit V-Zacken, runde Enden ───────────────────
def flake(cx, cy, r=30, color=FLAKE_BLUE, sw=None, rot=0, delay=0.0):
    sw = sw or max(4.5, r * 0.16)
    arms = []
    for i in range(6):
        a = math.radians(i * 60 + rot)
        x2, y2 = r * math.sin(a), -r * math.cos(a)
        arms.append(f'<line x1="0" y1="0" x2="{x2:.1f}" y2="{y2:.1f}"/>')
        # V-Zacken bei 62% des Arms
        for side in (-28, 28):
            b = math.radians(i * 60 + rot + side)
            px, py = 0.62 * x2, 0.62 * y2
            qx = px + 0.30 * r * math.sin(b)
            qy = py - 0.30 * r * math.cos(b)
            arms.append(f'<line x1="{px:.1f}" y1="{py:.1f}" x2="{qx:.1f}" y2="{qy:.1f}"/>')
    return (f'<g class="a-drift" style="animation-delay:{delay}s">'
            f'<g transform="translate({cx},{cy})" stroke="{color}" '
            f'stroke-width="{sw:.1f}" stroke-linecap="round">{"".join(arms)}'
            f'<circle cx="0" cy="0" r="{sw*0.55:.1f}" fill="{color}" stroke="none"/></g></g>')


# ── Stern (5 Zacken) + Funkel (4 Zacken) ─────────────────────────────
def star_path(cx, cy, r, points=5, inner=0.42, rot=-90):
    pts = []
    for i in range(points * 2):
        rr = r if i % 2 == 0 else r * inner
        a = math.radians(rot + i * 180.0 / points)
        pts.append(f'{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}"/>'


# ── Blitz: eigener Zickzack, zweischichtig ───────────────────────────
def bolt(cx, cy, scale=1.0):
    d = 'M14,0 L-34,84 L2,84 L-22,160 L62,52 L18,52 L48,0 Z'
    return (f'<g class="a-flash"><g transform="translate({cx},{cy}) scale({scale})">'
            f'<path d="{d}" fill="{BOLT_RED}" transform="translate(9,8)"/>'
            f'<path d="{d}" fill="url(#boltg)"/>'
            f'</g></g>')


BOLT_DEFS = lingrad("boltg", BOLT_LIGHT, BOLT_MID)


# ── Sonne: Doppelscheibe + 12 Flammen-Petals ─────────────────────────
def sun(cx, cy, body_r=104, scale=1.0, petals=12, clip="sunclip"):
    g = [f'<g transform="translate({cx},{cy}) scale({scale})">', '<g class="a-spin">']
    for i in range(petals):
        ang = i * (360.0 / petals) + 8
        long = (i % 2 == 0)
        tip = 1.0 if long else 0.80
        d = (f'M-34,-{body_r-6} '
             f'C-40,-{body_r+34*tip:.0f} -6,-{body_r+50*tip:.0f} 14,-{body_r+90*tip:.0f} '
             f'C40,-{body_r+52*tip:.0f} 42,-{body_r+22*tip:.0f} 34,-{body_r-6} '
             f'A{body_r},{body_r} 0 0 0 -34,-{body_r-6} Z')
        g.append(f'<path d="{d}" fill="url(#petalg)" transform="rotate({ang:.1f})"/>')
    g.append('</g>')
    # Ein runder Koerper; Schatten-Sichel INNEN via Clip (Silhouette bleibt rund)
    g.append(f'<clipPath id="{clip}"><circle cx="0" cy="0" r="{body_r}"/></clipPath>')
    g.append(f'<circle cx="0" cy="0" r="{body_r}" fill="{SUN_SHADOW}"/>')
    g.append(f'<circle cx="-22" cy="-22" r="{body_r}" fill="url(#sung)" clip-path="url(#{clip})"/>')
    g.append(f'<ellipse cx="-42" cy="-52" rx="34" ry="13" fill="#ffe793" opacity="0.85" transform="rotate(-24 -42 -52)"/>')
    g.append('</g>')
    return ''.join(g)


SUN_DEFS = (
    lingrad("sung", SUN_TOP, SUN_BOT, 0, 0, 0.55, 1) +
    f'<linearGradient id="petalg" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">'
    f'<stop offset="0.1" stop-color="{PETAL_TIP}"/><stop offset="0.6" stop-color="{PETAL_MID}"/>'
    f'<stop offset="1" stop-color="{PETAL_BASE}"/></linearGradient>'
)


# ── Mond-Sichel mit Kratern (Maske) ──────────────────────────────────
def crescent(cx, cy, r=150, scale=1.0, mask_id="moonmask"):
    bite_dx, bite_dy, bite_r = 78, -62, r * 0.94
    return (
        f'<mask id="{mask_id}">'
        f'<rect x="-300" y="-300" width="1112" height="1112" fill="#000"/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r*scale}" fill="#fff"/>'
        f'<circle cx="{cx + bite_dx*scale}" cy="{cy + bite_dy*scale}" r="{bite_r*scale}" fill="#000"/>'
        f'</mask>'
        f'<g mask="url(#{mask_id})">'
        f'<circle cx="{cx}" cy="{cy}" r="{r*scale}" fill="url(#moong)"/>'
        f'<circle cx="{cx - 55*scale}" cy="{cy - 10*scale}" r="{20*scale}" fill="{MOON_CRATER}" opacity="0.75"/>'
        f'<circle cx="{cx - 22*scale}" cy="{cy + 62*scale}" r="{14*scale}" fill="{MOON_CRATER}" opacity="0.7"/>'
        f'<circle cx="{cx - 72*scale}" cy="{cy + 46*scale}" r="{9*scale}" fill="{MOON_CRATER}" opacity="0.65"/>'
        f'<ellipse cx="{cx - 52*scale}" cy="{cy - 112*scale}" rx="{34*scale}" ry="{11*scale}" '
        f'fill="#ffffff" opacity="0.85" transform="rotate(-32 {cx - 52*scale} {cy - 112*scale})"/>'
        f'</g>'
    )


MOON_DEFS = lingrad("moong", MOON_TOP, MOON_BOT, 0, 0, 0.5, 1)
# Wolken-Verläufe in userSpaceOnUse: EIN Licht über die ganze Wolke.
# objectBoundingBox gab jedem Lappen seinen eigenen Verlauf → der kleine
# rechte Lappen wurde an seiner eigenen Oberkante hell (Licht "aus dem
# Nichts"). Koordinaten = lokaler Lobe-Raum (y 120..330), Transforms
# der Instanzen wirken mit.
def cloud_grad(gid, c1, c2):
    return (f'<linearGradient id="{gid}" x1="0" y1="120" x2="0" y2="330" gradientUnits="userSpaceOnUse">'
            f'<stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>')
CLOUD_DEFS = cloud_grad("cloudg", CLOUD_TOP, CLOUD_BOT)
DARK_DEFS = cloud_grad("darkg", DARK_TOP, DARK_BOT)
MID_DEFS = cloud_grad("midg", "#eaf0f9", "#c9d8ef")
MID_SHADOW = "#b4c7e8"
HAIL_DEFS = ('<radialGradient id="hailg" cx="0.35" cy="0.3" r="0.85">'
             f'<stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#ddeaf8"/>'
             f'<stop offset="1" stop-color="#7fa0d5"/></radialGradient>')


def hailstone(cx, cy, r=20, delay=0.0):
    return (f'<g class="a-fall" style="animation-delay:{delay}s">'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#hailg)"/>'
            f'<ellipse cx="{cx - r*0.32}" cy="{cy - r*0.38}" rx="{r*0.34}" ry="{r*0.2}" '
            f'fill="#ffffff" opacity="0.9" transform="rotate(-30 {cx - r*0.32} {cy - r*0.38})"/></g>')


def fog_lines():
    bars = [
        (120, 356, 200, "#8fabdf"), (338, 356, 78, "#9db6e2"),
        (96, 396, 96, "#9db6e2"), (210, 396, 180, "#8fabdf"),
        (150, 436, 150, "#8fabdf"), (318, 436, 66, "#9db6e2"),
    ]
    out = []
    for i, (x, y, w, c) in enumerate(bars):
        cls = "a-slide" if i % 2 == 0 else "a-slide-r"
        out.append(f'<rect class="{cls}" style="animation-delay:{i * 0.7:.1f}s" '
                   f'x="{x}" y="{y}" width="{w}" height="18" rx="9" fill="{c}"/>')
    return ''.join(out)


ICONS = {}

# 1 · Sonne
ICONS["sun"] = svg(SUN_DEFS, sun(256, 258, scale=1.08))

# 2 · Mond + Sterne (klare Nacht)
ICONS["moon"] = svg(
    MOON_DEFS + f'<g class="a-twinkle" fill="{STAR_GOLD}">{star_path(392, 132, 34)}</g>'
    f'<g class="a-twinkle" style="animation-delay:.9s" fill="{STAR_GOLD2}">{star_path(414, 320, 20, points=4, inner=0.34)}</g>'
    f'<g class="a-twinkle" style="animation-delay:1.6s" fill="{STAR_GOLD2}">{star_path(120, 96, 15, points=4, inner=0.34)}</g>'
    f'<circle class="a-twinkle" style="animation-delay:.5s" cx="452" cy="222" r="7" fill="{STAR_GOLD}"/>'
    f'<circle class="a-twinkle" style="animation-delay:2s" cx="96" cy="196" r="5" fill="{STAR_GOLD2}"/>',
    crescent(222, 266, r=168))
# star defs are placed in defs-slot above; move them into body instead:
ICONS["moon"] = svg(
    MOON_DEFS,
    crescent(222, 266, r=168) +
    f'<g class="a-twinkle" fill="{STAR_GOLD}">{star_path(392, 132, 34)}</g>'
    f'<g class="a-twinkle" style="animation-delay:.9s" fill="{STAR_GOLD2}">{star_path(414, 320, 20, points=4, inner=0.34)}</g>'
    f'<g class="a-twinkle" style="animation-delay:1.6s" fill="{STAR_GOLD2}">{star_path(120, 96, 15, points=4, inner=0.34)}</g>'
    f'<circle class="a-twinkle" style="animation-delay:.5s" cx="452" cy="222" r="7" fill="{STAR_GOLD}"/>'
    f'<circle class="a-twinkle" style="animation-delay:2s" cx="96" cy="196" r="5" fill="{STAR_GOLD2}"/>')

# 2b · Vollmond — Kugel mit Kratern + Sterne
ICONS["full-moon"] = svg(
    MOON_DEFS,
    f'<clipPath id="fmclip"><circle cx="250" cy="252" r="168"/></clipPath>'
    f'<circle cx="250" cy="252" r="168" fill="#9db4de"/>'
    f'<circle cx="228" cy="230" r="168" fill="url(#moong)" clip-path="url(#fmclip)"/>'
    f'<g clip-path="url(#fmclip)">'
    f'<circle cx="188" cy="196" r="34" fill="{MOON_CRATER}" opacity="0.75"/>'
    f'<circle cx="196" cy="204" r="24" fill="#a9bde4" opacity="0.9"/>'
    f'<circle cx="292" cy="288" r="26" fill="{MOON_CRATER}" opacity="0.7"/>'
    f'<circle cx="298" cy="294" r="17" fill="#a9bde4" opacity="0.85"/>'
    f'<circle cx="160" cy="312" r="18" fill="{MOON_CRATER}" opacity="0.65"/>'
    f'<circle cx="310" cy="160" r="14" fill="{MOON_CRATER}" opacity="0.6"/>'
    f'<circle cx="398" cy="270" r="22" fill="{MOON_CRATER}" opacity="0.6"/>'
    f'<circle cx="240" cy="382" r="15" fill="{MOON_CRATER}" opacity="0.55"/>'
    f'</g>'
    f'<ellipse cx="164" cy="132" rx="44" ry="14" fill="#ffffff" opacity="0.85" transform="rotate(-34 164 132)"/>'
    f'<g class="a-twinkle" fill="{STAR_GOLD}">{star_path(448, 116, 28)}</g>'
    f'<g class="a-twinkle" style="animation-delay:1.1s" fill="{STAR_GOLD2}">{star_path(456, 328, 17, points=4, inner=0.34)}</g>'
    f'<circle class="a-twinkle" style="animation-delay:.6s" cx="80" cy="120" r="6" fill="{STAR_GOLD2}"/>'
    f'<circle class="a-twinkle" style="animation-delay:1.8s" cx="62" cy="330" r="5" fill="{STAR_GOLD}"/>')

# 3 · Leicht bewölkt Tag — Sonne + Wolke
ICONS["partly-day"] = svg(
    SUN_DEFS + CLOUD_DEFS,
    sun(170, 152, body_r=92, scale=0.82, petals=12, clip="sunclip2") +
    cloud("cloudg", clip_id="cpd", transform="translate(56,120) scale(0.82)"))

# 4 · Leicht bewölkt Nacht — Sichel + Wolke
ICONS["partly-night"] = svg(
    MOON_DEFS + CLOUD_DEFS,
    crescent(190, 152, r=106, mask_id="mpn") +
    f'<g class="a-twinkle" fill="{STAR_GOLD}">{star_path(388, 96, 22)}</g>'
    f'<circle class="a-twinkle" style="animation-delay:1.3s" cx="438" cy="180" r="6" fill="{STAR_GOLD2}"/>' +
    cloud("cloudg", clip_id="cpn", transform="translate(72,132) scale(0.78)"))

# 4b · Bewölkt Nacht — Mond lugt hinter grosser Wolke hervor
ICONS["cloudy-night"] = svg(
    MOON_DEFS + CLOUD_DEFS,
    crescent(210, 130, r=96, mask_id="mcn") +
    f'<g class="a-twinkle" fill="{STAR_GOLD}">{star_path(414, 88, 20)}</g>'
    f'<circle class="a-twinkle" style="animation-delay:1.4s" cx="452" cy="170" r="5" fill="{STAR_GOLD2}"/>' +
    cloud("cloudg", clip_id="ccn", transform="translate(-8,58) scale(0.98)", small_buddy=True))

# 4c · Bedeckt Nacht — Sichel hinter dunkler Front
ICONS["overcast-night"] = svg(
    MOON_DEFS + CLOUD_DEFS + DARK_DEFS,
    crescent(178, 148, r=86, mask_id="mon") +
    f'<circle class="a-twinkle" cx="420" cy="96" r="6" fill="{STAR_GOLD}"/>'
    f'<g class="a-twinkle" style="animation-delay:1s" fill="{STAR_GOLD2}">{star_path(448, 190, 15, points=4, inner=0.34)}</g>' +
    cloud("darkg", shadow=DARK_SHADOW, deep="#7f9ccf", clip_id="con",
          transform="translate(24,104) scale(0.96)", hi="#eef4fc"))

# 5 · Bewölkt — eine grosse Wolke + Buddy
ICONS["cloudy"] = svg(
    CLOUD_DEFS,
    cloud("cloudg", clip_id="ccl", transform="translate(-8,14) scale(1.04)", small_buddy=True))

# 6 · Bedeckt — dunkle Front-Wolke vor heller Rücken-Wolke
ICONS["overcast"] = svg(
    CLOUD_DEFS + DARK_DEFS,
    f'<g class="a-bob2"><g transform="translate(46,42) scale(0.6)"><g fill="url(#cloudg)">{cloud_lobes()}</g>'
    f'<ellipse cx="234" cy="158" rx="22" ry="8" fill="#ffffff" opacity="0.8" transform="rotate(-14 234 158)"/></g></g>' +
    cloud("darkg", shadow=DARK_SHADOW, deep="#7f9ccf", clip_id="cov",
          transform="translate(24,104) scale(0.96)", hi="#eef4fc"))

# 7 · Nebel — Wolke + Schwaden
ICONS["fog"] = svg(
    CLOUD_DEFS,
    cloud("cloudg", clip_id="cfg", transform="translate(2,-20) scale(0.94)") + fog_lines())

# 8 · Niesel — 3 kleine Tropfen
ICONS["drizzle"] = svg(
    CLOUD_DEFS,
    cloud("cloudg", clip_id="cdz", transform="translate(0,-20) scale(0.94)") +
    drop(176, 336, 0.68) + drop(256, 360, 0.68, delay=0.6) + drop(336, 336, 0.68, delay=1.1))

# 9 · Regen — 5 satte Tropfen in 2 Reihen
ICONS["rain"] = svg(
    MID_DEFS,
    cloud("midg", shadow=MID_SHADOW, clip_id="crn", transform="translate(0,-30) scale(0.94)") +
    drop(168, 336, 0.95) + drop(256, 348, 1.0, delay=0.55) + drop(344, 336, 0.95, delay=1.1) +
    drop(212, 414, 0.8, delay=0.3) + drop(300, 414, 0.8, delay=0.85) + drop(388, 402, 0.72, delay=1.35))

# 10 · Schnee — 3 Flocken
ICONS["snow"] = svg(
    CLOUD_DEFS,
    cloud("cloudg", clip_id="csn", transform="translate(0,-30) scale(0.94)") +
    flake(170, 348, 28, rot=12) + flake(258, 382, 35, color=FLAKE_DARK, rot=-8, delay=1.0) +
    flake(346, 348, 28, rot=24, delay=1.9))

# 11 · Schneeregen — Tropfen + Flocken gemischt
ICONS["sleet"] = svg(
    CLOUD_DEFS,
    cloud("cloudg", clip_id="csl", transform="translate(0,-30) scale(0.94)") +
    drop(166, 344, 0.88) + flake(260, 362, 31, rot=8, delay=0.5) + drop(352, 344, 0.88, delay=0.8) +
    flake(212, 424, 23, color=FLAKE_DARK, rot=-14, delay=1.5))

# 12 · Gewitter — Wolke + Doppel-Blitz
ICONS["thunder"] = svg(
    DARK_DEFS + BOLT_DEFS,
    bolt(248, 252, 1.5) +
    f'<g class="a-flash" style="animation-delay:.25s">'
    f'<path d="M14,0 L-34,84 L2,84 L-22,160 L62,52 L18,52 L48,0 Z" fill="{BOLT_RED}" '
    f'transform="translate(384,332) scale(0.62)"/></g>' +
    cloud("darkg", shadow=DARK_SHADOW, clip_id="cth",
          transform="translate(0,-36) scale(0.94)", hi="#eef4fc"))

# 13 · Hagel — Eiskugeln
ICONS["hail"] = svg(
    CLOUD_DEFS + HAIL_DEFS,
    cloud("cloudg", clip_id="chl", transform="translate(0,-30) scale(0.94)") +
    hailstone(164, 344, 27) + hailstone(256, 370, 31, delay=0.5) + hailstone(348, 344, 27, delay=1.0) +
    hailstone(208, 424, 21, delay=0.75) + hailstone(304, 424, 21, delay=0.25))

GENERIC_IDS = ["cloudg", "darkg", "midg", "boltg", "sung", "petalg", "moong", "hailg", "sunclip2", "sunclip", "fmclip",
               "moonmask", "mpn", "mcn", "mon", "ccn", "con", "cpd", "cpn", "ccl", "cov", "cfg", "cdz",
               "crn", "csn", "csl", "cth", "chl", "cl0"]
S_OUT = os.path.join(OUT, "static")
A_OUT = os.path.join(OUT, "animated")
os.makedirs(S_OUT, exist_ok=True)
os.makedirs(A_OUT, exist_ok=True)
for name, code in ICONS.items():
    for gid in GENERIC_IDS:
        code = code.replace(f'id="{gid}"', f'id="mf3d-{name}-{gid}"')
        code = code.replace(f'url(#{gid})', f'url(#mf3d-{name}-{gid})')
    with open(os.path.join(S_OUT, f"{name}.svg"), "w") as f:
        f.write(code)
    with open(os.path.join(A_OUT, f"{name}.svg"), "w") as f:
        f.write(code.replace("<defs>", "<defs>" + ANIM_CSS, 1))
print(f"wrote {len(ICONS)} icons to {OUT}")
