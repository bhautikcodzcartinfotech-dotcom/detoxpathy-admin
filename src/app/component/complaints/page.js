"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
    getComplaints,
    addComplaint,
    getAllUsers,
    getUsersByBranch,
    deleteComplaint
} from "@/Api/AllApi";
import { toast } from "react-hot-toast";
import { FiTrash2 } from "react-icons/fi";

export default function ComplaintsPage() {
    const { role, user, branches } = useAuth();
    const isDoctor = role === "subadmin";
    const isAdmin = role === "Admin";

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form states for adding complaint
    const [userId, setUserId] = useState("");
    const [complaintText, setComplaintText] = useState("");
    const [usersList, setUsersList] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // States for custom searchable dropdown
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const filteredUsers = (usersList || []).filter((u) => {
        if (!u) return false;
        const name = (u.name || "").toLowerCase();
        const mobile = (u.mobileNumber || "").toLowerCase();
        const query = searchQuery.toLowerCase();
        return name.includes(query) || mobile.includes(query);
    });

    useEffect(() => {
        fetchComplaints();
        if (isDoctor) {
            fetchUsers();
        }
    }, [isDoctor]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const data = await getComplaints();
            // Admins see all. Doctors could see all or maybe only theirs, 
            // but the API currently returns all complaints. 
            // We filter them on frontend for doctors just to be safe, 
            // or let them see all if intended. Assuming API provides all.
            setComplaints(data || []);
        } catch (error) {
            toast.error("Failed to fetch complaints");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            let userData = [];
            if (isDoctor) {
                // Doctors only see users from their assigned branches
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

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this complaint?")) {
            return;
        }

        try {
            await deleteComplaint(id);
            toast.success("Complaint deleted successfully");
            fetchComplaints();
        } catch (error) {
            console.error("Failed to delete complaint:", error);
            const errMsg = error?.response?.data?.message || error?.message || "Failed to delete complaint";
            toast.error(`Error: ${errMsg}`);
        }
    };

    const handleAddComplaint = async (e) => {
        e.preventDefault();
        if (!userId || !complaintText) {
            toast.error("Please fill all fields");
            return;
        }

        try {
            setSubmitting(true);
            await addComplaint({ userId, complaint: complaintText });
            toast.success("Complaint submitted successfully");
            setUserId("");
            setComplaintText("");
            setSearchQuery("");
            fetchComplaints();
        } catch (error) {
            console.error("COMPLAINT ERROR:", error);
            const errMsg = error?.response?.data?.message || error?.message || "Failed to submit complaint";
            toast.error(`Error: ${errMsg}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-[#134D41] mb-6">Complaints</h1>

            {isDoctor && (
                <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Submit a New Complaint</h2>
                    <form onSubmit={handleAddComplaint} className="space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select User
                            </label>
                            
                            {/* Selected user / Input Display */}
                            <div 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus-within:border-[#134D41] focus-within:ring-1 focus-within:ring-[#134D41] outline-none bg-white cursor-pointer flex justify-between items-center transition-all"
                            >
                                <input
                                    type="text"
                                    placeholder="Search and select user..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setUserId(""); // Reset selected user ID while typing to search
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

                            {/* Dropdown Backdrop to close on click outside */}
                            {isDropdownOpen && (
                                <div 
                                    className="fixed inset-0 z-40 bg-transparent" 
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                            )}

                            {/* Dropdown List */}
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
                                                className={`px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors flex justify-between items-center ${userId === u._id ? 'bg-[#134D41]/5 text-[#134D41] font-semibold' : ''}`}
                                            >
                                                <span>{u.name || "Unnamed"}</span>
                                                <span className="text-xs text-gray-400">{u.mobileNumber || "No Phone"}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Complaint Details
                            </label>
                            <textarea
                                value={complaintText}
                                onChange={(e) => setComplaintText(e.target.value)}
                                rows={4}
                                placeholder="Describe the complaint regarding the user..."
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-[#134D41] focus:ring-1 focus:ring-[#134D41] outline-none resize-none"
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-[#134D41] text-white rounded-lg hover:bg-[#134D41]/90 transition-colors disabled:opacity-50"
                            >
                                {submitting ? "Submitting..." : "Submit Complaint"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {isAdmin ? "All Complaints" : "Complaint History"}
                    </h2>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading complaints...</div>
                ) : complaints.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No complaints found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User Name</th>
                                    <th className="px-6 py-4 font-medium">User Mobile</th>
                                    <th className="px-6 py-4 font-medium">Complaint</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    {isAdmin && <th className="px-6 py-4 font-medium">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-800">
                                {complaints.map((c) => (
                                    <tr key={c._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-medium">
                                            {c.userId && typeof c.userId === 'object' ? c.userId.name : 'Unknown User'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {c.userId && typeof c.userId === 'object' ? c.userId.mobileNumber : '-'}
                                        </td>
                                        <td className="px-6 py-4 max-w-md truncate" title={c.complaint}>
                                            {c.complaint}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleDelete(c._id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center justify-center"
                                                    title="Delete Complaint"
                                                >
                                                    <FiTrash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
