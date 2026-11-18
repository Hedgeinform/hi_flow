import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

function available(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { stdio: 'ignore' })
  return result.status === 0
}
export const hasGcc = available('g++', ['--version'])
export const hasCmakeAndNinja = available('cmake', ['--version']) && available('ninja', ['--version'])
export const hasCppTools = hasGcc && hasCmakeAndNinja
const qt = spawnSync('qmake6', ['-query', 'QT_INSTALL_LIBS'], { encoding: 'utf8' })
const qtLibs = qt.status === 0 ? qt.stdout.trim() : ''
export const hasQt = hasCmakeAndNinja && !!qtLibs && ['Core', 'Qml', 'Gui'].every(name => existsSync(join(qtLibs, `cmake/Qt6${name}/Qt6${name}Config.cmake`)))
