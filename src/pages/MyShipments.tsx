import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { FirebirdService } from '@/services/FirebirdService';

interface Shipment {
  SHIPMENT_ID: number;
  SHIPMENT_CODE: string;
  STATUS: string;
  DATE_TYPE: string;
  DELIVERY_DATE: string;
  CREATED_AT: string;
  MODIFIED_AT: string;
  REFERENCE_CODE: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-center py-4 text-red-500">Something went wrong. Please try refreshing the page.</div>;
    }

    return this.props.children;
  }
}

const MyShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const firebirdService = new FirebirdService();

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        console.log('Fetching shipments...');
        const result = await firebirdService.from('SHIPMENT').select('SHIPMENT_ID, SHIPMENT_CODE, STATUS, DATE_TYPE, DELIVERY_DATE, CREATED_AT, MODIFIED_AT, REFERENCE_CODE');
        console.log('Received result:', result);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        if (!result.data) {
          throw new Error('No data received from the server');
        }
        
        console.log('Setting shipments:', result.data);
        setShipments(result.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching shipments:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch shipments');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentShipments = shipments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(shipments.length / itemsPerPage);

  if (loading) {
    return <div className="text-center py-4">Loading shipments...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  return (
    <ErrorBoundary>
      <Card>
        <CardHeader>
          <CardTitle>My Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Type</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Modified At</TableHead>
                <TableHead>Reference Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentShipments.map((shipment) => (
                <TableRow key={shipment.SHIPMENT_ID}>
                  <TableCell>{shipment.SHIPMENT_ID}</TableCell>
                  <TableCell>{shipment.SHIPMENT_CODE}</TableCell>
                  <TableCell>{shipment.STATUS}</TableCell>
                  <TableCell>{shipment.DATE_TYPE}</TableCell>
                  <TableCell>{shipment.DELIVERY_DATE}</TableCell>
                  <TableCell>{shipment.CREATED_AT}</TableCell>
                  <TableCell>{shipment.MODIFIED_AT}</TableCell>
                  <TableCell>{shipment.REFERENCE_CODE}</TableCell>
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
    </ErrorBoundary>
  );
};

export default MyShipments;