const rig = document.getElementById('rig');
const body = document.getElementById('p-body');

function update() {
    // Incolla forzatamente la posizione del cubo a quella della camera
    body.object3D.position.x = rig.object3D.position.x;
    body.object3D.position.z = rig.object3D.position.z;
    body.object3D.position.y = rig.object3D.position.y - 0.75;
    
    // Collisione manuale (Muri a 15 metri)
    if (rig.object3D.position.x > 14.5) rig.object3D.position.x = 14.5;
    if (rig.object3D.position.x < -14.5) rig.object3D.position.x = -14.5;
    if (rig.object3D.position.z > 14.5) rig.object3D.position.z = 14.5;
    if (rig.object3D.position.z < -14.5) rig.object3D.position.z = -14.5;

    requestAnimationFrame(update);
}
update();
