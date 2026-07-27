import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

function App() {
  // Initialize state directly from localStorage so it survives redirects and page reloads
  const [spotifyAuthenticated, setSpotifyAuthenticated] = useState(() => {
    return localStorage.getItem('spotifyConnected') === 'true';
  });
  const [youtubeAuthenticated, setYoutubeAuthenticated] = useState(() => {
    return localStorage.getItem('youtubeConnected') === 'true';
  });
  
  const [user, setUser] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [error, setError] = useState(null);
  const [migrationSetup, setMigrationSetup] = useState(null); // { playlistId, customName, tracks, selectedIndices, loading }

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
      fetchUser();
      fetchPlaylists();
    }

    // Ping backend token endpoint to double-verify active backend state with credentials passed
    fetch(`${API_BASE}/api/token`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setSpotifyAuthenticated(true);
          localStorage.setItem('spotifyConnected', 'true');
          fetchUser();
          fetchPlaylists(); // Refresh queue again once token verified
        }
      })
      .catch(() => console.log("Session verification complete."));
  }, []);

  // Fetch playlists automatically whenever Spotify becomes active
  useEffect(() => {
    if (spotifyAuthenticated) {
      fetchUser();
      fetchPlaylists();
    }
  }, [spotifyAuthenticated]);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    }
  };

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/playlists`, { credentials: 'include' });
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
    window.location.href = `${API_BASE}/auth/spotify/login`;
  };

  const handleGoogleLogin = (e) => {
    e.preventDefault();
    window.location.href = `${API_BASE}/google/login`;
  };

  const handleResetConnections = () => {
    localStorage.removeItem('spotifyConnected');
    localStorage.removeItem('youtubeConnected');
    setSpotifyAuthenticated(false);
    setYoutubeAuthenticated(false);
    setUser(null);
    setPlaylists([]);
    setMigrationStatus(null);
    setMigrationProgress(null);
    setError(null);
  };

  const handleMigrate = async (playlist) => {
    if (!youtubeAuthenticated) {
      setError("Please authenticate your YouTube Account first before starting migration.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setMigrationSetup({
      playlistId: playlist.id,
      originalName: playlist.name,
      customName: playlist.name,
      tracks: [],
      selectedIndices: [],
      loading: true,
      error: null
    });

    try {
      const res = await fetch(`${API_BASE}/api/playlists/${playlist.id}/tracks`, { credentials: 'include' });
      const tracks = await res.json();
      if (!res.ok) throw new Error(tracks.error || "Failed to fetch tracks");
      
      setMigrationSetup(prev => ({
        ...prev,
        tracks: tracks,
        selectedIndices: tracks.map((_, i) => i),
        loading: false
      }));
    } catch (err) {
      setMigrationSetup(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const handleStartMigration = async () => {
    const { playlistId, customName, selectedIndices } = migrationSetup;
    
    setLoading(true);
    setMigrationSetup(null); // close modal
    setMigrationStatus({ message: "Preparing migration configuration..." });
    setMigrationProgress(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // Step 1: Send configuration to backend
      const prepareRes = await fetch(`${API_BASE}/google/prepare-migration/${playlistId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ customName, selectedTrackIndices: selectedIndices })
      });

      if (!prepareRes.ok) throw new Error("Failed to configure migration");

      // Step 2: Start SSE event stream
      setMigrationStatus({ message: "Initializing transfer protocols..." });
      const eventSource = new EventSource(`${API_BASE}/google/create-playlist/${playlistId}`, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "init") {
            setMigrationStatus({ message: data.message });
          } else if (data.status === "progress") {
            setMigrationProgress(data);
            setMigrationStatus({ message: "Migrating tracks..." });
          } else if (data.status === "complete") {
            setMigrationStatus({
              success: true,
              url: data.url,
              added: data.added || 0,
              skipped: data.skipped || 0,
              failed: data.failed || 0,
              message: "Migration Complete 🎉"
            });
            setMigrationProgress(null);
            setLoading(false);
            eventSource.close();
          } else if (data.status === "error") {
            setError(data.message || "Migration failed.");
            setMigrationStatus(null);
            setMigrationProgress(null);
            setLoading(false);
            eventSource.close();
          }
        } catch (err) {
          console.error("Failed to parse SSE data", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        setError("Network or server connection dropped during live migration.");
        setMigrationStatus(null);
        setMigrationProgress(null);
        setLoading(false);
        eventSource.close();
      };
    } catch (err) {
      setError(err.message);
      setMigrationStatus(null);
      setLoading(false);
    }
  };

  const toggleTrackSelection = (index) => {
    setMigrationSetup(prev => {
      const newSelected = prev.selectedIndices.includes(index)
        ? prev.selectedIndices.filter(i => i !== index)
        : [...prev.selectedIndices, index];
      return { ...prev, selectedIndices: newSelected };
    });
  };

  const toggleAllTracks = () => {
    setMigrationSetup(prev => {
      const allSelected = prev.selectedIndices.length === prev.tracks.length;
      return {
        ...prev,
        selectedIndices: allSelected ? [] : prev.tracks.map((_, i) => i)
      };
    });
  };

  return (
    <>
      <nav className="navbar">
        <a href="/" className="nav-brand"><span>▶</span> Playlist Migrator</a>
        <div>
          {(spotifyAuthenticated || youtubeAuthenticated) && (
            <button className="nav-btn" onClick={handleResetConnections}>Reset Connections</button>
          )}
        </div>
      </nav>

      <div className="hero">
        <h1>Move your music.<br/>Without missing a beat.</h1>
        <p>
          Seamlessly convert your favorite playlists between Spotify and YouTube Music. 
          {user ? ` Welcome back, ${user.display_name || user.id}!` : ' Experience a premium transfer process with flawless metadata matching.'}
        </p>
      </div>

      <div className="main-container">
        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {migrationStatus && (
          <div className="alert alert-success glass-panel" style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 16px 0', fontWeight: '500', fontSize: '1.2rem' }}>{migrationStatus.message}</p>
            
            {migrationProgress && (
              <div style={{ marginTop: '20px', marginBottom: '20px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                    Processing: <strong style={{ color: 'var(--text-primary)' }}>{migrationProgress.currentTrack}</strong> {migrationProgress.currentArtist ? `- ${migrationProgress.currentArtist}` : ''}
                  </span>
                  <span style={{ whiteSpace: 'nowrap', fontWeight: '600', color: 'var(--text-primary)' }}>{migrationProgress.added} / {migrationProgress.total}</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${(migrationProgress.added / (migrationProgress.total || 1)) * 100}%` }}></div>
                </div>
              </div>
            )}

            {migrationStatus.success && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '16px', textAlign: 'left' }}>
                <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Tracks Found: <strong style={{ color: 'var(--text-primary)' }}>{migrationStatus.added + migrationStatus.skipped + migrationStatus.failed}</strong></p>
                <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Tracks Skipped: <strong style={{ color: 'var(--text-primary)' }}>{migrationStatus.skipped}</strong></p>
                <p style={{ margin: '0', color: 'var(--text-secondary)' }}>Success Rate: <strong style={{ color: 'var(--spotify-green)' }}>
                  {((migrationStatus.added / ((migrationStatus.added + migrationStatus.skipped + migrationStatus.failed) || 1)) * 100).toFixed(1)}%
                </strong></p>
              </div>
            )}

            {migrationStatus.url && (
              <a 
                href={migrationStatus.url} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-spotify"
                style={{ marginTop: '10px', textDecoration: 'none' }}
              >
                Open Converted Playlist ↗
              </a>
            )}
          </div>
        )}

        {/* Auth Cards Grid */}
        <div className="auth-grid">
          {/* Spotify Card */}
          <div className="glass-panel auth-card">
            <h3>Spotify</h3>
            <div className={`status-badge ${spotifyAuthenticated ? 'status-active spotify' : 'status-inactive'}`}>
              {spotifyAuthenticated ? 'Connected' : 'Not Connected'}
            </div>
            <button 
              className="btn btn-spotify" 
              onClick={handleSpotifyLogin} 
              disabled={spotifyAuthenticated}
            >
              {spotifyAuthenticated ? 'Active' : 'Link Spotify'}
            </button>
          </div>

          {/* YouTube Card */}
          <div className="glass-panel auth-card">
            <h3>YouTube</h3>
            <div className={`status-badge ${youtubeAuthenticated ? 'status-active youtube' : 'status-inactive'}`}>
              {youtubeAuthenticated ? 'Connected' : 'Not Connected'}
            </div>
            <button 
              className="btn btn-youtube" 
              onClick={handleGoogleLogin} 
              disabled={youtubeAuthenticated}
            >
              {youtubeAuthenticated ? 'Active' : 'Link YouTube'}
            </button>
          </div>
        </div>

        {/* Playlist Queue Section */}
        <div className="glass-panel">
          <h2 className="queue-header">Your Playlists</h2>
          {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading collections...</p>}
          
          {!loading && playlists.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No active track collections found. Connect Spotify to view playlists.</p>
          )}

          <div>
            {playlists.map((playlist) => (
              <div key={playlist.id} className="playlist-item">
                <div className="playlist-info">
                  <h4>{playlist.name}</h4>
                  <p>{playlist.tracks?.total} tracks &bull; By {playlist.owner?.display_name || 'Unknown User'}</p>
                </div>
                <button 
                  className="btn btn-migrate" 
                  onClick={() => handleMigrate(playlist)} 
                  disabled={loading}
                >
                  Migrate
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Playlist Migrator. Designed for premium music transfer.</p>
      </footer>

      {/* Migration Setup Modal */}
      {migrationSetup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configure Transfer</h2>
            </div>
            
            <div className="modal-body">
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                New YouTube Playlist Name
              </label>
              <input 
                type="text" 
                className="input-field"
                value={migrationSetup.customName} 
                onChange={(e) => setMigrationSetup({...migrationSetup, customName: e.target.value})}
              />
              
              <div className="track-list">
                <div className="track-item" style={{ background: 'rgba(0,0,0,0.5)', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid var(--border-light)' }}>
                  <input 
                    type="checkbox" 
                    checked={migrationSetup.tracks.length > 0 && migrationSetup.selectedIndices.length === migrationSetup.tracks.length}
                    onChange={toggleAllTracks}
                    style={{ marginRight: '16px', cursor: 'pointer', width: '18px', height: '18px' }}
                  />
                  <strong>Select All ({migrationSetup.selectedIndices.length} / {migrationSetup.tracks.length})</strong>
                </div>
                
                {migrationSetup.loading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Fetching tracks from Spotify...</div>
                ) : migrationSetup.error ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#ffb3b3' }}>{migrationSetup.error}</div>
                ) : migrationSetup.tracks.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tracks found in this playlist.</div>
                ) : (
                  <div>
                    {migrationSetup.tracks.map((track, i) => (
                      <label key={i} className={`track-item ${migrationSetup.selectedIndices.includes(i) ? 'selected' : ''}`}>
                        <input 
                          type="checkbox" 
                          checked={migrationSetup.selectedIndices.includes(i)}
                          onChange={() => toggleTrackSelection(i)}
                          style={{ marginRight: '16px', cursor: 'pointer' }}
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500', color: migrationSetup.selectedIndices.includes(i) ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {track.title}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {track.artist}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="nav-btn" 
                onClick={() => setMigrationSetup(null)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-migrate" 
                onClick={handleStartMigration}
                disabled={migrationSetup.loading || migrationSetup.selectedIndices.length === 0}
              >
                Start Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;