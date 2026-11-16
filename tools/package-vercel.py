"""Create a repository-ready Vercel ZIP without local caches or account state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent / 'fusionfall-vercel-ready.zip'
EXCLUDE = {'dist/assets/map-sections/map-04-04-placements.json'}
README = '''# FusionFall: Last Signal

A browser wave-survival FPS with 24 original FusionFall heroes, 20 accessories,
44 Nanos, three survival maps, ten guns, three melee weapons and original effects.

## Deploy from GitHub to Vercel

1. Extract this ZIP. Add the extracted contents to your GitHub repository.
   `vercel.json`, `package.json` and `dist/` must be at the repository root.
   Upload the files, not the ZIP itself.
2. In Vercel, choose **Add New > Project**, import that repository, and select the
   repository root as the **Root Directory**.
3. Use **Other** for the framework preset and deploy. Settings are already in
   `vercel.json`:

| Setting | Value |
| --- | --- |
| Node.js | 24.x |
| Install command | `npm ci --ignore-scripts` |
| Build command | `npm run check && npm test` |
| Output directory | `dist` |
| Environment variables | None required |

The build checks the source and runs the automated tests, then publishes the game
and all its assets. No game build tool, database or API key is required.

This project has over 1,000 files. GitHub Desktop or a normal Git push is the
easiest way to upload the complete folder. GitHub's browser uploader accepts up
to 100 files at a time:
https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## Multiplayer

The Vercel edition supports **solo play**. The LAN dialog explains that LAN
co-op uses a local host. To run it locally with Node.js 24:

```sh
npm ci --ignore-scripts
npm start
```

Open `http://localhost:4180`. Other players on the same network use the host's
printed LAN address. This package includes the complete local four-player server.

Internet co-op is not configured in this static deployment. Vercel supports
WebSockets, but reliable shared matches also require state/coordination across
its function instances or a dedicated game server.

## Controls

WASD move; Shift sprint/stand from crouch; C crouch/slide; Space jump;
mouse aim; left/right click shoot/ADS; R reload; G swap gun; V melee;
1/2/3 select Nano; Q ability; F interact/hold to revive; F5 or H camera;
Tab map; Escape menu.

See [DEVELOPMENT.md](DEVELOPMENT.md) for the full game documentation and
[ASSETS.md](ASSETS.md) for original art provenance and ownership.
'''

def main():
    files = {}
    for folder in ('dist', 'server', 'tests', 'docs'):
        for source in (ROOT / folder).rglob('*'):
            if source.is_file():
                relative = source.relative_to(ROOT).as_posix()
                if relative not in EXCLUDE and source.suffix not in ('.pyc', '.log'):
                    files[relative] = source
    for source in (ROOT / 'tools').glob('*.py'):
        files[source.relative_to(ROOT).as_posix()] = source
    for name in ('package.json', 'package-lock.json', 'server.mjs', 'vercel.json',
                 '.gitignore', '.vercelignore', 'ASSETS.md', 'FPS-UX.md',
                 'MAP-DESIGN.md', 'OPERATIVE-SYSTEMS.md', 'LAN-MULTIPLAYER.md'):
        files[name] = ROOT / name
    files['DEVELOPMENT.md'] = ROOT / 'README.md'
    with ZipFile(OUTPUT, 'w', ZIP_DEFLATED, compresslevel=7) as archive:
        for relative, source in sorted(files.items()):
            archive.write(source, relative)
        archive.writestr('README.md', README)
    digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
    with ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert all(not n.startswith(('/', '../')) and '/..' not in n for n in names)
        assert not any(n.startswith(('.git/', '.tools/', '.openai/', '.vercel/', 'node_modules/')) for n in names)
        assert not any(Path(n).name.startswith('.env') for n in names)
        assert all(n in names for n in ('dist/index.html', 'vercel.json', 'package.json', 'README.md'))
    result = {'archive': str(OUTPUT), 'files': len(names),
              'archiveMB': round(OUTPUT.stat().st_size / 1024**2, 2),
              'unpackedMB': round(sum(p.stat().st_size for p in files.values()) / 1024**2, 2),
              'sha256': digest}
    print(json.dumps(result))

if __name__ == '__main__':
    main()
