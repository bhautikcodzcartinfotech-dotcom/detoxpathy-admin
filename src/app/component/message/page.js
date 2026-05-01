"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getCommands,
  createCommand,
  updateCommand,
  deleteCommand,
  approveCommand,
} from "../../../Api/AllApi";

import CommandTable from "./commandTable";
import CommandForm from "./commandForm";
import FormaAnimation from "../../../utils/formanimation";
import { Button, Header } from "@/utils/header";
import toast from "react-hot-toast";
import Loader from "@/utils/loader";

const CommandPage = () => {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState(null);
  const { role, user } = useAuth();
  const currentAdminId = user?._id || user?.id || null;

  const fetchCommands = async () => {
    setLoading(true);
    try {
      const data = await getCommands();
      setCommands(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingCommand) {
        await updateCommand(editingCommand._id, formData);
        toast.success("Command updated successfully!");
      } else {
        await createCommand(formData);
        toast.success("Command created successfully!");
      }
      fetchCommands();
    } catch (err) {
      console.error(err);
      toast.error("Error saving command");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCommand(id); // API call
      setCommands((prev) => prev.filter((c) => c._id !== id));
      toast.success("Command deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete command");
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveCommand(id);
      toast.success("Command approved!");
      fetchCommands();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve command");
    }
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  return (
    <div className="px-18 py-6">
      <div className="flex justify-between items-center mb-6">
        <Header size="3xl">Quick Replies</Header>
        <Button
          onClick={() => {
            setEditingCommand(null);
            setDrawerOpen(true);
          }}
        >
          + Create
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader />
        </div>
      ) : (
        <CommandTable
          commands={commands}
          currentRole={role}
          currentAdminId={currentAdminId}
          onEdit={(cmd) => {
            // Guard: subadmin may only edit own commands
            if (
              role === "subadmin" &&
              String(cmd.createdBy) !== String(currentAdminId)
            ) {
              return;
            }
            setEditingCommand(cmd);
            setDrawerOpen(true);
          }}
          onDelete={async (id) => {
            const cmd = commands.find((c) => c._id === id);
            if (
              cmd &&
              role === "subadmin" &&
              String(cmd.createdBy) !== String(currentAdminId)
            ) {
              return;
            }
            await handleDelete(id);
          }}
          onApprove={handleApprove}
        />
      )}

      <FormaAnimation isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <CommandForm
          initialData={editingCommand}
          onSubmit={handleSubmit}
          onClose={() => setDrawerOpen(false)}
        />
      </FormaAnimation>
    </div>
  );
};

export default CommandPage;
