import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareMateriasByNombre,
  displayMateriaNombre,
  matchTemarioFolder,
  resolveTemarioFolder,
} from "../src/lib/temario-catalogo";
import { planTemarioRemap } from "../src/lib/remap-temario";

describe("temario-catalogo", () => {
  it("matches numbered folder names", () => {
    assert.equal(matchTemarioFolder("03 ADMINISTRACION LOCAL")?.orden, 3);
    assert.equal(matchTemarioFolder("01 ABOGACIA")?.orden, 1);
    assert.equal(displayMateriaNombre({ orden: 3, nombre: "ADMINISTRACION LOCAL" }), "03 ADMINISTRACION LOCAL");
  });

  it("maps aliases from bancos and mazos", () => {
    assert.equal(matchTemarioFolder("ADMIN LOCAL")?.orden, 3);
    assert.equal(matchTemarioFolder("ADMINISTRACION LOCAL 1")?.orden, 3);
    assert.equal(matchTemarioFolder("EBEP TEORICO 1")?.orden, 9);
    assert.equal(matchTemarioFolder("LCSP PRACTICO")?.orden, 6);
    assert.equal(matchTemarioFolder("LFPEX TEORICO 1")?.orden, 18);
    assert.equal(matchTemarioFolder("V CONVENIO TEORICO 1")?.orden, 32);
    assert.equal(matchTemarioFolder("GOBIENRO ABIERTO")?.orden, 12);
    assert.equal(matchTemarioFolder("IGAULDAD TEORI")?.orden, 14);
    assert.equal(matchTemarioFolder("ABOGACIA TEORICO 1")?.orden, 1);
  });

  it("does not confuse contratos with admin local", () => {
    assert.equal(matchTemarioFolder("CONTRATOS ADMINISTRATIVOS")?.orden, 6);
    assert.notEqual(matchTemarioFolder("CONTRATOS ADMINISTRATIVOS")?.orden, 3);
  });

  it("sends unmatched material to OTROS", () => {
    assert.equal(matchTemarioFolder("LPACAP TEORICO 1"), null);
    assert.equal(resolveTemarioFolder("LPACAP TEORICO 1", "LPACAP").orden, 33);
    assert.equal(resolveTemarioFolder("TEORICO 1", "ADMINISTRACION LOCAL").orden, 3);
  });

  it("sorts by folder number, not alphabet", () => {
    const names = ["10 ESTATUTO TRABAJADORES", "09 ESTATUTO BASICO", "33 OTROS", "01 ABOGACIA"];
    names.sort(compareMateriasByNombre);
    assert.deepEqual(names, [
      "01 ABOGACIA",
      "09 ESTATUTO BASICO",
      "10 ESTATUTO TRABAJADORES",
      "33 OTROS",
    ]);
  });
});

describe("planTemarioRemap", () => {
  it("reassigns a bank by its name even if the materia is wrong", () => {
    const plan = planTemarioRemap({
      materias: [
        { id: "m-local", nombre: "ADMIN LOCAL" },
        { id: "m-extra", nombre: "LPACAP" },
      ],
      bancos: [
        { id: "b1", nombre: "EBEP TEORICO 1", materia_id: "m-local" },
        { id: "b2", nombre: "ADMINISTRACION LOCAL 1", materia_id: "m-local" },
        { id: "b3", nombre: "LPACAP TEORICO 1", materia_id: "m-extra" },
      ],
      mazos: [{ id: "z1", nombre: "ADMINISTRACION LOCAL", materia_id: "m-local" }],
    });

    const ebep = plan.moves.find((m) => m.id === "b1");
    const local = plan.moves.find((m) => m.id === "b2");
    const lpacap = plan.moves.find((m) => m.id === "b3");
    const mazo = plan.moves.find((m) => m.id === "z1");

    assert.equal(ebep?.toOrden, 9);
    assert.equal(local?.toOrden, 3);
    assert.equal(lpacap?.toOrden, 33);
    assert.equal(mazo?.toOrden, 3);
    assert.equal(plan.create.some((c) => c.orden === 1), true);
  });
});
