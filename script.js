const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
const skyColor = 0x0a0a20; // Blu Notte
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 10, 85);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ'; 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- STELLE ---
const starGeo = new THREE.BufferGeometry();
const starCoords = [];
for (let i = 0; i < 1000; i++) {
    starCoords.push((Math.random() - 0.5) * 400, Math.random() * 200 + 50, (Math.random() - 0.5) * 400);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// --- LUCI ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const moonLight = new THREE.DirectionalLight(0xaabbff, 0.9);
moonLight.position.set(20, 50, 20);
scene.add(moonLight);

// --- MAPPA 100x100 ---
const ARENA_SIZE = 100;
const objects = [];
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

function createMonolith(x, z) {
    const height = 4 + Math.random() * 14; 
    const width = 2 + Math.random() * 3;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

for (let i = 0; i < 60; i++) {
    let rx = (Math.random() - 0.5) * 90;
    let rz = (Math.random() - 0.5) * 90;
    if (Math.abs(rx) > 7 || Math.abs(rz) > 7) createMonolith(rx, rz);
}

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x050505 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

function createBoundary(x, z, w, d) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 20, d), new THREE.MeshStandardMaterial({ color: 0x020205 }));
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
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*80, (Math.random()-0.5)*80);

// --- SPADA ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: swordTexture }));
swordSprite.scale.set(1.0, 2.5, 1); 
swordSprite.position.set(0.75, -0.6, -1.2); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA FISICA E INPUT ---
const player = new THREE.Object3D();
player.position.set(0, 1, 0); // Inizia un po' più in alto
scene.add(player);

let isAttacking = false, attackTime = 0;
let pitch = 0, yaw = 0;
let velY = 0;
let isGrounded = true;
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
        pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    }
});

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function update(delta) {
    camera.rotation.set(pitch, yaw, 0);

    let mX = 0, mZ = 0;
    const currentSpeed = 12.0 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    // Salto
    if (keys['Space'] && isGrounded) {
        velY = 0.25;
        isGrounded = false;
    }

    // Gravità
    velY -= 0.6 * delta;
    player.position.y += velY;

    if (player.position.y <= 1.0) {
        player.position.y = 1.0;
        velY = 0;
        isGrounded = true;
    }

    const nextX = player.position.x + mX * currentSpeed;
    const nextZ = player.position.z + mZ * currentSpeed;

    // Collisioni
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, player.position.y, nextZ), new THREE.Vector3(1.2, 2, 1.2));
    let collision = false;
    for (let obj of objects) {
        if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) { collision = true; break; }
    }

    if (!collision) {
        player.position.x = nextX;
        player.position.z = nextZ;
    }

    camera.position.copy(player.position).y += 0.6;

    // Animazione Spada
    if (isAttacking) {
        attackTime += 14 * delta;
        swordSprite.position.z = -1.2 - Math.sin(attackTime) * 0.7;
        swordSprite.material.rotation = Math.sin(attackTime) * 0.8;
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
