import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
    FaHome, FaBed, FaDoorOpen, FaBroom, FaMoneyBillWave,
    FaCalendarCheck, FaSignOutAlt, FaBook, FaClock,
    FaChartBar, FaRedo, FaUser, FaPhone, FaTag,
    FaRupeeSign, FaBuilding, FaUsers, FaFilter,
    FaCheckCircle, FaTimesCircle, FaHourglassHalf
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
    ArcElement
} from "chart.js";
import Navbar from "../../Components/Navbar/Navbar";
import "react-toastify/dist/ReactToastify.css";
import "./Dashboard.scss";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        stats: {
            totalRooms: 0,
            availableRooms: 0,
            occupiedRooms: 0,
            cleaningRooms: 0,
            maintenanceRooms: 0,
            occupancyRate: 0
        },
        revenue: {
            today: 0,
            week: 0,
            month: 0,
            year: 0
        },
        todayActivity: {
            checkIns: 0,
            checkOuts: 0,
            bookings: 0,
            pendingHousekeeping: 0
        },
        occupancyData: [],
        revenueByCategory: [],
        upcomingBookings: [],
        upcomingCheckOuts: []
    });

    // Booking date picker
    const [bookingDate, setBookingDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });

    // Check-out date picker
    const [checkOutDate, setCheckOutDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [upcomingCheckOuts, setUpcomingCheckOuts] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    // ✅ NEW: Today's Check-ins and Check-outs lists
    const [todayCheckIns, setTodayCheckIns] = useState([]);
    const [todayCheckOuts, setTodayCheckOuts] = useState([]);

    // ============================================
    // FETCH DATA
    // ============================================
    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard/stats`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
                setUpcomingBookings(data.data.upcomingBookings || []);
                setUpcomingCheckOuts(data.data.upcomingCheckOuts || []);
                setLastUpdated(new Date());
            } else {
                throw new Error(data.message || 'Failed to fetch dashboard stats');
            }
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    // ✅ NEW: Fetch Today's Check-ins
    const fetchTodayCheckIns = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard/today-checkins`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setTodayCheckIns(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching today's check-ins:", error);
        }
    };

    // ✅ NEW: Fetch Today's Check-outs
    const fetchTodayCheckOuts = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard/today-checkouts`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setTodayCheckOuts(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching today's check-outs:", error);
        }
    };

    const fetchUpcomingBookings = async (date) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard/upcoming-bookings?date=${date}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setUpcomingBookings(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching upcoming bookings:", error);
        }
    };

    const fetchUpcomingCheckOuts = async (date) => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/dashboard/upcoming-checkouts?date=${date}`,
                { credentials: 'include' }
            );
            const data = await response.json();
            if (data.success) {
                setUpcomingCheckOuts(data.data || []);
            }
        } catch (error) {
            console.error("Error fetching upcoming check-outs:", error);
        }
    };

    const handleRefresh = async () => {
        await fetchDashboardStats();
        await fetchTodayCheckIns();
        await fetchTodayCheckOuts();
    };

    useEffect(() => {
        fetchDashboardStats();
        fetchTodayCheckIns();
        fetchTodayCheckOuts();
    }, []);

    useEffect(() => {
        if (bookingDate) {
            fetchUpcomingBookings(bookingDate);
        }
    }, [bookingDate]);

    useEffect(() => {
        if (checkOutDate) {
            fetchUpcomingCheckOuts(checkOutDate);
        }
    }, [checkOutDate]);

    // ============================================
    // CHART DATA
    // ============================================
    const occupancyChartData = {
        labels: stats.occupancyData.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        }),
        datasets: [
            {
                label: 'Occupancy Rate (%)',
                data: stats.occupancyData.map(item => item.occupancyRate),
                backgroundColor: 'rgba(63, 63, 145, 0.7)',
                borderColor: '#3f3f91',
                borderWidth: 1,
                borderRadius: 4,
            }
        ]
    };

    const occupancyChartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.parsed.y}% Occupied`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: function (value) {
                        return value + '%';
                    }
                }
            }
        }
    };

    const revenueCategoryChartData = {
        labels: stats.revenueByCategory.map(item => item.category),
        datasets: [
            {
                label: 'Revenue (₹)',
                data: stats.revenueByCategory.map(item => item.total),
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
                borderRadius: 4,
            }
        ]
    };

    const revenueCategoryOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `₹${context.parsed.y.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return '₹' + value.toLocaleString();
                    }
                }
            }
        }
    };

    // ============================================
    // FORMAT FUNCTIONS
    // ============================================
    const formatCurrency = (amount) => {
        return '₹' + amount.toLocaleString('en-IN');
    };

    const formatTimeIST = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTimeOnly = (date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
        });
    };

    // ============================================
    // STATS CARDS
    // ============================================
    const StatCard = ({ icon, label, value, color, subtext }) => (
        <div className={`stat-card ${color}`}>
            <div className="stat-card-icon">{icon}</div>
            <div className="stat-card-content">
                <div className="stat-card-value">{value}</div>
                <div className="stat-card-label">{label}</div>
                {subtext && <div className="stat-card-subtext">{subtext}</div>}
            </div>
        </div>
    );

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="dashboard-main">
                <div className="dashboard-header">
                    <div className="dashboard-title">
                        <h1><FaHome /> Dashboard</h1>
                        {lastUpdated && (
                            <span className="last-updated">
                                Last updated: {lastUpdated.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <button
                        className="refresh-btn"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        <FaRedo className={loading ? 'spin' : ''} /> Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner large"></div>
                        <p>Loading dashboard data...</p>
                    </div>
                ) : (
                    <>
                        {/* ===== STATS CARDS ===== */}
                        <div className="stats-grid">
                            <StatCard
                                icon={<FaBuilding />}
                                label="Total Rooms"
                                value={stats.stats.totalRooms}
                                color="primary"
                            />
                            <StatCard
                                icon={<FaBed />}
                                label="Available"
                                value={stats.stats.availableRooms}
                                color="success"
                            />
                            <StatCard
                                icon={<FaDoorOpen />}
                                label="Occupied"
                                value={stats.stats.occupiedRooms}
                                color="warning"
                            />
                            <StatCard
                                icon={<FaBroom />}
                                label="Cleaning"
                                value={stats.stats.cleaningRooms}
                                color="info"
                                subtext={`${stats.stats.occupancyRate}% Occupancy`}
                            />
                        </div>

                        {/* ===== REVENUE CARDS ===== */}
                        <div className="revenue-grid">
                            <div className="revenue-card">
                                <span className="revenue-label">Today</span>
                                <span className="revenue-amount">{formatCurrency(stats.revenue.today)}</span>
                            </div>
                            <div className="revenue-card">
                                <span className="revenue-label">This Week</span>
                                <span className="revenue-amount">{formatCurrency(stats.revenue.week)}</span>
                            </div>
                            <div className="revenue-card">
                                <span className="revenue-label">This Month</span>
                                <span className="revenue-amount">{formatCurrency(stats.revenue.month)}</span>
                            </div>
                            <div className="revenue-card">
                                <span className="revenue-label">This Year</span>
                                <span className="revenue-amount">{formatCurrency(stats.revenue.year)}</span>
                            </div>
                        </div>

                        {/* ===== MIDDLE SECTION ===== */}
                        <div className="middle-section">
                            {/* Occupancy Chart */}
                            <div className="chart-card occupancy-chart">
                                <h3><FaChartBar /> Occupancy Rate (Last 7 Days)</h3>
                                {stats.occupancyData.length > 0 ? (
                                    <Bar data={occupancyChartData} options={occupancyChartOptions} />
                                ) : (
                                    <p className="no-data">No occupancy data available</p>
                                )}
                            </div>

                            {/* Today's Activity */}
                            <div className="activity-card">
                                <h3><FaClock /> Today's Activity</h3>
                                <div className="activity-items">
                                    <div className="activity-item">
                                        <span className="activity-icon check-in"><FaSignOutAlt /></span>
                                        <span className="activity-label">Check-ins</span>
                                        <span className="activity-value">{stats.todayActivity.checkIns}</span>
                                    </div>
                                    <div className="activity-item">
                                        <span className="activity-icon check-out"><FaSignOutAlt /></span>
                                        <span className="activity-label">Check-outs</span>
                                        <span className="activity-value">{stats.todayActivity.checkOuts}</span>
                                    </div>
                                    <div className="activity-item">
                                        <span className="activity-icon booking"><FaBook /></span>
                                        <span className="activity-label">Bookings</span>
                                        <span className="activity-value">{stats.todayActivity.bookings}</span>
                                    </div>
                                    <div className="activity-item">
                                        <span className="activity-icon cleaning"><FaBroom /></span>
                                        <span className="activity-label">Cleaning Pending</span>
                                        <span className="activity-value">{stats.todayActivity.pendingHousekeeping}</span>
                                    </div>
                                </div>

                                {/* Revenue by Category */}
                                <div className="revenue-category-section">
                                    <h4>Revenue by Category</h4>
                                    {stats.revenueByCategory.length > 0 ? (
                                        <Bar data={revenueCategoryChartData} options={revenueCategoryOptions} />
                                    ) : (
                                        <p className="no-data">No revenue data available</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ===== TODAY'S CHECK-INS TABLE ===== */}
                        <div className="today-section">
                            <div className="today-card">
                                <div className="today-header">
                                    <h3><FaCheckCircle style={{ color: '#2e7d32' }} /> Today's Check-ins ({todayCheckIns.length})</h3>
                                </div>
                                {todayCheckIns.length > 0 ? (
                                    <table className="today-table">
                                        <thead>
                                            <tr>
                                                <th>Check-in #</th>
                                                <th>Guest</th>
                                                <th>Phone</th>
                                                <th>Room</th>
                                                <th>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {todayCheckIns.map((checkIn) => (
                                                <tr key={checkIn.checkInId || checkIn.checkInNumber}>
                                                    <td>{checkIn.checkInNumber}</td>
                                                    <td>{checkIn.customerName}</td>
                                                    <td>{checkIn.customerPhone}</td>
                                                    <td>{checkIn.roomNumber}</td>
                                                    <td>{formatTimeOnly(checkIn.checkInDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="no-data">No check-ins today</p>
                                )}
                            </div>

                            {/* ===== TODAY'S CHECK-OUTS TABLE ===== */}
                            <div className="today-card">
                                <div className="today-header">
                                    <h3><FaSignOutAlt style={{ color: '#ed6c02' }} /> Today's Check-outs ({todayCheckOuts.length})</h3>
                                </div>
                                {todayCheckOuts.length > 0 ? (
                                    <table className="today-table">
                                        <thead>
                                            <tr>
                                                <th>Check-out #</th>
                                                <th>Guest</th>
                                                <th>Phone</th>
                                                <th>Room</th>
                                                <th>Time</th>
                                                <th>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {todayCheckOuts.map((checkOut) => (
                                                <tr key={checkOut.checkOutId || checkOut.checkOutNumber}>
                                                    <td>{checkOut.checkOutNumber}</td>
                                                    <td>{checkOut.customerName}</td>
                                                    <td>{checkOut.customerPhone}</td>
                                                    <td>{checkOut.roomNumber}</td>
                                                    <td>{formatTimeOnly(checkOut.completedAt)}</td>
                                                    <td>{formatCurrency(checkOut.finalTotal || 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="no-data">No check-outs today</p>
                                )}
                            </div>
                        </div>

                        {/* ===== BOTTOM SECTION ===== */}
                        <div className="bottom-section">
                            {/* Upcoming Bookings */}
                            <div className="upcoming-card">
                                <div className="upcoming-header">
                                    <h3><FaBook /> Upcoming Bookings</h3>
                                    <div className="date-picker-wrap">
                                        <input
                                            type="date"
                                            value={bookingDate}
                                            onChange={(e) => setBookingDate(e.target.value)}
                                            className="date-picker"
                                        />
                                    </div>
                                </div>
                                {upcomingBookings.length > 0 ? (
                                    <table className="upcoming-table">
                                        <thead>
                                            <tr>
                                                <th>Booking #</th>
                                                <th>Guest</th>
                                                <th>Room</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcomingBookings.map((booking) => (
                                                <tr key={booking.bookingNumber}>
                                                    <td>{booking.bookingNumber}</td>
                                                    <td>
                                                        {booking.customerName}
                                                        <span className="phone-small">{booking.customerPhone}</span>
                                                    </td>
                                                    <td>{booking.roomNumber}</td>
                                                    <td>{formatDate(booking.checkInDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="no-data">No bookings for selected date</p>
                                )}
                            </div>

                            {/* Upcoming Check-outs */}
                            <div className="upcoming-card">
                                <div className="upcoming-header">
                                    <h3><FaSignOutAlt /> Upcoming Check-outs</h3>
                                    <div className="date-picker-wrap">
                                        <input
                                            type="date"
                                            value={checkOutDate}
                                            onChange={(e) => setCheckOutDate(e.target.value)}
                                            className="date-picker"
                                        />
                                    </div>
                                </div>
                                {upcomingCheckOuts.length > 0 ? (
                                    <table className="upcoming-table">
                                        <thead>
                                            <tr>
                                                <th>Check-in #</th>
                                                <th>Guest</th>
                                                <th>Room</th>
                                                <th>Time (IST)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcomingCheckOuts.map((checkOut) => (
                                                <tr key={checkOut.checkInNumber}>
                                                    <td>{checkOut.checkInNumber}</td>
                                                    <td>
                                                        {checkOut.customerName}
                                                        <span className="phone-small">{checkOut.customerPhone}</span>
                                                    </td>
                                                    <td>{checkOut.roomNumber}</td>
                                                    <td>{formatTimeIST(checkOut.checkOutDate)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="no-data">No check-outs for selected date</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Navbar>
    );
};

export default Dashboard;