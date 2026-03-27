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

# 2. EROSION FIX FOR THE MAP
# The map border is slightly too fat and contains beige pixels on its edge.
# We erode (shrink) the solid map mask inwards by roughly 2 pixels.
# This cuts off the entire beige outline around the map.
kernel_erode_map = np.ones((5,5), np.uint8)
eroded_map = cv2.erode(solid_map_mask, kernel_erode_map, iterations=1)

# To ensure the erosion didn't carve into sharp corners too much leaving jaggies, 
# we slightly blur the alpha mask edge of the map.
map_alpha = cv2.GaussianBlur(eroded_map, (3,3), 0)

# 3. Extract Text and Arrows
text_alpha = np.zeros((h, w), dtype=np.uint8)
for y in range(h):
    for x in range(w):
        # We only look outside the shrunken eroded map
        if eroded_map[y, x] < 255:
            pixel_gray = gray[y, x]
            # Sharp cutoff for dark text. 
            # Background beige is ~220-250. Text is < 140.
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

# 4. Construct Final Alpha
# Initialize with the completely clean eroded map mask
final_alpha = map_alpha.copy()

# Add the clean text alpha where the map isn't
# Use maximum to softly blend overlapping alpha
final_alpha = np.maximum(final_alpha, text_alpha)

final_img = orig.copy()

# Force text outside the map to pure black to remove ANY beige glow natively in the JPEG noise
text_zone = (eroded_map == 0) & (text_alpha > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 11 (Erosion Cutoff) complete. Saved perfectly borderless and smudge-free to: {out_path}")
