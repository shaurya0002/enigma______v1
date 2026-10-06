// ============================================
// Events Page - Filter Functionality
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Preload all event images immediately for faster display
    const eventImages = [
        // Literary
        'assets/new_events/open_mic.jpg', // Open Mic
        // Theatre
        'assets/new_events/nukad-natak.png', // Dramatics
        // Sports
        'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&q=80', // Chess
        // Creative
        'assets/new_events/face_art.jpg', // Face Painting
        'assets/new_events/painting.jpg', // Canvas Painting
        'assets/new_events/mehandi.jpg', // Mehndi Art
        'assets/new_events/rangoli.jpg', // Rangoli
        'assets/new_events/Roadies.jpg', // Roadies
        'assets/new_events/treasure_hunt.jpg', // Treasure Hunt
        // Online Events
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80', // Bug Brawl
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80', // Web Die
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80', // Gamers Arena
        // Fashion
        'assets/new_events/fashion_show.jpg', // Fashion Show
        // Dance
        'assets/new_events/dance.png', // Dance
        // Music
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80', // Singing
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80'  // Instrumental
    ];
    
    // Preload images in parallel - start loading immediately
    eventImages.forEach((url, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            console.log(`✅ Event image ${index + 1} preloaded`);
        };
        img.onerror = function() {
            console.warn(`⚠️ Failed to preload image ${index + 1}:`, url);
        };
        img.src = url;
    });
    
    // Category Filter Functionality
    const eventCards = document.querySelectorAll('.event-card');
    const filterButtons = document.querySelectorAll('.filter-btn');

    function filterEvents(category) {
        const catLower = (category || 'all').toLowerCase();
        
        eventCards.forEach(card => {
            const cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
            if (catLower === 'all' || cardCategory === catLower) {
                card.classList.add('visible');
                card.style.display = 'block';
            } else {
                card.classList.remove('visible');
                card.style.display = 'none';
            }
        });

        // Update active state on filter buttons
        filterButtons.forEach(btn => {
            const btnFilter = (btn.getAttribute('data-filter') || '').toLowerCase();
            if (btnFilter === catLower) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Attach click listeners to filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');
            filterEvents(filterValue);
            
            // Update URL search query without page reload
            const url = new URL(window.location);
            if (filterValue && filterValue !== 'all') {
                url.searchParams.set('category', filterValue);
            } else {
                url.searchParams.delete('category');
            }
            window.history.replaceState({}, '', url);
        });
    });

    // Read category from URL query param on initial load (e.g. events.html?category=dance)
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category');
    if (initialCategory) {
        filterEvents(initialCategory);
    } else {
        filterEvents('all');
    }
    
    // Function to load an image
    function loadEventImage(img) {
        if (!img || !img.hasAttribute('data-src')) return;
        
        const dataSrc = img.getAttribute('data-src');
        if (!dataSrc || img.src) return; // Already loaded
        
        const newImg = new Image();
        newImg.decoding = 'async';
        
        newImg.onload = function() {
            img.src = dataSrc;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
            img.closest('.event-image')?.classList.add('image-loaded');
            
            // Remove loading state
            const eventImage = img.closest('.event-image');
            if (eventImage) {
                eventImage.classList.remove('image-loading');
            }
        };
        
        newImg.onerror = function() {
            console.warn('Failed to load image:', dataSrc);
            img.removeAttribute('data-src');
            img.style.display = 'none';
            const eventImage = img.closest('.event-image');
            if (eventImage) {
                eventImage.classList.remove('image-loading');
                eventImage.classList.add('image-error');
            }
        };
        
        // Mark as loading
        const eventImage = img.closest('.event-image');
        if (eventImage) {
            eventImage.classList.add('image-loading');
        }
        
        newImg.src = dataSrc;
    }
    
    // Advanced lazy loading for event images with priority loading
    const eventImageElements = document.querySelectorAll('.event-image img[data-src]');
    
    // Preload first 6 visible images immediately (above the fold)
    const preloadCount = Math.min(6, eventImageElements.length);
    for (let i = 0; i < preloadCount; i++) {
        const img = eventImageElements[i];
        if (img && img.hasAttribute('data-src')) {
            loadEventImage(img);
        }
    }
    
    // Lazy load remaining images with IntersectionObserver
    if ('IntersectionObserver' in window && eventImageElements.length > preloadCount) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img && img.hasAttribute('data-src')) {
                        loadEventImage(img);
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px', // Start loading 50px before image is visible
            threshold: 0.01 // Trigger when 1% of image is visible
        });
        
        // Observe remaining images (skip first 6)
        for (let i = preloadCount; i < eventImageElements.length; i++) {
            const img = eventImageElements[i];
            if (img && img.hasAttribute('data-src')) {
                imageObserver.observe(img);
            }
        }
    } else {
        // Fallback: Load all remaining images immediately
        for (let i = preloadCount; i < eventImageElements.length; i++) {
            const img = eventImageElements[i];
            if (img && img.hasAttribute('data-src')) {
                loadEventImage(img);
            }
        }
    }
    
    // Also load images when they become visible after initial load
    setTimeout(() => {
        const allEventImages = document.querySelectorAll('.event-image img[data-src]');
        allEventImages.forEach(img => {
            if (img && img.hasAttribute('data-src')) {
                const card = img.closest('.event-card');
                if (card && card.style.display !== 'none' && card.classList.contains('visible')) {
                    loadEventImage(img);
                }
            }
        });
    }, 100);
});





