// Products Array - Add your products here
const products = [];

// Image Source Validation - Prevent Google Drive URLs from being used as preview images
// Google Drive links should ONLY be used for downloads, NOT for preview images
function validateImageSource(imageSrc) {
  if (!imageSrc || typeof imageSrc !== 'string') {
    return null; // Invalid source
  }
  
  // Block any Google Drive URLs from being used as preview images
  if (imageSrc.includes('drive.google.com') || 
      imageSrc.includes('googleusercontent.com') ||
      imageSrc.includes('thumbnail?id=') ||
      imageSrc.includes('uc?export=view')) {
    console.warn('Google Drive URL detected in preview image source. Drive links should only be used for downloads, not previews:', imageSrc);
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
  
  console.warn('External URL detected in preview image source. Only local paths should be used for previews:', imageSrc);
  return null; // Block external URLs
}

// Security: Prevent Google Drive link crawling and prefetching
// This ensures Drive links are only used for downloads, not previews
(function preventDriveCrawling() {
  'use strict';
  
  // Block any attempts to prefetch or preload Drive URLs
  const originalFetch = window.fetch;
  if (originalFetch) {
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (url.includes('drive.google.com') || url.includes('googleusercontent.com'))) {
        console.warn('Blocked fetch request to Google Drive (Drive links should only be used for downloads):', url);
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
          console.warn('Blocked iframe creation with Google Drive URL (Drive links should only be used for downloads):', value);
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
                console.warn('Blocked Google Drive URL from being used as preview image:', img.dataset.src);
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
                console.warn('Blocked Google Drive URL from being used as preview image:', img.src);
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
  
  // Intersection Observer for data-src images (separate from optimizeImages)
  function initIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              // Preload for instant display
              const imageLoader = new Image();
              imageLoader.src = img.dataset.src;
              imageLoader.onload = () => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                // GPU acceleration for smooth rendering
                img.style.transform = 'translate3d(0, 0, 0)';
              };
              imageLoader.onerror = () => {
                img.removeAttribute('data-src');
              };
            }
            observer.unobserve(img);
          }
        });
      }, {
        rootMargin: '200px' // Start loading 200px earlier for 120fps instant display
      });
      
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  }
  
  // Optimized debounce function for performance
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  // 120fps Optimized Throttle - Uses requestAnimationFrame for smooth performance
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
  
  // 120fps Smooth Scroll - Uses requestAnimationFrame for ultra-smooth scrolling
  function smoothScrollTo(element, offset = 0) {
    if (!element) return;
    
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset + offset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = Math.min(Math.abs(distance) * 0.5, 600); // Cap at 600ms
    let startTime = null;
    
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    }
    
    requestAnimationFrame(animation);
  }
  
  // 120fps Optimized: Batch DOM reads/writes to prevent layout thrashing
  const domUpdateQueue = [];
  let rafScheduled = false;
  
  function batchDOMUpdate(callback) {
    domUpdateQueue.push(callback);
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(() => {
        // Batch all reads first
        const reads = domUpdateQueue.filter(fn => fn.type === 'read');
        reads.forEach(fn => fn());
        
        // Then batch all writes
        const writes = domUpdateQueue.filter(fn => fn.type === 'write');
        writes.forEach(fn => fn());
        
        domUpdateQueue.length = 0;
        rafScheduled = false;
      });
    }
  }
  
  // Global Search Functionality - Optimized
  function initGlobalSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

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
        // Fallback to global scope
        try {
          const globalData = eval(globalVar);
          if (globalData && Array.isArray(globalData) && globalData.length > 0) {
            cachedPageData = { data: globalData, type: item.type, detailPage: item.detailPage };
            return cachedPageData;
          }
        } catch (e) {
          // Variable doesn't exist, continue
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

    // Show search unavailable message
    function showSearchUnavailable() {
      const grid = document.getElementById('productsGrid');
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

    // Optimized update listing page with search results
    function updateListingPageWithSearch(results, pageData) {
      let grid = document.getElementById('productsGrid');
      
      // If on homepage and no grid, show search results section
      const isHomepage = document.body.classList.contains('homepage') || 
                         window.location.pathname === '/' || 
                         window.location.pathname.endsWith('index.html');
      
      if (!grid && isHomepage) {
        const searchResultsSection = document.getElementById('searchResultsSection');
        const featuredSection = document.getElementById('featuredSection');
        
        if (searchResultsSection) {
          searchResultsSection.style.display = 'block';
          grid = document.getElementById('productsGrid');
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
      const productCountElement = document.getElementById('productCount') || document.getElementById('searchResultsCount');
      const paginationElement = document.getElementById('pagination');
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
        const cardMiddle2 = '"><div class="product-image-wrapper"><img src="';
        const cardMiddle3 = '" alt="';
        const cardMiddle4 = '" class="product-image" width="400" height="300" loading="lazy" decoding="async" onerror="this.src=\'' + imageFallback + '\'"></div><div class="product-info"><h3 class="product-title">';
        const cardEnd = '</h3></div></div>';

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
            window.open(card.dataset.detailPage + '?id=' + card.dataset.productId, '_blank', 'noopener,noreferrer');
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
    const logo = document.querySelector('.logo');
    if (logo && logo.src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = logo.src;
      document.head.appendChild(link);
    }
  }
  
  // Expandable Search for 1366×768 and iPad - Premium Animation
  function initExpandableSearch() {
    const searchWrapper = document.querySelector('.search-bar-wrapper');
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.querySelector('.search-container');
    
    if (!searchWrapper || !searchInput || !searchContainer) return;
    
    // Check if we're in expandable search range (iPad, or Mobile)
    function checkScreenSize() {
      const isiPad = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      return isiPad || isMobile;
    }
    
    if (!checkScreenSize()) return; // Only for expandable search enabled resolutions
    
    // Click on search container to expand - Ultra-smooth 60fps animation
    searchContainer.addEventListener('click', (e) => {
      if (!searchWrapper.classList.contains('expanded')) {
        e.stopPropagation();
        // Use double RAF for guaranteed smooth animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            searchWrapper.classList.add('expanded');
            // Force GPU layer
            searchWrapper.style.willChange = 'width, padding, border-radius';
            // Focus after animation starts
            requestAnimationFrame(() => {
              searchInput.focus();
            });
          });
        });
      }
    });
    
    // Clean up will-change after animation completes
    const transitionDuration = 400; // Match CSS transition duration
    searchWrapper.addEventListener('transitionend', () => {
      searchWrapper.style.willChange = 'auto';
    }, { once: false });
    
    // Click outside to collapse
    document.addEventListener('click', (e) => {
      if (searchWrapper.classList.contains('expanded') && 
          !searchContainer.contains(e.target) && 
          !searchInput.value.trim()) {
        searchWrapper.classList.remove('expanded');
        searchInput.blur();
      }
    });
    
    // Keep expanded if input has value
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim()) {
        searchWrapper.classList.add('expanded');
      }
    });
    
    // Escape key to collapse
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !searchInput.value.trim()) {
        searchWrapper.classList.remove('expanded');
        searchInput.blur();
      }
    });
    
    // Handle window resize - Optimized with passive listener and RAF
    const throttledResize = throttle(() => {
      if (!checkScreenSize() && searchWrapper.classList.contains('expanded')) {
        requestAnimationFrame(() => {
          searchWrapper.classList.remove('expanded');
        });
      }
    }, 150);
    window.addEventListener('resize', throttledResize, { passive: true });
  }
  
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
  
  // Initialize optimizations - Optimized loading strategy
  function init() {
    // Use requestIdleCallback for non-critical optimizations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        optimizeImages();
        initIntersectionObserver();
        preloadCriticalResources();
      }, { timeout: 2000 });
    } else {
      // Fallback for older browsers - use setTimeout
      setTimeout(() => {
        optimizeImages();
        initIntersectionObserver();
        preloadCriticalResources();
      }, 100);
    }
    
    // Critical features - load immediately
    initMobileMenu();
    initExpandableSearch();
    
    // Initialize search after a small delay to ensure data files are loaded
    setTimeout(() => {
      initGlobalSearch();
    }, 100);
  }
  
  // Optimized DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // Use RAF to ensure DOM is fully ready
    requestAnimationFrame(init);
  }
  
  // Performance monitoring (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', () => {
      if ('performance' in window) {
        const perfData = performance.getEntriesByType('navigation')[0];
        // Performance logging removed for production
        // Uncomment for debugging:
        // console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
        // console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.fetchStart, 'ms');
      }
    });
  }
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
    // Keep animation running but don't restart
    const bgElement = document.querySelector('body::before');
    if (bgElement) {
      bgElement.style.animationPlayState = 'running';
    }
  }
  
  // Search Icon Click Animation (Homepage)
  function initHomepageSearch() {
    const searchIconBtn = document.getElementById('searchIconBtn');
    const searchBarWrapper = document.getElementById('searchBarWrapper');
    const searchInput = document.getElementById('searchInput');
    
    if (!searchIconBtn || !searchBarWrapper) return;
    
    searchIconBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      searchBarWrapper.classList.add('active');
      setTimeout(() => {
        if (searchInput) searchInput.focus();
      }, 200);
    });
    
    // Close search when clicking outside
    document.addEventListener('click', function(e) {
      if (!searchBarWrapper.contains(e.target) && !searchIconBtn.contains(e.target)) {
        if (searchInput && !searchInput.value.trim()) {
          searchBarWrapper.classList.remove('active');
        }
      }
    });
    
    // Close on Escape key
    if (searchInput) {
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !this.value.trim()) {
          searchBarWrapper.classList.remove('active');
        }
      });
    }
  }
  
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
        <div class="featured-card" onclick="window.open('${detailPage}?id=${product.id}', '_blank', 'noopener,noreferrer')">
          <img src="${imagePath}" alt="${product.title}" class="featured-card-image" width="400" height="300" ${loadingAttr} decoding="async" onerror="this.style.opacity='0.3'; console.error('Image failed to load:', this.src);">
          <div class="featured-card-info">
            <h3 class="featured-card-title">${product.title}</h3>
            <div class="featured-card-meta">
              <span class="featured-card-tag">${software}</span>
              <div class="featured-card-rating">
                <span>⭐ 4.8</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
  
  // Initialize YouTube video link functionality
  function initVideoFullscreen() {
    // Video wrapper is now a link, no JavaScript needed
    // Link opens YouTube in new tab automatically
  }
  
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
    
    // Optimized: Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    
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
        <div class="slider-product-card" onclick="window.open('${detailPage}?id=${product.id}', '_blank', 'noopener,noreferrer')">
          <div class="slider-product-card-image-wrapper">
            <img src="${imagePath}" alt="${escapedTitle}" class="slider-product-card-image" width="300" height="200" loading="lazy" decoding="async" onerror="this.style.opacity='0.3'; console.error('Image failed to load:', this.src);">
            <span class="slider-product-card-new-badge">New</span>
          </div>
          <div class="slider-product-card-info">
            <h3 class="slider-product-card-title">${escapedTitle}</h3>
            <span class="slider-product-card-tag">${source}</span>
          </div>
        </div>
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
      initHomepageSearch();
      initVideoFullscreen();
      
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
    // - Blender/3d Models/...
    // - Unreal/3d modles/...  (note: "modles" is intentionally kept as-is)
    const normalizeKnownSegments = (segment) => {
      const s = String(segment);
      const lower = s.toLowerCase();
      if (lower === '3d models') return '3d Models';
      if (lower === '3d modles') return '3d modles';
      return s;
    };
    
    // URL encode spaces and special characters in path segments
    // Split path, encode each segment, then rejoin
    const pathParts = imagePath.split('/').map(normalizeKnownSegments);
    const encodedParts = pathParts.map(part => {
      // Don't encode if already encoded or if it's a relative path marker
      if (part === '..' || part === '.' || part === '') return part;
      // Avoid double-encoding (e.g. "My%20Folder" should stay as-is)
      if (/%[0-9A-Fa-f]{2}/.test(part)) return part;
      // Encode spaces and special characters but preserve slashes
      return encodeURIComponent(part).replace(/%2F/g, '/');
    });
    
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
    
    // Remove existing ../ prefixes to get clean path relative to root
    let cleanPath = normalizedPath;
    while (cleanPath.startsWith('../')) {
      cleanPath = cleanPath.substring(3);
    }
    
    // Add correct number of ../ based on current depth
    if (depth > 0) {
      return '../'.repeat(depth) + cleanPath;
    }
    
    // At root level, return path as-is (relative to root)
    return cleanPath;
  }
  
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
    if (membershipProductsData && Array.isArray(membershipProductsData)) {
      membershipProductsData.forEach(item => {
        products.push({
          ...item,
          category: 'Software',
          type: 'Membership',
          searchUrl: `Membership/membership.html#product-${item.id}`,
          detailUrl: `Membership/membership-detail.html?id=${item.id}`,
          image: item.image // Store original path, fix at render time
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
  
  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
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
    
    // Limit cache size
    if (searchCache.size > 50) {
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
    searchCache.set(normalizedQuery, finalResults);
    return finalResults;
  }
  
  // Render search results - Enhanced with premium UI
  function renderSearchResults(results, query) {
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
  
  // Initialize global search
  function initGlobalSearch() {
    const searchContainer = document.getElementById('globalSearchContainer');
    const searchWrapper = document.getElementById('globalSearchWrapper');
    const searchInput = document.getElementById('globalSearchInput');
    const searchDropdown = document.getElementById('globalSearchDropdown');
    const searchIconMobile = document.getElementById('searchIconBtnMobile');
    
    if (!searchContainer || !searchInput || !searchDropdown) return;
    
    let isOpen = false;
    
    // Load search index with retry logic
    let indexLoadAttempts = 0;
    const maxLoadAttempts = 3;
    
    async function loadSearchIndexWithRetry() {
      try {
        await loadGlobalSearchIndex();
        console.log(`Global search index loaded: ${globalSearchIndex.length} products`);
        
        // If index is still empty after loading, wait a bit and retry
        if (globalSearchIndex.length === 0 && indexLoadAttempts < maxLoadAttempts) {
          indexLoadAttempts++;
          setTimeout(loadSearchIndexWithRetry, 500);
        }
      } catch (error) {
        console.warn('Error loading search index:', error);
        if (indexLoadAttempts < maxLoadAttempts) {
          indexLoadAttempts++;
          setTimeout(loadSearchIndexWithRetry, 500);
        }
      }
    }
    
    loadSearchIndexWithRetry();
    
    // Show dropdown
    function showDropdown() {
      if (!isOpen && searchInput.value.trim().length > 0) {
        searchDropdown.classList.add('active');
        isOpen = true;
      }
    }
    
    // Hide dropdown
    function hideDropdown() {
      searchDropdown.classList.remove('active');
      isOpen = false;
    }
    
    // Perform search and update UI - Enhanced with performance optimizations
    let searchTimeout;
    const performSearch = debounce(async () => {
      const query = searchInput.value.trim();
      
      if (query.length === 0) {
        hideDropdown();
        return;
      }
      
      // Show loading state (optional - can add spinner)
      if (globalSearchIndex.length === 0) {
        await loadGlobalSearchIndex();
      }
      
      // Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => {
        const results = performGlobalSearch(query);
        renderSearchResults(results, query);
        showDropdown();
      });
    }, DEBOUNCE_DELAY);
    
    // Input event
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length > 0) {
        performSearch();
      } else {
        hideDropdown();
      }
    });
    
    // Focus event
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length > 0) {
        performSearch();
      }
    });
    
    // Enhanced keyboard navigation
    let selectedIndex = -1;
    const getResultItems = () => resultsList.querySelectorAll('.search-result-item');
    
    searchInput.addEventListener('keydown', (e) => {
      const items = getResultItems();
      
      if (e.key === 'Escape') {
        hideDropdown();
        searchInput.blur();
        selectedIndex = -1;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          items[selectedIndex].click();
        } else {
          const query = searchInput.value.trim();
          if (query.length > 0) {
            const searchPageUrl = `products.html?search=${encodeURIComponent(query)}`;
            window.location.href = getLinkPath(searchPageUrl);
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          if (selectedIndex >= 0) {
            items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          items.forEach((item, idx) => {
            item.classList.toggle('selected', idx === selectedIndex);
          });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          selectedIndex = Math.max(selectedIndex - 1, -1);
          if (selectedIndex >= 0) {
            items[selectedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          items.forEach((item, idx) => {
            item.classList.toggle('selected', idx === selectedIndex);
          });
        }
      }
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!searchContainer.contains(e.target)) {
        hideDropdown();
        selectedIndex = -1;
      }
    });
    
    // Enhanced mobile search icon toggle
    if (searchIconMobile) {
      searchIconMobile.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = searchWrapper.classList.contains('mobile-active');
        if (isActive) {
          searchWrapper.classList.remove('mobile-active');
          searchInput.blur();
          hideDropdown();
        } else {
          searchWrapper.classList.add('mobile-active');
          setTimeout(() => searchInput.focus(), 100);
        }
      });
      
      // Close mobile search when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target) && !searchIconMobile.contains(e.target)) {
          searchWrapper.classList.remove('mobile-active');
        }
      });
    }
    
    // Reset selection when new results are rendered
    const originalRenderSearchResults = renderSearchResults;
    renderSearchResults = function(results, query) {
      selectedIndex = -1;
      originalRenderSearchResults(results, query);
    };
    
    // Expose search functions globally for debugging (optional)
    window.globalSearchDebug = {
      getIndexSize: () => globalSearchIndex.length,
      search: (query) => performGlobalSearch(query),
      reloadIndex: async () => {
        globalSearchIndex = [];
        searchCache.clear();
        await loadGlobalSearchIndex();
        return globalSearchIndex.length;
      }
    };
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalSearch);
  } else {
    initGlobalSearch();
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
