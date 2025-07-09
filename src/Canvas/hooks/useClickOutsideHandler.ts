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
      console.log('🔍 Click detected:', target);
      
      const reactFlowElement = reactFlowWrapper.current?.querySelector('.react-flow');
      const isCanvasClick = reactFlowElement && reactFlowElement.contains(target);
      console.log('🔍 Is canvas click:', isCanvasClick);
      
      const toolbarElement = document.querySelector('[data-toolbar="mapping-toolbar"]');
      const isToolbarClick = toolbarElement && toolbarElement.contains(target);
      console.log('🔍 Is toolbar click:', isToolbarClick, toolbarElement);
      
      const managerElement = document.querySelector('[data-toolbar="mapping-manager"]');
      const isManagerClick = managerElement && managerElement.contains(target);
      console.log('🔍 Is manager click:', isManagerClick, managerElement);
      
      // Check if click is inside any dialog
      const isDialogClick = target.closest('[role="dialog"]') || 
                           target.closest('[data-radix-popper-content-wrapper]') ||
                           target.closest('.select-content');
      console.log('🔍 Is dialog click:', isDialogClick);
      
      if (isCanvasClick || (!isToolbarClick && !isManagerClick && !isDialogClick)) {
        console.log('🔍 Closing menus...');
        setIsToolbarExpanded(false);
        setIsManagerExpanded(false);
      } else {
        console.log('🔍 Keeping menus open');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [reactFlowWrapper, setIsToolbarExpanded, setIsManagerExpanded]);
};