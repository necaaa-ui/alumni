import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import WebinarEvents from './WebinarEvents';
import Adminpage from './Adminpage';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState(() => new URLSearchParams(location.search).get('view') === 'reports' ? 'reports' : 'events');
  const hasGuestSession = Boolean(localStorage.getItem('guestToken')) && localStorage.getItem('userRole') === 'guest';

  useEffect(() => {
    setView(new URLSearchParams(location.search).get('view') === 'reports' ? 'reports' : 'events');
  }, [location.search]);

  if (!hasGuestSession) {
    navigate('/webinar-guest-login', { replace: true });
    return null;
  }

  if (view === 'reports') {
    return (
      <Adminpage
        readOnly
        onViewWebinars={() => {
          setView('events');
          navigate('/webinar-guest-dashboard', { replace: true });
        }}
      />
    );
  }

  return <WebinarEvents email={localStorage.getItem('guestEmail') || ''} guestMode />;
}
