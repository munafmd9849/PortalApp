import cv2
import numpy as np
import sys

# Paths
orig_path = sys.argv[1]
rembg_path = sys.argv[2]
out_path = sys.argv[3]

print(f"Loading original: {orig_path}")
print(f"Loading rembg: {rembg_path}")

# Read images
orig = cv2.imread(orig_path, cv2.IMREAD_UNCHANGED)
if orig is None:
    print(f"Error loading {orig_path}")
    sys.exit(1)
if len(orig.shape) == 3 and orig.shape[2] == 3:
    orig = cv2.cvtColor(orig, cv2.COLOR_BGR2BGRA)

rembg_img = cv2.imread(rembg_path, cv2.IMREAD_UNCHANGED)
if rembg_img is None:
    print(f"Error loading {rembg_path}")
    sys.exit(1)

# rembg mask is the alpha channel of rembg_img
rembg_mask = rembg_img[:, :, 3]

# Get the grayscale version of original to determine darkness (text is black)
gray = cv2.cvtColor(orig[:, :, :3], cv2.COLOR_BGR2GRAY)

# Flood fill to find the continuous beige background
h, w = orig.shape[:2]
bg_mask = np.zeros((h + 2, w + 2), np.uint8)

# Floodfill from edges
seed_points = [(0,0), (0, h-1), (w-1, 0), (w-1, h-1), (0, h//2), (w-1, h//2), (w//2, 0), (w//2, h-1)]
loDiff = (15, 15, 15, 15)
upDiff = (15, 15, 15, 15)
flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY

# floodFill function requires a 1 or 3 channel image
img_copy_3ch = orig[:, :, :3].copy()
for pt in seed_points:
    cv2.floodFill(img_copy_3ch, bg_mask, pt, (0,0,0), loDiff[:3], upDiff[:3], flags)

# Extract actual size mask
bg_mask = bg_mask[1:h+1, 1:w+1]

# What is NOT background? The map + the text + the arrows + enclosed gaps like inside the letter 'O'
not_bg_mask = cv2.bitwise_not(bg_mask)

# The map is already handled by rembg_mask. We just want to extract everything else (the text/arrows).
text_arrow_only = cv2.bitwise_and(not_bg_mask, cv2.bitwise_not(rembg_mask))

# Convert white halos/anti-aliasing around text into transparency gradient!
# Assume anything with grayscale > 230 is background (transparent), anything darker fades to black.
bg_gray_level = 230.0
text_alpha = 255.0 * (bg_gray_level - gray.astype(np.float32)) / bg_gray_level
text_alpha = np.clip(text_alpha, 0, 255).astype(np.uint8)

final_text_alpha = cv2.bitwise_and(text_alpha, text_arrow_only)

# Combine masks: Map from rembg OR text/arrows from our extraction
final_alpha = np.maximum(rembg_mask, final_text_alpha)

# Create final image
final_img = orig.copy()

# For the text/arrows, to avoid beige color fringing, we set their RGB to pure black.
# Only do this where it's purely part of the text mask (excluding the map).
mask_indices = (text_arrow_only == 255)
final_img[mask_indices, 0] = 0 # B
final_img[mask_indices, 1] = 0 # G
final_img[mask_indices, 2] = 0 # R

# Apply alpha
final_img[:, :, 3] = final_alpha

cv2.imwrite(out_path, final_img)
print(f"Successfully processed and saved composite image to: {out_path}")
