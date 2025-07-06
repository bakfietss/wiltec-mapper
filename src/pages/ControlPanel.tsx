import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MappingService, SavedMapping } from '@/services/MappingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Play, Pause, Eye, Download, Trash2, Tag, Calendar, Edit, RotateCcw, FileText, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const ControlPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchMappings();
      fetchLogs();
    }
  }, [user?.id]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const data = await MappingService.getMappings(user!.id);
      setMappings(data);
    } catch (error) {
      console.error('Failed to fetch mappings:', error);
      toast.error('Failed to load mappings');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    // TODO: Implement log fetching from mapping_logs table
    setLogs([]);
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await MappingService.toggleMappingStatus(id, user!.id, isActive);
      setMappings(prev => 
        prev.map(mapping => 
          mapping.id === id ? { ...mapping, is_active: isActive } : mapping
        )
      );
      toast.success(`Mapping ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle mapping status:', error);
      toast.error('Failed to update mapping status');
    }
  };

  const handleEditMapping = (mapping: SavedMapping) => {
    // Navigate to manual mapper with the mapping data
    navigate('/manual', { state: { mappingToLoad: mapping } });
  };

  const handleRetryTransformation = (logId: string) => {
    // TODO: Implement retry logic
    toast.info('Retry functionality coming soon');
  };

  const categories = Array.from(new Set(mappings.map(m => m.category).filter(Boolean)));
  const filteredMappings = selectedCategory === 'all' 
    ? mappings 
    : mappings.filter(m => m.category === selectedCategory);

  const activeMappings = mappings.filter(m => m.is_active);
  const totalMappings = mappings.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading control panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Control Panel</h1>
        <p className="text-muted-foreground">
          Manage mappings, monitor transformations, and control your data workflows.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMappings}</div>
            <p className="text-xs text-muted-foreground">Across all categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mappings</CardTitle>
            <Play className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeMappings.length}</div>
            <p className="text-xs text-muted-foreground">Currently enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">Different categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="mappings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Mapping Manager
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Logs & Transformations
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data Insights
          </TabsTrigger>
        </TabsList>

        {/* Mapping Manager Tab */}
        <TabsContent value="mappings" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button 
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Mappings Table */}
          {filteredMappings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Tag className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No mappings found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {selectedCategory === 'all' 
                    ? "You haven't created any mappings yet. Start by using one of the builder tools."
                    : `No mappings found in the "${selectedCategory}" category.`
                  }
                </p>
                <Button onClick={() => navigate('/template-mapper')}>
                  Create Your First Mapping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Mappings</CardTitle>
                <CardDescription>Manage your data transformation mappings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={mapping.is_active}
                              onCheckedChange={(checked) => handleToggleStatus(mapping.id, checked)}
                            />
                            {mapping.is_active ? (
                              <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{mapping.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{mapping.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{mapping.version}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(mapping.updated_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditMapping(mapping)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Logs & Transformations Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transformation Logs</CardTitle>
              <CardDescription>Monitor and retry data transformations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Mapping</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      No transformation logs yet
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Insights Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Transformation Insights</CardTitle>
              <CardDescription>View before and after transformation data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No data insights available</h3>
                <p className="text-muted-foreground">
                  Data insights will appear here once you start running transformations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControlPanel;