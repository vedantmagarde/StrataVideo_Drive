import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app;

if (!getApps().length) {
    try {
        let serviceAccount = {};
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(
                Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8')
            );
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = {
                project_id: process.env.FIREBASE_PROJECT_ID,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                // Replace escaped newlines with actual newlines
                private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };
        }

        if (Object.keys(serviceAccount).length > 0) {
            app = initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("Firebase Admin Initialized");
        } else {
            console.warn("FIREBASE credentials are not set correctly in .env");
        }
    } catch (error) {
        console.error("Firebase Admin initialization error", error);
    }
} else {
    app = getApps()[0];
}

const admin = {
    auth: () => getAuth(app)
};

export default admin;
