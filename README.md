# 🤖 Whatsapp Channel AI Tool

Herramienta avanzada para la generación de contenido (texto e imágenes) para canales de WhatsApp, utilizando la inteligencia artificial de Google Gemini y Google Imagen.

## 🚀 Despliegue en Vercel + Neon (PostgreSQL)

Esta aplicación está lista para ser desplegada en Vercel con una base de datos de Neon por detrás.

### 1. Preparar la Base de Datos (Neon)
1. Crea un proyecto en [Neon.tech](https://neon.tech).
2. Obtén tu **Connection String** (en formato `postgres://...`).
3. Agrega `?sslmode=require` al final si es necesario.

### 2. Despliegue en Vercel
1. Sube este código a un repositorio de GitHub (Público o Privado).
2. Conecta el repositorio a un nuevo proyecto en **Vercel**.
3. Configura las siguientes variables de entorno en Vercel:
   - `GEMINI_API_KEY`: Tu llave de Google AI Studio.
   - `DATABASE_URL`: La connection string de Neon que obtuviste en el paso anterior.
4. Vercel detectará que es un proyecto de Next.js y hará el despliegue automáticamente.

### 3. Desarrollo Local (SQLite)
Si no configuras `DATABASE_URL`, el sistema usará automáticamente una base de datos local en SQLite (`whatsapp_channel.db`).

## ✨ Funcionalidades
- **Generación de Texto**: Saludos, despedidas, explicaciones de versículos, etc.
- **Generación de Imágenes**: Creación de imágenes artísticas con control de texto.
- **Gestión Dinámica**: Agrega, edita, elimina y reordena tus propios botones de prompt.
- **Historial**: Revisa y gestiona lo generado anteriormente.
- **Personalización**: Elige entre diferentes modelos de lenguaje y de imagen directamente desde los ajustes.

---
Creado por César.
