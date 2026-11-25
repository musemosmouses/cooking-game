// Keyboard and mouse input: WASD/arrows walk the chef, E or Space interacts,
// a click on a station walks toward it and interacts when close enough.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

/** Keyboard + mouse, read once a frame; clicks set a walk target. */
export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let clickTarget = null;
  let clickInteract = false;

  function codeOf(event) {
    return event.code;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(codeOf(event));
    if (event.code === 'Space' || event.code === 'KeyE' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyM') actions |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => keys.delete(codeOf(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    clickTarget = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    clickInteract = true;
  });

  return {
    /** -1/0/1 on each axis from the held keys, or toward a click target. */
    direction(chef) {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
      if (x === 0 && y === 0 && clickTarget) {
        const dx = clickTarget.x - chef.x;
        const dy = clickTarget.y - chef.y;
        const dist = Math.hypot(dx, dy);
        // The floor clamps the chef a few pixels short of a station's point,
        // so "arrived" must allow that gap or the chef walks forever.
        if (dist > 24) {
          x = dx / dist;
          y = dy / dist;
        } else {
          clickTarget = null;
        }
      }
      return { x, y };
    },
    /** True while the chef still has a click target to walk to. */
    get hasClickTarget() { return clickTarget !== null; },
    /** Consume the pending click-interact: the chef asked to use a station. */
    takeClickInteract() {
      const value = clickInteract;
      clickInteract = false;
      return value;
    },
    clearClick() { clickTarget = null; clickInteract = false; },
    takeActions() {
      const value = actions;
      actions = 0;
      return value;
    },
  };
}
