import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type ExecFileSyncLike = typeof execFileSync

export function resolveRuntimeRoot(fromImportMetaUrl: string): string {
  return resolve(dirname(fileURLToPath(fromImportMetaUrl)), '..')
}

export function resolveBundledDepcruiseCli(runtimeRoot: string): string {
  return join(runtimeRoot, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs')
}

export function readBundledDepcruiseVersion(
  runtimeRoot: string,
  execFileSyncImpl: ExecFileSyncLike = execFileSync,
): string {
  try {
    return execFileSyncImpl(
      process.execPath,
      [resolveBundledDepcruiseCli(runtimeRoot), '--version'],
      { encoding: 'utf-8' },
    ).trim()
  } catch (error: any) {
    throw new Error(
      `Bundled dependency-cruiser is unavailable at '${runtimeRoot}': ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

export function runBundledDepcruise(
  runtimeRoot: string,
  projectRoot: string,
  configPath: string,
  srcPath: string,
  execFileSyncImpl: ExecFileSyncLike = execFileSync,
): string {
  try {
    return execFileSyncImpl(
      process.execPath,
      [
        resolveBundledDepcruiseCli(runtimeRoot),
        '--output-type',
        'json',
        '--config',
        configPath,
        srcPath,
      ],
      { cwd: projectRoot, encoding: 'utf-8' },
    )
  } catch (error: any) {
    if (typeof error?.stdout === 'string' && error.stdout.length > 0) {
      return error.stdout
    }

    throw new Error(
      `Bundled dependency-cruiser failed for '${projectRoot}': ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
