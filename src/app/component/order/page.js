"use client";
import React, { useEffect, useState } from "react";
import { getAllOrders, getOrderStats } from "@/Api/AllApi";
import OrderTable from "./orderTable";
import toast from "react-hot-toast";

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingDispatch: 0,
    inTransit: 0,
    delivered: 0
  });

  const [filter, setFilter] = useState({
    start: 1,
    limit: 10,
    search: "",
    type: "",
    status: ""
  });

  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders(filter);
      setOrders(data.orders || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      toast.error("Failed to load orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getOrderStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filter]);

  const handlePageChange = (newPage) => {
    setFilter((prev) => ({ ...prev, start: newPage }));
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value, start: 1 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Orders & Shipping</h1>
        <p className="text-gray-500 text-sm mt-1">All orders — online (company ships) and branch walk-in (branch stock). Assign couriers and track.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL ORDERS", value: stats.totalOrders.toLocaleString(), color: "border-green-600" },
          { label: "PENDING DISPATCH", value: stats.pendingDispatch.toLocaleString(), color: "border-red-600" },
          { label: "IN TRANSIT", value: stats.inTransit.toLocaleString(), color: "border-orange-500" },
          { label: "DELIVERED", value: stats.delivered.toLocaleString(), color: "border-green-500" },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white p-6 rounded-xl border-t-4 ${item.color} shadow-sm transition-transform hover:scale-[1.02]`}>
            <p className="text-xs font-bold text-gray-400 mb-1">{item.label}</p>
            <p className="text-3xl font-bold text-gray-800">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Search by ORD-ID, user, product..."
            className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
            value={filter.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
          />
        </div>
        
        <select 
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={filter.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
        >
          <option value="">All Types</option>
          <option value="1">Online</option>
          <option value="2">Branch</option>
        </select>

        <select 
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          value={filter.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="1">Pending</option>
          <option value="2">Packed</option>
          <option value="4">In Transit</option>
          <option value="5">Delivered</option>
        </select>
      </div>

      <OrderTable items={orders} loading={loading} onRefresh={() => { fetchOrders(); fetchStats(); }} />

      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-4">
          <button
            disabled={pagination.page === 1 || loading}
            onClick={() => handlePageChange(pagination.page - 1)}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold disabled:opacity-50 hover:bg-gray-50 transition shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            disabled={pagination.page === pagination.totalPages || loading}
            onClick={() => handlePageChange(pagination.page + 1)}
            className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold disabled:opacity-50 hover:bg-gray-50 transition shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderPage;
