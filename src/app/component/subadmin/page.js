"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import {
  createSubAdminApi,
  listSubAdmins,
  updateSubAdminById,
} from "@/Api/AllApi";
import SubAdminForm from "./component/subAdminForm";
import SubAdminList from "./component/subAdminList";
import toast from "react-hot-toast";

const SubAdminPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [subAdmins, setSubAdmins] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await listSubAdmins();
      setSubAdmins(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load sub admins");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCreate = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateSubAdminById(editing._id, {
          username: formData.username,
          email: formData.email,
          password: formData.password || undefined,
          branch: formData.branchId ? [formData.branchId] : undefined,
          image: formData.image || undefined,
          commission: formData.commission,
          role: formData.role,
          permissions: formData.permissions,
        });
      } else {
        const payload = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          branch: formData.branchId ? [formData.branchId] : [],
          image: formData.image || undefined,
          commission: formData.commission,
          role: formData.role,
          permissions: formData.permissions,
        };
        await createSubAdminApi(payload);
      }
      await fetchList();
      toast.success(editing ? "Sub admin updated" : "Sub admin created");
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to process request";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");
      await updateSubAdminById(id, { isDeleted: true });
      await fetchList();
      toast.success("Sub admin deleted");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete sub admin";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <Header size="4xl">Doctors</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Manage branch doctors and administrative access</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            Add New Doctor
          </Button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <SubAdminList
          subAdmins={subAdmins}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdate={fetchList}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Sub Admin" : "Create Sub Admin"}
            </h2>
          </div>
          <SubAdminForm
            onSubmit={handleCreate}
            onCancel={() => {
              setIsOpen(false);
              setEditing(null);
            }}
            loading={loading}
            initialValues={editing}
            submitLabel={editing ? "Update" : "Create"}
          />
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default SubAdminPage;
