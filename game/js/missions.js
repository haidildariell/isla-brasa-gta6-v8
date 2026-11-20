// missions.js — the ten story jobs of ISLA BRASA. Each job is a list
// of stages; a stage completes when the player reaches its marker
// (drive / walk / boat), survives its fight, or delivers its vehicle.
// Vera Quintana's dialog brackets every job: a briefing line, a
// mid-job call, and a payout line. Wanted levels are scripted per
// stage so the chase beats land on cue.

export const JOBS = [
  {
    title: 'First Wheels', pay: 600, rp: 60, wanted: 0,
    brief: ['Vera Quintana', 'Dario. There is a Comet GT idling by the marina with your name on it. Take it, learn the bay, bring it home.'],
    stages: [
      { kind: 'reach', x: -238, z: 84, label: 'Get to the Comet GT at the marina', next: 'Enter the Comet GT' },
      { kind: 'drive', x: -262, z: 92, label: 'Bring the Comet to the safehouse garage', next: 'Job 2 unlocks: Marina Run' },
    ],
    outro: ['Vera Quintana', 'Clean. The bay is yours now — wheels first, questions later.'],
  },
  {
    title: 'Marina Run', pay: 900, rp: 80, wanted: 1,
    brief: ['Vera Quintana', 'A package is sweating on pier nine. Grab it and drop it at the Old Town plaza — no sirens, no scratches.'],
    stages: [
      { kind: 'reach', x: -262, z: 196, label: 'Pick up the package at the pier end', next: 'Deliver to Old Town plaza' },
      { kind: 'drive', x: -64, z: -78, label: 'Deliver the package to Old Town plaza', next: 'Job 3 unlocks: Heat Check' },
    ],
    outro: ['Vera Quintana', 'Plaza drop confirmed. You drive like the tide — quiet and impossible to stop.'],
  },
  {
    title: 'Heat Check', pay: 1100, rp: 100, wanted: 3,
    brief: ['Vera Quintana', 'The BBPD wants a face for their board. Give them a chase they will never catch, then lose them.'],
    stages: [
      { kind: 'drive', x: 120, z: -60, label: 'Reach the Financial Row checkpoint with the heat on', next: 'Now lose the cops' },
      { kind: 'escape', label: 'Lose the BBPD (wanted to zero)', next: 'Job 4 unlocks: Coral Kings' },
    ],
    outro: ['Vera Quintana', 'Gone like sea mist. The FALCON crew is furious — I love it.'],
  },
  {
    title: 'Coral Kings', pay: 1600, rp: 140, wanted: 1,
    brief: ['Vera Quintana', 'Los Corales think the Las Palmas market pays them rent. Walk in and correct their arithmetic.'],
    stages: [
      { kind: 'reach', x: 92, z: 118, label: 'Enter the Las Palmas market', next: 'Clear the market' },
      { kind: 'fight', x: 92, z: 126, count: 5, label: 'Drive Los Corales out of the market', next: 'Job 5 unlocks: Night Deposit' },
    ],
    outro: ['Tomas Rey', 'Heard the market cheered, boss. Corales rent just went to zero.'],
  },
  {
    title: 'Night Deposit', pay: 1900, rp: 160, wanted: 2,
    brief: ['Vera Quintana', 'The Row vault takes a deposit at dusk. You are the deposit. In quiet, out loud.'],
    stages: [
      { kind: 'drive', x: 236, z: -238, label: 'Reach the vault service door on Financial Row', next: 'Grab the night deposit' },
      { kind: 'reach', x: 244, z: -252, label: 'Take the deposit case from the vault door', next: 'Run it to the safehouse' },
      { kind: 'drive', x: -262, z: 92, label: 'Deliver the case to the safehouse', next: 'Job 6 unlocks: Regent Run' },
    ],
    outro: ['Vera Quintana', 'Deposit received. The Row will blame the tide, the cameras, anyone but you.'],
  },
  {
    title: 'Regent Run', pay: 2400, rp: 200, wanted: 4,
    brief: ['Vera Quintana', 'The Regent heir needs to vanish before his father\u2019s enemies find him. Hotel to marina — the FALCON will be watching.'],
    stages: [
      { kind: 'drive', x: 252, z: -150, label: 'Pick up the heir at the Regent Hotel', next: 'Get him to the marina' },
      { kind: 'drive', x: -262, z: 120, label: 'Deliver the heir to the marina pier', next: 'Job 7 unlocks: Air Mail' },
    ],
    outro: ['Lio Park', 'Heir is on a boat and out of the story. FALCON never even got your plate.'],
  },
  {
    title: 'Air Mail', pay: 2600, rp: 220, wanted: 2,
    brief: ['Vera Quintana', 'A courier missed his flight. His cargo floats better than it flies — take the Mako and run the coast.'],
    stages: [
      { kind: 'reach', x: -262, z: 156, label: 'Board the Mako speedboat at the pier end [E]', next: 'Run the coast buoys' },
      { kind: 'boat', x: 210, z: 235, label: 'Run the Mako to the east buoy drop', next: 'Bring her home' },
      { kind: 'boat', x: -240, z: 215, label: 'Return the Mako to marina waters', next: 'Job 8 unlocks: Turf War' },
    ],
    outro: ['Vera Quintana', 'Cargo delivered, hull unmarked. The sea works for us now.'],
  },
  {
    title: 'Turf War', pay: 3200, rp: 280, wanted: 3,
    brief: ['Vera Quintana', 'Los Corales parked their whole chapter on our plaza. End the argument — all of it.'],
    stages: [
      { kind: 'drive', x: -64, z: -84, label: 'Roll into the Old Town plaza', next: 'Win the plaza' },
      { kind: 'fight', x: -64, z: -84, count: 8, label: 'Clear the plaza of Los Corales', next: 'Job 9 unlocks: The Long Fare' },
    ],
    outro: ['Tomas Rey', 'Plaza is ours, boss. I will paint the Comet to celebrate.'],
  },
  {
    title: 'The Long Fare', pay: 3800, rp: 320, wanted: 3,
    brief: ['Vera Quintana', 'One fare, whole island: a witness who cannot be late and cannot be seen. Marina, Row, Palmas — in order.'],
    stages: [
      { kind: 'drive', x: -200, z: 40, label: 'Pick up the witness in the Marina District', next: 'First drop: Financial Row' },
      { kind: 'drive', x: 236, z: -120, label: 'Drop at Financial Row without a tail', next: 'Final drop: Las Palmas' },
      { kind: 'drive', x: 120, z: 60, label: 'Final drop in Las Palmas', next: 'Final job unlocks: Brasa Crown' },
    ],
    outro: ['Lio Park', 'Witness vanished into the crowd. Textbook, boss. Textbook.'],
  },
  {
    title: 'Brasa Crown', pay: 6000, rp: 500, wanted: 5,
    brief: ['Vera Quintana', 'Last job, Dario. The Crown of Brasa sits in the Regent vault — take it, cross the bay, and become the story they tell.'],
    stages: [
      { kind: 'drive', x: 252, z: -160, label: 'Hit the Regent Hotel vault entrance', next: 'Take the Crown' },
      { kind: 'reach', x: 244, z: -176, label: 'Grab the Brasa Crown', next: 'Cross the whole bay' },
      { kind: 'drive', x: -262, z: 92, label: 'Bring the Crown home to the safehouse', next: 'You are the Brasa Kingpin' },
    ],
    outro: ['Vera Quintana', 'The Crown is home. Brasa Bay has a new king — and he still owes me a drink.'],
  },
];

export class MissionSystem {
  constructor() {
    this.index = 0;
    this.stage = 0;
    this.active = false;
    this.done = false;
    this.fightSpawned = false;
  }

  get job() { return JOBS[this.index] ?? null; }
  get stageDef() { return this.job?.stages[this.stage] ?? null; }

  start(hud) {
    if (this.done || !this.job) return;
    this.active = true;
    this.stage = 0;
    this.fightSpawned = false;
    hud.showDialog(this.job.brief[0], this.job.brief[1]);
  }

  // Called when the current stage's condition is met by game.js.
  advance(hud, state) {
    if (!this.job) return null;
    this.stage += 1;
    this.fightSpawned = false;
    if (this.stage >= this.job.stages.length) {
      const finished = this.job;
      state.cash += finished.pay;
      const rankUp = state.ranks.addRP(finished.rp);
      state.stats.jobsDone += 1;
      this.index += 1;
      this.active = false;
      this.stage = 0;
      if (this.index >= JOBS.length) this.done = true;
      hud.showDialog(finished.outro[0], finished.outro[1]);
      hud.toast(`JOB COMPLETE — $${finished.pay.toLocaleString()} · +${finished.rp} RP`);
      return { finished, rankUp };
    }
    return null;
  }

  completion() {
    let total = 0;
    let doneStages = 0;
    for (let i = 0; i < JOBS.length; i += 1) {
      total += JOBS[i].stages.length;
      if (i < this.index) doneStages += JOBS[i].stages.length;
      else if (i === this.index && this.active) doneStages += this.stage;
    }
    return total ? doneStages / total : 0;
  }
}
