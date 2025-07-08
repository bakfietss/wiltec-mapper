import { useEffect, RefObject } from 'react';

interface UseClickOutsideHandlerProps {
  reactFlowWrapper: RefObject<HTMLDivElement>;
  setIsToolbarExpanded: (expanded: boolean) => void;
  setIsManagerExpanded: (expanded: boolean) => void;
}

export const useClickOutsideHandler = ({
  reactFlowWrapper,
  setIsToolbarExpanded,
  setIsManagerExpanded
}: UseClickOutsideHandlerProps) => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      const reactFlowElement = reactFlowWrapper.current?.querySelector('.react-flow');
      const isCanvasClick = reactFlowElement && reactFlowElement.contains(target);
      
      const toolbarElement = document.querySelector('[data-toolbar="mapping-toolbar"]');
      const isToolbarClick = toolbarElement && toolbarElement.contains(target);
      
      const managerElement = document.querySelector('[data-toolbar="mapping-manager"]');
      const isManagerClick = managerElement && managerElement.contains(target);
      
      if (isCanvasClick || (!isToolbarClick && !isManagerClick)) {
        setIsToolbarExpanded(false);
        setIsManagerExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reactFlowWrapper, setIsToolbarExpanded, setIsManagerExpanded]);
};