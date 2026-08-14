import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Customer from './Pages/Customer/Customer';
import Login from './Pages/Authentication/Login/Login';
import Register from './Pages/Authentication/Register/Register';
import AdminUsers from './Pages/Authentication/Admin/AdminUsers';

import ProtectedRoute from './Components/Protected/ProtectedRoute';
import PermissionRoute from './Components/Protected/PermissionRoute';

import Logs from "./Pages/Logs/Logs";
import Category from "./Pages/Management/Category/Category";
import Room from "./Pages/Management/Room/Room";
import CheckIn from "./Pages/CheckIn/CheckIn";
import Booking from "./Pages/Booking/Booking";
import CheckOut from "./Pages/Checkout/CheckOut";
import Housekeeping from "./Pages/Housekeeping/Housekeeping";
import Dashboard from "./Pages/Dashboard/Dashboard";
import Reports from "./Pages/Reports/Reports";
import Expense from "./Pages/Expense/Expense";
import WebsiteBookingList from "./Pages/WebsiteInfo/WebsiteBookingList/WebsiteBookingList";
import ContactList from "./Pages/WebsiteInfo/Contact/ContactList";
import NewsletterList from "./Pages/WebsiteInfo/Newsletter/NewsletterList";

function App() {
  return (
    <BrowserRouter>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        <div style={{ flex: 1 }}>
          <Routes>
            {/* ===== PUBLIC ROUTES ===== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/logs" element={<Logs />} />

            {/* ===== PROTECTED ROUTES WITH CORRECT PERMISSIONS ===== */}

            {/* Dashboard - admin OR reception OR housekeeping */}
            <Route path="/" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="dashboard">
                  <Dashboard />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Customer - admin OR customer */}
            <Route path="/customer" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="customer">
                  <Customer />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Admin Users - admin ONLY */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <AdminUsers />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Category - admin ONLY */}
            <Route path="/category" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <Category />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Room - admin ONLY */}
            <Route path="/room" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <Room />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Check-In - admin OR reception OR checkin */}
            <Route path="/check-in" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="checkin">
                  <CheckIn />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Check-Out - admin OR reception OR checkout */}
            <Route path="/checkout" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="checkout">
                  <CheckOut />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Booking - admin OR reception */}
            <Route path="/booking" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="booking">
                  <Booking />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Housekeeping - admin OR reception OR housekeeping */}
            <Route path="/housekeeping" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="housekeeping">
                  <Housekeeping />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Reports - admin OR reports */}
            <Route path="/reports" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="reports">
                  <Reports />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* Expense - admin OR expense */}
            <Route path="/expense" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="expense">
                  <Expense />
                </PermissionRoute>
              </ProtectedRoute>
            } />


            {/* ===== HOTELWEBSITE ROUTES ===== */}
            <Route path="/website-bookings" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <WebsiteBookingList />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/contact" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <ContactList />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            <Route path="/newsletter" element={
              <ProtectedRoute>
                <PermissionRoute requiredPermission="admin">
                  <NewsletterList />
                </PermissionRoute>
              </ProtectedRoute>
            } />

            {/* ===== FALLBACK ROUTE ===== */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;