"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} from "@/Api/AllApi";
import FaqForm from "./FaqForm";
import FaqTable from "./FaqTable";

const FaqPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    try {
      setListLoading(true);
      const data = await listFaqs();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load FAQs");
      toast.error(e?.response?.data?.message || "Failed to load FAQs");
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
        await updateFaq(editing._id, formData);
        toast.success("FAQ updated successfully!");
      } else {
        await createFaq(formData);
        toast.success("FAQ created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save FAQ");
      toast.error(err?.response?.data?.message || "Failed to save FAQ");
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
      await deleteFaq(id);
      await fetchList();
      toast.success("FAQ deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete FAQ");
      toast.error(err?.response?.data?.message || "Failed to delete FAQ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-4 px-8">
          <Header size="3xl">Frequently Asked Questions (FAQ)</Header>
          <Button onClick={() => setIsOpen(true)}>Create FAQ</Button>
        </div>

        {error && (
          <div className="mx-8 mb-3 p-3 rounded-lg bg-red-50 text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="px-8">
          <FaqTable
            items={items}
            loading={listLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>

        <Drawer isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update FAQ" : "Create FAQ"}
            </h2>
          </div>
          <FaqForm
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

export default FaqPage;
