icks\VisualStudio\app\wiltec-mapper\src	emplatemapper\components\VisualRedactionSettings.tsx
// ... existing code ...
  // State for preview
  const [previewText, setPreviewText] = useState(
    'Example data with email: john.doe@example.com, phone: +1-555-123-4567, and name: John Doe'
  );
  const [previewResult, setPreviewResult] = useState('');

  // Define these functions at component scope, not inside useEffect
  const updateConfig = () => {
    const rules: RedactionRule[] = [];
    
    // Add built-in rules if enabled
    if (emailRedaction) {
      rules.push({
        type: 'email',
        pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        replacement: '<email>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    // ... existing code for other rule types ...
    
    // Add custom patterns if enabled
    customPatterns.filter(p => p.enabled).forEach(pattern => {
      try {
        const regexPattern = new RegExp(pattern.pattern, 'i');
        rules.push({
          type: 'custom',
          pattern: regexPattern,
          replacement: pattern.replacement,
          validate: (value: any) => typeof value === 'string'
        });
      } catch (e) {
        // If regex is invalid, use it as a keyword pattern
        rules.push({
          type: 'custom',
          pattern: [pattern.pattern],
          replacement: pattern.replacement,
          validate: (value: any) => typeof value === 'string'
        });
      }
    });
    
    const newConfig = new RedactionConfig(rules);
    onConfigChange(newConfig);
  };
  
  const updatePreview = () => {
    const rules: RedactionRule[] = [];
    
    // ... existing code for building rules ...
    
    // Create a temporary config for preview
    const previewConfig = new RedactionConfig(rules);
    
    // Apply redaction to preview text
    const result = redactSample({ text: previewText }, previewConfig).text;
    
    setPreviewResult(result);
  };

  // Initialize state from config
  useEffect(() => {
    // ... existing code ...
  }, [initialConfig]);

  // Remove the function definitions from this useEffect
  useEffect(() => {
    // Empty dependency array or keep necessary dependencies
  }, []);

  // Keep this useEffect for updating when needed
  useEffect(() => {
    if (needsUpdate.current) {
      updateConfig();
      updatePreview();
      needsUpdate.current = false;
    }
  }, [customPatterns, emailRedaction, nameRedaction, phoneRedaction, addressRedaction, personalIdRedaction]);

  // ... existing code ...