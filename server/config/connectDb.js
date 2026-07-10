import mongoose from "mongoose";

const connectDb = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

export default connectDb;