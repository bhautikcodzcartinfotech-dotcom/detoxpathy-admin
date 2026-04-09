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
    orderType: "", // empty for all, 1 for product, 2 for program
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

  const handleTypeFilter = (type) => {
    setFilter((prev) => ({ ...prev, orderType: type, start: 1 }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 mt-1">Monitor and manage all customer orders</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button
            onClick={() => handleTypeFilter("")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              filter.orderType === ""
                ? "bg-yellow-400 text-black shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Orders
          </button>
          <button
            onClick={() => handleTypeFilter(1)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              filter.orderType === 1
                ? "bg-yellow-400 text-black shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Product Orders
          </button>
          <button
            onClick={() => handleTypeFilter(2)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              filter.orderType === 2
                ? "bg-yellow-400 text-black shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Program Orders
          </button>
        </div>
      </div>

      <OrderTable items={orders} loading={loading} />

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
