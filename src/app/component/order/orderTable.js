"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import { API_BASE, updateOrderStatus, getAuthHeaders } from "@/Api/AllApi";
import axios from "axios";
import { ActionButton } from "@/utils/actionbutton";
import toast from "react-hot-toast";

const STATUS_LABELS = {
  1: "Pending",
  2: "Packed",
  3: "Processing",
  4: "In Transit",
  5: "Delivered",
  6: "Cancelled",
};

const STATUS_COLORS = {
  1: "bg-gray-100 text-gray-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  4: "bg-orange-100 text-orange-700",
  5: "bg-green-100 text-green-700",
  6: "bg-red-100 text-red-700",
};

const OrderTable = ({ items, loading, onRefresh, selectedIds = [], onToggleSelection, onSelectAll }) => {
  const [updatingId, setUpdatingId] = useState(null);

  if (loading) return <div className="p-10 flex justify-center"><Loader /></div>;

  if (!items || items.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
        No orders found matching the criteria.
      </div>
    );
  }

  const allSelected = items.length > 0 && items.every(item => selectedIds.includes(item._id));

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, Number(newStatus));
      toast.success("Order status updated!");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ORD ID</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">USER</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">BRANCH</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PRODUCT</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">AMOUNT</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">TYPE</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">PAYMENT</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">COURIER</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">TRACKING</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">STATUS</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((order) => (
            <tr key={order._id} className={`hover:bg-gray-50/50 transition-all duration-200 ${selectedIds.includes(order._id) ? 'bg-teal-50/30' : ''}`}>
              <td className="px-4 py-5">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(order._id)}
                  onChange={() => onToggleSelection(order._id)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
              </td>
              <td className="px-4 py-5 whitespace-nowrap text-[13px] font-semibold text-teal-600">
                ORD-{order._id.slice(-6).toUpperCase()}
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] font-medium text-gray-700">
                {order.user ? `${order.user.name} ${order.user.surname || ""}` : (order.shippingAddress?.name || "N/A")}
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] text-gray-500">
                <span className="font-medium text-teal-700">{order.branch?.name || "N/A"}</span>
              </td>

              <td className="px-4 py-5 text-[13px] text-gray-600">
                <div className="max-w-[150px] truncate">
                  {order.plans?.length > 0 ? order.plans[0].name : (order.products?.[0]?.name || "N/A")}
                  {(order.plans?.length + order.products?.length) > 1 && ` +${(order.plans?.length || 0) + (order.products?.length || 0) - 1} more`}
                </div>
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] font-bold text-gray-800">
                {order.currency || "₹"}{order.totalAmount.toLocaleString()}
              </td>

              <td className="px-4 py-5 whitespace-nowrap">
                <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${order.type === 2 ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-600"}`}>
                  {order.type === 2 ? "Branch" : "Online"}
                </span>
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] text-gray-500">
                {order.paymentMethod || "Razorpay"}
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] text-gray-500">
                {order.courier || "-"}
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-[13px] text-gray-400">
                {order.trackingId || "-"}
              </td>

              <td className="px-4 py-5 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <select
                    value={Number(order.orderStatus)}
                    onChange={(e) => handleStatusChange(order._id, e.target.value)}
                    disabled={updatingId === order._id}
                    className={`text-[12px] font-bold px-3 py-1 rounded-lg border-0 cursor-pointer focus:outline-none transition-all ${STATUS_COLORS[Number(order.orderStatus)] || "bg-gray-100 text-gray-700"}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  {updatingId === order._id && <span className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></span>}
                </div>
              </td>

              <td className="px-4 py-5 whitespace-nowrap text-right flex items-center justify-end gap-2">
                <ActionButton
                  type="view"
                  onClick={() => window.location.href = `/order/${order._id}`}
                  title="View Order Details"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
