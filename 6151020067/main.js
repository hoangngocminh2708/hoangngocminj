document.addEventListener('DOMContentLoaded', () => {
    const host = 'mqtt-dashboard.com'; // Broker MQTT
    const port = 8000; // Cổng WebSocket
    const topics = {
        den: 'TNT/Den',
        quat: 'TNT/Quat',
        cua: 'TNT/Cua',
        data: 'TNT/data1',
        smoke: 'TNT/smoke',
    };

    let client;
    let connected = false; // Trạng thái kết nối MQTT

    // Kết nối đến MQTT broker
    function connectToBroker() {
        client = new Paho.MQTT.Client(
            `wss://${host}:${port}/mqtt`,
            `webClient_${Math.random().toString(36).substring(7)}`
        );

        client.onConnectionLost = (responseObject) => {
            if (responseObject.errorCode !== 0) {
                console.error('Mất kết nối:', responseObject.errorMessage);
                connected = false;
                setTimeout(connectToBroker, 5000); // Tự động kết nối lại sau 5 giây
            }
        };

        client.onMessageArrived = handleIncomingMessage;

        client.connect({
            useSSL: true,
            onSuccess: () => {
                console.log('Kết nối thành công tới MQTT broker');
                connected = true;
                Object.values(topics).forEach((topic) => client.subscribe(topic));
                updateDeviceStates(); // Cập nhật trạng thái khi kết nối
                document.getElementById('mainContent').style.display = 'block'; // Hiện giao diện chính sau khi kết nối thành công
            },
            onFailure: (error) => {
                console.error('Lỗi kết nối MQTT:', error.errorMessage);
                setTimeout(connectToBroker, 5000); // Thử lại sau 5 giây
            },
        });
    }

    // Xử lý tin nhắn đến
    function handleIncomingMessage(message) {
        console.log(`Nhận tin nhắn từ topic '${message.destinationName}': ${message.payloadString}`);
        switch (message.destinationName) {
            case topics.data:
                updateSensorData(JSON.parse(message.payloadString));
                break;
            case topics.smoke:
                updateSmokeData(parseFloat(message.payloadString));
                break;
            case topics.cua:
                updateCuaState(message.payloadString);
                break;
            case topics.den:
                updateDenState(message.payloadString);
                break;
            case topics.quat:
                updateQuatState(message.payloadString);
                break;
        }
    }

    // Cập nhật dữ liệu cảm biến
    function updateSensorData(data) {
        document.getElementById('temperature').textContent = data.temperature ? data.temperature.toFixed(1) : '--';
        document.getElementById('humidity').textContent = data.humidity ? data.humidity.toFixed(1) : '--';
        addDataToChart(data.temperature, data.humidity);
    }

    function updateSmokeData(smokeValue) {
        document.getElementById('smoke').textContent = smokeValue.toFixed(1);
    }

    // Cập nhật trạng thái cửa
    function updateCuaState(state) {
        const cuaElement = document.getElementById('Cua');
        cuaElement.style.backgroundImage = state === 'm' ? "url('Cua mo.png')" : "url('Cua dong.png')";
    }

    // Cập nhật trạng thái đèn
    function updateDenState(state) {
        const denElement = document.getElementById('Den');
        denElement.style.backgroundImage = state === '1' ? "url('Den sang.png')" : "url('Den tat.png')";
    }

    // Cập nhật trạng thái quạt
    function updateQuatState(state) {
        const quatElement = document.getElementById('Quat');
        quatElement.style.backgroundImage = state === 'b' ? "url('Quat bat.png')" : "url('Quat tat.png')";
    }

    // Cập nhật trạng thái thiết bị ngay khi kết nối
    function updateDeviceStates() {
        handleIncomingMessage({
            destinationName: topics.quat,
            payloadString: "t" // Ví dụ trạng thái quạt
        });

        handleIncomingMessage({
            destinationName: topics.den,
            payloadString: "0" // Ví dụ trạng thái đèn
        });

        handleIncomingMessage({
            destinationName: topics.cua,
            payloadString: "m" // Ví dụ trạng thái cửa
        });
    }

    // Gửi lệnh MQTT
    function sendCommand(topic, command) {
        if (!connected) {
            console.warn('MQTT chưa kết nối, không thể gửi lệnh');
            return;
        }
        const message = new Paho.MQTT.Message(command);
        message.destinationName = topic;
        client.send(message);
        console.log(`Gửi lệnh: ${command} tới topic: ${topic}`);
    }

    // Gán sự kiện cho nút
    document.getElementById('BatDen').addEventListener('click', () => sendCommand(topics.den, '1'));
    document.getElementById('TatDen').addEventListener('click', () => sendCommand(topics.den, '0'));
    document.getElementById('BatQuat').addEventListener('click', () => sendCommand(topics.quat, 'b'));
    document.getElementById('TatQuat').addEventListener('click', () => sendCommand(topics.quat, 't'));
    document.getElementById('MoCua').addEventListener('click', () => sendCommand(topics.cua, 'm'));
    document.getElementById('DongCua').addEventListener('click', () => sendCommand(topics.cua, 'd'));

    // Kết nối MQTT
    connectToBroker();

    // Chart.js setup
    const ctx = document.getElementById('temperatureHumidityChart').getContext('2d');
    const temperatureHumidityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // Thời gian sẽ được thêm vào đây
            datasets: [
                {
                    label: 'Nhiệt độ (°C)',
                    data: [],
                    borderColor: 'red',
                    fill: false,
                    yAxisID: 'temperature',
                },
                {
                    label: 'Độ ẩm (%)',
                    data: [],
                    borderColor: 'blue',
                    fill: false,
                    yAxisID: 'humidity',
                },
            ],
        },
        options: {
            scales: {
                y: [
                    {
                        id: 'temperature',
                        type: 'linear',
                        position: 'left',
                        scaleLabel: {
                            display: true,
                            labelString: 'Nhiệt độ (°C)',
                        },
                    },
                    {
                        id: 'humidity',
                        type: 'linear',
                        position: 'right',
                        scaleLabel: {
                            display: true,
                            labelString: 'Độ ẩm (%)',
                        },
                    },
                ],
                x: [
                    {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            tooltipFormat: 'll HH:mm',
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Thời gian',
                        },
                    },
                ],
            },
        },
    });

    // Add data to Chart.js
    function addDataToChart(temperature, humidity) {
        const now = new Date();
        temperatureHumidityChart.data.labels.push(now);
        temperatureHumidityChart.data.datasets[0].data.push(temperature);
        temperatureHumidityChart.data.datasets[1].data.push(humidity);
        
        // Giới hạn số lượng điểm dữ liệu trên biểu đồ
        if (temperatureHumidityChart.data.labels.length > 100) {
            temperatureHumidityChart.data.labels.shift();
            temperatureHumidityChart.data.datasets[0].data.shift();
            temperatureHumidityChart.data.datasets[1].data.shift();
        }
        
        temperatureHumidityChart.update();
    }
});