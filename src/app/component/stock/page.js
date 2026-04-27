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
  addStockFromDocument,
  getAllProducts,
  getAllPlans,
  getStockHistory,
  deleteStockHistory,
  createCompanyOrder,
  getAllUsers,
} from "@/Api/AllApi";
import MasterStockTable from "./masterStockTable";
import BranchStockTable from "./branchStockTable";
import StockHistoryTable from "./stockHistoryTable";
import StockForm from "./stockForm";
import CompanyOrderForm from "./companyOrderForm";

const StockManagementPage = () => {
  const [masterStocks, setMasterStocks] = useState([]);
  const [branchStocks, setBranchStocks] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  const fetchHistory = async (page = 1) => {
    try {
      const historyData = await getStockHistory({ page, limit: 20 });
      setHistory(Array.isArray(historyData?.history) ? historyData.history : []);
      setHistoryPage(historyData?.page || 1);
      setHistoryTotalPages(historyData?.pages || 1);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [masterData, branchStockData, branchData, productData, planData, userData] = await Promise.all([
        getMasterStock(),
        getBranchStocks(),
        getAllBranches(),
        getAllProducts({ start: 1, limit: 1000 }),
        getAllPlans(),
        getAllUsers({ limit: 1000 })
      ]);

      setMasterStocks(Array.isArray(masterData) ? masterData : []);
      
      const otherBranches = Array.isArray(branchData) ? branchData.filter(b => !b.isMainBranch) : [];
      setBranches(otherBranches);
      
      const otherBranchStocks = Array.isArray(branchStockData) ? branchStockData : [];
      setBranchStocks(otherBranchStocks);

      setProducts(Array.isArray(productData?.products) ? productData.products : []);
      setPlans(Array.isArray(planData) ? planData : []);
      setUsers(Array.isArray(userData?.users) ? userData.users : (Array.isArray(userData) ? userData : []));
      
      await fetchHistory(1);

      if (otherBranches.length > 0 && !selectedBranchId) {
        setSelectedBranchId(otherBranches[0]._id);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingToast = toast.loading("Processing stock document...");

    try {
      setLoading(true);
      const res = await addStockFromDocument(file);
      
      const successCount = res.results.filter(r => r.status === 'success').length;
      const failCount = res.results.filter(r => r.status === 'failed').length;
      
      toast.dismiss(loadingToast);
      toast.success(`Reconciled stock: ${successCount} items added successfully.`, { duration: 4000 });
      
      if (failCount > 0) {
        const failedNames = res.results.filter(r => r.status === 'failed').map(r => r.name).join(', ');
        toast.error(`Failed to find ${failCount} items: ${failedNames}`, { duration: 6000 });
      }
      
      fetchData();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error?.response?.data?.message || "Failed to process stock document");
    } finally {
      setLoading(false);
      e.target.value = null; // Clear input for next selection
    }
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

  const handleDeleteHistory = (ids) => {
    setItemsToDelete(ids);
    setShowDeleteModal(true);
  };

  const confirmDeleteHistory = async () => {
    try {
      setLoading(true);
      await deleteStockHistory(itemsToDelete);
      toast.success("History deleted");
      setShowDeleteModal(false);
      fetchHistory(historyPage);
    } catch (error) {
      toast.error("Failed to delete history");
    } finally {
      setLoading(false);
    }
  };

  const filteredBranchStocks = Array.isArray(branchStocks) 
    ? branchStocks.filter((s) => s.branchId?._id === selectedBranchId)
    : [];

  return (
    <RoleGuard allow={["Admin"]}>
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
              <div className="flex items-center gap-4">
                <label className="text-[#134D41] hover:text-[#0d362e] font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100">
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={loading} />
                  <span>+ Upload PDF</span>
                </label>
                <button 
                  onClick={handleAddProduct}
                  className="text-[#134D41] hover:text-[#0d362e] font-black text-xs uppercase tracking-widest flex items-center gap-1 transition-colors"
                >
                  + Add Product
                </button>
              </div>
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
            <span className="text-xs text-gray-400">Records per page: 20</span>
          </div>
          <StockHistoryTable 
            history={history} 
            loading={loading} 
            currentPage={historyPage}
            totalPages={historyTotalPages}
            onPageChange={fetchHistory}
            onDelete={handleDeleteHistory}
          />
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

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Delete History?</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  You are about to delete <span className="font-bold text-red-600">{itemsToDelete.length}</span> history record(s). This action cannot be undone.
                </p>
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteHistory}
                    disabled={loading}
                    className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
};

export default StockManagementPage;
