/*
MNS Food Management
Copyright (C) 2022 Prokakis Emmanouil
MNS Food Management is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
MNS Food Management is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with MNS Food Management. If not, see <https://www.gnu.org/licenses/>.
*/


const express = require('express');
const app = express();
const dotenv = require("dotenv");
dotenv.config()
const path = require("path");
const ejsMate = require("ejs-mate");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const fs = require("fs");
const bcrypt = require("bcrypt");
const expressSession = require('express-session');
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const redis = require('redis');
const connectRedis = require('connect-redis');
const dbController = require("./public/javascript/dbController");
const helmet = require("helmet");
const PORT = process.env.NODE_PORT || 8000;

const { formatUUID, formatId, formatPasswordHash } = require("./public/javascript/webutils.js");

const ejsUtils = require("./public/javascript/ejsUtils.js")


app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);
app.set("trust proxy", true);


// redis config start

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 1234;

const RedisStore = connectRedis(expressSession);
const redisClient = redis.createClient({
    host: redisHost,
    port: redisPort,
    legacyMode: true
})

redisClient.connect()
redisClient.on('error', function (err) {
    console.log('Could not establish a connection with redis. ' + err);
});
redisClient.on('connect', function (err) {
    console.log('Connected to redis successfully');
});

const redisSecret = process.env.ENVIRONMENT === "prod" ? process.env.REDIS_SECRET : "jslkdhasbdkuwahsjklkncmnsa.wudsan,sd.wasjpopoipxxcvnz1";

app.use(expressSession({
    store: new RedisStore({ client: redisClient }),
    secret: redisSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.ENVIRONMENT === "prod",
        httpOnly: process.env.ENVIRONMENT === "prod",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        expires: 1000 * 60 * 60 * 24 * 7
    }
}))

app.use(flash());

// redis config end

const dbHost = process.env.DB_HOST || "localhost";
const dbUser = process.env.DB_USER || "user";
const dbPassword = process.env.DB_PASSWORD || "password";
const dbName = process.env.DB_NAME || "name";

const con = mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    multipleStatements: true
});


con.connect((err) => {
    if (err) throw err;
    console.log("Connected!");
});

// passport stuff start

passport.use("local-register", new Strategy({
    usernameField: "username", passwordField: "password", passReqToCallback: true
},
    async function (req, username, password, done) {

        password = await bcrypt.hash(password, 12);
        const findStoredUserQuery = `SELECT * FROM users WHERE username = ? LIMIT 1`;

        con.query(findStoredUserQuery, [username], function (err, result) {
            if (err) return done(err);

            if (result.length || !username || !password) {
                return done(null, false, req.flash("loginMessage", "That username is already taken."));

            } else {

                con.query('SELECT uuid() as uuid;', function (err, result) {
                    if (err) throw err;

                    const idValue = formatUUID(result);
                    const addUserQuery = `INSERT INTO users (username, password, id) VALUES (?, ?, ?);`
                    con.query(addUserQuery, [username, password, idValue], function (err, result) {
                        if (err) throw err;

                        const user = {
                            username: username,
                            id: idValue
                        };

                        return done(null, user);
                    });
                })
            }
        }
        );
    }
)
);

passport.use("local-login", new Strategy({
    usernameField: "username", passwordField: "password", passReqToCallback: true
}, async function (req, username, password, done) {
    const findStoredUserQuery = `SELECT * FROM users WHERE username = ? LIMIT 1`;

    con.query(findStoredUserQuery, [username], async function (err, result) {
        if (err) return done(err);

        if (!result.length)
            return done(null, false, req.flash("loginMessage", "Incorrect Username or Password"));

        const hashedPassword = formatPasswordHash(result);

        const authenticated = await bcrypt.compare(password, hashedPassword);

        if (!authenticated)
            return done(null, false, req.flash("loginMessage", "Incorrect Username or Password"));


        return done(null, result[0]);
    }
    );
})
);


passport.serializeUser(function (user, done) { done(null, user.id); });

passport.deserializeUser(function (id, done) {
    const getStoredUserQuery = `SELECT * FROM users WHERE id = ? ;`;
    con.query(getStoredUserQuery, [id], function (err, result) {
        if (err) throw err;
        done(err, formatId(result));
    });
});

app.use(passport.initialize());
app.use(passport.session());

// passport stuff end


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('loginMessage');
    res.locals.error = req.flash('loginMessage');
    next();
})

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('loginMessage', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

const c = new dbController()

app.post("/create-new-product", isLoggedIn, (req, res) => {
    c.addProduct(req, res, con);
})

app.post("/delete-item/:id", isLoggedIn, (req, res) => {
    c.deleteProduct(req, res, con);
})

app.post("/edit-product/:id/add-package", (req, res) => {
    c.addPackages(req, res, con);
})

app.post("/edit-product/:id/remove-package/", isLoggedIn, (req, res) => {
    c.deletePackages(req, res, con);
})

app.post("/register", passport.authenticate('local-register', { failureRedirect: '/register' }), (req, res) => {
    c.setThemePreference(req, res, con);
})

app.post("/login", passport.authenticate('local-login', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
})

app.post("/logout", (req, res) => {
    req.logout(function (err) {
        req.flash("loginMessage", "You logged out!");
        res.redirect("/login");
    });
})

app.post("/user/change-theme", isLoggedIn, (req, res) => {
    c.updateThemePreference(req, res, con);
})

app.put("/edit-product/:id", isLoggedIn, (req, res) => {
    c.editProduct(req, res, con);
})

app.get("/login", (req, res) => {
    res.render("login", { errorMessage: "", messages: req.flash("loginMessage") });
})

app.get("/register", (req, res) => {
    res.render("register", { errorMessage: "", messages: req.flash("loginMessage") });
})

app.get("/tutorial", (req, res) => {
    c.showTutorialPage(req, res, con);
})

app.get("/expiring", isLoggedIn, (req, res) => {
    c.showExpiringPage(req, res, con);
})

app.get("/filter/", isLoggedIn, (req, res) => {
    c.showFilterPage(req, res, con);
})

app.get("/edit-product/:id", isLoggedIn, async (req, res) => {
    c.showEditProductPage(req, res, con);
})

app.get("/all", isLoggedIn, async (req, res) => {
    c.showHomePage(req, res, con);
})

app.get("/", isLoggedIn, (req, res) => {
    res.redirect("/all");
})

// app.get("*", (req, res) => {
//     res.redirect("/");
// })

app.listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
})
