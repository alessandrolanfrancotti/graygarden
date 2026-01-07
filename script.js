const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505); // Cielo notturno quasi nero
scene.fog = new THREE.Fog(0x050505, 1, 30); // Nebbia oscura per profondità

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI DARK ---
scene.add(new THREE.AmbientLight(0x404040, 0.5)); // Luce ambientale soffusa
const moonLight = new THREE.PointLight(0x4444ff, 1, 50); // Luce lunare bluastra
moonLight.position.set(0, 20, 0);
scene.add(moonLight);

// --- MONOLITI E MONDO ---
const objects = []; // Array per collisioni (monoliti)
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

function createMonolith(x, z) {
    const height = 3 + Math.random() * 7; // Altezze diverse
    const width = 1 + Math.random() * 2;
    const geo = new THREE.BoxGeometry(width, height, width);
    const mesh = new THREE.Mesh(geo, monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

// Generiamo una selva di monoliti
for (let i = 0; i < 40; i++) {
    let rx = (Math.random() - 0.5) * 60;
    let rz = (Math.random() - 0.5) * 60;
    // Evitiamo che appaiano sopra il giocatore all'inizio
    if (Math.abs(rx) > 3 || Math.abs(rz) > 3) createMonolith(rx, rz);
}

// Pavimento Dark
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- BERSAGLI (Ancora presenti come "anime" rosse) ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 }));
    target.position.set(x, 0.4, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<5; i++) createTarget((Math.random()-0.5)*20, (Math.random()-0.5)*20);

// --- PARTICELLE ---
const particles = [];
function createExplosion(pos) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        p.position.copy(pos);
        p.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.3, Math.random()*0.3, (Math.random()-0.5)*0.3), life: 1.0 };
        scene.add(p);
        particles.push(p);
    }
}

// --- GIOCATORE ---
const player = new THREE.Object3D(); // Solo un contenitore invisibile
player.position.set(0, 0.5, 0);
scene.add(player);
const otherPlayers = {};

// --- SPADA (SPRITE) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);

swordSprite.material.rotation = Math.PI; 
// STRINGIAMO IL PNG: asse X più piccolo (0.6 invece di 1.5)
swordSprite.scale.set(0.6, 1.8, 1); 
swordSprite.position.set(0.6, -0.5, -0.8); 
camera.add(swordSprite);
scene.add(camera);

// --- INPUT E LOGICA ---
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
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(0.8, 0.8, 0.8));
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) return true; }
    return false;
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 3.5) {
        const obj = intersects[0].object;
        createExplosion(obj.position);
        scene.remove(obj);
        targets.splice(targets.indexOf(obj), 1);
        hasHitInThisSwing = true;
    }
}

let velY = 0;
function update(delta) {
    player.rotation.y = yaw;
    let mX = 0, mZ = 0;
    const currentSpeed = 10.0 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    const len = Math.sqrt(mX*mX + mZ*mZ);
    if (len > 0) { mX = (mX/len)*currentSpeed; mZ = (mZ/len)*currentSpeed; }

    if (!checkCollision(player.position.x + mX, player.position.z)) player.position.x += mX;
    if (!checkCollision(player.position.x, player.position.z + mZ)) player.position.z += mZ;

    if (keys['Space'] && player.position.y <= 0.51) velY = 0.22;
    velY -= 0.6 * delta; 
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    camera.position.copy(player.position).y += 0.4;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= 0.02;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Animazione Spada (più stretta e lunga)
    if (isAttacking) {
        attackTime += 12 * delta;
        swordSprite.position.z = -0.8 - Math.sin(attackTime) * 0.5;
        swordSprite.material.rotation = Math.PI + Math.sin(attackTime) * 0.8;
        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordSprite.material.rotation = Math.PI;
        }
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

socket.on('player-moved', (d) => {
    if (!otherPlayers[d.id]) {
        otherPlayers[d.id] = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color: 0x333333}));
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
