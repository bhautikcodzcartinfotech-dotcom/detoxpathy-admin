"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOrderDetails, updateOrderStatus, downloadOrderInvoiceApi, API_BASE } from "@/Api/AllApi";
import Loader from "@/utils/loader";
import toast from "react-hot-toast";
import { ChevronLeft, Package, User, MapPin, Truck, CreditCard, ExternalLink } from "lucide-react";

const OrderDetailsPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getOrderDetails(id);
      setOrder(data);
    } catch (err) {
      toast.error("Failed to load order details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true);
      await updateOrderStatus(id, Number(newStatus));
      toast.success("Order status updated");
      fetchDetails();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;
  if (!order) return <div className="p-10 text-center">Order not found</div>;

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

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Order #{order._id.slice(-6).toUpperCase()}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[order.orderStatus]}`}>
              {STATUS_LABELS[order.orderStatus]}
            </span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleString()}</p>
            <span className="text-gray-300">|</span>
            <p className="text-sm font-bold text-teal-600">Branch: {order.branch?.name || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Items & Shipping */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Items Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                Order Items
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {order.plans?.map((planItem, idx) => (
                <div key={`plan-${idx}`} className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs">PLAN</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{planItem.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{planItem.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">₹{planItem.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: 1</p>
                  </div>
                </div>
              ))}
              {/* Fallback for legacy single plan orders */}
              {order.plan && !order.plans?.length && (
                <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs">PLAN</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{order.plan.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{order.plan.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">₹{order.plan.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: 1</p>
                  </div>
                </div>
              )}
              {order.products?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {item.image ? (
                      <img src={`${API_BASE}${item.image}`} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={20} /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-teal-600">₹{item.price}</p>
                    <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-6 flex justify-between items-center">
              <span className="font-bold text-gray-600">Total Amount</span>
              <span className="text-2xl font-black text-teal-700">₹{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                Shipping Details
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recipient</p>
                  <p className="font-bold text-gray-800">{order.shippingAddress?.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{order.shippingAddress?.mobile}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {order.shippingAddress?.addressLine1}, {order.shippingAddress?.addressLine2 && `${order.shippingAddress?.addressLine2}, `}
                    <br />
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
                    <br />
                    {order.shippingAddress?.country}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: User Info & Actions */}
        <div className="space-y-8">
          
          {/* User Profile Summary */}
          {order.user && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-4 border-teal-50 ring-4 ring-white">
                <img 
                  src={order.user.image?.startsWith('http') ? order.user.image : (order.user.image ? `${API_BASE}/${order.user.image}` : `https://ui-avatars.com/api/?name=${order.user.name}+${order.user.surname}`)} 
                  alt={order.user.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="font-bold text-lg text-gray-900">{order.user.name} {order.user.surname}</h3>
              <p className="text-sm text-gray-500 mb-6">{order.user.mobilePrefix} {order.user.mobileNumber}</p>
              
              <button 
                onClick={() => router.push(`/component/users/${order.user.id}/profile`)}
                className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition"
              >
                View Full Profile
                <ExternalLink size={14} />
              </button>
            </div>
          )}

          {/* Status Update & Tracking */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Update Order Status</label>
              <select 
                value={order.orderStatus}
                disabled={updating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition disabled:opacity-50"
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <hr className="border-gray-50" />

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Method</p>
                  <p className="text-sm font-bold text-gray-700">{order.paymentMethod || 'Razorpay'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Courier Service</p>
                  <p className="text-sm font-bold text-gray-700">{order.courier || 'Not Assigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5" /> {/* Spacer */}
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Tracking Number</p>
                  <p className="text-sm font-mono text-gray-600">{order.trackingId || '-'}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => downloadOrderInvoiceApi(order._id)}
              className="w-full py-2.5 border border-teal-600 text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 transition"
            >
              Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
