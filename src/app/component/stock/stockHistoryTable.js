"use client";
import React from "react";
import moment from "moment";

const StockHistoryTable = ({ history, loading }) => {
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
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-50">
            <th className="pb-3 font-medium text-center">No.</th>
            <th className="pb-3 font-medium">Date & Time</th>
            <th className="pb-3 font-medium">Item</th>
            <th className="pb-3 font-medium">Location</th>
            <th className="pb-3 font-medium text-center">Type</th>
            <th className="pb-3 font-medium text-center">Change</th>
            <th className="pb-3 font-medium text-center">New Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map((item, index) => {
            const name = item.productId?.name || item.planId?.name || "Unknown Item";
            const location = item.branchId?.name || "Company Master";
            const type = item.type;
            const change = item.availableChange > 0 ? `+${item.availableChange}` : item.availableChange;
            const changeColor = item.availableChange > 0 ? "text-green-600" : (item.availableChange < 0 ? "text-red-600" : "text-gray-400");

            return (
              <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-4 text-center text-sm text-gray-400">{index + 1}</td>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockHistoryTable;
