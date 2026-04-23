import { MonitorSmartphone } from 'lucide-react';

export default function StudentDesktopPlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8 dark:bg-gray-900">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <MonitorSmartphone className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          This website login is not available for student accounts.
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Students should use the student access page on mobile.
        </p>
      </div>
    </div>
  );
}
