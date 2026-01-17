# Video HUD - Real Resolution & FPS Monitor

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)
![GitHub stars](https://img.shields.io/github/stars/oscardaaz/video-hud-extension)
![GitHub issues](https://img.shields.io/github/issues/oscardaaz/video-hud-extension)
![GitHub last commit](https://img.shields.io/github/last-commit/oscardaaz/video-hud-extension)

**Una extensión de Chrome que muestra información en tiempo real sobre la reproducción de vídeos**

[Características](#características) • [Instalación](#instalación) • [Uso](#uso) • [Desarrollo](#desarrollo) • [Licencia](#licencia)

</div>

---

## 📸 Capturas

> *[Aquí puedes añadir screenshots de la extensión en acción]*

## ✨ Características

- **Resolución Real**: Muestra la resolución nativa del vídeo (no la del player)
- **Resolución de Display**: Tamaño real de visualización en pantalla
- **FPS en Tiempo Real**: Framerate preciso usando `requestVideoFrameCallback` o fallback
- **Frames Descartados**: Contador y porcentaje de dropped frames
- **HUD Configurable**: 
  - 3 modos de visibilidad (siempre visible, hover, auto-ocultar)
  - Posicionamiento por esquinas o arrastrable
  - Colores, tamaños y estilos personalizables
- **Interfaz Premium**: Diseño moderno con efectos glassmorphism y blur
- **Performance Optimizada**: Sin impacto en la reproducción del vídeo
- **Multi-frame Support**: Funciona en iframes y shadow DOM

## 🚀 Instalación

### Desde GitHub (Modo desarrollador)

1. **Descarga el proyecto**:
   ```bash
   git clone https://github.com/oscardaaz/video-hud.git
   cd video-hud
   ```

2. **Carga la extensión en Chrome**:
   - Abre Chrome y ve a `chrome://extensions/`
   - Activa el "Modo de desarrollador" (esquina superior derecha)
   - Haz clic en "Cargar extensión sin empaquetar"
   - Selecciona la carpeta del proyecto

3. **¡Listo!** El icono aparecerá en la barra de herramientas

### Estructura de archivos necesaria

```
video-hud/
├── manifest.json
├── background.js
├── hud.js
├── popup.html
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── LICENSE
```

## 🎯 Uso

1. **Abre cualquier página con vídeo** (YouTube, Twitch, Netflix, etc.)
2. **Haz clic en el icono de la extensión** para abrir la configuración
3. **Personaliza según tus preferencias**:
   - Activa/desactiva el HUD
   - Elige modo de visibilidad
   - Selecciona posición (esquina o arrastrable)
   - Ajusta colores y tamaños
4. **Haz clic en "Apply"** para aplicar los cambios

### Características avanzadas

- **Arrastrar**: Haz clic en la barra vertical del HUD y arrástralo a cualquier posición
- **Auto-ocultar**: Configura tiempos de inactividad para ocultar el HUD automáticamente
- **Hover mode**: El HUD solo aparece al pasar el ratón por encima
- **Persistencia**: Todos los ajustes se guardan automáticamente

## ⚙️ Configuración

### Opciones disponibles

| Opción | Descripción | Valores |
|--------|-------------|---------|
| **Enabled** | Activa/desactiva el HUD | Checkbox |
| **Visibility** | Modo de visibilidad | Always / Hover / Idle |
| **Position** | Tipo de posicionamiento | Corner / Custom (drag) |
| **Corner** | Esquina predefinida | TL / TR / BL / BR |
| **Font Size** | Tamaño de fuente | 10-28px |
| **Padding** | Espaciado interno | 6-20px |
| **Radius** | Radio de bordes | 0-24px |
| **Text Color** | Color del texto | Selector de color |

## 🛠️ Desarrollo

### Requisitos

- Chrome/Chromium 88+
- Conocimientos básicos de JavaScript y Chrome Extensions API

### Arquitectura

```
background.js (Service Worker)
├── Gestión de inyección de scripts
├── Comunicación con content scripts
└── Manejo de badges

hud.js (Content Script)
├── VideoTracker: Detección de vídeos
├── FPSCalculator: Cálculo de framerate
├── UIManager: Gestión de interfaz
└── VHUDController: Orquestador principal

popup.js/html
└── Interfaz de configuración
```

### Tecnologías utilizadas

- **Manifest V3**: Última versión de Chrome Extensions
- **Chrome Storage API**: Persistencia de configuración
- **requestVideoFrameCallback**: API nativa para FPS precisos
- **MutationObserver**: Detección dinámica de vídeos
- **CSS Backdrop Filter**: Efectos glassmorphism

### Scripts principales

- `background.js`: Service worker, gestiona inyección y mensajería
- `hud.js`: Content script, toda la lógica del HUD
- `popup.js`: UI de configuración

## 🐛 Solución de problemas

### El HUD no aparece
- Refresca la página después de instalar la extensión
- Verifica que "Enabled" esté activado en la configuración
- Comprueba que hay un vídeo en la página

### FPS muestra "n/a"
- Algunos vídeos no exponen métricas de frames
- Prueba a reproducir el vídeo (algunos navegadores no reportan FPS en pausa)
- La API puede tardar 1-2 segundos en inicializarse

### El HUD desaparece al arrastrar
- Esto es normal en modo "hover", cambia a "always" para posicionarlo

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si tienes ideas para mejorar la extensión:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Ideas para futuras versiones

- [ ] Soporte para más plataformas de vídeo
- [ ] Gráficos históricos de FPS
- [ ] Detección de bitrate
- [ ] Exportar estadísticas
- [ ] Temas predefinidos
- [ ] Hotkeys para toggle rápido

## 📝 Changelog

### [1.0.1] - 2026-01-17

#### Fixed
- Corregido cálculo de FPS que mostraba el doble en videos de 60fps
- Ahora usa `presentedFrames` del metadata de RVFC para mayor precisión

### [1.0.0] - 2026-01-17

#### Added
- Detección automática de vídeos
- Cálculo de FPS en tiempo real con RVFC
- Display de resolución real y de pantalla
- Contador de frames descartados
- 3 modos de visibilidad (always/hover/idle)
- Sistema de posicionamiento flexible
- Configuración completa desde popup
- Arrastrar y soltar para posicionamiento personalizado
- Persistencia de configuración con Chrome Storage
- Arquitectura modular con cleanup adecuado

### [1.0.1] - 2025-01-17

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👤 Autor

**Óscar Domínguez Alonso**

- GitHub: [oscardaaz](https://github.com/oscardaaz)

## 🌟 Agradecimientos

- Inspirado en la necesidad de verificar la calidad real de reproducción de vídeo
- Gracias a la comunidad de Chrome Extensions por la documentación

---

<div align="center">

**Si te resulta útil, ¡dale una ⭐ al proyecto!**

[Reportar Bug](https://github.com/TU_USUARIO/video-hud/issues) • [Solicitar Feature](https://github.com/TU_USUARIO/video-hud/issues)

</div>
