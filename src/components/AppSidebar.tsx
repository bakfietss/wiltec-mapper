import React, { useState } from 'react';
import { Home, Wand2, Brain, Settings, LogOut, User, ChevronDown, FolderOpen } from 'lucide-react';
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

const builderItems = [
  { title: 'Template Mapper', url: '/template-mapper', icon: Wand2 },
  { title: 'AI Mapper', url: '/ai-mapper', icon: Brain },
  { title: 'Manual Mapper', url: '/manual', icon: Settings },
];

const mappingItems = [
  { title: 'My Mappings', url: '/', icon: Home },
];

const navigationItems = [
  { title: 'Control Panel', url: '/', icon: Home },
  { title: 'Builder', items: builderItems, icon: FolderOpen },
  { title: 'Mappings', items: mappingItems, icon: FolderOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [builderOpen, setBuilderOpen] = useState(true);
  const [mappingsOpen, setMappingsOpen] = useState(true);

  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/');
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