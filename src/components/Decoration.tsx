import React from 'react';
import './Decoration.css';

const Decoration = ({ 
  width = 400, 
  height = 400,
  ballColor = '#FF8C00',
  ballCount = 8,
  rotationSpeed = 8,
  bounceSpeed = 4
}) => {
  // Generate balls with different positions and animation delays
  const generateBalls = () => {
    const balls = [];
    const positions = [
      { left: '40%', top: '40%' },
      { left: '53%', top: '30%' },
      { left: '30%', top: '50%' },
      { left: '57%', top: '53%' },
      { left: '47%', top: '60%' },
      { left: '37%', top: '27%' },
      { left: '60%', top: '43%' },
      { left: '25%', top: '37%' },
      { left: '45%', top: '25%' },
      { left: '33%', top: '65%' },
      { left: '67%', top: '35%' },
      { left: '22%', top: '50%' }
    ];

    for (let i = 0; i < ballCount && i < positions.length; i++) {
      balls.push(
        <div 
          key={i}
          className="decoration-ball"
          style={{
            left: positions[i].left,
            top: positions[i].top,
            borderColor: ballColor,
            animationDelay: `${(i * 0.5) % bounceSpeed}s`,
            animationDuration: `${bounceSpeed}s`
          }}
        />
      );
    }
    return balls;
  };

  return (
    <div
      className="decoration-container"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <div
        className="decoration-rotator"
        style={{
          animationDuration: `${rotationSpeed}s`
        }}
      >
        {generateBalls()}
      </div>
    </div>
  );
};

export default Decoration;