const sidebar = document.querySelector('body > aside')
if (!sidebar) {
  throw new Error('Sidebar toggle could not find the page sidebar.')
}

const header = sidebar.querySelector(':scope > div > div:first-child')
if (!header) {
  throw new Error('Sidebar toggle could not find the sidebar header.')
}

const style = document.createElement('style')
style.textContent = `
  .sidebar-toggle {
    display: none;
  }

  @media (min-width: 1024px) {
    aside {
      transition: width 180ms ease;
    }

    .sidebar-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      min-width: 2.5rem;
      min-height: 2.5rem;
      padding: 0.5rem;
      border: 1px solid rgba(255, 239, 220, 0.12);
      border-radius: 0.75rem;
      background: #241b16;
      color: #e9e1dd;
      cursor: pointer;
    }

    .sidebar-toggle:hover {
      background: #30231b;
      color: #ffb693;
    }

    .sidebar-toggle:focus-visible {
      outline: 2px solid #ffb693;
      outline-offset: 2px;
    }

    body.sidebar-collapsed aside {
      width: 5rem !important;
    }

    body.sidebar-collapsed aside nav {
      padding-right: 0.5rem !important;
      padding-left: 0.5rem !important;
    }

    body.sidebar-collapsed aside nav > a {
      justify-content: center;
      padding-right: 0.5rem !important;
      padding-left: 0.5rem !important;
    }

    body.sidebar-collapsed aside nav > a > div,
    body.sidebar-collapsed aside > div > div:first-child > a > img,
    body.sidebar-collapsed aside > div > div:first-child > a > div,
    body.sidebar-collapsed aside > div > div:nth-child(2),
    body.sidebar-collapsed aside > div:last-child {
      display: none !important;
    }

    body.sidebar-collapsed aside ~ .pl-72 {
      padding-left: 5rem !important;
    }

    body.sidebar-collapsed .sidebar-toggle-label {
      display: none;
    }
  }
`
document.head.append(style)

const toggle = document.createElement('button')
toggle.className = 'sidebar-toggle'
toggle.type = 'button'
toggle.setAttribute('aria-controls', 'primary-navigation')
toggle.innerHTML =
  '<span class="material-symbols-outlined" aria-hidden="true">chevron_left</span><span class="sidebar-toggle-label">Hide menu</span>'
header.append(toggle)

const navigation = sidebar.querySelector('nav')
if (navigation) {
  navigation.id = 'primary-navigation'
  navigation.querySelectorAll('a').forEach((link) => {
    if (!link.hasAttribute('aria-label')) {
      const label = link.querySelector('div')?.textContent.trim()
      if (label) {
        link.setAttribute('aria-label', label)
      }
    }
  })
}

function updateToggle(collapsed) {
  document.body.classList.toggle('sidebar-collapsed', collapsed)
  toggle.setAttribute('aria-expanded', String(!collapsed))
  toggle.setAttribute('aria-label', collapsed ? 'Show navigation menu' : 'Hide navigation menu')
  toggle.title = collapsed ? 'Show navigation menu' : 'Hide navigation menu'
  toggle.querySelector('.material-symbols-outlined').textContent = collapsed
    ? 'chevron_right'
    : 'chevron_left'
  toggle.querySelector('.sidebar-toggle-label').textContent = collapsed ? 'Show menu' : 'Hide menu'
}

try {
  updateToggle(localStorage.getItem('surakshit-sidebar-state') === 'collapsed')
} catch (error) {
  console.error('Unable to restore the saved sidebar state.', error)
  updateToggle(false)
}

toggle.addEventListener('click', () => {
  const collapsed = !document.body.classList.contains('sidebar-collapsed')
  updateToggle(collapsed)
  try {
    localStorage.setItem('surakshit-sidebar-state', collapsed ? 'collapsed' : 'expanded')
  } catch (error) {
    console.error('Unable to save the sidebar state.', error)
  }
})
