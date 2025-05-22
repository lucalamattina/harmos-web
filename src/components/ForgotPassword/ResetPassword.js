import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../../api/api';
import './ForgotPassword.css';
import logo from '../../resources/images/Harmos-Logo-no-letras.png';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [tokenStatus, setTokenStatus] = useState('checking'); // 'checking', 'valid', 'invalid', 'expired'

    useEffect(() => {
        if (!token) {
            setTokenStatus('invalid');
            setTokenValid(false);
            return;
        }
        // Validar el token con el endpoint
        const validateToken = async () => {
            try {
                await api.get(`/api/users/validate-reset-token?token=${encodeURIComponent(token)}`);
                setTokenStatus('valid');
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setTokenStatus('invalid');
                    setTokenValid(false);
                } else if (err.response && err.response.status === 410) {
                    setTokenStatus('expired');
                    setTokenValid(false);
                } else {
                    setTokenStatus('invalid');
                    setTokenValid(false);
                }
            }
        };
        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (newPassword.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setIsLoading(true);
        try {
            await api.post(`/api/users/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(newPassword)}`);
            setSuccess('¡Contraseña cambiada exitosamente! Serás redirigido al login.');
            setTimeout(() => {
                navigate('/login', { state: { resetSuccess: true } });
            }, 2000);
        } catch (err) {
            if (err.response && err.response.status === 400) {
                setError('El enlace ha expirado o es inválido. Solicita un nuevo correo de recuperación.');
                setTokenValid(false);
            } else {
                setError('Ocurrió un error al cambiar la contraseña. Intenta nuevamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (tokenStatus === 'checking') {
        return (
            <div className="forgot-password-container">
                <div className="forgot-password-form text-center">
                    <Spinner animation="border" />
                    <div>Verificando enlace...</div>
                </div>
            </div>
        );
    }
    if (tokenStatus === 'invalid') {
        return (
            <div className="forgot-password-container">
                <div className="forgot-password-form">
                    <Alert variant="danger">
                        El enlace de recuperación es inválido o no existe.<br />
                        <Button variant="link" onClick={() => navigate('/forgot-password')}>Solicitar nuevo enlace</Button>
                    </Alert>
                </div>
            </div>
        );
    }
    if (tokenStatus === 'expired') {
        return (
            <div className="forgot-password-container">
                <div className="forgot-password-form">
                    <Alert variant="danger">
                        El enlace de recuperación ha expirado.<br />
                        <Button variant="link" onClick={() => navigate('/forgot-password')}>Solicitar nuevo enlace</Button>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-password-container" style={{ background: 'linear-gradient(135deg, #10A6AC 0%, #059093 100%)', minHeight: '100vh' }}>
            <div className="forgot-password-form shadow-lg" style={{ borderRadius: 16, padding: '2.5rem 2rem', maxWidth: 400 }}>
                <div className="text-center mb-3">
                    <img src={logo} alt="Harmos Logo" style={{ maxWidth: 90, marginBottom: 10 }} />
                </div>
                <h2 className="text-center mb-3">Cambiar Contraseña</h2>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Nueva Contraseña</Form.Label>
                        <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            minLength={8}
                            required
                            placeholder="Nueva contraseña"
                            style={{ fontSize: '1.1rem', padding: '12px' }}
                        />
                        <Form.Text className="text-muted">
                            La contraseña debe tener al menos 8 caracteres.
                        </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Confirmar Contraseña</Form.Label>
                        <Form.Control
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            minLength={8}
                            required
                            placeholder="Repite la nueva contraseña"
                            style={{ fontSize: '1.1rem', padding: '12px' }}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label="Mostrar contraseñas"
                            checked={showPassword}
                            onChange={() => setShowPassword(!showPassword)}
                        />
                    </Form.Group>
                    <div aria-live="polite" className="mb-3">
                        {error && <Alert variant="danger" className="animate__animated animate__fadeInDown">{error}</Alert>}
                        {success && <Alert variant="success" className="animate__animated animate__fadeInDown">{success}</Alert>}
                    </div>
                    <Button
                        variant="primary"
                        type="submit"
                        className="w-100 py-2 shadow-sm"
                        style={{ fontSize: '1.15rem', fontWeight: 600, borderRadius: 8, background: 'linear-gradient(90deg, #10A6AC 0%, #059093 100%)', border: 'none' }}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner animation="border" size="sm" /> : 'Cambiar Contraseña'}
                    </Button>
                </Form>
            </div>
        </div>
    );
};

export default ResetPassword; 