import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="app-footer">
            <div className="container">
                <p className="mb-0">© {new Date().getFullYear()} Harmos. Todos los derechos reservados.</p>
            </div>
        </footer>
    );
};

export default Footer; 