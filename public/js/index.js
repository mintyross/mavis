function showMavisNotification(text, type = 'info', duration = 4000) {
    let container = document.getElementById('mavisAlertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mavisAlertContainer';
        document.body.appendChild(container);
    }

    const alertBox = document.createElement('div');
    // Змінна 'type' передасть чистий клас кольору (наприклад: mavis-alert-box orange)
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


$(document).ready(function() {
    $(".buttonSmall.alert").on("click", function(e) {
        e.preventDefault(); // Stop empty <a href=""> page refreshes

        const $btn = $(this);
        const rawText = $btn.find("p").text().trim();

        // 1. АВТОМАТИЧНА ПЕРЕВІРКА БАТЬКІВСЬКОГО КОНТЕКСТУ
        // Шукаємо найближчий вгору контейнер із атрибутом data-context
        const context = $btn.closest("[data-context]").attr("data-context");

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

        // 2. ЗЧИТУВАННЯ КОЛЬОРУ З КЛАСУ ДЛЯ ВАШОЇ CSS ПАЛІТРИ
        const classString = $btn.attr("class") || "";
        const classes = classString.split(" ");
        // Беремо останній клас елемента (наприклад: orange, blue, purple, green)
        const colorType = classes.length > 1 ? classes[classes.length - 1] : 'info';

        // 3. ТРИГЕР СПОВІЩЕННЯ
        showMavisNotification(notificationText, colorType, 4000);
    });
});