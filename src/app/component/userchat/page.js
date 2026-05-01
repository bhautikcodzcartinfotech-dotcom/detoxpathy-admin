"use client";

import { useState, useRef, useEffect } from "react";
import {
  FiSend,
  FiMic,
  FiX,
  FiSearch,
  FiPaperclip,
  FiImage,
  FiVideo,
  FiFile,
  FiDownload,
  FiPlay,
  FiPause,
  FiVolume2,
  FiVolumeX,
  FiMoreVertical,
  FiUser,
  FiClock,
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import {
  IoMdSend,
  IoMdMic,
  IoMdAttach,
  IoMdImage,
  IoMdVideocam,
  IoMdDownload,
  IoMdPlay,
  IoMdPause,
  IoMdPerson,
  IoMdTime,
  IoMdCheckmark,
  IoMdCheckmarkCircle,
  IoMdChatbubbles,
} from "react-icons/io";
import {
  BsEmojiSmile,
  BsThreeDotsVertical,
  BsCameraVideo,
  BsImage,
  BsFileEarmark,
  BsDownload,
  BsPlayFill,
  BsPauseFill,
  BsVolumeUp,
  BsVolumeMute,
} from "react-icons/bs";
import { db } from "../../../lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { useMessages } from "../../../hooks/useMessages";
import {
  generateUrl,
  getCommands,
  API_BASE,
  getAllBranches,
} from "../../../Api/AllApi";

import Loader from "../../../utils/loader";
import Dropdown from "../../../utils/dropdown";
import TransferAppointmentModal from "./TransferAppointmentModal";

// This will be replaced with customerCareId from chat data

export default function ChatPage() {
  const { role, branches } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [commands, setCommands] = useState([]); // Dynamic commands from API
  const [filteredCommands, setFilteredCommands] = useState([]);

  // New state for file uploads and UI improvements
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showFileOptions, setShowFileOptions] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  // Branch state
  const [allBranches, setAllBranches] = useState([]);
  const [branchIdToName, setBranchIdToName] = useState({});
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);

  const messagesEndRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);
  const {
    messages,
    error: messagesError,
    loading: messagesLoading,
  } = useMessages(chatId);

  // Debug messages
  useEffect(() => {
    console.log("Messages loaded:", messages.length);
    console.log("Messages error:", messagesError);
    console.log("Messages loading:", messagesLoading);
    console.log("Current chatId:", chatId);
    console.log("Selected user:", selectedUser?.name);
  }, [messages, messagesError, messagesLoading, chatId, selectedUser]);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;

    const markRead = async () => {
      const chatRef = collection(db, "chats", chatId, "messages");
      const messagesSnap = await getDocs(chatRef);

      // Fetch chatData to get customerCareId for comparison
      const chatDocRef = doc(db, "chats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);
      const chatData = chatDocSnap.data();

      messagesSnap.forEach(async (msgDoc) => {
        const msg = msgDoc.data();
        if (chatData && msg.senderId !== chatData.customerCareId && !msg.read) {
          await updateDoc(doc(db, "chats", chatId, "messages", msgDoc.id), {
            read: true,
          });
        }
      });

      // Refresh users to update unread count
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, unreadCount: 0 } : u
        )
      );
    };

    markRead();
  }, [selectedUser, chatId, db]);

  useEffect(() => {
    console.log("Commands fetched:", commands);
  }, [commands]);

  // Load branches for admin filter and name resolution
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const branches = await getAllBranches();
        setAllBranches(branches || []);
        const map = (branches || []).reduce((acc, b) => {
          if (b && (b._id || b.id))
            acc[b._id || b.id] = b.name || b.branchName || "Unnamed Branch";
          return acc;
        }, {});
        setBranchIdToName(map);
      } catch (e) {
        console.error("Failed to load branches:", e);
      }
    };
    loadBranches();
  }, []);
  // File upload using your API
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;

    const nowMs = Date.now();
    const messageId = `${nowMs}${Math.floor(Math.random() * 1000)}`;
    const chatRef = doc(db, "chats", chatId);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Use your existing API for file upload
      const formData = new FormData();
      formData.append("image", file, `${file.name.replace(/\s/g, "_")}`);

      // Get URL from your API
      const fullUrl = resolveAudioUrl(await generateUrl(formData));
      const relativeUrl = storeRelativeUrl(await generateUrl(formData));
      console.log("File full URL:", fullUrl);
      console.log("File relative URL for storage:", relativeUrl);

      // Determine file type
      let fileType = "file";
      if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type.startsWith("video/")) fileType = "video";
      else if (file.type.startsWith("audio/")) fileType = "voice";

      // Get the current chat data to get customerCareId
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();
      const customerCareId = chatData?.customerCareId || "admin";

      const msg = {
        id: messageId,
        chatId,
        senderId: customerCareId,
        senderName: "You",
        type: fileType,
        text: null,
        // For admin side: use audioUrl for voice, mediaUrl for image/video
        audioUrl: fileType === "voice" ? relativeUrl : null,
        mediaUrl: fileType !== "voice" ? relativeUrl : null,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        duration: null, // Will be set for voice messages
        status: "sent",
        uploadProgress: 100,
        createdAt: nowMs,
      };

      await addDoc(collection(chatRef, "messages"), msg);
      await updateDoc(chatRef, { lastMessage: msg, updatedAt: nowMs });

      setUploadProgress(0);
      setIsUploading(false);
      setShowFileOptions(false); // Close file options popup
    } catch (err) {
      console.error("File send error:", err);
      setIsUploading(false);
    } finally {
      e.target.value = null; // reset input
    }
  };

  // Normalize audio URL to always resolve under /api/v1/uploads
  const resolveAudioUrl = (input) => {
    if (!input) return input;

    // Handle object response from API
    if (typeof input === "object") {
      const candidate =
        input.data ||
        input.url ||
        input.path ||
        input.fileUrl ||
        input.Location ||
        null;
      if (candidate) input = candidate;
    }

    let url = String(input).trim().replace(/\\/g, "/");

    // If it's already a full URL, return as is
    if (/^https?:\/\//i.test(url)) return url;

    // If backend gave 'uploads\filename' or 'uploads/filename'
    if (/^uploads[\\\/]/i.test(url)) {
      return `${API_BASE.replace(/\/$/, "")}/${url.replace(/\\/g, "/")}`;
    }

    // If it's just a filename, add the uploads path
    if (!url.includes("/")) {
      return `${API_BASE.replace(/\/$/, "")}/uploads/${url}`;
    }

    // Default fallback
    return `${API_BASE.replace(/\/$/, "")}/uploads/${url}`;
  };

  // Store only relative URL in Firebase
  const storeRelativeUrl = (input) => {
    if (!input) return input;

    // Handle object response from API
    if (typeof input === "object") {
      const candidate =
        input.data ||
        input.url ||
        input.path ||
        input.fileUrl ||
        input.Location ||
        null;
      if (candidate) input = candidate;
    }

    let url = String(input).trim().replace(/\\/g, "/");

    // If it's a full URL, extract only the relative path
    if (/^https?:\/\//i.test(url)) {
      // Extract path after /api/v1/uploads/
      const match = url.match(/\/api\/v1\/uploads\/(.+)$/);
      if (match) {
        return `uploads/${match[1]}`;
      }
      return url;
    }

    // If backend gave 'uploads\filename' or 'uploads/filename', normalize it
    if (/^uploads[\\\/]/i.test(url)) {
      return url.replace(/\\/g, "/");
    }

    // If it's just a filename, add the uploads path
    if (!url.includes("/")) {
      return `uploads/${url}`;
    }

    // Return as is if it's already a relative path
    return url;
  };

  // Fetch commands from API
  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const data = await getCommands({ approvedOnly: true }); // call your existing function
        setCommands(data); // set the commands in state
      } catch (err) {
        console.error("Failed to fetch commands:", err);
      }
    };
    fetchCommands();
  }, []);

  // Load users from chats collection with real-time listener
  useEffect(() => {
    if (!db) {
      console.error("Firebase not initialized - db is null");
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log("Setting up real-time listener for users...");

    // Use real-time listener for chats collection
    const chatsRef = collection(db, "chats");
    const unsubscribe = onSnapshot(
      chatsRef,
      async (chatsSnapshot) => {
        try {
          console.log("Chats updated, processing...");
          const chatDocs = chatsSnapshot.docs;
          console.log("Found chat documents:", chatDocs.length);

          const userMap = new Map();

          // Process all chats in parallel for better performance
          const chatPromises = chatDocs.map(async (chatDoc) => {
            const chatData = chatDoc.data();

            // Skip invalid entries
            if (!chatData.userId || !chatData.userName) return null;

            // Fetch messages for unread count in parallel
            const messagesSnap = await getDocs(
              collection(db, "chats", chatDoc.id, "messages")
            );
            let unreadCount = 0;
            messagesSnap.forEach((msgDoc) => {
              const msg = msgDoc.data();
              // Count unread messages from users (not from customer care)
              if (msg.senderId !== chatData.customerCareId && !msg.read) {
                unreadCount++;
              }
            });

            return {
              id: chatData.userId,
              name: chatData.userName,
              role: chatData.userArea || "User",
              email: chatData.userEmail || "",
              lastMessage: chatData.lastMessage,
              updatedAt: chatData.updatedAt,
              branchId: chatData.branchId || null,
              customerCareId: chatData.customerCareId || null,
              unreadCount,
            };
          });

          // Wait for all chat processing to complete
          const userResults = await Promise.all(chatPromises);

          // Filter out null results and add to map
          userResults.forEach((user) => {
            if (user) {
              userMap.set(user.id, user);
            }
          });

          let usersList = Array.from(userMap.values());
          console.log("All users loaded:", usersList.length);

          // Filter by customerCareId for subadmins - only show users from their assigned branches
          if (
            role === "subadmin" &&
            Array.isArray(branches) &&
            branches.length
          ) {
            console.log("Filtering for subadmin with branches:", branches);
            usersList = usersList.filter((u) => {
              // For subadmin, check if customerCareId matches any of their branches
              if (!u.customerCareId) return false;
              // Only show users whose customerCareId is in the subadmin's branches
              return branches.includes(u.customerCareId);
            });
            console.log("Filtered users for subadmin:", usersList.length);
          }
          // Admin sees all users - filtering by dropdown will apply later

          // Sort: unread messages first, then recent
          usersList.sort((a, b) => {
            if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
              return (b.unreadCount || 0) - (a.unreadCount || 0);
            }
            return (b.updatedAt || 0) - (a.updatedAt || 0);
          });

          // Attach branch name (prefer customerCareId, fallback to branchId)
          const usersWithBranchNames = usersList.map((u) => ({
            ...u,
            branchName:
              branchIdToName[u?.customerCareId] ||
              branchIdToName[u?.branchId] ||
              "",
          }));

          setUsers(usersWithBranchNames);
          console.log("Users updated in real-time:", usersList.length);
          setLoading(false);
        } catch (e) {
          console.error("Error processing real-time update:", e);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Real-time listener error:", error);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
      console.log("Cleaning up real-time listener");
      unsubscribe();
    };
  }, [role, branches, branchIdToName]); // Recompute when branch map updates

  // Separate effect to handle user selection when chatId changes (without refreshing users)
  useEffect(() => {
    const selectUserFromChatId = async () => {
      if (!chatId || !db || users.length === 0) return;

      try {
        const currentChat = await getDoc(doc(db, "chats", chatId));
        const currentChatData = currentChat.data();
        if (currentChatData && currentChatData.userId) {
          const currentUser = users.find(
            (u) => u.id === currentChatData.userId
          );
          if (currentUser) {
            setSelectedUser(currentUser);
            console.log("Selected user from chatId:", currentUser.name);
          }
        }
      } catch (chatError) {
        console.warn("Error loading current chat:", chatError);
      }
    };
    selectUserFromChatId();
  }, [chatId, users, db]);

  const filteredUsers = users.filter((u) =>
    [u.name, u.email, u.role].some((val) =>
      val?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.startsWith("/")) {
      setShowSuggestions(true);
      const searchTerm = value.slice(1).toLowerCase(); // Remove '/'
      setFilteredCommands(
        commands.filter((cmd) => cmd.title?.toLowerCase().includes(searchTerm))
      );
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectCommand = async (cmd) => {
    console.log("audioUrl:", cmd.audioUrl);
    console.log("cmd:", cmd);
    if (cmd.type === "text") {
      setNewMessage("/" + cmd.title + " ");
      messageInputRef.current?.focus(); // Focus input so user can continue typing
    } else if (cmd.type === "audio") {
      if (cmd.audioUrl) {
        // Send audio directly (already implemented)
        const nowMs = Date.now();
        const messageId = `${nowMs}${Math.floor(Math.random() * 1000)}`;
        const chatRef = doc(db, "chats", chatId);

        // Get the current chat data to get customerCareId
        const chatDoc = await getDoc(chatRef);
        const chatData = chatDoc.data();
        const customerCareId = chatData?.customerCareId || "admin";

        const msg = {
          id: messageId,
          chatId,
          senderId: customerCareId,
          senderName: "You",
          type: "voice",
          text: null,
          audioUrl: storeRelativeUrl(cmd.audioUrl), // Store only relative URL in Firebase
          mediaUrl: null, // Not used for voice
          duration: cmd.duration || null, // Use duration from command if available
          status: "sent",
          uploadProgress: 100,
          createdAt: nowMs,
        };
        console.log("audioUrl---------msg---------:", msg.audioUrl);
        await addDoc(collection(chatRef, "messages"), msg);
        await updateDoc(chatRef, { lastMessage: msg, updatedAt: nowMs });
      } else {
        startVoiceRecording();
      }
    }
    setShowSuggestions(false);
  };

  // Send Voice Message using your API
  const sendVoiceMessage = async () => {
    if (!audioBlob || !selectedUser || isSending) return;
    const nowMs = Date.now();
    const messageId = `${nowMs}${Math.floor(Math.random() * 1000)}`;
    const chatRef = doc(db, "chats", chatId);

    try {
      setIsSending(true);
      setIsUploading(true);
      setUploadProgress(0);

      // Use your existing API for file upload
      const formData = new FormData();
      formData.append("image", audioBlob, `voice_${messageId}.webm`);

      // Get URL from your API
      const fullUrl = resolveAudioUrl(await generateUrl(formData));
      const relativeUrl = storeRelativeUrl(await generateUrl(formData));
      console.log("Voice full URL:", fullUrl);
      console.log("Voice relative URL for storage:", relativeUrl);

      // Calculate duration from audio blob
      const audio = new Audio();
      const duration = await new Promise((resolve) => {
        audio.onloadedmetadata = () => {
          resolve(Math.round(audio.duration));
        };
        audio.onerror = () => {
          resolve(0); // Fallback if duration can't be calculated
        };
        audio.src = URL.createObjectURL(audioBlob);
      });

      // Get the current chat data to get customerCareId
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();
      const customerCareId = chatData?.customerCareId || "admin";

      const msg = {
        id: messageId,
        chatId,
        senderId: customerCareId,
        senderName: "You",
        type: "voice",
        text: null,
        audioUrl: relativeUrl, // Store only relative URL in Firebase
        mediaUrl: null, // Not used for voice
        fileName: `voice_${messageId}.webm`,
        fileSize: audioBlob.size,
        fileType: audioBlob.type,
        duration: duration, // Store actual duration
        status: "sent",
        uploadProgress: 100,
        createdAt: nowMs,
      };

      await addDoc(collection(chatRef, "messages"), msg);
      await updateDoc(chatRef, { lastMessage: msg, updatedAt: nowMs });

      setAudioBlob(null);
      setUploadProgress(0);
      setIsUploading(false);
    } catch (err) {
      console.error("Voice send error:", err);
      setIsUploading(false);
    } finally {
      setIsSending(false);
    }
  };

  // Send Text Message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    const nowMs = Date.now();
    const messageId = `${nowMs}${Math.floor(Math.random() * 1000)}`;
    const chatRef = doc(db, "chats", chatId);

    // Get the current chat data to get customerCareId
    const chatDoc = await getDoc(chatRef);
    const chatData = chatDoc.data();
    const customerCareId = chatData?.customerCareId || "admin";

    const msg = {
      id: messageId,
      chatId,
      senderId: customerCareId,
      senderName: "You",
      type: "text",
      text: newMessage,
      audioUrl: null,
      duration: null,
      status: "sending",
      uploadProgress: 1,
      createdAt: nowMs,
    };

    setNewMessage("");

    await addDoc(collection(chatRef, "messages"), msg);
    await updateDoc(chatRef, { lastMessage: msg, updatedAt: nowMs });
  };

  // Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") &&
        "audio/webm;codecs=opus";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: mime }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setIsListening(true);
    } catch (err) {
      setPermissionError(true);
    }
  };

  const stopVoiceRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
    setIsListening(false);
  };

  // Media playback controls
  const toggleAudioPlayback = (messageId) => {
    if (playingAudio === messageId) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(messageId);
    }
  };

  const toggleVideoPlayback = (messageId) => {
    if (playingVideo === messageId) {
      setPlayingVideo(null);
    } else {
      setPlayingVideo(messageId);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return <BsImage className="w-5 h-5" />;
    if (fileType.startsWith("video/"))
      return <BsCameraVideo className="w-5 h-5" />;
    if (fileType.startsWith("audio/")) return <IoMdMic className="w-5 h-5" />;
    return <BsFileEarmark className="w-5 h-5" />;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex justify-center items-center">
      <div className="flex h-[800px] w-[91%]  bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100">
        {/* Modern Sidebar */}
        <div className="w-90 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border-r border-yellow-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-yellow-400 to-amber-300 text-black">
            <h1 className="text-xl font-bold mb-2">Chat Dashboard</h1>
            <p className="text-gray-800 text-sm">
              {role === "subadmin" ? "Branch Management" : "Admin Panel"}
            </p>
          </div>

          {/* Search Bar */}
          <div className="p-4 bg-white/50 backdrop-blur-sm relative z-10">
            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-white/70 backdrop-blur-sm rounded-2xl border border-yellow-200 focus:ring-2  focus:ring-yellow-400 focus:border-transparent text-sm shadow-lg transition-all duration-300 placeholder-gray-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX size={16} />
                </button>
              )}
            </div>
            {/* Branch Filter for Admin */}
            {role !== "subadmin" && (
              <div className="mt-3">
                <Dropdown
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  options={[
                    { label: "All branches", value: "" },
                    ...allBranches.map((b) => ({
                      label: b.name || b.branchName || "Unnamed Branch",
                      value: b._id || b.id,
                    })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="p-2 space-y-2">
                {filteredUsers
                  .filter((user) => {
                    if (role === "subadmin") return true; // already filtered above
                    if (!selectedBranchId) return true;
                    const userBranch = user.customerCareId || user.branchId;
                    return userBranch === selectedBranchId;
                  })
                  .map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        // Only update if different user to prevent unnecessary re-renders
                        if (selectedUser?.id === user.id) return;

                        console.log("User clicked:", user.name);
                        setSelectedUser(user);
                        // Generate chat ID using user's customerCareId
                        const newChatId = `${user.id}_${user.customerCareId || "admin"
                          }`;
                        console.log("Setting chat ID:", newChatId);
                        setChatId(newChatId);
                      }}
                      className={`group flex items-center gap-5 p-5 cursor-pointer rounded-2xl mx-2 transition-all duration-300 hover:scale-[1.02] ${selectedUser?.id === user.id
                          ? "bg-gradient-to-r from-yellow-400 to-amber-300 text-black shadow-xl transform scale-[1.02]"
                          : "bg-white/60 hover:bg-white/80 hover:shadow-lg"
                        }`}
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative">
                        <div
                          className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-lg ${selectedUser?.id === user.id
                              ? "bg-black/20"
                              : "bg-gradient-to-br from-yellow-400 to-amber-300"
                            }`}
                        >
                          {user.name[0].toUpperCase()}
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-base font-semibold truncate ${selectedUser?.id === user.id
                                ? "text-black"
                                : "text-gray-800"
                              }`}
                          >
                            {user.name}
                          </p>
                          <span
                            className={`text-xs ${selectedUser?.id === user.id
                                ? "text-gray-700"
                                : "text-gray-500"
                              }`}
                          >
                            {user.updatedAt
                              ? new Date(user.updatedAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                              : ""}
                          </span>
                        </div>
                        {user.branchName && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 max-w-full text-[11px] font-medium text-yellow-900 border border-yellow-200 px-3 py-1 rounded-full shadow-sm">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                              <span className="truncate">
                                {user.branchName}
                              </span>
                            </span>
                          </div>
                        )}
                        <p
                          className={`text-sm truncate ${selectedUser?.id === user.id
                              ? "text-gray-700"
                              : "text-gray-500"
                            }`}
                        >
                          {user.lastMessage?.type === "voice"
                            ? "🎤 Voice message"
                            : user.lastMessage?.type === "image"
                              ? "📷 Image"
                              : user.lastMessage?.type === "video"
                                ? "🎥 Video"
                                : user.lastMessage?.text || "No messages"}
                        </p>
                      </div>

                      {/* Unread count */}
                      {user.unreadCount > 0 && (
                        <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-yellow-400 to-amber-300 text-black text-xs font-bold rounded-full shadow-lg animate-pulse">
                          {user.unreadCount > 99 ? "99+" : user.unreadCount}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <IoMdPerson size={48} className="mb-2 opacity-50" />
                <p className="text-sm">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Modern Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-white/80 to-yellow-50/80 backdrop-blur-xl shadow-lg border-b border-yellow-200">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-300 text-white flex items-center justify-center font-bold text-xl shadow-lg">
                      {selectedUser.name[0].toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {selectedUser.name}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowTransferModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-amber-300 text-black font-semibold rounded-xl hover:from-yellow-500 hover:to-amber-400 transition-all shadow-md text-sm whitespace-nowrap"
                  >
                    Transfer Appointment
                  </button>
                  <button className="p-3 rounded-full hover:bg-gray-100 transition-colors">
                    <BsThreeDotsVertical className="text-gray-600" size={20} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-yellow-50/30">
                {messagesError ? (
                  <div className="flex flex-col items-center justify-center h-full text-red-500">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <FiAlertCircle size={48} className="text-red-500" />
                    </div>
                    <p className="text-lg font-medium mb-2">
                      Error loading messages
                    </p>
                    <p className="text-sm text-center max-w-md">
                      {messagesError}
                    </p>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-sm">Loading messages...</p>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === selectedUser?.customerCareId
                            ? "justify-end"
                            : "justify-start"
                          }`}
                      >
                        <div
                          className={`group relative max-w-[75%] transition-all duration-300 ${msg.senderId === selectedUser?.customerCareId
                              ? "bg-gradient-to-r from-yellow-400 to-amber-300 text-black"
                              : "bg-white/80 backdrop-blur-sm text-gray-800"
                            } rounded-3xl shadow-lg hover:shadow-xl`}
                        >
                          {/* Message Content */}
                          <div className="p-4">
                            {msg.type === "voice" &&
                              (msg.audioUrl || msg.mediaUrl) ? (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleAudioPlayback(msg.id)}
                                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                  {playingAudio === msg.id ? (
                                    <IoMdPause size={20} />
                                  ) : (
                                    <IoMdPlay size={20} />
                                  )}
                                </button>
                                <div>
                                  <p className="text-sm font-medium">
                                    Voice Message
                                    {msg.duration && (
                                      <span className="text-xs opacity-75 ml-2">
                                        ({msg.duration}s)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs opacity-75">
                                    Tap to play
                                  </p>
                                </div>
                                {playingAudio === msg.id && (
                                  <audio
                                    src={resolveAudioUrl(
                                      msg.audioUrl || msg.mediaUrl
                                    )}
                                    autoPlay
                                    onEnded={() => setPlayingAudio(null)}
                                    className="hidden"
                                  />
                                )}
                              </div>
                            ) : msg.type === "video" &&
                              (msg.audioUrl || msg.mediaUrl) ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <video
                                    src={resolveAudioUrl(
                                      msg.audioUrl || msg.mediaUrl
                                    )}
                                    controls
                                    className="max-w-full max-h-64 rounded-2xl shadow-lg"
                                    poster={msg.thumbnail}
                                  />
                                </div>
                                {msg.fileName && (
                                  <p className="text-xs opacity-75 truncate">
                                    {msg.fileName}
                                  </p>
                                )}
                              </div>
                            ) : msg.type === "image" &&
                              (msg.audioUrl || msg.mediaUrl) ? (
                              <div className="space-y-2">
                                <img
                                  src={resolveAudioUrl(
                                    msg.audioUrl || msg.mediaUrl
                                  )}
                                  alt="Shared image"
                                  className="max-w-full max-h-64 rounded-2xl shadow-lg object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() =>
                                    window.open(
                                      resolveAudioUrl(
                                        msg.audioUrl || msg.mediaUrl
                                      ),
                                      "_blank"
                                    )
                                  }
                                />
                                {msg.fileName && (
                                  <p className="text-xs opacity-75 truncate">
                                    {msg.fileName}
                                  </p>
                                )}
                              </div>
                            ) : msg.type === "file" &&
                              (msg.audioUrl || msg.mediaUrl || msg.fileUrl) ? (
                              <div className="flex items-center gap-3 p-3 bg-white/20 rounded-2xl">
                                {getFileIcon(msg.fileType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {msg.fileName || "File"}
                                  </p>
                                  <p className="text-xs opacity-75">
                                    {formatFileSize(msg.fileSize)}
                                  </p>
                                </div>
                                <a
                                  href={
                                    msg.fileUrl ||
                                    resolveAudioUrl(
                                      msg.audioUrl || msg.mediaUrl
                                    )
                                  }
                                  download
                                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                >
                                  <BsDownload size={16} />
                                </a>
                              </div>
                            ) : (
                              <p className="text-sm break-words leading-relaxed">
                                {msg.text}
                              </p>
                            )}
                          </div>

                          {/* Message Footer */}
                          <div
                            className={`flex items-center justify-between px-4 pb-2 text-xs ${msg.senderId === selectedUser?.customerCareId
                                ? "text-gray-700"
                                : "text-gray-500"
                              }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <div className="flex items-center gap-1">
                              {msg.status === "sent" && (
                                <IoMdCheckmarkCircle size={14} />
                              )}
                              {msg.status === "delivered" && (
                                <IoMdCheckmarkCircle size={14} />
                              )}
                              {msg.status === "read" && (
                                <IoMdCheckmarkCircle
                                  size={14}
                                  className="text-gray-600"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-300 rounded-full flex items-center justify-center mb-4">
                      <IoMdChatbubbles size={48} className="text-black" />
                    </div>
                    <p className="text-lg font-medium mb-2">
                      Start a conversation
                    </p>
                    <p className="text-sm text-center max-w-md">
                      Send a message to {selectedUser.name} to begin your chat
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Modern Input Area */}
              <div className="p-6 bg-gradient-to-r from-white/80 to-yellow-50/80 backdrop-blur-xl border-t border-yellow-200">
                {/* Upload Progress */}
                {isUploading && (
                  <div className="mb-4 p-3 bg-yellow-100 rounded-2xl animate-fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                        <IoMdAttach className="text-white" size={16} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          Uploading file...
                        </p>
                        <div className="w-full bg-yellow-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-xs text-yellow-600 font-medium">
                        {Math.round(uploadProgress)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* File Options - Only Video and Image */}
                {showFileOptions && (
                  <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-yellow-200 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-yellow-50 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <BsImage className="text-yellow-600" size={32} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Image
                        </span>
                      </label>
                      <label className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-yellow-50 cursor-pointer transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center">
                          <BsCameraVideo className="text-amber-600" size={32} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          Video
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Main Input */}
                <div className="flex items-center gap-3">
                  {/* Voice Recording Button */}
                  <button
                    onClick={
                      recording ? stopVoiceRecording : startVoiceRecording
                    }
                    className={`p-4 rounded-2xl transition-all duration-300 ${recording
                        ? "bg-red-500 text-white animate-pulse shadow-lg"
                        : "bg-white/80 hover:bg-red-50 text-gray-600 hover:text-red-600 shadow-lg hover:shadow-xl"
                      }`}
                  >
                    {recording ? (
                      <IoMdPause size={24} />
                    ) : (
                      <IoMdMic size={24} />
                    )}
                  </button>

                  {/* File Upload Button */}
                  <button
                    onClick={() => setShowFileOptions(!showFileOptions)}
                    className="p-4 rounded-2xl bg-white/80 hover:bg-yellow-50 text-gray-600 hover:text-yellow-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <IoMdAttach size={24} />
                  </button>

                  {/* Message Input */}
                  <div className="relative flex-1">
                    <input
                      ref={messageInputRef}
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      className="w-full p-4 pr-12 rounded-2xl bg-white/80 backdrop-blur-sm border border-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm shadow-lg transition-all duration-300 placeholder-gray-500"
                    />

                    {/* Command Suggestions */}
                    {showSuggestions && (
                      <div className="absolute bottom-16 left-0 w-full bg-white/95 backdrop-blur-xl border border-yellow-200 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-10 animate-fade-in">
                        {filteredCommands.length > 0 ? (
                          filteredCommands.map((cmd, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSelectCommand(cmd)}
                              className="p-4 cursor-pointer hover:bg-yellow-50 transition-all duration-200 border-b last:border-none border-yellow-100"
                            >
                              <p className="font-medium text-sm text-gray-800 flex items-center gap-2">
                                {cmd.title} {cmd.type === "audio" && "🎤"}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {cmd.description}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="p-4 text-sm text-gray-500">
                            No matching commands
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={audioBlob ? sendVoiceMessage : sendMessage}
                    disabled={
                      isSending ||
                      (!audioBlob && !newMessage.trim()) ||
                      isUploading
                    }
                    className={`p-4 rounded-2xl text-black transition-all duration-300 shadow-lg hover:shadow-xl ${audioBlob
                        ? "bg-gradient-to-r from-yellow-400 to-amber-300 hover:from-yellow-500 hover:to-amber-400"
                        : newMessage.trim()
                          ? "bg-gradient-to-r from-yellow-400 to-amber-300 hover:from-yellow-500 hover:to-amber-400"
                          : "bg-gray-300 cursor-not-allowed"
                      }`}
                  >
                    {isSending ? (
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <IoMdSend size={24} />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-400 gap-6">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-amber-300 rounded-full flex items-center justify-center shadow-2xl">
                <IoMdChatbubbles size={64} className="text-black" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-600 mb-2">
                  Welcome to Chat
                </h3>
                <p className="text-lg text-gray-500 mb-4">
                  Select a user from the sidebar to start messaging
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full animate-pulse"></div>
                  <span>Ready to connect</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <TransferAppointmentModal 
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        selectedUser={selectedUser}
        allBranches={allBranches}
      />
    </div>
  );
}
