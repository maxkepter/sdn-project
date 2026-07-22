import React, { useState, useEffect } from "react";
import apiClient from "../../services/apiClient";

export default function SellerReports() {
  const [timeframe, setTimeframe] = useState("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null); // { index, type: 'revenue'|'orders', x, y, value, period }

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { timeframe };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await apiClient.get("/reports/sales", { params });
      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching sales report:", err);
      setError(err.response?.data?.message || "Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  const handleRefresh = () => {
    fetchReport();
  };

  const handleExportCSV = () => {
    let url = `${apiClient.defaults.baseURL || "/api/v1"}/reports/sales.csv?timeframe=${timeframe}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;

    // Append token to bypass auth or fetch using blob
    const token = localStorage.getItem("token");
    if (token) {
      // Use axios to fetch the blob to pass auth headers, then download it
      apiClient
        .get(`/reports/sales.csv?timeframe=${timeframe}${startDate ? `&startDate=${startDate}` : ""}${endDate ? `&endDate=${endDate}` : ""}`, {
          responseType: "blob",
        })
        .then((response) => {
          const blob = new Blob([response.data], { type: "text/csv" });
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = `sales-report-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(downloadUrl);
        })
        .catch((err) => {
          console.error("CSV Export failed:", err);
          alert("Failed to export CSV report");
        });
    } else {
      window.open(url, "_blank");
    }
  };

  const formatPeriod = (period) => {
    if (!period) return "";
    if (period.includes("-W")) {
      const [year, week] = period.split("-W");
      return `Wk ${week}, ${year}`;
    }
    const [year, month] = period.split("-");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${monthNames[mIdx] || month} ${year}`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat("en-US").format(val || 0);
  };

  const dataPoints = reportData?.data || [];
  const summary = reportData?.summary || {
    revenue: 0,
    orderCount: 0,
    averageOrderValue: 0,
    refunds: 0,
  };

  // Find max values for chart scaling
  const maxRevenue = Math.max(...dataPoints.map((d) => d.revenue ?? d.totalRevenue), 1);
  const maxOrders = Math.max(...dataPoints.map((d) => d.orderCount ?? d.totalOrders), 1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Title & Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-600 mt-1">
            Track your store sales, orders, average order values, and refunds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={loading || dataPoints.length === 0}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-700">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setTimeframe("week")}
                className={`flex-1 px-4 py-2 text-sm font-medium border rounded-l-md ${
                  timeframe === "week"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setTimeframe("month")}
                className={`flex-1 px-4 py-2 text-sm font-medium border-t border-b border-r rounded-r-md ${
                  timeframe === "month"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Month
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 text-sm font-semibold disabled:opacity-50"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 mt-4">Generating report data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-gray-500 text-sm font-semibold">Total Revenue</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.revenue)}
              </div>
              <div className="text-xs text-gray-400 mt-1 capitalize">
                Gross sales in valid orders
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-gray-500 text-sm font-semibold">Total Orders</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {formatNumber(summary.orderCount)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Completed buyer checkouts
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-gray-500 text-sm font-semibold">Average Order Value</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary.averageOrderValue)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Revenue divided by orders
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-gray-500 text-sm font-semibold text-red-600">Refunds</div>
              <div className="text-3xl font-bold text-red-600 mt-2">
                {formatCurrency(summary.refunds)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Amount returned/refunded
              </div>
            </div>
          </div>

          {dataPoints.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">No sales data found</p>
              <p className="text-sm">
                Try selecting a different date range or timeframe filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Chart Visualizations (CSS/Tailwind, match SellerOverview.jsx) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Revenue Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative">
                  <h3 className="text-base font-bold text-gray-800 mb-4">
                    Revenue Trend
                  </h3>
                  <div className="flex items-end gap-1 h-64 border-b border-gray-200 pb-2 pt-4 relative">
                    {dataPoints.map((d, index) => {
                      const pct = ((d.revenue ?? d.totalRevenue) / maxRevenue) * 100;
                      const isHovered = hoveredBar && hoveredBar.index === index && hoveredBar.type === "revenue";
                      return (
                        <div
                          key={d.period}
                          className="flex-1 flex flex-col justify-end items-center h-full relative group"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredBar({
                              index,
                              type: "revenue",
                              value: d.revenue ?? d.totalRevenue,
                              period: d.period,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isHovered ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
                            }`}
                            style={{ height: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* X Axis labels */}
                  <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                    <span>{formatPeriod(dataPoints[0]?.period)}</span>
                    {dataPoints.length > 2 && (
                      <span>{formatPeriod(dataPoints[Math.floor(dataPoints.length / 2)]?.period)}</span>
                    )}
                    <span>{formatPeriod(dataPoints[dataPoints.length - 1]?.period)}</span>
                  </div>
                </div>

                {/* Orders Chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative">
                  <h3 className="text-base font-bold text-gray-800 mb-4">
                    Orders Volume
                  </h3>
                  <div className="flex items-end gap-1 h-32 border-b border-gray-200 pb-2 pt-4 relative">
                    {dataPoints.map((d, index) => {
                      const pct = ((d.orderCount ?? d.totalOrders) / maxOrders) * 100;
                      const isHovered = hoveredBar && hoveredBar.index === index && hoveredBar.type === "orders";
                      return (
                        <div
                          key={d.period}
                          className="flex-1 flex flex-col justify-end items-center h-full relative group"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredBar({
                              index,
                              type: "orders",
                              value: d.orderCount ?? d.totalOrders,
                              period: d.period,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <div
                            className={`w-full rounded-t transition-all ${
                              isHovered ? "bg-emerald-600" : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                            style={{ height: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {/* X Axis labels */}
                  <div className="flex justify-between text-xs text-gray-400 mt-2 px-1">
                    <span>{formatPeriod(dataPoints[0]?.period)}</span>
                    {dataPoints.length > 2 && (
                      <span>{formatPeriod(dataPoints[Math.floor(dataPoints.length / 2)]?.period)}</span>
                    )}
                    <span>{formatPeriod(dataPoints[dataPoints.length - 1]?.period)}</span>
                  </div>
                </div>
              </div>

              {/* Bucket Table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-800">
                    Breakdown by Period
                  </h3>
                </div>
                <div className="overflow-x-auto max-h-[464px]">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-700">
                          Period
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">
                          AOV
                        </th>
                        <th className="px-6 py-3 text-right font-semibold text-gray-700">
                          Refunds
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dataPoints.map((d) => (
                        <tr key={d.period} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {formatPeriod(d.period)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-900 font-semibold">
                            {formatCurrency(d.revenue ?? d.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {formatNumber(d.orderCount ?? d.totalOrders)}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {formatCurrency(d.averageOrderValue)}
                          </td>
                          <td className="px-6 py-4 text-right text-red-600">
                            {d.refunds > 0 ? formatCurrency(d.refunds) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Interactive Tooltip using fixed state */}
      {hoveredBar && (
        <div
          className="fixed bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-xs font-semibold z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: hoveredBar.x,
            top: hoveredBar.y - 8,
          }}
        >
          <div className="border-b border-gray-700 pb-1 mb-1 font-bold">
            {formatPeriod(hoveredBar.period)}
          </div>
          <div>
            {hoveredBar.type === "revenue"
              ? `Revenue: ${formatCurrency(hoveredBar.value)}`
              : `Orders: ${formatNumber(hoveredBar.value)}`}
          </div>
        </div>
      )}
    </div>
  );
}
