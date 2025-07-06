
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Index from './pages/Index';
import TemplateMapper from './pages/TemplateMapper';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import './App.css';

import AiMapper from './pages/AiMapper';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/manual" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/template-mapper" element={
                <ProtectedRoute>
                  <TemplateMapper />
                </ProtectedRoute>
              } />
              <Route path="/ai-mapper" element={
                <ProtectedRoute>
                  <AiMapper />
                </ProtectedRoute>
              } />
              
              {/* Temporary AI routes - preserved but not in main nav */}
              <Route path="/temp/ai-mapper" element={
                <ProtectedRoute>
                  <AiMapper />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
