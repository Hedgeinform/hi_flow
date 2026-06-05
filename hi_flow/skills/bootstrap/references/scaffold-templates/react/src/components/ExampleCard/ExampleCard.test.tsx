// Co-located test. Query by role/text and assert on what the user sees — behavior, not internals.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExampleCard } from './ExampleCard'

describe('ExampleCard', () => {
  it('renders the title and toggles the button label', async () => {
    render(<ExampleCard title="Demo" />)
    expect(screen.getByRole('heading', { name: 'Demo' })).toBeInTheDocument()
    const btn = screen.getByRole('button')
    expect(btn).toHaveTextContent('Off')
    await userEvent.click(btn)
    expect(btn).toHaveTextContent('On')
  })
})
