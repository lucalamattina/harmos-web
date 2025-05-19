import React, {useState} from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export const Register = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [pass, setName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/auth/register', { email, password, name, phone });
            navigate('/login');
        } catch (err) {
            setError('Error al registrar usuario');
        }
    };

    return (
        <>
        <form onSubmit={handleSubmit}>
            <label htmlFor="email">email</label>
            <input value={email} type="email" placeholder="youremail@gmail.com" id="email" name="email"/>
            <label htmlFor="password">password</label>
            <input value={pass} type="password" placeholder="********" id="password" name="password"/>
            <button>Register</button>
        </form>
        <button>Already have an account? Log in here</button>
        </>
    )
}