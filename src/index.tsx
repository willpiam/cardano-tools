import './index.css';
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import App from './App';
import { BrowserRouter, Route, Routes } from 'react-router';
import NotFound from './pages/NotFound';
import Tools from './pages/Tools';
import Commit from './pages/Commit';
import Playground from './pages/Playground';
import DRepVotingHistory from './pages/DRepVotingHistory';
import GovernanceActions from './pages/GovernanceActions';
import Home from './pages/Home';


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Home />} />
              <Route path="tools" element={<Tools />} />
              <Route path="commit" element={<Commit />} />
              <Route path="playground" element={<Playground />} />
              <Route path="drephistory/:drepId" element={<DRepVotingHistory />} />
              <Route path="drep/:drepId" element={<DRepVotingHistory />} />
              <Route path="drep-history/:drepId" element={<DRepVotingHistory />} />
              <Route path="vote-history/:drepId" element={<DRepVotingHistory />} />
              <Route path="votehistory/:drepId" element={<DRepVotingHistory />} />
              <Route path="voter-history/:drepId" element={<DRepVotingHistory />} />
              <Route path="voterhistory/:drepId" element={<DRepVotingHistory />} />
              <Route path="drephistory" element={<DRepVotingHistory />} />
              <Route path="drep" element={<DRepVotingHistory />} />
              <Route path="drep-history" element={<DRepVotingHistory />} />
              <Route path="vote-history" element={<DRepVotingHistory />} />
              <Route path="votehistory" element={<DRepVotingHistory />} />
              <Route path="voter-history" element={<DRepVotingHistory />} />
              <Route path="voterhistory" element={<DRepVotingHistory />} />
              <Route path="governance-actions" element={<GovernanceActions />} />
              <Route path="governanceactions" element={<GovernanceActions />} />
              <Route path="gov-actions" element={<GovernanceActions />} />
              <Route path="live-actions" element={<GovernanceActions />} />
              {/* <Route path="/old-app" element={<OldApp />} /> */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
