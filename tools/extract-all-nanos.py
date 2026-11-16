"""Read-only export of every Nano model available in the user's FusionFall cache.

Preserves the existing curated geometry transform/part order for compatibility
with export-rigs.py. Does not edit the main asset manifest or game code.
"""
import json
import pathlib
import re
import traceback

PROJECT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = PROJECT / '.tools'
OUT = PROJECT / 'dist' / 'assets'

# Reuse only definitions, never the curated script's execution/manifest writes.
exporter_path = PROJECT / 'tools' / 'extract-fusionfall.py'
namespace = {'__file__': str(exporter_path), '__name__': 'nano_export_library'}
exec(compile(exporter_path.read_text().split('\nselected=')[0], str(exporter_path), 'exec'), namespace)
catalog = namespace['catalog']
env = namespace['env']
CACHE = namespace['CACHE']
existing = json.loads((OUT / 'manifest.json').read_text())

tables = {}
for version, filename in [('original', 'xdt.json'), ('academy', 'xdt1013.json')]:
    source = json.loads((TOOLS / 'research' / filename).read_text(encoding='utf-8'))
    tables[version] = source

def nano_records(source):
    table = source['m_pNanoTable']
    result = {}
    for row in table['m_pNanoData']:
        if not row['m_iNanoNumber'] or row['m_iMesh'] >= len(table['m_pNanoMeshData']):
            continue
        mesh = table['m_pNanoMeshData'][row['m_iMesh']]
        model = mesh['m_pstrMMeshModelString'].lower()
        if not model or model == 'null':
            continue
        name = table['m_pNanoStringData'][row['m_iNanoName']]['m_strName']
        result[model] = {'row': row, 'mesh': mesh, 'name': name, 'table': table, 'source': source}
    return result

records = {version: nano_records(source) for version, source in tables.items()}
cache_models = sorted({item['path'] for item in catalog if item['type'] == 'GameObject' and item['path'].startswith('nano/') and item['path'].endswith('.kfm')})
slug_alias = {'4arms': 'fourarms', 'juniper_lee': 'juniperlee'}

def slug_for(path):
    short = pathlib.PurePosixPath(path).stem.removeprefix('nano_')
    return slug_alias.get(short, short)

existing_textures = {value['name'].lower().removesuffix('.dds'): value for value in existing['textures'].values()}
texture_index = {item['path']: item for item in catalog if item['type'] == 'Texture2D'}

def texture(name):
    if not name or name.lower() in ('null', 'none'):
        return None
    canon = name.lower().removesuffix('.dds')
    if canon in existing_textures:
        return existing_textures[canon]
    path = 'texture/' + canon + '.dds'
    item = texture_index.get(path)
    if not item:
        return None
    asset = env.get_asset_by_filename(str(CACHE / item['bundle'] / item['file']))
    ptr = next(meta['asset'] for candidate, meta in asset.objects[1].contents['m_Container'] if candidate == path)
    value = namespace['export_texture'](ptr)
    existing_textures[canon] = value
    return value

KIND = {
    'STUN': 'stun', 'HEALTH': 'heal', 'HEAL': 'heal', 'DAMAGE': 'damage',
    'DRAIN': 'drain', 'LEECH': 'drain', 'SNARE': 'snare', 'SLEEP': 'sleep',
    'RUN': 'speed', 'JUMP': 'jump', 'ROCKET': 'jump', 'SNEAK': 'stealth',
    'GUARD': 'shield', 'RECALL': 'recall', 'REVIVE': 'revive',
    'SCAVENGE': 'energy', 'BONUS': 'energy', 'TREASURE FINDER': 'energy',
    'RADAR': 'energy', 'ANTIDOTE': 'cleanse', 'FREEDOM': 'cleanse',
    'UNSTABLE POWER': 'damage',
}
COSTS = {'stun': (35, 12), 'heal': (45, 20), 'damage': (55, 18), 'drain': (45, 16), 'snare': (30, 12), 'sleep': (35, 15), 'speed': (30, 18), 'jump': (25, 12), 'stealth': (40, 22), 'shield': (35, 20), 'recall': (45, 24), 'revive': (65, 40), 'energy': (15, 22), 'taunt': (30, 15), 'cleanse': (25, 15)}
DESCRIPTIONS = {
    'stun': 'Interrupt enemies and stun them briefly.',
    'heal': 'Restore your health in a quick burst.',
    'damage': 'Blast enemies with Nano-powered damage.',
    'drain': 'Damage enemies and recover some health.',
    'snare': 'Slow enemies to open an escape route.',
    'sleep': 'Put enemies to sleep until they take damage.',
    'speed': 'Temporarily increase movement speed.',
    'jump': 'Boost your jump and mobility briefly.',
    'stealth': 'Become concealed from enemies briefly.',
    'shield': 'Gain temporary protection against damage.',
    'recall': 'Recall to a safer position in the outpost.',
    'revive': 'Prepare an emergency self-revive.',
    'energy': 'Recover resources through your Nano link.',
    'taunt': 'Distract nearby enemies away from you.',
    'cleanse': 'Remove harmful effects and gain brief protection.',
}

def normalized_skill(tune_id, record):
    table = record['table']
    row = next((r for r in table['m_pNanoTuneData'] if r['m_iTuneNumber'] == tune_id), None)
    if not row or row['m_iTuneName'] >= len(table['m_pNanoTuneStringData']):
        return None
    strings = table['m_pNanoTuneStringData'][row['m_iTuneName']]
    category = strings['m_strComment1'].strip()
    token = category.split(' - ')[0].strip()
    kind = KIND.get(token, 'energy')
    target = 'group' if 'GROUP' in category else 'cone' if 'CONE' in category else 'area' if 'AREA' in category else 'point' if 'POINT' in category else 'self'
    cost, cooldown = COSTS[kind]
    skill = {'id': row['m_iSkillID'], 'tuneId': tune_id, 'name': strings['m_strName'].strip(), 'category': category, 'kind': kind, 'targeting': target, 'description': DESCRIPTIONS[kind], 'cost': cost, 'cooldown': cooldown, 'originalPower': True, 'fpsAdaptation': True}
    if kind == 'energy':
        skill['subtype'] = {'SCAVENGE': 'scavenge', 'BONUS': 'bonus', 'RADAR': 'radar', 'TREASURE FINDER': 'treasure'}.get(token, 'energy')
    return skill

def protocols(model):
    kinds = ['stealth', 'snare', 'drain'] if model == 'nano_ghostfreak' else ['shield', 'energy', 'damage'] if model == 'nano_upgrade' else ['speed', 'shield', 'damage']
    return [{'id': f'{model}-{kind}', 'name': kind.upper() + ' PROTOCOL', 'category': 'SURVIVAL ADAPTATION', 'kind': kind, 'targeting': 'self' if kind in ['stealth', 'speed', 'shield', 'energy'] else 'area', 'description': DESCRIPTIONS[kind], 'cost': COSTS[kind][0], 'cooldown': COSTS[kind][1], 'originalPower': False, 'fpsAdaptation': True, 'sourceNote': 'Original power data is absent or contains placeholders; this is an explicitly named survival protocol.'} for kind in kinds]

result = {'format': 'fusionfall-nanos-catalog-v1', 'source': 'Read-only local FusionFall cache, with original/Academy OpenFusion tabledata mappings.', 'sources': ['https://github.com/OpenFusionProject/tabledata/blob/master/xdt.json', 'https://github.com/OpenFusionProject/tabledata/blob/master/xdt1013.json'], 'typeLegend': {'A': 'Adaptium', 'B': 'Blastons', 'C': 'Cosmix'}, 'nanos': [], 'assets': {}, 'textures': {}, 'missing': []}
style_letters = ['A', 'B', 'C']
style_names = ['Adaptium', 'Blastons', 'Cosmix']

for index, path in enumerate(cache_models):
    model = pathlib.PurePosixPath(path).stem
    slug = slug_for(path)
    asset_id = 'nano-' + slug
    original = records['original'].get(model)
    academy = records['academy'].get(model)
    record = academy or original
    row = original['row'] if original else academy['row'] if academy else None
    display = record['name'] if record else {'nano_ghostfreak': 'Ghostfreak', 'nano_upgrade': 'Upgrade'}.get(model, slug.title())
    stable_id = original['row']['m_iNanoNumber'] if original else 1000 + academy['row']['m_iNanoNumber'] if academy else 2001 if model == 'nano_ghostfreak' else 2002
    style = row['m_iStyle'] if row else None
    body_name = record['mesh']['m_pstrMTextureString'] if record else model
    face_name = record['mesh']['m_pstrMTextureString2'] if record else model + '_face'
    try:
        preserve = asset_id in ('nano-buttercup', 'nano-eddy', 'nano-deedee')
        if preserve:
            result['assets'][asset_id] = existing['assets'][asset_id]
        else:
            namespace['extract'](asset_id, path)
            body = texture(body_name)
            face = texture(face_name) or texture(model + '_face')
            # Some table references are null; the actual asset's matching skin is a safe fallback.
            body = body or texture(model)
            if body is None:
                raise RuntimeError('Missing body skin: ' + body_name)
            data_path = OUT / 'models' / (asset_id + '.json')
            data = json.loads(data_path.read_text())
            for part in data['parts']:
                for mat in part['materials']:
                    skin = face if face and '-sub-' in mat['name'].lower() else body
                    mat['map'] = skin['map']
                    mat['alphaTest'] = .3 if skin['alpha'] else 0
            data_path.write_text(json.dumps(data, separators=(',', ':')))
            entry = namespace['manifest']['assets'][asset_id]
            entry['bytes'] = data_path.stat().st_size
            result['assets'][asset_id] = entry

        skills = [normalized_skill(tune, record) for tune in record['row']['m_iTune']] if record else []
        skills = [s for s in skills if s and s['name'] and s['category'] != 'BLANK']
        if model in ('nano_ben', 'nano_ghostfreak', 'nano_upgrade') or len(skills) != 3:
            skills = protocols(model)
        icon_record = original or academy
        icon_number = None
        if icon_record:
            icon_table = icon_record['table']['m_pNanoIconData']
            icon_index = icon_record['row']['m_iIcon1']
            if icon_index < len(icon_table):
                icon_number = icon_table[icon_index]['m_iIconNumber']
        original_icon = f'assets/ui-original/nanoicon-{icon_number:02d}.webp' if icon_number is not None else None
        if original_icon and not (OUT.parent / original_icon).is_file():
            original_icon = None
        result['nanos'].append({'id': stable_id, 'slug': slug, 'name': display, 'asset': asset_id, 'type': style_letters[style] if style is not None else None, 'typeName': style_names[style] if style is not None else 'Unassigned', 'originalStyleKnown': style is not None, 'portrait': f'assets/ui/{asset_id}.webp', 'originalIcon': original_icon, 'sourceIconNumber': icon_number, 'skills': skills, 'sourceIds': {'original': original['row']['m_iNanoNumber'] if original else None, 'academy': academy['row']['m_iNanoNumber'] if academy else None}, 'originalPowersKnown': all(s['originalPower'] for s in skills)})
        print('NANO', index + 1, '/', len(cache_models), asset_id, display, flush=True)
    except Exception as error:
        traceback.print_exc()
        result['missing'].append({'path': path, 'error': str(error)})

# Include only textures actually used by this catalog's models.
all_textures = {**existing['textures'], **namespace['manifest']['textures']}
for nano in result['nanos']:
    data = json.loads((OUT / 'models' / (nano['asset'] + '.json')).read_text())
    for part in data['parts']:
        for material in part['materials']:
            path = material.get('map')
            if not path:
                continue
            for ident, tex in all_textures.items():
                if tex['map'] == path:
                    result['textures'][ident] = tex
                    break

(OUT / 'nanos-catalog.json').write_text(json.dumps(result, indent=2))
print('CATALOG READY', len(result['nanos']), 'Nanos', len(result['textures']), 'textures', len(result['missing']), 'failures', flush=True)

# Render transparent portraits from the actual extracted textured meshes.
renderer_path = TOOLS / 'render_assets.py'
render_ns = {'__file__': str(renderer_path), '__name__': 'nano_portrait_library'}
exec(compile(renderer_path.read_text().split('\nids=')[0], str(renderer_path), 'exec'), render_ns)
(OUT / 'ui').mkdir(exist_ok=True)
for nano in result['nanos']:
    portrait = OUT.parent / nano['portrait']
    if nano['asset'] in ('nano-buttercup', 'nano-eddy', 'nano-deedee') and portrait.exists():
        continue
    image = render_ns['render'](nano['asset'], size=256, eye=(1.2, .45, 5), transparent=True, label=False)
    image.save(portrait, 'WEBP', quality=92, method=5)
    print('PORTRAIT', nano['asset'], flush=True)

print('DONE', len(result['nanos']), 'selectable Nano models and portraits', flush=True)
