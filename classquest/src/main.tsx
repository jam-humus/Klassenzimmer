import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './app/AppContext';
import { FeedbackProvider } from './ui/feedback/FeedbackProvider';
import { KeyScopeProvider } from './ui/shortcut/KeyScope';
import WeeklyShowPlayer from './ui/show/WeeklyShowPlayer';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const isShowRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/show');

const appTree = (
  <React.StrictMode>
    <AppProvider>
      <FeedbackProvider>
        <KeyScopeProvider>
          <App />
        </KeyScopeProvider>
      </FeedbackProvider>
    </AppProvider>
  </React.StrictMode>
);

const showTree = (
  <React.StrictMode>
    <AppProvider>
      <FeedbackProvider>
        <WeeklyShowPlayer />
      </FeedbackProvider>
    </AppProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(rootElement).render(isShowRoute ? showTree : appTree);
