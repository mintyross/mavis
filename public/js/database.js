const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = './db/db.sqlite';

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database');

        // Увімкнення підтримки FOREIGN KEY в SQLite (за замовчуванням вимкнено)
        db.run("PRAGMA foreign_keys = ON");

        // USERS TABLE
        db.run(`CREATE TABLE IF NOT EXISTS users (
            userId INTEGER PRIMARY KEY AUTOINCREMENT,
            userName VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            hashedPassword VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            siteTheme INTEGER,
            avatar TEXT DEFAULT '/images/user.png'
        )`, (err) => {
            if (err) console.error('Users table error:', err.message);
            else console.log('Table users is created');
        });

        // HOUSES TABLE
        db.run(`CREATE TABLE IF NOT EXISTS houses (
            houseId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            houseName TEXT NOT NULL,
            houseLocation TEXT NOT NULL,
            waterUsage INTEGER,
            electricityUsage INTEGER,
            gasUsage INTEGER,
            internetUsage INTEGER,
            FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Houses table error:', err.message);
            else console.log('Table houses is created');
        });

        // ROOMS TABLE
        db.run(`CREATE TABLE IF NOT EXISTS rooms (
            roomId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            houseId INTEGER,
            roomName TEXT NOT NULL,
            FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE,
            FOREIGN KEY(houseId) REFERENCES houses(houseId) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Rooms table error:', err.message);
            else console.log('Table rooms is created');
        });

        // DEVICES TABLE
        db.run(`CREATE TABLE IF NOT EXISTS devices (
            deviceId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            houseId INTEGER,
            roomId INTEGER,
            deviceName TEXT NOT NULL,
            deviceType TEXT NOT NULL,
            FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE,
            FOREIGN KEY(houseId) REFERENCES houses(houseId) ON DELETE CASCADE,
            FOREIGN KEY(roomId) REFERENCES rooms(roomId) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Devices table error:', err.message);
            else console.log('Table devices is created');
        });

        // CONNECTIONS TABLE
        db.run(`CREATE TABLE IF NOT EXISTS connections (
            connectionId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER,
            houseId INTEGER,
            roomId INTEGER, 
            deviceFromId INTEGER,
            deviceToId INTEGER,
            FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE,
            FOREIGN KEY(houseId) REFERENCES houses(houseId) ON DELETE CASCADE,
            FOREIGN KEY(roomId) REFERENCES rooms(roomId) ON DELETE CASCADE,
            FOREIGN KEY(deviceFromId) REFERENCES devices(deviceId) ON DELETE CASCADE,
            FOREIGN KEY(deviceToId) REFERENCES devices(deviceId) ON DELETE CASCADE
        )`, (err) => {
            if (err) console.error('Connections table error:', err.message);
            else console.log('Table connections is created');
        });
    }
});

module.exports = db;
