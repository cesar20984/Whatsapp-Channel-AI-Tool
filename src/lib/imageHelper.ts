/**
 * Redimensiona y convierte una imagen en formato base64 o URL a JPEG comprimido.
 * WhatsApp prefiere imágenes JPEG y de tamaño moderado para newsletters/canales.
 */
export function resizeAndConvertImage(
  dataUrlOrUrl: string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.85
): Promise<{ base64: string; mimeType: string; filename: string }> {
  return new Promise((resolve, reject) => {
    // Si no estamos en el navegador, no podemos usar Canvas
    if (typeof window === 'undefined') {
      reject(new Error('Canvas solo se puede utilizar en el cliente (navegador).'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calcular nuevas dimensiones manteniendo el aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo obtener el contexto 2D del canvas.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      try {
        // Exportar a JPEG con la calidad definida
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Extraer el base64 limpio de la cabecera dataurl
        const parts = jpegDataUrl.split(',');
        const base64 = parts.length > 1 ? parts[1] : parts[0];

        resolve({
          base64,
          mimeType: 'image/jpeg',
          filename: 'foto.jpg'
        });
      } catch (err) {
        reject(new Error('Error al exportar el canvas a JPEG: ' + String(err)));
      }
    };

    img.onerror = (err) => {
      reject(new Error('Error al cargar la imagen para procesar: ' + String(err)));
    };

    img.src = dataUrlOrUrl;
  });
}
