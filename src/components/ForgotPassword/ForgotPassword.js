import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset } from '../../api/api';
import './ForgotPassword.css';
import { Link } from 'react-router-dom';
import logo from '../../resources/images/Harmos-Logo-no-letras.png';

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
            const response = await requestPasswordReset(email);
            
            // Manejar respuesta según el nuevo formato
            if (response.success) {
                setMessage(response.message);
                setEmail('');
            } else {
                setError(response.error || 'Error al procesar la solicitud.');
            }
        } catch (err) {
            // Manejar errores de red o del servidor
            if (err.response?.data) {
                const errorData = err.response.data;
                
                if (errorData.success === false) {
                    setError(errorData.error || 'Error al procesar la solicitud.');
                } else if (err.response.status === 400) {
                    // Error de validación - puede que errorData sea un string
                    setError(typeof errorData === 'string' ? errorData : (errorData.error || 'Datos inválidos. Verifica el formato del email.'));
                } else {
                    setError('Error al enviar el correo. Por favor, verifica tu dirección de correo electrónico.');
                }
            } else {
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