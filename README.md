# 🚀 Sistema Solar Interactivo 3D con Three.js (WebGL)

Este proyecto simula un sistema solar interactivo utilizando la librería **Three.js** (WebGL). Permite al usuario alternar entre un modo de **Vuelo Libre** y un modo **Orbital**, con la capacidad de hacer zoom y seguir planetas, mostrando información detallada de cada uno en un panel dinámico que cambia de color según el planeta.

**Podrás ver el proyecto en el siguiente enlace:** [Proyecto en CodeSandBox](https://codesandbox.io/p/sandbox/sistemasolar-forked-vkclgk)

---

## ▶️ Video Ejemplo

<div align="center">
    <a href="https://youtu.be/xaRT40Bd6bg" target="_blank">
        <img src="https://youtu.be/558tFgyCePY/0.jpg" alt="Video Demostración del Sistema Solar 3D" style="max-width:100%;">
    </a>
</div>

---

## ✨ Características Principales

* **Modelo 3D:** Sol, 8 planetas principales, lunas (Tierra/Luna) y anillos (Saturno), con órbitas y rotación.
* **Post-Procesado:** Efecto de *Bloom* (Resplandor) aplicado al Sol y a la escena para un ambiente espacial inmersivo.
* **Doble Modo de Control:** Permite alternar entre **Vuelo Libre** (navegación con teclado) y **Orbital** (control con ratón).
* **Seguimiento de Planetas:** Al hacer clic en un planeta, la cámara se centra y lo sigue automáticamente.
* **Panel de Información Dinámico:** Muestra el nombre, distancia y detalles del planeta seleccionado, con el color del borde y el título adaptándose al planeta.
* **Minimapa (Ortográfico):** Vista superior para la navegación global.

---

## 🛠️ Estructura del Proyecto

El proyecto se compone de tres archivos principales:

1.  `index.html`: Define la estructura base y los contenedores para la interfaz.
2.  `style.css`: Proporciona estilos para el minimapa y el panel de información (`#planet-info`), incluyendo la variable CSS `--planet-color` para el color dinámico.
3.  `index.js`: Contiene toda la lógica de Three.js, la gestión de la escena, la simulación, los controles y la interacción.

---

## 🧩 Explicación Detallada del Código (`index.js`)

El corazón del proyecto es el archivo `index.js`, que utiliza varios módulos de Three.js.

### 1. Inicialización y Configuración

| Componente | Descripción |
| :--- | :--- |
| **`renderer` y `miniMapRenderer`** | Se utilizan dos renderizadores: uno principal para la escena con efectos y otro auxiliar para el minimapa (vista superior). |
| **`camera` y `miniMapCamera`** | Se definen la **PerspectiveCamera** (principal) y la **OrthographicCamera** (minimapa). |
| **`Layers`** | Se usan capas para asegurar que el marcador de la cámara (`cameraMarker`) solo se dibuje en el minimapa. |
| **`OrbitControls` y `toggleControlMode`** | Maneja la transición entre el control de órbita (ratón) y el control de vuelo libre (teclado, gestionado por `handleCameraMovement`). |
| **`sun` y `sunLight`** | El Sol se crea con un material base (`MeshBasicMaterial`) para la iluminación y el efecto de resplandor (Bloom). |

### 2. Creación y Datos del Sistema (`createPlanets`)

| Función / Propiedad | Descripción |
| :--- | :--- |
| **`planetData`** | Array central que define cada planeta, incluyendo: `size`, `orbit`, `texture`, `tilt`, **`infoColor`** (el código hexadecimal para la interfaz) y **`details`** (la información que se muestra en el panel). |
| **`mesh.userData`** | Objeto crucial donde se almacenan las propiedades específicas del planeta (`name`, `orbitRadius`, `infoColor`, `details`) dentro de la malla 3D, permitiendo recuperarlas fácilmente al hacer clic. |
| **`drawOrbit`** | Genera las líneas (`LineLoop`) que representan las trayectorias orbitales de los planetas. |

### 3. Interacción y Lógica de Vistas

| Función / Control | Descripción |
| :--- | :--- |
| **`onCanvasClick`** | Usa el **`raycaster`** para detectar qué planeta fue clickeado:
    * **Seguimiento:** Fija el `camcontrols1.target` y ajusta la cámara, estableciendo `targetPlanet` para activar el seguimiento continuo.
    * **Panel de Información:** Lee los datos de `mesh.userData` y los inyecta en el panel.
    * **Color Dinámico:** Establece la variable CSS **`--planet-color`** en el elemento `#planet-info` (e.g., `infoPanel.style.setProperty('--planet-color', color);`) para aplicar el color del planeta al borde y al encabezado del panel. |
| **`resetOrbitalView`** | Restaura la vista a la posición orbital inicial centrada en el Sol y desactiva el seguimiento (`targetPlanet = null`). Se activa con la tecla **`R`**. |
| **Lógica de Seguimiento** | Dentro de `animationLoop`, un condicional (`if (targetPlanet)`) se encarga de mover continuamente la cámara y el `camcontrols1.target` para seguir al planeta seleccionado. |

---

## ⌨️ Controles de Usuario

| Modo | Acción | Tecla / Ratón |
| :--- | :--- | :--- |
| **General** | Alternar entre modos de control | **Barra espaciadora** |
| **General** | Reiniciar vista orbital al Sol | **R** |
| **Orbital** | Seguir y hacer zoom al objeto | **Clic Ratón** sobre el planeta |
| **Vuelo Libre** | Moverse (Adelante/Atrás) | **W / S** |
| **Vuelo Libre** | Moverse (Izquierda/Derecha) | **A / D** |
| **Vuelo Libre** | Moverse (Arriba/Abajo) | **Q / E** |
| **Vuelo Libre** | Rotar la vista (Pitch / Yaw) | **Flechas (Arriba, Abajo, Izq, Der)** |

---

## 📦 Dependencias

Asegúrate de importar las librerías necesarias de Three.js en tu entorno (Glitch/Local) para que el código funcione correctamente:

```javascript
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
