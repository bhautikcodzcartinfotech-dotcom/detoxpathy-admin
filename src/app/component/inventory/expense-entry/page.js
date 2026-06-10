"use client";
import RoleGuard from "@/components/RoleGuard";
import ExpenseEntry from "../expenseEntry";

export default function Page() {
  return (
    <RoleGuard permission="manage expense entry">
      <ExpenseEntry />
    </RoleGuard>
  );
}
