"use client";
import React, { useEffect, useState } from "react";
import TimeButton from "@/utils/timebutton";
import { Button } from "@/utils/header";

const FaqForm = ({
  onSubmit,
  onCancel,
  loading,
  initialValues = null,
  submitLabel = "Create",
}) => {
  const [form, setForm] = useState({
    question: "",
    answer: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialValues) {
      setForm({
        question: initialValues.question || "",
        answer: initialValues.answer || "",
      });
    } else {
      setForm({
        question: "",
        answer: "",
      });
    }
  }, [initialValues]);

  const validate = () => {
    const errs = {};
    if (!form.question.trim()) errs.question = "Question is required";
    if (!form.answer.trim()) errs.answer = "Answer is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block mb-1 font-semibold text-gray-700">Question</label>
        <input
          type="text"
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
          placeholder="Enter question"
        />
        {errors.question && (
          <p className="text-amber-600 text-sm mt-1">{errors.question}</p>
        )}
      </div>

      <div>
        <label className="block mb-1 font-semibold text-gray-700">Answer</label>
        <textarea
          value={form.answer}
          onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
          className="w-full border border-yellow-400 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition min-h-[150px]"
          placeholder="Enter answer"
        />
        {errors.answer && (
          <p className="text-amber-600 text-sm mt-1">{errors.answer}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onCancel} type="button">
          Cancel
        </Button>
        <TimeButton loading={loading}>{submitLabel}</TimeButton>
      </div>
    </form>
  );
};

export default FaqForm;
