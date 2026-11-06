<div align="center">

<img src="material/foto de incio.png" alt="WAVESOUL — Visualizador de Audio" width="100%" style="border-radius: 12px;" />

<br/>
<br/>

# 〰️ WAVESOUL

### *La música tiene alma. Ahora tiene forma.*

<br/>

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r184-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![GSAP](https://img.shields.io/badge/GSAP-3.x-88CE02?style=for-the-badge&logo=greensock&logoColor=black)](https://gsap.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-nativo-FF6B35?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](https://github.com/PaulVSQS/WAVESOUL/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/PaulVSQS/WAVESOUL?style=for-the-badge&logo=github)](https://github.com/PaulVSQS/WAVESOUL/stargazers)

</div>

---

## 🎬 Demo en vivo

<div align="center">

[![Ver Demo en YouTube](https://img.youtube.com/vi/3aGOPTAUm4Q/maxresdefault.jpg)](https://youtu.be/3aGOPTAUm4Q)

*▶ Haz clic en la imagen para ver el video completo*

</div>

---

## ✨ ¿Qué es WAVESOUL?

**WAVESOUL** es un visualizador de audio de próxima generación que convierte tu música en una experiencia visual inmersiva. No es un simple ecualizador: es un sistema neuroemocional que **dialoga con la música**, detecta su intención y la traduce en luz, color y movimiento tridimensional.

> *"La línea no sigue la música — dialoga con ella."*

Cada canción genera su propia firma visual única basada en su energía emocional, instrumentos detectados, frases vocales y momentos de silencio intencional.

---

## 🧠 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                        WAVESOUL                         │
├──────────────────┬──────────────────┬───────────────────┤
│   AUDIO ENGINE   │  VISUALIZATION   │   BACKGROUND 3D   │
│                  │                  │                   │
│  AudioAnalyzer   │  WavelineRenderer│  BackgroundScene  │
│  AudioEngine     │  ColorEngine     │  ParticleField    │
│  DynamicsProc.   │  useRenderLoop   │  (Three.js/R3F)   │
│  EmotionalMemory │                  │                   │
│  InstrumentDet.  ├──────────────────┴───────────────────┤
│  IntentionEngine │              UI LAYER                 │
│  MotifEngine     │  AudioUploader · PlayerControls       │
│  SongProfiler    │  GSAP Animations · Contemplative Mode │
└──────────────────┴───────────────────────────────────────┘
```

---

## 🚀 Stack Tecnológico

| Categoría | Tecnología | Uso |
|---|---|---|
| **Framework** | React 19 + TypeScript | Interfaz y estado de la app |
| **3D Engine** | Three.js + R3F + Drei | Campo de partículas 3D |
| **Audio** | Web Audio API nativa | Análisis en tiempo real |
| **Animaciones** | GSAP 3 | Transiciones fluidas de intro |
| **Build Tool** | Vite 8 | Desarrollo ultra-rápido |
| **Renderer** | Canvas 2D | Línea ECG / waveline |

---

## 🎨 Sistemas Internos

### 🌈 ColorEngine — Sistema Neuroemocional de Color
El color no es decorativo. El color es **emoción hecha luz**. WAVESOUL mapea el estado emocional de la música a una paleta cromática:

| Estado | Color | Significado |
|--------|-------|-------------|
| `silence` | 🔵 Azul noche profundo | Introspección, espacio |
| `calm` | 🩵 Azul petróleo | Respiración, presencia suave |
| `groove` | 🟢 Esmeralda/Teal | Flow, equilibrio, ritmo corporal |
| `elevation` | 🟡 Dorado/Ámbar | Dopamina, subida, placer |
| `vocal` | 🟣 Violeta/Púrpura | Emoción humana, cercanía |
| `intensity` | 🟠 Naranja/Coral | Energía física, impulso |
| `climax` | 🔴 Carmín/Magenta | Pasión, poder contenido |

### 🎯 IntentionEngine — La Línea que Dialoga
Analiza tendencias mediante **regresión lineal** sobre ventanas de frames (~750ms), detecta frases vocales sostenidas, micro-anticipaciones y silencios intencionales.

### 🧬 EmotionalMemory + MotifEngine
El sistema tiene **memoria**: aprende patrones recurrentes en la canción (motivos), los reconoce y adapta la visualización cuando los vuelve a detectar.

### 🎸 InstrumentDetector
Detecta en tiempo real la presencia de **bajos, medios, agudos y voz humana** mediante análisis de frecuencias FFT.

---

## ⚡ Instalación y Uso

### Prerrequisitos
- Node.js **v18+**
- npm **v9+**

### 1. Clonar el repositorio

```bash
git clone https://github.com/PaulVSQS/WAVESOUL.git
cd WAVESOUL
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar servidor de desarrollo

```bash
npm run dev
```

### 4. Abrir en el navegador
Visita → **[http://localhost:5173](http://localhost:5173)**

---

## 📦 Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo con Hot Reload (Vite)
npm run build     # Compilar para producción (TypeScript + Vite)
npm run preview   # Previsualizar el build de producción
npm run lint      # Análisis estático con ESLint
```

---

## 🎮 Controles

| Acción | Control |
|--------|---------|
| Cargar canción | Arrastra un archivo de audio o haz clic en la zona de upload |
| Play / Pause | Botón central o `Espacio` |
| Volumen | Slider en los controles |
| Buscar posición | Click en la barra de progreso |
| **Modo Contemplativo** | `C` o doble clic en cualquier lugar |
| Salir del modo | `C` o doble clic nuevamente |

> 💡 **Modo Contemplativo**: Oculta toda la interfaz para una experiencia completamente inmersiva. El cursor desaparece tras 2 segundos de inactividad.

---

## 📁 Estructura del Proyecto

```
WAVESOUL/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── animation/
│   │   └── transitions.ts          # Animaciones de entrada con GSAP
│   ├── audio/
│   │   ├── AudioAnalyzer.ts        # Extracción de datos del AnalyserNode
│   │   ├── AudioEngine.ts          # Web Audio API: contexto y nodos
│   │   ├── DynamicsProcessor.ts    # Procesamiento dinámico de señal
│   │   ├── EmotionalMemory.ts      # Memoria emocional de la sesión
│   │   ├── InstrumentDetector.ts   # Detección de instrumentos por FFT
│   │   ├── IntentionEngine.ts      # Análisis de tendencia e intención
│   │   ├── MotifEngine.ts          # Detección de motivos recurrentes
│   │   ├── SongProfiler.ts         # Perfil cromático por canción
│   │   └── useAudio.ts             # Hook React principal de audio
│   ├── background/
│   │   ├── BackgroundScene.tsx     # Canvas 3D con Three.js / R3F
│   │   └── ParticleField.tsx       # Campo de partículas reactivo
│   ├── components/
│   │   ├── AudioUploader.tsx       # Zona de carga de archivos
│   │   ├── PlayerControls.tsx      # Controles de reproducción
│   │   ├── VisualizerCanvas.tsx    # Canvas 2D de la waveline
│   │   └── WaveSoulApp.tsx         # Componente raíz orquestador
│   ├── types/
│   │   └── audio.ts                # Tipos TypeScript del dominio
│   ├── visualization/
│   │   ├── ColorEngine.ts          # Sistema neuroemocional de color
│   │   ├── useRenderLoop.ts        # Loop de animación (rAF)
│   │   └── WavelineRenderer.ts     # Renderer de la línea ECG
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── material/
│   └── foto de incio.png           # Preview del proyecto
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🌐 Compatibilidad

| Navegador | Soporte |
|-----------|---------|
| Chrome 90+ | ✅ Recomendado |
| Firefox 88+ | ✅ |
| Edge 90+ | ✅ |
| Safari 14.1+ | ✅ |
| Opera 76+ | ✅ |

> ⚠️ Requiere un navegador moderno con soporte para **Web Audio API** y **WebGL**.

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si tienes ideas para mejorar WAVESOUL:

1. Haz un **fork** del repositorio
2. Crea una rama: `git checkout -b feature/mi-mejora`
3. Haz commit de tus cambios: `git commit -m 'feat: mi mejora'`
4. Sube la rama: `git push origin feature/mi-mejora`
5. Abre un **Pull Request**

---

## 👨‍💻 Autor

<div align="center">

**Paul V.**

[![GitHub](https://img.shields.io/badge/GitHub-PaulVSQS-181717?style=for-the-badge&logo=github)](https://github.com/PaulVSQS)

</div>

---

<div align="center">

**Hecho con ❤️ y mucha música**

*Si WAVESOUL te hizo sentir algo, dale una ⭐ al repo*

</div>
