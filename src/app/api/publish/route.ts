import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/services';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, image, customTargets } = body;

    // Obtener los ajustes configurados en base de datos
    const settings = await getSettings();
    const token = settings['whatsapp_token']?.trim();
    const defaultTargetsStr = settings['whatsapp_targets']?.trim();

    if (!token) {
      return NextResponse.json(
        { error: 'El Bearer Token de WhatsApp no está configurado en Ajustes.' },
        { status: 400 }
      );
    }

    // Usar destinos personalizados (del modal) o los guardados por defecto
    const targetString = (customTargets || defaultTargetsStr || '').trim();

    if (!targetString) {
      return NextResponse.json(
        { error: 'No hay destinatarios de WhatsApp configurados ni especificados.' },
        { status: 400 }
      );
    }

    // Procesar destinatarios
    const targets = targetString
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'La lista de destinatarios procesada está vacía.' },
        { status: 400 }
      );
    }

    // Construir payload según la documentación
    const payload: any = {};

    // 1. Destinatarios
    if (targets.length === 1) {
      payload.target = targets[0];
    } else {
      payload.targets = targets;
    }

    // 2. Texto / Caption
    if (text && text.trim().length > 0) {
      payload.text = text;
    }

    // 3. Imagen
    if (image && image.base64) {
      payload.image = {
        mimeType: image.mimeType || 'image/jpeg',
        filename: image.filename || 'foto.jpg',
        base64: image.base64
      };
    }

    // 4. Metadatos obligatorios para trazabilidad
    payload.metadata = {
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    // Hacer la petición a la API externa de WhatsApp
    const apiResponse = await fetch('http://38.242.142.38:18789/api/whatsapp/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: responseData.error || responseData.message || 'Error al publicar en la API externa de WhatsApp' },
        { status: apiResponse.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in /api/publish:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor: ' + String(error) },
      { status: 500 }
    );
  }
}
