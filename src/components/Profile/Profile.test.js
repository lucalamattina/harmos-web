import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from './Profile';
import api from '../../api/api';

jest.mock('../../api/api', () => ({
    __esModule: true,
    default: { get: jest.fn() },
}));

// Minimal unsigned JWT whose payload carries `sub`.
const fakeJwt = (payload) => `x.${btoa(JSON.stringify(payload))}.y`;

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', fakeJwt({ sub: '42', roles: ['DOCTOR'] }));
    api.get.mockImplementation((url) => {
        if (url === '/api/users/42') return Promise.resolve({ data: { name: 'Dra. Pérez', email: 'p@example.com' } });
        if (url.startsWith('/api/patients?')) {
            return Promise.resolve({ data: { content: [{ id: 1, firstName: 'Ana', lastName: 'García', status: 'ACTIVE' }] } });
        }
        return Promise.resolve({ data: {} });
    });
});

afterEach(() => localStorage.clear());

test('"Mis Pacientes" requests only the current user\'s patients by doctorId', async () => {
    render(<Profile />);

    expect(await screen.findByText('Ana García')).toBeInTheDocument();

    const patientCalls = api.get.mock.calls.map(([url]) => url).filter((url) => url.startsWith('/api/patients'));
    expect(patientCalls).toHaveLength(1);
    const params = new URLSearchParams(patientCalls[0].split('?')[1]);
    expect(params.get('doctorId')).toBe('42');
    expect(params.has('doctor')).toBe(false);
});
