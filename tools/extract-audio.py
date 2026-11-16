import pathlib; exec((pathlib.Path(__file__).resolve().parent/'catalog-fusionfall.py').read_text().split('entries=[]')[0])
entries=json.loads((ROOT/'catalog.json').read_text())
for folder in ['fusound_2eresourceFile','effects_2eresourceFile']:
 for file in (CACHE/folder).glob('CustomAssetBundle*'):
  a=env.get_asset_by_filename(str(file))
  for path,meta in a.objects[1].contents['m_Container']:
   p=meta['asset']
   if p.object.type=='AudioClip':entries.append({'bundle':folder,'file':file.name,'path':path})
print('\n'.join(sorted(set(e['path'] for e in entries if any(k in e['path'].lower() for k in ['shoot','shot','fire','gun','rifle','pistol','burst','launch','reload']))))[:20000])
(ROOT/'audio_catalog.json').write_text(json.dumps(entries))
OUT=ROOT.parent/'dist/assets';(OUT/'audio').mkdir(exist_ok=True)
selected={
 'pistol':'sound/laserltuser-01.wav','rifle':'sound/laserhvyuser-02.wav','shotgun':'sound/shellhvyuser-01.wav','cannon':'sound/slimehvyuser-01.wav',
 'nano':'sound/nano ability 03.wav','pickup':'sound/pickup_pickup1.wav','kill':'sound/rewardfusion_root_generic.wav','equip':'ui sound/weapon_equipped.wav','nano-equip':'ui sound/nano_equipped.wav',
 'impact':'sound/02 rifle impact.wav',
 'nano-buttercup':'sound/stun_root_generic.wav','nano-eddy':'sound/heal_root_generic.wav','nano-deedee':'sound/damage_deedee_ponypuffpirouette.wav',
 'voice-buttercup':'sound/btrcup_nanpwrmf01_01.wav','voice-eddy':'sound/eddy_nanpwrjb01.wav','voice-deedee':'sound/deedee_nanpwrpony01.wav'
}
audio={}
for key,path in selected.items():
 try:
  e=next(e for e in entries if e['path']==path and (e.get('type')=='AudioClip' or e['bundle']=='effects_2eresourceFile'))
  a=env.get_asset_by_filename(str(CACHE/e['bundle']/e['file']));ptr=next(m['asset'] for p,m in a.objects[1].contents['m_Container'] if p==path);clip=ptr.resolve();blob=clip.audio_data
  ext='ogg' if blob[:4]==b'OggS' else 'wav' if blob[:4]==b'RIFF' else None
  if not ext:print('UNSUPPORTED',key,blob[:10],len(blob));continue
  file=OUT/'audio'/f'{key}.{ext}';file.write_bytes(blob);audio[key]={'url':f'assets/audio/{file.name}','source':path,'bytes':len(blob)};print('SAVED',key,ext,len(blob),flush=True)
 except Exception:traceback.print_exc()
manifest=json.loads((OUT/'manifest.json').read_text());manifest['audio']=audio;(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))

