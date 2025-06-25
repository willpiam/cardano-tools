import './index.css';
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import OldApp from './OldApp';
import { BrowserRouter, Route, Routes } from 'react-router';
import Index from './pages/Index';
import Mix from './pages/Mix';
import Pools from './pages/Pools';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';
import Tools from './pages/Tools';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Index />} />
              <Route path="/old-app" element={<OldApp />} />
              <Route path="/mix" element={<Mix />} />
              {/* <Route path="/pools" element={<Pools />} /> */}
              <Route path="/docs" element={<Docs />} />
              <Route path="/tools" element={<Tools />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
