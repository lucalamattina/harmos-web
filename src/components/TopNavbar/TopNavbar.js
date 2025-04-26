import {Navbar, Container, NavItem} from "react-bootstrap";
import { Link } from "react-router-dom";
import "./TopNavbar.css";
import logo from "../../resources/images/Harmos-Logo-Transparente.png"

const TopNavbar = () => {
    return (
        <>
            <Navbar collapseOnSelect expand="lg navbar-shadow">
                <Container className="row min-vw-100" id="header">
                    <Navbar.Brand className="col-2 float-start" as={Link} to="/" >
                        <img className="Logo-Harmos float-start-20" src={logo} alt="Logo"  />
                    </Navbar.Brand>
                    <NavItem className="col-8">
                        <h1 id="headerTitle">Harmos</h1>
                    </NavItem>
                    <Navbar.Text className="col-2">
                        <i className="bi bi-bell-fill icon-nav-bar"/>
                        <i className="bi bi-person-circle px-3 icon-nav-bar"/>
                        <i className="bi bi-gear-fill icon-nav-bar"/>
                    </Navbar.Text>
                </Container>
            </Navbar>
        </>
    );
};

export default TopNavbar;
