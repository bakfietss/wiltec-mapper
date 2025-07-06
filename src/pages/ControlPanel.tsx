import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MappingService, SavedMapping } from '@/services/MappingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Play, Pause, Eye, Download, Trash2, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const ControlPanel = () => {
  const { user } = useAuth();
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (user?.id) {
      fetchMappings();
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
          <p className="text-muted-foreground">Loading mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Control Panel</h1>
        <p className="text-muted-foreground">
          Manage your data mappings, view status, and control which mappings are active.
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
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMappings.length}</div>
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

      {/* Category Filter */}
      <div className="mb-6">
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
      </div>

      {/* Mappings List */}
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
            <Button onClick={() => window.location.href = '/template-mapper'}>
              Create Your First Mapping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMappings.map((mapping) => (
            <Card key={mapping.id} className={mapping.is_active ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {mapping.is_active ? (
                        <Play className="h-4 w-4 text-green-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-muted-foreground" />
                      )}
                      <CardTitle className="text-lg">{mapping.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">{mapping.version}</Badge>
                    <Badge variant="outline">{mapping.category}</Badge>
                  </div>
                  <Switch
                    checked={mapping.is_active}
                    onCheckedChange={(checked) => handleToggleStatus(mapping.id, checked)}
                  />
                </div>
                {mapping.description && (
                  <CardDescription>{mapping.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Updated {format(new Date(mapping.updated_at), 'MMM d, yyyy')}
                    </div>
                    {mapping.tags && mapping.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {mapping.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {mapping.tags.length > 2 && (
                          <span className="text-xs">+{mapping.tags.length - 2} more</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ControlPanel;