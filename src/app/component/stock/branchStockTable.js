"use client";
import React from "react";

const BranchStockTable = ({ stocks, loading, onEdit }) => {
  if (loading && stocks.length === 0) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#134D41]"></div>
      </div>
    );
  }

  if (stocks.length === 0) {
    return <div className="text-center py-10 text-gray-400">No stock records found for this branch</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
          <tr className="text-[10px] uppercase tracking-widest text-gray-700">
            <th className="px-4 py-3 font-black">Product / Plan</th>
            <th className="px-4 py-3 font-black text-center">Total</th>
            <th className="px-4 py-3 font-black text-center">Sold</th>
            <th className="px-4 py-3 font-black text-center">Available</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stocks.map((stock) => {
            const name = stock.productId?.name || stock.planId?.name || "Unknown Item";
            const available = stock.available || 0;
            const isLow = available < 10 && available > 0;
            const isOutOfStock = available <= 0;

            return (
              <tr 
                key={stock._id} 
                className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => onEdit(stock)}
              >
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-700">{name}</span>
                    {isLow && (
                      <span className="text-red-500 text-[10px] px-2 py-0.5 rounded-md border border-red-200 font-bold bg-white">
                        Low
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="bg-red-50 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 text-center font-bold text-gray-700">
                  {((stock.available || 0) + (stock.sold || 0)).toLocaleString()}
                </td>
                <td className="py-4 text-center font-bold text-gray-700">
                  {(stock.sold || 0).toLocaleString()}
                </td>
                <td className="py-4 text-center border-l border-transparent group-hover:border-gray-100">
                  <span className={`font-black ${isOutOfStock || isLow ? "text-red-600" : "text-gray-900"}`}>
                    {available.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BranchStockTable;
