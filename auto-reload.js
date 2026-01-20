// Auto-reload for development - Works with VS Code Live Server
(function() {
  'use strict';
  
  // Check if running on localhost/development
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname.startsWith('192.168.') ||
                      window.location.hostname.startsWith('10.0.') ||
                      window.location.protocol === 'file:';

  if (!isLocalhost) {
    return; // Don't run on production
  }

  let lastModified = Date.now();
  let reloadCheckInterval = null;
  const CHECK_INTERVAL = 500; // Check every 500ms for faster updates

  // Function to reload page
  function reloadPage() {
    console.log('🔄 File changed, reloading page...');
    window.location.reload(true); // Force reload from server
  }

  // Check for file changes using fetch
  function checkForChanges() {
    fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    .then(response => {
      const lastModifiedHeader = response.headers.get('Last-Modified');
      const etag = response.headers.get('ETag');
      
      if (lastModifiedHeader) {
        const fileModified = new Date(lastModifiedHeader).getTime();
        if (fileModified > lastModified) {
          lastModified = fileModified;
          reloadPage();
        }
      } else if (etag) {
        // Use ETag as fallback
        const currentETag = sessionStorage.getItem('page-etag');
        if (currentETag && currentETag !== etag) {
          sessionStorage.setItem('page-etag', etag);
          reloadPage();
        } else if (!currentETag) {
          sessionStorage.setItem('page-etag', etag);
        }
      }
    })
    .catch(error => {
      // If fetch fails, try alternative method
      if (window.location.protocol === 'file:') {
        // For file:// protocol, use timestamp check
        const now = Date.now();
        if (now - lastModified > 2000) {
          lastModified = now;
          reloadPage();
        }
      }
    });
  }

  // Start checking after page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      reloadCheckInterval = setInterval(checkForChanges, CHECK_INTERVAL);
      console.log('✅ Auto-reload enabled - Checking for changes every 500ms');
    });
  } else {
    reloadCheckInterval = setInterval(checkForChanges, CHECK_INTERVAL);
    console.log('✅ Auto-reload enabled - Checking for changes every 500ms');
  }

  // Listen for focus events (check when tab becomes active)
  window.addEventListener('focus', function() {
    checkForChanges();
  });

  // Listen for visibility change
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      checkForChanges();
    }
  });

  // Listen for storage events (for cross-tab updates)
  window.addEventListener('storage', function(e) {
    if (e.key === 'reload-page') {
      reloadPage();
    }
  });

  // Also listen for Live Server's WebSocket (if available)
  if (typeof WebSocket !== 'undefined') {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/livereload`);
      
      ws.onmessage = function(event) {
        if (event.data === 'reload') {
          reloadPage();
        }
      };
      
      ws.onerror = function() {
        // WebSocket not available, use polling instead
      };
    } catch (e) {
      // WebSocket not available, continue with polling
    }
  }
})();
