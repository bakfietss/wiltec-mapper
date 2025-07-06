import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MappingService, SavedMapping } from '@/services/MappingService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Play, Eye, Trash2, Tag, Edit, History } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const MyMappings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<SavedMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; mapping: SavedMapping | null }>({ open: false, mapping: null });
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [versionDialog, setVersionDialog] = useState<{ open: boolean; mapping: SavedMapping | null; versions: SavedMapping[] }>({ 
    open: false, 
    mapping: null, 
    versions: [] 
  });

  useEffect(() => {
    if (user?.id) {
      fetchMappings();
    }
  }, [user?.id]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const data = await MappingService.getLatestMappings(user!.id);
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

  const handleEditMapping = (mapping: SavedMapping) => {
    navigate('/manual', { state: { mappingToLoad: mapping } });
  };

  const handleDeleteMapping = (mapping: SavedMapping) => {
    setDeleteDialog({ open: true, mapping });
    setDeleteConfirmationName('');
  };

  const handleVersionHistory = async (mapping: SavedMapping) => {
    try {
      const versions = await MappingService.getMappingVersions(user!.id, mapping.name, mapping.category);
      setVersionDialog({ open: true, mapping, versions });
    } catch (error) {
      console.error('Failed to fetch mapping versions:', error);
      toast.error('Failed to load version history');
    }
  };

  const handleActivateVersion = async (versionMapping: SavedMapping) => {
    try {
      await MappingService.activateVersion(
        versionMapping.id, 
        user!.id, 
        versionMapping.name, 
        versionMapping.category
      );
      
      // Refresh mappings and close dialog
      await fetchMappings();
      setVersionDialog({ open: false, mapping: null, versions: [] });
      
      toast.success(`Activated version ${versionMapping.version} of "${versionMapping.name}"`);
    } catch (error) {
      console.error('Failed to activate version:', error);
      toast.error('Failed to activate version');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.mapping) return;
    
    try {
      await MappingService.deleteMapping(deleteDialog.mapping.id, user!.id);
      setMappings(prev => prev.filter(m => m.id !== deleteDialog.mapping!.id));
      toast.success(`Mapping "${deleteDialog.mapping.name}" deleted successfully`);
      setDeleteDialog({ open: false, mapping: null });
    } catch (error) {
      console.error('Failed to delete mapping:', error);
      toast.error('Failed to delete mapping');
    }
  };

  const isDeleteNameValid = deleteDialog.mapping?.name === deleteConfirmationName;

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
        <h1 className="text-3xl font-bold text-foreground mb-2">My Mappings</h1>
        <p className="text-muted-foreground">
          Manage and organize your data transformation mappings.
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

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
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
            <CardTitle>Your Mappings</CardTitle>
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
                         <Button 
                           size="sm" 
                           variant="outline"
                           onClick={() => handleVersionHistory(mapping)}
                         >
                           <History className="h-4 w-4" />
                         </Button>
                         <Button size="sm" variant="outline">
                           <Eye className="h-4 w-4" />
                         </Button>
                         <Button 
                           size="sm" 
                           variant="outline" 
                           className="text-destructive hover:text-destructive"
                           onClick={() => handleDeleteMapping(mapping)}
                         >
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, mapping: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Mapping</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this mapping? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog.mapping && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{deleteDialog.mapping.name}</p>
                <p className="text-sm text-muted-foreground">
                  Version: {deleteDialog.mapping.version} • Category: {deleteDialog.mapping.category}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type the mapping name to confirm deletion:
                </label>
                <Input
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                  placeholder={deleteDialog.mapping.name}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, mapping: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={!isDeleteNameValid}
            >
              Delete Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialog.open} onOpenChange={(open) => setVersionDialog({ open, mapping: null, versions: [] })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              {versionDialog.mapping && `All versions of "${versionDialog.mapping.name}" mapping`}
            </DialogDescription>
          </DialogHeader>
          
          {versionDialog.mapping && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{versionDialog.mapping.name}</p>
                <p className="text-sm text-muted-foreground">
                  Category: {versionDialog.mapping.category}
                </p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versionDialog.versions.map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>
                        <Badge variant="secondary">{version.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {version.is_active ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(version.updated_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {!version.is_active && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleActivateVersion(version)}
                          >
                            Activate
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setVersionDialog({ open: false, mapping: null, versions: [] })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyMappings;