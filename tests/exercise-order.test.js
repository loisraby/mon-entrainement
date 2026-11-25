const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const card = (order) => {
  const classes = new Set();
  return {
    dataset: { exerciseOrder: String(order) },
    classList: {
      add: (name) => classes.add(name),
      delete: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
  };
};
const first = card(0);
const second = card(1);
const third = card(2);
const groups = {};
const makeGroup = (cards) => ({
  cards,
  classList: { hidden: true, toggle(name, value) { this[name] = value; } },
  querySelectorAll: () => cards,
  querySelector: () => cards[0] || null,
  insertBefore(item, next) {
    for (const group of Object.values(groups)) {
      const index = group.cards.indexOf(item);
      if (index >= 0) group.cards.splice(index, 1);
    }
    const index = next ? cards.indexOf(next) : cards.length;
    cards.splice(index, 0, item);
  },
});
groups['#completed-exercises'] = makeGroup([]);
groups['#pending-exercises'] = makeGroup([first, second, third]);
const context = vm.createContext({
  workout: {
    querySelector: (selector) => groups[selector],
    querySelectorAll: () => [...groups['#completed-exercises'].cards, ...groups['#pending-exercises'].cards],
  },
});
for (const [start, end] of [
  ['function cartesExercicesDansOrdre(', 'function sauvegarderSeanceEnCours('],
  ['function rangerExercice(', 'function groupeMusculaire('],
]) {
  vm.runInContext(app.slice(app.indexOf(start), app.indexOf(end)), context);
}

test('completed exercises move up and undo returns them to plan order', () => {
  third.classList.add('completed');
  vm.runInContext('rangerExercice(workout.querySelectorAll(".exercise-card")[2])', context);
  assert.deepEqual(groups['#completed-exercises'].cards, [third]);
  assert.deepEqual(groups['#pending-exercises'].cards, [first, second]);

  second.classList.add('completed');
  vm.runInContext('rangerExercice(workout.querySelectorAll(".exercise-card")[2])', context);
  assert.deepEqual(groups['#completed-exercises'].cards, [second, third]);
  assert.deepEqual(groups['#pending-exercises'].cards, [first]);

  second.classList.delete('completed');
  vm.runInContext('rangerExercice(workout.querySelectorAll(".exercise-card")[0])', context);
  assert.deepEqual(groups['#pending-exercises'].cards, [first, second]);
  assert.deepEqual(Array.from(vm.runInContext('cartesExercicesDansOrdre()', context)), [first, second, third]);
});
