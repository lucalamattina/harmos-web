import "./SideNavbar.css";
import {Link} from "react-router-dom";

const SideNavbar = () => {
    return (
        <>
            <div className="container-fluid">
                <div className="row flex-nowrap">
                    <div className="side-bar-nav-item">
                        <div className="container-fluid">
                            <Link to="/" className="nav-link pt-2">
                                <span className="ms-1 d-none side-bar-word d-sm-inline">Anuncios</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="row flex-nowrap">
                    <div className="side-bar-nav-item">
                        <div className="container-fluid">
                            <Link to="/" className="nav-link pt-2">
                                <span className="ms-1 d-none side-bar-word d-sm-inline">Informes</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="row flex-nowrap">
                    <div className="side-bar-nav-item">
                        <div className="container-fluid ">
                            <Link to="/" className="nav-link pt-2">
                                <span className="ms-1 d-none side-bar-word d-sm-inline">Pacientes</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="row flex-nowrap">
                    <div className="side-bar-nav-item">
                        <div className="container-fluid ">
                            <Link to="/schedule" className="nav-link pt-2">
                                <span className="ms-1 d-none side-bar-word d-sm-inline">Horarios</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="row flex-nowrap">
                    <div className="px-sm-2 px-0 green-bg">
                        <div className="d-flex flex-column min-vh-100">
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SideNavbar;
