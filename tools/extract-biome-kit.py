"""Read-only export of authentic woodland and Salvage Yard FusionFall art.

Exports distinct creature models, source skins, original skeletons/clips, and
region-specific prop geometry. Merges only the asset manifest, never game code.
"""
import importlib.util
import json
import pathlib
import traceback

PROJECT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = PROJECT / '.tools'
OUT = PROJECT / 'dist' / 'assets'
base = PROJECT / 'tools' / 'extract-fusionfall.py'
ns = {'__file__': str(base), '__name__': 'biome_asset_export'}
exec(compile(base.read_text().split('\nselected=')[0], str(base), 'exec'), ns)
catalog = ns['catalog']
env = ns['env']
CACHE = ns['CACHE']
manifest_path = OUT / 'manifest.json'
prior = json.loads(manifest_path.read_text())
XDT_SOURCE = 'https://github.com/OpenFusionProject/tabledata/blob/master/xdt.json'
xdt = json.loads((TOOLS / 'research' / 'xdt.json').read_text(encoding='utf-8'))
npc_table = xdt['m_pNpcTable']

enemies = {
    'enemy-spidertoad': ('mob_swampycannibalfrog', 'camp-kidney', 'swamp/creek creature', 2.0),
    'enemy-skeeter': ('mob_greenhellmosquito', 'camp-kidney', 'flying woodland insect', 1.6),
    'enemy-growth': ('mob_crazyguardianent', 'camp-kidney', 'hostile living tree', 3.9),
    'enemy-stalker': ('mob_beastman', 'camp-kidney', 'wildland humanoid predator', 2.0),
    'enemy-dreadhead': ('mob_tirefinger', 'salvage-yard', 'salvaged-tire creature', 2.3),
    'enemy-shocktangler': ('mob_cable', 'salvage-yard', 'industrial cable creature', 2.5),
    'enemy-streetgrinder': ('mob_cleaner', 'salvage-yard', 'hostile industrial sweeper', 2.8),
    'enemy-unisickle': ('mob_sawbike', 'salvage-yard', 'motorized saw-wheel creature', 2.0),
    'enemy-packarachnid': ('mob_redwolfheadspider', 'camp-kidney', 'source-verified Camp Kidney arachnid', 1.7),
    'enemy-scraptyrant': ('mob_junkcar', 'salvage-yard', 'source-verified salvage creature', 2.7),
    'enemy-crashloader': ('mob_crasher', 'salvage-yard', 'source-verified salvage machinery creature', 2.7),
    'enemy-junkasaurus': ('mob_junkdinosaur', 'salvage-yard', 'source-spawn-verified junkyard dinosaur', 3.2),
}
preferred_npc_ids = {'mob_redwolfheadspider': 326, 'mob_junkcar': 309, 'mob_crasher': 107, 'mob_junkdinosaur': 114}
props = {
    'forest-cabin': ('map/campkidney/wd_bwck_house_01.nif', 'camp-kidney', 'Camp Kidney cabin'),
    'forest-cabin-small': ('map/campkidney/wd_bwck_house_02.nif', 'camp-kidney', 'Camp Kidney utility cabin'),
    'forest-tent': ('map/campkidney/wd_bwck_tent_01.nif', 'camp-kidney', 'Camp Kidney tent'),
    'forest-campfire': ('map/campkidney/wd_bwck_campfire_01.nif', 'camp-kidney', 'Camp Kidney fire ring'),
    'forest-log-bench': ('map/campkidney/wd_bwck_bench_01.nif', 'camp-kidney', 'Camp Kidney bench'),
    'forest-picnic-table': ('map/campkidney/wd_bwck_table_01.nif', 'camp-kidney', 'Camp Kidney picnic table'),
    'forest-sign': ('map/campkidney/wd_bwck_sign_02.nif', 'camp-kidney', 'Camp Kidney sign'),
    'forest-bridge': ('map/leakeylake/wd_bwll_bridge_01.nif', 'camp-kidney', 'Leakey Lake wooden bridge'),
    'forest-tree-creek': ('map/leakeylake/wd_bwll_ctree_01.nif', 'camp-kidney', 'Leakey Lake tree'),
    'forest-tree-twisted': ('map/twistedforest/wd_jutf_tree_01.nif', 'camp-kidney', 'Twisted Forest tree'),
    'forest-plant': ('map/twistedforest/wd_jutf_plant 01.nif', 'camp-kidney', 'Twisted Forest undergrowth'),
    'forest-watchtower': ('map/darktree/wd_dldt_watchtower_01.nif', 'camp-kidney', 'Dark Tree watchtower'),
    'waste-forklift': ('map/salvageyard/sb_slsy_forklift.nif', 'salvage-yard', 'Salvage Yard forklift'),
    'waste-press': ('map/salvageyard/sb_slsy_press_01.nif', 'salvage-yard', 'Salvage Yard car press'),
    'waste-crane': ('map/salvageyard/sb_slsy_railcrane01.nif', 'salvage-yard', 'Salvage Yard rail crane'),
    'waste-scrapcar': ('map/salvageyard/sb_slsy_car_a_00.nif', 'salvage-yard', 'Salvage Yard scrapped car'),
    'waste-metal-tree': ('map/salvageyard/sb_slsy_metaltree_a_00.nif', 'salvage-yard', 'Salvage Yard metal structure'),
    'waste-tire-stack': ('map/salvageyard/sb_slsy_etc_tier_00.nif', 'salvage-yard', 'Salvage Yard tire stack'),
    'waste-drum': ('map/salvageyard/sb_slsy_etc_drum_a_00.nif', 'salvage-yard', 'Salvage Yard drum'),
    'waste-bridge': ('map/salvageyard/sb_slsy_bridge_a_00.nif', 'salvage-yard', 'Salvage Yard metal bridge'),
    'waste-cabinet': ('map/salvageyard/sb_slsy_etc_cabinet_00.nif', 'salvage-yard', 'Salvage Yard cabinet'),
    'waste-tv': ('map/salvageyard/sb_slsy_etc_tv_a_00.nif', 'salvage-yard', 'Salvage Yard discarded television'),
    'waste-burnt-tree': ('map/ep/ep_dlfw_burning_trees01.nif', 'salvage-yard', 'Darklands burnt trees'),
    'waste-rock': ('map/devilscanyon/wd_wldc_stone_a_01.nif', 'salvage-yard', 'Devils Canyon rock'),
}
surface_paths = {
    'wild-grass': 'map/tile_01/wd_grass_tile_01.dds',
    'wild-ground': 'map/tile_01/wd_grass_tile_04.dds',
    'wild-stone': 'map/tile_01/wd_stonetile_02.dds',
    'waste-rock': 'map/tile_01/tile_rock_01.dds',
}
kit = {
    'format': 'fusionfall-biome-kit-v1',
    'source': 'Read-only local original FusionFall Unity Web Player cache',
    'sources': [XDT_SOURCE, 'https://github.com/dongresource/UnityPackFF'],
    'placementNote': 'These are source-authentic art assets arranged into new survival maps. Map prop paths prove their original region. Enemy habitat associations below are authored thematic placements inferred from original names/models, not verified original spawn locations.',
    'biomes': {
        'camp-kidney': {'name': 'Camp Kidney', 'evidence': 'Original assets under map/campkidney; neighboring-wildland pieces from map/leakeylake, map/twistedforest and map/darktree are reused for the authored creek/forest survival layout.', 'enemies': [], 'props': []},
        'salvage-yard': {'name': 'Salvage Yard', 'evidence': 'Original machinery, scrap, bridges and structures under map/salvageyard; extra burned trees and canyon rock are supporting authored wasteland set dressing.', 'enemies': [], 'props': []},
    },
    'enemies': {}, 'props': {}, 'assets': {}, 'textures': {}, 'surfaces': {}, 'animations': {}, 'failures': [],
}
texture_entries = {entry['path']: entry for entry in catalog if entry['type'] == 'Texture2D'}
texture_reuse = {entry['name'].lower().removesuffix('.dds'): entry for entry in prior['textures'].values()}

def export_named_texture(path):
    canonical = pathlib.PurePosixPath(path).stem.lower()
    if path.startswith('texture/') and canonical in texture_reuse:
        return texture_reuse[canonical]
    entry = texture_entries[path]
    asset = env.get_asset_by_filename(str(CACHE / entry['bundle'] / entry['file']))
    ptr = next(meta['asset'] for candidate, meta in asset.objects[1].contents['m_Container'] if candidate == path)
    tex = ns['export_texture'](ptr)
    texture_reuse[canonical] = tex
    return tex

def npc_for(model):
    for row in npc_table['m_pNpcData']:
        if model in preferred_npc_ids and row['m_iNpcNumber'] != preferred_npc_ids[model]:
            continue
        ix = row['m_iMesh']
        if ix >= len(npc_table['m_pNpcMeshData']):
            continue
        mesh = npc_table['m_pNpcMeshData'][ix]
        if mesh['m_pstrMMeshModelString'] == model:
            name = npc_table['m_pNpcStringData'][row['m_iNpcName']]['m_strName']
            return row, mesh, name
    raise KeyError(model)

for asset_id, (model, biome, habitat, height) in enemies.items():
    try:
        source = 'mob/' + model + '.kfm'
        row, mesh, name = npc_for(model)
        ns['extract'](asset_id, source)
        skin = export_named_texture('texture/' + mesh['m_pstrMTextureString'].lower() + '.dds')
        second = mesh['m_pstrMTextureString2']
        subskin = export_named_texture('texture/' + second.lower() + '.dds') if second and second.lower() != 'null' else skin
        file = OUT / 'models' / (asset_id + '.json')
        data = json.loads(file.read_text())
        for part in data['parts']:
            for mat in part['materials']:
                tex = subskin if '-sub-' in mat['name'].lower() else skin
                mat['map'] = tex['map']
                mat['alphaTest'] = .3 if tex['alpha'] else 0
        file.write_text(json.dumps(data, separators=(',', ':')))
        entry = ns['manifest']['assets'][asset_id]
        entry['bytes'] = file.stat().st_size
        kit['assets'][asset_id] = entry
        kit['enemies'][asset_id] = {'name': name, 'npcId': row['m_iNpcNumber'], 'source': source, 'bodyTexture': mesh['m_pstrMTextureString'], 'secondaryTexture': second, 'biome': biome, 'suggestedHeight': height, 'habitat': habitat, 'associationEvidence': {'kind': 'authored-theme-inference', 'source': XDT_SOURCE, 'details': f'Original NPC {row["m_iNpcNumber"]} is named {name}; its original model is {model}. The survival biome assignment is inferred from that art/name and is not a claim about original spawn coordinates.'}}
        kit['biomes'][biome]['enemies'].append(asset_id)
    except Exception as error:
        traceback.print_exc()
        kit['failures'].append({'id': asset_id, 'error': str(error)})

for asset_id, (source, biome, name) in props.items():
    try:
        ns['extract'](asset_id, source)
        kit['assets'][asset_id] = ns['manifest']['assets'][asset_id]
        region = source.split('/')[1]
        kit['props'][asset_id] = {'name': name, 'biome': biome, 'source': source, 'associationEvidence': {'kind': 'original-asset-region-path', 'regionFolder': region, 'details': 'Original region is identified by the asset path. Reuse in this survival biome is authored.'}}
        kit['biomes'][biome]['props'].append(asset_id)
    except Exception as error:
        traceback.print_exc()
        kit['failures'].append({'id': asset_id, 'error': str(error)})

for name, path in surface_paths.items():
    try:
        kit['surfaces'][name] = export_named_texture(path)
        kit['surfaces'][name]['source'] = path
    except Exception as error:
        kit['failures'].append({'id': name, 'error': str(error)})

# Export the same source skeleton/clip format used by the existing runtime.
spec = importlib.util.spec_from_file_location('biome_rig_export', PROJECT / 'tools' / 'export-rigs.py')
rig_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rig_module)
for asset_id in kit['enemies']:
    try:
        data = rig_module.export_rig(asset_id, kit['assets'][asset_id]['source'])
        file = OUT / 'animations' / (asset_id + '.json')
        entry = {'url': 'assets/animations/' + asset_id + '.json', 'source': 'Original FusionFall skeleton and AnimationClip curves', 'bones': len(data['bones']), 'clips': [c['name'] for c in data['clips']], 'bytes': file.stat().st_size}
        kit['animations'][asset_id] = entry
        kit['enemies'][asset_id]['animation'] = entry['url']
    except Exception as error:
        traceback.print_exc()
        kit['failures'].append({'id': asset_id + '-rig', 'error': str(error)})

# Native associations verified against original mission and main-world spawn data.
# The eight first-pass habitat guests remain available, but are not mislabeled as
# original region natives. Source files remain ignored extraction references.
mission_native = {
    'enemy-packarachnid': {'npcId': 326, 'missionStringIndices': [11803], 'location': 'Camp Kidney', 'method': 'Original mission text explicitly names Pack Arachnids in Camp Kidney.'},
    'enemy-scraptyrant': {'npcId': 309, 'missionStringIndices': [4715, 4716], 'location': 'Salvage Yard / Goat\'s Junk Yard', 'method': 'Original mission text explicitly links Scrap Tyrants to the salvage yard.'},
    'enemy-crashloader': {'npcId': 107, 'missionStringIndices': [348, 349, 350], 'location': 'Salvage Yard / Goat\'s Junk Yard', 'method': 'Linked original mission strings describe defending the salvage yard from Crash Loaders and protecting Goat\'s Junk Yard.'},
    'enemy-junkasaurus': {'npcId': 114, 'missionStringIndices': [4309, 4311, 4312, 4317], 'location': 'Goat\'s Junk Yard area', 'method': 'Linked original mission strings identify defending Megas in the junk yard, Junkasaurus Wrecks patrolling outside it, and related enemies inside its infected zone. Main-world spawn rows and the map09_06 prefab provide supporting spatial evidence.'},
}
for asset_id, enemy in kit['enemies'].items():
    enemy['originalRegionNative'] = asset_id in mission_native
    if asset_id in mission_native:
        enemy['nativeEvidence'] = {**mission_native[asset_id], 'source': XDT_SOURCE, 'spawnSource': 'https://github.com/OpenFusionProject/tabledata/blob/master/mobs.json'}
        enemy['associationEvidence'] = {'kind': 'primary-mission-and-spawn-data', **enemy['nativeEvidence']}
    else:
        enemy['placementStatus'] = 'authored themed guest; original region not asserted'
kit['nativeAliases'] = {
    'wild-stinger': {'name': 'Wild Stinger', 'npcId': 133, 'asset': 'enemy-skeeter', 'biome': 'camp-kidney', 'originalRegionNative': True, 'sameOriginalMeshAndSkins': True, 'source': XDT_SOURCE, 'missionStringIndices': [11768, 11770, 11771], 'method': 'Original mission text places Wild Stingers and their collected stingers at Camp Kidney. NPC133 uses exactly the model/body/secondary texture already exported as enemy-skeeter.'}
}
kit['nativePools'] = {'camp-kidney': ['wild-stinger', 'enemy-packarachnid'], 'salvage-yard': ['enemy-scraptyrant', 'enemy-crashloader', 'enemy-junkasaurus']}
kit['habitatCorrections'] = {
    'enemy-skeeter': 'Wild Skeeter is a real dataset name; use source-verified Wild Stinger alias for explicit Camp Kidney native identity.',
    'enemy-spidertoad': 'Spider Toad main-world spawns are chiefly around Pimpleback Mountains; neighboring frog variants occur around Really Twisted Forest.',
    'enemy-growth': 'Ghoulish Growth occurs around the Jungle Outpost / Mount Blackhead; a few source spawn rows are close to Camp Kidney, but this does not prove an exact region boundary.',
    'enemy-stalker': 'Canyon Stalker main-world spawns cluster around Devil\'s Bluff, not Camp Kidney.',
    'enemy-dreadhead': 'Dread Head is a genuine XDT name. Nearby original main-world junkyard spawns use the Tread Head variant of the same tire model.',
    'enemy-shocktangler': 'Shocktangler mission text explicitly names Sector V; main-world cable-model spawns also occur near Goat\'s Junk Yard. Retained as a themed guest unless exact spawn boundary evidence is added.',
    'enemy-streetgrinder': 'Original main-world spawns cluster around City Station / City Point, not Salvage Yard.',
    'enemy-unisickle': 'Original main-world spawns cluster around Downtown locations (Townsville Park / City Hall / City Station / Habitat Homes), not Salvage Yard.',
}
kit['sources'].append('https://github.com/OpenFusionProject/tabledata/blob/master/mobs.json')

# Retain only new textures referenced by the exported art and surface entries.
all_textures = {**prior['textures'], **ns['manifest']['textures']}
paths = {s['map'] for s in kit['surfaces'].values()}
for asset_id in kit['assets']:
    data = json.loads((OUT / 'models' / (asset_id + '.json')).read_text())
    for part in data['parts']:
        paths.update(mat['map'] for mat in part['materials'] if mat.get('map'))
for ident, texture in all_textures.items():
    if texture['map'] in paths:
        kit['textures'][ident] = texture

# Transparent menu/reference portraits are rendered from the source meshes.
renderer = TOOLS / 'render_assets.py'
portrait_ns = {'__file__': str(renderer), '__name__': 'biome_portrait_library'}
exec(compile(renderer.read_text().split('\nids=')[0], str(renderer), 'exec'), portrait_ns)
(OUT / 'ui').mkdir(exist_ok=True)
for asset_id, enemy in kit['enemies'].items():
    path = 'assets/ui/' + asset_id + '.webp'
    portrait_ns['render'](asset_id, size=256, transparent=True, label=False).save(OUT.parent / path, 'WEBP', quality=92, method=5)
    enemy['portrait'] = path

# Merge against the newest manifest so unrelated completed additions are retained.
merged = json.loads(manifest_path.read_text())
for field in ('assets', 'textures', 'surfaces', 'animations'):
    merged.setdefault(field, {}).update(kit[field])
manifest_path.write_text(json.dumps(merged, indent=2))
(OUT / 'biome-kit.json').write_text(json.dumps(kit, indent=2))
print('BIOME KIT READY', len(kit['enemies']), 'enemy models;', len(kit['props']), 'props;', len(kit['animations']), 'rigs;', len(kit['failures']), 'failures', flush=True)
