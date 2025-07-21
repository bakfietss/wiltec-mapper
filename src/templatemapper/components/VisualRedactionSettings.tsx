import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings2, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { RedactionRule, RedactionConfig, defaultConfig, redactSample } from '../input-processor/redact';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface CustomPattern {
  id: string;
  name: string; // Added name field
  pattern: string;
  replacement: string;
  type: string;
  enabled: boolean;
}

interface VisualRedactionSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigChange: (config: RedactionConfig) => void;
  initialConfig?: RedactionConfig;
}

export function VisualRedactionSettings({ 
  open, 
  onOpenChange, 
  onConfigChange,
  initialConfig = defaultConfig 
}: VisualRedactionSettingsProps) {
  // State for built-in redaction rules
  const [emailRedaction, setEmailRedaction] = useState(true);
  const [nameRedaction, setNameRedaction] = useState(true);
  const [phoneRedaction, setPhoneRedaction] = useState(false);
  const [addressRedaction, setAddressRedaction] = useState(false);
  const [personalIdRedaction, setPersonalIdRedaction] = useState(false);
  
  // State for custom patterns
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([]);
  
  // State for preview
  const [previewText, setPreviewText] = useState(
    'Example data with email: john.doe@example.com, phone: +1-555-123-4567, and name: John Doe'
  );
  const [previewResult, setPreviewResult] = useState('');

  // Add this at the top of your component
  const needsUpdate = React.useRef(false);
  
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
    
    if (nameRedaction) {
      rules.push({
        type: 'name',
        pattern: [
          'name', 'firstname', 'lastname', 'middlename', 'surname', 'givenname',
          'naam', 'voornaam', 'achternaam', 'voorvoegsel', 'roepnaam', 'tussenvoegsel',
          'fullname', 'initials', 'prefix', 'suffix',
          'first', 'last', 'middle', 'given', 'family'
        ],
        replacement: '<name>',
        validate: (value: any) => {
          if (typeof value !== 'string') return false;
          const str = value.trim();
          return str.length >= 2 && !/\d/.test(str);
        }
      });
    }
    
    if (phoneRedaction) {
      rules.push({
        type: 'phone',
        pattern: /\b[\+]?[0-9][\d\s\-\(\)]{7,}\b/,
        replacement: '<phone>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    if (addressRedaction) {
      rules.push({
        type: 'address',
        pattern: [
          'address', 'adres', 'street', 'straat', 'city', 'stad', 'postal', 'postcode', 'zip'
        ],
        replacement: '<address>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    if (personalIdRedaction) {
      rules.push({
        type: 'personal_id',
        pattern: [
          'bsn', 'ssn', 'id', 'personeelsnummer', 'employeeid'
        ],
        replacement: '<personal_id>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
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
    
    // Add built-in rules if enabled (same as updateConfig)
    if (emailRedaction) {
      rules.push({
        type: 'email',
        pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
        replacement: '<email>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    if (nameRedaction) {
      rules.push({
        type: 'name',
        pattern: [
          'name', 'firstname', 'lastname', 'middlename', 'surname', 'givenname',
          'naam', 'voornaam', 'achternaam', 'voorvoegsel', 'roepnaam', 'tussenvoegsel',
          'fullname', 'initials', 'prefix', 'suffix',
          'first', 'last', 'middle', 'given', 'family'
        ],
        replacement: '<name>',
        validate: (value: any) => {
          if (typeof value !== 'string') return false;
          const str = value.trim();
          return str.length >= 2 && !/\d/.test(str);
        }
      });
    }
    
    if (phoneRedaction) {
      rules.push({
        type: 'phone',
        pattern: /\b[\+]?[0-9][\d\s\-\(\)]{7,}\b/,
        replacement: '<phone>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    if (addressRedaction) {
      rules.push({
        type: 'address',
        pattern: [
          'address', 'adres', 'street', 'straat', 'city', 'stad', 'postal', 'postcode', 'zip'
        ],
        replacement: '<address>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    if (personalIdRedaction) {
      rules.push({
        type: 'personal_id',
        pattern: [
          'bsn', 'ssn', 'id', 'personeelsnummer', 'employeeid'
        ],
        replacement: '<personal_id>',
        validate: (value: any) => typeof value === 'string'
      });
    }
    
    // Add custom patterns
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
        rules.push({
          type: 'custom',
          pattern: [pattern.pattern],
          replacement: pattern.replacement,
          validate: (value: any) => typeof value === 'string'
        });
      }
    });
    
    // Create a temporary config for preview
    const previewConfig = new RedactionConfig(rules);
    
    // Apply redaction to preview text
    const result = redactSample({ text: previewText }, previewConfig).text;
    
    setPreviewResult(result);
  };

  // Add the missing addCustomPattern function
  const addCustomPattern = () => {
    const newPattern: CustomPattern = {
      id: Math.random().toString(36).substring(2),
      name: '', // Initialize with empty name
      pattern: '',
      replacement: '<redacted>',
      type: 'custom',
      enabled: true
    };
    
    setCustomPatterns([...customPatterns, newPattern]);
    needsUpdate.current = true;
  };

  // Function to update a pattern
  const updatePattern = (id: string, field: keyof CustomPattern, value: any) => {
    // Create a new array with the updated pattern
    const updatedPatterns = customPatterns.map(pattern =>
      pattern.id === id ? { ...pattern, [field]: value } : pattern
    );
    
    // Update the state with the new array
    setCustomPatterns(updatedPatterns);
    needsUpdate.current = true;
  };

  // Function to remove a pattern
  const removePattern = (id: string) => {
    // Create a new array without the removed pattern
    const filteredPatterns = customPatterns.filter(pattern => pattern.id !== id);
    
    // Update the state with the new array
    setCustomPatterns(filteredPatterns);
    needsUpdate.current = true;
  };

  // Initialize state from config
  useEffect(() => {
    if (initialConfig) {
      const rules = initialConfig.getRules();
      
      // Set built-in rule states
      setEmailRedaction(rules.some(rule => rule.type === 'email'));
      setNameRedaction(rules.some(rule => rule.type === 'name'));
      setPhoneRedaction(rules.some(rule => rule.type === 'phone'));
      setAddressRedaction(rules.some(rule => rule.type === 'address'));
      setPersonalIdRedaction(rules.some(rule => rule.type === 'personal_id'));
      
      // Set custom patterns
      const customRules = rules.filter(rule => rule.type === 'custom');
      const patterns = customRules.map(rule => ({
        id: Math.random().toString(36).substring(2),
        name: '', // Add default name
        pattern: Array.isArray(rule.pattern) ? rule.pattern[0] : rule.pattern.toString(),
        replacement: rule.replacement,
        type: 'custom',
        enabled: true
      }));
      
      setCustomPatterns(patterns);
    }
  }, [initialConfig]);

  // Update config when rules change
  useEffect(() => {
    if (needsUpdate.current) {
      updateConfig();
      updatePreview();
      needsUpdate.current = false;
    }
  }, [customPatterns, emailRedaction, nameRedaction, phoneRedaction, addressRedaction, personalIdRedaction]);

  // Initial preview update
  useEffect(() => {
    updatePreview();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Visual Redaction Settings
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rules">Redaction Rules</TabsTrigger>
            <TabsTrigger value="patterns">Custom Patterns</TabsTrigger>
            <TabsTrigger value="preview">Live Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rules" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-redaction" className="text-sm font-medium">
                    Email Redaction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace email addresses with placeholder text
                  </p>
                </div>
                <Switch
                  id="email-redaction"
                  checked={emailRedaction}
                  onCheckedChange={setEmailRedaction}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="name-redaction" className="text-sm font-medium">
                    Name Redaction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace names with placeholder text
                  </p>
                </div>
                <Switch
                  id="name-redaction"
                  checked={nameRedaction}
                  onCheckedChange={setNameRedaction}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="phone-redaction" className="text-sm font-medium">
                    Phone Number Redaction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace phone numbers with placeholder text
                  </p>
                </div>
                <Switch
                  id="phone-redaction"
                  checked={phoneRedaction}
                  onCheckedChange={setPhoneRedaction}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="address-redaction" className="text-sm font-medium">
                    Address Redaction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace addresses with placeholder text
                  </p>
                </div>
                <Switch
                  id="address-redaction"
                  checked={addressRedaction}
                  onCheckedChange={setAddressRedaction}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="personal-id-redaction" className="text-sm font-medium">
                    Personal ID Redaction
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Replace personal IDs (BSN, SSN, etc.) with placeholder text
                  </p>
                </div>
                <Switch
                  id="personal-id-redaction"
                  checked={personalIdRedaction}
                  onCheckedChange={setPersonalIdRedaction}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Custom Patterns</h4>
                <Button onClick={addCustomPattern} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              
              <div className="space-y-3">
                {customPatterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center space-x-2 p-3 border rounded-md transition-all duration-200 hover:border-primary/50">
                    <Switch
                      id={`pattern-switch-${pattern.id}`}
                      checked={pattern.enabled}
                      onCheckedChange={(checked) => {
                        updatePattern(pattern.id, 'enabled', checked);
                      }}
                      className="mr-2"
                    />
                    <div className="flex-1 grid grid-cols-3 gap-2"> {/* Changed from grid-cols-2 to grid-cols-3 */}
                      <div>
                        <Input
                          id={`name-input-${pattern.id}`}
                          name={`name-input-${pattern.id}`}
                          value={pattern.name}
                          onChange={(e) => updatePattern(pattern.id, 'name', e.target.value)}
                          placeholder="Name"
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Pattern name</p>
                      </div>
                      <div>
                        <Input
                          id={`pattern-input-${pattern.id}`}
                          name={`pattern-input-${pattern.id}`}
                          value={pattern.pattern}
                          onChange={(e) => updatePattern(pattern.id, 'pattern', e.target.value)}
                          placeholder="Pattern (regex or keyword)"
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Example: \d{4}-\d{4}-\d{4}-\d{4} for credit cards</p>
                      </div>
                      <div>
                        <Input
                          id={`replacement-input-${pattern.id}`}
                          name={`replacement-input-${pattern.id}`}
                          value={pattern.replacement}
                          onChange={(e) => updatePattern(pattern.id, 'replacement', e.target.value)}
                          placeholder="Replacement"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePattern(pattern.id)}
                      className="hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {customPatterns.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-sm text-muted-foreground">No custom patterns added yet</p>
                  <Button onClick={addCustomPattern} variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Pattern
                  </Button>
                </div>
              )}
              
              {/* Example patterns div moved inside the component */}
              <div className="p-3 border rounded-md bg-muted/30 mt-4">
                <h5 className="text-sm font-medium mb-2">Example Patterns:</h5>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li><strong>Credit Card:</strong> \d{4}-\d{4}-\d{4}-\d{4}</li>
                  <li><strong>SSN:</strong> \b\d{3}-\d{2}-\d{4}\b</li>
                  <li><strong>Simple Keyword:</strong> password</li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="preview-text" className="text-sm font-medium">
                  Sample Text
                </Label>
                <Textarea
                  id="preview-text"
                  value={previewText}
                  onChange={(e) => {
                    setPreviewText(e.target.value);
                    updatePreview();
                  }}
                  placeholder="Enter sample text with sensitive data"
                  className="min-h-[100px] font-mono text-sm mt-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Redacted Result</Label>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Preview
                  </Badge>
                </div>
                <Card className="mt-2 bg-muted/50">
                  <CardContent className="p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{previewResult}</pre>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Active Rules: {[
                    emailRedaction && 'Email',
                    nameRedaction && 'Name',
                    phoneRedaction && 'Phone',
                    addressRedaction && 'Address',
                    personalIdRedaction && 'Personal ID',
                    customPatterns.filter(p => p.enabled).length > 0 && 
                      `${customPatterns.filter(p => p.enabled).length} Custom Pattern${customPatterns.filter(p => p.enabled).length !== 1 ? 's' : ''}`
                  ].filter(Boolean).join(', ')}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            updateConfig();
            onOpenChange(false);
          }}>
            <Shield className="h-4 w-4 mr-2" />
            Apply Redaction Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}