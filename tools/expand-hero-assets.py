"""Incrementally export additional original NPCs, wearables and melee models.

Reads the original Unity cache only. Existing exported catalog records are kept;
the primary local catalog is never replaced. Run scan-extra-assets.py first.
"""
import json
import pathlib

PROJECT = pathlib.Path(__file__).resolve().parent.parent
source = PROJECT / 'tools' / 'extract-heroes-kit.py'
namespace = {'__file__': str(source), '__name__': 'incremental_hero_assets'}
text = source.read_text()
exec(compile(text.split('\nresult = {')[0], str(source), 'exec'), namespace)
extra_file = PROJECT / '.tools' / 'extra-catalog.json'
if not extra_file.exists():
    raise RuntimeError('Run python tools/scan-extra-assets.py first.')
catalog = namespace['catalog'] + json.loads(extra_file.read_text())
namespace['catalog'] = catalog
namespace['ns']['catalog'] = catalog
namespace['rig_module'].catalog = catalog
namespace['texture_entries'] = {entry['path']: entry for entry in catalog if entry['type'] == 'Texture2D'}

heroes = {
    'bubbles': ('npc_bubbles', 'Bubbles', '#78b8eb', '#ead96d'),
    'deedee': ('npc_deedee', 'Dee Dee', '#ed8cae', '#ead96d'),
    'ed': ('npc_ed', 'Ed', '#78a663', '#e4cd86'),
    'edd': ('npc_edd', 'Double D', '#df8550', '#545b60'),
    'billy': ('npc_billy', 'Billy', '#d8dbe5', '#ed6f5b'),
    'mandy': ('npc_mandy', 'Mandy', '#ec8ba6', '#e9d171'),
    'numbuhone': ('npc_numbuhone', 'Numbuh One', '#d96156', '#b7d1d9'),
    'numbuhthree': ('npc_numbuhthree', 'Numbuh Three', '#84b86a', '#e3c96f'),
    'numbuhfour': ('npc_numbuhfour', 'Numbuh Four', '#e29f50', '#e7d08e'),
    'eduardo': ('npc_eduardo', 'Eduardo', '#a180bd', '#e6dbb5'),
    'wilt': ('npc_wilt', 'Wilt', '#cd6157', '#e7d6a8'),
    'bloo': ('npc_blooexpressions', 'Bloo', '#6d9fe4', '#d7e6ed'),
    'gwen': ('npc_gwen', 'Gwen', '#be6b57', '#acc4db'),
    'mojojojo': ('npc_mojojojo', 'Mojo Jojo', '#83b26b', '#b9b1db'),
}
accessories = {
    'bean-scout-hat': ('m_pHatItemTable', 'hat_beanscouthat', 'head', .3),
    'samurai-helmet': ('m_pHatItemTable', 'helmet_sjarmor', 'head', .42),
    'xlr8-helmet': ('m_pHatItemTable', 'helmet_b10xlr8speedhelmet', 'head', .35),
    'flight-helmet': ('m_pHatItemTable', 'hat_numbuhtow', 'head', .34),
    'angel-wings': ('m_pBackItemTable', 'back_angelswing', 'back', 1.0),
    'samurai-scabbard': ('m_pBackItemTable', 'back_scabbards_02', 'back', .95),
    'dexstar-pack': ('m_pBackItemTable', 'back_dexstar', 'back', .8),
    'fosters-skatepack': ('m_pBackItemTable', 'back_bloo', 'back', .7),
}
weapons = {
    'sword': ('sword_sjkatana', 'melee', 'blade'),
    'hammer': ('sword_gavel', 'melee', 'heavy'),
    'bat': ('sword_baseballbat', 'melee', 'club'),
}

out = PROJECT / 'dist' / 'assets'
prior = json.loads((out / 'heroes-catalog.json').read_text())
added = {field: [] for field in ('heroes', 'accessories', 'weapons', 'failures')}
added.update({field: {} for field in ('assets', 'textures', 'animations')})
namespace['result'] = added
for key, records in [('HEROES', heroes), ('ACCESSORIES', accessories), ('WEAPONS', weapons)]:
    field = {'HEROES': 'heroes', 'ACCESSORIES': 'accessories', 'WEAPONS': 'weapons'}[key]
    existing = {record['id'] for record in prior[field]}
    namespace[key] = {slug: value for slug, value in records.items() if slug not in existing}
loops = text[text.index('for slug, (model, display, color, accent)'):text.index('\n# Render transparent portraits')]
exec(compile(loops, str(source), 'exec'), namespace)
for record in added['weapons']:
    if record['archetype'] == 'melee':
        record.update(forward='+Y', bladeAxis='+Y', gripNormalized=[0, .08, 0])
        record.pop('muzzleNormalized', None)

render_path = PROJECT / '.tools' / 'render_assets.py'
render_namespace = {'__file__': str(render_path), '__name__': 'incremental_asset_portraits'}
exec(compile(render_path.read_text().split('\nids=')[0], str(render_path), 'exec'), render_namespace)
for record in added['heroes'] + added['accessories'] + added['weapons']:
    eye = (1.2, .45, 5) if record in added['heroes'] else (3, 2, 5)
    image = render_namespace['render'](record['asset'], size=320, eye=eye, transparent=True, label=False)
    image.save(PROJECT / 'dist' / record['portrait'], 'WEBP', quality=92, method=5)

latest = json.loads((out / 'manifest.json').read_text())
all_textures = {**latest['textures'], **namespace['ns']['manifest']['textures']}
paths = set()
for asset_id in added['assets']:
    model = json.loads((out / 'models' / (asset_id + '.json')).read_text())
    for part in model['parts']:
        paths.update(material['map'] for material in part['materials'] if material.get('map'))
added['textures'] = {key: value for key, value in all_textures.items() if value['map'] in paths}
for field in ('assets', 'textures', 'animations'):
    latest.setdefault(field, {}).update(added[field])
    prior.setdefault(field, {}).update(added[field])
for field in ('heroes', 'accessories', 'weapons', 'failures'):
    prior[field].extend(added[field])
prior['expansionSource'] = 'Additional original cached dongresource bundles indexed read-only; melee behavior is an authored FPS adaptation.'
(out / 'manifest.json').write_text(json.dumps(latest, indent=2))
(out / 'heroes-catalog.json').write_text(json.dumps(prior, indent=2))
print('EXPANDED', {field: len(added[field]) for field in ('heroes', 'accessories', 'weapons', 'failures')}, flush=True)
print('TOTAL', {field: len(prior[field]) for field in ('heroes', 'accessories', 'weapons')}, flush=True)
