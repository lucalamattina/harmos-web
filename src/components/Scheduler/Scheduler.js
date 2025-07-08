import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import addDays from "date-fns/addDays";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState, useEffect, useContext} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal, Spinner, Container, Alert, ListGroup, InputGroup, Card, Row, Col, Badge, Collapse } from "react-bootstrap";
import { getSchedules, getUserById, getLocationById, getLocations, getUsers, getPatients, createSchedule, deleteSchedule, getPatientById } from "../../api/api";
import { es } from 'date-fns/locale';
import { AuthContext } from "../../context/AuthContext";
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
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

// **NUEVOS ESTADOS PARA DETECCIÓN DE ERRORES**
const ERROR_TYPES = {
    NETWORK: 'NETWORK',
    API: 'API', 
    TIMEOUT: 'TIMEOUT',
    CALENDAR: 'CALENDAR',
    DATA: 'DATA'
};

// **FUNCIÓN HELPER PARA LOGGING DETALLADO**
const logError = (type, operation, error, additionalInfo = {}) => {
    const timestamp = new Date().toISOString();
    const errorInfo = {
        timestamp,
        type,
        operation,
        error: {
            message: error?.message,
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data
        },
        additionalInfo,
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    console.error(`🚨 [SCHEDULER ERROR] ${type} - ${operation}:`, errorInfo);
    
    // Guardar en localStorage para debugging
    try {
        const savedErrors = JSON.parse(localStorage.getItem('scheduler_errors') || '[]');
        savedErrors.push(errorInfo);
        // Mantener solo los últimos 10 errores
        if (savedErrors.length > 10) {
            savedErrors.shift();
        }
        localStorage.setItem('scheduler_errors', JSON.stringify(savedErrors));
    } catch (e) {
        console.warn('No se pudo guardar error en localStorage:', e);
    }
    
    return errorInfo;
};

// **FUNCIÓN PARA TIMEOUT CON PROMESAS**
const withTimeout = (promise, timeoutMs = 10000, operation = 'API Call') => {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout: ${operation} tardó más de ${timeoutMs}ms`)), timeoutMs)
        )
    ]);
};

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
    
    // **NUEVOS ESTADOS PARA DETECCIÓN DE ERRORES**
    const [errorDetails, setErrorDetails] = useState({
        hasError: false,
        type: null,
        message: '',
        lastOperation: '',
        timestamp: null,
        retryCount: 0,
        canRetry: false
    });
    
    const [networkStatus, setNetworkStatus] = useState({
        isOnline: navigator.onLine,
        lastCheck: new Date(),
        apiResponsive: true,
        latency: null
    });
    
    const [loadingStates, setLoadingStates] = useState({
        schedules: false,
        locations: false,
        calendar: false,
        initializing: true
    });
    
    const [performanceMetrics, setPerformanceMetrics] = useState({
        schedulesLoadTime: null,
        locationsLoadTime: null,
        calendarRenderTime: null,
        lastUpdate: null
    });
    
    useEffect(() => {
        // Pequeño delay para asegurar que la detección móvil esté completa
        const timer = setTimeout(() => {
            setIsInitialized(true);
            setLoadingStates(prev => ({ ...prev, initializing: false }));
        }, 150);
        
        return () => clearTimeout(timer);
    }, []);
    
    // **MONITOR DE CONEXIÓN**
    useEffect(() => {
        const handleOnline = () => {
            setNetworkStatus(prev => ({ 
                ...prev, 
                isOnline: true, 
                lastCheck: new Date() 
            }));
            console.log('🌐 Conexión restaurada');
        };
        
        const handleOffline = () => {
            setNetworkStatus(prev => ({ 
                ...prev, 
                isOnline: false, 
                lastCheck: new Date() 
            }));
            logError(ERROR_TYPES.NETWORK, 'Connection Lost', new Error('Usuario offline'));
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Estado para filtros colapsibles - inicializar como false y luego ajustar
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    // Estado para navegación de días - inicializar con lunes por defecto
    const [currentDay, setCurrentDay] = useState(() => {
        const today = new Date();
        // Usar startOfWeek para obtener el lunes de la semana actual
        return startOfWeek(today, { weekStartsOn: 1 });
    });

    // **FUNCIÓN PARA LIMPIAR ERRORES**
    const clearError = () => {
        setErrorDetails({
            hasError: false,
            type: null,
            message: '',
            lastOperation: '',
            timestamp: null,
            retryCount: 0,
            canRetry: false
        });
    };
    
    // **FUNCIÓN PARA RETRY OPERATIONS**
    const retryLastOperation = () => {
        if (errorDetails.canRetry && errorDetails.retryCount < 3) {
            console.log(`🔄 Reintentando operación: ${errorDetails.lastOperation}`);
            clearError();
            
            // Trigger re-fetch based on last operation
            if (errorDetails.lastOperation.includes('schedules')) {
                // Trigger schedules refetch - se hará automáticamente por el useEffect
                setSelectedLocation(prev => prev); // Force re-fetch
            } else if (errorDetails.lastOperation.includes('locations')) {
                // Retry locations fetch
                fetchInitialData();
            }
        }
    };

    // Ajustar currentDay para que siempre inicie en lunes de la semana actual
    useEffect(() => {
        if (!isInitialized) return;
        
        const today = new Date();
        // Tanto móvil como desktop: siempre lunes de la semana actual
        const targetDay = startOfWeek(today, { weekStartsOn: 1 });
        
        setCurrentDay(targetDay);
    }, [isInitialized]);

    // Configurar filtros según el dispositivo cuando la detección móvil esté lista
    useEffect(() => {
        if (!isInitialized) return;
        
        // En PC: expandidos, en móvil: minimizados
        setFiltersExpanded(!isMobile);
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

    // **FUNCIÓN MEJORADA PARA FETCH INITIAL DATA**
    const fetchInitialData = async () => {
        const startTime = performance.now();
        setLoadingStates(prev => ({ ...prev, locations: true }));
        
        try {
            console.log('📍 Iniciando carga de ubicaciones...');
            const locs = await withTimeout(getLocations(), 8000, 'getLocations');
            
            if (!locs || !Array.isArray(locs)) {
                throw new Error('Respuesta inválida de ubicaciones: no es un array');
            }
            
            setLocations(locs);
            const loadTime = performance.now() - startTime;
            setPerformanceMetrics(prev => ({ 
                ...prev, 
                locationsLoadTime: loadTime,
                lastUpdate: new Date() 
            }));
            
            console.log(`✅ Ubicaciones cargadas: ${locs.length} items en ${loadTime.toFixed(2)}ms`);
            clearError();
            
        } catch (err) {
            const errorInfo = logError(ERROR_TYPES.API, 'fetchInitialData - getLocations', err, {
                operation: 'Initial locations fetch',
                retryable: true
            });
            
            setErrorDetails({
                hasError: true,
                type: ERROR_TYPES.API,
                message: 'Error al cargar las ubicaciones para los filtros.',
                lastOperation: 'fetchInitialData - locations',
                timestamp: new Date(),
                retryCount: errorDetails.retryCount + 1,
                canRetry: errorDetails.retryCount < 2
            });
            
            setError('Error al cargar las ubicaciones para los filtros.');
        } finally {
            setLoadingStates(prev => ({ ...prev, locations: false }));
        }
    };



    useEffect(() => {
        fetchInitialData();
    }, []);

    // Cache maps moved to component level for persistence between renders
    const [doctorCache] = useState(() => new Map());
    const [locationCache] = useState(() => new Map());
    const [patientCache] = useState(() => new Map());

    // Load a single user if not in cache
    const loadUserIfNeeded = async (userId) => {
        if (!userId || doctorCache.has(userId)) return doctorCache.get(userId);
        try {
            const user = await getUserById(userId);
            if (user) {
                doctorCache.set(userId, user.name || user.firstName);
                return user.name || user.firstName;
            }
        } catch (error) {
            logError(ERROR_TYPES.API, 'loadUserIfNeeded', error);
        }
        return `Doctor ID: ${userId}`;
    };

    // Load a single location if not in cache
    const loadLocationIfNeeded = async (locationId) => {
        if (!locationId || locationCache.has(locationId)) return locationCache.get(locationId);
        try {
            const location = await getLocationById(locationId);
            if (location) {
                locationCache.set(locationId, location.name);
                return location.name;
            }
        } catch (error) {
            logError(ERROR_TYPES.API, 'loadLocationIfNeeded', error);
        }
        return `Ubicación ID: ${locationId}`;
    };

    // Load a single patient if not in cache
    const loadPatientIfNeeded = async (patientId) => {
        if (!patientId || patientCache.has(patientId)) return patientCache.get(patientId);
        try {
            const patient = await getPatientById(patientId);
            if (patient) {
                patientCache.set(patientId, patient.name);
                return patient.name;
            }
        } catch (error) {
            logError(ERROR_TYPES.API, 'loadPatientIfNeeded', error);
        }
        return `Paciente ID: ${patientId}`;
    };

    useEffect(() => {
        const fetchSchedules = async () => {
            const startTime = performance.now();
            setLoadingStates(prev => ({ ...prev, schedules: true }));
            setError(null);
            
            try {
                console.log('📅 Iniciando carga de horarios...');
                
                const params = {};
                if (selectedLocation) params.locationId = selectedLocation;
                if (selectedDoctorFilter) params.doctorId = selectedDoctorFilter.id;
                if (selectedPatientFilter) params.patientId = selectedPatientFilter.id;

                console.log('📅 Parámetros de búsqueda:', params);
                
                // Verificar conectividad antes de hacer la llamada
                if (!networkStatus.isOnline) {
                    throw new Error('Sin conexión a internet');
                }

                const schedules = await withTimeout(getSchedules(params), 15000, 'getSchedules');
                console.log(`📅 Horarios obtenidos: ${schedules?.length || 0} items`);
                
                if (!schedules || !Array.isArray(schedules)) {
                    throw new Error('Respuesta inválida de horarios: no es un array');
                }

                const dayMap = {
                    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4,
                    FRIDAY: 5, SATURDAY: 6, SUNDAY: 0,
                };

                // Usar la semana del currentDay en lugar de la semana actual
                const weekStart = startOfWeek(currentDay, { weekStartsOn: 1 });

                console.log('🔄 Procesando eventos del calendario...');
                console.log('📅 Semana objetivo:', format(weekStart, 'dd/MM/yyyy'), '-', format(addDays(weekStart, 6), 'dd/MM/yyyy'));
                console.log('🎯 CurrentDay:', format(currentDay, 'dd/MM/yyyy'));

                // Process schedules in chunks to avoid overwhelming the browser
                const CHUNK_SIZE = 10;
                const events = [];

                for (let i = 0; i < schedules.length; i += CHUNK_SIZE) {
                    const chunk = schedules.slice(i, i + CHUNK_SIZE);
                    const processedChunk = await Promise.all(chunk.map(async (sch) => {
                        const [doctorName, locationName, patientName] = await Promise.all([
                            loadUserIfNeeded(sch.doctorUserId),
                            loadLocationIfNeeded(sch.locationId),
                            loadPatientIfNeeded(sch.patientId)
                        ]);

                        let dayOffset = dayMap[sch.dayOfWeek];
                        if (dayOffset === undefined) {
                            console.warn(`⚠️ dayOfWeek inválido: ${sch.dayOfWeek}`);
                            return null;
                        }

                        if (dayOffset === 0) dayOffset = 7;
                        const date = new Date(weekStart);
                        date.setDate(weekStart.getDate() + (dayOffset - 1));
                        
                        const start = new Date(date);
                        start.setHours(sch.hourFrom, sch.minuteFrom, 0, 0);
                        
                        const end = new Date(date);
                        end.setHours(sch.hourTo, sch.minuteTo, 0, 0);

                        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                            console.warn(`⚠️ Fechas inválidas para horario ${sch.id}:`, {
                                hourFrom: sch.hourFrom,
                                minuteFrom: sch.minuteFrom,
                                hourTo: sch.hourTo,
                                minuteTo: sch.minuteTo
                            });
                            return null;
                        }

                        return {
                            title: doctorName,
                            start,
                            end,
                            id: sch.id,
                            location: locationName,
                            patientName: patientName,
                            scheduleTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`
                        };
                    }));

                    events.push(...processedChunk.filter(Boolean));
                }

                setAllEvents(events);
                const loadTime = performance.now() - startTime;
                setPerformanceMetrics(prev => ({ 
                    ...prev, 
                    schedulesLoadTime: loadTime,
                    lastUpdate: new Date() 
                }));
                
                console.log(`✅ Horarios cargados exitosamente en ${loadTime.toFixed(2)}ms`);
                clearError();
                
            } catch (err) {
                const errorInfo = logError(ERROR_TYPES.API, 'fetchSchedules', err, {
                    params: { selectedLocation, selectedDoctorFilter, selectedPatientFilter },
                    networkStatus: networkStatus.isOnline
                });
                
                setErrorDetails({
                    hasError: true,
                    type: err.message.includes('Timeout') ? ERROR_TYPES.TIMEOUT : ERROR_TYPES.API,
                    message: err.message.includes('Timeout') 
                        ? 'La carga de horarios está tardando demasiado. Verifique su conexión.' 
                        : 'Error al cargar los horarios.',
                    lastOperation: 'fetchSchedules',
                    timestamp: new Date(),
                    retryCount: errorDetails.retryCount + 1,
                    canRetry: errorDetails.retryCount < 2
                });
                
                setError('Error al cargar los horarios.');
            } finally {
                setLoadingStates(prev => ({ ...prev, schedules: false }));
            }
        };

        fetchSchedules();
    }, [selectedLocation, selectedDoctorFilter, selectedPatientFilter, currentDay]);

    const handleClearFilters = () => {
        setSelectedLocation('');
        setDoctorFilterTerm('');
        setPatientFilterTerm('');
        setSelectedDoctorFilter(null);
        setSelectedPatientFilter(null);
    };

    const handleSelectSlot = useCallback(({ start, end }) => {
        // handleSelectSlot called
        if (!isAdmin) {
            // User is not admin, cannot create events
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
            setSaveError("Por favor, completa todos los campos: Terapeuta, Paciente, Ubicación y horario.");
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

    

    // **PANEL DE ERROR DETALLADO**
    if (errorDetails.hasError) {
        return (
            <Container className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Alert variant="danger" className="text-center w-100">
                    <Alert.Heading>🚨 Error Detectado</Alert.Heading>
                    <p><strong>Tipo:</strong> {errorDetails.type}</p>
                    <p><strong>Mensaje:</strong> {errorDetails.message}</p>
                    <p><strong>Operación:</strong> {errorDetails.lastOperation}</p>
                    <p><strong>Timestamp:</strong> {errorDetails.timestamp?.toLocaleString()}</p>
                    <p><strong>Intentos:</strong> {errorDetails.retryCount}/3</p>
                    <hr />
                    <div className="d-flex gap-2 justify-content-center">
                        {errorDetails.canRetry && (
                            <Button variant="warning" onClick={retryLastOperation}>
                                🔄 Reintentar ({3 - errorDetails.retryCount} intentos restantes)
                            </Button>
                        )}
                        <Button variant="outline-secondary" onClick={clearError}>
                            Cerrar Error
                        </Button>

                    </div>
                </Alert>

            </Container>
        );
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
                                <Form.Label>Terapeuta</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <i className="bi bi-person"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="Buscar por nombre de terapeuta..."
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


                </Card.Header>
                <Card.Body>


                    <div 
                        className="Scheduler"
                        style={{
                            minHeight: isMobile ? '500px' : '600px'
                        }}
                    >
                        
                        <Calendar 
                            key={`calendar-${isMobile ? 'mobile' : 'desktop'}-${isInitialized ? 'ready' : 'loading'}-${allEvents.length}`} // Incluir count de eventos
                                                    views={[Views.WORK_WEEK]}
                        defaultView={Views.WORK_WEEK}
                        view={Views.WORK_WEEK}
                            localizer={localizer}
                            events={allEvents}
                            onSelectEvent={handleSelectEvent}
                            onSelectSlot={handleSelectSlot}
                            selectable={isAdmin}
                            onView={() => {}}
                            scrollToTime={scrollToTime}
                            startAccessor="start" 
                            endAccessor="end"
                            style={{ 
                                height: isMobile ? 500 : 600, 
                                margin: "0",
                                minHeight: isMobile ? '500px' : '600px',
                                backgroundColor: 'white' // Asegurar fondo blanco
                            }}
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
                            onNavigate={(date) => {}}
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
                            <Form.Label>Terapeuta</Form.Label>
                            <InputGroup>
                                <Form.Control
                                    type="text"
                                    placeholder="Buscar terapeuta por nombre..."
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