"use client";
import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { ActionButton } from "@/utils/actionbutton";

const PartyTable = ({ parties, onEdit, onDelete, role, permissions }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-gray-200">
      <table className="w-full text-left divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-yellow-400 to-amber-300">
          <tr className="text-[11px] uppercase tracking-widest text-gray-700">
            <th className="px-6 py-3 font-black">Name</th>
            <th className="px-6 py-3 font-black">Mobile</th>
            <th className="px-6 py-3 font-black">GSTIN</th>
            <th className="px-6 py-3 text-center font-black">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {parties.length === 0 ? (
            <tr>
              <td colSpan="4" className="p-8 text-center text-gray-400">
                No records found.
              </td>
            </tr>
          ) : (
            parties.map((party) => (
              <tr key={party._id} className="hover:bg-gray-50 transition">

                <td className="p-4 font-medium text-gray-700">{party.name}</td>
                <td className="p-4 text-gray-600">{party.mobile}</td>
                <td className="p-4 text-gray-600">{party.gstin || "-"}</td>
                <td className="p-4">
                  <div className="flex justify-center gap-2">
                    {(role === "Admin" || (role === "subadmin" && permissions?.includes("edit supplier"))) && (
                      <ActionButton type="edit" onClick={() => onEdit(party)} />
                    )}
                    {(role === "Admin" || (role === "subadmin" && permissions?.includes("delete supplier"))) && (
                      <ActionButton type="delete" onClick={() => onDelete(party._id)} />
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PartyTable;
