import admin from "../config/firebase.js";

const verifyFirebaseToken = async (req, res, next) => {
    try {
        let idToken;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith("Bearer ")) {
            idToken = authHeader.split("Bearer ")[1];
        } else if (req.query && req.query.token) {
            idToken = req.query.token;
        }

        if (!idToken) {
            return res.status(401).json({ error: "Unauthorized. Missing or invalid token." });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        if (!decodedToken.email) {
            return res.status(401).json({ error: "Unauthorized. Token does not contain an email address." });
        }

        
        req.user = {
            email: decodedToken.email,
            name: decodedToken.name,
            picture: decodedToken.picture
        };

        next();
    } catch (error) {
        console.error("Firebase ID Token verification error:", error);
        return res.status(401).json({ error: "Unauthorized. Token verification failed." });
    }
};

export default verifyFirebaseToken;
