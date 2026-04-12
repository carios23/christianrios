/*!
 * Freelancer Theme - Vanilla JS (Bootstrap 5)
 */

(function () {
    'use strict';

    // Navbar shrink on scroll
    var navbar = document.querySelector('#mainNav');
    if (navbar) {
        var navbarShrink = function () {
            if (window.scrollY > 100) {
                navbar.classList.add('navbar-shrink');
            } else {
                navbar.classList.remove('navbar-shrink');
            }
        };
        navbarShrink();
        document.addEventListener('scroll', navbarShrink);
    }

    // Smooth scroll for nav links
    document.querySelectorAll('#mainNav a.nav-link, .page-scroll a, a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var target = document.querySelector(this.getAttribute('href'));
            if (target && !this.getAttribute('data-bs-toggle')) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Close responsive menu on nav link click
    var navbarCollapse = document.querySelector('#navbarResponsive');
    if (navbarCollapse) {
        var bsCollapse = bootstrap.Collapse.getOrCreateInstance(navbarCollapse, { toggle: false });
        document.querySelectorAll('#navbarResponsive .nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.getComputedStyle(document.querySelector('.navbar-toggler')).display !== 'none') {
                    bsCollapse.hide();
                }
            });
        });
    }

    // Triple-click easter egg on profile photo
    var profilePhoto = document.getElementById('profilephoto');
    if (profilePhoto) {
        var minClickInterval = 100;
        var maxClickInterval = 500;
        var minPercentThird = 85.0;
        var maxPercentThird = 130.0;
        var hasOne = false;
        var hasTwo = false;
        var time = [0, 0, 0];
        var diff = [0, 0];

        var clearRuntime = function () {
            hasOne = false;
            hasTwo = false;
            time[0] = 0;
            time[1] = 0;
            time[2] = 0;
            diff[0] = 0;
            diff[1] = 0;
        };

        profilePhoto.addEventListener('click', function () {
            var now = Date.now();

            if (time[1] && now - time[1] >= maxClickInterval) clearRuntime();
            if (time[0] && time[1] && now - time[0] >= maxClickInterval) clearRuntime();

            if (hasTwo) {
                time[2] = Date.now();
                diff[1] = time[2] - time[1];
                var deltaPercent = 100.0 * (diff[1] / diff[0]);
                if (deltaPercent >= minPercentThird && deltaPercent <= maxPercentThird) {
                    document.getElementById('whatever').src = 'img/deal.png';
                }
                clearRuntime();
            } else if (!hasOne) {
                hasOne = true;
                time[0] = Date.now();
            } else if (hasOne) {
                time[1] = Date.now();
                diff[0] = time[1] - time[0];
                hasTwo = (diff[0] >= minClickInterval && diff[0] <= maxClickInterval);
                if (!hasTwo) clearRuntime();
            }
        });
    }
})();
