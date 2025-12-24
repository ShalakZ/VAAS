/**
 * Base API service for VAAS
 */

const BASE_URL = '';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! status: ${response.status}`);
  }

  return response;
}

/**
 * Classification service
 */
export const classifyService = {
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi('/classify', {
      method: 'POST',
      body: formData
    });

    const json = await response.json();

    // Return full response with data, columns, and report_uuid
    if (json.data && Array.isArray(json.data)) {
      return {
        data: json.data,
        columns: json.columns || [],  // Column order from backend
        report_uuid: json.report_uuid
      };
    }

    // Legacy format fallback
    return { data: json, columns: [], report_uuid: null };
  },

  async submitCorrections(data) {
    const response = await fetchApi('/submit_corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    return response.json();
  }
};

/**
 * Export service
 */
export const exportService = {
  async exportData(data, type, columns = null) {
    const payload = { data, type };
    if (columns && columns.length > 0) {
      payload.columns = columns;  // Preserve original column order
    }

    const response = await fetchApi('/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const contentDisposition = response.headers.get('content-disposition');
    let filename = type === 'master' ? 'classified_report.xlsx' : 'team_reports.zip';

    if (contentDisposition) {
      const match = contentDisposition.match(/filename=([^;]+)/);
      if (match) filename = match[1].replace(/["']/g, '');
    }

    const blob = await response.blob();
    return { blob, filename };
  },

  downloadBlob(blob, filename) {
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    globalThis.URL.revokeObjectURL(url);
  }
};

/**
 * Knowledge Base service
 */
export const kbService = {
  async getData() {
    const response = await fetchApi('/kb/data');
    return response.json();
  },

  async addRule(type, key, team) {
    const response = await fetchApi('/kb/add_rule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, key, team })
    });
    return response.json();
  },

  async editRule(type, oldKey, newKey, newTeam) {
    const response = await fetchApi('/kb/edit_rule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        old_key: oldKey,
        new_key: newKey,
        new_team: newTeam
      })
    });
    return response.json();
  },

  async deleteRule(type, key) {
    const response = await fetchApi('/kb/delete_rule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, key })
    });
    return response.json();
  },

  async bulkAddRules(hostnames, titles, currentData = null) {
    const payload = { hostnames, titles };

    // Include current data for re-classification if provided
    if (currentData && currentData.length > 0) {
      payload.currentData = currentData;
    }

    const response = await fetchApi('/kb/bulk_add_rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async confirmFuzzyMatch(row, currentData = null) {
    const payload = { row };

    // Include current data for re-classification
    if (currentData && currentData.length > 0) {
      payload.currentData = currentData;
    }

    const response = await fetchApi('/kb/confirm_fuzzy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return response.json();
  },

  async importKb(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetchApi('/kb/import', {
      method: 'POST',
      body: formData
    });
    return response.json();
  },

  exportKb() {
    globalThis.location.href = '/kb/export';
  }
};
