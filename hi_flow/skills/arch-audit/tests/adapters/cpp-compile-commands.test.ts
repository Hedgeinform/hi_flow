import { describe, it, expect } from 'vitest'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readCompileCommands } from '../../adapters/cpp/compile-commands.ts'

describe('compile database', () => {
  it('preserves quoted arguments and expands response files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp database '))
    try {
      await writeFile(join(dir, 'args.rsp'), '-I"include dir" -DNAME="hello world"')
      await writeFile(join(dir, 'compile_commands.json'), JSON.stringify([{ directory: dir, file: 'main.cpp', command: 'c++ @args.rsp -c main.cpp -o main.o' }]))
      const [command] = await readCompileCommands(dir)
      expect(command?.argv).toEqual(['c++', '-Iinclude dir', '-DNAME=hello world', '-c', 'main.cpp', '-o', 'main.o'])
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
  it('rejects shell pipelines and recursive response files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cpp-invalid-'))
    try {
      const db = join(dir, 'compile_commands.json')
      await writeFile(db, JSON.stringify([{ directory: dir, file: 'x.cpp', command: 'c++ -c x.cpp | cat' }]))
      await expect(readCompileCommands(dir)).rejects.toThrow(/shell/i)
      await writeFile(db, JSON.stringify([{ directory: dir, file: 'x.cpp', command: 'c++ -DNAME=\"$VALUE\" -c x.cpp' }]))
      await expect(readCompileCommands(dir)).rejects.toThrow(/shell/i)
      await writeFile(join(dir, 'a.rsp'), '@a.rsp')
      await writeFile(db, JSON.stringify([{ directory: dir, file: 'x.cpp', arguments: ['c++', '@a.rsp'] }]))
      await expect(readCompileCommands(dir)).rejects.toThrow(/cycl/i)
    } finally { await rm(dir, { recursive: true, force: true }) }
  })
})
