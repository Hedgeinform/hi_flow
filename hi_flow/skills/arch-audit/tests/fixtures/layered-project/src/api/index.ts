import { useCase } from '../application/index.ts'
import { noop } from '../utils/index.ts'
export const handler = () => { useCase(); noop() }
