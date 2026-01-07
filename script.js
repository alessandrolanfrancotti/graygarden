const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101015);
scene.fog = new THREE.Fog(0x101015, 10, 80); // Nebbia più permissiva

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI (MOLTO PIÙ LUMINOSO) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Luce ambientale forte
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xaabbff, 1.2); // Luce direzionale intensa
moonLight.position.set(20, 40, 20);
scene.add(moonLight);

// --- MAPPA 100x100 ---
const ARENA_SIZE = 100; 
const objects = []; 
const textureLoader = new THREE.TextureLoader();

// Materiale Monoliti
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 });

// Funzione Monoliti
function createMonolith(x, z) {
    const height = 4 + Math.random() * 14; 
    const width = 2 + Math.random() * 3;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

// Funzione Alberi (carica Tree.png)
const treeTexture = textureLoader.load('Tree.png');
function createTree(x, z) {
    const treeMat = new THREE.SpriteMaterial({ map: treeTexture, transparent: true });
    const sprite = new THREE.Sprite(treeMat);
    const size = 6 + Math.random() * 4;
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, size / 2, z);
    scene.add(sprite);

    // Collisione cilindrica invisibile per l'albero
    const hitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, size), 
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(x, size / 2, z);
    scene.add(hitBox);
    objects.push(hitBox);
}

// Generiamo 60 Monoliti e 100 Alberi
for (let i = 0; i < 60; i++) {
    let rx = (Math.random() - 0.5) * 90;
    let rz = (Math.random() - 0.5) * 90;
    if (Math.abs(rx) > 8 || Math.abs(rz) > 8) createMonolith(rx, rz);
}
for (let i = 0; i < 100; i++) {
    let rx = (Math.random() - 0.5) * 90;
    let rz = (Math.random() - 0.5) * 90;
    if (Math.abs(rx) > 8 || Math.abs(rz) > 8) createTree(rx, rz);
}

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Mura di confine
function createWall(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 15, d), new THREE.MeshStandardMaterial({ color: 0x050505 }));
    wall.position.set(x, 7.5, z);
    scene.add(wall);
    objects.push(wall);
}
createWall(0, -50, 100, 2); createWall(0, 50, 100, 2);
createWall(-50, 0, 2, 100); createWall(50, 0, 2, 100);

// --- BERSAGLI ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    target.position.set(x, 1, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*80, (Math.random()-0.5)*80);

// --- SPADA (CORREZIONE ROTAZIONE) ---
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);

// Resettiamo la rotazione: 0 è dritta, usiamo piccoli incrementi se necessario
swordSprite.material.rotation = 0; 
swordSprite.scale.set(1.2, 2.5, 1); 
swordSprite.position.set(0.8, -0.8, -1.5); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA MOVIMENTO ---
const player = new THREE.Object3D();
player.position.set(0, 0.5, 0);
scene.add(player);

let isAttacking = false, attackTime = 0;
let pitch = 0, yaw = 0;
const keys = {};

document.addEventListener('mousedown', () => {
    if (document.pointerLockElement === document.body && !isAttacking) {
        isAttacking = true; attackTime = 0;
    } else { document.body.requestPointerLock(); }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
    }
});
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function checkCollision(newX, newZ) {
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, 0.5, newZ), new THREE.Vector3(1.5, 1.5, 1.5));
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) return true; }
    return false;
}

function update(delta) {
    player.rotation.y = yaw;
    let mX = 0, mZ = 0;
    const speed = 12 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    if (!checkCollision(player.position.x + mX * speed, player.position.z)) player.position.x += mX * speed;
    if (!checkCollision(player.position.x, player.position.z + mZ * speed)) player.position.z += mZ * speed;

    camera.position.copy(player.position).y += 0.8;
    camera.rotation.set(pitch, yaw, 0);

    // Animazione Spada
    if (isAttacking) {
        attackTime += 12 * delta;
        swordSprite.position.z = -1.5 - Math.sin(attackTime) * 0.8;
        swordSprite.material.rotation = Math.sin(attackTime) * 0.5;
        if (attackTime >= Math.PI) { isAttacking = false; swordSprite.material.rotation = 0; }
    }
    
    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

function animate() {
    requestAnimationFrame(animate);
    update(clock.getDelta());
    renderer.render(scene, camera);
}
animate();
