"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const ContactCategoryTable = ({ items, loading, onEdit, onDelete }) => {
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
    handleDeleteCancel();
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({
      isOpen: false,
      itemId: null,
      itemName: null,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mb-6">
      {items.length === 0 ? (
        <NotFoundCard
          title="No Contact Categories"
          subtitle="Create one to get started."
        />
      ) : (
        <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
              <tr className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                <th className="px-6 py-4 text-left">
                  Name
                </th>
                <th className="px-6 py-4 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-yellow-50 bg-white">
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {c.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <ActionButton type="edit" onClick={() => onEdit(c)} />
                      <ActionButton
                        type="delete"
                        onClick={() =>
                          handleDeleteClick(c._id, c.name)
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact Category"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default ContactCategoryTable;
