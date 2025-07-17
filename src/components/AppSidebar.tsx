import React, { useState } from 'react';
import { Home, Wand2, Brain, Settings, LogOut, User, ChevronDown, FolderOpen, Activity, Key, Truck } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const builderItems = [
  { title: 'Template Mapper', url: '/template-mapper', icon: Wand2 },
  { title: 'AI Mapper', url: '/ai-mapper', icon: Brain },
  { title: 'Manual Mapper', url: '/manual', icon: Settings },
];

const mappingItems = [
  { title: 'My Mappings', url: '/my-mappings', icon: Home },
  { title: 'My Transformations', url: '/my-transformations', icon: Activity },
];

const shipmentItems = [
  { title: 'My Shipments', url: '/my-shipments', icon: Truck },
];

const navigationItems = [
  { title: 'Control Panel', url: '/', icon: Home },
  { title: 'Builder', items: builderItems, icon: FolderOpen },
  { title: 'Mappings', items: mappingItems, icon: FolderOpen },
  { title: 'Shipments', items: shipmentItems, icon: FolderOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [builderOpen, setBuilderOpen] = useState(true);
  const [mappingsOpen, setMappingsOpen] = useState(true);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/');
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords don't match",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters long",
      });
      return;
    }

    try {
      setPasswordLoading(true);
      await changePassword(newPassword);
      
      toast({
        title: "Success",
        description: "Your password has been updated successfully",
      });
      
      // Reset form and close dialog
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialog(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path;
  };

  const isBuilderActive = () => {
    return builderItems.some(item => location.pathname === item.url);
  };

  const isMappingsActive = () => {
    return mappingItems.some(item => location.pathname === item.url);
  };

  const getNavClassName = (isActiveRoute: boolean) =>
    isActiveRoute 
      ? "bg-primary text-primary-foreground font-medium" 
      : "hover:bg-muted/50";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Mapping Tool</h2>
              <p className="text-sm text-muted-foreground">Data Transformation</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <Settings className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Control Panel */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    className={({ isActive: navIsActive }) => 
                      getNavClassName(navIsActive || isActive('/'))
                    }
                  >
                    <Home className="w-4 h-4" />
                    {!isCollapsed && <span>Control Panel</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Builder Section */}
              <SidebarMenuItem>
                <Collapsible 
                  open={builderOpen || isCollapsed} 
                  onOpenChange={setBuilderOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`w-full justify-between ${isBuilderActive() ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center">
                        <FolderOpen className="w-4 h-4" />
                        {!isCollapsed && <span className="ml-2">Builder</span>}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${builderOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4">
                    {builderItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive: navIsActive }) => 
                              getNavClassName(navIsActive)
                            }
                          >
                            <item.icon className="w-4 h-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Mappings Section */}
              <SidebarMenuItem>
                <Collapsible 
                  open={mappingsOpen || isCollapsed} 
                  onOpenChange={setMappingsOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={`w-full justify-between ${isMappingsActive() ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center">
                        <FolderOpen className="w-4 h-4" />
                        {!isCollapsed && <span className="ml-2">Mappings</span>}
                      </div>
                      {!isCollapsed && (
                        <ChevronDown className={`w-4 h-4 transition-transform ${mappingsOpen ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4">
                    {mappingItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive: navIsActive }) => 
                              getNavClassName(navIsActive)
                            }
                          >
                            <item.icon className="w-4 h-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>

              {/* Shipments Section */}
              <SidebarMenuItem>
                <Collapsible 
                  open={true || isCollapsed} 
                  className="w-full"
                >
                  <CollapsibleContent className="ml-4">
                    {shipmentItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            className={({ isActive: navIsActive }) => 
                              getNavClassName(navIsActive)
                            }
                          >
                            <item.icon className="w-4 h-4" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter className="border-t p-4">
          <div className="space-y-2">
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2 px-2 py-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{user.username}</span>
                </div>
                <Separator />
              </>
            )}
            
            <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size={isCollapsed ? "icon" : "sm"}
                  className="w-full justify-start"
                >
                  <Key className="w-4 h-4" />
                  {!isCollapsed && <span className="ml-2">Change Password</span>}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Update your password. Make sure it's at least 6 characters long.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPasswordDialog(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleChangePassword}
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">Logout</span>}
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}