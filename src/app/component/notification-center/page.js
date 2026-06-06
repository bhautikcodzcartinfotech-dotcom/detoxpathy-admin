"use client";
import React, { useState, useEffect } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import TimeButton from "@/utils/timebutton";
import { ActionButton } from "@/utils/actionbutton";
import Loader from "@/utils/loader";
import toast from "react-hot-toast";
import { getNotificationTemplates, updateNotificationTemplate } from "@/Api/AllApi";

const DEFAULTS = [
  { _id: "1", icon: "💧", title: "Water Reminder 💧", message: "Stay hydrated! Remember to drink a glass of water now to stay healthy and refreshed.", trigger: "Every hour (Cron Job)" },
  { _id: "2", icon: "😴", title: "Time to Sleep 😴", message: "It's Time to wind down, unplug from screens, and get some restful sleep to support your body's healing.", trigger: "Daily at 10:00 PM (Cron Job)" },
  { _id: "3", icon: "📅", title: "Appointment Reminder 📅", message: "This is a friendly reminder that you have an appointment scheduled for tomorrow.", trigger: "24 hours before appointment" },
  { _id: "4", icon: "📅", title: "Upcoming Appointment 📅", message: "Your upcoming appointment is scheduled to start in 20 minutes. Please get ready!", trigger: "20 minutes before appointment" },
  { _id: "5", icon: "💬", title: "Support Chat Message", message: "You have a new message from support.", trigger: "When admin sends chat message" },
];

const NotificationCenterPage = () => {
  const [templates, setTemplates] = useState(DEFAULTS);
  const [listLoading, setListLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      setListLoading(true);
      const data = await getNotificationTemplates();
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      }
    } catch {
      // silently fall back to defaults already set in state
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleEdit = (t) => {
    setEditing(t);
    setForm({ title: t.title, message: t.message });
    setIsOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    try {
      setLoading(true);
      // Update local state immediately
      setTemplates((prev) =>
        prev.map((t) => (t._id === editing._id ? { ...t, title: form.title, message: form.message } : t))
      );
      // Try saving to DB if it has a real MongoDB ID
      if (editing._id && editing._id.length > 5) {
        await updateNotificationTemplate(editing._id, { title: form.title, message: form.message });
      }
      toast.success("Notification template saved!");
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allow={["Admin"]}>
      <div className="w-full h-full px-6 py-4">
        <div className="flex items-center justify-between mb-4 px-8">
          <Header size="3xl">Notification Center</Header>
        </div>

        <div className="px-8">
          {listLoading ? (
            <div className="flex justify-center items-center py-20"><Loader /></div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                  <tr className="text-[11px] font-black text-gray-700 uppercase tracking-widest">
                    <th className="px-6 py-4 text-left">Title</th>
                    <th className="px-6 py-4 text-left">Message</th>
                    <th className="px-6 py-4 text-left">Trigger</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((t) => (
                    <tr key={t._id} className="hover:bg-yellow-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">{t.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">{t.message}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{t.trigger}</td>
                      <td className="px-6 py-4 text-center">
                        <ActionButton type="edit" onClick={() => handleEdit(t)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Drawer isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">Edit Notification</h2>
            <p className="text-gray-400 text-sm mt-1">Changes will be saved to DB only</p>
          </div>
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                placeholder="Notification title"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                rows={4}
                className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition resize-none"
                placeholder="Notification message"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setIsOpen(false); setEditing(null); }} type="button">Cancel</Button>
              <TimeButton loading={loading}>Save</TimeButton>
            </div>
          </form>
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default NotificationCenterPage;
