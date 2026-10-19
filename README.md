# FlashClip · duas atmosferas de Natal

Duas propostas da página inicial do FlashClip, com o mesmo globo 3D interativo, abertura com Papai Noel e controles separados de música e efeitos.

- [Comparar as versões](https://andreybueno-git.github.io/flashclip-natal/)
- [Sem a foto](https://andreybueno-git.github.io/flashclip-natal/sem-foto/)
- [Com a foto](https://andreybueno-git.github.io/flashclip-natal/com-foto/)

O globo responde ao mouse, arrasto, toque e teclado. A abertura pode ser pulada; o som começa após uma interação do visitante.

## Origem e edição

Base do projeto: [PedroNapp/Paradigmas](https://github.com/PedroNapp/Paradigmas). As duas pastas são propostas independentes para comparação. Os modelos locais foram criados no Higgsfield 3D Jutsu; Three.js é distribuído localmente com licença MIT em `vendor/three/LICENSE`. A imagem da hero foi fornecida pelo usuário e preservada sem recompressão. Música e efeitos são síntese original em Web Audio.

O frontend mantém a configuração Supabase do projeto de origem. Os dados do evento e as funções de autenticação continuam usando esse serviço.

Para executar localmente, abra esta pasta no terminal:

```sh
python3 -m http.server 5500 --bind 127.0.0.1
```

Abra `http://127.0.0.1:5500/`.
