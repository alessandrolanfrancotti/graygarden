const socket = io("https://graygarden.onrender.com");

const rig = document.getElementById("camera-rig");
const cam = document.getElementById("local-player");
const scene = document.querySelector("a-scene");

const otherPlayers = {};

// Pointer lock
scene.addEventListener("click", () => {
  scene.canvas.requestPointerLock();
});

// ------------------
// VARIABILI
// ------------------
const keys = {};
let isJumping = false;
let vVel = 0;

// ------------------
// INPUT
// ------------------
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// ------------------
// COMPONENT PLAYER
// ------------------
AFRAME.registerComponent("player-controller", {
  tick: function (time, delta) {

    const pos = rig.object3D.position;
    const rot = cam.object3D.rotation.y;

    const speed = 0.08;
    let dx = 0;
    let dz = 0;

    if (keys["KeyW"]) {
      dx -= Math.sin(rot) * speed;
      dz -= Math.cos(rot) * speed;
    }
    if (keys["KeyS"]) {
      dx += Math.sin(rot) * speed;
      dz += Math.cos(rot) * speed;
    }
    if (keys["KeyA"]) {
      dx -= Math.cos(rot) * speed;
      dz += Math.sin(rot) * speed;
    }
    if (keys["KeyD"]) {
      dx += Math.cos(rot) * speed;
      dz -= Math.sin(rot) * speed;
    }

    pos.x += dx;
    pos.z += dz;

    // ---- COLLISIONI MURI ----
    const limit = 14.5;
    pos.x = Math.max(-limit, Math.min(limit, pos.x));
    pos.z = Math.max(-limit, Math.min(limit, pos.z));

    // ---- SALTO ----
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
        ry: THREE.MathUtils.radToDeg(rot)
      });
    }
  }
});

// ------------------
// SALTO
// ------------------
window.addEventListener("keydown", e => {
  if (e.code === "Space" && !isJumping && rig.object3D.position.y <= 0.11) {
    isJumping = true;
    vVel = 0.2;
  }
});

// ------------------
// MULTIPLAYER
// ------------------
socket.on("player-moved", data => {
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

socket.on("current-players", players => {
  for (let id in players) {
    if (id === socket.id) continue;

    const p = players[id];
    const avatar = document.createElement("a-box");
    avatar.setAttribute("width", "0.5");
    avatar.setAttribute("height", "1.5");
    avatar.setAttribute("depth", "0.5");
    avatar.setAttribute("color", "orange");
    avatar.object3D.position.set(p.x, p.y, p.z);
    scene.appendChild(avatar);

    otherPlayers[id] = avatar;
  }
});

socket.on("player-disconnected", id => {
  if (otherPlayers[id]) {
    otherPlayers[id].remove();
    delete otherPlayers[id];
  }
});
