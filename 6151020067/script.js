
// Khai báo các mảng để lưu trữ dữ liệu
const temperatureData = [];
const humidityData = [];
const timeData = [];

// Khai báo biến trạng thái đăng nhập
let isLoggedIn = false;

// Đăng nhập
document.getElementById("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    if (username === "halo" && password === "halo") {
        isLoggedIn = true; // Đặt trạng thái đăng nhập
        document.querySelector(".login-container").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        document.getElementById("sidebar").style.display = "block";
        document.getElementById("device-control").style.display = "block"; // Hiển thị điều khiển thiết bị ban đầu
    } else {
        alert("Tên người dùng hoặc mật khẩu không đúng!");
    }
});

// Đăng xuất
document.getElementById("logout").addEventListener("click", function(event) {
    event.preventDefault();
    isLoggedIn = false; // Đặt lại trạng thái đăng nhập
    document.querySelector(".login-container").style.display = "block";
    document.getElementById("mainContent").style.display = "none";
    document.getElementById("sidebar").style.display = "none";
});

// Điều khiển đèn
const Den = document.getElementById('Den');
document.getElementById('BatDen').addEventListener('click', () => {
    Den.style.backgroundImage = "url('Den sang.png')";
    sendDenCommand('1');
});
document.getElementById('TatDen').addEventListener('click', () => {
    Den.style.backgroundImage = "url('Den tat.png')";
    sendDenCommand('0');
});

// Điều khiển quạt
const Quat = document.getElementById('Quat');
document.getElementById('BatQuat').addEventListener('click', () => {
    Quat.style.backgroundImage = "url('Quat bat.png')";
    sendQuatControlCommand('b');
});
document.getElementById('TatQuat').addEventListener('click', () => {
    Quat.style.backgroundImage = "url('Quat tat.png')";
    sendQuatControlCommand('t');
});

// Điều khiển cửa
const Cua = document.getElementById('Cua');
document.getElementById('MoCua').addEventListener('click', () => {
    Cua.style.backgroundImage = "url('Cua mo.png')";
    sendCuaCommand('m');
});
document.getElementById('DongCua').addEventListener('click', () => {
    Cua.style.backgroundImage = "url('Cua dong.png')";
    sendCuaCommand('d');
});

// MQTT để đọc trạng thái thiết bị
const mqttClient = new Paho.MQTT.Client("mqtt-dashboard.com", 8000, "clientId-" + parseInt(Math.random() * 100, 10));

mqttClient.onConnectionLost = function(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("Lỗi mất kết nối: " + responseObject.errorMessage);
        alert("Mất kết nối tới MQTT broker!");
    }
};

mqttClient.onMessageArrived = function(message) {
    if (message.destinationName === "TNT/data1") {
        const payload = JSON.parse(message.payloadString);

        // Lưu trữ dữ liệu vào mảng
        const time = new Date(payload.timestamp);
        timeData.push(time);
        temperatureData.push(payload.temperature);
        humidityData.push(payload.humidity);

        // Giữ cho mảng dữ liệu không quá dài
        if (timeData.length > 100) {
            timeData.shift();
            temperatureData.shift();
            humidityData.shift();
        }

        // Cập nhật hiển thị nhiệt độ và độ ẩm
        document.getElementById("temperature").textContent = payload.temperature || "--";
        document.getElementById("humidity").textContent = payload.humidity || "--";

        // Cập nhật biểu đồ
        updateCharts();
    } else if (message.destinationName === "TNT/smoke") {
        const smokeLevel = parseFloat(message.payloadString);
        document.getElementById('smoke').textContent = smokeLevel + ' ppm';
        if (isLoggedIn && smokeLevel > 50005000) { // Kiểm tra ngưỡng khói và trạng thái đăng nhập
            alert("Cảnh báo: Nồng độ khói vượt ngưỡng!");
        }
    } else if (message.destinationName === "TNT/Quat") {
        const quatStatus = message.payloadString === 'b' ? 'bat' : 'tat';
        Quat.style.backgroundImage = `url('Quat ${quatStatus}.png')`;
    } else if (message.destinationName === "TNT/Den") {
        const denStatus = message.payloadString === '1' ? 'sang' : 'tat';
        Den.style.backgroundImage = `url('Den ${denStatus}.png')`;
    } else if (message.destinationName === "TNT/Cua") {
        const cuaStatus = message.payloadString === 'm' ? 'mo' : 'dong';
        Cua.style.backgroundImage = `url('Cua ${cuaStatus}.png')`;
    }
};

mqttClient.connect({
    onSuccess: () => {
        console.log("Kết nối thành công tới MQTT broker");
        alert("Kết nối thành công tới MQTT broker");
        mqttClient.subscribe("TNT/data1");
        mqttClient.subscribe("TNT/smoke");
        mqttClient.subscribe("TNT/Quat");
        mqttClient.subscribe("TNT/Den");
        mqttClient.subscribe("TNT/Cua");
    },
    onFailure: (error) => {
        console.log("Kết nối thất bại: " + error.errorMessage);
        alert("Kết nối tới MQTT broker thất bại!");
    }
});

function sendDenCommand(command) {
    const message = new Paho.MQTT.Message(command);
    message.destinationName = "TNT/Den";
    mqttClient.send(message);
}

function sendQuatControlCommand(command) {
    const message = new Paho.MQTT.Message(command);
    message.destinationName = "TNT/Quat";
    mqttClient.send(message);
}

function sendCuaCommand(command) {
    const message = new Paho.MQTT.Message(command);
    message.destinationName = "TNT/Cua";
    mqttClient.send(message);
}

// Hiển thị nội dung tương ứng khi nhấn vào menu
document.getElementById('device-control-link').addEventListener('click', function() {
    document.getElementById('device-control').style.display = 'block';
    document.getElementById('chart-container').style.display = 'none';
});

document.getElementById('chart-link').addEventListener('click', function() {
    document.getElementById('device-control').style.display = 'none';
    document.getElementById('chart-container').style.display = 'flex';
    temperatureChart.update(); // Cập nhật biểu đồ khi hiển thị
    humidityChart.update(); // Cập nhật biểu đồ khi hiển thị
});

// Thiết lập biểu đồ nhiệt độ
const tempCtx = document.getElementById('temperatureChart').getContext('2d');
const temperatureChart = new Chart(tempCtx, {
type: 'line', // Đảm bảo loại biểu đồ là 'line' để nối các điểm với nhau
data: {
labels: timeData,
datasets: [{
    label: 'Nhiệt độ (°C)',
    borderColor: 'red',
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
    data: temperatureData
}]
},
options: {
scales: {
    x: {
        type: 'realtime',
        realtime: {
            delay: 2000,
            onRefresh: chart => {
                if (temperatureData.length > 0) {
                    chart.data.labels.push(new Date());
                    chart.data.datasets[0].data.push({
                        x: Date.now(),
                        y: temperatureData[temperatureData.length - 1] // Lấy giá trị nhiệt độ thực
                    });
                }
            }
        },
        title: {
            display: true,
            text: 'Thời gian'
        }
    },
    y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'Nhiệt độ (°C)'
        }
    }
}
}
});




// Thiết lập biểu đồ độ ẩm
const humidityCtx = document.getElementById('humidityChart').getContext('2d');
const humidityChart = new Chart(humidityCtx, {
type: 'line', // Đảm bảo loại biểu đồ là 'line' để nối các điểm với nhau
data: {
labels: timeData,
datasets: [{
    label: 'Độ ẩm (%)',
    borderColor: 'blue',
    fill: false,
    borderWidth: 2,
    pointRadius: 2,
    data: humidityData
}]
},
options: {
scales: {
    x: {
        type: 'realtime',
        realtime: {
            delay: 2000,
            onRefresh: chart => {
                if (humidityData.length > 0) {
                    chart.data.labels.push(new Date());
                    chart.data.datasets[0].data.push({
                        x: Date.now(),
                        y: humidityData[humidityData.length - 1] // Lấy giá trị độ ẩm thực
                    });
                }
            }
        },
        title: {
            display: true,
            text: 'Thời gian'
        }
    },
    y: {
        beginAtZero: true,
        title: {
            display: true,
            text: 'Độ ẩm (%)'
        }
    }
}
}
});

// Hàm cập nhật biểu đồ
function updateCharts() {
temperatureChart.update();
humidityChart.update();
}