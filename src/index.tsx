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
              <Route index element={<Tools />} />
              <Route path="/old-app" element={<OldApp />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
