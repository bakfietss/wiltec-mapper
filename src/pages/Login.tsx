
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import bcrypt from 'bcryptjs';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useApiValidation, setUseApiValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!useApiValidation) {
        // Bypass API validation - directly log in
        console.log('Bypassing API validation, logging in directly...');
        
        const userData = {
          username: username,
          loginTime: new Date().toISOString()
        };
        
        login(userData);

        toast({
          title: "Success",
          description: "Login successful! (API validation bypassed)",
        });

        navigate('/');
        return;
      }

      // Use API validation
      console.log('Starting login process with API validation...');
      console.log('Username:', username);
      
      const hashedPassword = await hashPassword(password);
      console.log('Password hashed successfully with bcryptjs');
      
      const requestBody = {
        username: username,
        password: hashedPassword
      };
      console.log('Request body:', requestBody);
      
      const apiUrl = 'https://windmill.wiltec.nl/api/r/Mapping_Users_Check';
      console.log('Making POST API call to:', apiUrl);
      console.log('Request timestamp:', new Date().toISOString());
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      console.log('Response received at:', new Date().toISOString());
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('API Response:', result);

      if (response.ok && result.success) {
        const userData = {
          username: username,
          loginTime: new Date().toISOString()
        };
        
        login(userData);

        toast({
          title: "Success",
          description: "Login successful!",
        });

        navigate('/');
      } else {
        toast({
          title: "Login Failed",
          description: result.message || "Invalid username or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.name === 'AbortError') {
        console.log('Request timed out after 15 seconds');
        toast({
          title: "Timeout Error",
          description: "The server took too long to respond. Please check if the API server is running.",
          variant: "destructive"
        });
      } else {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        toast({
          title: "Connection Error",
          description: "Cannot connect to the API server. Please verify the server is running and accessible.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <LogIn className="w-6 h-6" />
            Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="useApiValidation"
                checked={useApiValidation}
                onCheckedChange={(checked) => setUseApiValidation(checked as boolean)}
                disabled={isLoading}
              />
              <Label htmlFor="useApiValidation" className="text-sm">
                Use API validation
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
