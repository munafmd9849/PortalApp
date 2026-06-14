import cv2
import numpy as np
import sys

# Paths
orig_path = sys.argv[1]
out_path = sys.argv[2]

print(f"Loading original: {orig_path}")

# Read image
orig = cv2.imread(orig_path, cv2.IMREAD_UNCHANGED)
if orig is None:
    print(f"Error loading {orig_path}")
    sys.exit(1)

# Ensure it's BGRA
if len(orig.shape) == 3 and orig.shape[2] == 3:
    orig = cv2.cvtColor(orig, cv2.COLOR_BGR2BGRA)

# Get the BGR version of original to determine background
bgr = orig[:, :, :3]

# The background color is a light beige gradient. 
# Top left is approx (240, 240, 240). Bottom right is approx (220, 230, 240).
# Let's use HSV color space to find anything that matches the beige/white background.
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

# Define range for background (light beige to almost white)
# Hue can be anything, saturation is very low, value is very high.
lower_bg = np.array([0, 0, 200])
upper_bg = np.array([179, 50, 255])

# Mask of background pixels based on thresholding
bg_mask_color = cv2.inRange(hsv, lower_bg, upper_bg)

# The map itself has some bright white spots. We must make sure we only remove the background OUTSIDE the map.
# We will use floodFill from the corners to find the continuous outer background.
h, w = bgr.shape[:2]
bg_mask = np.zeros((h + 2, w + 2), np.uint8)

seed_points = [(0,0), (0, h-1), (w-1, 0), (w-1, h-1), (0, h//2), (w-1, h//2), (w//2, 0), (w//2, h-1)]
loDiff = (8, 8, 8)
upDiff = (8, 8, 8)
flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY

img_copy = bgr.copy()
for pt in seed_points:
    cv2.floodFill(img_copy, bg_mask, pt, (0,0,0), loDiff, upDiff, flags)

# Extract actual size mask (This represents the continuous outer background)
outer_bg_mask = bg_mask[1:h+1, 1:w+1]

# What is NOT the outer background? Everything else! (Map, text, arrows, interior holes)
not_outer_bg = cv2.bitwise_not(outer_bg_mask)

# Now, we also want to keep the text and arrows. They are dark.
gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
# Text/arrows are very dark (e.g. < 100)
_, text_mask = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)

# Combine: Keep what is NOT outer background, AND keep any dark text/arrows
# The flood fill might bleed into the arrows. So we force the text_mask to be kept.
keep_mask = cv2.bitwise_or(not_outer_bg, text_mask)

# For anti-aliased text on the background, we need a smooth alpha transition.
# We'll calculate alpha based on how far a pixel is from pure white/beige.
# Background is > 230 in grayscale usually. Text is < 100.
# So alpha = 255 * (240 - gray) / (240 - 0)
text_alpha = 255.0 * (240.0 - gray.astype(np.float32)) / 240.0
text_alpha = np.clip(text_alpha, 0, 255).astype(np.uint8)

# Where keep_mask is true (255), we use full alpha (255), UNLESS it's just text floating in the bg.
# If it's pure outer background, alpha is 0.
final_alpha = np.zeros((h, w), dtype=np.uint8)
final_alpha[keep_mask == 255] = 255

# To fix jagged edges on text that bled into the outer background, 
# we blend the alpha for the dark text pixels.
final_alpha = np.maximum(final_alpha, cv2.bitwise_and(text_alpha, text_mask))

# Create final image
final_img = orig.copy()
final_img[:, :, 3] = final_alpha

# Darken the text/arrows so they don't have beige fringes
mask_indices = (text_mask == 255) & (outer_bg_mask == 255)
final_img[mask_indices, 0] = 0 # B
final_img[mask_indices, 1] = 0 # G
final_img[mask_indices, 2] = 0 # R

cv2.imwrite(out_path, final_img)
print(f"Successfully processed and saved enhanced composite image to: {out_path}")
