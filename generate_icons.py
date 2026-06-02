"""
Recreates the WT logo (assets/logo.svg) as PNG icons at all Android densities.
Design: black rounded square with WT letters cut out (white letters visible).
"""
from PIL import Image, ImageDraw
import math, os

def round_rect_mask(draw, size, radius, color):
    """Draw a filled rounded rectangle."""
    x0, y0, x1, y1 = 0, 0, size, size
    r = radius
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=color)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=color)
    draw.ellipse([x0, y0, x0 + 2*r, y0 + 2*r], fill=color)
    draw.ellipse([x1 - 2*r, y0, x1, y0 + 2*r], fill=color)
    draw.ellipse([x0, y1 - 2*r, x0 + 2*r, y1], fill=color)
    draw.ellipse([x1 - 2*r, y1 - 2*r, x1, y1], fill=color)

def scale_poly(pts, factor):
    return [(x * factor, y * factor) for x, y in pts]

# Original SVG polygons (in 512x512 coordinate space)
# These are the WT letter cutouts
WT_POLYS_512 = [
    # W left stroke (down-right)
    [(90,170), (130,170), (200,335), (160,335)],
    # W left-mid stroke (up-right)
    [(160,335), (200,335), (270,170), (230,170)],
    # W right-mid stroke (down-right)
    [(230,170), (270,170), (340,335), (300,335)],
    # T vertical stroke (up-right)
    [(300,335), (340,335), (410,170), (370,170)],
    # T horizontal bar (top)
    [(327,170), (453,170), (438.2,205), (312.2,205)],
]

def draw_wt_icon(size, bg=(10, 10, 10, 255), fg=(255, 255, 255, 255)):
    """
    Draw the WT logo: dark rounded square with white WT letters.
    bg = background color (behind the rounded square)
    fg = color of the WT letters
    """
    scale = 4  # render at 4x for anti-aliasing
    s = size * scale
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))  # transparent base
    draw = ImageDraw.Draw(img)

    factor = s / 512.0
    radius = int(128 * factor)

    # Draw rounded square in fg color (letter color = cutout fill)
    round_rect_mask(draw, s, radius, fg)

    # Draw WT cutouts in background color (or transparent)
    for poly in WT_POLYS_512:
        scaled = scale_poly(poly, factor)
        draw.polygon(scaled, fill=bg)

    # Now composite over a solid background
    bg_img = Image.new('RGBA', (s, s), bg)
    result = Image.alpha_composite(bg_img, img)

    return result.resize((size, size), Image.LANCZOS)

base = r"c:\Users\omer\Desktop\programming\premium-work-time-tracker\android\app\src\main\res"
sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

for folder, sz in sizes.items():
    d = os.path.join(base, folder)
    os.makedirs(d, exist_ok=True)
    icon = draw_wt_icon(sz)
    icon.save(os.path.join(d, 'ic_launcher.png'))
    icon.save(os.path.join(d, 'ic_launcher_round.png'))
    print(f'created {folder}: {sz}x{sz}')

print('Done!')
