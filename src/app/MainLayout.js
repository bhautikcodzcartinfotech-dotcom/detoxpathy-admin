"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../navigation/Sidebar";
import Navbar from "../navigation/Navbar";
import AuthGuard from "../components/AuthGuard";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import { useRouter } from "next/navigation";
import Loader from "@/utils/loader";
import { trackPanelOpen, trackPanelClose, API_BASE, API_HOST } from "@/Api/AllApi";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [emergencyModal, setEmergencyModal] = useState({ isOpen: false, data: null });

  // Track panel open/close with refresh detection
  useEffect(() => {
    if (isAuthenticated() && !loading) {
      // Check if page was already loaded in this session
      const pageLoaded = sessionStorage.getItem("pageLoaded");

      // If page not loaded before, it's a new session (not refresh)
      if (!pageLoaded) {
        // Track panel open for new session
        trackPanelOpen().catch((err) => {
          console.error("Failed to track panel open:", err);
        });
        // Mark page as loaded
        sessionStorage.setItem("pageLoaded", "true");
      }

      // Detect refresh: when user presses F5, Ctrl+R, or refresh button
      const handleKeyDown = (e) => {
        if (e.key === "F5" || (e.ctrlKey && (e.key === "r" || e.key === "R"))) {
          sessionStorage.setItem("isRefreshing", "true");
        }
      };

      // Detect refresh via navigation timing (modern API)
      const handlePageshow = (e) => {
        if (e.persisted) {
          // Page loaded from cache (back/forward navigation) - not a refresh
          sessionStorage.setItem("isRefreshing", "false");
        } else {
          // Check if it's a reload using Navigation Timing API
          const navType = performance.getEntriesByType("navigation")[0]?.type;
          if (navType === "reload") {
            sessionStorage.setItem("isRefreshing", "true");
            // Don't track open on refresh
            sessionStorage.setItem("pageLoaded", "true");
          }
        }
      };

      // Track panel close only when browser/tab is completely closed (not refresh)
      const handleBeforeUnload = () => {
        const isRefreshing = sessionStorage.getItem("isRefreshing") === "true";

        // Only track close if it's NOT a refresh
        if (!isRefreshing) {
          // Use synchronous XMLHttpRequest for beforeunload
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_BASE}/admin/logs/panel/close`, false);
          const token = localStorage.getItem("token");
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
          xhr.setRequestHeader("Content-Type", "application/json");
          try {
            xhr.send(JSON.stringify({}));
          } catch (err) {
            // Ignore errors during unload
          }
        } else {
          // It's a refresh, reset flags for next load
          sessionStorage.removeItem("isRefreshing");
          // Keep pageLoaded so we know it's a refresh on next load
        }
      };

      // Initialize refresh detection
      if (typeof window !== "undefined") {
        const navType = performance.getEntriesByType("navigation")[0]?.type;
        if (navType === "reload") {
          sessionStorage.setItem("isRefreshing", "true");
          sessionStorage.setItem("pageLoaded", "true");
        }
      }

      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("pageshow", handlePageshow);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("pageshow", handlePageshow);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isAuthenticated, loading]);

  // Socket Connection for Real-time Pop-ups
  useEffect(() => {
    if (isAuthenticated() && !loading) {
      const token = localStorage.getItem("token");
      const socket = io(API_HOST, {
        auth: { token },
      });

      socket.on("connect", () => {
        console.log("Connected to notification socket");
      });

      socket.on("new_popup", (data) => {
        console.log("New pop-up received:", data);
        const isEmergency = data.type === 'emergency';
        
        if (isEmergency) {
          setEmergencyModal({ isOpen: true, data });
        } else {
          toast.success(data.message, {
            duration: 6000,
            position: "top-right",
            style: {
              background: "#4CAF50",
              color: "#fff",
              fontWeight: "bold",
              padding: "16px",
            },
            icon: '🔔'
          });
        }
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [isAuthenticated, loading]);

  const hideLayout = [
    "/login",
    "/register",
    "/forgot-password",
    "/admin/reset-password",
  ];
  const showLayout = !hideLayout.includes(pathname) && isAuthenticated();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  // If it's a login/register page, show without layout
  if (hideLayout.includes(pathname)) {
    return children;
  }

  // For protected routes, wrap with AuthGuard
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#F5F5F5]">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div
          className="flex-1 flex flex-col transition-all duration-300"
          style={{ marginLeft: isCollapsed ? "64px" : "256px" }}
        >
          <div className="p-4">
            <Navbar />
          </div>
          <main className="p-4 flex-1">{children}</main>
        </div>
      </div>
      
      <EmergencyAlertModal
        isOpen={emergencyModal.isOpen}
        data={emergencyModal.data}
        onClose={() => setEmergencyModal({ ...emergencyModal, isOpen: false })}
        onViewUser={(userId) => {
          setEmergencyModal({ ...emergencyModal, isOpen: false });
          router.push(`/component/users/${userId}/profile`);
        }}
      />
    </AuthGuard>
  );
}
