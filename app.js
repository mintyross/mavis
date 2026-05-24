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
                console.error("Помилка БД:", err);
                // Якщо в БД збій, краще розлогінити користувача і відправити на логін
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
            return next(); // Успішно авторизовано, пускаємо на index/settings
        });

        /* db.get('SELECT houseName, houseLocation, waterUsage, electricityUsage, gasUsage, internetUsage FROM houses WHERE houseId = ?', [req.session.userId], (err, userFromDb) => {
            if (err) {
                console.error("Помилка БД:", err);
                // Якщо в БД збій, краще розлогінити користувача і відправити на логін
                return res.redirect('/login');
            }
        }); */
    } else {
        // 3. Якщо це приватна сторінка і користувач НЕ залогінений -> редирект
        console.log(`[Middleware] БЛОКУВАННЯ: Користувача перенаправлено з ${req.path} на /login`);
        return res.redirect('/login');
    }
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
        // 2. Збираємо масив полів для оновлення та параметри для SQL
        let updateFields = ['userName = ?', 'email = ?'];
        let queryParams = [userName, email];

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
        // Додаємо userId в самий кінець параметрів для умови WHERE id = ?
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

            // 6. Обов'язково оновлюємо дані в самій сесії, щоб зміни в navbar відобразилися миттєво!
            req.session.userName = userName;
            if (req.file) {
                req.cookie // або напряму, якщо ви використовуєте req.avatar:
                req.avatar = `/uploads/${req.file.filename}`;
            }

            // Перенаправляємо назад на сторінку налаштувань, де користувач побачить нові дані
            return res.redirect('/');
        });

    } catch (error) {
        console.error('Processing error:', error);
        return res.status(500).json({ message: 'Помилка обробки даних' });
    }
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



//NAVBAR
/* app.use((req, res, next) => {
    res.locals.activePage = "";
    res.locals.user = {
        avatar: req.avatar || '/images/user.png', // Якщо в БД порожньо, буде дефолт
        userName: req.userName || 'Гість'         // Якщо не залогінений — 'Гість'
    };
    next();
}); */

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
