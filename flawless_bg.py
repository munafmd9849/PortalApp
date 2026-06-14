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

# The background is a smooth grandient of beige/white.
# The map has a distinct gray 3D border.
# The text and arrows are dark gray/black.
# Let's find "background" pixels. 
# Background is generally R>200, G>200, B>180
# But more importantly, it's connected to the corners!

# We'll calculate the difference between the image and a smoothed version.
# Actually, let's just use floodFill with a very careful tolerance on the BGR image directly.
# BGR floodFill
bg_mask = np.zeros((h + 2, w + 2), np.uint8)
img_copy = bgr.copy()

# The arrows are dashed lines. They might be very thin.
# Instead of floodfill which might leak through small gaps in dashed lines,
# let's just use color.
# What color is the text/arrows?
# The text and arrows are dark. Specifically, V (brightness) is low.
# What color is the map? It has various colors, but it's bounded by a gray border.
# What color is the background? It's R>230, G>230, B>220 typically.

# Let's create a mask of EVERYTHING that is definitely NOT background.
# 1. Dark things (Text, arrows, dark parts of map)
dark_mask = gray < 180

# 2. Colorful things (Map)
hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
S = hsv[:, :, 1]
colorful_mask = S > 30

# So foreground candidates are dark OR colorful
fg_candidates = dark_mask | colorful_mask

# 3. What about the bright, white/gray clothes inside the map?
# They might be > 180 and S < 30.
# We must keep them. But how do we distinguish them from the outer background?
# Outer background is connected to the edges.
# The bright things inside the map are enclosed by the map's gray 3D border or foreground candidates!

# Let's take fg_candidates and dilate it slightly to close the border of the map.
kernel = np.ones((5,5), np.uint8)
fg_closed = cv2.morphologyEx(fg_candidates.astype(np.uint8), cv2.MORPH_CLOSE, kernel)

# Now, floodfill the background (which is 0 in fg_closed) from the corners
bg_flood = np.zeros((h + 2, w + 2), np.uint8)
cv2.floodFill(fg_closed, bg_flood, (0,0), 255)
cv2.floodFill(fg_closed, bg_flood, (w-1,0), 255)
cv2.floodFill(fg_closed, bg_flood, (0,h-1), 255)
cv2.floodFill(fg_closed, bg_flood, (w-1,h-1), 255)

# The outer background is where bg_flood is 1
outer_bg = bg_flood[1:h+1, 1:w+1]

# So, the SOLID MAP + TEXT + ARROWS is everything that is NOT outer background.
keep_mask = (outer_bg == 0)

# But wait! Dilation might have expanded the map slightly, or the closed gaps might be blocky.
# AND we still have the issue of anti-aliasing.
# If we just use keep_mask, the edges will be hard and jagged.
# Let's use keep_mask as a "safe zone", but we still need a precise alpha.

# Let's calculate a precise alpha for the whole image based on how close it is to the local background color.
# But generating local background color is hard.
# Let's just say:
# If it's outside keep_mask, alpha = 0.
# If it's inside keep_mask, alpha = 255? 
# If we do that, the arrows might have a slightly blocky halo because we dilated.

# Let's refine keep_mask.
# Actually, the arrows were mangled because V < 100 was too strict. 
# Some parts of the arrows are grayish, V=120 or 150.
# If we just do:
# Text & Arrows & Map = anything darker than the beige background.
# The beige background is around (240, 240, 230).
# Let's compute a "darkness" relative to 240.
darkness = 250 - gray.astype(np.float32)

# If darkness > 20, it's definitely text, arrow, or map.
# If darkness < 20, it's background (or white shirt in map).

# To protect the white shirts in the map, we need a SOLID mask of the map.
# How to get a solid map mask without the arrows?
# The map is the largest connected component in the image!
# Let's find contours in fg_candidates.
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_candidates.astype(np.uint8), connectivity=8)
# The largest component (excluding background 0) is the map.
largest_label = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
map_mask_strict = (labels == largest_label).astype(np.uint8)

# Fill holes in the map
map_contours, _ = cv2.findContours(map_mask_strict, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
solid_map = np.zeros((h, w), np.uint8)
cv2.drawContours(solid_map, map_contours, -1, 255, -1)

# Now we have a solid_map! It covers the map completely, including white shirts.
# What about the arrows and text? They are disconnected from the map (or barely touching).
# We want to extract them based simply on their darkness, but ONLY outside the solid_map.
# Outside solid_map, anything dark is text/arrow.
# Let's compute alpha outside the map.
# Background is gray ~ 240.
# Let's map gray 240 -> alpha 0, gray 200 -> alpha 255.
bg_level = 240.0
fg_level = 200.0
alpha_outside = 255.0 * (bg_level - gray.astype(np.float32)) / (bg_level - fg_level)
alpha_outside = np.clip(alpha_outside, 0, 255).astype(np.uint8)

# Final alpha:
# Inside solid_map: 255 (completely solid)
# Outside solid_map: alpha_outside (smoothly blends text and arrows)
final_alpha = np.where(solid_map == 255, 255, alpha_outside)

# Create final image
final_img = orig.copy()
final_img[:, :, 3] = final_alpha

# Darken the semi-transparent text/arrows to prevent beige fringing
text_pixels = (solid_map == 0) & (alpha_outside > 0)
final_img[text_pixels, 0] = 0
final_img[text_pixels, 1] = 0
final_img[text_pixels, 2] = 0

cv2.imwrite(out_path, final_img)
print(f"Algorithm 4 complete. Saved to: {out_path}")
