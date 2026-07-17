import React, { useState, useEffect } from 'react';

function App() {
  // Initialize state directly from localStorage so it survives redirects and page reloads
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(() => {
    return localStorage.getItem('spotifyConnected') === 'true';
  });
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(() => {
    return localStorage.getItem('youtubeConnected') === 'true';
  });
  
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [error, setError] = useState(null);

  // Parse URL parameters and sync with localStorage on initialization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let updated = false;
    
    if (urlParams.get('spotify') === 'success') {
      setSpotifyAuthenticated(true);
      localStorage.setItem('spotifyConnected', 'true');
      updated = true;
    }
    if (urlParams.get('youtube') === 'success') {
      setYoutubeAuthenticated(true);
      localStorage.setItem('youtubeConnected', 'true');
      updated = true;
    }

    if (updated) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Force fetch playlists immediately if localStorage flags it as true
    if (localStorage.getItem('spotifyConnected') === 'true') {
      fetchPlaylists();
    }

    // Ping backend token endpoint to double-verify active backend state with credentials passed
    fetch('/api/token', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setSpotifyAuthenticated(true);
          localStorage.setItem('spotifyConnected', 'true');
          fetchPlaylists(); // Refresh queue again once token verified
        }
      })
      .catch(() => console.log("Session verification complete."));
  }, []);

  // Fetch playlists automatically whenever Spotify becomes active
  useEffect(() => {
    if (spotifyAuthenticated) {
      fetchPlaylists();
    }
  }, [spotifyAuthenticated]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      // FIXED: Added credentials option so the proxy forwards session cookies to port 3000
      const res = await fetch('/api/playlists', { credentials: 'include' });
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch playlists from your account profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpotifyLogin = (e) => {
    e.preventDefault();
    window.location.href = 'http://127.0.0.1:3000/auth/spotify/login';
  };

  const handleGoogleLogin = (e) => {
    e.preventDefault();
    window.location.href = 'http://127.0.0.1:3000/google/login';
  };

  // Explicitly flushes the persistent connection tokens
  const handleResetConnections = () => {
    localStorage.removeItem('spotifyConnected');
    localStorage.removeItem('youtubeConnected');
    setSpotifyAuthenticated(false);
    setYoutubeAuthenticated(false);
    setPlaylists([]);
    setMigrationStatus(null);
    setError(null);
  };

  const handleMigrate = async (playlistId) => {
    if (!youtubeAuthenticated) {
      setError("Please authenticate your YouTube Account card first before starting migration.");
      return;
    }

    setLoading(true);
    setMigrationStatus({ message: "Initializing transfer protocols..." });
    setError(null);
    
    try {
      // FIXED: Added credentials option to authorize playlist migration actions via backend sessions
      const res = await fetch(`/google/create-playlist/${playlistId}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setMigrationStatus({
          success: true,
          url: data.url,
          message: `Successfully migrated! Added: ${data.added || 0}, Skipped: ${data.skipped || 0}`
        });
      } else {
        setError(data.error || "Migration failed. Verify both platforms remain authorized.");
        setMigrationStatus(null);
      }
    } catch (err) {
      setError("Network or server connection dropped during live migration.");
      setMigrationStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', color: '#f3f4f6', backgroundColor: '#111827', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #374151', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', color: '#1DB954', margin: '0 0 5px 0' }}>🎵 Playlist Migrator</h1>
          <p style={{ color: '#9ca3af', margin: 0 }}>Convert your music across streaming platforms flawlessly</p>
        </div>
        {(spotifyAuthenticated || youtubeAuthenticated) && (
          <button 
            type="button" 
            onClick={handleResetConnections}
            style={{ backgroundColor: '#374151', color: '#9ca3af', border: '1px solid #4b5563', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Reset Connections
          </button>
        )}
      </header>

      {/* STEP 1: DYNAMIC AUTHENTICATION STATUS CARDS */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        
        {/* SPOTIFY CARD */}
        <div style={{ 
          flex: 1, 
          padding: '24px', 
          border: spotifyAuthenticated ? '2px solid #1DB954' : '1px solid #374151', 
          backgroundColor: spotifyAuthenticated ? '#06200e' : '#1f2937',
          borderRadius: '12px', 
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#f3f4f6' }}>1. Spotify Connection</h3>
          <div style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            backgroundColor: spotifyAuthenticated ? '#1DB954' : '#4b5563',
            color: 'white'
          }}>
            {spotifyAuthenticated ? "● ACTIVE SESSION" : "○ NOT CONNECTED"}
          </div>
          <br />
          <button 
            type="button"
            onClick={handleSpotifyLogin}
            disabled={spotifyAuthenticated}
            style={{ 
              backgroundColor: spotifyAuthenticated ? '#374151' : '#1DB954', 
              color: 'white', 
              border: 'none', 
              padding: '10px 24px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              cursor: spotifyAuthenticated ? 'not-allowed' : 'pointer',
              opacity: spotifyAuthenticated ? 0.6 : 1
            }}
          >
            {spotifyAuthenticated ? "Connected" : "Link Spotify"}
          </button>
        </div>

        {/* YOUTUBE CARD */}
        <div style={{ 
          flex: 1, 
          padding: '24px', 
          border: youtubeAuthenticated ? '2px solid #10b981' : '1px solid #374151', 
          backgroundColor: youtubeAuthenticated ? '#06200e' : '#1f2937',
          borderRadius: '12px', 
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#f3f4f6' }}>2. YouTube Connection</h3>
          <div style={{
            display: 'inline-block',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            marginBottom: '16px',
            backgroundColor: youtubeAuthenticated ? '#10b981' : '#4b5563',
            color: 'white'
          }}>
            {youtubeAuthenticated ? "● ACCESS GRANTED" : "○ NOT CONNECTED"}
          </div>
          <br />
          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={youtubeAuthenticated}
            style={{ 
              backgroundColor: youtubeAuthenticated ? '#374151' : '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '10px 24px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              cursor: youtubeAuthenticated ? 'not-allowed' : 'pointer',
              opacity: youtubeAuthenticated ? 0.6 : 1
            }}
          >
            {youtubeAuthenticated ? "Connected" : "Link YouTube"}
          </button>
        </div>
      </div>

      {/* ALERT AND NOTIFICATION DISPLAY BLOCKS */}
      {error && (
        <div style={{ padding: '16px', backgroundColor: '#7f1d1d', color: '#fca5a5', borderLeft: '4px solid #ef4444', borderRadius: '6px', marginBottom: '25px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {migrationStatus && (
        <div style={{ padding: '20px', backgroundColor: '#064e3b', color: '#a7f3d0', borderLeft: '4px solid #10b981', borderRadius: '6px', marginBottom: '25px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: '500' }}>{migrationStatus.message}</p>
          {migrationStatus.url && (
            <a 
              href={migrationStatus.url} 
              target="_blank" 
              rel="noreferrer" 
              style={{ display: 'inline-block', backgroundColor: '#10b981', color: '#111827', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none' }}
            >
              Open Converted Playlist ↗
            </a>
          )}
        </div>
      )}

      {/* STEP 2: ACTIVE CONTENT DISPLAY */}
      <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '12px', border: '1px solid #374151' }}>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid #374151', paddingBottom: '12px' }}>Your Conversion Queue</h2>
        {loading && <p style={{ color: '#9ca3af' }}>Processing stream arrays... Please maintain this window tab.</p>}
        
        {!loading && playlists.length === 0 && (
          <p style={{ color: '#9ca3af', margin: 0 }}>No active track collections queued. Connect your Spotify profile to parse metadata collections.</p>
        )}

        <div style={{ display: 'grid', gap: '12px' }}>
          {playlists.map((playlist) => (
            <div key={playlist.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', color: '#f3f4f6' }}>{playlist.name}</strong>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px' }}>Metadata Assets: {playlist.tracks?.total} tracks</div>
              </div>
              <button
                type="button"
                onClick={() => handleMigrate(playlist.id)}
                disabled={loading}
                style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 18px', 
                  borderRadius: '6px', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  fontWeight: 'bold',
                  transition: 'background 0.2s'
                }}
              >
                Migrate Playlist
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;