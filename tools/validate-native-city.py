"""Offline validation of the source map export, without a browser or game mutation."""
import json
import pathlib
import sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
DEPS=ROOT/'.tools'
if not (DEPS/'python-deps').exists():DEPS=ROOT.parent/'fusionfall-survival/.tools'
sys.path.insert(0,str(DEPS/'python-deps'))
import numpy as np
OUT=ROOT/'dist/assets/native-city'
nav=json.loads((OUT/'navigation.json').read_text(encoding='utf-8'))
model=json.loads((OUT/'scene.json').read_text(encoding='utf-8'))
catalog=json.loads((OUT/'catalog.json').read_text(encoding='utf-8'))
triangles=[];ground=None
for part in model['parts']:
    vertices=np.array(part['positions']).reshape(-1,3);indices=np.array(part['indices']).reshape(-1,3)
    assert indices.min()>=0 and indices.max()<len(vertices)
    assert len(part['uvs'])==len(vertices)*2
    if part['normals']:
        normals=np.array(part['normals']).reshape(-1,3)
        assert len(normals)==len(vertices) and np.isfinite(normals).all()
    for material in part['materials']:
        if material.get('map'):assert (ROOT/'dist'/material['map']).exists()
    if part['name']=='Original TerrainData_04_04 ground':ground=part
    triangles.append(vertices[indices])
triangles=np.concatenate(triangles);a,b,c=triangles[:,0],triangles[:,1],triangles[:,2]
den=(b[:,2]-c[:,2])*(a[:,0]-c[:,0])+(c[:,0]-b[:,0])*(a[:,2]-c[:,2]);valid=np.abs(den)>1e-8;den[~valid]=1
samples=[]
for kind,points in [('start',[nav['points']['start']]),('spawn',nav['points']['spawns']),('station',nav['points']['stations'])]:
    for point in points:
        x,z=point['x'],point['z'];wa=((b[:,2]-c[:,2])*(x-c[:,0])+(c[:,0]-b[:,0])*(z-c[:,2]))/den;wb=((c[:,2]-a[:,2])*(x-c[:,0])+(a[:,0]-c[:,0])*(z-c[:,2]))/den;wc=1-wa-wb;y=wa*a[:,1]+wb*b[:,1]+wc*c[:,1]
        hits=y[valid&(wa>=-1e-7)&(wb>=-1e-7)&(wc>=-1e-7)&(y<=point['y']+1.8)&(y>=point['y']-2)]
        assert len(hits),(kind,point)
        actual=float(hits.max());error=abs(actual-point['y'])
        samples.append({'kind':kind,'x':x,'z':z,'gridHeight':point['y'],'sourceFloorRay':round(actual,6),'error':round(error,6)})
        assert error<.04,(kind,point,actual)
        row=int(z-nav['originZ']);col=int(x-nav['originX'])
        assert not nav['blocked'][row*nav['cols']+col]
assert ground is not None
render_width=int(nav['renderBounds']['maxX']-nav['renderBounds']['minX'])+1
render_height=int(nav['renderBounds']['maxZ']-nav['renderBounds']['minZ'])+1
ground_vertices=np.array(ground['positions']).reshape(render_height,render_width,3)
dx=int(nav['originX']-nav['renderBounds']['minX']);dz=int(nav['originZ']-nav['renderBounds']['minZ'])
terrain=np.array(nav['terrainHeights']).reshape(nav['rows'],nav['cols'])
terrain_error=float(np.max(np.abs(ground_vertices[dz:dz+nav['rows'],dx:dx+nav['cols'],1]-terrain)))
assert terrain_error<1e-5
heights=np.array(nav['heights']);mask=np.array(nav['sourceFloorMask']);assert np.all(np.abs(heights-np.array(nav['terrainHeights']))[mask==0]<1e-5)
report={'selectedPointRays':samples,'maximumSelectedPointError':max(s['error'] for s in samples),'terrainGridVsRenderedVerticesMaxError':terrain_error,'sourceFloorOverrideSamples':int(mask.sum()),'parts':len(model['parts']),'triangles':sum(len(p['indices'])//3 for p in model['parts']),'textures':len(catalog['textures'])}
(ROOT/'qa').mkdir(exist_ok=True);(ROOT/'qa/native-city-validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Original-city validation passed:',len(samples),'floor rays; max error',report['maximumSelectedPointError'],'m; terrain error',terrain_error,'m;',report['triangles'],'triangles.')
