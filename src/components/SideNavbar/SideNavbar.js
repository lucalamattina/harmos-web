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
    <nav className="side-navbar">
      <ul className="side-navbar-list">
        {tabs.map((tab) => (
          <li key={tab.to} className="side-navbar-item">
            <Link
              to={tab.to}
              className={`side-navbar-link${location.pathname === tab.to ? ' active' : ''}`}
            >
              <span className="side-navbar-icon">{tab.icon}</span>
              <span className="side-navbar-label">{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SideNavbar;