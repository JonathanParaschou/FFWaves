"""Convert the published NZ:P Nacht map source without rearranging its geometry.

Source-derived geometry and navigation are CC BY-SA 4.0, credited in the snapshot.
The original CoD map is a reference; this source is NZ:P's published recreation.
Python 3 + numpy + Pillow. Run from any directory; no game installation is needed.
"""
from pathlib import Path
from collections import Counter, defaultdict, deque
from itertools import combinations
import hashlib
import json
import math
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
for extra in (ROOT/'.tools/python-deps', ROOT.parent/'fusionfall-survival/.tools/python-deps'):
    if extra.exists(): sys.path.insert(0, str(extra))
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = ROOT/'dist/assets/reference-bunker'
DOC = ROOT/'docs/reference/NZP-Nacht'
QA = ROOT/'qa'
COMMIT = 'e147b116b2ade3920193a5b8839f6cc7e46da4a4'
SOURCE_URL = f'https://raw.githubusercontent.com/nzp-team/assets/{COMMIT}/source/maps/ndu/ndu.map'
SOURCE_SHA = 'e6ab600be27a3eb3981ae4bbbe7a88c65e4c5b06936428ca8d13ca3d76cf7f88'
ORIGIN = np.array([1248., 2048., 48.])
SCALE = .025
ROTATION = np.array([[1.,0.,0.],[0.,0.,1.],[0.,-1.,0.]])
TOOLS = {'NULL','CLIP','TRIGGER','SKY','SKIP','HINT','NOCLIP','ORIGIN'}
SOLID_CLASSES = {'worldspawn','func_wall','func_door_nzp'}

def transform(p): return ((np.asarray(p)-ORIGIN)@ROTATION.T)*SCALE
def rounded(p): return np.round(np.asarray(p), 6).tolist()
def write_json(path, data): path.write_text(json.dumps(data,separators=(',',':')), encoding='utf-8')

def parse(text):
    entities=[]; depth=0; entity=None; brush=None
    face_re=re.compile(r'\(\s*([^)]*)\)\s*\(\s*([^)]*)\)\s*\(\s*([^)]*)\)\s*(\S+)\s*\[([^]]*)\]\s*\[([^]]*)\]\s*(.*)')
    for line in text.splitlines():
        s=line.strip()
        if s=='{':
            depth+=1
            if depth==1: entity={'id':len(entities),'properties':{},'sourceBrushes':[],'brushIds':[]}
            if depth==2: brush=[]
        elif s=='}':
            if depth==2: entity['sourceBrushes'].append(brush)
            if depth==1: entities.append(entity)
            depth-=1
        elif depth==1:
            m=re.match(r'"([^\"]+)"\s+"([^\"]*)"',s)
            if m: entity['properties'][m[1]]=m[2]
        elif depth==2 and s.startswith('('):
            m=face_re.fullmatch(s)
            if not m: raise ValueError('Unknown map face: '+s)
            p=[np.array([float(x) for x in m[i].split()]) for i in (1,2,3)]
            u=[float(x) for x in m[5].split()];v=[float(x) for x in m[6].split()]
            tail=[float(x) for x in m[7].split()]
            n=-np.cross(p[1]-p[0],p[2]-p[0]); length=np.linalg.norm(n)
            if length<1e-9: raise ValueError('Degenerate source plane')
            n/=length; d=float(n@p[0])
            brush.append({'points':p,'normal':n,'distance':d,'material':m[4], 'uvBasis':{'u':u,'v':v,'scale':tail[1:3],'rotation':tail[0]}})
    return entities

def build(entities):
    brushes=[]; faces=[]; groups={}; skipped=[]
    for entity in entities:
        properties=entity['properties']; classname=properties.get('classname','')
        if 'origin' in properties: entity['origin']=rounded(transform([float(x) for x in properties['origin'].split()]))
        for source_index,source in enumerate(entity.pop('sourceBrushes')):
            # Quake .map point order gives inward cross products; parse reverses them.
            normals=np.array([f['normal'] for f in source]); distances=np.array([f['distance'] for f in source])
            verts=[]
            for triple in combinations(range(len(source)),3):
                mat=normals[list(triple)]; det=np.linalg.det(mat)
                if abs(det)<1e-8: continue
                p=np.linalg.solve(mat,distances[list(triple)])
                if np.all(normals@p<=distances+.003) and not any(np.linalg.norm(p-q)<.003 for q in verts): verts.append(p)
            if len(verts)<4:
                skipped.append({'entityId':entity['id'],'sourceBrushIndex':source_index,'reason':'fewer than four convex vertices'})
                continue
            vertices=np.array(verts); game_vertices=transform(vertices)
            bid=len(brushes);entity['brushIds'].append(bid)
            solid=classname in SOLID_CLASSES and not all(f['material'].upper() in {'HINT','SKIP','ORIGIN'} for f in source)
            game_normals=normals@ROTATION.T
            game_distances=(distances-normals@ORIGIN)*SCALE
            brush={'id':bid,'entityId':entity['id'],'sourceBrushIndex':source_index,'classname':classname,'solid':solid,'movable':classname=='func_door_nzp','planes':[rounded([*n,d]) for n,d in zip(game_normals,game_distances)],'min':rounded(game_vertices.min(axis=0)),'max':rounded(game_vertices.max(axis=0)),'faceIds':[]}
            brushes.append(brush)
            for f_index,source_face in enumerate(source):
                chosen=[p for p in vertices if abs(float(source_face['normal']@p)-source_face['distance'])<.005]
                if len(chosen)<3: continue
                source_poly=np.array(chosen); normal=game_normals[f_index]; poly=transform(source_poly); centre=poly.mean(axis=0)
                ref=np.array([1.,0.,0.]) if abs(normal[1])>.9 else np.array([0.,1.,0.])
                tangent=np.cross(ref,normal);tangent/=np.linalg.norm(tangent);bitangent=np.cross(normal,tangent)
                order=np.argsort(np.arctan2((poly-centre)@bitangent,(poly-centre)@tangent));poly=poly[order];source_poly=source_poly[order]
                mat=source_face['material']; visible=mat.upper() not in TOOLS
                # Pixel UVs retain the exact Valve220 basis. Normalized preview UVs
                # use128px; runtime may substitute its own texture dimensions.
                basis=source_face['uvBasis'];u=np.array(basis['u']);v=np.array(basis['v']);sc=basis['scale']
                uv=np.stack([(source_poly@u[:3]+u[3])/sc[0]/128,(source_poly@v[:3]+v[3])/sc[1]/128],axis=1)
                fid=len(faces);brush['faceIds'].append(fid)
                face={'id':fid,'brushId':bid,'entityId':entity['id'],'material':mat,'normal':rounded(normal),'vertices':rounded(poly),'uvs':rounded(uv),'uvBasis':basis,'visible':visible,'solid':solid}
                faces.append(face)
                if not visible: continue
                # Movable gates have separate parts, allowing a runtime to remove
                # the original brush geometry when the matching door opens.
                key=(mat.upper(),entity['id'])
                part=groups.setdefault(key,{'name':mat+f' entity {entity["id"]}','entityId':entity['id'],'sourceEntityId':entity['id'],'sourceMaterial':mat,'sourceFaceIds':[],'doorEntityId':entity['id'] if brush['movable'] else None,'positions':[],'normals':[],'uvs':[],'indices':[],'materials':[{'name':mat,'color':[.75,.75,.75]}]})
                base=len(part['positions'])//3;part['positions']+=rounded(poly.reshape(-1));part['normals']+=rounded(np.tile(normal,(len(poly),1)).reshape(-1));part['uvs']+=rounded(uv.reshape(-1));part['sourceFaceIds'].append(fid)
                for j in range(1,len(poly)-1):part['indices'] += [base,base+j,base+j+1]
    if skipped: raise ValueError('Invalid brushes, not silently dropped: '+json.dumps(skipped))
    return brushes,faces,list(groups.values())

def collision_index(brushes, cell=3.):
    index=defaultdict(list); solid=[]
    for b in brushes:
        if not b['solid'] or b['movable']:continue
        rec=(b,np.array(b['planes']),np.array(b['min']),np.array(b['max']))
        i=len(solid);solid.append(rec)
        for zz in range(math.floor(b['min'][2]/cell)-1,math.floor(b['max'][2]/cell)+2):
            for xx in range(math.floor(b['min'][0]/cell)-1,math.floor(b['max'][0]/cell)+2): index[(xx,zz)].append(i)
    def blocked(x,y,z,radius=.35,height=1.8,step=.45):
        low=y+step;high=y+height;middle=(low+high)/2;half=(high-low)/2
        for i in index.get((math.floor(x/cell),math.floor(z/cell)),[]):
            b,planes,minimum,maximum=solid[i]
            if maximum[1]<=low+.0001 or minimum[1]>=high-.015 or x<minimum[0]-radius or x>maximum[0]+radius or z<minimum[2]-radius or z>maximum[2]+radius:continue
            normals=planes[:,:3];offset=planes[:,3]+radius*np.linalg.norm(normals[:,[0,2]],axis=1)+half*np.abs(normals[:,1])
            if np.all(normals@np.array([x,middle,z])<offset-.004):return True
        return False
    return blocked

def navigation(brushes,faces,start):
    cell=.25
    # Complete source world footprint; connectivity, not a hand-drawn arena,
    # selects the indoor component containing the original player start.
    min_x=math.floor(min(b['min'][0] for b in brushes)/cell)*cell;min_z=math.floor(min(b['min'][2] for b in brushes)/cell)*cell
    max_x=math.ceil(max(b['max'][0] for b in brushes)/cell)*cell;max_z=math.ceil(max(b['max'][2] for b in brushes)/cell)*cell
    cols=round((max_x-min_x)/cell)+1;rows=round((max_z-min_z)/cell)+1
    candidates=defaultdict(list)
    for f in faces:
        b=brushes[f['brushId']]
        if not f['solid'] or b['movable'] or f['normal'][1]<.65:continue
        poly=np.array(f['vertices']);n=np.array(f['normal']);d=float(n@poly[0]);lo=poly.min(axis=0);hi=poly.max(axis=0)
        if hi[1]<-.3 or lo[1]>6.5:continue
        for iz in range(max(0,math.ceil((lo[2]-min_z)/cell)), min(rows-1,math.floor((hi[2]-min_z)/cell))+1):
            z=min_z+iz*cell
            for ix in range(max(0,math.ceil((lo[0]-min_x)/cell)), min(cols-1,math.floor((hi[0]-min_x)/cell))+1):
                x=min_x+ix*cell;y=(d-n[0]*x-n[2]*z)/n[1]
                if y<-.3 or y>6.5:continue
                point=np.array([x,y,z])
                # Convex face polygon: consistent ordered-edge halfspaces.
                if any(float(np.cross(poly[(k+1)%len(poly)]-p,point-p)@n)<-1e-6 for k,p in enumerate(poly)):continue
                bucket=candidates[iz*cols+ix]
                if not any(abs(v[0]-y)<.025 for v in bucket):bucket.append((y,f['id']))
    blocked=collision_index(brushes);nodes=[];columns=[[] for _ in range(cols*rows)]
    for col,ys in candidates.items():
        ix=col%cols;iz=col//cols;x=min_x+ix*cell;z=min_z+iz*cell
        for y,fid in sorted(ys):
            if blocked(x,y,z):continue
            i=len(nodes);nodes.append({'x':round(x,5),'y':round(y,5),'z':round(z,5),'floorFaceId':fid,'links':[]});columns[col].append(i)
    print('Navigation candidates',sum(map(len,candidates.values())),'clear nodes',len(nodes),flush=True)
    for col,bucket in enumerate(columns):
        if not bucket:continue
        ix=col%cols;iz=col//cols
        for dx,dz in [(1,0),(0,1),(1,1),(-1,1)]:
            xx=ix+dx;zz=iz+dz
            if xx<0 or xx>=cols or zz>=rows:continue
            for a in bucket:
                p=nodes[a]
                for b in columns[zz*cols+xx]:
                    q=nodes[b]
                    if abs(q['y']-p['y'])>.36:continue
                    if any(blocked(p['x']+(q['x']-p['x'])*t,p['y']+(q['y']-p['y'])*t,p['z']+(q['z']-p['z'])*t) for t in (.25,.5,.75)):continue
                    nodes[a]['links'].append(b);nodes[b]['links'].append(a)
    seed=min(range(len(nodes)),key=lambda i:(nodes[i]['x']-start[0])**2+(nodes[i]['z']-start[2])**2+((nodes[i]['y']-0)*2)**2)
    keep={seed};todo=deque([seed])
    while todo:
        for n in nodes[todo.popleft()]['links']:
            if n not in keep:keep.add(n);todo.append(n)
    remap={old:new for new,old in enumerate(sorted(keep))};nodes=[{**nodes[old],'links':[remap[n] for n in nodes[old]['links'] if n in keep]} for old in sorted(keep)]
    columns=[[remap[n] for n in c if n in keep] for c in columns]
    print('Connected start component',len(nodes),'nodes; layers',Counter(round(n['y'],1) for n in nodes).most_common(8),flush=True)
    return {'cell':cell,'originX':round(min_x,5),'originZ':round(min_z,5),'cols':cols,'rows':rows,'bodyHeight':1.8,'radius':.35,'stepHeight':.45,'maxLinkRise':.36,'nodes':nodes,'columns':columns,'startNode':remap[seed]}

def validate(data,geometry):
    maximum=0.;minimum_winding=1.
    assert len(data['faces'])==sum(len(b['planes']) for b in data['brushes']), 'A source plane was dropped'
    for f in data['faces']:
        poly=np.array(f['vertices']);normal=np.array(f['normal']);planes=np.array(data['brushes'][f['brushId']]['planes'])
        assert np.isfinite(poly).all() and abs(np.linalg.norm(normal)-1)<1e-5
        residual=planes[:,:3]@poly.T-planes[:,3,None]
        violation=float(residual.max());assert violation<1e-4
        own=float(np.min(np.max(np.abs(residual),axis=1)));assert own<1e-4
        maximum=max(maximum,violation,own)
        for j in range(1,len(poly)-1):
            cross=np.cross(poly[j]-poly[0],poly[j+1]-poly[0]);length=float(np.linalg.norm(cross))
            if length<1e-8:continue
            winding=float(cross@normal/length);minimum_winding=min(minimum_winding,winding);assert winding>.9999
    for p in geometry['parts']:
        assert len(p['positions'])==len(p['normals']) and len(p['uvs'])==len(p['positions'])//3*2
        assert all(0<=i<len(p['positions'])//3 for i in p['indices'])
        assert np.isfinite(np.array(p['positions'])).all()
    nav=data.get('nav');layered=0;report={'sourceEntities':len(data['entities']),'sourceBrushes':len(data['brushes']),'sourceFaces':len(data['faces']),'renderParts':len(geometry['parts']),'renderTriangles':sum(len(p['indices'])//3 for p in geometry['parts']),'maximumPlaneResidualMetres':maximum,'minimumWindingNormalAgreement':minimum_winding}
    if nav:
        nodes=nav['nodes'];seen={nav['startNode']};todo=deque(seen)
        for col,bucket in enumerate(nav['columns']):
            if len(bucket)>1:layered+=1
            for i in bucket:
                p=nodes[i];assert abs(p['x']-(nav['originX']+col%nav['cols']*nav['cell']))<1e-4
                assert abs(p['z']-(nav['originZ']+col//nav['cols']*nav['cell']))<1e-4
                f=data['faces'][p['floorFaceId']];n=np.array(f['normal']);vertex=np.array(f['vertices'][0]);assert abs(n@np.array([p['x'],p['y'],p['z']])-n@vertex)<1e-4
                for j in p['links']:assert i in nodes[j]['links'] and abs(p['y']-nodes[j]['y'])<=nav['maxLinkRise']+.001
        while todo:
            for j in nodes[todo.popleft()]['links']:
                if j not in seen:seen.add(j);todo.append(j)
        assert len(seen)==len(nodes)
        report.update({'navigationNodes':len(nodes),'layeredColumns':layered,'connectedNodes':len(seen)})
    write_json(QA/'reference-validation.json',report)
    print('Reference fidelity validation:',json.dumps(report),flush=True)
    return report

def analyze(data):
    """Small review packet: source anchors, measured rooms, independent gates."""
    nav=data['nav'];nodes=nav['nodes'];blocked_by_gate={};gates=[]
    def closest(p):
        i=min(range(len(nodes)),key=lambda i:(nodes[i]['x']-p[0])**2+(nodes[i]['z']-p[2])**2+9*(nodes[i]['y']-p[1])**2)
        return {'nodeId':i,**{k:nodes[i][k] for k in ('x','y','z')}}
    anchors=[]
    for e in data['entities']:
        classname=e['properties'].get('classname','');p=e.get('origin')
        if classname=='func_door_nzp':
            bs=[{**data['brushes'][i],'movable':False} for i in e['brushIds']];test=collision_index(bs)
            blocked_by_gate[e['id']]={i for i,n in enumerate(nodes) if test(n['x'],n['y'],n['z'])}
            gates.append({'entityId':e['id'],'brushIds':e['brushIds'],'cost':int(e['properties']['cost']),'blockedNavigationNodes':len(blocked_by_gate[e['id']]),'min':[min(b['min'][k] for b in bs) for k in range(3)],'max':[max(b['max'][k] for b in bs) for k in range(3)]})
        if p and classname in {'info_player_start','item_barricade','weapon_wall','mystery_box'}:
            point=p[:]
            if classname=='info_player_start':point[1]=0
            elif classname=='item_barricade':
                yaw=math.radians(float(e['properties'].get('angles','0 0 0').split()[1]));point[0]+=math.cos(yaw)*.9;point[2]-=math.sin(yaw)*.9;point[1]-=1.6
            elif classname=='weapon_wall':point[1]-=1.5
            anchors.append({'entityId':e['id'],'classname':classname,'sourceOrigin':p,'approach':closest(point)})
    def reachable(blocked):
        found={nav['startNode']};todo=deque(found)
        while todo:
            for j in nodes[todo.popleft()]['links']:
                if j not in blocked and j not in found:found.add(j);todo.append(j)
        return found
    allblocked=set.union(*blocked_by_gate.values());left=set(range(len(nodes)))-allblocked;components=[]
    while left:
        seed=next(iter(left));found={seed};left.remove(seed);todo=deque([seed])
        while todo:
            for j in nodes[todo.popleft()]['links']:
                if j in left:left.remove(j);found.add(j);todo.append(j)
        components.append(found)
    rooms=[]
    for found in sorted(components,key=len,reverse=True):
        lower=any(nodes[i]['y']<1 for i in found);spawn=nav['startNode'] in found
        name='A / Spawn hall' if spawn else 'B / Help + box room' if lower else 'C / Upper floor'
        rooms.append({'name':name,'nodes':len(found),'containsStart':spawn,'min':[min(nodes[i][k] for i in found) for k in ('x','y','z')],'max':[max(nodes[i][k] for i in found) for k in ('x','y','z')]})
    routes={}
    for key,closed in [('frontStairsClosed',blocked_by_gate[110]),('backStairsClosed',blocked_by_gate[111]),('bothStairsClosed',blocked_by_gate[110]|blocked_by_gate[111])]:
        found=reachable(closed);routes[key]={'reachableNodes':len(found),'upperFloorReachable':any(nodes[i]['y']>3.5 for i in found)}
    assert routes['frontStairsClosed']['upperFloorReachable'] and routes['backStairsClosed']['upperFloorReachable'] and not routes['bothStairsClosed']['upperFloorReachable']
    checkpoints=[]
    for name,p,target in [('spawn-to-door',[0,0,0],[3.7,1.4,-5.6]),('help-room',[7,0,-10],[22,1.5,-12]),('front-stair-foot',[3.6,0,13],[3.6,4.6,5.5]),('upper-landing',[-1,3.6,1],[3.6,4.7,-6]),('upper-holdout',[12,3.6,-10],[-3.3,4.8,-17]),('back-stair-foot',[1.3,.4,-17.2],[-3.5,4.8,-17.2])]:
        node=closest(p);checkpoints.append({'id':name,'floorPoint':node,'eye':[node['x'],round(node['y']+1.68,5),node['z']],'target':target})
    packet={'source':data['source'],'roomsWithAllGatesClosed':rooms,'gates':gates,'roomGraph':[{'from':'A','to':'B','gateEntityId':2},{'from':'A','to':'C','gateEntityId':110},{'from':'B','to':'C','gateEntityId':111}],'independentStairRoutes':routes,'anchors':anchors,'cameraCheckpoints':checkpoints,'analysisNote':'Room labels, camera checks and inward approach offsets are review aids derived from source geometry; original point origins remain separately preserved.'}
    (DOC/'analysis.json').write_text(json.dumps(packet,indent=2),encoding='utf-8');write_json(QA/'reference-gate-analysis.json',routes)
    print('Both original stair routes independently verified.',flush=True)
    return packet

def draw_slices(data):
    nav=data.get('nav');pts=nav['nodes'] if nav else []
    bounds=data['bounds'];margin=4;extent=[bounds['minX']-margin,bounds['minZ']-margin,bounds['maxX']+margin,bounds['maxZ']+margin]
    # Focus on the actual connected bunker, retaining some exterior context.
    if pts:extent=[min(p['x'] for p in pts)-5,min(p['z'] for p in pts)-5,max(p['x'] for p in pts)+5,max(p['z'] for p in pts)+5]
    w,h=1600,1800;scale=min((w-120)/(extent[2]-extent[0]),(h-180)/(extent[3]-extent[1]));ox=60;oy=120
    xy=lambda p:(ox+(p[0]-extent[0])*scale,oy+(p[2]-extent[1])*scale)
    colors={'info_player_start':'#8ff3a3','mystery_box':'#f3cb70','weapon_wall':'#a9ccff','item_barricade':'#ef8c8c','func_door_nzp':'#ffb06a'}
    for title,foot in [('lower',0.),('upper',3.6)]:
        img=Image.new('RGB',(w,h),'#14222b');draw=ImageDraw.Draw(img)
        for x in range(math.ceil(extent[0]/4)*4,math.floor(extent[2]/4)*4+1,4):
            a=xy([x,0,extent[1]]);b=xy([x,0,extent[3]]);draw.line([a,b],fill='#1e303b');draw.text((a[0]+2,95),f'x{x}',fill='#7794a3')
        for z in range(math.ceil(extent[1]/4)*4,math.floor(extent[3]/4)*4+1,4):
            a=xy([extent[0],0,z]);b=xy([extent[2],0,z]);draw.line([a,b],fill='#1e303b');draw.text((15,a[1]),f'z{z}',fill='#7794a3')
        for f in data['faces']:
            poly=f['vertices'];ys=[p[1] for p in poly]
            if f['normal'][1]>.65 and abs(sum(ys)/len(ys)-foot)<.3:draw.polygon([xy(p) for p in poly],fill='#3a4b51',outline='#4c6069')
        # Cross-section source brush polygons at standing chest height.
        y=foot+1.0
        for b in data['brushes']:
            if not b['solid'] or b['min'][1]>y or b['max'][1]<y:continue
            polygon=[]
            planes=np.array(b['planes']); ns=planes[:,:3];ds=planes[:,3]
            for i,j in combinations(range(len(planes)),2):
                mat=np.array([[ns[i,0],ns[i,2]],[ns[j,0],ns[j,2]]])
                if abs(np.linalg.det(mat))<1e-8:continue
                x,z=np.linalg.solve(mat,[ds[i]-ns[i,1]*y,ds[j]-ns[j,1]*y]);p=np.array([x,y,z])
                if np.all(ns@p<=ds+.0001) and not any(np.linalg.norm(p-q)<.001 for q in polygon):polygon.append(p)
            if len(polygon)<3:continue
            center=np.mean(polygon,axis=0);polygon.sort(key=lambda p:math.atan2(p[2]-center[2],p[0]-center[0]));draw.polygon([xy(p) for p in polygon],fill='#d98e57' if b['movable'] else '#253c49',outline='#ecb07e' if b['movable'] else '#70828a')
        for n in pts:
            if abs(n['y']-foot)<.3:
                x,z=xy([n['x'],n['y'],n['z']]);r=max(1,scale*nav['cell']*.4);draw.rectangle([x-r,z-r,x+r,z+r],fill='#638d87')
        for e in data['entities']:
            c=e['properties'].get('classname');p=e.get('origin')
            if not p or c not in colors or abs(p[1]-foot)>2.3:continue
            x,z=xy(p);r=6;draw.ellipse([x-r,z-r,x+r,z+r],fill=colors[c]);draw.text((x+9,z-5),str(e['id'])+' '+c.replace('item_','').replace('info_player_','').replace('weapon_',''),fill=colors[c])
        for e in data['entities']:
            if e['properties'].get('classname')!='func_door_nzp':continue
            bs=[data['brushes'][i] for i in e['brushIds']]
            lo=np.min([b['min'] for b in bs],axis=0);hi=np.max([b['max'] for b in bs],axis=0)
            if lo[1]>foot+1.1 or hi[1]<foot+1.1:continue
            x,z=xy((lo+hi)/2);draw.text((x+10,z),f'GATE {e["id"]}',fill='#ffbd7c')
        labels=[([-1,0,15],'A / SPAWN HALL'),([9,0,-11],'B / HELP + BOX ROOM')] if title=='lower' else [([-2,0,2],'C / UPPER LANDING'),([10,0,-10],'C / UPPER HOLDOUT')]
        for p,text in labels:
            x,z=xy(p);draw.rectangle([x-8,z-8,x+len(text)*7,z+20],fill='#14222b');draw.text((x,z),text,fill='#f5e8cc')
        draw.text((60,35),f'NZ:P Nacht source - {title.upper()} / floor {foot:g}m / source-to-game scale .025',fill='white')
        draw.text((60,65),'Gray = source floor / blue = source wall cross-section / amber = original progression gate / dots = connected walkable samples',fill='#c7dae0')
        draw.line([(w-240,h-60),(w-240+5*scale,h-60)],fill='white',width=3);draw.text((w-240,h-45),'5 metres',fill='white')
        img.save(QA/f'reference-{title}.png')
        img.save(DOC/f'{title}-plan.png')

def main():
    for path in (OUT,DOC,QA):path.mkdir(parents=True,exist_ok=True)
    source_path=DOC/'ndu.map'
    if not source_path.exists():
        local=ROOT/'tools/raw/reference/ndu.map'
        source_path.write_bytes(local.read_bytes() if local.exists() else urllib.request.urlopen(SOURCE_URL).read())
    raw=source_path.read_bytes();assert hashlib.sha256(raw).hexdigest()==SOURCE_SHA
    for name,url in [('LICENSE.md','https://raw.githubusercontent.com/nzp-team/assets/main/LICENSE.md'),('UPSTREAM-README.md','https://raw.githubusercontent.com/nzp-team/assets/main/README.md'),('CC-BY-SA-4.0.txt','https://raw.githubusercontent.com/nzp-team/assets/main/common/licenses/cc-by-sa-4.0.txt')]:
        path=DOC/name
        if not path.exists():path.write_bytes(urllib.request.urlopen(url).read())
    source={'name':'Nacht der Untoten - Nazi Zombies: Portable recreation','project':'NZ:P Team','url':'https://github.com/nzp-team/assets','sourceUrl':SOURCE_URL,'sourcePath':'source/maps/ndu/ndu.map','commit':COMMIT,'sha256':SOURCE_SHA,'license':'CC-BY-SA-4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','scope':'Published NZ:P recreation, not original Treyarch/Activision source. Geometry retained; FusionFall material substitutions and survival rules are adaptations.'}
    entities=parse(raw.decode('utf-8'));brushes,faces,parts=build(entities)
    allverts=np.array([v for f in faces for v in f['vertices']]);bounds={'minX':float(allverts[:,0].min()),'maxX':float(allverts[:,0].max()),'minZ':float(allverts[:,2].min()),'maxZ':float(allverts[:,2].max())}
    data={'source':source,'transform':{'origin':ORIGIN.tolist(),'scale':SCALE,'mapping':'x=(X-1248)*.025; y=(Z-48)*.025; z=-(Y-2048)*.025'},'entities':entities,'brushes':brushes,'faces':faces,'floors':[f['id'] for f in faces if f['solid'] and f['normal'][1]>.65],'bounds':bounds}
    geo={'name':'NZ:P Nacht source geometry','source':source,'parts':parts,'bounds':{'min':rounded(allverts.min(axis=0)),'max':rounded(allverts.max(axis=0)),'size':rounded(allverts.max(axis=0)-allverts.min(axis=0))}}
    # Write core data before navigation so source dimensions are immediately inspectable.
    write_json(OUT/'geometry.json',geo);write_json(OUT/'catalog.json',{'id':'reference-bunker','url':'assets/reference-bunker/geometry.json','source':source,'bounds':geo['bounds']})
    if not (OUT/'data.js').exists():
        write_json(OUT/'data.json',data);(OUT/'data.js').write_text('export default '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
    draw_slices(data)
    print('Source geometry exported:',len(entities),'entities;',len(brushes),'brushes;',len(faces),'faces;',len(parts),'render batches',flush=True)
    data['nav']=navigation(brushes,faces,next(e['origin'] for e in entities if e['properties'].get('classname')=='info_player_start'))
    validate(data,geo)
    analyze(data)
    write_json(OUT/'data.json',data);(OUT/'data.js').write_text('export default '+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8');write_json(DOC/'provenance.json',source)
    draw_slices(data)
    print('Saved',OUT,flush=True)

if __name__=='__main__':
    if '--validate-only' in sys.argv:
        data=json.loads((OUT/'data.json').read_text());validate(data,json.loads((OUT/'geometry.json').read_text()));analyze(data)
    else:main()
