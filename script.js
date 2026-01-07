const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.Fog(0x020205, 5, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI ---
const ambientLight = new THREE.AmbientLight(0x202030, 0.3); // Molto bassa
scene.add(ambientLight);

// TORCIA (SpotLight)
const flashlight = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 6, 0.5, 1);
camera.add(flashlight);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight.target);
scene.add(camera);

// --- MONOLITI E MONDO ---
const objects = [];
const monolithMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

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

const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x050505 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// --- BERSAGLI E PARTICELLE ---
const targets = [];
function createTarget(x, z) {
    const target = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 }));
    target.position.set(x, 1, z);
    scene.add(target);
    targets.push(target);
}
for(let i=0; i<15; i++) createTarget((Math.random()-0.5)*80, (Math.random()-0.5)*80);

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

// --- SPADA (USIAMO PLANE PER ROTAZIONE 3/4) ---
const textureLoader = new THREE.TextureLoader();
const swordTexture = texture
