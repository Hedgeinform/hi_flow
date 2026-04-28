import { db } from '../infrastructure/index.ts'
import { noop } from '../utils/index.ts'
export const businessRule = () => { db(); noop() }
