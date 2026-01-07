const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101015); // Grigio molto scuro, non nero

// NEBBIA MENO AGGRESSIVA: spostata più lontano (da 10 a 60 unità)
scene.fog = new THREE.Fog(0x101015, 10, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI (POTENZIATE) ---
// Luce ambientale molto più forte per vedere i volumi
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); 
scene.add(ambientLight);

// Luce direzionale (Luna) che proietta luce bianca/azzurra
const moonLight = new THREE.DirectionalLight(0xaabbff, 0.8);
moonLight.position.set(15, 30, 15);
scene.add(moonLight);

// --- MONOLITI E MONDO ---
const objects = []; 
// Materiale più chiaro (grigio scuro invece di nero) per riflettere la luce
const monolithMat = new THREE.MeshStandardMaterial({ 
    color: 0x222222, 
    roughness: 0.8, 
    metalness: 0.2 
});

function createMonolith(x, z) {
    const height = 4 + Math.random() * 12; 
    const width = 1.5 + Math.random() * 2.5;
    const geo = new THREE.BoxGeometry(width, height, width);
    const mesh = new THREE.Mesh(geo, monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

// Generiamo 60 monoliti
for (let i = 0; i < 60; i++) {
    let rx = (Math.random() - 0.5) * 120;
    let rz = (Math.random() - 0.5) * 120;
    if (Math.abs(rx) > 6 || Math.abs(rz) > 6) createMonolith(rx, rz);
}

// Pavimento grigio scuro (più visibile)
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 300),
    new THREE.MeshStandardMaterial({ color: 0x151515 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- BERSAGLI (Anime Rosse) ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1), 
        new THREE.MeshStandardMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000, 
            emissiveIntensity: 1 
        })
    );
    target.position.set(x, 0.8, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<12; i++) createTarget((Math.random()-0.5)*60, (Math.random()-0.5)*60);

// --- PARTICELLE ---
const particles = [];
function createExplosion(pos) {
    for (let i = 0; i < 15; i++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        p.position.copy(pos);
        p.userData = { 
            vel: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.5, (Math.random()-0.5)*0.5), 
            life: 1.0 
        };
        scene.add(p);
        particles.push(p);
    }
}

// --- GIOCATORE ---
const player = new THREE.Object3D(); 
player.position.set(0, 0.5, 0);
scene.add(player);
const otherPlayers = {};

// --- SPADA (SPRITE STRETTO) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);

swordSprite.material.rotation = Math.PI; 
swordSprite.scale.set(0.6, 2.0, 1); 
swordSprite.position.set(0.7, -0.6, -1.2); 
camera.add(swordSprite);
scene.add(camera);

// --- INPUT ---
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
    const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(newX, player.position.y, newZ), new THREE.Vector3(1.2, 1.2, 1.2));
    for (let obj of objects) { if (pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) return true; }
    return false;
}

function checkSwordHit() {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    raycaster.set(camera.position, dir);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0 && intersects[0].distance < 4) {
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

    if (keys['Space'] && player.position.y <= 0.51) velY = 0.25;
    velY -= 0.7 * delta; 
    player.position.y += velY;
    if (player.position.y < 0.5) { player.position.y = 0.5; velY = 0; }

    camera.position.copy(player.position).y += 0.6;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);

    // Particelle
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.position.add(p.userData.vel);
        p.userData.life -= 0.03;
        p.scale.setScalar(p.userData.life);
        if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
    }

    // Animazione Spada
    if (isAttacking) {
        attackTime += 14 * delta; 
        swordSprite.position.z = -1.2 - Math.sin(attackTime) * 0.7;
        swordSprite.material.rotation = Math.PI + Math.sin(attackTime) * 1.2;
        if (!hasHitInThisSwing && attackTime > 1.2) checkSwordHit();
        if (attackTime >= Math.PI) {
            isAttacking = false;
            swordSprite.material.rotation = Math.PI;
        }
    } else if (len > 0) {
        swordSprite.position.y = -0.6 + Math.sin(Date.now() * 0.012) * 0.04;
    }

    if (socket.connected) socket.emit('move', { x: player.position.x, y: player.position.y, z: player.position.z, rotY: yaw });
}

// --- MULTIPLAYER ---
socket.on('player-moved', (d) => {
    if (!otherPlayers[d.id]) {
        otherPlayers[d.id] = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({color: 0x444444}));
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
