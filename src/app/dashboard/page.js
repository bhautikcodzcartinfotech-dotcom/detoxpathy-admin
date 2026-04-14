"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  ShoppingCart, 
  Activity, 
  UserPlus, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreVertical,
  Calendar,
  Clock,
  Briefcase,
  TrendingUp,
  Video,
  PlusCircle,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  Mail,
  Lock,
  Camera
} from "lucide-react";
import { getDashboardStats, createSubAdminApi, getAllBranches } from "@/Api/AllApi";
import Loader from "@/utils/loader";
import Dropdown from "@/utils/dropdown";
import toast from "react-hot-toast";

const DashboardPage = () => {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  
  // Add Doctor Modal State
  const [isAddDoctorModalOpen, setIsAddDoctorModalOpen] = useState(false);
  const [allBranches, setAllBranches] = useState([]);
  const [doctorForm, setDoctorForm] = useState({
    username: "",
    email: "",
    password: "",
    branchId: "",
    image: null
  });
  const [formLoading, setFormLoading] = useState(false);

  const getTodayFormatted = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return new Date().toLocaleDateString('en-GB', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats(
          dateRange === "custom" ? customStartDate : null,
          dateRange === "custom" ? customEndDate : null
        );
        setStats(data);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    const fetchBranches = async () => {
      try {
        const branches = await getAllBranches();
        setAllBranches(branches || []);
      } catch (e) {
        console.error("Failed to load branches");
      }
    };

    fetchStats();
    fetchBranches();
  }, [dateRange, customStartDate, customEndDate]);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!doctorForm.username || !doctorForm.email || !doctorForm.password || !doctorForm.branchId) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setFormLoading(true);
      await createSubAdminApi({
        username: doctorForm.username,
        email: doctorForm.email,
        password: doctorForm.password,
        branch: [doctorForm.branchId],
        image: doctorForm.image
      });
      toast.success("Doctor (Sub-Admin) created successfully");
      setIsAddDoctorModalOpen(false);
      setDoctorForm({ username: "", email: "", password: "", branchId: "", image: null });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create Doctor");
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader /></div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!stats) return null;

  const orderStatusMap = {
    1: { label: "Pending", class: "bg-amber-100 text-amber-700" },
    2: { label: "Packed", class: "bg-blue-100 text-blue-700" },
    3: { label: "Processing", class: "bg-teal-100 text-teal-700" },
    4: { label: "In Transit", class: "bg-orange-100 text-orange-700" },
    5: { label: "Delivered", class: "bg-green-100 text-green-700" },
    6: { label: "Cancelled", class: "bg-red-100 text-red-700" },
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 bg-[#F8FAFC] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {getGreeting()}, <span className="text-teal-700">Admin</span> 👋
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Here's Detoxpathy's overview for today — {getTodayFormatted()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dropdown
            options={[
              { label: "All Time", value: "all" },
              { label: "Custom Range", value: "custom" },
            ]}
            value={dateRange}
            onChange={setDateRange}
            placeholder="Data View"
          />
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-none border border-gray-200 shadow-sm animate-in fade-in zoom-in-95">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs font-bold text-gray-700 focus:outline-none"
              />
              <span className="text-gray-300 text-xs">-</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs font-bold text-gray-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: "TOTAL USERS", 
            value: stats.totalUsers || 0, 
            sub: "+34 this week", 
            color: "border-teal-600 shadow-teal-900/5",
            icon: Users
          },
          { 
            title: "REVENUE (MTD)", 
            value: `${((stats.revenue?.mtd || 0) / 100000).toFixed(1)}L`, 
            sub: "+18% vs last month", 
            color: "border-orange-500 shadow-orange-900/5",
            icon: TrendingUp
          },
          { 
            title: "ACTIVE PROGRAMS", 
            value: stats.activePlanUsers || 0, 
            sub: "64 completing today", 
            color: "border-green-500 shadow-green-900/5",
            icon: Activity 
          },
          { 
            title: "UNASSIGNED LEADS", 
            value: stats.pendingUsers || 0, 
            sub: "needs attention", 
            subColor: "text-red-500 font-bold",
            color: "border-red-500 shadow-red-900/5",
            icon: AlertCircle
          },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-none border-t-4 ${stat.color} shadow-xl hover:scale-[1.02] transition-all relative overflow-hidden group`}>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-[0.2em] mb-4 uppercase">{stat.title}</p>
                <h3 className="text-3xl font-black text-gray-900 mb-2">{stat.value.toLocaleString()}</h3>
              </div>
              <p className={`text-[10px] ${stat.subColor || 'text-gray-500'} font-bold`}>{stat.sub}</p>
            </div>
            <stat.icon className="absolute top-6 right-6 w-12 h-12 text-gray-50 opacity-10 group-hover:opacity-20 transition-all group-hover:-rotate-12" />
          </div>
        ))}
      </div>

      {/* Middle Section: Branch Performance & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Branch Performance */}
        <div className="lg:col-span-1 bg-white p-8 rounded-none shadow-xl shadow-teal-900/5 border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest px-2">Branch Performance</h2>
            <button className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">Full report</button>
          </div>
          
          <div className="space-y-8 flex-1">
            {stats.revenue?.byBranch?.slice(0, 5).map((branch, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-bold text-gray-800">{branch.name}</span>
                  <span className="font-black text-gray-900">{branch.total.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-teal-900 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min((branch.total / (stats.revenue?.mtd || 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!stats.revenue?.byBranch || stats.revenue.byBranch.length === 0) && (
              <div className="flex items-center justify-center h-full text-gray-400 font-bold text-xs uppercase italic">No branch data data</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-none shadow-xl shadow-teal-900/5 border border-gray-100 overflow-hidden">
          <div className="p-8 flex items-center justify-between bg-gray-50/50 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Recent Orders</h2>
            <button 
              onClick={() => router.push('/component/order')}
              className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline"
            >
              View all
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentOrders?.map((order, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-[12px] font-bold text-teal-600">ORD-{order._id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-gray-800">{order.userId?.name} {order.userId?.surname}</td>
                    <td className="px-6 py-4 text-[13px] font-black text-gray-900">{order.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm ${orderStatusMap[order.orderStatus]?.class}`}>
                        {orderStatusMap[order.orderStatus]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Section: Today's Appointments, Lead Pipeline, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-12 gap-8">
        {/* Today's Appointments */}
        <div className="lg:col-span-2 xl:col-span-4 bg-white rounded-none shadow-xl shadow-teal-900/5 border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Today's Appointments</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[350px] scrollbar-hide">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/30 sticky top-0 backdrop-blur-md">
                  <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</th>
                  <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Patient</th>
                  <th className="px-6 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.appointmentsToday?.map((apt, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5 text-[12px] font-bold text-gray-900 flex items-center gap-2">
                       <Clock className="w-3 h-3 text-teal-600" />
                       {apt.startTime}
                    </td>
                    <td className="px-6 py-5 text-[12px] font-bold text-gray-700">{apt.userId?.name} {apt.userId?.surname}</td>
                    <td className="px-6 py-5 text-[12px] font-black text-teal-700 uppercase tracking-tighter">{apt.branchId?.name || "Main Branch"}</td>
                  </tr>
                ))}
                {(!stats.appointmentsToday || stats.appointmentsToday.length === 0) && (
                  <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400 text-xs font-bold uppercase italic tracking-widest">No appointments today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Pipeline */}
        <div className="lg:col-span-2 xl:col-span-4 bg-white p-8 rounded-none shadow-xl shadow-teal-900/5 border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Lead Pipeline</h2>
            <button className="text-[10px] font-black text-teal-600 uppercase tracking-widest hover:underline">CRM</button>
          </div>
          <div className="space-y-6">
            {[
              { label: "New (Unassigned)", value: stats.pipeline?.new || 0, color: "text-red-500" },
              { label: "Contacted", value: stats.pipeline?.contacted || 0, color: "text-gray-800" },
              { label: "Interested", value: stats.pipeline?.interested || 0, color: "text-gray-800" },
              { label: "Converted Today", value: stats.pipeline?.converted || 0, color: "text-green-600" },
              { label: "Lost This Week", value: stats.pipeline?.lost || 0, color: "text-gray-400" },
            ].map((lead, i) => (
              <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-all">
                <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">{lead.label}</span>
                <span className={`text-[15px] font-black ${lead.color}`}>{lead.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-4">
           <div className="bg-white p-6 rounded-none shadow-lg border border-gray-100 flex-1 flex flex-col h-full">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Quick Actions</h2>
              <div className="flex flex-col gap-4 flex-1 justify-center">
                 <button 
                  onClick={() => setIsAddDoctorModalOpen(true)}
                  className="w-full h-14 bg-teal-900 text-white rounded-none font-black text-xs uppercase tracking-widest hover:bg-teal-950 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                 >
                    <PlusCircle className="w-4 h-4" /> Add Doctor
                 </button>
                 <button 
                  onClick={() => router.push('/component/users')}
                  className="w-full h-14 bg-white border-2 border-gray-100 text-gray-900 rounded-none font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:border-teal-100 transition-all flex items-center justify-center gap-2"
                 >
                    <UserPlus className="w-4 h-4 text-teal-600" /> Add User
                 </button>
                 <button 
                  onClick={() => router.push('/component/video')}
                  className="w-full h-14 bg-white border-2 border-gray-100 text-gray-900 rounded-none font-black text-xs uppercase tracking-widest hover:bg-gray-50 hover:border-teal-100 transition-all flex items-center justify-center gap-2"
                 >
                    <Video className="w-4 h-4 text-teal-600" /> Upload Video
                 </button>
                 <button className="w-full h-14 bg-orange-500 text-white rounded-none font-black text-xs uppercase tracking-widest hover:bg-orange-600 hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                    Trigger Payout
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddDoctorModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-none shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Add New Doctor</h3>
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Create a sub-admin account</p>
              </div>
            </div>

            <form onSubmit={handleAddDoctor} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      required
                      placeholder="Dr. John Doe"
                      value={doctorForm.username}
                      onChange={(e) => setDoctorForm({...doctorForm, username: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-sm font-bold text-gray-700 transition-all rounded-none"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="email"
                      required
                      placeholder="doctor@detoxpathy.com"
                      value={doctorForm.email}
                      onChange={(e) => setDoctorForm({...doctorForm, email: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-sm font-bold text-gray-700 transition-all rounded-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={doctorForm.password}
                      onChange={(e) => setDoctorForm({...doctorForm, password: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-sm font-bold text-gray-700 transition-all rounded-none"
                    />
                  </div>
                </div>

                {/* Branch Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Assign Branch</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      required
                      value={doctorForm.branchId}
                      onChange={(e) => setDoctorForm({...doctorForm, branchId: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-sm font-bold text-gray-700 appearance-none transition-all rounded-none"
                    >
                      <option value="">Select Branch</option>
                      {allBranches.map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Profile Image */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Profile Photo (Optional)</label>
                <div className="relative">
                  <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={(e) => setDoctorForm({...doctorForm, image: e.target.files[0]})}
                    className="w-full h-14 pl-12 pr-4 bg-gray-50 flex items-center border border-transparent focus:border-teal-500 focus:bg-white focus:outline-none text-xs font-bold text-gray-400 transition-all rounded-none pt-4"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsAddDoctorModalOpen(false)}
                  className="flex-1 h-14 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all rounded-none"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formLoading}
                  className="flex-[2] h-14 bg-teal-900 text-white font-black text-xs uppercase tracking-widest hover:bg-teal-950 shadow-xl shadow-teal-900/20 disabled:opacity-50 transition-all rounded-none flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

