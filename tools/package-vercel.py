"""Create a repository-ready Vercel ZIP without local caches or account state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent / 'fusionfall-vercel-ready.zip'
EXCLUDE = {'dist/assets/map-sections/map-04-04-placements.json'}
README = (ROOT / 'README.md').read_text(encoding='utf-8')

def main():
    files = {}
    for folder in ('dist', 'server', 'tests', 'docs'):
        for source in (ROOT / folder).rglob('*'):
            if source.is_file():
                relative = source.relative_to(ROOT).as_posix()
                if relative not in EXCLUDE and source.suffix not in ('.pyc', '.log'):
                    files[relative] = source
    for source in (ROOT / 'tools').iterdir():
        if source.is_file() and source.suffix in ('.py', '.mjs'):
            files[source.relative_to(ROOT).as_posix()] = source
    for name in ('package.json', 'package-lock.json', 'server.mjs', 'vercel.json',
                 '.gitignore', '.vercelignore', 'AGENTS.md', 'ASSETS.md', 'FPS-UX.md',
                 'MAP-DESIGN.md', 'OPERATIVE-SYSTEMS.md', 'LAN-MULTIPLAYER.md', 'ONLINE-MULTIPLAYER.md', 'render.yaml', 'Dockerfile', '.dockerignore', '.env.example'):
        files[name] = ROOT / name
    files['DEVELOPMENT.md'] = ROOT / 'DEVELOPMENT.md'
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
        assert not any(Path(n).name.startswith('.env') and Path(n).name!='.env.example' for n in names)
        assert all(n in names for n in ('dist/index.html', 'vercel.json', 'package.json', 'README.md'))
    result = {'archive': str(OUTPUT), 'files': len(names),
              'archiveMB': round(OUTPUT.stat().st_size / 1024**2, 2),
              'unpackedMB': round(sum(p.stat().st_size for p in files.values()) / 1024**2, 2),
              'sha256': digest}
    print(json.dumps(result))

if __name__ == '__main__':
    main()
