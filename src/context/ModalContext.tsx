import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

    const closeModal = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
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
                    resolve();
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
                    resolve(true);
                },
                onCancel: () => {
                    closeModal();
                    resolve(false);
                },
                confirmText: 'Yes',
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
                    resolve();
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
                    resolve();
                },
                confirmText: 'OK',
            });
        });
    }, [closeModal]);

    const getIconAndColor = () => {
        switch (modal.type) {
            case 'error':
                return { icon: '❌', bgColor: 'bg-red-500', borderColor: 'border-red-500' };
            case 'success':
                return { icon: '✅', bgColor: 'bg-green-500', borderColor: 'border-green-500' };
            case 'confirm':
                return { icon: '❓', bgColor: 'bg-blue-500', borderColor: 'border-blue-500' };
            default:
                return { icon: 'ℹ️', bgColor: 'bg-blue-500', borderColor: 'border-blue-500' };
        }
    };

    const { icon, bgColor, borderColor } = getIconAndColor();

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm, showError, showSuccess }}>
            {children}

            {/* Modal Overlay */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={modal.onCancel || modal.onConfirm}
                    />

                    {/* Modal Content */}
                    <div className={`relative bg-gray-800 rounded-xl shadow-2xl border-2 ${borderColor} max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-200`}>
                        {/* Header */}
                        <div className={`${bgColor} rounded-t-lg px-6 py-4 flex items-center gap-3`}>
                            <span className="text-2xl">{icon}</span>
                            <h2 className="text-xl font-bold text-white">{modal.title}</h2>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            <p className="text-gray-200 whitespace-pre-wrap">{modal.message}</p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gray-900/50 rounded-b-xl flex justify-end gap-3">
                            {modal.type === 'confirm' && modal.onCancel && (
                                <button
                                    onClick={modal.onCancel}
                                    className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                                >
                                    {modal.cancelText}
                                </button>
                            )}
                            <button
                                onClick={modal.onConfirm}
                                className={`px-5 py-2.5 ${modal.type === 'error' ? 'bg-red-600 hover:bg-red-500' : modal.type === 'success' ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-medium rounded-lg transition-colors`}
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
