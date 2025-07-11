import Computer from "./Computer"

export default function PCview() {
    const computers = [
        { id: 1, status: 'available' as const },
        { id: 2, status: 'in-use' as const },
        { id: 3, status: 'available' as const },
        { id: 4, status: 'available' as const },
        { id: 5, status: 'available' as const },
        { id: 6, status: 'available' as const },
        { id: 7, status: 'available' as const },
        { id: 8, status: 'available' as const },
        { id: 9, status: 'available' as const },
        { id: 10, status: 'available' as const },
        { id: 11, status: 'damaged' as const },
        { id: 12, status: 'available' as const },
        { id: 13, status: 'available' as const },
        { id: 14, status: 'active' as const, isActive: true },
        { id: 15, status: 'available' as const },
        { id: 16, status: 'available' as const },
        { id: 17, status: 'available' as const },
        { id: 18, status: 'available' as const },
        { id: 19, status: 'available' as const },
        { id: 21, status: 'available' as const },
        { id: 22, status: 'available' as const },
        { id: 23, status: 'available' as const },
        { id: 24, status: 'available' as const },
        { id: 25, status: 'available' as const },
        { id: 26, status: 'available' as const },
        { id: 27, status: 'available' as const },
        { id: 28, status: 'available' as const },
        { id: 29, status: 'available' as const },
        { id: 30, status: 'available' as const },
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">LB 467</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {computers.map((pc) => (
                    <Computer 
                        key={pc.id} 
                        pcNumber={pc.id}
                        status={pc.status}
                        isActive={pc.isActive}
                    />
                ))}
            </div>
        </div>
    );
}