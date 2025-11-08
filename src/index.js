import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
});


connectDB();










/*
import exress from "express";
const app = exress();

( async () => {
try{
await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
app.on("error", (error) => {
    console.error('Error connecting to the database:', error);
    throw error;
});

app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT}`);
});
} catch(error){
    console.error('Error starting the server:', error);
    throw error;
}
})()
*/