import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
  FaPlus, FaSearch, FaEdit, FaSave, FaTrash, FaTimes,
  FaDoorOpen, FaTag, FaLayerGroup, FaBed
} from "react-icons/fa";
import Navbar from "../../../Components/Navbar/Navbar";
import "./Room.scss";
import "react-toastify/dist/ReactToastify.css";

const Room = () => {
  const [showForm, setShowForm] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch categories for dropdown
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

  // Fetch rooms
  const fetchRooms = async (search = '', status = '', categoryId = '') => {
    try {
      setIsLoading(true);
      const url = new URL(`${import.meta.env.VITE_API_URL}/room/get-rooms`);
      url.searchParams.append('page', 1);
      url.searchParams.append('limit', 50);
      if (search) {
        url.searchParams.append('search', search);
      }
      if (status) {
        url.searchParams.append('status', status);
      }
      if (categoryId) {
        url.searchParams.append('categoryId', categoryId);
      }

      const response = await fetch(url, {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success) {
        setRooms(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch rooms');
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      toast.error("Failed to fetch rooms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchRooms(debouncedSearch, filterStatus, filterCategory);
  }, [debouncedSearch, filterStatus, filterCategory]);

  // Handle row selection
  const selectRoom = (roomId) => {
    setSelectedRoom((prev) => (prev === roomId ? null : roomId));
  };

  // Initial values for form - REMOVED status
  const initialValues = {
    roomNumber: "",
    categoryId: "",
    floorNumber: 1,
    specialFeatures: "",
    isActive: true
  };

  // Validation schema - REMOVED status validation
  const validationSchema = Yup.object({
    roomNumber: Yup.string()
      .required("Room number is required")
      .min(1, "Room number must be at least 1 character"),
    categoryId: Yup.string()
      .required("Category is required"),
    floorNumber: Yup.number()
      .min(0, "Floor number must be 0 or greater")
      .max(100, "Floor number must be 100 or less"),
    specialFeatures: Yup.string(),
    isActive: Yup.boolean()
  });

  // Handle submit - REMOVED status from payload
  const handleSubmit = async (values, { resetForm, setFieldError }) => {
    try {
      setIsFormSubmitting(true);

      // ✅ Status is NOT sent - backend will set default 'Available'
      const payload = {
        roomNumber: values.roomNumber,
        categoryId: values.categoryId,
        floorNumber: values.floorNumber,
        specialFeatures: values.specialFeatures,
        isActive: values.isActive
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/room/create-room`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: 'include'
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.field === "roomNumber") {
          setFieldError("roomNumber", "Room number already exists");
          toast.error("Room number already exists");
        } else if (data.field === "categoryId") {
          setFieldError("categoryId", "Category not found");
          toast.error("Category not found");
        } else {
          throw new Error(data.message || "Failed to add room");
        }
        return;
      }

      toast.success("Room added successfully!");
      resetForm();
      setShowForm(false);
      fetchRooms(debouncedSearch, filterStatus, filterCategory);
    } catch (error) {
      console.error("Error adding room:", error);
      toast.error(error.message || "Error creating room");
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Handle update - REMOVED status from payload
  const handleUpdateRoom = async (updatedRoom) => {
    try {
      const roomId = updatedRoom.roomId;
      const dataToSend = { ...updatedRoom };

      // ✅ Remove fields that shouldn't be updated
      delete dataToSend.createdAt;
      delete dataToSend.updatedAt;
      delete dataToSend.categoryDetails;
      delete dataToSend.status; // ❌ REMOVED status - should NOT be manually updated
      delete dataToSend.actualStatus;
      delete dataToSend.isDynamicallyCalculated;
      delete dataToSend.futureBooking;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/room/update-room/${roomId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update room");
      }

      toast.success("Room updated successfully!");
      fetchRooms(debouncedSearch, filterStatus, filterCategory);
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error(error.message || "Error updating room");
    }
  };

  // Handle delete
  const handleDeleteRoom = async (roomId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/room/delete-room/${roomId}`,
        {
          method: "DELETE",
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete room");
      }

      setSelectedRoom(null);
      toast.success("Room deleted successfully!");
      fetchRooms(debouncedSearch, filterStatus, filterCategory);
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error(error.message || "Error deleting room");
    }
  };

  // ============================================
  // ROOM MODAL COMPONENT
  // ============================================
  const RoomModal = ({ room, onClose, onUpdate, onDelete, categoriesList }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedRoom, setEditedRoom] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }, []);

    useEffect(() => {
      if (room) {
        // ✅ Remove status from editedRoom so it can't be changed
        const { status, actualStatus, isDynamicallyCalculated, futureBooking, ...cleanRoom } = room;
        setEditedRoom({ ...cleanRoom });
        setErrors({});
      }
    }, [room]);

    const validateForm = (values) => {
      const newErrors = {};

      if (!values.roomNumber) newErrors.roomNumber = "Room number is required";
      if (!values.categoryId) newErrors.categoryId = "Category is required";

      return newErrors;
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      const updated = { ...editedRoom, [name]: value };
      setEditedRoom(updated);
      const fieldErrors = validateForm(updated);
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
    };

    const handleSave = async () => {
      const formErrors = validateForm(editedRoom);
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        toast.error("Please fix the errors before saving");
        return;
      }

      try {
        await onUpdate(editedRoom);
        setIsEditing(false);
        setErrors({});
      } catch (error) {
        console.error("Error updating room:", error);
      }
    };

    if (!room) return null;

    const categoryName = categoriesList.find(c => c.categoryId === room.categoryId)?.categoryName || 'Unknown';

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">
              {isEditing ? "Edit Room" : `Room: ${room.roomNumber}`}
            </div>
            <button className="modal-close" onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-body">
            <div className="wo-details-grid">
              <div className="detail-row">
                <span className="detail-label">Room Number *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="roomNumber"
                      value={editedRoom.roomNumber || ''}
                      onChange={handleInputChange}
                      className={`edit-input ${errors.roomNumber ? 'error' : ''}`}
                    />
                    {errors.roomNumber && <div className="error-message">{errors.roomNumber}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{room.roomNumber}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">Category *</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <select
                      name="categoryId"
                      value={editedRoom.categoryId || ''}
                      onChange={handleInputChange}
                      className={`edit-select ${errors.categoryId ? 'error' : ''}`}
                    >
                      <option value="">Select Category</option>
                      {categoriesList.map(cat => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.categoryName}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && <div className="error-message">{errors.categoryId}</div>}
                  </div>
                ) : (
                  <span className="detail-value">{categoryName}</span>
                )}
              </div>

              <div className="detail-row">
                <span className="detail-label">Floor</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="number"
                      name="floorNumber"
                      value={editedRoom.floorNumber || 1}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  </div>
                ) : (
                  <span className="detail-value">{room.floorNumber || 1}</span>
                )}
              </div>

              {/* ✅ STATUS - SHOW ONLY (READ-ONLY) */}
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`status-badge status-${room.status?.toLowerCase()}`}>
                  {room.status || 'Available'}
                </span>
                {/* <small className="status-note">Status is automatically calculated based on check-ins and bookings</small> */}
              </div>

              <div className="detail-row">
                <span className="detail-label">Special Features</span>
                {isEditing ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      name="specialFeatures"
                      value={editedRoom.specialFeatures || ''}
                      onChange={handleInputChange}
                      className="edit-input"
                    />
                  </div>
                ) : (
                  <span className="detail-value">{room.specialFeatures || 'N/A'}</span>
                )}
              </div>

              {room.categoryDetails && (
                <div className="detail-row">
                  <span className="detail-label">Category Pricing</span>
                  <div className="pricing-grid">
                    <div className="pricing-item">
                      <span className="pricing-item-label">Per Day</span>
                      <span className="pricing-item-value">₹{room.categoryDetails.pricing?.perDay || 0}</span>
                    </div>
                    <div className="pricing-item">
                      <span className="pricing-item-label">6 Hours</span>
                      <span className="pricing-item-value">₹{room.categoryDetails.pricing?.per6Hours || 0}</span>
                    </div>
                    <div className="pricing-item">
                      <span className="pricing-item-label">12 Hours</span>
                      <span className="pricing-item-value">₹{room.categoryDetails.pricing?.per12Hours || 0}</span>
                    </div>
                    <div className="pricing-item">
                      <span className="pricing-item-label">Extra/Hr</span>
                      <span className="pricing-item-value">₹{room.categoryDetails.pricing?.extraHourCharge || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              className={`update-btn ${isEditing ? 'save-btn' : ''}`}
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
            >
              {isEditing ? <FaSave /> : <FaEdit />}
              {isEditing ? "Save" : "Update"}
            </button>
            <button
              className="delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FaTrash /> Delete
            </button>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete Room {room.roomNumber}? This action cannot be undone.</p>
              <div className="confirm-buttons">
                <button className="confirm-cancel" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="confirm-delete" onClick={() => {
                  onDelete(room.roomId);
                  setShowDeleteConfirm(false);
                }}>
                  Delete
                </button>
              </div>
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
      <div className="main">
        <div className="page-header">
          <div className="right-section">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search Rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filters-group">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Booked">Booked</option>
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>
            <div className="action-buttons-group">
              <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                <FaPlus /> {showForm ? "Close" : "Add Room"}
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="form-container premium">
            <h2>Add Room</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              <Form>
                <div className="form-row">
                  <div className="form-field">
                    <label><FaDoorOpen /> Room Number *</label>
                    <Field name="roomNumber" type="text" />
                    <ErrorMessage name="roomNumber" component="div" className="error" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label><FaTag /> Category *</label>
                    <Field name="categoryId" as="select">
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.categoryName}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="categoryId" component="div" className="error" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label><FaLayerGroup /> Floor Number</label>
                    <Field name="floorNumber" type="number" />
                    <ErrorMessage name="floorNumber" component="div" className="error" />
                  </div>
                </div>

                {/* ❌ REMOVED STATUS DROPDOWN - Status is auto-calculated */}

                <div className="form-row">
                  <div className="form-field">
                    <label>Special Features</label>
                    <Field name="specialFeatures" type="text" />
                    <ErrorMessage name="specialFeatures" component="div" className="error" />
                  </div>
                </div>

                <button type="submit" disabled={isFormSubmitting}>
                  {isFormSubmitting ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Adding...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </Form>
            </Formik>
          </div>
        )}

        <div className="data-table">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner large"></div>
              <p>Loading rooms...</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Room #</th>
                  <th>Category</th>
                  <th>Floor</th>
                  <th>Status</th>
                  <th>Per Day</th>
                  <th>Features</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                  <tr
                    key={room.roomId || index}
                    className={selectedRoom === room.roomId ? "selected" : ""}
                    onClick={() => selectRoom(room.roomId)}
                  >
                    <td>{room.roomNumber}</td>
                    <td>{room.categoryDetails?.categoryName || 'N/A'}</td>
                    <td>{room.floorNumber || 1}</td>
                    <td>
                      <span className={`status-badge status-${room.status?.toLowerCase()}`}>
                        {room.status || 'Available'}
                      </span>
                    </td>
                    <td>₹{room.categoryDetails?.pricing?.perDay || 0}</td>
                    <td>{room.specialFeatures || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedRoom && (
          <RoomModal
            room={rooms.find(r => r.roomId === selectedRoom)}
            onClose={() => setSelectedRoom(null)}
            onUpdate={handleUpdateRoom}
            onDelete={handleDeleteRoom}
            categoriesList={categories}
          />
        )}
      </div>
    </Navbar>
  );
};

export default Room;