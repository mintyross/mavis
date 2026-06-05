/* 
    Скрипт містить логіку роботи елементу canvas сторінки /devicemap.

    Створює поле, на якому можна взаємодіяти з девайсами: 
    змінювати їхнє місцеположення відносно елементу та створювати зв'язки між девайсами.
*/

/* Отримуємо елемент та налаштовуємо canvas */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Оголошення констант, змінних та станів
const NODE_RADIUS = 25;

// Ініціалізуємо робочі масиви даними, які EJS передав у глобальний scope
let devices = typeof serverDevices !== 'undefined' ? [...serverDevices] : [];
let connections = typeof serverConnections !== 'undefined' ? [...serverConnections] : [];

let draggedDevice = null;
let linkingSourceDevice = null; 
let mousePos = { x: 0, y: 0 };

// Автоматичне підлаштування внутрішньої роздільної здатності під CSS розміри
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
resizeCanvas();

/* Створюємо лісенер зміни розміру елементу */
window.addEventListener("resize", () => {
    resizeCanvas();
});

// Головний цикл малювання Render Loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Скруглене тло з прозорістю всередині canvas
    ctx.fillStyle = "rgba(250, 235, 215, 0.25)"; 
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 40); 
    ctx.fill();

    // Малюємо лінії зв'язків між пристроями
    ctx.lineWidth = 3;

    connections.forEach(conn => {
        const src = devices.find(d => d.deviceId === conn.deviceFromId);
        const tgt = devices.find(d => d.deviceId === conn.deviceToId);
        
        if (src && tgt) {
            ctx.beginPath();
            ctx.moveTo(src.canvasX, src.canvasY);
            ctx.lineTo(tgt.canvasX, tgt.canvasY);

            // Динамічний колір та пунктир лінії залежно від схеми usageScheme
            if (src.usageScheme === 'sensor') {
                ctx.strokeStyle = "rgba(0, 255, 166, 0.8)"; // Зелений для сенсорів
                ctx.setLineDash([4, 4]); 
            } else if (src.usageScheme === 'dimmer') {
                ctx.strokeStyle = "rgba(255, 0, 200, 0.8)";  // Маджента для димерів
                ctx.setLineDash([]); 
            } else {
                ctx.strokeStyle = "rgba(0, 166, 255, 0.8)";  // Синій колір для On/Off
                ctx.setLineDash([]);
            }

            ctx.stroke();
        }
    });

    // Малюємо тимчасову лінію в момент перетягування
    if (linkingSourceDevice) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#ffa600"; // Помаранчева лінія створення зв'язку
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(linkingSourceDevice.canvasX, linkingSourceDevice.canvasY);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
    }

    ctx.setLineDash([]); // Скидаємо пунктир перед малюванням кіл пристроїв

    // Малюємо самі пристрої (Вузли)
    devices.forEach(device => {
        // Зовнішнє коло корпусу девайса
        ctx.beginPath();
        ctx.arc(device.canvasX, device.canvasY, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = linkingSourceDevice === device ? "#ffa600" : "#2c2c2c";
         if (device.usageScheme === 'sensor') {
                ctx.strokeStyle = "rgba(0, 255, 166, 0.8)"; // Зелений для сенсорів
                ctx.setLineDash([]); 
            } else if (device.usageScheme === 'dimmer') {
                ctx.strokeStyle = "rgba(255, 0, 200, 0.8)";  // Маджента для димерів
                ctx.setLineDash([]); 
            } else {
                ctx.strokeStyle = "rgba(0, 166, 255, 0.8)";  // Синій колір для On/Off
                ctx.setLineDash([]);
            }
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();

        // Текст назви пристрою
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(device.deviceName.substring(0, 8), device.canvasX, device.canvasY + 4);
    });

    requestAnimationFrame(draw);
}

// Обробка інтеракції з елементом (Mouse events)

function getDeviceAtPosition(x, y) {
    return devices.find(d => {
        const dist = Math.hypot(d.canvasX - x, d.canvasY - y);
        return dist <= NODE_RADIUS;
    });
}

let lastClickTime = 0; 
const DBL_CLICK_DELAY = 300; 

// Додаємо змінні для фіксації початкової позиції перед початком руху
let startX = 0;
let startY = 0;

/* 
    Дії при натиску на кнопку миші 
    Якщо даблклік - входимо у режим connections
*/
canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedDevice = getDeviceAtPosition(x, y);
    const currentTime = new Date().getTime();
    
    const isDoubleClick = (currentTime - lastClickTime < DBL_CLICK_DELAY);
    lastClickTime = currentTime; 

    if (clickedDevice) {
        if (isDoubleClick) {
            console.log(`[Canvas UI] Connection Mode ACTIVE for: ${clickedDevice.deviceName}`);
            linkingSourceDevice = clickedDevice;
            draggedDevice = null; 
            return;
        }

        if (linkingSourceDevice && linkingSourceDevice !== clickedDevice) {
            createNewConnection(linkingSourceDevice.deviceId, clickedDevice.deviceId);
            linkingSourceDevice = null; 
            return;
        }

        if (linkingSourceDevice !== clickedDevice) {
            draggedDevice = clickedDevice;
            
            // Запам'ятовуємо стартову позицію елемента перед рухом
            startX = clickedDevice.canvasX;
            startY = clickedDevice.canvasY;
        }
    } else {
        if (linkingSourceDevice) {
            console.log("[Canvas UI] Connection Mode canceled.");
            linkingSourceDevice = null;
        }
    }
});

/* Перетягування елементів */
canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

    if (draggedDevice) {
        draggedDevice.canvasX = mousePos.x;
        draggedDevice.canvasY = mousePos.y;
    }
});

canvas.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedDevice) {
        const distMoved = Math.hypot(startX - x, startY - y);
        
        /* console.log(`[Canvas DEBUG] Distance moved: ${distMoved}px`); */

        if (distMoved > 5) {
            console.log(`[Canvas AJAX] Saving new coordinates for device ${draggedDevice.deviceId}: X=${draggedDevice.canvasX}, Y=${draggedDevice.canvasY}`);
            saveDeviceCoordinates(draggedDevice);
        }
        draggedDevice = null;
    }
});

// Передача даних на сервер за допомогою AJAX

function saveDeviceCoordinates(device) {
    $.post("/updateDeviceCoords", {
        deviceId: device.deviceId,
        x: Math.round(device.canvasX),
        y: Math.round(device.canvasY)
    });
}

function createNewConnection(sourceId, targetId) {
    // Оновлюємо локальний масив
    connections.push({ deviceFromId: sourceId, deviceToId: targetId });

    // Відправляємо AJAX запит із назвами ключів
    $.ajax({
        type: "POST",
        url: "/connectDevices",
        data: { 
            deviceFromId: sourceId, 
            deviceToId: targetId 
        },
        error: function(xhr) {
            alert("Error linking devices: " + xhr.responseText);
            window.location.reload(); 
        }
    });
}


// Рендер елемента
draw();