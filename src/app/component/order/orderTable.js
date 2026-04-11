"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import { API_BASE, updateOrderStatus } from "@/Api/AllApi";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  1: "Pending",
  2: "Confirmed",
  3: "Processing",
  4: "Shipped",
  5: "Delivered",
  6: "Cancelled",
};

const STATUS_COLORS = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-yellow-100 text-yellow-700",
  3: "bg-orange-100 text-orange-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-green-100 text-green-700",
  6: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = [1, 2, 3, 4, 5, 6];

const OrderTable = ({ items, loading, onRefresh }) => {
  const [updatingId, setUpdatingId] = useState(null);

  if (loading) return <div className="p-10 flex justify-center"><Loader /></div>;

  if (!items || items.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
        No orders found matching the criteria.
      </div>
    );
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, Number(newStatus));
      toast.success("Order status updated!");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getOrderType = (order) => {
    const hasProducts = order.products && order.products.length > 0;
    const hasProgram = !!order.program;
    if (hasProducts && hasProgram) return "BOTH";
    if (hasProgram) return "PROGRAM";
    return "PRODUCT";
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
          {items.map((order) => {
            const orderType = getOrderType(order);
            return (
              <tr key={order._id} className="hover:bg-yellow-50 transition-all duration-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-800">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-gray-800">
                    {order.shippingAddress?.name || "N/A"}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {order.shippingAddress?.mobile || "N/A"}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                    {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    orderType === "PROGRAM" ? "bg-purple-100 text-purple-700" :
                    orderType === "BOTH" ? "bg-indigo-100 text-indigo-700" :
                    "bg-cyan-100 text-cyan-700"
                  }`}>
                    {orderType}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1.5 max-w-xs">
                    {/* Program */}
                    {order.program && (
                      <div className="flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded border border-purple-100">
                        <span className="text-[10px] font-bold text-purple-600">PROGRAM</span>
                        <span className="text-[10px] text-gray-700 truncate max-w-[120px]">
                          {order.program.name}
                        </span>
                        <span className="text-[10px] text-green-600 font-bold ml-auto">
                          ₹{order.program.price}
                        </span>
                      </div>
                    )}
                    {/* Products */}
                    {order.products?.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-gray-50 p-1 rounded border border-gray-100 pr-2 shadow-sm">
                        <div className="w-6 h-6 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                          {p.image ? (
                            <img src={`${API_BASE}${p.image}`} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">NA</div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-600 truncate max-w-[80px]">
                          {p.name} (x{p.quantity})
                        </span>
                        <span className="text-[9px] text-green-600 font-bold ml-auto">
                          ₹{p.price}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-green-700">₹{order.totalAmount}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {updatingId === order._id ? (
                    <span className="text-xs text-gray-400 animate-pulse">Updating...</span>
                  ) : (
                    <select
                      value={Number(order.orderStatus)}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-300 ${STATUS_COLORS[Number(order.orderStatus)] || "bg-gray-100 text-gray-700"}`}
                    >
                      {STATUS_OPTIONS.map((val) => (
                        <option key={val} value={val}>{STATUS_LABELS[val]}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
