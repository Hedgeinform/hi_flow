import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Ajv, { type ErrorObject } from 'ajv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCHEMA_PATH = join(__dirname, '..', 'references', 'd8-schema.json')
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'))

const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

export interface ValidationResult {
  valid: boolean
  errors: { path: string; message: string }[]
}

function formatErrors(errors: ErrorObject[] | null | undefined): { path: string; message: string }[] {
  if (!errors) return []
  return errors.map(e => ({ path: e.instancePath || '/', message: e.message ?? 'unknown' }))
}

export function validateD8Report(obj: unknown): ValidationResult {
  const ok = validate(obj)
  return { valid: !!ok, errors: formatErrors(validate.errors) }
}
