import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState, useEffect} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal, Spinner, Container, Alert} from "react-bootstrap";
import { getSchedules, getUserById, getLocationById } from "../../api/api";
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
    });

    const [showNew, setShowNew] = useState(false);
    const handleShowNew = () => setShowNew(true);

    const [newEvent, setNewEvent] = useState({
        title: "",
        location: "",
        start: null,
        end: null,
    });

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
            setNewEvent({ title: "", location: "", start, end });
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

    const handleSaveNewEvent = () => {
        if (newEvent.title && newEvent.location && newEvent.start && newEvent.end) {
            // Aquí iría la lógica para guardar el evento en el backend si fuera necesario
            setAllEvents((prev) => [...prev, newEvent]);
            setNewEvent({ title: "", location: "", start: null, end: null }); // Reset form
            setShowNew(false);
        } else {
            // Opcional: Mostrar alerta si faltan campos
        }
    };

    const handleCancelNewEvent = () => {
        setNewEvent({ title: "", location: "", start: null, end: null }); // Reset form
        setShowNew(false);
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
                        <Form.Group className="mb-3">
                            <Form.Label>Título</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Título"
                                autoFocus
                                value={newEvent.title}
                                onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ubicación</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ubicación"
                                value={newEvent.location}
                                onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </Form.Group>
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
            </>
    );
}

export default Scheduler;