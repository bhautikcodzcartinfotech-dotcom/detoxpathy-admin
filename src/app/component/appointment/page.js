"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import toast from "react-hot-toast";
import { 
  getAppointmentsByBranch, 
  getAllBranches,
  deleteAppointment
} from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import { MdCalendarToday, MdOutlinePersonOutline, MdAccessTime, MdOutlineCategory, MdDelete } from "react-icons/md";

const AppointmentPage = () => {
  const { role, branches } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const getTodayInKolkata = () => {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
  };

  const [filterDate, setFilterDate] = useState(getTodayInKolkata());
  const [filterStatus, setFilterStatus] = useState("1");
  const [filterType, setFilterType] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

  const daysMap = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
    7: "Sunday",
  };

  const fetchAllBranches = async () => {
    try {
      const data = await getAllBranches();
      setAllBranches(data);
      if (data.length > 0 && !selectedBranchId) {
        if (role === "subadmin" && branches.length > 0) {
          setSelectedBranchId(branches[0]);
        } else {
          const defaultBranch = role === "Admin" ? data.find(b => b.isMainBranch) : data[0];
          setSelectedBranchId(defaultBranch ? defaultBranch._id : data[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async (branchId, date = filterDate, status = filterStatus, type = filterType) => {
    if (!branchId) return;
    try {
      setLoading(true);
      const params = {};
      if (date) params.date = date;
      if (status) params.status = status;
      if (type) params.type = type;
      const data = await getAppointmentsByBranch(branchId, params);
      setAppointments(data || []);
    } catch (e) {
      console.error(e);
      setAppointments([]);
      if (e?.response?.status !== 404) {
          toast.error(e?.response?.data?.message || "Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id) => {
    setAppointmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;
    try {
      setLoading(true);
      await deleteAppointment(appointmentToDelete);
      toast.success("Appointment deleted successfully");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Failed to delete appointment");
      setLoading(false);
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
    }
  };

  useEffect(() => {
    fetchAllBranches();
  }, []);

  useEffect(() => {
    if (selectedBranchId) {
      fetchAppointments(selectedBranchId, filterDate, filterStatus, filterType);
    } else {
        setLoading(false);
    }
  }, [selectedBranchId, filterDate, filterStatus, filterType]);

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex flex-col gap-1">
             <Header size="3xl">Appointments</Header>
             <p className="text-xs text-gray-400">View scheduled appointments for your branch</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {role === "Admin" && (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Branch</label>
                <span className="p-1 text-sm font-semibold text-gray-700 whitespace-nowrap">
                  {allBranches.find((b) => b._id === selectedBranchId)?.name || 'Loading...'}
                </span>
                </div>
            )}
            
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
              <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              >
                  <option value="">All</option>
                  <option value="1">Upcoming</option>
                  <option value="2">Past</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
              <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-1 text-sm font-semibold text-gray-700 focus:outline-none bg-transparent"
              >
                  <option value="">All</option>
                  <option value="1">Online</option>
                  <option value="2">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        ) : appointments.length > 0 ? (
          <div className="bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-gray-100">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-blue-50/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Scheduled Appointments</h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium italic">List of upcoming user bookings</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-2xl text-blue-700">
                        <MdCalendarToday size={24} />
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-gray-400 uppercase text-[10px] font-black tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Date & Day</th>
                    <th className="px-8 py-5 text-center">Time Slot</th>
                    <th className="px-8 py-5 text-center">User / Type</th>
                    <th className="px-8 py-5 text-right whitespace-nowrap">Creation Date</th>
                    <th className="px-8 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {appointments.map((item, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/10 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-700 text-lg">{item.date}</span>
                              <span className="text-xs text-gray-400 font-medium">{daysMap[item.day] || `Day ${item.day}`}</span>
                            </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-2">
                            <MdAccessTime className="text-gray-400" />
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200">
                                {item.startTime}
                            </span>
                            <div className="w-4 h-0.5 bg-gray-200 rounded-full"></div>
                            <span className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-500 border border-gray-200">
                                {item.endTime}
                            </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center justify-center gap-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1 mt-1">User</span>
                                <div className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100">
                                    <MdOutlinePersonOutline size={14} />
                                    <span className="truncate max-w-[150px]">{item.userId?.name} {item.userId?.surname}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase font-bold text-gray-300 tracking-tighter mb-1 mt-1">Type</span>
                                <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-100">
                                    <MdOutlineCategory size={14} />
                                    <span>{item.type === 1 ? "Online" : item.type === 2 ? "Offline" : item.type}</span>
                                </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                         <span className="text-xs font-medium text-gray-300 italic">
                             {new Date(item.createdAt).toLocaleDateString()}
                         </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                          <button 
                            onClick={() => openDeleteModal(item._id)}
                            className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                            title="Delete Appointment"
                          >
                              <MdDelete size={20} />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-2xl rounded-[3rem] p-16 text-center border border-gray-100 flex flex-col items-center max-w-2xl mx-auto mt-10">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-8 animate-pulse">
                <MdCalendarToday size={48} />
            </div>
            <h3 className="text-3xl font-black text-gray-900 tracking-tight mb-4">No Appointments Found</h3>
            <p className="text-gray-500 mb-10 max-w-sm text-lg leading-relaxed font-medium">It looks like there are no scheduled appointments for this branch right now.</p>
          </div>
        )}
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-black text-gray-900 mb-2">Delete Appointment</h3>
            <p className="text-gray-500 font-medium mb-6">Are you sure you want to delete this appointment? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setAppointmentToDelete(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
};

export default AppointmentPage;
