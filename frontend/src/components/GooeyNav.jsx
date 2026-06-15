import { useState } from 'react';
import { motion } from 'framer-motion';

export default function GooeyNav({ tabs = ['Início', 'Agenda', 'Clientes'], activeTab, setActiveTab }) {
  // SVG Filter que cria o efeito de "líquido" (Gooey)
  const GooeyFilter = () => (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </defs>
    </svg>
  );

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
      <GooeyFilter />
      
      <div
        style={{
          display: 'flex',
          gap: '20px',
          padding: '10px 20px',
          background: '#f3f4f6', // Cor de fundo da barra
          borderRadius: '50px',
          filter: 'url(#goo)', // Aplica o efeito líquido
          position: 'relative',
        }}
      >
        {tabs.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              position: 'relative',
              padding: '10px 20px',
              cursor: 'pointer',
              color: activeTab === tab ? '#fff' : '#6b7280',
              fontWeight: 'bold',
              zIndex: 1,
              transition: 'color 0.3s ease',
            }}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="gooey-bubble"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: '#8b5cf6', // Cor da bolha selecionada (violeta do seu tema)
                  borderRadius: '50px',
                  zIndex: -1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>{tab}</span>
          </div>
        ))}
      </div>
    </div>
  );
}