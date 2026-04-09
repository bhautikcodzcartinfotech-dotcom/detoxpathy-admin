"use client";
import React from "react";
import Loader from "@/utils/loader";
import { API_BASE } from "@/Api/AllApi";

const OrderTable = ({ items, loading }) => {
  if (loading) return <div className="p-10 flex justify-center"><Loader /></div>;

  if (!items || items.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
        No orders found matching the criteria.
      </div>
    );
  }

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 1: return "bg-blue-100 text-blue-700"; // Pending/Ordered
      case 2: return "bg-yellow-100 text-yellow-700"; // Processing
      case 3: return "bg-green-100 text-green-700"; // Delivered/Completed
      case 4: return "bg-red-100 text-red-700"; // Cancelled
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((order) => (
            <tr key={order._id} className="hover:bg-yellow-50 transition-all duration-200">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-semibold text-gray-800">{order.shippingAddress?.name || "N/A"}</div>
                <div className="text-[10px] text-gray-500">{order.shippingAddress?.mobile || "N/A"}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.orderType === 2 ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'}`}>
                  {order.orderType === 2 ? "PROGRAM" : "PRODUCT"}
                </span>
                {order.orderType === 2 && order.programName && <div className="text-[10px] font-medium text-purple-500 mt-1">{order.programName}</div>}
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2 max-w-xs">
                  {order.products?.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-100 pr-2 shadow-sm">
                      <div className="w-6 h-6 rounded overflow-hidden bg-gray-200">
                        {p.image ? (
                          <img src={`${API_BASE}${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">NA</div>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-600 truncate max-w-[80px]">
                        {p.name} (x{p.quantity})
                      </span>
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-green-700">₹{order.totalAmount}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderStatusBadge(order.orderStatus)}`}>
                  {order.orderStatus === 1 ? "Pending" : order.orderStatus === 2 ? "Processing" : order.orderStatus === 3 ? "Delivered" : "Cancelled"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
