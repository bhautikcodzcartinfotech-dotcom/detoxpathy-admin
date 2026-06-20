"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { getVideoByIdApi, API_HOST } from "@/Api/AllApi";
import { io } from "socket.io-client";
import { 
  FiMic, 
  FiMicOff, 
  FiVideo, 
  FiVideoOff, 
  FiPhoneOff, 
  FiUsers, 
  FiClock, 
  FiLayers,
  FiVideo as FiVideoIcon,
  FiInfo,
  FiVolume2
} from "react-icons/fi";

// Agora CDN Script URL
const AGORA_SCRIPT_SRC = "https://download.agora.io/sdk/release/AgoraRTC_N.js";

function VideoCallClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get("videoId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoDetails, setVideoDetails] = useState(null);

  // Call States
  const [joined, setJoined] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [remoteCount, setRemoteCount] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const localPreviewRef = useRef(null);
  const localActiveRef = useRef(null);
  const remoteVideoGridRef = useRef(null);
  const socketRef = useRef(null);
  const mutedUidsRef = useRef(new Set());
  const agoraSessionRef = useRef({
    client: null,
    localAudioTrack: null,
    localVideoTrack: null,
  });
  const agoraSdkPromiseRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Fetch Video details on mount
  useEffect(() => {
    // 1. Auth check
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to access the video room.");
      router.replace("/login");
      return;
    }

    if (!videoId) {
      setError("Video ID parameter is missing.");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        // This endpoint automatically refreshes the Agora token upon retrieval
        const data = await getVideoByIdApi(videoId);
        
        if (data.videoType !== 3 && data.type !== 10) {
          throw new Error("This video entry is not configured as an Agora call session.");
        }
        
        if (!data.agoraChannelName) {
          throw new Error("Agora Channel Name is not configured for this video.");
        }

        if (data.createdAt) {
          const createdAtTime = new Date(data.createdAt).getTime();
          const elapsedMs = Date.now() - createdAtTime;
          const limitMs = 40 * 60 * 1000;
          if (elapsedMs > limitMs) {
            throw new Error("This consultation session has expired (40-minute limit exceeded).");
          }
        }

        setVideoDetails(data);
      } catch (err) {
        console.error("Failed to load video details:", err);
        setError(err.message || "Failed to load video calling room credentials.");
        toast.error(err.message || "Failed to load video calling details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      cleanupAgoraSession();
    };
  }, [videoId]);

  // Handle local camera preview before joining
  useEffect(() => {
    if (videoDetails && !joined) {
      initLocalPreview();
    }
  }, [videoDetails, joined]);

  // Timer Effect
  useEffect(() => {
    if (joined && videoDetails) {
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);

        if (videoDetails.createdAt) {
          const createdAtTime = new Date(videoDetails.createdAt).getTime();
          const elapsedMs = Date.now() - createdAtTime;
          const limitMs = 40 * 60 * 1000;
          if (elapsedMs >= limitMs) {
            clearInterval(timerIntervalRef.current);
            toast.error("Session limit of 40 minutes reached. Disconnecting call...", { duration: 4000 });
            setTimeout(() => {
              handleLeaveCall();
            }, 3000);
          }
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setDuration(0);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [joined, videoDetails]);

  // Dynamic script loader for Agora SDK
  const ensureAgoraSdk = () => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Agora only works in the browser."));
    }

    // Check for Secure Context (HTTPS is required for getUserMedia)
    if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      const err = new Error("Camera/Microphone access requires HTTPS. Please ensure this app is run over HTTPS or localhost.");
      console.error("[AGORA] ❌ Secure context failed:", err);
      throw err;
    }

    if (window.AgoraRTC) {
      return Promise.resolve(window.AgoraRTC);
    }

    if (agoraSdkPromiseRef.current) {
      return agoraSdkPromiseRef.current;
    }

    agoraSdkPromiseRef.current = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = AGORA_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        console.log("[AGORA] SDK Loaded successfully from CDN");
        resolve(window.AgoraRTC);
      };
      script.onerror = (err) => {
        reject(new Error("Failed to load Agora video SDK from CDN. Please check your network connection."));
      };
      document.body.appendChild(script);
    });

    return agoraSdkPromiseRef.current;
  };

  // Setup Local Preview
  const initLocalPreview = async () => {
    try {
      const AgoraRTC = await ensureAgoraSdk();
      
      // Stop and close any previous local tracks
      if (agoraSessionRef.current.localVideoTrack) {
        try {
          agoraSessionRef.current.localVideoTrack.stop();
          agoraSessionRef.current.localVideoTrack.close();
        } catch {}
      }

      // Check support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support camera/microphone access.");
      }

      // Create video track only for preview
      const localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: "720p_1", // Medium resolution for preview
      });

      agoraSessionRef.current.localVideoTrack = localVideoTrack;

      // Play local preview
      if (localPreviewRef.current) {
        localPreviewRef.current.innerHTML = "";
        localVideoTrack.play(localPreviewRef.current, { fit: "cover" });
      }
    } catch (err) {
      console.warn("Could not start local camera preview:", err.message);
    }
  };

  // Join Call Session
  const handleJoinCall = async () => {
    if (!videoDetails) return;

    try {
      const AgoraRTC = await ensureAgoraSdk();

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      agoraSessionRef.current.client = client;

      // Remote User Published handler
      client.on("user-published", async (user, mediaType) => {
        try {
          await client.subscribe(user, mediaType);
          console.log("[AGORA] Subscribed to remote user:", user.uid, mediaType);

          if (mediaType === "video") {
            // Set stream quality (0 = high, 1 = low)
            client.setRemoteVideoStreamType(user.uid, 0);

            const remoteContainer = ensureRemoteTile(user.uid);
            if (remoteContainer) {
              remoteContainer.innerHTML = ""; // Clear loader/old video
              user.videoTrack.play(remoteContainer, { fit: "contain" });

              // Hide camera-off placeholder and show video body
              const tile = remoteVideoGridRef.current?.querySelector(`[data-uid="${user.uid}"]`);
              if (tile) {
                tile.setAttribute("data-video-enabled", "true");
                updateRemoteControlsUI(tile);
                const placeholder = tile.querySelector("[data-video-placeholder]");
                if (placeholder) placeholder.style.display = "none";
                const videoBody = tile.querySelector("[data-video-body]");
                if (videoBody) videoBody.style.display = "block";
              }
            }
          } else if (mediaType === "audio") {
            user.audioTrack.play();

            // Apply muted volume if the user is in our muted UIDs list
            const isMuted = mutedUidsRef.current.has(Number(user.uid));
            user.audioTrack.setVolume(isMuted ? 0 : 100);

            // Update mic status icon inside overlay label to active/muted
            const tile = remoteVideoGridRef.current?.querySelector(`[data-uid="${user.uid}"]`);
            if (tile) {
              tile.setAttribute("data-audio-enabled", isMuted ? "false" : "true");
              updateRemoteControlsUI(tile);
              const audioIndicator = tile.querySelector("[data-audio-indicator]");
              if (audioIndicator) {
                if (isMuted) {
                  audioIndicator.innerHTML = `
                    <svg class="w-3.5 h-3.5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  `;
                } else {
                  audioIndicator.innerHTML = `
                    <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  `;
                }
              }
            }
          }
        } catch (subError) {
          console.error("[AGORA] Subscription failed for uid:", user.uid, subError);
        }
        setRemoteCount(client.remoteUsers.length);
      });

      // Remote User Left handler
      client.on("user-left", (user) => {
        console.log("[AGORA] Remote user left:", user.uid);
        removeRemoteTile(user.uid);
        setRemoteCount(client.remoteUsers.length);
      });

      client.on("user-unpublished", (user, mediaType) => {
        console.log("[AGORA] Remote user unpublished:", user.uid, mediaType);
        if (mediaType === "video") {
          // Instead of removing tile, show placeholder
          const tile = remoteVideoGridRef.current?.querySelector(`[data-uid="${user.uid}"]`);
          if (tile) {
            tile.setAttribute("data-video-enabled", "false");
            updateRemoteControlsUI(tile);
            const placeholder = tile.querySelector("[data-video-placeholder]");
            if (placeholder) placeholder.style.display = "flex";
            const videoBody = tile.querySelector("[data-video-body]");
            if (videoBody) videoBody.style.display = "none";
          }
        } else if (mediaType === "audio") {
          // Update mic status icon inside overlay label to muted
          const tile = remoteVideoGridRef.current?.querySelector(`[data-uid="${user.uid}"]`);
          if (tile) {
            tile.setAttribute("data-audio-enabled", "false");
            updateRemoteControlsUI(tile);
            const audioIndicator = tile.querySelector("[data-audio-indicator]");
            if (audioIndicator) {
              audioIndicator.innerHTML = `
                <svg class="w-3.5 h-3.5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              `;
            }
          }
        }
        setRemoteCount(client.remoteUsers.length);
      });

      // Check if we have active local tracks, otherwise create them
      let localAudioTrack = agoraSessionRef.current.localAudioTrack;
      let localVideoTrack = agoraSessionRef.current.localVideoTrack;

      if (!localAudioTrack) {
        try {
          localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
          agoraSessionRef.current.localAudioTrack = localAudioTrack;
        } catch (audioErr) {
          console.error("Microphone track creation failed:", audioErr);
          toast.error("Could not capture microphone. You will join with video-only.");
        }
      }

      if (!localVideoTrack) {
        try {
          localVideoTrack = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1", // Standard HD quality for faster startup
          });
          agoraSessionRef.current.localVideoTrack = localVideoTrack;
        } catch (videoErr) {
          console.warn("Failed to create camera track with 720p config, trying default/auto resolution...", videoErr);
          try {
            localVideoTrack = await AgoraRTC.createCameraVideoTrack();
            agoraSessionRef.current.localVideoTrack = localVideoTrack;
          } catch (fallbackErr) {
            console.error("Camera track creation failed entirely:", fallbackErr);
            toast.error("Could not capture camera. Joining with audio-only.");
          }
        }
      }

      const appId = videoDetails.agoraAppId?.trim();
      const channelName = videoDetails.agoraChannelName?.trim();
      const token = videoDetails.agoraToken?.trim() || null;
      const uid = videoDetails.agoraUid || null;

      if (!appId || !channelName) {
        throw new Error("Agora server parameters are invalid. App ID and Channel are required.");
      }

      // Join the channel
      await client.join(appId, channelName, token, uid);
      console.log("[AGORA] Successfully joined channel:", channelName);

      // Publish local tracks
      const tracksToPublish = [];
      if (localAudioTrack) tracksToPublish.push(localAudioTrack);
      if (localVideoTrack) tracksToPublish.push(localVideoTrack);

      if (tracksToPublish.length > 0) {
        await client.publish(tracksToPublish);
        console.log("[AGORA] Published local tracks");
      }

      // Re-play local video in the floating PiP window
      setJoined(true);
      
      // Wait for DOM layout update, then render local track in overlay
      setTimeout(() => {
        if (localVideoTrack && localActiveRef.current) {
          localActiveRef.current.innerHTML = "";
          localVideoTrack.play(localActiveRef.current, { fit: "cover" });
        }
      }, 300);

      // Initialize Socket connection for remote device control
      try {
        const socketToken = localStorage.getItem("token");
        const socket = io(API_HOST, {
          auth: { token: socketToken }
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("[SOCKET] Connected successfully, joining room:", channelName);
          socket.emit("join_call_room", {
            channelName: channelName,
            uid: uid
          });
        });

        socket.on("device_controlled", async (data) => {
          const { targetUid, action, state } = data;
          console.log("[SOCKET] device_controlled event received:", data);
          
          if (Number(targetUid) === Number(uid)) {
            // Target is local user (ourselves)
            if (action === "audio") {
              const { localAudioTrack } = agoraSessionRef.current;
              if (localAudioTrack) {
                await localAudioTrack.setEnabled(state);
                setAudioEnabled(state);
                toast.success(state ? "Your microphone was unmuted by host" : "Your microphone was muted by host");
              }
            } else if (action === "video") {
              const { localVideoTrack } = agoraSessionRef.current;
              if (localVideoTrack) {
                await localVideoTrack.setEnabled(state);
                setVideoEnabled(state);
                toast.success(state ? "Your camera was enabled by host" : "Your camera was disabled by host");
              }
            }
          } else {
            // Target is remote user
            const tile = remoteVideoGridRef.current?.querySelector(`[data-uid="${targetUid}"]`);
            if (action === "audio") {
              if (state) {
                mutedUidsRef.current.delete(Number(targetUid));
              } else {
                mutedUidsRef.current.add(Number(targetUid));
              }
              
              const remoteUser = client.remoteUsers.find(u => u.uid === Number(targetUid));
              if (remoteUser && remoteUser.audioTrack) {
                remoteUser.audioTrack.setVolume(state ? 100 : 0);
              }
              
              // Update remote user's tile mic status icon in the UI
              if (tile) {
                tile.setAttribute("data-audio-enabled", String(state));
                updateRemoteControlsUI(tile);
                const audioIndicator = tile.querySelector("[data-audio-indicator]");
                if (audioIndicator) {
                  if (state) {
                    audioIndicator.innerHTML = `
                      <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    `;
                  } else {
                    audioIndicator.innerHTML = `
                      <svg class="w-3.5 h-3.5 text-red-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    `;
                  }
                }
              }
            } else if (action === "video") {
              // Update remote user's tile video status attributes and placeholders
              if (tile) {
                tile.setAttribute("data-video-enabled", String(state));
                updateRemoteControlsUI(tile);

                const placeholder = tile.querySelector("[data-video-placeholder]");
                const videoBody = tile.querySelector("[data-video-body]");

                if (state) {
                  if (placeholder) placeholder.style.display = "none";
                  if (videoBody) {
                    videoBody.style.display = "block";
                    const remoteUser = client.remoteUsers.find(u => u.uid === Number(targetUid));
                    if (remoteUser && remoteUser.videoTrack) {
                      videoBody.innerHTML = "";
                      remoteUser.videoTrack.play(videoBody, { fit: "contain" });
                    }
                  }
                } else {
                  if (placeholder) placeholder.style.display = "flex";
                  if (videoBody) videoBody.style.display = "none";
                  
                  const remoteUser = client.remoteUsers.find(u => u.uid === Number(targetUid));
                  if (remoteUser && remoteUser.videoTrack) {
                    remoteUser.videoTrack.stop();
                  }
                }
              }
            }
          }
        });

        socket.on("connect_error", (sErr) => {
          console.error("[SOCKET] Connection failed:", sErr);
        });
      } catch (sErr) {
        console.error("[SOCKET] Failed to initialize socket client:", sErr);
      }

      toast.success("Connected to Agora session room!");
    } catch (err) {
      console.error("[AGORA] Join room crash error:", err);
      toast.error(err.message || "Failed to establish Agora WebRTC call connection.");
      cleanupAgoraSession();
    }
  };

  const updateRemoteControlsUI = (tile) => {
    if (!tile) return;
    const audioEnabled = tile.getAttribute("data-audio-enabled") !== "false";
    const videoEnabled = tile.getAttribute("data-video-enabled") !== "false";

    const muteBtn = tile.querySelector("[data-control-mute]");
    if (muteBtn) {
      if (audioEnabled) {
        muteBtn.className = "w-9 h-9 rounded-xl bg-slate-900/60 hover:bg-red-600/90 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-white transition-all cursor-pointer shadow-md active:scale-95";
        muteBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        `;
        muteBtn.title = "Mute Remote Mic";
      } else {
        muteBtn.className = "w-9 h-9 rounded-xl bg-red-600 border border-red-500/50 flex items-center justify-center text-white transition-all cursor-pointer shadow-md active:scale-95";
        muteBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        `;
        muteBtn.title = "Unmute Remote Mic";
      }
    }

    const videoBtn = tile.querySelector("[data-control-video]");
    if (videoBtn) {
      if (videoEnabled) {
        videoBtn.className = "w-9 h-9 rounded-xl bg-slate-900/60 hover:bg-red-600/90 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-white transition-all cursor-pointer shadow-md active:scale-95";
        videoBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        `;
        videoBtn.title = "Stop Remote Video";
      } else {
        videoBtn.className = "w-9 h-9 rounded-xl bg-red-600 border border-red-500/50 flex items-center justify-center text-white transition-all cursor-pointer shadow-md active:scale-95";
        videoBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        `;
        videoBtn.title = "Start Remote Video";
      }
    }
  };

  // Tile Creators for Remote streams
  const ensureRemoteTile = (uid) => {
    if (!remoteVideoGridRef.current) return null;

    const existing = remoteVideoGridRef.current.querySelector(`[data-uid="${uid}"]`);
    if (existing) {
      return existing.querySelector("[data-video-body]") || existing;
    }

    // Create Tile Frame (with aspect-ratio and height bound constraints)
    const tile = document.createElement("div");
    tile.setAttribute("data-uid", String(uid));
    tile.className = "relative w-full aspect-video max-h-[60vh] md:max-h-[65vh] mx-auto bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl transition-all duration-300 transform hover:scale-[1.01]";
    
    // Strict dimension constraints enforced inline to prevent sizing breaking
    tile.style.width = "100%";
    tile.style.aspectRatio = "16 / 9";
    tile.style.maxHeight = "60vh";
    tile.style.position = "relative";
    tile.style.overflow = "hidden";
    tile.style.borderRadius = "1.5rem";

    tile.setAttribute("data-audio-enabled", "true");
    tile.setAttribute("data-video-enabled", "true");

    // Video Container inside Frame (hidden by default until video starts playing)
    const body = document.createElement("div");
    body.setAttribute("data-video-body", "true");
    body.className = "w-full h-full relative";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.position = "relative";
    body.style.display = "none";
    tile.appendChild(body);

    // Video Placeholder (when camera is off or not publishing yet)
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-video-placeholder", "true");
    placeholder.className = "absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-500 gap-3";
    placeholder.style.display = "flex";
    placeholder.innerHTML = `
      <svg class="w-12 h-12 text-slate-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
      <span class="text-xs font-semibold text-slate-400">Camera is off</span>
    `;
    tile.appendChild(placeholder);

    // Overlay Label
    const label = document.createElement("div");
    label.className = "absolute left-6 top-6 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 text-[11px] font-black tracking-wider text-white flex items-center gap-1.5 z-10 pointer-events-none";
    label.innerHTML = `
      <span class="size-2 bg-emerald-500 rounded-full animate-ping"></span> 
      Patient (UID: ${uid})
      <span class="ml-1 w-[1px] h-3.5 bg-slate-700/50"></span>
      <span data-audio-indicator="true" class="flex items-center">
        <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </span>
    `;
    tile.appendChild(label);

    // Controls Tray overlay for remote tile (allows host to mute patient or disable video)
    const controlsTray = document.createElement("div");
    controlsTray.className = "absolute right-6 top-6 flex items-center gap-2 z-20";

    // Mute Mic Button
    const muteBtn = document.createElement("button");
    muteBtn.setAttribute("data-control-mute", "true");
    
    muteBtn.onclick = () => {
      const currentAudio = tile.getAttribute("data-audio-enabled") !== "false";
      const nextAudio = !currentAudio;
      tile.setAttribute("data-audio-enabled", String(nextAudio));
      updateRemoteControlsUI(tile);

      if (socketRef.current && videoDetails) {
        socketRef.current.emit("control_device", {
          channelName: videoDetails.agoraChannelName,
          targetUid: Number(uid),
          action: "audio",
          state: nextAudio
        });
      }
      
      if (nextAudio) {
        toast.success("Sent request to unmute patient's microphone");
      } else {
        toast.success("Muted patient's microphone");
      }
    };

    // Mute Camera Button
    const videoBtn = document.createElement("button");
    videoBtn.setAttribute("data-control-video", "true");

    videoBtn.onclick = () => {
      const currentVideo = tile.getAttribute("data-video-enabled") !== "false";
      const nextVideo = !currentVideo;
      tile.setAttribute("data-video-enabled", String(nextVideo));
      updateRemoteControlsUI(tile);

      if (socketRef.current && videoDetails) {
        socketRef.current.emit("control_device", {
          channelName: videoDetails.agoraChannelName,
          targetUid: Number(uid),
          action: "video",
          state: nextVideo
        });
      }
      
      if (nextVideo) {
        toast.success("Sent request to turn on patient's video");
      } else {
        toast.success("Turned off patient's video");
      }
    };

    controlsTray.appendChild(muteBtn);
    controlsTray.appendChild(videoBtn);
    tile.appendChild(controlsTray);

    updateRemoteControlsUI(tile);

    remoteVideoGridRef.current.appendChild(tile);
    return body;
  };

  const removeRemoteTile = (uid) => {
    if (!remoteVideoGridRef.current) return;
    const tile = remoteVideoGridRef.current.querySelector(`[data-uid="${uid}"]`);
    if (tile) {
      tile.remove();
    }
  };

  // Clean up references
  const cleanupAgoraSession = async () => {
    const { client, localAudioTrack, localVideoTrack } = agoraSessionRef.current;

    if (localAudioTrack) {
      try {
        localAudioTrack.stop();
        localAudioTrack.close();
      } catch (err) {
        console.error("Mute Audio cleanup error:", err);
      }
    }

    if (localVideoTrack) {
      try {
        localVideoTrack.stop();
        localVideoTrack.close();
      } catch (err) {
        console.error("Mute Video cleanup error:", err);
      }
    }

    if (client) {
      try {
        await client.leave();
      } catch (err) {
        console.error("Agora client leave error:", err);
      }
    }

    agoraSessionRef.current = {
      client: null,
      localAudioTrack: null,
      localVideoTrack: null,
    };

    mutedUidsRef.current.clear();

    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (err) {
        console.error("Socket disconnect error:", err);
      }
      socketRef.current = null;
    }

    if (localPreviewRef.current) {
      localPreviewRef.current.innerHTML = "";
    }
    if (localActiveRef.current) {
      localActiveRef.current.innerHTML = "";
    }
    if (remoteVideoGridRef.current) {
      remoteVideoGridRef.current.innerHTML = "";
    }

    setJoined(false);
    setRemoteCount(0);
    setAudioEnabled(true);
    setVideoEnabled(true);
  };

  // Toggle Controls
  const toggleAudio = async () => {
    const { localAudioTrack } = agoraSessionRef.current;
    if (localAudioTrack) {
      try {
        const nextState = !audioEnabled;
        await localAudioTrack.setEnabled(nextState);
        setAudioEnabled(nextState);
        toast.success(nextState ? "Microphone active" : "Microphone muted");
      } catch (err) {
        toast.error("Failed to update microphone track state.");
      }
    } else {
      toast.error("No active microphone track detected.");
    }
  };

  const toggleVideo = async () => {
    const { localVideoTrack } = agoraSessionRef.current;
    if (localVideoTrack) {
      try {
        const nextState = !videoEnabled;
        await localVideoTrack.setEnabled(nextState);
        setVideoEnabled(nextState);
        toast.success(nextState ? "Camera active" : "Camera disabled");
      } catch (err) {
        toast.error("Failed to update camera track state.");
      }
    } else {
      toast.error("No active camera track detected.");
    }
  };

  const handleLeaveCall = async () => {
    await cleanupAgoraSession();
    toast.success("Left calling room.");
    // If it was opened in a new tab, close it. Otherwise redirect to admin panel
    if (window.history.length > 1) {
      router.back();
    } else {
      window.close();
    }
  };

  // Formatter for timer duration
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-6">
        <div className="relative size-16">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-sm font-black tracking-widest text-emerald-400 uppercase">FETCHING CALL ROOM</h2>
          <p className="text-xs text-slate-400">Loading Agora session metadata...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl border border-slate-700 p-8 text-center shadow-2xl">
          <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <FiPhoneOff size={28} />
          </div>
          <h2 className="text-xl font-bold mb-3">Room Setup Error</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => window.close()}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm px-6 py-3 rounded-2xl transition-all duration-300"
          >
            Close Call Tab
          </button>
        </div>
      </div>
    );
  }

  // Pre-join Screen (Pre-join state check)
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row items-center justify-center p-6 gap-8">
        
        {/* Camera Preview Card */}
        <div className="max-w-lg w-full aspect-video bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden shadow-2xl flex items-center justify-center">
          <div ref={localPreviewRef} className="absolute inset-0 w-full h-full z-0 relative overflow-hidden" />
          
          {/* Overlay info if track fails */}
          <div className="absolute inset-0 bg-slate-950/40 z-1 flex flex-col justify-end p-6">
            <div className="flex justify-between items-center bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-700/50 w-fit">
              <span className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold">
                <FiVolume2 className="text-emerald-400 animate-pulse" /> Camera Preview
              </span>
            </div>
          </div>

          {/* Fallback layout if video doesn't run */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3 pointer-events-none z-[-1]">
            <FiVideoIcon size={48} className="text-slate-700" />
            <p className="text-xs">No camera feed detected</p>
          </div>
        </div>

        {/* Join Panel details */}
        <div className="max-w-md w-full bg-slate-900 rounded-3xl border border-slate-800 p-8 shadow-2xl">
          <div className="flex items-center gap-2.5 text-emerald-400 font-black tracking-widest text-[11px] uppercase mb-2">
            <span className="size-2 bg-emerald-500 rounded-full animate-ping"></span>
            Agora Consultation Room
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 truncate">
            {videoDetails?.titleMultiLang?.english || videoDetails?.title || "Live Call Consultation"}
          </h1>
          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
            Please check your local video feed, adjust camera lighting, and ensure your microphone is enabled before joining the room.
          </p>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 space-y-3 mb-8 text-xs text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">Channel Name:</span>
              <span className="font-bold text-white truncate max-w-[180px]">{videoDetails?.agoraChannelName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Admin UID:</span>
              <span className="font-bold text-white">{videoDetails?.agoraUid || "Dynamic"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Token Status:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                Active <span className="size-1.5 bg-emerald-400 rounded-full"></span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleJoinCall}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm px-6 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              <FiVideo size={16} /> Join Consultation Call
            </button>
            
            <button
              onClick={() => window.close()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 rounded-2xl border border-slate-700/50 transition-all duration-300"
            >
              Cancel & Close
            </button>
          </div>
        </div>

      </div>
    );
  }

  // Active Calling Screen
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Dynamic Background Design Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* Floating Header */}
      <div className="absolute left-6 top-6 right-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-40">
        
        {/* Title Details */}
        <div className="bg-slate-900/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-800/80 shadow-xl flex items-center gap-4 max-w-sm md:max-w-md">
          <div className="size-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <FiLayers size={18} className="animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Consultation Session</p>
            <h2 className="text-sm font-bold text-slate-100 truncate">{videoDetails?.titleMultiLang?.english || videoDetails?.title || "Consultation Room"}</h2>
          </div>
        </div>

        {/* Dashboard Status Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-800/80 shadow-xl flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <FiClock className="text-slate-400 size-4" />
              <span>{formatTime(duration)}</span>
            </div>
            <div className="w-[1px] h-4 bg-slate-800"></div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <FiUsers className="text-emerald-400 size-4 animate-bounce" />
              <span className="font-bold text-white">{remoteCount + 1} participant(s)</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Video Stream Container */}
      <div className="flex-1 w-full flex items-center justify-center p-6 pt-28 pb-32">
        <div 
          ref={remoteVideoGridRef} 
          className={`w-full max-w-5xl grid gap-6 items-center justify-center transition-all duration-500 ${
            remoteCount === 0 ? "grid-cols-1" : remoteCount === 1 ? "grid-cols-1 max-w-4xl mx-auto" : "grid-cols-2"
          }`}
        >
          {/* Waiting screen if no patient joined */}
          {remoteCount === 0 && (
            <div className="w-full min-h-[50vh] max-w-3xl mx-auto bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-slate-800/60 shadow-2xl flex flex-col items-center justify-center text-center p-8 gap-6 animate-fade-in">
              <div className="relative size-24">
                {/* Radar effect */}
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping border border-emerald-500/20"></div>
                <div className="absolute inset-4 bg-emerald-500/20 rounded-full animate-pulse flex items-center justify-center border border-emerald-500/30">
                  <FiUsers size={28} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-wide text-slate-200">Waiting for patient to connect</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mt-2 leading-relaxed">
                  The session is open. Share the channel details with the patient so they can join the call.
                </p>
              </div>
              <div className="bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <FiInfo className="text-slate-500" /> Channel: <span className="text-emerald-400 font-bold">{videoDetails?.agoraChannelName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Picture-in-Picture Local Stream Overlay (Floating Overlay) */}
      <div className="absolute bottom-28 right-6 w-40 md:w-56 aspect-[3/4] bg-slate-900 rounded-3xl border-2 border-slate-700 overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.03] z-30">
        <div ref={localActiveRef} className="w-full h-full relative overflow-hidden" />
        <div className="absolute left-3 top-3 bg-black/55 backdrop-blur px-2.5 py-1 rounded-full text-[9px] font-bold text-slate-200 pointer-events-none border border-white/5">
          You
        </div>
        {!videoEnabled && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-600 gap-2">
            <FiVideoOff size={24} />
            <span className="text-[9px] font-semibold">Camera off</span>
          </div>
        )}
      </div>

      {/* Floating Toolbar Controls */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-center z-40">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 px-6 py-4.5 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex items-center gap-5 transition-all duration-300 hover:border-slate-700">
          
          {/* Audio toggle button */}
          <button
            onClick={toggleAudio}
            className={`size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 active:scale-95 ${
              audioEnabled
                ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
            }`}
            title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {audioEnabled ? <FiMic size={18} /> : <FiMicOff size={18} />}
          </button>

          {/* Video toggle button */}
          <button
            onClick={toggleVideo}
            className={`size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 active:scale-95 ${
              videoEnabled
                ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
            }`}
            title={videoEnabled ? "Stop Camera Feed" : "Start Camera Feed"}
          >
            {videoEnabled ? <FiVideo size={18} /> : <FiVideoOff size={18} />}
          </button>

          {/* Divider */}
          <div className="w-[1px] h-8 bg-slate-800 mx-1"></div>

          {/* End Call button */}
          <button
            onClick={handleLeaveCall}
            className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold size-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 transform hover:rotate-90 hover:scale-105"
            title="Leave calling room"
          >
            <FiPhoneOff size={18} />
          </button>

        </div>
      </div>

      {/* Strict local/remote Agora player sizing override rules */}
      <style>{`
        .agora_video_player {
          position: absolute !important;
          width: 100% !important;
          height: 100% !important;
          left: 0 !important;
          top: 0 !important;
          border-radius: 1.5rem !important;
          overflow: hidden !important;
        }
        .agora_video_player video {
          border-radius: 1.5rem !important;
        }
      `}</style>

    </div>
  );
}

export default function VideoCallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wider animate-pulse">LOADING VIDEO CALL ROOM...</p>
        </div>
      </div>
    }>
      <VideoCallClient />
    </Suspense>
  );
}
