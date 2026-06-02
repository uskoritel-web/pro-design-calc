// Inline-подсказка с возможностью закрыть
import { useState, useEffect } from 'react';
import { isDismissed, dismiss } from '../utils/hints';

export default function HintBubble({ hintKey, icon, children }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isDismissed(hintKey));
  }, [hintKey]);

  if (!show) return null;

  const handleDismiss = () => {
    dismiss(hintKey);
    setShow(false);
  };

  return (
    <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 flex gap-3 items-start mb-4">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 text-sm text-gray-100 leading-relaxed">{children}</div>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-200 text-xl flex-shrink-0 leading-none">×</button>
    </div>
  );
}
