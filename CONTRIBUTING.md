# Contributing to Video HUD

¡Gracias por tu interés en contribuir a Video HUD! 🎉

## Cómo contribuir

### Reportar bugs

Si encuentras un bug, por favor abre un [issue](https://github.com/TU_USUARIO/video-hud/issues) con:

- **Descripción clara** del problema
- **Pasos para reproducirlo**
- **Comportamiento esperado** vs **comportamiento actual**
- **Screenshots** si es posible
- **Versión de Chrome** y **sistema operativo**
- **Sitio web** donde ocurre (si es específico)

### Sugerir mejoras

Las sugerencias son bienvenidas. Abre un issue con:

- **Descripción detallada** de la funcionalidad
- **Por qué sería útil**
- **Ejemplos de uso** si aplica

### Pull Requests

1. **Fork** el repositorio
2. **Crea una rama** desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-feature
   ```
3. **Realiza tus cambios**
4. **Testea** que todo funciona correctamente
5. **Commit** con mensajes descriptivos:
   ```bash
   git commit -m "feat: añadir gráfico de FPS histórico"
   ```
6. **Push** a tu fork:
   ```bash
   git push origin feature/mi-nueva-feature
   ```
7. **Abre un Pull Request** describiendo tus cambios

## Estilo de código

- **Indentación**: 2 espacios
- **Comillas**: dobles `"` para strings
- **Punto y coma**: sí, siempre
- **Nombres**: camelCase para variables/funciones, PascalCase para clases
- **Comentarios**: en español o inglés, lo que prefieras

### Ejemplo

```javascript
class VideoTracker {
  constructor() {
    this.currentVideo = null;
  }

  findVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    return videos[0] || null;
  }
}
```

## Estructura del proyecto

```
video-hud/
├── manifest.json       # Configuración de la extensión
├── background.js       # Service worker (inyección y mensajería)
├── hud.js             # Content script (lógica principal)
├── popup.html/js      # Interfaz de configuración
└── icons/             # Iconos de la extensión
```

## Testing

Antes de enviar un PR:

1. **Carga la extensión** en modo desarrollador
2. **Prueba en múltiples sitios**: YouTube, Twitch, Netflix, etc.
3. **Verifica todos los modos** de visibilidad
4. **Prueba el drag & drop**
5. **Revisa la consola** en busca de errores

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` cambios en documentación
- `style:` formateo, punto y coma faltantes, etc.
- `refactor:` refactorización de código
- `perf:` mejoras de performance
- `test:` añadir tests
- `chore:` mantenimiento

Ejemplos:
```
feat: añadir detección de bitrate
fix: corregir cálculo de FPS en Safari
docs: actualizar README con nuevas capturas
refactor: simplificar lógica de posicionamiento
```

## Código de conducta

- Se respetuoso y constructivo
- Acepta críticas de manera profesional
- Enfócate en lo mejor para el proyecto
- No toleramos acoso ni discriminación

## ¿Necesitas ayuda?

- Abre un issue con la etiqueta `question`
- Revisa issues existentes por si alguien tuvo la misma duda
- Contacta al mantenedor si es algo urgente

## Licencia

Al contribuir, aceptas que tus contribuciones se licenciarán bajo la MIT License del proyecto.

---

**¡Gracias por hacer Video HUD mejor! 🚀**
