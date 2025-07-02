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

    // Estado para filtros colapsibles - minimizado por defecto en mobile
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // Estado para navegación de días - inicializar con lunes por defecto
    const [currentDay, setCurrentDay] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        // Por defecto arrancar en lunes (se ajustará después con useEffect)
        const monday = dayOfWeek === 0 ? subDays(today, 6) : subDays(today, dayOfWeek - 1);
        return monday;
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
            // Móvil: mostrar día actual inicialmente
            targetDay = today;
        }
        
        setCurrentDay(targetDay);
    }, [isMobile, isInitialized]);

    // **NUEVO: Auto-navegar a un día con eventos en mobile**
    useEffect(() => {
        if (!isMobile || !isInitialized || allEvents.length === 0) return;
        
        // Verificar si el día actual tiene eventos
        const currentDateStr = format(currentDay, 'yyyy-MM-dd');
        const hasEventsToday = allEvents.some(event => 
            format(event.start, 'yyyy-MM-dd') === currentDateStr
        );
        
        // Si no hay eventos hoy, navegar al primer día con eventos
        if (!hasEventsToday && allEvents.length > 0) {
            const firstEventDate = allEvents[0].start;
            console.log(`📅 Auto-navegando de ${currentDateStr} a ${format(firstEventDate, 'yyyy-MM-dd')} (primer evento)`);
            setCurrentDay(firstEventDate);
        }
    }, [allEvents, currentDay, isMobile, isInitialized]);

    // Ajustar filtros según el dispositivo cuando esté inicializado
    useEffect(() => {
        if (!isInitialized) return;
        
        // En mobile: filtros minimizados por defecto
        // En desktop: filtros expandidos por defecto
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
        fetchInitialData();
    }, []);

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

                // Cache to avoid re-fetching the same doctor/location/patient
                const doctorCache = new Map();
                const locationCache = new Map();
                const patientCache = new Map();

                const now = new Date();
                const weekStart = startOfWeek(now, { weekStartsOn: 1 });

                console.log('🔄 Procesando eventos del calendario...');
                
                const eventPromises = schedules.map(async (sch, index) => {
                    try {
                        if (!sch || !sch.dayOfWeek) {
                            console.warn(`⚠️ Horario ${index} inválido:`, sch);
                            return null;
                        }

                        let doctorName = `Doctor ID: ${sch.doctorUserId}`;
                        let locationName = `Ubicación ID: ${sch.locationId}`;
                        let patientName = `Paciente ID: ${sch.patientId}`;

                        // **FETCH DOCTOR CON MEJOR MANEJO DE ERRORES**
                        try {
                            if (sch.doctorUserId) {
                                if (doctorCache.has(sch.doctorUserId)) {
                                    doctorName = doctorCache.get(sch.doctorUserId);
                                } else {
                                    const doctor = await withTimeout(
                                        getUserById(sch.doctorUserId), 
                                        5000, 
                                        `getUserById(${sch.doctorUserId})`
                                    );
                                    if (doctor) {
                                        doctorName = `${doctor.name || doctor.firstName}`;
                                        doctorCache.set(sch.doctorUserId, doctorName);
                                    }
                                }
                            }
                        } catch (docError) {
                            logError(ERROR_TYPES.API, `getUserById(${sch.doctorUserId})`, docError, {
                                scheduleId: sch.id,
                                doctorUserId: sch.doctorUserId
                            });
                        }

                        // **FETCH LOCATION CON MEJOR MANEJO DE ERRORES**
                        try {
                            if (sch.locationId) {
                                if (locationCache.has(sch.locationId)) {
                                    locationName = locationCache.get(sch.locationId);
                                } else {
                                    const location = await withTimeout(
                                        getLocationById(sch.locationId), 
                                        5000, 
                                        `getLocationById(${sch.locationId})`
                                    );
                                    if (location) {
                                        locationName = location.name;
                                        locationCache.set(sch.locationId, locationName);
                                    }
                                }
                            }
                        } catch (locError) {
                            logError(ERROR_TYPES.API, `getLocationById(${sch.locationId})`, locError, {
                                scheduleId: sch.id,
                                locationId: sch.locationId
                            });
                        }

                        // **FETCH PATIENT CON MEJOR MANEJO DE ERRORES**
                        try {
                            if (sch.patientId) {
                                if (patientCache.has(sch.patientId)) {
                                    patientName = patientCache.get(sch.patientId);
                                } else {
                                    const patient = await withTimeout(
                                        getPatientById(sch.patientId), 
                                        5000, 
                                        `getPatientById(${sch.patientId})`
                                    );
                                    if (patient) {
                                        patientName = patient.name;
                                        patientCache.set(sch.patientId, patientName);
                                    }
                                }
                            }
                        } catch (patError) {
                            logError(ERROR_TYPES.API, `getPatientById(${sch.patientId})`, patError, {
                                scheduleId: sch.id,
                                patientId: sch.patientId
                            });
                        }

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
                    } catch (eventError) {
                        logError(ERROR_TYPES.DATA, `processScheduleEvent(${sch?.id})`, eventError, {
                            schedule: sch,
                            index
                        });
                        return null;
                    }
                });

                const mappedEvents = (await Promise.all(eventPromises)).filter(Boolean);
                console.log(`✅ Eventos procesados: ${mappedEvents.length}/${schedules.length}`);
                
                setAllEvents(mappedEvents);
                
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
    }, [selectedLocation, selectedDoctorFilter, selectedPatientFilter]);

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
                        <Button 
                            variant="outline-info" 
                            onClick={() => {
                                const errors = JSON.parse(localStorage.getItem('scheduler_errors') || '[]');
                                console.table(errors);
                                alert('Errores guardados en consola. Presiona F12 para ver la tabla.');
                            }}
                        >
                            📋 Ver Logs
                        </Button>
                    </div>
                </Alert>
                
                {/* Panel de diagnóstico */}
                <Card className="w-100 mt-3">
                    <Card.Header>🔧 Diagnóstico del Sistema</Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <h6>Estado de Red</h6>
                                <div className={`badge ${networkStatus.isOnline ? 'bg-success' : 'bg-danger'}`}>
                                    {networkStatus.isOnline ? '🌐 Online' : '❌ Offline'}
                                </div>
                                <small className="d-block text-muted">
                                    Último check: {networkStatus.lastCheck.toLocaleTimeString()}
                                </small>
                            </Col>
                            <Col md={6}>
                                <h6>Performance</h6>
                                <small className="d-block">
                                    Horarios: {performanceMetrics.schedulesLoadTime?.toFixed(0)}ms
                                </small>
                                <small className="d-block">
                                    Ubicaciones: {performanceMetrics.locationsLoadTime?.toFixed(0)}ms
                                </small>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
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

            {/* Panel de Debug Mejorado - Detección de Errores */}
            <Card className="mb-3 border-info">
                <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        🔍 Monitor del Sistema {isMobile ? '(Mobile)' : '(Desktop)'}
                    </h6>
                    <Button 
                        variant="light" 
                        size="sm" 
                        onClick={() => {
                            const errors = JSON.parse(localStorage.getItem('scheduler_errors') || '[]');
                            console.clear();
                            console.log('🔧 SCHEDULER DEBUG INFO:');
                            console.log('Error Details:', errorDetails);
                            console.log('Network Status:', networkStatus);
                            console.log('Loading States:', loadingStates);
                            console.log('Performance Metrics:', performanceMetrics);
                            console.log('All Events:', allEvents.length);
                            console.log('Saved Errors:', errors);
                        }}
                    >
                        📊 Dump Info
                    </Button>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3} sm={6}>
                            <div className="border p-2 rounded bg-light">
                                <small className="fw-bold d-block">🌐 Conexión</small>
                                <div className={`badge ${networkStatus.isOnline ? 'bg-success' : 'bg-danger'}`}>
                                    {networkStatus.isOnline ? '✅ Online' : '❌ Offline'}
                                </div>
                                <small className="d-block text-muted">
                                    {networkStatus.lastCheck.toLocaleTimeString()}
                                </small>
                            </div>
                        </Col>
                        <Col md={3} sm={6}>
                            <div className="border p-2 rounded bg-light">
                                <small className="fw-bold d-block">⚙️ Estados de Carga</small>
                                <div className="d-flex gap-1 flex-wrap">
                                    <span className={`badge ${loadingStates.schedules ? 'bg-warning' : 'bg-success'}`}>
                                        H: {loadingStates.schedules ? '⏳' : '✅'}
                                    </span>
                                    <span className={`badge ${loadingStates.locations ? 'bg-warning' : 'bg-success'}`}>
                                        L: {loadingStates.locations ? '⏳' : '✅'}
                                    </span>
                                    <span className={`badge ${loadingStates.initializing ? 'bg-warning' : 'bg-success'}`}>
                                        I: {loadingStates.initializing ? '⏳' : '✅'}
                                    </span>
                                </div>
                            </div>
                        </Col>
                        <Col md={3} sm={6}>
                            <div className="border p-2 rounded bg-light">
                                <small className="fw-bold d-block">📊 Performance</small>
                                <small className="d-block">
                                    Horarios: {performanceMetrics.schedulesLoadTime 
                                        ? `${performanceMetrics.schedulesLoadTime.toFixed(0)}ms` 
                                        : 'N/A'}
                                </small>
                                <small className="d-block">
                                    Ubicaciones: {performanceMetrics.locationsLoadTime 
                                        ? `${performanceMetrics.locationsLoadTime.toFixed(0)}ms` 
                                        : 'N/A'}
                                </small>
                            </div>
                        </Col>
                        <Col md={3} sm={6}>
                            <div className="border p-2 rounded bg-light">
                                <small className="fw-bold d-block">📅 Datos</small>
                                <small className="d-block">
                                    Eventos: {allEvents.length}
                                </small>
                                <small className="d-block">
                                    Ubicaciones: {locations.length}
                                </small>
                                <small className="d-block">
                                    Errores: {JSON.parse(localStorage.getItem('scheduler_errors') || '[]').length}
                                </small>
                            </div>
                        </Col>
                        
                        {/* Solo en mobile: información adicional */}
                        {isMobile && (
                            <>
                                <Col sm={6}>
                                    <div className="border p-2 rounded bg-light">
                                        <small className="fw-bold d-block">📱 Dispositivo</small>
                                        <small className="d-block">
                                            {window.innerWidth}x{window.innerHeight}
                                        </small>
                                        <small className="d-block">
                                            {navigator.userAgent.includes('iPhone') ? '📱 iPhone' : 
                                             navigator.userAgent.includes('Android') ? '🤖 Android' : '📱 Mobile'}
                                        </small>
                                    </div>
                                </Col>
                                <Col sm={6}>
                                    <div className="border p-2 rounded bg-light">
                                        <small className="fw-bold d-block">📆 Vista Actual</small>
                                        <small className="d-block">
                                            {format(currentDay, 'EEEE', { locale: es })}
                                        </small>
                                        <small className="d-block">
                                            {format(currentDay, 'dd/MM/yyyy')}
                                        </small>
                                    </div>
                                </Col>
                            </>
                        )}
                        
                        {/* Eventos de hoy */}
                        {allEvents.length > 0 && (
                            <Col xs={12}>
                                <div className="border p-2 rounded bg-light">
                                    <small className="fw-bold d-block">📋 Eventos de Hoy</small>
                                    <div className="mt-1">
                                        {allEvents
                                            .filter(event => {
                                                const eventDate = format(event.start, 'yyyy-MM-dd');
                                                const currentDate = format(currentDay, 'yyyy-MM-dd');
                                                return eventDate === currentDate;
                                            })
                                            .slice(0, 4)
                                            .map((event, index) => (
                                                <small key={index} className="d-block text-primary">
                                                    {format(event.start, 'HH:mm')} - {event.title} ({event.patientName})
                                                </small>
                                            ))
                                        }
                                        {allEvents.filter(event => {
                                            const eventDate = format(event.start, 'yyyy-MM-dd');
                                            const currentDate = format(currentDay, 'yyyy-MM-dd');
                                            return eventDate === currentDate;
                                        }).length === 0 && (
                                            <small className="text-muted">
                                                No hay eventos para hoy
                                            </small>
                                        )}
                                    </div>
                                </div>
                            </Col>
                        )}
                        
                        {/* Estado de errores */}
                        {(errorDetails.hasError || JSON.parse(localStorage.getItem('scheduler_errors') || '[]').length > 0) && (
                            <Col xs={12}>
                                <div className="border p-2 rounded bg-warning">
                                    <small className="fw-bold d-block">⚠️ Información de Errores</small>
                                    {errorDetails.hasError && (
                                        <small className="d-block text-danger">
                                            Último error: {errorDetails.type} - {errorDetails.message}
                                        </small>
                                    )}
                                    <small className="d-block">
                                        Errores guardados: {JSON.parse(localStorage.getItem('scheduler_errors') || '[]').length}
                                    </small>
                                    <div className="mt-1">
                                        <Button 
                                            variant="outline-danger" 
                                            size="sm" 
                                            onClick={() => {
                                                localStorage.removeItem('scheduler_errors');
                                                clearError();
                                                alert('Errores limpiados');
                                            }}
                                        >
                                            🗑️ Limpiar Errores
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        )}
                    </Row>
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
                    {/* **DEBUG ESPECÍFICO PARA EVENTOS NO VISIBLES** */}
                    {isMobile && (
                        <Card className="mb-2 border-warning">
                            <Card.Body className="py-2">
                                <small className="fw-bold d-block">🔍 Debug Eventos en Calendario</small>
                                <div className="d-flex gap-2 flex-wrap mb-2">
                                    <span className="badge bg-secondary">Total Eventos: {allEvents.length}</span>
                                    <span className="badge bg-primary">Fecha: {format(currentDay, 'dd/MM/yyyy')}</span>
                                    <span className="badge bg-info">
                                        Eventos Hoy: {allEvents.filter(event => {
                                            const eventDate = format(event.start, 'yyyy-MM-dd');
                                            const currentDate = format(currentDay, 'yyyy-MM-dd');
                                            return eventDate === currentDate;
                                        }).length}
                                    </span>
                                </div>
                                {allEvents.length > 0 && (
                                    <div className="mt-1">
                                        <small className="fw-bold d-block">Primer Evento Raw:</small>
                                        <small className="d-block text-primary">
                                            Start: {allEvents[0].start?.toString()} 
                                        </small>
                                        <small className="d-block text-primary">
                                            End: {allEvents[0].end?.toString()}
                                        </small>
                                        <small className="d-block text-success">
                                            Válido: {allEvents[0].start instanceof Date ? '✅' : '❌'} / {allEvents[0].end instanceof Date ? '✅' : '❌'}
                                        </small>
                                        <small className="d-block text-info">
                                            Mismo día: {format(allEvents[0].start, 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd') ? '✅' : '❌'}
                                        </small>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <small className="fw-bold d-block">Configuración Calendario:</small>
                                    <small className="d-block">Min: 08:00, Max: 20:00</small>
                                    <small className="d-block">Current Date: {currentDay.toString()}</small>
                                </div>
                                <div className="mt-2">
                                    <small className="fw-bold d-block text-warning">Eventos Filtrados para Calendar:</small>
                                    <small className="d-block">
                                        Total filtrados: {allEvents
                                            .filter(event => {
                                                const eventDate = format(event.start, 'yyyy-MM-dd');
                                                const currentDate = format(currentDay, 'yyyy-MM-dd');
                                                return eventDate === currentDate;
                                            }).length}
                                    </small>
                                    <small className="d-block">
                                        IDs: {allEvents
                                            .filter(event => {
                                                const eventDate = format(event.start, 'yyyy-MM-dd');
                                                const currentDate = format(currentDay, 'yyyy-MM-dd');
                                                return eventDate === currentDate;
                                            })
                                            .map(e => e.title)
                                            .join(', ')}
                                    </small>
                                </div>
                            </Card.Body>
                        </Card>
                    )}

                    <div 
                        className="Scheduler"
                        onTouchStart={isMobile ? onTouchStart : undefined}
                        onTouchMove={isMobile ? onTouchMove : undefined}
                        onTouchEnd={isMobile ? onTouchEnd : undefined}
                        style={{
                            minHeight: isMobile ? '500px' : '600px'
                        }}
                    >

                        
                        <Calendar 
                            key={`calendar-${isMobile ? 'mobile' : 'desktop'}-${isInitialized ? 'ready' : 'loading'}-${allEvents.length}`} // Incluir count de eventos
                            views={isMobile ? [Views.DAY] : [Views.WORK_WEEK]}
                            defaultView={isMobile ? Views.DAY : Views.WORK_WEEK}
                            view={isMobile ? Views.DAY : Views.WORK_WEEK}
                            localizer={localizer}
                            events={allEvents
                                .filter(event => {
                                    const eventDate = format(event.start, 'yyyy-MM-dd');
                                    const currentDate = format(currentDay, 'yyyy-MM-dd');
                                    return eventDate === currentDate;
                                })
                                .map((event, index) => ({
                                    ...event,
                                    start: new Date(event.start),
                                    end: new Date(event.end),
                                    id: event.id || `event-${index}-${Date.now()}`,
                                    resource: event,
                                    allDay: false
                                }))}
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
                                backgroundColor: 'white', // Asegurar fondo blanco
                                width: '100%'
                            }}
                            step={15}
                            timeslots={4}
                            min={new Date(1970, 0, 1, 8, 0, 0)}
                            max={new Date(1970, 0, 1, 20, 0, 0)}
                            toolbar={false}
                            formats={formats}
                            culture='es'
                            messages={messages}
                            components={{
                                ...components,
                                event: ({ event }) => (
                                    <div 
                                        style={{ 
                                            fontSize: '0.75rem', 
                                            fontWeight: 'bold',
                                            color: 'white',
                                            textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                            padding: '4px 6px',
                                            width: '100%',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#007bff',
                                            borderRadius: '4px',
                                            border: '2px solid #0056b3',
                                            minHeight: '32px',
                                            maxHeight: '32px',
                                            overflow: 'hidden',
                                            position: 'absolute',
                                            zIndex: 1000,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            top: '2px',
                                            left: '2px',
                                            right: '2px'
                                        }}
                                        onClick={() => handleSelectEvent(event)}
                                    >
                                        🩺 {event.title}
                                    </div>
                                )
                            }}
                            eventPropGetter={(event) => ({
                                style: {
                                    backgroundColor: '#007bff',
                                    background: 'linear-gradient(45deg, #007bff, #0056b3)',
                                    borderRadius: '4px',
                                    border: '2px solid #0056b3',
                                    color: 'white',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    padding: '3px 5px',
                                    minHeight: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    zIndex: 100,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    opacity: 1,
                                    visibility: 'visible',
                                    position: 'relative'
                                }
                            })}
                            allDaySlot={false}
                            date={currentDay}
                            onNavigate={(date) => {}}
                        />
                    </div>
                    
                    {/* **DEBUG POST-RENDER - VERIFICAR DOM** */}
                    {isMobile && (
                        <Card className="mt-2 border-danger">
                            <Card.Body className="py-2">
                                <small className="fw-bold d-block">🚨 Debug DOM Calendar</small>
                                <div className="d-flex gap-2 flex-wrap">
                                    <span className="badge bg-primary">
                                        RBC Calendar: {document.querySelectorAll('.rbc-calendar').length}
                                    </span>
                                    <span className="badge bg-success">
                                        RBC Events: {document.querySelectorAll('.rbc-event').length}
                                    </span>
                                    <span className="badge bg-warning">
                                        RBC Slots: {document.querySelectorAll('.rbc-time-slot').length}
                                    </span>
                                    <span className="badge bg-info">
                                        RBC Content: {document.querySelectorAll('.rbc-time-content').length}
                                    </span>
                                </div>
                                <div className="mt-1">
                                    <Button 
                                        variant="outline-danger" 
                                        size="sm"
                                        onClick={() => {
                                            const calendar = document.querySelector('.rbc-calendar');
                                            const timeContent = document.querySelector('.rbc-time-content');
                                            const events = document.querySelectorAll('.rbc-event');
                                            
                                            let debugInfo = `🔍 DIAGNÓSTICO DETALLADO:\n\n`;
                                            debugInfo += `📊 DOM Elements:\n`;
                                            debugInfo += `• Calendarios: ${document.querySelectorAll('.rbc-calendar').length}\n`;
                                            debugInfo += `• Eventos DOM: ${events.length}\n`;
                                            debugInfo += `• Time Slots: ${document.querySelectorAll('.rbc-time-slot').length}\n\n`;
                                            
                                            debugInfo += `📅 Calendar Info:\n`;
                                            debugInfo += `• Calendar visible: ${calendar ? (calendar.offsetHeight > 0 ? 'SÍ' : 'NO') : 'NO EXISTE'}\n`;
                                            debugInfo += `• Calendar height: ${calendar?.offsetHeight || 'N/A'}px\n`;
                                            debugInfo += `• Time content: ${timeContent ? (timeContent.offsetHeight > 0 ? 'SÍ' : 'NO') : 'NO EXISTE'}\n\n`;
                                            
                                            debugInfo += `🎯 Eventos Data vs DOM:\n`;
                                            debugInfo += `• Eventos en datos: ${allEvents.length}\n`;
                                            debugInfo += `• Eventos en DOM: ${events.length}\n`;
                                            debugInfo += `• Match: ${allEvents.length === events.length ? '✅' : '❌'}\n\n`;
                                            
                                            if (events.length > 0) {
                                                debugInfo += `📍 Primer evento DOM:\n`;
                                                debugInfo += `• Texto: ${events[0].textContent}\n`;
                                                debugInfo += `• Visible: ${events[0].offsetHeight > 0 ? 'SÍ' : 'NO'}\n`;
                                                debugInfo += `• Posición: ${events[0].offsetTop}px\n`;
                                            }
                                            
                                            console.log(debugInfo);
                                            alert(debugInfo);
                                        }}
                                    >
                                        🔍 Diagnóstico Completo
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    )}
                    
                    {/* Vista complementaria de eventos del día - Solo en mobile */}
                    {isMobile && allEvents.length > 0 && (
                        <Card className="mt-3">
                            <Card.Header>
                                <h6 className="mb-0">📅 Eventos de {format(currentDay, 'EEEE dd/MM', { locale: es })}</h6>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <ListGroup variant="flush">
                                    {allEvents
                                        .filter(event => {
                                            const eventDate = format(event.start, 'yyyy-MM-dd');
                                            const currentDate = format(currentDay, 'yyyy-MM-dd');
                                            return eventDate === currentDate;
                                        })
                                        .sort((a, b) => a.start - b.start)
                                        .map((event, index) => (
                                            <ListGroup.Item 
                                                key={index} 
                                                action
                                                onClick={() => handleSelectEvent(event)}
                                                className="d-flex justify-content-between align-items-center py-3"
                                            >
                                                <div>
                                                    <div className="fw-bold text-primary">{event.title}</div>
                                                    <small className="text-muted">Paciente: {event.patientName}</small>
                                                    <br />
                                                    <small className="text-muted">Ubicación: {event.location}</small>
                                                </div>
                                                <div className="text-end">
                                                    <div className="badge bg-primary">{format(event.start, 'HH:mm')}</div>
                                                    <div className="badge bg-secondary mt-1">{format(event.end, 'HH:mm')}</div>
                                                </div>
                                            </ListGroup.Item>
                                        ))
                                    }
                                    {allEvents.filter(event => {
                                        const eventDate = format(event.start, 'yyyy-MM-dd');
                                        const currentDate = format(currentDay, 'yyyy-MM-dd');
                                        return eventDate === currentDate;
                                    }).length === 0 && (
                                        <ListGroup.Item className="text-center py-4 text-muted">
                                            <div className="mb-2">📅</div>
                                            <div>No hay eventos para este día</div>
                                            <small>Usa las flechas para navegar</small>
                                        </ListGroup.Item>
                                    )}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    )}
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