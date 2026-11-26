;(function () {
  const root = document.documentElement;
  const storageKey = 'sg_theme';
  let theme = 'dark';
  try {
    if (localStorage.getItem(storageKey) === 'light') theme = 'light';
  } catch {}

  // Preserve the original Tailwind palette when a light token is absent.
  const darkPalette = {
    'surface-raised': '#241b16', background: '#161311', 'inverse-primary': '#a04100',
    'on-secondary-fixed-variant': '#00513a', 'text-muted': '#b7aaa0', secondary: '#61dcac',
    'on-error-container': '#ffdad6', 'on-secondary-fixed': '#002115', 'error-container': '#93000a',
    'primary-fixed': '#ffdbcc', 'surface-dim': '#161311', 'primary-strong': '#f15a24',
    'outline-variant': '#584238', 'surface-soft': '#30231b', 'on-tertiary-fixed': '#281900',
    'on-primary-fixed': '#351000', 'surface-variant': '#383431', surface: '#191411',
    'on-tertiary-fixed-variant': '#604100', 'on-secondary-container': '#003121',
    'secondary-container': '#14a479', 'on-background': '#e9e1dd', tertiary: '#f9bc4f',
    'surface-container-low': '#1e1b19', 'inverse-surface': '#e9e1dd', 'surface-container-lowest': '#110e0c',
    'surface-container-high': '#2d2927', primary: '#ffb693', 'on-primary': '#561f00',
    'primary-fixed-dim': '#ffb693', 'bg-base': '#100d0b', 'inverse-on-surface': '#34302d',
    'on-surface-variant': '#dfc0b2', 'secondary-fixed': '#7ff9c7', 'on-tertiary-container': '#4b3200',
    'surface-container-highest': '#383431', 'surface-tint': '#ffb693', 'on-error': '#690005',
    'on-tertiary': '#432c00', 'secondary-fixed-dim': '#61dcac', danger: '#f06464',
    'on-secondary': '#003827', 'tertiary-fixed-dim': '#f9bc4f', outline: '#a78b7f',
    'on-primary-fixed-variant': '#7a3000', 'on-surface': '#e9e1dd', 'surface-bright': '#3d3836',
    'on-primary-container': '#612400', 'tertiary-fixed': '#ffdeac', 'text-primary': '#f8f3ed',
    info: '#65a9e8', 'primary-container': '#ff7a2f', error: '#ffb4ab',
    'tertiary-container': '#cf962b', 'surface-container': '#221f1d',
  };
  const colors = Object.fromEntries(Object.entries(darkPalette).map(([name, hex]) => {
    const rgb = hex.slice(1).match(/../g).map(byte => parseInt(byte, 16)).join(' ');
    return [name, `rgb(var(--sg-${name}, ${rgb}) / <alpha-value>)`];
  }));
  colors['border-hairline'] = 'rgb(var(--sg-border-hairline, 255 239 220) / calc(<alpha-value> * var(--sg-border-strength, 0.12)))';
  window.SGTheme = {colors};
  root.dataset.theme = theme;

  const copy = {
    en: ['Light theme', 'Switch to light theme', 'Switch to dark theme'],
    gu: ['હળવી થીમ', 'હળવી થીમ ચાલુ કરો', 'ઘેરી થીમ ચાલુ કરો'],
    hi: ['हल्की थीम', 'हल्की थीम चालू करें', 'गहरी थीम चालू करें'],
  };
  const icons = [
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/></svg>',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 15.3A9 9 0 0 1 8.7 3.2a9 9 0 1 0 12.1 12.1Z"/></svg>',
  ];

  function init() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sg-theme-toggle';
    button.dataset.noTranslate = '';
    button.innerHTML = icons.join('');

    function render() {
      const light = theme === 'light';
      const labels = copy[root.lang.split('-')[0]] || copy.en;
      root.dataset.theme = theme;
      button.setAttribute('aria-label', labels[0]);
      button.setAttribute('aria-pressed', String(light));
      button.title = labels[light ? 2 : 1];
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f8f4ef' : '#100d0b');
    }

    function group(anchor) {
      const controls = document.createElement('div');
      controls.className = 'sg-theme-group';
      anchor.before(controls);
      controls.append(anchor, button);
    }

    const landing = document.querySelector('.landing-header .header-actions');
    const languages = document.querySelector('.auth-header .auth-languages');
    const workspace = document.querySelector('header.workspace-header');
    const fixedHeader = document.querySelector('header.fixed');
    const support = document.querySelector('body.sg-support > header > a:last-child');
    if (landing) landing.prepend(button);
    else if (languages) group(languages);
    else if (workspace) workspace.insertBefore(button, workspace.querySelector('#adminSignOut'));
    else if (fixedHeader?.lastElementChild) {
      const actions = fixedHeader.lastElementChild;
      actions.classList.add('sg-workspace-actions');
      actions.prepend(button);
    } else if (support) group(support);
    else {
      button.classList.add('sg-theme-toggle-standalone');
      document.body.prepend(button);
    }

    button.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, theme); } catch {}
      render();
    });
    document.addEventListener('langchange', render);
    window.addEventListener('storage', event => {
      if (event.key !== storageKey && event.key !== null) return;
      theme = event.newValue === 'light' ? 'light' : 'dark';
      render();
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
