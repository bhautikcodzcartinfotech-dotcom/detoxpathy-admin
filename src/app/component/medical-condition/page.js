"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllMedicalConditions,
  addMedicalCondition,
  updateMedicalCondition,
  deleteMedicalCondition,
} from "@/Api/AllApi";
import MedicalConditionForm from "./MedicalConditionForm";
import MedicalConditionTable from "./MedicalConditionTable";

const MedicalConditionPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await getAllMedicalConditions();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load Medical Conditions");
      toast.error(e?.response?.data?.message || "Failed to load Medical Conditions");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateMedicalCondition(editing._id, formData);
        toast.success("Medical Condition updated successfully!");
      } else {
        await addMedicalCondition(formData);
        toast.success("Medical Condition created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save Medical Condition");
      toast.error(err?.response?.data?.message || "Failed to save Medical Condition");
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
      await deleteMedicalCondition(id);
      await fetchList();
      toast.success("Medical Condition deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete Medical Condition");
      toast.error(err?.response?.data?.message || "Failed to delete Medical Condition");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <Header size="3xl"> Medical Conditions</Header>
          <Button onClick={() => setIsOpen(true)}>Create</Button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <MedicalConditionTable
          items={items}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Medical Condition" : "Create Medical Condition"}
            </h2>
          </div>
          <MedicalConditionForm
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
      </div>
    </RoleGuard>
  );
};

export default MedicalConditionPage;
