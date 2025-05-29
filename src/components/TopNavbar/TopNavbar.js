import { Navbar, Container, Dropdown, Badge } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./TopNavbar.css";
import logo from "../../resources/images/Harmos-Logo-Transparente.png";
import { useContext, useState } from "react";
import { FaBell, FaUserCircle, FaCog, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { AuthContext } from "../../context/AuthContext";

const TopNavbar = () => {
    const { logout, isAdmin } = useContext(AuthContext);
    const [notifications] = useState([]);

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
                <div className="d-flex align-items-center">
                    {/* Panel de Administración */}
                    {isAdmin && (
                        <Link to="/admin" className="nav-icon-button me-3">
                            <FaUserShield className="nav-icon" />
                        </Link>
                    )}

                    {/* Notificaciones */}
                    <Dropdown align="end" className="me-3">
                        <Dropdown.Toggle as="div" className="nav-icon-button">
                            <FaBell className="nav-icon" />
                            {notifications.length > 0 && (
                                <Badge bg="danger" className="notification-badge">
                                    {notifications.length}
                                </Badge>
                            )}
                        </Dropdown.Toggle>

                        <Dropdown.Menu className="notification-dropdown">
                            <Dropdown.Header>Notificaciones</Dropdown.Header>
                            {notifications.length === 0 ? (
                                <Dropdown.Item disabled>No hay notificaciones</Dropdown.Item>
                            ) : (
                                notifications.map((notification, index) => (
                                    <Dropdown.Item key={index}>
                                        {notification.message}
                                    </Dropdown.Item>
                                ))
                            )}
                        </Dropdown.Menu>
                    </Dropdown>

                    {/* Perfil de usuario */}
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
