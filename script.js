// Image Source Validation - Prevent Google Drive URLs from being used as preview images
// Expose globally so HTML files can use it without duplication
window.validateImageSource = function validateImageSource(imageSrc) {
  if (!imageSrc || typeof imageSrc !== 'string') {
    return null; // Invalid source
  }
  
  // Block any Google Drive URLs from being used as preview images
  if (imageSrc.includes('drive.google.com') || 
      imageSrc.includes('googleusercontent.com') ||
      imageSrc.includes('thumbnail?id=') ||
      imageSrc.includes('uc?export=view')) {
    // Google Drive URL blocked from preview images
    return null; // Return null to prevent Drive URLs from being used
  }
  
  // Only allow local paths (relative paths starting with ../ or ./) or absolute paths to same domain
  // This ensures preview images come from local server/CDN only
  if (imageSrc.startsWith('../') || 
      imageSrc.startsWith('./') || 
      imageSrc.startsWith('/') ||
      (!imageSrc.startsWith('http://') && !imageSrc.startsWith('https://'))) {
    return imageSrc; // Valid local path
  }
  
  // Allow same-origin absolute URLs (e.g., https://yourdomain.com/images/...)
  // Block external URLs except for known CDN/trusted sources if needed
  // For now, we'll allow same-origin absolute URLs
  try {
    const url = new URL(imageSrc, window.location.origin);
    if (url.origin === window.location.origin) {
      return imageSrc; // Same origin, allowed
    }
  } catch (e) {
    // Invalid URL format, treat as local path
    return imageSrc;
  }
  
  // Block external URLs for preview images (except YouTube thumbnails which are handled separately)
  if (imageSrc.includes('youtube.com') || imageSrc.includes('ytimg.com')) {
    return imageSrc; // YouTube thumbnails are allowed (used in index.html)
  }
  
    // External URL blocked from preview images
  return null; // Block external URLs
};

// Security: Prevent Google Drive link crawling and prefetching
(function preventDriveCrawling() {
  'use strict';
  
  // Block any attempts to prefetch or preload Drive URLs
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('drive.google.com') || url.includes('googleusercontent.com'))) {
        // Blocked fetch request to Google Drive
        return Promise.reject(new Error('Google Drive URLs cannot be fetched for preview purposes'));
      }
      return originalFetch.apply(this, args);
    };
  }
  
  // Block iframe creation for Drive URLs
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    if (tagName.toLowerCase() === 'iframe') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string' && 
            (value.includes('drive.google.com') || value.includes('googleusercontent.com'))) {
          // Blocked iframe creation with Google Drive URL
          return; // Block the iframe
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
})();

// Performance Optimizations
(function() {
  'use strict';
  
  // Ultra-optimized image loading with Intersection Observer
  function optimizeImages() {
    const images = document.querySelectorAll('img');
    
    // Use Intersection Observer for all images (including those without lazy loading)
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            
            // Skip if already processed
            if (img.dataset.loaded) {
              observer.unobserve(img);
              return;
            }
            
            // Preload images before they're visible
            // IMPORTANT: Validate image source to prevent Google Drive URLs from being used as previews
            if (img.dataset.src && !img.src) {
              const validatedSrc = validateImageSource(img.dataset.src);
              if (!validatedSrc) {
                // Blocked Google Drive URL from preview image
                img.style.display = 'none'; // Hide invalid image
                observer.unobserve(img);
                return;
              }
              // 120fps Optimization: Use requestAnimationFrame for smooth loading
              requestAnimationFrame(() => {
                const imageLoader = new Image();
                imageLoader.src = validatedSrc;
                imageLoader.onload = () => {
                  requestAnimationFrame(() => {
                    img.src = validatedSrc;
                    img.removeAttribute('data-src');
                    img.dataset.loaded = 'true';
                    // Force GPU layer for smooth rendering
                    img.style.transform = 'translate3d(0, 0, 0)';
                    img.style.willChange = 'auto'; // Remove will-change after load
                    // CRITICAL: No opacity fade-in for instant visibility (removed delay)
                    // Images should appear instantly, not fade in
                  });
                };
                imageLoader.onerror = () => {
                  img.style.display = 'none';
                };
              });
            }
            
            // Validate existing src attribute to prevent Drive URLs
            if (img.src && !img.dataset.loaded) {
              const validatedSrc = validateImageSource(img.src);
              if (!validatedSrc) {
                // Blocked Google Drive URL from preview image
                img.style.display = 'none'; // Hide invalid image
                observer.unobserve(img);
                return;
              }
            }
            
            // Optimize attributes - but don't override explicit loading="eager" or fetchpriority
            // Only set lazy if no loading attribute exists AND image is not above-fold
            if (!img.hasAttribute('loading')) {
              // Check if image is above-fold (in hero, header, or first viewport)
              const rect = img.getBoundingClientRect();
              const isAboveFold = rect.top < window.innerHeight * 1.5; // 1.5x viewport for safety
              img.setAttribute('loading', isAboveFold ? 'eager' : 'lazy');
              if (isAboveFold && !img.hasAttribute('fetchpriority')) {
                img.setAttribute('fetchpriority', 'high');
              }
            }
            if (!img.hasAttribute('decoding')) {
              img.setAttribute('decoding', 'async');
            }
            
            // Mark as processed
            img.dataset.loaded = 'true';
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '200px' // Start loading 200px before visible for 120fps feel
      });
      
      images.forEach(img => {
        // Skip logo and above-the-fold images
        if (img.classList.contains('logo') || img.getAttribute('loading') === 'eager') {
          if (!img.hasAttribute('decoding')) {
            img.setAttribute('decoding', 'async');
          }
          return;
        }
        
        // Observe all images
        imageObserver.observe(img);
        
        // Add error handling with placeholder
        img.addEventListener('error', function() {
          this.style.opacity = '0';
          this.style.transition = 'opacity 0.3s';
          // Could add placeholder image here
        }, { once: true }); // Use once: true for better performance
      });
    } else {
      // Fallback for older browsers
      images.forEach((img) => {
        if (img.classList.contains('logo') || img.getAttribute('loading') === 'eager') {
          return;
        }
        
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
        if (!img.hasAttribute('decoding')) {
          img.setAttribute('decoding', 'async');
        }
        
        img.addEventListener('error', function() {
          this.style.display = 'none';
        }, { once: true });
      });
    }
  }
  
  // initIntersectionObserver removed - optimizeImages already handles all image loading
  
  // Shared utility functions - Optimized and reusable
  // Debounce: Delay function execution until after wait time
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // Throttle: Limit function execution frequency
  function throttle(func, limit) {
    let inThrottle;
    let lastRan;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
          }
        }, limit);
      }
    };
  }
  
  // Expose utilities globally for reuse
  window.debounce = debounce;
  window.throttle = throttle;
  
  // smoothScrollTo and batchDOMUpdate removed - unused functions
  
  // Global Search Functionality - Optimized with DOM caching
  function initGlobalSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    // Cache DOM elements to avoid repeated queries
    const domCache = {
      searchInput,
      grid: null,
      productCount: null,
      pagination: null
    };
    
    // Lazy load DOM elements when needed
    const getGrid = () => {
      if (!domCache.grid) domCache.grid = document.getElementById('productsGrid');
      return domCache.grid;
    };
    
    const getProductCount = () => {
      if (!domCache.productCount) domCache.productCount = document.getElementById('productCount') || document.getElementById('searchResultsCount');
      return domCache.productCount;
    };
    
    const getPagination = () => {
      if (!domCache.pagination) domCache.pagination = document.getElementById('pagination');
      return domCache.pagination;
    };

    // Cache for page data and search results
    let cachedPageData = null;
    let searchCache = new Map();
    const imageFallback = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'225\'%3E%3Crect fill=\'%231a1a1a\' width=\'400\' height=\'225\'/%3E%3Ctext fill=\'%23666\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\'%3ENo Image%3C/text%3E%3C/svg%3E';

    // Data mapping for faster lookup - optimized order by frequency
    const dataMap = [
      { vars: ['blenderAssets', 'window.blenderAssets'], type: 'assets', detailPage: 'asset-detail.html' },
      { vars: ['blenderAddons', 'window.blenderAddons'], type: 'addons', detailPage: 'addon-detail.html' },
      { vars: ['blender3DModels', 'window.blender3DModels'], type: '3d-models', detailPage: '3d-model-detail.html' },
      { vars: ['blenderBrushes', 'window.blenderBrushes'], type: 'brushes', detailPage: 'brush-detail.html' },
      { vars: ['blenderCourses', 'window.blenderCourses'], type: 'courses', detailPage: 'course-detail.html' },
      { vars: ['unrealAssets', 'window.unrealAssets'], type: 'assets', detailPage: '../Unreal/asset-detail.html' },
      { vars: ['unrealPlugins', 'window.unrealPlugins'], type: 'plugins', detailPage: '../Unreal/plugin-detail.html' },
      { vars: ['unreal3DModels', 'window.unreal3DModels'], type: '3d-models', detailPage: '../Unreal/3d-model-detail.html' },
      { vars: ['unrealCourses', 'window.unrealCourses'], type: 'courses', detailPage: '../Unreal/course-detail.html' },
      { vars: ['membershipProducts', 'window.membershipProducts'], type: 'membership', detailPage: 'membership-detail.html' }
    ];

    // Get current page data - optimized with caching
    function getCurrentPageData(forceRefresh = false) {
      if (cachedPageData && !forceRefresh) {
        return cachedPageData;
      }

      for (const item of dataMap) {
        const [globalVar, windowVar] = item.vars;
        // Check window first (most common)
        const windowData = window[globalVar];
        if (windowData && Array.isArray(windowData) && windowData.length > 0) {
          cachedPageData = { data: windowData, type: item.type, detailPage: item.detailPage };
          return cachedPageData;
        }
        // Fallback: Check window object (safer than eval)
        const globalData = window[globalVar];
        if (globalData && Array.isArray(globalData) && globalData.length > 0) {
          cachedPageData = { data: globalData, type: item.type, detailPage: item.detailPage };
          return cachedPageData;
        }
      }
      
      cachedPageData = null;
      return null;
    }

    // Optimized search function with caching
    function performSearch(query) {
      const trimmedQuery = query ? query.trim() : '';
      
      if (trimmedQuery.length < 1) {
        clearSearchResults();
        return;
      }

      // Check cache first
      const cacheKey = trimmedQuery.toLowerCase();
      if (searchCache.has(cacheKey)) {
        const cachedResult = searchCache.get(cacheKey);
        updateListingPageWithSearch(cachedResult.results, cachedResult.pageData);
        return;
      }

      let pageData = getCurrentPageData();
      
      if (!pageData) {
        // If on homepage and no data, try loading blenderAssets (most common)
        const isHomepage = document.body.classList.contains('homepage') || 
                           window.location.pathname === '/' || 
                           window.location.pathname.endsWith('index.html');
        
        if (isHomepage && typeof window.blenderAssets === 'undefined') {
          // Load Blender assets data for homepage search
          const script = document.createElement('script');
          script.src = 'Blender/assets-data.js';
          script.onload = () => {
            pageData = getCurrentPageData(true);
            if (pageData) {
              performSearch(query);
            } else {
              showSearchUnavailable();
            }
          };
          script.onerror = () => {
            showSearchUnavailable();
          };
          document.head.appendChild(script);
          return;
        }
        
        // Retry once after a short delay
        setTimeout(() => {
          pageData = getCurrentPageData(true);
          if (pageData) {
            performSearch(query);
          } else {
            showSearchUnavailable();
          }
        }, 300);
        return;
      }

      const searchTerm = cacheKey;
      
      // Optimized filtering - pre-compute lowercase strings once
      const results = [];
      const data = pageData.data;
      const dataLength = data.length;
      
      for (let i = 0; i < dataLength; i++) {
        const item = data[i];
        const title = (item.title || '').toLowerCase();
        
        // Fast path: check title first (most common match)
        if (title.includes(searchTerm)) {
          results.push(item);
          continue;
        }
        
        // Check other fields only if title doesn't match
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const folder = (item.folder || '').toLowerCase();
        
        if (description.includes(searchTerm) || 
            category.includes(searchTerm) ||
            folder.includes(searchTerm)) {
          results.push(item);
        }
      }

      // Cache results (limit cache size to prevent memory issues)
      if (searchCache.size > 50) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
      }
      searchCache.set(cacheKey, { results, pageData });

      // Update the page
      updateListingPageWithSearch(results, pageData);
    }

    // Show search unavailable message - Uses cached DOM
    function showSearchUnavailable() {
      const grid = getGrid();
      if (grid) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'no-products';
        emptyMsg.textContent = 'Search is not available on this page. Please navigate to a product listing page.';
        grid.innerHTML = '';
        grid.appendChild(emptyMsg);
      }
    }

    // Type name mapping for performance
    const typeNames = {
      'brushes': 'Brush',
      'assets': 'Asset',
      'courses': 'Course',
      'addons': 'Addon',
      'plugins': 'Plugin',
      '3d-models': '3D Model',
      'membership': 'Product'
    };

    // Optimized update listing page with search results - Uses cached DOM elements
    function updateListingPageWithSearch(results, pageData) {
      let grid = getGrid();
      
      // If on homepage and no grid, show search results section
      const isHomepage = document.body.classList.contains('homepage') || 
                         window.location.pathname === '/' || 
                         window.location.pathname.endsWith('index.html');
      
      if (!grid && isHomepage) {
        const searchResultsSection = document.getElementById('searchResultsSection');
        const featuredSection = document.getElementById('featuredSection');
        
        if (searchResultsSection) {
          searchResultsSection.style.display = 'block';
          grid = getGrid(); // Refresh cache
          // Scroll to search results
          searchResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Hide featured section when searching
        if (featuredSection) {
          featuredSection.style.display = 'none';
        }
      }
      
      if (!grid) return;

      const showingTextElement = document.getElementById('showingText');
      const productCountElement = getProductCount();
      const paginationElement = getPagination();
      const resultsLength = results.length;
      
      // Update counts efficiently
      if (productCountElement) {
        const typeName = typeNames[pageData.type] || 'Product';
        productCountElement.textContent = `${resultsLength} ${typeName}${resultsLength !== 1 ? 's' : ''}${resultsLength > 0 ? ' (Filtered)' : ''}`;
      }

      if (showingTextElement) {
        showingTextElement.textContent = resultsLength > 0 ? `Showing 1–${resultsLength}` : 'Showing 0–0';
      }

      // Hide pagination
      if (paginationElement) {
        paginationElement.style.display = 'none';
      }

      // Setup click handler once
      setupClickHandler();

      // Use requestAnimationFrame for smooth rendering
      requestAnimationFrame(() => {
        grid.innerHTML = '';

        if (resultsLength === 0) {
          const emptyMsg = document.createElement('p');
          emptyMsg.className = 'no-products';
          emptyMsg.textContent = `No ${pageData.type} found matching "${searchInput.value.trim()}"`;
          grid.appendChild(emptyMsg);
          return;
        }

        // Optimized rendering with DocumentFragment
        const fragment = document.createDocumentFragment();
        const detailPage = pageData.detailPage;

        // Pre-compile HTML template parts for better performance
        const cardStart = '<div class="product-card" data-product-id="';
        const cardMiddle = '" data-detail-page="';
        const cardMiddle2 = '"><div class="product-image-group"><div class="product-image-wrapper"><img src="';
        const cardMiddle3 = '" alt="';
        const cardMiddle4 = '" class="product-image" width="400" height="300" loading="lazy" decoding="async" onerror="this.src=\'' + imageFallback + '\'"></div></div><div class="product-content-group"><div class="product-info"><h3 class="product-title">';
        const cardEnd = '</h3></div></div><div class="product-meta-group"></div></div>';

        for (let i = 0; i < resultsLength; i++) {
          const product = results[i];
          const title = product.title || 'Untitled';
          const escapedTitle = title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          const imageSrc = product.image || imageFallback;
          // Normalize image path for Vercel (handles spaces, case sensitivity)
          const normalizedImageSrc = typeof getImagePath === 'function' ? getImagePath(imageSrc, '') : imageSrc;
          
          const card = document.createElement('div');
          card.className = 'product-card';
          card.dataset.productId = product.id;
          card.dataset.detailPage = detailPage;
          card.innerHTML = cardStart + product.id + cardMiddle + detailPage + cardMiddle2 + normalizedImageSrc + cardMiddle3 + escapedTitle + cardMiddle4 + title + cardEnd;
          fragment.appendChild(card);
        }

        grid.appendChild(fragment);
      });
    }

    // Event delegation for product clicks - set up once
    let clickHandlerAttached = false;
    function setupClickHandler() {
      const grid = document.getElementById('productsGrid');
      if (grid && !clickHandlerAttached) {
        grid.addEventListener('click', (e) => {
          const card = e.target.closest('.product-card');
          if (card && card.dataset.productId) {
            // Open product detail page in same tab
            window.location.href = card.dataset.detailPage + '?id=' + card.dataset.productId;
          }
        }, { passive: true });
        clickHandlerAttached = true;
      }
    }

    // Optimized clear search results
    function clearSearchResults() {
      // Clear search cache when clearing results
      searchCache.clear();
      
      // If on homepage, hide search results section and show featured section
      const isHomepage = document.body.classList.contains('homepage') || 
                         window.location.pathname === '/' || 
                         window.location.pathname.endsWith('index.html');
      
      if (isHomepage) {
        const searchResultsSection = document.getElementById('searchResultsSection');
        const featuredSection = document.getElementById('featuredSection');
        
        if (searchResultsSection) {
          searchResultsSection.style.display = 'none';
        }
        
        if (featuredSection) {
          featuredSection.style.display = '';
        }
      }
      
      // Restore original view
      if (typeof window.renderProducts === 'function') {
        const currentSort = window.currentSort || 'newest';
        window.renderProducts(currentSort);
      } else {
        // Fallback: reload page data
        const paginationElement = document.getElementById('pagination');
        if (paginationElement) {
          paginationElement.style.display = '';
        }
        
        const productCountElement = document.getElementById('productCount') || document.getElementById('searchResultsCount');
        const pageData = getCurrentPageData();
        if (productCountElement && pageData) {
          const totalItems = pageData.data.length;
          const typeName = typeNames[pageData.type] || 'Product';
          productCountElement.textContent = `${totalItems} ${typeName}${totalItems !== 1 ? 's' : ''}`;
        }
      }
    }

    // Handle Enter key to submit search - optimized
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length > 0) {
          performSearch(query);
        }
      }
    }, { passive: false });

    // Optimized debounced search - reduced delay for better UX
    const debouncedSearch = debounce(() => {
      const query = searchInput.value.trim();
      if (query.length < 1) {
        clearSearchResults();
      } else {
        performSearch(query);
      }
    }, 250); // Optimized delay for balance between performance and responsiveness

    searchInput.addEventListener('input', debouncedSearch, { passive: true });

    // Clear search on Escape - optimized
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchInput.value.trim()) {
        searchInput.value = '';
        clearSearchResults();
        searchInput.blur();
      }
    }, { passive: false });

    // Check for stored search query on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const storedQuery = sessionStorage.getItem('globalSearchQuery');
        if (storedQuery && searchInput) {
          searchInput.value = storedQuery;
          performSearch(storedQuery);
          sessionStorage.removeItem('globalSearchQuery');
        }
      });
    } else {
      const storedQuery = sessionStorage.getItem('globalSearchQuery');
      if (storedQuery && searchInput) {
        searchInput.value = storedQuery;
        performSearch(storedQuery);
        sessionStorage.removeItem('globalSearchQuery');
      }
    }
  }
  
  // Preload critical resources
  function preloadCriticalResources() {
    // Preload logo if not already loaded
    const logo = document.querySelector('.main-header__logo-image');
    if (logo && logo.src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = logo.src;
      document.head.appendChild(link);
    }
  }
  
  // initExpandableSearch removed - elements don't exist in current HTML
  
  // Mobile Hamburger Menu
  function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const closeBtn = document.getElementById('mobileMenuClose');
    
    if (!hamburgerBtn || !mobileMenu || !mobileMenuOverlay || !closeBtn) return;
    
    function openMenu() {
      document.body.style.overflow = 'hidden';
      mobileMenu.classList.add('active');
      mobileMenuOverlay.classList.add('active');
      hamburgerBtn.classList.add('active');
    }
    
    function closeMenu() {
      mobileMenu.classList.remove('active');
      mobileMenuOverlay.classList.remove('active');
      hamburgerBtn.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    // Open menu
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu();
    });
    
    // Close menu
    closeBtn.addEventListener('click', closeMenu);
    mobileMenuOverlay.addEventListener('click', closeMenu);
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
        closeMenu();
      }
    });
    
    // Close menu when clicking a link (navigation)
    const menuLinks = mobileMenu.querySelectorAll('a:not(.mobile-menu-toggle)');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        setTimeout(closeMenu, 150); // Small delay for smooth transition
      });
    });
    
    // Toggle submenus on mobile - optimized
    const submenuToggles = mobileMenu.querySelectorAll('.mobile-menu-toggle');
    submenuToggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const parent = toggle.closest('.mobile-menu-item-dropdown');
        if (!parent) return;
        
        const submenu = parent.querySelector('.mobile-menu-submenu');
        const chevron = toggle.querySelector('.chevron');
        const isActive = parent.classList.contains('active');
        
        // Close all other submenus first
        if (!isActive) {
          submenuToggles.forEach(otherToggle => {
            const otherParent = otherToggle.closest('.mobile-menu-item-dropdown');
            if (otherParent && otherParent !== parent && otherParent.classList.contains('active')) {
              const otherSubmenu = otherParent.querySelector('.mobile-menu-submenu');
              const otherChevron = otherToggle.querySelector('.chevron');
              otherParent.classList.remove('active');
              if (otherSubmenu) otherSubmenu.style.maxHeight = '0';
              if (otherChevron) otherChevron.style.transform = 'rotate(0deg)';
            }
          });
        }
        
        // Toggle current submenu
        parent.classList.toggle('active');
        if (parent.classList.contains('active')) {
          if (submenu) submenu.style.maxHeight = submenu.scrollHeight + 'px';
          if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
          if (submenu) submenu.style.maxHeight = '0';
          if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
      });
    });
  }
  
  // 120fps: Device capability detection for adaptive performance
  const deviceCapabilities = {
    isLowEnd: navigator.hardwareConcurrency <= 2 || 
              (navigator.deviceMemory && navigator.deviceMemory <= 2),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    supportsWebP: (() => {
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })(),
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
  
  // Apply device-specific optimizations immediately
  if (deviceCapabilities.isLowEnd || deviceCapabilities.isMobile) {
    document.documentElement.classList.add('low-end-device');
    // Reduce animation complexity for better performance
    document.documentElement.style.setProperty('--transition-fast', '150ms');
    document.documentElement.style.setProperty('--transition-smooth', '250ms');
  }
  
  if (deviceCapabilities.prefersReducedMotion) {
    document.documentElement.classList.add('reduced-motion');
  }
  
  // Expose capabilities for use in other scripts
  window.deviceCapabilities = deviceCapabilities;
  
  // Initialize optimizations - Optimized loading strategy with better memory management
  function init() {
    // Critical features - load immediately (blocking)
    initMobileMenu();
    
    // Use requestIdleCallback for non-critical optimizations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        optimizeImages();
        preloadCriticalResources();
      }, { timeout: 2000 });
    } else {
      // Fallback for older browsers - use setTimeout with lower priority
      setTimeout(() => {
        optimizeImages();
        preloadCriticalResources();
      }, 100);
    }
    
    // Initialize search after a small delay to ensure data files are loaded
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      setTimeout(() => {
        initGlobalSearch();
      }, 100);
    });
  }
  
  // Cleanup function for memory management
  function cleanup() {
    // Local searchCache is automatically garbage collected on page unload
  }
  
  // Register cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  
  // Optimized DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // Use RAF to ensure DOM is fully ready
    requestAnimationFrame(init);
  }
  
  // Performance monitoring removed - uncomment in development if needed
})();

// ============================================
// HOMEPAGE SPECIFIC FUNCTIONALITY
// ============================================

(function() {
  'use strict';
  
  // Prevent background animation restart
  if (!sessionStorage.getItem('animationStarted')) {
    sessionStorage.setItem('animationStarted', 'true');
    document.body.classList.add('animation-started');
  } else {
    document.body.classList.add('animation-started');
  }
  
  // initHomepageSearch removed - elements don't exist in current HTML
  
  // Load Featured Products
  function loadFeaturedProducts() {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) return;
    
    // Try to load from Blender assets (first 4)
    const featuredProducts = [];
    
    // Check if blenderAssets is available
    if (typeof window.blenderAssets !== 'undefined' && Array.isArray(window.blenderAssets)) {
      featuredProducts.push(...window.blenderAssets.slice(0, 4));
    } else {
      // Fallback: Try loading assets data
      const script = document.createElement('script');
      script.src = 'Blender/assets-data.js';
      script.onload = function() {
        if (typeof window.blenderAssets !== 'undefined' && Array.isArray(window.blenderAssets)) {
          renderFeaturedProducts(window.blenderAssets.slice(0, 4));
        }
      };
      document.head.appendChild(script);
      return;
    }
    
    renderFeaturedProducts(featuredProducts);
  }
  
    function renderFeaturedProducts(products) {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid || !products || products.length === 0) {
      // Show placeholder if no products
      featuredGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5);">Featured products loading...</p>';
      return;
    }
    
    featuredGrid.innerHTML = products.map(product => {
      // Determine software and detail page based on image path
      let software = 'Blender';
      let detailPage = 'Blender/asset-detail.html';
      
      if (product.image && product.image.includes('Unreal')) {
        software = 'Unreal';
        detailPage = 'Unreal/asset-detail.html';
      } else if (product.image && product.image.includes('../Unreal')) {
        software = 'Unreal';
        detailPage = 'Unreal/asset-detail.html';
      }
      
      // Fix image path if it starts with ../
      let imagePath = product.image;
      if (imagePath.startsWith('../')) {
        imagePath = imagePath.substring(3);
      }
      
      // Normalize path for Vercel (handles spaces, case sensitivity)
      // Use getImagePath if available, otherwise normalize manually
      if (typeof getImagePath === 'function') {
        imagePath = getImagePath(imagePath, '');
      } else {
        // Fallback: URL encode spaces
        imagePath = imagePath.split('/').map(part => {
          if (part === '..' || part === '.' || part === '') return part;
          return encodeURIComponent(part);
        }).join('/');
      }
      
      // First 4 featured products are above-fold: use eager loading with high priority
      const isAboveFold = products.indexOf(product) < 4;
      const loadingAttr = isAboveFold ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      
      return `
        <a href="${detailPage}?id=${product.id}" class="featured-card" style="text-decoration: none; color: inherit; display: block;">
          <img src="${imagePath}" alt="${product.title}" class="featured-card-image" width="400" height="300" ${loadingAttr} decoding="async" onerror="this.style.opacity='0.3';">
          <div class="featured-card-info">
            <h3 class="featured-card-title">${product.title}</h3>
            <div class="featured-card-meta">
              <span class="featured-card-tag">${software}</span>
              <div class="featured-card-rating">
                <span>⭐ 4.8</span>
              </div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }
  
  // initVideoFullscreen removed - video links are now simple <a> tags
  
  // Load Blender Products for Slider
  function loadBlenderProductsSlider() {
    const sliderTrack = document.getElementById('blenderProductsSliderTrack');
    if (!sliderTrack) return;
    
    // Check if blenderAssets is available
    if (typeof window.blenderAssets !== 'undefined' && Array.isArray(window.blenderAssets) && window.blenderAssets.length > 0) {
      renderNewProductsSlider(window.blenderAssets, sliderTrack, null, 'Blender');
    } else {
      // Load Blender assets data
      const script = document.createElement('script');
      script.src = 'Blender/assets-data.js';
      script.onload = function() {
        if (typeof window.blenderAssets !== 'undefined' && Array.isArray(window.blenderAssets) && window.blenderAssets.length > 0) {
          renderNewProductsSlider(window.blenderAssets, sliderTrack, null, 'Blender');
        } else {
          sliderTrack.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 2rem; text-align: center; min-width: 100%;">Loading Blender products...</p>';
        }
      };
      script.onerror = function() {
        sliderTrack.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 2rem; text-align: center; min-width: 100%;">Failed to load Blender products</p>';
      };
      document.head.appendChild(script);
      
      // Fallback timeout
      setTimeout(() => {
        if (typeof window.blenderAssets !== 'undefined' && Array.isArray(window.blenderAssets) && window.blenderAssets.length > 0) {
          renderNewProductsSlider(window.blenderAssets, sliderTrack, null, 'Blender');
        }
      }, 2000);
    }
  }
  
  // Load Unreal Products for Slider
  function loadUnrealProductsSlider() {
    const sliderTrack = document.getElementById('unrealProductsSliderTrack');
    if (!sliderTrack) return;
    
    // Check if unrealAssets is available
    if (typeof window.unrealAssets !== 'undefined' && Array.isArray(window.unrealAssets) && window.unrealAssets.length > 0) {
      renderNewProductsSlider(window.unrealAssets, sliderTrack, null, 'Unreal');
    } else {
      // Load Unreal assets data
      const script = document.createElement('script');
      script.src = 'Unreal/unreal-assets-data.js';
      script.onload = function() {
        if (typeof window.unrealAssets !== 'undefined' && Array.isArray(window.unrealAssets) && window.unrealAssets.length > 0) {
          renderNewProductsSlider(window.unrealAssets, sliderTrack, null, 'Unreal');
        } else {
          sliderTrack.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 2rem; text-align: center; min-width: 100%;">Loading Unreal products...</p>';
        }
      };
      script.onerror = function() {
        sliderTrack.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 2rem; text-align: center; min-width: 100%;">Failed to load Unreal products</p>';
      };
      document.head.appendChild(script);
      
      // Fallback timeout
      setTimeout(() => {
        if (typeof window.unrealAssets !== 'undefined' && Array.isArray(window.unrealAssets) && window.unrealAssets.length > 0) {
          renderNewProductsSlider(window.unrealAssets, sliderTrack, null, 'Unreal');
        }
      }, 2000);
    }
  }
  
  function renderNewProductsSlider(products, sliderTrack, sliderDuplicate, source) {
    if (!sliderTrack) return;
    
    if (!products || products.length === 0) {
      sliderTrack.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 2rem; text-align: center; min-width: 100%;">No products available</p>';
      return;
    }
    
    // Optimized: Pre-compute detail page path
    const detailPage = source === 'Unreal' ? 'Unreal/asset-detail.html' : 'Blender/asset-detail.html';
    const sourcePrefix = source + '/';
    
    // Optimized: Create path fixer function
    const fixImagePath = (imagePath) => {
      // Normalize path for Vercel (handles spaces, case sensitivity)
      if (typeof normalizeImagePath === 'function') {
        imagePath = normalizeImagePath(imagePath);
      }
      if (!imagePath) return '';
      if (imagePath.startsWith('../')) return imagePath.substring(3);
      if (imagePath.startsWith('http') || imagePath.startsWith('/')) return imagePath;
      if (!imagePath.startsWith(sourcePrefix)) return sourcePrefix + imagePath;
      return imagePath;
    };
    
    // Optimized: Duplicate products efficiently (4x for seamless loop)
    const productCount = products.length;
    const totalCards = productCount * 4;
    
    // Pre-build HTML string for better performance
    let htmlString = '';
    
    for (let i = 0; i < totalCards; i++) {
      const product = products[i % productCount];
      let imagePath = fixImagePath(product.image);
      
      // Normalize path for Vercel (handles spaces, case sensitivity)
      if (typeof getImagePath === 'function') {
        imagePath = getImagePath(imagePath, '');
      } else {
        // Fallback: URL encode spaces
        imagePath = imagePath.split('/').map(part => {
          if (part === '..' || part === '.' || part === '') return part;
          return encodeURIComponent(part);
        }).join('/');
      }
      
      const escapedTitle = product.title.replace(/"/g, '&quot;');
      
      htmlString += `
        <a href="${detailPage}?id=${product.id}" class="slider-product-card" style="text-decoration: none; color: inherit; display: block;">
          <div class="slider-product-card-image-wrapper">
            <img src="${imagePath}" alt="${escapedTitle}" class="slider-product-card-image" width="300" height="200" loading="lazy" decoding="async" onerror="this.style.opacity='0.3';">
            <span class="slider-product-card-new-badge">New</span>
          </div>
          <div class="slider-product-card-info">
            <h3 class="slider-product-card-title">${escapedTitle}</h3>
            <span class="slider-product-card-tag">${source}</span>
          </div>
        </a>
      `;
    }
    
    // Single DOM update for better performance
    sliderTrack.innerHTML = htmlString;
    
    // Hide duplicate track element if exists
    if (sliderDuplicate) {
      sliderDuplicate.innerHTML = '';
    }
    
    // Mark animation as started (optimized check)
    const animationKey = source === 'Unreal' ? 'unrealProductsSliderStarted' : 'blenderProductsSliderStarted';
    const wasStarted = sessionStorage.getItem(animationKey);
    if (!wasStarted) {
      sessionStorage.setItem(animationKey, 'true');
    }
    sliderTrack.classList.add('animation-started');
  }
  
  // Initialize homepage features
  function initHomepage() {
    const isHomepage = document.body.classList.contains('homepage') || 
                       document.querySelector('.homepage') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('index.html');
    
    if (isHomepage) {
      // Homepage search handled by search panel system
      
      // Load Unreal products slider
      setTimeout(() => {
        loadUnrealProductsSlider();
      }, 300);
      
      // Load featured products after a delay to ensure data is available
      setTimeout(() => {
        loadFeaturedProducts();
      }, 500);
    }
  }
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepage);
  } else {
    initHomepage();
  }
})();

// ============================================================================
// GLOBAL INTELLIGENT SEARCH SYSTEM
// ============================================================================

(function() {
  'use strict';
  
  // Global search state
  let globalSearchIndex = [];
  let searchCache = new Map();
  const MAX_RESULTS = 8;
  // Slightly lower delay for snappier UX
  const DEBOUNCE_DELAY = 160;
  
  // Category mapping for display
  const categoryMap = {
    'Blender': { badge: 'Blender', color: '#f5792a' },
    'Unreal': { badge: 'Unreal', color: '#0e1128' },
    'After Effects': { badge: 'AE', color: '#0000ff' },
    'Premiere Pro': { badge: 'PP', color: '#ea77f0' },
    'Photoshop': { badge: 'PS', color: '#31c5f0' },
    'Houdini': { badge: 'Houdini', color: '#ff6600' },
    'Software': { badge: 'Software', color: '#4a90e2' },
    'Website Templates': { badge: 'Templates', color: '#9b59b6' }
  };
  
  // Type mapping for display
  const typeMap = {
    'assets': 'Asset',
    'addons': 'Addon',
    'plugins': 'Plugin',
    'courses': 'Course',
    'brushes': 'Brush',
    '3d-models': '3D Model',
    '3D Models': '3D Model'
  };
  
  // Helper function to normalize image paths for Vercel/case-sensitive systems
  // Handles: case sensitivity, spaces, relative paths, URL encoding
  function normalizeImagePath(imagePath) {
    if (!imagePath) return '';
    
    // If path is already absolute or external, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
      return imagePath;
    }

    // Fix known folder-name casing/typos to match actual repo folders.
    // This prevents 404s on case-sensitive hosts (e.g., Vercel/Linux) and keeps
    // local Live Server behavior consistent.
    //
    // Repo folders (as on disk):
    // - Blender/3d Models/...  (lowercase "3d", capital "M")
    // - Unreal/3d modles/...  (note: "modles" is intentionally kept as-is)
    // Optimized: Cache normalized segments to avoid repeated processing
    const segmentCache = new Map();
    const normalizeKnownSegments = (segment) => {
      if (segmentCache.has(segment)) return segmentCache.get(segment);
      
      const s = String(segment);
      const lower = s.toLowerCase();
      let result = s;
      
      // Fix case sensitivity: "3D Models" or "3d models" -> "3d Models" (matches actual folder)
      if (lower === '3d models') result = '3d Models';
      else if (lower === '3d modles') result = '3d modles';
      
      segmentCache.set(segment, result);
      return result;
    };
    
    // URL encode spaces and special characters in path segments
    // Split path, encode each segment, then rejoin
    const pathParts = imagePath.split('/');
    const encodedParts = new Array(pathParts.length);
    
    for (let i = 0; i < pathParts.length; i++) {
      let part = normalizeKnownSegments(pathParts[i]);
      
      // Don't encode if already encoded or if it's a relative path marker
      if (part === '..' || part === '.' || part === '') {
        encodedParts[i] = part;
        continue;
      }
      
      // Avoid double-encoding (e.g. "My%20Folder" should stay as-is)
      if (/%[0-9A-Fa-f]{2}/.test(part)) {
        encodedParts[i] = part;
        continue;
      }
      
      // Encode spaces and special characters (including +, which becomes %2B)
      // This is critical for live servers which are case-sensitive and require URL encoding
      encodedParts[i] = encodeURIComponent(part).replace(/%2F/g, '/');
    }
    
    return encodedParts.join('/');
  }
  
  // Helper function to get correct image path relative to current page (Global scope)
  function getImagePath(imagePath, category) {
    if (!imagePath) return '';
    
    // Normalize path first (handles spaces, encoding)
    let normalizedPath = normalizeImagePath(imagePath);
    
    // If path is already absolute or external, return normalized version
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://') || normalizedPath.startsWith('/')) {
      return normalizedPath;
    }
    
    // Remove existing ../ prefixes to get clean path relative to root
    let cleanPath = normalizedPath;
    while (cleanPath.startsWith('../')) {
      cleanPath = cleanPath.substring(3);
    }
    
    // Fix: Add category prefix (Unreal/, Blender/, etc.) if category is provided and path doesn't already include it
    // This fixes Unreal images not loading in search (Unreal data files have paths like "Assets/..." instead of "Unreal/Assets/...")
    if (category) {
      const categoryLower = category.toLowerCase();
      const pathLower = cleanPath.toLowerCase();
      
      // Check if path already includes the category folder
      const hasCategoryPrefix = pathLower.startsWith(categoryLower + '/') || 
                                pathLower.includes('/' + categoryLower + '/') ||
                                cleanPath.startsWith('../' + category + '/') ||
                                cleanPath.includes('/../' + category + '/');
      
      // If category is provided and path doesn't include it, prepend the category folder
      if (!hasCategoryPrefix) {
        // Map category names to folder names
        const categoryFolderMap = {
          'Blender': 'Blender',
          'Unreal': 'Unreal',
          'After Effects': 'ae',
          'Premiere Pro': 'pp',
          'Photoshop': 'photoshop',
          'Houdini': 'Houdini',
          'Software': 'Membership' // Software products are in Membership folder
        };
        
        const folderName = categoryFolderMap[category] || category;
        cleanPath = folderName + '/' + cleanPath;
      }
    }
    
    // Calculate depth from root (how many directories up we need to go to reach root)
    const currentPath = window.location.pathname;
    // Remove leading / and split
    const cleanCurrentPath = currentPath.replace(/^\//, '');
    const pathParts = cleanCurrentPath.split('/').filter(p => p);
    
    // Depth is number of directories (excluding the HTML file itself)
    // index.html -> depth 0
    // Blender/3d-models.html -> depth 1
    // Blender/assets.html -> depth 1
    const depth = pathParts.length > 1 ? pathParts.length - 1 : 0;
    
    // Add correct number of ../ based on current depth
    if (depth > 0) {
      return '../'.repeat(depth) + cleanPath;
    }
    
    // At root level, return path as-is (relative to root)
    return cleanPath;
  }
  
  // Expose functions globally for use in other scopes (homepage, etc.)
  window.normalizeImagePath = normalizeImagePath;
  window.getImagePath = getImagePath;
  
  // Helper function to resolve internal links from any subfolder page
  function getLinkPath(url) {
    if (!url) return '#';
    if (url === '#') return '#';
    if (url.startsWith('#')) return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url;

    const currentPath = window.location.pathname;
    const cleanCurrentPath = currentPath.replace(/^\//, '');
    const pathParts = cleanCurrentPath.split('/').filter(p => p);

    // Depth is number of directories (excluding the HTML file itself)
    const depth = pathParts.length > 1 ? pathParts.length - 1 : 0;

    // Remove any existing ../ so we treat it as root-relative
    let cleanUrl = url;
    while (cleanUrl.startsWith('../')) {
      cleanUrl = cleanUrl.substring(3);
    }

    return depth > 0 ? '../'.repeat(depth) + cleanUrl : cleanUrl;
  }

  // Load and aggregate all product data - Enhanced: Load data files dynamically
  async function loadGlobalSearchIndex() {
    if (globalSearchIndex.length > 0) return globalSearchIndex;
    
    const products = [];
    
    // Helper function to load data file dynamically
    async function loadDataFile(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    }
    
    // Dynamically load all data files if not already loaded
    const dataFiles = [
      'other-products-data.js',
      'Blender/download-links-data.js',
      'Blender/3d-models-data.js',
      'Blender/assets-data.js',
      'Blender/brushes-data.js',
      'Blender/courses-data.js',
      'Unreal/unreal-assets-data.js',
      'Unreal/unreal-plugins-data.js',
      'Unreal/unreal-courses-data.js',
      'Unreal/unreal-3d-models-data.js',
      'Membership/membership-data.js'
    ];
    
    // Load data files in parallel (only if variables don't exist)
    const loadPromises = [];
    if (typeof window.aePlugins === 'undefined') {
      loadPromises.push(loadDataFile('other-products-data.js'));
    }
    if (typeof window.blenderDownloadLinksMap === 'undefined') {
      loadPromises.push(loadDataFile('Blender/download-links-data.js'));
    }
    if (typeof window.blender3DModels === 'undefined' && typeof blender3DModels === 'undefined') {
      loadPromises.push(loadDataFile('Blender/3d-models-data.js'));
    }
    if (typeof blenderAssets === 'undefined') {
      loadPromises.push(loadDataFile('Blender/assets-data.js'));
    }
    if (typeof blenderBrushes === 'undefined') {
      loadPromises.push(loadDataFile('Blender/brushes-data.js'));
    }
    if (typeof blenderCourses === 'undefined') {
      loadPromises.push(loadDataFile('Blender/courses-data.js'));
    }
    if (typeof unrealAssets === 'undefined') {
      loadPromises.push(loadDataFile('Unreal/unreal-assets-data.js'));
    }
    if (typeof unrealPlugins === 'undefined') {
      loadPromises.push(loadDataFile('Unreal/unreal-plugins-data.js'));
    }
    if (typeof unrealCourses === 'undefined') {
      loadPromises.push(loadDataFile('Unreal/unreal-courses-data.js'));
    }
    if (typeof unreal3DModels === 'undefined') {
      loadPromises.push(loadDataFile('Unreal/unreal-3d-models-data.js'));
    }
    if (typeof membershipProducts === 'undefined') {
      loadPromises.push(loadDataFile('Membership/membership-data.js'));
    }
    
    // Wait for all data files to load
    if (loadPromises.length > 0) {
      try {
        await Promise.all(loadPromises);
        // Give scripts time to execute and set global variables
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Retry checking for variables after scripts execute
        let retryCount = 0;
        while (retryCount < 5 && (
          (typeof blenderAssets === 'undefined' && typeof window.blenderAssets === 'undefined') ||
          (typeof unrealAssets === 'undefined' && typeof window.unrealAssets === 'undefined')
        )) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retryCount++;
        }
      } catch (error) {
        console.warn('Some data files failed to load:', error);
      }
    }
    
    // Blender Assets - Check both global and window variables
    const blenderAssetsData = typeof blenderAssets !== 'undefined' ? blenderAssets : 
                             (typeof window.blenderAssets !== 'undefined' ? window.blenderAssets : null);
    if (blenderAssetsData && Array.isArray(blenderAssetsData)) {
      const dlMap = window.blenderDownloadLinksMap || window.assetDownloadLinksMap || {};
      blenderAssetsData.forEach(item => {
        products.push({
          ...item,
          category: 'Blender',
          type: 'Asset',
          searchUrl: `Blender/assets.html#product-${item.id}`,
          detailUrl: `Blender/asset-detail.html?id=${item.id}`,
          downloadUrl: item.downloadLink || dlMap[item.title] || '',
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    // Blender Addons - Check both global and inline data
    const blenderAddonsData = typeof blenderAddons !== 'undefined' ? blenderAddons : 
                              (typeof window.blenderAddons !== 'undefined' ? window.blenderAddons : null);
    if (blenderAddonsData && Array.isArray(blenderAddonsData)) {
      const dlMap = window.blenderDownloadLinksMap || window.downloadLinksMap || {};
      blenderAddonsData.forEach(item => {
        products.push({
          ...item,
          category: 'Blender',
          type: 'Addon',
          searchUrl: `Blender/addons.html#product-${item.id}`,
          detailUrl: `Blender/addon-detail.html?id=${item.id}`,
          downloadUrl: item.downloadLink || dlMap[item.title] || '',
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    // Blender Brushes - Check both global and window variables
    const blenderBrushesData = typeof blenderBrushes !== 'undefined' ? blenderBrushes : 
                               (typeof window.blenderBrushes !== 'undefined' ? window.blenderBrushes : null);
    if (blenderBrushesData && Array.isArray(blenderBrushesData)) {
      const dlMap = window.brushDownloadLinksMap || window.blenderDownloadLinksMap || {};
      blenderBrushesData.forEach(item => {
        products.push({
          ...item,
          category: 'Blender',
          type: 'Brush',
          searchUrl: `Blender/brushes.html#product-${item.id}`,
          detailUrl: `Blender/brush-detail.html?id=${item.id}`,
          downloadUrl: item.downloadLink || dlMap[item.title] || '',
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    // Blender Courses - Check both global and window variables
    const blenderCoursesData = typeof blenderCourses !== 'undefined' ? blenderCourses : 
                               (typeof window.blenderCourses !== 'undefined' ? window.blenderCourses : null);
    if (blenderCoursesData && Array.isArray(blenderCoursesData)) {
      const dlMap = window.courseDownloadLinksMap || window.blenderDownloadLinksMap || {};
      blenderCoursesData.forEach(item => {
        products.push({
          ...item,
          category: 'Blender',
          type: 'Course',
          searchUrl: `Blender/courses.html#product-${item.id}`,
          detailUrl: `Blender/course-detail.html?id=${item.id}`,
          downloadUrl: item.downloadLink || dlMap[item.title] || '',
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    // Blender 3D Models - check multiple variable names for compatibility (including inline data)
    const blender3DModelsData = typeof blender3DModels !== 'undefined' ? blender3DModels : 
                                (typeof window.blender3DModels !== 'undefined' ? window.blender3DModels : 
                                (typeof blenderProducts !== 'undefined' ? blenderProducts : null));
    
    if (blender3DModelsData && Array.isArray(blender3DModelsData)) {
      const dlMap = window.blenderDownloadLinksMap || window.downloadLinksMap || {};
      blender3DModelsData.forEach(item => {
        products.push({
          ...item,
          category: 'Blender',
          type: '3D Model',
          searchUrl: `Blender/3d-models.html#product-${item.id}`,
          detailUrl: `Blender/product-detail.html?id=${item.id}`,
          downloadUrl: item.downloadLink || dlMap[item.title] || '',
          image: item.image, // Store original path, fix at render time
          folder: item.folder || item.title || ''
        });
      });
    }
    
    // Unreal Products - Check both global and window variables
    const unrealAssetsData = typeof unrealAssets !== 'undefined' ? unrealAssets : 
                            (typeof window.unrealAssets !== 'undefined' ? window.unrealAssets : null);
    if (unrealAssetsData && Array.isArray(unrealAssetsData)) {
      unrealAssetsData.forEach(item => {
        products.push({
          ...item,
          category: 'Unreal',
          type: 'Asset',
          searchUrl: `Unreal/assets.html#product-${item.id}`,
          detailUrl: `Unreal/asset-detail.html?id=${item.id}`,
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    const unrealPluginsData = typeof unrealPlugins !== 'undefined' ? unrealPlugins : 
                              (typeof window.unrealPlugins !== 'undefined' ? window.unrealPlugins : null);
    if (unrealPluginsData && Array.isArray(unrealPluginsData)) {
      unrealPluginsData.forEach(item => {
        products.push({
          ...item,
          category: 'Unreal',
          type: 'Plugin',
          searchUrl: `Unreal/plugins.html#product-${item.id}`,
          detailUrl: `Unreal/plugin-detail.html?id=${item.id}`,
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    const unrealCoursesData = typeof unrealCourses !== 'undefined' ? unrealCourses : 
                              (typeof window.unrealCourses !== 'undefined' ? window.unrealCourses : null);
    if (unrealCoursesData && Array.isArray(unrealCoursesData)) {
      unrealCoursesData.forEach(item => {
        products.push({
          ...item,
          category: 'Unreal',
          type: 'Course',
          searchUrl: `Unreal/courses.html#product-${item.id}`,
          detailUrl: `Unreal/course-detail.html?id=${item.id}`,
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    const unreal3DModelsData = typeof unreal3DModels !== 'undefined' ? unreal3DModels : 
                               (typeof window.unreal3DModels !== 'undefined' ? window.unreal3DModels : null);
    if (unreal3DModelsData && Array.isArray(unreal3DModelsData)) {
      unreal3DModelsData.forEach(item => {
        products.push({
          ...item,
          category: 'Unreal',
          type: '3D Model',
          searchUrl: `Unreal/3d-models.html#product-${item.id}`,
          detailUrl: `Unreal/3d-model-detail.html?id=${item.id}`,
          image: item.image // Store original path, fix at render time
        });
      });
    }
    
    // After Effects Products (check data on pages)
    // AE plugins, assets, courses would need their data loaded
    // For now, we'll handle dynamically loaded data
    
    // Membership Products - Check both global and window variables
    const membershipProductsData = typeof membershipProducts !== 'undefined' ? membershipProducts : 
                                  (typeof window.membershipProducts !== 'undefined' ? window.membershipProducts : null);
    if (membershipProductsData && Array.isArray(membershipProductsData) && membershipProductsData.length > 0) {
      membershipProductsData.forEach(item => {
        // Fix image path: if it doesn't start with http/https and doesn't include Membership/, prepend it
        let imagePath = item.image || '';
        if (imagePath && !imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('/')) {
          if (!imagePath.includes('Membership/') && !imagePath.startsWith('../')) {
            imagePath = 'Membership/' + imagePath;
          }
        }
        
        products.push({
          ...item,
          category: 'Software',
          type: 'Membership',
          searchUrl: `Membership/membership.html#product-${item.id}`,
          detailUrl: `Membership/membership-detail.html?id=${item.id}`,
          image: imagePath // Fixed path with Membership/ prefix
        });
      });
    }

    // After Effects
    const aePlugins = window.aePlugins;
    if (Array.isArray(aePlugins)) {
      for (let i = 0; i < aePlugins.length; i++) {
        const item = aePlugins[i];
        products.push({
          ...item,
          category: 'After Effects',
          type: 'Plugin',
          searchUrl: `ae/plugins.html#product-${item.id}`,
          detailUrl: `ae/plugins.html`,
          image: item.image
        });
      }
    }
    const aeAssets = window.aeAssets;
    if (Array.isArray(aeAssets)) {
      for (let i = 0; i < aeAssets.length; i++) {
        const item = aeAssets[i];
        products.push({
          ...item,
          category: 'After Effects',
          type: 'Asset',
          searchUrl: `ae/assets.html#product-${item.id}`,
          detailUrl: `ae/assets.html`,
          image: item.image
        });
      }
    }
    const aeCourses = window.aeCourses;
    if (Array.isArray(aeCourses)) {
      for (let i = 0; i < aeCourses.length; i++) {
        const item = aeCourses[i];
        products.push({
          ...item,
          category: 'After Effects',
          type: 'Course',
          searchUrl: `ae/courses.html#product-${item.id}`,
          detailUrl: `ae/courses.html`,
          image: item.image
        });
      }
    }

    // Premiere Pro
    const ppPlugins = window.ppPlugins;
    if (Array.isArray(ppPlugins)) {
      for (let i = 0; i < ppPlugins.length; i++) {
        const item = ppPlugins[i];
        products.push({
          ...item,
          category: 'Premiere Pro',
          type: 'Plugin',
          searchUrl: `pp/plugins.html#product-${item.id}`,
          detailUrl: `pp/plugins.html`,
          image: item.image
        });
      }
    }
    const ppAssets = window.ppAssets;
    if (Array.isArray(ppAssets)) {
      for (let i = 0; i < ppAssets.length; i++) {
        const item = ppAssets[i];
        products.push({
          ...item,
          category: 'Premiere Pro',
          type: 'Asset',
          searchUrl: `pp/assets.html#product-${item.id}`,
          detailUrl: `pp/assets.html`,
          image: item.image
        });
      }
    }
    const ppCourses = window.ppCourses;
    if (Array.isArray(ppCourses)) {
      for (let i = 0; i < ppCourses.length; i++) {
        const item = ppCourses[i];
        products.push({
          ...item,
          category: 'Premiere Pro',
          type: 'Course',
          searchUrl: `pp/courses.html#product-${item.id}`,
          detailUrl: `pp/courses.html`,
          image: item.image
        });
      }
    }

    // Houdini
    const houdiniAssets = window.houdiniAssets;
    if (Array.isArray(houdiniAssets)) {
      for (let i = 0; i < houdiniAssets.length; i++) {
        const item = houdiniAssets[i];
        products.push({
          ...item,
          category: 'Houdini',
          type: 'Asset',
          searchUrl: `Houdini/assets.html#product-${item.id}`,
          detailUrl: `Houdini/assets.html`,
          image: item.image
        });
      }
    }
    const houdiniCourses = window.houdiniCourses;
    if (Array.isArray(houdiniCourses)) {
      for (let i = 0; i < houdiniCourses.length; i++) {
        const item = houdiniCourses[i];
        products.push({
          ...item,
          category: 'Houdini',
          type: 'Course',
          searchUrl: `Houdini/courses.html#product-${item.id}`,
          detailUrl: `Houdini/courses.html`,
          image: item.image
        });
      }
    }

    // Photoshop
    const psAssets = window.photoshopAssets;
    if (Array.isArray(psAssets)) {
      for (let i = 0; i < psAssets.length; i++) {
        const item = psAssets[i];
        products.push({
          ...item,
          category: 'Photoshop',
          type: 'Asset',
          searchUrl: `photoshop.html#product-${item.id}`,
          detailUrl: `photoshop.html`,
          image: item.image
        });
      }
    }
    const psPresets = window.photoshopPresets;
    if (Array.isArray(psPresets)) {
      for (let i = 0; i < psPresets.length; i++) {
        const item = psPresets[i];
        products.push({
          ...item,
          category: 'Photoshop',
          type: 'Preset',
          searchUrl: `photoshop.html#product-${item.id}`,
          detailUrl: `photoshop.html`,
          image: item.image
        });
      }
    }
    const psTemplates = window.photoshopTemplates;
    if (Array.isArray(psTemplates)) {
      for (let i = 0; i < psTemplates.length; i++) {
        const item = psTemplates[i];
        products.push({
          ...item,
          category: 'Photoshop',
          type: 'Template',
          searchUrl: `photoshop.html#product-${item.id}`,
          detailUrl: `photoshop.html`,
          image: item.image
        });
      }
    }

    // Software
    const softwareProducts = window.softwareProducts;
    if (Array.isArray(softwareProducts)) {
      for (let i = 0; i < softwareProducts.length; i++) {
        const item = softwareProducts[i];
        products.push({
          ...item,
          category: 'Software',
          type: 'Software',
          searchUrl: `software.html#product-${item.id}`,
          detailUrl: `software.html`,
          image: item.image
        });
      }
    }

    // Website Templates
    const websiteTemplates = window.websiteTemplates;
    if (Array.isArray(websiteTemplates)) {
      for (let i = 0; i < websiteTemplates.length; i++) {
        const item = websiteTemplates[i];
        products.push({
          ...item,
          category: 'Website Templates',
          type: 'Template',
          searchUrl: `templates.html#product-${item.id}`,
          detailUrl: `templates.html`,
          image: item.image
        });
      }
    }
    
    // Precompute searchable fields once (big speedup on each keystroke)
    globalSearchIndex = products.map((p) => {
      const title = (p.title || '').trim();
      const category = (p.category || '').trim();
      const type = (p.type || '').trim();
      const folder = (p.folder || '').trim();

      const titleLower = title.toLowerCase();
      const categoryLower = category.toLowerCase();
      const typeLower = type.toLowerCase();
      const folderLower = folder.toLowerCase();

      // Single searchable blob (fast includes)
      const searchText = `${titleLower} ${folderLower} ${categoryLower} ${typeLower}`.trim();

      return {
        ...p,
        _titleLower: titleLower,
        _searchText: searchText
      };
    });

    return globalSearchIndex;
  }
  
  // Debounce function - Use shared utility from main scope
  const debounce = window.debounce || function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  };
  
  // Search function - Enhanced: Case-insensitive partial matching with exact match priority
  function performGlobalSearch(query) {
    // Normalize query: trim spaces and convert to lowercase
    const normalizedQuery = query.trim().toLowerCase();
    
    if (normalizedQuery.length < 1) {
      return [];
    }
    
    // Check cache
    if (searchCache.has(normalizedQuery)) {
      return searchCache.get(normalizedQuery);
    }

    // Fast loop-based search (avoids filter+map allocations)
    const matches = [];
    for (let i = 0; i < globalSearchIndex.length; i++) {
      const p = globalSearchIndex[i];
      if (!p._searchText || !p._searchText.includes(normalizedQuery)) continue;

      const t = p._titleLower || '';
      // Exact/starts-with priority
      const score = (t === normalizedQuery) ? 3 : (t.startsWith(normalizedQuery) ? 2 : 1);
      matches.push([score, p]);
    }

    // Sort by score desc, then title
    matches.sort((a, b) => {
      if (b[0] !== a[0]) return b[0] - a[0];
      return (a[1]._titleLower || '').localeCompare(b[1]._titleLower || '');
    });

    // Strip internal fields before returning (keep main product shape)
    const finalResults = new Array(matches.length);
    for (let i = 0; i < matches.length; i++) {
      const p = matches[i][1];
      // eslint-disable-next-line no-unused-vars
      const { _titleLower, _searchText, ...rest } = p;
      finalResults[i] = rest;
    }
    
    // Limit cache size - Use LRU eviction for better memory management
    const MAX_CACHE_SIZE = 50;
    if (searchCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry (first key)
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
    searchCache.set(normalizedQuery, finalResults);
    return finalResults;
  }
  
  // Render search results - Enhanced with premium UI
  function renderSearchResults(results, query) {
    // Support both old and new search structure
    const resultsList = document.getElementById('searchResultsList');
    const viewAll = document.getElementById('searchViewAll');
    const viewAllLink = document.getElementById('viewAllLink');
    
    if (!resultsList) return;
    
    if (results.length === 0) {
      resultsList.innerHTML = `
        <div class="search-no-results">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto 1rem; opacity: 0.5;">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p>No products found for "<strong>${query}</strong>"</p>
          <p style="margin-top: 0.5rem; font-size: 0.8125rem; color: rgba(255, 255, 255, 0.5);">Try different keywords or browse categories</p>
        </div>
      `;
      if (viewAll) viewAll.style.display = 'none';
      return;
    }
    
    const displayResults = results.slice(0, MAX_RESULTS);
    const hasMore = results.length > MAX_RESULTS;
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    for (let index = 0; index < displayResults.length; index++) {
      const product = displayResults[index];
      const categoryInfo = categoryMap[product.category] || { badge: product.category || 'Product', color: '#666' };
      const typeLabel = typeMap[product.type?.toLowerCase()] || product.type || 'Product';
      
      // Get correct image path relative to current page
      const rawImagePath = product.image ? getImagePath(product.image, product.category) : '';
      const imagePath = validateImageSource(rawImagePath) || '';
      
      // Get product URL
      const productHrefRaw = product.detailUrl || product.searchUrl || '#';
      const productHref = getLinkPath(productHrefRaw);
      const isExternal = /^https?:\/\//i.test(productHrefRaw);
      
      // Create result item
      const item = document.createElement('a');
      item.href = productHref;
      item.className = 'search-result-item';
      item.setAttribute('data-product-id', product.id || index);
      item.setAttribute('data-category', product.category || '');
      if (isExternal) {
        item.setAttribute('target', '_blank');
        item.setAttribute('rel', 'noopener noreferrer');
      }
      
      // Escape HTML
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const escapedTitle = escapeHtml(product.title || 'Untitled Product');
      const fallbackImage = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 400 300\'%3E%3Crect fill=\'%23181818\' width=\'400\' height=\'300\'/%3E%3Ctext fill=\'%23666\' x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dominant-baseline=\'middle\' font-family=\'Arial\' font-size=\'14\'%3ENo Image%3C/text%3E%3C/svg%3E';
      
      item.innerHTML = `
        <div class="search-result-thumbnail">
          <img src="${imagePath || fallbackImage}" alt="${escapedTitle}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='${fallbackImage}';">
        </div>
        <div class="search-result-content">
          <h4 class="search-result-title">${escapedTitle}</h4>
          <div class="search-result-meta">
            <span class="search-result-badge" style="background: ${categoryInfo.color}; color: ${categoryInfo.color === '#0e1128' ? '#fff' : '#fff'}">${categoryInfo.badge}</span>
            <span class="search-result-type">${typeLabel}</span>
          </div>
        </div>
      `;
      
      fragment.appendChild(item);
    }
    
    // Single DOM update
    resultsList.innerHTML = '';
    resultsList.appendChild(fragment);
    
    // Show "View all" link if there are more results
    if (viewAll && viewAllLink) {
      if (hasMore) {
        const searchPageUrl = `products.html?search=${encodeURIComponent(query)}`;
        viewAllLink.href = getLinkPath(searchPageUrl);
        viewAll.style.display = 'block';
      } else {
        viewAll.style.display = 'none';
      }
    }
  }
  
  // ============================================
  // RIGHT SIDE SEARCH PANEL - Mirrors Left Menu
  // ============================================
  function initSearchPanel() {
    const searchTrigger = document.getElementById('searchTrigger');
    const searchPanel = document.getElementById('searchPanel');
    const searchPanelClose = document.getElementById('searchPanelClose');
    const searchPanelOverlay = document.getElementById('searchPanelOverlay');
    const searchInput = document.getElementById('searchInput');
    const searchResultsList = document.getElementById('searchResultsList');
    
    if (!searchTrigger || !searchPanel) return;
    
    /**
     * Open the search panel
     */
    function openSearchPanel() {
      searchPanel.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Auto-focus input
      setTimeout(() => {
        if (searchInput) {
          searchInput.focus();
        }
      }, 150);
    }
    
    /**
     * Close the search panel
     */
    function closeSearchPanel() {
      searchPanel.classList.remove('active');
      document.body.style.overflow = '';
      if (searchInput) {
        searchInput.blur();
        searchInput.value = '';
      }
      // Clear results
      if (searchResultsList) {
        searchResultsList.innerHTML = '';
      }
      const viewAll = document.getElementById('searchViewAll');
      if (viewAll) {
        viewAll.style.display = 'none';
      }
    }
    
    /**
     * Toggle the search panel
     */
    function toggleSearchPanel() {
      if (searchPanel.classList.contains('active')) {
        closeSearchPanel();
      } else {
        openSearchPanel();
      }
    }
    
    /**
     * Handle search input and render results
     */
    let searchTimeout;
    const performSearch = debounce(async () => {
      if (!searchInput || !searchResultsList) return;
      
      const query = searchInput.value.trim();
      
      if (query.length === 0) {
        searchResultsList.innerHTML = '';
        const viewAll = document.getElementById('searchViewAll');
        if (viewAll) {
          viewAll.style.display = 'none';
        }
        return;
      }
      
      // Load search index if needed
      if (globalSearchIndex.length === 0) {
        await loadGlobalSearchIndex();
      }
      
      // Perform search and render results
      requestAnimationFrame(() => {
        const results = performGlobalSearch(query);
        renderSearchResults(results, query);
      });
    }, DEBOUNCE_DELAY);
    
    // Search trigger button click
    searchTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSearchPanel();
    });
    
    // Close button click
    if (searchPanelClose) {
      searchPanelClose.addEventListener('click', closeSearchPanel);
    }
    
    // Overlay click to close
    if (searchPanelOverlay) {
      searchPanelOverlay.addEventListener('click', closeSearchPanel);
    }
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchPanel.classList.contains('active')) {
        closeSearchPanel();
      }
    });
    
    // Input event - perform search
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        performSearch();
      });
    }
    
    // Mouse-based control: Keep panel open when mouse is inside
    const searchPanelContent = searchPanel.querySelector('.search-panel__content');
    if (searchPanelContent) {
      let mouseInsidePanel = false;
      let closeTimeout;
      
      searchPanelContent.addEventListener('mouseenter', () => {
        mouseInsidePanel = true;
        clearTimeout(closeTimeout);
      });
      
      searchPanelContent.addEventListener('mouseleave', (e) => {
        // Check if mouse is moving to overlay (should close immediately)
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && relatedTarget.classList.contains('search-panel__overlay')) {
          mouseInsidePanel = false;
          closeSearchPanel();
        } else {
          mouseInsidePanel = false;
          // Close panel when mouse leaves panel area (with delay for smooth UX)
          closeTimeout = setTimeout(() => {
            if (!mouseInsidePanel && searchPanel.classList.contains('active')) {
              closeSearchPanel();
            }
          }, 300);
        }
      });
    }
    
    // Load search index on initialization
    let indexLoadAttempts = 0;
    const maxLoadAttempts = 3;
    
    async function loadSearchIndexWithRetry() {
      try {
        await loadGlobalSearchIndex();
        // Search index loaded successfully
        
        if (globalSearchIndex.length === 0 && indexLoadAttempts < maxLoadAttempts) {
          indexLoadAttempts++;
          setTimeout(loadSearchIndexWithRetry, 500);
        }
      } catch (error) {
        // Error loading search index
        if (indexLoadAttempts < maxLoadAttempts) {
          indexLoadAttempts++;
          setTimeout(loadSearchIndexWithRetry, 500);
        }
      }
    }
    
    loadSearchIndexWithRetry();
  }
  
  // Expose for products.html "All Products" page
  window.loadGlobalSearchIndex = loadGlobalSearchIndex;
  window.getProductsForListing = function() {
    const list = [];
    for (let i = 0; i < globalSearchIndex.length; i++) {
      const p = globalSearchIndex[i];
      const { _titleLower, _searchText, ...rest } = p;
      list.push(rest);
    }
    return list;
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchPanel);
  } else {
    initSearchPanel();
  }
})();

// ============================================
// SLIDE PANEL - Dropdown Submenu Toggle
// ============================================
(function() {
  'use strict';
  
  function initSlidePanelSubmenus() {
    const slidePanel = document.getElementById('slidePanel');
    if (!slidePanel) return;
    
    // Get all menu items that have children (submenus)
    const menuItemsWithChildren = slidePanel.querySelectorAll('.slide-panel__item--has-children');
    
    menuItemsWithChildren.forEach(item => {
      const submenu = item.querySelector('.slide-panel__submenu');
      const link = item.querySelector('.slide-panel__link');
      
      if (!submenu || !link) return;
      
      /**
       * Toggle submenu on parent link click
       * IMPORTANT: This should NOT close the side panel
       */
      link.addEventListener('click', (e) => {
        // Prevent default navigation and stop event bubbling
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle active state
        const isActive = item.classList.contains('active');
        
        // Close other open submenus (optional - can be removed if you want multiple open)
        menuItemsWithChildren.forEach(otherItem => {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
          }
        });
        
        // Toggle current item
        if (isActive) {
          item.classList.remove('active');
        } else {
          item.classList.add('active');
        }
        
        // DO NOT close the side panel - let it stay open
      });
    });
    
    // Handle submenu item clicks - allow navigation but don't force panel close
    const submenuLinks = slidePanel.querySelectorAll('.slide-panel__sublink');
    submenuLinks.forEach(sublink => {
      sublink.addEventListener('click', (e) => {
        // Allow navigation to proceed naturally
        // Panel will close when page navigates or user moves mouse away
        // Don't force immediate close
      });
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSlidePanelSubmenus);
  } else {
    initSlidePanelSubmenus();
  }
})();

// ============================================
// SCROLL TO TOP BUTTON
// ============================================
(function() {
  'use strict';
  
  function initScrollToTop() {
    const scrollToTopBtn = document.getElementById('scrollToTop');
    
    if (!scrollToTopBtn) return;
    
    // Show/hide button based on scroll position
    function toggleScrollButton() {
      if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('visible');
      } else {
        scrollToTopBtn.classList.remove('visible');
      }
    }
    
    // Scroll to top function
    function scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // Event listeners
    scrollToTopBtn.addEventListener('click', scrollToTop);
    window.addEventListener('scroll', toggleScrollButton, { passive: true });
    
    // Check initial scroll position
    toggleScrollButton();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScrollToTop);
  } else {
    initScrollToTop();
  }
})();

// ============================================
// NEW HEADER - Hamburger Menu & Slide Panel
// ============================================
(function() {
  'use strict';
  
  function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const slidePanel = document.getElementById('slidePanel');
    const slidePanelClose = document.getElementById('slidePanelClose');
    const slidePanelOverlay = document.getElementById('slidePanelOverlay');
    
    if (!hamburgerBtn || !slidePanel) return;
    
    /**
     * Open the slide panel
     */
    function openPanel() {
      slidePanel.classList.add('active');
      hamburgerBtn.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close the slide panel
     */
    function closePanel() {
      slidePanel.classList.remove('active');
      hamburgerBtn.classList.remove('active');
      document.body.style.overflow = '';
    }
    
    /**
     * Toggle the slide panel
     */
    function togglePanel() {
      if (slidePanel.classList.contains('active')) {
        closePanel();
      } else {
        openPanel();
      }
    }
    
    // Hamburger button click
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });
    
    // Close button click
    if (slidePanelClose) {
      slidePanelClose.addEventListener('click', closePanel);
    }
    
    // Overlay click to close
    if (slidePanelOverlay) {
      slidePanelOverlay.addEventListener('click', closePanel);
    }
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && slidePanel.classList.contains('active')) {
        closePanel();
      }
    });
    
    // Mouse-based control: Keep panel open when mouse is inside panel
    // Panel should NOT close when clicking dropdown items
    const slidePanelContent = slidePanel.querySelector('.slide-panel__content');
    if (slidePanelContent) {
      let mouseInsidePanel = false;
      let closeTimeout;
      
      slidePanelContent.addEventListener('mouseenter', () => {
        mouseInsidePanel = true;
        clearTimeout(closeTimeout);
      });
      
      slidePanelContent.addEventListener('mouseleave', (e) => {
        // Check if mouse is moving to overlay (should close)
        const relatedTarget = e.relatedTarget;
        if (relatedTarget && relatedTarget.classList.contains('slide-panel__overlay')) {
          mouseInsidePanel = false;
          closePanel();
        } else {
          mouseInsidePanel = false;
          // Close panel when mouse leaves (with delay for smooth UX)
          closeTimeout = setTimeout(() => {
            if (!mouseInsidePanel && slidePanel.classList.contains('active')) {
              closePanel();
            }
          }, 300);
        }
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHamburgerMenu);
  } else {
    initHamburgerMenu();
  }
})();
