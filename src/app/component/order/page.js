"use client";
import React, { useEffect, useState } from "react";
import { getAllOrders, getOrderStats, bulkUpdateOrderStatusApi } from "@/Api/AllApi";
import OrderTable from "./orderTable";
import toast from "react-hot-toast";
import OrderForm from "./orderForm";
import Drawer from "@/utils/formanimation";
import { Header, Button } from "@/utils/header";

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

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
      setSelectedIds([]); // Clear selection on fetch/filter change
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

  const handleToggleSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === orders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(orders.map(o => o._id));
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus) return toast.error("Please select a status");
    if (selectedIds.length === 0) return toast.error("No orders selected");

    try {
      setIsBulkUpdating(true);
      const res = await bulkUpdateOrderStatusApi(selectedIds, Number(bulkStatus));
      
      if (res.success > 0 && res.failed === 0) {
        toast.success(`Successfully updated all ${res.success} orders!`);
      } else if (res.success === 0 && res.failed > 0) {
        // All failed - show unique errors
        const uniqueErrors = [...new Set(res.errors?.map(e => e.split(': ').slice(1).join(': ') || e))];
        const errorMsg = uniqueErrors[0] || "Stock not available or update failed";
        toast.error(`${res.failed} orders failed: ${errorMsg}`);
      } else if (res.success > 0 && res.failed > 0) {
        // Mixed results
        toast.success(`${res.success} updated, ${res.failed} failed.`);
      }
      setSelectedIds([]);
      setBulkStatus("");
      fetchOrders();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Bulk update failed");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsDrawerOpen(false);
    fetchOrders();
    fetchStats();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Header size="3xl">Orders & Shipping</Header>
          <p className="text-gray-500 text-sm mt-1">All orders — online (company ships) and branch walk-in (branch stock). Assign couriers and track.</p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)}>Create Order</Button>
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

      {/* Filters & Bulk Actions */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search by ORD-ID, user, product..."
              className="w-full h-11 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
              value={filter.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>
          
          <select 
            className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
            value={filter.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
          >
            <option value="">All Types</option>
            <option value="1">Online</option>
            <option value="2">Branch</option>
          </select>

          <select 
            className="h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
            value={filter.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="">All Status</option>
            <option value="1">Pending</option>
            <option value="2">Packed</option>
            <option value="3">Processing</option>
            <option value="4">In Transit</option>
            <option value="5">Delivered</option>
            <option value="6">Cancelled</option>
          </select>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-teal-50 border border-teal-100 rounded-lg animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-bold text-teal-800 ml-2">
              {selectedIds.length} orders selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <select 
                className="h-9 px-3 rounded-lg border border-teal-200 bg-white text-sm font-bold text-teal-700 focus:outline-none"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
              >
                <option value="">-- Change Status --</option>
                <option value="1">Pending</option>
                <option value="2">Packed</option>
                <option value="3">Processing</option>
                <option value="4">In Transit</option>
                <option value="5">Delivered</option>
                <option value="6">Cancelled</option>
              </select>
              <button
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating || !bulkStatus}
                className="h-9 px-4 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
              >
                {isBulkUpdating ? "Updating..." : "Apply Bulk Update"}
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-sm font-bold text-gray-500 hover:text-gray-700 px-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <OrderTable 
        items={orders} 
        loading={loading} 
        onRefresh={() => { fetchOrders(); fetchStats(); }} 
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
        onSelectAll={handleSelectAll}
      />

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

      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-yellow-600">Create New Order</h2>
          <p className="text-gray-500 text-sm mt-1">Create an offline (Branch) order for a user.</p>
        </div>
        <OrderForm
          onCancel={() => setIsDrawerOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </Drawer>
    </div>
  );
};

export default OrderPage;
