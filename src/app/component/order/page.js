"use client";
import React, { useEffect, useState } from "react";
import { getAllOrders } from "@/Api/AllApi";
import OrderTable from "./orderTable";
import toast from "react-hot-toast";

const OrderPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    start: 1,
    limit: 10,
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

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const handlePageChange = (newPage) => {
    setFilter((prev) => ({ ...prev, start: newPage }));
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500 mt-1">Monitor and manage all customer orders</p>
      </div>

      <OrderTable items={orders} loading={loading} onRefresh={fetchOrders} />

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
