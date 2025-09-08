import Scheduling from '../Scheduling/Scheduling';
import { useNavigate } from 'react-router-dom';

const FacultyScheduling = () => {
  const navigate = useNavigate();
  
  return (
    <div className=" p-4 pb-6 flex flex-col h-screen">
     
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Faculty Scheduling</h1>
          <button
            onClick={() => navigate('/logout')}
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            Logout
          </button>

      </div>
      <div className="flex-1 overflow-hidden">
        <Scheduling />
      </div>
    </div>
  );
};

export default FacultyScheduling;