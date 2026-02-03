export default function LoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-700 h-24 rounded-xl"
          />
        ))}
      </div>

      {/* FilterBar skeleton */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-gray-200 dark:bg-gray-700 h-10 w-48 rounded" />
          <div className="bg-gray-200 dark:bg-gray-700 h-10 w-40 rounded" />
        </div>
      </div>

      {/* Room grid skeleton */}
      <div className="space-y-6">
        {[1, 2].map((roomIdx) => (
          <div key={roomIdx}>
            {/* Room header skeleton */}
            <div className="bg-gray-200 dark:bg-gray-700 h-8 w-32 rounded mb-3" />

            {/* Computer cards grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
