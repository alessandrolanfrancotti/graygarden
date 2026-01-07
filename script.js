const socket = io("https://graygarden.onrender.com");

const rig = document.getElementById("camera-rig");
const localCamera = document.getElementById("local-player");
const scene = document.querySelector("a-scene");

const otherPlayers = {};

// Blocco mouse
scene.addEventListener("click", () => {
  scene.canvas.requestPointerLock();
});

// ------------------
// VARIABILI FISICA
// ------------------
let isJumping = false;
let vVel = 0;

// ------------------
// COMPONENT COLLISIONI
// ------------------
AFRAME.registerComponent("player-collision", {
  tick: function () {
    const pos = this.el.object3D.position;

    // ---- MURI (stanza 30x30) ----
    const limit = 14.5;

    if (pos.x > limit) pos.x = limit;
    if (pos.x < -limit) pos.x = -limit;
    if (pos.z > limit) pos.z = limit;
    if (pos.z < -limit) pos.z = -limit;

    // ---- SALTO + GRAVITÀ ----
    if (isJumping || pos.y > 0.1) {
      vVel -= 0.01;
      pos.y += vVel;

      if (pos.y <= 0.1) {
        pos.y = 0.1;
        isJumping = false;
        vVel = 0;
      }
    }

    // ---- MULTIPLAYER ----
    if (socket.connected) {
      socket.emit("move", {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        ry: localCamera.getAttribute("rotation").y
      });
    }
  }
});

// ------------------
// SALTO
// ------------------
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !isJumping && rig.object3D.position.y <= 0.11) {
    isJumping = true;
    vVel = 0.2;
  }
});

// ------------------
// ALTRI GIOCATORI
// ------------------
socket.on("player-moved", (data) => {
  if (!otherPlayers[data.id]) {
    const avatar = document.createElement("a-box");
    avatar.setAttribute("width", "0.5");
    avatar.setAttribute("height", "1.5");
    avatar.setAttribute("depth", "0.5");
    avatar.setAttribute("color", "orange");
    scene.appendChild(avatar);
    otherPlayers[data.id] = avatar;
  }

  otherPlayers[data.id].object3D.position.set(data.x, data.y, data.z);
  otherPlayers[data.id].object3D.rotation.y = THREE.MathUtils.degToRad(data.ry);
});

// ------------------
// GIOCATORI ESISTENTI
// ------------------
socket.on("current-players", (players) => {
  for (let id in players) {
    if (id === socket.id) continue;

    const data = players[id];
    const avatar = document.createElement("a-box");
    avatar.setAttribute("width", "0.5");
    avatar.setAttribute("height", "1.5");
    avatar.setAttribute("depth", "0.5");
    avatar.setAttribute("color", "orange");
    scene.appendChild(avatar);

    avatar.object3D.position.set(data.x, data.y, data.z);
    otherPlayers[id] = avatar;
  }
});

// ------------------
// DISCONNESSIONE
// ------------------
socket.on("player-disconnected", (id) => {
  if (otherPlayers[id]) {
    otherPlayers[id].remove();
    delete otherPlayers[id];
  }
});
