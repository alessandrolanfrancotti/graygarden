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

// --- STELLE ---
const starGeo = new THREE.BufferGeometry();
const starCoords = [];
for (let i = 0; i < 1000; i++) {
    starCoords.push((Math.random() - 0.5) * 400, Math.random() * 200 + 50, (Math.random() - 0.5) * 400);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 }));
scene.add(stars);

// --- LUCI ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const moonLight = new THREE.DirectionalLight(0xaabbff, 0.9);
moonLight.position.set(20, 50, 20);
scene.add(moonLight);

// --- MAPPA E MONOLITI ---
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

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), new THREE.MeshStandardMaterial({ color: 0x050505 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- BERSAGLI ED ESPLOSIONI ---
const targets = [];
const particles = [];

function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    target.position.set(x, 1, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*80, (Math.random()-0.5)*80);

function createExplosion(pos) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        p.position.copy(pos);
        p.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5), life: 1.0 };
        scene.add(p);
        particles.push(p);
    }
}

// --- SPADA ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: swordTexture }));
swordSprite.scale.set(1.0, 2.5, 1); 
swordSprite.position.set(0.75, -0.6, -1.2); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA GIOCATORE ---
const player = new THREE.Object3D();
player.position.set(0, 1, 0);
scene.add(player);

let isAttacking = false, attackTime = 0, hasHitInThisSwing = false;
let pitch = 0, yaw = 0, velY = 0, isGrounded = true;
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
        pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
    }
});
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

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

function update(delta) {
    camera.rotation.set(pitch, yaw, 0);
    let mX = 0, mZ = 0;
    const currentSpeed = 12.0 * delta;

    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    if (keys['Space'] && isGrounded) { velY = 0.25; isGrounded = false; }
    velY -= 0.6 * delta;
    player.position.y += velY;
    if (player.position.y <= 1.0) { player.position.y = 1.0; velY = 0; isGrounded = true; }

    const nextX = player.position.x + mX * currentSpeed;
    const nextZ = player.position.z + mZ * currentSpeed;

    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, player.position.y, nextZ), new THREE.Vector3(1.2, 2, 1.2));
    let collision = false;
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) { collision = true; break; } }
    if (!collision) { player.position.x = nextX; player.position.z = nextZ; }

    camera.position.copy(player.position).y += 0.6;

    // Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= 0.03;
        p.scale.setScalar(Math.max(0.001, p.userData.life));
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Animazione Spada e Hit Check
    if (isAttacking) {
        attackTime += 14 * delta;
        swordSprite.position.z = -1.2 - Math.sin(attackTime) * 0.7;
        swordSprite.material.rotation = Math.sin(attackTime) * 0.8;
        
        // Controlla l'impatto a metà animazione
        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        
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
