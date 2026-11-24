const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const functionSource = (name, next) => source.slice(source.indexOf(`function ${name}(`), source.indexOf(`function ${next}(`));

test('strength cycle is stored beside the active program with four distinct sessions', () => {
  const existing = { id: 'hypertrophie', nom: 'Hypertrophie', seances: {} };
  let programmes = [existing];
  let alerts = [];
  const context = vm.createContext({
    getSeanceEnCours: () => null,
    getProgrammes: () => programmes,
    sauvegarderProgrammes: (value) => { programmes = value; },
    afficherProgrammes: () => {},
    alert: (value) => alerts.push(value),
  });
  vm.runInContext(functionSource('creerProgrammeForce', 'supprimerProgramme'), context);
  vm.runInContext('creerProgrammeForce()', context);
  assert.equal(programmes.length, 2);
  assert.equal(programmes[0], existing);
  assert.deepEqual(Object.keys(programmes[1].seances), ['Lun', 'Mar', 'Jeu', 'Ven']);
  assert.equal(programmes[1].seances.Lun.exercises[0][0], 'Squat barre');
  assert.equal(programmes[1].seances.Jeu.exercises[0][0], 'Soulevé de terre');
  assert.equal(programmes[1].seances.Ven.exercises[0][0], 'Traction lestée ou assistée');
  assert.ok(programmes[1].seances.Lun.exercises.every((item) => item[2] === null));
  vm.runInContext('creerProgrammeForce()', context);
  assert.equal(programmes.length, 2);
  assert.ok(alerts.at(-1).includes('déjà enregistré'));
});

test('Madcow formula accepts the actual repetition count and rejects non-RM ranges', () => {
  const context = vm.createContext({});
  vm.runInContext(functionSource('estimerUneRepMax', 'creerBlocTestsForce'), context);
  assert.equal(vm.runInContext('estimerUneRepMax(100, 1)', context), 100);
  assert.ok(Math.abs(vm.runInContext('estimerUneRepMax(100, 4)', context) - 109.1) < 0.1);
  assert.equal(vm.runInContext('estimerUneRepMax(100, 11)', context), null);
  assert.equal(vm.runInContext('estimerUneRepMax(0, 4)', context), null);
});

test('first heavy and technical squat sessions start separately instead of copying hypertrophy reps', () => {
  const context = vm.createContext({
    programmeActif: { id: 'force', type: 'force-quatre-jours-v1', testsForce: [{ nom: 'Squat barre', estimation: 120 }] },
    getSeancesRealisees: () => [],
    estExercicePoidsCorps: () => false,
  });
  vm.runInContext(functionSource('preparerSeriesInitiales', 'updateSessionProgress'), context);
  const monday = vm.runInContext('preparerSeriesInitiales({ ancienExercice: null, dernierePerformance: { charge: 90, repetitions: 10, seriesDetail: [{ charge: 90, repetitions: 10 }] }, nom: "Squat barre", day: "Lun", objectif: "3 × 3–5", chargePlan: null, semaineLegere: false })', context);
  const thursday = vm.runInContext('preparerSeriesInitiales({ ancienExercice: null, dernierePerformance: { charge: 90, repetitions: 10, seriesDetail: [{ charge: 90, repetitions: 10 }] }, nom: "Squat barre", day: "Jeu", objectif: "3 × 5–6", chargePlan: null, semaineLegere: false })', context);
  assert.equal(monday[0].charge, 90);
  assert.equal(thursday[0].charge, 77.5);
  assert.ok(monday.every((serie) => serie.repetitions === ''));
  assert.ok(thursday.every((serie) => serie.repetitions === ''));
});
