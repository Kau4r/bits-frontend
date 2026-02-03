import { useState } from 'react'
import type { User_Role } from '@/types/user'

interface UserFormData {
    First_Name: string
    Middle_Name: string
    Last_Name: string
    Email: string
    Password: string
    User_Role: User_Role
    Is_Active: boolean
}

interface Props {
    onClose: () => void
    onSubmit: (user: UserFormData) => Promise<void> | void
}

export default function AddUserModal({ onClose, onSubmit }: Props) {
    const [form, setForm] = useState({
        First_Name: '',
        Middle_Name: '',
        Last_Name: '',
        Email: '',
        User_Role: 'STUDENT' as User_Role,
        Is_Active: true,
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const validateForm = () => {
        const newErrors: Record<string, string> = {}
        if (!form.First_Name.trim()) newErrors.First_Name = 'First name is required'
        if (!form.Last_Name.trim()) newErrors.Last_Name = 'Last name is required'
        if (!form.Email.trim()) {
            newErrors.Email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Email)) {
            newErrors.Email = 'Please enter a valid email'
        }
        return newErrors
    }

    const handleSubmit = async () => {
        const newErrors = validateForm()
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSubmitting(true)
        setErrors({})

        try {
            const password = `${form.First_Name[0].toLowerCase()}${form.Last_Name[0].toLowerCase()}123`
            await onSubmit({ ...form, Password: password })
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClassName = (field: string) =>
        `w-full rounded-lg border ${
            errors[field]
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600'
        } bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:ring-2 focus:outline-none dark:bg-gray-700 dark:text-white`

    const selectClassName = (field: string) =>
        `w-full rounded-lg border ${
            errors[field]
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600'
        } bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:ring-2 focus:outline-none dark:bg-gray-700 dark:text-white`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Add User</h2>
                <div className="space-y-4">
                    {/* First Name */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.First_Name}
                            onChange={(e) => {
                                setForm({ ...form, First_Name: e.target.value })
                                if (errors.First_Name) setErrors({ ...errors, First_Name: '' })
                            }}
                            className={inputClassName('First_Name')}
                            placeholder="Enter first name"
                        />
                        {errors.First_Name && (
                            <p className="mt-1 text-sm text-red-500">{errors.First_Name}</p>
                        )}
                    </div>

                    {/* Middle Name */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Middle Name
                        </label>
                        <input
                            type="text"
                            value={form.Middle_Name}
                            onChange={(e) => setForm({ ...form, Middle_Name: e.target.value })}
                            className={inputClassName('Middle_Name')}
                            placeholder="Enter middle name (optional)"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.Last_Name}
                            onChange={(e) => {
                                setForm({ ...form, Last_Name: e.target.value })
                                if (errors.Last_Name) setErrors({ ...errors, Last_Name: '' })
                            }}
                            className={inputClassName('Last_Name')}
                            placeholder="Enter last name"
                        />
                        {errors.Last_Name && (
                            <p className="mt-1 text-sm text-red-500">{errors.Last_Name}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={form.Email}
                            onChange={(e) => {
                                setForm({ ...form, Email: e.target.value })
                                if (errors.Email) setErrors({ ...errors, Email: '' })
                            }}
                            className={inputClassName('Email')}
                            placeholder="Enter email address"
                        />
                        {errors.Email && (
                            <p className="mt-1 text-sm text-red-500">{errors.Email}</p>
                        )}
                    </div>

                    {/* Role */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.User_Role}
                            onChange={(e) => setForm({ ...form, User_Role: e.target.value as User_Role })}
                            className={selectClassName('User_Role')}
                        >
                            <option value="ADMIN">Admin</option>
                            <option value="LAB_TECH">Lab Tech</option>
                            <option value="LAB_HEAD">Lab Head</option>
                            <option value="FACULTY">Faculty</option>
                            <option value="SECRETARY">Secretary</option>
                            <option value="STUDENT">Student</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Status
                        </label>
                        <select
                            value={form.Is_Active ? 'Active' : 'Inactive'}
                            onChange={(e) => setForm({ ...form, Is_Active: e.target.value === 'Active' })}
                            className={selectClassName('Is_Active')}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Adding...' : 'Add User'}
                    </button>
                </div>
            </div>
        </div>
    )
}
