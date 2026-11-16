"""Read-only extraction of original FusionFall combat particle textures.

Pixels are preserved, apart from Unity image orientation and lossless PNG storage.
This catalog is independent from the mesh manifest.
"""
import collections
import collections.abc
import json
import pathlib
import sys

for name in ('Mapping', 'MutableMapping', 'Sequence', 'Iterable', 'MutableSequence'):
    if not hasattr(collections, name):
        setattr(collections, name, getattr(collections.abc, name))
ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / '.tools/UnityPackFF'), str(ROOT / '.tools/python-deps')]
from PIL import Image, ImageDraw, ImageOps
from unitypack.environment import UnityEnvironment

CACHE = pathlib.Path.home() / 'AppData/LocalLow/Unity/Web Player/Cache/FusionFall'
OUT = ROOT / 'dist/assets/fx-original'
OUT.mkdir(parents=True, exist_ok=True)
catalog = json.loads((ROOT / '.tools/catalog.json').read_text(encoding='utf-8'))
env = UnityEnvironment(str(CACHE))
selected = {
    'muzzle-shot': 'textures/shot_e01.dds.asset',
    'muzzle-scatter': 'textures/shotgun_e01.dds.asset',
    'laser': 'textures/laser.dds.asset',
    'impact-burst': 'effect/attack_hit_01.dds',
    'impact-star': 'textures/attack_hit_18.dds.asset',
    'impact-ring': 'textures/attack_hit_19.dds.asset',
    'projectile': 'effect/projectile_01.dds',
    'mega-projectile': 'effect/mgaattack_projectile.dds',
    'energy-bolt': 'effect/skill_atack_01.dds',
    'energy-ring': 'effect/skill_atack_02.dds',
    'energy-plasma': 'effect/skill_atack_03.dds',
    'smoke': 'effect/smoke_11.dds',
    'dust': 'effect/green_dust_01.dds',
    'spark': 'effect/point_002.dds',
    'nano-fire': 'effect/nano_fire_stm.dds',
    'flame': 'effect/campfire.dds',
}
result = {'format': 'fusionfall-combat-fx-v1', 'source': 'Original FusionFall Unity Web Player cache opened read-only', 'pixelProcessing': 'Unity vertical orientation converted; original RGBA preserved in lossless PNG.', 'ownership': 'Original art remains the property of its original rights holders.', 'textures': {}}
images = []
for ident, path in selected.items():
    entry = next((e for e in catalog if e['path'] == path and e['type'] == 'Texture2D'), None)
    if not entry:
        print('UNAVAILABLE', ident, path)
        continue
    asset = env.get_asset_by_filename(str(CACHE / entry['bundle'] / entry['file']))
    ptr = next(meta['asset'] for p, meta in asset.objects[1].contents['m_Container'] if p == path)
    texture = ptr.resolve()
    image = ImageOps.flip(texture.image).convert('RGBA')
    image.save(OUT / (ident + '.png'), optimize=True)
    alpha = image.getextrema()[3]
    corners = [image.getpixel(p) for p in [(0, 0), (image.width-1, 0), (0, image.height-1), (image.width-1, image.height-1)]]
    result['textures'][ident] = {'url': 'assets/fx-original/' + ident + '.png', 'source': path, 'bundle': entry['bundle'], 'size': list(image.size), 'alphaRange': list(alpha), 'hasTransparency': alpha[0] < 255, 'recommendedBlending': 'additive', 'cornerRGBA': [list(p) for p in corners]}
    if alpha[1] == 0:
        result['textures'][ident]['recommendedBlending'] = 'rgb-only-additive-shader'
        result['textures'][ident]['note'] = 'Original alpha is zero everywhere. SpriteMaterial with alpha multiplication will be invisible; shader must derive opacity from RGB.'
    if ident == 'spark':
        result['textures'][ident]['note'] = 'Original point_002 is a circular shield/bubble rim; use for an energy projectile halo, not linear sparks.'
    if ident == 'flame':
        result['textures'][ident]['atlas'] = {'columns': 6, 'rows': 4, 'frames': 24}
        result['textures'][ident]['note'] = 'Original campfire flipbook has six columns and four rows, visually inspected. Use cell UVs; do not display the whole atlas as a single flame.'
    if ident == 'laser':
        result['textures'][ident]['note'] = 'Blue horizontal scanline strip; suitable on a stretched beam quad with additive blending.'
    images.append((ident, image))
    print('EXPORTED', ident, image.size, 'alpha', alpha)
(ROOT / 'dist/assets/combat-fx-catalog.json').write_text(json.dumps(result, indent=2), encoding='utf-8')

# Contact sheet for human inspection on a dark background, without altering exports.
sheet = Image.new('RGB', (960, ((len(images)+3)//4)*230), '#132c3b')
draw = ImageDraw.Draw(sheet)
for i, (ident, image) in enumerate(images):
    view = image.copy()
    view.thumbnail((210, 190))
    x, y = (i % 4)*240 + (240-view.width)//2, (i//4)*230+6
    sheet.paste(view, (x, y), view)
    draw.text(((i % 4)*240+10, (i//4)*230+208), ident, fill='#ffffff')
sheet.save(ROOT / '.tools/combat-fx-contact.png')
print('COMBAT FX COMPLETE', len(result['textures']))
