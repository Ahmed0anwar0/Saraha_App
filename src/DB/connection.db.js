import mongoose from "mongoose";

const connectDB = async()=>{

    try {
        const uri = process.env.DB_URI;
        const result = await mongoose.connect(uri,{serverSelectionTimeoutMS:30000})
        console.log("DB Connected Success🚀"); 
         
    } catch (error) {
        // console.log(`Fail Connect On DB ❌`, error);     
    }
}

export default connectDB;