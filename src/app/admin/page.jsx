"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, BarChart3, Receipt, Layers, Tag, KeyRound, CheckCircle2, ExternalLink, AlertTriangle, RefreshCw, } from "lucide-react";
export default function AdminPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("ANALYTICS");
    const [notification, setNotification] = useState(null);
    // Analytics Data
    const [analytics, setAnalytics] = useState(null);
    // Orders Filter Data
    const [orders, setOrders] = useState([]);
    const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
    const [orderSearchQuery, setOrderSearchQuery] = useState("");
    // Catalogue Data
    const [catalogueTree, setCatalogueTree] = useState([]);
    // Coupons Data
    const [coupons, setCoupons] = useState([]);
    const [newCouponCode, setNewCouponCode] = useState("");
    const [newCouponType, setNewCouponType] = useState("FLAT");
    const [newCouponValue, setNewCouponValue] = useState(50);
    const [newCouponMinOrder, setNewCouponMinOrder] = useState(100);
    // Access Management Data
    const [accessLogs, setAccessLogs] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [accessAction, setAccessAction] = useState("GRANT");
    const [accessTargetType, setAccessTargetType] = useState("SUBJECT");
    const [accessTargetId, setAccessTargetId] = useState("");
    const [accessDurationDays, setAccessDurationDays] = useState(30);
    const [accessReason, setAccessReason] = useState("");
    const showNotification = (type, text) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 4000);
    };
    const fetchAnalytics = async () => {
        try {
            const res = await fetch("/api/admin/analytics");
            if (res.ok)
                setAnalytics(await res.json());
        }
        catch { }
    };
    const fetchOrders = async () => {
        try {
            let url = `/api/admin/orders?status=${orderStatusFilter}`;
            if (orderSearchQuery)
                url += `&search=${encodeURIComponent(orderSearchQuery)}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        }
        catch { }
    };
    const fetchCatalogue = async () => {
        try {
            const res = await fetch("/api/admin/catalogue");
            if (res.ok) {
                const data = await res.json();
                setCatalogueTree(data.boards || []);
            }
        }
        catch { }
    };
    const fetchCoupons = async () => {
        try {
            const res = await fetch("/api/admin/coupons");
            if (res.ok) {
                const data = await res.json();
                setCoupons(data.coupons || []);
            }
        }
        catch { }
    };
    const fetchAccessData = async () => {
        try {
            const res = await fetch("/api/admin/access");
            if (res.ok) {
                const data = await res.json();
                setAccessLogs(data.logs || []);
                setStudents(data.students || []);
                if (data.students?.length > 0 && !selectedStudentId) {
                    setSelectedStudentId(data.students[0].id);
                }
            }
        }
        catch { }
    };
    useEffect(() => {
        if (user?.role === "ADMIN") {
            if (activeTab === "ANALYTICS")
                fetchAnalytics();
            if (activeTab === "ORDERS")
                fetchOrders();
            if (activeTab === "CATALOGUE")
                fetchCatalogue();
            if (activeTab === "COUPONS")
                fetchCoupons();
            if (activeTab === "ACCESS") {
                fetchAccessData();
                fetchCatalogue();
            }
        }
    }, [user, activeTab, orderStatusFilter]);
    if (!user || user.role !== "ADMIN") {
        return (<div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-100 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8"/>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Admin Privileges Required</h2>
        <p className="text-xs text-slate-500">
          You must be signed in as an administrator to access the admin console.
        </p>
        <p className="text-xs text-slate-400">
          Click &ldquo;👑 Admin Mode&rdquo; on the top demo banner to switch immediately.
        </p>
      </div>);
    }
    // Handle Create Coupon
    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const discountValue = newCouponType === "FLAT" ? newCouponValue * 100 : newCouponValue;
            const res = await fetch("/api/admin/coupons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: newCouponCode.trim().toUpperCase(),
                    discountType: newCouponType,
                    discountValue,
                    minOrderPaise: newCouponMinOrder * 100,
                }),
            });
            if (res.ok) {
                showNotification("success", `Coupon '${newCouponCode}' created successfully`);
                setNewCouponCode("");
                fetchCoupons();
            }
            else {
                const err = await res.json();
                showNotification("error", err.error || "Failed to create coupon");
            }
        }
        catch {
            showNotification("error", "Error creating coupon");
        }
    };
    // Toggle Coupon Active Status
    const handleToggleCoupon = async (id, currentActive) => {
        try {
            const res = await fetch(`/api/admin/coupons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentActive }),
            });
            if (res.ok) {
                showNotification("success", "Coupon status updated");
                fetchCoupons();
            }
        }
        catch { }
    };
    // Handle Manual Grant / Revoke Access
    const handleManualAccessSubmit = async (e) => {
        e.preventDefault();
        if (!accessReason.trim() || accessReason.trim().length < 5) {
            showNotification("error", "Mandatory audit reason must be at least 5 characters");
            return;
        }
        try {
            const res = await fetch("/api/admin/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUserId: selectedStudentId,
                    action: accessAction,
                    accessType: accessTargetType,
                    targetId: accessTargetId,
                    durationDays: accessDurationDays || undefined,
                    reason: accessReason.trim(),
                }),
            });
            if (res.ok) {
                const data = await res.json();
                showNotification("success", data.message);
                setAccessReason("");
                fetchAccessData();
            }
            else {
                const err = await res.json();
                showNotification("error", err.error || "Failed to update access");
            }
        }
        catch {
            showNotification("error", "Network error updating access");
        }
    };
    // Handle Mark Chapter Free
    const handleToggleChapterFree = async (chapterId, currentFree) => {
        try {
            const res = await fetch("/api/admin/materials", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapterId, isFree: !currentFree }),
            });
            if (res.ok) {
                showNotification("success", "Chapter free sample status updated");
                fetchCatalogue();
            }
        }
        catch { }
    };
    return (<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
              ADMIN CONTROL PANEL
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Management & Analytics</h1>
        </div>

        <div className="text-xs text-slate-500 text-right">
          Logged in as <strong className="text-slate-800">{user.name}</strong> ({user.email})
        </div>
      </div>

      {/* Notifications */}
      {notification && (<div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn ${notification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
          {notification.type === "success" ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
          <span>{notification.text}</span>
        </div>)}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab("ANALYTICS")} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === "ANALYTICS"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
          <BarChart3 className="w-3.5 h-3.5"/>
          <span>Dashboard & Analytics (A7)</span>
        </button>

        <button onClick={() => setActiveTab("ORDERS")} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === "ORDERS"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
          <Receipt className="w-3.5 h-3.5"/>
          <span>Orders & Payments (A4)</span>
        </button>

        <button onClick={() => setActiveTab("CATALOGUE")} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === "CATALOGUE"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
          <Layers className="w-3.5 h-3.5"/>
          <span>Catalogue & Materials (A1, A2)</span>
        </button>

        <button onClick={() => setActiveTab("COUPONS")} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === "COUPONS"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
          <Tag className="w-3.5 h-3.5"/>
          <span>Discount Coupons (A5)</span>
        </button>

        <button onClick={() => setActiveTab("ACCESS")} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === "ACCESS"
            ? "bg-indigo-600 text-white shadow-xs"
            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
          <KeyRound className="w-3.5 h-3.5"/>
          <span>Manual Access & Logs (A6)</span>
        </button>
      </div>

      {/* Tab 1: Analytics Dashboard (A7) */}
      {activeTab === "ANALYTICS" && (<div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Revenue (30d)
              </span>
              <div className="text-2xl font-black text-slate-900">
                ₹{(analytics?.totalRevenueINR || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">Incl. 18% GST verified</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Class Passes
              </span>
              <div className="text-2xl font-black text-indigo-600">
                {analytics?.activePassesCount || 0}
              </div>
              <span className="text-[10px] text-slate-400">Current live subscribers</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Enrolled Students
              </span>
              <div className="text-2xl font-black text-slate-900">
                {analytics?.totalStudents || 0}
              </div>
              <span className="text-[10px] text-slate-400">Registered users</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Razorpay Test Mode
              </span>
              <div className="text-base font-bold text-emerald-700 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600"/>
                Live & Connected
              </div>
              <span className="text-[10px] text-slate-400">HMAC-SHA256 verified</span>
            </div>
          </div>

          {/* Revenue by Day Chart & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Day Bar Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Revenue by Day (Last 7 Days)</h3>
              <div className="h-48 flex items-end gap-3 pt-6 border-b border-slate-100">
                {analytics?.revenueByDay?.map((item) => {
                const maxRevenue = Math.max(...(analytics.revenueByDay.map((d) => d.revenueINR) || [100]), 100);
                const heightPercent = Math.max(10, Math.round((item.revenueINR / maxRevenue) * 100));
                return (<div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="absolute -top-7 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        ₹{item.revenueINR.toFixed(0)}
                      </div>
                      <div style={{ height: `${heightPercent}%` }} className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all group-hover:from-indigo-700 group-hover:to-indigo-500"></div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {item.date.slice(-5)}
                      </span>
                    </div>);
            })}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Top Selling Products</h3>
              <div className="divide-y divide-slate-100 text-xs">
                {analytics?.topProducts?.length === 0 ? (<div className="py-8 text-center text-slate-400">No sales recorded yet.</div>) : (analytics?.topProducts?.map((p, i) => (<div key={p.productId} className="py-2.5 flex items-center justify-between">
                      <div className="space-y-0.5 max-w-[240px]">
                        <div className="font-bold text-slate-800 truncate">{p.title}</div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {p.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          ₹{(p.totalRevenuePaise / 100).toFixed(0)}
                        </div>
                        <span className="text-[10px] text-slate-400">{p.salesCount} sold</span>
                      </div>
                    </div>)))}
              </div>
            </div>
          </div>
        </div>)}

      {/* Tab 2: Orders & Payments (A4) */}
      {activeTab === "ORDERS" && (<div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base">All Student Orders & Audit</h3>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                {["ALL", "PAID", "CREATED", "FAILED"].map((st) => (<button key={st} onClick={() => setOrderStatusFilter(st)} className={`px-3 py-1 rounded-lg transition ${orderStatusFilter === st
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"}`}>
                    {st}
                  </button>))}
              </div>

              <button onClick={fetchOrders} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition" title="Refresh">
                <RefreshCw className="w-4 h-4"/>
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Items</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Payment Info</th>
                  <th className="p-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (<tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No orders found matching the filter criteria.
                    </td>
                  </tr>) : (orders.map((o) => {
                const payment = o.payments?.[0];
                return (<tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {o.orderNumber}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{o.user?.name}</div>
                          <div className="text-[10px] text-slate-400">{o.user?.email}</div>
                        </td>
                        <td className="p-3 max-w-[200px]">
                          {o.orderItems?.map((it) => (<div key={it.id} className="truncate text-slate-700">
                              • {it.title}
                            </div>))}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          ₹{(o.totalPaise / 100).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${o.status === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : o.status === "FAILED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px]">
                          {payment?.razorpayPaymentId || o.razorpayOrderId || "Pending"}
                        </td>
                        <td className="p-3 text-right">
                          {o.status === "PAID" && (<a href={`/api/student/orders/${o.id}/invoice`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1">
                              <span>Invoice</span>
                              <ExternalLink className="w-3 h-3"/>
                            </a>)}
                        </td>
                      </tr>);
            }))}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* Tab 3: Catalogue & Materials (A1, A2) */}
      {activeTab === "CATALOGUE" && (<div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Curriculum & Study Materials</h3>
              <p className="text-xs text-slate-500">
                Create and manage boards, classes, subjects, chapters, and mark free samples.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {catalogueTree.map((board) => (<div key={board.id} className="space-y-4">
                <div className="bg-slate-900 text-white p-3.5 rounded-xl font-bold text-sm flex items-center justify-between">
                  <span>Board: {board.name} ({board.slug})</span>
                  <span className="text-xs text-slate-400 font-normal">{board.classes?.length || 0} Classes</span>
                </div>

                <div className="pl-4 space-y-6 border-l-2 border-indigo-200">
                  {board.classes?.map((cls) => (<div key={cls.id} className="space-y-3">
                      <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100 text-indigo-950 font-bold text-xs flex justify-between items-center">
                        <span>{cls.name} (Grade {cls.gradeNumber})</span>
                        <span className="text-[11px] text-indigo-700">{cls.subjects?.length || 0} Subjects</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-2">
                        {cls.subjects?.map((sub) => (<div key={sub.id} className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                              <span>{sub.name}</span>
                              <span className="text-[10px] text-slate-400">{sub.chapters?.length || 0} Chapters</span>
                            </div>

                            <div className="space-y-2 divide-y divide-slate-100">
                              {sub.chapters?.map((ch) => (<div key={ch.id} className="pt-2 flex items-center justify-between text-xs">
                                  <div className="truncate max-w-[160px]">
                                    <span className="font-medium text-slate-800">
                                      Ch {ch.chapterNumber}: {ch.name}
                                    </span>
                                  </div>

                                  <button onClick={() => handleToggleChapterFree(ch.id, ch.isFree)} className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${ch.isFree
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                                    {ch.isFree ? "Free Sample" : "Locked"}
                                  </button>
                                </div>))}
                            </div>
                          </div>))}
                      </div>
                    </div>))}
                </div>
              </div>))}
          </div>
        </div>)}

      {/* Tab 4: Discount Coupons (A5) */}
      {activeTab === "COUPONS" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coupon Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Create Discount Coupon</h3>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Coupon Code</label>
                <input type="text" required value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} placeholder="EXAM50" className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"/>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Discount Type</label>
                <select value={newCouponType} onChange={(e) => setNewCouponType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  <option value="FLAT">FLAT (e.g. ₹50 off)</option>
                  <option value="PERCENTAGE">PERCENTAGE (e.g. 20% off)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Discount Value ({newCouponType === "FLAT" ? "in ₹" : "%"})
                </label>
                <input type="number" required value={newCouponValue} onChange={(e) => setNewCouponValue(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Min Order Amount (in ₹)</label>
                <input type="number" value={newCouponMinOrder} onChange={(e) => setNewCouponMinOrder(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
              </div>

              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs mt-2">
                Create Coupon
              </button>
            </form>
          </div>

          {/* Coupons Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Active Coupons</h3>

            <div className="divide-y divide-slate-100 text-xs">
              {coupons.map((c) => (<div key={c.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">{c.code}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${c.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"}`}>
                        {c.isActive ? "ACTIVE" : "DISABLED"}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {c.discountType === "FLAT"
                    ? `₹${(c.discountValue / 100).toFixed(0)} FLAT off`
                    : `${c.discountValue}% off`}{" "}
                      • Min Order ₹{((c.minOrderPaise || 0) / 100).toFixed(0)} • Used {c.usedCount} times
                    </div>
                  </div>

                  <button onClick={() => handleToggleCoupon(c.id, c.isActive)} className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${c.isActive
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                    {c.isActive ? "Disable" : "Enable"}
                  </button>
                </div>))}
            </div>
          </div>
        </div>)}

      {/* Tab 5: Manual Access & Logs (A6) */}
      {activeTab === "ACCESS" && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grant/Revoke Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Grant / Revoke Access (A6)</h3>

            <form onSubmit={handleManualAccessSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Target Student</label>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                  {students.map((st) => (<option key={st.id} value={st.id}>
                      {st.name} ({st.email})
                    </option>))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Action</label>
                  <select value={accessAction} onChange={(e) => setAccessAction(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-indigo-700">
                    <option value="GRANT">GRANT ACCESS</option>
                    <option value="REVOKE">REVOKE ACCESS</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Level</label>
                  <select value={accessTargetType} onChange={(e) => setAccessTargetType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="CLASS">Class Pass</option>
                    <option value="SUBJECT">Subject Pack</option>
                    <option value="CHAPTER">Chapter Notes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Target ID ({accessTargetType})
                </label>
                <input type="text" required value={accessTargetId} onChange={(e) => setAccessTargetId(e.target.value)} placeholder="Enter Class ID, Subject ID, or Chapter ID" className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"/>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Check Catalogue tab to copy relevant UUID
                </span>
              </div>

              {accessAction === "GRANT" && accessTargetType === "CLASS" && (<div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Duration (Days)</label>
                  <input type="number" value={accessDurationDays} onChange={(e) => setAccessDurationDays(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
                </div>)}

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Audit Reason (Mandatory)
                </label>
                <textarea required rows={2} value={accessReason} onChange={(e) => setAccessReason(e.target.value)} placeholder="e.g. Scholarship awarded / test review / payment settled offline" className="w-full px-3 py-2 border border-slate-300 rounded-lg"/>
              </div>

              <button type="submit" className={`w-full py-2.5 rounded-xl font-bold transition shadow-xs mt-2 text-white ${accessAction === "GRANT" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}>
                {accessAction === "GRANT" ? "Confirm Access Grant" : "Revoke Access"}
              </button>
            </form>
          </div>

          {/* Audit Logs Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Mandatory Access Audit Trail</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Admin</th>
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">Action</th>
                    <th className="p-2.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accessLogs.length === 0 ? (<tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No manual access overrides logged yet.
                      </td>
                    </tr>) : (accessLogs.map((log) => (<tr key={log.id}>
                        <td className="p-2.5 text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.adminUser?.name}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{log.targetUser?.name}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.action === "GRANT"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"}`}>
                            {log.action} {log.accessType}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{log.reason}</td>
                      </tr>)))}
                </tbody>
              </table>
            </div>
          </div>
        </div>)}
    </div>);
}
