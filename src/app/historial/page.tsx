"use client";

import { useState, useEffect } from 'react';

export default function Historial() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/history').then(res => res.json()).then(data => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(h => h.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Seguro que deseas eliminar los ${selectedIds.size} elementos seleccionados?`)) return;
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      setHistory(history.filter(h => !selectedIds.has(h.id)));
      setSelectedIds(new Set());
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('¡ADVERTENCIA! ¿Seguro que deseas LIMPIAR TODO EL HISTORIAL? Esta acción no se puede deshacer.')) return;
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });
      setHistory([]);
      setSelectedIds(new Set());
    } catch (err) {
      alert('Error al eliminar todo');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este historial?')) return;
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      setHistory(history.filter(h => h.id !== id));
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  if (loading) return <div><div className="spinner"></div> Cargando historial...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="title-gradient m-0">Historial de Generaciones (30 días)</h1>
          <p className="text-secondary mt-2">Este contexto es el que la IA utiliza para no repetir temas.</p>
        </div>
        <div className="flex" style={{ gap: '1rem' }}>
          {history.length > 0 && (
            <>
              <button className="btn" onClick={handleSelectAll}>
                {selectedIds.size === history.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </button>
              {selectedIds.size > 0 && (
                <button className="btn" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={handleDeleteSelected}>
                  🗑️ Eliminar Seleccionados ({selectedIds.size})
                </button>
              )}
              <button className="btn" style={{ background: 'var(--danger-color)', color: 'white' }} onClick={handleDeleteAll}>
                🚨 Limpiar TODO el Historial
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2">
        {history.map((item, index) => (
          <div 
            key={item.id || index} 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1rem',
              border: selectedIds.has(item.id) ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center" style={{ gap: '0.8rem' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                {item.type.toUpperCase()}
              </span>
            </div>
            
            <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Prompt: {item.prompt}</p>
            
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', 
              fontSize: '0.9rem', flex: 1, overflowY: 'auto', maxHeight: '150px' 
            }}>
              {item.type === 'text' ? item.content : <i>(Contenido visual omitido - Imagen generada)</i>}
            </div>
            
            {item.type === 'text' && (
              <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => copyToClipboard(item.content)}>
                📋 Copiar Texto
              </button>
            )}
            
            <button className="btn" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={() => handleDelete(item.id)}>
              🗑️ Eliminar
            </button>
          </div>
        ))}
        {history.length === 0 && <p>No hay historial reciente.</p>}
      </div>
    </div>
  );
}
