import re
import os

source_path = '/Users/saicharan/Downloads/IndiaMapBlend.svg'
target_path = '/Users/saicharan/Downloads/Portal-main/india-banner.svg'

print(f"Reading from {source_path}")
with open(source_path, 'r', encoding='utf-8') as f:
    src = f.read()

m = re.search(r'<svg[^>]*>(.*?)</svg>', src, re.DOTALL | re.IGNORECASE)
inner_map = m.group(1) if m else "<!-- failed to parse svg -->"

template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&amp;display=swap');
      .stat-perc { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 32px; fill: #1a1a1a; }
      .stat-text { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 16px; fill: #4a4a4a; }
      .connector-arrow { fill: none; stroke: #666; stroke-width: 1.5; stroke-dasharray: 4 4; }
      .arrow-head { fill: none; stroke: #666; stroke-width: 1.5; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="#fdf6e9" />

  <!-- Title & Subtitle -->
  <g transform="translate(50, 80)">
    <text class="title" style="font-family: 'Inter', sans-serif; font-size: 32px; font-weight: 700; fill: #1a1a1a;" y="0">Indian Talent Landscape</text>
    <text class="subtitle" style="font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 400; fill: #4a4a4a;" y="30">Key challenges faced by fresh graduates in the job market.</text>
  </g>

  <!-- Map Layout -->
  <g transform="translate(150, 150) scale(1.1)">
    {MAP_CONTENT}
  </g>

  <!-- Annotations Grouped Outside to overlay Map -->
  <g>
    <!-- 70% -->
    <path class="connector-arrow" d="M 450,255 Q 550,230 650,230" />
    <path class="arrow-head" d="M 640,225 L 650,230 L 640,235" />
    <text class="stat-text" x="660" y="235"><tspan class="stat-perc">70%</tspan><tspan dx="8">Students lack industry-relevant skills</tspan></text>

    <!-- 40% -->
    <path class="connector-arrow" d="M 460,380 Q 560,350 630,350" />
    <path class="arrow-head" d="M 620,345 L 630,350 L 620,355" />
    <text class="stat-text" x="640" y="340"><tspan class="stat-perc">40%</tspan><tspan dx="8">Students choose the wrong career</tspan></text>
    <text class="stat-text" x="715" y="365">path</text>

    <!-- 29% -->
    <path class="connector-arrow" d="M 400,530 Q 500,530 550,560" />
    <path class="arrow-head" d="M 540,555 L 550,560 L 545,550" />
    <text class="stat-text" x="530" y="590"><tspan class="stat-perc">29%</tspan><tspan dx="8">Young population lacks industry</tspan></text>
    <text class="stat-text" x="590" y="615">exposure</text>

    <!-- 55% -->
    <path class="connector-arrow" d="M 330,620 Q 250,650 200,650" />
    <path class="arrow-head" d="M 210,645 L 200,650 L 210,655" />
    <text class="stat-text" x="20" y="640"><tspan class="stat-perc">55%</tspan><tspan dx="8">Students are unprepared for real</tspan></text>
    <text class="stat-text" x="80" y="665">interview and hiring processes</text>
  </g>
</svg>"""

final = template.replace('{MAP_CONTENT}', inner_map)

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(final)
print("Done generating india-banner.svg natively!")
