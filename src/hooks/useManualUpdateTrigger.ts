
import { useCallback, useState } from 'react';

export const useManualUpdateTrigger = () => {
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const triggerUpdate = useCallback((action: string) => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  return {
    updateTrigger,
    triggerUpdate
  };
};
