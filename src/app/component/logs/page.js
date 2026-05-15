"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header } from "@/utils/header";
import Loader from "@/utils/loader";
import NotFoundCard from "@/components/NotFoundCard";
import Dropdown from "@/utils/dropdown";
import { getLogs, getAllBranches } from "@/Api/AllApi";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const LogsPage = () => {
  const { role, user } = useAuth();
  const isDoctor = role === "subadmin";
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    action: "",
    userId: "",
    branchId: "",
    startDate: "",
    endDate: "",
  });
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    // Wait until user ID is available for doctors to prevent fetching all logs initially
    if (isDoctor && !user?._id) return;
    fetchLogs();
  }, [filters, pagination.page, isDoctor, user?._id]);

  const fetchBranches = async () => {
    try {
      const branchList = await getAllBranches();
      setBranches(Array.isArray(branchList) ? branchList : []);
    } catch (err) {
      console.error("Error fetching branches", err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };

      // SECURITY: Force doctors to only see their own logs
      if (isDoctor && user?._id) {
        params.userId = user._id;
      }

      // Remove empty filters
      Object.keys(params).forEach(
        (key) => params[key] === "" && delete params[key]
      );
      const data = await getLogs(params);
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      if (data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          ...data.pagination,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const getActionColor = (action) => {
    switch (action) {
      case "login":
        return "bg-green-100 text-green-800";
      case "panel_open":
        return "bg-blue-100 text-blue-800";
      case "panel_close":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case "login":
        return "Login";
      case "panel_open":
        return "Panel Open";
      case "panel_close":
        return "Panel Close";
      default:
        return action;
    }
  };

  // Format IP address for display
  const formatIpAddress = (ip) => {
    if (!ip || ip === "-") return "-";

    // Handle IPv6 localhost
    if (ip === "::1") {
      return "127.0.0.1";
    }

    // Handle IPv4 localhost
    if (ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
      return "127.0.0.1";
    }

    // Expand compressed IPv6 addresses
    if (ip.includes("::")) {
      // Split by ::
      const parts = ip.split("::");
      const leftParts = parts[0] ? parts[0].split(":") : [];
      const rightParts = parts[1] ? parts[1].split(":") : [];

      // Calculate missing zeros
      const missingZeros = 8 - (leftParts.length + rightParts.length);
      const zeros = Array(missingZeros).fill("0000");

      // Combine parts
      const expanded = [...leftParts, ...zeros, ...rightParts]
        .map((part) => part.padStart(4, "0"))
        .join(":");

      return expanded;
    }

    // Return original IP if it's already in good format
    return ip;
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-4 sm:px-6 lg:px-10 xl:px-18">
        <div className="mb-6">
          <Header size="3xl">Logs</Header>
          {isDoctor && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium w-fit">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              You can only view your own activity logs.
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Action Filter */}
            <div>
              <Dropdown
                label="Action"
                options={[
                  { label: "All Actions", value: "" },
                  { label: "Login", value: "login" },
                  { label: "Panel Open", value: "panel_open" },
                  { label: "Panel Close", value: "panel_close" },
                ]}
                value={filters.action}
                onChange={(val) => handleFilterChange("action", val)}
              />
            </div>

            {/* Branch Filter — Admin only */}
            {!isDoctor && (
              <div>
                <Dropdown
                  label="Branch"
                  options={[
                    { label: "All Branches", value: "" },
                    ...branches.map((b) => ({ label: b.name, value: b._id })),
                  ]}
                  value={filters.branchId}
                  onChange={(val) => handleFilterChange("branchId", val)}
                />
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block mb-1 font-semibold text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block mb-1 font-semibold text-gray-700">
                End Date
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="flex-1 border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                />
                {(filters.startDate || filters.endDate) && (
                  <button
                    onClick={() => {
                      handleFilterChange("startDate", "");
                      handleFilterChange("endDate", "");
                    }}
                    className="px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold text-gray-700 transition whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <Loader />
            </div>
          ) : logs.length === 0 ? (
            <NotFoundCard
              title="No Logs Found"
              subtitle="No logs match your filter criteria."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        User Type
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-yellow-50 transition-all duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-semibold text-gray-800">
                              {log.user?.username || "-"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {log.user?.email || ""}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {log.userType}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(
                              log.action
                            )}`}
                          >
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {log.branch?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 font-mono text-sm">
                          <span
                            title={`Original: ${log.ipAddress || "N/A"}`}
                            className="cursor-help"
                          >
                            {formatIpAddress(log.ipAddress)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{" "}
                    of {pagination.total} logs
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(prev.totalPages, prev.page + 1),
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
};

export default LogsPage;
