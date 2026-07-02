import { useState, useEffect, useCallback } from 'react';
import SupabaseService from '../services/supabaseService';

/**
 * Hook que checa o status da chave OpenAI configurada no primeiro canal ativo.
 * Retorna: { status, errorType, isChecking, lastChecked, recheck }
 * status: 'ok' | 'quota_exceeded' | 'invalid_key' | 'unknown' | 'no_key' | 'loading'
 */
export function useOpenAIQuota(intervalMs = 60000) {
  const [status, setStatus] = useState('loading');
  const [errorType, setErrorType] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [apiKey, setApiKey] = useState(null);

  // Load the API key from the first channel's AI settings
  useEffect(() => {
    async function loadKey() {
      try {
        const channels = await SupabaseService.fetchChannels();
        if (!channels || channels.length === 0) {
          setStatus('no_key');
          return;
        }
        // Try to load AI settings for the first channel
        for (const ch of channels) {
          const cfg = await SupabaseService.fetchAiSettings(ch.id);
          if (cfg && cfg.api_key && cfg.api_key.startsWith('sk-')) {
            setApiKey(cfg.api_key);
            return;
          }
        }
        setStatus('no_key');
      } catch (e) {
        setStatus('unknown');
      }
    }
    loadKey();
  }, []);

  const checkQuota = useCallback(async (key) => {
    if (!key) return;
    setIsChecking(true);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('ok');
        setErrorType(null);
      } else {
        const errType = data?.error?.type || data?.error?.code || 'unknown';
        if (errType === 'insufficient_quota' || res.status === 429) {
          setStatus('quota_exceeded');
          setErrorType('insufficient_quota');
        } else if (res.status === 401) {
          setStatus('invalid_key');
          setErrorType('invalid_key');
        } else {
          setStatus('unknown');
          setErrorType(errType);
        }
      }
    } catch (e) {
      setStatus('unknown');
      setErrorType('network_error');
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  // Check when key loads
  useEffect(() => {
    if (apiKey) {
      checkQuota(apiKey);
    }
  }, [apiKey, checkQuota]);

  // Re-check at interval
  useEffect(() => {
    if (!apiKey) return;
    const timer = setInterval(() => checkQuota(apiKey), intervalMs);
    return () => clearInterval(timer);
  }, [apiKey, intervalMs, checkQuota]);

  return {
    status,
    errorType,
    isChecking,
    lastChecked,
    recheck: () => apiKey && checkQuota(apiKey)
  };
}
