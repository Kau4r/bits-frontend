interface Props {
    completed: number;
    total: number;
  }
  
  export default function LabTechProgressBar({ completed, total }: Props) {
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return (
      <div className="w-full rounded bg-gray-200 dark:bg-gray-700 h-4">
        <div
          className="bg-blue-600 h-4 rounded"
          style={{ width: `${percentage}%`, transition: 'width 0.3s ease-in-out' }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
        <div className="flex justify-between text-xs font-semibold mt-1 text-gray-600 dark:text-gray-300">


        </div>
      </div>
    );
  }
  