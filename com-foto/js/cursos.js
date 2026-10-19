// =========================
// CARREGAR CARDS
// =========================

import { carregarCursos } from "./carregarCardsCursos.js?v=cards-1";

const listaCursos = document.getElementById("listaCursos");

carregarCursos(
  listaCursos,
  null,
  "./matricula.html",
  "./login.html",
  "../imagens/",
);
