from rembg import remove
from PIL import Image
import sys

input_path = sys.argv[1]
output_path = sys.argv[2]

input_image = Image.open(input_path)
output_image = remove(input_image)
output_image.save(output_path)
print(f"Background removed successfully. Image saved to {output_path}")
