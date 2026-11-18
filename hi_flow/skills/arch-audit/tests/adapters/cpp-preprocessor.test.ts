import { hasGcc } from '../cpp-tools.ts'
import { describe, it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { collectIncludes } from '../../adapters/cpp/preprocessor.ts'

describe.skipIf(!hasGcc)('C++ preprocessor', () => {
  it('retains direct guarded and macro includes with owners and source lines', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-preprocess-'))
    try {
      await mkdir(join(dir, 'quoted'))
      await mkdir(join(dir, 'system'))
      await writeFile(join(dir, 'main.cpp'), '#include "A.h"\n#include "B.h"\n#if 0\n#include "Inactive.h"\n#endif\n')
      await writeFile(join(dir, 'A.h'), '// a\n// b\n#include "Shared.h"\n#define NAME "Macro.h"\n#include NAME\n#include "Same.h"\n')
      await writeFile(join(dir, 'B.h'), '// a\n// b\n// c\n// d\n#include "Shared.h"\n#include <Same.h>\n')
      await writeFile(join(dir, 'Shared.h'), '#pragma once\n')
      await writeFile(join(dir, 'Macro.h'), '#pragma once\n')
      await writeFile(join(dir, 'quoted/Same.h'), '#pragma once\n')
      await writeFile(join(dir, 'system/Same.h'), '#pragma once\n')
      const result = await collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-g', '-iquote', 'quoted', '-I', 'system', '-c', 'main.cpp', '-o', 'main.o'] })
      expect(result.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({ from: join(dir, 'A.h'), to: join(dir, 'Shared.h'), line: 3 }),
        expect.objectContaining({ from: join(dir, 'B.h'), to: join(dir, 'Shared.h'), line: 5 }),
        expect.objectContaining({ from: join(dir, 'A.h'), to: join(dir, 'Macro.h'), line: 5 }),
        expect.objectContaining({ from: join(dir, 'A.h'), to: join(dir, 'quoted/Same.h') }),
        expect.objectContaining({ from: join(dir, 'B.h'), to: join(dir, 'system/Same.h') }),
      ]))
      expect(result.visitedFiles).toContain(join(dir, 'Macro.h'))
      expect(result.edges.some(edge => edge.to.endsWith('Inactive.h'))).toBe(false)
      expect(result.edges.some(edge => edge.from === join(dir, 'main.cpp') && edge.to === join(dir, 'Shared.h'))).toBe(false)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('records forced headers and their own nested dependencies', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-forced-'))
    try {
      await writeFile(join(dir, 'main.cpp'), 'int main_value;\n')
      await writeFile(join(dir, 'forced.h'), '#include "nested.h"\n')
      await writeFile(join(dir, 'nested.h'), '#pragma once\n')
      const result = await collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-include', 'forced.h', '-MD', '-MF', 'deps.d', '-c', 'main.cpp', '-o', 'main.o'] })
      expect(result.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({ from: join(dir, 'main.cpp'), to: join(dir, 'forced.h') }),
        expect.objectContaining({ from: join(dir, 'forced.h'), to: join(dir, 'nested.h'), line: 1 }),
      ]))
      expect(result.visitedFiles).toContain(join(dir, 'forced.h'))
      const joined = await collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-includeforced.h', '-c', 'main.cpp'] })
      expect(joined.edges).toEqual(expect.arrayContaining([expect.objectContaining({ from: join(dir, 'main.cpp'), to: join(dir, 'forced.h') })]))
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('handles real standard library headers and include_next directives', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-stdlib-'))
    try {
      await writeFile(join(dir, 'main.cpp'), '#include <vector>\nstd::vector<int> v;\n')
      const result = await collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-std=c++17', '-c', 'main.cpp'] })
      expect(result.edges.some(edge => edge.from === join(dir, 'main.cpp') && edge.to.endsWith('/vector'))).toBe(true)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('rejects ambiguous include_next resolution instead of producing a false edge', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-next-ambiguous-'))
    try {
      await mkdir(join(dir, 'includes/nested'), { recursive: true })
      await mkdir(join(dir, 'fallback'))
      await writeFile(join(dir, 'fallback/Header.h'), '#pragma once\n')
      await writeFile(join(dir, 'includes/nested/Header.h'), '#include_next <Header.h>\n')
      await writeFile(join(dir, 'main.cpp'), `#include "${join(dir, 'fallback/Header.h')}"\n#include <Header.h>\n`)
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-I', 'includes', '-I', 'includes/nested', '-I', 'fallback', '-c', 'main.cpp'] })).rejects.toThrow(/ambiguous.*include_next/i)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('rejects a precompiled header when it hides nested includes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-pch-'))
    try {
      await writeFile(join(dir, 'main.cpp'), 'int value;\n')
      await writeFile(join(dir, 'pch.h'), '#include "nested.h"\n')
      await writeFile(join(dir, 'nested.h'), '#pragma once\n')
      execFileSync('g++', ['-x', 'c++-header', 'pch.h', '-o', 'pch.h.gch'], { cwd: dir })
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-fpch-preprocess', '-include', 'pch.h', '-c', 'main.cpp'] })).rejects.toThrow(/precompiled header/i)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('rejects a command that preprocesses a different translation unit', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-wrong-unit-'))
    try {
      await writeFile(join(dir, 'main.cpp'), 'int main_value;\n')
      await writeFile(join(dir, 'other.cpp'), 'int other_value;\n')
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-c', 'other.cpp'] })).rejects.toThrow(/translation unit/i)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('rejects logical file remapping that would hide the physical include owner', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-line-remap-'))
    try {
      await writeFile(join(dir, 'main.cpp'), '#line 40 "virtual.cpp"\n#include <stddef.h>\n')
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-c', 'main.cpp'] })).rejects.toThrow(/remap/i)
      await writeFile(join(dir, 'main.cpp'), '#line 40 \"<virtual>\"\n#include <stddef.h>\n')
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-c', 'main.cpp'] })).rejects.toThrow(/remap/i)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('fails on a missing header', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-missing-'))
    try {
      await writeFile(join(dir, 'main.cpp'), '#include "missing.h"\n')
      await expect(collectIncludes({ directory: dir, file: 'main.cpp', argv: ['g++', '-c', 'main.cpp'] })).rejects.toThrow(/missing\.h/)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})
