import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './app/AppContext';
import { FeedbackProvider } from './ui/feedback/FeedbackProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AppProvider>
  </React.StrictMode>,
);
