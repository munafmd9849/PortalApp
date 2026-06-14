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

alpha_rembg = rembg[:,:,3]
bgr = orig[:,:,:3]
gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
h, w = bgr.shape[:2]

# 1. Base Map from rembg and fill voids
_, thresh_rembg = cv2.threshold(alpha_rembg, 10, 255, cv2.THRESH_BINARY)
bg_flood = np.zeros((h + 2, w + 2), np.uint8)
cv2.floodFill(thresh_rembg.copy(), bg_flood, (0,0), 255)
outer_bg = bg_flood[1:h+1, 1:w+1]

holes = (outer_bg == 0) & (thresh_rembg == 0)
holes = holes.astype(np.uint8) * 255
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(holes, connectivity=8)

large_holes_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_labels):
    if stats[i, cv2.CC_STAT_AREA] > 1000: 
        large_holes_mask[labels == i] = 255

solid_map_mask = thresh_rembg.copy()
solid_map_mask[large_holes_mask == 255] = 255

kernel_dilate = np.ones((5,5), np.uint8)
solid_map_mask = cv2.dilate(solid_map_mask, kernel_dilate, iterations=1)

# 2. Extract Text and Arrows - BINARY CUTOFF
text_alpha = np.zeros((h, w), dtype=np.uint8)

for y in range(h):
    for x in range(w):
        if solid_map_mask[y, x] == 0:
            pixel_gray = gray[y, x]
            # Sharp Binary Cutoff - No fading alpha!
            if pixel_gray < 185:
                # KILL ZONE for bottom left shadow
                if y > h * 0.65 and x < w * 0.45:
                    continue
                # IT IS EITHER 100% SOLID OR 0% SOLID. No "coated" grey look.
                text_alpha[y, x] = 255

# Clean up loose noise spots outside the map
num_t, labels_t, stats_t, _ = cv2.connectedComponentsWithStats(text_alpha, connectivity=8)
valid_text_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_t):
    if stats_t[i, cv2.CC_STAT_AREA] > 5:
        valid_text_mask[labels_t == i] = 255
text_alpha[valid_text_mask == 0] = 0

# 3. Exact Color-Matching Map Edges
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
bg_color_mask = ((hsv[:,:,2] > 180) & (hsv[:,:,1] < 45)).astype(np.uint8) * 255

img_to_flood = np.zeros((h, w), np.uint8)
img_to_flood[bg_color_mask == 255] = 255
bg_flood_exact = np.zeros((h+2, w+2), np.uint8)

for pt in [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]:
    cv2.floodFill(img_to_flood, bg_flood_exact, pt, 255, 0, 0, 4 | (255<<8) | cv2.FLOODFILL_MASK_ONLY)

exact_outer_beige = bg_flood_exact[1:h+1, 1:w+1]

final_map_alpha = solid_map_mask.copy()
final_map_alpha[exact_outer_beige == 255] = 0
final_map_alpha = cv2.GaussianBlur(final_map_alpha, (3,3), 0)

# 4. Construct Final Alpha
final_alpha = np.maximum(final_map_alpha, text_alpha)
final_img = orig.copy()
final_img[:,:,3] = final_alpha

# 5. UNIFORM ABSOLUTE BLACK TEXT FIX
original_text_zone = (final_map_alpha == 0) & (text_alpha > 0)
kernel_text = np.ones((40,40), np.uint8)
dilated_text_zone = cv2.dilate(original_text_zone.astype(np.uint8), kernel_text, iterations=1)

arrow_bases_and_text = (dilated_text_zone == 1) & (gray < 185) & (final_alpha > 0)
low_saturation = hsv[:,:,1] < 45

strict_black_zone = arrow_bases_and_text & low_saturation

# ABSOLUTE OVERWRITE: Forcing everything in the text zone to be pure black AND 100% solid opacity
# This physically prevents any "coating" or greyish fade pixel rendering
final_img[strict_black_zone, 0] = 0 # B
final_img[strict_black_zone, 1] = 0 # G
final_img[strict_black_zone, 2] = 0 # R
final_img[strict_black_zone, 3] = 255 # STRICT 100% OPACITY

cv2.imwrite(out_path, final_img)
print(f"Algorithm 15 (Binary Alpha Black Text) complete. Saved perfectly coated-free to: {out_path}")
