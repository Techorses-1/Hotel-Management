import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import {
    FaMoneyBillWave, FaChartBar, FaBook, FaBed, FaUsers, FaTag,
    FaFileExcel, FaSync, FaSearch, FaTimes, FaChartPie,
    FaWallet, FaCreditCard, FaMoneyBill, FaSignInAlt, FaSignOutAlt
} from "react-icons/fa";
import { Bar, Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from "chart.js";
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Reports.scss";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const Reports = () => {
    // ============================================
    // STATE
    // ============================================
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('revenue');
    const [filterOption, setFilterOption] = useState('this_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [bookingStatus, setBookingStatus] = useState('');
    const [paymentMode, setPaymentMode] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [checkInStatus, setCheckInStatus] = useState('');
    const [checkOutStatus, setCheckOutStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [showCharts, setShowCharts] = useState(true);

    // ============================================
    // REPORT TYPES
    // ============================================
    const reportTypes = [
        { id: 'revenue', label: 'Revenue', icon: <FaMoneyBillWave /> },
        { id: 'occupancy', label: 'Occupancy', icon: <FaChartBar /> },
        { id: 'bookings', label: 'Bookings', icon: <FaBook /> },
        { id: 'rooms', label: 'Rooms', icon: <FaBed /> },
        { id: 'customers', label: 'Customers', icon: <FaUsers /> },
        { id: 'categories', label: 'Categories', icon: <FaTag /> },
        { id: 'expenses', label: 'Expenses', icon: <FaWallet /> },
        { id: 'checkins', label: 'Check-ins', icon: <FaSignInAlt /> },
        { id: 'checkouts', label: 'Check-outs', icon: <FaSignOutAlt /> }
    ];

    const filterOptions = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'this_month', label: 'This Month' },
        { id: '6_months', label: '6 Months' },
        { id: 'this_year', label: 'This Year' },
        { id: 'last_year', label: 'Last Year' },
        { id: 'custom', label: 'Custom Range' }
    ];

    const paymentModeOptions = [
        { id: '', label: 'All Modes' },
        { id: 'Cash', label: 'Cash' },
        { id: 'Bank', label: 'Bank' },
        { id: 'Cheque', label: 'Cheque' },
        { id: 'UPI', label: 'UPI' }
    ];

    const paymentStatusOptions = [
        { id: '', label: 'All Status' },
        { id: 'Paid', label: 'Paid' },
        { id: 'Unpaid', label: 'Unpaid' },
        { id: 'Partial', label: 'Partial' }
    ];

    const checkInStatusOptions = [
        { id: '', label: 'All Status' },
        { id: 'Active', label: 'Active' },
        { id: 'Checked-out', label: 'Checked-out' },
        { id: 'Extended', label: 'Extended' },
        { id: 'Cancelled', label: 'Cancelled' }
    ];

    const checkOutStatusOptions = [
        { id: '', label: 'All Status' },
        { id: 'Completed', label: 'Completed' },
        { id: 'Partial', label: 'Partial' },
        { id: 'Cancelled', label: 'Cancelled' }
    ];

    // ============================================
    // EFFECTS
    // ============================================
    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchReport();
    }, [reportType, filterOption, categoryId, bookingStatus, paymentMode, paymentStatus, checkInStatus, checkOutStatus]);

    useEffect(() => {
        if (filterOption === 'custom' && customStartDate && customEndDate) {
            fetchReport();
        }
    }, [customStartDate, customEndDate]);

    // ============================================
    // API CALLS
    // ============================================
    const fetchCategories = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/category/get-categories?limit=100`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setCategories(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/reports/${reportType}`);

            url.searchParams.append('filter', filterOption);

            if (filterOption === 'custom') {
                if (customStartDate) url.searchParams.append('startDate', customStartDate);
                if (customEndDate) url.searchParams.append('endDate', customEndDate);
            }

            if (categoryId) url.searchParams.append('categoryId', categoryId);
            if (bookingStatus) url.searchParams.append('status', bookingStatus);
            if (searchTerm) url.searchParams.append('search', searchTerm);
            if (paymentMode) url.searchParams.append('paymentMode', paymentMode);
            if (paymentStatus) url.searchParams.append('paymentStatus', paymentStatus);

            if (reportType === 'checkins' && checkInStatus) {
                url.searchParams.append('status', checkInStatus);
            }

            if (reportType === 'checkouts' && checkOutStatus) {
                url.searchParams.append('status', checkOutStatus);
            }

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setReportData(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch report');
            }
        } catch (error) {
            console.error("Error fetching report:", error);
            toast.error("Failed to load report data");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const url = new URL(`${import.meta.env.VITE_API_URL}/reports/export/${reportType}`);

            url.searchParams.append('filter', filterOption);

            if (filterOption === 'custom') {
                if (customStartDate) url.searchParams.append('startDate', customStartDate);
                if (customEndDate) url.searchParams.append('endDate', customEndDate);
            }

            if (categoryId) url.searchParams.append('categoryId', categoryId);
            if (bookingStatus) url.searchParams.append('status', bookingStatus);
            if (paymentMode) url.searchParams.append('paymentMode', paymentMode);
            if (paymentStatus) url.searchParams.append('paymentStatus', paymentStatus);

            if (reportType === 'checkins' && checkInStatus) {
                url.searchParams.append('status', checkInStatus);
            }

            if (reportType === 'checkouts' && checkOutStatus) {
                url.searchParams.append('status', checkOutStatus);
            }

            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(data.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

                const filename = `${data.filename || 'report'}.xlsx`;

                XLSX.writeFile(workbook, filename);
                toast.success(`Report exported as ${filename}`);
            } else {
                toast.warning("No data to export");
            }
        } catch (error) {
            console.error("Error exporting report:", error);
            toast.error("Failed to export report");
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // CHART CONFIGURATIONS
    // ============================================
    const getRevenueChartData = () => {
        if (!reportData?.dailyData) return null;

        const labels = reportData.dailyData.map(item => {
            const date = new Date(item._id);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        });

        const values = reportData.dailyData.map(item => item.revenue || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Revenue',
                    data: values,
                    backgroundColor: 'rgba(63, 63, 145, 0.7)',
                    borderColor: '#3f3f91',
                    borderWidth: 2,
                    borderRadius: 4,
                }
            ]
        };
    };

    const getCategoryChartData = () => {
        if (!reportData?.revenueData) return null;

        const categoryMap = {};
        reportData.revenueData.forEach(item => {
            const cat = item._id.categoryName || 'Unknown';
            if (!categoryMap[cat]) categoryMap[cat] = 0;
            categoryMap[cat] += item.totalRevenue;
        });

        const labels = Object.keys(categoryMap);
        const values = Object.values(categoryMap);

        return {
            labels,
            datasets: [
                {
                    label: 'Revenue by Category',
                    data: values,
                    backgroundColor: [
                        'rgba(63, 63, 145, 0.8)',
                        'rgba(46, 125, 50, 0.8)',
                        'rgba(237, 108, 2, 0.8)',
                        'rgba(211, 47, 47, 0.8)',
                        'rgba(123, 31, 162, 0.8)',
                        'rgba(0, 150, 136, 0.8)'
                    ],
                    borderColor: [
                        '#3f3f91',
                        '#2e7d32',
                        '#ed6c02',
                        '#d32f2f',
                        '#7b1fa2',
                        '#009688'
                    ],
                    borderWidth: 1,
                }
            ]
        };
    };

    const getOccupancyChartData = () => {
        if (!reportData?.dailyData) return null;

        const labels = reportData.dailyData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        });

        const occupancy = reportData.dailyData.map(item => item.occupancyRate || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Occupancy Rate (%)',
                    data: occupancy,
                    backgroundColor: 'rgba(63, 63, 145, 0.6)',
                    borderColor: '#3f3f91',
                    borderWidth: 2,
                    borderRadius: 4,
                }
            ]
        };
    };

    const getStatusChartData = () => {
        if (!reportData?.statusBreakdown) return null;

        const labels = reportData.statusBreakdown.map(item => item._id || 'Unknown');
        const values = reportData.statusBreakdown.map(item => item.count || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Booking Status',
                    data: values,
                    backgroundColor: [
                        'rgba(46, 125, 50, 0.8)',
                        'rgba(237, 108, 2, 0.8)',
                        'rgba(211, 47, 47, 0.8)',
                        'rgba(63, 63, 145, 0.8)'
                    ],
                    borderColor: [
                        '#2e7d32',
                        '#ed6c02',
                        '#d32f2f',
                        '#3f3f91'
                    ],
                    borderWidth: 1,
                }
            ]
        };
    };

    const getExpenseChartData = () => {
        if (!reportData?.dailyExpenses) {
            if (!reportData?.expenses) return null;

            const expenseMap = {};
            reportData.expenses.forEach(item => {
                const date = new Date(item.date).toISOString().split('T')[0];
                if (!expenseMap[date]) expenseMap[date] = 0;
                expenseMap[date] += item.amount || 0;
            });

            const sortedDates = Object.keys(expenseMap).sort();
            const labels = sortedDates.map(date => {
                const d = new Date(date);
                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
            });
            const values = sortedDates.map(date => expenseMap[date]);

            return {
                labels,
                datasets: [
                    {
                        label: 'Expenses',
                        data: values,
                        backgroundColor: 'rgba(211, 47, 47, 0.7)',
                        borderColor: '#d32f2f',
                        borderWidth: 2,
                        borderRadius: 4,
                    }
                ]
            };
        }

        const labels = reportData.dailyExpenses.map(item => {
            const date = new Date(item._id);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        });

        const values = reportData.dailyExpenses.map(item => item.total || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Daily Expenses',
                    data: values,
                    backgroundColor: 'rgba(211, 47, 47, 0.7)',
                    borderColor: '#d32f2f',
                    borderWidth: 2,
                    borderRadius: 4,
                }
            ]
        };
    };

    const getExpenseByModeChartData = () => {
        if (!reportData?.byPaymentMode) return null;

        const labels = reportData.byPaymentMode.map(item => item._id || 'Unknown');
        const values = reportData.byPaymentMode.map(item => item.total || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Expenses by Payment Mode',
                    data: values,
                    backgroundColor: [
                        'rgba(46, 125, 50, 0.8)',
                        'rgba(237, 108, 2, 0.8)',
                        'rgba(63, 63, 145, 0.8)',
                        'rgba(211, 47, 47, 0.8)'
                    ],
                    borderColor: [
                        '#2e7d32',
                        '#ed6c02',
                        '#3f3f91',
                        '#d32f2f'
                    ],
                    borderWidth: 1,
                }
            ]
        };
    };

    // ============================================
    // SUMMARY CARDS
    // ============================================
    const renderSummaryCards = () => {
        if (!reportData?.summary) return null;

        const summary = reportData.summary;

        switch (reportType) {
            case 'revenue':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Revenue</span>
                            <span className="reports-summary-value">₹{summary.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Bookings</span>
                            <span className="reports-summary-value">{summary.totalBookings || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Tax</span>
                            <span className="reports-summary-value">₹{summary.totalTax?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Revenue</span>
                            <span className="reports-summary-value">₹{Math.round(summary.avgRevenue || 0).toLocaleString()}</span>
                        </div>
                    </div>
                );

            case 'expenses':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Expenses</span>
                            <span className="reports-summary-value">₹{summary.totalAmount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Transactions</span>
                            <span className="reports-summary-value">{summary.totalCount || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Expense</span>
                            <span className="reports-summary-value">₹{Math.round(summary.avgAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Top Payment Mode</span>
                            <span className="reports-summary-value">
                                {reportData.byPaymentMode?.length > 0 ? reportData.byPaymentMode[0]?._id || 'N/A' : 'N/A'}
                            </span>
                        </div>
                    </div>
                );

            case 'occupancy':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Rooms</span>
                            <span className="reports-summary-value">{summary.totalRooms || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Occupancy</span>
                            <span className="reports-summary-value">{summary.avgOccupancy || 0}%</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Occupied Days</span>
                            <span className="reports-summary-value">{summary.totalOccupiedDays || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Days</span>
                            <span className="reports-summary-value">{summary.totalDays || 0}</span>
                        </div>
                    </div>
                );

            case 'bookings':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Bookings</span>
                            <span className="reports-summary-value">{summary.totalBookings || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Amount</span>
                            <span className="reports-summary-value">₹{summary.totalAmount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Advance</span>
                            <span className="reports-summary-value">₹{summary.totalAdvance?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Amount</span>
                            <span className="reports-summary-value">₹{Math.round(summary.avgAmount || 0).toLocaleString()}</span>
                        </div>
                    </div>
                );

            case 'rooms':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Rooms</span>
                            <span className="reports-summary-value">{summary.totalRooms || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Bookings</span>
                            <span className="reports-summary-value">{summary.totalBookings || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Revenue</span>
                            <span className="reports-summary-value">₹{summary.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Revenue/Room</span>
                            <span className="reports-summary-value">₹{Math.round(summary.avgRevenuePerRoom || 0).toLocaleString()}</span>
                        </div>
                    </div>
                );

            case 'customers':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Customers</span>
                            <span className="reports-summary-value">{summary.totalCustomers || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Revenue</span>
                            <span className="reports-summary-value">₹{summary.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Visits</span>
                            <span className="reports-summary-value">{summary.totalVisits || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Avg. Spent/Customer</span>
                            <span className="reports-summary-value">₹{Math.round(summary.avgSpentPerCustomer || 0).toLocaleString()}</span>
                        </div>
                    </div>
                );

            case 'categories':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Categories</span>
                            <span className="reports-summary-value">{summary.totalCategories || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Revenue</span>
                            <span className="reports-summary-value">₹{summary.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Bookings</span>
                            <span className="reports-summary-value">{summary.totalBookings || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Best Performing</span>
                            <span className="reports-summary-value">{summary.bestPerforming || 'N/A'}</span>
                        </div>
                    </div>
                );

            case 'checkins':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Check-ins</span>
                            <span className="reports-summary-value">{summary.totalCheckIns || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Active</span>
                            <span className="reports-summary-value">{summary.active || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Checked-out</span>
                            <span className="reports-summary-value">{summary.checkedOut || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Extended</span>
                            <span className="reports-summary-value">{summary.extended || 0}</span>
                        </div>
                    </div>
                );

            case 'checkouts':
                return (
                    <div className="reports-summary-cards">
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Check-outs</span>
                            <span className="reports-summary-value">{summary.totalCheckOuts || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Total Revenue</span>
                            <span className="reports-summary-value">₹{summary.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Paid</span>
                            <span className="reports-summary-value">{summary.paid || 0}</span>
                        </div>
                        <div className="reports-summary-card">
                            <span className="reports-summary-label">Not Paid</span>
                            <span className="reports-summary-value">{summary.notPaid || 0}</span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ============================================
    // TABLE - UPDATED
    // ============================================
    const renderTable = () => {
        if (!reportData) return null;

        switch (reportType) {
            case 'revenue':
                if (!reportData.revenueData?.length) {
                    return <p className="reports-no-data">No revenue data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Room</th>
                                <th>Category</th>
                                <th>Bookings</th>
                                <th>Active Rooms Total</th>
                                <th>Removed Rooms Total</th>
                                <th>Revenue</th>
                                <th>Tax</th>
                                <th>Discount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.revenueData.map((item, index) => (
                                <tr key={index}>
                                    <td>{item._id.date}</td>
                                    <td>{item._id.roomNumber}</td>
                                    <td>{item._id.categoryName || 'N/A'}</td>
                                    <td>{item.count}</td>
                                    <td>₹{item.activeRoomsTotal?.toLocaleString() || 0}</td>
                                    <td>₹{item.removedRoomsTotal?.toLocaleString() || 0}</td>
                                    <td>₹{item.totalRevenue.toLocaleString()}</td>
                                    <td>₹{item.totalTax.toLocaleString()}</td>
                                    <td>₹{item.totalDiscount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'expenses':
                if (!reportData.expenses?.length) {
                    return <p className="reports-no-data">No expense data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Expense #</th>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Amount</th>
                                <th>Payment Mode</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.expenses.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.expenseNumber}</td>
                                    <td>{new Date(item.date).toLocaleDateString('en-IN')}</td>
                                    <td><strong>{item.title}</strong></td>
                                    <td style={{ fontWeight: 'bold', color: '#dc3545' }}>₹{item.amount?.toLocaleString() || 0}</td>
                                    <td>{item.paymentMode || 'N/A'}</td>
                                    <td>
                                        <span className={`reports-status-badge reports-status-${item.paymentStatus?.toLowerCase()}`}>
                                            {item.paymentStatus || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'occupancy':
                if (!reportData.dailyData?.length) {
                    return <p className="reports-no-data">No occupancy data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Occupied</th>
                                <th>Available</th>
                                <th>Total Rooms</th>
                                <th>Occupancy Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.dailyData.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.date}</td>
                                    <td>{item.occupied}</td>
                                    <td>{item.available}</td>
                                    <td>{item.occupied + item.available}</td>
                                    <td>
                                        <span className={`reports-occupancy-badge ${item.occupancyRate >= 70 ? 'reports-high' : item.occupancyRate >= 40 ? 'reports-medium' : 'reports-low'}`}>
                                            {item.occupancyRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'bookings':
                if (!reportData.bookingData?.length) {
                    return <p className="reports-no-data">No booking data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Count</th>
                                <th>Total Amount</th>
                                <th>Total Advance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.bookingData.map((item, index) => (
                                <tr key={index}>
                                    <td>{item._id.date}</td>
                                    <td>
                                        <span className={`reports-status-badge reports-status-${item._id.status?.toLowerCase()}`}>
                                            {item._id.status || 'N/A'}
                                        </span>
                                    </td>
                                    <td>{item.count}</td>
                                    <td>₹{item.totalAmount?.toLocaleString() || 0}</td>
                                    <td>₹{item.totalAdvance?.toLocaleString() || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'rooms':
                if (!reportData.roomPerformance?.length) {
                    return <p className="reports-no-data">No room data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Room</th>
                                <th>Category</th>
                                <th>Bookings</th>
                                <th>Occupied Days</th>
                                <th>Removed Rooms</th>
                                <th>Revenue</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.roomPerformance.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.roomNumber}</td>
                                    <td>{item.categoryName || 'N/A'}</td>
                                    <td>{item.totalBookings}</td>
                                    <td>{item.occupiedDays}</td>
                                    <td>{item.removedRoomsCount || 0}</td>
                                    <td>₹{item.totalRevenue?.toLocaleString() || 0}</td>
                                    <td>
                                        <span className={`reports-status-badge reports-status-${item.status?.toLowerCase()}`}>
                                            {item.status || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'customers':
                if (!reportData.customers?.length) {
                    return <p className="reports-no-data">No customer data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Visits</th>
                                <th>Total Spent</th>
                                <th>Avg/Visit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.customers.map((item, index) => (
                                <tr key={index}>
                                    <td><strong>{item.customerName}</strong></td>
                                    <td>{item.customerPhone}</td>
                                    <td>{item.customerEmail || 'N/A'}</td>
                                    <td>{item.totalVisits}</td>
                                    <td>₹{item.totalSpent?.toLocaleString() || 0}</td>
                                    <td>₹{Math.round(item.totalSpent / item.totalVisits) || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'categories':
                if (!reportData.categoryPerformance?.length) {
                    return <p className="reports-no-data">No category data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Rooms</th>
                                <th>Bookings</th>
                                <th>Occupied Days</th>
                                <th>Removed Revenue</th>
                                <th>Total Revenue</th>
                                <th>Avg. Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.categoryPerformance.map((item, index) => (
                                <tr key={index}>
                                    <td><strong>{item.categoryName}</strong></td>
                                    <td>{item.totalRooms}</td>
                                    <td>{item.totalBookings}</td>
                                    <td>{item.occupiedDays}</td>
                                    <td>₹{item.removedRoomsRevenue?.toLocaleString() || 0}</td>
                                    <td>₹{item.totalRevenue?.toLocaleString() || 0}</td>
                                    <td>₹{item.avgPrice?.toLocaleString() || 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'checkins':
                if (!reportData.checkIns?.length) {
                    return <p className="reports-no-data">No check-in data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Check-in #</th>
                                <th>Guest</th>
                                <th>Room</th>
                                <th>Check-in Date</th>
                                <th>Check-out Date</th>
                                <th>Duration</th>
                                <th>Removed Rooms</th>
                                <th>Removed Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.checkIns.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.checkInNumber}</td>
                                    <td>{item.customerName}</td>
                                    <td>{item.roomNumber}</td>
                                    <td>{new Date(item.checkInDate).toLocaleString()}</td>
                                    <td>{new Date(item.checkOutDate).toLocaleString()}</td>
                                    <td>{item.durationLabel || 'N/A'}</td>
                                    <td>{item.removedRoomsCount || 0}</td>
                                    <td>₹{(item.removedRoomsTotal || 0).toLocaleString()}</td>
                                    <td>
                                        <span className={`reports-status-badge reports-status-${item.status?.toLowerCase()}`}>
                                            {item.status || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            case 'checkouts':
                if (!reportData.checkOuts?.length) {
                    return <p className="reports-no-data">No check-out data found</p>;
                }
                return (
                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>Check-out #</th>
                                <th>Guest</th>
                                <th>Room</th>
                                <th>Category</th>
                                <th>Check-in Date</th>
                                <th>Check-out Date</th>
                                <th>Guest Check-out Time</th>
                                <th>Duration</th>
                                <th>Active Rooms Total</th>
                                <th>Removed Rooms Total</th>
                                <th>Final Total</th>
                                <th>Payment Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.checkOuts.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.checkOutNumber}</td>
                                    <td>{item.customerName}</td>
                                    <td>{item.roomNumber}</td>
                                    <td>{item.categoryName || 'N/A'}</td>
                                    <td>{new Date(item.checkInDate).toLocaleString()}</td>
                                    <td>{new Date(item.checkOutDate).toLocaleString()}</td>
                                    <td>{item.guestCheckOutTime ? new Date(item.guestCheckOutTime).toLocaleString() : 'N/A'}</td>
                                    <td>{item.durationLabel || 'N/A'}</td>
                                    <td>₹{(item.activeRoomsTotal || 0).toLocaleString()}</td>
                                    <td>₹{(item.removedRoomsTotal || 0).toLocaleString()}</td>
                                    <td>₹{item.finalTotal?.toLocaleString() || 0}</td>
                                    <td>
                                        <span className={`reports-status-badge reports-status-${item.paymentStatus?.toLowerCase().replace(' ', '')}`}>
                                            {item.paymentStatus || 'N/A'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );

            default:
                return null;
        }
    };

    // ============================================
    // CHARTS
    // ============================================
    const renderCharts = () => {
        if (!showCharts || !reportData) return null;

        let chart1 = null;
        let chart2 = null;

        switch (reportType) {
            case 'revenue':
                chart1 = getRevenueChartData();
                chart2 = getCategoryChartData();
                break;
            case 'expenses':
                chart1 = getExpenseChartData();
                chart2 = getExpenseByModeChartData();
                break;
            case 'occupancy':
                chart1 = getOccupancyChartData();
                chart2 = null;
                break;
            case 'bookings':
                chart1 = getStatusChartData();
                chart2 = null;
                break;
            default:
                return null;
        }

        return (
            <div className="reports-charts-section">
                {chart1 && (
                    <div className="reports-chart-card">
                        <h4 className="reports-chart-title">{reportType === 'expenses' ? 'Expenses Overview' : 'Revenue Overview'}</h4>
                        <div className="reports-chart-wrapper">
                            <Bar data={chart1} options={{
                                responsive: true,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function (value) { return '₹' + value; }
                                        }
                                    }
                                }
                            }} />
                        </div>
                    </div>
                )}
                {chart2 && (
                    <div className="reports-chart-card">
                        <h4 className="reports-chart-title">{reportType === 'expenses' ? 'Expenses by Payment Mode' : 'Revenue by Category'}</h4>
                        <div className="reports-chart-wrapper">
                            <Pie data={chart2} options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: { font: { size: 11 } }
                                    }
                                }
                            }} />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="reports-container">
                <div className="reports-header">
                    <h1><FaChartBar /> Reports</h1>
                    <div className="reports-header-actions">
                        <button
                            className="reports-refresh-btn"
                            onClick={fetchReport}
                            disabled={loading}
                        >
                            <FaSync className={loading ? 'reports-spin' : ''} /> Refresh
                        </button>
                        <button
                            className="reports-export-btn"
                            onClick={handleExport}
                            disabled={loading || !reportData}
                        >
                            <FaFileExcel /> Export Excel
                        </button>
                    </div>
                </div>

                {/* ===== FILTERS ===== */}
                <div className="reports-filters-section">
                    <div className="reports-filter-group">
                        <label className="reports-filter-label">Report Type</label>
                        <div className="reports-type-tabs">
                            {reportTypes.map(type => (
                                <button
                                    key={type.id}
                                    className={`reports-tab-btn ${reportType === type.id ? 'reports-active' : ''}`}
                                    onClick={() => setReportType(type.id)}
                                >
                                    {type.icon} {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="reports-filter-row">
                        <div className="reports-filter-group">
                            <label className="reports-filter-label">Date Filter</label>
                            <select
                                value={filterOption}
                                onChange={(e) => setFilterOption(e.target.value)}
                                className="reports-filter-select"
                            >
                                {filterOptions.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {filterOption === 'custom' && (
                            <div className="reports-filter-group reports-date-range">
                                <label className="reports-filter-label">From</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="reports-date-input"
                                />
                                <label className="reports-filter-label">To</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="reports-date-input"
                                />
                            </div>
                        )}

                        {(reportType === 'revenue' || reportType === 'rooms' || reportType === 'categories') && (
                            <div className="reports-filter-group">
                                <label className="reports-filter-label">Category</label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="reports-filter-select"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.categoryId} value={cat.categoryId}>
                                            {cat.categoryName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportType === 'bookings' && (
                            <div className="reports-filter-group">
                                <label className="reports-filter-label">Booking Status</label>
                                <select
                                    value={bookingStatus}
                                    onChange={(e) => setBookingStatus(e.target.value)}
                                    className="reports-filter-select"
                                >
                                    <option value="">All Status</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Checked-in">Checked-in</option>
                                    <option value="Cancelled">Cancelled</option>
                                </select>
                            </div>
                        )}

                        {reportType === 'customers' && (
                            <div className="reports-filter-group">
                                <label className="reports-filter-label">Search Customer</label>
                                <div className="reports-search-input-wrap">
                                    <FaSearch className="reports-search-icon" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name, phone, email..."
                                        className="reports-search-input"
                                        onKeyPress={(e) => e.key === 'Enter' && fetchReport()}
                                    />
                                    {searchTerm && (
                                        <button
                                            className="reports-clear-search"
                                            onClick={() => { setSearchTerm(''); fetchReport(); }}
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {reportType === 'expenses' && (
                            <>
                                <div className="reports-filter-group">
                                    <label className="reports-filter-label">Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                        className="reports-filter-select"
                                    >
                                        {paymentModeOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="reports-filter-group">
                                    <label className="reports-filter-label">Payment Status</label>
                                    <select
                                        value={paymentStatus}
                                        onChange={(e) => setPaymentStatus(e.target.value)}
                                        className="reports-filter-select"
                                    >
                                        {paymentStatusOptions.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {reportType === 'checkins' && (
                            <div className="reports-filter-group">
                                <label className="reports-filter-label">Check-in Status</label>
                                <select
                                    value={checkInStatus}
                                    onChange={(e) => setCheckInStatus(e.target.value)}
                                    className="reports-filter-select"
                                >
                                    {checkInStatusOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportType === 'checkouts' && (
                            <div className="reports-filter-group">
                                <label className="reports-filter-label">Check-out Status</label>
                                <select
                                    value={checkOutStatus}
                                    onChange={(e) => setCheckOutStatus(e.target.value)}
                                    className="reports-filter-select"
                                >
                                    {checkOutStatusOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="reports-filter-group reports-chart-toggle">
                            <label className="reports-filter-label">Show Charts</label>
                            <button
                                className={`reports-toggle-btn ${showCharts ? 'reports-active' : ''}`}
                                onClick={() => setShowCharts(!showCharts)}
                            >
                                <FaChartPie /> {showCharts ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ===== LOADING ===== */}
                {loading ? (
                    <div className="reports-loading-container">
                        <div className="reports-loading-spinner reports-large"></div>
                        <p>Loading report data...</p>
                    </div>
                ) : (
                    <>
                        {/* ===== SUMMARY CARDS ===== */}
                        {reportData && renderSummaryCards()}

                        {/* ===== CHARTS ===== */}
                        {renderCharts()}

                        {/* ===== DATA TABLE ===== */}
                        <div className="reports-table-section">
                            <div className="reports-table-header">
                                <h3 className="reports-table-title">Data Table</h3>
                                <span className="reports-record-count">
                                    {reportData?.revenueData?.length ||
                                        reportData?.expenses?.length ||
                                        reportData?.dailyData?.length ||
                                        reportData?.bookingData?.length ||
                                        reportData?.roomPerformance?.length ||
                                        reportData?.customers?.length ||
                                        reportData?.categoryPerformance?.length ||
                                        reportData?.checkIns?.length ||
                                        reportData?.checkOuts?.length || 0} records
                                </span>
                            </div>
                            <div className="reports-table-wrapper">
                                {renderTable()}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Navbar>
    );
};

export default Reports;