const navigationItems = [
  {
    path: 'dashboard',
    href: '/app',
    icon: 'shield',
    title: 'Dashboard',
    subtitle: 'મુખ્ય પૃષ્ઠ',
  },
  {
    path: 'gujarati-ai-assistant',
    href: '/app/assistant',
    icon: 'smart_toy',
    title: 'Gujarati AI Assistant',
    subtitle: 'સાયબર સહાયક AI',
  },
  {
    path: 'check-message-call',
    href: '/app/check/message',
    icon: 'sms',
    title: 'Check Message / Call',
    subtitle: 'શંકાસ્પદ મેસેજ તપાસો',
  },
  {
    path: 'phishing-url-checker',
    href: '/app/check/url',
    icon: 'link',
    title: 'Phishing URL Checker',
    subtitle: 'લિંક સુરક્ષા સ્કેનર',
  },
  {
    path: 'screenshot-qr-scanner',
    href: '/app/check/image',
    icon: 'qr_code_scanner',
    title: 'Screenshot / QR Scanner',
    subtitle: 'QR સ્કેન અને સ્ક્રીનશોટ',
  },
  {
    path: 'complaint-generator',
    href: '/emergency',
    icon: 'description',
    title: 'Complaint Generator',
    subtitle: 'સાયબર ફરિયાદ ડ્રાફ્ટ',
  },
  {
    path: 'scam-alerts',
    href: '/awareness',
    icon: 'warning',
    title: 'Scam Alerts',
    subtitle: 'તાજા ફ્રોડ એલર્ટ્સ',
  },
  {
    path: 'emergency-help',
    href: '/emergency',
    icon: 'fmd_bad',
    title: 'Emergency Help',
    subtitle: 'ત્વરિત સહાય (1930)',
  },
]

const sidebarNavigation = document.querySelector('aside nav')
if (!sidebarNavigation) {
  throw new Error('Dashboard sidebar navigation was not found.')
}

const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'
const activePath = currentPath === '/awareness/article' ? '/awareness' : currentPath
const activeClasses =
  'bg-primary-container text-on-primary-container font-semibold shadow-[0_4px_16px_rgba(241,90,36,0.3)]'

sidebarNavigation.innerHTML = navigationItems
  .map(({ path, href, icon, title, subtitle }) => {
    const active = href === activePath && path !== 'emergency-help'
    const classes = active
      ? `flex items-center gap-space-sm px-space-md py-2.5 rounded-xl transition-all group ${activeClasses}`
      : 'flex items-center gap-space-sm px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-raised hover:text-on-surface transition-all group'

    return `<a class="${classes}" data-path="${path}" href="${href}"${active ? ' aria-current="page"' : ''}>
      <span class="material-symbols-outlined text-[20px] transition-colors group-hover:text-primary">${icon}</span>
      <div class="flex flex-col">
        <span class="font-label-lg text-label-lg">${title}</span>
        <span class="font-label-sm text-label-sm opacity-70">${subtitle}</span>
      </div>
    </a>`
  })
  .join('')

sidebarNavigation.setAttribute('data-active-classes', activeClasses)
sidebarNavigation.style.maxHeight = 'calc(100vh - 12rem)'
sidebarNavigation.style.overflowY = 'auto'
sidebarNavigation.style.overscrollBehavior = 'contain'
