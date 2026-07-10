import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';
import api from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const inviteCode = localStorage.getItem('inviteCode');
                    const payload = inviteCode ? { inviteCode } : {};
                    await api.post('/auth/sync', payload);
                    
                    if (inviteCode) {
                        localStorage.removeItem('inviteCode');
                    }
                    
                    const res = await api.get('/auth/me');
                    setCurrentUser({ ...user, backendProfile: res.data.user });
                } catch (error) {
                    console.error("Error syncing user:", error);
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = (options = {}) => {
        const provider = new GoogleAuthProvider();
        const customParams = {};
        if (options.emailHint) customParams.login_hint = options.emailHint;
        if (options.prompt) customParams.prompt = options.prompt;
        
        if (Object.keys(customParams).length > 0) {
            provider.setCustomParameters(customParams);
        }
        return signInWithPopup(auth, provider);
    };

    const signOut = () => {
        return firebaseSignOut(auth);
    };

    const value = {
        currentUser,
        signIn,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
