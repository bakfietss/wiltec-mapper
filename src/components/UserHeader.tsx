
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const UserHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900">{user.username}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="flex items-center gap-1"
        >
          <LogOut className="w-3 h-3" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default UserHeader;
