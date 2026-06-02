/* 
    Логіка роботи partials/navbar.ejs
    Цей скрипт містить логіку роботи кнопок, меню та форм.
*/
$(document).ready(function() {
    /* Логіка роботи кнопок */
    $("#housePicker").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $("#housePickerWindowArea").fadeIn(200); 
    });

    $("#housePickerOKButton").click(function(e) {
        e.preventDefault();
        // Плавне зникнення
        $("#housePickerWindowArea").fadeOut(200);
    });

    $(".Account").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $("#accountDropdown").fadeIn(450); 
    });

    $("#housePicker").click(function(e) {
        e.preventDefault();
        $("#housePickerWindowArea").css("display", "flex");
    });

    $("#housePickerAdd").click(function(e) {
        e.preventDefault();
        $("#houseAddWindow").css("display", "flex");
        $("#housePickerWindow").css("display", "none");
    });

    $("#houseAddWindowCancelButton").click(function(e) {
        e.preventDefault();
        $("#housePickerWindow").css("display", "flex");
        $("#houseAddWindow").css("display", "none");
    });
    
    // Логіка роботи форм: валідація та надсилання даних на сервер.
    /* ФОРМА ВИБОРУ БУДИНКУ */
    $("#housePickerOKButton").click(function(e) {
        e.preventDefault();

        // Шукаємо картку, яку користувач виділив (яка має клас Primary)
        const $selectedHouse = $(".houseItemButton.Primary");

        // Якщо користувач нічого не вибрав — просимо вибрати
        if ($selectedHouse.length === 0) {
            /* alert("Будь ласка, виберіть будинок зі списку або додайте новий."); */
            return;
        }

        // Зчитуємо ID вибраного будинку
        const houseId = $selectedHouse.attr("data-id");

        if (!houseId) {
            console.error("ERROR: the chosen house's data-id attribute is missing.");
            alert("CLIENT ERROR: could not read the house ID.");
            return;
        }

        // ВІДПРАВЛЯЄМО ФІНАЛЬНИЙ ВИБІР НА СЕРВЕР
        $.ajax({
            type: "POST",
            url: "/houseSelect",
            data: { houseId: houseId },
            success: function(response) {
                console.log("House activated:", houseId);
                
                // Закриваємо модальне вікно
                $("#housePickerWindow").css("display", "none");
                $("#housePickerWindowArea").css("display", "none");
                
                // ПЕРЕЗАВАНТАЖУЄМО сторінку, щоб оновити шапку сайту
                window.location.reload(); 
            },
            error: function(xhr) {
                alert("ERROR saving the choice: " + xhr.responseText);
            }
        });
    });


    // Кнопка акаунт
    /* Поява меню при натисканні на відповідну кнопку */
    $(".accountHeader").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("#accountDropdown").fadeIn(200); 
    });

    // Якщо клікнули на саме посилання, дозволяємо йому працювати
    $("#accountDropdown a").click(function(e) {
        e.stopPropagation();
        var url = $(this).attr("href");
        if (url) {
            window.location.href = url;
        }
        return true; 
    });

    // 3. ЗАКРИТТЯ: Клік на кнопку закриття
    $("#accountDropdownClose").click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        $("#accountDropdown").fadeOut(200); 
    });

    // 4. ЗАКРИТТЯ ПО КЛІКУ ПОВЗ МЕНЮ: Клік у будь-якій іншій точці екрана
    $(document).click(function(e) {
        if (!$(e.target).closest('.Account').length) {
            $("#accountDropdown").fadeOut(200);
        }
    });

    /* Вихід з акаунту */
    $("#logoutButton").click(function(e) {
        e.preventDefault();
        
        // Відправляємо POST запит на сервер без перезавантаження сторінки
        $.post('/logout', function() {
            // Коли сервер успішно видалив сесію, перенаправляємо браузер на логін
            window.location.href = '/login';
        });
    });

    /* Форма додавання будинку */
    $("#addHouseForm").submit(function(e) {
        e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки

        removeErrors();
        let isValid = true;

        // Отримуємо значення та видаляємо зайві пробіли
        const houseNameValue = $("#houseName").val().trim();
        const houseLocationValue = $("#houseLocation").val().trim();
        const houseNameInput = document.getElementById('houseName');
        const houseLocationInput = document.getElementById('houseLocation');

        const formData = {
            houseName: houseNameValue,
            houseLocation: houseLocationValue
        };

        // Валідація назви будинку
        if (!houseNameValue) {
            showError(houseNameInput, 'This field must not be blank');
            isValid = false;
        }

        // Валідація локації будинку
        if (!houseLocationValue) {
            showError(houseLocationInput, 'This field must not be blank');
            isValid = false;
        }

        /* Якщо є помилки — зупиняємо виконання та НЕ викликаємо AJAX */
        if (!isValid) {
            return; 
        }

        // Відправка даних на сервер, якщо валідація успішна
        $.ajax({
            type: "POST",
            url: "/addHouseForm",
            data: formData,
            success: function(response) {
                /* Перезавантаження сторінки */
                window.location.reload(); 
            },
            error: function(xhr) {
                // Виводимо помилку
                const errorMsg = xhr.responseJSON ? xhr.responseJSON.message : "Помилка сервера";
                alert(errorMsg);
            }
        });
    });


    // 1. КЛІК ПО КАРТЦІ БУДИНКУ (Тільки візуальний вибір)
    $(document).on("click", ".houseItemButton", function(e) {
        // Якщо клікнули на три крапки або пункти меню дій — ігноруємо
        if ($(e.target).closest('.optionsButton').length) return;

        const $this = $(this);
        
        // Миттєво перемикаємо візуальний клас між сусідніми картками
        $(".houseItemButton").removeClass("Primary");
        $this.addClass("Primary");
    });


    // КЛІК ПО ТРЬОХ КРАПКАХ (Відкриття/закриття меню)
    $(document).on("click", ".optionsButton", function(e) {
        // Якщо клікнули на пункт меню (Edit/Remove) або текст всередині них — дозволяємо події йти далі
        if ($(e.target).closest('.dropdownItem').length) {
            return; 
        }
        
        e.stopPropagation(); // Ізолюємо лише клік по самих крапках
        
        const $this = $(this);
        $(".optionsButton").not($this).removeClass("active");
        $this.toggleClass("active");
    });

    // Закриваємо меню, якщо клікнули в будь-якому іншому місці екрану
    $(document).click(function() {
        $(".optionsButton").removeClass("active");
    });


    // КЛІК НА КНОПКУ EDIT (Редагувати)
    $(document).on("click", ".houseEditButton", function(e) {
        e.stopPropagation();

        const $houseRow = $(this).closest(".houseItemButton"); 
        
        const houseId = $houseRow.attr("data-id"); 

        $(".optionsButton").removeClass("active"); // ховаємо меню

        
        console.log("Editing house:", houseId);

        $("#houseEditWindow").css("display", "flex");
        $("#housePickerWindow").css("display", "none");
    });

    // КЛІК НА КНОПКУ Cancel (Назад)
    $(document).on("click", "#houseEditWindowCancelButton", function(e) {
        e.preventDefault();
        $("#housePickerWindow").css("display", "flex");
        $("#houseEditWindow").css("display", "none");
    });

    // 4. КЛІК НА КНОПКУ REMOVE (Видалити)
    $(document).on("click", ".removeHouseButton", function(e) {
        e.stopPropagation();
        
        const $houseRow = $(this).closest(".houseItemButton"); 
        const houseId = $houseRow.attr("data-id"); 

        $(".optionsButton").removeClass("active"); // ховаємо меню

        // Якщо ID не знайдено, ми миттєво побачимо це в консолі і не будемо марно штурмувати сервер
        if (!houseId) {
            console.error("ERROR: Could not read element's data-id:", $houseRow);
            alert("Client Error: House ID was not found.");
            return;
        }

        /* Якщо користувач підтверджує свій вибір, то виконується запит на сервер для видалення будинку з бази даних */
        if (confirm("You're about to remove the house. Are you sure?")) {
            $.ajax({
                type: "POST",
                url: "/houseRemove",
                data: { houseId: houseId },
                success: function(response) {
                    // Плавне зникнення з інтерфейсу без перезавантаження
                    $houseRow.fadeOut(300, function() { 
                        $(this).remove(); 
                    });
                },
                error: function(xhr) {
                    alert("Could not delete: " + xhr.responseText);
                }
            });
        }
    });

    /* Форма редагування будинку */
    $("#editHouseForm").submit(function(e) {
        e.preventDefault();

        $.ajax({
            type: "POST",
            url: "/editHouseForm",
            data: {
                houseId: $("#editHouseIdInput").val(), // приховане поле з ID
                houseName: $("#editHouseNameInput").val(),
                houseLocation: $("#editHouseLocationInput").val()
            },
            success: function(response) {
                /* alert("House information was successfully edited"); */
                window.location.reload(); // оновлюємо сторінку, щоб побачити зміни
            },
            error: function(xhr) {
                alert("Помилка: " + xhr.responseText);
            }
        });
    });



    

});

function showError(inputElement, message) {
    inputElement.style.borderColor = '#ff4d4d';
    inputElement.style.boxShadow = '0 0 5px rgba(255, 77, 77, 0.5)';
    
    // Створюємо об'єкт, для відображення тексту помилки
    const errorText = document.createElement('span'); 
    errorText.className = 'error-message';
    errorText.innerText = message;
    errorText.style.color = '#ff4d4d';
    errorText.style.fontSize = '0.85rem';
    errorText.style.display = 'block';
    errorText.style.gridColumn = '1 / -1';
    errorText.style.margin = '5px 0 5px 25px';

    // Вставляємо помилку одразу після контейнера .input-group (із захистом від null-помилок)
    const container = inputElement.closest('.input-group') || inputElement;
    container.after(errorText);
}

// Очищення стилів та текстів помилок
function removeErrors() {
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.Login input, form input').forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}