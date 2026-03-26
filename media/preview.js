// Markdown preview enhancer script
// This script is injected into the built-in Markdown preview
// to transform image/file paths to load from assets directory

(function() {
    'use strict';

    // Image file extensions
    const IMAGE_EXTENSIONS = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'apng'
    ]);

    // Check if extension is an image
    function isImageExtension(ext) {
        return IMAGE_EXTENSIONS.has(ext.toLowerCase());
    }

    // Get file extension from filename
    function getExtension(filename) {
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    // Check if a URL is absolute
    function isAbsoluteUrl(url) {
        return url.startsWith('http://') || 
               url.startsWith('https://') || 
               url.startsWith('file://') ||
               url.startsWith('/');
    }

    // Check if path looks like a hash filename (32 char hex)
    function isHashFilename(filename) {
        const name = filename.split('.')[0];
        return /^[a-f0-9]{32}$/i.test(name);
    }

    // Resolve the correct path for a filename
    function resolveAssetPath(filename) {
        const ext = getExtension(filename);
        if (isImageExtension(ext)) {
            return `/assets/images/${filename}`;
        } else {
            return `/assets/files/${filename}`;
        }
    }

    // Wait for DOM to be ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(function() {
        enhancePaths();
        observeDOMChanges();
    });

    /**
     * Enhance image and link paths to load from assets directory
     */
    function enhancePaths() {
        // Process images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !isAbsoluteUrl(src) && !src.startsWith('data:')) {
                // Check if it's just a filename (hash-named)
                if (isHashFilename(src) || !src.includes('/')) {
                    const ext = getExtension(src);
                    if (isImageExtension(ext)) {
                        const newPath = `/assets/images/${src}`;
                        img.setAttribute('src', newPath);
                        img.setAttribute('data-original-src', src);
                    }
                }
            }
        });

        // Process links
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !isAbsoluteUrl(href) && !href.startsWith('#')) {
                // Check if it's just a filename (hash-named)
                if (isHashFilename(href) || !href.includes('/')) {
                    const ext = getExtension(href);
                    if (ext && !isImageExtension(ext)) {
                        const newPath = `/assets/files/${href}`;
                        link.setAttribute('href', newPath);
                        link.setAttribute('data-original-href', href);
                    }
                }
            }
        });
    }

    /**
     * Observe DOM changes to enhance dynamically added elements
     */
    function observeDOMChanges() {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeName === 'IMG' || node.nodeName === 'A') {
                            enhancePaths();
                        } else if (node.querySelectorAll) {
                            const images = node.querySelectorAll('img');
                            const links = node.querySelectorAll('a[href]');
                            if (images.length > 0 || links.length > 0) {
                                enhancePaths();
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Handle image load errors - try to resolve from assets
    document.addEventListener('error', function(e) {
        if (e.target && e.target.nodeName === 'IMG') {
            const img = e.target;
            const src = img.getAttribute('src');
            
            if (src && !isAbsoluteUrl(src) && !src.startsWith('data:')) {
                // Try to resolve the correct path
                const filename = src.split('/').pop();
                const ext = getExtension(filename);
                
                if (isImageExtension(ext)) {
                    const assetPath = `/assets/images/${filename}`;
                    if (src !== assetPath) {
                        img.setAttribute('src', assetPath);
                    }
                }
            }
        }
    }, true);
})();
