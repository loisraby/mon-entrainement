const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DRAFT_KEY = "seance_en_cours";
const PROGRAMMES_KEY = "programmes_entrainement_v1";
const PROGRAMME_ACTIF_KEY = "programme_actif_v1";
const NOTES_EXERCICES_KEY = "notes_exercices_v1";
let sessions = {};
let programmeActif = null;
let timerInterval = null;
let timerEndAt = null;

const RESSENTIS = {
  facile: "🟢 Facile",
  pile: "🟡 Tout pile",
  galere: "🔴 Galère",
};

const VARIANTES = {
  "Développé couché barre": ["Développé couché haltères", "Chest press machine"],
  "Développé incliné haltères": ["Développé incliné barre", "Chest press inclinée"],
  "Développé militaire haltères": ["Développé militaire barre", "Shoulder press machine"],
  "Développé militaire barre": ["Développé militaire haltères", "Shoulder press machine"],
  "Écarté poulie haute (pecs)": ["Pec deck", "Écarté haltères incliné"],
  "Écarté poulie basse (pecs)": ["Pec deck", "Écarté haltères incliné"],
  "Élévations latérales haltères": ["Élévations latérales câble", "Machine élévations latérales"],
  "Élévations latérales câble": ["Élévations latérales haltères", "Machine élévations latérales"],
  "Extensions triceps poulie haute": ["Pushdown triceps barre droite", "Extensions triceps haltère"],
  "Dips lestés ou barre": ["Dips assistés", "Développé serré"],
  "Squat barre": ["Hack squat", "Squat Smith machine"],
  "Romanian deadlift": ["Soulevé de terre jambes tendues", "Leg curl assis"],
  "Presse à cuisses": ["Hack squat", "Squat Smith machine"],
  "Leg curl couché": ["Leg curl assis", "Leg curl debout"],
  "Fente marchée haltères": ["Split squat bulgare", "Fentes Smith machine"],
  "Hip thrust barre": ["Hip thrust machine", "Glute bridge barre"],
  "Rowing barre pronation": ["Rowing T-bar", "Rowing machine"],
  "Traction lestée ou assistée": ["Tirage poulie haute prise neutre", "Tractions assistées"],
  "Rowing haltère unilatéral": ["Rowing machine", "Rowing poulie basse unilatéral"],
  "Tirage poulie haute prise neutre": ["Traction assistée", "Tirage poulie haute prise large"],
  "Tirage poulie basse serré": ["Rowing machine", "Tirage poulie basse prise large"],
  "Curl barre droite": ["Curl barre EZ", "Curl poulie basse"],
  "Curl marteau haltères": ["Curl marteau corde", "Curl machine"],
  "Rowing machine (Hammer Strength)": ["Rowing haltère unilatéral", "Rowing T-bar"],
  "Tirage poulie haute prise large": ["Traction assistée", "Tirage poulie haute prise neutre"],
  "Pull-over câble": ["Pull-over machine", "Pull-over haltère"],
};

const selector = document.querySelector("#day-selector");
const workout = document.querySelector("#workout");
const template = document.querySelector("#exercise-template");
const historyPanel = document.querySelector("#history-panel");
const historyList = document.querySelector("#history-list");
const statsPanel = document.querySelector("#stats-panel");
const statsContent = document.querySelector("#stats-content");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisContent = document.querySelector("#analysis-content");
const programsPanel = document.querySelector("#programs-panel");
const programList = document.querySelector("#program-list");
const programEditor = document.querySelector("#program-editor");
let jourEdite = "Lun";
const draftPanel = document.querySelector("#draft-panel");
const draftMessage = document.querySelector("#draft-message");
const todayIndex = (new Date().getDay() + 6) % 7;

document.querySelector("#history-button").addEventListener("click", () => afficherHistorique());
document.querySelector("#stats-button").addEventListener("click", () => afficherStatistiques());
document.querySelector("#analysis-button").addEventListener("click", () => afficherAnalyse());
document.querySelector("#programs-button").addEventListener("click", () => afficherProgrammes());
document.querySelector("#duplicate-program").addEventListener("click", copierProgrammeActif);
document.querySelector("#edit-program").addEventListener("click", ouvrirEditeurProgramme);
document.querySelector("#deload-toggle").addEventListener("click", basculerSemaineLegere);
document.querySelector("#export-button").addEventListener("click", exporterHistorique);
document.querySelector("#import-input").addEventListener("change", importerHistorique);
document.querySelector("#resume-draft").addEventListener("click", reprendreSeanceEnCours);
document.querySelector("#discard-draft").addEventListener("click", annulerSeanceEnCours);

function getHistorique() {
  return JSON.parse(localStorage.getItem("historique") || "[]");
}

function texteDernierePerformance(performance) {
  if (!performance) return "Aucune performance enregistrée.";
  const series = resumeSeries(performance);
  const ressenti = performance.ressenti ? ` · ${RESSENTIS[performance.ressenti]}` : "";
  const commentaire = performance.commentaire ? ` — ${performance.commentaire}` : "";
  return `Dernière fois : ${series}${ressenti}${commentaire}`;
}

function getNotesExercices() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_EXERCICES_KEY) || "{}");
  } catch {
    return {};
  }
}

function sauvegarderNoteExercice(nom, note) {
  const notes = getNotesExercices();
  if (note.trim()) notes[nom] = note.trim();
  else delete notes[nom];
  localStorage.setItem(NOTES_EXERCICES_KEY, JSON.stringify(notes));
}

function conseilProgression(performance) {
  if (!performance) return "Première séance : choisis une charge propre et note ton ressenti.";
  const serie = resumeSeries(performance);
  const dernierRir = performance.seriesDetail?.filter((item) => !item.echauffement).at(-1)?.rir ?? performance.rir;
  if (Number(dernierRir) <= 1 && dernierRir !== null && dernierRir !== "" && dernierRir !== undefined) return `Dernière fois : ${serie}. Dernière série à RIR ${dernierRir} : garde la charge et vise une exécution aussi propre avant de chercher à progresser.`;
  if (Number(dernierRir) >= 3) return `Dernière fois : ${serie}. Dernière série à RIR ${dernierRir} : tu as de la marge, ajoute 1 rep par série ou augmente légèrement la charge.`;
  if (performance.ressenti === "facile") return `Dernière fois : ${serie}. Tu peux viser +1 rep par série, ou augmenter légèrement la charge si tu étais déjà au haut de ta fourchette.`;
  if (performance.ressenti === "galere") return `Dernière fois : ${serie}. Garde la charge et cherche surtout des reps propres ; ne force pas une hausse aujourd’hui.`;
  return `Dernière fois : ${serie}. Garde la charge et essaie d’ajouter 1 rep au total si la forme reste bonne.`;
}

function resumeSeries(performance) {
  const seriesTravail = performance.seriesDetail?.filter((serie) => !serie.echauffement);
  return seriesTravail?.length
    ? seriesTravail.map((serie) => `${serie.charge} kg × ${serie.repetitions}${serie.rir !== undefined && serie.rir !== null && serie.rir !== "" ? ` (RIR ${serie.rir})` : ""}`).join(" · ")
    : `${performance.series} × ${performance.repetitions} à ${performance.charge} kg`;
}

function configurerRessenti(zone, ressenti, commentaire, onChange, selecteurCommentaire = ".exercise-comment") {
  const appliquer = (valeur) => {
    zone.dataset.ressenti = valeur || "";
    zone.querySelectorAll("[data-feeling]").forEach((button) => {
      const selected = button.dataset.feeling === valeur;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected);
    });
  };

  appliquer(ressenti);
  const champCommentaire = zone.querySelector(selecteurCommentaire);
  if (champCommentaire) champCommentaire.value = commentaire || "";
  zone.querySelectorAll("[data-feeling]").forEach((button) => {
    button.addEventListener("click", () => {
      appliquer(zone.dataset.ressenti === button.dataset.feeling ? "" : button.dataset.feeling);
      onChange();
    });
  });
  if (champCommentaire) champCommentaire.addEventListener("input", onChange);
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
    const donnees = lireExercice(card);
    return {
      nom: card.querySelector(".exercise-name").textContent,
      programmeNom: card.dataset.programmeName,
      ...donnees,
      termine: card.classList.contains("completed"),
      ressenti: card.querySelector(".feeling-area").dataset.ressenti || null,
      commentaire: card.querySelector(".exercise-comment").value.trim(),
    };
  });
  const brouillon = {
    programmeId: programmeActif?.id || null,
    programme: programmeActif?.nom || null,
    jour: day,
    nom: session.title,
    commenceeLe: ancienneSeance?.commenceeLe || new Date().toISOString(),
    modifieeLe: new Date().toISOString(),
    exercices,
    ressentiSeance: workout.querySelector(".session-feedback")?.dataset.ressenti || null,
    energie: Number(workout.querySelector(".session-energy")?.value) || null,
    sommeil: Number(workout.querySelector(".session-sleep")?.value) || null,
    commentaireSeance: workout.querySelector(".session-comment")?.value.trim() || "",
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
  if (!brouillon) return;
  const programmes = getProgrammes();
  const programmeDuBrouillon = programmes.find((programme) => programme.id === brouillon.programmeId);
  if (programmeDuBrouillon) activerProgramme(programmeDuBrouillon.id, false);
  if (!sessions[brouillon.jour]) return;
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
    version: 2,
    exporteeLe: new Date().toISOString(),
    historique: getHistorique(),
    programmes: getProgrammes(),
    programmeActif: localStorage.getItem(PROGRAMME_ACTIF_KEY),
    notesExercices: getNotesExercices(),
    seanceEnCours: getSeanceEnCours(),
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
      const sauvegardeComplete = Array.isArray(contenu.programmes);
      if (!confirm(`Restaurer ${historique.length} séance(s)${sauvegardeComplete ? " et tous les programmes" : ""} ? Les données actuelles correspondantes de cet appareil seront remplacées.`)) return;
      localStorage.setItem("historique", JSON.stringify(historique));
      if (sauvegardeComplete) {
        localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(contenu.programmes));
        if (typeof contenu.programmeActif === "string") localStorage.setItem(PROGRAMME_ACTIF_KEY, contenu.programmeActif);
        else localStorage.removeItem(PROGRAMME_ACTIF_KEY);
        if (contenu.notesExercices && typeof contenu.notesExercices === "object") localStorage.setItem(NOTES_EXERCICES_KEY, JSON.stringify(contenu.notesExercices));
        else localStorage.removeItem(NOTES_EXERCICES_KEY);
        if (contenu.seanceEnCours && typeof contenu.seanceEnCours === "object") localStorage.setItem(DRAFT_KEY, JSON.stringify(contenu.seanceEnCours));
        else localStorage.removeItem(DRAFT_KEY);
      }
      alert("Sauvegarde restaurée !");
      chargerProgramme();
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
  const { volume } = lireExercice(card);
  card.querySelector(".volume").textContent = `Volume : ${formatKg(volume)} kg`;
  updateTotalVolume();
}

function updateTotalVolume() {
  let total = 0;
  document.querySelectorAll(".exercise-card").forEach((card) => {
    total += lireExercice(card).volume;
  });
  document.querySelector("#session-total").textContent = `Volume total : ${formatKg(total)} kg`;
  return total;
}

function lireExercice(card) {
  const seriesDetail = [...card.querySelectorAll(".series-row")].map((row) => ({
    charge: Number(row.querySelector(".set-weight").value) || 0,
    repetitions: Number(row.querySelector(".set-reps").value) || 0,
    echauffement: row.querySelector(".set-warmup").checked,
    rir: row.querySelector(".set-rir").value === "" ? null : Number(row.querySelector(".set-rir").value),
  }));
  const seriesTravail = seriesDetail.filter((serie) => !serie.echauffement);
  const volume = seriesTravail.reduce((total, serie) => total + serie.charge * serie.repetitions, 0);
  const charge = Math.max(...seriesTravail.map((serie) => serie.charge), 0);
  const repetitions = seriesTravail.length
    ? Math.round((seriesTravail.reduce((total, serie) => total + serie.repetitions, 0) / seriesTravail.length) * 10) / 10
    : 0;
  return { charge, series: seriesTravail.length, repetitions, seriesDetail, volume };
}

function ajouterSerie(card, charge, repetitions = "", echauffement = false, rir = "") {
  const list = card.querySelector(".series-list");
  const row = document.createElement("div");
  row.className = `series-row${echauffement ? " warmup-row" : ""}`;
  row.innerHTML = `<span class="series-number"></span><label>Charge (kg)<input class="set-weight" type="number" step="0.5" min="0"></label><label>Reps<input class="set-reps" type="number" step="1" min="0" max="100"></label><label>RIR<select class="set-rir"><option value="">—</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select></label><label class="warmup-toggle"><input class="set-warmup" type="checkbox"> Échauff.</label>`;
  row.querySelector(".series-number").textContent = echauffement ? "Échauff." : `Série ${list.children.length + 1}`;
  row.querySelector(".set-weight").value = charge;
  row.querySelector(".set-reps").value = repetitions;
  row.querySelector(".set-warmup").checked = echauffement;
  row.querySelector(".set-rir").value = rir ?? "";
  row.querySelectorAll("input, select").forEach((input) => input.addEventListener(input.type === "checkbox" || input.tagName === "SELECT" ? "change" : "input", () => {
    const exerciseCard = input.closest(".exercise-card");
    row.classList.toggle("warmup-row", row.querySelector(".set-warmup").checked);
    row.querySelector(".series-number").textContent = row.querySelector(".set-warmup").checked ? "Échauff." : `Série ${[...list.children].filter((item) => !item.querySelector(".set-warmup").checked).indexOf(row) + 1}`;
    updateVolume(exerciseCard);
    sauvegarderSeanceEnCours(exerciseCard.dataset.day, sessions[exerciseCard.dataset.day]);
  }));
  list.append(row);
}

function updateSessionProgress() {
  const cards = [...workout.querySelectorAll(".exercise-card")];
  const completed = cards.filter((card) => card.classList.contains("completed")).length;
  const progress = workout.querySelector("#session-progress");
  if (progress) progress.textContent = `${completed} / ${cards.length} exercices terminés`;
  return { completed, total: cards.length };
}

function groupeMusculaire(nom) {
  const texte = nom.toLowerCase();
  if (/curl|biceps/.test(texte)) return "Biceps";
  if (/triceps|dips/.test(texte)) return "Triceps";
  if (/développé|écarté|pec deck|chest press/.test(texte)) return "Pectoraux";
  if (/rowing|tirage|traction|pull-over|face pull|shrugs/.test(texte)) return "Dos";
  if (/élévation|oiseau|militaire|shoulder/.test(texte)) return "Épaules";
  return "Jambes et fessiers";
}

function afficherAnalyse() {
  if (!analysisPanel.classList.contains("hidden")) {
    analysisPanel.classList.add("hidden");
    return;
  }
  historyPanel.classList.add("hidden");
  statsPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  const performances = new Map();
  getHistorique().forEach((seance) => {
    (seance.exercices || []).forEach((exercice, ordre) => {
      const volume = Number(exercice.volume) || (exercice.seriesDetail || []).reduce((total, serie) => total + serie.charge * serie.repetitions, 0);
      const rir = exercice.seriesDetail?.filter((serie) => !serie.echauffement).at(-1)?.rir ?? exercice.rir ?? null;
      if (!performances.has(exercice.nom)) performances.set(exercice.nom, []);
      performances.get(exercice.nom).push({ volume, rir, ressenti: exercice.ressenti, ordre, total: seance.exercices.length, energie: seance.energie, sommeil: seance.sommeil, semaineLegere: seance.semaineLegere });
    });
  });
  if (performances.size === 0) {
    analysisContent.innerHTML = "<p class='muted'>Enregistre quelques séances pour lancer l’analyse.</p>";
  } else {
    const lignes = [...performances.entries()].sort().map(([nom, valeurs]) => {
      const groupe = groupeMusculaire(nom);
      const valeursComparables = valeurs.filter((item) => !item.semaineLegere);
      if (valeursComparables.length < 4) return `<article class="analysis-entry"><strong>${nom}</strong><p class="muted">${groupe} · ${valeursComparables.length} passage(s) comparables : encore trop tôt pour conclure.</p></article>`;
      const recent = valeursComparables.slice(-3).reduce((total, item) => total + item.volume, 0) / 3;
      const precedent = valeursComparables.slice(-6, -3).reduce((total, item) => total + item.volume, 0) / 3;
      const evolution = precedent ? ((recent - precedent) / precedent) * 100 : 0;
      const derniere = valeurs.at(-1);
      const finDeSeance = derniere.ordre >= derniere.total / 2;
      const classe = evolution > 3 ? "trend-up" : evolution < -3 ? "trend-down" : "trend-flat";
      const etat = evolution > 3 ? "Progression visible" : evolution < -3 ? "Baisse à surveiller" : "Stable : possible stagnation";
      const contextes = [];
      if (finDeSeance) contextes.push("Exercice de fin de séance : la fatigue peut expliquer une partie du résultat.");
      if (derniere.rir !== null && derniere.rir !== undefined && derniere.rir <= 1) contextes.push(`Dernière série proche de l’échec (RIR ${derniere.rir}).`);
      if (derniere.energie && derniere.energie <= 2) contextes.push(`Énergie basse (${derniere.energie}/5).`);
      if (derniere.sommeil && derniere.sommeil <= 2) contextes.push(`Sommeil bas (${derniere.sommeil}/5).`);
      if (derniere.semaineLegere) contextes.push("Dernier passage en semaine légère : non utilisé pour calculer la tendance.");
      const contexte = contextes.length ? ` ${contextes.join(" ")}` : "";
      return `<article class="analysis-entry"><strong>${nom}</strong><p class="${classe}">${etat} (${evolution > 0 ? "+" : ""}${Math.round(evolution)} % sur les 3 derniers passages).</p><p class="muted">${groupe}.${contexte}</p></article>`;
    }).join("");
    analysisContent.innerHTML = `<p class="muted">Cette analyse compare des tendances, pas une séance isolée.</p>${lignes}`;
  }
  analysisPanel.classList.remove("hidden");
  analysisPanel.scrollIntoView({ behavior: "smooth" });
}

function afficherHistorique(forceOpen = false) {
  if (!forceOpen && !historyPanel.classList.contains("hidden")) {
    historyPanel.classList.add("hidden");
    document.querySelector("#history-button").scrollIntoView({ behavior: "smooth" });
    return;
  }

  statsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
  const historique = getHistorique();
  historyList.innerHTML = "";

  if (historique.length === 0) {
    historyList.innerHTML = "<p class='muted'>Aucune séance sauvegardée pour le moment.</p>";
  } else {
    [...historique].reverse().forEach((seance) => {
      const date = new Date(seance.date).toLocaleString("fr-FR");
      const details = (seance.exercices || []).map((exercice) => `
        <p class="history-exercise">${exercice.nom} : ${exercice.seriesDetail?.length ? exercice.seriesDetail.map((serie) => `${serie.echauffement ? "Échauff. " : ""}${serie.charge} kg × ${serie.repetitions}${serie.rir !== undefined && serie.rir !== null ? ` (RIR ${serie.rir})` : ""}`).join(" · ") : `${exercice.series} × ${exercice.repetitions} à ${exercice.charge} kg`}${exercice.rir !== undefined && exercice.rir !== null ? ` · RIR ${exercice.rir}` : ""}${exercice.ressenti ? ` · ${RESSENTIS[exercice.ressenti]}` : ""}${exercice.commentaire ? ` — ${exercice.commentaire}` : ""}</p>
      `).join("") || "<p class='muted'>Détails non enregistrés pour cette ancienne séance.</p>";
      const bilan = seance.ressentiSeance || seance.energie || seance.sommeil || seance.commentaireSeance
        ? `<p class="session-history">Bilan : ${seance.ressentiSeance ? RESSENTIS[seance.ressentiSeance] : "non renseigné"}${seance.energie ? ` · énergie ${seance.energie}/5` : ""}${seance.sommeil ? ` · sommeil ${seance.sommeil}/5` : ""}${seance.commentaireSeance ? ` — ${seance.commentaireSeance}` : ""}</p>`
        : "";
      const deleteId = seance.id || seance.date;
      historyList.insertAdjacentHTML("beforeend", `
        <article class="history-entry">
          <strong>${seance.nom}</strong>
          <p class="muted">${date} · ${seance.programme ? `${seance.programme} · ` : ""}${seance.semaineLegere ? "Semaine légère · " : ""}Volume : ${formatKg(seance.volume)} kg</p>
          ${bilan}
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
    return `<div class="progress-bar-wrap" title="${label} : ${resumeSeries(item)}"><div class="progress-bar" style="height: ${height}%"></div><span>${label}</span></div>`;
  }).join("");

  zone.innerHTML = `
    <div class="exercise-summary">
      <span>Dernière performance<strong>${resumeSeries(derniere)}</strong></span>
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
  analysisPanel.classList.add("hidden");
  programsPanel.classList.add("hidden");
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

function getProgrammes() {
  try {
    return JSON.parse(localStorage.getItem(PROGRAMMES_KEY) || "[]");
  } catch {
    return [];
  }
}

function sauvegarderProgrammes(programmes) {
  localStorage.setItem(PROGRAMMES_KEY, JSON.stringify(programmes));
}

function activerProgramme(id, afficher = true) {
  const programme = getProgrammes().find((item) => item.id === id);
  if (!programme) return;
  programmeActif = programme;
  sessions = programme.seances;
  localStorage.setItem(PROGRAMME_ACTIF_KEY, id);
  if (afficher) renderDay(days[todayIndex]);
}

function sauvegarderProgrammeActif() {
  if (!programmeActif) return;
  const programmes = getProgrammes();
  const index = programmes.findIndex((programme) => programme.id === programmeActif.id);
  if (index === -1) return;
  programmes[index] = programmeActif;
  sauvegarderProgrammes(programmes);
}

function basculerSemaineLegere() {
  if (!programmeActif) return;
  programmeActif.semaineLegere = !programmeActif.semaineLegere;
  sauvegarderProgrammeActif();
  document.querySelector("#deload-toggle").textContent = programmeActif.semaineLegere ? "Désactiver la semaine légère" : "Activer la semaine légère";
  renderDay(days[todayIndex]);
}

function afficherProgrammes() {
  if (!programsPanel.classList.contains("hidden")) {
    programsPanel.classList.add("hidden");
    return;
  }
  historyPanel.classList.add("hidden");
  statsPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  programEditor.classList.add("hidden");
  document.querySelector("#deload-toggle").textContent = programmeActif?.semaineLegere ? "Désactiver la semaine légère" : "Activer la semaine légère";
  programList.innerHTML = "";
  getProgrammes().forEach((programme) => {
    const ligne = document.createElement("article");
    ligne.className = "program-entry";
    const texte = document.createElement("div");
    const titre = document.createElement("strong");
    titre.textContent = programme.nom;
    const details = document.createElement("p");
    details.className = "muted";
    details.textContent = `${Object.values(programme.seances || {}).length} séances${programme.id === programmeActif?.id ? " · actif" : ""}`;
    texte.append(titre, details);
    const actions = document.createElement("div");
    actions.className = "program-entry-actions";
    const bouton = document.createElement("button");
    bouton.className = "select-program";
    bouton.textContent = programme.id === programmeActif?.id ? "Actif" : "Utiliser";
    bouton.disabled = programme.id === programmeActif?.id;
    bouton.addEventListener("click", () => {
      activerProgramme(programme.id);
      afficherProgrammes();
    });
    actions.append(bouton);
    if (programme.id !== "hypertrophie") {
      const supprimer = document.createElement("button");
      supprimer.className = "delete-program";
      supprimer.textContent = "Supprimer";
      supprimer.addEventListener("click", () => supprimerProgramme(programme.id));
      actions.append(supprimer);
    }
    ligne.append(texte, actions);
    programList.append(ligne);
  });
  programsPanel.classList.remove("hidden");
  programsPanel.scrollIntoView({ behavior: "smooth" });
}

function copierProgrammeActif() {
  if (!programmeActif) return;
  const nom = prompt("Nom du nouveau programme :", `${programmeActif.nom} — copie`);
  if (!nom?.trim()) return;
  const programmes = getProgrammes();
  const copie = {
    id: `programme-${Date.now()}`,
    nom: nom.trim(),
    seances: JSON.parse(JSON.stringify(programmeActif.seances)),
  };
  programmes.push(copie);
  sauvegarderProgrammes(programmes);
  activerProgramme(copie.id);
  programsPanel.classList.add("hidden");
  afficherProgrammes();
}

function supprimerProgramme(id) {
  const programmes = getProgrammes();
  const programme = programmes.find((item) => item.id === id);
  if (!programme || programme.id === "hypertrophie") return;
  if (!confirm(`Supprimer le programme « ${programme.nom} » ? Les séances déjà enregistrées dans l’historique ne seront pas supprimées.`)) return;
  const restants = programmes.filter((item) => item.id !== id);
  sauvegarderProgrammes(restants);
  if (programmeActif?.id === id) {
    activerProgramme(restants[0].id);
  }
  programsPanel.classList.add("hidden");
  afficherProgrammes();
}

function ouvrirEditeurProgramme() {
  if (!programmeActif) return;
  jourEdite = days.find((day) => sessions[day]) || days[0];
  programList.classList.add("hidden");
  document.querySelector("#duplicate-program").parentElement.classList.add("hidden");
  afficherEditeurProgramme();
  programEditor.classList.remove("hidden");
}

function fermerEditeurProgramme() {
  programEditor.classList.add("hidden");
  programList.classList.remove("hidden");
  document.querySelector("#duplicate-program").parentElement.classList.remove("hidden");
  programsPanel.classList.add("hidden");
  afficherProgrammes();
  renderDay(jourEdite);
}

function creerChamp(label, valeur, classe, type = "text") {
  const bloc = document.createElement("label");
  bloc.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.className = classe;
  input.value = valeur ?? "";
  if (type === "number") input.step = "0.5";
  bloc.append(input);
  return bloc;
}

function sauvegarderModificationsEditeur(alerter = false) {
  if (!programmeActif) return;
  const champNom = programEditor.querySelector(".program-name-input");
  if (champNom) programmeActif.nom = champNom.value.trim() || programmeActif.nom;
  const seanceEditee = sessions[jourEdite];
  if (seanceEditee) {
    seanceEditee.title = programEditor.querySelector(".session-title-input").value.trim() || `Séance ${jourEdite}`;
    seanceEditee.duration = programEditor.querySelector(".session-duration-input").value.trim();
    seanceEditee.exercises = [...programEditor.querySelectorAll(".editor-exercise")].map((ligne) => [
      ligne.querySelector(".edit-exercise-name").value.trim() || "Exercice",
      ligne.querySelector(".edit-exercise-target").value.trim() || "3 × 10",
      Number(ligne.querySelector(".edit-exercise-weight").value) || 0,
      ligne.querySelector(".edit-exercise-note").value.trim(),
      Number(ligne.querySelector(".edit-exercise-rest").value) || 90,
    ]);
  }
  sauvegarderProgrammeActif();
  if (alerter) alert("Programme enregistré !");
}

function afficherEditeurProgramme() {
  const session = sessions[jourEdite];
  programEditor.innerHTML = "";
  const titre = document.createElement("h3");
  titre.textContent = "Modifier le programme";
  const nomProgramme = creerChamp("Nom du programme", programmeActif.nom, "program-name-input");
  const jours = document.createElement("div");
  jours.className = "editor-days";
  days.forEach((day) => {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.textContent = day;
    bouton.classList.toggle("active", day === jourEdite);
    bouton.addEventListener("click", () => {
      sauvegarderModificationsEditeur();
      jourEdite = day;
      afficherEditeurProgramme();
    });
    jours.append(bouton);
  });
  programEditor.append(titre, nomProgramme, jours);

  if (!session) {
    const texte = document.createElement("p");
    texte.className = "muted";
    texte.textContent = "Aucune séance prévue ce jour-là.";
    const ajouter = document.createElement("button");
    ajouter.className = "backup-button";
    ajouter.textContent = "Ajouter une séance ce jour";
    ajouter.addEventListener("click", () => {
      sessions[jourEdite] = { title: `Séance ${jourEdite}`, duration: "", exercises: [] };
      sauvegarderProgrammeActif();
      afficherEditeurProgramme();
    });
    programEditor.append(texte, ajouter);
  } else {
    const titreSeance = creerChamp("Nom de la séance", session.title, "session-title-input");
    const duree = creerChamp("Durée / indication", session.duration, "session-duration-input");
    const exercices = document.createElement("div");
    exercices.className = "editor-exercises";
    session.exercises.forEach((exercice, index) => {
      const ligne = document.createElement("article");
      ligne.className = "editor-exercise";
      ligne.append(
        creerChamp("Exercice", exercice[0], "edit-exercise-name"),
        creerChamp("Objectif", exercice[1], "edit-exercise-target"),
        creerChamp("Charge", exercice[2], "edit-exercise-weight", "number"),
        creerChamp("Note", exercice[3], "edit-exercise-note"),
        creerChamp("Repos (s)", exercice[4] ?? 90, "edit-exercise-rest", "number"),
      );
      const supprimer = document.createElement("button");
      supprimer.type = "button";
      supprimer.className = "delete-program";
      supprimer.textContent = "Retirer";
      supprimer.addEventListener("click", () => {
        if (!confirm(`Retirer « ${exercice[0]} » de cette séance ?`)) return;
        session.exercises.splice(index, 1);
        sauvegarderProgrammeActif();
        afficherEditeurProgramme();
      });
      ligne.append(supprimer);
      exercices.append(ligne);
    });
    const ajouterExercice = document.createElement("button");
    ajouterExercice.type = "button";
    ajouterExercice.className = "backup-button";
    ajouterExercice.textContent = "+ Ajouter un exercice";
    ajouterExercice.addEventListener("click", () => {
      session.exercises.push(["Nouvel exercice", "3 × 10", 0, "", 90]);
      sauvegarderProgrammeActif();
      afficherEditeurProgramme();
    });
    programEditor.append(titreSeance, duree, exercices, ajouterExercice);
  }

  const actions = document.createElement("div");
  actions.className = "program-actions";
  const enregistrer = document.createElement("button");
  enregistrer.type = "button";
  enregistrer.className = "finish-button";
  enregistrer.textContent = "Enregistrer les modifications";
  enregistrer.addEventListener("click", () => sauvegarderModificationsEditeur(true));
  const fermer = document.createElement("button");
  fermer.type = "button";
  fermer.className = "backup-button";
  fermer.textContent = "Fermer l’éditeur";
  fermer.addEventListener("click", fermerEditeurProgramme);
  actions.append(enregistrer, fermer);
  programEditor.append(actions);
}

async function chargerProgramme() {
  const reponse = await fetch("programme.json");
  const programmeSource = await reponse.json();
  let programmes = getProgrammes();
  if (programmes.length === 0) {
    programmes = [{ id: "hypertrophie", nom: "Hypertrophie", seances: programmeSource.seances }];
    sauvegarderProgrammes(programmes);
  }
  const idActif = localStorage.getItem(PROGRAMME_ACTIF_KEY);
  activerProgramme(programmes.some((programme) => programme.id === idActif) ? idActif : programmes[0].id, false);
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

function derniersPassages(nomExercice) {
  return getHistorique()
    .flatMap((seance) => (seance.exercices || []).filter((exercice) => exercice.nom === nomExercice).map((exercice) => ({ exercice, date: new Date(seance.date) })))
    .slice(-5)
    .reverse();
}

function afficherDerniersPassages(nomExercice, zone) {
  const passages = derniersPassages(nomExercice);
  zone.innerHTML = passages.length
    ? passages.map(({ exercice, date }) => `<p>${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} · ${resumeSeries(exercice)}${exercice.ressenti ? ` · ${RESSENTIS[exercice.ressenti]}` : ""}</p>`).join("")
    : "<p>Aucun passage enregistré.</p>";
}

function demarrerMinuteur(secondes) {
  clearInterval(timerInterval);
  timerEndAt = Date.now() + secondes * 1000;
  const display = document.querySelector("#timer-display");
  function afficherTemps() {
    const restant = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    const minutes = Math.floor(restant / 60);
    display.textContent = `${minutes}:${String(restant % 60).padStart(2, "0")}`;
    if (restant === 0) {
      clearInterval(timerInterval);
      timerEndAt = null;
      alert("Repos terminé !");
    }
  }
  afficherTemps();
  timerInterval = setInterval(afficherTemps, 1000);
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && timerEndAt) {
    const restant = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000));
    document.querySelector("#timer-display").textContent = `${Math.floor(restant / 60)}:${String(restant % 60).padStart(2, "0")}`;
    if (restant === 0) {
      clearInterval(timerInterval);
      timerEndAt = null;
      alert("Repos terminé !");
    }
  }
});

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

  const semaineLegere = Boolean(programmeActif?.semaineLegere);
  workout.insertAdjacentHTML("beforeend", `<h2>${session.title}</h2><p class="workout-meta">${session.duration}</p>${semaineLegere ? "<p class='deload-banner'>Semaine légère : environ −10 % de charge et une série de moins. Ajuste librement selon ta forme.</p>" : ""}<p id="session-total" class="muted">Volume total : 0 kg</p><p id="session-progress" class="session-progress">0 / 0 exercices terminés</p>`);
  const brouillonTrouve = brouillon || getSeanceEnCours();
  const seanceEnCours = brouillonTrouve && (!brouillonTrouve.programmeId || brouillonTrouve.programmeId === programmeActif?.id)
    ? brouillonTrouve
    : null;
  session.exercises.forEach(([name, target, weight, note, restSeconds = 90]) => {
    const card = template.content.cloneNode(true);
    const exerciseCard = card.querySelector(".exercise-card");
    exerciseCard.dataset.programmeName = name;
    exerciseCard.dataset.day = day;
    card.querySelector(".exercise-note").textContent = note;
    card.querySelector(".target").textContent = target;
    const boutonReposConseille = card.querySelector('[data-seconds="90"]');
    boutonReposConseille.dataset.seconds = restSeconds;
    boutonReposConseille.textContent = `Repos conseillé : ${restSeconds} s`;
    const ancienExercice = seanceEnCours?.jour === day
      ? (seanceEnCours.exercices || []).find((exercice) => exercice.programmeNom === name || exercice.nom === name)
      : null;
    const nomEffectif = ancienExercice?.nom || name;
    card.querySelector(".exercise-name").textContent = nomEffectif;
    const dernierePerformance = trouverDernierePerformance(nomEffectif);
    card.querySelector(".last-performance").textContent = texteDernierePerformance(dernierePerformance);
    card.querySelector(".progression-advice").textContent = conseilProgression(dernierePerformance);
    afficherDerniersPassages(nomEffectif, card.querySelector(".exercise-history-list"));
    const notePermanente = card.querySelector(".exercise-memory-input");
    notePermanente.value = getNotesExercices()[nomEffectif] || "";
    notePermanente.addEventListener("input", () => sauvegarderNoteExercice(exerciseCard.querySelector(".exercise-name").textContent, notePermanente.value));

    const selectVariante = card.querySelector(".variant-select");
    const variantes = [...new Set([name, ...(VARIANTES[name] || []), nomEffectif])];
    variantes.forEach((variante) => {
      const option = document.createElement("option");
      option.value = variante;
      option.textContent = variante === name ? `${variante} (prévu)` : variante;
      selectVariante.append(option);
    });
    const autreOption = document.createElement("option");
    autreOption.value = "__autre__";
    autreOption.textContent = "Autre exercice…";
    selectVariante.append(autreOption);
    selectVariante.value = nomEffectif;

    card.querySelector(".variant-button").addEventListener("click", (event) => {
      event.currentTarget.closest(".exercise-card").querySelector(".variant-picker").classList.toggle("hidden");
    });
    selectVariante.addEventListener("change", (event) => {
      const exerciseCard = event.currentTarget.closest(".exercise-card");
      let nouveauNom = selectVariante.value;
      if (nouveauNom === "__autre__") {
        nouveauNom = prompt("Nom de l’exercice alternatif :", "");
        if (!nouveauNom) {
          selectVariante.value = exerciseCard.querySelector(".exercise-name").textContent;
          return;
        }
        const option = document.createElement("option");
        option.value = nouveauNom;
        option.textContent = nouveauNom;
        selectVariante.insertBefore(option, autreOption);
        selectVariante.value = nouveauNom;
      }
      exerciseCard.querySelector(".exercise-name").textContent = nouveauNom;
      const derniere = trouverDernierePerformance(nouveauNom);
      exerciseCard.querySelector(".last-performance").textContent = texteDernierePerformance(derniere);
      exerciseCard.querySelector(".progression-advice").textContent = conseilProgression(derniere);
      afficherDerniersPassages(nouveauNom, exerciseCard.querySelector(".exercise-history-list"));
      notePermanente.value = getNotesExercices()[nouveauNom] || "";
      sauvegarderSeanceEnCours(day, session);
    });

    const performanceDeDepart = ancienExercice || dernierePerformance;
    const seriesInitiales = performanceDeDepart?.seriesDetail?.length
      ? performanceDeDepart.seriesDetail
      : Array.from({ length: semaineLegere ? Math.max(1, (Number(target.split(" ")[0]) || 3) - 1) : (Number(ancienExercice?.series || target.split(" ")[0]) || 3) }, () => ({
        charge: performanceDeDepart?.charge ?? (semaineLegere ? Math.round(Number(weight) * 0.9 * 2) / 2 : weight),
        repetitions: performanceDeDepart?.repetitions ?? "",
      }));
    seriesInitiales.forEach((serie) => ajouterSerie(exerciseCard, serie.charge, serie.repetitions, serie.echauffement, serie.rir));
    if (ancienExercice?.termine) {
      card.querySelector(".exercise-card").classList.add("completed");
      card.querySelector(".complete-exercise").textContent = "Modifier l’exercice";
      card.querySelector(".exercise-status").textContent = "Terminé ✓";
    }
    configurerRessenti(
      card.querySelector(".feeling-area"),
      ancienExercice?.ressenti,
      ancienExercice?.commentaire,
      () => sauvegarderSeanceEnCours(day, session),
    );
    card.querySelector(".add-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      const dernierPoids = cible.querySelector(".series-row:last-child .set-weight")?.value || weight;
      ajouterSerie(cible, dernierPoids);
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    card.querySelector(".warmup-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      const premiereCharge = Number(cible.querySelector(".set-weight")?.value) || Number(weight) || 0;
      ajouterSerie(cible, Math.round(premiereCharge * 0.5 * 2) / 2, 10, true);
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
    card.querySelector(".remove-set").addEventListener("click", (event) => {
      const cible = event.currentTarget.closest(".exercise-card");
      if (cible.querySelectorAll(".series-row").length <= 1) return;
      cible.querySelector(".series-row:last-child").remove();
      updateVolume(cible);
      sauvegarderSeanceEnCours(day, session);
    });
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
  workout.insertAdjacentHTML("beforeend", `
    <section class="session-feedback" aria-label="Bilan de la séance">
      <h3>Bilan de la séance</h3>
      <p class="muted">Ces informations aideront à remettre une séance moins bonne dans son contexte.</p>
      <span>Ressenti global</span>
      <div class="feeling-buttons">
        <button type="button" data-feeling="facile" aria-pressed="false">🟢 Facile</button>
        <button type="button" data-feeling="pile" aria-pressed="false">🟡 Tout pile</button>
        <button type="button" data-feeling="galere" aria-pressed="false">🔴 Galère</button>
      </div>
      <div class="session-scores">
        <label>Énergie
          <select class="session-energy"><option value="">Non renseignée</option><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select>
        </label>
        <label>Sommeil
          <select class="session-sleep"><option value="">Non renseigné</option><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select>
        </label>
      </div>
      <input class="session-comment" type="text" maxlength="200" placeholder="Note facultative : fatigue, stress, douleur, forme…" />
    </section>
  `);
  const bilan = workout.querySelector(".session-feedback");
  bilan.querySelector(".session-energy").value = seanceEnCours?.energie || "";
  bilan.querySelector(".session-sleep").value = seanceEnCours?.sommeil || "";
  configurerRessenti(
    bilan,
    seanceEnCours?.ressentiSeance,
    seanceEnCours?.commentaireSeance,
    () => sauvegarderSeanceEnCours(day, session),
    ".session-comment",
  );
  bilan.querySelectorAll("select").forEach((select) => select.addEventListener("change", () => sauvegarderSeanceEnCours(day, session)));
  workout.insertAdjacentHTML("beforeend", "<button id='finish-button' class='finish-button'>Terminer la séance</button>");
  workout.querySelector("#finish-button").addEventListener("click", () => {
    const progress = updateSessionProgress();
    if (!confirm(`Enregistrer cette séance ? ${progress.completed} / ${progress.total} exercices sont marqués comme terminés.`)) return;
    const volume = updateTotalVolume();
    const exercices = [...workout.querySelectorAll(".exercise-card")].map((card) => {
      const donnees = lireExercice(card);
      return {
        nom: card.querySelector(".exercise-name").textContent,
        programmeNom: card.dataset.programmeName,
        ...donnees,
        ressenti: card.querySelector(".feeling-area").dataset.ressenti || null,
        commentaire: card.querySelector(".exercise-comment").value.trim(),
      };
    });
    const historique = getHistorique();
    const seanceTerminee = {
      id: Date.now(),
      date: new Date().toISOString(),
      programmeId: programmeActif?.id || null,
      programme: programmeActif?.nom || null,
      semaineLegere,
      jour: day,
      nom: session.title,
      volume,
      exercices,
      ressentiSeance: bilan.dataset.ressenti || null,
      energie: Number(bilan.querySelector(".session-energy").value) || null,
      sommeil: Number(bilan.querySelector(".session-sleep").value) || null,
      commentaireSeance: bilan.querySelector(".session-comment").value.trim(),
    };
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
