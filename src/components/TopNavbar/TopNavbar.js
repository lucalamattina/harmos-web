import { Navbar, Container, NavItem, Dropdown, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./TopNavbar.css";
import logo from "../../resources/images/Harmos-Logo-Transparente.png";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { FaBell, FaUserCircle, FaCog, FaSignOutAlt } from 'react-icons/fa';

const TopNavbar = () => {
    const { logout } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([
        { id: 1, message: "Nueva cita programada", time: "5 min" },
        { id: 2, message: "Recordatorio de reunión", time: "1 hora" }
    ]);

    const handleLogout = () => {
        logout();
    };

    return (
        <Navbar collapseOnSelect expand="lg" className="navbar-shadow">
            <Container fluid className="px-4 d-flex align-items-center justify-content-between">
                {/* Logo a la izquierda */}
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                    <img className="Logo-Harmos" src={logo} alt="Logo" />
                </Navbar.Brand>

                {/* Título centrado */}
                <div className="flex-grow-1 d-flex justify-content-center">
                    <h1 id="headerTitle">Harmos</h1>
                </div>

                {/* Íconos a la derecha */}
                <div className="d-flex align-items-center gap-3" style={{ minWidth: 120, justifyContent: 'flex-end' }}>
                    {/* Notifications Dropdown */}
                    <Dropdown align="end">
                        <Dropdown.Toggle as="div" className="nav-icon-button">
                            <div className="position-relative">
                                <FaBell className="nav-icon" />
                                {notifications.length > 0 && (
                                    <Badge 
                                        bg="danger" 
                                        className="position-absolute top-0 start-100 translate-middle rounded-circle"
                                    >
                                        {notifications.length}
                                    </Badge>
                                )}
                            </div>
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="notification-dropdown">
                            <Dropdown.Header>Notificaciones</Dropdown.Header>
                            {notifications.map(notification => (
                                <Dropdown.Item key={notification.id} className="notification-item">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span>{notification.message}</span>
                                        <small className="text-muted">{notification.time}</small>
                                    </div>
                                </Dropdown.Item>
                            ))}
                            {notifications.length === 0 && (
                                <Dropdown.Item disabled>No hay notificaciones</Dropdown.Item>
                            )}
                            <Dropdown.Divider />
                            <Dropdown.Item as={Link} to="/notifications" className="text-center">
                                Ver todas
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* User Profile Dropdown */}
                    <Dropdown align="end">
                        <Dropdown.Toggle as="div" className="nav-icon-button">
                            <FaUserCircle className="nav-icon" />
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="profile-dropdown">
                            <Dropdown.Header>Mi Cuenta</Dropdown.Header>
                            <Dropdown.Item as={Link} to="/profile">
                                <FaUserCircle className="me-2" /> Perfil
                            </Dropdown.Item>
                            <Dropdown.Item as={Link} to="/settings">
                                <FaCog className="me-2" /> Configuración
                            </Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item onClick={handleLogout} className="text-danger">
                                <FaSignOutAlt className="me-2" /> Cerrar Sesión
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </Container>
        </Navbar>
    );
};

export default TopNavbar;
