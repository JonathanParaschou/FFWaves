"""Inspect real fixture geometry. Sprite holograms and GPU output are unverified."""
from pathlib import Path
import importlib.util
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
subprocess.run(['node', 'tools/export-supply-review.mjs'], cwd=ROOT, check=True)
spec = importlib.util.spec_from_file_location('runtime_review', ROOT / 'tools/review-runtime-scene.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
sheet = review.Image.new('RGB', (review.W * 3, review.H))
for index, state in enumerate(json.loads((ROOT / 'qa/supply-scenes.json').read_text())):
    frame = review.render(state['scene'], state['camera'], 'SUPPLY BOX / ' + state['phase'].upper())
    sheet.paste(frame, (review.W * index, 0))
for output in ['qa/supply-box-review.jpg', 'docs/reference/NZP-Nacht/supply-box-review.jpg']:
    sheet.save(ROOT / output, quality=91)
print('Saved supply-box geometry states; sprite hologram and live GPU rendering unverified.')
