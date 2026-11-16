"""Read-only export of a coherent original FusionFall town-square kit."""
import pathlib,json
base=pathlib.Path(__file__).with_name('extract-fusionfall.py')
ns={'__file__':str(base),'__name__':'mapkit_export'}
exec(base.read_text().split('\nselected={')[0],ns)
selected={
 'town-building-1':'map/dtetc/dt_mtdb_buil01.nif',
 'town-building-2':'map/dtetc/dt_mtdb_buil02.nif',
 'town-building-3':'map/dtetc/dt_mtdb_buil03.nif',
 'town-building-4':'map/dtetc/dt_mtdb_buil04.nif',
 'town-bank':'map/dtetc/dt_mtdb_bank.nif',
 'town-firestation':'map/dtetc/dt_mtdb_firestation.nif',
 'town-fountain':'map/dtetc/dt_mtdb_fountain_01.nif',
 'town-fountain-small':'map/dtetc/dt_mtdb_fountain_02.nif',
 'town-burger':'map/dexter/sb_sbdx_burgerfrenzy.nif',
 'town-candy':'map/dexter/sb_sbdx_jellyscandy.nif',
 'town-park':'map/technologysquare/dt_sdts_park_01.nif',
 'town-monorail':'map/technologysquare/dt_sdts_monorail_01.nif',
 'town-monorail-bend':'map/technologysquare/dt_sdts_monorail_bend_01.nif',
 'town-busstop':'map/dtetc/dt_etc_busstop01.nif',
 'town-trash':'map/dtetc/dt_etc_dustbin_01.nif',
 'town-pickup':'map/dtetc/dt_etc_pickupcar_a_01.nif',
 'town-firetruck':'map/dtetc/dt_etc_firecar_c_00.nif',
 'town-trees':'map/dtetc/dt_tree_12.nif',
 'town-planter':'map/dexter/sb_sbdx_flowerbed04.nif',
 'yard-garage':'map/nuclearplant/sb_otnp_garagetruck.nif',
 'yard-cylinder':'map/nuclearplant/sb_otnp_etc_cylinder_02.nif',
 'yard-preservatory':'map/nuclearplant/sb_otnp_preservatory_01.nif',
 'yard-fence':'map/nuclearplant/sb_otnp_fence_50.nif',
}
for asset,path in selected.items():
 try:ns['extract'](asset,path)
 except Exception as e:print('MAP ASSET FAILED',asset,repr(e),flush=True)
(ns['OUT']/'map-kit.json').write_text(json.dumps(ns['manifest'],indent=2))
print('MAP KIT COMPLETE',len(ns['manifest']['assets']),flush=True)
