import { useEffect, useRef } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import type { Item } from "@/types/inventory";

interface Props {
    inventory: Item[];
    onOpenItem: (item: Item) => void;
}

const QrScanner = ({ inventory, onOpenItem }: Props) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const readerRef = useRef<BrowserQRCodeReader | null>(null);

    const startScan = async () => {
        if (!videoRef.current) return;

        readerRef.current = new BrowserQRCodeReader();

        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        const backCamera =
            devices.find(d => /back|rear|environment/i.test(d.label))?.deviceId ??
            devices[0]?.deviceId;

        controlsRef.current = await readerRef.current.decodeFromVideoDevice(
            backCamera,
            videoRef.current,
            (result, error) => {
                if (result) {
                    const code = result.getText();
                    const item = inventory.find(
                        i => i.Serial_Number === code || i.Item_Code === code
                    );

                    if (item) {
                        stopScan();
                        onOpenItem(item);
                    }
                }

                if (error && error.name !== "NotFoundException") {
                    console.error(error);
                }
            }
        );
    };

    const stopScan = () => {
        controlsRef.current?.stop();
        controlsRef.current = null;
        readerRef.current = null;
    };

    useEffect(() => {
        return () => stopScan();
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                <button
                    className="mb-2 text-sm text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                    onClick={stopScan}
                >
                    Close
                </button>

                <video
                    ref={videoRef}
                    className="w-64 h-64 border border-gray-200 dark:border-gray-700 rounded-md"
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={startScan}
                />
            </div>
        </div>
    );
};

export default QrScanner;
