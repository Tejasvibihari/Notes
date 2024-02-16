import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static("uploads"));
const saltRounds = 10;
dotenv.config();
const note_color = ['color1', 'color2', 'color3', 'color4'];


// Image Upload 
// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({
    storage,
});


app.set("view engine", "ejs");
app.use(session({
    secret: "NOTESSECRET",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URL)
    .then(() => { console.log("Connected to Database NotesDb"); })
    .catch((err) => { console.log(err); });

//User Model Schema 
const usersSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
    },
    lastname: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    imagePath: {
        type: String,
    }
});
const User = mongoose.model('User', usersSchema);
const noteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }
});
const Note = mongoose.model('Note', noteSchema);

// Get Route 

app.get("/", async (req, res) => {
    const randomNotesColor = note_color[Math.floor(Math.random() * note_color.length)];
    if (req.isAuthenticated()) {
        const userNotes = await Note.find({ userId: req.user._id });
        res.render("home.ejs", { user: req.user, randomNotesColor, userNotes });
    } else {
        res.redirect("/login");
    }
})
app.get("/signup", (req, res) => {
    res.render("signup.ejs");
})
app.get("/login", (req, res) => {
    res.render("login.ejs");
})
app.get("/update/:noteId", async (req, res) => {
    if (req.isAuthenticated()) {
        const noteId = req.params.noteId;
        try {
            const updateNote = await Note.findById(noteId);
            console.log("Note Updated");
            res.render("update.ejs", { user: req.user, updateNote });
        } catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
        }
    } else {
        res.redirect("/login");
    }
});

// app.get("/profile/:profileId", (req, res) => {
//     const requestedprofileId = req.params.profileId;

//     if (!mongoose.Types.ObjectId.isValid(requestedMensId)) {
//         return res.status(400).send("Invalid mensId parameter");
//     }
// })
app.get("/add", (req, res) => {
    if (req.isAuthenticated()) {

        res.render("addnote.ejs", { user: req.user });
    } else {
        res.redirect("/login");
    }
})

app.get("/profile", (req, res) => {
    // console.log(`Hello Check ${req.user.firstname}`);
    if (req.isAuthenticated()) {

        res.render("profile.ejs", { user: req.user });
    } else {
        res.redirect("/login");
    }
})

// Post Route
// app.post("/profile", upload.single("profileImage"), async (req, res) => {
//     const firstname = req.body.firstname;
//     const lastname = req.body.lastname;
//     const email = req.body.email;
//     const file = req.file.filename; // Moved inside the route handler
//     console.log(firstname, lastname); console.log(file)
//     try {
//         const editUserDetail = new User({
//             firstname: firstname,
//             lastname: lastname,
//             email: email,
//             imagePath: file
//         });
//         await editUserDetail.save();
//         console.log("User Detail Updated");
//         res.redirect("/profile");
//     } catch (error) {
//         console.log(error);
//         res.send("Internal Server Error");
//     }
// });
app.post("/update", async (req, res) => {
    const noteId = req.body._id;
    const title = req.body.title;
    const content = req.body.content;
    try {
        await Note.findByIdAndUpdate(noteId, { title: title, content: content });
        return res.redirect("/");
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post("/delete", async (req, res) => {
    let id = req.body._id;
    try {
        await Note.deleteOne({ _id: id });
        res.redirect("/");
    } catch (e) {
        console.log(e);
        res.status(400).send("Error deleting note.");
    }
});
app.post("/add", async (req, res) => {
    const title = req.body.title;
    const content = req.body.content;
    const userId = req.user._id;
    try {
        const newNote = new Note({
            title: title,
            content: content,
            userId: userId
        });
        await newNote.save();
        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("Internal Server Error");
    }
})

app.post("/profile", upload.single("profileImage"), async (req, res) => {
    const { firstname, lastname } = req.body;
    const email = req.user.email; // Assuming the user is authenticated and their email is available in req.user
    const file = req.file ? req.file.filename : req.user.imagePath;

    try {
        // Update user details in the userDetail collection
        await User.findOneAndUpdate({ email: email }, { firstname: firstname, lastname: lastname, imagePath: file });
        req.user.firstname = firstname;
        req.user.lastname = lastname;
        req.user.imagePath = file;
        // Redirect to profile page or any other desired page
        res.redirect("/profile");
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/signup", async (req, res) => {
    const firstname = req.body.firstname;
    const lastname = req.body.lastname;
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
            password: hash,
            firstname: firstname,
            lastname: lastname
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
app.post("/login", passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
}));


passport.use(new Strategy(async function verify(email, password, cb) {
    try {
        const user = await User.findOne({ email: email });
        if (user === null) {
            return cb("User Not Found")
        } else {
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    return (cb(err));
                }
                if (user && result) {
                    return (cb(null, user));
                } else {
                    return cb(null, false);
                }
            });
        }
    } catch (error) {
        console.log(error)
        res.send("Internal Server Error")
    }
}))
// app.delete("/delete", async (req, res) => {
//     const userId = req.user.id;

//     try {
//         // Find the user by ID and delete it from the database
//         await User.findByIdAndDelete(userId);
//         res.status(200).send("User deleted successfully");
//     } catch (error) {
//         console.log(error);
//         res.status(500).send("Internal Server Error");
//     }
// });


// logout route 
app.get("/logout", (req, res) => {
    // Clear the session data
    req.session.destroy((err) => {
        if (err) {
            console.log("Error destroying session:", err);
            return res.status(500).send("Internal Server Error");
        }
        // Redirect the user to the login page
        res.redirect("/login");
    });
});


passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});


app.listen(port, (req, res) => {
    console.log(`server Started on port ${port}`);
})
