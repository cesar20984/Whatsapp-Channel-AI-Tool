"use client";

import { useState, useEffect } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [models, setModels] = useState<{textModels: any[], imageModels: any[]}>({ textModels: [], imageModels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedText, setSelectedText] = useState('');
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/models').then(res => res.json())
    ]).then(([settingsData, modelsData]) => {
      setSettings(settingsData);
      setModels(modelsData);
      setSelectedText(settingsData['text_model'] || '');
      setSelectedImage(settingsData['image_model'] || '');
      setLoading(false);
    });
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      if (selectedText) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'text_model', value: selectedText })
        });
      }
      if (selectedImage) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'image_model', value: selectedImage })
        });
      }
      alert('¡Configuración guardada! La IA ahora usará los modelos que seleccionaste.');
    } catch (err) {
      alert('Hubo un error guardando: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div><div className="spinner"></div> Cargando ajustes...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="title-gradient mb-4">Ajustes del Sistema</h1>
      
      <div className="grid grid-cols-2">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 className="mb-3">Modelos de IA (Gemini)</h2>
          
          <div className="form-group">
            <label className="form-label">Modelo para Texto</label>
            <select 
              className="form-control"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
            >
              <option value="">Selecciona un modelo...</option>
              {models.textModels?.map((m: any) => (
                <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Modelo para Imágenes</label>
            <select 
              className="form-control"
              value={selectedImage}
              onChange={(e) => setSelectedImage(e.target.value)}
            >
              <option value="">Selecciona un modelo...</option>
              {models.imageModels?.map((m: any) => (
                <option key={m.name} value={m.name}>{m.displayName || m.name}</option>
              ))}
              {/* Fallback option if empty array from our heuristic */}
              <option value="imagen-4.0-generate-001">Imagen 4 (imagen-4.0-generate-001)</option>
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 className="mb-3">Información</h2>
          <p className="text-secondary mb-2">
            La clave de API se configura mediante el archivo <code>.env</code>.
          </p>
          <p className="text-secondary">
            Los modelos se actualizan automáticamente al cargar esta pantalla utilizando la API de Google Gemini enviando los que tienen capacidad de generar contenido.
          </p>
        </div>
      </div>
    </div>
  );
}
