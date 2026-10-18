#!/usr/bin/env python3
"""Extract creative A/B from index.html into render-only pages (scale 1, hi-res images),
render them with headless Chrome at exactly 5244x2950, strip alpha, and write preview JPEGs
back into img/ for the in-context mockups. Run from anywhere; paths are absolute."""
import os, re, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
src = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
css = re.search(r'<style id="cre-css">(.*?)</style>', src, re.S).group(1)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', src).group(0)

def page(frag):
    frag = frag.replace("img/", "../img-hi/")
    return f"""<!doctype html><html><head><meta charset="utf-8">{fonts}
<style>html,body{{margin:0;padding:0;width:5244px;height:2950px;overflow:hidden;background:#38624c}}{css}</style></head>
<body>{frag}</body></html>"""

os.makedirs(os.path.join(HERE, "render"), exist_ok=True)
for v in ("A", "B"):
    frag = re.search(rf"<!--CRE-{v}-START-->(.*?)<!--CRE-{v}-END-->", src, re.S).group(1)
    html = os.path.join(HERE, "render", f"{v}.html")
    open(html, "w", encoding="utf-8").write(page(frag))
    raw = os.path.join(HERE, "render", f"{v}-raw.png")
    final = os.path.join(HERE, "..", "export", f"creative-{v}-5244x2950.png")  # upload-ready files live in ../export
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--virtual-time-budget=10000", "--window-size=5244,2950", f"--screenshot={raw}", "file://" + html],
                   check=True, capture_output=True)
    im = Image.open(raw).convert("RGB")
    if im.size != (5244, 2950):
        print("WARN size", v, im.size, file=sys.stderr)
        im = im.crop((0, 0, 5244, 2950))
    im.save(final, optimize=True)
    prev = im.resize((1600, 900), Image.LANCZOS)
    prev.save(os.path.join(HERE, "img", f"creative-{v}.jpg"), quality=82, optimize=True, progressive=True)
    print(v, final, im.size)
