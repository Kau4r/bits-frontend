import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FloatingSelect } from '@/ui/FloatingSelect'

const options = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'resolved', label: 'Resolved' },
]

describe('FloatingSelect', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('supports ArrowDown and Enter selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FloatingSelect
        id="status"
        value="pending"
        placeholder="Status"
        options={options}
        onChange={onChange}
      />
    )

    const button = screen.getByRole('button', { name: /pending/i })
    await user.click(button)
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onChange).toHaveBeenCalledWith('approved')
  })

  it('supports Home and End navigation', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FloatingSelect
        id="status"
        value="pending"
        placeholder="Status"
        options={options}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /pending/i }))
    await user.keyboard('{End}{Enter}')
    expect(onChange).toHaveBeenCalledWith('resolved')

    await user.click(screen.getByRole('button', { name: /pending/i }))
    await user.keyboard('{Home}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('pending')
  })

  it('renders the menu outside the trigger container', async () => {
    const user = userEvent.setup()

    render(
      <div data-testid="modal-body">
        <FloatingSelect
          id="status"
          value="pending"
          placeholder="Status"
          options={options}
          onChange={vi.fn()}
        />
      </div>
    )

    await user.click(screen.getByRole('button', { name: /pending/i }))

    const modalBody = screen.getByTestId('modal-body')
    expect(within(modalBody).queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('does not bubble portal option clicks to modal overlays', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onChange = vi.fn()

    render(
      <div data-testid="overlay" onClick={onClose}>
        <div onClick={(event) => event.stopPropagation()}>
          <FloatingSelect
            id="status"
            value="pending"
            placeholder="Status"
            options={options}
            onChange={onChange}
          />
        </div>
      </div>
    )

    await user.click(screen.getByRole('button', { name: /pending/i }))
    onClose.mockClear()
    await user.click(screen.getByRole('option', { name: /approved/i }))

    expect(onChange).toHaveBeenCalledWith('approved')
    expect(onClose).not.toHaveBeenCalled()
  })
})
