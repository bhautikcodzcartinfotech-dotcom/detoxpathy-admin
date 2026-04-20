"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/Api/AllApi";
import { useAuth } from "@/contexts/AuthContext";
import { ActionButton } from "@/utils/actionbutton";
import NotFoundCard from "@/components/NotFoundCard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import toast from "react-hot-toast";
import { FiLogIn, FiChevronDown, FiChevronUp, FiCalendar } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LeaveManagementModal from "./LeaveManagementModal";

const SubAdminList = ({ subAdmins, onEdit, onDelete, onUpdate, loading = false }) => {
  const router = useRouter();
  const { impersonate } = useAuth();
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });
  const [loginLoading, setLoginLoading] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [leaveModal, setLeaveModal] = useState({
    isOpen: false,
    doctor: null,
  });

  const toggleRow = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const doctors = subAdmins.filter((sa) => sa.adminType === "Sub Admin");
  const allSubDoctors = subAdmins.filter((sa) => sa.adminType === "Sub Doctor");

  const getSubDoctorsForDoctor = (doctor) => {
    const doctorBranchIds = (doctor.branch || []).map((b) => b._id || b);
    return allSubDoctors.filter((sd) => {
      const sdBranchIds = (sd.branch || []).map((b) => b._id || b);
      return sdBranchIds.some((id) => doctorBranchIds.includes(id));
    });
  };

  const handleDeleteClick = (itemId, itemName) => {
    setDeleteDialog({
      isOpen: true,
      itemId,
      itemName,
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.itemId) {
      onDelete(deleteDialog.itemId);
    }
    setDeleteDialog({
      isOpen: false,
      itemId: null,
      itemName: null,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      itemId: null,
      itemName: null,
    });
  };

  const handleLoginAsSubAdmin = async (subAdmin) => {
    try {
      setLoginLoading(subAdmin._id);
      
      const email = subAdmin.email;
      const password = subAdmin.originalPassword || subAdmin.password;

      if (!email || !password) {
        throw new Error("Subadmin email/password not available");
      }

      const result = await impersonate(email, password);
      if (result?.success) {
        toast.success(`Logged in as ${subAdmin.username}`);
        router.push("/dashboard");
      } else {
        throw new Error(result?.error || "Login failed");
      }
    } catch (error) {
      console.error("Subadmin direct login error:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to login as subadmin");
    } finally {
      setLoginLoading(null);
    }
  };

  const openLeaveModal = (doctor) => {
    setLeaveModal({
      isOpen: true,
      doctor,
    });
  };

  if (loading) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard loading title="Loading" subtitle="Fetching sub admins..." />
      </div>
    );
  }

  if (!subAdmins || subAdmins.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard title="No Sub Admins" subtitle="Create a sub admin to get started." />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Image</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Branches</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Commission (%)</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.length > 0 ? (
              doctors.map((sa) => {
                const matchedSubDoctors = getSubDoctorsForDoctor(sa);
                const isExpanded = expandedRows.has(sa._id);

                return (
                  <React.Fragment key={sa._id}>
                    <tr className="hover:bg-yellow-50 transition-all duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sa.image ? (
                          <img src={`${API_BASE}/${sa.image}`} alt="avatar" className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800 uppercase text-xs">{sa.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">{sa.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                        {Array.isArray(sa.branch) && sa.branch.length ? sa.branch.map((b) => b.name).join(", ") : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-medium">
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">DOCTOR</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">{sa.commission ?? 0}%</td>
                      <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                        <ActionButton type="edit" onClick={() => onEdit(sa)} />
                        <ActionButton type="delete" onClick={() => handleDeleteClick(sa._id, sa.username || "Sub Admin")} />
                        <button
                          onClick={() => handleLoginAsSubAdmin(sa)}
                          disabled={loginLoading === sa._id}
                          className="bg-gradient-to-tr from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          title="Login as this subadmin"
                        >
                          {loginLoading === sa._id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FiLogIn size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => openLeaveModal(sa)}
                          className="bg-gradient-to-tr from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-1"
                          title="Manage Leaves"
                        >
                          <FiCalendar size={20} />
                        </button>
                        {matchedSubDoctors.length > 0 && (
                          <button
                            onClick={() => toggleRow(sa._id)}
                            className="bg-gray-100 hover:bg-yellow-200 text-yellow-700 rounded-full w-10 h-10 inline-flex items-center justify-center shadow-md transition-all duration-300"
                            title={isExpanded ? "Collapse sub doctors" : "View sub doctors"}
                          >
                            {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                          </button>
                        )}
                      </td>
                    </tr>

                    <AnimatePresence initial={false}>
                      {isExpanded && matchedSubDoctors.length > 0 && (
                        <tr className="border-l-4 border-yellow-400 overflow-hidden">
                          <td colSpan={7} className="p-0 border-none">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden bg-gray-100/50"
                            >
                              <table className="min-w-full divide-y divide-gray-200">
                                <tbody>
                                  {matchedSubDoctors.map((sd) => (
                                    <tr key={sd._id} className="hover:bg-gray-200/50 transition-all duration-200">
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {sd.image ? (
                                          <img src={`${API_BASE}/${sd.image}`} alt="avatar" className="w-9 h-9 rounded-full object-cover border" />
                                        ) : (
                                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                                            {sd.username?.charAt(0)}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-700 uppercase text-xs">{sd.username}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{sd.email}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                                        {Array.isArray(sd.branch) && sd.branch.length ? sd.branch.map((b) => b.name).join(", ") : "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 italic text-[10px] font-semibold">SUB DOCTOR</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{sd.commission ?? 0}%</td>
                                      <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                                        <ActionButton type="edit" onClick={() => onEdit(sd)} />
                                        <ActionButton type="delete" onClick={() => handleDeleteClick(sd._id, sd.username || "Sub Doctor")} />
                                        <button
                                          onClick={() => handleLoginAsSubAdmin(sd)}
                                          disabled={loginLoading === sd._id}
                                          className="bg-gradient-to-tr from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                          title="Login as this sub doctor"
                                        >
                                          {loginLoading === sd._id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          ) : (
                                            <FiLogIn size={20} />
                                          )}
                                        </button>
                                        <button
                                          onClick={() => openLeaveModal(sd)}
                                          className="bg-gradient-to-tr from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-full w-10 h-10 inline-flex items-center justify-center shadow-lg hover:shadow-xl transition-transform duration-300 transform hover:-translate-y-1"
                                          title="Manage Leaves"
                                        >
                                          <FiCalendar size={20} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500 text-sm">No Doctors Found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Sub Admin"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <LeaveManagementModal
        isOpen={leaveModal.isOpen}
        onClose={() => setLeaveModal({ isOpen: false, doctor: null })}
        doctor={leaveModal.doctor}
        onUpdate={onUpdate}
      />
    </>
  );
};

export default SubAdminList;
