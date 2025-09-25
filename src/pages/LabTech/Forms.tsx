import { useState } from "react";
import Table from "../../components/Table";
import TableSearchInput from "../../components/Search";

export default function Forms() {
    const [forms] = useState([
        { id: 1, formId: "RIS-001", type: "RIS", status: "Approved", department: "Finance" },
        { id: 2, formId: "WRF-001", type: "WRF", status: "Pending", department: "Registrar" },
        { id: 3, formId: "RIS-002", type: "RIS", status: "In Review", department: "DCISM" },
        { id: 4, formId: "WRF-002", type: "WRF", status: "Rejected", department: "Finance" },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedForm, setSelectedForm] = useState(null);
    const [showDrafts, setShowDrafts] = useState(false);

    // Force readable chips in both themes
    const statusStyle = {
        Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        "In Review": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        Draft: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };

    // Reusable field styles to stop inheriting white text
    const inputClass =
        "mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 " +
        "text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 " +
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

    const textareaClass =
        "mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 " +
        "text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 " +
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

    const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300";
    const sectionBox = "border rounded p-4 bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700";
    const hintText = "text-gray-500 dark:text-gray-400";

    const filteredForms = forms.filter((form) => {
        if (showDrafts && form.status !== "Draft") return false;
        const formStr = `${form.formId} ${form.type} ${form.status} ${form.department}`.toLowerCase();
        return formStr.includes(searchTerm.toLowerCase());
    });

    const handleSaveDraft = () => {
        if (!selectedForm) return;
        const newDraft = {
            ...selectedForm,
            id: forms.length + 1,
            status: "Draft",
            department: selectedForm.department || "Unassigned",
            timeline: [],
        };
        setForms([...forms, newDraft]);
        setSelectedForm(newDraft);
    };

    // Timeline renderer
    const Timeline = ({ steps, currentDept }) => (
        <div className="flex items-center gap-4 mt-4">
            {steps.map((dept, i) => {
                const reached = i <= steps.indexOf(currentDept);
                return (
                    <div key={dept} className="flex items-center gap-2">
                        <div
                            className={`w-4 h-4 rounded-full ${reached ? "bg-blue-600" : "bg-gray-300"}`}
                        ></div>
                        <span className={`text-sm ${reached ? "font-semibold" : "text-gray-500"}`}>
                            {dept}
                        </span>
                        {i < steps.length - 1 && <div className="w-8 h-0.5 bg-gray-400"></div>}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="flex min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
            {/* LEFT: List */}
            <div className="w-2/4 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4">Forms</h2>

                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex-1">
                            <TableSearchInput
                                searchTerm={searchTerm}
                                onChange={setSearchTerm}
                                placeholder="Search forms..."
                            />
                        </div>
                        <button
                            className={
                                showDrafts
                                    ? "mt-7 px-3 py-1.5 rounded whitespace-nowrap bg-blue-600 text-white"
                                    : "mt-7 px-3 py-1.5 rounded whitespace-nowrap border border-gray-300 dark:border-gray-600 " +
                                    "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            }
                            onClick={() => setShowDrafts(!showDrafts)}
                        >
                            {showDrafts ? "All Forms" : "Drafts"}
                        </button>
                    </div>

                    <Table headers={["Form ID", "Type", "Status", "Department"]}>
                        {filteredForms.map((form) => (
                            <div
                                key={form.id}
                                onClick={() => setSelectedForm(form)}
                                className="grid grid-cols-4 items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                            >
                                <div className="text-sm font-medium">{form.formId}</div>
                                <div className="text-sm">{form.type}</div>
                                <div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle[form.status] || ""}`}>
                                        {form.status}
                                    </span>
                                </div>
                                <div className="text-sm">{form.department}</div>
                            </div>
                        ))}
                    </Table>
                </div>
            </div>

            {/* RIGHT: Detail View */}
            <div className="w-2/4 p-6 overflow-y-auto">
                {!selectedForm ? (
                    <p className={hintText}>Select a form to view details</p>
                ) : selectedForm.type === "WRF" ? (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold mb-4">Work Request Form #{selectedForm.formId}</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Date Requested</label>
                                <input type="date" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Date Required</label>
                                <input type="date" className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea className={textareaClass} rows={3}></textarea>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Requested By</label>
                                <input type="text" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Received By</label>
                                <input type="text" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Office/Department</label>
                                <input type="text" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Payee</label>
                                <input type="text" className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Forward To</label>
                            <div className="flex gap-4 mt-1">
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>PPFO</span>
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>IDO</span>
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Budget & Purchasing</span>
                                </label>
                            </div>
                        </div>

                        <div className={sectionBox}>
                            <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">For PPFO use only</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Materials Used</label>
                                    <input type="text" className={inputClass} placeholder="Material" />
                                </div>
                                <div>
                                    <label className={labelClass}>PPFO</label>
                                    <input type="number" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Outside Contractor</label>
                                    <input type="number" className={inputClass} />
                                </div>
                            </div>
                            <button className="mt-3 text-sm text-blue-600 dark:text-blue-400">+ Add Material</button>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className={labelClass}>Labor Cost</label>
                                    <input type="number" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Total Charges</label>
                                    <input type="number" className={inputClass} />
                                </div>
                            </div>
                        </div>

                        <div className={sectionBox}>
                            <h3 className="font-semibold mb-2">Certification of Work Completion</h3>
                            <p className="text-sm mb-2">I certify that the above request has been accomplished</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Name</label>
                                    <input type="text" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Department</label>
                                    <input type="text" className={inputClass} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className={labelClass}>Date</label>
                                <input type="date" className={inputClass} />
                            </div>
                        </div>

                        <div className="flex justify-between mt-4">
                            <button className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800">
                                Save as Draft
                            </button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded">Submit Request</button>
                        </div>
                    </div>
                ) : selectedForm.type === "RIS" ? (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold mb-4">Request and Issue Slip #{selectedForm.formId}</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Date Today</label>
                                <input type="date" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Date Needed</label>
                                <input type="date" className={inputClass} />
                            </div>
                        </div>

                        <div className={sectionBox}>
                            <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Peso Amounts</h3>
                            <div className="grid grid-cols-5 gap-2 items-end">
                                <div>
                                    <label className={labelClass}>Qty</label>
                                    <input type="number" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Unit</label>
                                    <input type="text" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Description</label>
                                    <input type="text" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Unit Cost</label>
                                    <input type="number" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Amount</label>
                                    <input type="number" className={inputClass} />
                                </div>
                            </div>
                            <button className="mt-3 text-sm text-blue-600 dark:text-blue-400">+ Add Item</button>
                            <p className="mt-2 text-right font-medium">Total: ₱0.00</p>
                        </div>

                        <div>
                            <label className={labelClass}>Cost Center</label>
                            <input type="text" className={inputClass} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Requested By</label>
                                <input type="text" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Noted By</label>
                                <input type="text" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Endorsed By</label>
                                <input type="text" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Verified By</label>
                                <input type="text" className={inputClass} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Payee</label>
                                <input type="text" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Payment Instructions</label>
                                <input type="text" className={inputClass} />
                            </div>
                        </div>

                        <Timeline
                            steps={["Registrar", "Finance", "DCISM", "PPFO"]}
                            currentDept={selectedForm.department}
                        />
                        <div className="flex justify-between mt-4">
                            <button
                                onClick={handleSaveDraft}
                                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Save as Draft
                            </button>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded">Submit Request</button>
                        </div>
                    </div>
                ) : (
                    <p className={hintText}>Form type not supported for detailed view</p>
                )}
            </div>
        </div>
    );
}
