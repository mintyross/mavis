$(document).ready(function() {
    $(".roomPicker").click(function(e) {
        e.preventDefault();
        
        // КРИТИЧНО: Скидаємо стани, показуємо головне вікно вибору, ховаємо вікна додавання/редагування
        $("#roomPickerWindow").css("display", "flex");
        $("#roomAddWindow").css("display", "none");
        $("#roomEditWindow").css("display", "none"); // додано страховку для редагування
        
        $(".roomWindowArea").fadeIn(200); 
    });

    $("#roomPickerOKButton").click(function(e) {
        e.preventDefault();
        // Плавне зникнення
        $(".roomWindowArea").fadeOut(200);
    });

    $("#roomPickerAdd").click(function(e) {
        e.preventDefault();
        $("#roomAddWindow").css("display", "flex");
        $("#roomPickerWindow").css("display", "none");
    });

    $("#roomAddWindowCancelButton").click(function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomAddWindow").css("display", "none");
    });

    $("#addRoomForm").submit(function(e) {
        e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки

        const formData = {
            roomName: $("#roomName").val(),
            roomColor: $("#roomColor").val()
        };

        $.ajax({
            type: "POST",
            url: "/addRoomForm",
            data: formData,
            success: function(response) {
                alert("The room was successfully added");
                // Тут ви можете оновити список будинків на екрані або просто перезавантажити сторінку:
                window.location.reload(); 
            },
            error: function(xhr) {
                // Виводимо помилку (наприклад, "House already exists")
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "Sever error";
                alert(errorMsg);
            }
        });
    });

    // --- 3. ВИДАЛЕННЯ КІМНАТИ (ВИПРАВЛЕНО ДЛЯ ДИНАМІЧНОГО ДЕРЕВА DOM) ---
    // Використовуємо делегування через body, щоб уникнути конфліктів при утриманні e.stopPropagation()
    $(document).on("click", ".removeRoomButton", function(e) {
        // Зупиняємо розповсюдження події кліку до базової картки кімнати
        e.stopPropagation();

        // Надійно піднімаємося по DOM-дереву до головної картки
        const $roomCard = $(this).closest(".houseItemButton"); 

        // Читаємо значення атрибутів безпосередньо
        const roomId = $roomCard.attr("data-room-id"); 
        const houseId = $roomCard.attr("data-house-id"); 

        // Ховаємо випадаюче меню опцій
        $(".optionsButton").removeClass("active"); 

        // Перевірочний лог для вашої консолі розробника
        console.log("[DEBUG REMOVE] Натиснуто видалення. Кімната ID:", roomId, "| Будинок ID:", houseId);

        if (!roomId || !houseId) {
            console.error("Помилка зчитування ID. Кімната:", roomId, "Будинок:", houseId);
            alert("Помилка клієнта: Не вдалося знайти ID кімнати або будинку!");
            return;
        }

        if (confirm("Ви впевнені, що хочете видалити цю кімнату?")) {
            $.ajax({
                type: "POST",
                url: "/roomRemove",
                data: { roomId: roomId, houseId: houseId },
                success: function(response) {
                    // Плавне зникнення картки з екрану
                    $roomCard.fadeOut(300, function() { 
                        $(this).remove(); 
                    });
                },
                error: function(xhr) {
                    alert("Не вдалося видалити кімнату: " + xhr.responseText);
                }
            });
        }
    });

        // --- 6. ВИДАЛЕННЯ ПРИСТРОЮ (DELEGATED CLICK) ---
    $(document).on("click", ".removeDeviceButton", function(e) {
        // Зупиняємо баблінг події кліку до базової картки
        e.stopPropagation();

        // Піднімаємося по DOM-дереву до головної картки пристрою
        const $deviceCard = $(this).closest(".houseItemButton"); 

        // Читаємо значення атрибутів безпосередньо з HTML картки пристрою
        const deviceId = $deviceCard.attr("data-device-id"); 

        // Ховаємо випадаюче меню опцій (три крапки)
        $(".optionsButton").removeClass("active"); 

        // Перевірочний лог для вашої консолі розробника (F12)
        console.log("[DEBUG DEVICE REMOVE] Натиснуто видалення пристрою ID:", deviceId);

        // Валідація наявності ID
        if (!deviceId) {
            console.error("Помилка зчитування ID пристрою:", deviceId);
            alert("Помилка клієнта: Не вдалося знайти ID пристрою у верстці!");
            return;
        }

        // Підтвердження дії користувачем
        if (confirm("Ви впевнені, що хочете видалити цей пристрій? Його зв'язки на карті також зникнуть.")) {
            $.ajax({
                type: "POST",
                url: "/deviceRemove", // Окремий маршрут на бекенд для пристроїв
                data: { deviceId: deviceId },
                success: function(response) {
                    // Плавне зникнення картки пристрою з менеджеру пристроїв
                    $deviceCard.fadeOut(300, function() { 
                        $(this).remove(); 
                        
                        // ПЕРЕЗАВАНТАЖУЄМО сторінку, щоб HTML Canvas миттєво прибрав іконку та лінії цього пристрою
                        window.location.reload();
                    });
                },
                error: function(xhr) {
                    alert("Не вдалося видалити пристрій: " + xhr.responseText);
                }
            });
        }
    });

    // 3. КЛІК НА КНОПКУ EDIT (Редагувати)
    $(document).on("click", "#roomEditWindowCancelButton", function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomEditWindow").css("display", "none");
    });

    // Коли користувач натискає на кнопку "Edit" у випадаючому списку кімнати
        // --- 4. РЕДАГУВАННЯ КІМНАТИ (ОБ'ЄДНАНИЙ ТА ОЧИЩЕНИЙ КЛІК) ---
        // --- 4. КЛІК НА КНОПКУ РЕДАГУВАННЯ КІМНАТИ (ВИПРАВЛЕНО ЗВ'ЯЗУВАННЯ) ---
    // Биндимо клік прямо на клас без посередництва document, щоб уникнути конфліктів з e.stopPropagation
    $(".roomEditButton").click(function(e) {
        // Зупиняємо баблінг, щоб не вибирати кімнату як активну на задньому фоні
        e.stopPropagation();

        // Знаходимо батьківську картку кімнати
        const $roomCard = $(this).closest(".houseItemButton"); 
        
        // Зчитуємо дані з виправлених HTML дата-атрибутів
        const roomId = $roomCard.attr("data-room-id"); 
        const houseId = $roomCard.attr("data-house-id"); 
        const roomName = $roomCard.attr("data-room-name"); 
        const roomColor = $roomCard.attr("data-room-color"); 

        console.log("[FRONTEND DEBUG] Редагування кімнати:", { roomId, houseId, roomName, roomColor });

        // Ховаємо випадаюче меню опцій (три крапки)
        $(".optionsButton").removeClass("active"); 
        
        // Передаємо значення у відповідні приховані та видимі інпути форми редагування
        $("#editRoomIdInput").val(roomId);
        $("#editHouseIdInput").val(houseId); 
        $("#editRoomName").val(roomName);
        $("#editRoomColor").val(roomColor);

        // Перемикаємо модальні вікна на екрані
        $("#roomPickerWindow").css("display", "none");
        $("#roomEditWindow").css("display", "flex");
    });

    // Кнопка Скасувати у вікні редагування
    $("#roomEditWindowCancelButton").click(function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomEditWindow").css("display", "none");
    });


    // Кнопка скасування у вікні редагування
    $(document).on("click", "#roomEditWindowCancelButton", function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomEditWindow").css("display", "none");
    });

    // --- 5. ЗБЕРЕЖЕННЯ РЕДАГОВАНИХ ДАНИХ КІМНАТИ (AJAX) ---
    $("#editRoomForm").submit(function(e) {
        e.preventDefault();

        const updateData = {
            roomId: $("#editRoomIdInput").val(),
            houseId: $("#editHouseIdInput").val(), 
            roomName: $("#editRoomName").val(),
            roomColor: $("#editRoomColor").val()
        };

        console.log("Sending payload to server:", updateData); 

        $.ajax({
            type: "POST",
            url: "/editRoomForm",
            data: updateData,
            success: function(response) {
                alert("Room data successfully updated!");
                window.location.reload(); 
            },
            error: function(xhr) {
                alert("Error updating room: " + xhr.responseText);
            }
        });
    });


    // --- 5. ЗБЕРЕЖЕННЯ РЕДАГОВАНИХ ДАНИХ КІМНАТИ (AJAX) ---
    $("#editRoomForm").submit(function(e) {
        e.preventDefault();

        // Тепер ми просто і надійно зчитуємо значення прямо з форми
        const updateData = {
            roomId: $("#editRoomIdInput").val(),
            houseId: $("#editHouseIdInput").val(), // Значення гарантовано заповнене з кроку 4
            roomName: $("#editRoomName").val(),
            roomColor: $("#editRoomColor").val()
        };

        console.log("Sending payload to server:", updateData); // Роздрукуйте це в консолі браузера (F12) перед відправкою

        $.ajax({
            type: "POST",
            url: "/editRoomForm",
            data: updateData,
            success: function(response) {
                alert("Room data successfully updated!");
                window.location.reload(); 
            },
            error: function(xhr) {
                alert("Error updating room: " + xhr.responseText);
            }
        });
    });

    // Клік на картку кімнати для встановлення її активною
    $(document).on("click", "#houseItemButton", function(e) {
        // Запобігаємо спрацьовуванню, якщо клікнули на кнопки дій (Edit/Remove)
        if ($(e.target).closest('.optionsButton').length) return;

        const roomId = $(this).attr("data-room-id");

        $.ajax({
            type: "POST",
            url: "/setActiveRoom",
            data: { roomId: roomId },
            success: function(response) {
                // Перезавантажуємо сторінку, щоб мідлвар перерахував activeRoom
                window.location.reload(); 
            },
            error: function(xhr) {
                alert("Error setting active room: " + xhr.responseText);
            }
        });
    });

        // Клік на кнопку "Add a device"
    $(".addRoom").click(function(e) {
        e.preventDefault();
        
        // КРИТИЧНО: Гарантуємо, що вікно вибору пристроїв стане видимим, а форма додавання — прихованою
        $("#devicePickerWindow").css("display", "flex");
        $("#deviceAddWindow").css("display", "none");
        
        $(".deviceWindowArea").fadeIn(200);
    });

    // Закриття вікна пристроїв
    $("#devicePickerOKButton").click(function(e) {
        e.preventDefault();
        $(".deviceWindowArea").fadeOut(200);
        $("#devicePickerWindow").css("display", "none");
    });

    // Перехід до форми створення нового заліза
    $("#devicePickerAdd").click(function(e) {
        e.preventDefault();
        $("#deviceAddWindow").css("display", "flex");
        $("#devicePickerWindow").css("display", "none");
    });

    // Скасування створення заліза
    $("#deviceAddWindowCancelButton").click(function(e) {
        e.preventDefault();
        $("#devicePickerWindow").css("display", "flex");
        $("#deviceAddWindow").css("display", "none");
    });

    // AJAX Сабміт реєстрації нового пристрою
    $("#addDeviceForm").submit(function(e) {
        e.preventDefault();

        const formData = {
            deviceName: $("#deviceName").val(),
            usageScheme: $("#usageScheme").val() 
        };

        $.ajax({
            type: "POST",
            url: "/addDeviceForm",
            data: formData,
            success: function(response) {
                window.location.reload(); // Refresh to let the middleware re-render arrays
            },
            error: function(xhr) {
                alert("Registration failed: " + xhr.responseText);
            }
        });
    });

/*          // ЗАХИСТ ВІД БАБЛІНГУ: Зупиняємо розповсюдження кліку від меню до основної картки
    $(document).on("click", ".dropdownActions", function(e) {
        // Цей рядок блокує передачу кліку вгору по дереву DOM до елемента .houseItemButton
        e.stopPropagation();
    });

    // Також переконайтеся, що кнопка відкриття самого меню (три крапки) не активує клік картки
    $(document).on("click", ".optionsButton", function(e) {
        e.stopPropagation();
        
        // Додатковий корисний код: перемикаємо видимість меню при кліку на три крапки
        $(this).find(".dropdownActions").toggle();
    });  */



});