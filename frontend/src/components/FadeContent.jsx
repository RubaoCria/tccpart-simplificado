import { motion } from 'framer-motion';

export default function FadeContent({ children, delay = 0.2, blur = true, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, filter: blur ? 'blur(10px)' : 'none' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.6, delay: delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}