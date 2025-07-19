import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Upload, Copy, Check, Eye, EyeOff, Shield } from 'lucide-react';
import DataUploadZone from '../../components/DataUploadZone';
import { RedactionConfig, redactArray, redactSample } from '../input-processor/redact';

interface TargetDataSectionProps {
  targetData: string;
  targetDataFlattened: string;
  onTargetDataUpload: (data: any[]) => void;
  onCopyToClipboard: (text: string) => void;
  copied: boolean;
}

export const TargetDataSection: React.FC<TargetDataSectionProps> = ({
  targetData,
  targetDataFlattened,
  onTargetDataUpload,
  onCopyToClipboard,
  copied
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Target Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataUploadZone 
          onDataUpload={onTargetDataUpload}
          acceptedTypes={['JSON', 'CSV', 'Excel']}
          title="Upload Target Data"
          description="Drag and drop your target data file or click to browse"
        />
        
        {targetData && (
          <div className="space-y-4">
            {/* Original Target Data */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">
                  Original Target Data
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCopyToClipboard(targetData)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Textarea
                value={targetData}
                readOnly
                className="min-h-[150px] font-mono text-sm"
                placeholder="Your target data will appear here..."
              />
            </div>
            
            {/* Flattened Target Data */}
            {targetDataFlattened && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    Flattened Target Data
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCopyToClipboard(targetDataFlattened)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Textarea
                  value={targetDataFlattened}
                  readOnly
                  className="min-h-[150px] font-mono text-sm"
                  placeholder="Flattened target data will appear here..."
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};