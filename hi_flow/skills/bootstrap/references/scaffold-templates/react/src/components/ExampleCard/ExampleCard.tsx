// Convention reference pattern (generic, non-domain). Demonstrates the `components/` layer:
// PascalCase file (`ExampleCard.tsx`), explicit props type, NAMED export, a downward import
// into the `hooks/` layer. Presentational only — no domain logic. Deletable without loss.
import { useExampleToggle } from '../../hooks/useExampleToggle'

export interface ExampleCardProps {
  title: string
}

export function ExampleCard({ title }: ExampleCardProps) {
  const { on, toggle } = useExampleToggle()
  return (
    <section>
      <h2>{title}</h2>
      <button type="button" onClick={toggle}>
        {on ? 'On' : 'Off'}
      </button>
    </section>
  )
}
