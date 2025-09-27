const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { Sequelize, DataTypes } = require("sequelize");

const app = express();
const port = 80;

const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(express.urlencoded({ extended: true }));

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

app.use("/static", express.static(path.join(__dirname, 'static')))

const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "database.sqlite"
});

const User = sequelize.define("User", {
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        primaryKey: true,
        autoIncrement: true
    }
})

sequelize.sync().then(() => {
    console.log("SQLite database synced!");
});

// Root
app.get("/", (req, res) => {
    if (req.session.logged_in) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect("/login");
    }
})

// User login
app.get("/login", (req, res) => {
    if (!req.session.logged_in) {
        res.sendFile(path.join(__dirname, 'public', 'login', 'index.html'));
    } else {
        res.redirect("/");
    }
})

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username:username } });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.logged_in = true;
        res.redirect("/")
    } else {
        res.redirect("/login");
    }
});

// User logout
app.get("/logout", (req, res) => {
    req.session.logged_in = false;
    res.redirect("/login");
});

// User registration
app.get("/register", (req, res) => {
    if (!req.session.logged_in) {
        res.sendFile(path.join(__dirname, 'public', 'register', 'index.html'));
    } else {
        res.redirect("/");
    }
})

app.post("/register", async(req, res) => {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ where: { username:username } })
    if (existingUser === null) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username:username, password:hashedPassword });
        res.redirect("/login");
    } else {
        res.redirect("/register");
    }
});

app.listen(port, () => {
    console.log(`NodeJS app running on :${port}`);
});