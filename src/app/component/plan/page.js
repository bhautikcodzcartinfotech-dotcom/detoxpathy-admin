"use client";
import { useEffect, useState } from "react";
import {
  getAllPlans,
  createPlanApi,
  updatePlanById,
  deletePlanById,
} from "@/Api/AllApi";
import PlanTable from "./planTable";
import PlanForm from "./planForm";
import FormaAnimation from "@/utils/formanimation";
import { Button, Header } from "@/utils/header";
import toast from "react-hot-toast";
import Loader from "@/utils/loader";

const PlanPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await getAllPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);
      if (editingPlan) {
        await updatePlanById(editingPlan._id, formData);
        toast.success("Plan updated successfully!");
      } else {
        await createPlanApi(formData);
        toast.success("Plan created successfully!");
      }
      fetchPlans();
      setDrawerOpen(false);
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      toast.error("Error saving plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePlanById(id);
      setPlans((prev) => prev.filter((p) => p._id !== id));
      toast.success("Plan deleted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete plan");
    }
  };

  return (
    <div className="w-full h-full px-8 lg:px-12 py-6 bg-gray-50/50">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <Header size="4xl">Membership Plans</Header>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Define program durations, pricing, and benefits</p>
        </div>
        <Button
          onClick={() => {
            setEditingPlan(null);
            setDrawerOpen(true);
          }}
        >
          Create New Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader />
        </div>
      ) : (
        <PlanTable
          plans={plans}
          onEdit={(p) => {
            setEditingPlan(p);
            setDrawerOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      <FormaAnimation isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <PlanForm
          initialData={editingPlan}
          onSubmit={handleSubmit}
          onClose={() => setDrawerOpen(false)}
          loading={saving}
          title="Plan"
          submitLabel={editingPlan ? "Update" : "Create"}
        />
      </FormaAnimation>
    </div>
  );
};

export default PlanPage;
