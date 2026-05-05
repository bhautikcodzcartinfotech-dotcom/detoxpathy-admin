"use client";
import React from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

const PartyTable = ({ parties, onEdit, onDelete, role, permissions }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-yellow-50 text-yellow-800 uppercase text-xs font-bold">

            <th className="p-4 border-b border-yellow-100">Name</th>
            <th className="p-4 border-b border-yellow-100">Mobile</th>
            <th className="p-4 border-b border-yellow-100">GSTIN</th>
            <th className="p-4 border-b border-yellow-100 text-center">Actions</th>
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
                      <button
                        onClick={() => onEdit(party)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <FiEdit2 size={16} />
                      </button>
                    )}
                    {(role === "Admin" || (role === "subadmin" && permissions?.includes("delete supplier"))) && (
                      <button
                        onClick={() => onDelete(party._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <FiTrash2 size={16} />
                      </button>
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
