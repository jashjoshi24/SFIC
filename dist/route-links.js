const routeDocuments = new Set([
  '/app',
  '/app/assistant',
  '/app/check/image',
  '/app/check/message',
  '/app/check/url',
  '/app/profile',
  '/admin',
  '/awareness',
  '/awareness/article',
  '/emergency',
  '/login',
])

const polishStyles = document.createElement('link')
polishStyles.rel = 'stylesheet'
polishStyles.href = '/site-polish.css'
document.head.append(polishStyles)

const currentRoute = window.location.pathname.replace(/\/+$/, '') || '/'
const isLandingDocument = document.querySelector(
  'a[href^="/login/index.html?mode="]',
)

if (routeDocuments.has(currentRoute) && isLandingDocument) {
  window.location.replace(
    `${currentRoute}/index.html${window.location.search}${window.location.hash}`,
  )
}

document.querySelectorAll('a[href]').forEach((link) => {
  const href = link.getAttribute('href')
  if (!href || href.startsWith('#')) return

  const destination = new URL(href, window.location.href)
  if (destination.origin !== window.location.origin) return

  const route = destination.pathname.replace(/\/+$/, '') || '/'
  if (route !== '/' && !routeDocuments.has(route)) return

  destination.pathname = route === '/' ? '/index.html' : `${route}/index.html`
  link.href = destination.href
})

const legacySidebar = document.querySelector(
  'aside nav a[data-path="landing-page"]',
)

if (legacySidebar) {
  const sidebar = legacySidebar.closest('aside')
  const nav = legacySidebar.closest('nav')
  const brandLink = sidebar?.querySelector('a[data-path="landing-page"]')

  if (brandLink) {
    brandLink.href = '/app/index.html'
    brandLink.dataset.path = 'dashboard'
  }

  const currentPath = window.location.pathname
    .replace(/\/index\.html$/, '')
    .replace(/\/+$/, '') || '/'
  const navItems = [
    {
      path: 'dashboard',
      href: '/app/index.html',
      routes: ['/app'],
      icon: 'shield',
      title: 'Dashboard',
      subtitle: 'મુખ્ય પૃષ્ઠ',
    },
    {
      path: 'gujarati-ai-assistant',
      href: '/app/assistant/index.html',
      routes: ['/app/assistant'],
      icon: 'smart_toy',
      title: 'Gujarati AI Assistant',
      subtitle: 'સાયબર સહાયક AI',
    },
    {
      path: 'check-message-call',
      href: '/app/check/message/index.html',
      routes: ['/app/check/message'],
      icon: 'sms',
      title: 'Check Message / Call',
      subtitle: 'શંકાસ્પદ મેસેજ તપાસો',
    },
    {
      path: 'phishing-url-checker',
      href: '/app/check/url/index.html',
      routes: ['/app/check/url'],
      icon: 'link',
      title: 'Phishing URL Checker',
      subtitle: 'લિંક સુરક્ષા સ્કેનર',
    },
    {
      path: 'screenshot-qr-scanner',
      href: '/app/check/image/index.html',
      routes: ['/app/check/image'],
      icon: 'qr_code_scanner',
      title: 'Screenshot / QR Scanner',
      subtitle: 'QR સ્કેન અને સ્ક્રીનશોટ',
    },
    {
      path: 'complaint-generator',
      href: '/emergency/index.html',
      routes: [],
      icon: 'description',
      title: 'Complaint Generator',
      subtitle: 'સાયબર ફરિયાદ ડ્રાફ્ટ',
    },
    {
      path: 'scam-alerts',
      href: '/awareness/index.html',
      routes: ['/awareness', '/awareness/article'],
      icon: 'warning',
      title: 'Scam Alerts',
      subtitle: 'તાજા ફ્રોડ એલર્ટ્સ',
    },
    {
      path: 'emergency-help',
      href: '/emergency/index.html',
      routes: ['/emergency'],
      icon: 'fmd_bad',
      title: 'Emergency Help',
      subtitle: 'ત્વરિત સહાય (1930)',
    },
  ]

  if (nav) {
    nav.replaceChildren()
    nav.dataset.activeClasses =
      'bg-primary-container text-on-primary-container font-semibold shadow-[0_4px_16px_rgba(241,90,36,0.3)]'

    navItems.forEach((item) => {
      const link = document.createElement('a')
      const isActive = item.routes.includes(currentPath)
      link.href = item.href
      link.dataset.path = item.path
      link.className = isActive
        ? 'flex items-center gap-space-sm px-space-md py-2.5 rounded-xl transition-all group bg-primary-container text-on-primary-container font-semibold shadow-[0_4px_16px_rgba(241,90,36,0.3)]'
        : 'flex items-center gap-space-sm px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-raised hover:text-on-surface transition-all group'

      if (isActive) link.setAttribute('aria-current', 'page')

      const icon = document.createElement('span')
      icon.className =
        'material-symbols-outlined text-[20px] transition-colors group-hover:text-primary'
      icon.textContent = item.icon

      const labels = document.createElement('div')
      labels.className = 'flex flex-col'

      const title = document.createElement('span')
      title.className = 'font-label-lg text-label-lg'
      title.textContent = item.title

      const subtitle = document.createElement('span')
      subtitle.className = 'font-label-sm text-label-sm opacity-70'
      subtitle.textContent = item.subtitle

      labels.append(title, subtitle)
      link.append(icon, labels)
      nav.append(link)
    })
  }
}

const sidebar = document.querySelector('aside.fixed.w-72')
const header = document.querySelector('header.fixed')

if (
  sidebar?.querySelector('nav a[data-path="gujarati-ai-assistant"]') &&
  header
) {
  const headerActions = header.lastElementChild
  const userDetails = headerActions?.lastElementChild

  if (headerActions && userDetails) {
    const userNavActions = document.createElement('div')
    userNavActions.className = 'user-nav-actions'
    userNavActions.setAttribute('aria-label', 'User account')

    const profileLink = document.createElement('a')
    profileLink.href = '/app/profile/index.html'
    profileLink.className = 'user-nav-action'
    profileLink.dataset.userProfile = ''
    profileLink.setAttribute('aria-label', 'Profile')
    profileLink.title = 'Profile'

    const profileIcon = document.createElement('span')
    profileIcon.className = 'material-symbols-outlined'
    profileIcon.setAttribute('aria-hidden', 'true')
    profileIcon.textContent = 'person'
    profileLink.append(profileIcon)

    const logoutLink = document.createElement('a')
    logoutLink.href = '/login/index.html?mode=login'
    logoutLink.className = 'user-nav-action user-nav-logout'
    logoutLink.dataset.userLogout = ''
    logoutLink.setAttribute('aria-label', 'Log out')
    logoutLink.title = 'Log out'

    const logoutIcon = document.createElement('span')
    logoutIcon.className = 'material-symbols-outlined'
    logoutIcon.setAttribute('aria-hidden', 'true')
    logoutIcon.textContent = 'logout'
    logoutLink.append(logoutIcon)

    userNavActions.append(profileLink, logoutLink)
    headerActions.insertBefore(userNavActions, userDetails)
  }
}

if (sidebar && header?.firstElementChild) {
  if (!sidebar.id) sidebar.id = 'primary-navigation'

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'mobile-nav-toggle'
  toggle.setAttribute('aria-label', 'Open navigation menu')
  toggle.setAttribute('aria-controls', sidebar.id)
  toggle.setAttribute('aria-expanded', 'false')
  toggle.innerHTML =
    '<span class="material-symbols-outlined" aria-hidden="true">menu</span>'
  header.firstElementChild.prepend(toggle)

  const overlay = document.createElement('button')
  overlay.type = 'button'
  overlay.className = 'mobile-nav-overlay'
  overlay.tabIndex = -1
  overlay.setAttribute('aria-label', 'Close navigation menu')
  overlay.setAttribute('aria-hidden', 'true')
  document.body.append(overlay)

  const closeMenu = () => {
    document.body.classList.remove('mobile-nav-open')
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Open navigation menu')
    toggle.querySelector('span').textContent = 'menu'
  }

  toggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('mobile-nav-open')
    toggle.setAttribute('aria-expanded', String(isOpen))
    toggle.setAttribute(
      'aria-label',
      isOpen ? 'Close navigation menu' : 'Open navigation menu',
    )
    toggle.querySelector('span').textContent = isOpen ? 'close' : 'menu'

    if (isOpen) sidebar.querySelector('a[href]')?.focus()
  })

  overlay.addEventListener('click', closeMenu)
  sidebar.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener('click', closeMenu)
  })

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      document.body.classList.contains('mobile-nav-open')
    ) {
      closeMenu()
      toggle.focus()
    }
  })

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1100) closeMenu()
  })
}
