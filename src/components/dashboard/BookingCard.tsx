import Card from "./Card";

export default function BookingCard() {
    return (
        <Card title="Bookings" className="h-full">
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-2">
                    <p className="text-gray-700 dark:text-gray-300">Bookings will be displayed here</p>
                    {/* Placeholder content - replace with actual booking items */}
                    <div className="space-y-2 mt-2">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                                <div className="font-medium text-gray-900 dark:text-white">Booking {item}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Details about booking {item}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    )
}