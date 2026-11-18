import { hasCppTools, hasQt } from '../cpp-tools.ts'
import { describe, it, expect } from 'vitest'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createCppCmakeAdapter } from '../../adapters/cpp-cmake.ts'
import { buildReportData, renderReport } from '../../core/report-builder.ts'
import { fixturePath } from '../test-paths.ts'

describe.skipIf(!hasCppTools)('C++ CMake audit', () => {
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
      expect(data.report.metadata.audit_tooling_version).toMatch(/^cpp-cmake@1\.0\.0; cmake=.+; compiler=.+; configuration=/)
      expect(data.report.metrics.dep_graph).toEqual({ core: [], engine: ['core'] })
      expect(data.report.metadata.operator_notes?.join(' ')).toContain('baseline:not-to-test-from-prod')
      expect(data.report.metadata.operator_notes?.join(' ')).toContain('baseline:frontend-layer-cycle')
      expect(data.report.metrics.per_module.core?.LOC).toBe(7)
      const finding = data.report.findings.find(item => item.rule_id === 'project:engine-no-core')
      expect(finding).toMatchObject({ severity: 'HIGH', source: { module: 'engine' }, target: { module: 'core' } })
      expect(JSON.parse(await readFile(data.json_path, 'utf8')).metadata.schema_version).toBe('1.2')
      const rendered = await renderReport(data, () => ({ name: 'Test', root_cause: 'Test cause' }))
      const markdown = await readFile(rendered.md_path, 'utf8')
      expect(markdown).toContain('CTest')
      expect(markdown).toContain('clang-tidy')
      expect(markdown).not.toContain('npx depcruise --validate')
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

  it.skipIf(!hasQt)('maps a real QtGui include and link to its canonical external target', async () => {
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

  it('finds dependencies in an own header reached only from a generated translation unit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-generated-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'src/engine'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), 'int core;\n')
      await writeFile(join(root, 'src/core/Exported.h'), '#pragma once\n#include "../engine/Engine.h"\n')
      await writeFile(join(root, 'src/engine/Engine.h'), '#pragma once\n')
      await writeFile(join(root, 'src/engine/engine.cpp'), 'int engine;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(generated LANGUAGES CXX)\nfile(WRITE ${CMAKE_BINARY_DIR}/generated.cpp "#include \\"${CMAKE_SOURCE_DIR}/src/core/Exported.h\\"\\n#include \\"${CMAKE_SOURCE_DIR}/src/engine/Engine.h\\"\\n")\nset_source_files_properties(${CMAKE_BINARY_DIR}/generated.cpp PROPERTIES GENERATED TRUE)\nadd_library(core src/core/core.cpp src/core/Exported.h ${CMAKE_BINARY_DIR}/generated.cpp)\nadd_library(engine src/engine/engine.cpp src/engine/Engine.h)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-engine\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not depend on engine"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^src/engine/"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-engine', source: { module: 'core', file: 'src/core/Exported.h' } }))
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-engine', source: { module: 'core', file: 'src/core/core.cpp' }, extras: expect.objectContaining({ evidence_file: 'build/generated.cpp' }) }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('matches module rules when links are declared in a parent CMake file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-parent-link-'))
    const build = join(root, 'build')
    try {
      for (const name of ['core', 'engine']) {
        await mkdir(join(root, `src/${name}`), { recursive: true })
        await writeFile(join(root, `src/${name}/${name}.cpp`), `int ${name};\n`)
        await writeFile(join(root, `src/${name}/CMakeLists.txt`), `add_library(${name} ${name}.cpp)\n`)
      }
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(parent_link LANGUAGES CXX)\nadd_subdirectory(src/core)\nadd_subdirectory(src/engine)\ntarget_link_libraries(core PRIVATE engine)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-engine\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not depend on engine"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^src/engine/"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-engine', source: { module: 'core', file: 'src/core/CMakeLists.txt' }, target: { module: 'engine', file: 'src/engine/CMakeLists.txt' }, extras: expect.objectContaining({ evidence_file: 'CMakeLists.txt', line: 5 }) }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('assigns an interface target to its declaring module and checks external links', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-interface-owner-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), 'int core;\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\nadd_library(core_gui INTERFACE)\ntarget_link_libraries(core_gui INTERFACE Vendor::Gui)\ntarget_link_libraries(core PRIVATE core_gui)\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(interface_owner LANGUAGES CXX)\nadd_library(Vendor::Gui INTERFACE IMPORTED)\nadd_subdirectory(src/core)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-gui\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not use GUI"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^Vendor::Gui$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-gui', source: { module: 'core', file: 'src/core/CMakeLists.txt' }, target: { module: 'Vendor::Gui', file: 'Vendor::Gui' } }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('keeps libc headers unowned when linked packages share the system root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-shared-system-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), '#include <fcntl.h>\n#include <unistd.h>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(shared LANGUAGES CXX)\nadd_library(A::A INTERFACE IMPORTED)\nadd_library(B::B INTERFACE IMPORTED)\ntarget_include_directories(A::A INTERFACE /usr/include)\ntarget_include_directories(B::B INTERFACE /usr/include)\nadd_library(core src/core/core.cpp)\ntarget_link_libraries(core PRIVATE A::A B::B)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.metadata.operator_notes?.join(' ')).toMatch(/unresolved|unowned|не установлен/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it.each(['-I${CMAKE_SOURCE_DIR}/vendor', '-I ${CMAKE_SOURCE_DIR}/vendor', '-isystem ${CMAKE_SOURCE_DIR}/vendor', '-Wp,-I,${CMAKE_SOURCE_DIR}/vendor'])('does not lose unknown raw include option %s', async option => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-raw-include-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'vendor'))
      await writeFile(join(root, 'vendor/foreign.h'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <foreign.h>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), `cmake_minimum_required(VERSION 3.25)\nproject(raw LANGUAGES CXX)\nadd_library(core src/core/core.cpp)\nset(CMAKE_CXX_FLAGS "${option}")\n`)
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/external include.*target/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('detects QtGui through a raw nested include option', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-raw-qt-')), build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'sdk/QtGui/private'), { recursive: true })
      await writeFile(join(root, 'sdk/QtGui/private/QRaw.h'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <QRaw.h>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(rawqt LANGUAGES CXX)\nadd_library(Qt6::Gui INTERFACE IMPORTED)\ntarget_include_directories(Qt6::Gui INTERFACE ${CMAKE_SOURCE_DIR}/sdk/QtGui)\nadd_library(core src/core/core.cpp)\nset(CMAKE_CXX_FLAGS "-I${CMAKE_SOURCE_DIR}/sdk/QtGui/private")\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-gui\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: no gui\n    from:\n      path: "^src/core/"\n    to:\n      path: "^Qt6::Gui$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-gui', extras: expect.objectContaining({ kind: 'include', sdk: 'Qt6::Gui' }) }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('fails if an ambiguous system owner matters to a project rule', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-system-rule-')), build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), '#include <unistd.h>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(shared LANGUAGES CXX)\nadd_library(A::A INTERFACE IMPORTED)\nadd_library(B::B INTERFACE IMPORTED)\ntarget_include_directories(A::A INTERFACE /usr/include)\ntarget_include_directories(B::B INTERFACE /usr/include)\nadd_library(core src/core/core.cpp)\ntarget_link_libraries(core PRIVATE A::A B::B)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-a\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: no a\n    from:\n      path: "^src/core/"\n    to:\n      path: "^A::A$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/ambiguous external include.*project rule/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('rejects an unknown header included directly by relative path', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-relative-foreign-')), build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true }); await mkdir(join(root, 'vendor'))
      await writeFile(join(root, 'vendor/foreign.h'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include "../../vendor/foreign.h"\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(relative LANGUAGES CXX)\nadd_library(core src/core/core.cpp)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/external include.*target/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('rejects ambiguous Qt ownership even when another candidate is linked', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-shared-qt-')), build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true }); await mkdir(join(root, 'sdk'))
      await writeFile(join(root, 'sdk/QGuiApplication'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <QGuiApplication>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(sharedqt LANGUAGES CXX)\nadd_library(Qt6::Gui INTERFACE IMPORTED)\nadd_library(Other::Other INTERFACE IMPORTED)\ntarget_include_directories(Qt6::Gui INTERFACE ${CMAKE_SOURCE_DIR}/sdk)\ntarget_include_directories(Other::Other INTERFACE ${CMAKE_SOURCE_DIR}/sdk)\nadd_library(core src/core/core.cpp)\ntarget_link_libraries(core PRIVATE Other::Other)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-gui\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: no gui\n    from:\n      path: "^src/core/"\n    to:\n      path: "^Qt6::Gui$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/ambiguous external include.*project rule/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('maps imported include roots set through both CMake APIs and bare external links', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-external-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'vendor/a'), { recursive: true })
      await mkdir(join(root, 'vendor/b'), { recursive: true })
      await mkdir(join(root, 'vendor/a/private'), { recursive: true })
      await writeFile(join(root, 'vendor/a/GuiA.h'), '#pragma once\n')
      await writeFile(join(root, 'vendor/b/GuiB.h'), '#pragma once\n')
      await writeFile(join(root, 'vendor/a/private/GuiC.h'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <vector>\n#include <GuiA.h>\n#include <GuiB.h>\n#include <GuiC.h>\nint core;\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\ntarget_include_directories(core PRIVATE ${CMAKE_SOURCE_DIR}/vendor/a/private)\ntarget_link_libraries(core PRIVATE Vendor::Gui avformat)\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(external LANGUAGES CXX)\nadd_library(Vendor::Gui INTERFACE IMPORTED)\nadd_library(Vendor::SystemA INTERFACE IMPORTED)\nadd_library(Vendor::SystemB INTERFACE IMPORTED)\ntarget_include_directories(Vendor::SystemA INTERFACE /usr/include)\ntarget_include_directories(Vendor::SystemB INTERFACE /usr/include)\ntarget_include_directories(Vendor::Gui INTERFACE vendor/a)\nset_property(TARGET Vendor::Gui APPEND PROPERTY INTERFACE_INCLUDE_DIRECTORIES ${CMAKE_SOURCE_DIR}/vendor/b)\nadd_subdirectory(src/core)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-gui\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not use GUI"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^Vendor::Gui$"\n  - name: core-no-avformat\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not use avformat"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^avformat$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      const gui = data.report.findings.filter(item => item.rule_id === 'project:core-no-gui')
      expect(gui.filter(item => item.extras?.kind === 'include')).toHaveLength(3)
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:core-no-avformat', target: { module: 'avformat', file: 'avformat' } }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('uses an actual nested module CMake file as the rule locator', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-nested-link-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core/codec'), { recursive: true })
      await mkdir(join(root, 'src/engine'), { recursive: true })
      await writeFile(join(root, 'src/core/codec/core.cpp'), 'int core;\n')
      await writeFile(join(root, 'src/engine/engine.cpp'), 'int engine;\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_subdirectory(codec)\n')
      await writeFile(join(root, 'src/core/codec/CMakeLists.txt'), 'add_library(core core.cpp)\n')
      await writeFile(join(root, 'src/engine/CMakeLists.txt'), 'add_library(engine engine.cpp)\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(nested LANGUAGES CXX)\nadd_subdirectory(src/core)\nadd_subdirectory(src/engine)\ntarget_link_libraries(core PRIVATE engine)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: codec-no-engine\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Codec must not use engine"\n    from:\n      path: "^src/core/codec/CMakeLists.txt$"\n    to:\n      path: "^src/engine/"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      expect(data.report.findings).toContainEqual(expect.objectContaining({ rule_id: 'project:codec-no-engine', source: { module: 'core', file: 'src/core/codec/CMakeLists.txt' } }))
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('fails when a project include root has no identifiable external target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-unknown-external-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'vendor'), { recursive: true })
      await writeFile(join(root, 'vendor/external.h'), '#pragma once\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <external.h>\nint core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(unknown_external LANGUAGES CXX)\nadd_library(core src/core/core.cpp)\ntarget_include_directories(core PRIVATE ${CMAKE_SOURCE_DIR}/vendor)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })).rejects.toThrow(/external include.*target/i)
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('maps vendored CMake targets and their headers to external dependencies', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-vendored-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'third_party/miniz'), { recursive: true })
      await writeFile(join(root, 'third_party/miniz/miniz.h'), '#pragma once\n')
      await writeFile(join(root, 'third_party/miniz/miniz.c'), 'int miniz;\n')
      await writeFile(join(root, 'third_party/miniz/CMakeLists.txt'), 'add_library(lea_miniz miniz.c)\ntarget_include_directories(lea_miniz PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})\n')
      await writeFile(join(root, 'src/core/core.cpp'), '#include <miniz.h>\nint core;\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\ntarget_link_libraries(core PRIVATE lea_miniz)\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(vendored LANGUAGES C CXX)\nadd_subdirectory(third_party/miniz)\nadd_subdirectory(src/core)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-vendor\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not use vendor"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^lea_miniz$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      const findings = data.report.findings.filter(item => item.rule_id === 'project:core-no-vendor')
      expect(findings.map(item => item.extras?.kind).sort()).toEqual(['include', 'link'])
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

  it('recognizes a dependency and include root inside the CMake build tree', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cpp-fetched-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), '#include <rt.h>\nint core;\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\ntarget_link_libraries(core PRIVATE rtaudio)\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(fetched LANGUAGES C CXX)\nfile(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/_deps/rt-src)\nfile(WRITE ${CMAKE_BINARY_DIR}/_deps/rt-src/rt.h "#pragma once\\n")\nfile(WRITE ${CMAKE_BINARY_DIR}/_deps/rt-src/rt.c "int rt;\\n")\nfile(WRITE ${CMAKE_BINARY_DIR}/_deps/rt-src/CMakeLists.txt "add_library(rtaudio rt.c)\\ntarget_include_directories(rtaudio PUBLIC .)\\n")\nadd_subdirectory(${CMAKE_BINARY_DIR}/_deps/rt-src ${CMAKE_BINARY_DIR}/rt-build)\nadd_subdirectory(src/core)\n')
      await writeFile(join(root, '.audit-rules.yaml'), 'forbidden:\n  - name: core-no-rt\n    severity: HIGH\n    principle: layered-architecture-respect\n    comment: "Core must not use rtaudio"\n    from:\n      path: "^src/core/"\n    to:\n      path: "^rtaudio$"\nrequired: []\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const data = await buildReportData(createCppCmakeAdapter(), root, { auditSha: 'test', buildDir: build })
      const findings = data.report.findings.filter(item => item.rule_id === 'project:core-no-rt')
      expect(findings.map(item => item.extras?.kind).sort()).toEqual(['include', 'link'])
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)

})
