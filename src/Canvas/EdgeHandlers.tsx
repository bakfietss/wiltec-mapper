
// This file has been deprecated - edge handling is now done directly in Pipeline
// Kept for backward compatibility but should be removed in future cleanup

export const useEdgeHandlers = () => {
    return {
        onConnect: () => {},
        handleEdgesChange: () => {}
    };
};
