import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset, checkUserExists } from '../../api/api';
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

        // Verificar si el usuario existe antes de enviar el mail
        const exists = await checkUserExists(email);
        if (!exists) {
            setError('No existe un usuario registrado con ese correo electrónico.');
            setIsLoading(false);
            return;
        }

        try {
            await requestPasswordReset(email);
            setMessage('Se ha enviado un correo electrónico con instrucciones para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.');
            setEmail('');
        } catch (err) {
            setError('Error al enviar el correo. Por favor, verifica tu dirección de correo electrónico.');
            setMessage(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        // Validación simple de email
        setEmailValid(/^\S+@\S+\.\S+$/.test(value));
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
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={handleEmailChange}
                            isInvalid={!emailValid && email.length > 0}
                            required
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