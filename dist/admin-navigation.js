const adminSidebar = document.querySelector('body > aside')
const adminNavigation = adminSidebar?.querySelector('nav')

if (!adminNavigation) {
  throw new Error('Admin dashboard navigation was not found.')
}

const sectionLinks = [
  { heading: 0, id: 'admin-threat-trends' },
  { heading: 1, id: 'admin-threat-patterns' },
  { heading: 2, id: 'admin-security-incidents' },
]

const mainHeadings = [...document.querySelectorAll('main h2')]
sectionLinks.forEach(({ heading, id }) => {
  if (mainHeadings[heading]) {
    mainHeadings[heading].id = id
    mainHeadings[heading].tabIndex = -1
  }
})

const adminItems = [
  { href: '/admin', icon: 'admin_panel_settings', title: 'Admin Dashboard', subtitle: 'સિસ્ટમ સંચાલન' },
  { href: '#admin-threat-trends', icon: 'query_stats', title: 'Threat Trends', subtitle: 'જિલ્લાવાર ટ્રેન્ડ' },
  { href: '#admin-threat-patterns', icon: 'rule', title: 'Scam Patterns', subtitle: 'રૂલ એન્જિન રિવ્યૂ' },
  { href: '#admin-security-incidents', icon: 'security', title: 'Security Incidents', subtitle: 'ઘટનાઓ મોનિટરિંગ' },
  { href: '/app', icon: 'person', title: 'User Dashboard', subtitle: 'નાગરિક પોર્ટલ' },
]

const activeClasses =
  'bg-primary-container text-on-primary-container font-semibold shadow-[0_4px_16px_rgba(241,90,36,0.3)]'

adminNavigation.innerHTML = adminItems
  .map(({ href, icon, title, subtitle }, index) => {
    const active = index === 0
    const classes = active
      ? `flex items-center gap-space-sm px-space-md py-2.5 rounded-xl transition-all group ${activeClasses}`
      : 'flex items-center gap-space-sm px-space-md py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-raised hover:text-on-surface transition-all group'

    return `<a class="${classes}" href="${href}"${active ? ' aria-current="page"' : ''}>
      <span class="material-symbols-outlined text-[20px] transition-colors group-hover:text-primary" aria-hidden="true">${icon}</span>
      <div class="flex flex-col">
        <span class="font-label-lg text-label-lg">${title}</span>
        <span class="font-label-sm text-label-sm opacity-70">${subtitle}</span>
      </div>
    </a>`
  })
  .join('')

adminNavigation.setAttribute('data-active-classes', activeClasses)
adminSidebar.querySelector(':scope > div > div:first-child > a')?.setAttribute('href', '/admin')
