#!/usr/bin/env python3
"""Generate Soli's app icon from measured geometry.

Outputs (all derived, never hand-edit):
  assets/app.icon/                      Icon Composer bundle (iOS 26+ Liquid Glass, Expo `ios.icon`)
    icon.json + Assets/{spade,stem,stripe-red,stripe-navy}.svg
  assets/images/icon.png                flattened 1024 RGB (root `icon`: store, splash, iOS < 26 fallback)
  assets/images/adaptive-icon.png       Android adaptive foreground (RGBA, content inside the 61% safe zone)
  assets/images/adaptive-icon-monochrome.png  Android themed icon (white silhouette, alpha = intensity)

Run: python3 scripts/build-app-icon.py   (needs Pillow + Google Chrome for SVG rasterizing)

Why layers (2026-10-17, see docs/product/app-store-creative-assets/): iOS 26 renders
.icon bundles as stacked glass. Rules learned while building this:
  - The green background is the document `fill`, NOT a layer: a full-canvas <rect> in a
    layer SVG kills the glass effect and the per-appearance background.
  - Layer SVGs are paths only (no filters/masks/text/transforms) so Icon Composer and
    actool parse them; rotation is baked into the coordinates.
  - Explicit `tinted` fills (white / grays) per layer: automatic mono from this palette
    comes out muddy and the black stem would vanish.
  - The stem is its own layer so it can get a darker tinted gray than the spade (keeps
    the silhouette readable in Tinted / Android themed mode).

Geometry was measured from the original (2025-11) icon.png: spade tip (515.5, 246),
lobes r=104 centred (415.5|615.5, 574), stripes 584x52.4 at -43.62 deg, stem base 203 wide.
Refinements vs the original (deliberately subtle, not a rebrand): rounded spade tip,
rounded stripe ends, neck of the stem 30 px instead of 22 with a rounded apex that
overlaps the lobe cusp (no hairline gap under glass), softly rounded stem base corners.
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / 'assets' / 'app.icon'
IMAGES_DIR = ROOT / 'assets' / 'images'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

SIZE = 1024
# Brand colors (also listed in the creative-assets plan doc).
GREEN = '#416F57'
GREEN_DARK = '#2E5542'  # dark-appearance background: same felt, one step darker
GOLD = '#DBBD67'
RED = '#C0594A'
NAVY = '#264C6E'
STEM = '#111111'  # near-black: pure black flattens the glass specular

# --- spade -------------------------------------------------------------------
CX = 515.5  # the original art is 3.5 px left of the canvas centre; kept on purpose
TIP_Y = 246.0
# Each lobe is egg-shaped: a bigger "shoulder" circle and a tighter bottom circle that
# is internally tangent to it (fitted to the original edge; one circle was 3-4 px thin
# at the shoulders). Offsets are relative to CX; the left lobe is mirrored.
LOBE_R = 104.0  # bottom circle, also forms the cusp above the stem
LOBE_C = (100.0, 574.0)
SHOULDER_C = (87.3, 569.5)
SHOULDER_R = LOBE_R + math.hypot(LOBE_C[0] - SHOULDER_C[0], LOBE_C[1] - SHOULDER_C[1])
TIP_RADIUS = 12.0  # refinement: rounded tip (original was a sharp point)

# --- stem --------------------------------------------------------------------
STEM_APEX_Y = 597.0  # original 605 (exactly the lobe cusp at 602.6); 6 px overlap
STEM_APEX_SLOPE = 0.53  # half-width growth per px below the apex (measured cone)
STEM_APEX_RADIUS = 5.0
STEM_NECK = 15.0  # half-width; original ~11
STEM_NECK_END_Y = 636.0
STEM_BASE_HALF = 101.5  # base 203 px wide
STEM_BASE_Y = 750.0
# Flare cubic handles (fractions of the neck->base box), least-squares fitted to the
# measured profile. The flare meets the base at ~22 deg, not tangentially, so the base
# corners are left as they are (a fillet would be invisible on such an obtuse corner).
STEM_FLARE = (0.31, 0.57, 0.21)

# --- stripes -----------------------------------------------------------------
STRIPE_ANGLE_DEG = -43.62
STRIPE_HALF_LEN = 292.0
STRIPE_HALF_W = 26.2
STRIPE_RADIUS = 10.0  # refinement: rounded ends (original corners were sharp)
RED_CENTER = (461.9, 455.7)
NAVY_CENTER = (506.6, 504.9)

# --- glyph size per platform (2026-10-17, round 5 of the creative-assets plan) -------
# The glyph is not round: its farthest points are the stripe corners, 311.6 px from the
# canvas centre at scale 1 (axis extent 280 px); the glyph bbox is 49% of the canvas.
#
# iOS: 1.15 — Karim liked 1.15x on 2026-10-17. Apple's HIG gives no number ("keep primary
# content centered", "you don't need to fill the entire icon canvas"); Apple's own iOS 26
# icons fill ~65-85% of the tile width (measured on the simulator: Messages 0.77, Safari
# 0.81, Files 0.81, Fitness 0.84), so 0.57 at 1.15x is still conservative. Farthest point
# 358 px from centre = 190 px from the edge: far from the ~22% corner radius and the glass
# rim. Applied as Icon Composer's per-layer `position.scale` (artwork stays 1:1 in the
# SVGs, the inspector shows the real value) and as the same affine scale in the flat PNG.
IOS_GLYPH_SCALE = 1.15
# Android: 0.85 — adaptive icon = 108 dp canvas, inner 72 dp visible, 66 dp safe zone
# (AdaptiveIconDrawable SAFEZONE_SCALE = 66/72) => safe radius 33 dp = 313 px on this
# canvas, visible-circle radius 36 dp = 341 px. Keylines inside the safe zone (Butcher,
# Google Design): circle 52 dp, square 44 dp, rectangle 52x36 dp; the logo must be >= 48 dp.
# At 0.85 the stripes are 52 dp long (= the keyline long side), the glyph bbox is 50 dp
# (>= 48), and the farthest stripe corner sits at 265 px = 28 dp: 5 dp inside the safe
# zone, 8 dp inside the visible circle (0.9 left only 3.4 dp). It was once too large on
# Android (7056f74: the opaque square icon.png was the foreground, so circular launchers
# cut the stripes; the fix padded it). The themed <monochrome> layer uses the same scale:
# Launcher3 draws it with the foreground's 108->72 mapping (MonoIconThemeController.
# ClippedMonoDrawable, inset -getExtraInsetFraction()), there is no separate mono inset.
ANDROID_FOREGROUND_SCALE = 0.85
# Tinted (iOS) / themed (Android) intensities per layer: spade brightest, stem darkest.
MONO = {'spade': 1.0, 'stem': 0.45, 'stripe-red': 0.75, 'stripe-navy': 0.55}


def f(v: float) -> str:
    return f'{v:.2f}'.rstrip('0').rstrip('.')


def pt(p) -> str:
    return f'{f(p[0])} {f(p[1])}'


def tangent_point(center, r, external, pick):
    """Tangent point from `external` to the circle; `pick` chooses between the two."""
    dx, dy = external[0] - center[0], external[1] - center[1]
    d = math.hypot(dx, dy)
    base = math.atan2(dy, dx)
    beta = math.acos(r / d)
    cands = [(center[0] + r * math.cos(base + s * beta), center[1] + r * math.sin(base + s * beta)) for s in (-1, 1)]
    return pick(cands)


def spade_path() -> str:
    tip = (CX, TIP_Y)
    cl = (CX - LOBE_C[0], LOBE_C[1])
    cr = (CX + LOBE_C[0], LOBE_C[1])
    sl = (CX - SHOULDER_C[0], SHOULDER_C[1])
    sr = (CX + SHOULDER_C[0], SHOULDER_C[1])
    pl = tangent_point(sl, SHOULDER_R, tip, lambda c: min(c, key=lambda p: p[0]))
    pr = tangent_point(sr, SHOULDER_R, tip, lambda c: max(c, key=lambda p: p[0]))
    # shoulder circle -> bottom circle hand-over: the internal tangency point
    d = math.hypot(cr[0] - sr[0], cr[1] - sr[1])
    jr = (sr[0] + SHOULDER_R * (cr[0] - sr[0]) / d, sr[1] + SHOULDER_R * (cr[1] - sr[1]) / d)
    jl = (2 * CX - jr[0], jr[1])
    # fillet the tip: half-angle between the two sides
    alpha = math.atan2(tip[0] - pl[0], pl[1] - tip[1])
    along = TIP_RADIUS / math.tan(alpha)
    ul = ((pl[0] - tip[0]) / math.hypot(pl[0] - tip[0], pl[1] - tip[1]), (pl[1] - tip[1]) / math.hypot(pl[0] - tip[0], pl[1] - tip[1]))
    tl = (tip[0] + ul[0] * along, tip[1] + ul[1] * along)
    tr = (2 * CX - tl[0], tl[1])
    cusp = (CX, LOBE_C[1] + math.sqrt(LOBE_R ** 2 - LOBE_C[0] ** 2))
    return ' '.join([
        f'M{pt(tl)}',
        f'A{f(TIP_RADIUS)} {f(TIP_RADIUS)} 0 0 1 {pt(tr)}',
        f'L{pt(pr)}',
        f'A{f(SHOULDER_R)} {f(SHOULDER_R)} 0 0 1 {pt(jr)}',
        f'A{f(LOBE_R)} {f(LOBE_R)} 0 0 1 {pt(cusp)}',
        f'A{f(LOBE_R)} {f(LOBE_R)} 0 0 1 {pt(jl)}',
        f'A{f(SHOULDER_R)} {f(SHOULDER_R)} 0 0 1 {pt(pl)}',
        'Z',
    ])


def stem_path() -> str:
    # apex cone with a small round cap, straight neck, concave flare, rounded flat base
    alpha = math.atan(STEM_APEX_SLOPE)  # half-angle of the cone
    cap_c_y = STEM_APEX_Y + STEM_APEX_RADIUS / math.sin(alpha)
    cap_tangent_y = cap_c_y - STEM_APEX_RADIUS * math.sin(alpha)
    cap_tangent_x = STEM_APEX_RADIUS * math.cos(alpha)
    neck_start_y = STEM_APEX_Y + STEM_NECK / STEM_APEX_SLOPE
    # flare: cubic from the neck (vertical tangent) down to the base corner
    a, b, c = STEM_FLARE
    p0 = (CX - STEM_NECK, STEM_NECK_END_Y)
    p3 = (CX - STEM_BASE_HALF, STEM_BASE_Y)
    p1 = (p0[0], p0[1] + a * (p3[1] - p0[1]))
    p2 = (p3[0] + b * (p0[0] - p3[0]), p3[1] - c * (p3[1] - p0[1]))
    left = [
        f'M{pt((CX - cap_tangent_x, cap_tangent_y))}',
        f'L{pt((CX - STEM_NECK, neck_start_y))}',
        f'L{pt(p0)}',
        f'C{pt(p1)} {pt(p2)} {pt(p3)}',
    ]
    mirror = lambda p: (2 * CX - p[0], p[1])
    right = [
        f'L{pt(mirror(p3))}',
        f'C{pt(mirror(p2))} {pt(mirror(p1))} {pt(mirror(p0))}',
        f'L{pt((CX + STEM_NECK, neck_start_y))}',
        f'L{pt((CX + cap_tangent_x, cap_tangent_y))}',
        f'A{f(STEM_APEX_RADIUS)} {f(STEM_APEX_RADIUS)} 0 0 0 {pt((CX - cap_tangent_x, cap_tangent_y))}',
        'Z',
    ]
    return ' '.join(left + right)


def stripe_path(center) -> str:
    th = math.radians(STRIPE_ANGLE_DEG)
    c, s = math.cos(th), math.sin(th)

    def w(u, v):  # local (along, across) -> canvas; proper rotation keeps sweep flags valid
        return (center[0] + u * c - v * s, center[1] + u * s + v * c)

    L, W, r = STRIPE_HALF_LEN, STRIPE_HALF_W, STRIPE_RADIUS
    arc = f'A{f(r)} {f(r)} 0 0 1 '
    return ' '.join([
        f'M{pt(w(-L + r, -W))}', f'L{pt(w(L - r, -W))}', arc + pt(w(L, -W + r)),
        f'L{pt(w(L, W - r))}', arc + pt(w(L - r, W)),
        f'L{pt(w(-L + r, W))}', arc + pt(w(-L, W - r)),
        f'L{pt(w(-L, -W + r))}', arc + pt(w(-L + r, -W)), 'Z',
    ])


LAYERS = [  # back to front
    ('spade', GOLD, spade_path),
    ('stem', STEM, stem_path),
    ('stripe-red', RED, lambda: stripe_path(RED_CENTER)),
    ('stripe-navy', NAVY, lambda: stripe_path(NAVY_CENTER)),
]


def svg(path: str, fill: str, opacity: float = 1.0) -> str:
    op = '' if opacity == 1.0 else f' fill-opacity="{opacity}"'
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">\n'
        f'<!-- generated by scripts/build-app-icon.py; paths only, no background -->\n'
        f'<path fill="{fill}"{op} d="{path}"/>\n</svg>\n'
    )


def srgb(hex_color: str, alpha: float = 1.0) -> str:
    r, g, b = (int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    return f'extended-srgb:{r:.5f},{g:.5f},{b:.5f},{alpha:.5f}'


def gray(v: float) -> str:
    return f'extended-gray:{v:.3f},1.000'


def layer_json(name: str, mono: float) -> dict:
    return {
        'name': name,
        'image-name': f'{name}.svg',
        'glass': True,
        'hidden': False,
        # Icon Composer scales a layer about the centre of its 1024 image (= canvas
        # centre, verified against actool's flattened fallback), so per-layer scale ==
        # scaling the whole composition, same as compose() does for the flat PNG.
        'position': {'scale': IOS_GLYPH_SCALE, 'translation-in-points': [0, 0]},
        'fill-specializations': [
            {'value': 'automatic'},
            {'appearance': 'tinted', 'value': {'solid': gray(mono)}},
        ],
    }


def icon_json() -> dict:
    return {
        'fill-specializations': [
            {'value': {'solid': srgb(GREEN)}},
            {'appearance': 'dark', 'value': {'solid': srgb(GREEN_DARK)}},
        ],
        # NOTE: icon.json lists groups and layers FRONT-TO-BACK (first = topmost), like
        # Icon Composer's sidebar. With the spade group first, actool's flattened
        # fallback drew the stripes behind the spade.
        'groups': [
            {
                'name': 'stripes',
                'lighting': 'combined',
                'specular': True,
                'blur-material': None,
                'shadow': {'kind': 'layer-color', 'opacity': 0.5},
                'translucency': {'enabled': True, 'value': 0.2},
                'layers': [layer_json('stripe-navy', MONO['stripe-navy']), layer_json('stripe-red', MONO['stripe-red'])],
            },
            {
                'name': 'spade',
                'lighting': 'combined',
                'specular': True,
                'blur-material': None,
                'shadow': {'kind': 'neutral', 'opacity': 0.5},
                'translucency': {'enabled': False, 'value': 0.4},
                'layers': [layer_json('stem', MONO['stem']), layer_json('spade', MONO['spade'])],
            },
        ],
        'supported-platforms': {'squares': 'shared', 'circles': []},
    }


def render_html(html: str, out: Path, transparent: bool) -> None:
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as fh:
        fh.write(html)
        src = Path(fh.name)
    args = [CHROME, '--headless=new', f'--screenshot={out}', f'--window-size={SIZE},{SIZE}',
            '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', '--disable-gpu']
    if transparent:
        args.append('--default-background-color=00000000')
    # Headless Chrome sometimes exits 2 AFTER writing the screenshot ("Teardown watchdog
    # expired", seen 2026-10-17), so success is judged by the output file, not the rc.
    for attempt in range(3):
        out.unlink(missing_ok=True)
        subprocess.run(args + [src.as_uri()], capture_output=True)
        if out.exists():
            break
    else:
        raise RuntimeError(f'Chrome produced no screenshot for {out}')
    src.unlink()


def compose(layers, background: str | None, scale: float = 1.0, mono: bool = False) -> str:
    bg = f'background:{background};' if background else ''
    inner = ''.join(
        f'<path fill="{"#FFFFFF" if mono else fill}"{f" fill-opacity=\"{MONO[name]}\"" if mono else ""} d="{path()}"/>'
        for name, fill, path in layers
    )
    # mono: later layers REPLACE earlier pixels (alpha = intensity), no stacking
    style = ' style="mix-blend-mode:normal"'
    return (
        f'<!doctype html><html><head><style>html,body{{margin:0;{bg}width:{SIZE}px;height:{SIZE}px;overflow:hidden}}</style></head>'
        f'<body><svg width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}" xmlns="http://www.w3.org/2000/svg">'
        f'<g transform="translate({SIZE / 2} {SIZE / 2}) scale({scale}) translate({-SIZE / 2} {-SIZE / 2})"{style}>{inner}</g></svg></body></html>'
    )


def mono_png(out: Path) -> None:
    """White silhouette where alpha = per-layer intensity; a later layer overwrites an
    earlier one (so the stripes read as lighter bands across the spade, not as a sum)."""
    masks = []
    for name, fill, path in LAYERS:
        tmp = out.with_name(f'.{name}-mask.png')
        render_html(compose([(name, fill, path)], None, ANDROID_FOREGROUND_SCALE, mono=True), tmp, transparent=True)
        masks.append((MONO[name], Image.open(tmp).convert('RGBA').split()[3]))
        tmp.unlink()
    alpha = Image.new('L', (SIZE, SIZE), 0)
    for intensity, coverage in masks:
        layer_alpha = coverage.point(lambda a, k=intensity: round(a * k))
        # replace where this layer covers, keep elsewhere (coverage as the blend weight)
        alpha = Image.composite(layer_alpha, alpha, coverage)
    Image.merge('RGBA', [Image.new('L', (SIZE, SIZE), 255)] * 3 + [alpha]).save(out, optimize=True)


def main() -> None:
    (ICON_DIR / 'Assets').mkdir(parents=True, exist_ok=True)
    for name, fill, path in LAYERS:
        (ICON_DIR / 'Assets' / f'{name}.svg').write_text(svg(path(), fill))
    (ICON_DIR / 'icon.json').write_text(json.dumps(icon_json(), indent=2) + '\n')

    flat = IMAGES_DIR / 'icon.png'
    render_html(compose(LAYERS, GREEN, IOS_GLYPH_SCALE), flat, transparent=False)
    Image.open(flat).convert('RGB').save(flat, optimize=True)  # no alpha for the store

    fg = IMAGES_DIR / 'adaptive-icon.png'
    render_html(compose(LAYERS, None, ANDROID_FOREGROUND_SCALE), fg, transparent=True)
    Image.open(fg).convert('RGBA').save(fg, optimize=True)

    mono_png(IMAGES_DIR / 'adaptive-icon-monochrome.png')
    print('wrote', ICON_DIR, flat, fg, IMAGES_DIR / 'adaptive-icon-monochrome.png')


if __name__ == '__main__':
    sys.exit(main())
