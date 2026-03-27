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

# 2. Extract Text and Arrows
text_alpha = np.zeros((h, w), dtype=np.float32)

# Background beige is generally > 190. Text and arrows can be as light as 175.
for y in range(h):
    for x in range(w):
        if solid_map_mask[y, x] == 0:
            pixel_gray = gray[y, x]
            # Sharp cutoff for dark text. 
            if pixel_gray < 185:
                # Fade text gracefully between 150 and 185
                val = 255.0 * (185.0 - float(pixel_gray)) / 35.0
                alpha_val = int(min(max(val, 0), 255))
                
                # KILL ZONE for bottom left shadow
                if y > h * 0.65 and x < w * 0.45:
                    alpha_val = 0
                
                text_alpha[y, x] = alpha_val

text_alpha = text_alpha.astype(np.uint8)

# Clean up loose noise spots outside the map
_, binary_text = cv2.threshold(text_alpha, 30, 255, cv2.THRESH_BINARY)
num_t, labels_t, stats_t, _ = cv2.connectedComponentsWithStats(binary_text, connectivity=8)
valid_text_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_t):
    if stats_t[i, cv2.CC_STAT_AREA] > 5: # Lowered threshold to keep tiny dashes!
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

# 5. UNIFORM PURE BLACK TEXT FIX
# Force all valid text/arrow alpha pixels logically OUTSIDE the map to be black
original_text_zone = (final_map_alpha == 0) & (text_alpha > 0)

# Expand the text zone inwards to grab the arrow bases touching the map
kernel_text = np.ones((40,40), np.uint8)
dilated_text_zone = cv2.dilate(original_text_zone.astype(np.uint8), kernel_text, iterations=1)

# Any grey path (< 185) touching the inner text zone becomes pure black
arrow_bases_and_text = (dilated_text_zone == 1) & (gray < 185) & (final_alpha > 0)

# And specifically exclude skin/faces inside the map by ensuring low saturation
# Flesh tones have high saturation. The arrows are purely gray (S < 30).
low_saturation = hsv[:,:,1] < 45

strict_black_zone = arrow_bases_and_text & low_saturation

final_img[strict_black_zone, 0] = 0 # B
final_img[strict_black_zone, 1] = 0 # G
final_img[strict_black_zone, 2] = 0 # R

cv2.imwrite(out_path, final_img)
print(f"Algorithm 14 (Perfect Arrows) complete. Saved seamlessly to: {out_path}")
