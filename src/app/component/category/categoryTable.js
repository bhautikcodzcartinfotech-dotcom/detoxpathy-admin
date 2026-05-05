"use client";
import React, { useState } from "react";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import { ActionButton } from "@/utils/actionbutton";
import ConfirmationDialog from "@/components/ConfirmationDialog";

import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

const CategoryTable = ({ items, loading, onEdit, onDelete, onReorder }) => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null,
    itemName: null,
  });

  const testimonialCategories = items?.filter((c) => c.type === 1) || [];
  const sessionCategories = items?.filter((c) => c.type === 2) || [];

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

  const renderTable = (data, title) => (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
        <h2 className="text-sm font-black text-[#134D41] uppercase tracking-[0.2em]">{title}</h2>
      </div>

      {data.length === 0 ? (
        <NotFoundCard
          title={`No ${title}`}
          subtitle="Create one to get started."
        />
      ) : (
        <div className="overflow-x-auto shadow-md rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-yellow-400 to-amber-300">
                <th className="px-8 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-8 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <Reorder.Group
              as="tbody"
              axis="y"
              values={data}
              onReorder={(newOrder) => onReorder(newOrder, data[0]?.type)}
              className="divide-y divide-gray-50"
            >
              {data.map((c) => (
                <Reorder.Item
                  as="tr"
                  key={c._id}
                  value={c}
                  className="hover:bg-teal-50/30 bg-white transition-colors duration-200"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-teal-600 transition-colors">
                        <GripVertical size={18} />
                      </div>
                      <span className="font-bold text-gray-800 tracking-tight text-[15px]">
                        {c.categoryTitle}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <ActionButton type="edit" onClick={() => onEdit(c)} />
                      <ActionButton
                        type="delete"
                        onClick={() =>
                          handleDeleteClick(c._id, c.categoryTitle)
                        }
                      />
                    </div>
                  </td>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <>
      {renderTable(testimonialCategories, "Testimonial Categories")}
      {renderTable(sessionCategories, "Session Categories")}

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default CategoryTable;
