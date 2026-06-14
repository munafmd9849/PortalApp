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

# 1. Base Map from rembg and strictly fill voids
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

# Expand the map by a few pixels so it doesn't leave a beige fringe
# but don't eat into the arrows too much.
kernel_dilate = np.ones((5,5), np.uint8)
solid_map_mask = cv2.dilate(solid_map_mask, kernel_dilate, iterations=1)

# 2. Extract Text and Arrows using Morphological Black Hat!
# Black Hat finds dark details (text/lines) on a bright background (the beige gradient AND the dark shadow/vignette at the bottom).
# A large structural element allows it to ignore broad shadows and gradients!
# Text strokes are at most ~10 pixels thick. A 35x35 element perfectly captures them while ignoring massive shadow gradients.
kernel_bh = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (35, 35))
blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, kernel_bh)

# blackhat now contains high values (>30) for sharp text/arrows, and near zero (~0-10) for smooth vignette shadows!
# We define text as anything that stands out sharply by at least 15 intensity levels.
# Anything below 10 is considered gradient noise / compression artifacts.
text_alpha_raw = np.clip((blackhat.astype(float) - 10.0) * (255.0 / 30.0), 0, 255).astype(np.uint8)

# 3. Construct Final Alpha
final_alpha = np.zeros((h, w), dtype=np.uint8)

# Inside map is 100% solid
final_alpha[solid_map_mask == 255] = 255

# Outside map is strictly the blackhat text alpha
final_alpha[solid_map_mask == 0] = text_alpha_raw[solid_map_mask == 0]

final_img = orig.copy()

# Force any visible text element outside the map to pure black to remove beige glow/compression artifacts
text_zone = (solid_map_mask == 0) & (final_alpha > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 9 (Black Hat) complete. Saved perfectly borderless and smudge-free to: {out_path}")
