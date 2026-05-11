import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());

const OWNER = "s14930931@gmail.com";
const LIMIT = 2;

let seat2 = null;        // Pehle guest ki gmail
let seat2Locked = false; // Ek baar disconnect ho toh hamesha ke liye band

const msgs = [];
const counts = {};
const online = {};

io.on("connection", (socket) => {

  socket.on("join", ({ gmail, username, avatar }) => {
    const g = gmail.toLowerCase().trim();
    const isOwner = g === OWNER;

    if (!isOwner) {

      // Agar seat pehle se kisi aur ne le li hai
      if (seat2 !== null && g !== seat2) {
        socket.emit("denied", "Yeh private chat hai — aapko access nahi. 🚫");
        return;
      }

      // Agar seat2 permanently lock ho chuki hai
      if (seat2Locked && g === seat2) {
        socket.emit("denied", "Aap dobara join nahi kar sakte. 🚫");
        return;
      }

      // Pehli baar koi aaye — seat lock karo
      if (seat2 === null) {
        seat2 = g;
        console.log("🔒 Seat 2 permanently locked:", g);
      }
    }

    // Online mein add karo
    online[socket.id] = { gmail: g, username, avatar };

    // History sirf owner ko
    if (isOwner) {
      socket.emit("history", msgs);
    } else {
      socket.emit("history", []);
    }

    socket.emit("count_update", counts[g] || 0);
    socket.emit("ok", { isOwner });

    io.emit(
      "online",
      Object.values(online)
        .filter((u) => u.username !== "Samia")
        .map((u) => u.username)
    );

    console.log("✅ Joined:", username, g);

    // Disconnect hone par
    socket.on("disconnect", () => {
      // Agar guest disconnect ho toh hamesha ke liye band
      if (!isOwner && g === seat2) {
        seat2Locked = true;
        console.log("🔒 Seat 2 forever locked — dobara access nahi milega:", g);
      }

      delete online[socket.id];

      io.emit(
        "online",
        Object.values(online)
          .filter((u) => u.username !== "Samia")
          .map((u) => u.username)
      );
    });
  });

  socket.on("msg", ({ gmail, username, text, avatar }) => {
    const g = gmail.toLowerCase().trim();
    const user = online[socket.id];

    if (!user || user.gmail !== g) return;
    if (g !== OWNER && g !== seat2) return;

    const c = counts[g] || 0;

    // Owner ke liye limit nahi
    if (g !== OWNER && c >= LIMIT) {
      socket.emit("limit");
      return;
    }

    const message = {
      id: Date.now(),
      username,
      avatar,
      gmail: g,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    msgs.push(message);
    if (msgs.length > 200) msgs.shift();

    // Owner ki count nahi badhegi
    if (g !== OWNER) {
      counts[g] = c + 1;
      socket.emit("count_update", counts[g]);
    }

    io.emit("msg", message);
  });
});

httpServer.listen(4000, () =>
  console.log("🚀 Backend ready: http://localhost:4000")
);