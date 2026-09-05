import { FactionId, UnitType } from '@/app/page';

export type CommanderArchetypeId =
  | 'DOGMATIC_FANATIC'
  | 'CAUTIOUS_TECHNOCRAT'
  | 'OPPORTUNISTIC_MERCENARY'
  | 'DEEP_BATTLE_STRATEGIST';

export interface CommanderProfile {
  factionId: FactionId;
  name: string;
  rank: string;
  archetype: CommanderArchetypeId;
  title: string;
  quote: string;
  psychologicalProfile: string;
  doctrine: {
    attackBonus: number; // e.g. 1.25 for fanatic
    defenseBonus: number;
    retreatThreshold: number; // e.g. 0.05 for fanatic (never retreats), 0.45 for cautious
    samPreference: number; // weight for air defense
    artilleryPreference: number;
    treatyWillingness: number; // 0 to 1
    oilPriority: number; // 0 to 1
  };
}

export interface FlashpointBattle {
  id: string;
  sectorName: string;
  objectiveName?: string;
  objectiveType?: 'BRIDGEHEAD' | 'REFINERY' | 'CITADEL' | 'PASS';
  x: number;
  y: number;
  attackerFactionId: FactionId;
  defenderFactionId: FactionId;
  attackerCorpsName?: string;
  defenderCorpsName?: string;
  attackerUnits: string[];
  defenderUnits: string[];
  attackerStrength: number;
  defenderStrength: number;
  attackerAirCallIn?: number; // 0 to 100 meter
  defenderAirCallIn?: number; // 0 to 100 meter
  attackerArtilleryMeter?: number; // 0 to 100
  defenderArtilleryMeter?: number; // 0 to 100
  expectedDurationHours: number;
  elapsedHours: number;
  status: 'ACTIVE_CLASH' | 'RESOLVED';
  victorFactionId?: FactionId;
  verdict?: 'HEROIC_VICTORY' | 'COSTLY_BREAKTHROUGH' | 'PYRRHIC_STAND' | 'DECISIVE_REPULSE';
  refereeCommentary?: string;
  routStatus?: { unitId: string; status: 'ROUTING' | 'WAVERING' | 'STEADY'; reason: string }[];
  casualtiesAttacker: number;
  casualtiesDefender: number;
  armorLostAttacker: number;
  armorLostDefender: number;
  aircraftLost: number;
  reportedInPress: boolean;
}

export interface IlluminationFlare {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number; // in seconds
  elapsed: number;
  driftX: number;
  driftY: number;
}

export interface MonsoonFront {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  intensity: number; // 0 to 1
}

export interface StrategicLogisticsLine {
  id: string;
  type: 'MARITIME_CONVOY' | 'RAIL_CORRIDOR';
  fromName: string;
  toName: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  factionId: FactionId;
  cargo: string;
  progress: number; // 0 to 100
}

export interface StrategicDivision {
  id: string;
  factionId: FactionId;
  designation: string;
  scale: 'XX' | 'XXX';
  symbolType: 'ARMOR' | 'INFANTRY' | 'MECHANIZED' | 'ARTILLERY' | 'AIRBORNE' | 'MARINE';
  troopCount: number;
  readiness: number; // 0 to 100
  fuelSupply: number; // 0 to 100
  currentSector: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  orderDirective: string;
  battlegroupRole: 'SPEARHEAD' | 'FLANK_GUARD' | 'FIRE_SUPPORT' | 'STRATEGIC_RESERVE';
  regimentCount: number;
}

export interface WarRoomState {
  commanders: Record<FactionId, CommanderProfile>;
  strategicDivisions: StrategicDivision[];
  flashpoints: FlashpointBattle[];
  activeFlares: IlluminationFlare[];
  monsoon: MonsoonFront;
  logisticsLines: StrategicLogisticsLine[];
  homefrontMorale: {
    coalition: number; // 0 to 100
    volskan: number;   // 0 to 100
  };
  antiWarProtestsActive: {
    coalition: boolean;
    volskan: boolean;
  };
  nonAlignedMovementDeclared: boolean;
  nationalizationEnacted: boolean;
}

export interface SimHistorySnapshot {
  tick: number;
  timeStr: string;
  units: {
    id: string;
    factionId: FactionId;
    type: UnitType;
    x: number;
    y: number;
    heading: number;
    strength: number;
    inCombat: boolean;
    isEncircled?: boolean;
  }[];
  nodeOwners: Record<string, FactionId>;
  activeFlashpointCount: number;
}

// Deterministic initial archetype mapping for the 4 commanders to avoid hydration mismatches
export function generateInitialCommanders(): Record<FactionId, CommanderProfile> {
  const profiles: Record<FactionId, CommanderProfile> = {
    loyalists: buildCommanderProfile('loyalists', 'Hector Cruz', 'General de División', 'DOGMATIC_FANATIC'),
    rebels: buildCommanderProfile('rebels', 'Lucía Reyes', 'Comandante en Jefe', 'OPPORTUNISTIC_MERCENARY'),
    coalition: buildCommanderProfile('coalition', 'Thomas A. Vance', 'Rear Admiral, USN / CINCPAC Advisor', 'CAUTIOUS_TECHNOCRAT'),
    volskan: buildCommanderProfile('volskan', 'Alexei I. Voronov', 'General-Mayor, GRU Military Mission', 'DEEP_BATTLE_STRATEGIST'),
    unified: buildCommanderProfile('unified', 'Council of National Unity', 'Sovereign Directorate', 'DEEP_BATTLE_STRATEGIST')
  };

  return profiles;
}

function buildCommanderProfile(
  factionId: FactionId,
  name: string,
  rank: string,
  archetype: CommanderArchetypeId
): CommanderProfile {
  switch (archetype) {
    case 'DOGMATIC_FANATIC':
      return {
        factionId,
        name,
        rank,
        archetype,
        title: 'The Dogmatic Fanatic',
        quote: 'Not one step back. Every meter of soil is sanctified in blood; retreat is treason.',
        psychologicalProfile: 'Refuses tactical retreat under fire. Orders relentless frontal counterattacks, prioritizing political symbols and ideological shrines over industrial assets.',
        doctrine: {
          attackBonus: 1.25,
          defenseBonus: 0.95,
          retreatThreshold: 0.05, // Never retreats until basically wiped out
          samPreference: 0.3,
          artilleryPreference: 0.7,
          treatyWillingness: 0.1,
          oilPriority: 0.4
        }
      };

    case 'CAUTIOUS_TECHNOCRAT':
      return {
        factionId,
        name,
        rank,
        archetype,
        title: 'The Cautious Technocrat',
        quote: 'Armor without surface-to-air coverage and heavy howitzer preparation is merely scrap metal.',
        psychologicalProfile: 'Demands layered anti-aircraft envelopes and concentrated artillery bombardments before committing armor. Withdraws battered units promptly to preserve division integrity.',
        doctrine: {
          attackBonus: 1.0,
          defenseBonus: 1.35,
          retreatThreshold: 0.45,
          samPreference: 1.0,
          artilleryPreference: 0.9,
          treatyWillingness: 0.65,
          oilPriority: 0.7
        }
      };

    case 'OPPORTUNISTIC_MERCENARY':
      return {
        factionId,
        name,
        rank,
        archetype,
        title: 'The Opportunistic Realist',
        quote: 'War is a ledger of fuel barrels and gold bars. The moment the account runs red, we negotiate.',
        psychologicalProfile: 'Calculates every offensive against treasury reserves and crude oil futures. Swift to propose ceasefires or pivot alliances when resources dip below operational margins.',
        doctrine: {
          attackBonus: 1.05,
          defenseBonus: 1.05,
          retreatThreshold: 0.35,
          samPreference: 0.5,
          artilleryPreference: 0.6,
          treatyWillingness: 0.9,
          oilPriority: 1.0
        }
      };

    case 'DEEP_BATTLE_STRATEGIST':
    default:
      return {
        factionId,
        name,
        rank,
        archetype,
        title: 'The Deep-Battle Strategist',
        quote: 'Sever the enemy neck at the depot, and his armored fist withers into harmless iron.',
        psychologicalProfile: 'Executes sweeping mechanized pincer movements to isolate enemy forward salients, sever supply veins, and collapse logistics into starving encirclement pockets (kessels).',
        doctrine: {
          attackBonus: 1.15,
          defenseBonus: 1.15,
          retreatThreshold: 0.25,
          samPreference: 0.7,
          artilleryPreference: 0.8,
          treatyWillingness: 0.4,
          oilPriority: 0.85
        }
      };
  }
}

export function createInitialWarRoom(): WarRoomState {
  return {
    commanders: generateInitialCommanders(),
    strategicDivisions: [
      // San Pietro Loyalists
      {
        id: 'div-loy-1',
        factionId: 'loyalists',
        designation: '1ST "CENTAUR" ARMORED DIV',
        scale: 'XX',
        symbolType: 'ARMOR',
        troopCount: 12400,
        readiness: 94,
        fuelSupply: 88,
        currentSector: 'Santa Maria Industrial Corridor',
        x: 640,
        y: 420,
        targetX: 580,
        targetY: 490,
        orderDirective: 'SPEARHEAD: Hold Delta Causeway & Oil Axis',
        battlegroupRole: 'SPEARHEAD',
        regimentCount: 4
      },
      {
        id: 'div-loy-2',
        factionId: 'loyalists',
        designation: '4TH PRESIDENTIAL GUARD CORPS',
        scale: 'XXX',
        symbolType: 'INFANTRY',
        troopCount: 18200,
        readiness: 98,
        fuelSupply: 95,
        currentSector: 'Santa Maria Citadel Redoubt',
        x: 780,
        y: 280,
        targetX: 780,
        targetY: 280,
        orderDirective: 'DEFENSIVE HOLD: Fortify Capital Perimeter',
        battlegroupRole: 'STRATEGIC_RESERVE',
        regimentCount: 5
      },
      // San Pietro Liberation Front (Rebels)
      {
        id: 'div-reb-1',
        factionId: 'rebels',
        designation: '3RD SIERRA VANGUARD DIV',
        scale: 'XX',
        symbolType: 'MECHANIZED',
        troopCount: 11800,
        readiness: 89,
        fuelSupply: 74,
        currentSector: 'Monte Oro North Pass',
        x: 420,
        y: 520,
        targetX: 520,
        targetY: 480,
        orderDirective: 'FLANK AMBUSH: Sever Northern Supply Veins',
        battlegroupRole: 'SPEARHEAD',
        regimentCount: 4
      },
      {
        id: 'div-reb-2',
        factionId: 'rebels',
        designation: 'SIERRA 1ST HIGHLAND BRIGADE',
        scale: 'XX',
        symbolType: 'INFANTRY',
        troopCount: 9600,
        readiness: 85,
        fuelSupply: 68,
        currentSector: 'Sierra Madre Redoubt Caves',
        x: 340,
        y: 660,
        targetX: 420,
        targetY: 610,
        orderDirective: 'FIRE SUPPORT: Mountain Mortars & Ambush',
        battlegroupRole: 'FLANK_GUARD',
        regimentCount: 3
      },
      // Atlantic Coalition
      {
        id: 'div-coa-1',
        factionId: 'coalition',
        designation: '7TH EXPEDITIONARY STRIKE DIV',
        scale: 'XX',
        symbolType: 'MARINE',
        troopCount: 15400,
        readiness: 96,
        fuelSupply: 92,
        currentSector: 'Task Force 72 Coastal Anchorage',
        x: 220,
        y: 430,
        targetX: 380,
        targetY: 480,
        orderDirective: 'SPEARHEAD: Air Umbrella & Armor Thrust',
        battlegroupRole: 'SPEARHEAD',
        regimentCount: 4
      },
      // Volskan Union
      {
        id: 'div-vol-1',
        factionId: 'volskan',
        designation: '8TH GUARDS SHOCK ARMY CORPS',
        scale: 'XXX',
        symbolType: 'ARTILLERY',
        troopCount: 24600,
        readiness: 97,
        fuelSupply: 90,
        currentSector: 'Trans-Steppe Railhead Terminal',
        x: 1040,
        y: 380,
        targetX: 920,
        targetY: 420,
        orderDirective: 'FIRE SUPPORT: 152mm Mass Artillery Salvo',
        battlegroupRole: 'FIRE_SUPPORT',
        regimentCount: 5
      }
    ],
    flashpoints: [],
    activeFlares: [],
    monsoon: {
      x: 320,
      y: 480,
      radius: 190,
      vx: 0.12,
      vy: -0.04,
      intensity: 0.85
    },
    logisticsLines: [
      {
        id: 'convoy-atlantic-1',
        type: 'MARITIME_CONVOY',
        fromName: 'Rota Naval Base / Puerto Rico',
        toName: 'Port Bella Docks',
        startX: 40,
        startY: 720,
        endX: 240,
        endY: 680,
        factionId: 'coalition',
        cargo: 'M48 Patton Spares & Aviation Jet-A',
        progress: 35
      },
      {
        id: 'convoy-atlantic-2',
        type: 'MARITIME_CONVOY',
        fromName: 'Caribbean Sea Task Force 72',
        toName: 'San Pietro Coastal Anchorage',
        startX: 40,
        startY: 380,
        endX: 180,
        endY: 410,
        factionId: 'coalition',
        cargo: 'Electronic Countermeasures & 105mm Shells',
        progress: 68
      },
      {
        id: 'rail-volskan-1',
        type: 'RAIL_CORRIDOR',
        fromName: 'Volskan Southern Rail Terminal',
        toName: 'Monte Oro Logistics Depot',
        startX: 1240,
        startY: 180,
        endX: 980,
        endY: 680,
        factionId: 'volskan',
        cargo: '152mm HE Munitions & S-75 Dvina Radars',
        progress: 52
      },
      {
        id: 'rail-volskan-2',
        type: 'RAIL_CORRIDOR',
        fromName: 'Black Sea Freight Marshaling Yard',
        toName: 'Eastern Highlands Forward Base',
        startX: 1240,
        startY: 420,
        endX: 1040,
        endY: 620,
        factionId: 'rebels',
        cargo: 'RPG-7 Rockets & Clandestine Radio Transmitters',
        progress: 81
      }
    ],
    homefrontMorale: {
      coalition: 92,
      volskan: 88
    },
    antiWarProtestsActive: {
      coalition: false,
      volskan: false
    },
    nonAlignedMovementDeclared: false,
    nationalizationEnacted: false
  };
}

// Distance helper
function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Update Weather & Illumination Flares
export function stepWeatherAndFlares(
  warRoom: WarRoomState,
  dt: number,
  isNight: boolean,
  activeCombatCoordinates: { x: number; y: number }[]
): void {
  // Move monsoon storm front
  const m = warRoom.monsoon;
  m.x += m.vx * dt * 60;
  m.y += m.vy * dt * 60;
  if (m.x < 150) { m.x = 150; m.vx = Math.abs(m.vx); }
  if (m.x > 1150) { m.x = 1150; m.vx = -Math.abs(m.vx); }
  if (m.y < 120) { m.y = 120; m.vy = Math.abs(m.vy); }
  if (m.y > 750) { m.y = 750; m.vy = -Math.abs(m.vy); }

  // Update active illumination flares
  warRoom.activeFlares = warRoom.activeFlares
    .map(f => ({
      ...f,
      elapsed: f.elapsed + dt,
      x: f.x + f.driftX * dt,
      y: f.y + f.driftY * dt
    }))
    .filter(f => f.elapsed < f.duration);

  // Spawn flares at night during combat
  if (isNight && activeCombatCoordinates.length > 0) {
    if (Math.random() < 0.08 * dt) {
      const coord = activeCombatCoordinates[Math.floor(Math.random() * activeCombatCoordinates.length)];
      // Spawn flare if no existing flare covers it
      const covered = warRoom.activeFlares.some(f => dist(f.x, f.y, coord.x, coord.y) < f.radius * 0.7);
      if (!covered && warRoom.activeFlares.length < 5) {
        warRoom.activeFlares.push({
          id: `flare-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          x: coord.x + (Math.random() * 40 - 20),
          y: coord.y + (Math.random() * 40 - 20),
          radius: 170,
          duration: 16, // lasts 16 seconds
          elapsed: 0,
          driftX: (Math.random() - 0.5) * 4,
          driftY: (Math.random() - 0.5) * 4
        });
      }
    }
  }

  // Update Logistics Convoys
  warRoom.logisticsLines.forEach(line => {
    // If nationalized, foreign supply lines from sea and northern rail slow down dramatically
    const speed = warRoom.nationalizationEnacted ? 0.3 : 1.2;
    line.progress = (line.progress + speed * dt * 4) % 100;
  });
}

// Step Flashpoints (Major battles on strategic map)
export function stepFlashpoints(
  warRoom: WarRoomState,
  units: { id: string; x: number; y: number; factionId: FactionId; strength: number; inCombat: boolean }[],
  dt: number,
  onBattleConcluded?: (battle: FlashpointBattle) => void
): void {
  // Key strategic focal points to monitor
  const focalSectors = [
    { name: 'Delta Causeway Bridge', x: 640, y: 420 },
    { name: 'Black Gold Oil Refineries', x: 1080, y: 520 },
    { name: 'Santa Maria Citadel', x: 380, y: 260 },
    { name: 'Monte Oro Mountain Pass', x: 980, y: 680 },
    { name: 'Port Bella Docks', x: 240, y: 680 }
  ];

  // Check active battles
  focalSectors.forEach(sec => {
    const nearbyInCombat = units.filter(u => u.inCombat && dist(u.x, u.y, sec.x, sec.y) < 160);
    const existing = warRoom.flashpoints.find(f => f.sectorName === sec.name && f.status === 'ACTIVE_CLASH');

    if (nearbyInCombat.length >= 2) {
      const factionsInvolved = Array.from(new Set(nearbyInCombat.map(u => u.factionId)));
      if (factionsInvolved.length >= 2) {
        const factionA = factionsInvolved[0];
        const factionB = factionsInvolved[1];
        const unitsA = nearbyInCombat.filter(u => u.factionId === factionA);
        const unitsB = nearbyInCombat.filter(u => u.factionId === factionB);
        const strA = unitsA.reduce((sum, u) => sum + u.strength, 0);
        const strB = unitsB.reduce((sum, u) => sum + u.strength, 0);

        if (!existing) {
          const objectiveNames: Record<string, string> = {
            'Delta Causeway Bridge': 'Delta Causeway Bridgehead & Pumping Span',
            'Black Gold Oil Refineries': 'Refinery Fractionation Towers & Storage Tanks',
            'Santa Maria Citadel': 'Presidential Citadel Redoubt & Heavy Gun Bunkers',
            'Monte Oro Mountain Pass': 'Monte Oro Ridge Artillery Salients & Pass',
            'Port Bella Docks': 'Port Bella Deepwater Pier & Naval Depot'
          };
          const objectiveTypes: Record<string, 'BRIDGEHEAD' | 'REFINERY' | 'CITADEL' | 'PASS'> = {
            'Delta Causeway Bridge': 'BRIDGEHEAD',
            'Black Gold Oil Refineries': 'REFINERY',
            'Santa Maria Citadel': 'CITADEL',
            'Monte Oro Mountain Pass': 'PASS',
            'Port Bella Docks': 'BRIDGEHEAD'
          };

          const corpsNames: Record<FactionId, string> = {
            loyalists: '1ST CENTAUR ARMORED CORPS',
            rebels: '3RD SIERRA LIBERATION VANGUARD',
            coalition: '7TH EXPEDITIONARY STRIKE GROUP',
            volskan: '8TH GUARDS SHOCK ARMY',
            unified: 'SAN PIETRO COMBINED DEFENSE FORCE'
          };

          warRoom.flashpoints.push({
            id: `fp-${sec.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
            sectorName: sec.name,
            objectiveName: objectiveNames[sec.name] || `${sec.name} Strategic Objective`,
            objectiveType: objectiveTypes[sec.name] || 'BRIDGEHEAD',
            x: sec.x,
            y: sec.y,
            attackerFactionId: factionA,
            defenderFactionId: factionB,
            attackerCorpsName: corpsNames[factionA] || 'ATTACKING DIVISION',
            defenderCorpsName: corpsNames[factionB] || 'DEFENDING GARRISON',
            attackerUnits: unitsA.map(u => u.id),
            defenderUnits: unitsB.map(u => u.id),
            attackerStrength: strA,
            defenderStrength: strB,
            attackerAirCallIn: 85,
            defenderAirCallIn: 70,
            attackerArtilleryMeter: 90,
            defenderArtilleryMeter: 100,
            expectedDurationHours: 4,
            elapsedHours: 0,
            status: 'ACTIVE_CLASH',
            casualtiesAttacker: 0,
            casualtiesDefender: 0,
            armorLostAttacker: 0,
            armorLostDefender: 0,
            aircraftLost: 0,
            reportedInPress: false,
            refereeCommentary: `Impartial Gamemaster: ${corpsNames[factionA]} initiating mechanized assault against dug-in positions of ${corpsNames[factionB]}. Firing arcs locked.`
          });
        } else {
          existing.attackerStrength = strA;
          existing.defenderStrength = strB;
          existing.elapsedHours += dt * 0.2;
          existing.casualtiesAttacker += Math.round(dt * (Math.random() * 6 + 2));
          existing.casualtiesDefender += Math.round(dt * (Math.random() * 6 + 2));
          if (Math.random() < 0.05 * dt) existing.armorLostAttacker += 1;
          if (Math.random() < 0.05 * dt) existing.armorLostDefender += 1;
          if (Math.random() < 0.02 * dt) existing.aircraftLost += 1;

          // Increment call-in meters
          existing.attackerAirCallIn = Math.min(100, (existing.attackerAirCallIn || 0) + dt * 4);
          existing.defenderAirCallIn = Math.min(100, (existing.defenderAirCallIn || 0) + dt * 3.5);
          existing.attackerArtilleryMeter = Math.min(100, (existing.attackerArtilleryMeter || 0) + dt * 5);
          existing.defenderArtilleryMeter = Math.min(100, (existing.defenderArtilleryMeter || 0) + dt * 4.5);
        }
      }
    } else if (existing) {
      // Battle concluded!
      existing.status = 'RESOLVED';
      const victorFaction = existing.attackerStrength >= existing.defenderStrength
        ? existing.attackerFactionId
        : existing.defenderFactionId;
      const loserFaction = victorFaction === existing.attackerFactionId ? existing.defenderFactionId : existing.attackerFactionId;
      existing.victorFactionId = victorFaction;

      // Assign decisive Gamemaster Verdict
      const ratio = existing.attackerStrength / Math.max(1, existing.defenderStrength);
      if (victorFaction === existing.attackerFactionId) {
        existing.verdict = ratio > 1.8 ? 'HEROIC_VICTORY' : 'COSTLY_BREAKTHROUGH';
      } else {
        existing.verdict = ratio < 0.6 ? 'DECISIVE_REPULSE' : 'PYRRHIC_STAND';
      }
      existing.refereeCommentary = `Gamemaster Referee: ${existing.verdict.replace('_', ' ')}. ${victorFaction.toUpperCase()} has secured ${existing.sectorName}. Defeated forces falling back.`;

      // Campaign Fallout: Push defeated strategic divisions backward 60px on Big Board!
      if (warRoom.strategicDivisions) {
        warRoom.strategicDivisions = warRoom.strategicDivisions.map(div => {
          if (div.factionId === loserFaction && dist(div.x, div.y, existing.x, existing.y) < 220) {
            // Push division back by 60px away from battle sector
            const angle = Math.atan2(div.y - existing.y, div.x - existing.x);
            const retreatX = Math.max(80, Math.min(1200, div.x + Math.cos(angle) * 60));
            const retreatY = Math.max(80, Math.min(720, div.y + Math.sin(angle) * 60));
            return {
              ...div,
              x: Math.round(retreatX),
              y: Math.round(retreatY),
              readiness: Math.max(20, div.readiness - 22),
              troopCount: Math.round(div.troopCount * 0.82),
              orderDirective: `WITHDRAWAL: Regrouping following defeat at ${existing.sectorName}`
            };
          }
          return div;
        });
      }

      if (onBattleConcluded) {
        onBattleConcluded(existing);
      }
    }
  });

  // Keep only recent resolved battles (last 5)
  const active = warRoom.flashpoints.filter(f => f.status === 'ACTIVE_CLASH');
  const resolved = warRoom.flashpoints.filter(f => f.status === 'RESOLVED').slice(-5);
  warRoom.flashpoints = [...active, ...resolved];
}

// Step Homefront Morale & Anti-War Protests
export function stepHomefrontMorale(
  warRoom: WarRoomState,
  coalitionLosses: number,
  volskanLosses: number,
  dt: number
): void {
  if (coalitionLosses > 0) {
    warRoom.homefrontMorale.coalition = Math.max(10, warRoom.homefrontMorale.coalition - coalitionLosses * 0.05);
  } else {
    warRoom.homefrontMorale.coalition = Math.min(100, warRoom.homefrontMorale.coalition + dt * 0.02);
  }

  if (volskanLosses > 0) {
    warRoom.homefrontMorale.volskan = Math.max(10, warRoom.homefrontMorale.volskan - volskanLosses * 0.05);
  } else {
    warRoom.homefrontMorale.volskan = Math.min(100, warRoom.homefrontMorale.volskan + dt * 0.02);
  }

  warRoom.antiWarProtestsActive.coalition = warRoom.homefrontMorale.coalition < 55;
  warRoom.antiWarProtestsActive.volskan = warRoom.homefrontMorale.volskan < 55;
}

