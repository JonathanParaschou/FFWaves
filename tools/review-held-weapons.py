"""Inspect baked source hero/weapon alignment using the existing software renderer."""
from pathlib import Path
import json,subprocess,importlib.util
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('runtime_review',ROOT/'tools/review-runtime-scene.py')
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
from PIL import Image
subprocess.run(['node','tools/export-held-weapon-review.mjs'],cwd=ROOT,check=True)
records=json.loads((ROOT/'qa/held-weapon-review.json').read_text())
images={}
for record in records:
    im=renderer.render(record['scene'],record['camera'],record['id'].upper(),background='#20353e')
    im.save(ROOT/'qa'/(record['id']+'.jpg'),quality=92);images[record['id']]=im
    print(record['id'],flush=True)
detail=[images[r['id']]for r in records if not r['id'].startswith('roster-')]
comparison=Image.new('RGB',(1600,450), '#20353e')
comparison.paste(images['numbuhfour-before'],(0,0));comparison.paste(images['numbuhfour-after'],(800,0))
comparison.save(ROOT/'docs/third-person-before-after.jpg',quality=92)
sheet=Image.new('RGB',(1600,450*((len(detail)+1)//2)), '#20353e')
for i,im in enumerate(detail):sheet.paste(im,((i%2)*800,(i//2)*450))
sheet.save(ROOT/'docs/third-person-review.jpg',quality=92)
roster=[images[r['id']]for r in records if r['id'].startswith('roster-')]
sheet=Image.new('RGB',(1600,225*((len(roster)+3)//4)), '#20353e')
for i,im in enumerate(roster):sheet.paste(im.resize((400,225)),((i%4)*400,(i//4)*225))
sheet.save(ROOT/'docs/hero-weapon-roster-review.jpg',quality=92)
