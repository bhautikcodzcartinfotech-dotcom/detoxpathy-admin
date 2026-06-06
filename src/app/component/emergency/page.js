"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getEmergencyAlerts,
  getAllBranches
} from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone,
  AlertOctagon,
  RefreshCw
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Dropdown from "@/utils/dropdown";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/utils/actionbutton";

const getTodayInKolkata = () => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
};

export default function EmergencyAlertsPage() {
  const router = useRouter();
  const { role, branches } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(""); 

  // Fetch branches on mount
  useEffect(() => {
    fetchBranches();
  }, []);

  // Fetch alerts when selected branch or date filter changes
  useEffect(() => {
    fetchAlertsList();
  }, [selectedBranchId, filterDate]);

  const fetchBranches = async () => {
    try {
      const data = await getAllBranches();
      let branchList = Array.isArray(data) ? data : [];
      
      if (role !== "Admin") {
        const allowedBranchIds = branches || [];
        branchList = branchList.filter(b => 
          allowedBranchIds.includes(String(b._id))
        );
      }
      setAllBranches(branchList);
    } catch (error) {
      console.error("Failed to load branches:", error);
      toast.error("Failed to load branches");
    }
  };

  const fetchAlertsList = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterDate) params.date = filterDate;

      const data = await getEmergencyAlerts(selectedBranchId, params);
      setAlerts(data || []);
    } catch (error) {
      console.error("Failed to load emergency alerts:", error);
      setAlerts([]);
      if (error?.response?.status !== 404) {
        toast.error("Failed to fetch emergency alerts");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      const user = alert.user || {};
      const userFullName = `${user.name || ""} ${user.surname || ""}`.toLowerCase();
      const patientId = (user.patientId || "").toLowerCase();
      const alertId = (alert._id || "").toLowerCase();
      const q = searchTerm.toLowerCase();

      return userFullName.includes(q) || patientId.includes(q) || alertId.includes(q);
    });
  }, [alerts, searchTerm]);

  const stats = useMemo(() => {
    const total = alerts.length;
    
    // Alerts today (Kolkata timezone comparison)
    const todayStr = getTodayInKolkata();
    const todayAlerts = alerts.filter(a => {
      if (!a.createdAt) return false;
      const datePart = new Date(a.createdAt).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      const d = new Date(datePart);
      const formatted = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');
      return formatted === todayStr;
    }).length;

    const active = alerts.filter(a => !a.resolved).length;
    const branchCount = allBranches.length;

    return { total, todayAlerts, active, branchCount };
  }, [alerts, allBranches]);

  const branchOptions = useMemo(() => {
    return [
      { label: "All Branches", value: "all" },
      ...allBranches.map(br => ({ label: br.name, value: br._id }))
    ];
  }, [allBranches]);

  const formatAlertTime = (utcString) => {
    if (!utcString) return { date: "—", time: "—" };
    const d = new Date(utcString);
    const dateStr = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    return { date: dateStr, time: timeStr };
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]} permission="show emergency page">
      <div className="w-full h-full px-6 py-6 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Header size="3xl">Emergency alerts</Header>
            <p className="text-gray-500 mt-1">
              Real-time emergency monitoring logs. Review and check socket emergency triggers branch-wise.
            </p>
          </div>
          <div className="sm:shrink-0">
            <Button onClick={fetchAlertsList} icon={RefreshCw}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Alerts Logged", value: stats.total, color: "border-teal-100 text-teal-700 bg-white" },
            { label: "Alerts Today", value: stats.todayAlerts, color: "border-red-100 text-red-600 bg-white animate-pulse" },
            { label: "Active / Unresolved", value: stats.active, color: "border-rose-100 text-rose-700 bg-white" },
            { label: "Branches Monitored", value: stats.branchCount, color: "border-emerald-100 text-emerald-700 bg-white" },
          ].map((stat, i) => (
            <div key={i} className={`p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${stat.color}`}>
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{stat.label}</span>
              <span className="text-3xl font-black mt-2 text-gray-900">{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Filters Controls Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            
            {/* Search Input */}
            <div className="relative">
              <label className="block mb-1.5 font-bold text-sm tracking-wide text-gray-700">Search</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search patient name, ID..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Branch Filter Dropdown */}
            <div className="w-full">
              <Dropdown
                label="Branch"
                options={branchOptions}
                value={selectedBranchId}
                onChange={setSelectedBranchId}
                placeholder="Select Branch"
              />
            </div>

            {/* Date Filter */}
            <div className="w-full">
              <label className="block mb-1.5 font-bold text-sm tracking-wide text-gray-700">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none text-sm transition-all cursor-pointer"
              />
            </div>

          </div>
        </div>

        {/* Alerts Table List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-extrabold text-gray-800 text-lg">
              Emergency Trigger Records ({filteredAlerts.length})
            </h3>
            {searchTerm && (
              <span className="text-xs text-gray-400 font-bold">
                Filtered from {alerts.length} total
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-black text-red-600 uppercase tracking-widest animate-pulse">Loading Alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center mb-4">
                <AlertOctagon className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-gray-800 font-bold text-base">No emergency alerts found</h3>
              <p className="text-gray-400 text-xs mt-1 max-w-sm">
                Try modifying your branch selection, search term, or filters to view other records.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#134D41]">
                  <tr className="text-[10px] uppercase tracking-widest text-white">
                    <th className="px-6 py-4 font-black">Patient Details</th>
                    <th className="px-6 py-4 font-black">Mobile Number</th>
                    <th className="px-6 py-4 font-black">Branch / Locality</th>
                    <th className="px-6 py-4 font-black">Triggered Date & Time</th>
                    <th className="px-6 py-4 font-black">Alert Status</th>
                    <th className="px-6 py-4 font-black text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredAlerts.map((alert) => {
                    const timeMeta = formatAlertTime(alert.createdAt);
                    const user = alert.user || {};
                    return (
                      <tr key={alert._id} className="group hover:bg-gray-50/50 transition-colors">
                        
                        {/* Patient Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-[13px] font-black text-rose-600 border border-rose-100">
                              {(user.name || "P")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-700 capitalize">
                                {user.name || "Unknown"} {user.surname || ""}
                              </p>
                              <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-0.5">
                                Patient ID: {user.patientId || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Mobile Number */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{user.mobilePrefix ? `+${user.mobilePrefix} ` : ""}{user.mobileNumber || "—"}</span>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-[#134D41]" />
                            <span>{alert.branch?.name || "Main Branch"}</span>
                          </div>
                        </td>

                        {/* Triggered Date & Time */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-700 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{timeMeta.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Clock className="w-3.5 h-3.5 text-gray-300" />
                              <span>{timeMeta.time}</span>
                            </div>
                          </div>
                        </td>

                        {/* Alert Status badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-black rounded-full border transition-all ${
                            alert.resolved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-red-50 text-red-600 border-red-100 animate-pulse font-extrabold"
                          }`}>
                            {alert.resolved ? "Resolved" : "Active Alert"}
                          </span>
                        </td>

                        {/* Action Eye Button */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center items-center">
                            {user._id && (
                              <ActionButton
                                type="view"
                                onClick={() => router.push(`/component/users/${user._id}/profile`)}
                                title="View Profile"
                              />
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
      </div>
    </RoleGuard>
  );
}
