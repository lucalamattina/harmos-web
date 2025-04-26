import "./Announcement.css";
import React from 'react';
import { Card } from 'react-bootstrap';

const Announcement = ({ title, content, date, author }) => {
    return (
        <Card style={{ margin: "10px" }}>
            <Card.Body>
                <Card.Title>{title}</Card.Title>
                <Card.Text>{content}</Card.Text>
            </Card.Body>
            <Card.Footer>
                <small className="text-muted">{author} el día {date}</small>
            </Card.Footer>
        </Card>
    );
};

export default Announcement;
