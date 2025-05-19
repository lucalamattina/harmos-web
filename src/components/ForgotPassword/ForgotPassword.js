import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { requestPasswordReset } from '../../api/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

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

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-form">
                <h2>Recuperar Contraseña</h2>
                <p>Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.</p>
                
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Correo Electrónico</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </Form.Group>

                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={isLoading}
                        className="w-100"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Instrucciones'}
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export default ForgotPassword; 