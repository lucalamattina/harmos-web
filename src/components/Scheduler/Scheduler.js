import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState, useEffect} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal, Spinner, Container, Alert, ListGroup, InputGroup } from "react-bootstrap";
import { getSchedules, getUserById, getLocationById, getLocations, getUsers, getPatients, createSchedule, deleteSchedule } from "../../api/api";
import { es } from 'date-fns/locale';

const locales = {
    "es": es,
};

const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    work_week: 'Semana laboral',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay eventos en este rango.',
    showMore: total => `+ Ver más (${total})`
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

function Scheduler() {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [seeEvent, setSeeEvent] = useState({
        title: "",
        location: "",
        id: null, // Para saber qué evento eliminar
    });

    const [showNew, setShowNew] = useState(false);
    const handleShowNew = () => setShowNew(true);

    const [newEvent, setNewEvent] = useState({
        title: "",
        start: null,
        end: null,
        selectedDoctor: null,
        selectedPatient: null,
        selectedLocation: null,
    });
    const [doctorSearchTerm, setDoctorSearchTerm] = useState("");
    const [patientSearchTerm, setPatientSearchTerm] = useState("");
    const [locationSearchTerm, setLocationSearchTerm] = useState("");

    const [doctorResults, setDoctorResults] = useState([]);
    const [patientResults, setPatientResults] = useState([]);
    const [locationResults, setLocationResults] = useState([]);

    const [isSearchingDoctors, setIsSearchingDoctors] = useState(false);
    const [isSearchingPatients, setIsSearchingPatients] = useState(false);
    const [isSearchingLocations, setIsSearchingLocations] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allEvents, setAllEvents] = useState([]);

    useEffect(() => {
        async function fetchSchedules() {
            setLoading(true);
            setError(null);
            try {
                const schedules = await getSchedules();
                const dayMap = {
                    MONDAY: 1,
                    TUESDAY: 2,
                    WEDNESDAY: 3,
                    THURSDAY: 4,
                    FRIDAY: 5,
                    SATURDAY: 6,
                    SUNDAY: 0,
                };

                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });

                const eventPromises = schedules.map(async (sch) => {
                    let doctorName = `Doctor ID: ${sch.doctorUserId}`;
                    let locationName = `Ubicación ID: ${sch.locationId}`;

                    try {
                        if (sch.doctorUserId) {
                            const doctor = await getUserById(sch.doctorUserId);
                            doctorName = doctor ? `Dr. ${doctor.name || doctor.firstName}` : doctorName;
                        }
                    } catch (docError) {
                        // Mantener el nombre por defecto si hay error al obtener el doctor
                    }

                    try {
                        if (sch.locationId) {
                            const location = await getLocationById(sch.locationId);
                            locationName = location ? location.name : locationName;
                        }
                    } catch (locError) {
                         // Mantener el nombre por defecto si hay error al obtener la locación
                    }

                    let dayOffset = dayMap[sch.dayOfWeek];
                    if (dayOffset === 0) dayOffset = 7; // Para que SUNDAY sea el último día
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + (dayOffset - 1));
                    const start = new Date(date);
                    start.setHours(sch.hourFrom, sch.minuteFrom);
                    const end = new Date(date);
                    end.setHours(sch.hourTo, sch.minuteTo);
                    return {
                        title: doctorName,
                        start,
                        end,
                        id: sch.id, // Guardamos el ID del schedule original
                        location: locationName,
                    };
                });
                const mappedEvents = await Promise.all(eventPromises);
                setAllEvents(mappedEvents);
            } catch (err) {
                setError('Error al cargar los horarios.');
            } finally {
                setLoading(false);
            }
        }
        fetchSchedules();
    }, []);

    const handleSelectSlot = useCallback(
        ({ start, end }) => {
            handleShowNew()
            setNewEvent({
                title: "",
                start,
                end,
                selectedDoctor: null,
                selectedPatient: null,
                selectedLocation: null,
            });
            setSaveError('');
        },
        [setNewEvent]
    )

    const handleSelectEvent = useCallback(
        (event) => {
            setSeeEvent(event)
            handleShow()
        },
        []
    )

    const { scrollToTime } = useMemo(
        () => ({
            scrollToTime: new Date(1970, 1, 1, 6),
        }),
        []
    )

    const resetNewEventForm = () => {
        setNewEvent({
            title: "",
            start: null,
            end: null,
            selectedDoctor: null,
            selectedPatient: null,
            selectedLocation: null,
        });
        setDoctorSearchTerm("");
        setPatientSearchTerm("");
        setLocationSearchTerm("");
        setDoctorResults([]);
        setPatientResults([]);
        setLocationResults([]);
        setSaveError('');
    };

    const handleSaveNewEvent = async () => {
        setSaveError('');
        if (!newEvent.selectedDoctor || !newEvent.selectedPatient || !newEvent.selectedLocation || !newEvent.start || !newEvent.end) {
            setSaveError("Por favor, completa todos los campos: Doctor, Paciente, Ubicación y horario.");
            return;
        }

        const dayOfWeekStrings = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

        const scheduleData = {
            locationId: newEvent.selectedLocation.id,
            dayOfWeek: dayOfWeekStrings[newEvent.start.getDay()],
            hourFrom: newEvent.start.getHours(),
            minuteFrom: newEvent.start.getMinutes(),
            hourTo: newEvent.end.getHours(),
            minuteTo: newEvent.end.getMinutes(),
            doctorUserId: newEvent.selectedDoctor.id,
            patientId: newEvent.selectedPatient.id,
        };

        try {
            const created = await createSchedule(scheduleData);
            const newCalendarEvent = {
                title: `Dr. ${newEvent.selectedDoctor.name} con ${newEvent.selectedPatient.name}`,
                start: newEvent.start,
                end: newEvent.end,
                location: newEvent.selectedLocation.name,
                id: created.id 
            };
            setAllEvents((prev) => [...prev, newCalendarEvent]);
            resetNewEventForm();
            setShowNew(false);
        } catch (err) {
            setSaveError(err.response?.data?.message || err.message || "Error al crear el horario. Verifique los datos.");
        }
    };

    const handleCancelNewEvent = () => {
        resetNewEventForm();
        setShowNew(false);
    };

    const handleDeleteScheduleClick = () => {
        setScheduleToDelete(seeEvent); // El evento actual en el modal de visualización
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSchedule = async () => {
        if (scheduleToDelete && scheduleToDelete.id) {
            setIsDeleting(true);
            setDeleteError('');
            try {
                await deleteSchedule(scheduleToDelete.id);
                setAllEvents(prev => prev.filter(event => event.id !== scheduleToDelete.id));
                setShowDeleteConfirm(false); // Cierra el modal de confirmación
                handleClose(); // Cierra el modal de visualización principal
            } catch (err) {
                setDeleteError(err.response?.data?.message || err.message || "Error al eliminar el horario.");
                // El modal de confirmación permanecerá abierto para mostrar el error.
            } finally {
                setIsDeleting(false);
            }
        }
    };
    const searchDoctors = async (term) => {
        if (term.length < 2) {
            setDoctorResults([]);
            return;
        }
        setIsSearchingDoctors(true);
        try {
            const users = await getUsers({ name: term });
            setDoctorResults(users.filter(u => u.roles && (u.roles.includes('DOCTOR') || u.roles.includes('ADMINISTRATOR'))));
        } catch (error) {
            setDoctorResults([]);
        }
        setIsSearchingDoctors(false);
    };

    const searchPatients = async (term) => {
        if (term.length < 2) {
            setPatientResults([]);
            return;
        }
        setIsSearchingPatients(true);
        try {
            const patients = await getPatients({ name: term });
            setPatientResults(patients);
        } catch (error) {
            setPatientResults([]);
        }
        setIsSearchingPatients(false);
    };

    const searchLocations = async (term) => {
        if (term.length < 2) {
            setLocationResults([]);
            return;
        }
        setIsSearchingLocations(true);
        try {
            const locations = await getLocations({ name: term });
            setLocationResults(locations);
        } catch (error) {
            setLocationResults([]);
        }
        setIsSearchingLocations(false);
    };

    const handleSelectDoctor = (doctor) => {
        setNewEvent(prev => ({ ...prev, selectedDoctor: doctor }));
        setDoctorSearchTerm(doctor.name);
        setDoctorResults([]);
    };
    const handleSelectPatient = (patient) => {
        setNewEvent(prev => ({ ...prev, selectedPatient: patient }));
        setPatientSearchTerm(patient.name);
        setPatientResults([]);
    };

    let formats = {
        timeGutterFormat: 'HH:mm',
    }

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <div className="text-center">
                <Spinner animation="border" role="status" variant="primary">
                    <span className="visually-hidden">Cargando...</span>
                </Spinner>
            </div>
        </Container>
    );

    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Alert variant="danger" className="text-center">{error}</Alert>
        </Container>
    );

    return (
        <>
        <div className="Scheduler">
            <Calendar views={[Views.WORK_WEEK]}
                      defaultView={Views.WORK_WEEK}
                      localizer={localizer} events={allEvents}
                      onSelectEvent={handleSelectEvent}
                      onSelectSlot={handleSelectSlot}
                      selectable
                      scrollToTime={scrollToTime}
                      startAccessor="start" endAccessor="end"
                      style={{ height: 500, margin: "50px" }}
                      step={5}
                      timeslots={6}
                      min={new Date(2016, 10, 1, 8, 0, 0)}
                      toolbar={false}
                      formats={formats}
                      culture='es'
                      messages={messages}
            />
        </div>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Título: {seeEvent.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>Ubicación: {seeEvent.location}</Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={handleDeleteScheduleClick}>
                        Eliminar
                    </Button>
                    <Button variant="primary" onClick={handleClose}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showNew} onHide={handleCancelNewEvent}>
                <Modal.Header closeButton>
                    <Modal.Title>Crear evento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {saveError && <Alert variant="danger">{saveError}</Alert>}
                        <Form.Group className="mb-3">
                            <Form.Label>Doctor</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar doctor por nombre..."
                                    value={doctorSearchTerm}
                                    onChange={e => {
                                        setDoctorSearchTerm(e.target.value);
                                        searchDoctors(e.target.value);
                                        setNewEvent(prev => ({ ...prev, selectedDoctor: null }));
                                    }}
                                />
                                {isSearchingDoctors && <InputGroup.Text><Spinner animation="border" size="sm" /></InputGroup.Text>}
                            </InputGroup>
                            {doctorResults.length > 0 && (
                                <ListGroup className="search-results-dropdown">
                                    {doctorResults.map(doc => (
                                        <ListGroup.Item key={doc.id} action onClick={() => handleSelectDoctor(doc)}>
                                            {doc.name} ({doc.email})
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                            {newEvent.selectedDoctor && <small className="text-success d-block mt-1">Seleccionado: {newEvent.selectedDoctor.name}</small>}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Paciente</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar paciente por nombre..."
                                    value={patientSearchTerm}
                                    onChange={e => {
                                        setPatientSearchTerm(e.target.value);
                                        searchPatients(e.target.value);
                                        setNewEvent(prev => ({ ...prev, selectedPatient: null }));
                                    }}
                                />
                                {isSearchingPatients && <InputGroup.Text><Spinner animation="border" size="sm" /></InputGroup.Text>}
                            </InputGroup>
                            {patientResults.length > 0 && (
                                <ListGroup className="search-results-dropdown">
                                    {patientResults.map(pat => (
                                        <ListGroup.Item key={pat.id} action onClick={() => handleSelectPatient(pat)}>
                                            {pat.name}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                            {newEvent.selectedPatient && <small className="text-success d-block mt-1">Seleccionado: {newEvent.selectedPatient.name}</small>}
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Ubicación</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar ubicación por nombre..."
                                    value={locationSearchTerm}
                                    onChange={e => {
                                        setLocationSearchTerm(e.target.value);
                                        searchLocations(e.target.value);
                                        setNewEvent(prev => ({ ...prev, selectedLocation: null }));
                                    }}
                                />
                                {isSearchingLocations && <InputGroup.Text><Spinner animation="border" size="sm" /></InputGroup.Text>}
                            </InputGroup>
                            {locationResults.length > 0 && (
                                <ListGroup className="search-results-dropdown">
                                    {locationResults.map(loc => (
                                        <ListGroup.Item key={loc.id} action onClick={() => {
                                            setNewEvent(prev => ({ ...prev, selectedLocation: loc }));
                                            setLocationSearchTerm(loc.name);
                                            setLocationResults([]);
                                        }}>
                                            {loc.name}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                            {newEvent.selectedLocation && <small className="text-success d-block mt-1">Seleccionado: {newEvent.selectedLocation.name}</small>}
                        </Form.Group>

                        {newEvent.start && newEvent.end && (
                            <Alert variant="info">
                                Horario seleccionado: {format(newEvent.start, "dd/MM/yyyy HH:mm")} - {format(newEvent.end, "HH:mm")}
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCancelNewEvent}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={handleSaveNewEvent}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Confirmación de Eliminación */}
            <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Eliminación</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {deleteError && <Alert variant="danger">{deleteError}</Alert>}
                    <p>¿Está seguro que desea eliminar este horario?</p>
                    <p><strong>{scheduleToDelete?.title}</strong></p>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteError(''); // Limpiar error al cancelar
                        }}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={confirmDeleteSchedule} disabled={isDeleting}>
                        {isDeleting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Eliminar'}
                    </Button>
                </Modal.Footer>
            </Modal>
            </>
    );
}

export default Scheduler;