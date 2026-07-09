import admin from "firebase-admin";



if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT 
            ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8')
            : "{}"
        );
        
        if (Object.keys(serviceAccount).length > 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Admin Initialized");
        } else {
            console.warn("FIREBASE_SERVICE_ACCOUNT is not set in .env");
        }
    } catch (error) {
        console.error("Firebase Admin initialization error", error);
    }
}

export default admin;
