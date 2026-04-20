"use client";
import React, { useState } from "react";
import { X, Calendar, Clock, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { addStaffLeave, deleteStaffLeave } from "@/Api/AllApi";

const StaffLeaveModal = ({ isOpen, onClose, staff, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [currentLeaves, setCurrentLeaves] = useState([]);
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  React.useEffect(() => {
    if (staff?.leaves) {
      setCurrentLeaves(staff.leaves);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updatedLeaves = await addStaffLeave({
        staffId: staff._id,
        ...formData,
      });
      toast.success("Leave added successfully");
      setCurrentLeaves(updatedLeaves);
      setFormData({
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        reason: "",
      });
      onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add leave");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leaveId) => {
    try {
      setLoading(true);
      const updatedLeaves = await deleteStaffLeave(staff._id, leaveId);
      toast.success("Leave deleted");
      setCurrentLeaves(updatedLeaves);
      onUpdate();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">Manage Leaves</h2>
            <p className="text-gray-500 text-sm font-medium">Staff: <span className="text-teal-600 font-bold">{staff.name}</span></p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Leave Form */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
               <Calendar size={20} className="text-teal-600" />
               Add New Leave
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1 text-[8px]">Start Time (Optional)</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1 text-[8px]">End Time (Optional)</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Reason</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Vacation, Sick leave, etc."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-teal-500 outline-none font-bold text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Processing..." : "Add Leave Entry"}
              </button>
            </form>
          </div>

          {/* Current Leaves List */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
               <Clock size={20} className="text-amber-600" />
               Current/Upcoming Leaves
            </h3>
            <div className="space-y-3">
              {currentLeaves?.length > 0 ? (
                currentLeaves.map((leave) => (
                  <div key={leave._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="text-sm font-black text-gray-800 tracking-tight">
                          {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                        {leave.startTime && (
                          <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">
                            {leave.startTime} to {leave.endTime}
                          </div>
                        )}
                        {leave.reason && (
                          <div className="text-xs text-gray-500 font-medium">Reason: {leave.reason}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(leave._id)}
                        className="p-2 text-red-100 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                  <p className="text-gray-400 font-bold text-sm">No leaves scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLeaveModal;
