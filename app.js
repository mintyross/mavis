const express = require("express");
//const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
//const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // Parses form submissions

// Database Initialization (Runs if table doesn't exist)
/* db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT
    )`);
}); */

//NAVBAR
app.use((req, res, next) => {
    res.locals.activePage = "";
    next();
});

app.get('/', function(req, res){
    res.render('index', { activePage: "index" });
});

app.get('/devicemap', function(req, res){
    res.render('devicemap', { activePage: "devicemap" });
});
app.get('/statistics', function(req, res){
    res.render('statistics', { activePage: "statistics" });
});
app.get('/settings', function(req, res){
    res.render('settings', { activePage: "settings" });
});

// index page
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.listen(PORT, (req, res) => {
  console.log("App Started on App:" + PORT);
});