/**
 * Discord SDK Wrapper
 * Provides fallback for browser testing outside Discord
 */

const DiscordSDKWrapper = (function() {
  let sdk = null;
  let isReady = false;
  let isInDiscord = false;

  /**
   * Check if running inside Discord Activity iframe
   */
  function detectDiscordEnvironment() {
    // Discord Activities run in an iframe and have special query params
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('frame_id') || urlParams.has('instance_id') || 
           window.location.hostname.includes('discordsays.com');
  }

  /**
   * Initialize the Discord SDK
   * @param {string} clientId - Your Discord Application Client ID
   */
  async function init(clientId) {
    isInDiscord = detectDiscordEnvironment();
    
    if (!isInDiscord) {
      console.log('[DiscordSDK] Running in browser mode (not in Discord)');
      isReady = true;
      return { inDiscord: false, user: null };
    }

    try {
      // Dynamic import of Discord SDK (loaded from CDN in HTML)
      if (typeof DiscordSDK === 'undefined') {
        console.warn('[DiscordSDK] SDK not loaded, falling back to browser mode');
        isReady = true;
        return { inDiscord: false, user: null };
      }

      sdk = new DiscordSDK(clientId);
      await sdk.ready();
      
      console.log('[DiscordSDK] SDK ready');
      isReady = true;
      
      return { 
        inDiscord: true, 
        channelId: sdk.channelId,
        guildId: sdk.guildId,
        instanceId: sdk.instanceId
      };
    } catch (error) {
      console.error('[DiscordSDK] Failed to initialize:', error);
      isReady = true;
      return { inDiscord: false, user: null, error };
    }
  }

  /**
   * Get the raw SDK instance
   */
  function getSDK() {
    return sdk;
  }

  /**
   * Check if SDK is ready
   */
  function ready() {
    return isReady;
  }

  /**
   * Check if running in Discord
   */
  function inDiscord() {
    return isInDiscord;
  }

  /**
   * Get current user info (if authenticated)
   */
  async function getUser() {
    if (!isInDiscord || !sdk) {
      return null;
    }
    // Note: Full auth flow requires backend, this is simplified
    return null;
  }

  /**
   * Subscribe to Discord events
   */
  function subscribe(event, callback, args = {}) {
    if (!sdk) {
      console.warn('[DiscordSDK] Cannot subscribe - not in Discord');
      return;
    }
    return sdk.subscribe(event, callback, args);
  }

  /**
   * Log activity for debugging
   */
  function log(message) {
    const prefix = isInDiscord ? '[Discord]' : '[Browser]';
    console.log(`${prefix} ${message}`);
  }

  return {
    init,
    getSDK,
    ready,
    inDiscord,
    getUser,
    subscribe,
    log
  };
})();
