const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");

const { Sequelize, DataTypes } = require("sequelize");

const app = express();
const port = 80;

const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'bua-assassins-very-secret-cool-encryption',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set to true when using HTTPS
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
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
    },
    kills: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    permissionLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
})


// FINISH THIS
const App = sequelize.define("App", {
    newInstance: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    gameRunning: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    id: {
        type: DataTypes.INTEGER,
        unique: true,
        primaryKey: true,
        //autoIncrement: true
    }
});

sequelize.sync().then(async () => {
    console.log("SQLite database synced!");
    await App.upsert({ id: 1 })
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
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username:username } });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.logged_in = true;
        console.log(user.id);
        req.session.uid = user.id;
        console.log(req.session.uid)
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
app.get("/register", async (req, res) => {
    if (!req.session.logged_in) {
        const app = await App.findOne({ where: { id: 1 } });
        if (app.newInstance) {
            res.sendFile(path.join(__dirname, 'public', 'newApp', 'index.html'));
        } else {
            res.sendFile(path.join(__dirname, 'public', 'register', 'index.html'));
        }
    } else {
        res.redirect("/");
    }
})

app.post("/register", async(req, res) => {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ where: { username:username } })
    if (existingUser === null) {
        let permlevel = 0
        const app = await App.findOne({ where: { id: 1 } });
        if (app.newInstance) {
            permlevel = 2;
            app.update({ newInstance: false });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ 
            username:username, 
            password:hashedPassword, 
            permissionLevel:permlevel, 
            id:Math.round(Math.random() * 999999999)
        });
        
        res.redirect("/login");
    } else {
        res.redirect("/register");
    }
});

// Admin dashboard
app.get("/admin", async (req, res) => {
    if (req.session.logged_in) {
        const user = await User.findOne({ where: { id: req.session.uid } });
        if (user.id === req.session.uid && user.permissionLevel === 1 || user.permissionLevel === 2) {
            res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'))
        } else {
            res.redirect("/")
        }
    } else {
        res.redirect("/login")
    }
});

// API
app.get("/api/users", async (req, res) => {
    const user = await User.findOne({ where: {id: req.session.uid} });
    if (req.session.logged_in && user.permissionLevel == 1 || user.permissionLevel == 2) {
        const users = await User.findAll({ attributes: ['username', 'id', 'permissionLevel', 'kills'] });  
        res.json(users)
    } else {
        res.json("Authentication error");
    }
});

app.post("/api/delete", async (req, res) => {
    const user = await User.findOne({ where: {id: req.session.uid} });
    if (req.session.logged_in && user.permissionLevel == 1 || user.permissionLevel == 2) {
        const targetUser = await User.findOne({ where: {id: req.body.target} });
        console.log(req.body.target);
        try {
            await targetUser.destroy();
        } catch {}
        res.json("success");
        res.redirect("/admin");
    } else {
        res.json("Authentication error");
    }
});

app.post("/api/promote", async (req, res) => {
    const user = await User.findOne({ where: {id: req.session.uid} });
    if (req.session.logged_in && user.permissionLevel == 1 || user.permissionLevel == 2) {
        const targetUser = await User.findOne({ where: {id: req.body.target} });
        targetUser.update({ permissionLevel: 1 })
        res.json("success");
        res.redirect("/admin");
    } else {
        res.json("Authentication error");
    }
});

app.post("/api/demote", async (req, res) => {
    const user = await User.findOne({ where: {id: req.session.uid} });
    if (req.session.logged_in && user.permissionLevel == 1 || user.permissionLevel == 2) {
        const targetUser = await User.findOne({ where: {id: req.json.target} });
        targetUser.update({ permissionLevel: 0 })
        res.json("success");
        res.redirect("/admin");
    } else {
        res.json("Authentication error");
    }
});

app.listen(port, () => {
    console.log(`NodeJS app running on :${port}`);
});