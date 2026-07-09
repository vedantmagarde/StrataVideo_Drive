import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';

const ProtectedRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (!currentUser) return <Navigate to="/login" replace />;
    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<LoginPage />} />
                
                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                } />
                
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <SettingsPage />
                    </ProtectedRoute>
                } />
            </Routes>
        </Router>
    );
}

export default App;
