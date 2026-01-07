const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.Fog(0x050508, 2, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- SISTEMA DI LUCI (CORRETTO) ---
// Luce ambientale per non avere il nero assoluto
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); 
scene.add(ambientLight);

// LANTERNA DEL GIOCATORE (PointLight invece di SpotLight)
const lantern = new THREE.PointLight(0xffffff, 1.5, 40);
camera.add(lantern); 
scene.add(camera);

// --- MONOLITI ---
const objects = [];
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

function createMonolith(x, z) {
    const height = 5 + Math.random() * 10;
    const width = 2 + Math.random() * 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}
for (let i = 0; i < 70; i++) {
    let rx = (Math.random() - 0.5) * 150, rz = (Math.random() - 0.5) * 150;
    if (Math.abs(rx) > 7 || Math.abs(rz) > 7) createMonolith(rx, rz);
}

const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x111111 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- BERSAGLI ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    target.position.set(x, 1, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*80, (Math.random()-0.5)*80);

// --- PARTICELLE ---
const particles = [];
function createExplosion(pos) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        p.position.copy(pos);
        p.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.4, Math.random()*0.4, (Math.random()-0.5)*0.4), life: 1.0 };
        scene.add(p);
        particles.push(p);
    }
}

// --- SPADA (MIGLIORATA) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
// MeshStandardMaterial permette alla spada di essere illuminata dalla lanterna
const swordMat = new THREE.MeshStandardMaterial({ map: swordTexture, transparent: true, side: THREE.DoubleSide });
const swordGeo = new THREE.PlaneGeometry(1, 2); 
const swordMesh = new THREE.Mesh(swordGeo, swordMat);

swordMesh.position.set(0.8, -0.7, -1.2);
swordMesh.rotation.y = -Math.PI / 4; // Rotazione 3/4
swordMesh.rotation.z = Math.PI;      // Raddrizza l'immagine
camera.add(swordMesh);

// --- LOGICA MOVIMENTO ---
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
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, 0.5, newZ), new THREE.Vector3(1.2, 1.2, 1.2));
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
        createExplosion(obj.position);
        scene.remove(obj);
        targets.splice(targets.indexOf(obj), 1);
        hasHitInThisSwing = true;
    }
}

let velY = 0;
function update(delta) {
    let mX = 0, mZ = 0;
    const currentSpeed = 10.0 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    const len = Math.sqrt(mX*mX + mZ*mZ);
    if (len > 0) { mX = (mX/len)*currentSpeed; mZ = (mZ/len)*currentSpeed; }

    if (!checkCollision(camera.position.x + mX, camera.position.z)) camera.position.x += mX;
    if (!checkCollision(camera.position.x, camera.position.z + mZ)) camera.position.z += mZ;

    // Salto semplice applicato alla camera
    if (keys['Space'] && camera.position.y <= 1.1) velY = 0.2;
    velY -= 0.6 * delta; 
    camera.position.y += velY;
    if (camera.position.y < 1.0) { camera.position.y = 1.0; velY = 0; }

    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= 0.03;
        p.scale.setScalar(Math.max(0, p.userData.life));
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Animazione Spada
    if (isAttacking) {
        attackTime += 14 * delta;
        swordMesh.position.z = -1.2 - Math.sin(attackTime) * 0.8;
        swordMesh.rotation.x = Math.sin(attackTime) * 1.5;
        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordMesh.rotation.x = 0;
            swordMesh.position.z = -1.2;
        }
    }

    if (socket.connected) socket.emit('move', { x: camera.position.x, y: camera.position.y, z: camera.position.z, rotY: yaw });
}

const otherPlayers = {};
socket.on('player-moved', (d) => {
    if (!otherPlayers[d.id]) {
        otherPlayers[d.id] = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0x555555}));
        scene.add(otherPlayers[d.id]);
    }
    otherPlayers[d.id].position.set(d.x, d.y, d.z);
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
