import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import bcrypt from "bcrypt";


const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
const saltRounds = 10;
dotenv.config();

mongoose.connect(process.env.MONGODB_URL)
    .then(() => { console.log("Connected to Database NotesDb"); })
    .catch((err) => { console.log(err); });

//User Model Schema 
const usersSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    }
});
const User = mongoose.model('User', usersSchema);

const userDetailSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    email: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Email',
        required: true
    }
});
const UserDetail = mongoose.model('UserDetail', userDetailSchema);

// Get Route 

app.get("/", (req, res) => {
    res.render("index.ejs");
})
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
})
app.get("/login", (req, res) => {
    res.render("login.ejs");
})


// Post Route

app.post("/signup", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    // const confirmPassword = req.body.confirmPassword;
    try {
        const findEmail = await User.findOne({ email: email });
        if (findEmail !== null) {
            return res.render("signup.ejs", { emailError: "Email already exists" });
        }
        // if (password !== confirmPassword) {
        //     return res.render("signup.ejs", { passError: "Passwords do not match" });
        // }
        // If email doesn't exist and passwords match, proceed to save the user
        const hash = await bcrypt.hash(password, saltRounds);
        const newUser = new User({
            email: email,
            password: hash
        });
        await newUser.save()
            .then(() => {
                console.log("Saved");
            })
            .catch((error) => {
                console.log(error);
            })
        // Redirect to the login page after successful signup
        res.redirect("/login");
    } catch (error) {
        console.log(error);
        // Handle any errors that occur during the signup process
        res.status(500).send("Internal Server Error");
    }
});




app.listen(port, (req, res) => {
    console.log(`server Started on port ${port}`);
})