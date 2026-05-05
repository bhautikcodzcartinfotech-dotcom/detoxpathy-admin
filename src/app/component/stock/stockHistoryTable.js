"use client";
import React from "react";
import moment from "moment";

import { API_BASE } from "@/Api/AllApi";

const StockHistoryTable = ({ history, loading, currentPage, totalPages, onPageChange, onDelete }) => {
  const [selectedIds, setSelectedIds] = React.useState([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === history.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(history.map((item) => item._id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    onDelete(selectedIds);
    setSelectedIds([]);
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#134D41]"></div>
      </div>
    );
  }

  if (history.length === 0) {
    return <div className="text-center py-10 text-gray-400">No history records found</div>;
  }

  return (
    <div className="relative">
      {selectedIds.length > 0 && (
        <div className="absolute -top-14 right-0 flex items-center gap-3 bg-red-50 border border-red-100 px-4 py-2 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-bold text-red-600">{selectedIds.length} items selected</span>
          <button 
            onClick={handleDeleteSelected}
            className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors"
          >
            Delete Selected
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr className="text-[10px] uppercase tracking-widest text-gray-700">
              <th className="px-4 py-3 text-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === history.length && history.length > 0} 
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
              </th>
              <th className="px-4 py-3 font-black text-center">No.</th>
              <th className="px-4 py-3 font-black">Date & Time</th>
              <th className="px-4 py-3 font-black">Item</th>
              <th className="px-4 py-3 font-black">Location</th>
              <th className="px-4 py-3 font-black text-center">Type</th>
              <th className="px-4 py-3 font-black text-center">Change</th>
              <th className="px-4 py-3 font-black text-center">New Available</th>
              <th className="px-4 py-3 font-black">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((item, index) => {
              const name = item.productId?.name || item.planId?.name || "Unknown Item";
              const location = item.branchId?.name || "Company Master";
              const type = item.type;
              const change = item.availableChange > 0 ? `+${item.availableChange}` : item.availableChange;
              const changeColor = item.availableChange > 0 ? "text-green-600" : (item.availableChange < 0 ? "text-red-600" : "text-gray-400");
              const isSelected = selectedIds.includes(item._id);

              return (
                <tr key={item._id} className={`transition-colors ${isSelected ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                  <td className="py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => toggleSelect(item._id)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </td>
                  <td className="py-4 text-center text-sm text-gray-400">{(currentPage - 1) * 20 + index + 1}</td>
                  <td className="py-4">
                    <div className="text-sm font-medium text-gray-700">
                      {moment(item.createdAt).format("DD MMM YYYY")}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {moment(item.createdAt).format("hh:mm A")}
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="font-semibold text-gray-700">{name}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-gray-500 font-medium">{location}</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      type === 'addition' ? 'bg-green-50 text-green-600' : 
                      type === 'update' ? 'bg-blue-50 text-blue-600' : 
                      'bg-red-50 text-red-600'
                    }`}>
                      {type}
                    </span>
                  </td>
                  <td className="py-4 text-center font-bold">
                    <span className={changeColor}>{change}</span>
                  </td>
                  <td className="py-4 text-center font-black text-gray-900">
                    {item.newAvailable?.toLocaleString() || 0}
                  </td>
                  <td className="py-4">
                    {item.document && item.document !== "manual" ? (
                      <a 
                        href={`${API_BASE}/uploads/${item.document}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1 font-bold group"
                      >
                        <span className="text-sm group-hover:scale-125 transition-transform">📄</span>
                        View
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">
                        {item.document === "manual" ? "Manual" : "-"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6">
        <div className="text-xs text-gray-400 font-medium">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 rounded-xl disabled:opacity-30 hover:bg-amber-100 transition-all shadow-sm active:scale-95"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 rounded-xl disabled:opacity-30 hover:bg-amber-100 transition-all shadow-sm active:scale-95"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockHistoryTable;
