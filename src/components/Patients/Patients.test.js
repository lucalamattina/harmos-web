import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Patients from './Patients';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/api';

// Mock the API module so axios (ESM) is never loaded by Jest.
jest.mock('../../api/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

const PERMISSION_MSG = 'No tienes permiso para realizar esta acción';

const patient = { id: 1, firstName: 'Ana', lastName: 'García', phone: '1234567', status: 'ACTIVE' };
const patientDetails = { ...patient, doctors: [{ id: 10, name: 'Dra. Pérez', specialty: 'Fonoaudiología' }] };
const otherDoctor = { id: 20, name: 'Dr. López', specialty: 'Psicología' };

// 403 from Spring Security's default handler: no usable body.
const forbidden = () => Promise.reject({ response: { status: 403, data: '' } });

const mockGet = (url) => {
    if (url === '/api/patients/statuses') return Promise.resolve({ data: ['ACTIVE', 'INACTIVE'] });
    if (url === '/api/specialties') return Promise.resolve({ data: [] });
    if (url.startsWith('/api/patients?')) return Promise.resolve({ data: { content: [patient], totalPages: 1 } });
    if (url === `/api/patients/${patient.id}`) return Promise.resolve({ data: patientDetails });
    if (url.startsWith('/api/users')) return Promise.resolve({ data: { content: [patientDetails.doctors[0], otherDoctor] } });
    if (url.startsWith('/api/reports/all')) return Promise.resolve({ data: { reports: [] } });
    return Promise.resolve({ data: {} });
};

const renderAs = async ({ isAdmin }) => {
    render(
        <AuthContext.Provider value={{ isAdmin, isAuthenticated: true, currentUser: { id: 99 } }}>
            <Patients />
        </AuthContext.Provider>
    );
    // Wait for the list to load.
    await screen.findByText('Ana García');
};

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockImplementation(mockGet);
});

afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
});

describe('Patients – DOCTOR (non-admin)', () => {
    test('lists patients but shows no create, edit or delete controls', async () => {
        await renderAs({ isAdmin: false });

        expect(screen.getByText('Ana García')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ver paciente' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /nuevo paciente/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Editar paciente' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Eliminar paciente' })).not.toBeInTheDocument();
    });

    test('can view patient details but has no assign-doctor control', async () => {
        await renderAs({ isAdmin: false });

        fireEvent.click(screen.getByRole('button', { name: 'Ver paciente' }));

        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Dra. Pérez')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: /agregar terapeuta/i })).not.toBeInTheDocument();
    });

    test('unassigned patient: reports 403 shows a "not assigned" message, details still visible', async () => {
        // Real backend body for this case: only `error`, no `reports`/`totalElements`.
        api.get.mockImplementation((url) =>
            url.startsWith('/api/reports/all')
                ? Promise.reject({ response: { status: 403, data: { error: 'No tienes acceso a este paciente' } } })
                : mockGet(url)
        );
        await renderAs({ isAdmin: false });

        fireEvent.click(screen.getByRole('button', { name: 'Ver paciente' }));
        const dialog = await screen.findByRole('dialog');

        expect(await within(dialog).findByText(/no estás asignado a este paciente/i)).toBeInTheDocument();
        expect(within(dialog).getByText('Dra. Pérez')).toBeInTheDocument();
        expect(within(dialog).queryByText(/0 informes/)).not.toBeInTheDocument();
        expect(within(dialog).queryByText('Error al cargar los informes del paciente')).not.toBeInTheDocument();
    });

    test('never calls admin-only patient endpoints', async () => {
        await renderAs({ isAdmin: false });
        fireEvent.click(screen.getByRole('button', { name: 'Ver paciente' }));
        await screen.findByRole('dialog');

        expect(api.post).not.toHaveBeenCalled();
        expect(api.put).not.toHaveBeenCalled();
        expect(api.delete).not.toHaveBeenCalled();
    });
});

describe('Patients – ADMINISTRATOR', () => {
    test('shows create, edit, delete and assign-doctor controls', async () => {
        await renderAs({ isAdmin: true });

        expect(screen.getByRole('button', { name: /nuevo paciente/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Editar paciente' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar paciente' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Ver paciente' }));
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByRole('button', { name: /agregar terapeuta/i })).toBeInTheDocument();
    });

    test('delete succeeds as before', async () => {
        api.delete.mockResolvedValue({});
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar paciente' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/patients/1'));
        expect(screen.queryByText(PERMISSION_MSG)).not.toBeInTheDocument();
    });
});

describe('Patients – 403 fallback', () => {
    test('delete 403 shows a permission message and keeps the list visible', async () => {
        api.delete.mockImplementation(forbidden);
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: 'Eliminar paciente' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));

        expect(await screen.findByText(PERMISSION_MSG)).toBeInTheDocument();
        expect(screen.getByText('Ana García')).toBeInTheDocument();
    });

    test('create 403 shows a permission message in the form', async () => {
        api.post.mockImplementation(forbidden);
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: /nuevo paciente/i }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByPlaceholderText('Nombre del paciente'), { target: { value: 'Juan' } });
        fireEvent.change(within(dialog).getByPlaceholderText('Apellido del paciente'), { target: { value: 'Pérez' } });
        fireEvent.change(within(dialog).getByPlaceholderText('Número de teléfono'), { target: { value: '1234567' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar Paciente' }));

        expect(await within(dialog).findByText(PERMISSION_MSG)).toBeInTheDocument();
    });

    test('edit 403 shows a permission message in the form', async () => {
        api.put.mockImplementation(forbidden);
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: 'Editar paciente' }));
        const dialog = await screen.findByRole('dialog');
        await within(dialog).findByDisplayValue('Ana');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }));

        expect(await within(dialog).findByText(PERMISSION_MSG)).toBeInTheDocument();
    });

    test('unassign 403 (after a successful PUT) shows a permission message', async () => {
        api.put.mockResolvedValue({});
        api.delete.mockImplementation(forbidden);
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: 'Editar paciente' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(await within(dialog).findByRole('button', { name: 'Quitar a Dra. Pérez' }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/patients/1/doctors/10'));
        expect(await within(dialog).findByText(PERMISSION_MSG)).toBeInTheDocument();
    });

    test('assign 403 shows a permission message in the assign dialog', async () => {
        api.post.mockImplementation(forbidden);
        await renderAs({ isAdmin: true });

        fireEvent.click(screen.getByRole('button', { name: 'Ver paciente' }));
        fireEvent.click(await screen.findByRole('button', { name: /agregar terapeuta$/i }));

        await screen.findByText('Agregar Terapeutas');
        const assignDialog = screen
            .getAllByRole('dialog')
            .find(d => within(d).queryByText('Agregar Terapeutas'));
        fireEvent.click(await within(assignDialog).findByText('Dr. López'));
        fireEvent.click(within(assignDialog).getByRole('button', { name: 'Agregar Terapeutas Seleccionados' }));

        await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/patients/1/doctors/20'));
        expect(await within(assignDialog).findByText(PERMISSION_MSG)).toBeInTheDocument();
        // The page is not replaced by a generic error.
        expect(screen.queryByText('Error al agregar doctores al paciente')).not.toBeInTheDocument();
    });
});
