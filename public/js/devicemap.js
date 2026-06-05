/* 
    Скрипт логіки сторінки /devicemap
    Він містить логіку роботи кнопок, меню та форм дії кімнат та пристроїв будинку.
*/
$(document).ready(function() {
    $(".roomPicker").click(function(e) {
        e.preventDefault();
        
        // Скидаємо стани, показуємо головне вікно вибору, ховаємо вікна додавання/редагування
        $("#roomPickerWindow").css("display", "flex");
        $("#roomAddWindow").css("display", "none");
        $("#roomEditWindow").css("display", "none");
        
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

    /* Форма додавання кімнати */
    $("#addRoomForm").submit(function(e) {
        e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки
        removeErrors();
        let isValid = true;

        const formData = {
            roomName: $("#roomName").val(),
            roomColor: $("#roomColor").val()
        };

        const roomNameInput = document.getElementById('roomName');

        if (!roomNameInput.value) {
            showError(roomNameInput, "This field must not be blank");
            isValid = false;

        }

        if (!isValid) {
            return;
        }

        $.ajax({
            type: "POST",
            url: "/addRoomForm",
            data: formData,
            success: function(response) {
                /* alert("The room was successfully added"); */
                window.location.reload(); 
            },
            error: function(xhr) {
                // Виводимо помилку
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "Sever error";
                alert(errorMsg);
            }
        });
    });

    // Форма видалення кімнати
    // Використовуємо делегування через body, щоб уникнути конфліктів при утриманні e.stopPropagation()
    $(document).on("click", ".removeRoomButton", function(e) {
        // Зупиняємо розповсюдження події кліку до базової картки кімнати
        e.stopPropagation();

        // Піднімаємося по DOM-дереву до головної картки
        const $roomCard = $(this).closest(".houseItemButton"); 

        // Читаємо значення атрибутів
        const roomId = $roomCard.attr("data-room-id"); 
        const houseId = $roomCard.attr("data-house-id"); 

        // Ховаємо випадаюче меню опцій
        $(".optionsButton").removeClass("active"); 

        // Перевірочний лог для консолі розробника
        console.log("Attempting to remove room:", roomId, " at house:", houseId);

        if (!roomId || !houseId) {
            console.error("ERROR reading IDs in room:", roomId, "at house:", houseId);
            alert("CLIENT ERROR: could not read house or room ID.");
            return;
        }

        /* Підтвердження видалення кімнати */
        if (confirm("You are about to delete the room. Are you sure?")) {
            $.ajax({
                type: "POST",
                url: "/roomRemove",
                data: { roomId: roomId, houseId: houseId },
                success: function(response) {
                    // Плавне зникнення картки з екрану
                    $roomCard.fadeOut(300, function() { 
                        $(this).remove(); 
                    });
                    window.location.reload();
                },
                error: function(xhr) {
                    alert("ERROR: could not delete room: " + xhr.responseText);
                }
            });
        }
    });

        // Форма видалення пристрою
    $(document).on("click", ".removeDeviceButton", function(e) {
        // Зупиняємо баблінг події кліку до базової картки
        e.stopPropagation();

        // Піднімаємося по DOM-дереву до головної картки пристрою
        const $deviceCard = $(this).closest(".houseItemButton"); 

        // Читаємо значення атрибутів безпосередньо з HTML картки пристрою
        const deviceId = $deviceCard.attr("data-device-id"); 

        // Ховаємо випадаюче меню опцій (три крапки)
        $(".optionsButton").removeClass("active"); 

        // Перевірочний лог для консолі розробника
        console.log("Attempting to delete device:", deviceId);

        // Валідація наявності ID
        if (!deviceId) {
            console.error("ERROR reading the device ID:", deviceId);
            alert("CLIENT ERROR: device id could not be found.");
            return;
        }

        // Підтвердження дії користувачем
        if (confirm("You are about to delete the device. Are sure?")) {
            $.ajax({
                type: "POST",
                url: "/deviceRemove", // Окремий маршрут для пристроїв
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
                    alert("Could not delete the device: " + xhr.responseText);
                }
            });
        }
    });

    // Кнопка Edit
    $(document).on("click", "#roomEditWindowCancelButton", function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomEditWindow").css("display", "none");
    });

    /* Форма редагування кімнати */
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

        console.log("Editing room:", { roomId, houseId, roomName, roomColor });

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

    $(document).on("click", "#roomEditWindowCancelButton", function(e) {
        e.preventDefault();
        $("#roomPickerWindow").css("display", "flex");
        $("#roomEditWindow").css("display", "none");
    });

    // Збереження редагованих даних кімнати за допомогою ajax
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
                /* alert("Room data successfully updated!"); */
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

    // Клік на кнопку додавання девайсу
    $(".addRoom").click(function(e) {
        e.preventDefault();
        
        // Вікно вибору пристроїв стане видимим, а форма додавання — прихованою
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

    // Форма реєстрації нового пристрою за допомогою ajax
    $("#addDeviceForm").submit(function(e) {
        e.preventDefault();
        removeErrors();
        let isValid = true;

        const formData = {
            deviceName: $("#deviceName").val(),
            usageScheme: $("#usageScheme").val() 
        };

        const deviceNameInput = document.getElementById('deviceName');

        if (!deviceNameInput.value) {
            showError(deviceNameInput, "This field must not be blank");
            isValid = false;

        }

        if (!isValid) {
            return;
        }

        $.ajax({
            type: "POST",
            url: "/addDeviceForm",
            data: formData,
            success: function(response) {
                window.location.reload();
            },
            error: function(xhr) {
                alert("Registration failed: " + xhr.responseText);
            }
        });
    });
});

function showError(inputElement, message) {
    inputElement.style.borderColor = '#ff4d4d';
    inputElement.style.boxShadow = '0 0 5px rgba(255, 77, 77, 0.5)';
    
    const errorText = document.createElement('span'); 
    errorText.className = 'error-message';
    errorText.innerText = message;
    errorText.style.color = '#ff4d4d';
    errorText.style.fontSize = '0.85rem';
    errorText.style.display = 'block';
    errorText.style.gridColumn = '1 / -1';
    errorText.style.margin = '5px 0 5px 25px';

    const container = inputElement.closest('.input-group') || inputElement;
    container.after(errorText);
}

function removeErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.Login input, form input').forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}