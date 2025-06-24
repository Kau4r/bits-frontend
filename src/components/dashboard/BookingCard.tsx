import Card from "./Card";

export default function BookingCard() {
    return (
        <Card title="Bookings" className="h-full">
            <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto p-2">
                    {/* These are temporary placeholders */}
                    <div className="space-y-2 mt-2">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="flex items-center justify-between p-3 bg-[#1A2236] rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-green-100 rounded-md">
                                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white">Booking {item}</div>
                                        <div className="text-xs text-gray-300">Details about booking {item}</div>
                                    </div>
                                </div>
                                <button className="text-sm font-medium text-green-400 hover:text-green-300">
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}