"use client";

import React, { useEffect, useRef, useState } from "react";
import { getSetting } from "@/Api/AllApi";

const OVERLAY_HIDDEN = { visible: false, title: "", message: "" };

const OVERLAY_SCREENSHOT = {
  visible: true,
  title: "Screen Capture Blocked",
  message: "Unauthorized screen capture is restricted on this portal.",
};
const OVERLAY_SNIP = {
  visible: true,
  title: "Snipping Tool Blocked",
  message: "Screen snipping is restricted on this portal.",
};
const OVERLAY_FOCUS = {
  visible: true,
  title: "Security Protection Active",
  message:
    "Dashboard is hidden while focus is outside this window to prevent screen capture.",
};
const OVERLAY_PRINT = {
  visible: true,
  title: "Print Blocked",
  message: "Page printing is restricted on this portal.",
};
const OVERLAY_DEVTOOLS = {
  visible: true,
  title: "Inspector Blocked",
  message: "Developer tools access is restricted on this portal.",
};
const OVERLAY_MAC = {
  visible: true,
  title: "Screen Capture Blocked",
  message: "Native screenshot tools are restricted on this portal.",
};

export default function SecurityGuard({ children }) {
  const [isActive, setIsActive] = useState(true);
  // Single state object → one re-render per activation instead of three.
  const [overlay, setOverlay] = useState(OVERLAY_HIDDEN);

  // Ref to cancel any pending fade-out so a fast re-activation never races
  // against a deactivation setTimeout that would hide the overlay again.
  const deactivateTimerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load screenshot protection toggle from API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await getSetting();
        const data = res?.data || res?.setting || res;
        if (data) {
          const isProtectionActive = typeof data.screenshotProtectionActive !== "undefined"
            ? data.screenshotProtectionActive
            : true;
          setIsActive(isProtectionActive);
        }
      } catch (e) {
        console.error("SecurityGuard: failed to load settings", e);
      }
    };
    loadSettings();
  }, []);

  const clearClipboard = async () => {
    try {
      if (typeof window === "undefined" || !navigator.clipboard) return;

      if (navigator.clipboard.write) {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, 1, 1);
          
          const blobPromise = new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/png");
          });
          
          const item = new ClipboardItem({ "image/png": blobPromise });
          await navigator.clipboard.write([item]);
        }
      } else if (navigator.clipboard.writeText) {
        await navigator.clipboard.writeText("Screen capture restricted.");
      }
    } catch (err) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText("Screen capture restricted.");
        }
      } catch (e) {
        // Silently ignore clipboard write failures when document is not focused
      }
    }
  };

  const showShield = (overlayPreset) => {
    if (deactivateTimerRef.current) {
      clearTimeout(deactivateTimerRef.current);
      deactivateTimerRef.current = null;
    }
    setOverlay({ ...overlayPreset, visible: true });
  };

  const hideShield = () => {
    if (deactivateTimerRef.current) {
      clearTimeout(deactivateTimerRef.current);
    }
    setOverlay(prev => ({ ...prev, visible: false }));
  };

  // ---------------------------------------------------------------------------
  // Main event handler block
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isActive) return;

    const activeKeys = new Set();
    let lastAltKeydownTime = 0;
    let lastMetaKeydownTime = 0;
    let lastPrintScreenTime = 0;

    // Trigger clipboard poison cascade
    const triggerClipboardPoison = () => {
      clearClipboard();
      setTimeout(clearClipboard, 50);
      setTimeout(clearClipboard, 150);
      setTimeout(clearClipboard, 300);
      setTimeout(clearClipboard, 500);
    };

    // ── keydown ──────────────────────────────────────────────────────────────
    const onKeyDown = (e) => {
      activeKeys.add(e.key);
      activeKeys.add(e.code);

      if (e.key === "Alt") lastAltKeydownTime = Date.now();
      if (e.key === "Meta" || e.key === "OS") lastMetaKeydownTime = Date.now();

      // PrintScreen
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        lastPrintScreenTime = Date.now();
        showShield(OVERLAY_SCREENSHOT);
        triggerClipboardPoison();
        return false;
      }

      // Win+Shift or Cmd+Shift — preemptively hide before the user even presses S.
      const isMetaHeld = e.metaKey || e.key === "Meta" || e.key === "OS";
      if ((isMetaHeld && e.shiftKey) || (e.key === "Shift" && e.metaKey)) {
        showShield(OVERLAY_SNIP);
        triggerClipboardPoison();
      }

      // Win+Shift+S / Ctrl+Shift+S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        showShield(OVERLAY_SNIP);
        triggerClipboardPoison();
        return false;
      }

      // Mac Cmd+Shift+3/4/5
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
        e.preventDefault();
        showShield(OVERLAY_MAC);
        triggerClipboardPoison();
        return false;
      }

      // Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        showShield(OVERLAY_PRINT);
        return false;
      }

      // DevTools: F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U, Cmd+Opt+I/J/C
      const isDevTools =
        e.key === "F12" ||
        e.keyCode === 123 ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey &&
          ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
        ((e.ctrlKey || e.metaKey) && (e.key === "u" || e.key === "U")) ||
        (e.metaKey && e.altKey && ["i", "I", "j", "J", "c", "C"].includes(e.key));

      if (isDevTools) {
        e.preventDefault();
        showShield(OVERLAY_DEVTOOLS);
        return false;
      }
    };

    // ── keyup ────────────────────────────────────────────────────────────────
    const onKeyUp = (e) => {
      activeKeys.delete(e.key);
      activeKeys.delete(e.code);

      if (e.key === "PrintScreen" || e.keyCode === 44) {
        lastPrintScreenTime = Date.now();
        showShield(OVERLAY_SCREENSHOT);
        triggerClipboardPoison();
      }
    };

    // ── blur ─────────────────────────────────────────────────────────────────
    const onBlur = () => {
      const shiftHeld = activeKeys.has("Shift");
      const altHeld   = activeKeys.has("Alt");
      const metaHeld  = activeKeys.has("Meta") || activeKeys.has("OS");
      const ctrlHeld  = activeKeys.has("Control");
      const now       = Date.now();

      // PrintScreen: always show shield and poison if pressed in last 2 s.
      if (now - lastPrintScreenTime < 2000) {
        showShield(OVERLAY_SCREENSHOT);
        triggerClipboardPoison();
        return;
      }

      // Single Win key → Start menu opens → skip shield.
      const isSingleMeta = metaHeld && !shiftHeld && !ctrlHeld && !altHeld;
      // Single Alt key → taskbar / menu bar → skip shield.
      const isSingleAlt  = altHeld  && !shiftHeld && !ctrlHeld && !metaHeld;

      // Rapid tap: keyup fired before blur — use 400 ms timestamp window.
      const wasQuickMeta = !shiftHeld && !ctrlHeld && !altHeld &&
        (now - lastMetaKeydownTime) < 400;
      const wasQuickAlt  = !shiftHeld && !ctrlHeld && !metaHeld &&
        (now - lastAltKeydownTime) < 400;

      if (isSingleMeta || isSingleAlt || wasQuickMeta || wasQuickAlt) {
        return; // Single modifier key — do NOT show shield
      }

      // If blur happened while modifier keys are held, poison the clipboard
      if (shiftHeld || metaHeld || ctrlHeld) {
        triggerClipboardPoison();
      }

      // Everything else (Win+Shift+S, clicking another app, Alt+Tab, etc.)
      showShield(OVERLAY_FOCUS);
    };

    // ── focus ────────────────────────────────────────────────────────────────
    const onFocus = () => {
      activeKeys.clear();
      hideShield();
    };

    // ── visibilitychange ─────────────────────────────────────────────────────
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        showShield(OVERLAY_FOCUS);
      } else {
        hideShield();
      }
    };

    // ── context menu ─────────────────────────────────────────────────────────
    const onContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup",   onKeyUp,   true);
    window.addEventListener("blur",    onBlur);
    window.addEventListener("focus",   onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("contextmenu",      onContextMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup",   onKeyUp,   true);
      window.removeEventListener("blur",    onBlur);
      window.removeEventListener("focus",   onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("contextmenu",      onContextMenu);
    };
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isActive) return <>{children}</>;

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh", userSelect: "none" }}>
      {/* Print protection */}
      <style jsx global>{`
        @media print {
          body, html { display: none !important; visibility: hidden !important; }
        }
        * { user-select: none !important; -webkit-user-select: none !important; }
      `}</style>

      {/* Protected content */}
      <div
        id="security-protected-content"
        style={{
          filter: overlay.visible ? "blur(80px)" : "none",
          opacity: overlay.visible ? 0 : 1,
          pointerEvents: overlay.visible ? "none" : "auto",
          transition: "filter 0.25s ease, opacity 0.25s ease"
        }}
      >
        {children}
      </div>

      {/* ── Security overlay ──────────────────────────────────────────────── */}
      <div
        id="security-guard-overlay"
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          99999,
          display:         "flex",
          opacity:         overlay.visible ? 1 : 0,
          transition:      "opacity 0.25s ease",
          backgroundColor: "#09090b",
          flexDirection:   "column",
          alignItems:      "center",
          justifyContent:  "center",
          pointerEvents:   overlay.visible ? "auto" : "none",
        }}
      >
        <div
          style={{
            maxWidth:       420,
            width:          "100%",
            padding:        "2rem",
            borderRadius:   "2rem",
            background:     "linear-gradient(to bottom, rgba(31,41,55,0.9), rgba(17,24,39,0.98))",
            border:         "1px solid rgba(255,255,255,0.08)",
            boxShadow:      "0 25px 50px rgba(0,0,0,0.8)",
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            textAlign:      "center",
            gap:            "1.5rem",
          }}
        >
          {/* Shield icon */}
          <div
            style={{
              width:          80,
              height:         80,
              borderRadius:   "1.5rem",
              background:     "rgba(245,158,11,0.08)",
              border:         "1px solid rgba(245,158,11,0.25)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          "#f59e0b",
            }}
          >
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div>
            <h2
              id="security-guard-title"
              style={{
                fontSize:               "1.5rem",
                fontWeight:             900,
                background:             "linear-gradient(to right, #facc15, #f59e0b)",
                WebkitBackgroundClip:   "text",
                WebkitTextFillColor:    "transparent",
                marginBottom:           "0.5rem",
              }}
            >
              {overlay.title}
            </h2>
            <p
              id="security-guard-message"
              style={{ fontSize: "0.875rem", color: "#d1d5db", lineHeight: 1.6, padding: "0 1rem" }}
            >
              {overlay.message}
            </p>
          </div>

          <div style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "0.375rem",
            padding:        "0.25rem 0.75rem",
            background:     "rgba(234,179,8,0.08)",
            border:         "1px solid rgba(234,179,8,0.2)",
            color:          "#eab308",
            borderRadius:   9999,
            fontSize:       "0.65rem",
            fontWeight:     900,
            letterSpacing:  "0.1em",
            textTransform:  "uppercase",
          }}>
            <span style={{
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   "#eab308",
              display:      "inline-block",
            }} />
            Portal Guard Active
          </div>
        </div>
      </div>
    </div>
  );
}
