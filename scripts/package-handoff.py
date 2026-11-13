"""Package the exact committed frontend, build and handoff documents (stdlib only)."""
from pathlib import Path
import argparse
import hashlib
import io
import json
import subprocess
import tarfile
import tempfile
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--logs', type=Path, help='Optional directory containing verification logs for this exact commit')
args = parser.parse_args()
repo = Path(__file__).resolve().parent.parent
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True).strip():
    raise SystemExit('Commit reviewed source and dist before packaging; working tree must be clean.')
archive = subprocess.check_output(['git', 'archive', commit], cwd=repo)
with tempfile.TemporaryDirectory(prefix='qinan-handoff-') as temporary:
    root = Path(temporary) / 'QINAN-v14-backend-handoff'
    frontend = root / 'frontend'
    frontend.mkdir(parents=True)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        members = [item for item in tar.getmembers() if item.name not in ('AGENTS.md', '.openai') and not item.name.startswith('.openai/')]
        tar.extractall(frontend, members=members, filter='data')
    for relative in ['docs/HANDOFF-README.md', 'docs/V14-REVIEW.md', 'docs/API-INTEGRATION.md', 'docs/SSE-CONTRACT.md', 'deployment/nginx.conf.example']:
        source = frontend / relative
        target = root / ('README.md' if relative.endswith('HANDOFF-README.md') else relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
    version = json.loads((frontend / 'package.json').read_text())['version']
    (root / 'SOURCE.json').write_text(json.dumps({'commit': commit, 'version': version, 'branch': 'v14-handoff-fixes', 'source': 'https://github.com/chenhaoxiang05/qinan-motion-lab', 'excluded_metadata': ['AGENTS.md', '.openai/hosting.json'], 'backend_included': False}, ensure_ascii=False, indent=2) + '\n')
    if args.logs:
        provenance = json.loads((args.logs / 'RESULTS.json').read_text())
        if provenance.get('reviewed_commit') != commit:
            raise SystemExit('Verification provenance must match the packaged commit.')
        for source in args.logs.iterdir():
            if source.is_file() and source.suffix in ('.log', '.json'):
                target = root / 'verification' / source.name
                target.parent.mkdir(exist_ok=True)
                target.write_bytes(source.read_bytes())
    files = sorted(path for path in root.rglob('*') if path.is_file())
    for path in files:
        relative = path.relative_to(root)
        if {'.git', 'node_modules', '.openai'}.intersection(relative.parts) or (path.name.startswith('.env') and path.name != '.env.example'):
            raise SystemExit(f'Unexpected local/private file: {relative}')
    (root / 'MANIFEST.sha256').write_text(''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.relative_to(root).as_posix()}\n' for path in files))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in sorted(root.rglob('*')):
            if path.is_file():
                bundle.write(path, (Path(root.name) / path.relative_to(root)).as_posix())
    with zipfile.ZipFile(args.output) as bundle:
        if bundle.testzip():
            raise SystemExit('ZIP CRC validation failed.')
        for line in (root / 'MANIFEST.sha256').read_text().splitlines():
            digest, relative = line.split('  ', 1)
            if hashlib.sha256(bundle.read(root.name + '/' + relative)).hexdigest() != digest:
                raise SystemExit(f'Checksum mismatch: {relative}')
digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
args.output.with_suffix(args.output.suffix + '.sha256').write_text(f'{digest}  {args.output.name}\n')
print(json.dumps({'archive': str(args.output), 'commit': commit, 'bytes': args.output.stat().st_size, 'sha256': digest, 'integrity': 'verified'}))
