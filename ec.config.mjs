// Expressive Code options live here (instead of inline in astro.config.mjs)
// so that the standalone `<Code>` component from astro-expressive-code can
// load them. Plugin functions aren't JSON-serializable, which the inline
// form requires — moving them to this dedicated config file lifts that
// restriction. astro-expressive-code auto-discovers this file by name.
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';

export default {
  plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
  // Line numbers default OFF — opt in per block with `showLineNumbers`.
  defaultProps: { showLineNumbers: false },
};
