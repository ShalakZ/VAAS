import { useState, useCallback } from 'react';
import { useToast } from '../../../context';

/**
 * Custom hook for making API requests with consistent error handling and toast notifications.
 * Extracted from SettingsView.jsx to reduce code duplication and improve maintainability.
 *
 * @returns {Object} Object containing request function and loading state
 */
export function useApiRequest() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  /**
   * Make an API request with automatic error handling and toast notifications.
   *
   * @param {string} url - The API endpoint URL
   * @param {Object} options - Fetch options (method, headers, body, etc.)
   * @param {Object} config - Configuration for success/error messages
   * @param {string} config.successMsg - Message to show on success (optional)
   * @param {string} config.errorMsg - Message to show on error
   * @param {boolean} config.showSuccessToast - Whether to show success toast (default: true)
   * @returns {Promise<{success: boolean, data: any, error?: Error}>}
   */
  const request = useCallback(async (url, options = {}, config = {}) => {
    const { successMsg, errorMsg = 'Request failed', showSuccessToast = true } = config;

    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });

      const data = await res.json();

      if (data.success) {
        if (showSuccessToast && successMsg) {
          toast.success(successMsg || data.message);
        }
        return { success: true, data };
      }

      toast.error(data.message || errorMsg);
      return { success: false, data };
    } catch (err) {
      console.error(`API request failed: ${url}`, err);
      toast.error(errorMsg);
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Make a GET request.
   */
  const get = useCallback((url, config) => {
    return request(url, { method: 'GET' }, config);
  }, [request]);

  /**
   * Make a POST request with JSON body.
   */
  const post = useCallback((url, body, config) => {
    return request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    }, config);
  }, [request]);

  /**
   * Make a PUT request with JSON body.
   */
  const put = useCallback((url, body, config) => {
    return request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, config);
  }, [request]);

  /**
   * Make a DELETE request.
   */
  const del = useCallback((url, config) => {
    return request(url, { method: 'DELETE' }, config);
  }, [request]);

  return {
    request,
    get,
    post,
    put,
    del,
    loading,
  };
}

export default useApiRequest;
