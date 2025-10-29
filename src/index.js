import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

// Variables principales
let scene, renderer, composer;
let camera;
let camcontrols1;
let planets = [];
let sunLight;
let moon;
const moonOrbitSpeed = 0.05;

// Variables de control de movimiento
let keyState = {};
const moveSpeed = 1.0;
const rotationSpeed = 0.015;

// --- VARIABLES DE ESTADO Y MINIMAPA ---
let isFreeFlightMode = true; // Control: true = Teclado, false = Ratón/Orbital

let miniMapCamera;
let miniMapRenderer;
let cameraMarker;
const miniMapSize = 90;
const miniMapPixelWidth = 200;
const miniMapPixelHeight = 200;

// --- VARIABLES DE CAPAS ---
const MAIN_SCENE_LAYER = 0;
const MINIMAP_LAYER = 1;

// Vector auxiliar para aplicar rotaciones (Pitch y Yaw)
const euler = new THREE.Euler(0, 0, 0, "YXZ");
const PI_2 = Math.PI / 2;

// --- RAYCASTER PARA INTERACCIÓN ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- VARIABLE DE SEGUIMIENTO (TRACKING) ---
let targetPlanet = null;

let options = {
  bloomStrength: 1.8,
  bloomRadius: 0.5,
  bloomThreshold: 0.0,
};

// Sol y planetas
let sun;

init();
animationLoop();

function init() {
  // Escena y renderizador PRINCIPAL
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // --- RENDERIZADOR DEL MINIMAPA ---
  miniMapRenderer = new THREE.WebGLRenderer({ antialias: true });
  miniMapRenderer.setSize(miniMapPixelWidth, miniMapPixelHeight);
  miniMapRenderer.setClearColor(0x0a0a0a, 1);
  miniMapRenderer.outputColorSpace = THREE.SRGBColorSpace;
  document
    .getElementById("minimap-container")
    .appendChild(miniMapRenderer.domElement);
  // ----------------------------------

  // --- 1. CÁMARA PRINCIPAL ---
  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 80, 160);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  camera.layers.set(MAIN_SCENE_LAYER);

  // --- 2. CÁMARA DEL MINIMAPA (Orthographic) ---
  const aspect = miniMapPixelWidth / miniMapPixelHeight;
  miniMapCamera = new THREE.OrthographicCamera(
    -miniMapSize * aspect,
    miniMapSize * aspect,
    miniMapSize,
    -miniMapSize,
    0.1,
    2000
  );
  miniMapCamera.position.set(0, 150, 0);
  miniMapCamera.lookAt(new THREE.Vector3(0, 0, 0));
  miniMapCamera.layers.enable(MAIN_SCENE_LAYER);
  miniMapCamera.layers.enable(MINIMAP_LAYER);

  // Controles OrbitControls
  camcontrols1 = new OrbitControls(camera, renderer.domElement);
  camcontrols1.enableDamping = true;
  camcontrols1.enabled = !isFreeFlightMode; // Empieza deshabilitado
  camcontrols1.target.set(0, 0, 0);

  // --- DETECCIÓN DE CLIC EN EL PLANETA ---
  renderer.domElement.addEventListener("click", onCanvasClick, false);

  // Luz ambiental
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  // Sol (Malla brillante)
  const sunTexture = new THREE.TextureLoader().load(
    "https://cdn.glitch.global/4ef4523f-860d-4be6-8e31-51b2292cc4c4/2k_sun.jpg"
  );
  const sunGeometry = new THREE.SphereGeometry(10, 64, 64);
  const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  // Añadimos datos de usuario al Sol
  sun.userData = {
    name: "Sol",
    infoColor: "#ffff00",
    details:
      "Estrella central del sistema. Representa el 99.8% de la masa total.",
  };
  sun.position.set(0, 0, 0);
  scene.add(sun);

  // Luz Solar
  sunLight = new THREE.DirectionalLight(0xffffff, 8);
  sunLight.position.set(0, 0, 0);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight.target);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 200;
  sunLight.shadow.camera.left = -100;
  sunLight.shadow.camera.right = 100;
  sunLight.shadow.camera.top = 100;
  sunLight.shadow.camera.bottom = -100;
  scene.add(sunLight);

  // LÓGICA DE FONDO ESFÉRICO 3D
  const loader = new THREE.TextureLoader();
  const milkyWayTexture = loader.load(
    "https://cdn.glitch.global/4ef4523f-860d-4be6-8e31-51b2292cc4c4/8k_stars_milky_way.jpg"
  );

  const milkyWayGeometry = new THREE.SphereGeometry(1000, 64, 64);
  const milkyWayMaterial = new THREE.MeshBasicMaterial({
    map: milkyWayTexture,
    side: THREE.BackSide,
  });
  const milkyWay = new THREE.Mesh(milkyWayGeometry, milkyWayMaterial);
  scene.add(milkyWay);

  // Crear planetas
  createPlanets();

  // --- CREAR MARCADOR DE CÁMARA (Triángulo) ---
  const markerShape = new THREE.Shape();
  markerShape.moveTo(0, 3); // Punta
  markerShape.lineTo(-2, -2); // Base izquierda
  markerShape.lineTo(2, -2); // Base derecha
  markerShape.lineTo(0, 3); // Volver a la punta

  const markerGeo = new THREE.ShapeGeometry(markerShape);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
  });
  cameraMarker = new THREE.Mesh(markerGeo, markerMat);

  // Girar el triángulo para que quede "plano" en el plano XZ
  cameraMarker.rotation.x = -Math.PI / 2;

  // Asignar el marcador solo a la capa del minimapa
  cameraMarker.layers.set(MINIMAP_LAYER);
  scene.add(cameraMarker);
  // ------------------------------------

  // Controles de teclado
  document.addEventListener("keydown", (e) => {
    keyState[e.code] = true;
    // Alternar modo con la Barra espaciadora
    if (e.code === "Space") {
      toggleControlMode();
    }
    // Tecla R para resetear vista orbital
    if (e.code === "KeyR" && !isFreeFlightMode) {
      resetOrbitalView();
    }
  });
  document.addEventListener("keyup", (e) => (keyState[e.code] = false));

  // Postprocesado (bloom)
  const renderScene = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    options.bloomStrength,
    options.bloomRadius,
    options.bloomThreshold
  );
  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  window.addEventListener("resize", onWindowResize);

  // Inicializar mensaje de control
  updateControlInfo();
}

// --- FUNCIÓN PARA ALTERNAR MODOS ---
function toggleControlMode() {
  isFreeFlightMode = !isFreeFlightMode;
  camcontrols1.enabled = !isFreeFlightMode;
  targetPlanet = null; // Reiniciar seguimiento al cambiar de modo

  if (isFreeFlightMode) {
    // Ocultar panel de información
    document.getElementById("planet-info").classList.add("hidden");
    // Al cambiar a Vuelo Libre, guarda la rotación actual
    euler.setFromQuaternion(camera.quaternion);
  } else {
    // Al cambiar a Orbital, fija el objetivo en el Sol
    camcontrols1.target.set(0, 0, 0);
    camcontrols1.update();
  }
  updateControlInfo();
}
// ------------------------------------------

// FUNCIÓN: Resetea la vista orbital al Sol
function resetOrbitalView() {
  // 1. Desactiva el seguimiento
  targetPlanet = null;

  // 2. Centra el target en el Sol (0, 0, 0)
  camcontrols1.target.set(0, 0, 0);

  // 3. Mueve la cámara a la posición inicial (o una posición orbital segura)
  camera.position.set(0, 80, 160);

  // 4. Asegúrate de que los controles se actualicen
  camcontrols1.update();

  // 5. Oculta el panel de información
  document.getElementById("planet-info").classList.add("hidden");

  console.log("Vista reseteada a órbita estándar del Sol.");
}

function updateControlInfo() {
  const infoDiv = document.getElementById("control-info");
  if (isFreeFlightMode) {
    infoDiv.textContent =
      "Control: Vuelo Libre (Teclado - W,S,A,D, Q,E, Flechas)";
  } else {
    infoDiv.textContent =
      "Control: Orbital (Ratón - Clic en planeta para enfocar y seguir | R para resetear)";
  }
}

// --- FUNCIÓN PARA DETECTAR, CENTRAR Y ACERCAR PLANETA ---
function onCanvasClick(event) {
  // Solo permitir centrar si estamos en Modo Orbital
  if (isFreeFlightMode) return;

  // 1. Convertir coordenadas de pantalla a coordenadas normalizadas (-1 a +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // 2. Actualizar el raycaster
  raycaster.setFromCamera(mouse, camera);

  // 3. Objetos a intersectar (planetas principales y el Sol)
  const intersectableObjects = [...planets, sun];

  const intersects = raycaster.intersectObjects(intersectableObjects, true);

  const infoPanel = document.getElementById("planet-info");

  if (intersects.length > 0) {
    let targetMesh = null;
    for (const intersect of intersects) {
      let current = intersect.object;
      if (current === sun) {
        targetMesh = sun;
        break;
      }
      while (current) {
        if (planets.includes(current)) {
          targetMesh = current;
          break;
        }
        current = current.parent;
      }
      if (targetMesh) break;
    }

    if (targetMesh) {
      // --- ACTUALIZAR PANELES DE INFO Y COLOR ---
      const planetName = targetMesh.userData.name || "Sol";
      const orbitRadius = targetMesh.userData.orbitRadius || 0;
      const distanceText =
        orbitRadius > 0
          ? `Distancia Orbital: ${orbitRadius.toFixed(1)} Unidades`
          : "N/A";

      // Configurar el color dinámico
      const color = targetMesh.userData.infoColor || "#ffffff";
      infoPanel.style.setProperty("--planet-color", color);

      document.getElementById(
        "info-name"
      ).textContent = `Nombre: ${planetName}`;
      document.getElementById("info-distance").textContent = distanceText;
      document.getElementById("info-details").textContent =
        targetMesh.userData.details || "No hay detalles adicionales.";
      document.getElementById(
        "info-header"
      ).textContent = `PLANETA SELECCIONADO`;

      infoPanel.classList.remove("hidden");

      // Aseguramos que el boundingSphere exista
      if (!targetMesh.geometry.boundingSphere) {
        targetMesh.geometry.computeBoundingSphere();
      }

      // OBTENEMOS EL TAMAÑO DEL OBJETIVO
      const objectRadius = targetMesh.geometry.boundingSphere.radius;
      const focusDistance = objectRadius * 4;

      // 4. Mover el objetivo de OrbitControls
      camcontrols1.target.copy(targetMesh.position);

      // 5. Mover la cámara cerca del objetivo
      const currentPosition = new THREE.Vector3();
      camera.getWorldPosition(currentPosition);
      const direction = new THREE.Vector3()
        .subVectors(currentPosition, camcontrols1.target)
        .normalize();
      const newCameraPosition = new THREE.Vector3()
        .copy(camcontrols1.target)
        .addScaledVector(direction, focusDistance);
      camera.position.copy(newCameraPosition);

      // 6. Lógica de SEGUIMIENTO (TRACKING)
      if (targetMesh === sun) {
        targetPlanet = null; // Desactiva seguimiento si se pulsa el Sol
      } else {
        targetPlanet = targetMesh; // Activa seguimiento del planeta
      }

      // Actualizamos los controles
      camcontrols1.update();
    }
  }
}
// ----------------------------------------------

function createPlanets() {
  // DATOS DE PLANETAS CON MÁS DETALLES Y COLOR DE INTERFAZ
  const planetData = [
    {
      name: "Mercurio",
      size: 1,
      orbit: 15,
      speed: 0.02,
      texture: "2k_mercury.jpg",
      tilt: 7,
      infoColor: "#c3a373",
      details:
        "El planeta más pequeño y cercano al Sol. Su superficie es rocosa, similar a la Luna.",
    },
    {
      name: "Venus",
      size: 1.5,
      orbit: 20,
      speed: 0.015,
      texture: "2k_venus_surface.jpg",
      tilt: 3,
      infoColor: "#e0c25a",
      details:
        "Conocido como el 'gemelo' de la Tierra, pero su densa atmósfera de CO2 crea un efecto invernadero extremo.",
    },
    {
      name: "Tierra",
      size: 2,
      orbit: 25,
      speed: 0.01,
      texture: "2k_earth_daymap.jpg",
      tilt: 23.5,
      infoColor: "#4d94ff",
      details:
        "El único mundo conocido con vida. Gira sobre su eje en 24 horas y tiene una órbita de 365 días.",
    },
    {
      name: "Marte",
      size: 1.2,
      orbit: 30,
      speed: 0.008,
      texture: "2k_mars.jpg",
      tilt: 25,
      infoColor: "#ff6347",
      details:
        "El 'Planeta Rojo'. Hogar de la montaña más alta del sistema solar (Olympus Mons) y posibles vestigios de agua.",
    },
    {
      name: "Júpiter",
      size: 4,
      orbit: 40,
      speed: 0.005,
      texture: "2k_jupiter.jpg",
      tilt: 3,
      infoColor: "#ffb65e",
      details:
        "El gigante gaseoso, el planeta más grande. Su Gran Mancha Roja es una tormenta que ha durado siglos.",
    },
    {
      name: "Saturno",
      size: 3.5,
      orbit: 50,
      speed: 0.004,
      texture: "2k_saturn.jpg",
      tilt: 26.7,
      infoColor: "#ffd700",
      details:
        "Famoso por su impresionante sistema de anillos, compuestos principalmente de hielo y roca.",
    },
    {
      name: "Urano",
      size: 2.5,
      orbit: 60,
      speed: 0.003,
      texture: "2k_uranus.jpg",
      tilt: 97,
      infoColor: "#a0c4ff",
      details:
        "Un gigante de hielo que rota de lado, con un eje de inclinación de 98 grados, dando lugar a estaciones extremas.",
    },
    {
      name: "Neptuno",
      size: 2.5,
      orbit: 70,
      speed: 0.0025,
      texture: "2k_neptune.jpg",
      tilt: 28,
      infoColor: "#3a7dff",
      details:
        "El planeta más lejano, conocido por sus vientos supersónicos y su color azul brillante.",
    },
  ];

  const loader = new THREE.TextureLoader();
  planetData.forEach((p, index) => {
    const tex = loader.load(
      `https://cdn.glitch.global/4ef4523f-860d-4be6-8e31-51b2292cc4c4/${p.texture}`
    );
    tex.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.SphereGeometry(p.size, 64, 64);

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      metalness: 0.1,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Calcular el bounding sphere una vez, ayuda en el raycasting
    geo.computeBoundingSphere();

    mesh.userData = {
      name: p.name,
      orbitRadius: p.orbit,
      orbitSpeed: p.speed,
      angle: Math.random() * Math.PI * 2,
      // NUEVOS DATOS
      infoColor: p.infoColor,
      details: p.details,
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.z = THREE.MathUtils.degToRad(p.tilt);
    mesh.position.set(p.orbit, 0, 0);
    scene.add(mesh);
    drawOrbit(p.orbit);
    planets.push(mesh);

    if (p.name === "Tierra") {
      const moonSize = 0.5;
      const moonOrbitRadius = 3;

      const moonTex = loader.load(
        "https://cdn.glitch.global/4ef4523f-860d-4be6-8e31-51b2292cc4c4/2k_moon.jpg"
      );
      moonTex.colorSpace = THREE.SRGBColorSpace;

      const moonGeo = new THREE.SphereGeometry(moonSize, 32, 32);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        metalness: 0.1,
        roughness: 0.9,
      });

      moon = new THREE.Mesh(moonGeo, moonMat);
      moon.castShadow = true;
      moon.receiveShadow = true;

      moon.position.set(moonOrbitRadius, 0, 0);

      moon.userData.moonRadius = moonOrbitRadius;
      moon.userData.moonAngle = 0;

      mesh.add(moon);
    }
  });

  // Anillos de Saturno
  const ringGeo = new THREE.RingGeometry(4.5, 8, 128);
  const ringMat = new THREE.MeshBasicMaterial({
    map: loader.load(
      "https://cdn.glitch.global/4ef4523f-860d-4be6-8e31-51b2292cc4c4/2k_saturn_ring_alpha.png"
    ),
    side: THREE.DoubleSide,
    transparent: true,
  });
  const rings = new THREE.Mesh(ringGeo, ringMat);
  rings.rotation.x = Math.PI / 2;
  rings.receiveShadow = true;
  rings.castShadow = true;
  planets[5].add(rings);
}

function drawOrbit(radius) {
  const points = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(radius * Math.cos(theta), 0, radius * Math.sin(theta))
    );
  }
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x888888 });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  scene.add(orbit);
}

function animatePlanets() {
  planets.forEach((planet) => {
    planet.userData.angle += planet.userData.orbitSpeed;
    planet.position.set(
      planet.userData.orbitRadius * Math.cos(planet.userData.angle),
      0,
      planet.userData.orbitRadius * Math.sin(planet.userData.angle)
    );
    planet.rotation.y += 0.01;
  });
}

function animateMoon() {
  if (moon) {
    moon.userData.moonAngle += moonOrbitSpeed;

    moon.position.x =
      moon.userData.moonRadius * Math.cos(moon.userData.moonAngle);
    moon.position.z =
      moon.userData.moonRadius * Math.sin(moon.userData.moonAngle);

    moon.rotation.y += 0.005;
  }
}

function handleCameraMovement() {
  // Solo se mueve si el modo Vuelo Libre está activo
  if (!isFreeFlightMode) return;

  euler.setFromQuaternion(camera.quaternion);

  if (keyState["ArrowUp"]) {
    euler.x += rotationSpeed;
  }
  if (keyState["ArrowDown"]) {
    euler.x -= rotationSpeed;
  }
  if (keyState["ArrowLeft"]) {
    euler.y += rotationSpeed;
  }
  if (keyState["ArrowRight"]) {
    euler.y -= rotationSpeed;
  }

  euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x)); // Limita la rotación vertical

  camera.quaternion.setFromEuler(euler);

  if (keyState["KeyW"]) {
    camera.translateZ(-moveSpeed);
  }
  if (keyState["KeyS"]) {
    camera.translateZ(moveSpeed);
  }
  if (keyState["KeyA"]) {
    camera.translateX(-moveSpeed);
  }
  if (keyState["KeyD"]) {
    camera.translateX(moveSpeed);
  }
  if (keyState["KeyQ"]) {
    camera.translateY(moveSpeed);
  }
  if (keyState["KeyE"]) {
    camera.translateY(-moveSpeed);
  }
}

function onWindowResize() {
  // Ajustar renderer principal
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  // Ajustar cámara ortográfica (minimapa)
  const mmAspect = miniMapPixelWidth / miniMapPixelHeight;
  miniMapCamera.left = -miniMapSize * mmAspect;
  miniMapCamera.right = miniMapSize * mmAspect;
  miniMapCamera.top = miniMapSize;
  miniMapCamera.bottom = -miniMapSize;
  miniMapCamera.updateProjectionMatrix();

  // Ajustar tamaño del renderer del minimapa
  miniMapRenderer.setSize(miniMapPixelWidth, miniMapPixelHeight);
}

function animationLoop() {
  requestAnimationFrame(animationLoop);
  animatePlanets();
  animateMoon();
  sun.rotation.y += 0.002;

  sunLight.position.copy(sun.position);

  // Decide qué controles actualizar
  if (isFreeFlightMode) {
    handleCameraMovement();
  } else {
    // --- LÓGICA DE SEGUIMIENTO ---
    if (targetPlanet) {
      // Si estamos siguiendo un planeta, forzamos el OrbitControls.target
      // a seguir su posición y ajustamos la cámara para mantener la distancia relativa.

      // 1. Calcular el vector de desplazamiento (offset) de la cámara respecto al objetivo actual
      const offset = new THREE.Vector3().subVectors(
        camera.position,
        camcontrols1.target
      );

      // 2. Mover el target de OrbitControls a la nueva posición del planeta
      camcontrols1.target.copy(targetPlanet.position);

      // 3. Mover la posición de la cámara aplicando el offset al nuevo target
      camera.position.copy(camcontrols1.target).add(offset);
    }
    // ------------------------------------

    camcontrols1.update(); // Actualiza OrbitControls si está activo
  }

  // --- ACTUALIZAR MARCADOR DE CÁMARA ---
  if (cameraMarker) {
    // Copia la posición X y Z de la cámara principal
    cameraMarker.position.x = camera.position.x;
    cameraMarker.position.z = camera.position.z;

    // Corregir la rotación Y del marcador:
    if (isFreeFlightMode) {
      // Si estamos en vuelo libre, usamos el euler ya calculado
      cameraMarker.rotation.y = euler.y;
    } else {
      // Si estamos en modo orbital, el marcador debe apuntar al objetivo (target)
      cameraMarker.lookAt(camcontrols1.target);
      // La rotación en el eje X debe ser -PI/2 para que quede plano
      cameraMarker.rotation.x = -Math.PI / 2;
    }
  }

  // --- 1. RENDER DE LA CÁMARA PRINCIPAL ---
  composer.render();

  // --- 2. RENDER DEL MINIMAPA ---
  miniMapRenderer.render(scene, miniMapCamera);
}
