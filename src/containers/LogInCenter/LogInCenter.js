import './LogInCenter.css'
import React, { useState } from 'react';
import logo from "../../resources/images/Harmos-Logo-no-letras.png"
import letrasLogo from "../../resources/images/Harmos Logo Letras.jpg"
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../api/api";
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash } from 'react-icons/fa';

const Center = () => {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
                setError("Usuario o contraseña incorrecta");
            }
        } catch (err) {
            let message = "Error de autenticación. Por favor, intente nuevamente.";
            if (err.response && err.response.status === 401) {
                message = "Usuario o contraseña incorrecta";
            } else if (err.response && err.response.data && err.response.data.message) {
                message = err.response.data.message;
            } else if (err.message) {
                message = err.message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleShowPassword = () => setShowPassword((prev) => !prev);

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
                        <div className="input-group password-group">
                            <FaLock className="input-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Contraseña"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="form-input"
                            />
                            <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={toggleShowPassword}
                                tabIndex={-1}
                                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
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
