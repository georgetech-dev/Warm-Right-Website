// assets/js/admin-include.js

window.loadAdminHeader = async function(session) {
    const container = document.getElementById('admin-header-container');
    if (!container) return;

    try {
        const currentFile = window.location.pathname.split('/').pop();
        if (!['login.html', 'reset-password.html'].includes(currentFile)) {
            const isAdmin = await window.requireRole(['admin'], { silentRedirect: true });
            if (!isAdmin) return;
        }

        // 1. Calculate the absolute site root path dynamically for GitHub Pages compatibility
        const siteRoot = getAdminSiteRoot();
        const partialsPath = siteRoot + "partials/";

        // Fetch using the absolute root path to avoid relative directory errors
        const response = await fetch(partialsPath + 'admin-header.html?v=20260625nav', { cache: 'no-store' });
        const html = await response.text();
        container.innerHTML = html;

        // 2. Scan and repair all links/images inside the layout fragment to work on GitHub Pages
        fixAdminInjectedPaths(container, siteRoot);

        // 3. SET PAGE TITLE
        const titleEl = document.getElementById('nav-page-title');
        if (titleEl) titleEl.textContent = window.adminPageTitle || "Admin";

        // 3b. SECTION-SPECIFIC CHILD NAV
        // Uses the original admin-tab-strip styling so only one child navigation is shown.
        renderAdminSectionNav();

        // 4. SET USER DATA & AVATAR
        if (session && session.user) {
            const meta = session.user.user_metadata;
            const nameEl = document.getElementById('nav-display-name');
            const imgEl = document.getElementById('nav-avatar-img');
            
            if (nameEl) nameEl.textContent = meta.display_name || "Admin";
            
            if (imgEl) {
                // Ensure the avatar path honors the GitHub Pages siteRoot directory subfolder
                let avatarUrl = meta.avatar_url || "assets/images/avatar-default.avif";
                if (!avatarUrl.startsWith('http')) {
                    const cleanAvatar = avatarUrl.replace(/^(\.\.\/|\.\/|\/)+/, '');
                    imgEl.src = siteRoot + cleanAvatar;
                } else {
                    imgEl.src = avatarUrl;
                }
            }
        }

        // 5. DROPDOWN TOGGLE
        const hubBtn = document.getElementById('nav-hub-btn');
        if (hubBtn) {
            hubBtn.onclick = () => {
                window.location.href = getAdminUrl('admin-landed.html');
            };
        }

        const trigger = document.getElementById('nav-drop-trigger');
        const menu = document.getElementById('nav-drop-menu');
        if (trigger && menu) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            };
            document.addEventListener('click', () => menu.style.display = 'none');
        }

        // 6. LOGOUT BUTTON
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                if (typeof window.isAppOnline !== 'undefined' && !window.isAppOnline) {
                    alert("⚠️ You cannot log out while in Offline Mode. Please reconnect to the internet first.");
                    return;
                }

                if (window.db) {
                    await window.db.auth.signOut();
                    window.location.href = getAdminUrl('login.html');
                }
            };
        }
    } catch (err) {
        console.error("Critical Nav Error:", err);
    }
};

// --- Load Admin Footer ---
window.loadAdminFooter = async function() {
    const container = document.getElementById('admin-footer-container');
    if (!container) return; 

    try {
        const siteRoot = getAdminSiteRoot();
        const partialsPath = siteRoot + "partials/";

        const response = await fetch(partialsPath + 'admin-footer.html?v=20260614c', { cache: 'no-store' });
        const html = await response.text();
        container.innerHTML = html;

        // Scan and repair footer links/images
        fixAdminInjectedPaths(container, siteRoot);
    } catch (err) {
        console.error("Critical Footer Error:", err);
    }
};

// --- PATH CONVERTER UTILITY ---
// Strips relative markers and forces structural absolute directory maps
function fixAdminInjectedPaths(container, root) {
    container.querySelectorAll('a, img').forEach(el => {
        const attr = el.tagName === 'A' ? 'href' : 'src';
        let val = el.getAttribute(attr);
        if (val && !val.startsWith('http') && !val.startsWith('tel:') && !val.startsWith('mailto:') && !val.startsWith('#')) {
            const cleanVal = val.replace(/^(\.\.\/|\.\/|\/)+/, '');
            el.setAttribute(attr, root + cleanVal);
        }
    });
}

function getAdminSiteRoot() {
    return window.location.hostname.includes("github.io") ? "/warm/" : "/";
}

function getAdminUrl(page) {
    const cleanPage = String(page || '').replace(/^(\.\.\/|\.\/|\/)+/, '');
    if (cleanPage.startsWith('admin/')) return getAdminSiteRoot() + cleanPage;
    return getAdminSiteRoot() + "admin/" + cleanPage;
}

async function waitForAdminDb(maxAttempts = 40) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (window.db && window.db.auth) return window.db;
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    return null;
}

window.getCurrentUserRole = async function() {
    const db = await waitForAdminDb();
    if (!db) return null;

    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) {
        console.error("Unable to resolve current user for role lookup.", userError);
        return null;
    }

    const { data, error } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) {
        console.error("Unable to resolve user role from user_roles.", error);
        return null;
    }

    return data?.role || null;
};

const adminSectionNavDefinitions = [
    {
        key: 'importer',
        title: 'Importer',
        overviewHash: 'tab-jobs',
        ariaLabel: 'Importer tools',
        pages: [
            { file: 'sed_importer.html', path: 'jobs/sed_importer.html', label: 'Sedgwick Import' },
            { file: 'res_importer.html', path: 'jobs/res_importer.html', label: 'Resolving Import' },
            { file: 'home_importer.html', path: 'jobs/home_importer.html', label: 'HomeServe Import' }
        ]
    },
    {
        key: 'website',
        title: 'Website Management',
        overviewHash: 'tab-website',
        ariaLabel: 'Website management tools',
        pages: [
            { file: 'site-management.html', label: 'Page Studio' },
            { file: 'appearance-admin.html', label: 'Appearance & Navigation' },
            { file: 'contact-options-admin.html', label: 'Contact Options' },
            { file: 'privacy-admin.html', label: 'Privacy Policy' },
            { file: 'coverage-admin.html', label: 'Coverage Map' },
            { file: 'website-file-explorer.html', label: 'File Explorer' }
        ]
    },
    {
        key: 'customers',
        title: 'Customers',
        overviewHash: 'tab-customers',
        ariaLabel: 'Customer tools',
        pages: [
            { file: 'testimonials-admin.html', label: 'Testimonials' },
            { file: 'feedback-admin.html', label: 'Feedback' },
            { file: 'callbacks-admin.html', label: 'Callbacks' }
        ]
    },
    {
        key: 'general',
        title: 'General Management',
        overviewHash: 'tab-general',
        ariaLabel: 'General management tools',
        pages: [
            { file: 'analytics-admin.html', label: 'Insights' },
            { file: 'rates.html', label: 'Manage Rates' },
            { file: 'offers-admin.html', label: 'Manage Offers' },
            { file: 'coverage-admin.html', label: 'Coverage Map' },
            { file: 'privacy-admin.html', label: 'Privacy Policy' },
            { file: 'opening-hours.html', label: 'Opening Hours' }
        ]
    },
    {
        key: 'settings',
        title: 'Settings',
        overviewHash: 'tab-settings',
        ariaLabel: 'Settings tools',
        pages: [
            { file: 'settings-admin.html', label: 'Account Settings' }
        ]
    }
];

function renderAdminSectionNav() {
    const currentFile = window.location.pathname.split('/').pop();
    const section = adminSectionNavDefinitions.find(item =>
        item.pages.some(page => page.file === currentFile)
    );

    // The dashboard has its own main tab navigation, so do not add a second bar there.
    if (!section || currentFile === 'admin-landed.html') return;
    if (document.getElementById('admin-section-child-nav')) return;

    const titleEl = document.getElementById('nav-page-title');
    if (titleEl) titleEl.textContent = `WarmHub - ${section.title}`;

    const nav = document.createElement('nav');
    nav.id = 'admin-section-child-nav';
    nav.className = `${section.key}-nav admin-tab-strip`;
    nav.setAttribute('aria-label', section.ariaLabel);

    const overviewHref = `${getAdminUrl('admin-landed.html')}#${section.overviewHash}`;
    nav.innerHTML = `
        <a class="admin-tab-link admin-tab-back" href="${overviewHref}">Overview</a>
        ${section.pages.map(page => {
            const href = getAdminUrl(page.path || page.file);
            const activeClass = page.file === currentFile ? 'is-active' : '';
            const ariaCurrent = page.file === currentFile ? ' aria-current="page"' : '';
            return `<a class="admin-tab-link ${activeClass}" href="${href}"${ariaCurrent}>${page.label}</a>`;
        }).join('')}
    `;

    const header = document.getElementById('admin-header-container');
    if (header) header.appendChild(nav);
}

// Function to protect pages based on role
window.requireRole = async function(allowedRoles, options = {}) {
    const db = await waitForAdminDb();
    if (!db) {
        console.error("Admin database client was not ready for role check.");
        window.location.replace(getAdminUrl('login.html'));
        return false;
    }

    // 1. Get the current session
   const { data: { session } } = await db.auth.getSession();
    
    // 2. If they aren't logged in at all, kick them to login
    if (!session) {
        window.location.replace(getAdminUrl('login.html'));
        return false;
    }

    const userRole = await window.getCurrentUserRole();
    if (!userRole) {
        console.error("No role mapping was found for the current user.");
        window.location.replace(getAdminUrl('login.html'));
        return false;
    }

    if (!allowedRoles.includes(userRole)) {
        console.warn(`Access denied. User role '${userRole}' not in allowed list:`, allowedRoles);
        if (!options.silentRedirect) alert("You do not have permission to view this page.");
        window.location.replace(getAdminUrl('admin-landed.html'));
        return false;
    }

    return true;
};
