const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- MIRINO (HUD) ---
const crosshair = document.createElement('div');
Object.assign(crosshair.style, {
    position: 'absolute', top: '50%', left: '50%',
    width: '10px', height: '10px', backgroundColor: 'white',
    borderRadius: '50%', transform: 'translate(-50%, -50%)',
    border: '1px solid black', pointerEvents: 'none'
});
document.body.appendChild(crosshair);

// --- LUCI ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 0.6);
sun.position.set(5, 10, 7);
scene.add(sun);

// --- MONDO (Pareti e Pavimento) ---
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

// --- BERSAGLI ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
    target.position.set(x, 0.4, z);
    scene.add(target);
    targets.push(target);
}
createTarget(3, -5); createTarget(-4, 2); createTarget(0, -7);

// --- PARTICELLE (ESPLOSIONE) ---
const particles = [];
function createExplosion(pos) {
    for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        p.position.copy(pos);
        p.userData = {
            vel: new THREE.Vector3((Math.random()-0.5)*0.3, Math.random()*0.3, (Math.random()-0.5)*0.3),
            life: 1.0
        };
        scene.add(p);
        particles.push(p);
    }
}

// --- GIOCATORE ---
const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0 }));
player.position.set(0, 0.5, 0);
scene.add(player);
const otherPlayers = {};

// --- SPADA (SPRITE) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);

// Correzione rotazione e posizione
swordSprite.material.rotation = Math.PI; // Ribalta di 180° per raddrizzarla
swordSprite.scale.set(1.5, 1.5, 1);
swordSprite.position.set(0.6, -0.5, -1); 
camera.add(swordSprite);
scene.add(camera);

// --- INPUT E ATTACCO ---
let isAttacking = false, attackTime = 0, hasHitInThisSwing = false;
let pitch = 0, yaw = 0;
const keys = {};

document.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body && !isAttacking) {
        isAttacking = true; attackTime = 0; hasHitInThisSwing = false;
    } else { document.body.requestPointerLock(); }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
    }
});

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- LOGICA FISICA ---
function checkCollision(newX, newZ) {
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(0.9, 0.9, 0.9));
    for (let wall of walls) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(wall))) return true; }
    return false;
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 3) {
        const obj = intersects[0].object;
        createExplosion(obj.position);
        scene.remove(obj);
        targets.splice(targets.indexOf(obj), 1);
        hasHitInThisSwing = true;
    }
}

// --- UPDATE ---
let velY = 0;
function update(delta) {
    // Rotazione e Movimento
    player.rotation.y = yaw;
    let mX = 0, mZ = 0;
    const currentSpeed = 10.0 * delta; // Velocità a 10.0

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    const len = Math.sqrt(mX*mX + mZ*mZ);
    if (len > 0) { mX = (mX/len)*currentSpeed; mZ = (mZ/len)*currentSpeed; }

    if (!checkCollision(player.position.x + mX, player.position.z)) player.position.x += mX;
    if (!checkCollision(player.position.x, player.position.z + mZ)) player.position.z += mZ;

    // Salto e Gravità
    if (keys['Space'] && player.position.y <= 0.51) velY = 0.22;
    velY -= 0.6 * delta; 
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    // Sync Camera
    camera.position.copy(player.position).y += 0.4;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // Gestione Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.vel.y -= 0.01;
        p.userData.life -= 0.02;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Animazione Spada
    if (isAttacking) {
        attackTime += 12 * delta;
        swordSprite.position.z = -1.0 - Math.sin(attackTime) * 0.5;
        swordSprite.position.x = 0.6 - Math.sin(attackTime) * 0.6;
        swordSprite.material.rotation = Math.PI + Math.sin(attackTime) * 0.8; // Mantiene base ribaltata + fendente

        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordSprite.position.set(0.6, -0.5, -1);
            swordSprite.material.rotation = Math.PI;
        }
    } else if (len > 0) {
        swordSprite.position.y = -0.5 + Math.sin(Date.now() * 0.01) * 0.02;
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

// --- MULTIPLAYER ---
socket.on('player-moved', (d) => {
    if (!otherPlayers[d.id]) {
        otherPlayers[d.id] = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color: 0xff0000}));
        scene.add(otherPlayers[d.id]);
    }
    otherPlayers[d.id].position.set(d.x, d.y, d.z);
    otherPlayers[d.id].rotation.y = d.rotY || 0;
});
socket.on('player-disconnected', (id) => { if (otherPlayers[id]) { scene.remove(otherPlayers[id]); delete otherPlayers[id]; } });

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    update(clock.getDelta());
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
