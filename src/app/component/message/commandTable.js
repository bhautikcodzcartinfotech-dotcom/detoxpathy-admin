"use client";

import { useState } from "react";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { API_BASE, API_HOST } from "@/Api/AllApi";

const resolveAudioUrl = (input) => {
  if (!input) return input;
  if (typeof input === "object") {
    const candidate =
      input.url ||
      input.path ||
      input.fileUrl ||
      input.Location ||
      (input.data && (input.data.url || input.data.path)) ||
      null;
    if (candidate) input = candidate;
  }
  let url = String(input).trim().replace(/\\/g, "/");
  if (/^https?:\/\//i.test(url)) return url;

  if (/^\/?api\/v1\/uploads\//i.test(url)) {
    const rel = url.startsWith("/") ? url : `/${url}`;
    return `${API_HOST}${rel}`;
  }

  const uploadsIdx = url.toLowerCase().indexOf("/uploads/");
  if (uploadsIdx !== -1) {
    const relFromUploads = url.slice(uploadsIdx);
    return `${API_BASE.replace(/\/$/, "")}${relFromUploads}`;
  }

  if (/^uploads\//i.test(url)) {
    return `${API_BASE.replace(/\/$/, "")}/${url}`;
  }

  const lastSlash = url.lastIndexOf("/");
  const fileOnly = lastSlash !== -1 ? url.slice(lastSlash + 1) : url;
  return `${API_BASE.replace(/\/$/, "")}/uploads/${fileOnly}`;
};

import NotFoundCard from "@/components/NotFoundCard";

const CommandTable = ({
  commands,
  onEdit,
  onDelete,
  onApprove,
  currentRole,
  currentAdminId,
}) => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });

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
  if (!commands || commands.length === 0) {
    return (
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <NotFoundCard
          title="No Commands"
          subtitle="Create a command to get started."
        />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
            <tr className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
              <th className="px-6 py-4 text-left">
                Title
              </th>
              <th className="px-6 py-4 text-left">
                Type
              </th>
              <th className="px-6 py-4 text-left">
                Description / Audio
              </th>
              <th className="px-6 py-4 text-left">
                Status
              </th>
              <th className="px-6 py-4 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {commands.map((cmd) => {
              const isOwner = String(cmd.createdBy) === String(currentAdminId);
              const canModify = currentRole !== "subadmin" || isOwner;
              return (
                <tr
                  key={cmd._id}
                  className="hover:bg-yellow-50 transition-all duration-200 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">
                    {cmd.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cmd.type === "text"
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {cmd.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {cmd.type === "text" && (
                      <p className="text-sm">{cmd.description}</p>
                    )}
                    {cmd.type === "audio" && cmd.audioUrl && (
                      <audio controls className="w-full mt-1 rounded-lg  ">
                        <source
                          src={resolveAudioUrl(cmd.audioUrl)}
                          type="audio/mpeg"
                        />
                        Your browser does not support audio.
                      </audio>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cmd.isApproved
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-rose-100 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {cmd.isApproved ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center items-center gap-2">
                      {currentRole === "Admin" && !cmd.isApproved && (
                        <ActionButton
                          type="approve"
                          title="Approve"
                          onClick={() => onApprove(cmd._id)}
                        />
                      )}
                      <ActionButton
                        type="edit"
                        title="Edit"
                        disabled={!canModify}
                        onClick={() => canModify && onEdit(cmd)}
                      />
                      <ActionButton
                        type="delete"
                        title="Delete"
                        disabled={!canModify}
                        onClick={() =>
                          canModify &&
                          handleDeleteClick(cmd._id, cmd.title || "Command")
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Command"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default CommandTable;
