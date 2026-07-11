"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import ThemedCheckbox from "@/components/ThemedCheckbox";

const Dropdown = ({
  label,
  options,
  value,
  onChange,
  onDelete,
  disabled = false,
  showCheckbox = false,
  showSearch = false,
  disabledValues = [],
  labelClassName = "text-gray-700",
  placeholder = "",
  menuMaxHeight = "320px",
  menuMinWidth,
  align = "left",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Calculate fixed position from trigger rect
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const minWidth = menuMinWidth
      ? Math.min(
          parseInt(menuMinWidth) || rect.width,
          viewportWidth - 24
        )
      : Math.max(rect.width, 220);

    const spaceBelow = viewportHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openBelow = spaceBelow >= 120 || spaceBelow >= spaceAbove;

    let left;
    if (align === "right") {
      // Anchor right edge of panel to right edge of trigger
      left = rect.right - minWidth;
    } else {
      // Anchor left edge of panel to left edge of trigger
      left = rect.left;
    }

    // Clamp so panel doesn't go off-screen
    left = Math.max(8, Math.min(left, viewportWidth - minWidth - 8));

    const style = {
      position: "fixed",
      left: `${left}px`,
      width: `${minWidth}px`,
      zIndex: 9999,
    };

    if (openBelow) {
      style.top = `${rect.bottom + 6}px`;
      style.maxHeight = menuMaxHeight;
    } else {
      style.bottom = `${viewportHeight - rect.top + 6}px`;
      style.maxHeight = `${Math.min(spaceAbove, 400)}px`;
    }

    setMenuStyle(style);
  }, [align, menuMaxHeight, menuMinWidth]);

  useEffect(() => {
    if (open) {
      calculatePosition();
    } else {
      setSearchTerm("");
    }
  }, [open, calculatePosition]);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!open) return;
    const handler = () => calculatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, calculatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      const clickedTrigger = triggerRef.current?.contains(event.target);
      const clickedMenu = menuRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = showSearch
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const menu = open && !disabled && (
    <div
      ref={menuRef}
      className="bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={menuStyle}
    >
      {showSearch && (
        <div className="p-3 border-b border-gray-50 bg-white/80 backdrop-blur-md flex-shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 bg-gray-50/50 transition-all"
              autoFocus
            />
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      )}
      <ul className="overflow-y-auto flex-1 py-1 custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt, idx) => {
            const isOptionDisabled = disabledValues.includes(opt.value);
            const isSelected = value === opt.value;
            return (
              <li
                key={idx}
                onClick={() => {
                  if (isOptionDisabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`px-4 py-3 transition-all flex items-center justify-between border-l-4 ${
                  isOptionDisabled
                    ? "opacity-30 cursor-not-allowed bg-gray-50 border-transparent"
                    : isSelected
                    ? "bg-amber-50 border-amber-500 text-amber-700 font-bold"
                    : "hover:bg-gray-50 border-transparent hover:border-gray-200 cursor-pointer text-gray-600"
                }`}
              >
                <span className="flex items-center gap-3 flex-grow min-w-0">
                  {showCheckbox && (
                    <ThemedCheckbox
                      checked={isSelected}
                      onChange={() => {}}
                      ariaLabel={`${label || "Option"} ${opt.label}`}
                      disabled={isOptionDisabled}
                    />
                  )}
                  <span className="text-sm leading-tight break-words">
                    {opt.label}
                  </span>
                </span>

                {onDelete && !/cash/i.test(opt.label || "") && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      onDelete(opt.value);
                    }}
                    className="text-gray-400 hover:text-red-600 ml-2 p-1 hover:bg-red-50 rounded-full flex-shrink-0"
                  >
                    <FiX size={16} />
                  </button>
                )}

                {!showCheckbox && !onDelete && isSelected && (
                  <div className="bg-amber-500 text-white p-1 rounded-full shadow-sm flex-shrink-0">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </li>
            );
          })
        ) : (
          <li className="p-8 text-center text-gray-400 text-sm">
            <div className="text-2xl mb-2">🔍</div>
            No matching results found
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="relative w-full">
      {label && (
        <label
          className={`block mb-1.5 font-bold text-sm tracking-wide ${labelClassName}`}
        >
          {label}
        </label>
      )}
      <div
        ref={triggerRef}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`w-full border rounded-xl p-3 flex justify-between items-center bg-white transition-all duration-300 ${
          open
            ? "border-amber-500 ring-4 ring-amber-500/5 shadow-lg"
            : "border-gray-200 hover:border-amber-500/50 shadow-sm"
        } ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`truncate mr-2 font-medium text-sm ${
            value ? "text-gray-900" : "text-gray-400"
          }`}
        >
          {selected ? selected.label : placeholder || `Select ${label || "Option"}`}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-300 ${
            open ? "rotate-180 text-amber-600" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {typeof window !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
};

import { FiX } from "react-icons/fi";
export default Dropdown;
