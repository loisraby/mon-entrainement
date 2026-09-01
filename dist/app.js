const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DRAFT_KEY = "seance_en_cours";
let sessions = {};
let timerInterval = null;

const selector = document.querySelector("#day-selector");
const workout = document.querySelector("#workout");
const template = document.querySelector("#exercise-template");
const historyPanel = document.querySelector("#history-panel");
const historyList = document.querySelector("#history-list");
const statsPanel = document.querySelector("#stats-panel");
const statsContent = document.querySelector("#stats-content");
const draftPanel = document.querySelector("#draft-panel");
const draftMessage = document.querySelector("#draft-message");
const todayIndex = (new Date().getDay() + 6) % 7;

document.querySelector("#history-button").addEventListener("click", () => afficherHistorique());
document.querySelector("#stats-button").addEventListener("click", () => afficherStatistiques());
document.querySelector("#export-button").addEventListener("click", exporterHistorique);
document.querySelector("#import-input").addEventListener("change", importerHistorique);
document.querySelector("#resume-draft").addEventListener("click", reprendreSeanceEnCours);
document.querySelector("#discard-draft").addEventListener("click", annulerSeanceEnCours);

function getHistorique() {
  return JSON.parse(localStorage.getItem("historique") || "[]");
}

function getSeanceEnCours() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

function sauvegarderSeanceEnCours(day, session) {
  const ancienneSeance = getSeanceEnCours();
  const exercices = [...workout.querySelectorAll(".exercise-card")].map((card) => {
    const charge = Number(card.querySelector(".weight").value) || 0;
    const series = Number(card.querySelector(".sets").value) || 0;
    const repetitions = Number(card.querySelector(".reps").value) || 0;
    return {
      nom: card.querySelector(".exercise-name").textContent,
      charge,
      series,
      repetitions,
      termine: card.classList.contains("completed"),
    };
  });
  const brouillon = {
    jour: day,
    nom: session.title,
    commenceeLe: ancienneSeance?.commenceeLe || new Date().toISOString(),
    modifieeLe: new Date().toISOString(),
    exercices,
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(brouillon));
}

function afficherSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon) {
    draftPanel.classList.add("hidden");
    return;
  }
  draftMessage.textContent = `${brouillon.nom} · dernière sauvegarde : ${new Date(brouillon.modifieeLe).toLocaleString("fr-FR")}`;
  draftPanel.classList.remove("hidden");
}

function reprendreSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon || !sessions[brouillon.jour]) return;
  draftPanel.classList.add("hidden");
  renderDay(brouillon.jour, brouillon);
}

function annulerSeanceEnCours() {
  const brouillon = getSeanceEnCours();
  if (!brouillon) return;
  if (!confirm(`Annuler la séance « ${brouillon.nom} » ? Les charges et reps saisies seront effacées.`)) return;
  localStorage.removeItem(DRAFT_KEY);
  draftPanel.classList.add("hidden");
  renderDay(days[todayIndex]);
}

function exporterHistorique() {
  const sauvegarde = {
    version: 1,
    exporteeLe: new Date().toISOString(),
    historique: getHistorique(),
  };
  const fichier = new Blob([JSON.stringify(sauvegarde, null, 2)], {
    type: "application/json",
  });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(fichier);
  lien.download = `sauvegarde-entrainement-${dateKey(new Date())}.json`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

function importerHistorique(event) {
  const fichier = event.target.files[0];
  if (!fichier) return;

  const lecteur = new FileReader();
  lecteur.addEventListener("load", () => {
    try {
      const contenu = JSON.parse(lecteur.result);
      const historique = Array.isArray(contenu) ? contenu : contenu.historique;
      if (!Array.isArray(historique)) throw new Error("format inconnu");
      if (!confirm(`Restaurer ${historique.length} séance(s) ? Les données actuelles de cet appareil seront remplacées.`)) return;
      localStorage.setItem("historique", JSON.stringify(historique));
      alert("Sauvegarde restaurée !");
      afficherHistorique(true);
    } catch {
      alert("Ce fichier n’est pas une sauvegarde valide de Mon entraînement.");
    } finally {
      event.target.value = "";
    }
  });
  lecteur.readAsText(fichier);
}

function formatKg(value) {
  return Math.round(value).toLocaleString("fr-FR");
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function debutSemaine(date) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function updateVolume(card) {
  const charge = Number(card.querySelector(".weight").value) || 0;
  const series = Number(card.querySelector(".sets").value) || 0;
  const repetitions = Number(card.querySelector(".reps").value) || 0;
  card.querySelector(".volume").textContent = `Volume : ${charge * series * repetitions} kg`;
  updateTotalVolume();
}

function updateTotalVolume() {
  let total = 0;
  document.querySelectorAll(".exercise-card").forEach((card) => {
    const charge = Number(card.querySelector(".weight").value) || 0;
    const series = Number(card.querySelector(".sets").value) || 0;
    const repetitions = Number(card.querySelector(".reps").value) || 0;
    total += charge * series * repetitions;
  });
  document.querySelector("#session-total").textContent = `Volume total : ${formatKg(total)} kg`;
  return total;
}

function updateSessionProgress() {
  const cards = [...workout.querySelectorAll(".exercise-card")];
  const completed = cards.filter((card) => card.classList.contains("completed")).length;
  const progress = workout.querySelector("#session-progress");
  if (progress) progress.textContent = `${completed} / ${cards.length} exercices terminés`;
  return { completed, total: cards.length };
}

function afficherHistorique(forceOpen = false) {
  if (!forceOpen && !historyPanel.classList.contains("hidden")) {
    historyPanel.classList.add("hidden");
    document.querySelector("#history-button").scrollIntoView({ behavior: "smooth" });
    return;
  }

  statsPanel.classList.add("hidden");
  const historique = getHistorique();
  historyList.innerHTML = "";

  if (historique.length === 0) {
    historyList.innerHTML = "<p class='muted'>Aucune séance sauvegardée pour le moment.</p>";
  } else {
    [...historique].reverse().forEach((seance) => {
      const date = new Date(seance.date).toLocaleString("fr-FR");
      const details = (seance.exercices || []).map((exercice) => `
        <p class="history-exercise">${exercice.nom} : ${exercice.series} × ${exercice.repetitions} à ${exercice.charge} kg</p>
      `).join("") || "<p class='muted'>Détails non enregistrés pour cette ancienne séance.</p>";
      const deleteId = seance.id || seance.date;
      historyList.insertAdjacentHTML("beforeend", `
        <article class="history-entry">
          <strong>${seance.nom}</strong>
          <p class="muted">${date} · Volume : ${formatKg(seance.volume)} kg</p>
          ${details}
          <button class="delete-session" data-id="${deleteId}">Supprimer</button>
        </article>
      `);
    });

    historyList.querySelectorAll(".delete-session").forEach((button) => {
      button.addEventListener("click", () => {
        if (!confirm("Supprimer définitivement cette séance ?")) return;
        const id = button.dataset.id;
        const updated = historique.filter((seance) => String(seance.id || seance.date) !== id);
        localStorage.setItem("historique", JSON.stringify(updated));
        afficherHistorique(true);
      });
    });
  }

  historyPanel.classList.remove("hidden");
  historyPanel.scrollIntoView({ behavior: "smooth" });
}

function creerCalendrierActivite(volumesParJour, year) {
  const start = new Date(year, 0, 1);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(year, 11, 31);
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  let cells = "";

  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const volume = volumesParJour.get(dateKey(date)) || 0;
    const level = volume === 0 ? 0 : volume < 3000 ? 1 : volume < 7000 ? 2 : 3;
    const title = `${date.toLocaleDateString("fr-FR")} : ${formatKg(volume)} kg`;
    cells += `<span class="activity-cell level-${level}" title="${title}"></span>`;
  }
  return cells;
}

function creerGraphiqueHebdomadaire(volumesParSemaine) {
  const currentWeek = debutSemaine(new Date());
  const weeks = [];
  for (let offset = 11; offset >= 0; offset--) {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - offset * 7);
    weeks.push({
      label: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      volume: volumesParSemaine.get(dateKey(date)) || 0,
    });
  }
  const max = Math.max(...weeks.map((week) => week.volume), 1);
  return weeks.map((week) => {
    const height = Math.max((week.volume / max) * 100, week.volume ? 6 : 1);
    return `<div class="week-bar-wrap" title="${week.label} : ${formatKg(week.volume)} kg"><div class="week-bar" style="height: ${height}%"></div><span>${week.label}</span></div>`;
  }).join("");
}

function afficherProgressionExercice(nomExercice, historique, zone) {
  const performances = [];

  historique.forEach((seance) => {
    const exercice = (seance.exercices || []).find(
      (item) => item.nom === nomExercice,
    );
    if (exercice) {
      performances.push({ ...exercice, date: new Date(seance.date) });
    }
  });

  if (performances.length === 0) {
    zone.innerHTML = "<p class='muted'>Pas encore de donnée pour cet exercice.</p>";
    return;
  }

  const derniere = performances.at(-1);
  const meilleureCharge = Math.max(...performances.map((item) => item.charge));
  const dernieresPerformances = performances.slice(-12);
  const maxCharge = Math.max(...dernieresPerformances.map((item) => item.charge), 1);
  const bars = dernieresPerformances.map((item) => {
    const height = Math.max((item.charge / maxCharge) * 100, 6);
    const label = item.date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    return `<div class="progress-bar-wrap" title="${label} : ${item.charge} kg · ${item.series} × ${item.repetitions}"><div class="progress-bar" style="height: ${height}%"></div><span>${label}</span></div>`;
  }).join("");

  zone.innerHTML = `
    <div class="exercise-summary">
      <span>Dernière performance<strong>${derniere.charge} kg · ${derniere.series} × ${derniere.repetitions}</strong></span>
      <span>Meilleure charge<strong>${meilleureCharge} kg</strong></span>
    </div>
    <div class="exercise-progress-chart">${bars}</div>
  `;
}

function afficherStatistiques() {
  if (!statsPanel.classList.contains("hidden")) {
    statsPanel.classList.add("hidden");
    document.querySelector("#stats-button").scrollIntoView({ behavior: "smooth" });
    return;
  }

  historyPanel.classList.add("hidden");
  const historique = getHistorique();
  if (historique.length === 0) {
    statsContent.innerHTML = "<p class='muted'>Enregistre une première séance pour voir tes statistiques.</p>";
  } else {
    const now = new Date();
    const startOfWeek = debutSemaine(now);
    const volumesParJour = new Map();
    const volumesParSemaine = new Map();
    const meilleuresCharges = new Map();
    let volumeTotal = 0;
    let volumeCetteSemaine = 0;

    historique.forEach((seance) => {
      const date = new Date(seance.date);
      const volume = Number(seance.volume) || 0;
      const day = dateKey(date);
      const week = dateKey(debutSemaine(date));
      volumeTotal += volume;
      volumesParJour.set(day, (volumesParJour.get(day) || 0) + volume);
      volumesParSemaine.set(week, (volumesParSemaine.get(week) || 0) + volume);
      if (date >= startOfWeek) volumeCetteSemaine += volume;

      (seance.exercices || []).forEach((exercice) => {
        const meilleure = meilleuresCharges.get(exercice.nom);
        if (!meilleure || exercice.charge > meilleure.charge) {
          meilleuresCharges.set(exercice.nom, exercice);
        }
      });
    });

    const records = [...meilleuresCharges.entries()]
      .sort((a, b) => b[1].charge - a[1].charge)
      .slice(0, 5)
      .map(([nom, performance]) => `<li>${nom}<strong>${performance.charge} kg</strong></li>`)
      .join("");
    const optionsExercices = [...meilleuresCharges.keys()]
      .sort()
      .map((nom) => `<option value="${nom}">${nom}</option>`)
      .join("");

    statsContent.innerHTML = `
      <div class="stats-grid">
        <article class="stat-card"><span>Séances</span><strong>${historique.length}</strong></article>
        <article class="stat-card"><span>Volume total</span><strong>${formatKg(volumeTotal)} kg</strong></article>
        <article class="stat-card"><span>Cette semaine</span><strong>${formatKg(volumeCetteSemaine)} kg</strong></article>
      </div>
      <h3>Activité ${now.getFullYear()}</h3>
      <div class="activity-calendar">${creerCalendrierActivite(volumesParJour, now.getFullYear())}</div>
      <p class="calendar-legend muted">Plus la case est verte, plus le volume du jour est élevé.</p>
      <h3>Volume hebdomadaire</h3>
      <div class="weekly-chart">${creerGraphiqueHebdomadaire(volumesParSemaine)}</div>
      <h3>Meilleures charges</h3>
      <ul class="records-list">${records || "<li>Aucune charge enregistrée.</li>"}</ul>
      <h3>Progression par exercice</h3>
      <select id="exercise-select" class="exercise-select">${optionsExercices}</select>
      <div id="exercise-progress"></div>
    `;

    const selectExercice = statsContent.querySelector("#exercise-select");
    const progression = statsContent.querySelector("#exercise-progress");
    const mettreAJourProgression = () =>
      afficherProgressionExercice(selectExercice.value, historique, progression);
    selectExercice.addEventListener("change", mettreAJourProgression);
    mettreAJourProgression();
  }
  statsPanel.classList.remove("hidden");
  statsPanel.scrollIntoView({ behavior: "smooth" });
}

async function chargerProgramme() {
  const reponse = await fetch("programme.json");
  const programme = await reponse.json();
  sessions = programme.seances;
  renderDay(days[todayIndex]);
  afficherSeanceEnCours();
}

function trouverDernierePerformance(nomExercice) {
  const historique = getHistorique();
  for (let index = historique.length - 1; index >= 0; index--) {
    const performance = (historique[index].exercices || []).find((exercice) => exercice.nom === nomExercice);
    if (performance) return performance;
  }
  return null;
}

function demarrerMinuteur(secondes) {
  clearInterval(timerInterval);
  let restant = secondes;
  const display = document.querySelector("#timer-display");
  function afficherTemps() {
    const minutes = Math.floor(restant / 60);
    display.textContent = `${minutes}:${String(restant % 60).padStart(2, "0")}`;
    if (restant === 0) {
      clearInterval(timerInterval);
      alert("Repos terminé !");
    }
    restant -= 1;
  }
  afficherTemps();
  timerInterval = setInterval(afficherTemps, 1000);
}

function renderDay(day, brouillon = null) {
  selector.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.textContent === day);
  });
  workout.innerHTML = "";
  const session = sessions[day];
  if (!session) {
    workout.innerHTML = "<p class='rest'>Aujourd’hui : récupération, course ou mobilité selon ton programme.</p>";
    return;
  }

  workout.insertAdjacentHTML("beforeend", `<h2>${session.title}</h2><p class="workout-meta">${session.duration}</p><p id="session-total" class="muted">Volume total : 0 kg</p><p id="session-progress" class="session-progress">0 / 0 exercices terminés</p>`);
  const seanceEnCours = brouillon || getSeanceEnCours();
  session.exercises.forEach(([name, target, weight, note, restSeconds = 90]) => {
    const card = template.content.cloneNode(true);
    card.querySelector(".exercise-name").textContent = name;
    card.querySelector(".exercise-note").textContent = note;
    card.querySelector(".target").textContent = target;
    const boutonReposConseille = card.querySelector('[data-seconds="90"]');
    boutonReposConseille.dataset.seconds = restSeconds;
    boutonReposConseille.textContent = `Repos conseillé : ${restSeconds} s`;
    const dernierePerformance = trouverDernierePerformance(name);
    card.querySelector(".last-performance").textContent = dernierePerformance
      ? `Dernière fois : ${dernierePerformance.series} × ${dernierePerformance.repetitions} à ${dernierePerformance.charge} kg`
      : "Aucune performance enregistrée.";
    const ancienExercice = seanceEnCours?.jour === day
      ? (seanceEnCours.exercices || []).find((exercice) => exercice.nom === name)
      : null;
    card.querySelector(".weight").value = ancienExercice?.charge ?? weight;
    card.querySelector(".sets").value = ancienExercice?.series ?? target.split(" ")[0];
    card.querySelector(".reps").value = ancienExercice?.repetitions ?? "";
    if (ancienExercice?.termine) {
      card.querySelector(".exercise-card").classList.add("completed");
      card.querySelector(".complete-exercise").textContent = "Modifier l’exercice";
      card.querySelector(".exercise-status").textContent = "Terminé ✓";
    }
    card.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => {
      updateVolume(input.closest(".exercise-card"));
      sauvegarderSeanceEnCours(day, session);
    }));
    card.querySelectorAll(".rest-button").forEach((button) => button.addEventListener("click", () => demarrerMinuteur(Number(button.dataset.seconds))));
    card.querySelector(".complete-exercise").addEventListener("click", (event) => {
      const exerciseCard = event.currentTarget.closest(".exercise-card");
      const completed = exerciseCard.classList.toggle("completed");
      event.currentTarget.textContent = completed ? "Modifier l’exercice" : "Exercice terminé";
      exerciseCard.querySelector(".exercise-status").textContent = completed ? "Terminé ✓" : "";
      updateSessionProgress();
      sauvegarderSeanceEnCours(day, session);
      if (completed) demarrerMinuteur(restSeconds);
    });
    workout.append(card);
  });

  workout.querySelectorAll(".exercise-card").forEach(updateVolume);
  updateSessionProgress();
  workout.insertAdjacentHTML("beforeend", "<button id='finish-button' class='finish-button'>Terminer la séance</button>");
  workout.querySelector("#finish-button").addEventListener("click", () => {
    const progress = updateSessionProgress();
    if (!confirm(`Enregistrer cette séance ? ${progress.completed} / ${progress.total} exercices sont marqués comme terminés.`)) return;
    const volume = updateTotalVolume();
    const exercices = [...workout.querySelectorAll(".exercise-card")].map((card) => {
      const charge = Number(card.querySelector(".weight").value) || 0;
      const series = Number(card.querySelector(".sets").value) || 0;
      const repetitions = Number(card.querySelector(".reps").value) || 0;
      return { nom: card.querySelector(".exercise-name").textContent, charge, series, repetitions, volume: charge * series * repetitions };
    });
    const historique = getHistorique();
    const seanceTerminee = { id: Date.now(), date: new Date().toISOString(), jour: day, nom: session.title, volume, exercices };
    historique.push(seanceTerminee);
    localStorage.setItem("historique", JSON.stringify(historique));
    localStorage.removeItem(DRAFT_KEY);
    draftPanel.classList.add("hidden");
    const finishButton = workout.querySelector("#finish-button");
    finishButton.disabled = true;
    finishButton.textContent = "Séance enregistrée ✓";
    alert(`Séance enregistrée !\n${seanceTerminee.nom}\nVolume total : ${formatKg(volume)} kg\nSéances sauvegardées : ${historique.length}`);
  });
}

days.forEach((day) => {
  const button = document.createElement("button");
  button.textContent = day;
  button.addEventListener("click", () => renderDay(day));
  selector.append(button);
});

chargerProgramme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
