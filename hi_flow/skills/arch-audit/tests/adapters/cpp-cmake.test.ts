import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createCppCmakeAdapter } from '../../adapters/cpp-cmake.ts'
import { buildReportData } from '../../core/report-builder.ts'
import { fixturePath } from '../test-paths.ts'

describe('C++ CMake audit', () => {
  it('reports a real forbidden include with a valid module graph and D8 result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-audit-'))
    const build = join(root, 'build')
    try {
      await cp(fixturePath('cpp-cmake-project'), root, { recursive: true })
      await writeFile(join(root, 'src/core/Visual.qml'), 'A\nB\nC\nD\n')
      await writeFile(join(root, 'CMakeLists.txt'), (await readFile(join(root, 'CMakeLists.txt'), 'utf8')) + '\ntarget_sources(core PRIVATE src/core/Visual.qml)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: engine-no-core\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Engine must not depend on core"\n    from:\n      path: "^src/engine/"\n    to:\n      path: "^src/core/"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.metrics.dep_graph).toEqual({ core: [], engine: ['core'] })
      expect(data.report.metadata.operator_notes?.join(' ')).toContain('baseline:not-to-test-from-prod')
      expect(data.report.metadata.operator_notes?.join(' ')).toContain('baseline:frontend-layer-cycle')
      expect(data.report.metrics.per_module.core?.LOC).toBe(7)
      const finding = data.report.findings.find(item => item.rule_id === 'project:engine-no-core')
      expect(finding).toMatchObject({ severity: 'HIGH', source: { module: 'engine' }, target: { module: 'core' } })
      expect(JSON.parse(await readFile(data.json_path, 'utf8')).metadata.schema_version).toBe('1.2')
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)
  it('selects the requested multi-config compiler commands', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-multi-audit-'))
    const build = join(root, 'build')
    try {
      await cp(fixturePath('cpp-cmake-project'), root, { recursive: true })
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja Multi-Config', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build, configuration: 'Debug' })
      expect(data.report.metrics.dep_graph).toEqual({ core: [], engine: ['core'] })
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('reports one two-module cycle formed by a link and an include', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-cycle-audit-'))
    const build = join(root, 'build')
    try {
      await cp(fixturePath('cpp-cmake-project'), root, { recursive: true })
      await writeFile(join(root, 'src/core/Core.h'), '#pragma once\n#include "../engine/Engine.h"\nint core();\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings.filter(item => item.type === 'cycle')).toEqual([expect.objectContaining({ rule_id: 'baseline:inappropriate-intimacy', extras: { members: ['core', 'engine'] } })])
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it.skipIf(!existsSync('/usr/include/x86_64-linux-gnu/qt6/QtGui/QGuiApplication'))('maps a real QtGui include and link to its canonical external target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-qt-audit-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(qt_audit LANGUAGES CXX)\nfind_package(Qt6 REQUIRED COMPONENTS Gui)\nadd_subdirectory(src/core)\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\ntarget_link_libraries(core PRIVATE Qt6::Gui)\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <QGuiApplication>\nint core() { return 1; }\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-gui\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not depend on QtGui"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^Qt6::Gui$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      const findings = data.report.findings.filter(item => item.rule_id === 'project:core-no-gui')
      expect(findings.map(item => item.extras?.kind).sort()).toEqual(['include', 'link'])
      expect(findings.every(item => item.extras?.sdk === 'Qt6::Gui')).toBe(true)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 60_000)

  it('deduplicates files and edges across seven modules and reports an ordered cycle', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-seven-audit-'))
    const build = join(root, 'build')
    try {
      const cmake = ['cmake_minimum_required(VERSION 3.25)', 'project(seven LANGUAGES CXX)']
      for (let i = 0; i < 7; i++) {
        await mkdir(join(root, `src/m${i}`), { recursive: true })
        await writeFile(join(root, `src/m${i}/m${i}.cpp`), `int m${i};\n`)
        cmake.push(`add_library(m${i} src/m${i}/m${i}.cpp)`)
      }
      cmake.push('add_library(m0_copy src/m0/m0.cpp)', 'target_link_libraries(m0 PRIVATE m2)', 'target_link_libraries(m0_copy PRIVATE m2)', 'target_link_libraries(m2 PRIVATE m1)', 'target_link_libraries(m1 PRIVATE m0)')
      await writeFile(join(root, 'CMakeLists.txt'), cmake.join('\n') + '\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(Object.keys(data.report.metrics.dep_graph)).toHaveLength(7)
      expect(data.report.metrics.dep_graph.m0).toEqual(['m2'])
      expect(data.report.metrics.per_module.m0?.LOC).toBe(1)
      expect(data.report.findings.filter(item => item.type === 'cycle')).toEqual([expect.objectContaining({ rule_id: 'baseline:no-circular', extras: { members: ['m0', 'm2', 'm1'] } })])
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('rejects a link whose target ownership spans multiple modules', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-owner-'))
    const build = join(root, 'build')
    try {
      for (const name of ['core', 'engine', 'ui']) {
        await mkdir(join(root, `src/${name}`), { recursive: true })
        await writeFile(join(root, `src/${name}/${name}.cpp`), `int ${name};\n`)
      }
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(owner LANGUAGES CXX)\nadd_library(mixed src/core/core.cpp src/engine/engine.cpp)\nadd_library(ui src/ui/ui.cpp)\ntarget_link_libraries(mixed PRIVATE ui)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/ambiguous.*mixed/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

})
