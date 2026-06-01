/* I chop woods, duh */

/* Записуємо всі клієнтські логи до бази даних */
(function() {
    const originalLog = console.log;
    const originalError = console.error;

    // Функція, що асинхронно передає логи
    function sendLogToServer(type, args) {
        // Конвертуємо всі типи даних в звичайний текст
        const message = Array.from(args).map(arg => {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');

        const logPayload = {
            type: type,
            message: message,
            timestamp: new Date().toISOString(),
            url: window.location.href
        };

        /* navigator.sendBeacon ефективний метод передачі невеликих даних на сервер */
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/logs', JSON.stringify(logPayload));
        } else {
            // Якщо він не підтримується, примінюємо звичайний POST-метод
            fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logPayload)
            }).catch(err => originalError('Log transport failed:', err));
        }
    }

    // Робимо так, щоб console.log друкував як локально, так і передавав на сервер
    console.log = function(...args) {
        originalLog.apply(console, args); // Щоб показував у Developer Tools
        sendLogToServer('INFO', args);
    };

    // Робимо так, щоб console.error перехвачувало помилки js
    console.error = function(...args) {
        originalError.apply(console, args); // Щоб показував у Developer Tools
        sendLogToServer('ERROR', args);
    };

    // 4. Перехвачуємо інші помилки, як граматичні помилки та неозначені змінні
    window.addEventListener('error', (event) => {
        sendLogToServer('CRASH', [`${event.message} at ${event.filename}:${event.lineno}`]);
    });
})();
