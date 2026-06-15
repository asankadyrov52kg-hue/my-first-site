require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require("path")
const app = express();
const fs = require("fs");
const jwt = require('jsonwebtoken')
const bcrypt = require("bcrypt")
const sharp = require("sharp")
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const TelegramBot = require('node-telegram-bot-api');
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});
app.use(cors({
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.set('trust proxy', 1);
const JWT_SECRET = process.env.JWT_SECRET

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Слишком много неудачных попыток,повторите позже.'
        });
    },

    standardHeaders: true,
    legacyHeaders: false,
});

const adminActionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60, 
    handler: (req, res) => {
        res.status(429).json({ success: false, message: 'Вы делаете запросы слишком быстро.' });
    }
});

function checkAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(403).json({ success: false, message: "Доступ запрещен. Войдите в систему!" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        req.userId = decoded.userId;
        req.isAdmin = decoded.isAdmin;

        if (!req.isAdmin) {
            return res.status(403).json({ success: false, message: "Недостаточно прав доступа!" });
        }

        next(); 
    } catch (err) {
        return res.status(401).json({ success: false, message: "Ваша сессия устарела. Войдите заново." });
    }
}

// ==============сохранение данных в базу=============================================================
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
// ============================================================
const sliderStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/slider'; // Файлы слайдера полетят в свою подпапку
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'slide_' + Date.now() + path.extname(file.originalname));
    }
});
const uploadSlider = multer({ storage: sliderStorage });
// ======================================================================================




app.post('/upload-blog', checkAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id, title, date, content } = req.body;
        let imageUrl = null; // Теперь храним полную ссылку

        if (req.file) {
            // 1. Сжимаем изображение в буфер (без создания файлов на диске Render)
            const compressedBuffer = await sharp(req.file.path)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({
                    quality: 78,        
                    effort: 6,          
                    smartSubsample: true
                })
                .toBuffer(); // Используем .toBuffer() вместо .toFile()

            // 2. Переводим буфер в строку для отправки в облако
            const fileBase64 = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;

            // 3. Отправляем файл в Cloudinary
            const cloudinaryResult = await cloudinary.uploader.upload(fileBase64, {
                folder: 'blogs_images', // Папка создастся в облаке автоматически
            });

            // 4. Получаем вечную ссылку на картинку
            imageUrl = cloudinaryResult.secure_url;

            // 5. Удаляем временный файл, который создал multer при загрузке
            try {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (e) {
                console.log("Не удалось удалить временный файл:", e.message);
            }
        }

        // SQL-запрос остается прежним, база данных не меняется!
        const sql = `
            INSERT INTO blogs (id, title, blog_date, content, image_name) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *`;

        // Передаем imageUrl в колонку image_name
        const values = [id, title, date, content, imageUrl];
        const result = await pool.query(sql, values);

        res.json({ status: 'ok', data: result.rows[0] });
    } catch (err) {
        console.error("ОШИБКА ОБРАБОТКИ:", err);
        res.status(500).json({ error: 'Ошибка при записи в БД или сжатии' });
    }
});




// ============================== для логина==========================================================

app.post('/lo-tic-gin-lo19', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            const isPasswordCorrect = await bcrypt.compare(password, user.password);

            if (isPasswordCorrect) {
                if (user.is_admin) {
                    const token = jwt.sign(
                        { userId: user.id, isAdmin: true },
                        JWT_SECRET,
                        { expiresIn: '24h' }
                    );

                    return res.json({ success: true, message: 'Привет, админ!', token: token });
                } else {
                    return res.status(403).json({ success: false, message: 'Нет прав доступа' });
                }
            } else {
                return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
            }
        } else {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Ошибка на сервере' });
    }
});

// ==========================================
// 3. Роут Изменения Профиля (Защищен с помощью checkAdmin)
// ==========================================
app.post('/api/up-dte-prof20', checkAdmin, async (req, res) => {
    const { newUsername, newPassword } = req.body;
    const userId = req.userId;

    if (!newUsername && !newPassword) {
        return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
    }

    try {
        if (newUsername) {
            const userCheck = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id <> $2',
                [newUsername, userId]
            );
            if (userCheck.rows.length > 0) {
                return res.status(400).json({ success: false, message: 'Этот логин уже занят' });
            }
        }

        let queryText = 'UPDATE users SET ';
        let queryParams = [];
        let paramIndex = 1;

        if (newUsername) {
            queryText += `username = $${paramIndex}, `;
            queryParams.push(newUsername);
            paramIndex++;
        }

        if (newPassword) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            queryText += `password = $${paramIndex}, `;
            queryParams.push(hashedPassword);
            paramIndex++;
        }

        queryText = queryText.slice(0, -2);
        queryText += ` WHERE id = $${paramIndex}`;
        queryParams.push(userId);

        await pool.query(queryText, queryParams);
        res.json({ success: true, message: 'Данные профиля успешно изменены и зашифрованы!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Ошибка сервера при попытке обновить данные' });
    }
});



// ====================================new-log=======================================================================





// ==============================отправка данных в фронт================================================
app.get('/get-blogs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM blogs ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка при получении данных' });
    }
});


app.get('/get-blog/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Пост не найден' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Ошибка получения блога:", err);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});




// ===============================delete=============================================================

app.delete('/api/delete-post/:id',checkAdmin,adminActionLimiter, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM blogs WHERE id = $1 RETURNING image_name',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Пост с таким ID не найден' });
        }

        const imageName = result.rows[0].image_name;

        if (imageName) {
            const filePath = path.join(process.cwd(), 'uploads', imageName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`✓ Файл ${imageName} успешно удален из папки uploads`);
            }
        }

        res.json({ success: true, message: `Пост №${id} и его изображение успешно удалены` });
    } catch (err) {
        console.error("ОШИБКА ТУТ:", err);
        res.status(500).json({ success: false, message: 'Ошибка базы данных или удаления файла' });
    }
});

// ==============================swiper manipulation=====================================
app.get('/api/admin/slider', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM slider_images ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка БД' });
    }
});



app.post('/api/admin/slider', checkAdmin, uploadSlider.single('slide'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        // 1. Сжимаем слайд в буфер (в оперативку, без сохранения файла на диск Render)
        const compressedBuffer = await sharp(req.file.path)
            .resize({ width: 1920, withoutEnlargement: true }) 
            .webp({
                quality: 82,         
                effort: 6,
                smartSubsample: true
            })
            .toBuffer(); // Используем .toBuffer() вместо .toFile()

        // 2. Переводим буфер в строку base64 для отправки
        const fileBase64 = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;

        // 3. Отправляем в Cloudinary (можно указать другую папку, например 'slider_images')
        const cloudinaryResult = await cloudinary.uploader.upload(fileBase64, {
            folder: 'slider_images', 
        });

        // 4. Получаем вечный URL на картинку в облаке
        const imageUrl = cloudinaryResult.secure_url;

        // 5. Удаляем временный оригинальный файл, который multer создал на диске
        try {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (e) {
            console.log("Не удалось удалить временный файл слайдера:", e.message);
        }

        // 6. Записываем готовую ссылку в PostgreSQL
        // (Убедись, что колонка image_url в таблице slider_images имеет тип TEXT или VARCHAR(255+))
        await pool.query('INSERT INTO slider_images (image_url) VALUES ($1)', [imageUrl]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА СЛАЙДЕРА:", err);
        res.status(500).json({ error: 'Ошибка сервера при обработке слайда' });
    }
});


// ===================================================================================================


app.delete('/api/admin/slider/:id',checkAdmin,adminActionLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM slider_images WHERE id = $1 RETURNING image_url',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Изображение слайдера не найдено' });
        }

        const imageUrl = result.rows[0].image_url;

        if (imageUrl) {
            const cleanPath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;

            const filePath = path.join(process.cwd(), cleanPath);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`✓ Слайд ${imageUrl} успешно удален с диска`);
                } catch (fileErr) {
                    console.error(`Не удалось стереть файл (возможно, занят OneDrive): ${fileErr.message}`);
                }
            }
        }

        res.json({ success: true, message: 'Слайд успешно удален из БД и с диска' });
    } catch (err) {
        console.error("ОШИБКА УДАЛЕНИЯ СЛАЙДЕРА:", err);
        res.status(500).json({ error: 'Ошибка сервера при удалении слайда' });
    }
});

// =====================================request===============================================================================================================\

app.post("/send", async (req, res) => {
    try {
        const { user_name, email, phone, user_request } = req.body;
        
        const query = `
          INSERT INTO request (name, email, number, request)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `;
        const result = await pool.query(query, [user_name, email, phone, user_request]);
        const requestId = result.rows[0].id;     

       
        const secureMessage = `🔔 **Поступила новая заявка №${requestId}!**\nЧтобы увидеть контакты, введите пароль администратора в боте и нажмите кнопку ниже:`;

       await bot1.sendMessage(process.env.TELEGRAM_CHAT_ID, secureMessage, {
    parse_mode: "Markdown",
    reply_markup: {
        inline_keyboard: [
            [{ text: `👀 Открыть заявку №${requestId}`, callback_data: `view_id_${requestId}` }]
        ]
    }
});

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Ошибка сервера" });
    }
});

// ===============================================privattg----------------------------------------------------------


const bot1 = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
let unlockedAdminIds = []; 

bot1.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text ? msg.text.trim() : '';

    if (text === process.env.BOT_VIEW_PASSWORD) {
        if (!unlockedAdminIds.includes(userId)) {
            unlockedAdminIds.push(userId); 
        }
        
        return bot1.sendMessage(chatId, '🔒 Доступ разрешен!\n\nВы успешно авторизованы как администратор. Используйте кнопки ниже для управления данными:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📝 Показать все заявки', callback_data: 'show_all_requests' }],
                    [{ text: '🔒 Выйти (Закрыть доступ)', callback_data: 'lock_bot_session' }]
                ]
            }
        });
    }

    if (!unlockedAdminIds.includes(userId)) {
        return bot1.sendMessage(chatId, '⚠️ Данные скрыты из соображений безопасности. Пожалуйста, введите секретный пароль администратора для входа:');
    }
    
    if (text === '/all') {
        return sendRequestsList(chatId, userId);
    }
    if (text === '/lock') {
        unlockedAdminIds = unlockedAdminIds.filter(id => id !== userId);
        return bot1.sendMessage(chatId, '🔒 Вы успешно вышли из системы. Доступ к данным для вашего аккаунта закрыт.');
    }
});

bot1.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    if (!unlockedAdminIds.includes(userId)) {
        return bot1.sendMessage(chatId, '⚠️ Вы не авторизованы. Пожалуйста, введите пароль в чате.');
    }
    if (data === 'show_all_requests') {
        await sendRequestsList(chatId, userId);
    }

    if (data === 'lock_bot_session') {
        unlockedAdminIds = unlockedAdminIds.filter(id => id !== userId);
        await bot1.sendMessage(chatId, '🔒 Вы успешно вышли из системы. Доступ к данным закрыт.');
    }

    if (data.startsWith('view_id_')) {
        const requestId = parseInt(data.replace('view_id_', ''), 10);
        
        try {
            const dbResult = await pool.query('SELECT * FROM request WHERE id = $1', [requestId]);
            
            if (dbResult.rows.length === 0) {
                return bot1.sendMessage(chatId, `❌ Заявка №${requestId} не найдена.`);
            }

            const client = dbResult.rows[0];
            
            let requestText = 'Пусто';
            if (client.request) {
                requestText = typeof client.request === 'object' ? JSON.stringify(client.request) : String(client.request);
                if (requestText === '{}') requestText = 'Пустой запрос';
            }

            const clientDataMessage = `📋 **Данные заявки №${client.id}**:\n\n👤 **Имя**: ${client.name}\n📧 **Email**: ${client.email}\n📞 **Телефон**: ${client.number}\n💬 **Текст заявки**: ${requestText}`;
            
            await bot1.sendMessage(chatId, clientDataMessage, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '⬅️ Вернуться к списку', callback_data: 'show_all_requests' }]
                    ]
                }
            });

        } catch (err) {
            console.error('Ошибка PostgreSQL при просмотре заявки:', err);
            await bot1.sendMessage(chatId, '❌ Ошибка при чтении базы данных.');
        }
    }

    bot1.answerCallbackQuery(callbackQuery.id);
});

async function sendRequestsList(chatId, userId) {
    try {
        const dbResult = await pool.query('SELECT id, name FROM request ORDER BY id DESC');
        if (dbResult.rows.length === 0) {
            return bot1.sendMessage(chatId, 'Заявок в базе пока нет.');
        }

        const keyboardButtons = [];
        let currentRow = [];

        dbResult.rows.forEach((row, index) => {
            currentRow.push({ 
                text: `№${row.id} ${row.name.substring(0, 8)}`, 
                callback_data: `view_id_${row.id}` 
            });

            if (currentRow.length === 2 || index === dbResult.rows.length - 1) {
                keyboardButtons.push(currentRow);
                currentRow = []; 
            }
        });

        keyboardButtons.push([{ text: '🔒 Выйти (Закрыть доступ)', callback_data: 'lock_bot_session' }]);

        await bot1.sendMessage(chatId, `📝 **В базе данных найдено заявок: ${dbResult.rows.length}**\nНажмите на нужную кнопку ниже, чтобы открыть контакты клиента:`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: keyboardButtons
            }
        });
    } catch (err) {
        console.error('Ошибка получения списка:', err);
        await bot1.sendMessage(chatId, '❌ Ошибка сервера при чтении списка.');
    }
}


// ================================================privacy===============================================================
app.get('/api/pages/:slug', async (req, res) => {
    try {
        const pageSlug = req.params.slug;

        const result = await pool.query('SELECT title, content FROM static_pages WHERE slug = $1', [pageSlug]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Страница не найдена" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Сервер работает на порту 3000'));
