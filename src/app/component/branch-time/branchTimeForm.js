"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";

const BranchTimeForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Save",
}) => {
  const daysSelection = [
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
    { value: "7", label: "Sunday" },
  ];

  const [availability, setAvailability] = useState([
    { day: "1", startTime: "09:00 AM", endTime: "05:00 PM", slotDuration: 30, bufferTime: 10 },
  ]);

  useEffect(() => {
    if (initialValues && initialValues.availability) {
      setAvailability(initialValues.availability);
    }
  }, [initialValues]);

  const handleAddRow = () => {
    setAvailability([
      ...availability,
      { day: "1", startTime: "09:00 AM", endTime: "05:00 PM", slotDuration: 30, bufferTime: 10 },
    ]);
  };

  const handleRemoveRow = (index) => {
    const newAvailability = availability.filter((_, i) => i !== index);
    setAvailability(newAvailability);
  };

  const handleChange = (index, field, value) => {
    const newAvailability = [...availability];
    newAvailability[index][field] = field === "slotDuration" || field === "bufferTime" ? Number(value) : value;
    setAvailability(newAvailability);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ availability });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {availability.map((item, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group transition-all hover:shadow-md">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Day</label>
                    <select
                      value={item.day}
                      onChange={(e) => handleChange(index, "day", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                    >
                      {daysSelection.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                 </div>
                 <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">Start Time</label>
                         <input
                             type="text"
                             value={item.startTime}
                             onChange={(e) => handleChange(index, "startTime", e.target.value)}
                             className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                             placeholder="09:00 AM"
                         />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1 whitespace-nowrap">End Time</label>
                         <input
                             type="text"
                             value={item.endTime}
                             onChange={(e) => handleChange(index, "endTime", e.target.value)}
                             className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                             placeholder="05:00 PM"
                         />
                     </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Slot Duration (Min)</label>
                    <input
                      type="number"
                      value={item.slotDuration}
                      onChange={(e) => handleChange(index, "slotDuration", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buffer Time (Min)</label>
                    <input
                      type="number"
                      value={item.bufferTime}
                      onChange={(e) => handleChange(index, "bufferTime", e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition"
                    />
                 </div>
             </div>
             {availability.length > 1 && (
               <button
                 type="button"
                 onClick={() => handleRemoveRow(index)}
                 className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition opacity-0 group-hover:opacity-100"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddRow}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium hover:border-yellow-400 hover:text-yellow-600 transition flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Another Slot
      </button>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition font-bold"
        >
          Cancel
        </button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default BranchTimeForm;
