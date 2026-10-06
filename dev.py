"""Start both development servers detached. Run with .venv/bin/python dev.py."""
from pathlib import Path
import os
import shutil
import subprocess
import urllib.request

root = Path(__file__).resolve().parent
node = shutil.which('node') or str(Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
services = [
    ('backend', 'http://localhost:8000/health', [str(root / '.venv/bin/python'), '-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', '8000'], root),
    ('frontend', 'http://localhost:5173', [node, 'node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173', '--strictPort'], root / 'src'),
]
for name, url, command, cwd in services:
    try:
        urllib.request.urlopen(url, timeout=2)
        print(f'{name} already running: {url}')
        continue
    except Exception:
        pass
    env = os.environ.copy()
    env['PATH'] = str(Path(node).parent) + os.pathsep + env.get('PATH', '')
    with open(f'/tmp/am-simulations-{name}.log', 'ab') as log:
        process = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    print(f'Started {name}, PID {process.pid}: {url}')
