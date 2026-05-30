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


// Глобальний мідлвар для захисту сайту
app.use((req, res, next) => {
    // Виводимо в консоль сервера кожен запит, щоб бачити, де саме застрягає додаток
    console.log(`[Middleware] Запит на шлях: ${req.path} | Авторизований: ${!!(req.session && req.session.userId)}`);

    // 1. Створюємо масив сторінок, на які ГОСТЮ ДОЗВОЛЕНО заходити
    const publicPages = ['/login', '/register', '/auth']; 
    
    // Перевіряємо, чи поточний шлях є у списку дозволених АБО чи це статичний файл (css, js, png, jpg тощо)
    const isPublicPage = publicPages.includes(req.path);
    const isStaticFile = req.path.includes('.') || req.path.startsWith('/css/') || req.path.startsWith('/js/');

    if (isPublicPage || isStaticFile) {
        // Створюємо заглушку, щоб сторінка логіну не падала через відсутність об'єкта user
        res.locals.user = { avatar: '/images/user.png', userName: 'Гість' };
        return next(); // Пропускаємо без перевірки БД
    }

    // 2. Якщо користувач АВТОРИЗОВАНИЙ (є сесія) -> йдемо в базу за даними
    if (req.session && req.session.userId) {
        db.get('SELECT userName, avatar FROM users WHERE userId = ?', [req.session.userId], (err, userFromDb) => {
            if (err) {
                console.error("Помилка БД (users):", err);
                return res.redirect('/login'); 
            }

            if (userFromDb) {
                req.userName = userFromDb.userName;
                req.avatar = userFromDb.avatar;
            }

            res.locals.activePage = "";
            res.locals.user = {
                avatar: req.avatar || '/images/user.png',
                userName: req.userName || 'Користувач'
            };

            // 1-Й КРОК: Отримуємо список будинків
            db.all(
                'SELECT houseId, houseName, houseLocation, waterUsage, electricityUsage, gasUsage, internetUsage FROM houses WHERE userId = ?',
                [req.session.userId],
                (err2, rows) => {
                    if (err2) {
                        console.error('Помилка БД (houses):', err2);
                        res.locals.houses = [];
                        res.locals.activeHouse = null;
                    } else {
                        res.locals.houses = rows || [];
                        const activeId = req.session.activeHouseId;
                        const foundHouse = rows.find(h => h.id == activeId || h.houseid == activeId || h.houseId == activeId);

                        // ВИПРАВЛЕНО: Замінено rows на rows[0], щоб порожній масив [] не ламав логіку перевірок
                        res.locals.activeHouse = foundHouse || rows[0] || null;

                        if (res.locals.activeHouse && !activeId) {
                            req.session.activeHouseId = res.locals.activeHouse.houseId;
                        }
                    }

                    // Визначаємо поточний houseId
                    const currentHouseId = res.locals.activeHouse ? res.locals.activeHouse.houseId : null;

                    // ЗАХИСТ: Якщо будинку немає, немає сенсу шукати кімнати. Одразу йдемо далі.
                    if (!currentHouseId) {
                        res.locals.rooms = [];
                        res.locals.activeRoom = null;
                        return next(); 
                    }

                    // 2-Й КРОК: Запускаємо запит кімнат (Переконуємося, що ми дістаємо houseId для зв'язку)
                    db.all(
                        'SELECT roomId, roomName, roomColor, houseId FROM rooms WHERE userId = ? AND houseId = ?', 
                        [req.session.userId, currentHouseId], 
                        (err3, roomRows) => {
                            if (err3) {
                                console.error('Помилка БД (rooms):', err3);
                                res.locals.rooms = [];
                                res.locals.activeRoom = null;
                            } else {
                                res.locals.rooms = roomRows || [];
                                const activeRoomId = req.session.activeRoomId;
                                const foundRoom = res.locals.rooms.find(r => r.roomId == activeRoomId);

                                // Беремо знайдену кімнату, або першу з масиву, або null
                                res.locals.activeRoom = foundRoom || res.locals.rooms[0] || null;

                                if (res.locals.activeRoom && !activeRoomId) {
                                    req.session.activeRoomId = res.locals.activeRoom.roomId;
                                }
                            }

                            // 3-Й КРОК МІДЛВАРУ (Вбудовується всередину колбеку вибірки кімнат)
                            const currentHouseId = res.locals.activeHouse ? res.locals.activeHouse.houseId : null;
                            const currentRoomId = res.locals.activeRoom ? res.locals.activeRoom.roomId : null;

                            // ЗАХИСТ: Якщо будинку немає, обнуляємо дані та йдемо далі
                            if (!currentHouseId || !currentRoomId) {
                                res.locals.devices = [];
                                res.locals.connections = [];
                                return next();
                            }

                            // Вибірка пристроїв: Тільки для поточного користувача, активного будинку та кімнати
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

                                    // Вибірка зв'язків: Тільки всередині активного будинку та кімнати
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
                                            
                                            // Переходимо до рендерингу сторінки
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
        // 3. Якщо це приватна сторінка і користувач НЕ залогінений -> редирект
        console.log(`[Middleware] БЛОКУВАННЯ: Користувача перенаправлено з ${req.path} на /login`);
        return res.redirect('/login');
    }
});

app.post('/setActiveRoom', (req, res) => {
    // КРИТИЧНО: Читаємо roomId з тіла запиту req.body (те, що надіслав клієнт)
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

    // Обов'язково повертаємо статус успіху назад у jQuery AJAX
    return res.status(200).json({ success: true });
});


// ENDPOINT 1: Оновлення координат пристрою (З безпекою за houseId)
app.post('/updateDeviceCoords', (req, res) => {
    const { deviceId, x, y } = req.body;
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId; // Беремо з надійної сесії сервера

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

// ENDPOINT 2: Створення зв'язку (З безпекою за houseId)
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

// ENDPOINT 3: Видалення зв'язку (З безпекою за houseId)
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

// REGISTER DEVICE POST ENDPOINT
app.post('/addDeviceForm', (req, res) => {
    // ЗАХИСТ: Додаємо захисне значення на випадок збою деструктуризації
    const body = req.body || {};
    const deviceName = body.deviceName;
    const usageScheme = body.usageScheme || 'on/off'; // за замовчуванням 'on/off'
    
    const userId = req.session.userId;
    const houseId = req.session.activeHouseId; 
    const roomId = req.session.activeRoomId;

    if (!userId || !houseId || !roomId) {
        return res.status(400).send('Missing session workspace context.');
    }
    
    if (!deviceName || deviceName.trim() === '') {
        return res.status(400).send('Device name is required.');
    }

    // ВИПРАВЛЕНО: Додаємо canvasX та canvasY у запит, щоб пристрої не зникали при створенні
    const query = 'INSERT INTO devices (userId, houseId, roomId, deviceName, usageScheme, canvasX, canvasY) VALUES (?, ?, ?, ?, ?, ?, ?)';
    
    // Встановлюємо початкові координати (наприклад, 150, 150), щоб девайс з'явився у видимій зоні
    const defaultX = 150;
    const defaultY = 150;

    db.run(query, [userId, houseId, roomId, deviceName, usageScheme, defaultX, defaultY], function(err) {
        if (err) {
            console.error('Помилка БД при створенні пристрою:', err.message);
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
// Створює POST-маршрут для оновлення даних авторизованого користувача
app.post('/accountData', upload.single('avatar'), async (req, res) => {
    // 1. Перевіряємо, чи користувач взагалі авторизований
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'Authorization needed to change the profile data' });
    }

    const userId = req.session.userId;
    const { userName, email, password } = req.body;

    try {
        // 1. КРИТИЧНО: Витягуємо змінні з тіла запиту (req.body)
        const userName = req.body.userName ? req.body.userName.trim() : null;
        const email = req.body.email ? req.body.email.trim() : null;
        const password = req.body.password;
        const userId = req.session.userId; // Переконайтеся, що userId також визначено

        // 2. Збираємо масив полів для оновлення та параметри для SQL
        let updateFields = [];
        let queryParams = [];

        if (userName && userName !== '') {
            updateFields.push('userName = ?');
            queryParams.push(userName);
        }

        // 3. Додаємо email ТІЛЬКИ якщо користувач щось увів
        if (email && email !== '') {
            updateFields.push('email = ?');
            queryParams.push(email);
        }

        // 3. Якщо завантажено новий аватар — додаємо його в запит
        if (req.file) {
            const avatarPath = `/uploads/${req.file.filename}`;
            updateFields.push('avatar = ?');
            queryParams.push(avatarPath);
        }

        // 4. Якщо користувач ввів новий пароль — хешуємо його і додаємо в запит
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('hashedPassword = ?');
            queryParams.push(hashedPassword);
        }

        // 5. Формуємо фінальний SQL-запит UPDATE
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

            // 6. Обов'язково оновлюємо дані в самій сесії
            req.session.userName = userName;
            
            // Видалено зламаний рядок req.cookie
            if (req.file) {
                req.session.avatar = `/uploads/${req.file.filename}`; 
            }

            // Перенаправляємо назад на головну сторінку
            return res.redirect('/');
        });

    } catch (error) {
        console.error('Processing error:', error);
        return res.status(500).json({ message: 'Помилка обробки даних' });
    }

});

// ВИДАЛЕННЯ АКАУНТУ ЧЕРЕЗ ПОСИЛАННЯ (GET-запит)
app.get('/accountDelete', (req, res) => {
    // 1. Перевіряємо авторизацію (використовуємо обидва регістри для безпеки)
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('Authentication required');
    }

    // 2. SQL-запит на повне видалення рядка користувача
    const query = 'DELETE FROM users WHERE userId = ?'; // перевірте, чи у вас userid чи id в таблиці users

    db.run(query, [userId], function (err) {
        if (err) {
            console.error('Помилка БД при видаленні акаунту:', err.message);
            return res.status(500).send('Помилка сервера при видаленні акаунту');
        }

        console.log(`[DB] Акаунт користувача ID ${userId} успішно видалено`);

        // 3. Обов'язково знищуємо сесію, щоб розлогінити користувача
        req.session.destroy((err) => {
            if (err) {
                console.error('Помилка очищення сесії:', err);
                // Навіть якщо сесія видалилася зі збоєм, користувача все одно треба вигнати на логін
            }
            
            // 4. Видаляємо куку сесії з браузера і перенаправляємо на сторінку входу
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
    
    // Рендеримо сторінку (об'єкт user передається автоматично через наш глобальний middleware)
    res.render('accountData');
});

// LOGIN ROUTE
app.post('/login', async (req, res) => {
  const { username, password } = req.body; // Приймаємо username, як його надсилає fetch
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
              // Записуємо дані в сесію для глобального захисту сайту
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
        return res.sendStatus(200); // Відправляємо просто сигнал "Все ОК"
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

    // Перевірка авторизації (userId з вашої сесії)
    if (!req.session || !req.session.userId) {
        return res.status(401).send('Неавторизовано');
    }

    if (!houseId) {
        return res.status(400).send('ID будинку не вказано');
    }

    // Зберігаємо ID активного будинку в сесію
    req.session.activeHouseId = houseId;

    console.log(`[Session] Користувач ${req.session.userId} вибрав будинок ID: ${houseId}`);
    
    // Обов'язково повертаємо JSON статус успіху для jQuery $.ajax
    return res.status(200).json({ success: true });
});

//HOUSE REMOVE ROUTE
app.post('/houseRemove', (req, res) => {
    const { houseId } = req.body;
    const userId = req.session.userId; // Беремо ID користувача з сесії

    // 1. Перевірка авторизації
    if (!userId) {
        return res.status(401).send('Неавторизовано');
    }

    if (!houseId) {
        return res.status(400).send('ID будинку не вказано');
    }

    // 2. SQL-запит із подвійною перевіркою (ID будинку ТА ID власника)
    const query = 'DELETE FROM houses WHERE houseId = ? AND userId = ?';

    db.run(query, [houseId, userId], function(err) {
        if (err) {
            console.error('Помилка БД при видаленні:', err.message);
            return res.status(500).send('Помилка сервера при видаленні');
        }

        // Якщо rows affected (this.changes) дорівнює 0, значить або будинку немає, або він чужий
        if (this.changes === 0) {
            return res.status(403).send('Будинок не знайдено або у вас немає прав на його видалення');
        }

        console.log(`[DB] Користувач ${userId} видалив будинок ${houseId}`);

        // 3. Якщо видалений будинок був активним у сесії — скидаємо його
        if (req.session.activeHouseId == houseId) {
            req.session.activeHouseId = null;
        }

        return res.status(200).json({ success: true });
    });
});

app.post('/editHouseForm', (req, res) => {
    // 1. Отримуємо нові дані будинку та його ID з тіла запиту (req.body)
    const { houseId, houseName, houseLocation } = req.body;
    
    // Перевіряємо регістр вашої сесії (раніше ви використовували req.session.userid з маленької 'd')
    const userId = req.session.userId; 

    // 2. Перевірка авторизації та вхідних даних
    if (!userId) {
        return res.status(401).send('Неавторизовано');
    }

    if (!houseId || !houseName || !houseLocation) {
        return res.status(400).send('Усі поля (ID, назва, локація) обовʼязкові для заповнення');
    }

    // 3. Правильний SQL-синтаксис UPDATE (БЕЗ слова FROM)
    // Також робимо перевірку userId, щоб користувач не міг відредагувати чужий будинок
    const query = 'UPDATE houses SET houseName = ?, houseLocation = ? WHERE houseId = ? AND userId = ?';

    db.run(query, [houseName, houseLocation, houseId, userId], function(err) {
        if (err) {
            console.error('Помилка БД при редагуванні:', err.message);
            return res.status(500).send('Помилка сервера при збереженні змін');
        }

        // Якщо жоден рядок не змінився, означає, що ID неправильний або будинок належить іншому юзеру
        if (this.changes === 0) {
            return res.status(403).send('Будинок не знайдено або у вас немає прав на його редагування');
        }

        console.log(`[DB] Користувач ${userId} успішно оновив будинок ID: ${houseId}`);

        // Повертаємо статус успіху у форматі JSON для вашого AJAX-запиту
        return res.status(200).json({ success: true });
    });
});

//ROOM ADD ROUTE
app.post('/addRoomForm', (req, res) => {
    const { roomName, roomColor } = req.body;
    const userId = req.session.userId;
    
    // КОРЕКТНО: Використовуємо activeHouseId замість houseId
    const houseId = req.session.activeHouseId; 

    console.log('Room registration attempt for: ', roomName, 'in House ID:', houseId);
    
    // ЗАХИСТ: Перевіряємо, чи вибрано хоч якийсь будинок перед створенням кімнати
    if (!houseId) {
        console.error('Помилка: Спроба створити кімнату без активного будинку.');
        return res.status(400).send('Помилка: Спочатку виберіть або створіть будинок.');
    }

    const query = 'INSERT INTO rooms (roomName, roomColor, houseId, userId) VALUES (?, ?, ?, ?)';
    
    db.run(query, [roomName, roomColor, houseId, userId], function (err) {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: 'Error creating a room' }); // Виправлено текст помилки
        }
        
        // Виправлено текст логування (було House -> стало Room)
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

    // SQL запит видалення з перевіркою власника (userId) для безпеки
    const query = 'DELETE FROM devices WHERE deviceId = ? AND userId = ?';

    db.run(query, [deviceId, userId], function(err) {
        if (err) {
            console.error('Помилка БД при видаленні пристрою:', err.message);
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
    // КОРЕКТНО: Витягуємо roomId з req.body, куди його надіслав jQuery $.ajax
    /* const { houseId, roomId } = req.body;  */
    const houseId = req.session.activeHouseId;
    const roomId = req.session.activeRoomId;
    const userId = req.session.userId; 

    // 1. Перевірка авторизації
    if (!userId) {
        return res.status(401).send('Unauthorized');
    }

    if (!houseId) {
        return res.status(400).send('Pick a house to operate');
    }

    if (!roomId) {
        return res.status(400).send('Pick a room to operate');
    }

    // 2. SQL-запит із потрійною перевіркою (Кімната, Будинок ТА ID власника для безпеки)
    const query = 'DELETE FROM rooms WHERE houseId = ? AND userId = ? AND roomId = ?';

    db.run(query, [houseId, userId, roomId], function(err) {
        if (err) {
            console.error('Database deletion error ', err.message);
            return res.status(500).send('Deletion error');
        }

        // Якщо rows affected (this.changes) дорівнює 0, значить запис не знайдено або він чужий
        if (this.changes === 0) {
            return res.status(403).send('The room is not found or you are unauthorized');
        }

        console.log(`[DB] User ${userId} deleted room ${roomId} from house ${houseId}`);

        // 3. ВИПРАВЛЕНО: Якщо видалена кімната була активною в сесії — скидаємо саме КІМНАТУ, а не будинок!
        if (req.session.activeRoomId == roomId) {
            req.session.activeRoomId = null;
        }

        return res.status(200).json({ success: true });
    });
});

// ROOM EDIT ROUTE
// ROOM EDIT ROUTE WITH HOUSE VALIDATION
app.post('/editRoomForm', (req, res) => {
    // 1. ВИПРАВЛЕНО: Зчитуємо houseId напряму, як його надсилає jQuery AJAX запит
    const { roomId, houseId, roomColor } = req.body; 
    const roomName = req.body.roomName ? req.body.roomName.trim() : null;
    const userId = req.session.userId;

    // 2. Перевірка авторизації та цілісності даних
    if (!userId) {
        return res.status(401).send('Unauthorized. Please log in.');
    }

    if (!roomId || !houseId) {
        return res.status(400).send(`Missing metadata. Room ID: ${roomId}, House ID: ${houseId}`);
    }

    // 3. Динамічно збираємо поля для оновлення
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

    // 4. Формуємо фінальний SQL-запит UPDATE
    queryParams.push(userId, houseId, roomId);
    const query = `UPDATE rooms SET ${updateFields.join(', ')} WHERE userId = ? AND houseId = ? AND roomId = ?`;

    db.run(query, queryParams, function (err) {
        if (err) {
            console.error('Database error during room modification:', err.message);
            return res.status(500).send('Internal server database error.');
        }

        // 5. Перевіряємо, чи був знайдений відповідний запис
        if (this.changes === 0) {
            return res.status(403).send('Room not found or you do not have permission to modify it within this house.');
        }

        console.log(`[DB] User ${userId} successfully updated room ${roomId} in house ${houseId}`);
        
        return res.status(200).json({ success: true });
    });
});

app.get('/', function(req, res){
    res.render('index', { activePage: "index" });
});

app.get('/devicemap', function(req, res){
    res.render('devicemap', { 
        activePage: "devicemap"
     });
    
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

app.listen(PORT, (req, res) => {
  console.log("App Started on App:" + PORT);
});
