import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [useTestCredentials, setUseTestCredentials] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/manual';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Handle test credentials checkbox
  useEffect(() => {
    if (useTestCredentials) {
      setEmail('bakfietss@hotmail.com');
      setPassword('system123!@#');
      
      // Auto-create confirmed test user using Supabase function invoke
      const setupTestUser = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('create-test-user');
          
          if (error) {
            console.log('Test user setup error:', error);
            // Still allow user to try signing in
          } else {
            console.log('Test user setup success:', data);
            toast({
              title: "Test user ready",
              description: "You can now sign in with the test credentials",
            });
          }
        } catch (err) {
          console.log('Test user setup failed:', err);
          // Don't show error to user - they can still try to sign in
        }
      };
      
      setupTestUser();
    } else {
      setEmail('');
      setPassword('');
    }
  }, [useTestCredentials, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.log('Sign in error:', error);
        
        if (error.message === 'Email not confirmed') {
          // For test credentials, try to auto-fix this
          if (email === 'bakfietss@hotmail.com') {
            toast({
              title: "Setting up test account...",
              description: "Please wait while we prepare your test account",
            });
            
            // Retry sign in after a brief delay
            setTimeout(async () => {
              try {
                const { error: retryError } = await supabase.auth.signInWithPassword({
                  email,
                  password
                });
                
                if (retryError) {
                  toast({
                    title: "Test account setup needed",
                    description: "The test account needs manual confirmation. Please try signing up first, then signing in.",
                    variant: "destructive"
                  });
                } else {
                  toast({
                    title: "Success!",
                    description: "Test account is now ready and you're signed in!"
                  });
                }
              } catch (e) {
                toast({
                  title: "Please try signup first",
                  description: "Click 'Sign Up' tab and create the test account, then sign in",
                  variant: "destructive"
                });
              }
              setLoading(false);
            }, 2000);
            return; // Don't set loading to false here
          } else {
            toast({
              title: "Email not verified",
              description: "Please check your email and click the verification link before signing in.",
              variant: "destructive"
            });
          }
        } else if (error.message === 'Invalid login credentials') {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        if (error.message === 'User already registered') {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email and click the verification link to complete your registration."
        });
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Mapping Tool</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="use-test-credentials" 
                    checked={useTestCredentials}
                    onCheckedChange={(checked) => setUseTestCredentials(checked === true)}
                  />
                  <Label htmlFor="use-test-credentials" className="text-sm text-muted-foreground">
                    Use testing credentials for quick access
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={useTestCredentials}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={useTestCredentials}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox 
                    id="use-test-credentials-signup" 
                    checked={useTestCredentials}
                    onCheckedChange={(checked) => setUseTestCredentials(checked === true)}
                  />
                  <Label htmlFor="use-test-credentials-signup" className="text-sm text-muted-foreground">
                    Use testing credentials for quick signup
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={useTestCredentials}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={useTestCredentials}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;