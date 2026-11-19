"""Review the original animated back accessory on posed hero models."""
from pathlib import Path
import importlib.util,json,subprocess
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('tentacle_review',ROOT/'tools/review-runtime-scene.py');renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
from PIL import Image
subprocess.run(['node','tools/fit-tentacle-backpack.mjs'],cwd=ROOT,check=True)
cases=json.loads((ROOT/'qa/tentacle-review.json').read_text());sheet=Image.new('RGB',(1600,450*3),'#20353e')
for i,case in enumerate(cases):
 im=renderer.render(case['scene'],case['camera'],case['name'].upper(),background='#20353e');sheet.paste(im,((i%2)*800,(i//2)*450))
sheet.save(ROOT/'docs/nergal-tendrils-review.jpg',quality=92)
