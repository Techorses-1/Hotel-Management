import React, { useState, useEffect } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

// Icon imports
import { BiLogOut, BiLayout, BiLogIn } from "react-icons/bi";
import {
  TbLayoutGridAdd,
  TbMessages,
  TbUsers,
  TbReportAnalytics,
  TbTrash,
  TbPackage,
  TbTools,
  TbBottle,
  TbFlask,
  TbChevronDown,
  TbChevronRight,
  TbBed,
  TbBook,
  TbChecklist,
  TbWallet,
  TbHome,
  TbChartBar,
  TbUserCheck,
  TbUserX,
  TbBuilding,
  TbCalendarCheck,
  TbCalendarOff
} from "react-icons/tb";
import { LuCircleDot, LuFile } from "react-icons/lu";
import { CiShoppingBasket } from "react-icons/ci";
import { HiOutlineHome } from "react-icons/hi";
import { BsBell } from "react-icons/bs";
import { GiHamburgerMenu } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { FiUser } from "react-icons/fi";
import { MdDiscount } from "react-icons/md";
import { 
  FaSearch, 
  FaFileExcel, 
  FaPlus, 
  FaBox, 
  FaFlask, 
  FaSyringe, 
  FaVial, 
  FaWarehouse,
  FaBed,
  FaBook,
  FaClipboardCheck,
  FaClipboardList,
  FaWallet,
  FaHome,
  FaChartBar,
  FaUserCheck,
  FaUserTimes,
  FaBuilding,
  FaCalendarCheck,
  FaCalendarTimes , 
  FaUsers 
} from "react-icons/fa";

import logo from "../../assets/logo/jass_logo_new.png";
import "./Navbar.scss";

const Navbar = ({
  children,
  onNavigation,
  isCollapsed = false,
  onToggleCollapse,
  pageDashboard = null
}) => {
  const [toggle, setToggle] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  // Sync with parent's collapsed state
  useEffect(() => {
    setToggle(isCollapsed);
  }, [isCollapsed]);

  const handleToggle = (newToggleState) => {
    setToggle(newToggleState);
    if (onToggleCollapse) {
      onToggleCollapse(newToggleState);
    }
  };

  const handleHamburgerClick = () => {
    handleToggle(!toggle);
  };

  const handleCrossClick = () => {
    handleToggle(true);
  };

  const handleMenuIconHiddenClick = () => {
    handleToggle(false);
  };

  // Toggle dropdown
  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ✅ CHECK AUTH USING COOKIE
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const permissions = data.user?.permissions || [];
          setUserPermissions(permissions);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          setUserPermissions([]);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoggedIn(false);
        setUserPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    navigate("/login");
  };

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: "POST",
        credentials: 'include'
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setIsLoggedIn(false);
    setUserPermissions([]);
    navigate("/login");
  };

  const getPageTitle = () => {
    const route = location.pathname;
    switch (route) {
      case '/customer':
        return 'Customer Dashboard';
      case '/inventory/xp':
        return 'XP Inventory Management';
      case '/inventory/dispenser':
        return 'Dispenser Inventory Management';
      case '/inventory/bottles':
        return 'Bottles Inventory Management';
      case '/inventory/exclusive':
        return 'Exclusive Inventory Management';
      case '/dashboard':
        return 'Dashboard';
      case '/admin':
        return 'Admin Dashboard';
      case '/productdisposal':
        return 'Product Disposal Dashboard';
      case '/report':
        return 'Business Reports And Analytics';
      case '/':
        return 'Invoice Creation & Management';
      case '/packages':
        return 'Package Management';
      case '/workshop':
        return 'Workshop Management';
      case '/promo':
        return 'Promo Code Management';
      default:
        return '';
    }
  };

  const pageTitle = getPageTitle();

  // ✅ UPDATED MENU CONFIGURATION WITH CORRECT ICONS
  const menuConfig = [
    {
      id: 'dashboard',
      icon: <FaHome />,
      title: "Dashboard",
      path: "/",
      permission: "dashboard"
    },
    {
      id: 'category',
      icon: <TbLayoutGridAdd />,
      title: "Category",
      path: "/category",
      permission: "admin"
    },
    {
      id: 'room',
      icon: <FaBed />,
      title: "Room",
      path: "/room",
      permission: "admin"
    },
    {
      id: 'booking',
      icon: <FaBook />,
      title: "Booking",
      path: "/booking",
      permission: "admin"
    },
    {
      id: 'checkin',
      icon: <FaUserCheck />,
      title: "Check In",
      path: "/check-in",
      permission: "admin"
    },
    {
      id: 'checkout',
      icon: <FaUserTimes />,
      title: "Check Out",
      path: "/checkout",
      permission: "admin"
    },
    {
      id: 'housekeeping',
      icon: <FaClipboardCheck />,
      title: "Housekeeping",
      path: "/housekeeping",
      permission: "admin"
    },
    {
      id: 'customer',
      icon: <FaUsers />,
      title: "Customer",
      path: "/customer",
      permission: "customer"
    },
    {
      id: 'expense',
      icon: <FaWallet />,
      title: "Expense",
      path: "/expense",
      permission: "expense"
    },

    {
      id: 'admin',
      icon: <FaUserCheck />,
      title: "Admin",
      path: "/admin",
      permission: "admin"
    },
    {
      id: 'reports',
      icon: <FaChartBar />,
      title: "Reports",
      path: "/reports",
      permission: "admin"
    } ,
    {
      id: 'websitebooking',
      icon: <FaChartBar />,
      title: "Website-Bookings",
      path: "/website-bookings",
      permission: "admin"
    } ,
    {
      id: 'newsletter',
      icon: <FaChartBar />,
      title: "Newsletter",
      path: "/newsletter",
      permission: "admin"
    } ,
    {
      id: 'contact',
      icon: <FaChartBar />,
      title: "Contact",
      path: "/contact",
      permission: "admin"
    }
  ];

  // ✅ IMPROVED FILTERING - Handles admin, manager, and multiple permissions
  const getFilteredMenu = () => {
    // ✅ Admin gets everything
    if (userPermissions.includes("admin")) {
      return menuConfig;
    }

    // ✅ Manager gets dashboard and reports (even without explicit permission)
    const isManager = userPermissions.includes("manager");

    const filterItems = (items) => {
      return items
        .filter(item => {
          // If it's dashboard or report, check for manager or specific permission
          if (item.id === 'dashboard' && isManager) {
            return true;
          }
          if (item.id === 'reports' && isManager) {
            return true;
          }
          // For all other items, check if user has the specific permission
          return userPermissions.includes(item.permission);
        })
        .map(item => {
          if (item.isDropdown) {
            return {
              ...item,
              children: item.children.filter(child => {
                // For inventory, check if user has inventory permission OR is manager
                if (child.permission === 'inventory' && isManager) {
                  return true;
                }
                return userPermissions.includes(child.permission);
              })
            };
          }
          return item;
        })
        .filter(item => {
          if (item.isDropdown) {
            return item.children.length > 0;
          }
          return true;
        });
    };

    return filterItems(menuConfig);
  };

  const filteredMenuData = getFilteredMenu();

  // Check if any child is active
  const isChildActive = (children) => {
    return children.some(child => location.pathname === child.path);
  };

  // Render menu item
  const renderMenuItem = (item) => {
    if (item.isDropdown) {
      const isOpen = openDropdowns[item.id] || false;
      const hasActiveChild = isChildActive(item.children);

      return (
        <li key={item.id} className={`dropdown-item ${hasActiveChild ? 'active-parent' : ''}`}>
          <div
            className="dropdown-trigger"
            onClick={() => toggleDropdown(item.id)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-title">{item.title}</span>
            <span className="dropdown-arrow">
              {isOpen ? <TbChevronDown /> : <TbChevronRight />}
            </span>
          </div>
          <ul className={`dropdown-menu ${isOpen ? 'open' : ''}`}>
            {item.children.map(child => (
              <li key={child.id}>
                <NavLink
                  to={child.path}
                  className={({ isActive }) => (isActive ? "active" : "")}
                  onClick={(e) => {
                    if (onNavigation) {
                      e.preventDefault();
                      onNavigation(child.path);
                    }
                  }}
                >
                  <span className="menu-icon">{child.icon}</span>
                  <span className="menu-title">{child.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <NavLink
          to={item.path}
          className={({ isActive }) => (isActive ? "active" : "")}
          onClick={(e) => {
            if (onNavigation) {
              e.preventDefault();
              onNavigation(item.path);
            }
          }}
        >
          <span className="menu-icon">{item.icon}</span>
          <span className="menu-title">{item.title}</span>
        </NavLink>
      </li>
    );
  };

  // ✅ UPDATED LOADING SCREEN WITH THEME
  if (isLoading) {
    return (
      <div className="navbar-loading-container">
        <div className="navbar-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div id="sidebar" className={toggle ? "hide" : ""}>
        <div className="logo">
          <div className="logoBox">
            {toggle ? (
              <GiHamburgerMenu
                className="menuIconHidden"
                onClick={handleMenuIconHiddenClick}
              />
            ) : (
              <>
                <img src={logo} alt="Logo" className="sidebar-logo" />
                <RxCross1
                  className="menuIconHidden"
                  onClick={handleCrossClick}
                />
              </>
            )}
          </div>
        </div>

        <ul className="side-menu top">
          {filteredMenuData.map(item => renderMenuItem(item))}

          {isLoggedIn && (
            <li className="logout-menu-item">
              <button className="sidebar-logout-btn" onClick={handleLogout}>
                <BiLogOut />
                <span>Logout</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      <div id="content">
        <nav>
          <div className="nav-main">
            <GiHamburgerMenu
              className="menuIcon"
              onClick={handleHamburgerClick}
            />

            {pageTitle && (
              <div className="page-title">
                {pageTitle}
              </div>
            )}
          </div>

          <div>
            {!isLoggedIn ? (
              <button className="icon-button" onClick={handleLogin} title="Login">
                <BiLogIn />
              </button>
            ) : (
              <div className="profile">
                <div className="profile-icon" title="Account">
                  <FiUser />
                </div>
                <button className="icon-button" onClick={handleLogout} title="Logout">
                  <BiLogOut />
                </button>
              </div>
            )}
          </div>
        </nav>
        {children}
      </div>
    </>
  );
};

export default Navbar;