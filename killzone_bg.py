import cv2
import numpy as np
import sys

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
kernel_dilate = np.ones((5,5), np.uint8)
solid_map_mask = cv2.dilate(solid_map_mask, kernel_dilate, iterations=1)

# 2. Extract Text and Arrows
# Dark text: gray < 130
# AND we exclude the bottom 15% of the image UNLESS it's on the right half!
# The shadow smudge is at the bottom left.
text_alpha = np.zeros((h, w), dtype=np.uint8)

for y in range(h):
    for x in range(w):
        if solid_map_mask[y, x] == 0:
            pixel_gray = gray[y, x]
            # Sharp cutoff for dark text (gray < 100 is solid, 100-140 fades out)
            if pixel_gray < 140:
                # Calculate alpha
                val = 255.0 * (140.0 - float(pixel_gray)) / 40.0
                alpha_val = int(min(max(val, 0), 255))
                
                # KILL ZONE for bottom left shadow:
                # If it's in the bottom 25% of the image (y > h * 0.75) 
                # AND it's on the left side (x < w * 0.5)
                # It is physically impossible for the text or arrows to be here.
                if y > h * 0.65 and x < w * 0.45:
                    alpha_val = 0
                
                # Further refine: Any text-like pixel must be part of a meaningful connected chunk,
                # but for simplicity, the Kill Zone directly eliminates the smudge area completely.
                text_alpha[y, x] = alpha_val

# 3. Clean up loose noise spots outside the map (e.g. random JPEG artifacts)
# We can use connected components on text_alpha to remove tiny specs or massive low-density webs.
_, binary_text = cv2.threshold(text_alpha, 50, 255, cv2.THRESH_BINARY)
num_t, labels_t, stats_t, _ = cv2.connectedComponentsWithStats(binary_text, connectivity=8)
valid_text_mask = np.zeros((h, w), dtype=np.uint8)
for i in range(1, num_t):
    area = stats_t[i, cv2.CC_STAT_AREA]
    # Keep components that are large enough to be text letters/arrows (> 10 pixels)
    if area > 10:
        valid_text_mask[labels_t == i] = 255

# Apply valid mask to clean text_alpha
text_alpha[valid_text_mask == 0] = 0

# 4. Construct Final Alpha
final_alpha = np.zeros((h, w), dtype=np.uint8)

# Inside map is 100% solid
final_alpha[solid_map_mask == 255] = 255

# Outside map is strictly the clean text alpha
final_alpha[solid_map_mask == 0] = text_alpha[solid_map_mask == 0]

final_img = orig.copy()

# Force any visible text element outside the map to pure black
text_zone = (solid_map_mask == 0) & (final_alpha > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 10 (Kill Zone) complete. Saved smudge-free to: {out_path}")
