"""Erzeugt die App-Icons im Glas-Look – in einer hellen und einer dunklen Variante.

    python3 tools/make-icons.py

Benötigt Pillow (pip install pillow). Schreibt nach icons/.

Der Ring wird als Glaskörper aufgebaut: weicher Schlagschatten, farbiger
Lichtschein dahinter, halbtransparente Röhre, Kantenlicht oben links,
weichere Gegenkante unten rechts und ein Reflex über der Fläche.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
SS = 4  # Supersampling

PROGRESS = 0.63

THEMES = {
    "light": {
        "suffix": "",
        "bg_top": (252, 253, 255),
        "bg_bottom": (226, 233, 244),
        "from": (44, 90, 245),
        "to": (0, 182, 172),
        "corner_glow": 90,          # Lichtschein oben links auf der Kachel
        "shadow_rgb": (32, 42, 60),
        "shadow_alpha": 0.30,
        "halo": 0.34,               # farbiger Schein hinter dem Bogen
        "tube": 0.34,               # ungefüllter Teil des Rings
        "tube_rgb": (255, 255, 255),
        "groove_rgb": (120, 135, 160),
        "groove": 0.22,             # Kontur der Röhre
        "inner_light": 96,          # Lichtdurchlass in der Farbfläche
        "rim": 1.00,                # Kantenlicht oben links
        "rim_soft": 0.24,
        "sheen": 215,               # Reflex auf dem Glas
        "sheen_damp": 0.55,         # wie stark der Reflex über der Farbe zurückgeht
        "plate": 28,                # Glanz über der gesamten Kachel
    },
    "dark": {
        # Hintergrund bewusst fast flach und neutral wie bei iOS-Systemicons –
        # kein Lichtschein, kein Kachelglanz. Die Plastizität kommt allein vom
        # Ring.
        "suffix": "-dark",
        "bg_top": (36, 36, 39),
        "bg_bottom": (25, 25, 28),
        "from": (104, 134, 255),
        "to": (46, 222, 203),
        "corner_glow": 0,
        "shadow_rgb": (0, 0, 0),
        "shadow_alpha": 0.55,
        "halo": 0.30,
        "tube": 0.13,
        "tube_rgb": (255, 255, 255),
        "groove_rgb": (0, 0, 0),
        "groove": 0.34,
        "inner_light": 58,
        "rim": 0.82,
        "rim_soft": 0.18,
        "sheen": 130,
        "sheen_damp": 0.62,
        "plate": 0,
    },
}


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def band_mask(size, box, width, start=None, end=None):
    """Maske eines Kreisbands (optional nur ein Ausschnitt)."""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if start is None:
        draw.arc(box, 0, 360, fill=255, width=int(width))
    else:
        # in kleinen Segmenten, damit die Rundung sauber bleibt
        steps = 360
        for i in range(steps):
            a0 = start + (end - start) * i / steps
            a1 = start + (end - start) * (i + 1) / steps + 0.5
            draw.arc(box, a0, a1, fill=255, width=int(width))
    return mask


def round_cap(mask, cx, cy, radius, angle_deg, width):
    """Rundes Ende an einem Bogen ergänzen."""
    draw = ImageDraw.Draw(mask)
    ang = math.radians(angle_deg)
    px, py = cx + radius * math.cos(ang), cy + radius * math.sin(ang)
    draw.ellipse([px - width / 2, py - width / 2, px + width / 2, py + width / 2], fill=255)


def gradient_image(size, c_from, c_to):
    """Senkrechter Farbverlauf – der Bogen läuft dadurch von Blau nach Türkis."""
    grad = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(grad)
    for y in range(size):
        t = min(1.0, max(0.0, (y / (size - 1) - 0.18) / 0.62))
        draw.line([(0, y), (size, y)], fill=lerp(c_from, c_to, t))
    return grad


def edge_mask(mask, offset, blur):
    """Kantenlicht: Maske minus verschobene Maske, auf die Maske begrenzt."""
    shifted = ImageChops.offset(mask, offset[0], offset[1])
    edge = ImageChops.subtract(mask, shifted)
    edge = edge.filter(ImageFilter.GaussianBlur(blur))
    return ImageChops.multiply(edge, mask)


def tinted(size, rgb, mask):
    """Farbfläche, die nur dort sichtbar ist, wo die Maske Werte hat."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(rgb + (255,), mask=mask)
    return layer


def make(theme, size, ring_ratio, stroke_ratio, corner_radius=None):
    t = THEMES[theme]
    S = size * SS
    cx = cy = S / 2
    r = S * ring_ratio
    w = S * stroke_ratio
    box = [cx - r, cy - r, cx + r, cy + r]

    # --- Grundfläche ------------------------------------------------------
    img = Image.new("RGB", (S, S))
    draw = ImageDraw.Draw(img)
    for y in range(S):
        draw.line([(0, y), (S, y)], fill=lerp(t["bg_top"], t["bg_bottom"], y / (S - 1)))

    glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(glow).ellipse([-S * 0.35, -S * 0.55, S * 0.85, S * 0.5], fill=t["corner_glow"])
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.09))
    img = Image.composite(Image.new("RGB", (S, S), (255, 255, 255)), img, glow)
    img = img.convert("RGBA")

    # --- Masken -----------------------------------------------------------
    track = band_mask(S, box, w)

    sweep = 360 * PROGRESS
    arc = band_mask(S, box, w, -90, -90 + sweep)
    round_cap(arc, cx, cy, r - w / 2, -90, w)
    round_cap(arc, cx, cy, r - w / 2, -90 + sweep, w)

    # --- Schatten unter dem Glas -----------------------------------------
    shadow = track.filter(ImageFilter.GaussianBlur(S * 0.022))
    shadow = ImageChops.offset(shadow, 0, int(S * 0.014))
    shadow = shadow.point(lambda v: int(v * t["shadow_alpha"]))
    img.alpha_composite(tinted(S, t["shadow_rgb"], shadow))

    # --- Farbiger Schein hinter dem Bogen --------------------------------
    halo = arc.filter(ImageFilter.GaussianBlur(S * 0.045)).point(lambda v: int(v * t["halo"]))
    tint = gradient_image(S, t["from"], t["to"]).convert("RGBA")
    tint.putalpha(halo)
    img.alpha_composite(tint)

    # --- Glaskörper: ungefüllter Teil des Rings ("Röhre") ----------------
    img.alpha_composite(tinted(S, t["tube_rgb"], track.point(lambda v: int(v * t["tube"]))))

    groove = edge_mask(track, (int(S * 0.004), int(S * 0.004)), S * 0.002)
    img.alpha_composite(tinted(S, t["groove_rgb"], groove.point(lambda v: int(v * t["groove"]))))

    # --- Farbige Füllung --------------------------------------------------
    fill = gradient_image(S, t["from"], t["to"]).convert("RGBA")
    fill.putalpha(arc)
    img.alpha_composite(fill)

    # Lichtdurchlass: heller Verlauf von oben in die Farbfläche hinein
    inner = Image.new("L", (S, S), 0)
    inner_draw = ImageDraw.Draw(inner)
    for y in range(S):
        inner_draw.line([(0, y), (S, y)],
                        fill=max(0, int(t["inner_light"] * (1 - y / (S * 0.72)))))
    img.alpha_composite(tinted(S, (255, 255, 255), ImageChops.multiply(inner, arc)))

    # --- Kantenlicht ------------------------------------------------------
    d = max(1, int(S * 0.0065))
    top_edge = edge_mask(track, (d, d), S * 0.0016).point(lambda v: int(v * t["rim"]))
    img.alpha_composite(tinted(S, (255, 255, 255), top_edge))

    soft_edge = edge_mask(track, (d * 3, d * 3), S * 0.007).point(lambda v: int(v * t["rim_soft"]))
    img.alpha_composite(tinted(S, (255, 255, 255), soft_edge))

    counter_edge = edge_mask(track, (-d, -d), S * 0.005).point(lambda v: int(v * 0.50))
    img.alpha_composite(tinted(S, (255, 255, 255), counter_edge))

    # --- Reflex quer über das Glas ---------------------------------------
    sheen = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sheen).ellipse([-S * 0.05, -S * 0.18, S * 0.70, S * 0.30], fill=t["sheen"])
    sheen = sheen.filter(ImageFilter.GaussianBlur(S * 0.022))
    sheen = ImageChops.multiply(sheen, track)
    # über der Farbe nur ein Hauch, sonst wirkt der Bogen ausgewaschen
    sheen = ImageChops.multiply(sheen, arc.point(lambda v: 255 - int(v * t["sheen_damp"])))
    img.alpha_composite(tinted(S, (255, 255, 255), sheen))

    # --- Feiner Glanz auf der gesamten Kachel ----------------------------
    plate = Image.new("L", (S, S), 0)
    ImageDraw.Draw(plate).ellipse([-S * 0.5, -S * 0.75, S * 1.05, S * 0.28], fill=t["plate"])
    plate = plate.filter(ImageFilter.GaussianBlur(S * 0.06))
    img.alpha_composite(tinted(S, (255, 255, 255), plate))

    # --- Ecken ------------------------------------------------------------
    if corner_radius is not None:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, S - 1, S - 1], radius=int(corner_radius * S), fill=255)
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        img = out

    return img.resize((size, size), Image.LANCZOS)


SPECS = [
    # Name, Größe, Ringradius, Strichstärke, Eckenradius (None = randlos)
    ("icon-192", 192, 0.355, 0.106, 0.22),
    ("icon-512", 512, 0.355, 0.106, 0.22),
    ("apple-touch-icon", 180, 0.355, 0.106, None),
    ("icon-maskable-512", 512, 0.262, 0.078, None),
]

for theme in THEMES:
    for name, size, ring, stroke, radius in SPECS:
        image = make(theme, size, ring, stroke, radius)
        path = os.path.join(OUT, name + THEMES[theme]["suffix"] + ".png")
        if radius is None:
            # Randlos und ohne Alphakanal – iOS bzw. Android maskiert selbst.
            base = Image.new("RGB", (size, size), THEMES[theme]["bg_bottom"])
            base.paste(image, (0, 0), image)
            base.save(path)
        else:
            image.save(path)
        print("geschrieben:", os.path.basename(path))
