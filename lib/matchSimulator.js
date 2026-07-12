// Simulates a live football match so the demo doesn't depend on a paid
// live-sports data provider. Swap `nextEvent()` for a real API call later
// (e.g. a sports data webhook) without touching the rest of the app.

const TEAM_A = process.env.TEAM_A_NAME || "Falcons";
const TEAM_B = process.env.TEAM_B_NAME || "Lions";

const state = {
  teamA: TEAM_A,
  teamB: TEAM_B,
  scoreA: 0,
  scoreB: 0,
  minute: 0,
  hypeA: 0.5, // 0..1, boosted by tips
  hypeB: 0.5,
  lastEvent: null,
};

const EVENT_TEMPLATES = [
  { type: "build_up", weight: 5, text: (a, b) => `${a} are patiently building an attack in midfield.` },
  { type: "near_miss", weight: 4, team: "A", text: (a) => `Huge chance for ${a}! The shot flies just over the bar!` },
  { type: "near_miss", weight: 4, team: "B", text: (_, b) => `Huge chance for ${b}! The shot flies just over the bar!` },
  { type: "corner", weight: 3, team: "A", text: (a) => `Corner kick for ${a}, the box is getting crowded.` },
  { type: "corner", weight: 3, team: "B", text: (_, b) => `Corner kick for ${b}, the box is getting crowded.` },
  { type: "foul", weight: 3, team: "A", text: (a) => `Rough tackle! Free kick awarded to ${a} in a dangerous position.` },
  { type: "foul", weight: 3, team: "B", text: (_, b) => `Rough tackle! Free kick awarded to ${b} in a dangerous position.` },
  { type: "save", weight: 3, text: (a, b) => `What a save by the goalkeeper! That kept the score level.` },
  { type: "goal", weight: 1, team: "A", text: (a) => `GOOOAL! ${a} score! The whole stadium is on its feet!` },
  { type: "goal", weight: 1, team: "B", text: (_, b) => `GOOOAL! ${b} score! The whole stadium is on its feet!` },
  { type: "yellow_card", weight: 2, team: "A", text: (a) => `Yellow card shown to a ${a} player after that late challenge.` },
  { type: "yellow_card", weight: 2, team: "B", text: (_, b) => `Yellow card shown to a ${b} player after that late challenge.` },
];

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

function nextEvent() {
  state.minute = Math.min(90, state.minute + Math.floor(Math.random() * 3) + 1);
  const picked = weightedPick(EVENT_TEMPLATES);
  const text = picked.text(state.teamA, state.teamB);

  if (picked.type === "goal") {
    if (picked.team === "A") state.scoreA += 1;
    else state.scoreB += 1;
  }

  // hype naturally decays a little each tick so tips feel impactful
  state.hypeA = Math.max(0.3, state.hypeA * 0.96);
  state.hypeB = Math.max(0.3, state.hypeB * 0.96);

  state.lastEvent = {
    minute: state.minute,
    type: picked.type,
    team: picked.team || null,
    text,
  };

  return state.lastEvent;
}

function boostHype(team, amount) {
  if (team === "A") state.hypeA = Math.min(1, state.hypeA + amount);
  else if (team === "B") state.hypeB = Math.min(1, state.hypeB + amount);
}

function getState() {
  return { ...state };
}

module.exports = { nextEvent, boostHype, getState };
