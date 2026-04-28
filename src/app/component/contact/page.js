"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getAllContacts,
  createContact,
  updateContact,
  deleteContact,
  getAllContactCategories,
} from "@/Api/AllApi";
import ContactForm from "./contactForm";
import ContactTable from "./contactTable";

const ContactPage = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const fetchData = async () => {
    try {
      setListLoading(true);
      const [contactsData, categoriesData] = await Promise.all([
        getAllContacts(),
        getAllContactCategories(),
      ]);
      setItems(Array.isArray(contactsData) ? contactsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load contacts");
      toast.error(e?.response?.data?.message || "Failed to load contacts");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      await createContact(formData);
      toast.success("Contact added successfully!");
      await fetchData();
      setIsOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save contact");
      toast.error(err?.response?.data?.message || "Failed to save contact");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError("");
      await deleteContact(id);
      await fetchData();
      toast.success("Contact deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete contact");
      toast.error(err?.response?.data?.message || "Failed to delete contact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-18">

        <ContactTable
          items={items}
          loading={listLoading}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              Add Contact
            </h2>
          </div>
          <ContactForm
            onSubmit={handleSubmit}
            onCancel={() => setIsOpen(false)}
            loading={loading}
            categories={categories}
            submitLabel="Add"
          />
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default ContactPage;
