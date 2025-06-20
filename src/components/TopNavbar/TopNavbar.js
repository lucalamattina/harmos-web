import { Navbar, Container, Dropdown } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./TopNavbar.css";
import logo from "../../resources/images/Harmos-Logo-Transparente.png";
import { useContext } from "react";
import { FaUserCircle, FaCog, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { AuthContext } from "../../context/AuthContext";
import Notifications from "../Notifications/Notifications";

const TopNavbar = () => {
    const { logout, isAdmin } = useContext(AuthContext);

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
                    <div className="me-3">
                        <Notifications />
                    </div>

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
