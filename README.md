# BITS Frontend

This is the frontend for the BITS Capstone Project, built with React, TypeScript, and Vite.

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher) or yarn
- Git

### Configuration

Create a `postcss.config.js` file in the root of the project with the following setup:

```js
export default {
    plugins: {
        "@tailwindcss/postcss": {},
    }
}
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

###Connecting to backend
Environment Variables

Create a .env file in the root of your project to configure the API URL and other environment-specific settings. Example:

# URL of the backend API
VITE_API_URL=http://localhost:5000
```

---

## Heartbeat Monitoring Dashboard

The frontend includes a real-time monitoring dashboard for lab technicians and lab heads to track computer availability across all labs.

### Features

- **Real-Time Status Updates**: WebSocket-powered live updates (no page refresh needed)
- **Room-Based Organization**: View computers grouped by lab/room
- **Visual Status Indicators**: Color-coded computer cards (green = online, red = offline, yellow = warning)
- **Offline Alerts**: Toast notifications when computers go offline
- **Detailed History**: Click on any computer to view heartbeat history
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Support**: Automatic theme switching

### User Roles & Access

| Role | Can Register Computers | Can View Monitoring Dashboard | Receives Alerts |
|------|------------------------|-------------------------------|-----------------|
| STUDENT | ✓ | ✗ | ✗ |
| FACULTY | ✓ | ✗ | ✗ |
| LAB_TECH | ✓ | ✓ | ✓ |
| LAB_HEAD | ✓ | ✓ | ✓ |
| ADMIN | ✓ | ✓ | ✓ |

### Components

**MonitoringDashboard** (`src/pages/MonitoringDashboard.tsx`):
- Main dashboard showing all rooms and computers
- Real-time status updates via WebSocket
- Room filtering and search
- Computer grid with status indicators

**ComputerCard** (`src/components/ComputerCard.tsx`):
- Individual computer status display
- Color-coded status (online/offline/warning/idle)
- Click to view detailed history
- Shows current user if online

**HeartbeatProvider** (`src/contexts/HeartbeatContext.tsx`):
- Manages heartbeat state and automatic transmission
- Handles computer registration
- Adaptive interval logic (10s/30s/120s)
- Session lifecycle management

### Services

**Heartbeat Service** (`src/services/heartbeat.ts`):
```typescript
// Register computer (auto-detect or manual)
await registerComputer(clientIp);

// Send heartbeat
await sendHeartbeat({
  computer_id: 123,
  session_id: 'uuid',
  status: 'ONLINE',
  is_page_hidden: false
});

// End session
await endSession(sessionId);
```

**Monitoring Service** (`src/services/monitoring.ts`):
```typescript
// Get all rooms status
await getMonitoringStatus();

// Get single room status
await getRoomStatus(roomId);

// Get computer details
await getComputerDetails(computerId);
```

### WebSocket Integration

**Setup**:
```typescript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:5000/ws/notifications', {
  query: { token: getAuthToken() }
});
```

**Event Listeners**:
```typescript
// Real-time status updates
socket.on('COMPUTER_STATUS_UPDATE', (data) => {
  updateComputerCard(data.computer_id, data);
});

// Offline alerts
socket.on('COMPUTER_OFFLINE', (notification) => {
  showToast({
    type: 'warning',
    title: 'Computer Offline',
    message: notification.message
  });
});
```

### Automatic Heartbeat

The browser agent automatically sends heartbeats when a user is logged in and has registered a computer:

**Adaptive Intervals**:
- **10 seconds**: Computer has issues (high frequency monitoring)
- **30 seconds**: Normal operation, active user
- **120 seconds**: Tab hidden or after hours (low frequency)

**Page Visibility Handling**:
```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Switch to low-frequency interval (120s)
    setStatus('IDLE');
  } else {
    // Return to normal interval (30s)
    setStatus('ONLINE');
    sendImmediateHeartbeat();
  }
});
```

**Session Cleanup**:
```typescript
window.addEventListener('beforeunload', () => {
  // Use sendBeacon to ensure request completes
  navigator.sendBeacon(
    `/api/heartbeat/session/${sessionId}`,
    JSON.stringify({ status: 'OFFLINE' })
  );
});
```

### Monitoring Dashboard Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/monitoring` | MonitoringDashboard | LAB_TECH+ |
| `/monitoring/room/:id` | RoomDetailView | LAB_TECH+ |
| `/monitoring/computer/:id` | ComputerDetailView | LAB_TECH+ |

### Status Indicators

**Computer Status Types**:
```typescript
type ComputerStatus = 'ONLINE' | 'IDLE' | 'WARNING' | 'OFFLINE';
```

**Color Coding**:
- 🟢 **ONLINE**: Computer active, user present (green)
- 🟡 **IDLE**: Computer online but user inactive (yellow)
- 🟠 **WARNING**: Computer online but has recent offline events (orange)
- 🔴 **OFFLINE**: Computer not responding (red)

### Accessibility

- **ARIA Labels**: Status indicators have descriptive labels
  ```html
  <div aria-label="Computer LAB-A-PC-01, Status: Online">
  ```
- **Live Regions**: Offline alerts announced to screen readers
  ```html
  <div role="alert" aria-live="assertive">
    Computer LAB-A-PC-01 has gone offline
  </div>
  ```
- **Keyboard Navigation**: All interactive elements accessible via Tab
- **Focus Management**: Modal closes with Esc key

### Performance Optimizations

**React Optimization**:
- `React.memo()` on ComputerCard to prevent unnecessary re-renders
- `useMemo()` for filtered/sorted computer lists
- Virtualization for large computer lists (100+ computers)

**WebSocket Optimization**:
- Debounced status updates (max 1 update/second per computer)
- Event batching for multiple simultaneous updates
- Automatic reconnection with exponential backoff

**Loading States**:
- Skeleton loading for initial fetch
- Optimistic updates for user actions
- Error boundaries for graceful failure handling

### Mobile Responsiveness

**Breakpoints**:
```css
/* Mobile: 1 column */
@media (max-width: 640px) {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

/* Tablet: 3 columns */
@media (min-width: 641px) and (max-width: 1024px) {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* Desktop: 6 columns */
@media (min-width: 1025px) {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
```

### Testing

**Unit Tests**:
```bash
npm test -- heartbeat
npm test -- monitoring
```

**E2E Tests** (Playwright):
```bash
npm run test:e2e -- monitoring
```

**Manual Testing**:
1. Open `/monitoring` as LAB_TECH
2. Open separate browser, log in as STUDENT
3. Verify real-time updates appear on monitoring dashboard
4. Close student browser, wait 2 minutes
5. Verify offline alert appears

### Documentation

For detailed documentation, see:
- [API-HEARTBEAT.md](../docs/API-HEARTBEAT.md) - Backend API reference
- [WEBSOCKET-EVENTS.md](../docs/WEBSOCKET-EVENTS.md) - Event types and payloads
- [INTEGRATION-TESTING.md](../docs/INTEGRATION-TESTING.md) - Testing checklist

### Troubleshooting

**WebSocket Connection Fails**:
```
Error: WebSocket connection to 'ws://localhost:5000' failed
```
**Solution**: Check CORS settings, verify JWT token, ensure backend is running

**Heartbeat Not Sending**:
```
Error: POST /api/heartbeat 401 Unauthorized
```
**Solution**: JWT token expired, user needs to log in again

**Status Not Updating**:
- Check browser console for WebSocket errors
- Verify user role is LAB_TECH or LAB_HEAD
- Check Network tab for blocked requests

---

## Development Workflow

### Local Development
