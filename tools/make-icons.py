"""Erzeugt die App-Icons im hellen Glas-Look.

    python3 tools/make-icons.py

Benötigt Pillow (pip install pillow). Schreibt nach icons/.


Der Ring wird als Glaskörper aufgebaut: weicher Schlagschatten, farbiger
Lichtschein dahinter, halbtransparente Füllung, helle Kante oben links,
weichere Kante unten rechts und ein Reflex quer über die Fläche.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
SS = 4  # Supersampling

# Helle Grundfläche (oben nach unten)
BG_TOP = (252, 253, 255)
BG_BOTTOM = (226, 233, 244)

# Markenfarben
FROM = (44, 90, 245)
TO = (0, 182, 172)

PROGRESS = 0.63


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


def make(size, ring_ratio, stroke_ratio, corner_radius=None):
    S = size * SS
    cx = cy = S / 2
    r = S * ring_ratio
    w = S * stroke_ratio
    box = [cx - r, cy - r, cx + r, cy + r]

    # --- Grundfläche ------------------------------------------------------
    img = Image.new("RGB", (S, S))
    draw = ImageDraw.Draw(img)
    for y in range(S):
        draw.line([(0, y), (S, y)], fill=lerp(BG_TOP, BG_BOTTOM, y / (S - 1)))

    # Lichtschein oben links
    glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(glow).ellipse([-S * 0.35, -S * 0.55, S * 0.85, S * 0.5], fill=90)
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
    shadow = shadow.point(lambda v: int(v * 0.30))
    img.alpha_composite(Image.merge("RGBA", (
        Image.new("L", (S, S), 32), Image.new("L", (S, S), 42),
        Image.new("L", (S, S), 60), shadow)))

    # --- Farbiger Schein hinter dem Bogen --------------------------------
    halo = arc.filter(ImageFilter.GaussianBlur(S * 0.045)).point(lambda v: int(v * 0.34))
    tint = gradient_image(S, FROM, TO).convert("RGBA")
    tint.putalpha(halo)
    img.alpha_composite(tint)

    # --- Glaskörper: Rest des Rings (die "Röhre") ------------------------
    tube_alpha = track.point(lambda v: int(v * 0.34))
    tube = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    tube.paste((255, 255, 255, 255), mask=tube_alpha)
    img.alpha_composite(tube)

    # zarte Kontur der Röhre
    outline = edge_mask(track, (int(S * 0.004), int(S * 0.004)), S * 0.002)
    outline = outline.point(lambda v: int(v * 0.22))
    shade = Image.new("RGBA", (S, S), (120, 135, 160, 0))
    shade.putalpha(outline)
    img.alpha_composite(shade)

    # --- Farbige Füllung --------------------------------------------------
    fill = gradient_image(S, FROM, TO).convert("RGBA")
    fill.putalpha(arc)
    img.alpha_composite(fill)

    # Lichtdurchlass: heller Verlauf von oben in die Farbfläche hinein
    inner = Image.new("L", (S, S), 0)
    inner_draw = ImageDraw.Draw(inner)
    for y in range(S):
        inner_draw.line([(0, y), (S, y)], fill=max(0, int(96 * (1 - y / (S * 0.72)))))
    inner = ImageChops.multiply(inner, arc)
    lit = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    lit.paste((255, 255, 255, 255), mask=inner)
    img.alpha_composite(lit)

    # --- Kantenlicht oben links (auf dem gesamten Ring) -------------------
    d = max(1, int(S * 0.0065))
    top_edge = edge_mask(track, (d, d), S * 0.0016)
    highlight = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    highlight.paste((255, 255, 255, 255), mask=top_edge)
    img.alpha_composite(highlight)

    # breiterer, weicher Lichtsaum darunter
    soft_edge = edge_mask(track, (d * 3, d * 3), S * 0.007).point(lambda v: int(v * 0.24))
    soft = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    soft.paste((255, 255, 255, 255), mask=soft_edge)
    img.alpha_composite(soft)

    # weichere Gegenkante unten rechts
    bottom_edge = edge_mask(track, (-d, -d), S * 0.005).point(lambda v: int(v * 0.50))
    counter = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    counter.paste((255, 255, 255, 255), mask=bottom_edge)
    img.alpha_composite(counter)

    # --- Reflex quer über das Glas ---------------------------------------
    sheen = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sheen).ellipse(
        [-S * 0.05, -S * 0.18, S * 0.70, S * 0.30], fill=215)
    sheen = sheen.filter(ImageFilter.GaussianBlur(S * 0.022))
    sheen = ImageChops.multiply(sheen, track)
    # über der Farbe nur ein Hauch, sonst wirkt der Bogen ausgewaschen
    sheen = ImageChops.multiply(sheen, arc.point(lambda v: 255 - int(v * 0.55)))
    gloss = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    gloss.paste((255, 255, 255, 255), mask=sheen)
    img.alpha_composite(gloss)

    # --- Feiner Glanz auf der gesamten Kachel ----------------------------
    plate = Image.new("L", (S, S), 0)
    ImageDraw.Draw(plate).ellipse([-S * 0.5, -S * 0.75, S * 1.05, S * 0.28], fill=28)
    plate = plate.filter(ImageFilter.GaussianBlur(S * 0.06))
    veil = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    veil.paste((255, 255, 255, 255), mask=plate)
    img.alpha_composite(veil)

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
    # name, Größe, Ringradius, Strichstärke, Eckenradius (None = randlos)
    ("icon-192.png", 192, 0.355, 0.106, 0.22),
    ("icon-512.png", 512, 0.355, 0.106, 0.22),
    ("apple-touch-icon.png", 180, 0.355, 0.106, None),
    ("icon-maskable-512.png", 512, 0.262, 0.078, None),
]

for name, size, ring, stroke, radius in SPECS:
    image = make(size, ring, stroke, radius)
    path = os.path.join(OUT, name)
    if radius is None:
        # Randlos und deckend – iOS bzw. Android maskiert selbst.
        base = Image.new("RGB", (size, size), BG_BOTTOM)
        base.paste(image, (0, 0), image)
        base.save(path)
    else:
        image.save(path)
    print("geschrieben:", name, size)
