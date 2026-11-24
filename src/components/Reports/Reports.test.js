import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Reports from './Reports';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/api';

jest.mock('../../api/api', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const fakeJwt = (payload) => `x.${btoa(JSON.stringify(payload))}.y`;

const renderAs = (isAdmin) =>
    render(
        <AuthContext.Provider value={{ isAdmin, currentUser: { id: 42 } }}>
            <Reports />
        </AuthContext.Provider>
    );

const patientListParams = async () => {
    await waitFor(() =>
        expect(api.get.mock.calls.some(([url]) => url.startsWith('/api/patients'))).toBe(true)
    );
    const url = api.get.mock.calls.map(([u]) => u).find((u) => u.startsWith('/api/patients'));
    return new URLSearchParams(url.split('?')[1]);
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.setItem('token', fakeJwt({ sub: '42' }));
    api.get.mockImplementation((url) => {
        if (url.startsWith('/api/reports/all')) return Promise.resolve({ data: { reports: [], totalPages: 0 } });
        if (url.startsWith('/api/patients')) return Promise.resolve({ data: { content: [] } });
        return Promise.resolve({ data: [] });
    });
});

afterEach(() => {
    localStorage.clear();
    console.error.mockRestore();
    console.log.mockRestore();
});

test('DOCTOR: patient pickers load only the doctor\'s own patients', async () => {
    renderAs(false);
    const params = await patientListParams();
    expect(params.get('doctorId')).toBe('42');
});

test('ADMINISTRATOR: patient pickers load all patients (no doctorId)', async () => {
    renderAs(true);
    const params = await patientListParams();
    expect(params.has('doctorId')).toBe(false);
    expect(params.get('size')).toBe('1000');
});
