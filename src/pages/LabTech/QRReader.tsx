import { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { QrCode } from 'lucide-react';
import { type Item } from '@/types/inventory';

interface Props {
    inventory: Item[];
    onOpenItem: (item: Item) => void;
}

const QrScanner = ({ inventory, onOpenItem }: Props) => {
    const [isQrOpen, setIsQrOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserQRCodeReader | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);

    useEffect(() => {
        if (isQrOpen && videoRef.current) {
            const codeReader = new BrowserQRCodeReader();
            codeReaderRef.current = codeReader;

            // Start scanning continuously
            codeReader
                .decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
                    if (controls && !controlsRef.current) {
                        controlsRef.current = controls;
                    }

                    if (result) {
                        const scannedCode = result.getText();

                        // Find matching item in inventory
                        const item = inventory.find(
                            i => i.Serial_Number === scannedCode || i.Item_Code === scannedCode
                        );

                        if (item) {
                            onOpenItem(item);
                            setIsQrOpen(false);

                            // Stop scanning when item found
                            controlsRef.current?.stop();
                        }
                    }

                    // Ignore NotFoundException errors
                    if (error && error.name !== 'NotFoundException') {
                        console.error(error);
                    }
                })
                .catch(err => console.error('QR start error:', err));
        }

        // Cleanup when QR modal closes or component unmounts
        return () => {
            controlsRef.current?.stop();
            controlsRef.current = null;
        };
    }, [isQrOpen, inventory, onOpenItem]);

    return (
        <>
            {/* QR Button */}
            <button
                className="p-2 bg-gray-200 rounded-md dark:bg-gray-800"
                onClick={() => setIsQrOpen(true)}
            >
                <QrCode className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            {/* QR Scanner Modal */}
            {isQrOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={() => {
                        setIsQrOpen(false);
                        controlsRef.current?.stop();
                    }}
                >
                    <div
                        className="bg-white dark:bg-gray-900 p-4 rounded-md"
                        onClick={(e) => e.stopPropagation()} // prevents modal close when clicking inside
                    >
                        <button
                            className="mb-2 text-sm text-gray-500 dark:text-gray-300"
                            onClick={() => {
                                setIsQrOpen(false);
                                controlsRef.current?.stop();
                            }}
                        >
                            Close
                        </button>
                        <video ref={videoRef} className="w-64 h-64 border rounded-md" />
                    </div>
                </div>
            )}
        </>
    );
};

export default QrScanner;
