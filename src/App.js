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
import ResetPassword from "./components/ForgotPassword/ResetPassword";
import Profile from "./components/Profile/Profile";
import AdminPanel from "./components/AdminPanel/AdminPanel";

const App = () => {
    return (
        <AuthProvider>
            <div className="app-container">
                <Routes>
                    {/* Public routes without navigation */}
                    <Route path="/login" element={<LogIn/>}/>
                    <Route path="/forgot-password" element={<ForgotPassword/>}/>
                    <Route path="/reset-password" element={<ResetPassword/>}/>
                    
                    {/* Protected routes with navigation */}
                    <Route element={<PrivateRoute />}>
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
                        <Route path="/profile" element={
                            <>
                                <TopNavbar/>
                                <SideNavbar/>
                                <div className="main-content">
                                    <Profile/>
                                </div>
                                <Footer/>
                            </>
                        }/>
                        <Route path="/admin" element={
                            <>
                                <TopNavbar/>
                                <SideNavbar/>
                                <div className="main-content">
                                    <AdminPanel/>
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
                    </Route>
                </Routes>
            </div>
        </AuthProvider>
    );
};

export default App;
