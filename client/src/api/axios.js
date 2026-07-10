import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});


api.interceptors.request.use(async (config) => {
    if (auth.currentUser) {
        try {

            const token = await auth.currentUser.getIdToken(true);
            config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
            console.error('Error fetching Firebase token:', error);
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
