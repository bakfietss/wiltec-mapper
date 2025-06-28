
import { useCallback, useState } from 'react';

export const useManualUpdateTrigger = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback((action: string) => {
    console.log(`=== MANUAL UPDATE TRIGGERED: ${action} ===`);
    setUpdateTrigger(prev => prev + 1);
  }, []);

  return {
    updateTrigger,
    triggerUpdate
  };
};
