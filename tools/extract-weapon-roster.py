"""Recover 30 additional distinct original guns, original table skins and names.

The cache is read-only. FPS balance, classifications and hand fits are adaptations.
Uses the same locally cached UnityPackFF/dependencies as previous extraction tools.
"""
import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEPS = ROOT.parent / 'fusionfall-survival/.tools'
OUT = ROOT / 'dist/assets'
base = ROOT / 'tools/extract-fusionfall.py'
code = base.read_text().split('\nselected=')[0]
code = code.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent/'.tools'", 'ROOT=pathlib.Path(' + repr(str(DEPS)) + ')')
code = code.replace("OUT=ROOT.parent/'dist/assets'", 'OUT=pathlib.Path(' + repr(str(OUT)) + ')')
ns = {'__file__': str(base), '__name__': 'expanded_weapon_export'}
exec(compile(code, str(base), 'exec'), ns)
xdt = json.loads((DEPS / 'research/xdt.json').read_text(encoding='utf-8'))
table = xdt['m_pWeaponItemTable']
manifest_path = OUT / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
texture_index = {e['path'].lower(): e for e in ns['catalog'] if e['type'] == 'Texture2D'}
reuse = {t['name'].lower().removesuffix('.dds'): t for t in manifest['textures'].values()}
audio_index = {e['path'].lower(): e for e in json.loads((DEPS / 'audio_catalog.json').read_text()) if e.get('type') == 'AudioClip' or e['bundle'] == 'effects_2eresourceFile'}
weapon_sounds = {}

def firing_sound(ident, row):
    path = 'sound/' + table['m_pItemSoundData'][row['m_iSound1']]['m_pstrSoundString1'].lower()
    entry = audio_index.get(path)
    if not entry:
        raise RuntimeError('Missing original weapon sound: ' + path)
    key = 'weapon-fire-' + Path(path).stem
    if key not in manifest['audio']:
        asset = ns['env'].get_asset_by_filename(str(ns['CACHE'] / entry['bundle'] / entry['file']))
        ptr = next(m['asset'] for p,m in asset.objects[1].contents['m_Container'] if p.lower() == path)
        data = ptr.resolve().audio_data
        suffix = '.ogg' if data[:4] == b'OggS' else '.wav'
        url = 'assets/audio/' + key + suffix
        (ROOT / 'dist' / url).write_bytes(data)
        manifest['audio'][key] = {'url': url, 'source': path, 'bundle': entry['bundle'], 'bytes': len(data), 'sourceSoundId': row['m_iSound1']}
    weapon_sounds[ident] = key
    return key

# ID, original mesh, class, magazine, damage, interval, reload, spread, range, pellets, effect, splash.
selection = [
 ('beamer','pistol_ak1beamgun','SIDEARM',20,36,.19,1.5,.015,65,1,'laser',0),
 ('bean-cannon','pistol_beangun','SIDEARM',10,62,.38,1.8,.018,55,1,'plasma',0),
 ('blue-wing','pistol_bluewinggun','SIDEARM',18,26,.145,1.4,.022,60,1,'ice',0),
 ('crayon','pistol_crayon','SIDEARM',16,33,.18,1.45,.016,60,1,'bullet',0),
 ('crystal','pistol_cristalpistol','SIDEARM',7,95,.52,1.8,.008,80,1,'ice',0),
 ('pop-gun','pistol_icebargun','SIDEARM',26,20,.11,1.65,.028,50,1,'ice',0),
 ('zip-zapper','pistol_raygun','SIDEARM',15,47,.27,1.65,.013,70,1,'electric',0),
 ('toxic-heater','pistol_poisongun','SIDEARM',9,78,.5,1.9,.018,50,1,'toxic',.8),
 ('cyber-auto','rifle_cyberautorifle','ASSAULT RIFLE',32,27,.085,1.95,.02,85,1,'laser',0),
 ('shuttlegun','rifle_shuttlegun','SMG',28,24,.075,1.8,.03,68,1,'bullet',0),
 ('scampp','rifle_phlazer','ASSAULT RIFLE',36,24,.08,2,.023,75,1,'laser',0),
 ('piston','rifle_railponitgun','MARKSMAN RIFLE',18,68,.28,2,.006,95,1,'bullet',0),
 ('anubis','rifle_ppganubislaser','ASSAULT RIFLE',24,43,.15,1.9,.015,90,1,'plasma',0),
 ('ripper','rifle_rightangle','SMG',40,20,.065,2,.035,55,1,'bullet',0),
 ('lightning','rifle_electricgun','ENERGY RIFLE',20,47,.18,2.2,.018,65,1,'electric',0),
 ('firespike','rifle_firespikerifle','ASSAULT RIFLE',25,39,.13,1.95,.018,85,1,'flame',0),
 ('airbrush','rifle_paintballshooter','SMG',45,18,.06,2.3,.04,55,1,'plasma',0),
 ('super-scope','rifle_bigscope','SNIPER RIFLE',6,235,1.3,2.7,.0018,140,1,'laser',0),
 ('recon','rifle_shortsniper','MARKSMAN RIFLE',12,98,.38,2,.005,105,1,'bullet',0),
 ('needlenose','rifle_wingsniper','SNIPER RIFLE',7,185,.95,2.3,.0025,120,1,'ice',0),
 ('galvanized','rifle_steeltubesniper','SNIPER RIFLE',5,270,1.45,2.8,.0015,150,1,'electric',0),
 ('bunsen','rifle_snipercn02','MARKSMAN RIFLE',10,120,.52,2.25,.004,110,1,'flame',0),
 ('cheezooka','rifle_cheezookashotgun','SCATTERGUN',7,20,.7,2.35,.10,26,9,'scatter',0),
 ('cheese-spreader','pistol_cheesegun','SCATTERGUN',10,17,.48,2,.11,19,6,'scatter',0),
 ('snotgun','pistol_kndshotgun','SCATTERGUN',5,22,1,2.6,.12,22,10,'toxic',0),
 ('sharkbite','rifle_sharkshotgun','SCATTERGUN',9,21,.62,2.5,.09,27,7,'scatter',0),
 ('gatling-gum','rifle_autogatlingun','LMG',75,23,.07,3.5,.038,70,1,'bullet',0),
 ('thumper','rifle_kndthumper','LAUNCHER',2,290,1.55,3,.015,65,1,'plasma',6.5),
 ('chill-caster','rifle_bigchillcaster','ENERGY RIFLE',22,38,.15,2.2,.02,60,1,'ice',0),
 ('atomic-engine','rifle_jetengineshotgun','LAUNCHER',5,145,.85,2.8,.018,55,1,'flame',3.5),
]
effects = {
 'bullet': ('muzzle-shot','projectile','impact-star','#ffe0ab',.09,520,.28,False),
 'laser': ('energy-ring','laser','impact-ring','#a3e8ff',.12,700,.30,True),
 'plasma': ('energy-ring','energy-plasma','impact-ring','#92ffb4',.22,270,.38,True),
 'ice': ('energy-ring','energy-bolt','impact-star','#a9edff',.16,400,.30,True),
 'electric': ('muzzle-scatter','energy-bolt','impact-ring','#b6baff',.15,580,.34,True),
 'toxic': ('energy-ring','mega-projectile','impact-burst','#c4ff71',.22,230,.35,True),
 'flame': ('nano-fire','energy-bolt','impact-burst','#ffb56e',.18,330,.38,True),
 'scatter': ('muzzle-scatter','projectile','impact-burst','#ffda88',.10,350,.50,False),
}

def texture(name):
    key = name.lower().removesuffix('.dds')
    if key in reuse:
        return reuse[key]
    e = texture_index.get('texture/' + key + '.dds')
    if not e:
        raise RuntimeError('Missing original skin ' + name)
    asset = ns['env'].get_asset_by_filename(str(ns['CACHE'] / e['bundle'] / e['file']))
    ptr = next(m['asset'] for p, m in asset.objects[1].contents['m_Container'] if p.lower() == e['path'].lower())
    reuse[key] = ns['export_texture'](ptr)
    return reuse[key]

records = {}
for ident, mesh_name, kind, mag, damage, interval, reload, spread, distance, pellets, effect, splash in selection:
    row = next(r for r in table['m_pItemData'] if table['m_pItemMeshData'][r['m_iMesh']]['m_pstrMMeshModelString'].lower() == mesh_name)
    skin = table['m_pItemMeshData'][row['m_iMesh']]
    name = table['m_pItemStringData'][row['m_iItemName']]['m_strName']
    asset_id = 'weapon-' + ident
    ns['extract'](asset_id, 'wear/' + mesh_name + '.nif')
    primary = texture(skin['m_pstrMTextureString'])
    secondary = texture(skin['m_pstrMTextureString2']) if skin['m_pstrMTextureString2'].lower() not in ('null','') else None
    model_path = OUT / 'models' / (asset_id + '.json')
    model = json.loads(model_path.read_text())
    for part in model['parts']:
        for mat in part['materials']:
            tex = secondary if secondary and '-sub-' in mat['name'].lower() else primary
            mat['map'] = tex['map']
            mat['alphaTest'] = .3 if tex['alpha'] else 0
    model_path.write_text(json.dumps(model, separators=(',', ':')))
    entry = ns['manifest']['assets'][asset_id]
    entry['bytes'] = model_path.stat().st_size
    archetype = 'pistol' if kind == 'SIDEARM' else 'shotgun' if kind == 'SCATTERGUN' else 'cannon' if kind == 'LAUNCHER' else 'rifle'
    muzzle, bullet, impact, color, size, speed, flash, energy = effects[effect]
    length = .45 if mesh_name.startswith('pistol') else .84 if archetype == 'cannon' or 'SNIPER' in kind else .76
    dims = model['bounds']['size']
    length = min(length, .43*dims[2]/dims[1], .52*dims[2]/dims[0])
    records[ident] = dict(id=ident, name=name, type=kind, archetype=archetype, asset=asset_id, portrait='assets/ui/'+asset_id+'.webp',
        mag=mag, reserve=mag*(7 if archetype=='cannon' else 8), damage=damage, pellets=pellets, interval=interval, reload=reload, spread=spread, range=distance,
        adsScale=.52 if kind=='SNIPER RIFLE' else .68 if kind=='MARKSMAN RIFLE' else .84 if kind=='SMG' else .78, color=color, cost=1500 if archetype=='cannon' else 1100 if 'SNIPER' in kind else 700,
        sourceItemId=row['m_iItemNumber'], sourceEquipType=row['m_iEquipType'], source='wear/'+mesh_name+'.nif', sound=firing_sound(ident,row), recoil=1.6 if kind=='SNIPER RIFLE' else 1.25 if kind=='MARKSMAN RIFLE' else .65 if kind=='SMG' else .8 if kind=='LMG' else 1,
        bodyTexture=skin['m_pstrMTextureString'], secondaryTexture=skin['m_pstrMTextureString2'], behaviorIsFpsAdaptation=True,
        fx=dict(muzzle=muzzle,bullet=bullet,impact=impact,color=color,size=size,speed=speed,flash=flash,energy=energy,blast=splash>3),
        presentation=dict(length=round(length,4),frameAnchor=[0,.20,-.18],trigger=[0,.25,-.29],support=[0,.25,-.29] if mesh_name.startswith('pistol') else [0,.35,.12],hip=[.24,-.40,-.80],snapGrips=True))
    if splash:
        records[ident]['splash'] = splash
    print('ROSTER', name, kind, flush=True)

legacy_models={'pistol':'pistol_b10','rifle':'rifle_microscopegun','shotgun':'rifle_bruningshotgun','cannon':'thbazooka_bioplasmacannon','spitwad':'rifle_snipercn01','rotation':'rifle_rotation','heatblaster':'pistol_heatblastor','scattergun':'rifle_verticalshotgun','marshmallow':'thbazooka_marshmallowlauncher','bracer':'pistol_bracerblaster'}
for ident, mesh_name in legacy_models.items():
    row=next(r for r in table['m_pItemData'] if table['m_pItemMeshData'][r['m_iMesh']]['m_pstrMMeshModelString'].lower()==mesh_name)
    firing_sound(ident,row)
manifest['assets'].update(ns['manifest']['assets'])
manifest['textures'].update(ns['manifest']['textures'])
manifest_path.write_text(json.dumps(manifest, indent=2))
(ROOT / 'dist/weapon-roster.js').write_text('// Generated original identities/skins plus authored FPS balance. See tools/extract-weapon-roster.py.\nexport const EXPANDED_WEAPONS=' + json.dumps(records, separators=(',', ':')) + ';\nexport const WEAPON_SOUNDS='+json.dumps(weapon_sounds,separators=(',',':'))+';\n')
(OUT / 'weapon-roster.json').write_text(json.dumps({'source': 'Read-only FusionFall cache and original OpenFusion xdt weapon table', 'sourceTable': 'm_pWeaponItemTable', 'sourceTableSha256':hashlib.sha256((DEPS/'research/xdt.json').read_bytes()).hexdigest(), 'sourceTableUrl': 'https://github.com/OpenFusionProject/tabledata/blob/master/xdt.json', 'adaptation': 'Names/models/skins are original; FPS roles, statistics, effects and hand fitting are authored.', 'weapons': list(records.values()),'firingSounds':weapon_sounds}, indent=2))

# Existing software portrait renderer, pointed at this checkout rather than the old project.
renderer = (DEPS / 'render_assets.py').read_text().split('\nids=')[0]
renderer = renderer.replace("ROOT=pathlib.Path(__file__).resolve().parent.parent", 'ROOT=pathlib.Path(' + repr(str(ROOT)) + ')')
render_ns = {'__file__': str(DEPS / 'render_assets.py'), '__name__': 'roster_portraits'}
exec(compile(renderer, 'roster_portraits', 'exec'), render_ns)
for record in records.values():
    image = render_ns['render'](record['asset'], size=256, eye=(3,2,5), transparent=True, label=False)
    image.save(ROOT / 'dist' / record['portrait'], 'WEBP', quality=90, method=5)
print('Complete:', len(records), 'new original guns; zero placeholder models.')
