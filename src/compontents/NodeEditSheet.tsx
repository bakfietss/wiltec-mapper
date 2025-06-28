
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Edit3 } from 'lucide-react';

interface NodeEditSheetProps {
  title: string;
  children: React.ReactNode;
  triggerClassName?: string;
}

const NodeEditSheet: React.FC<NodeEditSheetProps> = ({ 
  title, 
  children, 
  triggerClassName = "p-1 hover:bg-gray-200 rounded" 
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className={triggerClassName}>
          <Edit3 className="w-3 h-3 text-gray-600" />
        </button>
      </SheetTrigger>
      <SheetContent className="w-[50vw] max-w-[800px] min-w-[600px] flex flex-col">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
};

export default NodeEditSheet;
