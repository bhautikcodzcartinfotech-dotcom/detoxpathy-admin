"use client";
import React, { useEffect, useState } from "react";
import {
  getAllOrders,
  getOrderStats,
  bulkUpdateOrderStatusApi,
  bulkDownloadInvoicesApi,
  createCompanyOrder,
  verifyCompanyOrderPaymentApi,
  deleteOrderApi,
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
  const { role, permissions } = useAuth();
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
    status: "",
    branchId: "",
    month: ""
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

  useEffect(() => {
    if (role && role !== "Admin") {
      setFilter((prev) => ({ ...prev, type: "2" }));
    }
  }, [role]);

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
          ondismiss: async function () {
            setLoading(false);
            try {
              await deleteOrderApi(order._id);
            } catch (err) {
              console.error("Company order cleanup failed:", err);
            }
            toast.error("Payment cancelled. Order has been removed.");
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

  const handleDownloadMonthlyReport = async () => {
    if (role !== "Admin") {
      return toast.error("You do not have permission to download monthly reports");
    }
    if (!filter.month) {
      return toast.error("Please select a month first");
    }
    
    try {
      setLoading(true);
      // Fetch up to 2000 orders for the selected month to ensure we get them all
      const data = await getAllOrders({ ...filter, start: 1, limit: 2000 });
      const monthlyOrders = data.orders || [];
      
      if (monthlyOrders.length === 0) {
        toast.error("No orders found for the selected filters");
        setLoading(false);
        return;
      }
      
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocker prevented opening print window");
        setLoading(false);
        return;
      }

      const STATUS_LABELS = {
        1: "Pending",
        2: "Packed",
        3: "Processing",
        4: "In Transit",
        5: "Delivered",
        6: "Cancelled",
      };

      let rowsHtml = "";
      let totalSum = 0;

      monthlyOrders.forEach((order) => {
        const statusLabel = STATUS_LABELS[order.orderStatus] || "Pending";
        const statusClass = {
          1: "badge-pending",
          2: "badge-packed",
          3: "badge-processing",
          4: "badge-transit",
          5: "badge-delivered",
          6: "badge-cancelled",
        }[order.orderStatus] || "badge-pending";

        const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");
        const orderId = `ORD-${order._id.slice(-6).toUpperCase()}`;

        const customerName = (order.shippingAddress?.name || `${order.user?.name || ""} ${order.user?.surname || ""}`).trim().toUpperCase();
        const mobile = order.shippingAddress?.mobile || order.user?.mobileNumber || "N/A";
        const addressParts = [
          order.shippingAddress?.addressLine1,
          order.shippingAddress?.addressLine2,
          order.shippingAddress?.city,
          order.shippingAddress?.state ? `${order.shippingAddress.state} ${order.shippingAddress.postalCode || ""}` : order.shippingAddress?.postalCode,
          order.shippingAddress?.country || "India"
        ].filter(p => p && p.trim().length > 0);
        const billTo = `${customerName} | Mob: ${mobile}<br/><span class="text-muted">${addressParts.join(", ")}</span>`;

        let itemsText = [];
        if (order.plans && order.plans.length > 0) {
          order.plans.forEach(p => itemsText.push(`${p.quantity || 1}x ${p.name || 'Membership Plan'}`));
        } else if (order.plan) {
          itemsText.push(`1x ${order.plan.name || 'Membership Plan'}`);
        }
        if (order.products && order.products.length > 0) {
          order.products.forEach(p => itemsText.push(`${p.quantity}x ${p.name || 'Product'}`));
        }
        const itemsString = itemsText.join("<br/>");
        const amountVal = order.totalAmount || 0;
        totalSum += amountVal;

        rowsHtml += `
          <tr>
            <td><strong>${orderId}</strong><br/><span class="text-muted">${orderDate}</span></td>
            <td>${billTo}</td>
            <td>${itemsString}</td>
            <td class="text-center"><span class="badge ${statusClass}">${statusLabel}</span></td>
            <td class="text-right"><strong>₹${amountVal.toLocaleString("en-IN")}</strong></td>
          </tr>
        `;
      });

      const [year, monthNum] = filter.month.split('-');
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const displayMonth = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Monthly Order Report</title>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; margin: 0; padding: 40px; background-color: #ffffff; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { margin-bottom: 25px; }
            .header h1 { color: #0d9488; font-size: 26px; margin: 0 0 5px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .header .subtitle { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1e293b; margin-bottom: 20px; letter-spacing: 1px; }
            .header h2 { font-size: 16px; font-weight: 800; margin: 0 0 8px 0; color: #1e293b; letter-spacing: 0.5px; text-transform: uppercase; }
            .header .metadata { font-size: 11px; color: #64748b; }
            hr { border: 0; border-top: 1px solid #cbd5e1; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #f8fafc; color: #1e293b; font-weight: 700; text-align: left; padding: 10px 12px; font-size: 10px; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; vertical-align: top; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-muted { color: #64748b; font-size: 10.5px; display: inline-block; margin-top: 2px; }
            .badge { display: inline-block; padding: 3px 8px; font-size: 9px; font-weight: 700; border-radius: 4px; text-transform: uppercase; }
            .badge-pending { background-color: #f1f5f9; color: #475569; }
            .badge-packed { background-color: #dbeafe; color: #1e40af; }
            .badge-processing { background-color: #fef9c3; color: #854d0e; }
            .badge-transit { background-color: #ffedd5; color: #9a3412; }
            .badge-delivered { background-color: #dcfce7; color: #166534; }
            .badge-cancelled { background-color: #fee2e2; color: #991b1b; }
            .summary-row { font-weight: 700; background-color: #f8fafc; }
            .summary-row td { border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1; font-size: 12px; vertical-align: middle; }
            .footer { text-align: center; font-size: 10px; color: #64748b; margin-top: 40px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DETOXPATHY</h1>
              <div class="subtitle">HEALTH & WELLNESS SOLUTIONS</div>
              <h2>MONTHLY ORDER REPORT: ${displayMonth}</h2>
              <div class="metadata">
                <strong>Total Orders:</strong> ${monthlyOrders.length} | <strong>Generated On:</strong> ${new Date().toLocaleDateString("en-GB")}
              </div>
            </div>
            <hr />
            <table>
              <thead>
                <tr>
                  <th style="width: 120px;">ORDER ID</th>
                  <th>CUSTOMER & SHIPPING</th>
                  <th>ITEMS</th>
                  <th class="text-center" style="width: 100px;">STATUS</th>
                  <th class="text-right" style="width: 120px;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="summary-row">
                  <td colspan="3">TOTAL REVENUE SUMMARY</td>
                  <td class="text-center">${monthlyOrders.length} Orders</td>
                  <td class="text-right">₹${totalSum.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>
            <hr />
            <div class="footer">
              Thank you | www.detoxpathy.com | Computer generated monthly report. No signature required.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (err) {
      toast.error("Failed to generate monthly report");
    } finally {
      setLoading(false);
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

  const handleBulkDownload = () => {
    if (selectedIds.length === 0) return toast.error("No orders selected");
    if (role === 'subadmin' && !permissions?.includes('generate order invoice')) {
      return toast.error("You do not have permission to download invoices");
    }

    const selectedOrders = orders.filter(o => selectedIds.includes(o._id));
    if (selectedOrders.length === 0) {
      toast.error("Selected orders data not found");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented opening print window");
      return;
    }

    const STATUS_LABELS = {
      1: "Pending",
      2: "Packed",
      3: "Processing",
      4: "In Transit",
      5: "Delivered",
      6: "Cancelled",
    };

    let rowsHtml = "";
    let totalSum = 0;

    selectedOrders.forEach((order) => {
      const statusLabel = STATUS_LABELS[order.orderStatus] || "Pending";
      const statusClass = {
        1: "badge-pending",
        2: "badge-packed",
        3: "badge-processing",
        4: "badge-transit",
        5: "badge-delivered",
        6: "badge-cancelled",
      }[order.orderStatus] || "badge-pending";

      const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB");
      const orderId = `ORD-${order._id.slice(-6).toUpperCase()}`;

      const customerName = (order.shippingAddress?.name || `${order.user?.name || ""} ${order.user?.surname || ""}`).trim().toUpperCase();
      const mobile = order.shippingAddress?.mobile || order.user?.mobileNumber || "N/A";
      const addressParts = [
        order.shippingAddress?.addressLine1,
        order.shippingAddress?.addressLine2,
        order.shippingAddress?.city,
        order.shippingAddress?.state ? `${order.shippingAddress.state} ${order.shippingAddress.postalCode || ""}` : order.shippingAddress?.postalCode,
        order.shippingAddress?.country || "India"
      ].filter(p => p && p.trim().length > 0);
      const billTo = `${customerName} | Mob: ${mobile}<br/><span class="text-muted">${addressParts.join(", ")}</span>`;

      let itemsText = [];
      if (order.plans && order.plans.length > 0) {
        order.plans.forEach(p => itemsText.push(`${p.quantity || 1}x ${p.name || 'Membership Plan'}`));
      } else if (order.plan) {
        itemsText.push(`1x ${order.plan.name || 'Membership Plan'}`);
      }
      if (order.products && order.products.length > 0) {
        order.products.forEach(p => itemsText.push(`${p.quantity}x ${p.name || 'Product'}`));
      }
      const itemsString = itemsText.join("<br/>");
      const amountVal = order.totalAmount || 0;
      totalSum += amountVal;

      rowsHtml += `
        <tr>
          <td><strong>${orderId}</strong><br/><span class="text-muted">${orderDate}</span></td>
          <td>${billTo}</td>
          <td>${itemsString}</td>
          <td class="text-center"><span class="badge ${statusClass}">${statusLabel}</span></td>
          <td class="text-right"><strong>₹${amountVal.toLocaleString("en-IN")}</strong></td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Order Manifest</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            font-size: 12px;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
          }
          .header {
            margin-bottom: 25px;
          }
          .header h1 {
            color: #0d9488;
            font-size: 26px;
            margin: 0 0 5px 0;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header .subtitle {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #1e293b;
            margin-bottom: 20px;
            letter-spacing: 1px;
          }
          .header h2 {
            font-size: 16px;
            font-weight: 800;
            margin: 0 0 8px 0;
            color: #1e293b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .header .metadata {
            font-size: 11px;
            color: #64748b;
          }
          hr {
            border: 0;
            border-top: 1px solid #cbd5e1;
            margin: 15px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background-color: #f8fafc;
            color: #1e293b;
            font-weight: 700;
            text-align: left;
            padding: 10px 12px;
            font-size: 10px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 1px solid #cbd5e1;
            text-transform: uppercase;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11.5px;
            vertical-align: top;
          }
          .text-center {
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .text-muted {
            color: #64748b;
            font-size: 10.5px;
            display: inline-block;
            margin-top: 2px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 9px;
            font-weight: 700;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .badge-pending { background-color: #f1f5f9; color: #475569; }
          .badge-packed { background-color: #dbeafe; color: #1e40af; }
          .badge-processing { background-color: #fef9c3; color: #854d0e; }
          .badge-transit { background-color: #ffedd5; color: #9a3412; }
          .badge-delivered { background-color: #dcfce7; color: #166534; }
          .badge-cancelled { background-color: #fee2e2; color: #991b1b; }
          
          .summary-row {
            font-weight: 700;
            background-color: #f8fafc;
          }
          .summary-row td {
            border-top: 2px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
            font-size: 12px;
            vertical-align: middle;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #64748b;
            margin-top: 40px;
          }
          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>DETOXPATHY</h1>
            <div class="subtitle">HEALTH & WELLNESS SOLUTIONS</div>
            <h2>ORDER MANIFEST</h2>
            <div class="metadata">
              <strong>Total Orders:</strong> ${selectedOrders.length} | <strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}
            </div>
          </div>
          
          <hr />
          
          <table>
            <thead>
              <tr>
                <th style="width: 120px;">ORDER ID</th>
                <th>CUSTOMER & SHIPPING</th>
                <th>ITEMS</th>
                <th class="text-center" style="width: 100px;">STATUS</th>
                <th class="text-right" style="width: 120px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="summary-row">
                <td colspan="3">TOTAL SUMMARY</td>
                <td class="text-center">${selectedOrders.length} Orders</td>
                <td class="text-right">₹${totalSum.toLocaleString("en-IN")}</td>
              </tr>
            </tbody>
          </table>
          
          <hr />
          
          <div class="footer">
            Thank you | www.detoxpathy.com | Computer generated invoice manifest. No signature required.
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setSelectedIds([]);
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
            {(role === "Admin" || permissions?.includes("create order")) && (
              <Button
                onClick={() => setIsDrawerOpen(true)}
                variant="primary"
              >
                Create New Order
              </Button>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search Bar */}
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase ml-1">Search Orders</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 group-focus-within:text-[#134D41] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search ORD-ID, Name..."
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] bg-gray-50/50 transition-all placeholder:text-gray-400 text-sm font-medium"
                  value={filter.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="md:col-span-2">
              <Dropdown
                label="Order Type"
                options={
                  role === "Admin"
                    ? [
                        { label: "All Types", value: "" },
                        { label: "Online", value: "1" },
                        { label: "Branch", value: "2" },
                      ]
                    : [
                        { label: "Branch", value: "2" },
                      ]
                }
                value={filter.type}
                onChange={(val) => handleFilterChange("type", val)}
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <Dropdown
                label="Status"
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
            
            {/* Branch Filter */}
            {role !== 'subadmin' ? (
              <div className="md:col-span-2">
                <Dropdown
                  label="Branch"
                  options={[
                    { label: "All Branches", value: "" },
                    ...branches.map(b => ({ label: b.name, value: b._id }))
                  ]}
                  value={filter.branchId}
                  onChange={(val) => handleFilterChange("branchId", val)}
                />
              </div>
            ) : (
              <div className="md:col-span-2"></div>
            )}

            {/* Month Filter */}
            {role === "Admin" && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase ml-1">Month</label>
                <input
                  type="month"
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-[#134D41]/5 focus:border-[#134D41] bg-gray-50/50 transition-all text-sm font-medium"
                  value={filter.month}
                  onChange={(e) => handleFilterChange("month", e.target.value)}
                />
              </div>
            )}

            {/* Download Monthly PDF Button */}
            {role === "Admin" && (
              <div className="md:col-span-1 flex items-end">
                <Button
                  onClick={handleDownloadMonthlyReport}
                  disabled={!filter.month || loading}
                  variant="primary"
                  className="h-11 w-full text-xs"
                >
                  Invoice
                </Button>
              </div>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-teal-50 border border-teal-100 rounded-lg animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-bold text-teal-800 ml-2">
                {selectedIds.length} orders selected
              </span>
              <div className="flex items-center gap-2 ml-auto">
                {role !== 'subadmin' && (
                  <>
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
                  </>
                )}
                {(role === 'Admin' || permissions?.includes('generate order invoice')) && (
                  <Button
                    onClick={handleBulkDownload}
                    disabled={loading || selectedIds.length === 0}
                    variant="primary"
                    className="h-9 px-4 text-xs"
                  >
                    Download Selected
                  </Button>
                )}
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
