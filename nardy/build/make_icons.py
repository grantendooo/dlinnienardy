#!/usr/bin/env python3
"""Рисует иконки: для PWA (www/) и для Android (android-res/mipmap-*)."""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GREEN, GOLD, WINE = (43, 74, 60), (194, 154, 82), (122, 46, 41)
CREAM, CREAM_L, CREAM_R = (242, 234, 211), (60, 47, 23), (196, 182, 140)
DARK, DARK_L, DARK_R = (37, 38, 43), (163, 165, 179), (81, 83, 95)
SS = 4  # суперсэмплинг для гладких краёв


def art(size, scale=1.0, bg="round"):
    """bg: 'round' скруглённый квадрат, 'square' на весь холст, 'none' прозрачный, 'circle' круг."""
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg == "round":
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=GREEN)
    elif bg == "square":
        d.rectangle([0, 0, S, S], fill=GREEN)
    elif bg == "circle":
        d.ellipse([0, 0, S - 1, S - 1], fill=GREEN)

    def P(u, v):  # координаты 0..1 -> пиксели с учётом масштаба вокруг центра
        return (S * (0.5 + (u - 0.5) * scale), S * (0.5 + (v - 0.5) * scale))

    # треугольники доски: сверху вниз и снизу вверх
    n = 4
    for i in range(n):
        x0, x1 = 0.1 + i * 0.2, 0.1 + (i + 1) * 0.2
        col = GOLD if i % 2 == 0 else WINE
        d.polygon([P(x0, 0.12), P(x1, 0.12), P((x0 + x1) / 2, 0.42)], fill=col)
        d.polygon([P(x0, 0.88), P(x1, 0.88), P((x0 + x1) / 2, 0.58)], fill=WINE if i % 2 == 0 else GOLD)

    def checker(cx, cy, r, fill, edge, ring):
        c, rr = P(cx, cy), S * r * scale
        d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr], fill=fill, outline=edge, width=max(2, int(S * 0.012)))
        r2 = rr * 0.58
        d.ellipse([c[0] - r2, c[1] - r2, c[0] + r2, c[1] + r2], outline=ring, width=max(2, int(S * 0.012)))

    checker(0.37, 0.5, 0.155, CREAM, CREAM_L, CREAM_R)
    checker(0.63, 0.5, 0.155, DARK, DARK_L, DARK_R)
    return im.resize((size, size), Image.LANCZOS)


def save(im, *parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)


# PWA
save(art(192), "www", "icon-192.png")
save(art(512), "www", "icon-512.png")
save(art(512, scale=0.78, bg="square"), "www", "icon-maskable-512.png")

# Android: ярлык старого вида, круглый и передний план адаптивной иконки
DENS = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
for name, (legacy, fg) in DENS.items():
    base = ["android-res", f"mipmap-{name}"]
    save(art(legacy), *base, "ic_launcher.png")
    save(art(legacy, scale=0.86, bg="circle"), *base, "ic_launcher_round.png")
    save(art(fg, scale=0.56, bg="none"), *base, "ic_launcher_foreground.png")
print("иконки готовы")
