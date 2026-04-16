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
        });
      } else {
        const payload = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          branch: formData.branchId ? [formData.branchId] : [],
          image: formData.image || undefined,
          commission: formData.commission,
        };
        await createSubAdminApi(payload);
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create sub admin");
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
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete sub admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-18">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl">Sub Admins</Header>
          <Button onClick={() => setIsOpen(true)}>Create</Button>
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
