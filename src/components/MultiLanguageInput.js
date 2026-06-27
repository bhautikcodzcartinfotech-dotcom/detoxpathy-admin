"use client";
import React, { useState, useEffect, useCallback } from "react";

const MultiLanguageInput = ({
  label,
  icon,
  fields = ["english", "gujarati", "hindi"],
  values = {},
  onChange,
  errors = {},
  placeholder = {},
  type = "text",
  rows = 3,
  className = "",
  sectionClassName = "",
  showCopyCheckbox = true,
  copyCheckboxLabel = "Copy English to all languages",
  accept = "",
  defaultCopyChecked = false,
  existingUrls = {},
}) => {
  const [copyToAllLanguages, setCopyToAllLanguages] =
    useState(defaultCopyChecked);

  // Auto-resolve actual key from provided values by language suffix
  const resolveKeyFor = useCallback(
    (language) => {
      console.log("resolveKeyFor called:", {
        language,
        availableKeys: Object.keys(values),
        values,
      });

      // First try to find exact match
      if (Object.prototype.hasOwnProperty.call(values, language)) {
        console.log("Found exact match:", language);
        return language;
      }

      // Then try to find key ending with _language
      const suffixKey = Object.keys(values).find((k) =>
        k.endsWith(`_${language}`)
      );

      console.log("Found suffix key:", suffixKey);
      if (suffixKey) return suffixKey;

      // If no suffix key found, try to find key containing the language
      const containsKey = Object.keys(values).find(
        (k) => k.includes(`_${language}_`) || k.includes(`_${language}`)
      );

      console.log("Found contains key:", containsKey);
      if (containsKey) return containsKey;

      console.log("No key found, returning language:", language);
      return language;
    },
    [values]
  );

  // Clear auto-filled values when checkbox is unchecked
  useEffect(() => {
    if (!copyToAllLanguages) {
      // Clear auto-filled values by setting them to null/empty
      const newValues = { ...values };
      let hasChanges = false;

      fields.forEach((field) => {
        if (field !== "english") {
          const key = resolveKeyFor(field);
          if (key && newValues[key]) {
            newValues[key] = type === "file" ? null : "";
            hasChanges = true;
          }
        }
      });

      if (hasChanges) {
        onChange(newValues);
      }
    }
  }, [copyToAllLanguages]);

  const handleInputChange = (field, value) => {
    const key = resolveKeyFor(field);
    console.log("handleInputChange called:", { field, value, key, values });
    const newValues = { ...values, [key]: value };

    if (copyToAllLanguages && field === "english") {
      const gKey = resolveKeyFor("gujarati");
      const hKey = resolveKeyFor("hindi");
      newValues[gKey] = value;
      newValues[hKey] = value;
    }

    console.log("calling onChange with:", newValues);
    onChange(newValues);
  };

  // Handle checkbox change - copy English content to other languages when checked
  const handleCheckboxChange = (checked) => {
    setCopyToAllLanguages(checked);

    if (checked) {
      // When checking the box, copy English content to other languages
      const englishKey = resolveKeyFor("english");
      const englishValue = values[englishKey];

      if (englishValue) {
        const newValues = { ...values };
        fields.forEach((field) => {
          if (field !== "english") {
            const key = resolveKeyFor(field);
            newValues[key] = englishValue;
          }
        });
        onChange(newValues);
      }
    }
  };

  // Handle file input changes
  const handleFileChange = (field, file) => {
    const key = resolveKeyFor(field);
    const newValues = { ...values, [key]: file };

    if (copyToAllLanguages && field === "english") {
      const gKey = resolveKeyFor("gujarati");
      const hKey = resolveKeyFor("hindi");
      newValues[gKey] = file;
      newValues[hKey] = file;
    }

    console.log("handleFileChange:", {
      field,
      file,
      newValues,
      copyToAllLanguages,
    });
    onChange(newValues);
  };

  // Handle file checkbox change - copy English file to other languages when checked
  const handleFileCheckboxChange = (checked) => {
    setCopyToAllLanguages(checked);

    if (checked) {
      // When checking the box, copy English file to other languages
      const englishKey = resolveKeyFor("english");
      const englishFile = values[englishKey];

      if (englishFile) {
        const newValues = { ...values };
        fields.forEach((field) => {
          if (field !== "english") {
            const key = resolveKeyFor(field);
            newValues[key] = englishFile;
          }
        });
        onChange(newValues);
      }
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      english: "English",
      gujarati: "Gujarati",
      hindi: "Hindi",
    };
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

  const getFieldPlaceholder = (field) => {
    const placeholders = {
      english: `Enter ${label} in English`,
      gujarati: `Enter ${label} in Gujarati`,
      hindi: `Enter ${label} in Hindi`,
    };
    return placeholder[field] || placeholders[field];
  };

  const getFieldError = (field) => {
    const key = resolveKeyFor(field);
    if (key && errors[key]) return errors[key];
    const labelKey = label.toLowerCase().replace(/\s+/g, "_");
    const fallback = `${labelKey}_${field}`;
    return errors[fallback];
  };

  const getFieldValue = (field) => {
    const key = resolveKeyFor(field);
    const value = values[key];
    console.log("getFieldValue:", { field, key, value, values, type });

    // For file inputs, return the file object directly
    if (type === "file") {
      return value || null;
    }

    // For other inputs, ensure we always return a string to prevent controlled/uncontrolled warning
    if (value === null || value === undefined) {
      return "";
    }

    // If value is an object (not a file), convert to string
    if (typeof value === "object" && value !== null) {
      console.warn("Unexpected object value in non-file input:", value);
      return "";
    }

    return String(value);
  };

  const isFieldDisabled = (field) => {
    const disabled = copyToAllLanguages && field !== "english";
    console.log("isFieldDisabled:", { field, copyToAllLanguages, disabled });
    return disabled;
  };

  const getFieldClassName = (field) => {
    const baseClass =
      "w-full border rounded-lg p-3 focus:outline-none focus:ring-2 transition";
    const isDisabled = isFieldDisabled(field);

    if (isDisabled) {
      return `${baseClass} border-yellow-300 bg-yellow-50 focus:ring-yellow-400`;
    }

    return `${baseClass} border-yellow-400 focus:ring-yellow-400`;
  };

  const getSectionClassName = () => {
    const baseClass =
      "bg-gradient-to-r from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200";
    return `${baseClass} ${sectionClassName}`;
  };

  return (
    <div className={getSectionClassName()}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          {icon && (
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={icon}
              />
            </svg>
          )}
          {label}
        </h3>
        {showCopyCheckbox && (
          <label className="flex items-center cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={copyToAllLanguages}
                onChange={(e) => {
                  if (type === "file") {
                    handleFileCheckboxChange(e.target.checked);
                  } else {
                    handleCheckboxChange(e.target.checked);
                  }
                }}
                className="sr-only"
              />
              <div
                className={`w-6 h-6 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                  copyToAllLanguages
                    ? "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-500 shadow-lg shadow-yellow-200"
                    : "bg-white border-yellow-300 group-hover:border-yellow-400 group-hover:shadow-md"
                }`}
              >
                {copyToAllLanguages && (
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="ml-2 text-xs font-semibold text-gray-500 group-hover:text-amber-600 transition-colors">
              {copyCheckboxLabel}
            </span>
          </label>
        )}
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              {getFieldLabel(field)}
              {copyToAllLanguages && field !== "english" && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  Auto-filled
                </span>
              )}
            </label>

            {type === "textarea" ? (
              <textarea
                value={getFieldValue(field)}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className={getFieldClassName(field)}
                rows={rows}
                placeholder={getFieldPlaceholder(field)}
                disabled={isFieldDisabled(field)}
              />
            ) : type === "file" ? (
              <div className="relative">
                <input
                  key={`${field}-${
                    copyToAllLanguages ? "auto-filled" : "manual"
                  }`}
                  type="file"
                  accept={accept}
                  onChange={(e) =>
                    handleFileChange(field, e.target.files?.[0] || null)
                  }
                  className={`${getFieldClassName(field)} bg-white`}
                  disabled={isFieldDisabled(field)}
                />
                {getFieldValue(field) && (
                  <div
                    className={`mt-2 text-sm p-2 rounded border ${
                      copyToAllLanguages && field !== "english"
                        ? "text-yellow-700 bg-yellow-50 border-yellow-200"
                        : "text-gray-600 bg-gray-50 border-gray-200"
                    }`}
                  >
                    {copyToAllLanguages && field !== "english"
                      ? "Auto-filled: "
                      : "Selected: "}
                    {(() => {
                      const fieldValue = getFieldValue(field);
                      if (
                        typeof fieldValue === "object" &&
                        fieldValue !== null &&
                        fieldValue.name
                      ) {
                        return fieldValue.name;
                      }
                      return String(fieldValue || "");
                    })()}
                  </div>
                )}
                {!getFieldValue(field) && existingUrls && existingUrls[field] && (
                  <div className="mt-2 text-sm p-2 rounded border text-teal-700 bg-teal-50 border-teal-200 flex items-center justify-between">
                    <span className="truncate">
                      Existing File: <span className="font-semibold text-gray-700">{existingUrls[field].split('/').pop()}</span>
                    </span>
                    <a
                      href={existingUrls[field]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg font-bold transition ml-2 shrink-0 shadow-sm"
                    >
                      View
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <input
                type={type}
                value={(() => {
                  const fieldValue = getFieldValue(field);
                  if (typeof fieldValue === "object" && fieldValue !== null) {
                    console.warn(
                      "Attempting to render object as input value:",
                      fieldValue
                    );
                    return "";
                  }
                  return fieldValue;
                })()}
                onChange={(e) => {
                  console.log("Input onChange triggered:", {
                    field,
                    value: e.target.value,
                    disabled: isFieldDisabled(field),
                  });
                  handleInputChange(field, e.target.value);
                }}
                onFocus={(e) =>
                  console.log("Input focused:", {
                    field,
                    value: e.target.value,
                  })
                }
                onBlur={(e) =>
                  console.log("Input blurred:", {
                    field,
                    value: e.target.value,
                  })
                }
                onClick={(e) =>
                  console.log("Input clicked:", {
                    field,
                    value: e.target.value,
                  })
                }
                onMouseDown={(e) =>
                  console.log("Input mouse down:", {
                    field,
                    value: e.target.value,
                  })
                }
                className={getFieldClassName(field)}
                placeholder={getFieldPlaceholder(field)}
                disabled={isFieldDisabled(field)}
                style={{ pointerEvents: "auto" }}
              />
            )}

            {getFieldError(field) && (
              <p className="text-amber-600 text-sm mt-1">
                {getFieldError(field)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiLanguageInput;
