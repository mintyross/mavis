$(document).ready(function() {
    $("#showLogs").on("click", function(e) {
        e.preventDefault();
        $("#logMonitor").css("display", "flex");
        $(".windowArea").css("display", "flex");
    });

    $("#logsWindowClose").on("click", function(e) {
        e.preventDefault();
        $("#logMonitor").css("display", "none");
        $(".windowArea").css("display", "none");

    });

        // СЛУХАЧ ПОДІЙ: Слухаємо зміни САМЕ на інпуті з id="background"
    $("#background").on("change", function(e) {
        const fileInput = this;
        
        // 1. Перевіряємо чи користувач дійсно обрав файл
        if (!fileInput.files || fileInput.files.length === 0) return;

        const file = fileInput.files[0];

        // 2. Валідація формату файлу (дозволяємо тільки картинки)
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only images are allowed (JPEG, PNG, WEBP)');
            fileInput.value = ""; 
            return;
        }

        // 3. Створюємо віртуальну форму FormData в пам'яті браузера
        const formData = new FormData();
        formData.append("background", file); // Назва має збігатися з upload.single('background')

        // Візуальний фідбек: злегка приглушуємо фон на час завантаження
        $("body").css("opacity", "0.7");

        // 4. Відправляємо файл у фоновому режимі (без перезавантаження сторінки)
        $.ajax({
            type: "POST",
            url: "/uploadBackground",
            data: formData,
            processData: false,  // Забороняє jQuery перетворювати файл на рядок
            contentType: false,  // Змушує браузер правильно виставити multipart/form-data boundary
            dataType: "json",
            success: function(response) {
                if (response.success) {
                    console.log("Background updated successfully across database rows.");
                    
                    // Обходимо кеш браузера за допомогою таймстампу (?t=...)
                    const cacheBuster = "?t=" + Date.now();
                    
                    // МИТТЄВО ОНОВЛЮЄМО ШПАЛЕРИ САЙТУ НА ЕКРАНІ
                    $("body").css("background-image", "url('" + response.backgroundUrl + cacheBuster + "')");
                }
            },
            error: function(xhr) {
                console.error("Async upload failed:", xhr.responseText);
                alert("Failed to upload image: " + xhr.responseText);
            },
            complete: function() {
                // Повертаємо 100% яскравість сторінці та очищаємо інпут
                $("body").css("opacity", "1");
                fileInput.value = ""; 
            }
        });
    });

    $("#changeTheme").on("click", function(e) {
        e.preventDefault();

        // 1. Надсилаємо запит на перемикання теми
        $.ajax({
            type: "POST",
            url: "/updateTheme",
            dataType: "json",

            success: function(response) {
                if (response.success) {
                   $("#changeTheme p").text(response.newTheme);
                    // 2. PASS THE STRING DIRECTLY TO CSS: This modifies data-theme="simple" or "classic"
                    $("body").attr("data-theme", response.newTheme);
                    /* window.location.reload();  */
                }
            },
            error: function(xhr) {
                console.error("Не вдалося змінити тему:", xhr.responseText);
                alert("Помилка зміни теми");
            }
        });
    });

    // Натискання кнопки скидання фону до початкового стану
    $("#defaultBackground").on("click", function(e) {
        e.preventDefault();

        // Візуальний фідбек: приглушуємо екран на час обробки
        $("body").css("opacity", "0.7");

        // Замість важкого FormData відправляємо звичайний POST-запит
        $.ajax({
            type: "POST",
            url: "/resetBackground",
            dataType: "json",
            success: function(response) {
                if (response.success) {
                    console.log("Database successfully reset to default wallpaper.");
                    
                    // МИТТЄВО ОНОВЛЮЄМО ШПАЛЕРИ НА ЕКРАНІ (Використовуємо стабільний абсолютний шлях)
                    $("body").css("background-image", "url('/images/mavis-background.jpg')");
                }
            },
            error: function(xhr) {
                console.error("Failed to reset wallpaper:", xhr.responseText);
                alert("Failed to reset background.");
            },
            complete: function() {
                // Повертаємо початкову яскравість сторінці
                $("body").css("opacity", "1");
            }
        });
    });


});

