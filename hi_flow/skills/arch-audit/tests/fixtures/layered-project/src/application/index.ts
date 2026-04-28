import { businessRule } from '../domain/index.ts'
import { noop } from '../utils/index.ts'
export const useCase = () => { businessRule(); noop() }
