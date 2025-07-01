import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import addDays from "date-fns/addDays";
import subDays from "date-fns/subDays";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState, useEffect, useContext} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal, Spinner, Container, Alert, ListGroup, InputGroup, Card, Row, Col, Badge, Collapse } from "react-bootstrap";
import { getSchedules, getUserById, getLocationById, getLocations, getUsers, getPatients, createSchedule, deleteSchedule, getPatientById } from "../../api/api";
import { es } from 'date-fns/locale';
import { AuthContext } from "../../context/AuthContext";
import { FaChevronDown, FaChevronUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useMobileDetection } from '../../hooks/useMobileDetection';

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

// Hook removido - ahora usa el hook global


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

    // Hook para detección móvil
    const isMobile = useMobileDetection();
    
    // Estado para evitar problemas de renderizado antes de la detección inicial
    const [isInitialized, setIsInitialized] = useState(false);
    
    useEffect(() => {
        // Pequeño delay para asegurar que la detección móvil esté completa
        const timer = setTimeout(() => {
            setIsInitialized(true);
        }, 150);
        
        return () => clearTimeout(timer);
    }, []);

    // Estado para filtros colapsibles
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // Estado para navegación de días - inicializar con lunes por defecto
    const [currentDay, setCurrentDay] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        // Por defecto arrancar en lunes (se ajustará después con useEffect)
        const monday = dayOfWeek === 0 ? subDays(today, 6) : subDays(today, dayOfWeek - 1);
        return monday;
    });



    // Ajustar currentDay según el dispositivo cuando esté inicializado
    useEffect(() => {
        if (!isInitialized) return;
        
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        let targetDay;
        
        if (!isMobile) {
            // Desktop: siempre lunes de la semana actual
            targetDay = dayOfWeek === 0 ? subDays(today, 6) : subDays(today, dayOfWeek - 1);
        } else {
            // Móvil: mostrar día actual
            targetDay = today;
        }
        
        setCurrentDay(targetDay);
    }, [isMobile, isInitialized]);

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

    // Funciones de navegación - navegación libre
    const navigateToPreviousDay = () => {
        setCurrentDay(current => subDays(current, 1));
    };

    const navigateToNextDay = () => {
        setCurrentDay(current => addDays(current, 1));
    };

    // navigateToToday removido para evitar warning de unused

    // Estados para swipe en móviles
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Distancia mínima para considerar un swipe
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            navigateToNextDay();
        } else if (isRightSwipe) {
            navigateToPreviousDay();
        }
    };





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
            console.log('Fetching schedules...');
            
            setError(null);
            try {
                const params = {};
                if (selectedLocation) params.locationId = selectedLocation;
                if (selectedDoctorFilter) params.doctorId = selectedDoctorFilter.id;
                if (selectedPatientFilter) params.patientId = selectedPatientFilter.id;

                console.log('Loading schedules with params:', params);
                const schedules = await getSchedules(params);
                console.log('Loaded schedules:', schedules.length);
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
                console.log('Final mapped events for calendar:', mappedEvents.length, mappedEvents);
                
                // Debug: mostrar las fechas de los primeros eventos
                if (mappedEvents.length > 0) {
                    console.log('Sample event dates:');
                    mappedEvents.slice(0, 3).forEach((event, i) => {
                        console.log(`Event ${i + 1}: ${event.title} - Start: ${event.start.toISOString()} - End: ${event.end.toISOString()}`);
                    });
                }
                
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
        console.log('handleSelectSlot called:', { start, end, isAdmin });
        if (!isAdmin) {
            console.log('User is not admin, cannot create events');
            return;
        }
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
        dayHeaderFormat: isMobile ? 'EEEE' : 'eeee',
        weekdayFormat: 'eeee',
        dayFormat: 'eeee',
        dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
            localizer.format(start, 'eeee', culture) + ' - ' + localizer.format(end, 'eeee', culture)
    }

    

    if (error) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
            <Alert variant="danger" className="text-center">{error}</Alert>
        </Container>
    );

    // Mostrar loading mientras se inicializa la detección móvil
    if (!isInitialized) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <p className="mt-2 mb-0">Inicializando vista...</p>
                </div>
            </Container>
        );
    }

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
                        <Button
                            variant="link"
                            className="p-0 text-decoration-none d-flex align-items-center"
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            style={{ color: '#009A9E', fontWeight: 600 }}
                        >
                            <i className="bi bi-funnel me-2"></i>
                            Filtros
                            {filtersExpanded ? <FaChevronUp className="ms-2" /> : <FaChevronDown className="ms-2" />}
                        </Button>
                        <Button 
                            variant="outline-secondary"
                            size="sm"
                            onClick={handleClearFilters}
                        >
                            Limpiar Filtros
                        </Button>
                    </div>
                    <Collapse in={filtersExpanded}>
                        <div>
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
                        </div>
                    </Collapse>
                </Card.Body>
            </Card>

            <Card>
                <Card.Header>
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="scheduler-card-title">Agenda por Días</span>
                        <Badge bg="info">
                            {allEvents.length} turnos encontrados
                        </Badge>
                    </div>

                    {/* Controles de navegación personalizados - Solo en móviles */}
                    {isMobile && (
                        <div 
                            className="d-flex justify-content-between align-items-center mt-3 p-2 bg-light rounded mobile-navigation"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={navigateToPreviousDay}
                                className="mobile-nav-btn"
                            >
                                <FaChevronLeft />
                                <span className="nav-btn-text">Anterior</span>
                            </Button>
                            
                            <div className="d-flex align-items-center">
                                <h6 className="mb-0 text-center">
                                    <span className="badge bg-primary mobile-day-badge">
                                        {format(currentDay, 'EEEE', { locale: es })}
                                    </span>
                                </h6>
                            </div>
                            
                            <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={navigateToNextDay}
                                className="mobile-nav-btn"
                            >
                                <span className="nav-btn-text">Siguiente</span>
                                <FaChevronRight />
                            </Button>
                        </div>
                    )}
                </Card.Header>
                <Card.Body>
                    <div 
                        className="Scheduler"
                        onTouchStart={isMobile ? onTouchStart : undefined}
                        onTouchMove={isMobile ? onTouchMove : undefined}
                        onTouchEnd={isMobile ? onTouchEnd : undefined}
                    >
                        {console.log('Rendering Calendar with:', { 
                            allEventsLength: allEvents.length, 
                            isMobile, 
                            isAdmin, 
                            isInitialized,
                            currentDay: currentDay.toISOString(),
                            eventsForToday: allEvents.filter(event => {
                                const eventDate = event.start.toDateString();
                                const currentDate = currentDay.toDateString();
                                return eventDate === currentDate;
                            }).length
                        })}
                        <Calendar 
                            key={`calendar-${isMobile ? 'mobile' : 'desktop'}-${isInitialized ? 'ready' : 'loading'}`} // Forzar re-render cuando esté listo
                            views={isMobile ? [Views.DAY] : [Views.WORK_WEEK]}
                            defaultView={isMobile ? Views.DAY : Views.WORK_WEEK}
                            view={isMobile ? Views.DAY : Views.WORK_WEEK} // Forzar vista específica
                            localizer={localizer}
                            events={allEvents}
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            selectable={isAdmin}
                            onView={() => console.log('Calendar view changed')}
                            scrollToTime={scrollToTime}
                            startAccessor="start" 
                            endAccessor="end"
                            style={{ height: 600, margin: "0" }}
                            step={15}
                            timeslots={4}
                            min={new Date(2016, 10, 1, 8, 0, 0)}
                            max={new Date(2016, 10, 1, 20, 0, 0)}
                            toolbar={false}
                            formats={formats}
                            culture='es'
                            messages={messages}
                            components={components}
                            allDaySlot={false}
                            date={currentDay}
                            onNavigate={(date) => console.log('Calendar navigate to:', date)} // Debug + deshabilitar navegación
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