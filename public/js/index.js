/* 
    Містить логіку роботи кнопок головного меню. 
    Також містить скрипт зчитування даних елементів, як текст та колір,
    що створює alert-елемент у верху екрана з відповідними даними.
 */

/* Функція створення alert-елементів */
function showMavisNotification(text, type = 'info', duration = 4000) {
    let container = document.getElementById('mavisAlertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mavisAlertContainer';
        document.body.appendChild(container);
    }

    const alertBox = document.createElement('div');
    // Змінна 'type' передасть чистий клас кольору
    alertBox.className = `mavis-alert-box ${type}`;
    
    const textNode = document.createElement('p');
    textNode.innerText = text;
    alertBox.appendChild(textNode);

    container.appendChild(alertBox);

    setTimeout(() => { alertBox.classList.add('visible'); }, 10);

    setTimeout(() => {
        alertBox.classList.remove('visible');
        alertBox.addEventListener('transitionend', () => { alertBox.remove(); });
    }, duration);
}

/* Логіка роботи кнопок */
$(document).ready(function() {
    $(".buttonSmall.alert").on("click", function(e) {
        e.preventDefault();

        /* Отримуємо кнопку та її текст у тезі <p> */
        const $btn = $(this);
        const rawText = $btn.find("p").text().trim();

        // Шукаємо найближчий вгору контейнер із атрибутом data-context
        const context = $btn.closest("[data-context]").attr("data-context");

        /* Підлаштовуємо контекст alert-елементу під кнопку */
        let notificationText = "";
        if (context === "pattern") {
            notificationText = `Pattern changed to ${rawText}`;
        } else if (context === "mood") {
            notificationText = `Mood changed to ${rawText}`;
        } else if (context === "flush") {
            notificationText = `Flushing!`;
        } else if (context === "unflush") {
            notificationText = `Agh, what a mess!`;
        } else if (context === "garageDoorsOpen") {
            notificationText = `Opening garage doors. Stay out of the way!`;
        } else if (context === "garageDoorsClose") {
            notificationText = `Closing garage doors. Stay out of the way!`;
        } else {
            // Фалбек на випадок, якщо кнопка натиснута в іншому блоці (наприклад, у налаштуваннях)
            notificationText = `Mode changed to ${rawText}`;
        }

        /* Зчитування кольору з останнього класу */
        const classString = $btn.attr("class") || "";
        const classes = classString.split(" ");
        // Беремо останній клас елемента
        const colorType = classes.length > 1 ? classes[classes.length - 1] : 'info';

        /* Тригер сповіщення */
        showMavisNotification(notificationText, colorType, 4000);
    });
});