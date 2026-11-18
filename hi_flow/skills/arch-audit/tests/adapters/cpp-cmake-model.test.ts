import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { readCmakeModel } from '../../adapters/cpp/cmake-model.ts'

describe('CMake model', () => {
  it('loads own targets and direct link edges from a configured project', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake model '))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await mkdir(join(root, 'src/engine'), { recursive: true })
      await mkdir(join(root, 'external'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), 'void core() {}\n')
      await writeFile(join(root, 'src/engine/engine.cpp'), 'void engine() {}\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(test LANGUAGES CXX)\nadd_subdirectory(src/core)\nfile(WRITE ${CMAKE_BINARY_DIR}/generated.cpp \"int generated;\\n\")\nset_source_files_properties(${CMAKE_BINARY_DIR}/generated.cpp PROPERTIES GENERATED TRUE)\ntarget_sources(core PRIVATE ${CMAKE_BINARY_DIR}/generated.cpp)\nadd_library(external INTERFACE IMPORTED)\nset_target_properties(external PROPERTIES INTERFACE_INCLUDE_DIRECTORIES \"${CMAKE_SOURCE_DIR}/external\")\nadd_library(core_alias ALIAS core)\ntarget_link_libraries(core PRIVATE external)\nadd_library(engine src/engine/engine.cpp)\nadd_library(headers INTERFACE)\ntarget_link_libraries(headers INTERFACE core)\ntarget_link_libraries(engine PUBLIC core_alias INTERFACE headers)\nadd_custom_target(order_only)\nadd_dependencies(engine order_only)\n')
      await writeFile(join(root, 'src/core/CMakeLists.txt'), 'add_library(core core.cpp)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const model = await readCmakeModel(root, build)
      expect(model.targets.map(target => target.name).sort()).toEqual(['core', 'engine', 'headers'])
      expect(model.targets.find(target => target.name === 'core')?.modules).toEqual(['core'])
      expect(model.targets.find(target => target.name === 'core')?.sources).toContainEqual({ path: join(build, 'generated.cpp'), generated: true })
      expect(model.targets.find(target => target.name === 'core')?.declarationFile).toBe(join(root, 'src/core/CMakeLists.txt'))
      expect(model.targets.find(target => target.name === 'core')?.declarationLine).toBe(1)
      expect(model.targets.find(target => target.name === 'engine')?.modules).toEqual(['engine'])
      expect(model.links).toContainEqual({ from: 'engine', to: 'core' })
      expect(model.links).toContainEqual({ from: 'engine', to: 'headers' })
      expect(model.links).toContainEqual({ from: 'headers', to: 'core' })
      expect(model.links).toContainEqual({ from: 'core', to: 'external' })
      expect(model.externalTargets).toContainEqual({ name: 'external', includeRoots: [join(root, 'external')] })
      expect(model.links).not.toContainEqual({ from: 'engine', to: 'external' })
      expect(model.links).not.toContainEqual({ from: 'engine', to: 'order_only' })
      expect(model.translationUnits).toEqual(expect.arrayContaining([join(root, 'src/core/core.cpp'), join(root, 'src/engine/engine.cpp')]))
      const otherRoot = join(root, 'other')
      await mkdir(otherRoot)
      await writeFile(join(otherRoot, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(other)\n')
      await expect(readCmakeModel(otherRoot, build)).rejects.toThrow(/CMake refresh failed.*build/i)
      await writeFile(join(root, 'CMakeGraphVizOptions.cmake'), 'set(GRAPHVIZ_STATIC_LIBS FALSE)\n')
      await expect(readCmakeModel(root, build)).rejects.toThrow(/Graphviz.*missing/i)
      await writeFile(join(root, 'CMakeGraphVizOptions.cmake'), '')
      execFileSync('cmake', ['-S', root, '-B', build, '-DCMAKE_EXPORT_COMPILE_COMMANDS=OFF'])
      await writeFile(join(build, 'compile_commands.json'), '[]')
      await expect(readCmakeModel(root, build)).rejects.toThrow(/Missing compile command.*core\.cpp/)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('retains a local header-only target without treating imported libraries as local', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake-interface-'))
    const build = join(root, 'build')
    try {
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(interface_test LANGUAGES CXX)\nadd_library(core core.cpp)\nadd_library(headers INTERFACE)\ntarget_sources(headers INTERFACE header.h)\nadd_library(headers_alias ALIAS headers)\nadd_library(external INTERFACE IMPORTED)\ntarget_link_libraries(core PRIVATE headers_alias external)\n')
      await writeFile(join(root, 'core.cpp'), 'int core;\n')
      await writeFile(join(root, 'header.h'), '#pragma once\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const model = await readCmakeModel(root, build)
      expect(model.targets.map(target => target.name)).toContain('headers')
      expect(model.targets.map(target => target.name)).not.toContain('external')
      expect(model.targets.find(target => target.name === 'headers')?.sources).toContainEqual({ path: join(root, 'header.h'), generated: false })
      expect(model.links).toContainEqual({ from: 'core', to: 'headers' })
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('associates a generated Qt QML plugin with its backing target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake-qml-'))
    const build = join(root, 'build')
    try {
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(qml_test LANGUAGES CXX)\nfind_package(Qt6 REQUIRED COMPONENTS Core Qml)\nqt_standard_project_setup()\nqt_add_qml_module(backing URI Example VERSION 1.0 SOURCES core.cpp)\n')
      await writeFile(join(root, 'core.cpp'), 'int core;\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja Multi-Config', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const model = await readCmakeModel(root, build, 'Debug')
      expect(model.targets.find(target => target.name === 'backingplugin')?.owner).toBe('backing')
      expect(model.links).toContainEqual({ from: 'backingplugin', to: 'backing' })
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('does not treat sources under the build directory as production units', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake-dependency-'))
    const build = join(root, 'build')
    try {
      await mkdir(join(root, 'src/core'), { recursive: true })
      await writeFile(join(root, 'src/core/core.cpp'), 'int core;\n')
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(dependency_test LANGUAGES CXX)\nfile(MAKE_DIRECTORY ${CMAKE_BINARY_DIR}/_deps/lib-src)\nfile(WRITE ${CMAKE_BINARY_DIR}/_deps/lib-src/external.cpp "int external;\\n")\nfile(WRITE ${CMAKE_BINARY_DIR}/_deps/lib-src/CMakeLists.txt "add_library(external external.cpp)\\n")\nadd_subdirectory(${CMAKE_BINARY_DIR}/_deps/lib-src ${CMAKE_BINARY_DIR}/lib-build)\nadd_library(core src/core/core.cpp)\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      const model = await readCmakeModel(root, build)
      expect(model.translationUnits).toEqual([join(root, 'src/core/core.cpp')])
      expect(model.targets.find(target => target.name === 'external')?.external).toBe(true)
      expect(model.targets.find(target => target.name === 'core')?.external).toBe(false)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('requires an explicit configuration in a multi-config build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake-multi-'))
    const build = join(root, 'build')
    try {
      await writeFile(join(root, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.25)\nproject(multi LANGUAGES CXX)\nadd_library(debuglib INTERFACE)\nadd_library(releaselib INTERFACE)\nadd_library(core core.cpp)\ntarget_link_libraries(core PRIVATE $<$<CONFIG:Debug>:debuglib> $<$<CONFIG:Release>:releaselib>)\n')
      await writeFile(join(root, 'core.cpp'), 'int core;\n')
      execFileSync('cmake', ['-S', root, '-B', build, '-G', 'Ninja Multi-Config', '-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'])
      await expect(readCmakeModel(root, build)).rejects.toThrow(/multiple configurations/i)
      const originalCache = await readFile(join(build, 'CMakeCache.txt'), 'utf8')
      const debug = await readCmakeModel(root, build, 'Debug')
      expect(debug.configuration).toBe('Debug')
      expect(debug.links).toContainEqual({ from: 'core', to: 'debuglib' })
      expect(debug.links).not.toContainEqual({ from: 'core', to: 'releaselib' })
      const release = await readCmakeModel(root, build, 'Release')
      expect(release.links).toContainEqual({ from: 'core', to: 'releaselib' })
      expect(release.links).not.toContainEqual({ from: 'core', to: 'debuglib' })
      expect(await readFile(join(build, 'CMakeCache.txt'), 'utf8')).toBe(originalCache)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
  it('rejects an unconfigured build directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cmake-invalid-'))
    try { await expect(readCmakeModel(root, join(root, 'build'))).rejects.toThrow(/build/i) }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
