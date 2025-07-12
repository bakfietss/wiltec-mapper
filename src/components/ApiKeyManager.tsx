import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiKeyService, ApiKey } from '@/services/ApiKeyService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Key, Plus, Trash2, Calendar, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';

export const ApiKeyManager = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{ open: boolean; key: ApiKey | null }>({ open: false, key: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; key: ApiKey | null }>({ open: false, key: null });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  
  // Form state
  const [description, setDescription] = useState('');
  const [keyType, setKeyType] = useState('general');
  const [expiresAt, setExpiresAt] = useState('');
  
  useEffect(() => {
    if (user?.id) {
      fetchApiKeys();
    }
  }, [user?.id]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await ApiKeyService.getApiKeys(user!.id);
      setApiKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      const fullDescription = keyType === 'openai' 
        ? `OpenAI API Key${description.trim() ? ` - ${description.trim()}` : ''}`
        : description.trim() || undefined;
      
      const newKey = await ApiKeyService.createApiKey(
        user!.id, 
        fullDescription,
        expiresAt || undefined
      );
      
      setApiKeys(prev => [newKey, ...prev]);
      setCreateDialog(false);
      resetForm();
      
      // Show the new key temporarily
      setVisibleKeys(prev => new Set([...prev, newKey.id]));
      
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    }
  };

  const handleEditApiKey = async () => {
    if (!editDialog.key) return;
    
    try {
      const updatedKey = await ApiKeyService.updateApiKey(
        editDialog.key.id,
        user!.id,
        description.trim() || undefined
      );
      
      setApiKeys(prev => 
        prev.map(key => 
          key.id === editDialog.key!.id ? { ...key, description: updatedKey.description } : key
        )
      );
      setEditDialog({ open: false, key: null });
      resetForm();
      
      toast.success('API key updated successfully');
    } catch (error) {
      console.error('Failed to update API key:', error);
      toast.error('Failed to update API key');
    }
  };

  const resetForm = () => {
    setDescription('');
    setKeyType('general');
    setExpiresAt('');
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      await ApiKeyService.revokeApiKey(keyId, user!.id);
      setApiKeys(prev => 
        prev.map(key => 
          key.id === keyId ? { ...key, revoked: true, status: 'revoked' } : key
        )
      );
      toast.success('API key revoked');
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const handleDeleteApiKey = async () => {
    if (!deleteDialog.key) return;
    
    try {
      await ApiKeyService.deleteApiKey(deleteDialog.key.id, user!.id);
      setApiKeys(prev => prev.filter(key => key.id !== deleteDialog.key!.id));
      setDeleteDialog({ open: false, key: null });
      toast.success('API key deleted');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('API key copied to clipboard');
  };

  const getStatusBadge = (key: ApiKey) => {
    if (key.revoked) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (ApiKeyService.isExpired(key.expires_at)) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    return <Badge variant="default" className="bg-emerald-100 text-emerald-800">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Manage API keys for accessing your transformation endpoints
          </p>
        </div>
        
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for accessing your transformation endpoints.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyType">Key Type</Label>
                <select
                  id="keyType"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={keyType}
                  onChange={(e) => setKeyType(e.target.value)}
                >
                  <option value="general">General API Key</option>
                  <option value="openai">OpenAI API Key</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">
                  {keyType === 'openai' ? 'Additional Description (optional)' : 'Description (optional)'}
                </Label>
                <Textarea
                  id="description"
                  placeholder={keyType === 'openai' ? 'e.g., For template analysis' : 'e.g., Power Automate Integration'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expires">Expires At (optional)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreateApiKey}>
                Create API Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first API key to start using the transformation endpoints.
            </p>
            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
              <DialogTrigger asChild>
                <Button>Create Your First API Key</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your API Keys</CardTitle>
            <CardDescription>
              Use these keys to authenticate requests to your transformation endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{getStatusBadge(key)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm">
                          {visibleKeys.has(key.id) ? key.key : ApiKeyService.maskApiKey(key.key)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.description || (
                        <span className="text-muted-foreground italic">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(key.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {key.expires_at ? (
                        <div className="flex items-center gap-1">
                          {ApiKeyService.isExpired(key.expires_at) && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                          <span className={ApiKeyService.isExpired(key.expires_at) ? 'text-orange-600' : ''}>
                            {format(new Date(key.expires_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDescription(key.description?.replace(/^OpenAI API Key\s*-\s*/, '') || '');
                            setEditDialog({ open: true, key });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!key.revoked && !ApiKeyService.isExpired(key.expires_at) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeApiKey(key.id)}
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteDialog({ open: true, key })}
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

      {/* Edit API Key Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => { 
        setEditDialog({ open, key: null }); 
        if (!open) resetForm(); 
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit API Key</DialogTitle>
            <DialogDescription>
              Update the description for this API key.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                placeholder="e.g., Power Automate Integration"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { setEditDialog({ open: false, key: null }); resetForm(); }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditApiKey}>
              Update API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, key: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API key? This action cannot be undone and will immediately invalidate the key.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog.key && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium font-mono">{ApiKeyService.maskApiKey(deleteDialog.key.key)}</p>
              <p className="text-sm text-muted-foreground">
                {deleteDialog.key.description || 'No description'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialog({ open: false, key: null })}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteApiKey}
            >
              Delete API Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};