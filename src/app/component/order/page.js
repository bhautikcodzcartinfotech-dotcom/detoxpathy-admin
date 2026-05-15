"use client";
import React, { useEffect, useState } from "react";
import {
  getAllOrders,
  getOrderStats,
  bulkUpdateOrderStatusApi,
  bulkDownloadInvoicesApi,
  createCompanyOrder,
  verifyCompanyOrderPaymentApi,
  getAllUsers,
  getAllProducts,
  getAllPlans,
  getAllBranches
} from "@/Api/AllApi";
import OrderTable from "./orderTable";
import toast from "react-hot-toast";
import OrderForm from "./orderForm";
import CompanyOrderForm from "../stock/companyOrderForm";
import Drawer from "@/utils/formanimation";
import { Header, Button } from "@/utils/header";
import Dropdown from "@/utils/dropdown";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";

const OrderPage = () => {
  const { role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCompanyOrderDrawerOpen, setIsCompanyOrderDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [branches, setBranches] = useState([]);

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

  const fetchCompanyOrderData = async () => {
    try {
      const [userData, productData, planData, branchData] = await Promise.all([
        getAllUsers({ limit: 1000 }),
        getAllProducts({ start: 1, limit: 1000 }),
        getAllPlans(),
        getAllBranches()
      ]);
      setUsers(Array.isArray(userData?.users) ? userData.users : (Array.isArray(userData) ? userData : []));
      setProducts(Array.isArray(productData?.products) ? productData.products : []);
      setPlans(Array.isArray(planData) ? planData : []);
      setBranches(Array.isArray(branchData) ? branchData : []);
    } catch (err) {
      console.error("Failed to fetch company order data", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filter]);

  useEffect(() => {
    fetchCompanyOrderData();
  }, []);

  const handleCompanyOrderSubmit = async (orderData) => {
    try {
      setLoading(true);
      const res = await createCompanyOrder(orderData);

      const { order, razorpayOrder, razorpayKey } = res;

      const options = {
        key: razorpayKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "DetoxPathy",
        description: "Company Order Payment",
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            setLoading(true);
            await verifyCompanyOrderPaymentApi({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful & Order created");
            setIsCompanyOrderDrawerOpen(false);
            fetchOrders();
            fetchStats();
          } catch (err) {
            toast.error("Payment verification failed");
            console.error(err);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: order.shippingAddress?.name || "",
          contact: order.shippingAddress?.mobile || "",
        },
        theme: {
          color: "#134D41",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.error("Payment cancelled");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create company order");
      setLoading(false);
    }
  };

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

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return toast.error("No orders selected");
    try {
      setLoading(true);
      await bulkDownloadInvoicesApi(selectedIds);
      toast.success("Downloading invoices...");
    } catch (err) {
      toast.error("Failed to download invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setIsDrawerOpen(false);
    fetchOrders();
    fetchStats();
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]} permission="show order page">
      <div className="w-full h-full px-8 lg:px-12 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <Header size="4xl">Orders & Shipping</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Track sales, dispatch status, and fulfillment</p>
          </div>
          <div className="flex items-center gap-4">
            {role === 'subadmin' && (
              <Button
                onClick={() => setIsCompanyOrderDrawerOpen(true)}
                variant="secondary"
              >
                Company Order
              </Button>
            )}
            <Button
              onClick={() => setIsDrawerOpen(true)}
              variant="primary"
            >
              Create New Order
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 mb-5 md:grid-cols-4 gap-4">
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
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            {/* Search Bar */}
            <div className="md:col-span-6 space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase ml-1">Search Orders</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 group-focus-within:text-[#134D41] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by ORD-ID, user name, mobile, or product..."
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] bg-gray-50/50 transition-all placeholder:text-gray-400 text-sm font-medium"
                  value={filter.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="md:col-span-3">
              <Dropdown
                label="Order Type"
                options={[
                  { label: "All Types", value: "" },
                  { label: "Online", value: "1" },
                  { label: "Branch", value: "2" },
                ]}
                value={filter.type}
                onChange={(val) => handleFilterChange("type", val)}
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <Dropdown
                label="Order Status"
                options={[
                  { label: "All Status", value: "" },
                  { label: "Pending", value: "1" },
                  { label: "Packed", value: "2" },
                  { label: "Processing", value: "3" },
                  { label: "In Transit", value: "4" },
                  { label: "Delivered", value: "5" },
                  { label: "Cancelled", value: "6" },
                ]}
                value={filter.status}
                onChange={(val) => handleFilterChange("status", val)}
              />
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-teal-50 border border-teal-100 rounded-lg animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-teal-800 ml-2">
                {selectedIds.length} orders selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-48">
                  <Dropdown
                    options={[
                      { label: "-- Change Status --", value: "" },
                      { label: "Pending", value: "1" },
                      { label: "Packed", value: "2" },
                      { label: "Processing", value: "3" },
                      { label: "In Transit", value: "4" },
                      { label: "Delivered", value: "5" },
                      { label: "Cancelled", value: "6" },
                    ]}
                    value={bulkStatus}
                    onChange={(val) => setBulkStatus(val)}
                  />
                </div>
                <Button
                  onClick={handleBulkUpdate}
                  disabled={isBulkUpdating || !bulkStatus}
                  variant="primary"
                  className="h-11 px-4 text-xs"
                >
                  {isBulkUpdating ? "Updating..." : "Apply Bulk Update"}
                </Button>
                <Button
                  onClick={handleBulkDownload}
                  disabled={loading || selectedIds.length === 0}
                  variant="primary"
                  className="h-9 px-4 text-xs"
                >
                  Download Selected
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedIds([])}
                  className="h-9 px-4 text-xs border-none"
                >
                  Clear
                </Button>
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
            <Button
              variant="secondary"
              disabled={pagination.page === 1 || loading}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm font-bold text-gray-700">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={pagination.page === pagination.totalPages || loading}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
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

        <Drawer isOpen={isCompanyOrderDrawerOpen} onClose={() => setIsCompanyOrderDrawerOpen(false)}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#134D41] mb-2 text-center uppercase tracking-tighter">
              Create Company Order
            </h2>
            <p className="text-center text-gray-400 text-sm mb-8">
              Generate a bulk order with automated branch pricing.
            </p>
            <CompanyOrderForm
              products={products}
              plans={plans}
              onSubmit={handleCompanyOrderSubmit}
              onCancel={() => setIsCompanyOrderDrawerOpen(false)}
              loading={loading}
            />
          </div>
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default OrderPage;
