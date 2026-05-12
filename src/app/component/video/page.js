"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  listVideos,
  createVideoApi,
  updateVideoById,
  deleteVideoById,
} from "@/Api/AllApi";
import VideoForm from "./videoForm";
import VideoTable from "./videoTable";
import SearchComponent from "@/components/SearchComponent";
import { useAuth } from "@/contexts/AuthContext";

const VideoPage = () => {
  const { role, permissions } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [videos, setVideos] = useState([]);
  const [filteredVideos, setFilteredVideos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [planHistoryFilter, setPlanHistoryFilter] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const fetchList = async (params = {}) => {
    try {
      setListLoading(true);
      const data = await listVideos(params);
      const videoData = Array.isArray(data) ? data : [];
      setVideos(videoData);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load videos");
      toast.error(e?.response?.data?.message || "Failed to load videos");
    } finally {
      setListLoading(false);
    }
  };

  const fetchWithFilters = () => {
    const params = {};
    if (typeFilter !== 'all') params.type = typeFilter;
    if (searchTerm) params.search = searchTerm;
    if (selectedDate) params.startDate = selectedDate;
    if (planHistoryFilter) params.planHistory = planHistoryFilter;
    fetchList(params);
  };

  useEffect(() => {
    fetchWithFilters();
  }, [typeFilter, searchTerm, selectedDate, planHistoryFilter]);



  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setError("");
      if (editing) {
        await updateVideoById(editing._id, formData);
        toast.success("Video updated successfully!");
      } else {
        await createVideoApi(formData);
        toast.success("Video created successfully!");
      }
      await fetchList();
      setIsOpen(false);
      setEditing(null);
    } catch (err) {
      const errorData = err?.response?.data;
      const errorStr = errorData?.error || errorData?.message || "Failed to save video";
      
      if (errorStr.includes('already exists') && (errorStr.includes('type 6') || errorStr.includes('type 7') || errorStr.includes('type 8') || errorStr.includes('type 9'))) {
        toast.error(errorStr);
      } else {
        setError(errorStr);
        toast.error(errorStr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    setVideoToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;

    try {
      setLoading(true);
      setError("");
      await deleteVideoById(videoToDelete);
      await fetchList();
      toast.success("Video deleted successfully!");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete video");
      toast.error(err?.response?.data?.message || "Failed to delete video");
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setVideoToDelete(null);
    }
  };

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-8 lg:px-12 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <Header size="4xl">Videos</Header>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Manage your multilingual educational content</p>
          </div>
          {(role === "Admin" || (role === "subadmin" && permissions?.includes("manage video"))) && (
            <Button onClick={() => setIsOpen(true)}>
              Upload New Video
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            {error}
          </div>
        )}

        <SearchComponent
          onSearch={setSearchTerm}
          onFilterChange={setTypeFilter}
          onDateChange={setSelectedDate}
          searchLoading={searchLoading}
          searchPlaceholder="Search by title, description, day, or category..."
          filterOptions={[
            { label: "All Videos", value: "all" },
            { label: "Day Wise", value: "1" },
            { label: "Session Categories", value: "2" },
            // { label: "Testimonial", value: "3" },
            { label: "Category Testimonial", value: "4" },
            { label: "Resume Plan", value: "5" },
            { label: "Trial Video", value: "6" },
            { label: "Body Detoxification", value: "7" },
            { label: "Instruction", value: "8" },
            { label: "Hold Video", value: "9" },
          ]}
          filterValue={typeFilter}
          filterLabel="Type"
          selectedDate={selectedDate}
        />

        {!listLoading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {videos.length} videos
          </div>
        )}

        <VideoTable
          items={videos}
          loading={listLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-yellow-600">
              {editing ? "Update Video" : "Create Video"}
            </h2>
          </div>
          <VideoForm
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

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
          title="Delete Video"
          message="Are you sure you want to delete this video? This action cannot be undone."
          type="danger"
        />
      </div>
    </RoleGuard>
  );
};

export default VideoPage;
