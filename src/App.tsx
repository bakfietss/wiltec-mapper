
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/AppSidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Index from './pages/Index';
import TemplateMapper from './pages/TemplateMapper';
import ControlPanel from './pages/ControlPanel';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import './App.css';

import MyMappings from './pages/MyMappings';
import MyTransformations from './pages/MyTransformations';
import AiMapper from './pages/AiMapper';
import MyShipments from './pages/MyShipments';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { useDatabase } from './contexts/DatabaseContext';
import NavigationBar from './components/NavigationBar';


function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Add database type to query key for proper cache isolation
        queryKeyHashFn: (queryKey: unknown[]) => {
          const { activeDatabase } = useDatabase();
          return JSON.stringify([activeDatabase, ...queryKey]);
        }
      }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public routes without sidebar */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />

              {/* Protected routes with sidebar */}
              <Route path="/" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">Control Panel</h1>
                      </header>
                      <main className="flex-1">
                        <ControlPanel />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />

              {/* Protected routes with sidebar */}
              <Route path="/my-mappings" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">My Mappings</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <MyMappings />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />

              {/* Protected routes with sidebar */}
              <Route path="/manual" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">Manual Mapper</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <Index />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />
              <Route path="/template-mapper" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">Template Mapper</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <TemplateMapper />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />

              <Route path="/my-transformations" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">My Transformations</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <MyTransformations />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />
              <Route path="/ai-mapper" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">AI Mapper</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <AiMapper />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />
              <Route path="/my-shipments" element={<ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <SidebarTrigger className="ml-4" />
                        <h1 className="ml-4 font-semibold">My Shipments</h1>
                      </header>
                      <NavigationBar />
                      <main className="flex-1">
                        <MyShipments />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>} />
            </Routes>
          </Router>
          <Toaster position="top-right" />
        </AuthProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

export default App;
