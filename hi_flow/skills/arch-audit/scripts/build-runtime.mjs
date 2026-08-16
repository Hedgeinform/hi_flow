import { strict as assert } from 'node:assert'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const runtimeRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const shippedDist = join(runtimeRoot, 'dist')
const checkOnly = process.argv.includes('--check')
const builtinModuleNames = new Set(builtinModules.map((name) => name.replace(/^node:/, '')))

const legacyResolverShim = {
  name: 'legacy-enhanced-resolve-shim',
  setup(buildContext) {
    buildContext.onResolve(
      { filter: /^enhanced-resolve\/lib\/createInnerCallback$/ },
      () => ({ path: 'createInnerCallback', namespace: 'arch-audit-legacy-resolver' }),
    )
    buildContext.onLoad(
      { filter: /.*/, namespace: 'arch-audit-legacy-resolver' },
      () => ({
        contents: `module.exports = function unsupportedLegacyResolver() {
          throw new Error('Legacy enhanced-resolve (<4) is not supported by the shipped arch-audit runtime')
        }`,
        loader: 'js',
      }),
    )
  },
}

const entryPoints = {
  'cli-apply-patch': join(runtimeRoot, 'helpers', 'cli-apply-patch.ts'),
  'cli-render-md': join(runtimeRoot, 'helpers', 'cli-render-md.ts'),
  'cli-run-audit': join(runtimeRoot, 'helpers', 'cli-run-audit.ts'),
  'dependency-cruise': join(runtimeRoot, 'node_modules', 'dependency-cruiser', 'bin', 'dependency-cruise.mjs'),
  json: join(runtimeRoot, 'node_modules', 'dependency-cruiser', 'src', 'report', 'json.mjs'),
  'regenerate-principles-index': join(runtimeRoot, 'helpers', 'regenerate-principles-index.ts'),
}

async function buildRuntime(outdir) {
  await mkdir(outdir, { recursive: true })
  const result = await build({
    entryPoints,
    outdir,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outExtension: { '.js': '.mjs' },
    plugins: [legacyResolverShim],
    banner: {
      js: "import { createRequire as createRuntimeRequire } from 'node:module';\nconst require = createRuntimeRequire(import.meta.url);",
    },
    legalComments: 'eof',
    metafile: true,
    minify: true,
    sourcemap: false,
    logLevel: 'warning',
  })

  const unexpectedExternalImports = Object.values(result.metafile.outputs)
    .flatMap((output) => output.imports)
    .filter((entry) => entry.external)
    .map((entry) => entry.path)
    .filter((path) => !builtinModuleNames.has(path.replace(/^node:/, '')))
  assert.deepEqual(
    [...new Set(unexpectedExternalImports)].sort(),
    [],
    'Shipped runtime contains external package imports',
  )

  for (const name of await readdir(outdir)) {
    const path = join(outdir, name)
    const contents = await readFile(path, 'utf8')
    await writeFile(path, contents.replace(/[ \t]+$/gm, '').replace(/^ +\t/gm, '\t'))
  }
}

async function readDist(directory) {
  const names = (await readdir(directory)).sort()
  const files = new Map()
  for (const name of names) {
    files.set(name, await readFile(join(directory, name)))
  }
  return files
}

async function assertDistFresh(actualDirectory, expectedDirectory) {
  const actual = await readDist(actualDirectory)
  const expected = await readDist(expectedDirectory)
  assert.deepEqual([...actual.keys()], [...expected.keys()], 'Shipped dist file set is stale')
  for (const [name, expectedBytes] of expected) {
    assert.deepEqual(actual.get(name), expectedBytes, `Shipped dist/${name} is stale`)
  }
}

if (checkOnly) {
  const temporaryDist = await mkdtemp(join(tmpdir(), 'arch-audit-dist-check-'))
  try {
    await buildRuntime(temporaryDist)
    await assertDistFresh(shippedDist, temporaryDist)
  } finally {
    await rm(temporaryDist, { recursive: true, force: true })
  }
} else {
  await rm(shippedDist, { recursive: true, force: true })
  await buildRuntime(shippedDist)
}
