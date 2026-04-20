"use client";
import React, { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import { Header, Button } from "@/utils/header";
import Drawer from "@/utils/formanimation";
import toast from "react-hot-toast";
import {
  getMasterStock,
  getBranchStocks,
  getAllBranches,
  addOrUpdateStock,
  getAllProducts,
  getAllPlans,
  getStockHistory,
} from "@/Api/AllApi";
import MasterStockTable from "./masterStockTable";
import BranchStockTable from "./branchStockTable";
import StockHistoryTable from "./stockHistoryTable";
import StockForm from "./stockForm";

const StockManagementPage = () => {
  const [masterStocks, setMasterStocks] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [history, setHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [masterData, branchStockData, branchData, productData, planData, historyData] = await Promise.all([
        getMasterStock(),
        getBranchStocks(),
        getAllBranches(),
        getAllProducts({ start: 1, limit: 1000 }),
        getAllPlans(),
        getStockHistory(),
      ]);

      setMasterStocks(Array.isArray(masterData) ? masterData : []);
      setBranchStocks(Array.isArray(branchStockData) ? branchStockData : []);
      setBranches(Array.isArray(branchData) ? branchData : []);
      setProducts(Array.isArray(productData?.products) ? productData.products : []);
      setPlans(Array.isArray(planData) ? planData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);

      if (branchData?.length > 0 && !selectedBranchId) {
        setSelectedBranchId(branchData[0]._id);
      }
    } catch (error) {
      console.error("Error fetching stock data:", error);
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = () => {
    setEditingStock(null);
    setIsDrawerOpen(true);
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      await addOrUpdateStock(formData);
      toast.success(editingStock ? "Stock updated" : "Stock added");
      setIsDrawerOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  const filteredBranchStocks = Array.isArray(branchStocks) 
    ? branchStocks.filter((s) => s.branchId?._id === selectedBranchId)
    : [];

  return (
    <RoleGuard allow={["Admin", "subadmin"]}>
      <div className="w-full h-full px-6 py-4 pb-20">
        <div className="mb-8">
          <Header size="3xl">Stock Management</Header>
          <p className="text-gray-500 mt-1">
            Company master stock + franchise branch stock levels. Low stock alerts configurable.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Company Master Stock */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Company Master Stock</h3>
              <button 
                onClick={handleAddProduct}
                className="text-[#134D41] hover:text-[#0d362e] font-medium flex items-center gap-1 transition-colors"
              >
                + Add Product
              </button>
            </div>
            <MasterStockTable 
              stocks={Array.isArray(masterStocks) ? masterStocks : []} 
              loading={loading} 
              onEdit={handleEditStock}
            />
          </div>

          {/* Branch Stock Levels */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Branch Stock Levels</h3>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="border border-green-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white min-w-[200px]"
              >
                <option value="">Select Branch</option>
                {Array.isArray(branches) && branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <BranchStockTable 
              stocks={filteredBranchStocks} 
              loading={loading} 
              onEdit={handleEditStock}
            />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">Stock History</h3>
            <span className="text-xs text-gray-400">Last 100 activities</span>
          </div>
          <StockHistoryTable history={history} loading={loading} />
        </div>

        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-[#134D41] mb-6 text-center">
              {editingStock ? "Update Stock" : "Add Stock"}
            </h2>
            <StockForm
              initialValues={editingStock}
              products={products}
              plans={plans}
              branches={branches}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsDrawerOpen(false)}
              loading={loading}
            />
          </div>
        </Drawer>
      </div>
    </RoleGuard>
  );
};

export default StockManagementPage;
