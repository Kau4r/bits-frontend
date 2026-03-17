import { render } from '@testing-library/react'
import { LoadingSkeleton } from '@/ui/LoadingSkeleton'

describe('LoadingSkeleton', () => {
  it('renders default table skeleton with 5 rows', () => {
    const { container } = render(<LoadingSkeleton />)
    const rows = container.querySelectorAll('.flex.gap-4')
    expect(rows).toHaveLength(5)
  })

  it('renders card skeleton', () => {
    const { container } = render(<LoadingSkeleton type="card" rows={3} />)
    const cards = container.querySelectorAll('.rounded-xl')
    expect(cards).toHaveLength(3)
  })
})
