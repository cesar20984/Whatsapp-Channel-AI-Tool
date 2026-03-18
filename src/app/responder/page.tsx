"use client";

import { useState } from 'react';

export default function Responder() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult('');
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: 'answer_question',
          userContext: question,
          actionType: 'text'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      alert('Error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result);
    alert('¡Respuesta copiada al portapapeles!');
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="title-gradient mb-4">Responder a Usuarios</h1>
      <p className="text-secondary mb-4">Pega la pregunta o el comentario de un miembro del grupo y la IA generará una respuesta pastoral y bíblica.</p>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div className="form-group">
          <label className="form-label">Pregunta o Comentario del Usuario:</label>
          <textarea 
            className="form-control" 
            placeholder="Pega el mensaje aquí..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ minHeight: '120px' }}
          />
        </div>
        
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', justifyContent: 'center' }} 
          onClick={handleGenerate} 
          disabled={loading || !question.trim()}
        >
          {loading ? 'Generando Posible Respuesta...' : 'Generar Respuesta'}
        </button>
      </div>

      {result && (
        <div className="glass-panel animate-fade-in mt-4" style={{ padding: '2rem', border: '1px solid var(--success-color)' }}>
          <h2 className="title-gradient mb-3">Respuesta Generada:</h2>
          
          <div style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            {result}
          </div>
          
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={copyToClipboard}>
            📋 Copiar para Responder
          </button>
        </div>
      )}
    </div>
  );
}
