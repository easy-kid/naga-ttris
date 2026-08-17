# 📦 Play Store Distribution Suite // NAGA-TTRIS (VOID_STACK)

Este directorio contiene todos los activos, documentos legales, metadatos y herramientas necesarias para publicar **Naga-Ttris** en **Google Play Console**.

---

## 📂 Estructura del Directorio

```text
play-store/
├── graphics/
│   ├── icon_512x512.png                 # Icono de alta resolución (512x512)
│   ├── feature_graphic_1024x500.png     # Gráfico de funciones promocional (1024x500)
│   └── screenshots/
│       ├── screenshot_01_main_menu.png  # Menú Principal y Modos
│       ├── screenshot_02_gameplay.png   # Tablero de Juego y Telemetría
│       ├── screenshot_03_stats.png      # Estadísticas de Carrera
│       └── screenshot_04_config.png     # Configuración DAS / ARR
│
├── store-listing/
│   ├── listing_metadata.md              # Textos, ASO, Data Safety e IARC Rating
│   └── privacy-policy.html              # Política de Privacidad lista para alojar
│
└── release-tools/
    ├── build_aab.sh                     # Script para compilar el Android App Bundle
    ├── app-release.aab                  # Bundle de producción compilado (3.6 MB)
    └── README.md                        # Guía paso a paso para Play Console
```

---

## 🚀 Pasos para Publicar en Google Play Console

### 1. Alojar la Política de Privacidad
* Puedes subir el archivo `privacy-policy.html` a **GitHub Pages** en la rama `gh-pages` o en la carpeta `docs/` de tu repositorio `https://github.com/easy-kid/naga-ttris`.
* La URL resultante será: `https://easy-kid.github.io/naga-ttris/privacy-policy.html`.

### 2. Crear la Aplicación en Google Play Console
1. Inicia sesión en [Google Play Console](https://play.google.com/console).
2. Haz clic en **"Crear aplicación"**.
3. Rellena los datos básicos:
   * **Nombre de la app:** `Naga Ttris: Void Stack`
   * **Idioma predeterminado:** Español (o Inglés)
   * **Tipo de app:** Juego
   * **Gratis o de pago:** Gratis

### 3. Ficha Principal de la Tienda (Main Store Listing)
* Copia el **Título**, la **Descripción breve** y la **Descripción completa** desde [listing_metadata.md](file:///home/sweet/Projects/naga-ttris/play-store/store-listing/listing_metadata.md).
* Sube los gráficos:
  * **Icono de la app:** `play-store/graphics/icon_512x512.png`
  * **Gráfico de funciones:** `play-store/graphics/feature_graphic_1024x500.png`
  * **Capturas de pantalla del teléfono:** Todos los archivos en `play-store/graphics/screenshots/`.

### 4. Seguridad de los Datos (Data Safety)
* Responde **NO** a "¿Tu aplicación recopila o comparte algún tipo de dato de los usuarios?".
* Responde **NO** a anuncios y SDKs de terceros.

### 5. Clasificación de Contenido (IARC)
* Completa el cuestionario seleccionando la categoría **Juego / Puzzle**.
* Responde **NO** a violencia, lenguaje ofensivo y compras dentro de la app. Obtendrás clasificación **PEGI 3 / Para todos**.

### 6. Subir el Android App Bundle (.aab)
* En el menú lateral, ve a **Producción** (o Pruebas internas / cerradas) > **Crear nueva versión**.
* Arrastra y sube el archivo generado:
  `play-store/release-tools/app-release.aab`
* Haz clic en **"Revisar versión"** y luego en **"Iniciar el lanzamiento a producción"**.
