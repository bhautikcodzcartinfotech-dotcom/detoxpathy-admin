import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

const AppReferenceTable = ({ items, loading, onEdit, onDelete }) => {
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
    <>
      {items?.length === 0 ? (
        <NotFoundCard
          title="No App References"
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
              {items?.map((item) => (
                <tr key={item._id} className="hover:bg-yellow-50 bg-white transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {item.name}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <ActionButton type="edit" onClick={() => onEdit(item)} />
                      <ActionButton
                        type="delete"
                        onClick={() => handleDeleteClick(item._id, item.name)}
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
        title="Delete App Reference"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default AppReferenceTable;
