export const parseReferrerFromScene = (scene?: string): string => {
  if (!scene) return '';
  if (scene.startsWith('gc_')) {
    const rest = scene.slice(3);
    const rcIndex = rest.indexOf('_rc_');
    if (rcIndex > -1) {
      return rest.slice(rcIndex + 4);
    }
  }
  if (scene.startsWith('rc_')) {
    return scene.slice(3);
  }
  if (/^U\d+[A-Za-z0-9]{4}$/.test(scene)) {
    return scene;
  }
  return '';
};
