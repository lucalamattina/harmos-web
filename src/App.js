import './App.css';
import AnnouncementBoard from './components/AnnoucementBoard/AnnouncementBoard';
import {Route, Routes} from "react-router-dom";
import TopNavbar from "./components/TopNavbar/TopNavbar";
import SideNavbar from "./components/SideNavbar/SideNavbar";
import React from "react";
import Scheduler from "./components/Scheduler/Scheduler";
import LogIn from "./components/LogIn/LogIn";
import { AuthProvider } from "./context/authProvider"; // Update the path


const App = () => {
    return (
        <>
            {/*<AuthProvider>*/}
            {/*    <LogIn/>*/}
            {/*</AuthProvider>*/}

        <TopNavbar/>
        <div className="row">
            <div className="col-2">
                <SideNavbar/>
            </div>
            <div className="col-10">
                <Routes>
                    <Route path="/" element={<AnnouncementBoard/>}/>
                    <Route path="/schedule" element={<Scheduler/>}/>
                </Routes>
            </div>
        </div>
        </>
    );
};

export default App;
