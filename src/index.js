import React, { Suspense } from "react";
import { Spinner } from "react-bootstrap";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';


ReactDOM.render(
    <BrowserRouter>
        <Suspense
            fallback={
                <Spinner
                    animation="border"
                    variant="primary"
                    style={{
                        width: "4rem",
                        height: "4rem",
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                    }}
                />
            }
        >
            <App />
        </Suspense>,
    </BrowserRouter>,
    document.getElementById("root")
);




