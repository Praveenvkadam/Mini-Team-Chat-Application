
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
  console.log("connected", socket.id);

  socket.emit("signup", {
    username: "Tester",
    email: "test123@example.com",
    phone: "1234567890",
    password: "123456",
    confirmPassword: "123456"
  }, (response) => {
    console.log('signup response:', response);
    socket.close();
    process.exit(0);
  });
});

socket.on("connect_error", (err) => {
  console.error('connect_error', err.message);
});

