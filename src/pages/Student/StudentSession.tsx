import { useState } from "react";
import SessionBar from "@/components/student/SessionBar";
import Shortcuts from "@/components/student/Shortcuts";
import { useNavigate } from "react-router-dom";

export default function StudentSession() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;

    const looksLikeUrl =
      /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(q);
    const url = looksLikeUrl
      ? q.startsWith("http")
        ? q
        : `https://${q}`
      : `https://www.google.com/search?q=${encodeURIComponent(q)}`;

    window.open(url, "_blank");
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-4 sm:px-8 lg:px-10">
        <button
          onClick={() => navigate("/student-pc-view")}
          className="text-gray-300 hover:text-white transition-colors"
        >
          ← Go to PC View
        </button>
      </div>

      <div className="px-4 sm:px-8 lg:px-10">
        <SessionBar room="LB 467" pcNumber="14" />
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 lg:px-10 grid place-items-center">
        <div className="w-full max-w-6xl">
          <div className="max-w-5xl mx-auto pt-6 pb-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 select-none">
                <img src="/bit.png" alt="BITS" className="w-10 h-10" />
                <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                  BITS
                </h1>
              </div>

              <div className="w-full">
                <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3 shadow-sm focus-within:border-blue-500">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search with Google or enter address"
                    className="
                      flex-1 bg-transparent text-gray-200 placeholder:text-gray-500
                      outline-none focus:outline-none
                      ring-0 focus:ring-0
                      border-0 focus:border-0 focus:border-transparent
                      appearance-none [-webkit-appearance:none]
                    "
                  />

                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 max-w-6xl mx-auto">
            <Shortcuts />
          </div>
        </div>
      </div>
    </div>
  );
}