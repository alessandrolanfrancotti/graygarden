const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
const skyColor = 0x0a0a20; 
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 10, 85);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ'; 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();

// --- MULTIPLAYER DATA ---
const otherPlayers = {}; 

// --- ASSETS ---
const playerTexture = textureLoader.load('personaggio.png');
const swordTexture = textureLoader.load('sword.png');

// --- STELLE ---
const starGeo = new THREE.BufferGeometry();
const starCoords = [];
for (let i = 0; i < 1000; i++) starCoords.push((Math.random()-0.5)*400, Math.random()*200+50, (Math.random()-0.5)*400);
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));

// --- LUCI ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const moonLight = new THREE.DirectionalLight(0xaabbff, 0.9);
moonLight.position.set(20, 50, 20);
scene.add(moonLight);

// --- MAPPA E MURI ---
const ARENA_SIZE = 100;
const objects = [];
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

function createWall(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 20, d), new THREE.MeshStandardMaterial({ color: 0x050510 }));
    wall.position.set(x, 10, z);
    scene.add(wall);
    objects.push(wall);
}
const half = ARENA_SIZE / 2;
createWall(0, -half, ARENA_SIZE, 2); createWall(0, half, ARENA_SIZE, 2);  
createWall(-half, 0, 2, ARENA_SIZE); createWall(half, 0, 2, ARENA_SIZE);  

for (let i = 0; i < 60; i++) {
    let rx = (Math.random()-0.5)*90, rz = (Math.random()-0.5)*90;
    if (Math.abs(rx)>7 || Math.abs(rz)>7) {
        const h = 4 + Math.random()*14;
        const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, h, 2.5), monolithMat);
        m.position.set(rx, h/2, rz);
        scene.add(m);
        objects.push(m);
    }
}

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), new THREE.MeshStandardMaterial({ color: 0x050505 }));
floor.rotation.x = -Math.PI/2;
scene.add(floor);

// --- PLAYER LOCALE ---
const playerContainer = new THREE.Object3D();
playerContainer.position.set(0, 0, 0);
scene.add(playerContainer);

// --- SPADA ---
const swordSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: swordTexture }));
swordSprite.scale.set(1.0, 2.5, 1);
swordSprite.position.set(0.75, -0.6, -1.2);
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA NPC ---
let npcState = "following";
let scaredTimer = 0;
const npcMat = new THREE.SpriteMaterial({ map: playerTexture, color: 0x8888ff });
const npc = new THREE.Sprite(npcMat);
npc.scale.set(2, 2, 1);
npc.position.set(15, 1, 15);
scene.add(npc);

const chatBubble = document.createElement('div');
chatBubble.style.cssText = "position:absolute; background:white; padding:5px 10px; border-radius:10px; font-family:Arial; font-weight:bold; pointer-events:none; border: 2px solid black; display:none;";
document.body.appendChild(chatBubble);

function updateNPC(delta, playerPos) {
    const dist = npc.position.distanceTo(playerPos);
    
    if (npcState === "scared") {
        scaredTimer -= delta;
        chatBubble.innerText = "NO CAP, STOP IT! 💀";
        chatBubble.style.color = "red";
        const runDir = new THREE.Vector3().subVectors(npc.position, playerPos).normalize();
        npc.position.addScaledVector(runDir, 8 * delta);
        if (scaredTimer <= 0) {
            npcState = "following";
            npcMat.color.set(0x8888ff);
        }
    } else {
        chatBubble.innerText = "Questo posto è cursed fr fr.";
        chatBubble.style.color = "black";
        if (dist > 4) {
            const followDir = new THREE.Vector3().subVectors(playerPos, npc.position).normalize();
            npc.position.addScaledVector(followDir, 5 * delta);
        }
    }

    const screenPos = npc.position.clone().setY(npc.position.y + 1.2).project(camera);
    if (screenPos.z < 1) {
        chatBubble.style.display = 'block';
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
        chatBubble.style.left = `${x}px`;
        chatBubble.style.top = `${y}px`;
    } else {
        chatBubble.style.display = 'none';
    }
}

function checkHitNPC() {
    const dist = npc.position.distanceTo(playerContainer.position);
    if (dist < 4) { 
        npcState = "scared";
        scaredTimer = 3.0;
        npcMat.color.set(0xff8888);
    }
}

// --- MULTIPLAYER ---
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: playerTexture, transparent: true }));
        sprite.scale.set(2, 2, 1);
        scene.add(sprite);
        otherPlayers[data.id] = sprite;
    }
    otherPlayers[data.id].position.set(data.x, data.y + 1, data.z);
});

socket.on('player-disconnected', (id) => {
    if (otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; }
});

// --- INPUTS ---
let yaw = 0, pitch = 0, velY = 0, isGrounded = true;
let isAttacking = false, attackTime = 0;
const keys = {};

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body) {
        if (!isAttacking) { isAttacking = true; attackTime = 0; }
    } else { document.body.requestPointerLock(); }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-1.4, Math.min(1.4, pitch));
    }
});

// --- CORE LOOPS ---
function update(delta) {
    let mX = 0, mZ = 0;
    const speed = 12 * delta;
    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    if (keys['Space'] && isGrounded) { velY = 0.25; isGrounded = false; }
    velY -= 0.6 * delta;
    playerContainer.position.y += velY;
    if (playerContainer.position.y <= 0) { playerContainer.position.y = 0; velY = 0; isGrounded = true; }

    const nextX = playerContainer.position.x + mX * speed;
    const nextZ = playerContainer.position.z + mZ * speed;

    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, 1, nextZ), new THREE.Vector3(1.2, 2, 1.2));
    let collision = false;
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) { collision = true; break; } }
    if (!collision) { playerContainer.position.x = nextX; playerContainer.position.z = nextZ; }

    camera.position.copy(playerContainer.position).y += 1.6;
    camera.rotation.set(pitch, yaw, 0);

    // AGGIORNAMENTO NPC
    updateNPC(delta, playerContainer.position);

    if (isAttacking) {
        attackTime += 14 * delta;
        swordSprite.position.z = -1.2 - Math.sin(attackTime) * 0.7;
        swordSprite.material.rotation = Math.sin(attackTime) * 0.8;
        
        // CONTROLLA SE COLPISCI L'NPC
        if (attackTime > 1.2 && attackTime < 1.5) checkHitNPC();

        if (attackTime >= Math.PI) { isAttacking = false; swordSprite.material.rotation = 0; }
    }

    if (socket.connected) {
        socket.emit('move', { x: playerContainer.position.x, y: playerContainer.position.y, z: playerContainer.position.z });
    }
}

function animate() {
    requestAnimationFrame(animate);
    update(clock.getDelta());
    renderer.render(scene, camera);
}
animate();
