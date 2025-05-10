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
import Patients from "./components/Patients/Patients";
import ForgotPassword from "./components/ForgotPassword/ForgotPassword";
import Footer from "./components/Footer/Footer";

const App = () => {
    return (
        <AuthProvider>
            <Routes>
                {/* Public routes without navigation */}
                <Route path="/login" element={<LogIn/>}/>
                <Route path="/forgot-password" element={<ForgotPassword/>}/>
                
                {/* Protected routes with navigation */}
                <Route path="/" element={
                    <>
                        <TopNavbar/>
                        <SideNavbar/>
                        <div className="main-content">
                            <AnnouncementBoard/>
                        </div>
                        <Footer/>
                    </>
                }/>
                <Route path="/schedule" element={
                    <>
                        <TopNavbar/>
                        <SideNavbar/>
                        <div className="main-content">
                            <Scheduler/>
                        </div>
                        <Footer/>
                    </>
                }/>
                <Route path="/patients" element={
                    <>
                        <TopNavbar/>
                        <SideNavbar/>
                        <div className="main-content">
                            <Patients/>
                        </div>
                        <Footer/>
                    </>
                }/>
                <Route path="*" element={
                    <>
                        <TopNavbar/>
                        <SideNavbar/>
                        <div className="main-content">
                            <div>Página no encontrada</div>
                        </div>
                        <Footer/>
                    </>
                }/>
            </Routes>
        </AuthProvider>
    );
};

export default App;
