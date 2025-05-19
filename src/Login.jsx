import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export const Login = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/auth/login', { email, password: pass });
            localStorage.setItem('token', response.data.token);
            navigate('/');
        } catch (err) {
            setError('Error al iniciar sesión');
        }
    };

    //TODO: Arreglar boton y costados. tambien checkear mayusculas para mails

    return (
        <>
        <form onSubmit={handleSubmit}>
            <label htmlFor="email">email</label>
            <input value={email} type="email" placeholder="youremail@gmail.com" id="email" name="email"/>
            <label htmlFor="password">password</label>
            <input value={pass} type="password" placeholder="********" id="password" name="password"/>
            <button>Log In</button>
        </form>
        <button>Don't have an account? Register here</button>
        </>
    )
}