"use client";
import React, { useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const UserRequestTable = ({ items, loading, onAction }) => {
  const [actionDialog, setActionDialog] = useState(null);
  const [adminComment, setAdminComment] = useState("");

  const renderStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
    }
  };

  const handleOpenActionDialog = (item, action) => {
    setActionDialog({ item, action });
    setAdminComment("");
  };

  const handleConfirmAction = async () => {
    await onAction(actionDialog.item._id, actionDialog.action, adminComment);
    setActionDialog(null);
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#134D41]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Old Number</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">New Number</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                  No user requests found
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.userId?.name || "N/A"}</div>
                    <div className="text-xs text-gray-500">{item.userId?.patientId || ""}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.oldMobilePrefix} {item.oldMobileNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.newMobilePrefix} {item.newMobileNumber}
                  </td>
                  <td className="px-6 py-4">
                    {renderStatusBadge(item.status)}
                    {item.adminComment && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        Comment: {item.adminComment}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {item.status === "Pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenActionDialog(item, "approve")}
                          className="text-xs font-semibold text-green-700 hover:text-green-900 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenActionDialog(item, "reject")}
                          className="text-xs font-semibold text-red-700 hover:text-red-900 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {actionDialog && (
        <ConfirmationDialog
          isOpen={true}
          title={`${actionDialog.action === "approve" ? "Approve" : "Reject"} Request?`}
          message={`Are you sure you want to ${actionDialog.action} the mobile number change request from ${actionDialog.item.userId?.name || "this user"}?`}
          onConfirm={handleConfirmAction}
          onCancel={() => setActionDialog(null)}
          confirmText={actionDialog.action === "approve" ? "Approve" : "Reject"}
          cancelText="Cancel"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment (Optional)
            </label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#134D41] focus:border-transparent"
              placeholder="Add a comment..."
            />
          </div>
        </ConfirmationDialog>
      )}
    </div>
  );
};

export default UserRequestTable;
