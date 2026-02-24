import re

source_path = '/Users/saicharan/Downloads/Portal-main/PORTAL/file.svg'
target_path = '/Users/saicharan/Downloads/Portal-main/india-banner.svg'

with open(source_path, 'r', encoding='utf-8') as f:
    src = f.read()

m = re.search(r'<svg[^>]*>(.*?)</svg>', src, re.DOTALL | re.IGNORECASE)
inner_map = m.group(1) if m else ""

# Remove the first path if it's a large black background
# Robust regex to catch the first path in inner_map if it's black
inner_map = re.sub(r'^\s*<path fill="#000000".*?/>', '', inner_map, count=1, flags=re.DOTALL | re.MULTILINE)

template = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 650" width="100%" height="650">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&amp;display=swap');
      .stat-perc { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 20px; fill: #000000; }
      .stat-text { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 14px; fill: #000000; }
      .connector-arrow { fill: none; stroke: #000000; stroke-width: 1.5; stroke-dasharray: 4 4; stroke-linecap: round; }
    </style>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
      <feOffset dx="5" dy="5" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.15" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 8 5 L 0 9" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>

  <!-- India Map Layout -->
  <g transform="translate(40, 50) scale(1.15)">
    <g filter="url(#shadow)">
      {MAP_CONTENT}
    </g>
  </g>

  <!-- Annotations -->
  <g>
    <!-- 70% -->
    <path class="connector-arrow" d="M 330,220 Q 370,180 430,170" marker-end="url(#arrow)" />
    <text class="stat-text" x="440" y="173"><tspan class="stat-perc">70%</tspan><tspan dx="8">Students lack industry-relevant skills</tspan></text>

    <!-- 40% -->
    <path class="connector-arrow" d="M 350,305 Q 390,265 440,255" marker-end="url(#arrow)" />
    <text class="stat-text" x="450" y="258"><tspan class="stat-perc">40%</tspan><tspan dx="8">Students choose the wrong career path</tspan></text>

    <!-- 29% -->
    <path class="connector-arrow" d="M 320,440 Q 360,520 410,480" marker-end="url(#arrow)" />
    <text class="stat-text" x="420" y="485"><tspan class="stat-perc">29%</tspan><tspan dx="8">Young population lacks industry exposure</tspan></text>

    <!-- 55% -->
    <path class="connector-arrow" d="M 280,540 Q 320,570 370,560" marker-end="url(#arrow)" />
    <text class="stat-text" x="385" y="565"><tspan class="stat-perc">55%</tspan><tspan dx="8">Students are unprepared for real interviews</tspan></text>
    <text class="stat-text" x="435" y="590">and hiring processes</text>
  </g>
</svg>"""

final = template.replace('{MAP_CONTENT}', inner_map)

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(final)
print("Updated india-banner.svg positions!")
