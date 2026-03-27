import cv2
import sys
import numpy as np

orig_path = sys.argv[1]
rembg_path = sys.argv[2]
out_path = sys.argv[3]

orig = cv2.imread(orig_path, cv2.IMREAD_UNCHANGED)
rembg = cv2.imread(rembg_path, cv2.IMREAD_UNCHANGED)

if len(orig.shape) == 3 and orig.shape[2] == 3:
    orig = cv2.cvtColor(orig, cv2.COLOR_BGR2BGRA)

bgr = orig[:,:,:3]
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
S = hsv[:,:,1]
V = hsv[:,:,2]

h, w = bgr.shape[:2]

# 1. AI base mask and strict hole filling for the central map
_, thresh_rembg = cv2.threshold(rembg[:,:,3], 10, 255, cv2.THRESH_BINARY)
bg_flood0 = np.zeros((h + 2, w + 2), np.uint8)
cv2.floodFill(thresh_rembg.copy(), bg_flood0, (0,0), 255)
holes = ((bg_flood0[1:h+1, 1:w+1] == 0) & (thresh_rembg == 0)).astype(np.uint8) * 255
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(holes, connectivity=8)
for i in range(1, num_labels):
    if stats[i, cv2.CC_STAT_AREA] > 1000: 
        thresh_rembg[labels == i] = 255
solid_map_mask = thresh_rembg

# 2. Safe Map Zone (opening removes the thin arrows that got falsely glued to the map)
kernel_open = np.ones((15,15), np.uint8)
kernel_dilate = np.ones((7,7), np.uint8)
map_only = cv2.morphologyEx(solid_map_mask, cv2.MORPH_OPEN, kernel_open)
safe_map = cv2.dilate(map_only, kernel_dilate, iterations=1)

# 3. Exact Color Identification constraints for Beige Background
bg_color_mask = ((V > 180) & (S < 45)).astype(np.uint8) * 255

img_to_flood = np.zeros((h, w), np.uint8)
img_to_flood[bg_color_mask == 255] = 255

bg_flood = np.zeros((h+2, w+2), np.uint8)
pts = [(0,0), (w-1, 0), (0, h-1), (w-1, h-1), (0, h//2), (w-1, h//2), (w//2, 0), (w//2, h-1)]
for pt in pts:
    cv2.floodFill(img_to_flood, bg_flood, pt, 255, 0, 0, 4 | (255<<8) | cv2.FLOODFILL_MASK_ONLY)

outer_bg = bg_flood[1:h+1, 1:w+1].copy()

# 4. Punch holes inside text loops (0, 4, etc.). 
# Any pixel mathematically matching the beige color OUTSIDE the safe India map is killed.
outer_bg[(bg_color_mask == 255) & (safe_map == 0)] = 255

# 5. Foreground mask and soft elegant Gaussian anti-aliasing
fg_mask = (outer_bg == 0).astype(np.uint8) * 255
final_alpha = cv2.GaussianBlur(fg_mask, (3,3), 0)

# 6. Apply transparency
final_img = orig.copy()
final_img[:,:,3] = final_alpha

# Darken pure foreground elements strictly outside the India map to stark RGB(0,0,0)
# This removes any visual trace of the tiny 1px beige fringe from fading out!
text_zone = (safe_map == 0) & (final_alpha > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

cv2.imwrite(out_path, final_img)
print(f"Algorithm 8 (Color-Gated AI Blend) complete. Saved perfectly to: {out_path}")
