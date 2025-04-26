import './LogInCenter.css'
import React, { Component } from 'react';
import logo from "../../resources/images/Harmos-Logo-no-letras.png"
import letrasLogo from "../../resources/images/Harmos Logo Letras.jpg"
import {Link} from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import {AuthContext} from "../../context/authProvider";


const Center = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/home";
    const { auth, setAuth } = useContext(AuthContext);
    //state the name of the employee gotten from the form
    const [name, setName] = useState("");
    //state to store password of the employee gotten from the form
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        fetch(`http://localhost:3000/signin`, {
            method: "POST",
            headers: {"content-Type": "application/json"},
            body: JSON.stringify({
                name: name,
                password: password,
            }),
        })
            .then((res) => res.json())
            .then((res) => {
                if (res.name) {
                    console.log(res);
                    const role = res.role;
                    const token = res.token;

                    //storing employee information in our Auth state
                    setAuth({ role, token, name });
                    console.log(auth);
                    setName("");
                    setPassword("");
                    //navigate our employee to the home page
                    navigate(from, { replace: true });
                } else {
                    console.log("incorrect submission");
                }
            });
        } catch (err) {
            if (!err?.response) {
                console.log("no server response");
            } else {
                console.log("registeration failed");
            }
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
                            <h1 className="iniciar-sesion">Iniciar Sesion</h1>
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
                                type="text"
                                placeholder="Nombre Usuario"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
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
