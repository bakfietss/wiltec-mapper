import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, Play, Filter, Calendar, Clock, Activity, Tag, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';

interface MappingLog {
  id: string;
  mapping_id: string;
  mapping_name: string | null;
  category: string | null;
  version: string | null;
  transform_type: string | null;
  status: string | null;
  start_date: string | null;
  start_time_formatted: string | null;
  end_date: string | null;
  end_time_formatted: string | null;
  record_count: number | null;
  input_payload: any;
  output_payload: any;
}

const MyTransformations = () => {
  const { user } = useAuth();
  const { activeDatabase } = useDatabase();
  const [transformations, setTransformations] = useState<MappingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransformation, setSelectedTransformation] = useState<MappingLog | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    name: '',
    category: 'all',
    version: '',
    transformType: 'all',
    status: 'all',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (user?.id) {
      setTransformations([]); // Clear existing data when database changes
      fetchTransformations();
    }
  }, [user?.id, activeDatabase]); // Re-fetch when database changes

  const fetchTransformations = async () => {
    try {
      setLoading(true);
      let data;
      let error;

      if (activeDatabase === 'postgres') {
        const response = await fetch('http://localhost:3000/api/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'mapping_logs',
            operation: 'select',
            columns: '*',
            joins: [{
              table: 'mappings',
              on: 'mapping_logs.mapping_id = mappings.id',
              where: { user_id: user!.id }
            }],
            orderBy: [{ column: 'start_date', order: 'desc' }, { column: 'start_time_formatted', order: 'desc' }]
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.error) {
          throw result.error;
        }
        data = result.data;
      } else if (activeDatabase === 'supabase') {
        const result = await supabase
          .from('mapping_logs')
          .select(`
            *,
            mappings!inner(user_id)
          `)
          .eq('mappings.user_id', user!.id)
          .order('start_date', { ascending: false })
          .order('start_time_formatted', { ascending: false });

        error = result.error;
        data = result.data;
      } else {
        // If neither database is active, clear the data
        setTransformations([]);
        return;
      }

      if (error) throw error;
      
      // Remove the nested mappings object since we only needed it for filtering
      const cleanedData = data?.map(({ mappings, ...rest }) => rest) || [];
      setTransformations(cleanedData);
    } catch (error) {
      console.error('Failed to fetch transformations:', error);
      toast.error('Failed to load transformations');
      setTransformations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (transformation: MappingLog) => {
    setSelectedTransformation(transformation);
    setDetailsDialog(true);
  };

  const handleRerun = (transformation: MappingLog) => {
    // Placeholder for rerun functionality
    toast.info('Rerun functionality coming soon!');
  };

  // Get unique values for filter options
  const getUniqueValues = (field: keyof MappingLog) => {
    return Array.from(new Set(
      transformations
        .map(t => t[field])
        .filter(Boolean)
        .map(v => String(v))
    )).sort();
  };

  const categories = getUniqueValues('category');
  const transformTypes = getUniqueValues('transform_type');
  const statuses = getUniqueValues('status');

  // Apply filters
  let filteredTransformations = transformations;

  if (filters.name) {
    filteredTransformations = filteredTransformations.filter(t => 
      t.mapping_name?.toLowerCase().includes(filters.name.toLowerCase())
    );
  }

  if (filters.category !== 'all') {
    filteredTransformations = filteredTransformations.filter(t => t.category === filters.category);
  }

  if (filters.version) {
    filteredTransformations = filteredTransformations.filter(t => 
      t.version?.toLowerCase().includes(filters.version.toLowerCase())
    );
  }

  if (filters.transformType !== 'all') {
    filteredTransformations = filteredTransformations.filter(t => t.transform_type === filters.transformType);
  }

  if (filters.status !== 'all') {
    filteredTransformations = filteredTransformations.filter(t => t.status === filters.status);
  }

  if (filters.startDate) {
    filteredTransformations = filteredTransformations.filter(t => 
      t.start_date && t.start_date >= filters.startDate
    );
  }

  if (filters.endDate) {
    filteredTransformations = filteredTransformations.filter(t => 
      t.start_date && t.start_date <= filters.endDate
    );
  }

  const totalTransformations = transformations.length;
  const successfulTransformations = transformations.filter(t => t.status === 'success').length;
  const totalRecords = transformations.reduce((sum, t) => sum + (t.record_count || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading transformations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Transformations</h1>
        <p className="text-muted-foreground">
          View and analyze your transformation execution history.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransformations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <Badge className="h-4 w-4 rounded-full bg-emerald-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{successfulTransformations}</div>
            <p className="text-xs text-muted-foreground">
              {totalTransformations > 0 ? `${Math.round((successfulTransformations / totalTransformations) * 100)}% success rate` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total transformations</p>
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

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter transformations by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name-filter">Mapping Name</Label>
              <Input
                id="name-filter"
                placeholder="Search by name..."
                value={filters.name}
                onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version-filter">Version</Label>
              <Input
                id="version-filter"
                placeholder="Search by version..."
                value={filters.version}
                onChange={(e) => setFilters(prev => ({ ...prev, version: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transform-type-filter">Transform Type</Label>
              <Select
                value={filters.transformType}
                onValueChange={(value) => setFilters(prev => ({ ...prev, transformType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transformTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date-filter">Start Date (From)</Label>
              <Input
                id="start-date-filter"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date-filter">Start Date (To)</Label>
              <Input
                id="end-date-filter"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({
                  name: '',
                  category: 'all',
                  version: '',
                  transformType: 'all',
                  status: 'all',
                  startDate: '',
                  endDate: ''
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transformations Table */}
      {filteredTransformations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No transformations found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {totalTransformations === 0 ? 
                "No transformations have been executed yet." :
                "No transformations match your current filters."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Transformation History</CardTitle>
            <CardDescription>
              Showing {filteredTransformations.length} of {totalTransformations} transformations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Transform Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransformations.map((transformation) => (
                  <TableRow key={transformation.id}>
                    <TableCell className="font-mono text-sm">
                      {transformation.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {transformation.mapping_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transformation.category || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transformation.version || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {transformation.transform_type || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={transformation.status === 'success' ? 'default' : 'destructive'}
                        className={transformation.status === 'success' ? 'bg-emerald-100 text-emerald-800' : ''}
                      >
                        {transformation.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {transformation.start_date || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {transformation.start_time_formatted || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {transformation.end_date || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {transformation.end_time_formatted || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {transformation.record_count?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleViewDetails(transformation)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRerun(transformation)}
                        >
                          <Play className="h-4 w-4" />
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

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transformation Details</DialogTitle>
            <DialogDescription>
              View input and output data for this transformation
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransformation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Mapping Name</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransformation.mapping_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge 
                      variant={selectedTransformation.status === 'success' ? 'default' : 'destructive'}
                      className={selectedTransformation.status === 'success' ? 'bg-emerald-100 text-emerald-800' : ''}
                    >
                      {selectedTransformation.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Start Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransformation.start_date} {selectedTransformation.start_time_formatted}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Time</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedTransformation.end_date} {selectedTransformation.end_time_formatted}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Records Processed</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransformation.record_count?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Version</Label>
                  <p className="text-sm text-muted-foreground">{selectedTransformation.version || 'N/A'}</p>
                </div>
              </div>

              {/* Input Data */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Input Data</Label>
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-60">
                      {JSON.stringify(selectedTransformation.input_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Output Data */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Output Data</Label>
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-60">
                      {JSON.stringify(selectedTransformation.output_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              {/* Rerun Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleRerun(selectedTransformation)}>
                  <Play className="h-4 w-4 mr-2" />
                  Rerun Transformation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTransformations;