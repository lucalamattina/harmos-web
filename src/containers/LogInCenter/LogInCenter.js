import './LogInCenter.css'
import React, { useState } from 'react';
import logo from "../../resources/images/Harmos-Logo-no-letras.png"
import letrasLogo from "../../resources/images/Harmos Logo Letras.jpg"
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../api/api";
import { FaEnvelope, FaLock, FaSpinner } from 'react-icons/fa';

const Center = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/home";
    const { login } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const data = await loginUser(formData.email, formData.password);
            if (data && data.token) {
                login(data.token);
                navigate('/', { replace: true });
            } else {
                setError("Credenciales incorrectas");
            }
        } catch (err) {
            setError("Error de autenticación. Por favor, intente nuevamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <img className="harmos-logo" src={logo} alt="Harmos Logo Icon" />
                    <img className="login-logo" src={letrasLogo} alt="Harmos Logo" />
                </div>
                
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <div className="input-group">
                            <FaEnvelope className="input-icon" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Correo electrónico"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="input-group">
                            <FaLock className="input-icon" />
                            <input
                                type="password"
                                name="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-options">
                        <Link to="/forgot-password" className="forgot-password">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <FaSpinner className="spinner" />
                                Iniciando sesión...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Center;
