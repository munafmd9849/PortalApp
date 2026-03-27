import cv2
import numpy as np
import sys

orig_path = sys.argv[1]
out_path = sys.argv[2]

orig = cv2.imread(orig_path, cv2.IMREAD_UNCHANGED)
if len(orig.shape) == 3 and orig.shape[2] == 3:
    orig = cv2.cvtColor(orig, cv2.COLOR_BGR2BGRA)

bgr = orig[:, :, :3]
gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
h, w = bgr.shape[:2]

# 1. Start with everything transparent
final_alpha = np.zeros((h, w), dtype=np.uint8)

# 2. Map detection
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
S = hsv[:, :, 1]
V = hsv[:, :, 2]

# Outer Background is V > 200 and S < 40
bg_color_mask = (V > 200) & (S < 40)

fg_candidates = ~(bg_color_mask)

kernel = np.ones((5,5), np.uint8)
fg_closed = cv2.morphologyEx(fg_candidates.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

bg_flood = np.zeros((h + 2, w + 2), np.uint8)
for pt in [(0,0), (w-1, 0), (0, h-1), (w-1, h-1), (w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]:
    cv2.floodFill(fg_closed, bg_flood, pt, 255)

outer_bg = bg_flood[1:h+1, 1:w+1]

# Map = outer_bg == 0
final_alpha[outer_bg == 0] = 255

# 3. Text and Arrows OUTSIDE the map.
# Enforce absolute transparency for anything beige or white.
# Anything > 180 grayscale is made 100% TRANSPARENT (alpha = 0).
# Anything < 100 grayscale is made 100% SOLID (alpha = 255).
bg_cutoff = 180.0
fg_cutoff = 100.0

alpha_text = 255.0 * (bg_cutoff - gray.astype(np.float32)) / (bg_cutoff - fg_cutoff)
alpha_text = np.clip(alpha_text, 0, 255).astype(np.uint8)

# Apply text alpha ONLY in the outer background
final_alpha[outer_bg == 255] = alpha_text[outer_bg == 255]

final_img = orig.copy()
final_img[:, :, 3] = final_alpha

# Darken text pixels in outer bg to avoid white fringing
text_zone = (outer_bg == 255) & (alpha_text > 0)
final_img[text_zone, 0] = 0
final_img[text_zone, 1] = 0
final_img[text_zone, 2] = 0

cv2.imwrite(out_path, final_img)
print(f"Absolutely transparent image saved to: {out_path}")
