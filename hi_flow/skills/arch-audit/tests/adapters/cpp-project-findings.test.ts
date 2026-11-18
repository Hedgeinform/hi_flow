import { describe, it, expect } from 'vitest'
import { matchCppProjectRules, type CppEdge } from '../../adapters/cpp/project-findings.ts'
import type { ProjectRules } from '../../core/types.ts'

describe('C++ project rules', () => {
  it('matches file and external boundaries and identifies missing required edges', () => {
    const edges: CppEdge[] = [
      { kind: 'include', source: { module: 'core', file: 'src/core/A.h' }, target: { module: 'engine', file: 'src/engine/B.h' }, line: 3 },
      { kind: 'link', source: { module: 'core', file: 'src/core/CMakeLists.txt' }, target: { module: 'Qt6::Gui', file: 'Qt6::Gui' }, external: true },
    ]
    const rules: ProjectRules = {
      forbidden: [
        { name: 'project:no-engine', severity: 'HIGH', principle: 'p', from: { path: '^src/core/' }, to: { path: '^src/engine/' } },
        { name: 'project:no-gui', severity: 'HIGH', principle: 'p', from: { path: '^src/core/' }, to: { path: '^Qt6::Gui$' } },
      ],
      required: [{ name: 'project:need-core', severity: 'HIGH', principle: 'p', from: { path: '^src/engine/' }, to: { path: '^src/core/' } }],
    }
    const findings = matchCppProjectRules(edges, rules, [{ module: 'engine', file: 'src/engine/B.h' }])
    expect(findings.map(item => item.rule_id)).toEqual(['project:no-engine', 'project:no-gui', 'project:need-core'])
    expect(findings[0]?.extras).toMatchObject({ kind: 'include', line: 3 })
    expect(findings[1]?.extras).toMatchObject({ external_target: true, sdk: 'Qt6::Gui', kind: 'link' })
    expect(findings[2]?.source.file).toBe('src/engine/B.h')
    expect(findings[2]?.type).toBe('coupling')
  })
})
