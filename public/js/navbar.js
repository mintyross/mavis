$(document).ready(function() {
    $("#housePicker").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $(".windowArea").fadeIn(200); 
    });

    $("#housePickerOKButton").click(function(e) {
        e.preventDefault();
        // Плавне зникнення
        $(".windowArea").fadeOut(200);
    });

    $(".Account").click(function(e) {
        e.preventDefault();
        // Плавна поява за 400 мілісекунд
        $("#accountDropdown").fadeIn(450); 
    });

});

$(document).ready(function() {
        $("#housePicker").click(function(e) {
            e.preventDefault();
            $(".windowArea").css("display", "flex");
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
        
        // 2. КЛІК НА КНОПКУ FINISH PICKING (Відправка вибраного будинку на сервер)
        $("#housePickerOKButton").click(function(e) {
            e.preventDefault();

            // Шукаємо картку, яку користувач виділив (яка має клас Primary)
            const $selectedHouse = $(".houseItemButton.Primary");

            // Якщо користувач нічого не вибрав — просимо вибрати
            if ($selectedHouse.length === 0) {
                alert("Будь ласка, виберіть будинок зі списку або додайте новий.");
                return;
            }

            // Зчитуємо ID вибраного будинку
            const houseId = $selectedHouse.attr("data-id");

            if (!houseId) {
                console.error("Помилка: У вибраного будинку відсутній атрибут data-id");
                alert("Помилка клієнта: Не вдалося зчитати ID будинку.");
                return;
            }

            // ВІДПРАВЛЯЄМО ФІНАЛЬНИЙ ВИБІР НА СЕРВЕР
            $.ajax({
                type: "POST",
                url: "/houseSelect",
                data: { houseId: houseId },
                success: function(response) {
                    console.log("Будинок остаточно активовано на сервері:", houseId);
                    
                    // Закриваємо модальне вікно (якщо потрібно)
                    $("#housePickerWindow").css("display", "none");
                    $(".windowArea").css("display", "none");
                    
                    // ПЕРЕЗАВАНТАЖУЄМО сторінку, щоб оновити шапку сайту (logoTextContainer)
                    window.location.reload(); 
                },
                error: function(xhr) {
                    alert("Помилка збереження вибору: " + xhr.responseText);
                }
            });
        });

  
        // 1. ВІДКРИТТЯ: Клікам ТІЛЬКИ на шапку акаунта
        $(".accountHeader").click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            $("#accountDropdown").fadeIn(200); 
        });

        // 2. ДОЗВІЛ НА КЛІК: Якщо клікнули на саме посилання, дозволяємо йому працювати
        $("#accountDropdown a").click(function(e) {
            e.stopPropagation(); // Не даємо події піднятися до батьківських елементів
            
            // Перестраховка: якщо браузер все одно блокує перехід, робимо його примусово через JS
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

        $("#logoutButton").click(function(e) {
            e.preventDefault();
            
            // Відправляємо POST запит на сервер без перезавантаження сторінки
            $.post('/logout', function() {
                // Коли сервер успішно видалив сесію, перенаправляємо браузер на логін
                window.location.href = '/login';
            });
        });

        $("#addHouseForm").submit(function(e) {
            e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки

            const formData = {
                houseName: $("#houseName").val(),
                houseLocation: $("#houseLocation").val()
            };

            $.ajax({
                type: "POST",
                url: "/addHouseForm",
                data: formData,
                success: function(response) {
                    alert("Будинок успішно додано!");
                    // Тут ви можете оновити список будинків на екрані або просто перезавантажити сторінку:
                    window.location.reload(); 
                },
                error: function(xhr) {
                    // Виводимо помилку (наприклад, "House already exists")
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


        // 2. КЛІК ПО ТРЬОХ КРАПКАХ (Відкриття/закриття меню)
        $(document).on("click", ".optionsButton", function(e) {
            // Якщо клікнули на пункт меню (Edit/Remove) або текст всередині них — дозволяємо події йти далі
            if ($(e.target).closest('.dropdownItem').length) {
                return; 
            }
            
            e.stopPropagation(); // Тепер ізолюємо лише клік по самих крапках
            
            const $this = $(this);
            $(".optionsButton").not($this).removeClass("active");
            $this.toggleClass("active");
        });

        // 2. Закриваємо меню, якщо клікнули в будь-якому іншому місці екрану (лишається без змін)
        $(document).click(function() {
            $(".optionsButton").removeClass("active");
        });


        // 3. КЛІК НА КНОПКУ EDIT (Редагувати)
        $(document).on("click", ".houseEditButton", function(e) {
            e.stopPropagation();

            // Переконайтеся, що клас вашої картки будинку збігається (у EJS ми писали .house-item-btn або .Button)
            const $houseRow = $(this).closest(".houseItemButton"); 
            
            // НАДІЙНЕ ЗЧИТУВАННЯ ID (через атрибут data-id, який ми вивели в HTML)
            const houseId = $houseRow.attr("data-id"); 

            $(".optionsButton").removeClass("active"); // ховаємо меню

            
            console.log("Редагувати будинок:", houseId);
            // Тут логіка відкриття форми редагування

            $("#houseEditWindow").css("display", "flex");
            $("#housePickerWindow").css("display", "none");
        });

        // 3. КЛІК НА КНОПКУ EDIT (Редагувати)
        $(document).on("click", "#houseEditWindowCancelButton", function(e) {
            e.preventDefault();
            $("#housePickerWindow").css("display", "flex");
            $("#houseEditWindow").css("display", "none");
        });

        // 4. КЛІК НА КНОПКУ REMOVE (Видалити)
        $(document).on("click", ".removeHouseButton", function(e) {
            e.stopPropagation();
            
            // Переконайтеся, що клас вашої картки будинку збігається (у EJS ми писали .house-item-btn або .Button)
            const $houseRow = $(this).closest(".houseItemButton"); 
            
            // НАДІЙНЕ ЗЧИТУВАННЯ ID (через атрибут data-id, який ми вивели в HTML)
            const houseId = $houseRow.attr("data-id"); 

            $(".optionsButton").removeClass("active"); // ховаємо меню

            // Якщо ID не знайдено, ми миттєво побачимо це в консолі і не будемо марно штурмувати сервер
            if (!houseId) {
                console.error("Помилка: Не вдалося знайти атрибут data-id у елемента:", $houseRow);
                alert("Помилка клієнта: ID будинку не знайдено у верстці!");
                return;
            }

            if (confirm("Ви впевнені, що хочете видалити цей будинок?")) {
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
                        alert("Не вдалося видалити: " + xhr.responseText);
                    }
                });
            }
        });

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
                    alert("Дані будинку успішно оновлено!");
                    window.location.reload(); // оновлюємо сторінку, щоб побачити зміни
                },
                error: function(xhr) {
                    alert("Помилка: " + xhr.responseText);
                }
            });
        });



        

    });