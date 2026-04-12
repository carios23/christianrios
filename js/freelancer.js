(function () {
    'use strict';

    // Navbar shrink on scroll
    var navbar = document.getElementById('mainNav');
    if (navbar) {
        function navbarShrink() {
            navbar.classList.toggle('navbar-shrink', window.scrollY > 50);
        }
        navbarShrink();
        window.addEventListener('scroll', navbarShrink);
    }

    // Close mobile menu on link click
    var navCollapse = document.getElementById('navbarNav');
    if (navCollapse) {
        var bsCollapse = bootstrap.Collapse.getOrCreateInstance(navCollapse, { toggle: false });
        document.querySelectorAll('#navbarNav .nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth < 992) bsCollapse.hide();
            });
        });
    }

    // Triple-click easter egg
    var photo = document.getElementById('profilephoto');
    if (photo) {
        var clicks = [], maxGap = 500;
        photo.addEventListener('click', function () {
            var now = Date.now();
            clicks.push(now);
            if (clicks.length > 3) clicks.shift();
            if (clicks.length === 3) {
                var d1 = clicks[1] - clicks[0], d2 = clicks[2] - clicks[1];
                if (d1 >= 100 && d1 <= maxGap && d2 >= 100 && d2 <= maxGap) {
                    document.getElementById('whatever').src = 'img/deal.png';
                }
                clicks = [];
            }
        });
    }
})();
