"use client";

import { useState, useRef, useEffect } from "react";
import { MdAccountCircle } from "react-icons/md";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { FiBell, FiUserPlus, FiMessageSquare, FiCalendar, FiTrash2, FiCheckCircle, FiX, FiShoppingCart } from "react-icons/fi";
import { io } from "socket.io-client";
import { API_HOST } from "../Api/AllApi";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

const getRoleDisplayLabel = (user, role) => {
  const adminType = String(user?.adminType || "").trim();
  const adminTypeLower = adminType.toLowerCase();

  if (role === "Admin" || adminTypeLower === "admin") return "Super Admin";

  if (adminTypeLower === "sub admin" || adminTypeLower === "sub doctor") {
    return "Doctor";
  }

  if (adminTypeLower.includes("account")) return "Accounted";

  if (adminType) {
    return adminType;
  }

  return "User";
};

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, role, branches } = useAuth();
  const roleLabel = getRoleDisplayLabel(user, role);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin_notifications");
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse notifications", e);
        }
      }
    }
  }, []);

  // Save to localStorage
  const saveNotifications = (list) => {
    setNotifications(list);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_notifications", JSON.stringify(list));
      window.dispatchEvent(new Event("admin_notifications_updated"));
    }
  };

  const addNotification = (item) => {
    setNotifications((prev) => {
      // Prevent duplicates by checking ID, or message/timestamp similarity
      if (
        prev.some(
          (n) =>
            n.id === item.id ||
            (n.type === item.type &&
              n.message === item.message &&
              Math.abs(new Date(n.timestamp).getTime() - new Date(item.timestamp).getTime()) < 2000)
        )
      ) {
        return prev;
      }
      const updated = [item, ...prev].slice(0, 50); // Limit to latest 50 notifications
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_notifications", JSON.stringify(updated));
        window.dispatchEvent(new Event("admin_notifications_updated"));
      }
      return updated;
    });
  };

  // close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset unread appointments notifications when visiting the appointments page
  useEffect(() => {
    if (pathname === "/component/appointment") {
      setNotifications((prev) => {
        const hasUnreadAppointments = prev.some(
          (n) => (n.type === "appointment_create" || n.type === "appointment_reschedule") && !n.read
        );
        if (!hasUnreadAppointments) return prev; // Avoid redundant state writes

        const updated = prev.map((n) =>
          n.type === "appointment_create" || n.type === "appointment_reschedule"
            ? { ...n, read: true }
            : n
        );
        
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_notifications", JSON.stringify(updated));
          window.dispatchEvent(new Event("admin_notifications_updated"));
        }
        return updated;
      });
    }
  }, [pathname]);

  // 1. Firebase Firestore support messages listener
  useEffect(() => {
    if (!user || !db) return;

    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const chatData = change.doc.data();
          
          if (!chatData.userId || !chatData.userName || !chatData.lastMessage) return;

          const lastMsg = chatData.lastMessage;
          const senderId = lastMsg.senderId;
          const currentAdminId = user?._id || user?.id;

          // Only trigger if sender is NOT this admin/customer care
          if (
            senderId &&
            String(senderId) !== String(currentAdminId) &&
            senderId !== chatData.customerCareId
          ) {
            const msgTime = lastMsg.createdAt?.seconds 
              ? new Date(lastMsg.createdAt.seconds * 1000) 
              : lastMsg.createdAt 
                ? new Date(lastMsg.createdAt) 
                : new Date();
                
            const diffMs = new Date().getTime() - msgTime.getTime();
            
            // Only add notifications for extremely recent messages (within 15 seconds) to prevent spamming old logs
            if (diffMs >= 0 && diffMs < 15000) {
              const newNotification = {
                id: `support_${change.doc.id}_${msgTime.getTime()}`,
                type: 'support',
                message: `💬 Support message from ${chatData.userName}: "${lastMsg.text || 'Sent an attachment'}"`,
                userId: chatData.userId,
                userName: chatData.userName,
                branchId: chatData.branchId || null,
                timestamp: new Date().toISOString(),
                read: false
              };

              addNotification(newNotification);
            }
          }
        }
      });
    }, (err) => {
      console.error("Firestore error in Navbar listener:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Socket.io notifications listener
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    const socket = io(API_HOST, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("Navbar connected to notification socket");
    });

    socket.on("new_popup", (data) => {
      console.log("Navbar received socket notification:", data);
      
      // Skip emergency notifications since they are handled via a full modal in MainLayout
      if (data.type === "emergency") return;

      const newNotification = {
        id: `${data.type}_${data.userId || 'system'}_${new Date().getTime()}`,
        type: data.type,
        message: data.message,
        userId: data.userId || null,
        userName: data.userName || null,
        branchId: data.branchId || null,
        timestamp: data.timestamp || new Date().toISOString(),
        read: false
      };

      addNotification(newNotification);
    });

    socket.on("connect_error", (err) => {
      console.error("Navbar socket connection error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Filter notifications based on Doctor's branches
  const filteredNotifications = notifications.filter((n) => {
    if (role === "Admin") return true; // Super Admin sees all
    
    // Doctor / Sub-admin check: show only branch-specific ones
    if (!n.branchId) return false;
    return branches && branches.includes(String(n.branchId));
  });

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => {
      const isFiltered = role === "Admin" || (n.branchId && branches && branches.includes(String(n.branchId)));
      if (isFiltered) {
        return { ...n, read: true };
      }
      return n;
    });
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    const updated = notifications.filter((n) => {
      const isFiltered = role === "Admin" || (n.branchId && branches && branches.includes(String(n.branchId)));
      return !isFiltered;
    });
    saveNotifications(updated);
  };

  const handleMarkOneRead = (id) => {
    const updated = notifications.map((n) => 
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  const handleClearOne = (id, e) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationStyle = (type, read) => {
    switch (type) {
      case "register":
        return {
          cardBg: read ? "bg-white" : "bg-gradient-to-br from-blue-500/[0.04] to-indigo-500/[0.04]",
          cardBorder: read ? "border-gray-100" : "border-blue-100/50",
          iconBg: "bg-blue-100/80 text-blue-600 shadow-sm shadow-blue-100/20",
          icon: <FiUserPlus size={16} />
        };
      case "support":
        return {
          cardBg: read ? "bg-white" : "bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.04]",
          cardBorder: read ? "border-gray-100" : "border-violet-100/50",
          iconBg: "bg-violet-100/80 text-violet-600 shadow-sm shadow-violet-100/20",
          icon: <FiMessageSquare size={16} />
        };
      case "order_create":
        return {
          cardBg: read ? "bg-white" : "bg-gradient-to-br from-amber-500/[0.04] to-yellow-500/[0.04]",
          cardBorder: read ? "border-gray-100" : "border-amber-100/50",
          iconBg: "bg-amber-100/80 text-amber-600 shadow-sm shadow-amber-100/20",
          icon: <FiShoppingCart size={16} />
        };
      case "appointment_create":
      case "appointment_reschedule":
        return {
          cardBg: read ? "bg-white" : "bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.04]",
          cardBorder: read ? "border-gray-100" : "border-emerald-100/50",
          iconBg: "bg-emerald-100/80 text-emerald-600 shadow-sm shadow-emerald-100/20",
          icon: <FiCalendar size={16} />
        };
      default:
        return {
          cardBg: read ? "bg-white" : "bg-gradient-to-br from-gray-500/[0.04] to-slate-500/[0.04]",
          cardBorder: read ? "border-gray-100" : "border-gray-200/50",
          iconBg: "bg-gray-100/80 text-gray-600 shadow-sm",
          icon: <FiBell size={16} />
        };
    }
  };

  const renderNotificationMessage = (message, type) => {
    if (!message) return null;

    try {
      if (type === "register") {
        // Format: "🆕 New user registered: Name Surname (Patient ID: ID)"
        const match = message.match(/🆕 New user registered:\s+([^(]+)(?:\(([^)]+)\))?/);
        if (match) {
          const name = match[1].trim();
          const details = match[2] ? match[2].trim() : "";
          return (
            <div className="text-[12.5px] leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-900">{name}</span> has registered as a new user.
              {details && (
                <span className="block text-[10px] text-blue-600 font-semibold tracking-wide uppercase mt-1 bg-blue-50/50 w-fit px-1.5 py-0.5 rounded border border-blue-100/40">
                  {details}
                </span>
              )}
            </div>
          );
        }
      }

      if (type === "support") {
        // Format: "💬 Support message from Name: "text""
        const match = message.match(/💬 Support message from\s+([^:]+):\s*"([^"]+)"/);
        if (match) {
          const name = match[1].trim();
          const text = match[2].trim();
          return (
            <div className="text-[12.5px] leading-relaxed text-gray-700">
              Support request from <span className="font-semibold text-gray-900">{name}</span>
              <div className="mt-1.5 pl-2.5 border-l-[3px] border-violet-400 text-gray-600 italic bg-violet-500/[0.03] py-1 pr-1.5 rounded-r text-[11.5px] font-medium leading-relaxed">
                "{text}"
              </div>
            </div>
          );
        }
      }

      if (type === "appointment_create" || type === "appointment_reschedule") {
        // Format: "📅 New appointment booked by Name Surname for Date at Time"
        // or "📅 Appointment rescheduled by Name Surname to Date at Time"
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
              <span className="font-semibold text-gray-900">{name}</span> {isResched ? "has rescheduled an appointment" : "has booked a appointment"}
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold tracking-wide uppercase mt-1.5 bg-emerald-500/[0.06] w-fit px-2 py-0.5 rounded-full border border-emerald-200/50">
                {date} • {time}
              </span>
            </div>
          );
        }
      }
    } catch (e) {
      console.error("Error parsing notification message", e);
    }

    // Default fallback cleanly stripped of emoji prefixes
    const cleanMessage = message.replace(/^[🆕💬📅🚨🛒]\s*/, "");
    return <p className="text-[12.5px] leading-relaxed text-gray-700">{cleanMessage}</p>;
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
  };

  return (
    <header className="h-16 w-full bg-white rounded-xl flex items-center justify-between px-6 shadow-md sticky top-0 z-30 border-b border-gray-100">
      {/* Dynamic Keyframes for Bell Hover Swing & Slide Entrance */}
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing {
          animation: swing 0.8s ease-in-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Custom Scrollbar for Notifications List */
        .notifications-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .notifications-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .notifications-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.08);
          border-radius: 99px;
        }
        .notifications-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.15);
        }
      `}</style>

      {/* Brand / Title */}
      <h2 className="text-xl font-bold text-gray-800 tracking-wide relative group">
        Dashboard
        <span className="absolute left-0 -bottom-1 w-0 h-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-300 group-hover:w-full"></span>
      </h2>

      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-[#134D41] tracking-wide hidden sm:inline">
          {roleLabel}
        </span>

        {/* Notification Bell Trigger */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setBellOpen(!bellOpen);
              setOpen(false); // Close profile dropdown
            }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-50/50 hover:bg-gray-100/80 border border-gray-100 hover:border-gray-200 transition-all duration-300 text-gray-600 hover:text-gray-800 shadow-sm group active:scale-95"
          >
            <FiBell size={19} className="group-hover:animate-swing transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-to-tr from-red-500 to-rose-600 text-[9px] font-black text-white ring-2 ring-white shadow-sm shadow-red-500/30 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Premium Glassmorphic Dropdown */}
          {bellOpen && (
            <div className="absolute right-0 mt-3.5 w-[340px] sm:w-[400px] bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-3xl border border-white/60 ring-1 ring-black/5 overflow-hidden transform origin-top-right z-50 animate-slide-in">
              
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/40 to-white flex items-center justify-between">
                <div>
                  <h3 className="text-[14.5px] font-extrabold text-gray-900 flex items-center gap-2">
                    Activity Alerts
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[9.5px] bg-red-500 text-white rounded-full font-black uppercase tracking-wider shadow-sm shadow-red-500/10">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                </div>
                {filteredNotifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-yellow-600 hover:text-yellow-700 font-bold hover:underline flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <FiCheckCircle size={13} />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Scrollable Floating Cards List */}
              <div className="max-h-[360px] overflow-y-auto notifications-scroll px-4 py-3 divide-y-0 space-y-2.5 bg-gray-50/[0.15]">
                {filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-5 text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-gray-50 to-gray-100 flex items-center justify-center text-gray-400 mb-3.5 shadow-inner">
                      <FiBell size={24} className="text-gray-300" />
                    </div>
                    <p className="text-[13.5px] font-bold text-gray-800">All Caught Up!</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">You don't have any notifications at the moment.</p>
                  </div>
                ) : (
                  filteredNotifications.map((item) => {
                    const style = getNotificationStyle(item.type, item.read);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleMarkOneRead(item.id)}
                        className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer relative group ${
                          style.cardBg
                        } ${style.cardBorder} hover:shadow-md hover:shadow-gray-100/50 hover:translate-y-[-1px] ${
                          !item.read ? "shadow-sm shadow-gray-50" : ""
                        }`}
                      >
                        {/* Glow indicator for Unread Items */}
                        {!item.read && (
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-500 rounded-full shadow-md shadow-yellow-500/50 animate-pulse" />
                        )}
                        
                        {/* Curved square icon bubble */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${style.iconBg} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                          {style.icon}
                        </div>

                        {/* Rich formatted message content */}
                        <div className="flex-1 min-w-0 pr-4">
                          {renderNotificationMessage(item.message, item.type)}
                          <span className="text-[10px] text-gray-400 font-medium mt-2 block tracking-wide">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>

                        {/* Quick Hover Actions */}
                        <div className="opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 absolute right-3.5 top-1/2 -translate-y-1/2">
                          <button
                            onClick={(e) => handleClearOne(item.id, e)}
                            className="p-1.5 rounded-xl bg-white border border-gray-100 hover:bg-rose-50 text-gray-400 hover:text-rose-600 shadow-md shadow-gray-200/40 transition-all active:scale-90"
                            title="Dismiss Alert"
                          >
                            <FiX size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {filteredNotifications.length > 0 && (
                <div className="px-5 py-3 bg-white border-t border-gray-100 text-center">
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center justify-center gap-1.5 w-full py-2 hover:bg-rose-500/[0.03] rounded-xl transition-all active:scale-[0.98]"
                  >
                    <FiTrash2 size={13} />
                    Clear all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setOpen(!open);
              setBellOpen(false); // Close bell dropdown
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-200 to-yellow-400 hover:from-yellow-300 hover:to-yellow-500 transition-colors duration-300 text-gray-800 shadow-md"
          >
            <MdAccountCircle size={26} />
          </button>

          {open && (
            <div
              className={`absolute right-0 mt-3 w-60 bg-white/90 backdrop-blur-xl shadow-md rounded-2xl border border-gray-100 overflow-hidden transform origin-top-right transition-all duration-300 ${
                open ? "animate-fade-in" : "animate-fade-out"
              }`}
            >
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 shadow-inner">
                    <MdAccountCircle size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.username || "User"}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email || ""}</p>
                    <p className="text-2xs text-gray-400">{role || ""}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <ul className="py-1">
                <li>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-gray-700 hover:bg-yellow-50 hover:text-yellow-600 transition rounded-md mx-2"
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-500 transition rounded-md mx-2"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
