"use client";
import { useState, useRef, useEffect } from "react";
import ThemedCheckbox from "@/components/ThemedCheckbox";

const Dropdown = ({
  label,
  options,
  value,
  onChange,
  disabled = false,
  showCheckbox = false,
  showSearch = false,
  disabledValues = [], // Array of values that should be disabled
  labelClassName = "text-gray-700",
  placeholder = "",
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearchTerm("");
  }, [open]);

  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = showSearch
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className={`block mb-1 font-semibold ${labelClassName}`}>
          {label}
        </label>
      )}
      <div
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={`w-full border border-yellow-400 rounded-xl p-3 flex justify-between items-center bg-white focus-within:ring-2 focus-within:ring-yellow-400 transition ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-gray-100"
            : "cursor-pointer"
        }`}
      >
        <span className={`truncate mr-2 ${value ? "text-gray-900" : "text-gray-400"}`}>
          {selected ? selected.label : (placeholder || `Select ${label || "Option"}`)}
        </span>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {open && !disabled && (
        <div className="absolute z-[999] w-full mt-2 bg-white border border-emerald-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[320px]">
          {showSearch && (
            <div className="p-3 border-b border-gray-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 transition-all"
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
                        ? "opacity-40 cursor-not-allowed bg-gray-50 border-transparent"
                        : isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold"
                        : "hover:bg-gray-50 border-transparent hover:border-emerald-200 cursor-pointer text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {showCheckbox && (
                        <ThemedCheckbox
                          checked={isSelected}
                          onChange={() => {}}
                          ariaLabel={`${label || "Option"} ${opt.label}`}
                          disabled={isOptionDisabled}
                        />
                      )}
                      <span className="text-sm leading-tight">
                        {opt.label}
                      </span>
                    </span>
                    {!showCheckbox && isSelected && (
                      <div className="bg-emerald-500 text-white p-1 rounded-full shadow-sm animate-in zoom-in duration-300">
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
      )}
    </div>
  );
};

export default Dropdown;
