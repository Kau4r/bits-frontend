import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Search } from '@/ui/Search'

describe('Search', () => {
  it('renders with placeholder', () => {
    render(<Search value="" onChange={() => {}} placeholder="Search items..." />)
    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('calls onChange when typing', async () => {
    const onChange = vi.fn()
    render(<Search value="" onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'test')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows clear button when value is set', () => {
    render(<Search value="test" onChange={() => {}} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('clears on clear button click', async () => {
    const onChange = vi.fn()
    render(<Search value="test" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
