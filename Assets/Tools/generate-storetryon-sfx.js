const fs = require('fs');
const path = require('path');
const audio = require('/Users/frank/.codex/plugins/cache/ls-extensions/ls-clad/local/skills/build-sfx/tools');
const PROJECT_ASSETS_SFX = '/Users/frank/mygit/StoreTryOn/Assets/GeneratedSFX';
fs.mkdirSync(PROJECT_ASSETS_SFX, {recursive:true});
for (const [name, buffer] of [
  ['StoreTryOnClick', audio.sfx_presets.uiClick({character:'soft'})],
  ['StoreTryOnSaved', audio.sfx_presets.uiSuccess()],
]) {
  audio.mix_bus.masterChain(buffer, {normalize:'peak'});
  audio.WavBuilder.write(buffer, path.join(PROJECT_ASSETS_SFX, name + '.wav'));
}
