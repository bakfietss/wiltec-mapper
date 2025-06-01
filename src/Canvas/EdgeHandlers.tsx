// This file is no longer needed as edge handling is now done directly in Pipeline
// Keeping file for backward compatibility

export const useEdgeHandlers = () => {
    console.warn('useEdgeHandlers hook is deprecated - edge handling is now done directly in Pipeline');
    return {
        onConnect: () => {},
        handleEdgesChange: () => {}
    };
};
