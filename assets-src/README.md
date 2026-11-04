# assets-src

Fontes de arte: arquivos `.aseprite`, projetos e tilesets do Tiled e qualquer arquivo de trabalho (ADR-022). **Não** são servidos ao navegador.

- Os exports prontos para o jogo (spritesheets PNG + JSON, mapas `.tmj`, áudio) vão em `apps/client/public/assets/`.
- Licença e origem de cada asset de terceiros ficam em `09_LICENSES/` (ART-01).

## Git LFS

Binários (`*.aseprite *.ase *.blend *.glb *.gltf *.ktx2 *.png *.jpg *.gif *.wav *.ogg *.mp3 *.fbx`) são versionados com Git LFS, conforme `.gitattributes` na raiz.

1. Instale o Git LFS: <https://git-lfs.com> (macOS: `brew install git-lfs`; Debian/Ubuntu: `sudo apt install git-lfs`; Windows: já vem no Git for Windows).
2. Uma vez por máquina: `git lfs install`.
3. Depois disso, `git add`/`commit`/`push` funcionam normalmente; `git lfs ls-files` mostra o que está em LFS.

Atenção à cota gratuita de LFS do GitHub (armazenamento e banda): evite commitar versões intermediárias pesadas.
