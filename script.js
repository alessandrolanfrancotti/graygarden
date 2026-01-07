const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151520); // Notte più chiara
scene.fog = new THREE.Fog(0x151520, 2, 40); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI (LUMINOSITÀ AUMENTATA) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Molto più luce di base
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xccccff, 1.2); // Luce lunare intensa
moonLight.position.set(30, 50, 30);
scene.add(moonLight);

// --- MAPPA 100x100 ---
const ARENA_SIZE = 100; 
const objects = []; 
const textureLoader = new THREE.TextureLoader();

// Materiale Monoliti
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });

// Texture Albero
const treeTexture = textureLoader.load('Tree.png');

function createMonolith(x, z) {
    const height = 4 + Math.random() * 16; 
    const width = 2 + Math.random() * 3;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

function createTree(x, z) {
    const treeMat = new THREE.SpriteMaterial({ map: treeTexture, transparent: true });
    const sprite = new THREE.Sprite(treeMat);
    const size = 5 + Math.random() * 5; // Dimensioni alberi variabili
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, size / 2, z);
    scene.add(sprite);
    
    // Per le collisioni creiamo un cilindro invisibile alla base dell'albero
    const hitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, size), 
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(x, size / 2, z);
    scene.add(hitBox);
    objects.push(hitBox); 
}

// Generiamo 60 Monoliti e 100 Alberi
for (let i = 0; i < 60; i++) {
    let rx = (Math.random() - 0.5) * (ARENA_SIZE - 10);
    let rz = (Math.random() - 0.5) * (ARENA_SIZE - 10);
    if (Math.abs(rx) > 8 || Math.abs(rz) > 8) createMonolith(rx, rz);
}

for (let i = 0; i < 100; i++) {
    let rx = (Math.random() - 0.5) * (ARENA_SIZE - 10);
    let rz = (Math.random() - 0.5) * (ARENA_SIZE - 10);
    if (Math.abs(rx) > 8 || Math.abs(rz) > 8) createTree(rx, rz);
}

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x101510 }) // Terreno verdastro scuro
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Mura
function createBoundary(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 20, d), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    wall.position.set(x, 10, z);
    scene.add(wall);
    objects.push(wall);
}
const half = ARENA_SIZE / 2;
createBoundary(0, -half, ARENA_SIZE, 2);
createBoundary(0, half, ARENA_SIZE, 2);
createBoundary(-half, 0, 2, ARENA_SIZE);
createBoundary(half, 0, 2, ARENA_SIZE);

// --- BERSAGLI ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    target.position.set(x, 1, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*(ARENA_SIZE-20), (Math.random()-0.5)*(ARENA_SIZE-20));

// --- SPADA ---
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);
swordSprite.material.rotation = Math.PI; 
swordSprite.scale.set(0.65, 2.1, 1); 
swordSprite.position.set(0.75, -0.6, -1.2); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA E MOVIMENTO ---
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

function checkCollision(newX, newZ) {
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(1.3, 1.3, 1.3));
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) return true; }
    return false;
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 4.5) {
        const obj = intersects[0].object;
        scene.remove(obj);
        targets.splice(targets.indexOf(obj), 1);
        hasHitInThisSwing = true;
    }
}

function update(delta) {
    player.rotation.y = yaw;
    let mX = 0, mZ = 0;
    const currentSpeed = 12.0 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    const len = Math.sqrt(mX*mX + mZ*mZ);
    if (len > 0) { mX = (mX/len)*currentSpeed; mZ = (mZ/len)*currentSpeed; }

    if (!checkCollision(player.position.x + mX, player.position.z)) player.position.x += mX;
    if (!checkCollision(player.position.x, player.position.z + mZ)) player.position.z += mZ;

    camera.position.copy(player.position).y += 0.6;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    if (isAttacking) {
        attackTime += 14 * delta; 
        swordSprite.position.z = -1.2 - Math.sin(attackTime) * 0.7;
        swordSprite.material.rotation = Math.PI + Math.sin(attackTime) * 1.2;
        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        if (attackTime >= Math.PI) { isAttacking = false; swordSprite.material.rotation = Math.PI; }
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

const otherPlayers = {};
socket.on('player-moved', (d) => {
    if (!otherPlayers[d.id]) {
        otherPlayers[d.id] = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0x555555}));
        scene.add(otherPlayers[d.id]);
    }
    otherPlayers[d.id].position.set(d.x, d.y + 0.5, d.z);
    otherPlayers[d.id].rotation.y = d.rotY || 0;
});

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
