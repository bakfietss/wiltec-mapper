
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Index from './pages/Index';
import TemplateMapper from './pages/TemplateMapper';
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
              <Route path="/manual" element={<Index />} />
              <Route path="/template-mapper" element={<TemplateMapper />} />
              <Route path="/build-by-template" element={<TemplateMapper />} />
              <Route path="/ai-mapper" element={<AiMapper />} />
              
              {/* Temporary AI routes - preserved but not in main nav */}
              <Route path="/temp/ai-mapper" element={<AiMapper />} />
              
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
