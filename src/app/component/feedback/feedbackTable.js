"use client";
import React from "react";
import { MdStar, MdStarBorder } from "react-icons/md";

const FeedbackTable = ({ items, loading, selectedIds, onSelectChange, onSelectAll }) => {
  const renderStars = (rating) => {
    return (
      <div className="flex text-yellow-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? <MdStar size={16} /> : <MdStarBorder size={16} />}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#134D41]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-[#134D41] focus:ring-[#134D41]"
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ratings</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                  No feedback found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#134D41] focus:ring-[#134D41]"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => onSelectChange(item._id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.userId?.name || "N/A"}</div>
                    <div className="text-xs text-gray-500">{item.userId?.mobileNo || ""}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-16">App:</span>
                            {renderStars(item.appExperience)}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-16">Doctor:</span>
                            {renderStars(item.doctorCostultant)}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-16">Product:</span>
                            {renderStars(item.product)}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-16">Support:</span>
                            {renderStars(item.support)}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                      {item.averageRating}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.isApproved ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Approved
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pending
                        </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeedbackTable;
