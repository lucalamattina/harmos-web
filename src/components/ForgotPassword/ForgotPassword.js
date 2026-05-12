import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset } from '../../api/api';
import { parseApiError } from '../../utils/apiErrors';
import './ForgotPassword.css';
import { Link } from 'react-router-dom';
import logo from '../../resources/images/Harmos-Logo-no-letras.png';

// Mensaje genérico mostrado ante cualquier respuesta 200 del backend.
// El backend ahora siempre responde 200 OK independientemente de si el correo
// está registrado, para evitar fugas de información (enumeración de usuarios).
const GENERIC_SUCCESS_MESSAGE =
    'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña en breve.';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [emailValid, setEmailValid] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            // El backend siempre devuelve 200 con { message: "..." }.
            // Se ignora el cuerpo: se muestra un mensaje genérico para no
            // filtrar si el correo está registrado o no.
            await requestPasswordReset(email);
            setMessage(GENERIC_SUCCESS_MESSAGE);
            setEmail('');
        } catch (err) {
            if (err && err.response) {
                // El único caso no-2xx esperado es 400 (payload malformado).
                const { message: parsedMessage } = parseApiError(
                    err,
                    'Datos inválidos. Verifica el formato del email.'
                );
                setError(parsedMessage);
            } else {
                // Fallo de red / sin respuesta del servidor.
                setError('Error de conexión. Por favor, intenta nuevamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        // Validación de email que coincide con el backend
        setEmailValid(/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value));
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-form">
                <div className="text-center mb-3">
                    <img src={logo} alt="Harmos Logo" style={{ maxWidth: 90, marginBottom: 10 }} />
                </div>
                <h2>Recuperar Contraseña</h2>
                <p>Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.</p>
                
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Correo Electrónico</Form.Label>
                        <Form.Control
                            type="text"
                            autoComplete="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={handleEmailChange}
                            isInvalid={!emailValid && email.length > 0}
                        />
                        <Form.Control.Feedback type="invalid">
                            Ingresa un correo electrónico válido.
                        </Form.Control.Feedback>
                    </Form.Group>

                    <div aria-live="polite">
                        {message && <Alert variant="success">{message}</Alert>}
                        {error && <Alert variant="danger">{error}</Alert>}
                    </div>

                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={isLoading || !emailValid || !email}
                        className="w-100"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </Button>
                </Form>
                <div className="mt-3 text-center">
                    <Link to="/login">Volver al inicio de sesión</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword; 