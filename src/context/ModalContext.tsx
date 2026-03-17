import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    Info,
} from 'lucide-react';

type ModalType = 'alert' | 'confirm' | 'error' | 'success';

interface ModalState {
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ModalContextType {
    showAlert: (message: string, title?: string) => Promise<void>;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showError: (message: string, title?: string) => Promise<void>;
    showSuccess: (message: string, title?: string) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}

interface ModalProviderProps {
    children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
    });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (modal.isOpen) {
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [modal.isOpen]);

    const closeModal = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => setModal(prev => ({ ...prev, isOpen: false })), 150);
    }, []);

    const showAlert = useCallback((message: string, title: string = 'Notice') => {
        return new Promise<void>((resolve) => {
            setModal({
                isOpen: true,
                type: 'alert',
                title,
                message,
                onConfirm: () => {
                    closeModal();
                    setTimeout(resolve, 150);
                },
                confirmText: 'OK',
            });
        });
    }, [closeModal]);

    const showConfirm = useCallback((message: string, title: string = 'Confirm') => {
        return new Promise<boolean>((resolve) => {
            setModal({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                onConfirm: () => {
                    closeModal();
                    setTimeout(() => resolve(true), 150);
                },
                onCancel: () => {
                    closeModal();
                    setTimeout(() => resolve(false), 150);
                },
                confirmText: 'Confirm',
                cancelText: 'Cancel',
            });
        });
    }, [closeModal]);

    const showError = useCallback((message: string, title: string = 'Error') => {
        return new Promise<void>((resolve) => {
            setModal({
                isOpen: true,
                type: 'error',
                title,
                message,
                onConfirm: () => {
                    closeModal();
                    setTimeout(resolve, 150);
                },
                confirmText: 'OK',
            });
        });
    }, [closeModal]);

    const showSuccess = useCallback((message: string, title: string = 'Success') => {
        return new Promise<void>((resolve) => {
            setModal({
                isOpen: true,
                type: 'success',
                title,
                message,
                onConfirm: () => {
                    closeModal();
                    setTimeout(resolve, 150);
                },
                confirmText: 'OK',
            });
        });
    }, [closeModal]);

    const getModalStyle = () => {
        switch (modal.type) {
            case 'error':
                return {
                    Icon: XCircle,
                    iconBg: 'bg-red-100 dark:bg-red-900/30',
                    iconColor: 'text-red-600 dark:text-red-400',
                    buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
                };
            case 'success':
                return {
                    Icon: CheckCircle,
                    iconBg: 'bg-green-100 dark:bg-green-900/30',
                    iconColor: 'text-green-600 dark:text-green-400',
                    buttonClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
                };
            case 'confirm':
                return {
                    Icon: AlertTriangle,
                    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    buttonClass: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
                };
            default:
                return {
                    Icon: Info,
                    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    buttonClass: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
                };
        }
    };

    const { Icon, iconBg, iconColor, buttonClass } = getModalStyle();

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showError, showSuccess }}>
            {children}

            {modal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/50 transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                        onClick={modal.onCancel || modal.onConfirm}
                    />

                    {/* Modal */}
                    <div
                        className={`relative w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-150 dark:bg-gray-800 ${
                            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                        }`}
                    >
                        <div className="p-6">
                            {/* Icon */}
                            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
                                <Icon className={`h-6 w-6 ${iconColor}`} />
                            </div>

                            {/* Content */}
                            <div className="mt-4 text-center">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {modal.title}
                                </h3>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    {modal.message}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50">
                            {modal.type === 'confirm' && modal.onCancel && (
                                <button
                                    onClick={modal.onCancel}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    {modal.cancelText}
                                </button>
                            )}
                            <button
                                onClick={modal.onConfirm}
                                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${buttonClass}`}
                            >
                                {modal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ModalContext.Provider>
    );
}
