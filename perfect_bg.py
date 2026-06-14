import cv2
import numpy as np
import sys

# Paths
orig_path = sys.argv[1]
out_path = sys.argv[2]

# Read image
orig = cv2.imread(orig_path, cv2.IMREAD_UNCHANGED)
if len(orig.shape) == 3 and orig.shape[2] == 3:
    orig = cv2.cvtColor(orig, cv2.COLOR_BGR2BGRA)

bgr = orig[:, :, :3]
gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

h, w = bgr.shape[:2]

# 1. To protect the map, we need a SOLID mask of the map.
# We know the text and arrows are purely black/dark gray. The map is colorful.
# The background is a very bright beige/gradient.
# Let's find the background precisely. It's bright and low saturation.
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
S = hsv[:, :, 1]
V = hsv[:, :, 2]

# Background is V > 210 and S < 40
bg_color_mask = (V > 210) & (S < 40)

# 2. Find black text/arrows. They are V < 100
text_mask = (V < 100)

# 3. Everything else is the Map.
map_mask = ~(bg_color_mask | text_mask)

# 4. We want to remove ONLY the background that is outside the map.
# We floodfill the corner to find the "outer" background.
bg_flood = np.zeros((h + 2, w + 2), np.uint8)
img_to_flood = np.zeros((h, w), np.uint8)
img_to_flood[bg_color_mask] = 255

seed_points = [(0,0), (0, h-1), (w-1, 0), (w-1, h-1)]
for pt in seed_points:
    cv2.floodFill(img_to_flood, bg_flood, pt, 0) # Fill with 0 to erase outer bg

# outer_bg is where bg_flood was set to 1 by floodFill? No, floodFill modifies the image it's called on.
# Actually, let's floodfill from the corners on a mask where background is 0, map/text is 255.
mask_inv = np.zeros((h, w), np.uint8)
mask_inv[~(bg_color_mask)] = 255 # Map and text are white, bg is black

# Flood from edges
flood_mask = np.zeros((h + 2, w + 2), np.uint8)
flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY
for pt in seed_points:
    cv2.floodFill(mask_inv, flood_mask, pt, 255, 0, 0, flags)

# outer_bg is exactly the flood mask
outer_bg = flood_mask[1:h+1, 1:w+1]

# 5. So, what do we KEEP?
# We keep everything that is NOT outer_bg.
keep_mask = (outer_bg == 0)

# 6. BUT wait, what about the text and arrows that live INSIDE the outer_bg?
# Text has V < 100. Let's explicitly add them back.
# We want to keep them, but softly (anti-aliased).
# If a pixel is in outer_bg but is very dark (V < 150), it's probably text/arrow/line.
# Alpha for these dark pixels in the outer bg:
# If V=0 -> alpha=255. If V=150 -> alpha=0
text_alpha_in_bg = np.clip(255.0 * (150.0 - V.astype(np.float32)) / 150.0, 0, 255).astype(np.uint8)

# 7. Final Alpha Construction
final_alpha = np.zeros((h, w), dtype=np.uint8)

# Solidly keep the map and interior holes
final_alpha[keep_mask] = 255

# Softly blend the text/arrows in the outer background
final_alpha[outer_bg == 255] = text_alpha_in_bg[outer_bg == 255]

# 8. Clean up fringing on text in the outer background.
# Since the background was beige, the faded text pixels have beige in them.
# We set their RGB to black to ensure they look like clean dark gray/black text on transparent.
final_img = orig.copy()
text_pixels = (outer_bg == 255) & (V < 150)
final_img[text_pixels, 0] = 0
final_img[text_pixels, 1] = 0
final_img[text_pixels, 2] = 0

final_img[:, :, 3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Algorithm 3 complete. Saved to: {out_path}")
