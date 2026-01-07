const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- CREAZIONE MIRINO (HUD) ---
const crosshair = document.createElement('div');
crosshair.style.position = 'absolute';
crosshair.style.top = '50%';
crosshair.style.left = '50%';
crosshair.style.width = '10px';
crosshair.style.height = '10px';
crosshair.style.backgroundColor = 'white';
crosshair.style.borderRadius = '50%';
crosshair.style.transform = 'translate(-50%, -50%)';
crosshair.style.border = '1px solid black';
document.body.appendChild(crosshair);

// --- LUCI ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 0.8);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MONDO ---
const walls = [];
function createWall(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 4, d), new THREE.MeshStandardMaterial({ color: 0x808080 }));
    wall.position.set(x, 2, z);
    scene.add(wall);
    walls.push(wall);
}
scene.add(new THREE.GridHelper(20, 20));
createWall(0, -10, 20, 1); createWall(0, 10, 20, 1);
createWall(-10, 0, 1, 20); createWall(10, 0, 1, 20);

const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    target.position.set(x, 0.4, z);
    scene.add(target);
    targets.push(target);
}
createTarget(3, -5); createTarget(-4, 2); createTarget(0, -7);

// --- GIOCATORE ---
const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0 }));
player.position.y = 0.5;
scene.add(player);
const otherPlayers = {};

// --- SPADA (SPRITE PNG) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);

// Posizionamento iniziale dello sprite
swordSprite.scale.set(1.5, 1.5, 1); // Regola dimensioni se necessario
swordSprite.position.set(0.6, -0.5, -1); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA ATTACCO ---
let isAttacking = false, attackTime = 0, hasHitInThisSwing = false;
document.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body && !isAttacking) {
        isAttacking = true; attackTime = 0; hasHitInThisSwing = false;
    } else { document.body.requestPointerLock(); }
});

// --- CONTROLLI MOUSE ---
let pitch = 0, yaw = 0;
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
    }
});

const keys = {};
let velY = 0;
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function checkCollision(newX, newZ) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(0.9, 0.9, 0.9));
    for (let wall of walls) { if (playerBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true; }
    return false;
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, direction);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 3) {
        const hitObject = intersects[0].object;
        scene.remove(hitObject);
        targets.splice(targets.indexOf(hitObject), 1);
        hasHitInThisSwing = true;
    }
}

// --- UPDATE LOOP ---
function update(delta) {
    player.rotation.y = yaw;
    let moveX = 0, moveZ = 0;
    
    // VELOCITÀ IMPOSTATA A 10.0
    const baseSpeed = 10.0; 
    const currentSpeed = baseSpeed * delta;

    if (keys['KeyW']) { moveX -= Math.sin(yaw); moveZ -= Math.cos(yaw); }
    if (keys['KeyS']) { moveX += Math.sin(yaw); moveZ += Math.cos(yaw); }
    if (keys['KeyA']) { moveX -= Math.cos(yaw); moveZ += Math.sin(yaw); }
    if (keys['KeyD']) { moveX += Math.cos(yaw); moveZ -= Math.sin(yaw); }

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX = (moveX / length) * currentSpeed;
        moveZ = (moveZ / length) * currentSpeed;
    }

    if (!checkCollision(player.position.x + moveX, player.position.z)) player.position.x += moveX;
    if (!checkCollision(player.position.x, player.position.z + moveZ)) player.position.z += moveZ;

    // Salto e Gravità
    if (keys['Space'] && player.position.y <= 0.51) velY = 0.22;
    velY -= 0.6 * delta; 
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    camera.position.copy(player.position);
    camera.position.y += 0.4;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // ANIMAZIONE SPADA PNG
    if (isAttacking) {
        attackTime += 12 * delta; 
        // Movimento fendente: avanti/indietro e rotazione
        swordSprite.position.z = -1.0 - Math.sin(attackTime) * 0.5;
        swordSprite.position.x = 0.6 - Math.sin(attackTime) * 0.6;
        swordSprite.material.rotation = Math.sin(attackTime) * 0.8;

        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();

        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordSprite.position.set(0.6, -0.5, -1);
            swordSprite.material.rotation = 0;
        }
    } else {
        // Effetto bobbing camminata
        if (length > 0) {
            swordSprite.position.y = -0.5 + Math.sin(Date.now() * 0.01) * 0.02;
        }
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

// --- MULTIPLAYER ---
socket.on('player-moved', (data) => {
    if (!otherPlayers[data.id]) {
        otherPlayers[data.id] = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color: 0xff0000}));
        scene.add(otherPlayers[data.id]);
    }
    otherPlayers[data.id].position.set(data.x, data.y, data.z);
    otherPlayers[data.id].rotation.y = data.rotY || 0;
});

socket.on('player-disconnected', (id) => { if (otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; } });

// --- RENDER LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    update(delta);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
