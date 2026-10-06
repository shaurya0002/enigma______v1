// ============================================
// Main JavaScript - Initialization & Utilities
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    console.log('ENIGMA XIII - Website Initialized');
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    const header = document.querySelector('.header');
                    const headerHeight = header ? header.offsetHeight : 0;
                    const targetPosition = target.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Hero Video Autoplay & Compatibility Controller
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        // Force muted inline autoplay
        heroVideo.muted = true;
        heroVideo.defaultMuted = true;
        
        const tryPlayVideo = function() {
            const playPromise = heroVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(function(error) {
                    console.log('Autoplay deferred until user interaction:', error);
                });
            }
        };

        tryPlayVideo();

        heroVideo.addEventListener('loadedmetadata', tryPlayVideo);
        heroVideo.addEventListener('canplay', tryPlayVideo);

        // Mobile fallback: First touch or scroll kicks off playback if OS deferred it
        const startOnInteraction = function() {
            if (heroVideo.paused) {
                heroVideo.play().catch(function() {});
            }
            window.removeEventListener('touchstart', startOnInteraction);
            window.removeEventListener('click', startOnInteraction);
            window.removeEventListener('scroll', startOnInteraction);
        };

        window.addEventListener('touchstart', startOnInteraction, { passive: true, once: true });
        window.addEventListener('click', startOnInteraction, { once: true });
        window.addEventListener('scroll', startOnInteraction, { passive: true, once: true });
    }
    
    // Keyboard navigation for mobile menu
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuToggle) {
        menuToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                menuToggle.click();
            }
        });
    }
    
    // Close mobile menu on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            if (menuToggle) {
                menuToggle.classList.remove('active');
            }
            document.body.style.overflow = '';
        }
    });
    
    // Optimized lazy load images with better performance
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        // Use Image object for better loading control
                        const newImg = new Image();
                        newImg.decoding = 'async';
                        newImg.onload = function() {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                            img.classList.add('loaded');
                        };
                        newImg.onerror = function() {
                            img.removeAttribute('data-src');
                            img.style.display = 'none';
                        };
                        newImg.src = img.dataset.src;
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px', // Start loading 50px before visible
            threshold: 0.01
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
});


