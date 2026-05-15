import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import api from '../../api/api';
import { parseApiError } from '../../utils/apiErrors';
import './ForgotPassword.css';
import logo from '../../resources/images/Harmos-Logo-no-letras.png';
import { FaExclamationCircle, FaCheckCircle, FaRegCircle, FaTimesCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [tokenStatus, setTokenStatus] = useState('checking'); // 'checking', 'valid', 'invalid', 'expired'
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [confirmError, setConfirmError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Requisitos de contraseña
    const passwordRequirements = [
        {
            label: 'Al menos 8 caracteres',
            test: (v) => v.length >= 8
        },
        {
            label: 'Al menos 1 letra minúscula',
            test: (v) => /[a-z]/.test(v)
        },
        {
            label: 'Al menos 1 letra mayúscula',
            test: (v) => /[A-Z]/.test(v)
        },
        {
            label: 'Al menos 1 número',
            test: (v) => /[0-9]/.test(v)
        }
    ];

    useEffect(() => {
        if (!token) {
            setTokenStatus('invalid');
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
                } else if (err.response && err.response.status === 410) {
                    setTokenStatus('expired');
                } else {
                    setTokenStatus('invalid');
                }
            }
        };
        validateToken();
    }, [token]);

    // Validación campo a campo
    const validatePassword = (value) => {
        if (value.length < 8) {
            return 'La contraseña debe tener al menos 8 caracteres.';
        }
        if (!/[A-Z]/.test(value)) {
            return 'La contraseña debe contener al menos una letra mayúscula.';
        }
        if (!/[a-z]/.test(value)) {
            return 'La contraseña debe contener al menos una letra minúscula.';
        }
        if (!/[0-9]/.test(value)) {
            return 'La contraseña debe contener al menos un número.';
        }
        return '';
    };
    const validateConfirm = (value) => {
        if (value !== newPassword) {
            return 'Las contraseñas no coinciden.';
        }
        return '';
    };

    const handleConfirmBlur = () => {
        setConfirmTouched(true);
        setConfirmError(validateConfirm(confirmPassword));
    };
    const handlePasswordChange = (e) => {
        setNewPassword(e.target.value);
        if (confirmTouched) {
            setConfirmError(validateConfirm(confirmPassword));
        }
    };
    const handleConfirmChange = (e) => {
        setConfirmPassword(e.target.value);
        if (confirmTouched) {
            setConfirmError(validateConfirm(e.target.value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setConfirmTouched(true);
        setSubmitted(true);
        const passErr = validatePassword(newPassword);
        const confErr = validateConfirm(confirmPassword);
        if (passErr || confErr) {
            return;
        }
        setIsLoading(true);
        try {
            await api.post('/api/users/reset-password', { token, newPassword });
            setSuccess('¡Contraseña cambiada exitosamente! Serás redirigido al login.');
            setTimeout(() => {
                navigate('/login', { state: { resetSuccess: true } });
            }, 2000);
        } catch (err) {
            // Usa el envelope { error } del backend cuando esté presente;
            // si no, cae al mensaje genérico en español.
            const { message: parsedMessage } = parseApiError(
                err,
                'Ocurrió un error al cambiar la contraseña. Intenta nuevamente.'
            );
            setError(parsedMessage);
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
                    <Form.Group className="mb-1" style={{ position: 'relative' }}>
                        <Form.Label htmlFor="new-password">Nueva Contraseña <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span></Form.Label>
                        <InputGroup>
                            <Form.Control
                                id="new-password"
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={handlePasswordChange}
                                style={{ fontSize: '1.1rem', padding: '12px' }}
                                autoComplete="new-password"
                                spellCheck={false}
                                required
                                aria-required="true"
                                aria-describedby="password-requirements"
                            />
                            <Button
                                variant="outline-secondary"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                style={{ minWidth: 44, minHeight: 44 }}
                                type="button"
                            >
                                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                            </Button>
                        </InputGroup>
                        <ul
                            id="password-requirements"
                            aria-label="Requisitos de contraseña"
                            style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0, marginTop: 8 }}
                        >
                            {passwordRequirements.map((req, idx) => {
                                const met = req.test(newPassword);
                                if (submitted && !met) {
                                    return (
                                        <li
                                            key={idx}
                                            role="alert"
                                            style={{
                                                color: '#DC2626',
                                                fontSize: '0.97rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                fontWeight: 600,
                                            }}
                                        >
                                            <FaTimesCircle aria-hidden="true" style={{ color: '#DC2626', fontSize: '1.1em' }} />
                                            {req.label}
                                        </li>
                                    );
                                }
                                return (
                                    <li
                                        key={idx}
                                        style={{
                                            color: met ? '#1db954' : '#bdbdbd',
                                            fontSize: '0.97rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontWeight: met ? 600 : 400,
                                        }}
                                    >
                                        <span aria-hidden="true">
                                            {met ? <FaCheckCircle style={{ color: '#1db954', fontSize: '1.1em' }} /> : <FaRegCircle style={{ color: '#bdbdbd', fontSize: '1.1em' }} />}
                                        </span>
                                        {req.label}
                                    </li>
                                );
                            })}
                        </ul>
                    </Form.Group>
                    <Form.Group className="mb-3 mt-3" style={{ position: 'relative' }}>
                        <Form.Label htmlFor="confirm-password">Confirmar Contraseña <span aria-hidden="true" style={{ color: '#DC2626' }}>*</span></Form.Label>
                        <InputGroup>
                            <Form.Control
                                id="confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={handleConfirmChange}
                                onBlur={handleConfirmBlur}
                                style={{ fontSize: '1.1rem', padding: '12px' }}
                                autoComplete="new-password"
                                spellCheck={false}
                                required
                                aria-required="true"
                                aria-describedby={submitted && confirmError ? 'confirm-password-error' : undefined}
                                aria-invalid={submitted && !!confirmError}
                            />
                            <Button
                                variant="outline-secondary"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                                style={{ minWidth: 44, minHeight: 44 }}
                                type="button"
                            >
                                {showConfirmPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                            </Button>
                        </InputGroup>
                        {submitted && confirmError && (
                            <div
                                id="confirm-password-error"
                                role="alert"
                                className="text-danger d-flex align-items-center mt-1"
                                style={{ fontSize: '0.97rem' }}
                            >
                                <FaExclamationCircle aria-hidden="true" className="me-1" /> {confirmError}
                            </div>
                        )}
                    </Form.Group>
                    <div aria-live="assertive" aria-atomic="true" className="mb-3">
                        {error && <Alert variant="danger" role="alert" className="animate__animated animate__fadeInDown">{error}</Alert>}
                        {success && <Alert variant="status" role="status" className="animate__animated animate__fadeInDown">{success}</Alert>}
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