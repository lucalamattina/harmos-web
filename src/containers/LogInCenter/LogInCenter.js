import './LogInCenter.css'
import React, { useState } from 'react';
import logo from "../../resources/images/Harmos-Logo-no-letras.png"
import letrasLogo from "../../resources/images/Harmos Logo Letras.jpg"
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { loginUser } from "../../api/api";
import { FaEnvelope, FaLock, FaSpinner, FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';

const Center = () => {
    // const navigate = useNavigate(); // Removido para evitar warning de unused
    const { login } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (name === 'email' && emailTouched) {
            setEmailError(validateEmail(value));
        }
        if (name === 'password' && passwordTouched) {
            setPasswordError(validatePassword(value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setEmailTouched(true);
        setPasswordTouched(true);
        const emailErr = validateEmail(formData.email);
        const passErr = validatePassword(formData.password);
        setEmailError(emailErr);
        setPasswordError(passErr);
        if (emailErr || passErr) {
            return;
        }
        setIsLoading(true);

        try {
            const data = await loginUser(formData.email, formData.password);
            if (data && data.token) {
                await login(data.token);
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

    const validateEmail = (value) => {
        if (!/^\S+@\S+\.\S+$/.test(value)) {
            return 'Ingresa un correo electrónico válido.';
        }
        return '';
    };
    const validatePassword = (value) => {
        if (!value) {
            return 'La contraseña es obligatoria.';
        }
        return '';
    };
    const handleEmailBlur = () => {
        setEmailTouched(true);
        setEmailError(validateEmail(formData.email));
    };
    const handlePasswordBlur = () => {
        setPasswordTouched(true);
        setPasswordError(validatePassword(formData.password));
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
                                type="text"
                                autoComplete="email"
                                name="email"
                                placeholder="Correo electrónico"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={handleEmailBlur}
                                style={emailTouched && emailError ? { border: '2px solid #d00', background: '#fff6f6' } : {}}
                                className={emailTouched && emailError ? 'form-input error-input' : 'form-input'}
                            />
                        </div>
                        {emailTouched && emailError && (
                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.97rem' }}>
                                <FaExclamationCircle className="me-1" /> {emailError}
                            </div>
                        )}
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
                                onBlur={handlePasswordBlur}
                                style={passwordTouched && passwordError ? { border: '2px solid #d00', background: '#fff6f6' } : {}}
                                className={passwordTouched && passwordError ? 'form-input error-input' : 'form-input'}
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
                        {passwordTouched && passwordError && (
                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.97rem' }}>
                                <FaExclamationCircle className="me-1" /> {passwordError}
                            </div>
                        )}
                        {error && (
                            <div className="text-danger d-flex align-items-center mt-1" style={{ fontSize: '0.97rem' }}>
                                <FaExclamationCircle className="me-1" /> {error}
                            </div>
                        )}
                    </div>

                    <div className="form-options">
                        <Link to="/forgot-password" className="forgot-password">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

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
