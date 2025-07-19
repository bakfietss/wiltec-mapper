import { toast } from '../hooks/use-toast';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    toast({ 
      title: "Copy failed", 
      description: "Please copy manually", 
      variant: "destructive" 
    });
    return false;
  }
};