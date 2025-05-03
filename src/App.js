import './App.css';
import AnnouncementBoard from './components/AnnouncementBoard/AnnouncementBoard';
import {Route, Routes} from "react-router-dom";
import TopNavbar from "./components/TopNavbar/TopNavbar";
import SideNavbar from "./components/SideNavbar/SideNavbar";
import React from "react";
import Scheduler from "./components/Scheduler/Scheduler";
import LogIn from "./components/LogIn/LogIn";
import {AuthProvider} from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute/PrivateRoute";

const App = () => {
    return (
        <AuthProvider>
            <TopNavbar/>
            <div className="row">
                <div className="col-2">
                    <SideNavbar/>
                </div>
                <div className="col-10">
                    <Routes>
                        <Route path="/login" element={<LogIn/>}/>
                        <Route element={<PrivateRoute />}>
                            <Route path="/" element={<AnnouncementBoard/>}/>
                            <Route path="/schedule" element={<Scheduler/>}/>
                            <Route path="*" element={<div>Página no encontrada</div>}/>
                        </Route>
                    </Routes>
                </div>
            </div>
        </AuthProvider>
    );
};

export default App;
