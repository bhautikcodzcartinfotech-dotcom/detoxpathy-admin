"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Note: this was likely framer-motion in the previous tool call, I'll fix that if it was a typo, but wait, the previous code had framer-motion.
import { FiX, FiCalendar, FiPlus, FiTrash2, FiClock, FiToggleLeft, FiToggleRight } from "react-icons/fi";
import { addDoctorLeave, deleteDoctorLeave } from "@/Api/AllApi";
import toast from "react-hot-toast";

const LeaveManagementModal = ({ isOpen, onClose, doctor, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState("full"); // "full" or "hourly"
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  if (!isOpen || !doctor) return null;

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (leaveType === "hourly" && (!formData.startTime || !formData.endTime)) {
      toast.error("Please select start and end times for hourly leave");
      return;
    }

    try {
      setLoading(true);
      
      // Prepare payload: convert HTML time (HH:mm) to AM/PM format if needed, 
      // but the backend's convertTimeToMinutes handles standard strings. 
      // I'll format them to "HH:mm AM/PM" to be safe.
      const formatTime = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${minutes} ${ampm}`;
      };

      const payload = {
        ...formData,
        startTime: leaveType === "hourly" ? formatTime(formData.startTime) : null,
        endTime: leaveType === "hourly" ? formatTime(formData.endTime) : null,
      };

      await addDoctorLeave(doctor._id, payload);
      toast.success("Leave added successfully");
      setFormData({ startDate: "", endDate: "", startTime: "", endTime: "", reason: "" });
      setLeaveType("full");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add leave");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    try {
      setLoading(true);
      await deleteDoctorLeave(doctor._id, leaveId);
      toast.success("Leave removed successfully");
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to remove leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-6 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FiCalendar className="text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Manage Leaves</h3>
                <p className="text-yellow-50/80 text-sm">Doctor: {doctor.username}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <FiX className="text-2xl" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[80vh] overflow-y-auto">
            {/* Add Leave Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <FiPlus className="text-yellow-500" /> Add New Leave
                </h4>
                <button 
                  onClick={() => setLeaveType(leaveType === "full" ? "hourly" : "full")}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                    leaveType === "hourly" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {leaveType === "hourly" ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                  {leaveType === "hourly" ? "HOURLY" : "FULL DAY"}
                </button>
              </div>

              <form onSubmit={handleAddLeave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                {leaveType === "hourly" && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100"
                  >
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
                      <input
                        type="time"
                        required={leaveType === "hourly"}
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
                      <input
                        type="time"
                        required={leaveType === "hourly"}
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm"
                      />
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason (Optional)</label>
                   <input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-sm"
                    placeholder="E.g. Sick leave, Personal..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Leave Entry"}
                </button>
              </form>
            </div>

            {/* Leave History */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <FiClock className="text-yellow-500" /> Leave History
              </h4>
              <div className="space-y-3">
                {doctor.leaves && doctor.leaves.length > 0 ? (
                  doctor.leaves.map((leave, index) => (
                    <motion.div
                      layout
                      key={leave._id || index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group relative"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                             <div className={`p-1 rounded ${leave.startTime ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"}`}>
                                <FiCalendar size={12} />
                             </div>
                             <p className="text-sm font-bold text-gray-700">
                               {leave.startDate} {leave.startDate !== leave.endDate ? `to ${leave.endDate}` : ""}
                             </p>
                          </div>
                          
                          {leave.startTime && (
                            <div className="flex items-center gap-2 mt-1 text-[10px] bg-white border border-blue-50 w-fit px-2 py-0.5 rounded-full text-blue-600">
                               <FiClock size={10} />
                               <span>{leave.startTime} - {leave.endTime}</span>
                            </div>
                          )}

                          {leave.reason && (
                            <p className="text-xs text-gray-500 mt-2 italic">"{leave.reason}"</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLeave(leave._id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Delete"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400">No leaves recorded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LeaveManagementModal;
