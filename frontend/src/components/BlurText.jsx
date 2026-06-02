import { motion } from 'framer-motion';

export default function BlurText({ text, delay = 50, className = '' }) {
  const words = text.split(' ');

  return (
    <div className={className} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 10 }} 
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}   
          transition={{
            delay: index * (delay / 1000), 
            duration: 0.5,
            ease: 'easeOut',
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
}