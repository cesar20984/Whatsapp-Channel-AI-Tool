"use client";

import { useState, useEffect } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [models, setModels] = useState<{textModels: any[], imageModels: any[]}>({ textModels: [], imageModels: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedText, setSelectedText] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [whatsappTargets, setWhatsappTargets] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/models').then(res => res.json())
    ]).then(([settingsData, modelsData]) => {
      setSettings(settingsData);
      setModels(modelsData);
      setSelectedText(settingsData['text_model'] || '');
      setSelectedImage(settingsData['image_model'] || '');
      setWhatsappToken(settingsData['whatsapp_token'] || '');
      setWhatsappTargets(settingsData['whatsapp_targets'] || '');
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
      
      // Guardar ajustes de WhatsApp
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'whatsapp_token', value: whatsappToken })
      });
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'whatsapp_targets', value: whatsappTargets })
      });

      alert('¡Configuración guardada correctamente! Los cambios ya están activos.');
    } catch (err) {
      alert('Hubo un error al guardar los cambios: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div><div className="spinner"></div> Cargando ajustes...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="title-gradient mb-4">Ajustes del Sistema</h1>
      
      <div className="grid grid-cols-2">
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="mb-3" style={{ fontSize: '1.25rem', color: 'var(--accent-color)' }}>🤖 Modelos de IA (Gemini)</h2>
            
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

            <div className="form-group" style={{ marginTop: '1rem' }}>
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
                <option value="imagen-4.0-generate-001">Imagen 4 (imagen-4.0-generate-001)</option>
              </select>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: 'auto' }} onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar Todo'}
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2 className="mb-3" style={{ fontSize: '1.25rem', color: '#25d366' }}>💬 Integración de WhatsApp</h2>
            
            <div className="form-group">
              <label className="form-label">Bearer Token de WhatsApp</label>
              <input 
                type="password"
                className="form-control" 
                placeholder="Bearer TU_TOKEN"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Destinatarios Predeterminados (Separados por comas)</label>
              <textarea 
                className="form-control" 
                placeholder="+569XXXXXXXX, 120363XXXXXXXX@g.us, 120363XXXXXXXX@newsletter"
                value={whatsappTargets}
                onChange={(e) => setWhatsappTargets(e.target.value)}
                style={{ minHeight: '90px', fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
                Tipos admitidos: Número de contacto, ID de grupo (@g.us) o ID de canal/newsletter (@newsletter).
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel mt-4" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>ℹ️ Información Adicional</h3>
        <p className="text-secondary mb-2" style={{ fontSize: '0.9rem' }}>
          - Las claves del modelo de IA y de base de datos se configuran mediante variables de entorno en el archivo <code>.env</code>.
        </p>
        <p className="text-secondary mb-2" style={{ fontSize: '0.9rem' }}>
          - Al enviar imágenes a WhatsApp, el sistema las convertirá **automáticamente a formato JPEG** y ajustará sus dimensiones en el cliente para cumplir con los límites de tamaño del canal de WhatsApp.
        </p>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          - Si deseas usar destinos específicos de forma temporal para un mensaje o imagen en particular, podrás editarlos libremente al momento de pulsar el botón de publicación en la pantalla de generación.
        </p>
      </div>
    </div>
  );
}
