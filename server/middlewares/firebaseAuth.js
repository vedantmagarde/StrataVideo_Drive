import admin from "../config/firebase.js";

const firebaseAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized. Missing or invalid Authorization header." });
        }

        const idToken = authHeader.split("Bearer ")[1];
        
        // Verify token using Firebase Admin SDK
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        if (!decodedToken.email) {
            return res.status(401).json({ error: "Unauthorized. Token does not contain an email address." });
        }

        // Attach verified email to the request object
        req.userEmail = decodedToken.email;
        req.userPhoto = decodedToken.picture;
        req.userName = decodedToken.name;

        next();
    } catch (error) {
        console.error("Firebase ID Token verification error:", error);
        return res.status(401).json({ error: "Unauthorized. Token verification failed." });
    }
};

export default firebaseAuth;
