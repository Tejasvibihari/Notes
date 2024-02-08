import express from "express";
// import mongoose from "mongoose";
import bodyParser from "body-parser";


const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));



app.get("/", (req, res) => {
    res.render("index.ejs");
})
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
})
app.get("/login", (req, res) => {
    res.render("login.ejs");
})
app.listen(port, (req, res) => {
    console.log(`server Started on port ${port}`);
})