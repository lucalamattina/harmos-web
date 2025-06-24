import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiBell, FiUsers, FiCalendar, FiFileText } from 'react-icons/fi';
import './SideNavbar.css';

const tabs = [
  { to: '/', label: 'Anuncios', icon: <FiBell /> },
  { to: '/patients', label: 'Pacientes', icon: <FiUsers /> },
  { to: '/schedule', label: 'Horarios', icon: <FiCalendar /> },
      { to: '/reports', label: 'Informes', icon: <FiFileText /> },
];

const SideNavbar = () => {
  const location = useLocation();

  return (
    <nav className="top-navbar">
      <ul className="top-navbar-list">
        {tabs.map((tab) => (
          <li key={tab.to} className="top-navbar-item">
            <Link
              to={tab.to}
              className={`top-navbar-link${location.pathname === tab.to ? ' active' : ''}`}
            >
              <span className="top-navbar-icon">{tab.icon}</span>
              <span className="top-navbar-label">{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SideNavbar;