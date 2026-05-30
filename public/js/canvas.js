const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// --- 1. ОГОЛОШЕННЯ ГЛОБАЛЬНИХ КОНСТАНТ ТА СТАНІВ ---
const NODE_RADIUS = 25; // ВИПРАВЛЕНО: Додано відсутній радіус вузла

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

window.addEventListener("resize", () => {
    resizeCanvas();
});

// --- 2. ГОЛОВНИЙ ЦИКЛ МАЛЮВАННЯ (RENDER LOOP) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Додаємо красиве скруглене тло кольору antiquewhite з прозорістю всередині canvas
    ctx.fillStyle = "rgba(250, 235, 215, 0.25)"; 
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, canvas.height, 40); 
    ctx.fill();

    // А. Малюємо лінії зв'язків між пристроями
    ctx.lineWidth = 3;

    connections.forEach(conn => {
        // Гарантуємо точну відповідність назв полів із таблицею connections вашої БД
        const src = devices.find(d => d.deviceId === conn.deviceFromId);
        const tgt = devices.find(d => d.deviceId === conn.deviceToId);
        
        if (src && tgt) {
            ctx.beginPath();
            ctx.moveTo(src.canvasX, src.canvasY);
            ctx.lineTo(tgt.canvasX, tgt.canvasY);

            // Динамічний колір та пунктир лінії залежно від схеми usageScheme
            if (src.usageScheme === 'sensor') {
                ctx.strokeStyle = "rgba(0, 255, 166, 0.8)"; // Неоново-зелений для сенсорів
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

    // Б. Малюємо тимчасову лінію в момент перетягування (Shift + Drag)
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

    // В. Малюємо самі пристрої (Вузли)
    devices.forEach(device => {
        // Зовнішнє коло корпусу девайса
        ctx.beginPath();
        ctx.arc(device.canvasX, device.canvasY, NODE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = linkingSourceDevice === device ? "#ffa600" : "#2c2c2c";
         if (device.usageScheme === 'sensor') {
                ctx.strokeStyle = "rgba(0, 255, 166, 0.8)"; // Неоново-зелений для сенсорів
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

// --- 3. ОБРОБКА ІНТЕРАКТИВУ (MOUSE EVENTS) ---

function getDeviceAtPosition(x, y) {
    return devices.find(d => {
        const dist = Math.hypot(d.canvasX - x, d.canvasY - y);
        return dist <= NODE_RADIUS;
    });
}

// --- ОБНОВЛЕНИЙ ІНТЕРАКТИВНИЙ ДВИГУН (ДЛЯ ПК ТА МОБІЛЬНИХ) ---
// --- КОРЕКТНИЙ ІНТЕРАКТИВНИЙ ДВИГУН З ФІКСАЦІЄЮ СТАРТОВИХ КООРДИНАТ ---

let lastClickTime = 0; 
const DBL_CLICK_DELAY = 300; 

// Додаємо змінні для фіксації початкової позиції перед початком руху
let startX = 0;
let startY = 0;

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
            
            // КРИТИЧНО ДЛЯ БАЗИ ДАНИХ: Запам'ятовуємо ТОЧНУ стартову позицію елемента перед рухом
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
        // ВИПРАВЛЕНО: Порівнюємо поточну позицію миші зі СТАРТОВИМИ координатами (startX, startY)
        const distMoved = Math.hypot(startX - x, startY - y);
        
        console.log(`[Canvas DEBUG] Distance moved: ${distMoved}px`);

        if (distMoved > 5) {
            console.log(`[Canvas AJAX] Saving new coordinates for device ${draggedDevice.deviceId}: X=${draggedDevice.canvasX}, Y=${draggedDevice.canvasY}`);
            saveDeviceCoordinates(draggedDevice);
        }
        draggedDevice = null;
    }
});


/* 
canvas.addEventListener("mouseup", (e) => {
    if (draggedDevice) {
        saveDeviceCoordinates(draggedDevice);
        draggedDevice = null;
    }

    if (linkingSourceDevice) {
        const targetDevice = getDeviceAtPosition(mousePos.x, mousePos.y);

        if (targetDevice && targetDevice !== linkingSourceDevice) {
            createNewConnection(linkingSourceDevice.deviceId, targetDevice.deviceId);
        }
        linkingSourceDevice = null;
    }
}); */

// --- 4. СИНХРОНІЗАЦІЯ З СЕРВЕРОМ (AJAX) ---

function saveDeviceCoordinates(device) {
    $.post("/updateDeviceCoords", {
        deviceId: device.deviceId,
        x: Math.round(device.canvasX),
        y: Math.round(device.canvasY)
    });
}

function createNewConnection(sourceId, targetId) {
    // 1. Оновлюємо локальний масив
    connections.push({ deviceFromId: sourceId, deviceToId: targetId });

    // 2. Відправляємо надійний AJAX запит із точними назвами ключів
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


// Запуск рендер-циклу полотна
draw();
