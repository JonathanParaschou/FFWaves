"""Export original full-size FusionFall NPC heroes, wearables and more guns.

NPC bodies/rigs are distinct from Nano art. Read-only cache extraction; game code
is never changed here. Gameplay balance, attachment fits, and FPS motion are
explicit authored adaptations, not recovered original player-controller data.
"""
import importlib.util
import json
import pathlib
import re
import traceback

PROJECT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = PROJECT / '.tools'
OUT = PROJECT / 'dist' / 'assets'
base = PROJECT / 'tools' / 'extract-fusionfall.py'
ns = {'__file__': str(base), '__name__': 'heroes_asset_export'}
exec(compile(base.read_text().split('\nselected=')[0], str(base), 'exec'), ns)
np = ns['np']
catalog = ns['catalog']
env = ns['env']
CACHE = ns['CACHE']
manifest_file = OUT / 'manifest.json'
prior = json.loads(manifest_file.read_text())
XDT_SOURCE = 'https://github.com/OpenFusionProject/tabledata/blob/master/xdt.json'
xdt = json.loads((TOOLS / 'research' / 'xdt.json').read_text(encoding='utf-8'))

HEROES = {
    'dexter': ('npc_dexter', 'Dexter', '#f78b31', '#c7d9f2'),
    'samuraijack': ('npc_samuraijack', 'Samurai Jack', '#f4ead0', '#d14e42'),
    'buttercup': ('npc_buttercup', 'Buttercup', '#79ca4f', '#d9f8c2'),
    'blossom': ('npc_blossom', 'Blossom', '#f28ba6', '#f6bc64'),
    'eddy': ('npc_eddy', 'Eddy', '#f0d13e', '#e68787'),
    'numbuhfive': ('npc_numbuhfive', 'Numbuh Five', '#4d95d9', '#df5555'),
    'numbuhtwo': ('npc_numbuhtwo', 'Numbuh Two', '#79a5cb', '#ba8b45'),
    'grim': ('npc_grim', 'Grim', '#cdc5e8', '#e4614f'),
    'mac': ('npc_mac', 'Mac', '#d94a3f', '#a9c5e6'),
    'mandark': ('npc_mandark', 'Mandark', '#a88ee0', '#e8c955'),
}
ACCESSORIES = {
    'chowder-hat': ('m_pHatItemTable', 'hat_chowderhat', 'head', .42),
    'pirate-hat': ('m_pHatItemTable', 'hat_pirate', 'head', .34),
    'wizard-hat': ('m_pHatItemTable', 'hat_wizard', 'head', .62),
    'construction-hat': ('m_pHatItemTable', 'hat_constructionhelmet', 'head', .27),
    'artist-beret': ('m_pHatItemTable', 'hat_artisticberet', 'head', .18),
    'monkey-crown': ('m_pHatItemTable', 'hat_monkeykingscrown', 'head', .32),
    'devil-wings': ('m_pBackItemTable', 'back_devilswing', 'back', .9),
    'octi-backpack': ('m_pBackItemTable', 'back_octibackpack', 'back', .65),
    'bounty-pack': ('m_pBackItemTable', 'back_plumber', 'back', .7),
    'rocket-pack': ('m_pBackItemTable', 'back_rocket', 'back', .8),
    'pencil-back': ('m_pBackItemTable', 'back_pencilscabbard', 'back', .95),
    'bigchill-wings': ('m_pBackItemTable', 'back_bigchillwings', 'back', 1.1),
}
WEAPONS = {
    'spitwad': ('rifle_snipercn01', 'rifle', 'precision'),
    'rotation': ('rifle_rotation', 'rifle', 'automatic'),
    'heatblaster': ('pistol_heatblastor', 'pistol', 'energy'),
    'scattergun': ('rifle_verticalshotgun', 'shotgun', 'scatter'),
    'marshmallow': ('thbazooka_marshmallowlauncher', 'cannon', 'explosive'),
    'bracer': ('pistol_bracerblaster', 'pistol', 'burst'),
}

texture_entries = {entry['path']: entry for entry in catalog if entry['type'] == 'Texture2D'}
texture_reuse = {entry['name'].lower().removesuffix('.dds'): entry for entry in prior['textures'].values()}

def export_texture_name(name):
    if not name or name.lower() == 'null':
        return None
    canonical = name.lower().removesuffix('.dds')
    if canonical in texture_reuse:
        return texture_reuse[canonical]
    path = 'texture/' + canonical + '.dds'
    entry = texture_entries.get(path)
    if entry is None:
        return None
    asset = env.get_asset_by_filename(str(CACHE / entry['bundle'] / entry['file']))
    ptr = next(meta['asset'] for candidate, meta in asset.objects[1].contents['m_Container'] if candidate == path)
    value = ns['export_texture'](ptr)
    texture_reuse[canonical] = value
    return value

def selected_npc(model):
    table = xdt['m_pNpcTable']
    for row in table['m_pNpcData']:
        if row['m_iMesh'] < len(table['m_pNpcMeshData']):
            mesh = table['m_pNpcMeshData'][row['m_iMesh']]
            if mesh['m_pstrMMeshModelString'].lower() == model:
                return row, mesh, table['m_pNpcStringData'][row['m_iNpcName']]['m_strName']
    raise KeyError(model)

def selected_item(table_name, model):
    table = xdt[table_name]
    for row in table['m_pItemData']:
        if row['m_iMesh'] < len(table['m_pItemMeshData']):
            mesh = table['m_pItemMeshData'][row['m_iMesh']]
            if mesh['m_pstrMMeshModelString'].lower() == model:
                return row, mesh, table['m_pItemStringData'][row['m_iItemName']]['m_strName']
    raise KeyError(model)

def export_model(asset_id, source, skins):
    ns['extract'](asset_id, source)
    skin = export_texture_name(skins['m_pstrMTextureString'])
    subskin = export_texture_name(skins['m_pstrMTextureString2'])
    if skin is None:
        raise RuntimeError('Missing table-selected skin for ' + asset_id)
    file = OUT / 'models' / (asset_id + '.json')
    data = json.loads(file.read_text())
    for part in data['parts']:
        for mat in part['materials']:
            tex = subskin if subskin and '-sub-' in mat['name'].lower() else skin
            mat['map'] = tex['map']
            mat['alphaTest'] = .3 if tex['alpha'] else 0
    file.write_text(json.dumps(data, separators=(',', ':')))
    entry = ns['manifest']['assets'][asset_id]
    entry['bytes'] = file.stat().st_size
    return entry

spec = importlib.util.spec_from_file_location('hero_original_rigs', PROJECT / 'tools' / 'export-rigs.py')
rig_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rig_module)

def socket_metadata(rig, source_height):
    bones = rig['bones']
    def search(patterns):
        for pattern in patterns:
            found = next((i for i, bone in enumerate(bones) if re.search(pattern, bone['sourceName'], re.I)), None)
            if found is not None:
                bone = bones[found]
                world = np.linalg.inv(np.array(rig['boneInverses'][found]).reshape(4, 4).T)
                position = world[:3, 3]
                return {'index': found, 'name': bone['name'], 'sourceName': bone['sourceName'], 'path': bone['path'], 'sourcePosition': position.round(6).tolist(), 'normalizedPosition': (position / source_height).round(6).tolist()}
        return None
    result = {
        'head': search([r'(?:^|[ :_])head$', r'head']),
        'back': search([r'spine2$', r'spine1$', r'spine$', r'chest']),
        'pelvis': search([r'pelvis$', r'hip$']),
        'leftThigh': search([r'(?:l|left)[ _:]?thigh$', r'left.*thigh', r'l.*hip']),
        'rightThigh': search([r'(?:r|right)[ _:]?thigh$', r'right.*thigh', r'r.*hip']),
        'leftCalf': search([r'(?:l|left)[ _:]?calf$', r'left.*knee', r'l.*leg']),
        'rightCalf': search([r'(?:r|right)[ _:]?calf$', r'right.*knee', r'r.*leg']),
        'leftUpperArm': search([r'(?:l|left)[ _:]?upperarm$', r'left.*arm']),
        'rightUpperArm': search([r'(?:r|right)[ _:]?upperarm$', r'right.*arm']),
        'leftForearm': search([r'(?:l|left)[ _:]?forearm$', r'left.*forearm']),
        'rightForearm': search([r'(?:r|right)[ _:]?forearm$', r'right.*forearm']),
        'leftHand': search([r'(?:l|left)[ _:]?hand$', r'left.*hand']),
        'rightHand': search([r'(?:r|right)[ _:]?hand$', r'right.*hand']),
        'leftFoot': search([r'(?:l|left)[ _:]?foot$', r'left.*foot']),
        'rightFoot': search([r'(?:r|right)[ _:]?foot$', r'right.*foot']),
    }
    return result

result = {
    'format': 'fusionfall-heroes-kit-v1',
    'source': 'Read-only original FusionFall cache; full NPC hero models, source wearables and weapons.',
    'sources': [XDT_SOURCE, 'https://github.com/dongresource/UnityPackFF'],
    'coordinateSystem': 'Right-handed Y-up, original bodies face +Z; model X/Z centered and grounded at Y=0.',
    'adaptationNote': 'Heroes use original NPC meshes and NPC animation clips. This does not claim recovered FusionFall player-controller animations. Attachment fits, normalized gameplay height, weapon archetype behavior, body-visible FPS presentation and crouch/slide offsets are authored adaptations.',
    'heroes': [], 'accessories': [], 'weapons': [], 'assets': {}, 'textures': {}, 'animations': {}, 'failures': [],
}

for slug, (model, display, color, accent) in HEROES.items():
    asset_id = 'hero-' + slug
    source = 'mob/' + model + '.kfm'
    try:
        row, skins, original_name = selected_npc(model)
        entry = export_model(asset_id, source, skins)
        result['assets'][asset_id] = entry
        rig = rig_module.export_rig(asset_id, source, full_clips=True)
        rig_url = 'assets/animations/' + asset_id + '.json'
        clip_names = [clip['name'] for clip in rig['clips']]
        result['animations'][asset_id] = {'url': rig_url, 'source': 'Original full-size NPC skeleton and AnimationClip curves', 'clips': clip_names, 'bones': len(rig['bones'])}
        height = entry['bounds']['size'][1]
        sockets = socket_metadata(rig, height)
        feet = [sockets[k]['sourcePosition'] for k in ('leftFoot', 'rightFoot') if sockets[k]]
        ground_anchor = np.mean(feet, axis=0).tolist() if feet else [0, 0, 0]
        ground_anchor[1] = 0
        head_offset = max(.1, (1 - sockets['head']['normalizedPosition'][1]) * 1.8 * .85) if sockets['head'] else .25
        result['heroes'].append({'id': slug, 'name': display, 'originalName': original_name, 'npcId': row['m_iNpcNumber'], 'asset': asset_id, 'rig': rig_url, 'color': color, 'accent': accent, 'portrait': 'assets/ui/' + asset_id + '.webp', 'sourceHeight': height, 'targetHeight': 1.8, 'scaleToTarget': round(1.8 / height, 6), 'source': source, 'isNano': False, 'grounded': True, 'groundY': 0, 'groundAnchor': ground_anchor, 'forward': '+Z', 'sockets': {k: v['name'] if v else None for k, v in sockets.items()}, 'socketDetails': sockets, 'clips': clip_names, 'animationAvailability': {'idle': any(c.startswith('stand') for c in clip_names), 'walk': 'walk' in clip_names, 'run': 'run' in clip_names, 'attack': any('melee' in c or 'range' in c for c in clip_names), 'originalPlayerClips': False}, 'attachmentFit': {'space': 'normalized hero-root coordinates', 'headPosition': [0, 1, 0], 'backPosition': [0, .64, -.14], 'headOffset': [0, round(head_offset, 5), 0], 'backOffset': [0, 0, -.16], 'offsetUnits': 'world units at targetHeight 1.8', 'note': 'Socket names refer to actual exported ffbone names. Offsets are authored desired model-root-oriented displacements from socket world position; bone-local axes can differ from model-root axes.'}})
        print('HERO READY', asset_id, original_name, 'height', height, 'sockets', {k: v['sourceName'] if v else None for k, v in sockets.items()}, flush=True)
    except Exception as error:
        traceback.print_exc()
        result['failures'].append({'id': asset_id, 'error': str(error)})

for slug, (table, model, slot, fit_height) in ACCESSORIES.items():
    asset_id = 'accessory-' + slug
    source = 'wear/' + model + '.nif'
    try:
        row, skins, name = selected_item(table, model)
        entry = export_model(asset_id, source, skins)
        result['assets'][asset_id] = entry
        result['accessories'].append({'id': slug, 'name': name, 'asset': asset_id, 'slot': slot, 'height': fit_height, 'targetHeight': fit_height, 'sourceHeight': entry['bounds']['size'][1], 'sourceDimensions': entry['bounds']['size'], 'offset': [0, .25, 0] if slot == 'head' else [0, 0, -.16], 'rotation': [0, 0, 0], 'portrait': 'assets/ui/' + asset_id + '.webp', 'attachment': {'preferredSocket': slot, 'anchor': 'bottom' if slot == 'head' else 'center', 'heroRootFallback': [0, 1, 0] if slot == 'head' else [0, .64, -.14], 'fallbackUnits': 'fraction-of-hero-height', 'offsetUnits': 'world units at hero targetHeight 1.8', 'fitIsAuthored': True}, 'sourceItemId': row['m_iItemNumber'], 'sourceTable': table, 'source': source, 'bodyTexture': skins['m_pstrMTextureString'], 'secondaryTexture': skins['m_pstrMTextureString2']})
        print('ACCESSORY READY', asset_id, name, flush=True)
    except Exception as error:
        traceback.print_exc()
        result['failures'].append({'id': asset_id, 'error': str(error)})

for slug, (model, archetype, style) in WEAPONS.items():
    asset_id = 'weapon-' + slug
    source = 'wear/' + model + '.nif'
    try:
        row, skins, name = selected_item('m_pWeaponItemTable', model)
        entry = export_model(asset_id, source, skins)
        result['assets'][asset_id] = entry
        result['weapons'].append({'id': slug, 'name': name, 'asset': asset_id, 'archetype': archetype, 'style': style, 'portrait': 'assets/ui/' + asset_id + '.webp', 'sourceItemId': row['m_iItemNumber'], 'sourceEquipType': row['m_iEquipType'], 'source': source, 'sourceDimensions': entry['bounds']['size'], 'forward': '+Z', 'muzzleNormalized': [0, .6, 1], 'bodyTexture': skins['m_pstrMTextureString'], 'secondaryTexture': skins['m_pstrMTextureString2'], 'behaviorIsFpsAdaptation': True})
        print('WEAPON READY', asset_id, name, flush=True)
    except Exception as error:
        traceback.print_exc()
        result['failures'].append({'id': asset_id, 'error': str(error)})

# Render transparent portraits from actual source geometry and source skins.
render_path = TOOLS / 'render_assets.py'
render_ns = {'__file__': str(render_path), '__name__': 'hero_kit_portraits'}
exec(compile(render_path.read_text().split('\nids=')[0], str(render_path), 'exec'), render_ns)
(OUT / 'ui').mkdir(exist_ok=True)
for record in result['heroes'] + result['accessories'] + result['weapons']:
    eye = (1.2, .45, 5) if record in result['heroes'] else (3, 2, 5)
    image = render_ns['render'](record['asset'], size=320, eye=eye, transparent=True, label=False)
    image.save(OUT.parent / record['portrait'], 'WEBP', quality=92, method=5)

all_textures = {**prior['textures'], **ns['manifest']['textures']}
paths = set()
for asset_id in result['assets']:
    data = json.loads((OUT / 'models' / (asset_id + '.json')).read_text())
    for part in data['parts']:
        paths.update(mat['map'] for mat in part['materials'] if mat.get('map'))
result['textures'] = {ident: tex for ident, tex in all_textures.items() if tex['map'] in paths}
merged = json.loads(manifest_file.read_text())
for field in ('assets', 'textures', 'animations'):
    merged.setdefault(field, {}).update(result[field])
manifest_file.write_text(json.dumps(merged, indent=2))
(OUT / 'heroes-catalog.json').write_text(json.dumps(result, indent=2))
print('HERO KIT COMPLETE', len(result['heroes']), 'heroes', len(result['accessories']), 'accessories', len(result['weapons']), 'guns', len(result['failures']), 'failures', flush=True)
