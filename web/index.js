const express = require("express");
const path = require("path");

const app = express();
const port = 80;

const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'bua-assassins-very-secret-cool-encryption',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set to true when using HTTPS
        maxAge: 1000 * 60 * 60 * 24 * 1 // 1 day
    }
}));

app.get("/", (req, res) => {
    if (req.session.logged_in) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
        req.session.logged_in = false;
    } else {
        req.session.logged_in = true;
        res.redirect("/login")
    }
})

app.post("/login", (req, res) => {

});

app.listen(port, () => {
    console.log(`NodeJS app running on :${port}`)
});