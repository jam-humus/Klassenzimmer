import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SoundSettingsProvider } from './audio/useSoundSettings';
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
    <SoundSettingsProvider>
      <AppProvider>
        <FeedbackProvider>
          <KeyScopeProvider>
            <App />
          </KeyScopeProvider>
        </FeedbackProvider>
      </AppProvider>
    </SoundSettingsProvider>
  </React.StrictMode>
);

const showTree = (
  <React.StrictMode>
    <SoundSettingsProvider>
      <AppProvider>
        <FeedbackProvider>
          <WeeklyShowPlayer />
        </FeedbackProvider>
      </AppProvider>
    </SoundSettingsProvider>
  </React.StrictMode>
);

ReactDOM.createRoot(rootElement).render(isShowRoute ? showTree : appTree);
