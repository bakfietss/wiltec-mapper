import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Upload, Copy, Check, Eye, EyeOff, Shield } from 'lucide-react';
import DataUploadZone from '../../components/DataUploadZone';
import { RedactionConfig, redactArray, redactSample } from '../input-processor/redact';

interface SourceDataSectionProps {
  sourceData: string;
  sourceDataFlattened: string;
  showRedacted: boolean;
  redactionConfig: RedactionConfig;
  onSourceDataUpload: (data: any[]) => void;
  onShowRedactedChange: (show: boolean) => void;
  onCopyToClipboard: (text: string) => void;
  copied: boolean;
}

export const SourceDataSection: React.FC<SourceDataSectionProps> = ({
  sourceData,
  sourceDataFlattened,
  showRedacted,
  redactionConfig,
  onSourceDataUpload,
  onShowRedactedChange,
  onCopyToClipboard,
  copied
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Source Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DataUploadZone 
          onDataUpload={onSourceDataUpload}
          acceptedTypes={['JSON', 'CSV', 'Excel']}
          title="Upload Source Data"
          description="Drag and drop your data file or click to browse"
        />
        
        {sourceData && (
          <div className="space-y-4">
            {/* Original Data */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">
                  Original Source Data
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCopyToClipboard(sourceData)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Textarea
                value={sourceData}
                readOnly
                className="min-h-[150px] font-mono text-sm"
                placeholder="Your source data will appear here..."
              />
            </div>
            
            {/* Flattened Data */}
            {sourceDataFlattened && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">
                    Flattened Source Data
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onShowRedactedChange(!showRedacted)}
                    >
                      {showRedacted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {showRedacted ? 'Show Original' : 'Show Redacted'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const data = JSON.parse(sourceDataFlattened);
                        const redactedData = data.rows ? 
                          { rows: redactArray(data.rows, redactionConfig) } : 
                          redactSample(data, redactionConfig);
                        onCopyToClipboard(showRedacted ? 
                          JSON.stringify(redactedData, null, 2) : 
                          sourceDataFlattened
                        );
                      }}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={showRedacted ? 
                    JSON.stringify(
                      (() => {
                        const data = JSON.parse(sourceDataFlattened);
                        return data.rows ? 
                          { rows: redactArray(data.rows, redactionConfig) } : 
                          redactSample(data, redactionConfig);
                      })(), 
                      null, 
                      2
                    ) : 
                    sourceDataFlattened
                  }
                  readOnly
                  className="min-h-[150px] font-mono text-sm"
                  placeholder="Flattened data will appear here..."
                />
                {showRedacted && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Personal information has been redacted for privacy protection
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};