import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';

export default function FlowBuilder() {
  const {
    flowNodes,
    addFlowNode,
    deleteFlowNode,
    updateNodePosition,
    updateNodeData
  } = useCrm();

  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [simulationActive, setSimulationActive] = useState(false);

  // Drag and drop node card inside canvas coordinates
  const handleNodeMouseDown = (e, id) => {
    // Avoid triggering drag when typing inside inputs
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    
    e.preventDefault();
    setDraggedNodeId(id);
    
    const node = flowNodes.find(n => n.id === id);
    if (node) {
      setDragOffset({
        x: e.clientX - node.x,
        y: e.clientY - node.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (draggedNodeId === null) return;
    
    // Bounds boundaries or updates
    const dx = e.clientX - dragOffset.x;
    const dy = e.clientY - dragOffset.y;

    const node = flowNodes.find(n => n.id === draggedNodeId);
    if (node) {
      updateNodePosition(draggedNodeId, dx - node.x, dy - node.y);
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedNodeId(null);
  };

  const triggerTestSimulation = () => {
    setSimulationActive(true);
    setTimeout(() => {
      setSimulationActive(false);
    }, 4000);
  };

  return (
    <div className="content-wrapper animated-fade-in" style={{ height: '100%' }}>
      <div className="page-header">
        <div className="page-title">
          <h1>Editor de Fluxos</h1>
          <p>Configure a régua de automação de respostas inteligentes e integrações n8n.</p>
        </div>
        <button onClick={triggerTestSimulation} className="glass-btn" style={{ gap: '6px' }}>
          <span>⚙️</span> Simular Disparo
        </button>
      </div>

      <div className="builder-workspace">
        
        {/* SIDEBAR CATALOG PANELS */}
        <div className="builder-sidebar">
          <span className="builder-sidebar-title">Elementos</span>
          
          <div className="node-template-card" onClick={() => addFlowNode('message')} style={{ cursor: 'pointer' }}>
            <div className="node-icon-circle message">💬</div>
            <div className="node-template-info">
              <span className="node-template-title">Enviar Mensagem</span>
              <span className="node-template-desc">Respostas em balão</span>
            </div>
          </div>

          <div className="node-template-card" onClick={() => addFlowNode('condition')} style={{ cursor: 'pointer' }}>
            <div className="node-icon-circle condition">❓</div>
            <div className="node-template-info">
              <span className="node-template-title">Condicional Se/Ou</span>
              <span className="node-template-desc">Opções de múltipla escolha</span>
            </div>
          </div>

          <div className="node-template-card" onClick={() => addFlowNode('webhook')} style={{ cursor: 'pointer' }}>
            <div className="node-icon-circle webhook">🔌</div>
            <div className="node-template-info">
              <span className="node-template-title">Webhook n8n</span>
              <span className="node-template-desc">Enviar dados comerciais</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-glass)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', lineHeight: '1.4' }}>
              💡 <strong>Dica:</strong> Arraste e posicione as caixas para organizar a ordem sequencial dos gatilhos.
            </span>
          </div>
        </div>

        {/* INTERACTIVE CANVAS */}
        <div
          className="builder-canvas"
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* HIGH-FIDELITY BEZIER PATH CONNECTOR OVERLAY */}
          <svg className="connections-svg-overlay">
            {flowNodes.map((node, index) => {
              if (index === flowNodes.length - 1) return null;
              const nextNode = flowNodes[index + 1];
              
              // Coordinates details
              const startX = node.x + 200; // Right handle
              const startY = node.y + 60;  // Half node height
              const endX = nextNode.x;     // Left handle
              const endY = nextNode.y + 60; // Half node height
              
              // Bezier curve calculations
              const controlDist = Math.max(50, Math.abs(endX - startX) / 2);
              const pathD = `M ${startX} ${startY} C ${startX + controlDist} ${startY}, ${endX - controlDist} ${endY}, ${endX} ${endY}`;

              return (
                <path
                  key={`conn-${node.id}`}
                  d={pathD}
                  className={`connection-path ${simulationActive ? 'active' : ''}`}
                />
              );
            })}
          </svg>

          {/* SIMULATION BAR TRIGGER PULSE */}
          {simulationActive && (
            <div className="builder-alert-bar">
              <span className="pulsing-dot"></span>
              <span><strong>Simulação Ativa:</strong> Disparando webhook de leads e enviando mensagens de teste...</span>
            </div>
          )}

          {/* DRAGGABLE RENDERED NODES LIST */}
          {flowNodes.map(node => (
            <div
              key={node.id}
              className="canvas-node"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                zIndex: draggedNodeId === node.id ? 50 : 10
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Node category type colored cap */}
              <div className={`canvas-node-header ${node.type}`}>
                <span>{node.label}</span>
                {node.type !== 'trigger' && (
                  <button onClick={() => deleteFlowNode(node.id)} className="node-delete-btn">
                    ✕
                  </button>
                )}
              </div>

              {/* Node variables inputs */}
              <div className="canvas-node-body">
                {node.type === 'trigger' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="canvas-node-label">Condição de Entrada</span>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ fontSize: '11px', padding: '6px' }}
                      value={node.data.condition}
                      onChange={(e) => updateNodeData(node.id, 'condition', e.target.value)}
                    />
                  </div>
                )}

                {node.type === 'message' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="canvas-node-label">Texto da Mensagem</span>
                    <textarea
                      className="node-textarea"
                      value={node.data.text}
                      onChange={(e) => updateNodeData(node.id, 'text', e.target.value)}
                    />
                  </div>
                )}

                {node.type === 'condition' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="canvas-node-label">Opções do Menu</span>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ fontSize: '11px', padding: '6px' }}
                      value={node.data.key}
                      onChange={(e) => updateNodeData(node.id, 'key', e.target.value)}
                    />
                  </div>
                )}

                {node.type === 'webhook' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="canvas-node-label">URL da Requisição</span>
                    <input
                      type="text"
                      className="glass-input"
                      style={{ fontSize: '11px', padding: '6px' }}
                      value={node.data.url}
                      onChange={(e) => updateNodeData(node.id, 'url', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Input connectors handle markers */}
              {node.type !== 'trigger' && <div className="node-handle left"></div>}
              {node.type !== 'webhook' && <div className="node-handle right"></div>}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
