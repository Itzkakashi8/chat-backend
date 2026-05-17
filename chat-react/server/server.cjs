const path = require("path");
const MSG_FILE = path.join(__dirname, "mensajes.json");

const nodemailer = require("nodemailer");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const express = require("express");
const app = express();
const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

const fs = require("fs");

// 📧 EMAIL
const transporter = nodemailer.createTransport({
  service: "gmail", // 🔥 más estable
  auth: {
    user: "bejaranojasonblue@gmail.com",
    pass: "lagd jyam wqkc wysb"
  }
});

app.use(express.static("public"));

// 👥 USUARIOS EN LÍNEA
let users = [];
let usersMap = {};

// 🔐 CUENTAS (LOGIN)
let accounts = {
  admin: "1234" // 🔥 admin fijo
};

// 📁 MENSAJES
if (!fs.existsSync(MSG_FILE)) {
  fs.writeFileSync(MSG_FILE, "[]", "utf-8");
}

function getMessages() {
  return JSON.parse(fs.readFileSync(MSG_FILE, "utf-8"));
}

function saveMessages(data) {
  fs.writeFileSync(MSG_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// 📤 SUBIR ARCHIVO
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    console.log("📩 Archivo recibido:", file);

    if (!file) {
      return res.status(400).send("No se recibió archivo");
    }

    await transporter.sendMail({
      from: "bejaranojasonblue@gmail.com",
      to: "bejaranojasonblue@gmail.com",
      subject: "📎 Nuevo archivo enviado",
      text: `Archivo: ${file.originalname}`,
      attachments: [
        {
          filename: file.originalname,
          path: file.path
        }
      ]
    });

    fs.unlinkSync(file.path);

    console.log("✅ CORREO ENVIADO");

    res.status(200).json({ ok: true });

  } catch (error) {
    console.log("❌ ERROR EMAIL:", error.message);
    res.status(500).json({ ok: false });
  }
});

// 🔌 SOCKET.IO
io.on("connection", (socket) => {

  console.log("🟢 Conectado:", socket.id);

  // 🔐 LOGIN CON CONTRASEÑA
  socket.on("login", (data) => {
    const user = data.user.trim().toLowerCase();
    const pass = data.pass;

    // 🔥 registro automático
    if (!accounts[user]) {
      accounts[user] = pass;
    }

    // 🔐 validar contraseña
    if (accounts[user] !== pass) {
      socket.emit("loginError", "❌ Contraseña incorrecta");
      return;
    }

    socket.user = user;

    users = users.filter(u => u !== user);
    users.push(user);

    usersMap[user] = socket.id;

    console.log("👤 LOGIN:", user);
    console.log("🧠 usersMap:", usersMap);

    io.emit("users", users);
    socket.emit("history", getMessages());
  });

  // 🚪 LOGOUT
  socket.on("logout", () => {
    if (!socket.user) return;

    users = users.filter(u => u !== socket.user);
    delete usersMap[socket.user];

    io.emit("users", users);
  });

  // 🗑️ BORRAR (TODOS PUEDEN)
  socket.on("deleteMessages", (ids) => {

    let messages = getMessages();

    messages = messages.filter(msg => {
      return !ids.includes(Number(msg.id));
    });

    saveMessages(messages);

    io.emit("history", messages);
  });

  // 💬 GLOBAL
  socket.on("message", (msg) => {
    if (!msg.text?.trim()) return;

    const newMsg = {
      id: Date.now(),
      user: socket.user,
      text: msg.text,
      type: "text",
      private: false
    };

    let messages = getMessages();
    messages.push(newMsg);
    saveMessages(messages);

    io.emit("newMessage", newMsg);
  });

  // 🔒 PRIVADO
  socket.on("privateMessage", (data) => {

    const toUser = data.to?.toLowerCase();
    const fromUser = data.from?.toLowerCase();

    const msg = {
      id: Date.now(),
      from: fromUser,
      to: toUser,
      text: data.text,
      private: true
    };

    let messages = getMessages();
    messages.push(msg);
    saveMessages(messages);

    const target = usersMap[toUser];

    if (target) {
      io.to(target).emit("privateMessage", msg);
    }

    socket.emit("privateMessage", msg);
  });

  // 🖼️ IMÁGENES
  socket.on("image", (data) => {

    const toUser = data.to?.toLowerCase();
    const fromUser = data.from?.toLowerCase();

    const msg = {
      id: Date.now() + Math.random(),
      from: fromUser,
      to: toUser,
      user: fromUser,
      image: data.image,
      type: "image",
      private: !!toUser
    };

    let messages = getMessages();
    messages.push(msg);
    saveMessages(messages);

    if (toUser && usersMap[toUser]) {
      const target = usersMap[toUser];

      io.to(target).emit("privateMessage", msg);
      socket.emit("privateMessage", msg);
    } else {
      io.emit("newMessage", msg);
    }
  });

  // ❌ DESCONECTAR
  socket.on("disconnect", () => {
    if (!socket.user) return;

    users = users.filter(u => u !== socket.user);
    delete usersMap[socket.user];

    io.emit("users", users);
  });

});

// 🚀 SERVER
http.listen(3000, () => {
  console.log("🚀 Servidor en http://localhost:3000");
});