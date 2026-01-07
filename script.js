const socket = io("http://localhost:3000");

// --- SETUP SCENA ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101015);
scene.fog = new THREE.Fog(0x101015, 5, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// IMPORTANTE: Ordine di rotazione per evitare la visuale storta
camera.rotation.order = 'YXZ'; 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// --- LUCI ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const moonLight = new THREE.DirectionalLight(0xaabbff, 1.0);
moonLight.position.set(20, 50, 20);
scene.add(moonLight);

// --- MAPPA ---
const ARENA_SIZE = 100;
const objects = [];
const textureLoader = new THREE.TextureLoader();

// Alberi come PIANI (non ruotano se guardi in alto/basso)
const treeTexture = textureLoader.load('Tree.png');
const treeGeo = new THREE.PlaneGeometry(8, 8);
const treeMat = new THREE.MeshStandardMaterial({ map: treeTexture, transparent: true, side: THREE.DoubleSide, alphaTest: 0.5 });

function createTree(x, z) {
    const tree = new THREE.Mesh(treeGeo, treeMat);
    tree.position.set(x, 4, z);
    // Gli alberi guardano verso il centro ma restano verticali
    scene.add(tree);
    
    const hitBox = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 8), new THREE.MeshBasicMaterial({visible:false}));
    hitBox.position.set(x, 4, z);
    scene.add(hitBox);
    objects.push(hitBox);
}

// Generiamo 60 Monoliti e 100 Alberi
for (let i = 0; i < 60; i++) {
    const rx = (Math.random()-0.5)*90, rz = (Math.random()-0.5)*90;
    if (Math.abs(rx)>8 || Math.abs(rz)>8) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2, 6+Math.random()*10, 2), new THREE.MeshStandardMaterial({color:0x222222}));
        m.position.set(rx, m.geometry.parameters.height/2, rz);
        scene.add(m);
        objects.push(m);
    }
}
for (let i = 0; i < 100; i++) {
    const rx = (Math.random()-0.5)*90, rz = (Math.random()-0.5)*90;
    if (Math.abs(rx)>8 || Math.abs(rz)>8) createTree(rx, rz);
}

const floor = new THREE.Mesh(new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE), new THREE.MeshStandardMaterial({color:0x111111}));
floor.rotation.x = -Math.PI/2;
scene.add(floor);

// --- SPADA (SPRITE FISSO ALLA CAMERA) ---
const swordTexture = textureLoader.load('sword.png');
const swordMat = new THREE.SpriteMaterial({ map: swordTexture });
const sword = new THREE.Sprite(swordMat);
sword.scale.set(1, 2, 1);
sword.position.set(0.7, -0.6, -1.2); 
camera.add(sword);
scene.add(camera);

// --- MOVIMENTO E ROTAZIONE ---
const player = new THREE.Object3D();
scene.add(player);

let yaw = 0, pitch = 0;
const keys = {};

document.addEventListener('mousedown', () => document.body.requestPointerLock());
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI/2.5, Math.min(Math.PI/2.5, pitch));
    }
});
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function update(delta) {
    // Rotazione corretta
    camera.rotation.set(pitch, yaw, 0);

    let mX = 0, mZ = 0;
    const speed = 12 * delta;
    if (keys['KeyW']) { mX -= Math.sin(yaw); mZ -= Math.cos(yaw); }
    if (keys['KeyS']) { mX += Math.sin(yaw); mZ += Math.cos(yaw); }
    if (keys['KeyA']) { mX -= Math.cos(yaw); mZ += Math.sin(yaw); }
    if (keys['KeyD']) { mX += Math.cos(yaw); mZ -= Math.sin(yaw); }

    // Collisioni
    if (mX !== 0 || mZ !== 0) {
        const nextX = player.position.x + mX * speed;
        const nextZ = player.position.z + mZ * speed;
        
        const pBox = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(nextX, 1, nextZ), new THREE.Vector3(1, 2, 1));
        let collision = false;
        for(let obj of objects) {
            if(pBox.intersectsBox(new THREE.Box3().setFromObject(obj))) { collision = true; break; }
        }
        if(!collision) {
            player.position.x = nextX;
            player.position.z = nextZ;
        }
    }
    camera.position.copy(player.position).y += 1.6;
}

function animate() {
    requestAnimationFrame(animate);
    update(clock.getDelta());
    renderer.render(scene, camera);
}
animate();
