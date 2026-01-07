const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Cielo azzurro per testare la visibilità!

// ABBIAMO TOLTO LA NEBBIA per vedere se il problema è quello
// scene.fog = new THREE.Fog(0x87CEEB, 1, 100); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI MASSIME ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Luce totale bianca
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Sole fortissimo
sunLight.position.set(50, 100, 50);
scene.add(sunLight);

// --- MAPPA 100x100 ---
const ARENA_SIZE = 100; 
const objects = []; 
const textureLoader = new THREE.TextureLoader();

// Materiale Monoliti (Grigio Chiaro ora)
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

// Texture Albero
const treeTexture = textureLoader.load('Tree.png');

function createMonolith(x, z) {
    const height = 4 + Math.random() * 10; 
    const width = 2 + Math.random() * 2;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), monolithMat);
    mesh.position.set(x, height / 2, z);
    scene.add(mesh);
    objects.push(mesh);
}

function createTree(x, z) {
    const treeMat = new THREE.SpriteMaterial({ map: treeTexture, transparent: true });
    const sprite = new THREE.Sprite(treeMat);
    const size = 6; 
    sprite.scale.set(size, size, 1);
    sprite.position.set(x, size / 2, z);
    scene.add(sprite);
    
    // Hitbox invisibile per gli alberi
    const hitBox = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, size), 
        new THREE.MeshBasicMaterial({ visible: false })
    );
    hitBox.position.set(x, size / 2, z);
    scene.add(hitBox);
    objects.push(hitBox); 
}

// Generiamo elementi
for (let i = 0; i < 40; i++) {
    createMonolith((Math.random()-0.5)*90, (Math.random()-0.5)*90);
}
for (let i = 0; i < 50; i++) {
    createTree((Math.random()-0.5)*90, (Math.random()-0.5)*90);
}

// Pavimento Verde
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x228B22 }) 
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- SPADA ---
const swordTexture = textureLoader.load('sword.png');
const swordMaterial = new THREE.SpriteMaterial({ map: swordTexture, transparent: true });
const swordSprite = new THREE.Sprite(swordMaterial);
swordSprite.material.rotation = Math.PI; 
swordSprite.scale.set(0.8, 2.5, 1); 
swordSprite.position.set(0.7, -0.6, -1); 
camera.add(swordSprite);
scene.add(camera);

// --- LOGICA MOVIMENTO ---
const player = new THREE.Object3D(); 
player.position.set(0, 0.5, 0); // Parti al centro
scene.add(player);

let pitch = 0, yaw = 0;
const keys = {};

document.addEventListener('mousedown', () => document.body.requestPointerLock());
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-1.5, Math.min(1.5, pitch));
    }
});
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function update(delta) {
    player.rotation.y = yaw;
    let mX = 0, mZ = 0;
    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    
    player.position.x += mX * 10 * delta;
    player.position.z += mZ * 10 * delta;

    camera.position.copy(player.position).y += 1.0;
    camera.rotation.set(pitch, yaw, 0);
}

function animate() {
    requestAnimationFrame(animate);
    update(clock.getDelta());
    renderer.render(scene, camera);
}
animate();
