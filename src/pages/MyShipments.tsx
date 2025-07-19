import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Activity } from 'lucide-react';

interface Shipment {
  id: number;
  external_reference: string;
  status: string;
  estimated_arrival_date: string;
  created_at: string;
  updated_at: string; // Changed from modified_at to updated_at
}

const MyShipments = () => {
  const { activeDatabase } = useDatabase();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching shipments...');
        
        // Use different endpoints based on the active database
        const endpoint = activeDatabase === 'postgres' 
          ? 'http://localhost:3000/api/query'
          : 'https://your-supabase-url/rest/v1/shipments';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'shipments',
            operation: 'select',
            columns: 'id, external_reference, status, estimated_arrival_date, created_at, updated_at' // Changed modified_at to updated_at
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        setShipments(result.data || []);
      } catch (error) {
        console.error('Error fetching shipments:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch shipments');
        setShipments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [activeDatabase]); // Re-fetch when database changes

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShipments = shipments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(shipments.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">My Shipments</h1>
        <p className="text-muted-foreground">
          View and manage your shipment records.
        </p>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipments.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Table */}
      {shipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shipments found</h3>
            <p className="text-muted-foreground text-center mb-4">
              No shipments have been recorded yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Shipment History</CardTitle>
            <CardDescription>
              Showing {currentShipments.length} of {shipments.length} shipments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>External Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estimated Arrival</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead> {/* Changed from Modified At to Updated At */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell>{shipment.id}</TableCell>
                    <TableCell>{shipment.external_reference}</TableCell>
                    <TableCell>{shipment.status}</TableCell>
                    <TableCell>{shipment.estimated_arrival_date}</TableCell>
                    <TableCell>{shipment.created_at}</TableCell>
                    <TableCell>{shipment.updated_at}</TableCell> {/* Changed from modified_at to updated_at */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink 
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyShipments;