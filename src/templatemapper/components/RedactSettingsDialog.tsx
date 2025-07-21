import * as React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Settings2, Trash2 } from 'lucide-react';
import { RedactionConfig } from '../input-processor/redact';

interface CustomPattern {
  id: string;
  pattern: string;
  replacement: string;
}

interface RedactSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigChange: (config: RedactionConfig) => void;
}

export function RedactSettingsDialog({ open, onOpenChange, onConfigChange }: RedactSettingsDialogProps) {
  const [emailRedaction, setEmailRedaction] = useState(false);
  const [phoneRedaction, setPhoneRedaction] = useState(false);
  const [addressRedaction, setAddressRedaction] = useState(false);
  const [customPatterns, setCustomPatterns] = useState<CustomPattern[]>([
    { id: '1', pattern: '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}', replacement: '[EMAIL]' }
  ]);

  const addCustomPattern = () => {
    const newPattern: CustomPattern = {
      id: Date.now().toString(),
      pattern: '',
      replacement: '[REDACTED]'
    };
    setCustomPatterns([...customPatterns, newPattern]);
  };

  const removePattern = (id: string) => {
    setCustomPatterns(customPatterns.filter(pattern => pattern.id !== id));
  };

  const updatePattern = (id: string, field: 'pattern' | 'replacement', value: string) => {
    setCustomPatterns(customPatterns.map(pattern =>
      pattern.id === id ? { ...pattern, [field]: value } : pattern
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Redaction Settings
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="redaction">Redaction</TabsTrigger>
            <TabsTrigger value="patterns">Custom Patterns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Data Protection</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${emailRedaction ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${emailRedaction ? 'text-green-600' : 'text-muted-foreground'}`}>
                      Email redaction
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${phoneRedaction ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${phoneRedaction ? 'text-green-600' : 'text-muted-foreground'}`}>
                      Phone redaction
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${addressRedaction ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-sm ${addressRedaction ? 'text-green-600' : 'text-muted-foreground'}`}>
                      Address redaction
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Custom Rules</h4>
                <Badge variant="secondary" className="text-xs">
                  {customPatterns.length} patterns active
                </Badge>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="redaction" className="space-y-6">
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
            </div>
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Custom Patterns</h4>
                <Button onClick={addCustomPattern} variant="outline" size="sm">
                  Add Pattern
                </Button>
              </div>
              
              <div className="space-y-3">
                {customPatterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center space-x-2 p-3 border rounded-md transition-all duration-200 hover:border-primary/50">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={pattern.pattern}
                        onChange={(e) => updatePattern(pattern.id, 'pattern', e.target.value)}
                        placeholder="Pattern (regex)"
                        className="text-sm"
                      />
                      <Input
                        value={pattern.replacement}
                        onChange={(e) => updatePattern(pattern.id, 'replacement', e.target.value)}
                        placeholder="Replacement"
                        className="text-sm"
                      />
                    </div>
                    <Button
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
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}