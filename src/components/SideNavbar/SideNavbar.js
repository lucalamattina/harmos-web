import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Estados para swipe en móviles
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Distancia mínima para considerar un swipe
  const minSwipeDistance = 50;

  // Detectar cambios de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sincronizar el índice actual con la ubicación
  useEffect(() => {
    const currentTabIndex = tabs.findIndex(tab => tab.to === location.pathname);
    if (currentTabIndex !== -1) {
      setCurrentIndex(currentTabIndex);
    }
  }, [location.pathname]);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      // Swipe izquierda: ir al siguiente (o al primero si estamos en el último)
      const nextIndex = (currentIndex + 1) % tabs.length;
      navigate(tabs[nextIndex].to);
    } else if (isRightSwipe) {
      // Swipe derecha: ir al anterior (o al último si estamos en el primero)
      const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
      navigate(tabs[prevIndex].to);
    }
  };

  return (
    <nav 
      className="side-navbar"
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchMove={isMobile ? onTouchMove : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
    >
      {isMobile ? (
        // Vista carrusel para móviles
        <div className="mobile-carousel">
          <div className="carousel-content">
            <Link
              to={tabs[currentIndex].to}
              className="side-navbar-link active"
            >
              <span className="side-navbar-icon">{tabs[currentIndex].icon}</span>
              <span className="side-navbar-label">{tabs[currentIndex].label}</span>
            </Link>
          </div>
          <div className="carousel-bottom">
            <div className="carousel-indicators">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className={`indicator ${index === currentIndex ? 'active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Vista desktop normal
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
      )}
    </nav>
  );
};

export default SideNavbar;