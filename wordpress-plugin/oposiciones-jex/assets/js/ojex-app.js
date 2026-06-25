(function () {
  "use strict";

  const cfg = window.OJEX || {};
  const REST = cfg.restUrl || "";
  const HEADERS = {
    "Content-Type": "application/json",
    "X-WP-Nonce": cfg.nonce || "",
  };

  async function api(path, options) {
    const res = await fetch(REST + path, {
      headers: HEADERS,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Error de red");
    return data;
  }

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function examScore(ok, fail) {
    return (ok - fail * 0.25).toFixed(2);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  class ExamSession {
    constructor(root, opts) {
      this.root = root;
      this.title = opts.title;
      this.preguntas = opts.preguntas;
      this.examMode = !!opts.examMode;
      this.timerSeconds = opts.timerSeconds ?? null;
      this.sessionMeta = opts.sessionMeta || {};
      this.onFinish = opts.onFinish || (() => {});
      this.index = 0;
      this.answers = this.preguntas.map(() => null);
      this.flags = this.preguntas.map(() => false);
      this.answerMeta = new Map();
      this.phase = "test";
      this.remaining = this.timerSeconds;
      this.timerId = null;
      this.startedAt = Date.now();
      this.render();
      if (this.phase === "test" && this.timerSeconds) this.startTimer();
    }

    startTimer() {
      const deadline = Date.now() + this.timerSeconds * 1000;
      const tick = () => {
        this.remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        this.renderHeader();
        if (this.remaining === 0) {
          clearInterval(this.timerId);
          void this.finishTest();
        }
      };
      tick();
      this.timerId = setInterval(tick, 250);
    }

    async finishTest() {
      if (this.examMode) {
        this.root.querySelector("[data-grading]")?.classList.remove("hidden");
        const data = await api("exam/grade", {
          method: "POST",
          body: JSON.stringify({
            answers: this.preguntas.map((q, i) => ({
              id: q.id,
              selected: this.answers[i],
            })),
          }),
        });
        for (const r of data.results || []) {
          this.answerMeta.set(r.id, {
            respuesta: r.respuesta,
            explicacion: r.explicacion,
            correct: r.correct,
          });
          if (r.correct) await this.syncIntento(r.bancoId, r.id, true);
          else await this.syncIntento(r.bancoId, r.id, false);
        }
      }
      this.phase = "result";
      await this.saveResultado();
      this.render();
    }

    async syncIntento(bancoId, preguntaId, correcta) {
      try {
        await api("progreso/intento", {
          method: "POST",
          body: JSON.stringify({ bancoId, preguntaId, correcta }),
        });
      } catch (_) {}
    }

    async saveResultado() {
      const answered = this.answers.filter((a) => a !== null).length;
      let ok = 0;
      this.preguntas.forEach((q, i) => {
        const a = this.answers[i];
        const meta = this.answerMeta.get(q.id);
        if (a !== null && meta && a === meta.respuesta) ok++;
      });
      const fail = answered - ok;
      const skip = this.preguntas.length - answered;
      const pct = answered ? Math.round((ok / answered) * 100) : 0;
      try {
        await api("progreso/resultados", {
          method: "POST",
          body: JSON.stringify({
            tipo: this.sessionMeta.tipo || "banco",
            titulo: this.sessionMeta.titulo || this.title,
            bancoId: this.sessionMeta.bancoId || null,
            total: this.preguntas.length,
            respondidas: answered,
            correctas: ok,
            incorrectas: fail,
            sinResponder: skip,
            nota: examScore(ok, fail),
            porcentaje: pct,
            tiempoSegundos: Math.round((Date.now() - this.startedAt) / 1000),
            examMode: this.examMode,
            detalle: [],
          }),
        });
      } catch (_) {}
    }

    async selectOption(optionIndex) {
      const q = this.preguntas[this.index];
      const picked = this.answers[this.index];
      if (!this.examMode && picked !== null) return;
      this.answers[this.index] = optionIndex;
      if (!this.examMode) {
        const r = await api("exam/check", {
          method: "POST",
          body: JSON.stringify({ id: q.id, selected: optionIndex }),
        });
        this.answerMeta.set(q.id, r);
        await this.syncIntento(q.bancoId, q.id, !!r.correct);
      }
      this.render();
    }

    renderHeader() {
      const badge = this.examMode
        ? '<span class="ojex-badge">Modo examen</span>'
        : "";
      const timer =
        this.timerSeconds != null
          ? `<span class="ojex-timer">⏱ ${formatTime(this.remaining)}</span>`
          : "";
      return `<div class="ojex-test-head"><div><strong>${this.title}</strong> · Pregunta ${
        this.index + 1
      } de ${this.preguntas.length} ${badge}</div><div>${timer}</div></div>`;
    }

    render() {
      this.root.innerHTML = "";
      if (this.phase === "result") {
        const answered = this.answers.filter((a) => a !== null).length;
        let ok = 0;
        this.preguntas.forEach((q, i) => {
          const a = this.answers[i];
          const meta = this.answerMeta.get(q.id);
          if (a !== null && meta && a === meta.respuesta) ok++;
        });
        const pct = answered ? Math.round((ok / answered) * 100) : 0;
        this.root.appendChild(
          el(
            "div",
            "ojex-card",
            `<h3>Resultado</h3><p class="ojex-score">${pct}%</p><p>${ok} correctas · ${
              answered - ok
            } incorrectas · ${this.preguntas.length - answered} sin responder · Nota ${examScore(
              ok,
              answered - ok,
            )}</p><button type="button" class="ojex-btn" data-back>Volver</button>`,
          ),
        );
        this.root.querySelector("[data-back]").onclick = () => this.onFinish();
        return;
      }

      const card = el("div", "ojex-card");
      card.innerHTML =
        this.renderHeader() +
        `<p class="hidden" data-grading>Corrigiendo…</p>` +
        `<p class="ojex-question">${this.preguntas[this.index].enunciado}</p>` +
        `<ul class="ojex-options"></ul>` +
        `<div class="ojex-actions"><button type="button" class="ojex-btn-secondary" data-prev>Anterior</button><button type="button" class="ojex-btn" data-next>Siguiente</button><button type="button" class="ojex-btn" data-finish>Terminar</button></div>`;

      const ul = card.querySelector(".ojex-options");
      const picked = this.answers[this.index];
      const meta = this.answerMeta.get(this.preguntas[this.index].id);
      this.preguntas[this.index].opciones.forEach((opt, i) => {
        const li = document.createElement("li");
        const btn = el("button", "ojex-option", `<span>${String.fromCharCode(65 + i)}</span> ${opt}`);
        if (picked === i) btn.classList.add("selected");
        if (!this.examMode && picked !== null && meta) {
          if (i === meta.respuesta) btn.classList.add("correct");
          else if (i === picked) btn.classList.add("wrong");
        }
        btn.disabled = !this.examMode && picked !== null;
        btn.onclick = () => void this.selectOption(i);
        li.appendChild(btn);
        ul.appendChild(li);
      });

      card.querySelector("[data-prev]").onclick = () => {
        if (this.index > 0) {
          this.index--;
          this.render();
        }
      };
      card.querySelector("[data-next]").onclick = () => {
        if (this.index + 1 >= this.preguntas.length) void this.finishTest();
        else {
          this.index++;
          this.render();
        }
      };
      card.querySelector("[data-finish]").onclick = () => void this.finishTest();
      this.root.appendChild(card);
    }
  }

  function initTest() {
    const wrap = document.querySelector("[data-ojex-test]");
    if (!wrap) return;
    const bancoId = wrap.getAttribute("data-banco-id");
    const root = wrap.querySelector("[data-ojex-test-root]");
    if (!bancoId || !root) return;

    api("banco/" + encodeURIComponent(bancoId) + "/preguntas")
      .then((data) => {
        const examMode = confirm("¿Modo examen? (Sin corrección hasta el final)");
        root.innerHTML =
          `<label class="ojex-toggle"><input type="checkbox" id="ojex-exam-mode" ${
            examMode ? "checked" : ""
          } /> Modo examen</label><div data-exam-root></div>`;
        const examRoot = root.querySelector("[data-exam-root]");
        const start = () => {
          new ExamSession(examRoot, {
            title: data.banco.nombre,
            preguntas: data.preguntas,
            examMode: root.querySelector("#ojex-exam-mode").checked,
            sessionMeta: {
              tipo: "banco",
              titulo: data.banco.nombre,
              bancoId: data.banco.id,
            },
            onFinish: () => location.reload(),
          });
        };
        const btn = el("button", "ojex-btn", "Iniciar test");
        btn.onclick = start;
        root.prepend(btn);
      })
      .catch((e) => {
        root.innerHTML = `<p class="ojex-error">${e.message}</p>`;
      });
  }

  function initSimulacro() {
    const wrap = document.querySelector("[data-ojex-simulacro]");
    if (!wrap) return;
    const root = wrap.querySelector("[data-ojex-simulacro-root]");
    root.innerHTML =
      '<label>Preset <select id="ojex-preset"><option value="oficial">Oficial</option><option value="mini">Mini</option></select></label> ' +
      '<button type="button" class="ojex-btn" id="ojex-start-sim">Iniciar simulacro</button><div data-exam-root></div>';
    document.getElementById("ojex-start-sim").onclick = async () => {
      const presetId = document.getElementById("ojex-preset").value;
      try {
        const data = await api("simulacro/start", {
          method: "POST",
          body: JSON.stringify({ presetId, materiaId: null }),
        });
        root.querySelector("button, select, label")?.remove();
        new ExamSession(root.querySelector("[data-exam-root]"), {
          title: "Simulacro",
          preguntas: data.list,
          examMode: true,
          timerSeconds: data.timerSeconds,
          sessionMeta: { tipo: "simulacro", titulo: "Simulacro", bancoId: null },
          onFinish: () => location.reload(),
        });
      } catch (e) {
        alert(e.message);
      }
    };
  }

  function initRepaso() {
    const wrap = document.querySelector("[data-ojex-repaso]");
    if (!wrap) return;
    const root = wrap.querySelector("[data-ojex-repaso-root]");
    root.querySelector("[data-ojex-start-repaso]").onclick = async () => {
      try {
        const data = await api("progreso/fallos");
        if (!data.preguntas?.length) {
          alert("No hay fallos pendientes.");
          return;
        }
        new ExamSession(root, {
          title: "Repaso global",
          preguntas: data.preguntas,
          examMode: false,
          sessionMeta: { tipo: "repaso", titulo: "Repaso global", bancoId: null },
          onFinish: () => location.reload(),
        });
      } catch (e) {
        alert(e.message);
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTest();
    initSimulacro();
    initRepaso();
  });
})();
