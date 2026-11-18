#!/usr/bin/env python3
"""Project-local example of staged C++ quality and architecture checks."""
import argparse
import fnmatch
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

SOURCE_EXTENSIONS = {'.c', '.cc', '.cpp', '.cxx', '.h', '.hh', '.hpp', '.hxx', '.inl', '.inc'}
DIAGNOSTIC = re.compile(r'^(.+?):(\d+):(\d+):\s+(warning|error):.*\[([^\]]+)\]\s*$')

class CheckError(Exception):
    pass

def run(command, root, *, allow_failure=False):
    try:
        result = subprocess.run(command, cwd=root, text=True, capture_output=True)
    except OSError as error:
        raise CheckError(f'Cannot execute {command[0]}: {error}') from error
    if not allow_failure and result.returncode:
        raise CheckError(f'{command[0]} failed ({result.returncode}): {result.stderr or result.stdout}')
    return result

def version(tool, root):
    result = run([tool, '--version'], root)
    print(f'{tool}: {result.stdout.strip().splitlines()[0]}', flush=True)

def changed_files(root, base):
    if not base:
        return None
    result = run(['git', 'diff', '--name-only', '-z', '--diff-filter=ACMR', base, 'HEAD', '--'], root)
    return {str((root / item).resolve()) for item in result.stdout.split('\0') if item}

def project_files(root):
    result = run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'src'], root)
    return sorted({(root / item).resolve() for item in result.stdout.split('\0') if item and Path(item).suffix.lower() in SOURCE_EXTENSIONS and (root / item).is_file()})

def format_step(args, changed):
    tool = 'clang-format-18'
    version(tool, args.project_root)
    blocked = False
    for path in project_files(args.project_root):
        result = run([tool, '--output-replacements-xml', str(path)], args.project_root)
        try:
            xml = ET.fromstring(result.stdout)
        except ET.ParseError as error:
            raise CheckError(f'Invalid clang-format XML for {path}: {error}') from error
        if xml.tag != 'replacements' or xml.attrib.get('incomplete_format', 'false').lower() != 'false':
            raise CheckError(f'Incomplete clang-format result for {path}')
        replacements = xml.findall('replacement')
        if replacements:
            print(f'{path}: formatting changes: {len(replacements)}', flush=True)
        selected = args.format_scope == 'all' or (changed is not None and str(path) in changed)
        if args.stage >= 2 and selected:
            dry = run([tool, '--dry-run', '--Werror', str(path)], args.project_root, allow_failure=True)
            if dry.returncode not in (0, 1) or (dry.returncode and not replacements):
                raise CheckError(f'clang-format dry-run failed for {path}: {dry.stderr or dry.stdout}')
            if replacements or dry.returncode:
                blocked = True
    return 1 if blocked else 0

def compilation_units(root, build):
    try:
        database = json.loads((build / 'compile_commands.json').read_text())
    except (OSError, ValueError) as error:
        raise CheckError(f'Cannot read compile_commands.json: {error}') from error
    if not isinstance(database, list):
        raise CheckError('compile_commands.json must contain an array')
    units = set()
    for entry in database:
        if not isinstance(entry, dict) or not isinstance(entry.get('directory'), str) or not isinstance(entry.get('file'), str):
            raise CheckError('Invalid compile_commands.json entry')
        path = (Path(entry['directory']) / entry['file']).resolve()
        if path.is_relative_to(root / 'src') and path.suffix.lower() in {'.c', '.cc', '.cpp', '.cxx', '.m', '.mm'}:
            if not path.is_file():
                raise CheckError(f'Compile source is missing: {path}')
            units.add(path)
    if not units:
        raise CheckError('No production translation units found in compile_commands.json')
    return sorted(units)

def tidy_step(args, changed):
    tool = 'clang-tidy-18'
    version(tool, args.project_root)
    patterns = [pattern.strip() for pattern in args.tidy_errors.split(',') if pattern.strip()]
    if args.stage >= 3 and not patterns:
        raise CheckError('Set --tidy-errors to the checks approved for stage 3')
    blocked = False
    for unit in compilation_units(args.project_root, args.build_dir):
        result = run([tool, str(unit), '-p', str(args.build_dir), '--warnings-as-errors=-*', '--use-color=false', '--header-filter=^' + re.escape(str(args.project_root / 'src')) + '/'], args.project_root, allow_failure=True)
        output = result.stdout + result.stderr
        print(output, end='' if output.endswith('\n') or not output else '\n', flush=True)
        if result.returncode:
            raise CheckError(f'{tool} failed for {unit} ({result.returncode})')
        for line in output.splitlines():
            match = DIAGNOSTIC.match(line)
            if not match:
                continue
            path = Path(match.group(1))
            path = (args.project_root / path).resolve() if not path.is_absolute() else path.resolve()
            selected = args.tidy_scope == 'all' or (changed is not None and str(path) in changed)
            if args.stage >= 3 and selected and any(fnmatch.fnmatchcase(match.group(5), pattern) for pattern in patterns):
                blocked = True
    return 1 if blocked else 0

def architecture_step(args):
    if not args.hiflow_root:
        raise CheckError('--hiflow-root is required for architecture')
    version('node', args.project_root)
    cli = args.hiflow_root / 'hi_flow/skills/arch-audit/dist/cli-run-audit.mjs'
    result = run(['node', str(cli), '--stack', 'cpp-cmake', '--check', '--build-dir', str(args.build_dir), '--out-dir', str(args.build_dir / 'arch-audit/check'), str(args.project_root)], args.project_root, allow_failure=True)
    print(result.stdout, end='', flush=True)
    print(result.stderr, end='', file=sys.stderr, flush=True)
    return result.returncode

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('step', choices=['format', 'tidy', 'architecture'])
    parser.add_argument('--project-root', type=Path, required=True)
    parser.add_argument('--build-dir', type=Path, required=True)
    parser.add_argument('--stage', type=int, choices=[1, 2, 3], default=1)
    parser.add_argument('--format-scope', choices=['changed', 'all'], default='changed')
    parser.add_argument('--tidy-scope', choices=['changed', 'all'], default='changed')
    parser.add_argument('--base', default='')
    parser.add_argument('--tidy-errors', default='')
    parser.add_argument('--hiflow-root', type=Path)
    args = parser.parse_args()
    args.project_root, args.build_dir = args.project_root.resolve(), args.build_dir.resolve()
    if args.hiflow_root: args.hiflow_root = args.hiflow_root.resolve()
    print(f'stage={args.stage}; base={args.base or "not set"}; format={args.format_scope}; tidy={args.tidy_scope}', flush=True)
    if args.step == 'architecture': return architecture_step(args)
    needs_base = (args.step == 'format' and args.stage >= 2 and args.format_scope == 'changed') or (args.step == 'tidy' and args.stage >= 3 and args.tidy_scope == 'changed')
    if needs_base and not args.base:
        raise CheckError('Set --base to the PR base revision for blocking changed-file checks')
    changed = changed_files(args.project_root, args.base)
    if changed is None: print('No base: full reporting, no changed-file blocking.', flush=True)
    return format_step(args, changed) if args.step == 'format' else tidy_step(args, changed)

if __name__ == '__main__':
    try:
        sys.exit(main())
    except CheckError as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
