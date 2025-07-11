import { useState } from 'react'

interface Props {
    onClose: () => void
    onSubmit: (user: { name: string; email: string; role: string; status: string }) => void
}

export default function AddUserModal({ onClose, onSubmit }: Props) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: 'Student',
        status: 'Active',
    })

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add User</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    />
                    <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option>Admin</option>
                        <option>Lab Tech</option>
                        <option>Lab Head</option>
                        <option>Student</option>
                    </select>
                    <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded border px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
                    >
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded border px-4 py-2 text-sm dark:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(form)}
                        className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                    >
                        Add User
                    </button>
                </div>
            </div>
        </div>
    )
}
