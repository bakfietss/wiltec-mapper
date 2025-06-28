import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Upload } from 'lucide-react';

interface JsonImportDialogProps {
    jsonInput: string;
    setJsonInput: (value: string) => void;
    onImport: () => void;
    triggerText?: string;
    title?: string;
}

const JsonImportDialog: React.FC<JsonImportDialogProps> = ({
    jsonInput,
    setJsonInput,
    onImport,
    triggerText = "Import JSON",
    title = "Import JSON Data"
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleImport = () => {
        onImport();
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                >
                    <Upload className="w-3 h-3" />
                    {triggerText}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        className="w-full h-64 border border-gray-300 rounded-md p-3 text-sm font-mono resize-none"
                        placeholder='Enter your JSON data here...'
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!jsonInput.trim()}
                        >
                            Import Data
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default JsonImportDialog;
