import { useState } from 'react';
import { RedactionRule, RedactionConfig, defaultConfig } from '../input-processor/redact';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RedactionSettingsProps {
  onConfigChange: (config: RedactionConfig) => void;
}

export function RedactionSettings({ onConfigChange }: RedactionSettingsProps) {
  const [config, setConfig] = useState(() => defaultConfig);
  const [customPattern, setCustomPattern] = useState('');
  const [customReplacement, setCustomReplacement] = useState('<custom>');

  const handleAddCustomRule = () => {
    if (!customPattern) return;
    
    const newRule: RedactionRule = {
      type: 'custom',
      pattern: [customPattern],
      replacement: customReplacement,
      validate: (value: any) => typeof value === 'string'
    };

    const newConfig = new RedactionConfig([...config.getRules(), newRule]);
    setConfig(newConfig);
    onConfigChange(newConfig);
    setCustomPattern('');
    setCustomReplacement('<custom>');
  };

  const toggleRule = (ruleType: string, enabled: boolean) => {
    const currentRules = config.getRules();
    const newRules = enabled 
      ? currentRules
      : currentRules.filter(rule => rule.type !== ruleType);
    
    const newConfig = new RedactionConfig(newRules);
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redaction Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-redaction">Email Redaction</Label>
            <Switch
              id="email-redaction"
              defaultChecked
              onCheckedChange={(checked) => toggleRule('email', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="name-redaction">Name Redaction</Label>
            <Switch
              id="name-redaction"
              defaultChecked
              onCheckedChange={(checked) => toggleRule('name', checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Add Custom Pattern</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Field name pattern"
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
              />
              <Input
                placeholder="Replacement"
                value={customReplacement}
                onChange={(e) => setCustomReplacement(e.target.value)}
              />
              <Button onClick={handleAddCustomRule}>Add</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}