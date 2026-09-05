// PROJECT BRINK - DIPLOMATIC & ESPIONAGE AI MODULE
// Cold War Pre-War Standoff, Autonomous Envoys, Treaties, Betrayals, and Covert Operations

import { FactionId, Transmission, Unit, ControlNode } from '@/app/page';

export type DiplomaticStatus =
  | 'TOTAL_WAR'
  | 'COLD_WAR_TENSION'
  | 'CEASEFIRE'
  | 'NON_AGGRESSION'
  | 'PROXY_ALLIANCE'
  | 'FULL_ALLIANCE';

export type EscalationPhase = 'PRE_WAR_CRISIS' | 'ACTIVE_CONFLICT';

export type EnvoyType =
  | 'CONCILIATION_OFFER'
  | 'NON_AGGRESSION_TREATY'
  | 'DEFENSIVE_ALLIANCE'
  | 'ECONOMIC_TRADE_PACT'
  | 'DEMILITARIZED_BUFFER_ZONE';

export interface EnvoyMission {
  id: string;
  fromFaction: FactionId;
  toFaction: FactionId;
  type: EnvoyType;
  terms: string;
  status: 'IN_TRANSIT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  progress: number; // 0 to 100%
  etaSeconds: number;
  initiatedTick: number;
}

export type CovertOpType =
  | 'INFILTRATE_INTEL'
  | 'SABOTAGE_DEPOT'
  | 'CIPHER_DECRYPT'
  | 'FALSE_FLAG_INCIDENT';

export interface CovertOperation {
  id: string;
  sponsorFaction: FactionId;
  targetFaction: FactionId;
  type: CovertOpType;
  codename: string;
  status: 'PLANNING' | 'INFILTRATING' | 'SUCCESS' | 'COMPROMISED';
  progress: number; // 0 to 100%
  successChance: number; // 0 to 100
  initiatedTick: number;
  resultSummary?: string;
  revealedIntel?: {
    unitCount: number;
    compositions: Record<string, number>;
    damagedUnits: { id: string; name: string; hull: number; engine: number; weapons: number }[];
    interceptedOrders: string[];
    expiresTick: number;
  };
}

export interface FactionIntelDossier {
  targetFaction: FactionId;
  lastIntelTick: number;
  estimatedUnits: number;
  compositions: Record<string, number>;
  vulnerabilities: string[];
  interceptedOrders: string[];
  activeRecon: boolean;
}

export interface DiplomaticRelation {
  factionA: FactionId;
  factionB: FactionId;
  status: DiplomaticStatus;
  tension: number; // -100 (hostile) to +100 (brotherly alliance)
  activeTreaties: string[];
  activeSanctions: string[];
  espionageAlert?: {
    operationName: string;
    agentFaction: FactionId;
    description: string;
    expiresTick: number;
  };
  lastInteraction: string;
}

export interface DiplomaticLedger {
  relations: Record<string, DiplomaticRelation>;
  recentEvents: string[];
  escalationPhase: EscalationPhase;
  crisisTensionLevel: number; // 0 (Peaceful Standoff) to 100 (Flashpoint War)
  envoys: EnvoyMission[];
  activeOps: CovertOperation[];
  intelDossiers: Record<string, FactionIntelDossier>; // key: `${sponsor}::${target}`
  activeProposals: {
    id: string;
    from: FactionId;
    to: FactionId;
    type: 'PEACE_TREATY' | 'ALLIANCE_PACT' | 'TRADE_CONCESSION' | 'DEMILITARIZED_ZONE';
    terms: string;
    expiresTick: number;
  }[];
}

export function getRelationKey(a: FactionId, b: FactionId): string {
  return [a, b].sort().join('::');
}

export function getIntelKey(sponsor: FactionId, target: FactionId): string {
  return `${sponsor}::${target}`;
}

export function createInitialDiplomacy(): DiplomaticLedger {
  const relations: Record<string, DiplomaticRelation> = {};

  const initRel = (
    a: FactionId,
    b: FactionId,
    status: DiplomaticStatus,
    tension: number,
    treaties: string[],
    sanctions: string[]
  ) => {
    const key = getRelationKey(a, b);
    relations[key] = {
      factionA: a,
      factionB: b,
      status,
      tension,
      activeTreaties: treaties,
      activeSanctions: sanctions,
      lastInteraction: '1963 Cold War Protocol Ratified'
    };
  };

  // Pre-War Standoff Initial Statuses:
  // Loyalists <-> Rebels: Fragile Demarcation Ceasefire along River Chokepoints
  initRel(
    'loyalists',
    'rebels',
    'CEASEFIRE',
    -55,
    ['1963 Pan-San-Pietro Demarcation Truce'],
    ['Internal Movement Restrictions']
  );

  // Loyalists <-> Coalition: Western Sponsorship Treaty
  initRel(
    'loyalists',
    'coalition',
    'PROXY_ALLIANCE',
    85,
    ['Atlantic Bilateral Assistance Protocol', 'Mutual Military Maintenance Treaty'],
    []
  );

  // Loyalists <-> Volskan: Cold War Hostility / Diplomatic Standoff
  initRel('loyalists', 'volskan', 'COLD_WAR_TENSION', -65, [], ['Maritime Transit Restrictions']);

  // Rebels <-> Volskan: Eastern Solidarity Pact
  initRel(
    'rebels',
    'volskan',
    'PROXY_ALLIANCE',
    80,
    ['Treaty of Solidarity & People’s Aid', 'Eastern Arms & Depot Agreement'],
    []
  );

  // Rebels <-> Coalition: Ideological Standoff
  initRel('rebels', 'coalition', 'COLD_WAR_TENSION', -75, [], ['Naval Contraband Blockade']);

  // Coalition <-> Volskan: Cold War Superpower Brinkmanship
  initRel(
    'coalition',
    'volskan',
    'COLD_WAR_TENSION',
    -40,
    ['1958 Geneva Maritime Passage Accord'],
    ['Strategic Metals Quota']
  );

  // Initial Intelligence Dossiers
  const intelDossiers: Record<string, FactionIntelDossier> = {};
  const allFactions: FactionId[] = ['loyalists', 'rebels', 'coalition', 'volskan'];
  for (const s of allFactions) {
    for (const t of allFactions) {
      if (s !== t) {
        intelDossiers[getIntelKey(s, t)] = {
          targetFaction: t,
          lastIntelTick: 0,
          estimatedUnits: 4,
          compositions: { armor: 1, infantry: 2, artillery: 1 },
          vulnerabilities: ['Signals interception indicates standard readiness'],
          interceptedOrders: [],
          activeRecon: false
        };
      }
    }
  }

  return {
    relations,
    recentEvents: [
      'PRE-WAR COLD WAR CRISIS: Demarcation line holds along central river.',
      'Envoys shuttle between embassies in neutral Santa Maria.',
      'Covert surveillance active along border observation posts.'
    ],
    escalationPhase: 'PRE_WAR_CRISIS',
    crisisTensionLevel: 35,
    envoys: [],
    activeOps: [],
    intelDossiers,
    activeProposals: []
  };
}

// -------------------------------------------------------------------------
// DIPLOMATIC ACTIONS API
// -------------------------------------------------------------------------

// Dispatch an Envoy from one faction to another
export function dispatchEnvoy(
  ledger: DiplomaticLedger,
  from: FactionId,
  to: FactionId,
  type: EnvoyType,
  customTerms?: string,
  simTick: number = 0
): { updatedLedger: DiplomaticLedger; transmission: Transmission } {
  const termsMap: Record<EnvoyType, string> = {
    CONCILIATION_OFFER: 'Propose diplomatic detente, cultural exchanges, and immediate +25 reduction in border friction.',
    NON_AGGRESSION_TREATY: 'Sign formal Non-Aggression Pact guaranteeing no military cross-border maneuvers.',
    DEFENSIVE_ALLIANCE: 'Establish full mutual defense treaty, shared logistical repair access, and coordinate joint maneuvers.',
    ECONOMIC_TRADE_PACT: 'Mutual trade corridor agreement boosting mineral and hydrocarbon transit by +$40/cycle.',
    DEMILITARIZED_BUFFER_ZONE: 'Designate a 150-meter demilitarized river corridor prohibiting armored concentrations.'
  };

  const newEnvoy: EnvoyMission = {
    id: `envoy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fromFaction: from,
    toFaction: to,
    type,
    terms: customTerms || termsMap[type],
    status: 'IN_TRANSIT',
    progress: 0,
    etaSeconds: 15,
    initiatedTick: simTick
  };

  const updatedLedger: DiplomaticLedger = {
    ...ledger,
    envoys: [...ledger.envoys, newEnvoy],
    recentEvents: [
      `ENVOY DISPATCHED: ${from.toUpperCase()} sends diplomatic delegation to ${to.toUpperCase()} (${type.replace(/_/g, ' ')})`,
      ...ledger.recentEvents
    ].slice(0, 30)
  };

  const tx: Transmission = {
    id: `tx-envoy-${Date.now()}`,
    timestamp: 'DIPLOMATIC CABLE',
    factionId: from,
    callsign: `${from.toUpperCase()} FOREIGN MINISTRY`,
    message: `PLENIPOTENTIARY ENVOY DISPATCHED TO ${to.toUpperCase()}: "${newEnvoy.terms}"`,
    priority: 'HIGH'
  };

  return { updatedLedger, transmission: tx };
}

// Break an existing Treaty / Alliance
export function breakDiplomaticTreaty(
  ledger: DiplomaticLedger,
  factionA: FactionId,
  factionB: FactionId,
  treatyName: string,
  simTick: number = 0
): { updatedLedger: DiplomaticLedger; transmissions: Transmission[] } {
  const key = getRelationKey(factionA, factionB);
  const rel = ledger.relations[key];
  if (!rel) return { updatedLedger: ledger, transmissions: [] };

  const updatedTreaties = rel.activeTreaties.filter(t => t !== treatyName);
  const updatedSanctions = [...rel.activeSanctions, `Renunciation Retaliation (${treatyName})`];
  const newTension = Math.max(-100, rel.tension - 50);

  // Status downgrade
  let newStatus: DiplomaticStatus = rel.status;
  if (rel.status === 'FULL_ALLIANCE' || rel.status === 'PROXY_ALLIANCE') {
    newStatus = 'COLD_WAR_TENSION';
  } else if (rel.status === 'NON_AGGRESSION' || rel.status === 'CEASEFIRE') {
    newStatus = newTension < -75 ? 'TOTAL_WAR' : 'COLD_WAR_TENSION';
  }

  const newRelations = {
    ...ledger.relations,
    [key]: {
      ...rel,
      status: newStatus,
      tension: newTension,
      activeTreaties: updatedTreaties,
      activeSanctions: updatedSanctions,
      lastInteraction: `TREATY ABROGATED: ${treatyName} renounced by ${factionA.toUpperCase()}`
    }
  };

  const crisisInc = 25;
  const newCrisisLevel = Math.min(100, ledger.crisisTensionLevel + crisisInc);
  const nextPhase = newCrisisLevel >= 80 ? 'ACTIVE_CONFLICT' : ledger.escalationPhase;

  const eventText = `TREATY BROKEN: ${factionA.toUpperCase()} unilaterally abrogates "${treatyName}" with ${factionB.toUpperCase()}! Tension plummets.`;

  const tx1: Transmission = {
    id: `tx-treaty-break-${Date.now()}-1`,
    timestamp: 'DIPLOMATIC FLASH',
    factionId: factionA,
    callsign: `${factionA.toUpperCase()} HIGH COMMAND`,
    message: `OFFICIAL NOTIFICATION: WE HEREBY DECLARE "${treatyName.toUpperCase()}" NULL AND VOID. ALL COMBAT GARRISONS PLACED ON FULL ALERT.`,
    priority: 'FLASH'
  };

  const tx2: Transmission = {
    id: `tx-treaty-break-${Date.now()}-2`,
    timestamp: 'DIPLOMATIC FLASH',
    factionId: factionB,
    callsign: `${factionB.toUpperCase()} DEFENSE MINISTRY`,
    message: `DIPLOMATIC BETRAYAL: ${factionA.toUpperCase()} HAS VIOLATED TREATY TERMS. EMERGENCY RETALIATION MEASURES ACTIVATED.`,
    priority: 'FLASH'
  };

  return {
    updatedLedger: {
      ...ledger,
      relations: newRelations,
      crisisTensionLevel: newCrisisLevel,
      escalationPhase: nextPhase,
      recentEvents: [eventText, ...ledger.recentEvents].slice(0, 30)
    },
    transmissions: [tx1, tx2]
  };
}

// Launch a Covert Operation (Espionage)
export function launchCovertOperation(
  ledger: DiplomaticLedger,
  sponsor: FactionId,
  target: FactionId,
  type: CovertOpType,
  simTick: number = 0
): { updatedLedger: DiplomaticLedger; transmission: Transmission } {
  const codenames: Record<CovertOpType, string[]> = {
    INFILTRATE_INTEL: ['OPERATION NIGHTHAWK', 'BLACK VEIL', 'OPERATION SUNSET', 'DEEP CIPHER'],
    SABOTAGE_DEPOT: ['OPERATION RUPTURE', 'PROJECT BLOWTORCH', 'IRON PLIERS', 'OPERATION DETONATE'],
    CIPHER_DECRYPT: ['PROJECT VENONA-B', 'ULTRA INTERCEPT', 'ENIGMA RED', 'CRYPTO SPIKE'],
    FALSE_FLAG_INCIDENT: ['OPERATION PROVOCATEUR', 'BORDER SMOKE', 'GREY GHOST', 'INCIDENT CHARLIE']
  };

  const agencyNames: Record<FactionId, string> = {
    loyalists: 'San Pietro D.I.S. (Internal Security)',
    rebels: 'Liberation Underground Network',
    coalition: 'Atlantic CIA Directorate of Plans',
    volskan: 'Volskan KGB First Chief Directorate',
    unified: 'State Intelligence Bureau'
  };

  const codename = codenames[type][Math.floor(Math.random() * codenames[type].length)];

  const newOp: CovertOperation = {
    id: `covert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sponsorFaction: sponsor,
    targetFaction: target,
    type,
    codename,
    status: 'INFILTRATING',
    progress: 0,
    successChance: 78,
    initiatedTick: simTick
  };

  const tx: Transmission = {
    id: `tx-op-${Date.now()}`,
    timestamp: 'EYES ONLY - TOP SECRET',
    factionId: sponsor,
    callsign: agencyNames[sponsor] || 'INTELLIGENCE DIREKTORAT',
    message: `COVERT ACTION AUTHORIZED: [${codename}] INITIATED AGAINST ${target.toUpperCase()}. TARGET: ${type.replace(/_/g, ' ')}. FIELD OPERATIVES INSERTED.`,
    priority: 'HIGH'
  };

  return {
    updatedLedger: {
      ...ledger,
      activeOps: [...ledger.activeOps, newOp],
      recentEvents: [
        `COVERT OPERATION LAUNCHED: ${sponsor.toUpperCase()} intelligence deploys operatives for [${codename}].`,
        ...ledger.recentEvents
      ].slice(0, 30)
    },
    transmission: tx
  };
}

// -------------------------------------------------------------------------
// AUTONOMOUS DIPLOMATIC & ESPIONAGE AI SIMULATION STEP
// -------------------------------------------------------------------------

export function stepDiplomaticAI(
  ledger: DiplomaticLedger,
  factions: Record<string, { treasury: number; fuelReserves: number; resolve: number }>,
  units: Unit[],
  nodes: ControlNode[],
  defcon: number,
  simTick: number,
  simTimeStr: string,
  onSabotageDepot?: (targetFaction: FactionId) => void
): { updatedLedger: DiplomaticLedger; newTransmissions: Transmission[] } {
  const nextRelations = { ...ledger.relations };
  const recentEvents = [...ledger.recentEvents];
  const newTransmissions: Transmission[] = [];
  let nextCrisisLevel = ledger.crisisTensionLevel;
  let nextPhase = ledger.escalationPhase;

  // 1. Calculate faction military strength and damaged component metrics
  const strengthByFaction: Record<string, number> = {
    loyalists: 0,
    rebels: 0,
    coalition: 0,
    volskan: 0
  };
  const damagedUnitsByFaction: Record<string, Unit[]> = {
    loyalists: [],
    rebels: [],
    coalition: [],
    volskan: []
  };

  for (const u of units) {
    if (strengthByFaction[u.factionId] !== undefined) {
      strengthByFaction[u.factionId] += u.strength;
      const comps = u.components || { hull: 100, engine: 100, weapons: 100 };
      if (comps.hull < 60 || comps.engine < 50 || comps.weapons < 50) {
        damagedUnitsByFaction[u.factionId].push(u);
      }
    }
  }

  // 2. Advance Active Envoys
  const updatedEnvoys: EnvoyMission[] = [];
  for (const env of ledger.envoys) {
    if (env.status === 'IN_TRANSIT') {
      env.progress += 8; // step progress
      if (env.progress >= 100) {
        // Envoy arrives at destination! Target AI evaluates the proposal
        const key = getRelationKey(env.fromFaction, env.toFaction);
        const rel = nextRelations[key];
        const currentTension = rel ? rel.tension : 0;
        const targetDamagedCount = damagedUnitsByFaction[env.toFaction]?.length || 0;

        // Decision logic: If in crisis, or damaged, or friendly -> accept
        let willAccept = true;
        if (env.type === 'DEFENSIVE_ALLIANCE' && currentTension < 20) {
          willAccept = false; // Won't ally if distrustful
        } else if (env.type === 'NON_AGGRESSION_TREATY' && currentTension < -60 && targetDamagedCount === 0) {
          willAccept = Math.random() < 0.4;
        }

        if (willAccept) {
          env.status = 'ACCEPTED';
          const treatyName = `${env.fromFaction.toUpperCase()}-${env.toFaction.toUpperCase()} ${env.type.replace(/_/g, ' ')}`;
          if (rel) {
            rel.tension = Math.min(100, rel.tension + 35);
            if (!rel.activeTreaties.includes(treatyName)) {
              rel.activeTreaties.push(treatyName);
            }
            if (env.type === 'DEFENSIVE_ALLIANCE') {
              rel.status = 'FULL_ALLIANCE';
            } else if (env.type === 'NON_AGGRESSION_TREATY') {
              rel.status = 'NON_AGGRESSION';
            } else if (env.type === 'CONCILIATION_OFFER' && rel.status === 'TOTAL_WAR') {
              rel.status = 'CEASEFIRE';
            }
            rel.lastInteraction = `Treaty Ratified: ${treatyName}`;
          }

          nextCrisisLevel = Math.max(10, nextCrisisLevel - 15);
          recentEvents.unshift(`TREATY RATIFIED: ${env.toFaction.toUpperCase()} accepts envoy terms from ${env.fromFaction.toUpperCase()}!`);
          newTransmissions.push({
            id: `tx-env-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: simTimeStr,
            factionId: env.toFaction,
            callsign: `${env.toFaction.toUpperCase()} STATE ENVOY`,
            message: `COMMUNIQUE TO ${env.fromFaction.toUpperCase()}: WE ACCEDE TO THE TERMS OF ${env.type.replace(/_/g, ' ')}. RATIFICATION PAPERS EXCHANGED.`,
            priority: 'HIGH'
          });
        } else {
          env.status = 'REJECTED';
          recentEvents.unshift(`ENVOY REBUFFED: ${env.toFaction.toUpperCase()} declined diplomatic overture from ${env.fromFaction.toUpperCase()}.`);
          newTransmissions.push({
            id: `tx-env-rej-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: simTimeStr,
            factionId: env.toFaction,
            callsign: `${env.toFaction.toUpperCase()} EMBASSY`,
            message: `FORMAL REJECTION: THE PROPOSED TERMS FROM ${env.fromFaction.toUpperCase()} ARE UNACCEPTABLE UNDER CURRENT STRATEGIC CONDITIONS.`,
            priority: 'ROUTINE'
          });
        }
      }
    }
    updatedEnvoys.push(env);
  }

  // 3. Advance Covert Operations (Espionage)
  const updatedOps: CovertOperation[] = [];
  const updatedIntelDossiers = { ...ledger.intelDossiers };

  for (const op of ledger.activeOps) {
    if (op.status === 'INFILTRATING') {
      op.progress += 12;
      if (op.progress >= 100) {
        const roll = Math.random() * 100;
        if (roll <= op.successChance) {
          op.status = 'SUCCESS';
          const intelKey = getIntelKey(op.sponsorFaction, op.targetFaction);

          // Build intelligence payload on target faction
          const targetUnits = units.filter(u => u.factionId === op.targetFaction && u.strength > 0);
          const compMap: Record<string, number> = {};
          targetUnits.forEach(u => {
            compMap[u.type] = (compMap[u.type] || 0) + 1;
          });

          const damagedSummaries = targetUnits
            .filter(u => (u.components?.hull || 100) < 70 || (u.components?.engine || 100) < 70)
            .map(u => ({
              id: u.id,
              name: u.name,
              hull: Math.round(u.components?.hull || 100),
              engine: Math.round(u.components?.engine || 100),
              weapons: Math.round(u.components?.weapons || 100)
            }));

          op.revealedIntel = {
            unitCount: targetUnits.length,
            compositions: compMap,
            damagedUnits: damagedSummaries,
            interceptedOrders: targetUnits.map(u => u.currentOrder?.orderText || 'Conducting sector patrols').filter(Boolean),
            expiresTick: simTick + 120
          };

          if (op.type === 'INFILTRATE_INTEL') {
            op.resultSummary = `Breached field headquarters! Verified ${targetUnits.length} active combat battalions, component integrity, and motorpool coordinates.`;
            recentEvents.unshift(`ESPIONAGE SUCCESS: ${op.sponsorFaction.toUpperCase()} [${op.codename}] uncovered complete intelligence on ${op.targetFaction.toUpperCase()} unit forces!`);
            newTransmissions.push({
              id: `tx-spy-succ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: simTimeStr,
              factionId: op.sponsorFaction,
              callsign: 'INTELLIGENCE DISPATCH',
              message: `[${op.codename}] COMPLETE: ${targetUnits.length} ENEMY FORMATIONS IDENTIFIED. CRITICAL WEAPONS & ENGINE COMPONENT STATUS DECRYPTED.`,
              priority: 'HIGH'
            });
          } else if (op.type === 'SABOTAGE_DEPOT') {
            op.resultSummary = `Demolition teams detonated ordnance at ${op.targetFaction.toUpperCase()} central repair facilities! Mechanics halted.`;
            recentEvents.unshift(`SABOTAGE ALERT: Exploding charges crippled repair cranes at ${op.targetFaction.toUpperCase()} maintenance depot!`);
            if (onSabotageDepot) onSabotageDepot(op.targetFaction);
            newTransmissions.push({
              id: `tx-spy-sab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: simTimeStr,
              factionId: op.sponsorFaction,
              callsign: 'SPECIAL ACTIONS CELL',
              message: `SABOTAGE MISSION EXECUTED: PLASTIC EXPLOSIVES SEVERED FUEL TRUCKS AND CRANE ARMS AT ${op.targetFaction.toUpperCase()} MAINTENANCE BASE.`,
              priority: 'FLASH'
            });
          } else if (op.type === 'CIPHER_DECRYPT') {
            op.resultSummary = `Decrypted military radio frequency! Enemy objective markers and orders intercepted in real time.`;
            recentEvents.unshift(`CRYPTO BREAKTHROUGH: ${op.sponsorFaction.toUpperCase()} broke cryptographic grid of ${op.targetFaction.toUpperCase()}!`);
            newTransmissions.push({
              id: `tx-spy-ciph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: simTimeStr,
              factionId: op.sponsorFaction,
              callsign: 'CRYPTO-ANALYSIS DESK',
              message: `SIGNALS INTERCEPT: ENEMY COMMAND FREQUENCIES RUNNING IN CLEAR. TACTICAL WAYPOINTS DISPLAYED ON STRATEGIC SCOPES.`,
              priority: 'HIGH'
            });
          } else if (op.type === 'FALSE_FLAG_INCIDENT') {
            op.resultSummary = `Staged mortar strikes on civilian border checkpoint, framing ${op.targetFaction.toUpperCase()}!`;
            nextCrisisLevel = Math.min(100, nextCrisisLevel + 35);
            recentEvents.unshift(`CRISIS INCIDENT: Provocative artillery attack staged along river boundary! Diplomatic outrage ensues.`);
            newTransmissions.push({
              id: `tx-spy-ff-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              timestamp: simTimeStr,
              factionId: op.sponsorFaction,
              callsign: 'BLACK OPERATIONS',
              message: `INCIDENT TRIGGERED: BORDER GUARDS FIRED UPON. OPPOSING CAPITAL BLAMED IN WORLD PRESS. DEFCON TENSION ESCALATING.`,
              priority: 'FLASH'
            });
          }

          // Update persistent intel dossier
          updatedIntelDossiers[intelKey] = {
            targetFaction: op.targetFaction,
            lastIntelTick: simTick,
            estimatedUnits: targetUnits.length,
            compositions: compMap,
            vulnerabilities: damagedSummaries.length > 0
              ? damagedSummaries.map(d => `${d.name}: Hull ${d.hull}%, Engine ${d.engine}%, Guns ${d.weapons}%`)
              : ['Standard combat readiness confirmed'],
            interceptedOrders: op.revealedIntel.interceptedOrders.slice(0, 4),
            activeRecon: true
          };
        } else {
          op.status = 'COMPROMISED';
          op.resultSummary = `Operatives caught by counter-espionage agents. Interrogation underway.`;
          nextCrisisLevel = Math.min(100, nextCrisisLevel + 20);
          recentEvents.unshift(`COUNTER-SPY ALERT: ${op.targetFaction.toUpperCase()} security captured covert operatives dispatched by ${op.sponsorFaction.toUpperCase()}!`);
          newTransmissions.push({
            id: `tx-spy-comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: simTimeStr,
            factionId: op.targetFaction,
            callsign: 'INTERNAL COUNTER-INTELLIGENCE',
            message: `AGENT INFILTRATOR INTERCEPTED: ENEMY SABOTEUR FROM ${op.sponsorFaction.toUpperCase()} CAPTURED WITH TOP SECRET SATELLITE CARTOGRAPHY AND EXPLOSIVES.`,
            priority: 'FLASH'
          });
        }
      }
    }
    updatedOps.push(op);
  }

  // 4. Autonomous AI Diplomacy & Covert Decision Making (periodic AI behavior)
  if (simTick % 50 === 0 && ledger.envoys.filter(e => e.status === 'IN_TRANSIT').length < 2) {
    // Check if any faction with high damaged units seeks a ceasefire
    for (const fId of ['loyalists', 'rebels', 'coalition', 'volskan'] as FactionId[]) {
      const damagedCount = damagedUnitsByFaction[fId]?.length || 0;
      const totalUnits = units.filter(u => u.factionId === fId && u.strength > 0).length;

      if (damagedCount >= 2 || (totalUnits > 0 && damagedCount / totalUnits >= 0.5)) {
        // Seek non-aggression or ceasefire with primary adversary
        const adversary: FactionId = fId === 'loyalists' ? 'rebels' : fId === 'rebels' ? 'loyalists' : fId === 'coalition' ? 'volskan' : 'coalition';
        const key = getRelationKey(fId, adversary);
        const rel = nextRelations[key];

        if (rel && (rel.status === 'TOTAL_WAR' || rel.status === 'COLD_WAR_TENSION')) {
          const autoEnvoy: EnvoyMission = {
            id: `ai-envoy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fromFaction: fId,
            toFaction: adversary,
            type: 'CONCILIATION_OFFER',
            terms: 'Offer emergency 48-hour humanitarian truce to repair shattered motorpools and treat casualties.',
            status: 'IN_TRANSIT',
            progress: 0,
            etaSeconds: 12,
            initiatedTick: simTick
          };
          updatedEnvoys.push(autoEnvoy);
          recentEvents.unshift(`AI DIPLOMACY: Battered ${fId.toUpperCase()} garrisons dispatch urgent peace envoys to ${adversary.toUpperCase()}.`);
          newTransmissions.push({
            id: `tx-ai-env-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: simTimeStr,
            factionId: fId,
            callsign: 'HIGH COMMAND COMMUNIQUE',
            message: `DISPATCH TO ADVERSARY: WE PROPOSE IMMEDIATE MUTUAL RECOGNITION OF DEMARCATION BUFFER TO WITHDRAW DAMAGED FORMATIONS TO REPAIR DEPOTS.`,
            priority: 'HIGH'
          });
          break;
        }
      }
    }
  }

  // 5. Autonomous Covert Operations Trigger (Espionage AI)
  if (simTick % 60 === 0 && ledger.activeOps.filter(o => o.status === 'INFILTRATING').length === 0) {
    const sponsors: FactionId[] = ['coalition', 'volskan', 'loyalists', 'rebels'];
    const sponsor = sponsors[Math.floor(Math.random() * sponsors.length)];
    const targets = sponsors.filter(f => f !== sponsor);
    const target = targets[Math.floor(Math.random() * targets.length)];
    const types: CovertOpType[] = ['INFILTRATE_INTEL', 'CIPHER_DECRYPT', 'SABOTAGE_DEPOT'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    const aiOp: CovertOperation = {
      id: `ai-covert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sponsorFaction: sponsor,
      targetFaction: target,
      type: chosenType,
      codename: chosenType === 'INFILTRATE_INTEL' ? 'OPERATION GREY CIPHER' : chosenType === 'SABOTAGE_DEPOT' ? 'PROJECT DYNAMO' : 'RADIO INTERCEPT VENONA',
      status: 'INFILTRATING',
      progress: 0,
      successChance: 72,
      initiatedTick: simTick
    };
    updatedOps.push(aiOp);
    recentEvents.unshift(`ESPIONAGE NETWORK: ${sponsor.toUpperCase()} intelligence launched autonomous ${chosenType.replace(/_/g, ' ')} against ${target.toUpperCase()}.`);
  }

  // 6. Superpower DEFCON Escalation Check
  const cvKey = getRelationKey('coalition', 'volskan');
  if (nextRelations[cvKey]) {
    const cvRel = { ...nextRelations[cvKey] };
    if (defcon <= 2 && !cvRel.activeSanctions.includes('Total Hydrocarbon Embargo')) {
      cvRel.activeSanctions.push('Total Hydrocarbon Embargo');
      cvRel.tension = Math.max(-100, cvRel.tension - 25);
      cvRel.status = 'TOTAL_WAR';
      cvRel.lastInteraction = 'DEFCON 2: Full Superpower Embargo Declared';
      recentEvents.unshift('ALERT: Atlantic Coalition and Volskan Union declare mutual trade embargoes!');
      nextPhase = 'ACTIVE_CONFLICT';
      nextCrisisLevel = 90;
    }
    nextRelations[cvKey] = cvRel;
  }

  // If crisis tension exceeds 80, transition to ACTIVE_CONFLICT
  if (nextCrisisLevel >= 80 && nextPhase === 'PRE_WAR_CRISIS') {
    nextPhase = 'ACTIVE_CONFLICT';
    recentEvents.unshift('CRISIS BREACH: Border tensions exceeded threshold! Factions abandon ceasefires for active combat operations.');
    newTransmissions.push({
      id: `tx-war-break-${Date.now()}`,
      timestamp: simTimeStr,
      factionId: 'loyalists',
      callsign: 'PROJECT BRINK COMMAND',
      message: 'CRITICAL WARNING: DIPLOMATIC THRESHOLD COLLAPSED. COMBAT OPERATIONS DECLARED ACTIVE ACROSS ALL SECTORS.',
      priority: 'FLASH'
    });
  }

  return {
    updatedLedger: {
      relations: nextRelations,
      recentEvents: recentEvents.slice(0, 30),
      escalationPhase: nextPhase,
      crisisTensionLevel: nextCrisisLevel,
      envoys: updatedEnvoys.filter(e => e.status === 'IN_TRANSIT' || (simTick - e.initiatedTick < 180)),
      activeOps: updatedOps.filter(o => o.status === 'INFILTRATING' || (simTick - o.initiatedTick < 180)),
      intelDossiers: updatedIntelDossiers,
      activeProposals: ledger.activeProposals.filter(p => p.expiresTick > simTick)
    },
    newTransmissions
  };
}
