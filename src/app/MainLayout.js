"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../navigation/Sidebar";
import Navbar from "../navigation/Navbar";
import AuthGuard from "../components/AuthGuard";
import SecurityGuard from "../components/SecurityGuard";
import EmergencyAlertModal from "../components/EmergencyAlertModal";
import { useRouter } from "next/navigation";
import Loader from "@/utils/loader";
import { trackPanelOpen, trackPanelClose, API_BASE, API_HOST, getSetting } from "@/Api/AllApi";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { FiUserPlus, FiMessageSquare, FiCalendar, FiBell, FiX } from "react-icons/fi";

const renderNotificationMessage = (message, type) => {
  if (!message) return null;

  try {
    if (type === "register") {
      const match = message.match(/🆕 New user registered:\s+([^(]+)(?:\(([^)]+)\))?/);
      if (match) {
        const name = match[1].trim();
        const details = match[2] ? match[2].trim() : "";
        return (
          <div className="text-[12.5px] leading-relaxed text-gray-700">
            <span className="font-bold text-gray-900">{name}</span> has joined Detoxpathy.
            {details && (
              <span className="block text-[10px] text-blue-600 font-bold tracking-wide uppercase mt-1 bg-blue-50/50 w-fit px-1.5 py-0.5 rounded border border-blue-100/40">
                {details}
              </span>
            )}
          </div>
        );
      }
    }

    if (type === "support") {
      const match = message.match(/💬 Support message from\s+([^:]+):\s*"([^"]+)"/);
      if (match) {
        const name = match[1].trim();
        const text = match[2].trim();
        return (
          <div className="text-[12.5px] leading-relaxed text-gray-700">
            Message from <span className="font-bold text-gray-900">{name}</span>
            <div className="mt-1 pl-2.5 border-l-[3px] border-violet-400 text-gray-600 italic bg-violet-500/[0.03] py-0.5 pr-1.5 rounded-r text-[11.5px] font-medium leading-relaxed">
              "{text}"
            </div>
          </div>
        );
      }
    }

    if (type === "appointment_create" || type === "appointment_reschedule") {
      const isResched = type === "appointment_reschedule";
      const regex = isResched 
        ? /📅 Appointment rescheduled by\s+(.+)\s+to\s+(.+)\s+at\s+(.+)/ 
        : /📅 New appointment booked by\s+(.+)\s+for\s+(.+)\s+at\s+(.+)/;
        
      const match = message.match(regex);
      if (match) {
        const name = match[1].trim();
        const date = match[2].trim();
        const time = match[3].trim();
        return (
          <div className="text-[12.5px] leading-relaxed text-gray-700">
            <span className="font-bold text-gray-900">{name}</span> {isResched ? "has rescheduled an appointment" : "has booked a appointment"}
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold tracking-wide uppercase mt-1.5 bg-emerald-500/[0.06] w-fit px-2 py-0.5 rounded-full border border-emerald-200/50">
              {date} • {time}
            </span>
          </div>
        );
      }
    }
  } catch (e) {
    console.error("Error parsing toast notification message", e);
  }

  const cleanMessage = message.replace(/^[🆕💬📅🚨]\s*/, "");
  return <p className="text-[12.5px] leading-relaxed text-gray-700">{cleanMessage}</p>;
};

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
          // Custom styling depending on the type
          let icon = <FiBell className="w-5 h-5" />;
          let iconBg = "bg-gray-100 text-gray-600 border border-gray-200/50";
          let borderCol = "border-gray-200";
          let redirectUrl = "";

          if (data.type === "register") {
            icon = <FiUserPlus className="w-5 h-5" />;
            iconBg = "bg-blue-50 text-blue-600 border border-blue-100";
            borderCol = "border-blue-100";
            redirectUrl = `/component/users/${data.userId}/profile`;
          } else if (data.type === "support") {
            icon = <FiMessageSquare className="w-5 h-5" />;
            iconBg = "bg-violet-50 text-violet-600 border border-violet-100";
            borderCol = "border-violet-100";
            redirectUrl = `/component/userchat`;
          } else if (data.type === "appointment_create" || data.type === "appointment_reschedule") {
            icon = <FiCalendar className="w-5 h-5" />;
            iconBg = "bg-emerald-50 text-emerald-600 border border-emerald-100";
            borderCol = "border-emerald-100";
            redirectUrl = `/component/appointment`;
          }

          // Clean emoji prefixes from message if any
          const cleanMessage = data.message ? data.message.replace(/^[🆕💬📅🚨]\s*/, "") : "";

          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? "animate-slide-in-toast" : "animate-slide-out-toast"
                } max-w-sm w-full bg-white/95 backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.08)] rounded-2xl pointer-events-auto border ${borderCol} p-4 flex gap-3.5 transition-all duration-300 hover:shadow-xl hover:translate-y-[-1px] relative`}
              >
                {/* Accent Icon Container */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}>
                  {icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="text-[11px] font-black tracking-wider text-gray-400 uppercase">
                    {data.type === "register"
                      ? "New Member"
                      : data.type === "support"
                      ? "Support Message"
                      : "Appointment Alert"}
                  </div>
                  <div className="mt-1">
                    {renderNotificationMessage(data.message, data.type)}
                  </div>
                  
                  {/* Action Link */}
                  {redirectUrl && (
                    <button
                      onClick={() => {
                        toast.dismiss(t.id);
                        router.push(redirectUrl);
                      }}
                      className="text-[11.5px] font-bold text-yellow-600 hover:text-yellow-700 transition-colors mt-2 underline cursor-pointer"
                    >
                      {data.type === "support" ? "Open Chat" : "Manage Details"}
                    </button>
                  )}
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="p-1 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all absolute right-3 top-3 border border-transparent hover:border-gray-100"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            ),
            {
              duration: 6000,
              position: "top-right",
            }
          );
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
      <SecurityGuard>
        <div className="flex min-h-screen bg-[#F5F5F5] overflow-x-hidden">
          <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
          <div
            className="flex-1 flex flex-col transition-all duration-300 min-w-0 overflow-x-hidden"
            style={{
              marginLeft: isCollapsed ? "64px" : "256px",
              width: isCollapsed ? "calc(100vw - 64px)" : "calc(100vw - 256px)",
              maxWidth: isCollapsed ? "calc(100vw - 64px)" : "calc(100vw - 256px)"
            }}
          >
            <div className="p-4">
              <Navbar />
            </div>
            <main className="p-4 flex-1 min-w-0 overflow-x-hidden">{children}</main>
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

        {/* Dynamic Keyframes for Custom Fly-in Toasts */}
        <style>{`
          @keyframes slideInToast {
            from {
              opacity: 0;
              transform: translateX(120%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
          @keyframes slideOutToast {
            from {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
            to {
              opacity: 0;
              transform: translateX(120%) scale(0.9);
            }
          }
          .animate-slide-in-toast {
            animation: slideInToast 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-slide-out-toast {
            animation: slideOutToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </SecurityGuard>
    </AuthGuard>
  );
}
