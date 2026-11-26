// Reserve the dock's real height so the last message can scroll above it.
;(function () {
  const composer = document.getElementById('assistant-composer');
  if (!composer) return;
  const mobile = matchMedia('(max-width: 1100px)');
  let frame;
  function update() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const keyboard = viewport && viewport.scale === 1
        ? Math.max(0, innerHeight - viewport.height - viewport.offsetTop) : 0;
      const headerHeight = document.querySelector('header.fixed')?.getBoundingClientRect().height || 72;
      composer.style.setProperty('--composer-keyboard-offset', `${keyboard}px`);
      composer.style.setProperty('--composer-available-height', `${Math.max(96, (viewport?.height || innerHeight) - headerHeight - 24)}px`);
      document.body.style.setProperty('--assistant-composer-height', `${mobile.matches ? composer.getBoundingClientRect().height + keyboard : 0}px`);
    });
  }
  new ResizeObserver(update).observe(composer);
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  mobile.addEventListener('change', update);
  update();
})();
