(function () {
    'use strict';

    // Calculate years of experience (no document.write)
    var yearsExp = new Date().getFullYear() - 2007;
    var yearsEl = document.getElementById('years-exp');
    var yearsAboutEl = document.getElementById('years-exp-about');
    var yearsStatEl = document.getElementById('years-exp-stat');
    var footerYearEl = document.getElementById('footer-year');
    if (yearsEl) yearsEl.textContent = yearsExp;
    if (yearsAboutEl) yearsAboutEl.textContent = yearsExp;
    if (yearsStatEl) yearsStatEl.textContent = yearsExp;
    if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

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

    // Active nav link highlighting on scroll
    var sections = document.querySelectorAll('main section[id]');
    if (sections.length) {
        function highlightNav() {
            var scrollPos = window.scrollY + 120;
            sections.forEach(function (section) {
                var top = section.offsetTop;
                var height = section.offsetHeight;
                var id = section.getAttribute('id');
                var link = document.querySelector('#navbarNav .nav-link[href="#' + id + '"]');
                if (link) {
                    if (scrollPos >= top && scrollPos < top + height) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'true');
                    } else {
                        link.classList.remove('active');
                        link.removeAttribute('aria-current');
                    }
                }
            });
        }
        highlightNav();
        window.addEventListener('scroll', highlightNav);
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
                    var img = document.getElementById('whatever');
                    img.src = 'img/deal.png';
                    img.alt = 'Christian Rios with sunglasses - Deal with it';
                }
                clicks = [];
            }
        });
    }
})();
