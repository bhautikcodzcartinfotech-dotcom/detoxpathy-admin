"use client";
import React from "react";
import { ActionButton } from "@/utils/actionbutton";
import Loader from "@/utils/loader";
import { API_BASE } from "@/Api/AllApi";

const ProgramTable = ({ items, loading, onEdit, onDelete }) => {
  if (loading) return <Loader />;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transition-all duration-300">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gradient-to-r from-gray-50 to-yellow-50 text-gray-700 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length > 0 ? (
              items.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-yellow-50/50 transition duration-200 group"
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-800">{item.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {item.products && item.products.length > 0 ? (
                        item.products.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100 pr-3">
                            <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                              {p.productId?.images?.[0] ? (
                                <img
                                  src={`${API_BASE}${p.productId.images[0]}`}
                                  alt={p.productId.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">NA</div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                                {p.productId?.name || "Unknown Product"}
                              </span>
                              <span className="text-[10px] text-gray-500">Qty: {p.quantity}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No products</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {item.duration}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                      ₹{item.price}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-3">
                      <ActionButton
                        type="edit"
                        onClick={() => onEdit(item)}
                        title="View/Edit Program"
                      />
                      <ActionButton
                        type="delete"
                        onClick={() => onDelete(item._id)}
                        title="Delete Program"
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No programs found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProgramTable;
