import './LogInCenter.css'
import React, { Component } from 'react';
import logo from "../../resources/images/Harmos-Logo-no-letras.png"
import letrasLogo from "../../resources/images/Harmos Logo Letras.jpg"
import {Link} from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import {AuthContext} from "../../context/AuthContext";
import { loginUser } from "../../api/api";


const Center = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/home";
    const { auth, setAuth, login } = useContext(AuthContext);
    //state to store email of the user
    const [email, setEmail] = useState("");
    //state to store password of the user
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const data = await loginUser(email, password);
            if (data && data.token) {
                login(data.token); // Guarda el token y setea autenticado
                navigate('/', { replace: true }); // Redirige a la home
            } else {
                setError("Credenciales incorrectas");
            }
        } catch (err) {
            setError("Error de autenticación");
        }
    };
    return (
        <div>
            <div className="center">
                <div className="center-child" />
                <img className="center-item" src={logo} alt="Logo" />
                <form onSubmit={handleSubmit}>
                    <div className="login">
                        <button className="login-child" type="submit">
                            Iniciar Sesión
                        </button>
                        <div className="password">
                            <div className="password-child" />
                            <img className="icon-lock bi bi-lock-fill" alt="lock"/>
                            <input
                                className="form-control contrasea border-0 w-75"
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="user">
                            <div className="user-child" />
                            <img className="icon-user bi bi-person-fill" alt="user"/>
                            <input
                                className="form-control nombre-usuario border-0 w-75"
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        {error && <div style={{color: 'red', marginTop: 10}}>{error}</div>}
                        <img className="image-1-icon" src={letrasLogo} alt="letrasLogo" />
                        <Link to="/" >
                            <div className="olvidaste-tu-contrasea">Olvidaste tu contraseña?</div>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Center;
