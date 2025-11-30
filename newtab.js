// New Tab Page functionality
(function() {
  'use strict';

  // Get favicon URL for a site
  function getFaviconUrl(url) {
    try {
      const urlObj = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch {
      return null;
    }
  }

  // Get first letter for fallback icon
  function getFirstLetter(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  }

  // Get site name from URL
  function getSiteName(url) {
    try {
      const urlObj = new URL(url);
      let hostname = urlObj.hostname.replace('www.', '');
      // Capitalize first letter
      return hostname.charAt(0).toUpperCase() + hostname.slice(1).split('.')[0];
    } catch {
      return url;
    }
  }

  // Load top sites
  async function loadShortcuts() {
    const container = document.getElementById('shortcuts');

    try {
      const sites = await chrome.topSites.get();
      const topSites = sites.slice(0, 10); // Max 10 shortcuts

      container.innerHTML = '';

      topSites.forEach(site => {
        const shortcut = document.createElement('a');
        shortcut.href = site.url;
        shortcut.className = 'shortcut';

        const faviconUrl = getFaviconUrl(site.url);
        const firstLetter = getFirstLetter(site.url);
        const siteName = getSiteName(site.url);

        shortcut.innerHTML = `
          <div class="shortcut-icon">
            <img src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display:none">${firstLetter}</span>
          </div>
          <div class="shortcut-name">${siteName}</div>
        `;

        container.appendChild(shortcut);
      });

    } catch (error) {
      // Fallback shortcuts if topSites fails
      const defaultSites = [
        { url: 'https://google.com', name: 'Google' },
        { url: 'https://youtube.com', name: 'YouTube' },
        { url: 'https://gmail.com', name: 'Gmail' },
        { url: 'https://github.com', name: 'GitHub' },
        { url: 'https://twitter.com', name: 'Twitter' }
      ];

      container.innerHTML = '';

      defaultSites.forEach(site => {
        const shortcut = document.createElement('a');
        shortcut.href = site.url;
        shortcut.className = 'shortcut';

        const faviconUrl = getFaviconUrl(site.url);
        const firstLetter = site.name.charAt(0);

        shortcut.innerHTML = `
          <div class="shortcut-icon">
            <img src="${faviconUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span style="display:none">${firstLetter}</span>
          </div>
          <div class="shortcut-name">${site.name}</div>
        `;

        container.appendChild(shortcut);
      });
    }
  }

  // Initialize
  function init() {
    loadShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
