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

# 1. Map Body from rembg
# rembg did a near-perfect job of finding the map boundary.
# The only issue was that it punched holes in true white or true black areas INSIDE the map.
# We will find the outer contour of the rembg mask and fill it completely.
_, thresh_rembg = cv2.threshold(alpha_rembg, 10, 255, cv2.THRESH_BINARY)

# Find contours. We want all substantial external contours (in case there are islands).
contours, _ = cv2.findContours(thresh_rembg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

solid_map_mask = np.zeros((h, w), dtype=np.uint8)
for cnt in contours:
    if cv2.contourArea(cnt) > 1000: # Map is huge, ignore tiny noise flakes
        # Draw the filled contour to solidify the entire map body
        cv2.drawContours(solid_map_mask, [cnt], -1, 255, -1)

# Now solid_map_mask is GUARANTEED to have NO holes inside the map boundary.

# 2. Text and arrow extraction outside the map
# We find anything dark outside the map.
# Text and arrows are dark gray/black (gray value < 150).
# The beige background is bright (gray value > 220).
# Let's create a smooth alpha transition based on darkness, ONLY outside the map.
bg_cutoff = 200.0
fg_cutoff = 100.0

alpha_text = 255.0 * (bg_cutoff - gray.astype(np.float32)) / (bg_cutoff - fg_cutoff)
alpha_text = np.clip(alpha_text, 0, 255).astype(np.uint8)

# 3. Construct Final Alpha
final_alpha = np.zeros((h, w), dtype=np.uint8)

# Map is 100% solid
final_alpha[solid_map_mask == 255] = 255

# Outside the map, use the text alpha
final_alpha[solid_map_mask == 0] = alpha_text[solid_map_mask == 0]

# 4. Construct Final Image
final_img = orig.copy()

# For the semi-transparent text/arrows outside the map, force them to pure black
# This prevents them from looking "dirty" with the old beige background bleeding through
text_zone = (solid_map_mask == 0) & (alpha_text > 0)
final_img[text_zone, 0] = 0 # B
final_img[text_zone, 1] = 0 # G
final_img[text_zone, 2] = 0 # R

# Apply alpha
final_img[:,:,3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 6 complete. Saved to: {out_path}")
