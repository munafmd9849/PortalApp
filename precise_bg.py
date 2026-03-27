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

# Expand the map by a few pixels so it completely encloses the actual map
kernel_dilate = np.ones((5,5), np.uint8)
solid_map_mask = cv2.dilate(solid_map_mask, kernel_dilate, iterations=1)

# 2. Extract Text and Arrows
# Dark text: gray < 130
text_alpha = np.zeros((h, w), dtype=np.uint8)

for y in range(h):
    for x in range(w):
        if solid_map_mask[y, x] == 0:
            pixel_gray = gray[y, x]
            # Sharp cutoff for dark text
            if pixel_gray < 140:
                val = 255.0 * (140.0 - float(pixel_gray)) / 40.0
                alpha_val = int(min(max(val, 0), 255))
                
                # KILL ZONE for bottom left shadow
                if y > h * 0.65 and x < w * 0.45:
                    alpha_val = 0
                
                text_alpha[y, x] = alpha_val

# Clean up loose noise spots outside the map
_, binary_text = cv2.threshold(text_alpha, 50, 255, cv2.THRESH_BINARY)
num_t, labels_t, stats_t, _ = cv2.connectedComponentsWithStats(binary_text, connectivity=8)
valid_text_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_t):
    if stats_t[i, cv2.CC_STAT_AREA] > 10:
        valid_text_mask[labels_t == i] = 255
text_alpha[valid_text_mask == 0] = 0

# 3. FIXING THE BEIGE BORDER THE RIGHT WAY (No Global Erosion)
# Erosion destroyed data. We need to eliminate the beige explicitly.
# The beige background is V > 180, S < 40 in the HSV space.
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
bg_color_mask = ((hsv[:,:,2] > 180) & (hsv[:,:,1] < 45)).astype(np.uint8) * 255

# The actual MAP is everything that is NOT the beige color mask (outside of text).
# So we can just intersect the solid_map_mask with NOT(bg_color_mask)
# This perfectly traces the exact edges of the map (gray borders and colorful skin/clothes)
refined_map_mask = cv2.bitwise_and(solid_map_mask, cv2.bitwise_not(bg_color_mask))

# But wait, there might be bright white spots inside the map (like white shirts).
# If we just do NOT(bg_color_mask), we will punch holes in the white shirts.
# We solve this by ONLY eliminating beige pixels that are connected to the very edge of the map!
# This is equivalent to floodfilling the 'beige' color from the outside.
img_to_flood = np.zeros((h, w), np.uint8)
img_to_flood[bg_color_mask == 255] = 255
bg_flood_exact = np.zeros((h+2, w+2), np.uint8)

# Flood fill from the corners
for pt in [(0,0), (w-1,0), (0,h-1), (w-1,h-1)]:
    cv2.floodFill(img_to_flood, bg_flood_exact, pt, 255, 0, 0, 4 | (255<<8) | cv2.FLOODFILL_MASK_ONLY)

exact_outer_beige = bg_flood_exact[1:h+1, 1:w+1]

# Now, the absolute flawless map is: solid_map_mask AND NOT(exact_outer_beige)
final_map_alpha = solid_map_mask.copy()
final_map_alpha[exact_outer_beige == 255] = 0

# Slightly soften the edge so we don't get pure jaggies
final_map_alpha = cv2.GaussianBlur(final_map_alpha, (3,3), 0)

# 4. Construct Final Alpha
final_alpha = np.maximum(final_map_alpha, text_alpha)

final_img = orig.copy()

# Force text outside the map to pure black to remove ANY beige glow natively in the JPEG noise
# We only do this where map alpha is 0
text_zone = (final_map_alpha == 0) & (text_alpha > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 12 (Color-Precise Map Cutout) complete. Saved gracefully to: {out_path}")
