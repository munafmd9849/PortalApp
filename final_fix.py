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

# 1. Base Map from rembg
_, thresh_rembg = cv2.threshold(alpha_rembg, 10, 255, cv2.THRESH_BINARY)

# 2. Find filled holes
bg_flood = np.zeros((h + 2, w + 2), np.uint8)
cv2.floodFill(thresh_rembg.copy(), bg_flood, (0,0), 255)
outer_bg = bg_flood[1:h+1, 1:w+1]

# Holes are pixels that are NOT connected to the outer edges AND are NOT part of the rembg mask
holes = (outer_bg == 0) & (thresh_rembg == 0)
holes = holes.astype(np.uint8) * 255

# Find connected components of these holes
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(holes, connectivity=8)

# Create a mask of ONLY the large holes (the map voids)
large_holes_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_labels):
    # A hole in a letter like '0' or '4' is tiny (~50 pixels). 
    # A massive map void is large. We set threshold to 1000 pixels.
    if stats[i, cv2.CC_STAT_AREA] > 1000: 
        large_holes_mask[labels == i] = 255

# Final solid map mask is exactly the AI mask PLUS ONLY the large map voids
solid_map_mask = thresh_rembg.copy()
solid_map_mask[large_holes_mask == 255] = 255

# 3. Text and arrow extraction outside the map
# To ensure zero borders on text, we need a sharp cutoff for the beige background.
# Beige is typically > 180. We set cutoff at 170. Anything >170 is 100% transparent.
# Text is typically < 100. We set solid at 100. Anything <100 is 100% solid.
bg_cutoff = 170.0
fg_cutoff = 100.0

alpha_text = 255.0 * (bg_cutoff - gray.astype(np.float32)) / (bg_cutoff - fg_cutoff)
alpha_text = np.clip(alpha_text, 0, 255).astype(np.uint8)

# 4. Construct Final Alpha
final_alpha = np.zeros((h, w), dtype=np.uint8)

# Inside map is 100% solid
final_alpha[solid_map_mask == 255] = 255

# Outside map is strictly the text alpha
final_alpha[solid_map_mask == 0] = alpha_text[solid_map_mask == 0]

final_img = orig.copy()

# 5. Prevent "faint black" blob borders by forcing text out of bounds to pure black
text_zone = (solid_map_mask == 0) & (alpha_text > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 7 complete. Saved flawlessly to: {out_path}")
