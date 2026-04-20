import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FloatingSelect } from '@/ui/FloatingSelect'

function ModalFixture({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? 'dark' : ''}>
      <div className="fixed inset-0 grid place-items-center bg-black/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Visual Contract</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <FloatingSelect
              id="visual-select"
              value="rooms"
              placeholder="Choose"
              options={[
                { value: 'rooms', label: 'Rooms' },
                { value: 'schedule', label: 'My Schedule' },
              ]}
              onChange={vi.fn()}
            />
          </div>
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <button type="button">Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

describe('modal dropdown visual contracts', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('keeps long modal structure constrained in light mode', async () => {
    const user = userEvent.setup()
    render(<ModalFixture />)

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[90vh]', 'overflow-hidden')
    await user.click(screen.getByRole('button', { name: /rooms/i }))
    expect(screen.getByRole('listbox')).toHaveClass('fixed', 'max-h-48', 'scrollbar-thin')
  })

  it('keeps long modal structure constrained in dark mode', async () => {
    const user = userEvent.setup()
    render(<ModalFixture dark />)

    expect(screen.getByRole('dialog')).toHaveClass('dark:bg-gray-900')
    await user.click(screen.getByRole('button', { name: /rooms/i }))
    expect(screen.getByRole('listbox')).toHaveClass('dark:bg-[#252d38]')
  })
})
