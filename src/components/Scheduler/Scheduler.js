import './Scheduler.css'
import format from "date-fns/format";
import getDay from "date-fns/getDay";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import { Calendar, Views, dateFnsLocalizer } from "react-big-calendar";
import React, {useCallback, useMemo, useState} from "react";
import "react-datepicker/dist/react-datepicker.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {Button, Form, Modal} from "react-bootstrap";

const locales = {
    "en-US": require("date-fns/locale/en-US"),
};
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const events = [
    {
        title: "Dr Perez",
        start: new Date(2023, 5, 5, 10, 0),
        end: new Date(2023, 5, 5, 11, 0),
        location: "Sala 1",
    },
    {
        title: "Dr Perez",
        start: new Date(2023, 5, 6, 10, 0),
        end: new Date(2023, 5, 6, 11, 0),
        location: "Sala 1",
    },
    {
        title: "Dr Perez",
        start: new Date(2023, 5, 7, 10, 0),
        end: new Date(2023, 5, 7, 11, 0),
        location: "Sala 1",
    },
    {
        title: "Dr Perez",
        start: new Date(2023, 5, 8, 10, 0),
        end: new Date(2023, 5, 8, 11, 0),
        location: "Sala 1",
    },
    {
        title: "Dr Perez",
        start: new Date(2023, 5, 9, 10, 0),
        end: new Date(2023, 5, 9, 11, 0),
        location: "Sala 1",
    },
];

function Scheduler() {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    const [seeEvent, setSeeEvent] = useState({
        title: "",
        location: "",
    });

    const [showNew, setShowNew] = useState(false);
    const handleCloseNew = () => {
        if (newEvent.title !== "" && newEvent.location !== "") {
            setAllEvents((prev) => [...prev, newEvent])
        }
        setShowNew(false);
    }
    const handleShowNew = () => setShowNew(true);

    const [newEvent, setNewEvent] = useState({
        title: "",
        location: "",
    });

    const [allEvents, setAllEvents] = useState(events);

    const handleSelectSlot = useCallback(
        ({ start, end }) => {
            handleShowNew()
            setNewEvent((prev) => ({ ...prev, start, end }))
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

    let formats = {
        timeGutterFormat: 'HH:mm',
    }

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

            <Modal show={showNew} onHide={handleCloseNew}>
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
                                onChange={e => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Ubicación</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ubicación"
                                onChange={e => setNewEvent((prev) => ({ ...prev, location: e.target.value }))}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseNew}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={handleCloseNew}>
                        Guardar
                    </Button>
                </Modal.Footer>
            </Modal>
            </>
    );
}

export default Scheduler;