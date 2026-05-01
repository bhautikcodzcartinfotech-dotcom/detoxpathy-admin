import React, { useState, useEffect, useRef } from "react";
import { FiX, FiCalendar, FiClock, FiUser, FiMapPin, FiCheckCircle } from "react-icons/fi";
import { toast } from "react-hot-toast";
import {
  getAppointmentsByBranch,
  generateSlots,
  requestTransferAppointment,
  listSubAdmins,
} from "../../../Api/AllApi";

export default function TransferAppointmentModal({ isOpen, onClose, selectedUser, allBranches }) {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [requestSent, setRequestSent] = useState(false);

  // Transfer Form State
  const [transferBranchId, setTransferBranchId] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Track whether modal was previously open to detect open event (avoid re-init on every render)
  const wasOpenRef = useRef(false);
  const userIdRef = useRef(null);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    const userChanged = isOpen && selectedUser?.id !== userIdRef.current;

    if (justOpened || userChanged) {
      wasOpenRef.current = true;
      userIdRef.current = selectedUser?.id || null;
      setRequestSent(false);
      setSelectedAppointment(null);
      setTransferBranchId("");
      setTransferDate("");
      setSlots([]);
      setSelectedSlot(null);
      setDoctors([]);
      setSelectedDoctorId("");
      if (selectedUser) fetchUserAppointments(selectedUser.id);
    }

    if (!isOpen) {
      wasOpenRef.current = false;
    }
  }, [isOpen, selectedUser?.id]);

  const fetchUserAppointments = async (userId) => {
    const id = userId || selectedUser?.id;
    if (!id) return;
    try {
      setLoading(true);
      const data = await getAppointmentsByBranch("all", { userId: id, status: 1 });
      setAppointments(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load user appointments");
    } finally {
      setLoading(false);
    }
  };

  // Fetch slots when branch + date change
  useEffect(() => {
    if (transferBranchId && transferDate && selectedAppointment) {
      const fetch = async () => {
        try {
          setLoadingSlots(true);
          setSlots([]);
          setSelectedSlot(null);
          const slotsData = await generateSlots(transferBranchId, transferDate);
          setSlots(slotsData.slots || []);
        } catch (error) {
          console.error(error);
          toast.error("Failed to load available slots");
        } finally {
          setLoadingSlots(false);
        }
      };
      fetch();
    }
  }, [transferBranchId, transferDate]);

  // Fetch doctors when branch changes
  useEffect(() => {
    if (transferBranchId) {
      const fetch = async () => {
        try {
          setLoadingDoctors(true);
          setDoctors([]);
          setSelectedDoctorId("");
          const allDocs = await listSubAdmins();
          const branchDocs = (allDocs || []).filter(d =>
            d.branch && d.branch.some(b => (b._id || b).toString() === transferBranchId)
          );
          setDoctors(branchDocs);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDoctors(false);
        }
      };
      fetch();
    } else {
      setDoctors([]);
      setSelectedDoctorId("");
    }
  }, [transferBranchId]);

  const parseDateToDay = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    return jsDay === 0 ? "7" : String(jsDay);
  };

  const handleSendRequest = async () => {
    if (!selectedAppointment) return;
    if (!transferBranchId) return toast.error("Please select a branch");
    if (!transferDate) return toast.error("Please select a date");
    if (!selectedSlot) return toast.error("Please select a time slot");
    if (!selectedDoctorId) return toast.error("Please select a doctor to send the request to");

    try {
      setTransferring(true);
      const payload = {
        branchId: transferBranchId,
        date: transferDate,
        day: parseDateToDay(transferDate),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        doctorId: selectedDoctorId,
      };

      await requestTransferAppointment(selectedAppointment._id, payload);
      setRequestSent(true);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to send transfer request");
    } finally {
      setTransferring(false);
    }
  };

  const handleClose = () => {
    setSelectedAppointment(null);
    setTransferBranchId("");
    setTransferDate("");
    setSlots([]);
    setSelectedSlot(null);
    setDoctors([]);
    setSelectedDoctorId("");
    setRequestSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800">Transfer Appointment</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">

          {/* Step 1: List appointments */}
          {!selectedAppointment && !requestSent && (
            <>
              <h3 className="font-semibold text-gray-700 mb-4">
                Upcoming Appointments for <span className="text-yellow-600">{selectedUser?.name}</span>
              </h3>
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((apt) => {
                    const hasPending = apt.transferRequest?.status === "pending";
                    return (
                      <div key={apt._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-gray-800 font-medium mb-1">
                              <FiCalendar className="text-yellow-600" />
                              <span>{apt.date}</span>
                              <FiClock className="text-yellow-600 ml-2" />
                              <span>{apt.startTime} - {apt.endTime}</span>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-4">
                              <span className="flex items-center gap-1"><FiMapPin /> {apt.branchId?.name || "Branch"}</span>
                              <span className="flex items-center gap-1"><FiUser /> {apt.doctor?.username || "Unassigned"}</span>
                            </div>
                            {hasPending && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
                                  ⏳ Transfer request pending
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setTransferBranchId(apt.branchId?._id || apt.branchId || "");
                              setTransferDate(apt.date);
                            }}
                            disabled={hasPending}
                            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Transfer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  No upcoming appointments found for this user.
                </div>
              )}
            </>
          )}

          {/* Step 2: Select new branch/date/slot/doctor */}
          {selectedAppointment && !requestSent && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800">Send Transfer Request</h3>
                <button onClick={() => setSelectedAppointment(null)} className="text-sm text-blue-600 hover:underline">
                  ← Back to List
                </button>
              </div>

              {/* Current appointment info */}
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <p className="text-sm text-blue-800">
                  <strong>Current:</strong> {selectedAppointment.date} · {selectedAppointment.startTime} – {selectedAppointment.endTime}
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  <strong>Doctor:</strong> {selectedAppointment.doctor?.username || "Unassigned"}
                </p>
                <p className="text-xs text-blue-600 mt-2 italic">
                  A transfer request will be sent to the selected doctor. The appointment will only be reassigned after they accept.
                </p>
              </div>

              {/* Branch & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Branch</label>
                  <select
                    value={transferBranchId}
                    onChange={(e) => { setTransferBranchId(e.target.value); setSelectedSlot(null); setSlots([]); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    <option value="">Select Branch</option>
                    {allBranches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Date</label>
                  <input
                    type="date"
                    value={transferDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => { setTransferDate(e.target.value); setSelectedSlot(null); setSlots([]); }}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Time Slots</label>
                {loadingSlots ? (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    Loading slots...
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-36 overflow-y-auto pr-2">
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2 text-sm rounded-lg border transition-all ${
                          selectedSlot === slot
                            ? "bg-yellow-400 border-yellow-500 text-black font-semibold shadow-md"
                            : "bg-white border-gray-200 text-gray-700 hover:border-yellow-400 hover:bg-yellow-50"
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                ) : transferBranchId && transferDate ? (
                  <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                    No available slots for the selected date/branch.
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Select a branch and date to see available slots.</p>
                )}
              </div>

              {/* Doctor Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Doctor <span className="text-red-500">*</span>
                </label>
                {loadingDoctors ? (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    Loading doctors...
                  </div>
                ) : doctors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {doctors.map((d) => (
                      <button
                        key={d._id}
                        onClick={() => setSelectedDoctorId(d._id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selectedDoctorId === d._id
                            ? "bg-yellow-50 border-yellow-400 shadow-md"
                            : "bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/50"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-amber-300 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {d.username?.[0]?.toUpperCase() || "D"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 text-sm truncate">{d.username}</p>
                          <p className="text-xs text-gray-500 truncate">{d.adminType === "Sub Admin" ? "Doctor" : "Sub Doctor"}</p>
                        </div>
                        {selectedDoctorId === d._id && (
                          <FiCheckCircle className="text-yellow-500 flex-shrink-0" size={18} />
                        )}
                      </button>
                    ))}
                  </div>
                ) : transferBranchId ? (
                  <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                    No doctors found in this branch.
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">Select a branch to see doctors.</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  The selected doctor will receive a transfer request. The appointment moves only after they accept.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={transferring || !transferBranchId || !transferDate || !selectedSlot || !selectedDoctorId}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-semibold hover:from-yellow-500 hover:to-amber-500 disabled:opacity-50 transition-all shadow-md"
                >
                  {transferring ? "Sending Request..." : "Send Transfer Request"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success screen */}
          {requestSent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                <FiCheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Transfer Request Sent!</h3>
              <p className="text-gray-500 mb-6 max-w-sm">
                The doctor has been notified. The appointment will be reassigned once they accept the request.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setRequestSent(false); fetchUserAppointments(); }}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Transfer Another
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-black font-semibold hover:from-yellow-500 hover:to-amber-500 transition-all shadow-md"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
