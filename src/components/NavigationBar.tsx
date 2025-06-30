
import React from 'react';
import { Button } from './ui/button';
import { Brain, Settings, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/manual')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
      <div className="flex items-center gap-2">
        <Button
          variant={isActive('/') ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Home
        </Button>
        
        <Button
          variant={isActive('/ai-mapper') ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate('/ai-mapper')}
          className="flex items-center gap-2"
        >
          <Brain className="w-4 h-4" />
          AI Mapper
        </Button>
        
        <Button
          variant={isActive('/manual') ? "default" : "ghost"}
          size="sm"
          onClick={() => navigate('/manual')}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Manual
        </Button>
      </div>
    </div>
  );
};

export default NavigationBar;
