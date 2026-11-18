import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest

RUNNER = Path(__file__).resolve().parents[5] / 'references/stacks/references/cpp-checks/check_quality.py'

class QualityChecks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='cpp-gates-')
        self.root = Path(self.temp.name)
        (self.root / 'src').mkdir()
        (self.root / 'tests').mkdir()
        (self.root / 'tests/extra.cpp').write_text('// test code\n')
        (self.root / 'build').mkdir()
        (self.root / 'bin').mkdir()
        for name in ('a.cpp', 'b.cpp', 'header.h', 'old.cpp', 'rename.cpp'):
            (self.root / 'src' / name).write_text('// initial\n')
        subprocess.run(['git', 'init', '-q', str(self.root)], check=True)
        self.git('add', '.')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'initial')
        self.base = self.git('rev-parse', 'HEAD').stdout.strip()
        (self.root / 'src/a.cpp').write_text('// changed\n')
        (self.root / 'src/header.h').write_text('// changed\n')
        (self.root / 'tests/extra.cpp').write_text('// changed test\n')
        (self.root / 'src/new.cpp').write_text('// new\n')
        self.git('mv', 'src/rename.cpp', 'src/renamed.cpp')
        self.git('add', '.')
        self.git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'change')
        commands = [{'directory': str(self.root), 'file': str(self.root / 'src' / file), 'arguments': ['c++', '-c', file]} for file in ('a.cpp', 'b.cpp')]
        (self.root / 'build/compile_commands.json').write_text(json.dumps(commands))
        self.tool('clang-format-18', '''
import os,sys
if '--version' in sys.argv: print('clang-format 18'); sys.exit(0)
target = os.environ.get('FORMAT_FILE', 'a.cpp')
if '--dry-run' in sys.argv: sys.exit(2 if os.environ.get('FORMAT_FAIL') else (1 if sys.argv[-1].endswith(target) else 0))
print('<?xml version="1.0"?><replacements incomplete_format="false">' + ('<replacement offset="0" length="1">x</replacement>' if sys.argv[-1].endswith(target) else '') + '</replacements>')
''')
        self.tool('clang-tidy-18', '''
import os,sys
if '--version' in sys.argv: print('clang-tidy 18'); sys.exit(0)
if not any(arg.startswith('--header-filter=') for arg in sys.argv): print('missing header filter', file=sys.stderr); sys.exit(3)
if os.environ.get('EXPECTED_FILTER') and '--header-filter=' + os.environ['EXPECTED_FILTER'] not in sys.argv: print('wrong header filter', file=sys.stderr); sys.exit(3)
with open(os.environ['TIDY_LOG'], 'a') as f: f.write(sys.argv[1] + '\\n')
print(os.environ['TIDY_FILE'] + ':1:1: warning: sample [modernize-example]')
if os.environ.get('TIDY_FAIL'): sys.exit(2)
''')
        self.env = dict(os.environ, PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH'], TIDY_FILE=str(self.root / 'src/header.h'), TIDY_LOG=str(self.root / 'tidy.log'))

    def tearDown(self): self.temp.cleanup()
    def git(self, *args): return subprocess.run(['git', '-C', str(self.root), *args], check=True, text=True, capture_output=True)
    def tool(self, name, code):
        path = self.root / 'bin' / name
        path.write_text('#!' + sys.executable + '\n' + code)
        path.chmod(0o755)
    def run_step(self, name, stage, *extra, env=None):
        return subprocess.run([sys.executable, str(RUNNER), name, '--project-root', str(self.root), '--build-dir', str(self.root / 'build'), '--stage', str(stage), '--format-scope', 'changed', '--tidy-scope', 'changed', '--base', self.base, '--tidy-errors', 'modernize-*', *extra], text=True, capture_output=True, env=env or self.env)
    def test_stages_changed_header_and_tool_failure(self):
        format_report = self.run_step('format', 1)
        self.assertEqual(format_report.returncode, 0)
        self.assertIn('a.cpp:1:', format_report.stdout)
        self.assertEqual(self.run_step('format', 2).returncode, 1)
        for filename in ('new.cpp', 'renamed.cpp'):
            self.assertEqual(self.run_step('format', 2, env=dict(self.env, FORMAT_FILE=filename)).returncode, 1)
        format_failure = self.run_step('format', 2, env=dict(self.env, FORMAT_FAIL='1'))
        self.assertNotEqual(format_failure.returncode, 0)
        self.assertIn('clang-format dry-run failed', format_failure.stderr)
        self.assertEqual(self.run_step('format', 2, '--format-paths', 'src,tests', env=dict(self.env, FORMAT_FILE='extra.cpp')).returncode, 1)
        self.assertEqual(self.run_step('tidy', 2).returncode, 0)
        self.assertEqual(self.run_step('tidy', 2, '--tidy-header-filter', 'src/(core|engine)/.*', env=dict(self.env, EXPECTED_FILTER='src/(core|engine)/.*')).returncode, 0)
        (self.root / 'tidy.log').write_text('')
        self.assertEqual(self.run_step('tidy', 3).returncode, 1)
        self.assertEqual(len((self.root / 'tidy.log').read_text().splitlines()), 2)
        outside = dict(self.env, TIDY_FILE=str(self.root / 'src/old.cpp'))
        self.assertEqual(self.run_step('tidy', 3, env=outside).returncode, 0)
        self.assertEqual(self.run_step('tidy', 3, '--tidy-scope', 'all', env=outside).returncode, 1)
        old_format = dict(self.env, FORMAT_FILE='old.cpp')
        self.assertEqual(self.run_step('format', 2, env=old_format).returncode, 0)
        self.assertEqual(self.run_step('format', 2, '--format-scope', 'all', env=old_format).returncode, 1)
        no_checks = self.run_step('tidy', 3, '--tidy-errors', '')
        self.assertNotEqual(no_checks.returncode, 0)
        self.assertIn('tidy-errors', no_checks.stderr)
        failed = dict(self.env, TIDY_FAIL='1')
        self.assertNotEqual(self.run_step('tidy', 1, env=failed).returncode, 0)
    @unittest.skipUnless(shutil.which('cmake') and shutil.which('ninja'), 'CMake and Ninja are required')
    def test_cmake_gate_builds_then_runs_checks_and_ctest(self):
        self.tool('node', "import sys\nprint('node test' if '--version' in sys.argv else 'machine audit complete')\n")
        include = RUNNER.parent / 'CppGates.cmake'
        (self.root / 'CMakeLists.txt').write_text(
            'cmake_minimum_required(VERSION 3.25)\nproject(gates LANGUAGES CXX)\n'
            'add_library(core STATIC src/a.cpp src/b.cpp)\nenable_testing()\n'
            'add_test(NAME basic COMMAND ${CMAKE_COMMAND} -E true)\n'
            f'include("{include}")\n'
            f'set(CPP_HIFLOW_ROOT "{self.root}")\n'
            'hiflow_add_cpp_gates(TARGETS core CTEST_ARGS --no-tests=error)\n')
        configured = subprocess.run(['cmake', '-S', str(self.root), '-B', str(self.root / 'build'), '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'], text=True, capture_output=True, env=self.env)
        self.assertEqual(configured.returncode, 0, configured.stderr)
        result = subprocess.run(['cmake', '--build', str(self.root / 'build'), '--target', 'gates'], text=True, capture_output=True, env=self.env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('100% tests passed', result.stdout)
        self.assertIn('machine audit complete', result.stdout)

    def test_requires_base_for_blocking_changed_mode(self):
        result = subprocess.run([sys.executable, str(RUNNER), 'format', '--project-root', str(self.root), '--build-dir', str(self.root / 'build'), '--stage', '2'], text=True, capture_output=True, env=self.env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('base', result.stderr.lower())


@unittest.skipUnless(shutil.which('clang-format-18') and shutil.which('clang-tidy-18'), 'Clang 18 is required for real-tool checks')
class RealClangChecks(unittest.TestCase):
    def test_report_and_blocking_stages_with_real_clang_tools(self):
        with tempfile.TemporaryDirectory(prefix='real-clang-gates-') as temporary:
            root = Path(temporary)
            (root / 'src').mkdir()
            (root / 'build').mkdir()
            source = root / 'src/a.cpp'
            source.write_text('int *p = nullptr;\n')
            (root / '.clang-format').write_text('BasedOnStyle: LLVM\n')
            (root / '.clang-tidy').write_text("Checks: '-*,modernize-use-nullptr'\nWarningsAsErrors: '*'\n")
            def git(*args): return subprocess.run(['git', '-C', str(root), *args], check=True, text=True, capture_output=True)
            git('init', '-q'); git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'base')
            base = git('rev-parse', 'HEAD').stdout.strip()
            source.write_text('int   *p=0;\n')
            git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'changed')
            (root / 'build/compile_commands.json').write_text(json.dumps([{'directory': str(root), 'file': str(source), 'arguments': ['c++', '-std=c++17', '-c', str(source)]}]))
            def step(name, stage):
                return subprocess.run([sys.executable, str(RUNNER), name, '--project-root', str(root), '--build-dir', str(root / 'build'), '--base', base, '--stage', str(stage), '--tidy-errors', 'modernize-use-nullptr'], text=True, capture_output=True)
            format1, format2, tidy1, tidy3 = step('format', 1), step('format', 2), step('tidy', 1), step('tidy', 3)
            self.assertEqual(format1.returncode, 0, format1.stderr)
            self.assertEqual(format2.returncode, 1, format2.stderr)
            self.assertEqual(tidy1.returncode, 0, tidy1.stderr)
            self.assertEqual(tidy3.returncode, 1, tidy3.stdout + tidy3.stderr)
            self.assertIn('modernize-use-nullptr', tidy3.stdout + tidy3.stderr)

    def test_changed_header_diagnostics_are_seen_for_both_consumers(self):
        with tempfile.TemporaryDirectory(prefix='real-clang-header-') as temporary:
            root = Path(temporary)
            (root / 'src').mkdir()
            (root / 'build').mkdir()
            header = root / 'src/header.h'
            header.write_text('#pragma once\ninline int *p = nullptr;\n')
            (root / '.clang-tidy').write_text("Checks: '-*,modernize-use-nullptr'\nWarningsAsErrors: '*'\n")
            units = [root / 'src/a.cpp', root / 'src/b.cpp']
            for unit in units: unit.write_text('#include "header.h"\n')
            def git(*args): return subprocess.run(['git', '-C', str(root), *args], check=True, text=True, capture_output=True)
            git('init', '-q'); git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'base')
            base = git('rev-parse', 'HEAD').stdout.strip()
            header.write_text('#pragma once\ninline int *p = 0;\n')
            git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'changed')
            (root / 'build/compile_commands.json').write_text(json.dumps([{'directory': str(root), 'file': str(unit), 'arguments': ['c++', '-std=c++17', '-c', str(unit)]} for unit in units]))
            result = subprocess.run([sys.executable, str(RUNNER), 'tidy', '--project-root', str(root), '--build-dir', str(root / 'build'), '--base', base, '--stage', '3', '--tidy-errors', 'modernize-use-nullptr'], text=True, capture_output=True)
            self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
            self.assertGreaterEqual((result.stdout + result.stderr).count(str(header) + ':2:'), 2)

    @unittest.skipUnless(shutil.which('cmake') and shutil.which('ninja') and shutil.which('node'), 'CMake, Ninja and Node are required')
    def test_real_gate_builds_runs_tools_audit_and_ctest(self):
        with tempfile.TemporaryDirectory(prefix='real-cpp-gates-') as temporary:
            root = Path(temporary)
            fixture = Path(__file__).resolve().parents[1] / 'cpp-cmake-project'
            shutil.copytree(fixture, root, dirs_exist_ok=True)
            project = Path(__file__).resolve().parents[6]
            cmake = root / 'CMakeLists.txt'
            cmake.write_text(cmake.read_text() + '\nenable_testing()\nadd_test(NAME smoke COMMAND ${CMAKE_COMMAND} -E true)\n' + f'include("{RUNNER.parent / "CppGates.cmake"}")\nset(CPP_HIFLOW_ROOT "{project}")\n' + 'hiflow_add_cpp_gates(TARGETS core engine CTEST_ARGS --no-tests=error)\n')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            subprocess.run(['git', '-C', str(root), 'add', '.'], check=True)
            subprocess.run(['git', '-C', str(root), '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'fixture'], check=True, capture_output=True)
            build = root / 'build'
            configured = subprocess.run(['cmake', '-S', str(root), '-B', str(build), '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'], text=True, capture_output=True)
            self.assertEqual(configured.returncode, 0, configured.stderr)
            result = subprocess.run(['cmake', '--build', str(build), '--target', 'gates'], text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('100% tests passed', result.stdout)
            report = json.loads((build / 'arch-audit/check/audit-report.json').read_text())
            self.assertEqual(report['metrics']['dep_graph']['engine'], ['core'])

if __name__ == '__main__': unittest.main()
