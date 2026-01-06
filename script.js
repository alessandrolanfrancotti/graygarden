<!DOCTYPE html>
<html>
  <head>
    <title>GrayGarden 3D - Solid World</title>
    <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.1/dist/aframe-extras.min.js"></script>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

    <style>
      body { margin: 0; overflow: hidden; background-color: #000; }
      /* CSS per un eventuale menu o interfaccia futura */
      #instructions {
        position: absolute; top: 10px; left: 10px;
        color: white; font-family: sans-serif;
        background: rgba(0,0,0,0.5); padding: 10px;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="instructions">WASD per muoverti | SPAZIO per saltare | Click per bloccare il mouse</div>

    <a-scene renderer="antialias: true" shadow="type: pcfsoft">
      <a-sky color="#87CEEB"></a-sky>

      <a-entity light="type: ambient; intensity: 0.6"></a-entity>
      <a-entity light="type: directional; intensity: 0.8; castShadow: true" position="-1 10 1"></a-entity>

      <a-plane class="nav-mesh-candidate"
               rotation="-90 0 0" width="100" height="100" 
               color="#7BC8A4" static-body></a-plane>

      <a-box class="collidable" static-body position="0 1.5 -10" width="10" height="3" depth="1" color="#9E9E9E"></a-box>
      <a-box class="collidable" static-body position="5 1 -5" width="2" height="2" depth="2" color="#FF9800"></a-box>
      <a-box class="collidable" static-body position="-5 0.5 -3" width="2" height="1" depth="2" color="#FFC107"></a-box>

      <a-entity id="camera-rig" 
                movement-controls="controls: keyboard; speed: 0.2" 
                kinematic-body="radius: 0.4; height: 1.6"
                position="0 0.1 0">
        <a-camera id="local-player" look-controls="pointerLockEnabled: true">
          <a-entity cursor="fuse: false" 
                    position="0 0 -1" 
                    geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03" 
                    material="color: red; shader: flat">
          </a-entity>
        </a-camera>
      </a-entity>
    </a-scene>

    <script src="script.js"></script>
  </body>
</html>
