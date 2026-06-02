from PIL import Image, ImageDraw
import math, os

def draw_clock_icon(size, bg=(10, 10, 10, 255), fg=(255, 255, 255, 255)):
    scale = 4
    s = size * scale
    cx = cy = s // 2
    img = Image.new('RGBA', (s, s), bg)
    draw = ImageDraw.Draw(img)
    r = int(s * 0.38)
    ring_w = max(int(s * 0.04), 4)
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=fg, width=ring_w)
    tick_out = r - ring_w // 2
    tick_in = tick_out - int(s * 0.055)
    tick_w = max(int(s * 0.026), 3)
    for deg in [0, 90, 180, 270]:
        rad = math.radians(deg - 90)
        x1 = cx + tick_out * math.cos(rad)
        y1 = cy + tick_out * math.sin(rad)
        x2 = cx + tick_in * math.cos(rad)
        y2 = cy + tick_in * math.sin(rad)
        draw.line([(x1,y1),(x2,y2)], fill=fg, width=tick_w)
    h_len = r * 0.52
    h_w = max(int(s * 0.046), 4)
    h_rad = math.radians(300 - 90)
    draw.line([(cx,cy),(cx+h_len*math.cos(h_rad), cy+h_len*math.sin(h_rad))], fill=fg, width=h_w)
    m_len = r * 0.70
    m_w = max(int(s * 0.034), 3)
    m_rad = math.radians(60 - 90)
    draw.line([(cx,cy),(cx+m_len*math.cos(m_rad), cy+m_len*math.sin(m_rad))], fill=fg, width=m_w)
    dot_r = int(s * 0.038)
    draw.ellipse([cx-dot_r, cy-dot_r, cx+dot_r, cy+dot_r], fill=fg)
    return img.resize((size, size), Image.LANCZOS)

base = r"c:\Users\omer\Desktop\programming\premium-work-time-tracker\android\app\src\main\res"
sizes = {'mipmap-mdpi':48,'mipmap-hdpi':72,'mipmap-xhdpi':96,'mipmap-xxhdpi':144,'mipmap-xxxhdpi':192}
for folder, sz in sizes.items():
    d = os.path.join(base, folder)
    os.makedirs(d, exist_ok=True)
    icon = draw_clock_icon(sz)
    icon.save(os.path.join(d, 'ic_launcher.png'))
    icon.save(os.path.join(d, 'ic_launcher_round.png'))
    print(f'created {folder}: {sz}x{sz}')
print('Done!')
