import { createPortal } from 'react-dom'
import { useRef, useState } from 'react'
import type { User_Role } from '@/types/user'
import { FloatingSelect } from '@/ui/FloatingSelect'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface UserFormData {
    Username: string
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
    const dialogRef = useRef<HTMLDivElement>(null)
    useFocusTrap(dialogRef, true)
    const [form, setForm] = useState({
        Username: '',
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
        if (!form.Username.trim()) newErrors.Username = 'Username is required'
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
            const password = `${form.First_Name.trim()[0].toLowerCase()}${form.Last_Name.trim()[0].toLowerCase()}123`
            await onSubmit({ ...form, Password: password, Username: form.Username })
        } finally {
            setIsSubmitting(false)
        }
    }

    const inputClassName = (field: string) =>
        `w-full px-3 py-2.5 rounded-lg border ${errors[field]
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
        } bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:outline-none`

    return createPortal(
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add User</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-4">
                        {/* Username (htshadow) */}
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.Username}
                                onChange={(e) => {
                                    setForm({ ...form, Username: e.target.value })
                                    if (errors.Username) setErrors({ ...errors, Username: '' })
                                }}
                                className={inputClassName('Username')}
                                placeholder="Enter htshadow username"
                            />
                            {errors.Username && (
                                <p className="mt-1 text-sm text-red-500">{errors.Username}</p>
                            )}
                        </div>

                        {/* First Name */}
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
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
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Role <span className="text-red-500">*</span>
                            </label>
                            <FloatingSelect
                                id="add-user-role"
                                value={form.User_Role}
                                placeholder="Select role"
                                options={[
                                    { value: 'ADMIN', label: 'Admin' },
                                    { value: 'LAB_TECH', label: 'Lab Tech' },
                                    { value: 'LAB_HEAD', label: 'Lab Head' },
                                    { value: 'FACULTY', label: 'Faculty' },
                                    { value: 'SECRETARY', label: 'Secretary' },
                                    { value: 'STUDENT', label: 'Student' },
                                ]}
                                onChange={(value) => setForm({ ...form, User_Role: value as User_Role })}
                            />
                        </div>

                        {/* Status */}
                        <div className="flex flex-col">
                            <label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Status
                            </label>
                            <FloatingSelect
                                id="add-user-status"
                                value={form.Is_Active ? 'Active' : 'Inactive'}
                                placeholder="Select status"
                                options={[
                                    { value: 'Active', label: 'Active' },
                                    { value: 'Inactive', label: 'Inactive' },
                                ]}
                                onChange={(value) => setForm({ ...form, Is_Active: value === 'Active' })}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Adding...' : 'Add User'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
