"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const CouponTable = ({ items, loading, onEdit, onDelete }) => {
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, itemId: null, itemCode: null });
  const [expandedId, setExpandedId] = useState(null);

  const handleDeleteClick = (itemId, itemCode) => setDeleteDialog({ isOpen: true, itemId, itemCode });
  const handleDeleteConfirm = () => { if (deleteDialog.itemId) onDelete(deleteDialog.itemId); setDeleteDialog({ isOpen: false, itemId: null, itemCode: null }); };
  const handleDeleteCancel = () => setDeleteDialog({ isOpen: false, itemId: null, itemCode: null });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date();

  if (loading) return <div className="flex justify-center items-center py-20"><Loader /></div>;

  // 6 columns: Coupon Code | Discount | Expiry | Used/Limit | Status | Users Used | Actions
  return (
    <>
      {items?.length === 0 ? (
        <NotFoundCard title="No Coupons" subtitle="Create one to get started." />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                <tr className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                  <th className="px-6 py-4 text-left">Coupon Code</th>
                  <th className="px-6 py-4 text-center">Discount</th>
                  <th className="px-6 py-4 text-center">Expiry</th>
                  <th className="px-6 py-4 text-center">Used / Limit</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Users Used</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <React.Fragment key={item._id}>
                    <tr className="hover:bg-yellow-50 transition-colors">

                      {/* Coupon Code */}
                      <td className="px-6 py-4">
                        <span className="font-black text-sm tracking-widest text-[#134D41] bg-[#e6f4f1] px-3 py-1 rounded-lg">
                          {item.couponCode}
                        </span>
                      </td>

                      {/* Discount */}
                      <td className="px-6 py-4 text-center text-sm font-semibold text-gray-800">
                        {item.discountValue}% off
                      </td>

                      {/* Expiry */}
                      <td className="px-6 py-4 text-center text-sm text-gray-600">
                        {formatDate(item.expiry)}
                      </td>

                      {/* Used / Limit */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-gray-700">
                          {item.usedCount} / {item.limit}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        {isExpired(item.expiry) ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600">Expired</span>
                        ) : item.usedCount >= item.limit ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-600">Exhausted</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-600">Active</span>
                        )}
                      </td>

                      {/* Users Used */}
                      <td className="px-6 py-4 text-center">
                        {item.usedBy?.length > 0 ? (
                          <button
                            onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                            className="text-xs font-bold text-teal-600 hover:text-teal-800 underline underline-offset-2"
                          >
                            {item.usedBy.length} user{item.usedBy.length > 1 ? "s" : ""} {expandedId === item._id ? "▲" : "▼"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <ActionButton type="edit" onClick={() => onEdit(item)} />
                          <ActionButton type="delete" onClick={() => handleDeleteClick(item._id, item.couponCode)} />
                        </div>
                      </td>

                    </tr>

                    {/* Expanded users row */}
                    {expandedId === item._id && item.usedBy?.length > 0 && (
                      <tr>
                        <td colSpan={7} className="px-8 py-0 bg-teal-50 border-t border-teal-100">
                          <div className="py-4">
                            <p className="text-[11px] font-black text-teal-700 uppercase tracking-widest mb-3">
                              Users who used this coupon
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {item.usedBy.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white border border-teal-100 rounded-xl px-4 py-2 shadow-sm">
                                  <div className="w-8 h-8 rounded-full bg-[#134D41] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {entry.userId?.name?.[0]?.toUpperCase() || "U"}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                      {entry.userId?.name || "Unknown User"}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      {entry.userId?.mobileNumber || entry.userId?.email || "-"} • {formatDate(entry.usedAt)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon "${deleteDialog.itemCode}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default CouponTable;
