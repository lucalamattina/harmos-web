import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState, useEffect, useContext} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal, Spinner, Container, Alert, ListGroup, InputGroup, Card, Row, Col, Badge } from "react-bootstrap";
import { getSchedules, getUserById, getLocationById, getLocations, getUsers, getPatients, createSchedule, deleteSchedule, getPatientById } from "../../api/api";
import { es } from 'date-fns/locale';
import { AuthContext } from "../../context/AuthContext";

// Custom hook for debouncing a value
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


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
    const { isAdmin } = useContext(AuthContext);
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [seeEvent, setSeeEvent] = useState({
        title: "",
        location: "",
        id: null, // Para saber qué evento eliminar
        patientName: "",
        scheduleTime: ""
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

    const debouncedDoctorSearchTerm = useDebounce(doctorSearchTerm, 500);
    const debouncedPatientSearchTerm = useDebounce(patientSearchTerm, 500);
    const debouncedLocationSearchTerm = useDebounce(locationSearchTerm, 500);

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


    const [error, setError] = useState(null);
    const [allEvents, setAllEvents] = useState([]);

    // Filter states
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [doctorFilterTerm, setDoctorFilterTerm] = useState('');
    const [patientFilterTerm, setPatientFilterTerm] = useState('');
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState(null);
    const [selectedPatientFilter, setSelectedPatientFilter] = useState(null);
    const [doctorFilterResults, setDoctorFilterResults] = useState([]);
    const [patientFilterResults, setPatientFilterResults] = useState([]);

    const debouncedDoctorFilterTerm = useDebounce(doctorFilterTerm, 500);
    const debouncedPatientFilterTerm = useDebounce(patientFilterTerm, 500);


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const locs = await getLocations();
                setLocations(locs || []);
            } catch (err) {
                console.error("Error fetching locations:", err);
                setError('Error al cargar las ubicaciones para los filtros.');
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        const fetchSchedules = async () => {
            
            setError(null);
            try {
                const params = {};
                if (selectedLocation) params.locationId = selectedLocation;
                if (selectedDoctorFilter) params.doctorId = selectedDoctorFilter.id;
                if (selectedPatientFilter) params.patientId = selectedPatientFilter.id;

                const schedules = await getSchedules(params);
                const dayMap = {
                    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
                    FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
                };

                // Cache to avoid re-fetching the same doctor/location/patient
                const doctorCache = new Map();
                const locationCache = new Map();
                const patientCache = new Map();

                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });

                const eventPromises = schedules.map(async (sch) => {
                    if (!sch || !sch.dayOfWeek) return null;

                    let doctorName = `Doctor ID: ${sch.doctorUserId}`;
                    let locationName = `Ubicación ID: ${sch.locationId}`;
                    let patientName = `Paciente ID: ${sch.patientId}`;

                    try {
                        if (sch.doctorUserId) {
                            if (doctorCache.has(sch.doctorUserId)) {
                                doctorName = doctorCache.get(sch.doctorUserId);
                            } else {
                                const doctor = await getUserById(sch.doctorUserId);
                                if (doctor) {
                                    doctorName = `${doctor.name || doctor.firstName}`;
                                    doctorCache.set(sch.doctorUserId, doctorName);
                                }
                            }
                        }
                    } catch (docError) {
                        console.error(`Error fetching doctor ${sch.doctorUserId}:`, docError);
                    }

                    try {
                        if (sch.locationId) {
                            if (locationCache.has(sch.locationId)) {
                                locationName = locationCache.get(sch.locationId);
                            } else {
                                const location = await getLocationById(sch.locationId);
                                if (location) {
                                    locationName = location.name;
                                    locationCache.set(sch.locationId, locationName);
                                }
                            }
                        }
                    } catch (locError) {
                        console.error(`Error fetching location ${sch.locationId}:`, locError);
                    }

                    try {
                        if (sch.patientId) {
                            if (patientCache.has(sch.patientId)) {
                                patientName = patientCache.get(sch.patientId);
                            } else {
                                const patient = await getPatientById(sch.patientId);
                                if (patient) {
                                    patientName = patient.name;
                                    patientCache.set(sch.patientId, patientName);
                                }
                            }
                        }
                    } catch (patError) {
                        console.error(`Error fetching patient ${sch.patientId}:`, patError);
                    }

                    let dayOffset = dayMap[sch.dayOfWeek];
                    if (dayOffset === undefined) return null;

                    if (dayOffset === 0) dayOffset = 7;
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + (dayOffset - 1));
                    
                    const start = new Date(date);
                    start.setHours(sch.hourFrom, sch.minuteFrom, 0, 0);
                    
                    const end = new Date(date);
                    end.setHours(sch.hourTo, sch.minuteTo, 0, 0);

                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

                    return {
                        title: doctorName,
                        start,
                        end,
                        id: sch.id,
                        location: locationName,
                        patientName: patientName,
                        scheduleTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
                    };
                });

                const mappedEvents = (await Promise.all(eventPromises)).filter(Boolean);
                setAllEvents(mappedEvents);
            } catch (err) {
                setError('Error al cargar los horarios.');
                console.error(err);
            }
        };

        fetchSchedules();
    }, [selectedLocation, selectedDoctorFilter, selectedPatientFilter]);

    const handleClearFilters = () => {
        setSelectedLocation('');
        setDoctorFilterTerm('');
        setPatientFilterTerm('');
        setSelectedDoctorFilter(null);
        setSelectedPatientFilter(null);
    };

    const handleSelectSlot = useCallback(({ start, end }) => {
        if (!isAdmin) return;
        handleShowNew();
        setNewEvent({
            title: "", start, end,
            selectedDoctor: null, selectedPatient: null, selectedLocation: null,
        });
        setSaveError('');
    }, [isAdmin]);

    const handleSelectEvent = useCallback((event) => {
        setSeeEvent(event);
        handleShow();
    }, []);

    const { scrollToTime, components } = useMemo(() => ({
        scrollToTime: new Date(1970, 1, 1, 6),
        components: {
            work_week: {
                header: ({ date }) => {
                    return <span>{format(date, 'eeee', { locale: es })}</span>
                }
            }
        }
    }), []);

    const resetNewEventForm = () => {
        setNewEvent({
            title: "", start: null, end: null,
            selectedDoctor: null, selectedPatient: null, selectedLocation: null,
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
                title: `${newEvent.selectedDoctor.name} con ${newEvent.selectedPatient.name}`,
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
        setScheduleToDelete(seeEvent);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteSchedule = async () => {
        if (!scheduleToDelete?.id) {
            setDeleteError("No se ha seleccionado ningún horario para eliminar.");
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            await deleteSchedule(scheduleToDelete.id);
            
            // Update the UI by removing the event
            setAllEvents(prev => prev.filter(event => event.id !== scheduleToDelete.id));
            
            // Close all modals and reset state
            setShowDeleteConfirm(false);
            handleClose(); 
            setScheduleToDelete(null);

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Ocurrió un error inesperado al eliminar el horario.";
            setDeleteError(errorMessage);
            console.error("Error deleting schedule:", err);
            // Keep the confirmation modal open to show the error
        } finally {
            setIsDeleting(false);
        }
    };

    // Effects for debounced search in filters
    useEffect(() => {
        const search = async (term, searchFn, resultsSetter) => {
            if (term.length < 2) {
                resultsSetter([]);
                return;
            }
            try {
                const results = await searchFn({ name: term });
                resultsSetter(results);
            } catch (error) {
                resultsSetter([]);
            }
        };

        search(debouncedDoctorFilterTerm, async (params) => {
            const users = await getUsers(params);
            return users.filter(u => u.roles && (u.roles.includes('DOCTOR') || u.roles.includes('ADMINISTRATOR')));
        }, setDoctorFilterResults);
    }, [debouncedDoctorFilterTerm]);

    useEffect(() => {
        const search = async (term, searchFn, resultsSetter) => {
            if (term.length < 2) {
                resultsSetter([]);
                return;
            }
            try {
                const results = await searchFn({ name: term });
                resultsSetter(results);
            } catch (error) {
                resultsSetter([]);
            }
        };

        search(debouncedPatientFilterTerm, getPatients, setPatientFilterResults);
    }, [debouncedPatientFilterTerm]);


    // Effects for debounced search in modal
    useEffect(() => {
        const search = async (term, searchFn, resultsSetter, searchingSetter) => {
            if (term.length < 2) {
                resultsSetter([]);
                return;
            }
            searchingSetter(true);
            try {
                const results = await searchFn({ name: term });
                resultsSetter(results);
            } catch (error) {
                resultsSetter([]);
            }
            searchingSetter(false);
        };

        search(debouncedDoctorSearchTerm, async (params) => {
            const users = await getUsers(params);
            return users.filter(u => u.roles && (u.roles.includes('DOCTOR') || u.roles.includes('ADMINISTRATOR')));
        }, setDoctorResults, setIsSearchingDoctors);
    }, [debouncedDoctorSearchTerm]);

    useEffect(() => {
        const search = async (term, searchFn, resultsSetter, searchingSetter) => {
            if (term.length < 2) {
                resultsSetter([]);
                return;
            }
            searchingSetter(true);
            try {
                const results = await searchFn({ name: term });
                resultsSetter(results);
            } catch (error) {
                resultsSetter([]);
            }
            searchingSetter(false);
        };

        search(debouncedPatientSearchTerm, getPatients, setPatientResults, setIsSearchingPatients);
    }, [debouncedPatientSearchTerm]);

    useEffect(() => {
        const search = async (term, searchFn, resultsSetter, searchingSetter) => {
            if (term.length < 2) {
                resultsSetter([]);
                return;
            }
            searchingSetter(true);
            try {
                const results = await searchFn({ name: term });
                resultsSetter(results);
            } catch (error) {
                resultsSetter([]);
            }
            searchingSetter(false);
        };

        search(debouncedLocationSearchTerm, getLocations, setLocationResults, setIsSearchingLocations);
    }, [debouncedLocationSearchTerm]);


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

    

    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Alert variant="danger" className="text-center">{error}</Alert>
        </Container>
    );

    return (
        <Container className="scheduler-container">
            {isAdmin && (
                <Alert variant="info" className="mb-3">
                    <strong>Vista de Administrador:</strong> Como administrador, tiene permisos para ver todos los horarios, crear nuevos y eliminarlos.
                </Alert>
            )}
            {/* Filters Card */}
            <Card className="mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="filter-title mb-0"><i className="bi bi-funnel me-2"></i>Filtros</h5>
                        <Button 
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleClearFilters}
                        >
                            Limpiar Filtros
                        </Button>
                    </div>
                    <Row>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Paciente</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-search"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre de paciente..."
                                        value={patientFilterTerm}
                                        onChange={e => {
                                            setPatientFilterTerm(e.target.value);
                                            setSelectedPatientFilter(null);
                                        }}
                                    />
                                </InputGroup>
                                {patientFilterResults.length > 0 && (
                                    <ListGroup className="search-results-dropdown">
                                        {patientFilterResults.map(pat => (
                                            <ListGroup.Item key={pat.id} action onClick={() => {
                                                setSelectedPatientFilter(pat);
                                                setPatientFilterTerm(pat.name);
                                                setPatientFilterResults([]);
                                            }}>
                                                {pat.name}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                )}
                                {selectedPatientFilter && <small className="text-success d-block mt-1">Seleccionado: {selectedPatientFilter.name}</small>}
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Doctor</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-person"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre de doctor..."
                                        value={doctorFilterTerm}
                                        onChange={e => {
                                            setDoctorFilterTerm(e.target.value);
                                            setSelectedDoctorFilter(null);
                                        }}
                                    />
                                </InputGroup>
                                {doctorFilterResults.length > 0 && (
                                    <ListGroup className="search-results-dropdown">
                                        {doctorFilterResults.map(doc => (
                                            <ListGroup.Item key={doc.id} action onClick={() => {
                                                setSelectedDoctorFilter(doc);
                                                setDoctorFilterTerm(doc.name);
                                                setDoctorFilterResults([]);
                                            }}>
                                                {doc.name} ({doc.email})
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                )}
                                {selectedDoctorFilter && <small className="text-success d-block mt-1">Seleccionado: {selectedDoctorFilter.name}</small>}
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Ubicación</Form.Label>
                                <Form.Select
                                    value={selectedLocation}
                                    onChange={e => setSelectedLocation(e.target.value)}
                                >
                                    <option value="">Todas las ubicaciones</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <span className="scheduler-card-title">Agenda Semanal</span>
                    <Badge bg="info">
                        {allEvents.length} turnos encontrados
                    </Badge>
                </Card.Header>
                <Card.Body>
                    <div className="Scheduler">
                        <Calendar views={[Views.WORK_WEEK]}
                                  defaultView={Views.WORK_WEEK}
                                  localizer={localizer}
                                  events={allEvents}
                                  onSelectEvent={handleSelectEvent}
                                  onSelectSlot={handleSelectSlot}
                                  selectable={isAdmin}
                                  scrollToTime={scrollToTime}
                                  startAccessor="start" endAccessor="end"
                                  style={{ height: 700, margin: "0" }}
                                  step={5}
                                  timeslots={6}
                                  min={new Date(2016, 10, 1, 8, 0, 0)}
                                  toolbar={false}
                                  formats={formats}
                                  culture='es'
                                  messages={messages}
                                  components={components}
                                  allDaySlot={false}
                        />
                    </div>
                </Card.Body>
            </Card>

            {/* Modals must be outside the main layout div */}
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Turno: {seeEvent.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p><strong>Paciente:</strong> {seeEvent.patientName}</p>
                    <p><strong>Horario:</strong> {seeEvent.scheduleTime}</p>
                    <p><strong>Ubicación:</strong> {seeEvent.location}</p>
                </Modal.Body>
                <Modal.Footer>
                    {isAdmin &&
                        <Button variant="danger" onClick={handleDeleteScheduleClick}>
                            Eliminar
                        </Button>
                    }
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
                                {`Horario: ${format(newEvent.start, 'eeee', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())} de ${format(newEvent.start, 'HH:mm')} a ${format(newEvent.end, 'HH:mm')}`}
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
        </Container>
    );
}

export default Scheduler;