const express = require("express");
const path = require('path');
const db = require('./public/js/database.js');
const bcrypt = require('bcrypt');
const session = require('express-session');
const router = express.Router();

// Налаштування місця збереження та імен файлів аватарів
const multer = require('multer');

const app = express();
const PORT = 3000; // Порт, на якому працює сервер

 // Налаштовуємо ejs
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'))); // Робимо вміст папки public ніби він в корені
app.use(express.urlencoded({ extended: true })); // Parses form submissions

//для читання JSON з body
app.use(express.json()); 
app.use(express.static('public'));

//HASHING PASSWORDS
app.use(session({
    secret: 'l8f$x05!ViHuJKc*dM3fgvXfT$NcbAe!8Gfn2c4lV5#C#Nw2eis1^9oma!fb%aKI', // 64-знаковий ключ, за допомогою якого відбувається хешування паролів
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    saveUninitialized: true,
    cookie: { maxAge: 1800000 } // 30
}));

// Зберігаємо оригінальні функції системного виводу Node.js
const originalNodeLog = console.log;
const originalNodeError = console.error;

// Функція для запису бекенд-логів у базу даних SQLite
function saveBackendLogToDB(type, args) {
    // Перетворюємо аргументи логу (об'єкти, рядки) на текст
    const message = args.map(arg => {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
    }).join(' ');

    const fullMessage = `[SERVER_${type}] - ${message}`;

    // Перевіряємо, чи база даних ініціалізована та відкрита
    if (typeof db !== 'undefined' && db && typeof db.run === 'function') {
        // Оскільки в контексті глобального логу у нас немає доступу до `req.session`, 
        // ми записуємо лог з userId = null.
        db.run(
            'INSERT INTO logs (userId, logMessage) VALUES (?, ?)',
            [null, fullMessage],
            function(err) {
                if (err) {
                    process.stderr.write(`Failed to save server log to SQLite: ${err.message}\n`);
                }
            }
        );
    }
}

// Перевизначаємо системний console.log для сервера
console.log = function(...args) {
    originalNodeLog.apply(console, args); // Продовжуємо виводити лог у консоль
    saveBackendLogToDB('INFO', args);
};

// Перевизначаємо системний console.error для сервера
console.error = function(...args) {
    originalNodeError.apply(console, args); // Продовжуємо виводити лог у консоль
    saveBackendLogToDB('ERROR', args);
};

function logToDatabase(userId, type, message, url = 'SERVER') {
    const fullMessage = `[${type}] [URL: ${url}] - ${message}`;
    db.run(
        'INSERT INTO logs (userId, logMessage) VALUES (?, ?)',
        [userId || null, fullMessage],
        (err) => {
            if (err) process.stderr.write(`Server DB log failed: ${err.message}\n`);
        }
    );
}

// Автоматичне очищення старих логів (Запускається раз на добу)
function startLogCleanupInterval() {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // в мілісекундах
    const RETENTION_DAYS = 7; // Зберігаємо логування лише за останні 7 днів

    setInterval(() => {
        // SQL запит видаляє рядки, де дата створення менша за поточний час мінус кількість днів
        const query = `DELETE FROM logs WHERE created_at < datetime('now', '-${RETENTION_DAYS} days')`;

        db.run(query, function(err) {
            if (err) {
                // Використовуємо системний вивід, щоб не засмічувати лог-потік
                process.stderr.write(`[LOGS CLEANUP] ERROR deleting logs: ${err.message}\n`);
            } else {
                if (this.changes > 0) {
                    process.stdout.write(`[LOGS CLEANUP] Cleanup successful. Logs removed: ${this.changes}\n`);
                }
            }
        });
    }, TWENTY_FOUR_HOURS);
}

// Запускаємо фонову задачу при старті сервера
startLogCleanupInterval();


// Маршрут для відображення сторінки логіну
app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/'); // Якщо вже залогінений — кидаємо на головну
    }
    res.render('login');
});

// Маршрут для відображення сторінки реєстрації
app.get('/register', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/'); // Якщо вже залогінений — кидаємо на головну
    }
    res.render('register');
});


// Глобальний мідлвар
app.use((req, res, next) => {
    console.log(`[Middleware] Route request: ${req.path} | Authorized: ${!!(req.session && req.session.userId)}`);

    // Створюємо масив сторінок, на які гостю дозволено заходити
    const publicPages = ['/login', '/register', '/auth']; 
    
    // Перевіряємо, чи поточний шлях є у списку дозволених або чи це статичний файл
    const isPublicPage = publicPages.includes(req.path);
    const isStaticFile = req.path.includes('.') || req.path.startsWith('/css/') || req.path.startsWith('/js/');

    if (isPublicPage || isStaticFile) {
        // Створюємо заглушку, щоб сторінка логіну не падала через відсутність об'єкта user
        res.locals.user = { avatar: '/images/user.png', userName: 'Гість' };
        return next(); // Пропускаємо без перевірки БД
    }

    // 2. Якщо користувач авторизований, то йдемо в базу за даними
    if (req.session && req.session.userId) {
        db.get('SELECT userName, email, avatar, siteTheme, background FROM users WHERE userId = ?', [req.session.userId], (err, userFromDb) => {
            if (err) {
                console.error("DATABASE ERROR (users):", err);
                return res.redirect('/login'); 
            }

            if (userFromDb) {
                req.session.userName = userFromDb.userName;
                req.session.email = userFromDb.email;
                req.session.avatar = userFromDb.avatar;
                req.session.siteTheme = userFromDb.siteTheme;
                req.session.background = userFromDb.background || '../images/mavis-background.jpg';
            }

            // Формуємо безпечне дефолтне значення для теми (якщо в БД пусто — ставимо 'simple')
            const activeTheme = req.session.siteTheme || 'simple';

            res.locals.activePage = "";
            
            // Наповнюємо об'єкт res.locals.user, використовуючи синхронізовану сесію
            res.locals.user = {
                avatar: req.session.avatar || '/images/user.png',
                userName: req.session.userName || 'User',
                email: req.session.email,
                siteTheme: activeTheme,
                background: req.session.background 
            };

            // Зберігаємо сесію
            req.session.save((saveErr) => {
                if (saveErr) console.error("Session locking failure:", saveErr);
            });

            // Отримуємо список будинків
            db.all(
                'SELECT houseId, houseName, houseLocation FROM houses WHERE userId = ?',
                [req.session.userId],
                (err2, rows) => {
                    if (err2) {
                        console.error('DATABASE ERROR (houses):', err2);
                        res.locals.houses = [];
                        res.locals.activeHouse = null;
                    } else {
                        res.locals.houses = rows || [];
                        const activeId = req.session.activeHouseId;
                        const foundHouse = rows.find(h => h.id == activeId || h.houseid == activeId || h.houseId == activeId);

                        res.locals.activeHouse = foundHouse || rows[0] || null;

                        if (res.locals.activeHouse && !activeId) {
                            req.session.activeHouseId = res.locals.activeHouse.houseId;
                        }
                    }

                    // Визначаємо поточний houseId
                    const currentHouseId = res.locals.activeHouse ? res.locals.activeHouse.houseId : null;

                    // Якщо будинку немає, то немає сенсу шукати кімнати, тому відразу йдемо далі.
                    if (!currentHouseId) {
                        res.locals.rooms = [];
                        res.locals.activeRoom = null;
                        return next(); 
                    }

                    db.get(
                        'SELECT water, electricity, internet, gas FROM resourceUsage WHERE houseId = ?',
                        [currentHouseId], // Передаємо лише один параметр, який відповідає знаку '?' у запиті
                        (err2, usageRow) => {
                            if (err2) {
                                console.error('DATABASE ERROR (resourceUsage):', err2);
                                // Якщо сталася помилка БД, виділяємо нульові лічильники, щоб сторінка не падала
                                res.locals.usage = { water: 0, electricity: 0, internet: 0, gas: 0 };
                            } else {
                                // Якщо для цього будинку ще немає записів у базі, створюємо нульовий об'єкт-заглушку
                                const currentUsage = usageRow || { water: 0, electricity: 0, internet: 0, gas: 0 };

                                // Записуємо актуальні накопичені метрики в сесію
                                req.session.water = currentUsage.water;
                                req.session.electricity = currentUsage.electricity;
                                req.session.internet = currentUsage.internet;
                                req.session.gas = currentUsage.gas;

                                // Наповнюємо об'єкт у locals
                                res.locals.usage = {
                                    water: req.session.water,
                                    electricity: req.session.electricity,
                                    internet: req.session.internet,
                                    gas: req.session.gas
                                };
                            }
                        }
                    );


                    // Запускаємо запит кімнат
                    db.all(
                        'SELECT roomId, roomName, roomColor, houseId FROM rooms WHERE userId = ? AND houseId = ?', 
                        [req.session.userId, currentHouseId], 
                        (err3, roomRows) => {
                            if (err3) {
                                console.error('DATABASE ERROR (rooms):', err3);
                                res.locals.rooms = [];
                                res.locals.activeRoom = null;
                            } else {
                                res.locals.rooms = roomRows || [];
                                const activeRoomId = req.session.activeRoomId;
                                const foundRoom = res.locals.rooms.find(r => r.roomId == activeRoomId);

                                // Беремо знайдену кімнату: або першу з масиву, або null
                                res.locals.activeRoom = foundRoom || res.locals.rooms[0] || null;

                                if (res.locals.activeRoom && !activeRoomId) {
                                    req.session.activeRoomId = res.locals.activeRoom.roomId;
                                }
                            }

                            // Записуємо обраний будинок та кімнату
                            const currentHouseId = res.locals.activeHouse ? res.locals.activeHouse.houseId : null;
                            const currentRoomId = res.locals.activeRoom ? res.locals.activeRoom.roomId : null;

                            // Якщо будинку немає, обнуляємо дані та йдемо далі
                            if (!currentHouseId || !currentRoomId) {
                                res.locals.devices = [];
                                res.locals.connections = [];
                                return next();
                            }

                            // Формуємо вибірку пристроїв лише для поточного користувача, активного будинку та кімнати
                            db.all(
                                'SELECT deviceId, deviceName, usageScheme, canvasX, canvasY FROM devices WHERE userId = ? AND houseId = ? AND roomId = ?',
                                [req.session.userId, currentHouseId, currentRoomId],
                                (err4, deviceRows) => {
                                    if (err4) {
                                        console.error('[DB] error in devices table: }:', err4.message);
                                        res.locals.devices = [];
                                    } else {
                                        res.locals.devices = deviceRows || [];
                                    }

                                    // Вибірка зв'язків лише всередині активного будинку та кімнати
                                    db.all(
                                        'SELECT connectionId, deviceFromId, deviceToId FROM connections WHERE userId = ? AND houseId = ? AND roomId = ?',
                                        [req.session.userId, currentHouseId, currentRoomId],
                                        (err5, connectionRows) => {
                                            if (err5) {
                                                console.error('[DB] error in connections table:', err5.message);
                                                res.locals.connections = [];
                                            } else {
                                                res.locals.connections = connectionRows || [];
                                            }
                                            return next();
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    } else {
        // 3. Якщо це приватна сторінка і користувач не залогінений, то виконуємо редирект
        console.log(`[Middleware] BLOCKED: user redirected from ${req.path} to /login`);
        return res.redirect('/login');
    }
});

app.post('/setActiveRoom', (req, res) => {
    // Читаємо roomId з тіла запиту req.body
    const { roomId } = req.body || {}; 
    
    if (!req.session.userId) {
        return res.status(401).send('Unauthorized');
    }

    if (!roomId) {
        return res.status(400).send('Missing parameter: roomId is required.');
    }

    // Оновлюємо id активної кімнати в сесії користувача новим значенням
    req.session.activeRoomId = roomId;
    
    console.log(`[Session Change] Active room switched to ID: ${roomId}`);

    // Обов'язково повертаємо статус успіху назад у AJAX
    return res.status(200).json({ success: true });
});


// Оновлення координат пристрою
app.post('/updateDeviceCoords', (req, res) => {
    const { deviceId, x, y } = req.body;
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId;

    if (!userId || !houseId) return res.status(401).send('Unauthorized');

    db.run(
        'UPDATE devices SET canvasX = ?, canvasY = ? WHERE deviceId = ? AND houseId = ? AND userId = ?',
        [x, y, deviceId, houseId, userId],
        function(err) {
            if (err) return res.status(500).send(err.message);
            res.status(200).json({ success: true });
        }
    );
});

// Створення зв'язку
app.post('/connectDevices', (req, res) => {
    const { deviceFromId, deviceToId } = req.body;
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId;
    const roomId = req.session.activeRoomId;

    if (!userId) return res.status(401).send('Unauthorized');
    if (!houseId || !roomId) return res.status(400).send('Missing active workspace constraints.');
    if (!deviceFromId || !deviceToId) {
        return res.status(400).send('Missing deviceFromId or deviceToId in payload data.');
    }

    // Перевірка на дублікат зв'язку всередині цього конкретного будинку
    db.get(
        'SELECT connectionId FROM connections WHERE deviceFromId = ? AND deviceToId = ? AND houseId = ? AND roomId = ? AND userId = ?',
        [deviceFromId, deviceToId, houseId, roomId, userId],
        (err, row) => {
            if (row) return res.status(200).json({ connectionId: row.connectionId });

            db.run(
                'INSERT INTO connections (userId, houseId, roomId, deviceFromId, deviceToId) VALUES (?, ?, ?, ?, ?)',
                [userId, houseId, roomId, deviceFromId, deviceToId],
                function(err2) {
                    if (err2) return res.status(500).send(err2.message);
                    res.status(200).json({ success: true, connectionId: this.lastID });
                }
            );
        }
    );
});

// Видалення зв'язку
app.post('/removeConnection', (req, res) => {
    const { connectionId } = req.body;
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId;

    if (!userId || !houseId) return res.status(401).send('Unauthorized');

    db.run(
        'DELETE FROM connections WHERE connectionId = ? AND houseId = ? AND userId = ?',
        [connectionId, houseId, userId],
        function(err) {
            if (err) return res.status(500).send(err.message);
            res.status(200).json({ success: true });
        }
    );
});

// REGISTER DEVICE POST
app.post('/addDeviceForm', (req, res) => {
    // Додаємо захисне значення на випадок збою деструктуризації
    const body = req.body || {};
    const deviceName = body.deviceName;
    const usageScheme = body.usageScheme || 'on/off';
    
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId; 
    const roomId = req.session.activeRoomId;

    if (!userId || !houseId || !roomId) {
        return res.status(400).send('Missing session workspace context.');
    }
    
    if (!deviceName || deviceName.trim() === '') {
        return res.status(400).send('Device name is required.');
    }

    const query = 'INSERT INTO devices (userId, houseId, roomId, deviceName, usageScheme, canvasX, canvasY) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    // Встановлюємо початкові координати, щоб девайс з'явився у видимій зоні
    const defaultX = 150;
    const defaultY = 150;

    db.run(query, [userId, houseId, roomId, deviceName, usageScheme, defaultX, defaultY], function(err) {
        if (err) {
            console.error('DATABASE ERROR while creating a device:', err.message);
            return res.status(500).json({ message: err.message });
        }
        
        console.log(`[DB] Device "${deviceName}" successfully added to room ${roomId} under house ${houseId}`);
        return res.status(200).json({ success: true });
    });
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/'); // Файли зберігатимуться в папку public/uploads
    },
    filename: function (req, file, cb) {
        // Створюємо унікальне ім'я: timestamp + оригінальне розширення
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// За допомогою фільтру дозволяємо завантажувати лише зображення
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

 // REGISTER ROUTE
 // Створює POST-маршрут та підключає мідлвар multer для завантаження аватарки
app.post('/register', upload.single('avatar'), async (req, res) => {
    const { userName, email, password } = req.body; // Дістає текстові поля, введені користувачем та записує їх до масиву
    const avatarPath = req.file ? `/uploads/${req.file.filename}` : '/images/user.png'; // Якщо файл завантажений, то замінюємо стандартну картинку ним

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (userName, email, hashedPassword, avatar) VALUES (?, ?, ?, ?)';
        
        db.run(query, [userName, email, hashedPassword, avatarPath], function (err) {
            if (err) {
                console.error('Database error:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ message: 'Username or Email already exists' });
                }
                return res.status(500).json({ message: 'Error creating user' });
            }

            return res.redirect('/');
        });
    } catch (error) {
        console.error('Hashing error:', error);
        return res.status(500).json({ message: 'Error hashing password' });
    }
});

// UPDATE PROFILE ROUTE
app.post('/accountData', upload.single('avatar'), async (req, res) => {
    // Перевіряємо авторизацію користувача
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Authorization needed to change the profile data' });
    }

    const userId = req.session.userId;

    try {
        // Витягуємо та очищаємо дані з тіла запиту
        const userName = req.body.userName ? req.body.userName.trim() : '';
        const email = req.body.email ? req.body.email.trim() : '';
        const password = req.body.password ? req.body.password : '';

        // Збираємо масив полів для бази даних та масив значень
        let updateFields = [];
        let queryParams = [];
        
        // Об'єкт для тимчасового збереження нових даних сесії
        let sessionUpdates = {};

        // Додаємо в запит лише заповнені поля
        if (userName !== '') {
            updateFields.push('userName = ?');
            queryParams.push(userName);
            sessionUpdates.userName = userName;
        }

        if (email !== '') {
            updateFields.push('email = ?');
            queryParams.push(email);
        }

        if (req.file) {
            const avatarPath = `/uploads/${req.file.filename}`;
            updateFields.push('avatar = ?');
            queryParams.push(avatarPath);
            sessionUpdates.avatar = avatarPath;
        }

        if (password !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('hashedPassword = ?');
            queryParams.push(hashedPassword);
        }

        // Якщо жодне поле не заповнене — просто повертаємо користувача назад
        if (updateFields.length === 0) {
            return res.redirect('/');
        }

        // Формуємо фінальний SQL-запит
        queryParams.push(userId);
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE userId = ?`;

        db.run(query, queryParams, function (err) {
            if (err) {
                console.error('Database error:', err.message);
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ message: 'Username or Email has been already taken' });
                }
                return res.status(500).json({ message: 'Update data error' });
            }

            // Оновлюємо сесію  даними, які дійсно змінилися
            if (sessionUpdates.userName) req.session.userName = sessionUpdates.userName;
            if (sessionUpdates.avatar) req.session.avatar = sessionUpdates.avatar;

            // Перенаправляємо на головну сторінку
            return res.redirect('/');
        });

    } catch (error) {
        console.error('Processing error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// ВИДАЛЕННЯ АКАУНТУ
app.get('/accountDelete', (req, res) => {
    // Перевіряємо авторизацію
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Authentication required');
    }

    // SQL-запит на повне видалення рядка користувача
    const query = 'DELETE FROM users WHERE userId = ?';

    db.run(query, [userId], function (err) {
        if (err) {
            console.error('ERROR while removing account:', err.message);
            return res.status(500).send('SERVER ERROR while deleting account');
        }

        console.log(`[DB] Account with userId ${userId} was successfully removed`);

        // Знищуємо сесію, щоб розлогінити користувача
        req.session.destroy((err) => {
            if (err) {
                console.error('ERROR cleaning the session:', err);
            }
            
            // Видаляємо кукі сесії з браузера і перенаправляємо на сторінку входу
            res.clearCookie('connect.sid'); 
            return res.redirect('/login');
        });
    });
});

app.get('/accountData', (req, res) => {
    // Якщо користувач не увійшов в акаунт — примусово відправляємо на сторінку входу
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }
    
    // Рендеримо сторінку
    res.render('accountData');
});

// LOGIN ROUTE
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt for:', username);
  
  const query = 'SELECT * FROM users WHERE userName = ? OR email = ?';
  
  db.get(query, [username, username], async (err, user) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Server error' });
      }
      
      if (!user) {
          console.log('User not found');
          return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      try {
          const match = await bcrypt.compare(password, user.hashedPassword);
          
          if (match) {
              // Записуємо дані в сесію
              req.session.userId = user.userId;
              req.session.username = user.userName;
              
              console.log('Login successful for user:', user.userName);
              return res.status(200).json({ message: 'Login successful' });
          } else {
              console.log('Password did not match');
              return res.status(401).json({ message: 'Invalid username or password' });
          }
      } catch (error) {
          console.error('Error comparing passwords:', error);
          return res.status(500).json({ message: 'Server error' });
      }
  });
});


// Logout route
app.post('/logout', (req, res) => {
    if (!req.session) {
        return res.sendStatus(200);
    }
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Error logging out');
        }
        res.clearCookie('connect.sid');
        return res.sendStatus(200);
    });
});

//HOUSE ADD ROUTE
app.post('/addHouseForm', (req, res) => {
    const { houseName, houseLocation } = req.body;
    const userId = req.session.userId;
    const query = 'INSERT INTO houses (houseName, houseLocation, userId) VALUES (?, ?, ?)';
    console.log('House registration attempt for: ', houseName);
    
    db.run(query, [houseName, houseLocation, userId], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'House with such name or location already exists' });
            }
            return res.status(500).json({ message: 'Error creating a house' });
        }
        console.log('House successfully created:', houseName);

        return res.redirect('/');
    });
})

app.post('/houseSelect', (req, res) => {
    const { houseId } = req.body;

    // Перевірка авторизації
    if (!req.session || !req.session.userId) {
        return res.status(401).send('Unauthorized');
    }

    if (!houseId) {
        return res.status(400).send('HouseId is not set.');
    }

    // Зберігаємо ID активного будинку в сесію
    req.session.activeHouseId = houseId;
    req.session.activeRoomId = null; 

    console.log(`[Session] User ${req.session.userId} picked houseId: ${houseId}`);
    
    // Повертаємо JSON статус успіху для jQuery $.ajax
    // Зберігаємо сесію на диску перед тим, як відповісти фронтенду
    req.session.save((err) => {
        if (err) return res.status(500).send('Failed to save the session');
        return res.status(200).json({ success: true });
    });
});

//HOUSE REMOVE ROUTE
app.post('/houseRemove', (req, res) => {
    const { houseId } = req.body;
    const userId = req.session.userId; // Беремо ID користувача з сесії

    // Перевірка авторизації
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    if (!houseId) {
        return res.status(400).send('houseId is not set.');
    }

    const query = 'DELETE FROM houses WHERE houseId = ? AND userId = ?';

    db.run(query, [houseId, userId], function(err) {
        if (err) {
            console.error('DATABASE ERROR while deleting:', err.message);
            return res.status(500).send('SERVER ERROR while deleting.');
        }

        // Якщо rows affected (this.changes) дорівнює 0, значить або будинку немає, або він чужий
        if (this.changes === 0) {
            return res.status(403).send('House not found or you are unauthorized to delete it.');
        }

        console.log(`[DB] User ${userId} deleted house ${houseId}`);

        // Якщо видалений будинок був активним у сесії — скидаємо його
        if (req.session.activeHouseId == houseId) {
            req.session.activeHouseId = null;
        }

        return res.status(200).json({ success: true });
    });
});

app.post('/editHouseForm', (req, res) => {
    // Отримуємо дані будинку та його ID з req.body
    const { houseId, houseName, houseLocation } = req.body;
    
    // Перевіряємо сесію
    const userId = req.session.userId; 

    // Перевірка авторизації та вхідних даних
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    if (!houseId || !houseName || !houseLocation) {
        return res.status(400).send('All fields are obligatory to fill out');
    }

    // Також робимо перевірку userId, щоб користувач не міг відредагувати чужий будинок
    const query = 'UPDATE houses SET houseName = ?, houseLocation = ? WHERE houseId = ? AND userId = ?';

    db.run(query, [houseName, houseLocation, houseId, userId], function(err) {
        if (err) {
            console.error('DATABASE ERROR while editing:', err.message);
            return res.status(500).send('SERVER ERROR while saving changes');
        }

        // Якщо жоден рядок не змінився, означає, що ID неправильний або будинок належить іншому юзеру
        if (this.changes === 0) {
            return res.status(403).send('House was not found or you have no rights to edit it.');
        }

        console.log(`[DB] User ${userId} successfully updated houseId: ${houseId}`);

        // Повертаємо статус успіху у форматі JSON для вашого AJAX-запиту
        return res.status(200).json({ success: true });
    });
});
   
//ROOM ADD ROUTE
app.post('/addRoomForm', (req, res) => {
    const { roomName, roomColor } = req.body;
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId; 

    console.log('Room registration attempt for: ', roomName, 'in House ID:', houseId);
    
    // Перевіряємо, чи вибрано хоч якийсь будинок перед створенням кімнати
    if (!houseId) {
        console.error('ERROR: an attempt to create a room with no house selected.');
        return res.status(400).send('ERROR: pick or create a house first.');
    }

    const query = 'INSERT INTO rooms (roomName, roomColor, houseId, userId) VALUES (?, ?, ?, ?)';
    
    db.run(query, [roomName, roomColor, houseId, userId], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: 'Error creating a room' });
        }
        
        console.log('Room successfully created:', roomName); 

        return res.redirect('/devicemap');
    });
});

// DEVICE REMOVE ENDPOINT
app.post('/deviceRemove', (req, res) => {
    const { deviceId } = req.body || {};
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Unauthorized. Please log in.');
    }

    if (!deviceId) {
        return res.status(400).send('Missing parameter: deviceId is required.');
    }

    // SQL запит видалення
    const query = 'DELETE FROM devices WHERE deviceId = ? AND userId = ?';

    db.run(query, [deviceId, userId], function(err) {
        if (err) {
            console.error('DATABASE ERROR while deleting a device:', err.message);
            return res.status(500).send('Internal server database error.');
        }

        // Якщо rows affected (this.changes) дорівнює 0, значить запис не знайдено або він чужий
        if (this.changes === 0) {
            return res.status(403).send('Device not found or you do not have permission to delete it.');
        }

        console.log(`[DB] User ${userId} successfully deleted device ${deviceId}`);
        return res.status(200).json({ success: true });
    });
});

//ROOM DELETE ROUTE
app.post('/roomRemove', (req, res) => {
    const { houseId, roomId } = req.body; 
    const userId = req.session.userId; 

    // Перевірка авторизації користувача
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    // Перевіряємо чи прийшли валідні ідентифікатори з фронтенду
    if (!houseId) {
        return res.status(400).send('Missing House ID parameter');
    }

    if (!roomId) {
        return res.status(400).send('Missing Room ID parameter');
    }

    // Ввидаляємо кімнату, що належить цьому користувачу та будинку
    const query = 'DELETE FROM rooms WHERE houseId = ? AND userId = ? AND roomId = ?';

    db.run(query, [houseId, userId, roomId], function(err) {
        if (err) {
            console.error('Database deletion error ', err.message);
            return res.status(500).send('Deletion error');
        }

        if (this.changes === 0) {
            return res.status(403).send('The room is not found or you are unauthorized to delete it');
        }

        console.log(`[DB] User ${userId} deleted room ${roomId} from house ${houseId}`);

        // Скидаємо вибір у сесії лише якщо видалена кімната була поточною активною кімнатою користувача
        if (req.session.activeRoomId && req.session.activeRoomId == roomId) {
            req.session.activeRoomId = null;
        }

        return res.status(200).json({ success: true });
    });
});


// ROOM EDIT ROUTE
app.post('/editRoomForm', (req, res) => {
    const { roomId, houseId, roomColor } = req.body; 
    const roomName = req.body.roomName ? req.body.roomName.trim() : null;
    const userId = req.session.userId;

    // Перевірка авторизації та цілісності даних
    if (!userId) {
        return res.status(401).send('Unauthorized. Please log in.');
    }

    if (!roomId || !houseId) {
        return res.status(400).send(`Missing metadata. Room ID: ${roomId}, House ID: ${houseId}`);
    }

    // Динамічно збираємо поля для оновлення
    let updateFields = [];
    let queryParams = [];

    if (roomName && roomName !== '') {
        updateFields.push('roomName = ?');
        queryParams.push(roomName);
    }

    if (roomColor && roomColor !== '') {
        updateFields.push('roomColor = ?');
        queryParams.push(roomColor);
    }

    // Якщо нічого не змінилося — просто повертаємо успіх без запиту в БД
    if (updateFields.length === 0) {
        return res.status(200).json({ success: true, message: 'No modifications requested.' });
    }

    // Формуємо фінальний SQL-запит UPDATE
    queryParams.push(userId, houseId, roomId);
    const query = `UPDATE rooms SET ${updateFields.join(', ')} WHERE userId = ? AND houseId = ? AND roomId = ?`;

    db.run(query, queryParams, function (err) {
        if (err) {
            console.error('Database error during room modification:', err.message);
            return res.status(500).send('Internal server database error.');
        }

        // Перевіряємо, чи був знайдений відповідний запис
        if (this.changes === 0) {
            return res.status(403).send('Room not found or you do not have permission to modify it within this house.');
        }

        console.log(`[DB] User ${userId} successfully updated room ${roomId} in house ${houseId}`);
        
        return res.status(200).json({ success: true });
    });
});

/* DEVICEMAP ROUTE */
app.get('/devicemap', (req, res) => {
    const userId = req.session.userId;
    
    /* Редирект якщо немає сесії */
    if (!userId) return res.redirect('/login');

    // Отримуємо свіжі значення з сесії
    const activeHouseId = req.session.activeHouseId;
    const activeRoomId = req.session.activeRoomId;

    console.log(`[GET /devicemap] Loading workspace for User: ${userId} | Active House: ${activeHouseId} | Active Room: ${activeRoomId}`);

    // Отримуємо список будинків
    db.all('SELECT * FROM houses WHERE userId = ?', [userId], (err, houses) => {
        if (err) return res.status(500).send('Database Error');

        // Якщо у сесії немає активного будинку, беремо перший зі списку за замовчуванням
        const currentHouseId = activeHouseId || (houses.length > 0 ? houses[0].houseId : null);

        // Отримуємо кімнати лише для активного будинку
        db.all('SELECT * FROM rooms WHERE userId = ? AND houseId = ?', [userId, currentHouseId], (err2, rooms) => {
            if (err2) return res.status(500).send('Rooms Database Error');

            // Отримуємо об'єкт поточної активної кімнати
            db.get('SELECT * FROM rooms WHERE roomId = ? AND userId = ? AND houseId = ?', [activeRoomId, userId, currentHouseId], (err3, activeRoom) => {
                
                // Якщо кімнати немає (або вона від іншого будинку), ставимо null
                const currentRoomId = activeRoom ? activeRoom.roomId : null;

                // Отримуємо пристрої та зв'язки для цієї кімнати
                db.all('SELECT * FROM devices WHERE roomId = ? AND userId = ?', [currentRoomId, userId], (err4, devices) => {
                    db.all('SELECT * FROM connections WHERE roomId = ? AND userId = ?', [currentRoomId, userId], (err5, connections) => {
                        
                        // Рендеримо сторінку
                        res.render('devicemap', {
                            activePage: "devicemap",
                            houses: houses,
                            rooms: rooms, 
                            activeHouse: houses.find(h => h.houseId == currentHouseId) || null,
                            activeRoom: activeRoom || null,
                            devices: devices || [],
                            connections: connections || []
                        });
                    });
                });
            });
        });
    });
});

app.post('/api/logs', (req, res) => {
    try {
        // Парсимо дані незалежно від того, як вони прийшли (через fetch чи sendBeacon)
        const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        // Отримуємо userId з активної сесії Express. Якщо користувач не увійшов — ставимо null
        const userId = req.session && req.session.userId ? req.session.userId : null;
        
        // Форматуємо повідомлення, щоб зберегти контекст сторінки та тип логу (INFO/ERROR)
        const fullMessage = `[${data.type}] [URL: ${data.url}] - ${data.message}`;

        /* Записуємо лог до бази даних */
        db.run(
            'INSERT INTO logs (userId, logMessage) VALUES (?, ?)',
            [userId, fullMessage],
            function(err) {
                if (err) {
                    // Використовуємо системний console.error, щоб уникнути нескінченного циклу
                    process.stderr.write(`Database log insert failed: ${err.message}\n`);
                }
            }
        );

        // Повертаємо швидку відповідь 204 (No Content)
        res.sendStatus(204);
    } catch (e) {
        res.sendStatus(400);
    }
});

app.post('/updateTheme', (req, res) => {
    const userId = req.session.userId;

    // Перевірка авторизації
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Робимо атомарний SQL-апдейт: якщо було simple — стане classic, і навпаки
    const updateQuery = `
        UPDATE users 
        SET siteTheme = CASE WHEN siteTheme = 'simple' THEN 'classic' ELSE 'simple' END 
        WHERE userId = ?
    `;

    db.run(updateQuery, [userId], function(err) {
        if (err) {
            console.error('Database theme update error:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }

        // Одразу дістаємо оновлене значення з бази даних, щоб синхронізувати його із сесією
        db.get('SELECT siteTheme FROM users WHERE userId = ?', [userId], (selectErr, row) => {
            if (selectErr || !row) {
                return res.status(500).json({ message: 'Failed to retrieve updated theme' });
            }

            // Оновлюємо значення теми в поточній сесії користувача
            req.session.siteTheme = row.siteTheme;

            // Повертаємо нову тему у форматі JSON для скрипта
            res.status(200).json({ success: true, newTheme: row.siteTheme });
        });
    });
});

app.get('/logs', (req, res) => {
    db.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT 50', [], (err, rows) => {
        if (err) return res.status(500).send('Database tracking error');
        
        res.render('logs', { logs: rows });
    });
});


app.get('/statistics', function(req, res){
    res.render('statistics', { activePage: "statistics" });
});

app.get('/settings', (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    // Отримуємо останні 50 логів з бази даних
    db.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT 50', [], (err, logRows) => {
        if (err) {
            console.error('Failed to load logs for settings page:', err);
            // Фалбек: якщо сталася помилка, передаємо пустий масив, щоб сторінка не падала
            return res.render('settings', { logs: [] });
        }

        // Також передаємо об'єкт user
        res.render('settings', { 
            logs: logRows, 
            user: {
                avatar: req.session.avatar,
                userName: req.session.userName,
                siteTheme: req.session.siteTheme,
                background: req.session.background
            },
            activePage: "settings"
        });
    });
});

/* Завантаження фону сайту */
app.post('/uploadBackground', upload.single('background'), (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) {
        return res.status(400).json({ error: 'No valid image file detected' });
    }

    // Формуємо чистий абсолютний веб-шлях до файлу
    const backgroundWebPath = `/uploads/${req.file.filename}`;

    // Оновлюємо SQLite базу даних для конкретного користувача
    const query = 'UPDATE users SET background = ? WHERE userId = ?';
    db.run(query, [backgroundWebPath, userId], function(err) {
        if (err) {
            console.error('Database async background crash:', err.message);
            return res.status(500).json({ error: 'Database update failed' });
        }

        // Синхронізуємо дані з активною сесією сервера
        req.session.background = backgroundWebPath;

        req.session.save((saveErr) => {
            if (saveErr) {
                console.error(saveErr);
                return res.status(500).json({ error: 'Session locking error' });
            }

            return res.status(200).json({ 
                success: true, 
                backgroundUrl: backgroundWebPath 
            });
        });
    });
});

/* Зміна фону на звичайний */
app.post('/resetBackground', (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Оновлюємо рядок у базі даних: записуємо NULL, що означає використання дефолтного фону
    const query = 'UPDATE users SET background = NULL WHERE userId = ?';
    
    db.run(query, [userId], function(err) {
        if (err) {
            console.error('Database reset background error:', err.message);
            return res.status(500).json({ error: 'Database reset failed' });
        }

        // Синхронізуємо сесію сервера з дефолтним шляхом
        req.session.background = '/images/mavis-background.jpg';

        req.session.save((saveErr) => {
            if (saveErr) {
                console.error(saveErr);
                return res.status(500).json({ error: 'Session locking error' });
            }
            
            // Повертаємо успішну JSON відповідь на фронтенд
            return res.status(200).json({ success: true });
        });
    });
});

/* Запис використаних ресурсів до бази даних */
app.post('/resourceUsage', (req, res) => {
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId;

    // Перевірка авторизації та наявності активного будинку
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!houseId) return res.status(400).json({ error: 'Please select a house before submitting counter metrics' });

    // Отримуємо значення з форми та примусово перетворюємо на числа
    const waterInput = parseFloat(req.body.waterUsage) || 0;
    const electricityInput = parseFloat(req.body.electricityUsage) || 0;
    const internetInput = parseFloat(req.body.internetUsage) || 0;
    const gasInput = parseFloat(req.body.gasUsage) || 0;

    // Додає нові дані до поточних лічильників будинку
    const query = `
        INSERT INTO resourceUsage (houseId, water, electricity, internet, gas)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(houseId) DO UPDATE SET
            water = water + excluded.water,
            electricity = electricity + excluded.electricity,
            internet = internet + excluded.internet,
            gas = gas + excluded.gas
    `;

    db.run(query, [houseId, waterInput, electricityInput, internetInput, gasInput], function(err) {
        if (err) {
            console.error('Database accumulation error inside resourceUsage:', err.message);
            return res.status(500).json({ error: 'Failed to increment resource usage counters' });
        }

        console.log(`[COUNTER] House ${houseId} metrics incremented. Water: +${waterInput} m³`);

        return res.status(200).json({ 
            success: true, 
            message: "Counters updated successfully for this house" 
        });
    });
});

app.get('/', function(req, res){
    res.render('index', { activePage: "index" });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.listen(PORT, (req, res) => {
  console.log("App Started on App:" + PORT);
});
