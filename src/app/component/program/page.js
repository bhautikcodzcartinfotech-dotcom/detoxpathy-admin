"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import {
  getAllPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} from "@/Api/AllApi";
import ProgramForm from "./programForm";
import ProgramTable from "./programTable";

const ProgramPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllPrograms();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load programs");
      toast.error(e?.response?.data?.message || "Failed to load programs");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubmit = async (payload) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateProgram(editing._id, payload);
        toast.success("Program updated successfully!");
      } else {
        await createProgram(payload);
        toast.success("Program created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save program");
      toast.error(err?.response?.data?.message || "Failed to save program");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await deleteProgram(deleteId);
      toast.success("Program deleted successfully!");
      setIsDeleting(false);
      setDeleteId(null);
      await fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete program");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-18">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl">Programs</Header>
          <Button onClick={() => setIsOpen(true)}>Create Program</Button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <ProgramTable
          items={items}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => {
            setIsOpen(false);
            setEditing(null);
        }}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Program" : "Create Program"}
            </h2>
          </div>
          <ProgramForm
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsOpen(false);
              setEditing(null);
            }}
            loading={loading}
            initialValues={editing}
            submitLabel={editing ? "Update" : "Create"}
          />
        </Drawer>

        <ConfirmationDialog
          isOpen={isDeleting}
          onClose={() => {
            setIsDeleting(false);
            setDeleteId(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Program"
          message="Are you sure you want to delete this program? This action cannot be undone."
          confirmText="Delete"
          type="danger"
        />
      </div>
    </RoleGuard>
  );
};

export default ProgramPage;
