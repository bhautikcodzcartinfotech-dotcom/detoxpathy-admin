"use client";
import React, { useState } from "react";
import { getExpiryBatches } from "@/utils/stockDisplay";
import ExpiryToggleButton from "./ExpiryToggleButton";
import ExpiryBatchesPanel from "./ExpiryBatchesPanel";

const BranchStockTable = ({ stocks, loading, onEdit }) => {
  const [expandedId, setExpandedId] = useState(null);

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
            <th className="px-4 py-3 font-black text-center">Expiry Details</th>
            <th className="px-4 py-3 font-black text-center">Breakage</th>
            {onEdit && <th className="px-4 py-3 font-black text-center">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stocks.map((stock) => {
            const name = stock.productId?.name || stock.planId?.name || "Unknown Item";
            const available = stock.available || 0;
            const isLow = available < 10 && available > 0;
            const isOutOfStock = available <= 0;
            const batches = getExpiryBatches(stock);
            const isExpanded = expandedId === stock._id;

            return (
              <React.Fragment key={stock._id}>
                <tr
                  className={`group hover:bg-gray-50/50 transition-colors ${onEdit ? "cursor-pointer" : ""}`}
                  onClick={onEdit ? () => onEdit(stock) : undefined}
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
                  <td className="py-4 text-center">
                    <ExpiryToggleButton
                      expanded={isExpanded}
                      count={batches.length}
                      onClick={() => setExpandedId(prev => (prev === stock._id ? null : stock._id))}
                    />
                  </td>
                  <td className="py-4 text-center font-bold text-gray-700">
                    {(stock.breakage || 0).toLocaleString()}
                  </td>
                  {onEdit && (
                    <td className="py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEdit(stock)}
                        className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
                {isExpanded && batches.length > 0 && (
                  <tr className="bg-gradient-to-r from-amber-50/80 to-yellow-50/40">
                    <td colSpan={onEdit ? 7 : 6} className="px-5 py-4">
                      <ExpiryBatchesPanel title={`${name} — Expiry Breakdown`} batches={batches} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BranchStockTable;
