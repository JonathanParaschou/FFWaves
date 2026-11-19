"""Render original enemy movement/attack poses for roster curation."""
from pathlib import Path
import importlib.util,json,subprocess
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('enemy_runtime_review',ROOT/'tools/review-runtime-scene.py');renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
from PIL import Image
subprocess.run(['node','tools/export-enemy-review.mjs'],cwd=ROOT,check=True)
records=json.loads((ROOT/'qa/enemy-review.json').read_text())
sheet=Image.new('RGB',(1600,225*((len(records)+3)//4)),'#17313b')
for i,r in enumerate(records):
 im=renderer.render(r['scene'],r['camera'],r['name'].upper()+' / T'+str(r['tier'])+' / '+r['state'].upper(),background='#17313b')
 im.save(ROOT/'qa'/('enemy-'+r['id']+'-'+r['state']+'.jpg'),quality=91)
 sheet.paste(im.resize((400,225)),((i%4)*400,(i//4)*225));print(r['id'],r['state'],flush=True)
sheet.save(ROOT/'docs/enemy-roster-review.jpg',quality=91)
