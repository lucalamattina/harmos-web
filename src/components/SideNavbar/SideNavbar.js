import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiBell, FiUsers, FiCalendar, FiFileText, FiMenu, FiX } from 'react-icons/fi';
import './SideNavbar.css';

const tabs = [
  { to: '/', label: 'Anuncios', icon: <FiBell /> },
  { to: '/patients', label: 'Pacientes', icon: <FiUsers /> },
  { to: '/schedule', label: 'Horarios', icon: <FiCalendar /> },
  { to: '/informes', label: 'Informes', icon: <FiFileText /> },
];

const NAVBAR_HEIGHT = 56; // px, adjust if your navbar is taller

const SideNavbar = () => {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav className="top-navbar-responsive">
        <button className="sidebar-hamburger" onClick={() => setDrawerOpen(true)}>
          <FiMenu size={28} />
        </button>
        <span className="navbar-logo-placeholder" />
      </nav>
      {/* Overlay for drawer */}
      {drawerOpen && <div className="sidebar-overlay" onClick={() => setDrawerOpen(false)}></div>}
      <nav className={`top-navbar sidebar-drawer${drawerOpen ? ' open' : ''}`} style={{ top: NAVBAR_HEIGHT }}>
        <button className="sidebar-close" onClick={() => setDrawerOpen(false)}>
          <FiX size={28} />
        </button>
        <ul className="top-navbar-list">
          {tabs.map((tab) => (
            <li key={tab.to} className="top-navbar-item">
              <Link
                to={tab.to}
                className={`top-navbar-link${location.pathname === tab.to ? ' active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <span className="top-navbar-icon">{tab.icon}</span>
                <span className="top-navbar-label">{tab.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default SideNavbar;