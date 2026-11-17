"""Compatibility entrypoint for the complete runtime scene review.

Math helpers are shared with the software rasterizer. The review includes
actual props and first-person weapons; it does not open or emulate a browser.
"""
from pathlib import Path
import sys,subprocess
ROOT=Path(__file__).resolve().parent.parent
for extra in (ROOT/'.tools/python-deps',ROOT.parent/'fusionfall-survival/.tools/python-deps'):
    if extra.exists():sys.path.insert(0,str(extra))
import numpy as np

def linear(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
def srgb(a):return np.where(a<=.0031308,a*12.92,1.055*np.maximum(a,0)**(1/2.4)-.055)
def aces(a):return np.clip((a*(2.51*a+.03))/(a*(2.43*a+.59)+.14),0,1)
def rgb(value):return np.array([int(value[i:i+2],16)/255 for i in (1,3,5)])
def near_clip(vertices):
    result=[]
    for i,current in enumerate(vertices):
        previous=vertices[i-1];a=previous[2]>=.06;b=current[2]>=.06
        if a!=b:
            t=(.06-previous[2])/(current[2]-previous[2]);result.append(previous+(current-previous)*t)
        if b:result.append(current)
    return result

if __name__=='__main__':
    raise SystemExit(subprocess.call([sys.executable,str(ROOT/'tools/review-runtime-scene.py'),*sys.argv[1:]],cwd=ROOT))
