import { render, screen } from '@testing-library/react'
import { Badge } from '@/ui/Badge'

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>Available</Badge>)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('applies success variant', () => {
    render(<Badge variant="success">Active</Badge>)
    expect(screen.getByText('Active')).toHaveClass('bg-green-100')
  })

  it('applies danger variant', () => {
    render(<Badge variant="danger">Lost</Badge>)
    expect(screen.getByText('Lost')).toHaveClass('bg-red-100')
  })
})
