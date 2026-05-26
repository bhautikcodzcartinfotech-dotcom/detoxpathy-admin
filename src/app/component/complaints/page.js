"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    getComplaints,
    addComplaint,
    getAllUsers,
    getUsersByBranch,
    deleteComplaint
} from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import { FiTrash2, FiCheck } from "react-icons/fi";
import Dropdown from "@/utils/dropdown";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import RoleGuard from "@/components/RoleGuard";

const NOTE_STATUS_KEY = "detoxpathy_note_statuses";

const loadNoteStatuses = () => {
    if (typeof window === "undefined") return {};
    try {
        return JSON.parse(localStorage.getItem(NOTE_STATUS_KEY) || "{}");
    } catch {
        return {};
    }
};

const saveNoteStatuses = (map) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(NOTE_STATUS_KEY, JSON.stringify(map));
};

const getNoteStatus = (id, statusMap) =>
    statusMap[id] === "completed" ? "completed" : "pending";

export default function NotesPage() {
    const { role, branches } = useAuth();
    const isDoctor = role === "subadmin";
    const isAdmin = role === "Admin";

    const [complaints, setComplaints] = useState([]);
    const [statusMap, setStatusMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    const [userId, setUserId] = useState("");
    const [complaintText, setComplaintText] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [deleteDialog, setDeleteDialog] = useState({
        isOpen: false,
        itemId: null,
        itemName: "",
    });

    const filteredUsers = (usersList || []).filter((u) => {
        if (!u) return false;
        const name = (u.name || "").toLowerCase();
        const mobile = (u.mobileNumber || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || mobile.includes(query);
    });

    useEffect(() => {
        setStatusMap(loadNoteStatuses());
        fetchComplaints();
        if (isDoctor) {
            fetchUsers();
        }
    }, [isDoctor]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await getComplaints();
            setComplaints(data || []);
        } catch (error) {
            toast.error("Failed to fetch notes");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            let userData = [];
            if (isDoctor) {
                const branchIds = Array.isArray(branches) ? branches : [];
                if (branchIds.length > 0) {
                    const chunks = await Promise.all(
                        branchIds.map((id) => getUsersByBranch(id).catch(() => []))
                    );
                    userData = chunks.flat().filter((u) => u && !u.isDeleted);
                } else {
                    const data = await getAllUsers().catch(() => []);
                    userData = Array.isArray(data) ? data : (data?.users || []);
                }
            }
            setUsersList(Array.isArray(userData) ? userData.filter((u) => u && u._id) : []);
        } catch (error) {
            console.error("Failed to fetch users", error);
            setUsersList([]);
        }
    };

    const markAsCompleted = (id) => {
        const next = { ...statusMap, [id]: "completed" };
        setStatusMap(next);
        saveNoteStatuses(next);
        toast.success("Marked as completed");
    };

    const handleDelete = async (id) => {
        try {
            await deleteComplaint(id);
            const next = { ...statusMap };
            delete next[id];
            setStatusMap(next);
            saveNoteStatuses(next);
            toast.success("Note deleted successfully");
            fetchComplaints();
        } catch (error) {
            console.error("Failed to delete note:", error);
            const errMsg = error?.response?.data?.message || error?.message || "Failed to delete note";
            toast.error(`Error: ${errMsg}`);
        }
    };

    const handleAddComplaint = async (e) => {
        e.preventDefault();
        if (!complaintText.trim()) {
            toast.error("Please enter note details");
            return;
        }

        try {
            setSubmitting(true);
            const payload = { complaint: complaintText.trim() };
            if (userId) payload.userId = userId;
            await addComplaint(payload);
            toast.success("Note submitted successfully");
            setUserId("");
            setComplaintText("");
            setSearchQuery("");
            fetchComplaints();
        } catch (error) {
            console.error("NOTE ERROR:", error);
            const errMsg = error?.response?.data?.message || error?.message || "Failed to submit note";
            toast.error(`Error: ${errMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    const complaintsWithStatus = useMemo(
        () =>
            (complaints || []).map((c) => ({
                ...c,
                noteStatus: getNoteStatus(c._id, statusMap),
            })),
        [complaints, statusMap]
    );

    const filteredComplaints = useMemo(() => {
        if (statusFilter === "all") return complaintsWithStatus;
        return complaintsWithStatus.filter((c) => c.noteStatus === statusFilter);
    }, [complaintsWithStatus, statusFilter]);

    const statusFilterOptions = [
        { label: "All Notes", value: "all" },
        { label: "Pending Notes", value: "pending" },
        { label: "Completed Notes", value: "completed" },
    ];

    const handleDeleteClick = (id, userName) => {
        setDeleteDialog({
            isOpen: true,
            itemId: id,
            itemName: userName || "this note",
        });
    };

    const handleDeleteConfirm = async () => {
        if (deleteDialog.itemId) {
            await handleDelete(deleteDialog.itemId);
        }
        setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
    };

    const handleDeleteCancel = () => {
        setDeleteDialog({ isOpen: false, itemId: null, itemName: "" });
    };

    return (
        <RoleGuard allow={["Admin", "subadmin"]} permission="show notes page">
        <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-[#134D41]">Notes</h1>
                <div className="w-full sm:w-64">
                    <Dropdown
                        label="Filter"
                        options={statusFilterOptions}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="All Notes"
                        labelClassName="text-gray-700"
                    />
                </div>
            </div>

            {isDoctor && (
                <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit a New Note</h2>
                    <form onSubmit={handleAddComplaint} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note Details *
                            </label>
                            <textarea
                                value={complaintText}
                                onChange={(e) => setComplaintText(e.target.value)}
                                rows={4}
                                placeholder="Write your note..."
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#134D41] focus:ring-1 focus:ring-[#134D41] outline-none resize-none"
                                required
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select User <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <div
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus-within:border-[#134D41] focus-within:ring-1 focus-within:ring-[#134D41] outline-none bg-white cursor-pointer flex justify-between items-center transition-all"
                            >
                                <input
                                    type="text"
                                    placeholder="Search and select user (optional)..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setUserId("");
                                        setIsDropdownOpen(true);
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen(true);
                                    }}
                                    className="w-full outline-none bg-transparent text-sm text-gray-800 placeholder-gray-400"
                                />
                                <span className="text-gray-400 text-xs ml-2 select-none">
                                    {isDropdownOpen ? "▲" : "▼"}
                                </span>
                            </div>

                            {isDropdownOpen && (
                                <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                            )}

                            {isDropdownOpen && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-50">
                                    {filteredUsers.length === 0 ? (
                                        <div className="px-4 py-3 text-sm text-gray-500 text-center select-none">
                                            No users found
                                        </div>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <div
                                                key={u._id}
                                                onClick={() => {
                                                    setUserId(u._id);
                                                    setSearchQuery(`${u.name || "Unnamed"} (${u.mobileNumber || "No Phone"})`);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center ${userId === u._id ? "bg-[#134D41]/5 text-[#134D41] font-semibold" : ""}`}
                                            >
                                                <span>{u.name || "Unnamed"}</span>
                                                <span className="text-xs text-gray-400">{u.mobileNumber || "No Phone"}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-[#134D41] text-white rounded-lg hover:bg-[#134D41]/90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? "Submitting..." : "Submit Note"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isAdmin ? "All Notes" : "Note History"}
                    </h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading notes...</div>
                ) : filteredComplaints.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No notes found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User Name</th>
                                    <th className="px-6 py-4 font-medium">User Mobile</th>
                                    <th className="px-6 py-4 font-medium">Note</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-800">
                                {filteredComplaints.map((c) => (
                                    <tr key={c._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium">
                                            {c.userId && typeof c.userId === "object" ? c.userId.name : "—"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {c.userId && typeof c.userId === "object" ? c.userId.mobileNumber : "—"}
                                        </td>
                                        <td className="px-6 py-4 max-w-md truncate" title={c.complaint}>
                                            {c.complaint}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                    c.noteStatus === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-amber-100 text-amber-700"
                                                }`}
                                            >
                                                {c.noteStatus === "completed" ? "Completed" : "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                {c.noteStatus !== "completed" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markAsCompleted(c._id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors inline-flex items-center justify-center border border-green-100"
                                                        title="Mark as completed"
                                                    >
                                                        <FiCheck size={18} />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteClick(
                                                                c._id,
                                                                c.userId && typeof c.userId === "object"
                                                                    ? c.userId.name
                                                                    : "Note"
                                                            )
                                                        }
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center border border-red-100"
                                                        title="Delete Note"
                                                    >
                                                        <FiTrash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmationDialog
                isOpen={deleteDialog.isOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                title="Delete Note"
                message={`Are you sure you want to delete note for "${deleteDialog.itemName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
        </RoleGuard>
    );
}
