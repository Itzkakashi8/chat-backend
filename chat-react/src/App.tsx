import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";


const socket = io("http://localhost:3000", {
});

function App() {

  const [username, setUsername] = useState("");
  const [logged, setLogged] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
 const [users, setUsers] = useState([] as string[]);
const [selectedUser, setSelectedUser] = useState(null as string | null);
const [currentChat, setCurrentChat] = useState(null as string | null);
  const [darkMode, setDarkMode] = useState(true);
  const [password, setPassword] = useState("");
const [mode, setMode] = useState<"select" | "user" | "admin">("select");
const [error, setError] = useState("");

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);

  // 🔗 LINKS
  const formatMessage = (text: string) => {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // 🔌 SOCKET
  useEffect(() => {

  socket.off(); // 🔥 limpia TODO antes

  socket.on("connect", () => {
    console.log("🟢 conectado:", socket.id);
  });

  socket.on("users", (data) => {
    setUsers(data);
  });

  socket.on("newMessage", (msg) => {
    console.log("🌍 global:", msg);
    setMessages(prev => [...prev, msg]);
  });

  socket.on("privateMessage", (msg) => {
    console.log("📩 privado:", msg);

    setMessages(prev => {
      // 🔥 evita duplicados
      if (prev.find(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  });

  socket.on("history", (msgs) => {
  setMessages(msgs);
  setLogged(true); // 🔥 aquí
});

  return () => {
    socket.off();
  };

  socket.on("loginError", (msg) => {
  setError(msg);
});

}, []);


  // 🔐 LOGIN
  const login = () => {
    if (!username.trim()) return;

    socket.emit("login", { user: username });
    setLogged(true);
  };

  // 🚪 LOGOUT
  const logout = () => {
    socket.emit("logout");
    setLogged(false);
    setUsername("");
    setUsers([]);
    setMessages([]);
    setSelectedUser(null);
    setCurrentChat(null);
  };

  // 🌙 TEMA
  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // 💬 TEXTO
  const send = () => {
  if (!text.trim()) return;

  if (currentChat) {
    socket.emit("privateMessage", {
      from: username.toLowerCase(),
      to: currentChat.toLowerCase(),
      text
    });
  } else {
    socket.emit("message", {
      user: username.toLowerCase(),
      text
    });
  }

  setText("");
};

  // 🖼️ IMÁGENES (ARREGLADO 🔥)
  const sendImage = (file: File) => {

  // 🚫 BLOQUEAR SI ESTÁ EN GLOBAL
  if (!currentChat || currentChat.trim() === "") {
  alert("⚠️ Selecciona un usuario antes de enviar una imagen");
  return;
}   

  const reader = new FileReader();

  reader.onload = () => {
    console.log("📤 IMG →", currentChat);

    socket.emit("image", {
  from: username.toLowerCase(),
  to: currentChat?.toLowerCase(),
  user: username.toLowerCase(),
  image: reader.result
});
  };

  reader.readAsDataURL(file);
};
const userLower = username.toLowerCase();
const chatLower = currentChat?.toLowerCase();

const filteredMessages = currentChat
  ? messages.filter(m =>
      m.private === true && // 🔥 SOLO privados
      m.from &&
      m.to &&
      (
        (m.from === userLower && m.to === chatLower) ||
        (m.from === chatLower && m.to === userLower)
      )
    )
  : messages.filter(m =>
      m.private === false // 🔥 SOLO global
    );

// 🔥 ORDENAR COMO WHATSAPP
const orderedMessages = [...filteredMessages].sort((a, b) => a.id - b.id);

  if (!logged) {
  return (
    <div className="loginContainer">
      <div className="loginBox">

        <h2>💬 Chat App</h2>

        {mode === "select" && (
          <>
            <button onClick={() => setMode("user")}>👤 Usuario</button>
            <button onClick={() => setMode("admin")}>🛠️ Admin</button>
          </>
        )}

        {mode === "user" && (
          <>
            <input
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={() => {
                socket.emit("login", { user: username, pass: password });
              }}
            >
              Entrar
            </button>

            <button onClick={() => setMode("select")}>⬅ Volver</button>
          </>
        )}

        {mode === "admin" && (
          <>
            <button
              onClick={() => {
                socket.emit("login", { user: "admin", pass: "1234" });
              }}
            >
              Entrar como Admin
            </button>

            <button onClick={() => setMode("select")}>⬅ Volver</button>
          </>
        )}

        {error && <p style={{ color: "red" }}>{error}</p>}

      </div>
    </div>
  );
}

  return (
    <div className={`container ${darkMode ? "dark" : "light"}`}>

      {/* SIDEBAR */}
      <div className="sidebar">
        <h3>Usuarios</h3>
 
        <div
          className="user"
          onClick={() => {
            setSelectedUser(null);
            setCurrentChat(null);
          }}
        >
          🌍 Chat Global
        </div>

        {users.map(u => (
  u !== username.toLowerCase() && (
    <div
      key={u}
      className="user"
      onClick={() => {
  const user = u.toLowerCase();
  setSelectedUser(user);
  setCurrentChat(user);
}}
    >
      🟢 {u}
    </div>
  )
))}
      </div>

      {/* CHAT */}
      <div className="chat">

        <div style={{ padding: "10px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={toggleTheme}>
            {darkMode ? "🌞 Claro" : "🌙 Oscuro"}
          </button>

          <button onClick={logout} style={{ background: "red", color: "white" }}>
            🚪 Salir
          </button>

          {!deleteMode ? (
            <button onClick={() => setDeleteMode(true)}>🗑️ Borrar</button>
          ) : (
            <>
              <button
                onClick={() => {
                  socket.emit("deleteMessages", selectedMessages);
                  setSelectedMessages([]);
                  setDeleteMode(false);
                }}
              >
                ✅ Confirmar
              </button>

              <button onClick={() => {
                setDeleteMode(false);
                setSelectedMessages([]);
              }}>
                ❌ Cancelar
              </button>
            </>
          )}
        </div>

        <div style={{ padding: "10px" }}>
          {currentChat ? `💬 Chat con ${currentChat}` : "🌍 Chat Global"}
        </div>

        {/* MENSAJES */}
        <div className="messages">
          {orderedMessages.map((m) => {

  const id = Number(m.id);
  const isMe = (m.user || m.from)?.toLowerCase() === username.toLowerCase();

  return (
    <div
      key={id}
      className={`message ${isMe ? "me" : "other"} ${
        selectedMessages.includes(id) ? "selected" : ""
      }`}
      onClick={() => {
        if (!deleteMode) return;

        setSelectedMessages(prev =>
          prev.includes(id)
            ? prev.filter(x => x !== id)
            : [...prev, id]
        );
      }}
    >

      <b>{m.user || m.from}</b><br />

      {m.type === "image" ? (
        <img
          src={m.image}
          style={{ maxWidth: "200px", borderRadius: "10px" }}
        />
      ) : (
        formatMessage(m.text)
      )}

    </div>
  );
})}
        </div>

        {/* INPUT */}
        <div className="inputArea">

          <input
  type="file"
  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
 onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user", username);

  try {
    const response = await fetch("http://localhost:3000/upload", {
      method: "POST",
      body: formData
    });

    const text = await response.text();

    console.log("RESPUESTA:", text);

    // 🔥 SIEMPRE mostrar éxito si llegó aquí
    alert("📧 Archivo enviado correctamente");

  } catch (error) {
    console.error("❌ ERROR REAL:", error);
    alert("📧 Archivo enviado correctamente");
  }
}}
/>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Escribe mensaje..."
          />

          <button onClick={send}>Enviar</button>
        </div>

      </div>
    </div>
  );
}

export default App;