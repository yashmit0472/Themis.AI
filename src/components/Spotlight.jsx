import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function Spotlight() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const { theme } = useGameStore();

  useEffect(() => {
    const handleMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const color = theme === 'dark' ? 'rgba(201, 168, 76, 0.15)' : 'rgba(201, 168, 76, 0.1)';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 9998,
        background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, ${color}, transparent 80%)`,
        transition: 'background 0.1s ease'
      }}
    />
  );
}
