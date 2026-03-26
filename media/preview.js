// Markdown preview enhancer script
// This script is injected into the built-in Markdown preview
// Supports Obsidian-style [[filename]] syntax and enhances asset paths

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
        convertObsidianLinks();
        enhancePaths();
        observeDOMChanges();
    });

    /**
     * Convert Obsidian-style [[filename]] links to actual elements
     */
    function convertObsidianLinks() {
        // Find all text nodes that might contain Obsidian links
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        while (walker.nextNode()) {
            if (/\[\[[^\]]+\]\]/.test(walker.currentNode.textContent)) {
                textNodes.push(walker.currentNode);
            }
        }

        // Process each text node
        textNodes.forEach(node => {
            const text = node.textContent;
            const parent = node.parentNode;
            
            // Pattern: [[filename]] or [[filename|display text]]
            const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
            
            let lastIndex = 0;
            let match;
            const fragments = [];

            while ((match = pattern.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
                }

                const filename = match[1].trim();
                const displayText = match[2] ? match[2].trim() : filename;
                const ext = getExtension(filename);
                const isImage = isImageExtension(ext);

                if (isImage) {
                    // Create image element
                    const img = document.createElement('img');
                    img.setAttribute('src', `/assets/images/${filename}`);
                    img.setAttribute('alt', displayText);
                    img.setAttribute('data-obsidian-link', filename);
                    img.style.maxWidth = '100%';
                    img.style.height = 'auto';
                    img.style.borderRadius = '4px';
                    img.style.margin = '10px 0';
                    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    fragments.push(img);
                } else {
                    // Create link element
                    const link = document.createElement('a');
                    link.setAttribute('href', `/assets/files/${filename}`);
                    link.setAttribute('data-obsidian-link', filename);
                    link.textContent = displayText;
                    link.style.display = 'inline-flex';
                    link.style.alignItems = 'center';
                    link.style.padding = '4px 12px';
                    link.style.background = '#f6f8fa';
                    link.style.borderRadius = '4px';
                    link.style.border = '1px solid #e1e4e8';
                    link.style.color = '#0366d6';
                    link.style.textDecoration = 'none';
                    link.style.margin = '2px 0';
                    fragments.push(link);
                }

                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragments.push(document.createTextNode(text.substring(lastIndex)));
            }

            // Replace the original text node with fragments
            if (fragments.length > 0) {
                const fragment = document.createDocumentFragment();
                fragments.forEach(f => fragment.appendChild(f));
                parent.replaceChild(fragment, node);
            }
        });
    }

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
                        // Check for text nodes with Obsidian links
                        if (node.nodeType === Node.TEXT_NODE && /\[\[[^\]]+\]\]/.test(node.textContent)) {
                            convertObsidianLinks();
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
