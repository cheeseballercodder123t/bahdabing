'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Download,
  Upload,
  Radio,
  Crosshair,
  Shield,
  Plane,
  Flame,
  Volume2,
  VolumeX,
  Compass,
  Layers,
  Cpu,
  Tv,
  AlertTriangle,
  Info,
  MapPin,
  RefreshCw,
  Eye,
  Award,
  Building2,
  Trees,
  Mountain,
  Droplets,
  Landmark,
  Handshake,
  DollarSign,
  Fuel,
  Users,
  Factory,
  Globe2,
  ShieldAlert,
  Radar,
  Globe,
  Coins,
  ShieldCheck
} from 'lucide-react';

import {
  TERRAIN_ZONES,
  getTerrainAt,
  TerrainType,
  TerrainZone
} from '@/lib/terrain';

import {
  FowPerspective,
  ReconSweepZone,
  getFactionVisionSources,
  isUnitDetectedByFaction,
  isUnitConcealed,
  getUnitVisionRange
} from '@/lib/fogOfWar';

import {
  DiplomaticLedger,
  createInitialDiplomacy,
  stepDiplomaticAI,
  getRelationKey,
  DiplomaticRelation,
  EnvoyType,
  CovertOpType,
  dispatchEnvoy,
  breakDiplomaticTreaty,
  launchCovertOperation
} from '@/lib/diplomacy';

import {
  EconomyState,
  createInitialEconomy,
  stepEconomy,
  UNIT_BUILD_COSTS,
  TradeRoute,
  ProductionQueueItem
} from '@/lib/economy';

import {
  WarRoomState,
  FlashpointBattle,
  SimHistorySnapshot,
  createInitialWarRoom,
  stepWeatherAndFlares,
  stepFlashpoints,
  stepHomefrontMorale
} from '@/lib/warRoom';
import { NewspaperModal } from '@/components/NewspaperModal';
import { StrategicMapRoom } from '@/components/StrategicMapRoom';
import { TimeScrubber } from '@/components/TimeScrubber';
import { AnnunciatorButton } from '@/components/AnnunciatorButton';
import { NixieTube } from '@/components/NixieTube';
import { VUMeter } from '@/components/VUMeter';
import { RotarySpeedDial } from '@/components/RotarySpeedDial';
import { JewelIndicator } from '@/components/JewelIndicator';
import { TacticalPeriscopeScope } from '@/components/TacticalPeriscopeScope';

/* =========================================================================
   TYPES & DATA MODELS
   ========================================================================= */

export type FactionId = 'loyalists' | 'rebels' | 'coalition' | 'volskan' | 'unified';
export type UnitType = 'armor' | 'infantry' | 'mechanized' | 'artillery' | 'sam' | 'carrier' | 'destroyer' | 'submarine';
export type AirRole = 'AIR_SUPERIORITY' | 'CAS' | 'INTERCEPTION' | 'INTERDICTION' | 'RECON';
export type Stance = 'OFFENSIVE_THRUST' | 'DEFENSIVE_HOLD' | 'FLANK_AMBUSH' | 'WITHDRAW_REFUEL';

export interface TacticalUnitOrder {
  action: 'ATTACK' | 'FLANK' | 'DEFEND' | 'RETREAT' | 'MOVE' | 'BOMBARD';
  targetX: number;
  targetY: number;
  targetUnitId?: string;
  orderText: string;
  issuedTick?: number;
  aiControlled?: boolean;
}

export interface UnitComponents {
  hull: number; // 0 to 100%
  engine: number; // 0 to 100%
  weapons: number; // 0 to 100%
}

export interface UnitHistoryEntry {
  id: string;
  timestamp: string;
  simTick: number;
  type: 'SPAWN' | 'ORDER' | 'ORDERS' | 'COMBAT' | 'KILL' | 'DAMAGE' | 'MALFUNCTION' | 'WEATHER' | 'REPAIR' | 'PROMOTION' | 'NAVAL_SORTIE' | 'ASW_ENGAGEMENT' | 'NAVAL';
  headline: string;
  detail: string;
}

export interface DesignatedRepairZone {
  id: string;
  name: string;
  factionId: FactionId;
  x: number;
  y: number;
  radius: number;
  repairRate: number; // % restoration per second
  capacity: number;
  isSabotaged?: boolean;
  sabotageTimer?: number;
  isNavalBase?: boolean;
}

const INITIAL_REPAIR_ZONES: DesignatedRepairZone[] = [
  {
    id: 'rep-loy-1',
    name: 'San Pietro Central Arsenal & Motorpool',
    factionId: 'loyalists',
    x: 920,
    y: 690,
    radius: 95,
    repairRate: 14,
    capacity: 4
  },
  {
    id: 'rep-reb-1',
    name: 'Sierra Redoubt Secret Workshop & Depot',
    factionId: 'rebels',
    x: 210,
    y: 220,
    radius: 95,
    repairRate: 12,
    capacity: 4
  },
  {
    id: 'rep-coa-1',
    name: 'Atlantic Fleet Mobile Repair Anchorage',
    factionId: 'coalition',
    x: 120,
    y: 390,
    radius: 120,
    repairRate: 22,
    capacity: 6,
    isNavalBase: true
  },
  {
    id: 'rep-vol-1',
    name: 'Stavka Heavy Armor Maintenance Facility',
    factionId: 'volskan',
    x: 1080,
    y: 200,
    radius: 100,
    repairRate: 18,
    capacity: 5
  },
  {
    id: 'rep-nav-portbella',
    name: 'Port Bella Deepwater Naval Station',
    factionId: 'loyalists',
    x: 940,
    y: 750,
    radius: 110,
    repairRate: 20,
    capacity: 5,
    isNavalBase: true
  },
  {
    id: 'rep-nav-volskanpen',
    name: 'Volskan Red Star Submarine Pen & Drydock',
    factionId: 'volskan',
    x: 1240,
    y: 130,
    radius: 110,
    repairRate: 20,
    capacity: 5,
    isNavalBase: true
  },
  {
    id: 'rep-nav-rebelpier',
    name: 'Sierra Guerrilla Coastal Slipway',
    factionId: 'rebels',
    x: 150,
    y: 760,
    radius: 100,
    repairRate: 15,
    capacity: 4,
    isNavalBase: true
  }
];

export interface Unit {
  id: string;
  name: string;
  factionId: FactionId;
  type: UnitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number; // 0 to 360 degrees
  targetX: number;
  targetY: number;
  speed: number;
  maxSpeed: number;
  strength: number; // 0 to 100
  maxStrength: number;
  morale: number; // 0 to 100
  fuel: number; // 0 to 100
  entrenchment: number; // 0 to 100
  kills: number;
  veteran?: boolean;
  inCombat: boolean;
  isRetreating: boolean;
  selected?: boolean;
  range: number;
  reloadTimer: number;
  lastFlanked?: boolean;
  isEncircled?: boolean;
  encirclementTimer?: number;
  currentOrder?: TacticalUnitOrder;
  components: UnitComponents;
  isEngineDisabled?: boolean;
  isWeaponJammed?: boolean;
  isHullBreached?: boolean;
  isUnderRepair?: boolean;
  repairZoneId?: string;
  history?: UnitHistoryEntry[];
  isNaval?: boolean;
  isSubmerged?: boolean;
  carrierAircraft?: number;
  carrierMaxAircraft?: number;
  sonarCooldown?: number;
  torpedoCooldown?: number;
  activeDebuffs?: Array<{ type: string; label: string; desc: string }>;
}

export interface Airbase {
  id: string;
  name: string;
  factionId: FactionId;
  x: number;
  y: number;
  runwayAngle: number;
  readyAircraft: number;
  totalCapacity: number;
}

export interface AirSortie {
  id: string;
  callsign: string;
  factionId: FactionId;
  role: AirRole;
  x: number;
  y: number;
  altitude: number; // 0 to 1000
  heading: number;
  speed: number;
  targetX: number;
  targetY: number;
  targetUnitId?: string;
  fuel: number;
  maxFuel: number;
  airbaseId: string;
  status: 'SCRAMBLING' | 'EN_ROUTE' | 'ON_STATION' | 'ATTACK_RUN' | 'RTB' | 'DESTROYED';
  trail: { x: number; y: number }[];
}

export interface SamMissile {
  id: string;
  factionId: FactionId;
  x: number;
  y: number;
  targetSortieId: string;
  speed: number;
  heading: number;
  life: number;
  trail: { x: number; y: number }[];
}

export interface ArtilleryShell {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  arcHeight: number;
  damage: number;
  factionId: FactionId;
}

export interface Torpedo {
  id: string;
  factionId: FactionId;
  sourceUnitId?: string;
  targetUnitId?: string;
  x: number;
  y: number;
  startX?: number;
  startY?: number;
  targetX?: number;
  targetY?: number;
  speed: number;
  heading: number;
  damage: number;
  life: number;
  trail: { x: number; y: number }[];
}

export interface SonarPing {
  id: string;
  factionId: FactionId;
  sourceUnitId?: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  duration: number;
  elapsed: number;
}

export interface DepthCharge {
  id: string;
  factionId: FactionId;
  sourceUnitId?: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  duration: number;
  damage: number;
}

export interface VisualEffect {
  id: string;
  type: 'EXPLOSION' | 'SMOKE' | 'NAPALM' | 'TRACER' | 'FLANK_ALERT' | 'TORPEDO_WAKE' | 'DEPTH_CHARGE_EXPLOSION' | 'SONAR_WAVE' | 'WATER_GEYSER';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  radius: number;
  color: string;
  duration: number;
  elapsed: number;
  text?: string;
}

export interface Bridge {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDestroyed: boolean;
  health: number; // 0 to 100
}

export interface ControlNode {
  id: string;
  name: string;
  type: 'CAPITAL' | 'PORT' | 'REDOUT' | 'OIL_REFINERY' | 'DEPOT';
  x: number;
  y: number;
  radius: number;
  owner: FactionId;
  isVictoryNode: boolean;
  points: number;
}

export interface FactionInfo {
  id: FactionId;
  name: string;
  subTitle: string;
  color: string;
  lightColor: string;
  flagCode: string;
  treasury: number;
  fuelReserves: number;
  resolve: number;
  stance: Stance;
  activeDoctrine: string;
}

export interface Transmission {
  id: string;
  timestamp: string;
  factionId: FactionId;
  callsign: string;
  message: string;
  priority: 'ROUTINE' | 'HIGH' | 'FLASH';
}

/* =========================================================================
   AUDIO SYNTHESIZER (Web Audio API - Vintage 1960s Radio & Teletype)
   ========================================================================= */

class VintageSoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  public playTeletype() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // AudioContext locked or inactive
    }
  }

  public playArtillery() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch {
      // Ignore
    }
  }

  public playJetFlyby() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(650, this.ctx.currentTime + 0.2);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch {
      // Ignore
    }
  }

  public playFlankAlarm() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      osc.frequency.setValueAtTime(650, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } catch {
      // Ignore
    }
  }

  public playRadioStatic() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // Ignore
    }
  }

  public playAlertSiren() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.7);
    } catch {
      // Ignore
    }
  }

  public playSiren() {
    this.playAlertSiren();
  }

  public playAirRaid() {
    this.playAlertSiren();
  }
}

const audioSys = new VintageSoundSystem();

/* =========================================================================
   INITIAL DATA GENERATION
   ========================================================================= */

const FACTION_DEFINITIONS: Record<FactionId, FactionInfo> = {
  loyalists: {
    id: 'loyalists',
    name: 'San Pietro Loyalists',
    subTitle: 'Nationalist Junta (Heavy Armor & Fortress Capital)',
    color: '#3b82f6',
    lightColor: '#93c5fd',
    flagCode: 'SAN-LOYAL',
    treasury: 1450,
    fuelReserves: 780,
    resolve: 85,
    stance: 'DEFENSIVE_HOLD',
    activeDoctrine: 'CITADEL INTERIOR LINES'
  },
  rebels: {
    id: 'rebels',
    name: 'San Pietro Liberation Front',
    subTitle: 'People’s Front (Mountain Guerrillas & SAM Ambush)',
    color: '#ef4444',
    lightColor: '#fca5a5',
    flagCode: 'SAN-REBELS',
    treasury: 620,
    fuelReserves: 410,
    resolve: 92,
    stance: 'FLANK_AMBUSH',
    activeDoctrine: 'PROTRACTED GUERRILLA WARFARE'
  },
  coalition: {
    id: 'coalition',
    name: 'Atlantic Coalition',
    subTitle: 'Western Superpower (Carrier Aviation & Modern Jets)',
    color: '#06b6d4',
    lightColor: '#67e8f9',
    flagCode: 'ATL-TASKFORCE',
    treasury: 4800,
    fuelReserves: 2400,
    resolve: 76,
    stance: 'OFFENSIVE_THRUST',
    activeDoctrine: 'AIR-SEA FORWARD PROJECTION'
  },
  volskan: {
    id: 'volskan',
    name: 'Volskan Union',
    subTitle: 'Eastern Hegemon (Heavy Tube Artillery & Armored Brigades)',
    color: '#b91c1c',
    lightColor: '#f87171',
    flagCode: 'VOLSK-STAVKA',
    treasury: 3900,
    fuelReserves: 1950,
    resolve: 88,
    stance: 'OFFENSIVE_THRUST',
    activeDoctrine: 'DEEP BATTLE ARTILLERY OFFENSIVE'
  },
  unified: {
    id: 'unified',
    name: 'Republic of San Pietro Armed Forces',
    subTitle: 'Awakened Sovereign Industrial Superpower',
    color: '#eab308',
    lightColor: '#fef08a',
    flagCode: 'SAN-UNIFIED',
    treasury: 5200,
    fuelReserves: 3500,
    resolve: 100,
    stance: 'OFFENSIVE_THRUST',
    activeDoctrine: 'TOTAL NATIONAL EXPULSION MOBILIZATION'
  }
};

const INITIAL_BRIDGES: Bridge[] = [
  { id: 'bridge-1', name: 'Ironbridge North Span', x: 500, y: 190, width: 34, height: 18, isDestroyed: false, health: 100 },
  { id: 'bridge-2', name: 'Delta Highway Causeway', x: 545, y: 490, width: 38, height: 20, isDestroyed: false, health: 100 },
  { id: 'bridge-3', name: 'Sierra Gorge Viaduct', x: 495, y: 720, width: 32, height: 18, isDestroyed: false, health: 100 },
];

const INITIAL_CONTROL_NODES: ControlNode[] = [
  { id: 'node-capital', name: 'SANTA MARIA (CAPITAL)', type: 'CAPITAL', x: 780, y: 560, radius: 46, owner: 'loyalists', isVictoryNode: true, points: 50 },
  { id: 'node-port', name: 'PORT BELLA DEEPWATER DOCK', type: 'PORT', x: 920, y: 730, radius: 40, owner: 'loyalists', isVictoryNode: true, points: 35 },
  { id: 'node-mountain', name: 'MONTE ORO REDOUBT', type: 'REDOUT', x: 260, y: 170, radius: 42, owner: 'rebels', isVictoryNode: true, points: 40 },
  { id: 'node-oil', name: 'BLACK GOLD OIL REFINERY', type: 'OIL_REFINERY', x: 640, y: 340, radius: 38, owner: 'loyalists', isVictoryNode: true, points: 30 },
  { id: 'node-novaya', name: 'NOVAYA ADVANCED DEPOT', type: 'DEPOT', x: 1210, y: 240, radius: 34, owner: 'volskan', isVictoryNode: false, points: 20 },
  { id: 'node-vanguard', name: 'FORT VANGUARD BARRACKS', type: 'DEPOT', x: 840, y: 160, radius: 32, owner: 'loyalists', isVictoryNode: false, points: 20 },
];

const INITIAL_AIRBASES: Airbase[] = [
  { id: 'airbase-loyal', name: 'Santa Maria Airbase', factionId: 'loyalists', x: 860, y: 500, runwayAngle: 45, readyAircraft: 4, totalCapacity: 6 },
  { id: 'airbase-rebel', name: 'Sierra Hidden Mountain Strip', factionId: 'rebels', x: 190, y: 640, runwayAngle: 120, readyAircraft: 3, totalCapacity: 4 },
  { id: 'airbase-carrier', name: 'CV-63 USS Constitution (Carrier)', factionId: 'coalition', x: 100, y: 380, runwayAngle: 90, readyAircraft: 8, totalCapacity: 10 },
  { id: 'airbase-volskan', name: 'Krasny Forward Air Base', factionId: 'volskan', x: 1240, y: 110, runwayAngle: 210, readyAircraft: 6, totalCapacity: 8 },
];

function createInitialUnits(): Unit[] {
  const rawUnits: Array<{
    id: string;
    name: string;
    factionId: FactionId;
    type: UnitType;
    x: number;
    y: number;
    vx: number;
    vy: number;
    heading: number;
    targetX: number;
    targetY: number;
    speed: number;
    maxSpeed: number;
    strength: number;
    maxStrength: number;
    morale: number;
    fuel: number;
    entrenchment: number;
    kills: number;
    inCombat: boolean;
    isRetreating: boolean;
    range: number;
    reloadTimer: number;
  }> = [
    // 1. San Pietro Loyalists
    {
      id: 'loy-arm-1',
      name: '1st "Centaur" Heavy Armored Bde',
      factionId: 'loyalists',
      type: 'armor',
      x: 710,
      y: 520,
      vx: 0,
      vy: 0,
      heading: 270,
      targetX: 580,
      targetY: 490,
      speed: 0.6,
      maxSpeed: 0.9,
      strength: 95,
      maxStrength: 100,
      morale: 88,
      fuel: 90,
      entrenchment: 40,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 85,
      reloadTimer: 0
    },
    {
      id: 'loy-inf-1',
      name: '4th Presidential Guard Inf',
      factionId: 'loyalists',
      type: 'infantry',
      x: 770,
      y: 580,
      vx: 0,
      vy: 0,
      heading: 260,
      targetX: 740,
      targetY: 570,
      speed: 0.4,
      maxSpeed: 0.6,
      strength: 100,
      maxStrength: 100,
      morale: 95,
      fuel: 85,
      entrenchment: 75,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 65,
      reloadTimer: 0
    },
    {
      id: 'loy-mech-1',
      name: '2nd Coastal Mechanized Reg',
      factionId: 'loyalists',
      type: 'mechanized',
      x: 880,
      y: 690,
      vx: 0,
      vy: 0,
      heading: 290,
      targetX: 800,
      targetY: 650,
      speed: 0.8,
      maxSpeed: 1.1,
      strength: 90,
      maxStrength: 100,
      morale: 80,
      fuel: 95,
      entrenchment: 20,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 75,
      reloadTimer: 0
    },
    {
      id: 'loy-art-1',
      name: '12th Fortress Heavy Battery',
      factionId: 'loyalists',
      type: 'artillery',
      x: 790,
      y: 470,
      vx: 0,
      vy: 0,
      heading: 280,
      targetX: 790,
      targetY: 470,
      speed: 0,
      maxSpeed: 0.4,
      strength: 85,
      maxStrength: 100,
      morale: 85,
      fuel: 70,
      entrenchment: 60,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 250,
      reloadTimer: 0
    },
    {
      id: 'loy-sam-1',
      name: 'Air Defense MIM-23 Hawk',
      factionId: 'loyalists',
      type: 'sam',
      x: 830,
      y: 540,
      vx: 0,
      vy: 0,
      heading: 270,
      targetX: 830,
      targetY: 540,
      speed: 0,
      maxSpeed: 0.5,
      strength: 80,
      maxStrength: 80,
      morale: 90,
      fuel: 80,
      entrenchment: 50,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 220,
      reloadTimer: 0
    },

    // 2. San Pietro Liberation Front (Rebels)
    {
      id: 'reb-inf-1',
      name: '7th Sierra Redoubt Guerrillas',
      factionId: 'rebels',
      type: 'infantry',
      x: 270,
      y: 210,
      vx: 0,
      vy: 0,
      heading: 90,
      targetX: 430,
      targetY: 210,
      speed: 0.5,
      maxSpeed: 0.7,
      strength: 90,
      maxStrength: 100,
      morale: 98,
      fuel: 75,
      entrenchment: 65,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 65,
      reloadTimer: 0
    },
    {
      id: 'reb-inf-2',
      name: 'Che Guevara Vanguard Cadre',
      factionId: 'rebels',
      type: 'infantry',
      x: 250,
      y: 530,
      vx: 0,
      vy: 0,
      heading: 80,
      targetX: 460,
      targetY: 500,
      speed: 0.5,
      maxSpeed: 0.7,
      strength: 92,
      maxStrength: 100,
      morale: 94,
      fuel: 70,
      entrenchment: 55,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 65,
      reloadTimer: 0
    },
    {
      id: 'reb-sam-1',
      name: 'Mobile SA-2 Guideline Battery',
      factionId: 'rebels',
      type: 'sam',
      x: 220,
      y: 470,
      vx: 0,
      vy: 0,
      heading: 75,
      targetX: 340,
      targetY: 460,
      speed: 0.3,
      maxSpeed: 0.5,
      strength: 75,
      maxStrength: 75,
      morale: 90,
      fuel: 65,
      entrenchment: 40,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 240,
      reloadTimer: 0
    },
    {
      id: 'reb-arm-1',
      name: 'Captured M48 "Liberator" Armor',
      factionId: 'rebels',
      type: 'armor',
      x: 310,
      y: 610,
      vx: 0,
      vy: 0,
      heading: 60,
      targetX: 470,
      targetY: 560,
      speed: 0.6,
      maxSpeed: 0.8,
      strength: 80,
      maxStrength: 100,
      morale: 85,
      fuel: 60,
      entrenchment: 20,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 80,
      reloadTimer: 0
    },

    // 3. Atlantic Coalition
    {
      id: 'coa-mech-1',
      name: 'Task Force Yankee Marine Mech',
      factionId: 'coalition',
      type: 'mechanized',
      x: 830,
      y: 770,
      vx: 0,
      vy: 0,
      heading: 320,
      targetX: 780,
      targetY: 690,
      speed: 0.8,
      maxSpeed: 1.1,
      strength: 100,
      maxStrength: 100,
      morale: 95,
      fuel: 100,
      entrenchment: 30,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 85,
      reloadTimer: 0
    },
    {
      id: 'coa-arm-1',
      name: '1st Armored Div "Old Ironsides"',
      factionId: 'coalition',
      type: 'armor',
      x: 910,
      y: 660,
      vx: 0,
      vy: 0,
      heading: 300,
      targetX: 820,
      targetY: 600,
      speed: 0.7,
      maxSpeed: 1.0,
      strength: 100,
      maxStrength: 100,
      morale: 90,
      fuel: 95,
      entrenchment: 25,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 90,
      reloadTimer: 0
    },

    // 4. Volskan Union
    {
      id: 'vol-arm-1',
      name: '4th Guards Volunteer Tank Div',
      factionId: 'volskan',
      type: 'armor',
      x: 1140,
      y: 280,
      vx: 0,
      vy: 0,
      heading: 220,
      targetX: 740,
      targetY: 340,
      speed: 0.7,
      maxSpeed: 0.95,
      strength: 100,
      maxStrength: 100,
      morale: 95,
      fuel: 90,
      entrenchment: 30,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 85,
      reloadTimer: 0
    },
    {
      id: 'vol-art-1',
      name: '68th Heavy Howitzer Reg (152mm)',
      factionId: 'volskan',
      type: 'artillery',
      x: 1190,
      y: 210,
      vx: 0,
      vy: 0,
      heading: 230,
      targetX: 1190,
      targetY: 210,
      speed: 0,
      maxSpeed: 0.4,
      strength: 95,
      maxStrength: 100,
      morale: 92,
      fuel: 85,
      entrenchment: 70,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 270,
      reloadTimer: 0
    },
    {
      id: 'vol-mech-1',
      name: '12th Motor Rifle Brigade',
      factionId: 'volskan',
      type: 'mechanized',
      x: 1060,
      y: 350,
      vx: 0,
      vy: 0,
      heading: 235,
      targetX: 680,
      targetY: 360,
      speed: 0.8,
      maxSpeed: 1.05,
      strength: 95,
      maxStrength: 100,
      morale: 88,
      fuel: 90,
      entrenchment: 20,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 80,
      reloadTimer: 0
    },

    // 5. NAVAL ASSETS & FLEET CARRIERS
    {
      id: 'coa-nav-cv63',
      name: 'CV-63 USS Constitution (Fleet Carrier)',
      factionId: 'coalition',
      type: 'carrier',
      x: 110,
      y: 380,
      vx: 0,
      vy: 0,
      heading: 90,
      targetX: 130,
      targetY: 420,
      speed: 0.5,
      maxSpeed: 0.7,
      strength: 100,
      maxStrength: 100,
      morale: 98,
      fuel: 100,
      entrenchment: 40,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 350,
      reloadTimer: 0
    },
    {
      id: 'coa-nav-dd992',
      name: 'USS Fletcher DD-992 (ASW Destroyer)',
      factionId: 'coalition',
      type: 'destroyer',
      x: 130,
      y: 450,
      vx: 0,
      vy: 0,
      heading: 80,
      targetX: 150,
      targetY: 490,
      speed: 0.8,
      maxSpeed: 1.1,
      strength: 100,
      maxStrength: 100,
      morale: 95,
      fuel: 100,
      entrenchment: 30,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 220,
      reloadTimer: 0
    },
    {
      id: 'vol-nav-k129',
      name: 'K-129 "Red October" Nuclear Submarine',
      factionId: 'volskan',
      type: 'submarine',
      x: 1210,
      y: 150,
      vx: 0,
      vy: 0,
      heading: 210,
      targetX: 1050,
      targetY: 220,
      speed: 0.7,
      maxSpeed: 0.95,
      strength: 100,
      maxStrength: 100,
      morale: 96,
      fuel: 100,
      entrenchment: 50,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 190,
      reloadTimer: 0
    },
    {
      id: 'vol-nav-groza',
      name: 'Sovremenny Destroyer "Groza"',
      factionId: 'volskan',
      type: 'destroyer',
      x: 1230,
      y: 200,
      vx: 0,
      vy: 0,
      heading: 200,
      targetX: 1140,
      targetY: 270,
      speed: 0.8,
      maxSpeed: 1.1,
      strength: 100,
      maxStrength: 100,
      morale: 94,
      fuel: 95,
      entrenchment: 30,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 230,
      reloadTimer: 0
    },
    {
      id: 'loy-nav-grau',
      name: 'BAP Almirante Grau (Coastal Frigate)',
      factionId: 'loyalists',
      type: 'destroyer',
      x: 930,
      y: 740,
      vx: 0,
      vy: 0,
      heading: 300,
      targetX: 890,
      targetY: 710,
      speed: 0.7,
      maxSpeed: 0.95,
      strength: 90,
      maxStrength: 100,
      morale: 85,
      fuel: 90,
      entrenchment: 40,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 200,
      reloadTimer: 0
    },
    {
      id: 'reb-nav-manta',
      name: 'Sierra Manta Coastal Submarine',
      factionId: 'rebels',
      type: 'submarine',
      x: 160,
      y: 750,
      vx: 0,
      vy: 0,
      heading: 45,
      targetX: 220,
      targetY: 710,
      speed: 0.65,
      maxSpeed: 0.9,
      strength: 85,
      maxStrength: 90,
      morale: 92,
      fuel: 85,
      entrenchment: 45,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: 160,
      reloadTimer: 0
    }
  ];

  return rawUnits.map(u => {
    const isNaval = u.type === 'carrier' || u.type === 'destroyer' || u.type === 'submarine';
    const isSub = u.type === 'submarine';
    const isCarrier = u.type === 'carrier';
    return {
      ...u,
      components: {
        hull: u.strength,
        engine: 100,
        weapons: 100
      },
      isEngineDisabled: false,
      isWeaponJammed: false,
      isHullBreached: false,
      isUnderRepair: false,
      repairZoneId: undefined,
      isNaval,
      isSubmerged: isSub,
      carrierAircraft: isCarrier ? 8 : undefined,
      carrierMaxAircraft: isCarrier ? 10 : undefined,
      sonarCooldown: 0,
      torpedoCooldown: 0,
      activeDebuffs: [],
      history: [
        {
          id: `hist-init-${u.id}`,
          timestamp: '06:00:00',
          simTick: 0,
          type: 'SPAWN',
          headline: `COMMISSIONED INTO SERVICE`,
          detail: `${u.name} stationed at tactical grid coordinates [${Math.round(u.x)}, ${Math.round(u.y)}]. Readiness 100%.`
        }
      ]
    };
  });
}

/* =========================================================================
   SIMULATION ENGINE HELPERS
   ========================================================================= */

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

function normalizeAngle(degrees: number): number {
  let angle = degrees % 360;
  if (angle < 0) angle += 360;
  return angle;
}

// Check point in polygon for mountain ranges
function pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function appendUnitHistory(
  unit: Unit,
  type: UnitHistoryEntry['type'],
  headline: string,
  detail: string,
  simTickVal: number,
  hourVal: number,
  minVal: number
) {
  if (!unit.history) unit.history = [];
  const timeStr = `${String(Math.floor(hourVal)).padStart(2, '0')}:${String(Math.floor(minVal)).padStart(2, '0')}:${String(Math.floor(simTickVal % 60)).padStart(2, '0')}Z`;
  const last = unit.history[unit.history.length - 1];
  if (last && last.type === type && last.headline === headline && (simTickVal - last.simTick < 10)) {
    return;
  }
  unit.history.push({
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    simTick: simTickVal,
    type,
    headline,
    detail
  });
  if (unit.history.length > 35) {
    unit.history = unit.history.slice(-35);
  }
}

const SIERRA_RANGE_POLY: [number, number][] = [
  [120, 480],
  [330, 430],
  [410, 560],
  [370, 710],
  [210, 730],
  [110, 640]
];

const MONTE_ORO_POLY: [number, number][] = [
  [180, 80],
  [360, 60],
  [400, 190],
  [250, 240],
  [150, 170]
];

export default function ProjectBrinkApp() {
  // Top-level View Mode: Strategic Map Room (Macro Geopolitical) vs Tactical Radar View (Continuous 2D Vector)
  const [viewMode, setViewMode] = useState<'strategic' | 'tactical'>('strategic');

  // Simulator state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [simTick, setSimTick] = useState<number>(0);
  const [simHour, setSimHour] = useState<number>(6);
  const [simMinute, setSimMinute] = useState<number>(30);
  const [defcon, setDefcon] = useState<number>(3);
  const [activeProvider, setActiveProvider] = useState<string>('GEMINI-3.5-FLASH-LITE [ACTIVE]');
  const [isAiQuerying, setIsAiQuerying] = useState<boolean>(false);
  const [crtTheme, setCrtTheme] = useState<'amber' | 'green'>('green');
  const [scanlines, setScanlines] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showOverlays, setShowOverlays] = useState({
    flankingArcs: false,
    ranges: false,
    airFlightPaths: true,
    samEnvelopes: false,
    contourLines: false,
    terrainZones: true,
    fogOfWar: true,
    tacticalOrders: false,
    repairZones: true
  });
  const [mapDetailMode, setMapDetailMode] = useState<'STREAMLINED' | 'DETAILED'>('STREAMLINED');
  const [repairZones, setRepairZones] = useState<DesignatedRepairZone[]>(INITIAL_REPAIR_ZONES);

  // Fog of War & Reconnaissance States
  const [fowPerspective, setFowPerspective] = useState<FowPerspective>('all');
  const [reconSweepZones, setReconSweepZones] = useState<ReconSweepZone[]>([]);

  // Diplomatic & Economic Simulation Modules
  const [diplomaticLedger, setDiplomaticLedger] = useState<DiplomaticLedger>(createInitialDiplomacy);
  const [economyState, setEconomyState] = useState<EconomyState>(createInitialEconomy);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'diplomacy' | 'economy' | 'terrain'>('telemetry');

  // War Room & Macro Geopolitics
  const [warRoom, setWarRoom] = useState<WarRoomState>(createInitialWarRoom);
  const [newspaperOpen, setNewspaperOpen] = useState<boolean>(false);
  const [selectedBattleForNews, setSelectedBattleForNews] = useState<FlashpointBattle | null>(null);
  const [theaterPhase, setTheaterPhase] = useState<'DIPLOMATIC_CRISIS' | 'TOTAL_WAR_MOBILIZATION'>('DIPLOMATIC_CRISIS');
  const [activeTacticalBattle, setActiveTacticalBattle] = useState<FlashpointBattle | null>(null);
  const [gamemasterReport, setGamemasterReport] = useState<any>(null);

  // Time-Scrubbing Timeline Snapshots
  const [snapshots, setSnapshots] = useState<SimHistorySnapshot[]>([]);
  const [scrubIndex, setScrubIndex] = useState<number>(-1);

  // Entities
  const [units, setUnits] = useState<Unit[]>(createInitialUnits);
  const [airSorties, setAirSorties] = useState<AirSortie[]>([]);
  const [samMissiles, setSamMissiles] = useState<SamMissile[]>([]);
  const [artilleryShells, setArtilleryShells] = useState<ArtilleryShell[]>([]);
  const [torpedoes, setTorpedoes] = useState<Torpedo[]>([]);
  const [sonarPings, setSonarPings] = useState<SonarPing[]>([]);
  const [depthCharges, setDepthCharges] = useState<DepthCharge[]>([]);
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>(INITIAL_BRIDGES);
  const [controlNodes, setControlNodes] = useState<ControlNode[]>(INITIAL_CONTROL_NODES);
  const [airbases, setAirbases] = useState<Airbase[]>(INITIAL_AIRBASES);
  const [factions, setFactions] = useState<Record<FactionId, FactionInfo>>(FACTION_DEFINITIONS);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedAirbaseId, setSelectedAirbaseId] = useState<string | null>(null);
  const [unitHistoryFilter, setUnitHistoryFilter] = useState<'ALL' | 'COMBAT' | 'ORDERS' | 'WEATHER' | 'NAVAL'>('ALL');

  // Unification Event
  const [unifiedState, setUnifiedState] = useState<boolean>(false);
  const [unificationBanner, setUnificationBanner] = useState<string | null>(null);

  // Radio Intercepts & Intelligence
  const [transmissions, setTransmissions] = useState<Transmission[]>([
    {
      id: 'tx-01',
      timestamp: '06:14:02Z',
      factionId: 'loyalists',
      callsign: 'CITADEL LOGISTICS',
      message: 'ALL STATIONS: BLACK GOLD REFINERY PUMPING AT 100% CAPACITY. 1ST ARMOR REFUELED FOR PATROL.',
      priority: 'ROUTINE'
    },
    {
      id: 'tx-02',
      timestamp: '06:18:45Z',
      factionId: 'rebels',
      callsign: 'SIERRA HIGH REDOUBT',
      message: 'SA-2 BATTERY RADAR ACTIVE. CONCEAL VEHICLES UNDER FOREST CANOPY. PREPARE FLANKING TRAP.',
      priority: 'HIGH'
    },
    {
      id: 'tx-03',
      timestamp: '06:22:11Z',
      factionId: 'coalition',
      callsign: 'USS CONSTITUTION RADAR',
      message: 'AIR GROUP SEVEN: F-4 COMBAT AIR PATROL SCRAMBLED OVER DELTA BASIN. INTERCEPT HOSTILE BOGEYS.',
      priority: 'ROUTINE'
    },
    {
      id: 'tx-04',
      timestamp: '06:27:30Z',
      factionId: 'volskan',
      callsign: 'VOLSKAN 5TH ADVISORY',
      message: 'COMRADE VORONOV ORDERS 152MM BATTERIES TO ZERO SIGHTS ON WEST RIVER BANK. STAND BY FOR DIRECTIVE.',
      priority: 'FLASH'
    }
  ]);

  const [lastDoctrineTitle, setLastDoctrineTitle] = useState<string>('OPERATION IRON SHIELD');
  const [geopoliticalAssessment, setGeopoliticalAssessment] = useState<string>(
    'Cold War standoff remains critical along the central river barrier. Clashes reported near Delta Bridge.'
  );

  // Canvas Refs & Offscreen Fog of War Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fowCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const queryTimerRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(0);

  // Mutable Simulation World Reference (Decoupled from React state for buttery 60 FPS physics & rendering)
  const simWorldRef = useRef({
    units: createInitialUnits(),
    airSorties: [] as AirSortie[],
    samMissiles: [] as SamMissile[],
    artilleryShells: [] as ArtilleryShell[],
    visualEffects: [] as VisualEffect[],
    reconSweepZones: [] as ReconSweepZone[],
    bridges: INITIAL_BRIDGES,
    controlNodes: INITIAL_CONTROL_NODES,
    airbases: INITIAL_AIRBASES,
    factions: FACTION_DEFINITIONS,
    diplomaticLedger: createInitialDiplomacy(),
    economyState: createInitialEconomy(),
    warRoom: createInitialWarRoom(),
    simTick: 0,
    simHour: 6,
    simMinute: 30,
    defcon: 3,
    snapshots: [] as SimHistorySnapshot[]
  });

  // Audio mute sync
  useEffect(() => {
    audioSys.enabled = soundEnabled;
  }, [soundEnabled]);

  /* =========================================================================
     AIR SORTIE SCRAMBLE HELPER
     ========================================================================= */
  const scrambleAirSortie = useCallback((factionId: FactionId, role: AirRole) => {
    const base = airbases.find(b => b.factionId === factionId && b.readyAircraft > 0);
    if (!base) return;

    // Pick target based on role
    let targetX = 640;
    let targetY = 360;

    if (role === 'INTERDICTION') {
      const targetBridge = bridges.find(b => !b.isDestroyed) || bridges[1];
      targetX = targetBridge.x;
      targetY = targetBridge.y;
    } else if (role === 'CAS') {
      const enemyUnits = units.filter(u => u.factionId !== factionId);
      if (enemyUnits.length > 0) {
        const randTarget = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
        targetX = randTarget.x;
        targetY = randTarget.y;
      }
    } else if (role === 'AIR_SUPERIORITY') {
      targetX = 540 + (Math.random() * 200 - 100);
      targetY = 400 + (Math.random() * 200 - 100);
    } else if (role === 'RECON') {
      targetX = factionId === 'loyalists' ? 260 : 780;
      targetY = factionId === 'loyalists' ? 200 : 560;
    } else if (role === 'INTERCEPTION') {
      const hostiles = airSorties.filter(s => s.factionId !== factionId);
      if (hostiles.length > 0) {
        targetX = hostiles[0].x;
        targetY = hostiles[0].y;
      }
    }

    const newSortie: AirSortie = {
      id: `sortie-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      callsign: `${base.factionId.toUpperCase().slice(0, 3)}-${Math.floor(10 + Math.random() * 90)}`,
      factionId,
      role,
      x: base.x,
      y: base.y,
      altitude: 100,
      heading: base.runwayAngle,
      speed: 2.2,
      targetX,
      targetY,
      fuel: 100,
      maxFuel: 100,
      airbaseId: base.id,
      status: 'SCRAMBLING',
      trail: [{ x: base.x, y: base.y }]
    };

    setAirSorties(prev => [...prev, newSortie]);
    setAirbases(prev =>
      prev.map(b => (b.id === base.id ? { ...b, readyAircraft: Math.max(0, b.readyAircraft - 1) } : b))
    );

    audioSys.playJetFlyby();
  }, [airbases, airSorties, bridges, units]);

  /* =========================================================================
     ECONOMIC WAR PRODUCTION REINFORCEMENT SPAWN
     ========================================================================= */
  const spawnReinforcement = useCallback((factionId: FactionId, type: UnitType, name: string) => {
    // Determine spawn coordinate near capital / base
    let spawnX = 640;
    let spawnY = 420;

    const base = airbases.find(b => b.factionId === factionId);
    if (base) {
      spawnX = base.x + (Math.random() * 40 - 20);
      spawnY = base.y + (Math.random() * 40 - 20);
    } else {
      const ownedNode = controlNodes.find(n => n.owner === factionId);
      if (ownedNode) {
        spawnX = ownedNode.x + (Math.random() * 40 - 20);
        spawnY = ownedNode.y + (Math.random() * 40 - 20);
      } else {
        spawnX = factionId === 'loyalists' ? 240 : factionId === 'rebels' ? 1040 : factionId === 'coalition' ? 150 : 1150;
        spawnY = factionId === 'loyalists' ? 220 : factionId === 'rebels' ? 620 : factionId === 'coalition' ? 700 : 120;
      }
    }

    const newUnit: Unit = {
      id: `reinf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 10000)}`,
      name,
      factionId,
      type,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      heading: factionId === 'loyalists' || factionId === 'coalition' ? 110 : 290,
      targetX: 640 + (Math.random() * 140 - 70),
      targetY: 420 + (Math.random() * 140 - 70),
      speed: 0.6,
      maxSpeed: type === 'armor' ? 0.9 : type === 'mechanized' ? 1.05 : 0.65,
      strength: 100,
      maxStrength: 100,
      morale: 95,
      fuel: 100,
      entrenchment: 35,
      kills: 0,
      inCombat: false,
      isRetreating: false,
      range: type === 'artillery' ? 260 : type === 'sam' ? 220 : 85,
      reloadTimer: 0,
      components: {
        hull: 100,
        engine: 100,
        weapons: 100
      },
      isEngineDisabled: false,
      isWeaponJammed: false,
      isHullBreached: false,
      isUnderRepair: false,
      repairZoneId: undefined
    };

    setUnits(prev => [...prev, newUnit]);

    setTransmissions(prev => [
      {
        id: `tx-spawn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${Math.floor(Math.random() * 10000)}`,
        timestamp: `${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')}:15Z`,
        factionId,
        callsign: 'WAR PRODUCTION BOARD',
        message: `REINFORCEMENT COMMISSIONED: ${name} deployed to front lines from sector [${Math.round(spawnX)}, ${Math.round(spawnY)}].`,
        priority: 'ROUTINE'
      },
      ...prev
    ]);
  }, [airbases, controlNodes, simHour, simMinute]);

  /* =========================================================================
     CIVIL WAR UNIFICATION TRIGGER HANDLER
     ========================================================================= */
  const triggerUnification = useCallback((victor: string) => {
    setUnifiedState(true);
    setDefcon(1);

    const alertMsg = `SAN PIETRO UNIFICATION TRIGGERED: ${victor} has consolidated sovereign victory nodes. The San Pietro Armed Forces have united as an Awakened Industrial Superpower. Foreign expeditionary forces are ordered to evacuate immediately!`;
    setUnificationBanner(alertMsg);
    audioSys.playAlertSiren();

    setUnits(prev =>
      prev.map(u => {
        if (u.factionId === 'loyalists' || u.factionId === 'rebels') {
          return {
            ...u,
            factionId: 'unified',
            strength: Math.min(100, u.strength + 20),
            morale: 100,
            fuel: 100
          };
        }
        return u;
      })
    );

    setControlNodes(prev =>
      prev.map(n => {
        if (n.owner === 'loyalists' || n.owner === 'rebels') {
          return { ...n, owner: 'unified' };
        }
        return n;
      })
    );

    setTransmissions(prev => [
      {
        id: `tx-unify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}:00Z`,
        factionId: 'unified',
        callsign: 'REPUBLIC OF SAN PIETRO BROADCAST',
        message:
          'ATTENTION ATLANTIC & VOLSKAN FORCES: ALL TERRITORIAL AIRSPACE AND PORTS ARE NOW UNDER SOVEREIGN SAN PIETRO CONTROL. STAND DOWN OR BE TARGETED.',
        priority: 'FLASH'
      },
      ...prev
    ]);
  }, [simHour, simMinute]);

  const unifiedStateRef = useRef(unifiedState);
  useEffect(() => {
    unifiedStateRef.current = unifiedState;
  }, [unifiedState]);

  const triggerUnificationRef = useRef(triggerUnification);
  useEffect(() => {
    triggerUnificationRef.current = triggerUnification;
  }, [triggerUnification]);

  /* =========================================================================
     DIPLOMATIC & ESPIONAGE COMMAND ACTIONS
     ========================================================================= */
  const handleSendEnvoy = useCallback((from: FactionId, to: FactionId, type: EnvoyType, terms?: string) => {
    setDiplomaticLedger(prev => {
      const { updatedLedger, transmission } = dispatchEnvoy(prev, from, to, type, terms, simTick);
      if (transmission) {
        setTransmissions(txs => [transmission, ...txs].slice(0, 35));
        audioSys.playTeletype();
      }
      return updatedLedger;
    });
  }, [simTick]);

  const handleBreakTreaty = useCallback((factionA: FactionId, factionB: FactionId, treatyName: string) => {
    setDiplomaticLedger(prev => {
      const { updatedLedger, transmissions: txs } = breakDiplomaticTreaty(prev, factionA, factionB, treatyName, simTick);
      if (txs.length > 0) {
        setTransmissions(prevTxs => [...txs, ...prevTxs].slice(0, 35));
        audioSys.playAlertSiren();
      }
      return updatedLedger;
    });
  }, [simTick]);

  const handleLaunchCovertOp = useCallback((sponsor: FactionId, target: FactionId, type: CovertOpType) => {
    setDiplomaticLedger(prev => {
      const { updatedLedger, transmission } = launchCovertOperation(prev, sponsor, target, type, simTick);
      if (transmission) {
        setTransmissions(txs => [transmission, ...txs].slice(0, 35));
        audioSys.playRadioStatic();
      }
      return updatedLedger;
    });
  }, [simTick]);

  const handleOrderRetreatToDepot = useCallback((unitId: string) => {
    setUnits(prev => prev.map(u => {
      if (u.id !== unitId) return u;
      const depot = repairZones.find(rz => rz.factionId === u.factionId || (u.factionId === 'unified' && (rz.factionId === 'loyalists' || rz.factionId === 'rebels')));
      if (!depot) return u;
      audioSys.playRadioStatic();
      return {
        ...u,
        isRetreating: true,
        targetX: depot.x + (Math.random() * 20 - 10),
        targetY: depot.y + (Math.random() * 20 - 10),
        currentOrder: {
          action: 'RETREAT',
          targetX: depot.x,
          targetY: depot.y,
          orderText: `DIRECT COMMAND: FALL BACK TO ${depot.name.toUpperCase()} FOR OVERHAUL`,
          issuedTick: simTick,
          aiControlled: false
        }
      };
    }));
  }, [repairZones, simTick]);

  /* =========================================================================
     MULTI-PROVIDER AI ORCHESTRATION & FALLBACK QUERY
     ========================================================================= */
  const queryAiCommander = useCallback(async () => {
    if (isAiQuerying) return;
    setIsAiQuerying(true);

    try {
      const summary = {
        simTick,
        simTime: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')} HRS, OCT 1963`,
        defcon,
        units: units.map(u => ({
          id: u.id,
          name: u.name,
          factionId: u.factionId,
          type: u.type,
          x: Math.round(u.x),
          y: Math.round(u.y),
          strength: Math.round(u.strength),
          morale: Math.round(u.morale),
          fuel: Math.round(u.fuel),
          inCombat: u.inCombat,
          isEncircled: u.isEncircled
        })),
        factions: Object.values(factions).map(f => ({
          id: f.id,
          name: f.name,
          unitsCount: units.filter(u => u.factionId === f.id).length,
          totalStrength: units.filter(u => u.factionId === f.id).reduce((acc, u) => acc + u.strength, 0),
          fuelReserves: f.fuelReserves,
          controlledNodes: controlNodes.filter(n => n.owner === f.id).map(n => n.name)
        })),
        activeAirSorties: airSorties.map(s => ({
          factionId: s.factionId,
          role: s.role,
          targetDesc: `Sector [${Math.round(s.targetX)}, ${Math.round(s.targetY)}]`
        })),
        recentIncidents: [
          `DEFCON level: ${defcon}`,
          bridges.find(b => b.isDestroyed) ? 'Warning: Delta River bridge destroyed!' : 'All river bridges operational',
          unifiedState ? 'San Pietro is fully unified against foreign interventionists' : 'San Pietro civil war ongoing'
        ],
        unifiedState
      };

      const res = await fetch('/api/commander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battlefield: summary })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.provider) {
          setActiveProvider(data.provider);
        }
        if (data.doctrineTitle) {
          setLastDoctrineTitle(data.doctrineTitle);
        }
        if (data.geopoliticalAssessment) {
          setGeopoliticalAssessment(data.geopoliticalAssessment);
        }

        // Process Gamemaster AI arbitration & referee report
        if (data.gamemasterReport) {
          setGamemasterReport(data.gamemasterReport);

          // Update active flashpoint with referee commentary and verdict
          setWarRoom(prev => {
            const updatedFlashpoints = prev.flashpoints.map(f => {
              if (f.status === 'ACTIVE_CLASH') {
                return {
                  ...f,
                  refereeCommentary: data.gamemasterReport.refereeArbitration || f.refereeCommentary,
                  verdict: data.gamemasterReport.verdict || f.verdict,
                  attackerCorpsName: data.gamemasterReport.attacker?.corpsName || f.attackerCorpsName,
                  defenderCorpsName: data.gamemasterReport.defender?.corpsName || f.defenderCorpsName,
                  routStatus: Array.isArray(data.gamemasterReport.routStatus) ? data.gamemasterReport.routStatus : f.routStatus
                };
              }
              return f;
            });
            return { ...prev, flashpoints: updatedFlashpoints };
          });

          // Apply rout status to tactical units
          if (Array.isArray(data.gamemasterReport.routStatus)) {
            data.gamemasterReport.routStatus.forEach((rs: { unitId: string; status: string }) => {
              if (rs.status === 'ROUTING') {
                setUnits(curr => curr.map(u => {
                  if (u.id === rs.unitId || rs.unitId?.includes(u.type)) {
                    return { ...u, isRetreating: true, morale: Math.min(u.morale, 15) };
                  }
                  return u;
                }));
              }
            });
          }
        }

        // Add incoming radio intercepts
        if (Array.isArray(data.transmissions) && data.transmissions.length > 0) {
          const newTx: Transmission[] = data.transmissions.map((t: { factionId: FactionId; callsign: string; message: string; priority?: 'ROUTINE' | 'HIGH' | 'FLASH' }, idx: number) => ({
            id: `ai-tx-${Date.now()}-${idx}`,
            timestamp: `${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')}:${Math.floor(Math.random() * 60)}Z`,
            factionId: t.factionId || 'loyalists',
            callsign: t.callsign || 'HQ DISPATCH',
            message: t.message || 'STATUS NORMAL.',
            priority: t.priority || 'ROUTINE'
          }));

          setTransmissions(prev => [...newTx, ...prev].slice(0, 30));
          audioSys.playTeletype();
        }

        // 1. Apply Direct AI Tactical Unit Orders if present
        const OBJECTIVE_COORDINATES: Record<string, { x: number; y: number }> = {
          DELTA_BRIDGE: { x: 640, y: 420 },
          OIL_REFINERIES: { x: 1080, y: 520 },
          SANTA_MARIA: { x: 380, y: 260 },
          MONTE_ORO: { x: 980, y: 680 },
          PORT_BELLA: { x: 240, y: 680 },
          NORTH_RIVER: { x: 640, y: 180 },
          SIERRA_RANGE: { x: 880, y: 740 }
        };

        if (Array.isArray(data.groundDirectives)) {
          setFactions(prev => {
            const next = { ...prev };
            data.groundDirectives.forEach((gd: { factionId: FactionId; stance: Stance; objective?: string }) => {
              if (next[gd.factionId]) {
                next[gd.factionId].stance = gd.stance;
              }
            });
            return next;
          });
        }

        // Update units with both granular unitOrders and fallback groundDirectives
        const rawUnitOrders = Array.isArray(data.unitOrders) ? data.unitOrders : [];

        setUnits(prev => {
          return prev.map(u => {
            // Check if AI provided a specific order for this unit
            const specificOrder = rawUnitOrders.find((o: { unitId?: string; factionId?: string; action?: string; targetX?: number; targetY?: number; targetEnemyId?: string; orderText?: string }) => 
              o.unitId === u.id || (o.factionId === u.factionId && o.unitId?.includes(u.type))
            );

            if (specificOrder) {
              const targetX = Number.isFinite(specificOrder.targetX) ? specificOrder.targetX : u.targetX;
              const targetY = Number.isFinite(specificOrder.targetY) ? specificOrder.targetY : u.targetY;
              return {
                ...u,
                targetX,
                targetY,
                isRetreating: specificOrder.action === 'RETREAT',
                currentOrder: {
                  action: specificOrder.action || 'MOVE',
                  targetX,
                  targetY,
                  targetUnitId: specificOrder.targetEnemyId,
                  orderText: specificOrder.orderText || 'EXECUTING AI ORDER',
                  issuedTick: simTick,
                  aiControlled: true
                }
              };
            }

            // Fallback to ground stance directive
            const directive = Array.isArray(data.groundDirectives) ? data.groundDirectives.find((gd: { factionId: FactionId; stance: Stance; objective?: string }) => gd.factionId === u.factionId) : null;
            if (!directive) return u;

            const objKey = directive.objective || (u.factionId === 'loyalists' || u.factionId === 'coalition' ? 'DELTA_BRIDGE' : 'OIL_REFINERIES');
            const coord = OBJECTIVE_COORDINATES[objKey] || OBJECTIVE_COORDINATES['DELTA_BRIDGE'];

            const offsetX = (Math.random() * 80 - 40);
            const offsetY = (Math.random() * 80 - 40);
            let newTargetX = coord.x + offsetX;
            let newTargetY = coord.y + offsetY;

            if (directive.stance === 'FLANK_AMBUSH') {
              newTargetX += u.factionId === 'loyalists' ? -120 : 120;
              newTargetY += 60;
            } else if (directive.stance === 'WITHDRAW_REFUEL') {
              newTargetX = u.factionId === 'loyalists' ? 240 : u.factionId === 'rebels' ? 1040 : 640;
              newTargetY = u.factionId === 'loyalists' ? 200 : u.factionId === 'rebels' ? 700 : 400;
            }

            return {
              ...u,
              targetX: newTargetX,
              targetY: newTargetY,
              isRetreating: directive.stance === 'WITHDRAW_REFUEL',
              currentOrder: {
                action: directive.stance === 'FLANK_AMBUSH' ? 'FLANK' : directive.stance === 'WITHDRAW_REFUEL' ? 'RETREAT' : 'MOVE',
                targetX: newTargetX,
                targetY: newTargetY,
                orderText: `DOCTRINE: ${directive.stance.replace(/_/g, ' ')}`,
                issuedTick: simTick,
                aiControlled: true
              }
            };
          });
        });

        // Also sync to simWorldRef.current
        if (simWorldRef.current) {
          simWorldRef.current.units = simWorldRef.current.units.map(u => {
            const specificOrder = rawUnitOrders.find((o: { unitId?: string; factionId?: string; action?: string; targetX?: number; targetY?: number }) => 
              o.unitId === u.id || (o.factionId === u.factionId && o.unitId?.includes(u.type))
            );
            if (specificOrder && Number.isFinite(specificOrder.targetX) && Number.isFinite(specificOrder.targetY)) {
              return {
                ...u,
                targetX: specificOrder.targetX,
                targetY: specificOrder.targetY,
                isRetreating: specificOrder.action === 'RETREAT'
              };
            }
            const directive = Array.isArray(data.groundDirectives) ? data.groundDirectives.find((gd: { factionId: FactionId; stance: Stance; objective?: string }) => gd.factionId === u.factionId) : null;
            if (!directive) return u;
            const objKey = directive.objective || (u.factionId === 'loyalists' || u.factionId === 'coalition' ? 'DELTA_BRIDGE' : 'OIL_REFINERIES');
            const coord = OBJECTIVE_COORDINATES[objKey] || OBJECTIVE_COORDINATES['DELTA_BRIDGE'];
            return {
              ...u,
              targetX: coord.x + (Math.random() * 60 - 30),
              targetY: coord.y + (Math.random() * 60 - 30)
            };
          });
        }

        // Scramble air sorties based on AI directives
        if (Array.isArray(data.airDirectives)) {
          data.airDirectives.slice(0, 2).forEach((ad: { factionId: FactionId; role: AirRole; targetSector: string }) => {
            scrambleAirSortie(ad.factionId, ad.role);
          });
        }
      }
    } catch (err) {
      console.warn('AI Commander query failed, falling back to heuristic engine:', err);
      setActiveProvider('ALGORITHMIC COMMAND ENGINE (OFFLINE FALLBACK)');
    } finally {
      setIsAiQuerying(false);
    }
  }, [airSorties, bridges, controlNodes, defcon, factions, isAiQuerying, scrambleAirSortie, simHour, simMinute, simTick, unifiedState, units]);

  /* =========================================================================
     MAIN SIMULATION TICK & UPDATE LOOP
     ========================================================================= */
  useEffect(() => {
    let lastTime = performance.now();

    const updateSimulation = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1) * simSpeed;
      lastTime = currentTime;

      if (isPlaying && dt > 0) {
        // Increment simulation clock
        setSimTick(t => t + 1);
        queryTimerRef.current += dt;

        // Auto query AI every 18 simulation seconds
        if (queryTimerRef.current >= 18) {
          queryTimerRef.current = 0;
          queryAiCommander();
        }

        // Update clock hours/minutes
        setSimMinute(m => {
          const next = m + dt * 0.4;
          if (next >= 60) {
            setSimHour(h => (h + 1) % 24);
            return 0;
          }
          return next;
        });

        // 1. UPDATE GROUND UNITS
        setUnits(prevUnits => {
          const updated = prevUnits.map(unit => {
            const u = { ...unit };

            // Find nearest enemy
            let closestEnemy: Unit | null = null;
            let minDist = Infinity;

            for (const other of prevUnits) {
              if (other.id !== u.id && other.factionId !== u.factionId && other.strength > 0) {
                // If unified, only foreign powers are enemies
                if (u.factionId === 'unified' && (other.factionId === 'loyalists' || other.factionId === 'rebels')) {
                  continue;
                }
                const d = distance(u.x, u.y, other.x, other.y);
                if (d < minDist) {
                  minDist = d;
                  closestEnemy = other;
                }
              }
            }

            // 0. WEATHER & TACTICAL DEBUFFS CALCULATION
            const debuffs: Array<{ type: string; label: string; desc: string }> = [];

            // Dynamic Terrain calculation
            const terrainInfo = getTerrainAt(u.x, u.y, bridges);
            let speedMultiplier = 1.0;
            let fuelDrainMultiplier = 1.0;

            if (terrainInfo.isRiver) {
              speedMultiplier = 0.15; // severe fording penalty
              fuelDrainMultiplier = 2.0;
            } else if (terrainInfo.zone) {
              // Apply terrain zone movement penalty
              const penalty = terrainInfo.zone.movementPenalty[u.type] ?? 1.0;
              speedMultiplier = penalty;
              if (terrainInfo.type === 'MUD') {
                fuelDrainMultiplier = 1.25; // 25% higher fuel drain in deep mud
              }
            }

            // Monsoon Storm Front tactical debuff
            const monsoon = simWorldRef.current.warRoom.monsoon;
            const distToMonsoon = monsoon ? distance(u.x, u.y, monsoon.x, monsoon.y) : Infinity;
            if (monsoon && distToMonsoon <= monsoon.radius) {
              debuffs.push({
                type: 'MONSOON',
                label: 'MONSOON SQUALL',
                desc: 'Severe gale force squall & downpour. Movement -30%, Sensor vision -50%, reload dispersion.'
              });
              speedMultiplier *= 0.70;
              fuelDrainMultiplier *= 1.30;
              if (!u.activeDebuffs?.some(d => d.type === 'MONSOON')) {
                appendUnitHistory(u, 'WEATHER', 'MONSOON SQUALL ENCOUNTER', 'Entered severe tropical monsoon storm front. Speed cut by 30%, radar detection reduced by 50%.', simTick, simHour, simMinute);
              }
            }

            // Mud Alluvial Silt debuff
            if (terrainInfo.type === 'MUD') {
              debuffs.push({
                type: 'MUD',
                label: 'MUD BOGGED',
                desc: 'Deep alluvial silt. Movement speed -20%, fuel drain +25%.'
              });
              if (!u.activeDebuffs?.some(d => d.type === 'MUD')) {
                appendUnitHistory(u, 'WEATHER', 'BOGGED IN ALLUVIAL SILT', 'Tracks and chassis sinking into deep mud. Movement rate degraded, fuel consumption increased.', simTick, simHour, simMinute);
              }
            }

            // Night Darkness Obscuration check
            const isNight = simHour < 6 || simHour >= 20;
            if (isNight) {
              const isLitByFlare = simWorldRef.current.warRoom.activeFlares?.some(f => distance(u.x, u.y, f.x, f.y) <= f.radius);
              if (!isLitByFlare) {
                debuffs.push({
                  type: 'NIGHT',
                  label: 'NIGHT OBSCURATION',
                  desc: 'Zero-illumination blackout. Target acquisition range and accuracy diminished.'
                });
              }
            }

            u.activeDebuffs = debuffs;

            // Fuel depletion
            if (u.fuel > 0 && (u.vx !== 0 || u.vy !== 0)) {
              u.fuel = Math.max(0, u.fuel - dt * 0.15 * fuelDrainMultiplier);
            }
            if (u.fuel <= 0) {
              speedMultiplier = 0; // Immobilized out of fuel!
            }

            // Ensure components are initialized
            if (!u.components) {
              u.components = { hull: u.strength, engine: 100, weapons: 100 };
            }

            // 1. DESIGNATED REPAIR ZONE & NAVAL DRYDOCK OVERHAUL
            const depot = repairZones.find(rz =>
              rz.factionId === u.factionId || (u.factionId === 'unified' && (rz.factionId === 'loyalists' || rz.factionId === 'rebels'))
            );

            if (depot && !depot.isSabotaged && distance(u.x, u.y, depot.x, depot.y) <= depot.radius) {
              u.isUnderRepair = true;
              u.repairZoneId = depot.id;
              const repRate = depot.repairRate * dt;
              u.components.hull = Math.min(100, u.components.hull + repRate * 0.85);
              u.components.engine = Math.min(100, u.components.engine + repRate * 1.15);
              u.components.weapons = Math.min(100, u.components.weapons + repRate * 1.0);
              u.strength = Math.round(u.components.hull);
              u.fuel = Math.min(100, u.fuel + dt * 14);
              u.morale = Math.min(100, u.morale + dt * 10);

              // Naval Base Drydock re-arming & carrier aircraft replenishment
              if (depot.isNavalBase || u.isNaval) {
                if (u.type === 'carrier') {
                  const maxPlanes = u.carrierMaxAircraft || 10;
                  u.carrierAircraft = Math.min(maxPlanes, (u.carrierAircraft || 0) + dt * 0.4);
                }
                u.torpedoCooldown = Math.max(0, (u.torpedoCooldown || 0) + dt * 2);
              }

              if (u.components.hull > 35) u.isHullBreached = false;
              if (u.components.engine > 40) u.isEngineDisabled = false;
              if (u.components.weapons > 40) u.isWeaponJammed = false;

              // Fully restored
              if (u.components.hull >= 95 && u.components.engine >= 95 && u.components.weapons >= 95 && u.fuel >= 80) {
                u.isUnderRepair = false;
                u.isRetreating = false;
                u.isHullBreached = false;
                u.isEngineDisabled = false;
                u.isWeaponJammed = false;
                appendUnitHistory(u, 'ORDERS', 'DRYDOCK OVERHAUL COMPLETE', `Full mechanical & ordnance replenishment certified at ${depot.name}.`, simTick, simHour, simMinute);
              }
            } else {
              u.isUnderRepair = false;
              u.repairZoneId = undefined;
            }

            // 2. FLANKING & COMBAT WITH DIPLOMATIC STANDOFF RULES
            u.inCombat = false;
            u.lastFlanked = false;

            const relKey = closestEnemy ? getRelationKey(u.factionId, closestEnemy.factionId) : '';
            const rel = closestEnemy ? diplomaticLedger?.relations?.[relKey] : undefined;
            const isAtWar = theaterPhase === 'TOTAL_WAR_MOBILIZATION' ||
                            diplomaticLedger?.escalationPhase === 'ACTIVE_CONFLICT' ||
                            rel?.status === 'TOTAL_WAR' ||
                            (rel && rel.tension <= -80);

            if (closestEnemy && minDist <= u.range && u.fuel > 0 && u.strength > 0) {
              if (!isAtWar) {
                // Diplomatic Cold War Crisis: Hold fire!
                // Units track standoff targets and guard borders without firing
                const targetAngle = (Math.atan2(closestEnemy.y - u.y, closestEnemy.x - u.x) * 180) / Math.PI;
                const diff = normalizeAngle(targetAngle - u.heading);
                if (diff > 180) {
                  u.heading = normalizeAngle(u.heading - 30 * dt);
                } else {
                  u.heading = normalizeAngle(u.heading + 30 * dt);
                }
              } else {
                // ACTIVE WAR ENGAGEMENT
                u.inCombat = true;
                u.reloadTimer = (u.reloadTimer || 0) + dt;

                // Rotate toward enemy
                const targetAngle = (Math.atan2(closestEnemy.y - u.y, closestEnemy.x - u.x) * 180) / Math.PI;
                const diff = normalizeAngle(targetAngle - u.heading);
                if (diff > 180) {
                  u.heading = normalizeAngle(u.heading - 45 * dt);
                } else {
                  u.heading = normalizeAngle(u.heading + 45 * dt);
                }

                // Weapon Jam check: if jammed, 35% chance to fail cycle
                const canFireThisCycle = !u.isWeaponJammed || Math.random() >= 0.35;

                // Fire salvo: reload speed increases with kills (veteran status)
                const reloadThreshold = Math.max(0.65, 1.5 - Math.min(0.85, (u.kills || 0) * 0.12));
                if (u.reloadTimer >= reloadThreshold && canFireThisCycle) {
                  u.reloadTimer = 0;

                  // Check flanking angle on closestEnemy
                  const incomingVectorAngle = (Math.atan2(u.y - closestEnemy.y, u.x - closestEnemy.x) * 180) / Math.PI;
                  const angleDiff = Math.abs(normalizeAngle(incomingVectorAngle - closestEnemy.heading));
                  const relativeAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;

                  let damageMultiplier = 1.0;
                  let isFlankStrike = false;

                  if (relativeAngle <= 45) {
                    damageMultiplier = 0.7; // Frontal armor defense
                  } else if (relativeAngle > 45 && relativeAngle <= 90) {
                    damageMultiplier = 1.1; // Oblique
                  } else if (relativeAngle > 90 && relativeAngle <= 135) {
                    damageMultiplier = 1.8; // FLANK
                    isFlankStrike = true;
                  } else {
                    damageMultiplier = 2.4; // REAR AMBUSH
                    isFlankStrike = true;
                  }

                  const attackerTerrain = getTerrainAt(u.x, u.y, bridges);
                  const terrainAtkMod = attackerTerrain.zone?.attackModifier[u.type] ?? 1.0;

                  const defenderTerrain = getTerrainAt(closestEnemy.x, closestEnemy.y, bridges);
                  const terrainDefMod = defenderTerrain.zone?.defenseModifier[closestEnemy.type] ?? 1.0;

                  const veteranMod = (u.veteran || u.kills >= 5) ? 1.35 : (1.0 + Math.min(0.3, (u.kills || 0) * 0.06));

                  const baseDamage = u.type === 'armor' ? 14 : u.type === 'carrier' ? 18 : u.type === 'destroyer' ? 15 : u.type === 'submarine' ? 16 : u.type === 'mechanized' ? 10 : 7;
                  const totalDamage = baseDamage * damageMultiplier * terrainAtkMod * terrainDefMod * (u.strength / 100) * veteranMod;

                  // Apply component damage to closestEnemy
                  if (!closestEnemy.components) {
                    closestEnemy.components = { hull: closestEnemy.strength, engine: 100, weapons: 100 };
                  }
                  const breachMod = closestEnemy.isHullBreached ? 1.4 : 1.0;
                  const hullDmg = totalDamage * breachMod * 0.8;
                  const engineDmg = isFlankStrike ? totalDamage * 0.75 : totalDamage * 0.3;
                  const weaponDmg = totalDamage * 0.4;

                  closestEnemy.components.hull = Math.max(0, closestEnemy.components.hull - hullDmg);
                  closestEnemy.components.engine = Math.max(0, closestEnemy.components.engine - engineDmg);
                  closestEnemy.components.weapons = Math.max(0, closestEnemy.components.weapons - weaponDmg);

                  if (closestEnemy.components.hull <= 30) closestEnemy.isHullBreached = true;
                  if (closestEnemy.components.engine <= 35) closestEnemy.isEngineDisabled = true;
                  if (closestEnemy.components.weapons <= 35) closestEnemy.isWeaponJammed = true;

                  closestEnemy.strength = Math.round(closestEnemy.components.hull);
                  closestEnemy.morale = Math.max(0, closestEnemy.morale - (isFlankStrike ? 14 : 5));

                  appendUnitHistory(u, 'COMBAT', `ENGAGED ${closestEnemy.name.toUpperCase()}`, `${isFlankStrike ? 'FLANKING AMBUSH' : 'Salvo fire'} landed dealing ${Math.round(totalDamage)} damage.`, simTick, simHour, simMinute);

                  if (isFlankStrike) {
                    closestEnemy.lastFlanked = true;
                    audioSys.playFlankAlarm();
                  }

                  if (closestEnemy.strength <= 0) {
                    u.kills += 1;
                    appendUnitHistory(u, 'COMBAT', `TARGET DESTROYED: ${closestEnemy.name.toUpperCase()}`, `Confirmed kill recorded. Total combat victories: ${u.kills}.`, simTick, simHour, simMinute);
                    if (u.kills >= 5 && !u.veteran) {
                      u.veteran = true;
                      u.maxStrength = Math.min(140, 100 + (u.kills - 4) * 4);
                      u.strength = Math.min(u.maxStrength, u.strength + 20);
                      u.morale = Math.min(100, u.morale + 20);
                      appendUnitHistory(u, 'PROMOTION', 'VETERAN STATUS AWARDED', 'Battlefield elite qualification achieved (+35% combat efficiency, +20 fortitude).', simTick, simHour, simMinute);
                    }
                  }
                }
              }
            }

            // 2b. AUTONOMOUS NAVAL OPERATIONS (Carrier Strike, Submarine Torpedo, Destroyer ASW)
            if (u.type === 'carrier' && u.strength > 0) {
              u.reloadTimer = (u.reloadTimer || 0) + dt;
              if ((u.carrierAircraft ?? 6) > 0 && u.reloadTimer >= 13.0 && isAtWar && closestEnemy && minDist < 450) {
                u.reloadTimer = 0;
                u.carrierAircraft = Math.max(0, (u.carrierAircraft ?? 6) - 1);
                const sortieCallsign = `VF-${Math.floor(Math.random() * 80 + 10)} CAG STRIKE`;
                setAirSorties(prevSorties => [
                  ...prevSorties,
                  {
                    id: `carrier-sortie-${Date.now()}-${Math.random()}`,
                    callsign: sortieCallsign,
                    factionId: u.factionId,
                    role: 'CAS',
                    x: u.x,
                    y: u.y,
                    altitude: 600,
                    heading: (Math.atan2(closestEnemy.y - u.y, closestEnemy.x - u.x) * 180) / Math.PI,
                    speed: 2.3,
                    targetX: closestEnemy.x,
                    targetY: closestEnemy.y,
                    fuel: 100,
                    maxFuel: 100,
                    airbaseId: u.id,
                    status: 'SCRAMBLING',
                    trail: [{ x: u.x, y: u.y }]
                  }
                ]);
                audioSys.playArtillery();
                appendUnitHistory(u, 'NAVAL', 'CARRIER AIR WING LAUNCH', `Catapult launched strike sortie [${sortieCallsign}] targeting ${closestEnemy.name}.`, simTick, simHour, simMinute);
              }
            }

            if (u.type === 'submarine' && u.strength > 0) {
              u.torpedoCooldown = (u.torpedoCooldown || 0) + dt;
              if (u.isSubmerged === undefined) u.isSubmerged = true;

              if (isAtWar && u.torpedoCooldown >= 7.5 && closestEnemy && minDist <= (u.range + 40)) {
                u.torpedoCooldown = 0;
                setTorpedoes(prev => [
                  ...prev,
                  {
                    id: `torp-${Date.now()}-${Math.random()}`,
                    factionId: u.factionId,
                    sourceUnitId: u.id,
                    targetUnitId: closestEnemy.id,
                    x: u.x,
                    y: u.y,
                    startX: u.x,
                    startY: u.y,
                    targetX: closestEnemy.x,
                    targetY: closestEnemy.y,
                    speed: 1.8,
                    heading: (Math.atan2(closestEnemy.y - u.y, closestEnemy.x - u.x) * 180) / Math.PI,
                    damage: 48,
                    life: 7.5,
                    trail: [{ x: u.x, y: u.y }]
                  }
                ]);
                setVisualEffects(v => [
                  ...v,
                  {
                    id: `v-torp-wake-${Date.now()}-${Math.random()}`,
                    type: 'TORPEDO_WAKE',
                    x: u.x,
                    y: u.y,
                    radius: 12,
                    color: '#38bdf8',
                    duration: 1.5,
                    elapsed: 0
                  }
                ]);
                appendUnitHistory(u, 'NAVAL', 'TORPEDO SALVO FIRED', `Fired Mark 37 acoustic homing torpedo at ${closestEnemy.name}.`, simTick, simHour, simMinute);
              }
            }

            if (u.type === 'destroyer' && u.strength > 0) {
              u.sonarCooldown = (u.sonarCooldown || 0) + dt;
              if (u.sonarCooldown >= 7.0) {
                u.sonarCooldown = 0;
                // Emit active sonar ping
                setSonarPings(prev => [
                  ...prev,
                  {
                    id: `ping-${Date.now()}-${Math.random()}`,
                    factionId: u.factionId,
                    sourceUnitId: u.id,
                    x: u.x,
                    y: u.y,
                    radius: 8,
                    maxRadius: 210,
                    duration: 3.2,
                    elapsed: 0
                  }
                ]);

                // Check for submerged enemy submarines in sonar radius
                const enemySub = prevUnits.find(other => 
                  other.type === 'submarine' && 
                  other.factionId !== u.factionId && 
                  other.strength > 0 && 
                  distance(u.x, u.y, other.x, other.y) <= 210
                );

                if (enemySub) {
                  enemySub.isSubmerged = false; // Reveal submarine!
                  // Launch hedgehog depth charge attack
                  setDepthCharges(prev => [
                    ...prev,
                    {
                      id: `dc-${Date.now()}-1`,
                      factionId: u.factionId,
                      sourceUnitId: u.id,
                      x: u.x,
                      y: u.y,
                      targetX: enemySub.x + (Math.random() * 24 - 12),
                      targetY: enemySub.y + (Math.random() * 24 - 12),
                      progress: 0,
                      duration: 2.2,
                      damage: 42
                    },
                    {
                      id: `dc-${Date.now()}-2`,
                      factionId: u.factionId,
                      sourceUnitId: u.id,
                      x: u.x,
                      y: u.y,
                      targetX: enemySub.x + (Math.random() * 32 - 16),
                      targetY: enemySub.y + (Math.random() * 32 - 16),
                      progress: 0,
                      duration: 2.6,
                      damage: 42
                    }
                  ]);
                  appendUnitHistory(u, 'NAVAL', 'ASW CONTACT ACQUIRED', `Active sonar localized submerged ${enemySub.name}. Launched Hedgehog depth charge mortar spread.`, simTick, simHour, simMinute);
                  appendUnitHistory(enemySub, 'NAVAL', 'SONAR LOCK DETECTED', `Targeted by active destroyer sonar ping from ${u.name}! Submerged stealth compromised.`, simTick, simHour, simMinute);
                }
              }
            }

            // 3. AUTONOMOUS TACTICAL MICRO-AI
            if (u.currentOrder?.aiControlled !== false && u.strength > 0) {
              const isCriticallyDamaged = (u.components && (u.components.hull < 45 || u.components.engine < 40 || u.components.weapons < 35)) || u.strength < 35 || u.fuel < 18;

              // Tactical Retreat to designated repair depot or friendly node
              if (isCriticallyDamaged && !u.isRetreating && !u.isUnderRepair) {
                u.isRetreating = true;
                if (depot) {
                  u.targetX = depot.x + (Math.random() * 30 - 15);
                  u.targetY = depot.y + (Math.random() * 30 - 15);
                  u.currentOrder = {
                    action: 'RETREAT',
                    targetX: u.targetX,
                    targetY: u.targetY,
                    orderText: `FALLING BACK TO ${depot.name.toUpperCase()} (HULL: ${Math.round(u.components?.hull ?? u.strength)}%, ENG: ${Math.round(u.components?.engine ?? 100)}%)`,
                    issuedTick: simTick,
                    aiControlled: true
                  };
                } else {
                  const friendlyNodes = controlNodes.filter(n => n.owner === u.factionId || (u.factionId === 'unified' && n.owner === 'unified'));
                  const bestNode = friendlyNodes[0] || controlNodes[0];
                  if (bestNode) {
                    u.targetX = bestNode.x + (Math.random() * 40 - 20);
                    u.targetY = bestNode.y + (Math.random() * 40 - 20);
                    u.currentOrder = {
                      action: 'RETREAT',
                      targetX: u.targetX,
                      targetY: u.targetY,
                      orderText: `RETREATING TO ${bestNode.name.toUpperCase()}`,
                      issuedTick: simTick,
                      aiControlled: true
                    };
                  }
                }
              }
              // Armor & Mechanized Flanking Attack Logic
              else if ((u.type === 'armor' || u.type === 'mechanized') && closestEnemy && minDist < 220 && !u.isRetreating && isAtWar) {
                const flankAngleRad = ((closestEnemy.heading + 90) * Math.PI) / 180;
                const flankX = closestEnemy.x + Math.cos(flankAngleRad) * (u.range * 0.75);
                const flankY = closestEnemy.y + Math.sin(flankAngleRad) * (u.range * 0.75);
                
                if (distance(u.x, u.y, flankX, flankY) > 20) {
                  u.targetX = flankX;
                  u.targetY = flankY;
                  if (!u.currentOrder || u.currentOrder.action !== 'FLANK') {
                    u.currentOrder = {
                      action: 'FLANK',
                      targetX: flankX,
                      targetY: flankY,
                      targetUnitId: closestEnemy.id,
                      orderText: `OUTFLANKING ${closestEnemy.name.toUpperCase()}`,
                      issuedTick: simTick,
                      aiControlled: true
                    };
                  }
                }
              }
              // Infantry / Mechanized Strategic Objective Capture
              else if (u.type === 'infantry' && !u.inCombat && !u.isRetreating) {
                const contestedNodes = controlNodes.filter(n => n.owner !== u.factionId);
                let closestNode = null;
                let closestNodeDist = Infinity;
                for (const cn of contestedNodes) {
                  const d = distance(u.x, u.y, cn.x, cn.y);
                  if (d < closestNodeDist) {
                    closestNodeDist = d;
                    closestNode = cn;
                  }
                }
                if (closestNode && closestNodeDist < 280) {
                  u.targetX = closestNode.x;
                  u.targetY = closestNode.y;
                  if (!u.currentOrder || u.currentOrder.action !== 'DEFEND') {
                    u.currentOrder = {
                      action: 'DEFEND',
                      targetX: closestNode.x,
                      targetY: closestNode.y,
                      orderText: `ASSAULT & SECURE ${closestNode.name.toUpperCase()}`,
                      issuedTick: simTick,
                      aiControlled: true
                    };
                  }
                }
              }
            }

            // Movement toward target vector
            const distToTarget = distance(u.x, u.y, u.targetX, u.targetY);
            if (!u.inCombat && u.fuel > 0 && u.strength > 0) {
              if (distToTarget > 12) {
                const moveAngle = (Math.atan2(u.targetY - u.y, u.targetX - u.x) * 180) / Math.PI;
                u.heading = moveAngle;
                const enginePenalty = u.isEngineDisabled ? 0.35 : (u.components && u.components.engine < 70) ? 0.75 : 1.0;
                const curSpeed = u.maxSpeed * speedMultiplier * enginePenalty * 20;
                u.vx = Math.cos((moveAngle * Math.PI) / 180) * curSpeed;
                u.vy = Math.sin((moveAngle * Math.PI) / 180) * curSpeed;
                u.x += u.vx * dt;
                u.y += u.vy * dt;
                u.entrenchment = Math.max(0, u.entrenchment - dt * 5);
              } else {
                u.vx = 0;
                u.vy = 0;
                // Faster entrenchment in urban or forest cover
                const entrenchRate = terrainInfo.type === 'URBAN' || terrainInfo.type === 'FOREST' ? 4.5 : 3.0;
                u.entrenchment = Math.min(100, u.entrenchment + dt * entrenchRate);
              }

              // Boids soft repulsion to prevent unnatural unit stacking within 25px
              for (const other of prevUnits) {
                if (other.id !== u.id && other.strength > 0) {
                  const d = distance(u.x, u.y, other.x, other.y);
                  if (d < 25 && d > 0) {
                    const push = ((25 - d) / 25) * 0.8;
                    u.x -= ((other.x - u.x) / d) * push;
                    u.y -= ((other.y - u.y) / d) * push;
                  }
                }
              }
            }

            // Encirclement & Supply line isolation check (Kessel)
            const friendlyNodes = controlNodes.filter(n => n.owner === u.factionId || (u.factionId === 'unified' && n.owner === 'unified'));
            let nearestBaseDist = 9999;
            for (const node of friendlyNodes) {
              const d = distance(u.x, u.y, node.x, node.y);
              if (d < nearestBaseDist) nearestBaseDist = d;
            }

            if (nearestBaseDist > 340) {
              u.isEncircled = true;
              u.encirclementTimer = (u.encirclementTimer || 0) + dt;
              // Isolated units suffer fuel starvation and morale collapse
              u.fuel = Math.max(0, u.fuel - dt * 2.2);
              u.morale = Math.max(0, u.morale - dt * 1.5);
              if (u.fuel <= 0 && u.morale <= 10) {
                u.strength = Math.max(0, u.strength - dt * 10);
              }
            } else {
              u.isEncircled = false;
              u.encirclementTimer = 0;
            }

            // Commander Archetype Doctrine influence
            const cmd = simWorldRef.current.warRoom.commanders[u.factionId];
            if (cmd) {
              if (cmd.archetype === 'DOGMATIC_FANATIC') {
                u.isRetreating = false; // Refuses retreat orders
              } else if (u.strength < cmd.doctrine.retreatThreshold * 100 && !u.isRetreating) {
                u.isRetreating = true;
              }
            }

            // Artillery behavior
            if (u.type === 'artillery' && u.strength > 0) {
              u.reloadTimer = (u.reloadTimer || 0) + dt;
              if (u.reloadTimer >= 4.0 && closestEnemy && minDist <= u.range && minDist >= 60) {
                u.reloadTimer = 0;
                // Launch shell
                setArtilleryShells(prevShells => [
                  ...prevShells,
                  {
                    id: `shell-${Date.now()}-${Math.random()}`,
                    startX: u.x,
                    startY: u.y,
                    x: u.x,
                    y: u.y,
                    targetX: closestEnemy ? closestEnemy.x + (Math.random() * 20 - 10) : u.x,
                    targetY: closestEnemy ? closestEnemy.y + (Math.random() * 20 - 10) : u.y,
                    progress: 0,
                    arcHeight: 50,
                    damage: 22,
                    factionId: u.factionId
                  }
                ]);
                audioSys.playArtillery();
              }
            }

            return u;
          });

          return updated.filter(u => u.strength > 0);
        });

        // 2. UPDATE ARTILLERY SHELLS
        setArtilleryShells(prev => {
          const next: ArtilleryShell[] = [];
          for (const s of prev) {
            s.progress += dt * 1.2;
            s.x = s.startX + (s.targetX - s.startX) * s.progress;
            s.y = s.startY + (s.targetY - s.startY) * s.progress;

            if (s.progress >= 1.0) {
              // Impact explosion
              setVisualEffects(v => [
                ...v,
                {
                  id: `v-shell-${Date.now()}-${Math.random()}`,
                  type: 'EXPLOSION',
                  x: s.targetX,
                  y: s.targetY,
                  radius: 28,
                  color: '#fbbf24',
                  duration: 0.6,
                  elapsed: 0
                }
              ]);

              // Damage units in splash radius
              setUnits(currUnits =>
                currUnits.map(targetUnit => {
                  const d = distance(targetUnit.x, targetUnit.y, s.targetX, s.targetY);
                  if (d < 35 && targetUnit.factionId !== s.factionId) {
                    return {
                      ...targetUnit,
                      strength: Math.max(0, targetUnit.strength - s.damage),
                      morale: Math.max(0, targetUnit.morale - 15)
                    };
                  }
                  return targetUnit;
                })
              );
            } else {
              next.push(s);
            }
          }
          return next;
        });

        // 3. UPDATE AIR SORTIES
        setAirSorties(prevSorties => {
          const nextSorties: AirSortie[] = [];

          for (const sortie of prevSorties) {
            const s = { ...sortie };
            s.fuel = Math.max(0, s.fuel - dt * 2.5);

            // Vector movement
            const dist = distance(s.x, s.y, s.targetX, s.targetY);
            const targetAngle = (Math.atan2(s.targetY - s.y, s.targetX - s.x) * 180) / Math.PI;
            s.heading = targetAngle;

            const speedPixels = s.speed * 45;
            s.x += Math.cos((s.heading * Math.PI) / 180) * speedPixels * dt;
            s.y += Math.sin((s.heading * Math.PI) / 180) * speedPixels * dt;

            // Maintain contrail
            s.trail.push({ x: s.x, y: s.y });
            if (s.trail.length > 18) s.trail.shift();

            // Active Reconnaissance mission clears fog of war dynamically
            if (s.role === 'RECON') {
              setReconSweepZones(prevSweeps => {
                const filtered = prevSweeps.filter(sw => sw.id !== `sweep-${s.id}`);
                return [
                  ...filtered,
                  {
                    id: `sweep-${s.id}`,
                    x: s.x,
                    y: s.y,
                    radius: 380, // wide aerial reconnaissance scan
                    remainingDuration: 18, // reveals map for 18 seconds
                    factionId: s.factionId
                  }
                ];
              });
            }

            // Check mission actions
            if (dist < 30 && s.status !== 'RTB') {
              if (s.role === 'CAS') {
                // Drop napalm
                setVisualEffects(v => [
                  ...v,
                  {
                    id: `cas-napalm-${Date.now()}-${Math.random()}`,
                    type: 'NAPALM',
                    x: s.x,
                    y: s.y,
                    radius: 36,
                    color: '#f97316',
                    duration: 2.5,
                    elapsed: 0
                  }
                ]);
                audioSys.playArtillery();

                // Damage enemy ground units nearby
                setUnits(currUnits =>
                  currUnits.map(u => {
                    if (u.factionId !== s.factionId && distance(u.x, u.y, s.x, s.y) < 45) {
                      return {
                        ...u,
                        strength: Math.max(0, u.strength - 22),
                        morale: Math.max(0, u.morale - 25)
                      };
                    }
                    return u;
                  })
                );

                s.status = 'RTB';
                const base = airbases.find(b => b.id === s.airbaseId);
                if (base) {
                  s.targetX = base.x;
                  s.targetY = base.y;
                }
              } else if (s.role === 'INTERDICTION') {
                // Bomb bridge or refinery
                setBridges(currBridges =>
                  currBridges.map(b => {
                    if (distance(b.x, b.y, s.x, s.y) < 40) {
                      const newHealth = Math.max(0, b.health - 55);
                      return {
                        ...b,
                        health: newHealth,
                        isDestroyed: newHealth <= 0
                      };
                    }
                    return b;
                  })
                );

                setVisualEffects(v => [
                  ...v,
                  {
                    id: `bomb-${Date.now()}-${Math.random()}`,
                    type: 'EXPLOSION',
                    x: s.x,
                    y: s.y,
                    radius: 40,
                    color: '#ef4444',
                    duration: 1.2,
                    elapsed: 0
                  }
                ]);

                s.status = 'RTB';
                const base = airbases.find(b => b.id === s.airbaseId);
                if (base) {
                  s.targetX = base.x;
                  s.targetY = base.y;
                }
              } else {
                // Recon or patrol reached destination sector, turn back to refuel
                s.status = 'RTB';
                const base = airbases.find(b => b.id === s.airbaseId);
                if (base) {
                  s.targetX = base.x;
                  s.targetY = base.y;
                }
              }
            }

            // RTB Arrival
            const landAirbase = airbases.find(b => b.id === s.airbaseId);
            const distToBase = landAirbase ? distance(s.x, s.y, landAirbase.x, landAirbase.y) : Infinity;

            if (s.status === 'RTB' && distToBase < 20) {
              setAirbases(abList =>
                abList.map(ab => (ab.id === s.airbaseId ? { ...ab, readyAircraft: Math.min(ab.totalCapacity, ab.readyAircraft + 1) } : ab))
              );
              continue; // sortie completed at land airbase
            }

            // Carrier Flight Deck Recovery
            const carrierUnit = units.find(u => u.id === s.airbaseId && u.type === 'carrier');
            if (carrierUnit && s.status === 'RTB') {
              s.targetX = carrierUnit.x;
              s.targetY = carrierUnit.y;
              if (distance(s.x, s.y, carrierUnit.x, carrierUnit.y) < 28) {
                setUnits(currUnits => currUnits.map(u => {
                  if (u.id === carrierUnit.id) {
                    const newCount = Math.min(u.carrierMaxAircraft || 10, (u.carrierAircraft || 0) + 1);
                    appendUnitHistory(u, 'NAVAL', 'TRAP RECOVERY COMPLETED', `CAG Strike flight recovered safely on flight deck. Ready air wing: ${newCount}.`, simTick, simHour, simMinute);
                    return { ...u, carrierAircraft: newCount };
                  }
                  return u;
                }));
                continue; // sortie trapped on carrier deck
              }
            }

            // SAM Air Defense Interception Trigger
            if (s.status !== 'DESTROYED') {
              for (const u of units) {
                if (u.type === 'sam' && u.factionId !== s.factionId && u.strength > 0) {
                  const samDist = distance(u.x, u.y, s.x, s.y);
                  if (samDist <= u.range && Math.random() < 0.02 * dt) {
                    setSamMissiles(mList => [
                      ...mList,
                      {
                        id: `sam-${Date.now()}-${Math.random()}`,
                        factionId: u.factionId,
                        x: u.x,
                        y: u.y,
                        targetSortieId: s.id,
                        speed: 3.5,
                        heading: (Math.atan2(s.y - u.y, s.x - u.x) * 180) / Math.PI,
                        life: 3.0,
                        trail: [{ x: u.x, y: u.y }]
                      }
                    ]);
                  }
                }
              }
            }

            if (s.fuel > 0) {
              nextSorties.push(s);
            }
          }

          return nextSorties;
        });

        // 4. UPDATE SAM MISSILES
        setSamMissiles(prevMissiles => {
          const nextMissiles: SamMissile[] = [];

          for (const m of prevMissiles) {
            m.life -= dt;
            const targetSortie = airSorties.find(s => s.id === m.targetSortieId);

            if (targetSortie && m.life > 0) {
              const angle = (Math.atan2(targetSortie.y - m.y, targetSortie.x - m.x) * 180) / Math.PI;
              m.heading = angle;
              const spd = m.speed * 70;
              m.x += Math.cos((angle * Math.PI) / 180) * spd * dt;
              m.y += Math.sin((angle * Math.PI) / 180) * spd * dt;
              m.trail.push({ x: m.x, y: m.y });
              if (m.trail.length > 8) m.trail.shift();

              if (distance(m.x, m.y, targetSortie.x, targetSortie.y) < 20) {
                // SAM Hit!
                setVisualEffects(v => [
                  ...v,
                  {
                    id: `sam-burst-${Date.now()}-${Math.random()}`,
                    type: 'EXPLOSION',
                    x: m.x,
                    y: m.y,
                    radius: 35,
                    color: '#f43f5e',
                    duration: 0.8,
                    elapsed: 0
                  }
                ]);

                // Destroy aircraft
                setAirSorties(sorties => sorties.filter(s => s.id !== targetSortie.id));
                audioSys.playFlankAlarm();
                continue;
              }
              nextMissiles.push(m);
            }
          }
          return nextMissiles;
        });

        // 4b. UPDATE TORPEDOES (Acoustic Homing & Cavitation Wake)
        setTorpedoes(prevTorpedoes => {
          const nextTorpedoes: Torpedo[] = [];
          for (const t of prevTorpedoes) {
            t.life -= dt;
            const spd = t.speed * 42;
            t.x += Math.cos((t.heading * Math.PI) / 180) * spd * dt;
            t.y += Math.sin((t.heading * Math.PI) / 180) * spd * dt;
            t.trail.push({ x: t.x, y: t.y });
            if (t.trail.length > 12) t.trail.shift();

            // Check hit against target unit or any hostile naval vessel within 24px
            const hitUnit = units.find(u => u.factionId !== t.factionId && u.strength > 0 && distance(t.x, t.y, u.x, u.y) < 24);
            if (hitUnit || t.life <= 0) {
              if (hitUnit) {
                // Torpedo detonation!
                setVisualEffects(v => [
                  ...v,
                  {
                    id: `v-torp-hit-${Date.now()}-${Math.random()}`,
                    type: 'WATER_GEYSER',
                    x: t.x,
                    y: t.y,
                    radius: 38,
                    color: '#38bdf8',
                    duration: 1.4,
                    elapsed: 0
                  },
                  {
                    id: `v-torp-exp-${Date.now()}-${Math.random()}`,
                    type: 'EXPLOSION',
                    x: t.x,
                    y: t.y,
                    radius: 40,
                    color: '#0284c7',
                    duration: 1.0,
                    elapsed: 0
                  }
                ]);
                audioSys.playArtillery();

                setUnits(currUnits => currUnits.map(u => {
                  if (u.id === hitUnit.id) {
                    const nextHull = Math.max(0, (u.components?.hull ?? u.strength) - t.damage);
                    const components = u.components ? {
                      ...u.components,
                      hull: nextHull,
                      engine: Math.max(0, u.components.engine - 35)
                    } : { hull: nextHull, engine: 65, weapons: 80 };

                    appendUnitHistory(u, 'NAVAL', 'TORPEDO IMPACT DETONATION', `Severe hull breach from acoustic torpedo impact! Flooding & engine disabled.`, simTick, simHour, simMinute);
                    return {
                      ...u,
                      strength: Math.round(nextHull),
                      components,
                      isHullBreached: true,
                      isEngineDisabled: true,
                      morale: Math.max(0, u.morale - 30)
                    };
                  }
                  return u;
                }));
              }
              continue; // torpedo consumed
            }
            nextTorpedoes.push(t);
          }
          return nextTorpedoes;
        });

        // 4c. UPDATE SONAR PINGS
        setSonarPings(prevPings => {
          return prevPings
            .map(p => ({
              ...p,
              elapsed: p.elapsed + dt,
              radius: ((p.elapsed + dt) / p.duration) * p.maxRadius
            }))
            .filter(p => p.elapsed < p.duration);
        });

        // 4d. UPDATE DEPTH CHARGES (ASW Hedgehogs & Underwater Concussion Blasts)
        setDepthCharges(prevDCs => {
          const nextDCs: DepthCharge[] = [];
          for (const dc of prevDCs) {
            dc.progress += dt / dc.duration;
            dc.x = dc.x + (dc.targetX - dc.x) * (dt / dc.duration);
            dc.y = dc.y + (dc.targetY - dc.y) * (dt / dc.duration);

            if (dc.progress >= 1.0) {
              // Depth charge detonated!
              setVisualEffects(v => [
                ...v,
                {
                  id: `v-dc-exp-${Date.now()}-${Math.random()}`,
                  type: 'DEPTH_CHARGE_EXPLOSION',
                  x: dc.targetX,
                  y: dc.targetY,
                  radius: 36,
                  color: '#38bdf8',
                  duration: 1.2,
                  elapsed: 0
                },
                {
                  id: `v-dc-geyser-${Date.now()}-${Math.random()}`,
                  type: 'WATER_GEYSER',
                  x: dc.targetX,
                  y: dc.targetY,
                  radius: 42,
                  color: '#bae6fd',
                  duration: 1.6,
                  elapsed: 0
                }
              ]);
              audioSys.playArtillery();

              // Damage submerged submarines in shockwave radius (45px)
              setUnits(currUnits => currUnits.map(u => {
                if (u.type === 'submarine' && u.factionId !== dc.factionId && distance(u.x, u.y, dc.targetX, dc.targetY) < 45) {
                  const nextHull = Math.max(0, (u.components?.hull ?? u.strength) - dc.damage);
                  const components = u.components ? {
                    ...u.components,
                    hull: nextHull,
                    engine: Math.max(0, u.components.engine - 40)
                  } : { hull: nextHull, engine: 50, weapons: 70 };

                  appendUnitHistory(u, 'NAVAL', 'DEPTH CHARGE SHOCKWAVE HIT', `Underwater concussion compressed pressure hull! Forced emergency blow surfacing.`, simTick, simHour, simMinute);
                  return {
                    ...u,
                    strength: Math.round(nextHull),
                    components,
                    isSubmerged: false, // forced to surface
                    isHullBreached: true,
                    morale: Math.max(0, u.morale - 35)
                  };
                }
                return u;
              }));
              continue;
            }
            nextDCs.push(dc);
          }
          return nextDCs;
        });

        // 5. UPDATE CONTROL NODES & CAPTURE
        setControlNodes(currNodes => {
          let nodeChanged = false;
          const nextNodes = currNodes.map(node => {
            const nearbyUnits = units.filter(u => distance(u.x, u.y, node.x, node.y) <= node.radius + 15);
            if (nearbyUnits.length > 0) {
              const dominantFaction = nearbyUnits[0].factionId;
              const sameFaction = nearbyUnits.every(u => u.factionId === dominantFaction);
              if (sameFaction && dominantFaction !== node.owner) {
                nodeChanged = true;
                return { ...node, owner: dominantFaction };
              }
            }
            return node;
          });

          if (nodeChanged && !unifiedStateRef.current) {
            const loyalistVictoryCount = nextNodes.filter(n => n.isVictoryNode && n.owner === 'loyalists').length;
            const rebelVictoryCount = nextNodes.filter(n => n.isVictoryNode && n.owner === 'rebels').length;
            if (loyalistVictoryCount >= 3 || rebelVictoryCount >= 3) {
              const victor = loyalistVictoryCount >= 3 ? 'Nationalist Command' : 'Liberation Front';
              triggerUnificationRef.current(victor);
            }
          }

          return nextNodes;
        });

        // 6. UPDATE VISUAL EFFECTS
        setVisualEffects(prev =>
          prev
            .map(ef => ({ ...ef, elapsed: ef.elapsed + dt }))
            .filter(ef => ef.elapsed < ef.duration)
        );

        // 7. UPDATE RECONNAISSANCE SWEEP ZONES
        setReconSweepZones(prev =>
          prev
            .map(sw => ({ ...sw, remainingDuration: sw.remainingDuration - dt }))
            .filter(sw => sw.remainingDuration > 0)
        );

        // 8. STEP WAR ECONOMY & INDUSTRIAL OUTPUT
        setEconomyState(prevEco =>
          stepEconomy(
            prevEco,
            controlNodes,
            units,
            diplomaticLedger,
            dt,
            simTick,
            spawnReinforcement
          )
        );

        // Step depot sabotage recovery timers
        setRepairZones(prev => prev.map(rz => {
          if (rz.isSabotaged && (rz.sabotageTimer ?? 0) > 0) {
            const next = (rz.sabotageTimer ?? 0) - dt;
            return {
              ...rz,
              sabotageTimer: Math.max(0, next),
              isSabotaged: next > 0
            };
          }
          return rz;
        }));

        // 9. STEP AUTONOMOUS DIPLOMATIC AI (approx every 15 simulation seconds)
        if (simTick % 15 === 0) {
          const simTimeStr = `${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')}:${String((simTick % 60)).padStart(2, '0')}Z`;
          const { updatedLedger, newTransmissions } = stepDiplomaticAI(
            diplomaticLedger,
            factions,
            units,
            controlNodes,
            defcon,
            simTick,
            simTimeStr,
            (targetFaction) => {
              // Covert sabotage against depot
              setRepairZones(prev => prev.map(rz => {
                if (rz.factionId === targetFaction) {
                  return { ...rz, isSabotaged: true, sabotageTimer: 60 };
                }
                return rz;
              }));
            },
            (targetFaction, amount) => {
              // Covert financial support
              setEconomyState(prev => {
                const nextRes = { ...prev.factionResources };
                if (nextRes[targetFaction]) {
                  nextRes[targetFaction] = {
                    ...nextRes[targetFaction],
                    treasury: nextRes[targetFaction].treasury + amount
                  };
                }
                return { ...prev, factionResources: nextRes };
              });
            }
          );
          setDiplomaticLedger(updatedLedger);
          if (newTransmissions.length > 0) {
            setTransmissions(prev => [...newTransmissions, ...prev].slice(0, 35));
            audioSys.playTeletype();
          }

          // Step War Room Geopolitics, Weather, Flares, Flashpoints, and Logistics
          const isNight = simHour < 6 || simHour >= 20;
          const combatUnits = units.filter(u => u.inCombat);
          const activeCombatCoords = combatUnits.map(u => ({ x: u.x, y: u.y }));

          stepWeatherAndFlares(simWorldRef.current.warRoom, dt, isNight, activeCombatCoords);

          stepFlashpoints(
            simWorldRef.current.warRoom,
            units,
            dt,
            (concludedBattle) => {
              setSelectedBattleForNews(concludedBattle);
              audioSys.playRadioStatic();
            }
          );

          // Calculate casualties for homefront anti-war unrest
          const coalitionLosses = units.filter(u => u.factionId === 'coalition' && u.inCombat && u.strength < 50).length;
          const volskanLosses = units.filter(u => u.factionId === 'volskan' && u.inCombat && u.strength < 50).length;
          stepHomefrontMorale(simWorldRef.current.warRoom, coalitionLosses, volskanLosses, dt);

          // Record snapshot every 40 ticks for Time-Scrubbing timeline
          if (simTick % 40 === 0) {
            const nodeOwnersMap: Record<string, FactionId> = {};
            controlNodes.forEach(n => {
              nodeOwnersMap[n.id] = n.owner;
            });
            const snap: SimHistorySnapshot = {
              tick: simTick,
              timeStr: simTimeStr,
              units: units.map(u => ({
                id: u.id,
                type: u.type,
                x: Math.round(u.x),
                y: Math.round(u.y),
                factionId: u.factionId,
                strength: Math.round(u.strength),
                inCombat: u.inCombat,
                heading: Math.round(u.heading),
                isEncircled: u.isEncircled
              })),
              nodeOwners: nodeOwnersMap,
              activeFlashpointCount: simWorldRef.current.warRoom.flashpoints.filter(f => f.status === 'ACTIVE_CLASH').length
            };
            simWorldRef.current.snapshots.push(snap);
            if (simWorldRef.current.snapshots.length > 80) {
              simWorldRef.current.snapshots.shift();
            }
            setSnapshots([...simWorldRef.current.snapshots]);
          }

          // Sync WarRoom to React state
          setWarRoom({ ...simWorldRef.current.warRoom });
        }
      }

      animFrameId.current = requestAnimationFrame(updateSimulation);
    };

    lastTimeRef.current = performance.now();
    animFrameId.current = requestAnimationFrame(updateSimulation);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [airbases, airSorties, bridges, controlNodes, defcon, diplomaticLedger, factions, isPlaying, queryAiCommander, repairZones, simHour, simMinute, simSpeed, simTick, spawnReinforcement, theaterPhase, units]);

  /* =========================================================================
     CANVAS 2D VECTOR RENDERING
     ========================================================================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Primary Colors based on CRT Theme
    const isAmber = crtTheme === 'amber';
    const bgColor = isAmber ? '#120b02' : '#030603';
    const gridColor = isAmber ? 'rgba(245, 158, 11, 0.08)' : 'rgba(74, 246, 38, 0.08)';
    const primaryGlow = isAmber ? '#f59e0b' : '#4af626';
    const waterFill = isAmber ? '#1e1406' : '#081a0b';
    const waterBorder = isAmber ? '#b45309' : '#1a4520';

    // Clear Canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // 1. CRT Radar Grid Lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Radar Concentric Calibration Rings
    ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(640, 420, 220, 0, Math.PI * 2);
    ctx.arc(640, 420, 440, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. MEANDERING RIVER SPLINE (Continuous Vector)
    ctx.save();
    ctx.fillStyle = waterFill;
    ctx.strokeStyle = waterBorder;
    ctx.lineWidth = 32;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(510, 0);
    ctx.bezierCurveTo(460, 180, 560, 360, 520, 520);
    ctx.bezierCurveTo(480, 680, 550, 780, 490, 850);
    ctx.stroke();

    // Inner River Flow Vector
    ctx.strokeStyle = isAmber ? '#d97706' : '#10b981';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // 3. DYNAMIC TERRAIN ZONES & TOPOGRAPHIC VECTORS
    if (showOverlays.terrainZones) {
      TERRAIN_ZONES.forEach(zone => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(zone.polygon[0][0], zone.polygon[0][1]);
        for (let i = 1; i < zone.polygon.length; i++) {
          ctx.lineTo(zone.polygon[i][0], zone.polygon[i][1]);
        }
        ctx.closePath();

        if (zone.type === 'MUD') {
          ctx.fillStyle = isAmber ? 'rgba(120, 80, 20, 0.28)' : 'rgba(85, 65, 25, 0.3)';
          ctx.fill();
          ctx.strokeStyle = isAmber ? 'rgba(217, 119, 6, 0.6)' : 'rgba(180, 120, 30, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = isAmber ? '#fbbf24' : '#eab308';
          ctx.font = 'bold 9px monospace';
          if (mapDetailMode === 'STREAMLINED') {
            ctx.fillText(`░ ${zone.name.toUpperCase()} [MUD]`, zone.labelPos[0], zone.labelPos[1]);
          } else {
            ctx.fillText(`░░░ ${zone.name.toUpperCase()} [MUD: -20% VEHICLE SPEED / +25% FUEL DRAIN]`, zone.labelPos[0], zone.labelPos[1]);
          }
        } else if (zone.type === 'FOREST') {
          ctx.fillStyle = isAmber ? 'rgba(60, 80, 20, 0.28)' : 'rgba(16, 78, 40, 0.32)' ;
          ctx.fill();
          ctx.strokeStyle = isAmber ? 'rgba(163, 230, 53, 0.5)' : 'rgba(34, 197, 94, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = isAmber ? '#a3e635' : '#4ade80';
          ctx.font = 'bold 9px monospace';
          if (mapDetailMode === 'STREAMLINED') {
            ctx.fillText(`▲ ${zone.name.toUpperCase()} [WOODS]`, zone.labelPos[0], zone.labelPos[1]);
          } else {
            ctx.fillText(`▲▲ ${zone.name.toUpperCase()} [FOREST: +1 INF ATK / AMBUSH CONCEALED]`, zone.labelPos[0], zone.labelPos[1]);
          }
        } else if (zone.type === 'HILLS') {
          ctx.fillStyle = isAmber ? 'rgba(180, 83, 9, 0.22)' : 'rgba(6, 78, 59, 0.26)';
          ctx.fill();
          ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.55)' : 'rgba(52, 211, 153, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (showOverlays.contourLines) {
            ctx.setLineDash([3, 4]);
            ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.3)' : 'rgba(52, 211, 153, 0.3)';
            ctx.beginPath();
            const cx = zone.polygon.reduce((acc, pt) => acc + pt[0], 0) / zone.polygon.length;
            const cy = zone.polygon.reduce((acc, pt) => acc + pt[1], 0) / zone.polygon.length;
            for (let i = 0; i < zone.polygon.length; i++) {
              const p = zone.polygon[i];
              const innerX = p[0] * 0.72 + cx * 0.28;
              const innerY = p[1] * 0.72 + cy * 0.28;
              if (i === 0) ctx.moveTo(innerX, innerY);
              else ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.setLineDash([]);
          }

          ctx.fillStyle = isAmber ? '#fbbf24' : '#6ee7b7';
          ctx.font = 'bold 9px monospace';
          if (mapDetailMode === 'STREAMLINED') {
            ctx.fillText(`▲ ${zone.name.toUpperCase()} [HILLS]`, zone.labelPos[0], zone.labelPos[1]);
          } else {
            ctx.fillText(`▲ ${zone.name.toUpperCase()} [HILLS: +2 DEFENSE / +50% ELEVATION LOS]`, zone.labelPos[0], zone.labelPos[1]);
          }
        } else if (zone.type === 'URBAN') {
          ctx.fillStyle = isAmber ? 'rgba(70, 50, 25, 0.35)' : 'rgba(30, 58, 75, 0.38)';
          ctx.fill();
          ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.65)' : 'rgba(147, 197, 253, 0.65)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Hatching
          ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.18)' : 'rgba(147, 197, 253, 0.18)';
          ctx.lineWidth = 1;
          for (let gx = zone.labelPos[0] - 30; gx < zone.labelPos[0] + 90; gx += 18) {
            ctx.beginPath();
            ctx.moveTo(gx, zone.labelPos[1] - 24);
            ctx.lineTo(gx, zone.labelPos[1] + 24);
            ctx.stroke();
          }

          ctx.fillStyle = isAmber ? '#fde047' : '#93c5fd';
          ctx.font = 'bold 9px monospace';
          if (mapDetailMode === 'STREAMLINED') {
            ctx.fillText(`▦ ${zone.name.toUpperCase()} [URBAN]`, zone.labelPos[0], zone.labelPos[1]);
          } else {
            ctx.fillText(`▦▦ ${zone.name.toUpperCase()} [METROPOLITAN: +2 DEFENSE COVER / ENHANCED ENTRENCH]`, zone.labelPos[0], zone.labelPos[1]);
          }
        }
        ctx.restore();
      });
    }

    // 4. BRIDGES ACROSS RIVER
    bridges.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.isDestroyed) {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.strokeRect(-b.width / 2, -b.height / 2, b.width, b.height);
        ctx.beginPath();
        ctx.moveTo(-b.width / 2, -b.height / 2);
        ctx.lineTo(b.width / 2, b.height / 2);
        ctx.moveTo(-b.width / 2, b.height / 2);
        ctx.lineTo(b.width / 2, -b.height / 2);
        ctx.stroke();
        ctx.fillStyle = '#f87171';
        ctx.font = '9px monospace';
        ctx.fillText('COLLAPSED', -24, -b.height / 2 - 4);
      } else {
        ctx.fillStyle = isAmber ? '#b45309' : '#047857';
        ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
        ctx.strokeStyle = isAmber ? '#f59e0b' : '#34d399';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-b.width / 2, -b.height / 2, b.width, b.height);

        // Deck lines
        ctx.beginPath();
        ctx.moveTo(0, -b.height / 2);
        ctx.lineTo(0, b.height / 2);
        ctx.stroke();

        ctx.fillStyle = primaryGlow;
        ctx.font = '9px monospace';
        ctx.fillText(`${b.name} (${b.health}%)`, -b.width / 2 - 20, -b.height / 2 - 4);
      }
      ctx.restore();
    });

    // 5. CONTROL NODES (Strategic Objectives)
    controlNodes.forEach(node => {
      ctx.save();
      const faction = factions[node.owner];
      const nodeColor = faction?.color || '#94a3b8';

      // Outer pulse radius
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Dashed capture envelope
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Icon / Hub
      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 7, 0, Math.PI * 2);
      ctx.fill();

      // Victory Node Gold Star
      if (node.isVictoryNode) {
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('★ VICTORY NODE', node.x - 40, node.y - node.radius - 8);
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(node.name, node.x - 45, node.y + node.radius + 14);
      ctx.fillStyle = nodeColor;
      ctx.font = '9px monospace';
      ctx.fillText(`CONTROL: ${faction?.name || node.owner}`, node.x - 45, node.y + node.radius + 24);
      ctx.restore();
    });

    // 6. AIRBASES & RUNWAYS
    airbases.forEach(ab => {
      ctx.save();
      ctx.translate(ab.x, ab.y);
      const abColor = factions[ab.factionId]?.color || '#94a3b8';

      // Runway rectangle
      ctx.rotate((ab.runwayAngle * Math.PI) / 180);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.fillRect(-35, -8, 70, 16);
      ctx.strokeStyle = abColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-35, -8, 70, 16);

      // Centerline
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.rotate((-ab.runwayAngle * Math.PI) / 180);
      ctx.fillStyle = abColor;
      ctx.font = '9px monospace';
      ctx.fillText(`✈ ${ab.name} [${ab.readyAircraft}/${ab.totalCapacity}]`, -45, -16);
      ctx.restore();
    });

    // 6.5. PERSPECTIVE RADAR VISION FOR FOG OF WAR
    const visionSources = getFactionVisionSources(
      fowPerspective,
      units,
      airSorties,
      controlNodes,
      airbases,
      reconSweepZones
    );

    // 6.75 DESIGNATED REPAIR DEPOTS & OVERHAUL WORKSHOPS
    if (showOverlays.repairZones) {
      repairZones.forEach(depot => {
        ctx.save();
        const dColor = factions[depot.factionId]?.color || '#38bdf8';

        // Outer subtle repair radius (dashed)
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = depot.isSabotaged ? 'rgba(239, 68, 68, 0.45)' : `${dColor}33`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(depot.x, depot.y, depot.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Depot Structure Circle
        ctx.fillStyle = depot.isSabotaged ? '#450a0a' : '#0f172a';
        ctx.strokeStyle = depot.isSabotaged ? '#ef4444' : dColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(depot.x, depot.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Wrench Icon Symbol
        ctx.fillStyle = depot.isSabotaged ? '#f87171' : dColor;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛠', depot.x, depot.y);

        // Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = depot.isSabotaged ? '#f87171' : '#f8fafc';
        if (mapDetailMode === 'STREAMLINED') {
          ctx.fillText(depot.name.split(' ')[0] + ' DEPOT', depot.x, depot.y + 22);
        } else {
          ctx.fillText(depot.name, depot.x, depot.y + 22);
        }

        if (depot.isSabotaged) {
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`! SABOTAGED [${Math.ceil(depot.sabotageTimer ?? 0)}s] !`, depot.x, depot.y + 32);
        }
        ctx.restore();
      });
    }

    // 6.8 DIPLOMATIC ENVOYS IN TRANSIT
    if (diplomaticLedger?.envoys) {
      diplomaticLedger.envoys.filter(e => e.status === 'IN_TRANSIT').forEach(envoy => {
        const fromBase = repairZones.find(r => r.factionId === envoy.fromFaction) || { x: 200, y: 300 };
        const toBase = repairZones.find(r => r.factionId === envoy.toFaction) || { x: 800, y: 500 };
        const t = Math.min(1, envoy.progress / 100);
        const curX = fromBase.x + (toBase.x - fromBase.x) * t;
        const curY = fromBase.y + (toBase.y - fromBase.y) * t;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🕊', curX, curY);

        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'left';
        ctx.fillText(`ENVOY -> ${envoy.toFaction.toUpperCase()}`, curX + 12, curY + 3);
        ctx.restore();
      });
    }

    // 7. NATO MILITARY COUNTERS (Units)
    units.forEach(u => {
      // Fog of War Detection Check
      const isDetected = fowPerspective === 'all' || isUnitDetectedByFaction(u, fowPerspective, visionSources);
      if (!isDetected) {
        return; // Hidden units remain invisible until detected by radar, reconnaissance, or friendly patrols
      }

      ctx.save();
      ctx.translate(u.x, u.y);

      const fColor = factions[u.factionId]?.color || '#94a3b8';
      const isSelected = selectedUnitId === u.id;

      // Range Circle Overlay
      if (showOverlays.ranges && (isSelected || u.type === 'artillery' || u.type === 'sam')) {
        ctx.strokeStyle = `${fColor}33`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, u.range, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Flanking Arc Indicator (shows the >90° severe flanking penalty zone relative to facing)
      if (showOverlays.flankingArcs && (isSelected || u.inCombat)) {
        ctx.save();
        ctx.rotate((u.heading * Math.PI) / 180);
        ctx.beginPath();
        ctx.arc(0, 0, 32, (90 * Math.PI) / 180, (270 * Math.PI) / 180);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }

      // Selection Ring
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Facing / Heading Arrow
      ctx.save();
      ctx.rotate((u.heading * Math.PI) / 180);
      ctx.strokeStyle = primaryGlow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(24, 0);
      ctx.lineTo(20, -3);
      ctx.moveTo(24, 0);
      ctx.lineTo(20, 3);
      ctx.stroke();
      ctx.restore();

      // NATO Counter Box (28 x 20 px)
      const w = 28;
      const h = 20;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeStyle = fColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // NATO Symbology inside Counter
      ctx.strokeStyle = fColor;
      ctx.lineWidth = 1.5;
      if (u.type === 'infantry') {
        // Saltire "X"
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, -h / 2 + 3);
        ctx.lineTo(w / 2 - 3, h / 2 - 3);
        ctx.moveTo(w / 2 - 3, -h / 2 + 3);
        ctx.lineTo(-w / 2 + 3, h / 2 - 3);
        ctx.stroke();
      } else if (u.type === 'armor') {
        // Center Oval
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (u.type === 'mechanized') {
        // Oval + Diagonal slash
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, h / 2 - 4);
        ctx.lineTo(w / 2 - 4, -h / 2 + 4);
        ctx.stroke();
      } else if (u.type === 'artillery') {
        // Solid Center Dot
        ctx.fillStyle = fColor;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (u.type === 'sam') {
        // Upward Radar Chevron
        ctx.beginPath();
        ctx.arc(0, 3, 6, Math.PI, 0);
        ctx.moveTo(0, 3);
        ctx.lineTo(0, -6);
        ctx.stroke();
      } else if (u.type === 'carrier') {
        // Aircraft Carrier Flight Deck Angled Striping & Superstructure
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 4, -h / 2 + 3);
        ctx.lineTo(w / 2 - 4, -h / 2 + 3);
        ctx.moveTo(-w / 2 + 4, h / 2 - 3);
        ctx.lineTo(w / 2 - 4, h / 2 - 3);
        ctx.stroke();
        ctx.fillStyle = fColor;
        ctx.fillRect(w / 2 - 7, -h / 2 + 4, 4, 6); // island tower
        ctx.font = 'bold 7px monospace';
        ctx.fillText('CV', -4, 3);
      } else if (u.type === 'destroyer') {
        // Destroyer Warship Hull & Twin Turrets
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, 0);
        ctx.lineTo(w / 2 - 3, 0);
        ctx.arc(-5, 0, 2.5, 0, Math.PI * 2);
        ctx.arc(5, 0, 2.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (u.type === 'submarine') {
        // Submarine Cigar Hull & Conning Tower
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.moveTo(0, -3.5);
        ctx.lineTo(0, -6.5);
        ctx.stroke();
        if (u.isSubmerged) {
          ctx.strokeStyle = '#38bdf8';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Status Bars: Strength (Green), Fuel (Amber), Morale (Cyan)
      const barW = 26;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-barW / 2, h / 2 + 3, barW, 4);
      ctx.fillStyle = u.strength > 40 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-barW / 2, h / 2 + 3, (barW * u.strength) / 100, 4);

      // Fuel bar
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(-barW / 2, h / 2 + 8, barW, 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-barW / 2, h / 2 + 8, (barW * u.fuel) / 100, 2);

      // Flank alert badge
      if (u.lastFlanked) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('! FLANK !', -20, -h / 2 - 4);
      }

      // Active Tactical Weather & Environment Debuff Badges
      if (u.activeDebuffs && u.activeDebuffs.length > 0) {
        ctx.save();
        ctx.font = 'bold 7px monospace';
        let debuffOffsetY = -h / 2 - 14;
        u.activeDebuffs.forEach(deb => {
          if (deb.type === 'MONSOON') {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('☁ SQUALL -30%', -w / 2 - 8, debuffOffsetY);
          } else if (deb.type === 'MUD') {
            ctx.fillStyle = '#f59e0b';
            ctx.fillText('≈ MUD BOGGED', -w / 2 - 8, debuffOffsetY);
          } else if (deb.type === 'NIGHT') {
            ctx.fillStyle = '#818cf8';
            ctx.fillText('☾ NIGHT', -w / 2 - 8, debuffOffsetY);
          }
          debuffOffsetY -= 9;
        });
        ctx.restore();
      }

      // Veteran Chevron Indicator (> 5 kills)
      if (u.kills >= 5 || u.veteran) {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.fillStyle = '#fbbf24';
        ctx.lineWidth = 1.8;
        const cy = -h / 2 - 5;
        // Military chevron ^
        ctx.beginPath();
        ctx.moveTo(-5, cy);
        ctx.lineTo(0, cy - 4);
        ctx.lineTo(5, cy);
        ctx.stroke();

        // Elite veteran double chevron ^^ for >= 10 kills
        if (u.kills >= 10) {
          ctx.beginPath();
          ctx.moveTo(-5, cy - 4);
          ctx.lineTo(0, cy - 8);
          ctx.lineTo(5, cy - 4);
          ctx.stroke();
        }

        ctx.font = 'bold 8px monospace';
        ctx.fillText(`★${u.kills}`, 7, cy - 1);
        ctx.restore();
      }

      // Dynamic Terrain Badge
      const unitTerrain = getTerrainAt(u.x, u.y, bridges);
      if (unitTerrain.zone) {
        ctx.save();
        ctx.font = 'bold 8px monospace';
        if (unitTerrain.type === 'MUD') {
          ctx.fillStyle = '#f59e0b';
          ctx.fillText('MUD -20%', -w / 2, -h / 2 - 12);
        } else if (unitTerrain.type === 'FOREST') {
          ctx.fillStyle = '#4ade80';
          ctx.fillText('WOODS +1', -w / 2, -h / 2 - 12);
        } else if (unitTerrain.type === 'HILLS') {
          ctx.fillStyle = '#a3e635';
          ctx.fillText('RIDGE +2', -w / 2, -h / 2 - 12);
        } else if (unitTerrain.type === 'URBAN') {
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('URBAN +2', -w / 2, -h / 2 - 12);
        }
        ctx.restore();
      }

      // Component damage / repair status indicators
      if (u.isUnderRepair) {
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('🛠 REPAIR', -w / 2, h / 2 + 18);
        ctx.restore();
      } else if (u.isHullBreached) {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('🛡 BREACH', -w / 2, h / 2 + 18);
        ctx.restore();
      } else if (u.isEngineDisabled) {
        ctx.save();
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('⚡ ENG-FAIL', -w / 2, h / 2 + 18);
        ctx.restore();
      } else if (u.isWeaponJammed) {
        ctx.save();
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('⚔ WPN-JAM', -w / 2, h / 2 + 18);
        ctx.restore();
      } else if (isUnitConcealed(u) && (fowPerspective === 'all' || u.factionId === fowPerspective)) {
        ctx.save();
        ctx.font = 'bold 7px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('CONCEALED', -w / 2 - 4, h / 2 + 18);
        ctx.restore();
      }

      ctx.restore();
    });

    // 7.5 TACTICAL UNIT ORDER VECTORS & AI WAYPOINTS
    const currentSelectedUnit = units.find(u => u.id === selectedUnitId);
    if (showOverlays.tacticalOrders || currentSelectedUnit) {
      units.forEach(u => {
        if (fowPerspective !== 'all' && u.factionId !== fowPerspective) return;
        const isSelected = currentSelectedUnit?.id === u.id;
        if (!showOverlays.tacticalOrders && !isSelected) return;

        const dist = distance(u.x, u.y, u.targetX, u.targetY);
        if (dist > 15) {
          ctx.save();
          const fColor = factions[u.factionId]?.color || '#38bdf8';
          ctx.strokeStyle = isSelected ? '#38bdf8' : `${fColor}aa`;
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.setLineDash([4, 4]);

          // Draw vector line from unit to target waypoint
          ctx.beginPath();
          ctx.moveTo(u.x, u.y);
          ctx.lineTo(u.targetX, u.targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Waypoint reticle / marker
          ctx.strokeStyle = isSelected ? '#38bdf8' : fColor;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.arc(u.targetX, u.targetY, isSelected ? 8 : 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Action badge (e.g. [FLANK], [ATTACK], [DEFEND], [RETREAT], [BOMBARD])
          const actionText = u.currentOrder?.action || (u.isRetreating ? 'RETREAT' : 'OBJ');
          ctx.font = 'bold 8px monospace';
          ctx.fillStyle = actionText === 'FLANK' ? '#f59e0b' : actionText === 'RETREAT' ? '#ef4444' : actionText === 'BOMBARD' ? '#fbbf24' : '#38bdf8';
          ctx.fillText(actionText, u.targetX + 10, u.targetY + 3);

          ctx.restore();
        }
      });
    }

    // 8. ARTILLERY ARCS & SHELLS
    artilleryShells.forEach(shell => {
      ctx.save();
      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Shell elevated by parabolic arc
      const altitude = Math.sin(shell.progress * Math.PI) * shell.arcHeight;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(shell.x, shell.y - altitude, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(shell.startX, shell.startY);
      ctx.quadraticCurveTo(
        (shell.startX + shell.targetX) / 2,
        (shell.startY + shell.targetY) / 2 - shell.arcHeight * 1.5,
        shell.targetX,
        shell.targetY
      );
      ctx.stroke();
      ctx.restore();
    });

    // 9. AIR SORTIES (1960s Visual Aircraft)
    airSorties.forEach(sortie => {
      ctx.save();
      const fColor = factions[sortie.factionId]?.color || '#38bdf8';

      // Flight Path Vector Line
      if (showOverlays.airFlightPaths) {
        ctx.strokeStyle = `${fColor}55`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(sortie.x, sortie.y);
        ctx.lineTo(sortie.targetX, sortie.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Contrail
      if (sortie.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sortie.trail[0].x, sortie.trail[0].y);
        for (let i = 1; i < sortie.trail.length; i++) {
          ctx.lineTo(sortie.trail[i].x, sortie.trail[i].y);
        }
        ctx.stroke();
      }

      ctx.translate(sortie.x, sortie.y);
      ctx.rotate((sortie.heading * Math.PI) / 180);

      // Jet Silhouette (Swept-wing 1960s interceptor / fighter bomber)
      ctx.fillStyle = fColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(12, 0); // nose
      ctx.lineTo(-4, -10); // wingtip left
      ctx.lineTo(-2, -3); // wing root
      ctx.lineTo(-10, -5); // tail left
      ctx.lineTo(-8, 0); // engine exhaust
      ctx.lineTo(-10, 5); // tail right
      ctx.lineTo(-2, 3); // wing root
      ctx.lineTo(-4, 10); // wingtip right
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Afterburner Glow
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(-9, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Sortie Role Badge
      ctx.rotate((-sortie.heading * Math.PI) / 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.fillText(`${sortie.callsign} [${sortie.role}]`, -24, -14);
      ctx.restore();
    });

    // 10. SAM MISSILES & SMOKE TRAILS
    samMissiles.forEach(m => {
      ctx.save();
      // Smoke Trail
      if (m.trail.length > 1) {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(m.trail[0].x, m.trail[0].y);
        for (let i = 1; i < m.trail.length; i++) {
          ctx.lineTo(m.trail[i].x, m.trail[i].y);
        }
        ctx.stroke();
      }

      ctx.translate(m.x, m.y);
      ctx.rotate((m.heading * Math.PI) / 180);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(2, -2);
      ctx.lineTo(2, 2);
      ctx.fill();
      ctx.restore();
    });

    // 10b. ACOUSTIC TORPEDOES & CAVITATION BUBBLE WAKES
    torpedoes.forEach(t => {
      ctx.save();
      if (t.trail.length > 1) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(t.trail[0].x, t.trail[0].y);
        for (let i = 1; i < t.trail.length; i++) {
          ctx.lineTo(t.trail[i].x, t.trail[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.translate(t.x, t.y);
      ctx.rotate((t.heading * Math.PI) / 180);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(6, 0, 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.restore();
    });

    // 10c. SONAR PINGS (Acoustic Sonar Wavefronts)
    sonarPings.forEach(p => {
      ctx.save();
      const alpha = Math.max(0, 1 - p.elapsed / p.duration);
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.75})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner faint harmonic ring
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 10d. ASW DEPTH CHARGES (Mortar Projectiles & Sinking Barrels)
    depthCharges.forEach(dc => {
      ctx.save();
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dc.x, dc.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 11. VISUAL EFFECTS (Explosions, Napalm Carpets, Water Geysers)
    visualEffects.forEach(ef => {
      ctx.save();
      const progress = ef.elapsed / ef.duration;
      const alpha = Math.max(0, 1 - progress);

      if (ef.type === 'EXPLOSION') {
        const curRadius = ef.radius * (0.3 + progress * 0.7);
        const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, curRadius);
        grad.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
        grad.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.8})`);
        grad.addColorStop(1, `rgba(239, 68, 68, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (ef.type === 'NAPALM') {
        ctx.fillStyle = `rgba(249, 115, 22, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, ef.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(254, 215, 170, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (ef.type === 'DEPTH_CHARGE_EXPLOSION') {
        const curRadius = ef.radius * (0.4 + progress * 0.6);
        const grad = ctx.createRadialGradient(ef.x, ef.y, 0, ef.x, ef.y, curRadius);
        grad.addColorStop(0, `rgba(186, 230, 253, ${alpha})`);
        grad.addColorStop(0.6, `rgba(14, 165, 233, ${alpha * 0.7})`);
        grad.addColorStop(1, `rgba(2, 132, 199, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (ef.type === 'WATER_GEYSER') {
        const curRadius = ef.radius * (0.2 + progress * 0.8);
        ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(ef.x, ef.y, curRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 12. FOG OF WAR SHROUD LAYER & RECONNAISSANCE SWEEPS (Zero-Allocation Offscreen Canvas Ref)
    if (fowPerspective !== 'all' && showOverlays.fogOfWar) {
      if (!fowCanvasRef.current) {
        fowCanvasRef.current = document.createElement('canvas');
      }
      const fowCanvas = fowCanvasRef.current;
      if (fowCanvas.width !== width || fowCanvas.height !== height) {
        fowCanvas.width = width;
        fowCanvas.height = height;
      }
      const fowCtx = fowCanvas.getContext('2d');

      if (fowCtx) {
        // Darkness mask over unobserved theatre
        fowCtx.fillStyle = isAmber ? 'rgba(10, 6, 2, 0.88)' : 'rgba(3, 7, 3, 0.90)';
        fowCtx.fillRect(0, 0, width, height);

        // Punch line-of-sight vision apertures with destination-out blending
        fowCtx.globalCompositeOperation = 'destination-out';

        visionSources.forEach(vs => {
          const grad = fowCtx.createRadialGradient(vs.x, vs.y, vs.radius * 0.45, vs.x, vs.y, vs.radius);
          grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
          grad.addColorStop(0.78, 'rgba(0, 0, 0, 0.85)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          fowCtx.fillStyle = grad;
          fowCtx.beginPath();
          fowCtx.arc(vs.x, vs.y, vs.radius, 0, Math.PI * 2);
          fowCtx.fill();
        });

        // Illumination Flares punch temporary holes through the night fog of war
        simWorldRef.current.warRoom.activeFlares.forEach(flare => {
          const grad = fowCtx.createRadialGradient(flare.x, flare.y, flare.radius * 0.3, flare.x, flare.y, flare.radius);
          grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
          grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.7)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          fowCtx.fillStyle = grad;
          fowCtx.beginPath();
          fowCtx.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
          fowCtx.fill();
        });

        // Reset composite operation and blit Fog of War shroud onto main display
        fowCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(fowCanvas, 0, 0);

        // Draw friendly vision range rings and active reconnaissance scans
        visionSources.forEach(vs => {
          if (vs.isAirRecon) {
            ctx.save();
            ctx.strokeStyle = isAmber ? 'rgba(245, 158, 11, 0.55)' : 'rgba(56, 189, 248, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(vs.x, vs.y, vs.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        });

        // Active Recon Sweep Sector Indicators
        reconSweepZones.forEach(sw => {
          if (sw.factionId === fowPerspective) {
            const alphaPulse = Math.min(1, sw.remainingDuration / 18);
            ctx.save();
            ctx.strokeStyle = isAmber ? `rgba(245, 158, 11, ${alphaPulse * 0.7})` : `rgba(56, 189, 248, ${alphaPulse * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = isAmber ? `rgba(245, 158, 11, ${alphaPulse * 0.85})` : `rgba(56, 189, 248, ${alphaPulse * 0.85})`;
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`◎ RECON SCAN SWEEP [${Math.ceil(sw.remainingDuration)}s ACTIVE]`, sw.x - 70, sw.y - sw.radius + 14);
            ctx.restore();
          }
        });
      }
    }

    // 13. PARACHUTE ILLUMINATION FLARES & MONSOON SQUALL FRONT
    const activeFlares = simWorldRef.current.warRoom.activeFlares;
    activeFlares.forEach(fl => {
      ctx.save();
      // Glowing flare burst
      const glowGrad = ctx.createRadialGradient(fl.x, fl.y, 4, fl.x, fl.y, fl.radius);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
      glowGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, fl.radius, 0, Math.PI * 2);
      ctx.fill();

      // Parachute canopy & suspension cords
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y - 14, 10, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fl.x - 10, fl.y - 14);
      ctx.lineTo(fl.x, fl.y);
      ctx.moveTo(fl.x + 10, fl.y - 14);
      ctx.lineTo(fl.x, fl.y);
      ctx.stroke();

      // Magnesium core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`* MK-24 FLARE (${Math.ceil(fl.duration - fl.elapsed)}s)`, fl.x + 12, fl.y + 3);
      ctx.restore();
    });

    // Monsoon Weather Squall Front
    const monsoon = simWorldRef.current.warRoom.monsoon;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(monsoon.x, monsoon.y, monsoon.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Weather cloud label & rain streaks
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('☁ MONSOON WEATHER FRONT [CAS MISSIONS GROUNDED]', monsoon.x - 120, monsoon.y - monsoon.radius + 18);

    // Subtle animated rain streaks inside the storm radius
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 20; r++) {
      const rx = monsoon.x + (Math.sin(simTick * 0.1 + r) * monsoon.radius * 0.8);
      const ry = monsoon.y + (Math.cos(simTick * 0.1 + r * 1.5) * monsoon.radius * 0.8);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry + 12);
      ctx.stroke();
    }
    ctx.restore();

    // 14. ENCIRCLED / KESSEL INDICATOR ON GROUND UNITS
    units.forEach(u => {
      if (u.isEncircled && u.strength > 0) {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fee2e2';
        ctx.lineWidth = 1;
        ctx.font = 'bold 8px monospace';
        ctx.fillText('⚠ [KESSEL]', u.x - 22, u.y - 18);
        ctx.beginPath();
        ctx.arc(u.x, u.y, 18, 0, Math.PI * 2);
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = '#f87171';
        ctx.stroke();
        ctx.restore();
      }
    });
  }, [airSorties, airbases, artilleryShells, bridges, controlNodes, crtTheme, depthCharges, diplomaticLedger, factions, fowPerspective, mapDetailMode, reconSweepZones, repairZones, samMissiles, selectedUnitId, showOverlays, simTick, sonarPings, torpedoes, units, visualEffects]);

  /* =========================================================================
     INTERACTION: CLICK INSPECTOR ON CANVAS
     ========================================================================= */
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicked unit
    let foundUnit: Unit | null = null;
    for (const u of units) {
      if (distance(u.x, u.y, clickX, clickY) < 22) {
        foundUnit = u;
        break;
      }
    }

    if (foundUnit) {
      setSelectedUnitId(foundUnit.id);
      setSelectedAirbaseId(null);
      return;
    }

    // Check airbase
    let foundBase: Airbase | null = null;
    for (const b of airbases) {
      if (distance(b.x, b.y, clickX, clickY) < 25) {
        foundBase = b;
        break;
      }
    }

    if (foundBase) {
      setSelectedAirbaseId(foundBase.id);
      setSelectedUnitId(null);
      return;
    }

    // If unit selected, clicking empty space moves unit (spectator override)
    if (selectedUnitId) {
      setUnits(prev =>
        prev.map(u => (u.id === selectedUnitId ? { ...u, targetX: clickX, targetY: clickY } : u))
      );
    }
  };

  /* =========================================================================
     JSON IMPORT / EXPORT (WAR ARCHIVE SNAPSHOT)
     ========================================================================= */
  const exportWarArchive = () => {
    const snapshot = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      simTick,
      simHour,
      simMinute,
      defcon,
      activeProvider,
      unifiedState,
      factions,
      units,
      airSorties,
      bridges,
      controlNodes,
      airbases,
      transmissions
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-brink-war-archive-tick-${simTick}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWarArchive = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const snapshot = JSON.parse(content);

        if (snapshot.units && snapshot.controlNodes) {
          setSimTick(snapshot.simTick || 0);
          setSimHour(snapshot.simHour || 6);
          setSimMinute(snapshot.simMinute || 30);
          setDefcon(snapshot.defcon || 3);
          setUnifiedState(Boolean(snapshot.unifiedState));
          if (snapshot.factions) setFactions(snapshot.factions);
          if (snapshot.units) setUnits(snapshot.units);
          if (snapshot.airSorties) setAirSorties(snapshot.airSorties);
          if (snapshot.bridges) setBridges(snapshot.bridges);
          if (snapshot.controlNodes) setControlNodes(snapshot.controlNodes);
          if (snapshot.airbases) setAirbases(snapshot.airbases);
          if (snapshot.transmissions) setTransmissions(snapshot.transmissions);
        }
      } catch (err) {
        alert('Failed to parse war archive JSON file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  // Faction telemetry calculations for Active Factions aside
  const loyalistUnits = units.filter(u => u.factionId === 'loyalists');
  const loyalistTotalStrength = loyalistUnits.reduce((a, b) => a + b.strength, 0);
  const loyalistMaxStrength = Math.max(1, loyalistUnits.length * 100);
  const loyalistArmorCount = loyalistUnits.filter(u => u.type === 'armor' || u.type === 'mechanized').length;

  const rebelUnits = units.filter(u => u.factionId === 'rebels');
  const rebelTotalStrength = rebelUnits.reduce((a, b) => a + b.strength, 0);
  const rebelMaxStrength = Math.max(1, rebelUnits.length * 100);
  const rebelInfCount = rebelUnits.length;
  const rebelAvgMorale = rebelInfCount > 0 ? rebelUnits.reduce((a, b) => a + b.morale, 0) / rebelInfCount : 85;

  const coalitionUnits = units.filter(u => u.factionId === 'coalition');
  const coalitionTotalStrength = coalitionUnits.reduce((a, b) => a + b.strength, 0);
  const coalitionMaxStrength = Math.max(1, coalitionUnits.length * 100);

  const volskanUnits = units.filter(u => u.factionId === 'volskan');
  const volskanTotalStrength = volskanUnits.reduce((a, b) => a + b.strength, 0);
  const volskanMaxStrength = Math.max(1, volskanUnits.length * 100);

  return (
    <div
      className={`min-h-screen font-mono flex flex-col select-none border-2 sm:border-4 relative overflow-hidden ${
        crtTheme === 'amber'
          ? 'bg-[#0a0702] text-[#f59e0b] border-[#b45309]'
          : 'bg-[#050805] text-[#4af626] border-[#1a2e1a]'
      }`}
    >
      {/* IMMERSIVE CRT SCANLINE TEXTURE OVERLAY */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-40"
        style={{
          background: 'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 2px)'
        }}
      />
      {scanlines && (
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-20"
          style={{
            backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
            backgroundSize: '100% 4px'
          }}
        />
      )}

      {/* TOP CONSOLE CHASSIS HEADER */}
      <header className="h-14 chassis-seafoam border-b-4 border-[#1c2920] flex items-center justify-between px-4 sm:px-6 shadow-lg z-20 shrink-0 select-none">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <JewelIndicator color="emerald" active={true} label="PWR" size="sm" />
            <JewelIndicator color="amber" active={defcon <= 3} label="DEFCON" size="sm" />
          </div>
          <div className="border-l border-[#4d6354] pl-2 sm:pl-3">
            <span className="text-sm sm:text-base font-space font-bold tracking-tight text-[#d1fae5] flex items-center gap-1">
              PROJECT BRINK <span className="text-amber-400 text-xs">SAC-63</span>
            </span>
            <div className="text-[9px] font-industrial text-[#a7f3d0]/75 hidden sm:block">
              1963 COLD WAR DEMARCATION SIMULATION
            </div>
          </div>
        </div>

        {/* VIEW MODE & DISPATCH ANNUNCIATOR TILES */}
        <div className="flex items-center gap-2">
          <AnnunciatorButton
            label="STRATEGIC WAR ROOM"
            sublabel="DR. STRANGELOVE"
            active={viewMode === 'strategic'}
            color={viewMode === 'strategic' ? 'amber' : 'green'}
            onClick={() => {
              audioSys.playRadioStatic();
              setViewMode('strategic');
            }}
          />

          <AnnunciatorButton
            label="TACTICAL RADAR SCOPE"
            sublabel="CATHODE RAY SCOPE"
            active={viewMode === 'tactical'}
            color={viewMode === 'tactical' ? 'amber' : 'blue'}
            onClick={() => {
              audioSys.playRadioStatic();
              setViewMode('tactical');
            }}
          />

          <AnnunciatorButton
            label="PRESS DISPATCH"
            sublabel="WIRE CABLES"
            active={newspaperOpen}
            color="orange"
            onClick={() => {
              audioSys.playTeletype();
              setNewspaperOpen(true);
            }}
          />
        </div>

        {/* METRICS & NIXIE CLOCK */}
        <div className="flex items-center gap-4 sm:gap-6">
          <NixieTube
            value={`${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')}`}
            label="SIM TIME"
            size="sm"
          />

          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[8px] font-space font-bold tracking-widest text-[#a7f3d0]">
              DEFCON
            </span>
            <span className={`text-xs font-space font-black ${
              defcon <= 2 ? 'text-red-400 animate-pulse' : defcon === 3 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              LVL {defcon}
            </span>
          </div>
        </div>
      </header>

      {/* UNIFICATION EMERGENCY NOTIFICATION BANNER */}
      {unificationBanner && (
        <div className="bg-amber-500 text-black px-4 py-1.5 flex items-center justify-between font-bold text-xs uppercase tracking-widest animate-pulse border-b border-black z-20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{unificationBanner}</span>
          </div>
          <button
            onClick={() => setUnificationBanner(null)}
            className="border border-black px-2 py-0.5 hover:bg-black hover:text-yellow-400 text-[10px]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT WORKSPACE: STRATEGIC WAR ROOM OR TACTICAL RADAR */}
      {viewMode === 'strategic' ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <StrategicMapRoom
            warRoom={warRoom}
            diplomaticLedger={diplomaticLedger}
            economyState={economyState}
            defcon={defcon}
            simTimeStr={`${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')} HRS, OCT 1963`}
            simTick={simTick}
            unifiedState={unifiedState}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(p => !p)}
            onTuneInToTactical={() => {
              audioSys.playRadioStatic();
              setViewMode('tactical');
            }}
            onOpenNewspaper={(b) => {
              setSelectedBattleForNews(b || null);
              setNewspaperOpen(true);
            }}
            onTriggerUnification={() => triggerUnification('San Pietro Sovereign National Council')}
            simSpeed={simSpeed}
            onChangeSpeed={(s) => setSimSpeed(s)}
            transmissions={transmissions}
            theaterPhase={theaterPhase}
            onToggleTheaterPhase={() => {
              setTheaterPhase(prev => {
                const next = prev === 'DIPLOMATIC_CRISIS' ? 'TOTAL_WAR_MOBILIZATION' : 'DIPLOMATIC_CRISIS';
                if (next === 'TOTAL_WAR_MOBILIZATION') {
                  setDefcon(2);
                  audioSys.playSiren();
                } else {
                  setDefcon(4);
                  audioSys.playRadioStatic();
                }
                return next;
              });
            }}
            onEscalateIncident={(sectorName) => {
              // Trigger a discrete 1v1 flashpoint battle at Delta Causeway Bridge
              audioSys.playSiren();
              setWarRoom(prev => {
                const existing = prev.flashpoints.find(f => f.status === 'ACTIVE_CLASH');
                if (existing) return prev;
                const newClash: FlashpointBattle = {
                  id: `fp-delta-${Date.now()}`,
                  sectorName: sectorName || 'Delta Causeway Bridge',
                  objectiveName: 'Delta Causeway Bridgehead',
                  objectiveType: 'BRIDGEHEAD',
                  x: 640,
                  y: 420,
                  attackerFactionId: 'rebels',
                  defenderFactionId: 'loyalists',
                  attackerCorpsName: '3RD SIERRA VANGUARD',
                  defenderCorpsName: '1ST CENTAUR ARMORED BDE',
                  attackerUnits: ['3rd Sierra Vanguard Armor', 'Sierra Guerilla Inf'],
                  defenderUnits: ['1st Centaur Heavy Armor', '4th Presidential Inf'],
                  attackerStrength: 320,
                  defenderStrength: 290,
                  attackerAirCallIn: 80,
                  defenderAirCallIn: 60,
                  attackerArtilleryMeter: 75,
                  defenderArtilleryMeter: 65,
                  expectedDurationHours: 6,
                  elapsedHours: 1,
                  status: 'ACTIVE_CLASH',
                  refereeCommentary: 'Rebel 3rd Sierra Vanguard staging breakthrough across the southern wetlands. Loyalist Centaur Armor dug in behind bridge pillboxes.',
                  routStatus: [],
                  casualtiesAttacker: 42,
                  casualtiesDefender: 38,
                  armorLostAttacker: 3,
                  armorLostDefender: 4,
                  aircraftLost: 1,
                  reportedInPress: false
                };
                return {
                  ...prev,
                  flashpoints: [newClash, ...prev.flashpoints]
                };
              });
              setTransmissions(prev => [
                {
                  id: `tx-escalation-${Date.now()}`,
                  timestamp: `${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')}Z`,
                  factionId: 'rebels',
                  callsign: 'LIBERATION COMMAND',
                  message: 'FLASH: BORDER FORCES ENGAGED AT DELTA CAUSEWAY. ALL UNITS COMMENCE OPERATION PINCER.',
                  priority: 'FLASH'
                },
                ...prev
              ]);
            }}
            onAutoResolveBattle={(battle) => {
              // Gamemaster resolves the battle immediately with fallout
              audioSys.playTeletype();
              setWarRoom(prev => {
                const updated = prev.flashpoints.map(f => {
                  if (f.id === battle.id) {
                    return {
                      ...f,
                      status: 'RESOLVED' as const,
                      elapsedHours: f.expectedDurationHours,
                      verdict: 'COSTLY_BREAKTHROUGH' as const,
                      refereeCommentary: 'Gamemaster arbitration concluded: Rebel 3rd Vanguard breached the perimeter with high armor attrition. Loyalist 1st Brigade conducts orderly withdrawal.'
                    };
                  }
                  return f;
                });
                return { ...prev, flashpoints: updated };
              });
              setSelectedBattleForNews({
                ...battle,
                status: 'RESOLVED',
                verdict: 'COSTLY_BREAKTHROUGH',
                refereeCommentary: 'Gamemaster arbitration concluded: Rebel 3rd Vanguard breached the perimeter with high armor attrition. Loyalist 1st Brigade conducts orderly withdrawal.'
              });
              setNewspaperOpen(true);
            }}
            gamemasterReport={gamemasterReport}
            units={units}
            repairZones={repairZones}
            onSendEnvoy={handleSendEnvoy}
            onBreakTreaty={handleBreakTreaty}
            onLaunchCovertOp={handleLaunchCovertOp}
            onOrderRetreatToDepot={handleOrderRetreatToDepot}
          />
        </div>
      ) : (
        <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* LEFT ASIDE: ACTIVE FACTIONS & AI CORE ENGINE */}
        <aside
          className={`w-full xl:w-64 border-b-2 xl:border-b-0 xl:border-r-2 flex flex-col p-3 gap-3 overflow-y-auto shrink-0 max-h-[35vh] xl:max-h-none ${
            crtTheme === 'amber' ? 'border-[#b45309] bg-[#100b03]' : 'border-[#1a2e1a] bg-[#070c07]'
          }`}
        >
          <div
            className={`text-[10px] uppercase opacity-50 border-b pb-1 font-bold flex justify-between items-center ${
              crtTheme === 'amber' ? 'border-[#b45309]' : 'border-[#1a2e1a]'
            }`}
          >
            <span>Active Factions</span>
            <span>4 THEATERS</span>
          </div>

          <div className="space-y-2.5">
            {/* SP LOYALISTS */}
            <div
              className={`p-2 border ${
                crtTheme === 'amber' ? 'border-[#b45309]/60 bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-blue-400">SP LOYALISTS</span>
                <span className="text-[9px] px-1 bg-blue-900 text-blue-200 font-bold">JUNTA</span>
              </div>
              <div className="h-1 w-full bg-[#132213] mb-1.5">
                <div
                  className="h-full bg-[#4af626]"
                  style={{ width: `${Math.min(100, Math.round((loyalistTotalStrength / loyalistMaxStrength) * 100))}%` }}
                />
              </div>
              <div className="grid grid-cols-2 text-[9px] opacity-70 italic">
                <span>Armor: {loyalistArmorCount} Div</span>
                <span className="text-right">
                  {factions.loyalists.fuelReserves < 35
                    ? 'Fuel: Critical'
                    : `Fuel: ${Math.round(factions.loyalists.fuelReserves)}%`}
                </span>
              </div>
            </div>

            {/* SP LIBERATION */}
            <div
              className={`p-2 border ${
                crtTheme === 'amber' ? 'border-[#b45309]/60 bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-red-400">SP LIBERATION</span>
                <span className="text-[9px] px-1 bg-red-900 text-red-200 font-bold">REBEL</span>
              </div>
              <div className="h-1 w-full bg-[#132213] mb-1.5">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${Math.min(100, Math.round((rebelTotalStrength / rebelMaxStrength) * 100))}%` }}
                />
              </div>
              <div className="grid grid-cols-2 text-[9px] opacity-70 italic">
                <span>Inf: {rebelInfCount} Cells</span>
                <span className="text-right">Morale: {Math.round(rebelAvgMorale)}%</span>
              </div>
            </div>

            {/* ATLANTIC COALITION */}
            <div
              className={`p-2 border ${
                crtTheme === 'amber' ? 'border-[#b45309]/60 bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-cyan-400">ATLANTIC COAL.</span>
                <span className="text-[9px] px-1 bg-cyan-900 text-cyan-200 font-bold">PROXY</span>
              </div>
              <div className="h-1 w-full bg-[#132213] mb-1.5">
                <div
                  className="h-full bg-cyan-400"
                  style={{
                    width: `${Math.min(100, Math.round((coalitionTotalStrength / coalitionMaxStrength) * 100))}%`
                  }}
                />
              </div>
              <div className="text-[9px] opacity-70 italic">Status: Carrier Group On Station</div>
            </div>

            {/* VOLSKAN UNION */}
            <div
              className={`p-2 border ${
                crtTheme === 'amber' ? 'border-[#b45309]/60 bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-amber-400">VOLSKAN UNION</span>
                <span className="text-[9px] px-1 bg-amber-900 text-amber-200 font-bold">PROXY</span>
              </div>
              <div className="h-1 w-full bg-[#132213] mb-1.5">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${Math.min(100, Math.round((volskanTotalStrength / volskanMaxStrength) * 100))}%` }}
                />
              </div>
              <div className="text-[9px] opacity-70 italic">Status: Rail Convoy inbound</div>
            </div>

            {/* UNIFIED AWAKENED SUPERPOWER STATE */}
            {unifiedState && (
              <div className="p-2 border border-emerald-500 bg-emerald-950/50 animate-pulse">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-300">SAN PIETRO UNIFIED</span>
                  <span className="text-[9px] px-1 bg-emerald-700 text-white font-bold">SOVEREIGN</span>
                </div>
                <div className="h-1 w-full bg-[#132213] mb-1.5">
                  <div className="h-full bg-emerald-400 w-full" />
                </div>
                <div className="text-[9px] text-emerald-200 italic">Civil War Unified: Expelling Foreign Bases</div>
              </div>
            )}
          </div>

          {/* AI CORE ENGINE TELEMETRY */}
          <div
            className={`mt-auto p-2 border-t-2 ${
              crtTheme === 'amber' ? 'border-[#b45309] bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
            }`}
          >
            <div className="text-[9px] uppercase opacity-50 mb-1 font-bold flex justify-between items-center">
              <span>AI Core Engine</span>
              {isAiQuerying && <span className="text-cyan-400 animate-spin">↻</span>}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-bold truncate">{activeProvider}</span>
            </div>
            <div className="text-[9px] opacity-50 mt-1">
              Lat: {Math.round(simSpeed * 16 + 26)}ms // Tkn/s: 142
            </div>
            <button
              onClick={queryAiCommander}
              disabled={isAiQuerying}
              className={`w-full mt-2 py-1 px-2 border text-[9px] uppercase flex items-center justify-center gap-1 ${
                crtTheme === 'amber'
                  ? 'border-[#b45309] hover:bg-[#b45309]/30 text-amber-300'
                  : 'border-[#1a2e1a] hover:bg-[#1a2e1a] text-cyan-300'
              }`}
              id="request-directive-btn"
            >
              <RefreshCw className={`w-3 h-3 ${isAiQuerying ? 'animate-spin' : ''}`} />
              <span>QUERY AI DOCTRINE</span>
            </button>
          </div>
        </aside>

        {/* CENTER SECTION: CONTINUOUS 2D VECTOR RADAR BATTLEFIELD */}
        <section
          className={`flex-1 relative flex flex-col overflow-hidden ${
            crtTheme === 'amber' ? 'bg-[#0c0802]' : 'bg-[#030603]'
          }`}
        >
          {/* 1v1 TOTAL WAR TACTICAL BATTLE HEADER & OFF-MAP CALL-INS DOCK */}
          <div className={`p-2 border-b-2 flex flex-wrap items-center justify-between gap-2 z-20 shadow-md ${
            crtTheme === 'amber' ? 'bg-[#181105] border-[#b45309]' : 'bg-[#0a160d] border-[#1e3825]'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  audioSys.playRadioStatic();
                  setViewMode('strategic');
                }}
                className="px-2.5 py-1 bg-[#1e2922] hover:bg-[#28382d] border border-emerald-500/80 text-emerald-300 text-[10px] font-space font-bold rounded flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>←</span>
                <span>BIG BOARD MAP ROOM</span>
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.2 bg-red-950 text-red-300 border border-red-700 font-mono font-bold">
                    1v1 DISCRETE CLASH
                  </span>
                  <span className="text-xs font-space font-bold text-white tracking-wide">
                    {activeTacticalBattle?.objectiveName || 'DELTA CAUSEWAY BRIDGEHEAD'}
                  </span>
                </div>
                <div className="text-[10px] font-teletype text-neutral-300">
                  <span className="text-red-400 font-bold">{activeTacticalBattle?.attackerCorpsName || '3RD SIERRA VANGUARD'}</span>
                  <span className="mx-1.5 text-neutral-500">VS</span>
                  <span className="text-blue-400 font-bold">{activeTacticalBattle?.defenderCorpsName || '1ST CENTAUR ARMORED BDE'}</span>
                </div>
              </div>
            </div>

            {/* Impartial Gamemaster Referee Ticker */}
            <div className="hidden lg:flex items-center gap-2 max-w-md px-2 py-1 bg-[#09100a] border border-[#2b3d30] rounded text-[10px] font-teletype text-amber-200/90 truncate">
              <span className="text-[9px] text-amber-400 font-bold uppercase shrink-0">GM REFEREE:</span>
              <span className="truncate">
                {gamemasterReport?.refereeArbitration ||
                  activeTacticalBattle?.refereeCommentary ||
                  'Engagements arbitrated under strict 1v1 Cold War doctrinal rules. Flank ambushes inflict morale collapse.'}
              </span>
            </div>

            {/* Off-Map Call-Ins & Quick Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  // Call-in Napalm/CAS Air Strike
                  scrambleAirSortie('rebels', 'CAS');
                  audioSys.playAirRaid();
                }}
                className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-600 text-red-200 text-[9px] font-space font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                title="Call in an off-map napalm strike onto the contested objective"
              >
                <span>🔥</span>
                <span>NAPALM STRIKE</span>
              </button>

              <button
                onClick={() => {
                  // Call-in MiG-21 CAP Interceptor
                  scrambleAirSortie('loyalists', 'INTERCEPTION');
                  audioSys.playAirRaid();
                }}
                className="px-2 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-600 text-blue-200 text-[9px] font-space font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                title="Scramble high-altitude fighter CAP over the sector"
              >
                <span>✈</span>
                <span>MiG-21 CAP</span>
              </button>

              <button
                onClick={() => {
                  // Call-in 152mm Artillery Salvo
                  const tx = activeTacticalBattle?.x || 640;
                  const ty = activeTacticalBattle?.y || 420;
                  setArtilleryShells(prev => [
                    ...prev,
                    {
                      id: `shell-${Date.now()}-1`,
                      startX: 920,
                      startY: 560,
                      x: 920,
                      y: 560,
                      targetX: tx + (Math.random() * 40 - 20),
                      targetY: ty + (Math.random() * 40 - 20),
                      progress: 0,
                      arcHeight: 60,
                      damage: 35,
                      factionId: 'loyalists'
                    },
                    {
                      id: `shell-${Date.now()}-2`,
                      startX: 930,
                      startY: 570,
                      x: 930,
                      y: 570,
                      targetX: tx + 30,
                      targetY: ty - 20,
                      progress: -0.2,
                      arcHeight: 65,
                      damage: 35,
                      factionId: 'loyalists'
                    }
                  ]);
                  audioSys.playArtillery();
                }}
                className="px-2 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-600 text-amber-200 text-[9px] font-space font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
                title="Order a 152mm howitzer battery barrage onto enemy staging lines"
              >
                <span>💥</span>
                <span>152MM SALVO</span>
              </button>

              <button
                onClick={() => {
                  // Auto-resolve via Gamemaster
                  const targetBattle = activeTacticalBattle || warRoom.flashpoints.find(f => f.status === 'ACTIVE_CLASH');
                  if (targetBattle) {
                    audioSys.playTeletype();
                    setWarRoom(prev => ({
                      ...prev,
                      flashpoints: prev.flashpoints.map(f =>
                        f.id === targetBattle.id
                          ? { ...f, status: 'RESOLVED' as const, elapsedHours: f.expectedDurationHours, verdict: 'COSTLY_BREAKTHROUGH' as const }
                          : f
                      )
                    }));
                    setSelectedBattleForNews({
                      ...targetBattle,
                      status: 'RESOLVED',
                      verdict: 'COSTLY_BREAKTHROUGH',
                      refereeCommentary: 'Gamemaster arbitration concluded: Rebel vanguard forced a costly crossing.'
                    });
                    setNewspaperOpen(true);
                  }
                }}
                className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-200 text-[9px] font-space font-bold rounded flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>⚖</span>
                <span>AUTO-RESOLVE</span>
              </button>
            </div>
          </div>

          {/* Top Left [NATO-VEC-MAP] Badge */}
          <div
            className={`absolute top-3 left-3 z-10 p-2 border pointer-events-none ${
              crtTheme === 'amber' ? 'bg-[#140e03]/90 border-[#b45309]' : 'bg-[#0a120a]/90 border-[#1a2e1a]'
            }`}
          >
            <div className="text-[10px] text-blue-400 mb-0.5 font-bold">[NATO-VEC-MAP]</div>
            <div className="text-[9px] space-y-0.5 opacity-80">
              <div>COORD: 44.22N 12.09E</div>
              <div>ALT: 1,420m (Mountain Ridge)</div>
              <div className="hidden sm:block">MODE: CONTINUOUS CARTESIAN VECTOR</div>
            </div>
          </div>

          {/* Continuous Vector Canvas */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              width={1400}
              height={850}
              onClick={handleCanvasClick}
              className={`max-w-full max-h-[calc(100vh-165px)] object-contain border shadow-[0_0_30px_rgba(0,0,0,0.9)] cursor-crosshair ${
                crtTheme === 'amber' ? 'border-[#b45309]/80 bg-[#120b02]' : 'border-[#1a2e1a] bg-[#030603]'
              }`}
              id="battlefield-canvas"
            />

            {/* Map Legend Overlay */}
            <div
              className={`absolute bottom-3 left-3 pointer-events-none border p-2 text-[10px] hidden md:flex gap-3 ${
                crtTheme === 'amber' ? 'bg-[#140e03]/90 border-[#b45309]' : 'bg-[#0a120a]/90 border-[#1a2e1a]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-blue-500 bg-blue-950 inline-block" />
                <span>LOYALISTS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-red-500 bg-red-950 inline-block" />
                <span>REBELS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-cyan-400 bg-cyan-950 inline-block" />
                <span>ATLANTIC</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-yellow-500 bg-yellow-950 inline-block" />
                <span>VOLSKAN</span>
              </div>
            </div>
          </div>

          {/* TIME SCRUBBER REPLAY TIMELINE */}
          <TimeScrubber
            snapshots={snapshots}
            scrubIndex={scrubIndex}
            onScrubChange={(idx) => {
              const snap = snapshots[idx];
              if (snap) {
                setScrubIndex(idx);
                setIsPlaying(false);
                setUnits(prev => prev.map(u => {
                  const snapU = snap.units.find(su => su.id === u.id);
                  if (snapU) {
                    return {
                      ...u,
                      x: snapU.x,
                      y: snapU.y,
                      strength: snapU.strength,
                      inCombat: snapU.inCombat,
                      heading: snapU.heading
                    };
                  }
                  return u;
                }));
              }
            }}
            onReturnToLive={() => {
              setScrubIndex(-1);
              setIsPlaying(true);
            }}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(p => !p)}
            liveTimeStr={`${String(simHour).padStart(2, '0')}:${String(simMinute).padStart(2, '0')} HRS`}
          />

          {/* 1960s BOTTOM CONSOLE CHASSIS DOCK */}
          <div className="chassis-grey border-t-4 border-[#242b32] flex items-center px-4 py-2 gap-4 flex-wrap z-10 shrink-0 select-none shadow-lg">
            {/* Play / Advance Annunciators */}
            <div className="flex items-center gap-2">
              <AnnunciatorButton
                label={isPlaying ? 'PAUSE' : 'ADVANCE'}
                sublabel={isPlaying ? 'CLOCK ACTIVE' : 'SYSTEM HELD'}
                active={isPlaying}
                color={isPlaying ? 'amber' : 'green'}
                onClick={() => setIsPlaying(!isPlaying)}
              />

              <AnnunciatorButton
                label="STEP TICK"
                sublabel="+1 PULSE"
                active={false}
                color="blue"
                onClick={() => setSimTick(t => t + 1)}
              />
            </div>

            {/* Knurled Aluminum Rotary Speed Switch */}
            <div className="border-l border-[#3a4550] pl-3">
              <RotarySpeedDial
                speed={simSpeed}
                onChangeSpeed={(s) => setSimSpeed(s)}
                label="SPEED SELECTOR"
              />
            </div>

            {/* Tactical Annunciator Toggles & Filters */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <AnnunciatorButton
                label="ORDERS"
                sublabel="VECTORS"
                active={showOverlays.tacticalOrders}
                color="blue"
                onClick={() => setShowOverlays(prev => ({ ...prev, tacticalOrders: !prev.tacticalOrders }))}
              />

              <AnnunciatorButton
                label="TERRAIN"
                sublabel="CONTOURS"
                active={showOverlays.terrainZones}
                color="amber"
                onClick={() => setShowOverlays(prev => ({ ...prev, terrainZones: !prev.terrainZones }))}
              />

              <AnnunciatorButton
                label="FOG OF WAR"
                sublabel="RADAR VIS"
                active={showOverlays.fogOfWar}
                color="green"
                onClick={() => setShowOverlays(prev => ({ ...prev, fogOfWar: !prev.fogOfWar }))}
              />

              <AnnunciatorButton
                label="FLANKS"
                sublabel="AMBUSH"
                active={showOverlays.flankingArcs}
                color="red"
                onClick={() => setShowOverlays(prev => ({ ...prev, flankingArcs: !prev.flankingArcs }))}
              />

              <AnnunciatorButton
                label="CRT RASTER"
                sublabel={scanlines ? 'SCANLINES ON' : 'DISABLED'}
                active={scanlines}
                color="green"
                onClick={() => setScanlines(!scanlines)}
              />

              <AnnunciatorButton
                label={crtTheme === 'amber' ? 'AMBER CRT' : 'GREEN CRT'}
                sublabel="PHOSPHOR"
                active={true}
                color={crtTheme === 'amber' ? 'amber' : 'green'}
                onClick={() => setCrtTheme(t => (t === 'amber' ? 'green' : 'amber'))}
              />

              <AnnunciatorButton
                label="AUDIO WIRE"
                sublabel={soundEnabled ? 'RECEIVER ON' : 'MUTED'}
                active={soundEnabled}
                color={soundEnabled ? 'green' : 'red'}
                onClick={() => setSoundEnabled(!soundEnabled)}
              />

              <button
                onClick={exportWarArchive}
                className="px-2.5 py-1 bg-[#252c34] hover:bg-[#323b45] border border-[#485664] text-[#d6e2d9] font-space text-[9px] uppercase tracking-wider rounded-sm shadow-sm transition-colors"
                id="export-archive-btn"
              >
                Archive .JSON
              </button>

              <label className="px-2.5 py-1 bg-[#252c34] hover:bg-[#323b45] border border-[#485664] text-[#d6e2d9] font-space text-[9px] uppercase tracking-wider cursor-pointer rounded-sm shadow-sm transition-colors">
                Load State
                <input type="file" accept=".json" onChange={importWarArchive} className="hidden" />
              </label>
            </div>
          </div>
        </section>

        {/* RIGHT ASIDE: MULTI-TAB INTELLIGENCE, DIPLOMACY, ECONOMY & TERRAIN */}
        <aside
          className={`w-full xl:w-96 border-t-2 xl:border-t-0 xl:border-l-2 flex flex-col overflow-hidden shrink-0 max-h-[60vh] xl:max-h-none ${
            crtTheme === 'amber' ? 'border-[#b45309] bg-[#100b03]' : 'border-[#1a2e1a] bg-[#070c07]'
          }`}
        >
          {/* Aside Header */}
          <div
            className={`p-2.5 border-b-2 flex items-center justify-between ${
              crtTheme === 'amber' ? 'border-[#b45309] bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a120a]'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>WAR ROOM COMMAND MATRIX</span>
            </div>
            <div className="text-[9px] opacity-60 text-white font-mono">TOP SECRET // NATO</div>
          </div>

          {/* Tab Selection Bar */}
          <div
            className={`grid grid-cols-4 text-[9px] font-bold border-b text-center uppercase tracking-tighter ${
              crtTheme === 'amber' ? 'border-[#b45309] bg-[#0e0a02]' : 'border-[#1a2e1a] bg-[#060b06]'
            }`}
          >
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`py-2 px-1 border-r ${
                crtTheme === 'amber' ? 'border-[#b45309]' : 'border-[#1a2e1a]'
              } ${
                activeTab === 'telemetry'
                  ? crtTheme === 'amber'
                    ? 'bg-[#b45309]/30 text-amber-300 font-black'
                    : 'bg-[#1a2e1a] text-[#4af626] font-black'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Radar className="w-3 h-3" />
                <span>INTEL</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('diplomacy')}
              className={`py-2 px-1 border-r ${
                crtTheme === 'amber' ? 'border-[#b45309]' : 'border-[#1a2e1a]'
              } ${
                activeTab === 'diplomacy'
                  ? crtTheme === 'amber'
                    ? 'bg-[#b45309]/30 text-amber-300 font-black'
                    : 'bg-[#1a2e1a] text-[#4af626] font-black'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Globe className="w-3 h-3" />
                <span>DIPLOMACY</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('economy')}
              className={`py-2 px-1 border-r ${
                crtTheme === 'amber' ? 'border-[#b45309]' : 'border-[#1a2e1a]'
              } ${
                activeTab === 'economy'
                  ? crtTheme === 'amber'
                    ? 'bg-[#b45309]/30 text-amber-300 font-black'
                    : 'bg-[#1a2e1a] text-[#4af626] font-black'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Coins className="w-3 h-3" />
                <span>ECONOMY</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('terrain')}
              className={`py-2 px-1 ${
                activeTab === 'terrain'
                  ? crtTheme === 'amber'
                    ? 'bg-[#b45309]/30 text-amber-300 font-black'
                    : 'bg-[#1a2e1a] text-[#4af626] font-black'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <Mountain className="w-3 h-3" />
                <span>TERRAIN</span>
              </div>
            </button>
          </div>

          {/* TAB 1: TELEMETRY & TACTICAL INTERCEPTS */}
          {activeTab === 'telemetry' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Unit Inspector OR 1960s Air Wings Scramble */}
              <div className={`p-2.5 border-b ${crtTheme === 'amber' ? 'border-[#b45309]/50' : 'border-[#1a2e1a]'}`}>
                {selectedUnit ? (
                  /* Unit Telemetry Inspection */
                  <div
                    className={`space-y-2 text-xs p-2.5 border ${
                      crtTheme === 'amber' ? 'border-[#b45309] bg-[#160f04]' : 'border-[#1a2e1a] bg-[#0a150a]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-sm text-white">{selectedUnit.name}</div>
                        <div className="text-[10px] opacity-75 capitalize">
                          {selectedUnit.type} Counter • Heading: {Math.round(selectedUnit.heading)}°
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-5 border flex items-center justify-center font-bold text-[10px]"
                          style={{ borderColor: factions[selectedUnit.factionId]?.color }}
                        >
                          {selectedUnit.type === 'armor'
                            ? '⬭'
                            : selectedUnit.type === 'infantry'
                            ? 'X'
                            : selectedUnit.type === 'mechanized'
                            ? '⬭/'
                            : selectedUnit.type === 'artillery'
                            ? '●'
                            : '▲'}
                        </div>
                        <button
                          onClick={() => setSelectedUnitId(null)}
                          className="text-[9px] px-1.5 py-0.5 border border-[#1a2e1a] hover:bg-[#1a2e1a] text-neutral-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Strength Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span>COMBAT STRENGTH</span>
                        <span className="font-bold">{Math.round(selectedUnit.strength)}%</span>
                      </div>
                      <div className="w-full bg-[#132213] h-1.5 border border-[#1a2e1a] overflow-hidden">
                        <div className="bg-[#4af626] h-full" style={{ width: `${selectedUnit.strength}%` }} />
                      </div>
                    </div>

                    {/* Fuel & Morale */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>FUEL</span>
                          <span className="font-bold text-amber-400">{Math.round(selectedUnit.fuel)}%</span>
                        </div>
                        <div className="w-full bg-[#132213] h-1.5 border border-[#1a2e1a] overflow-hidden">
                          <div className="bg-amber-400 h-full" style={{ width: `${selectedUnit.fuel}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>MORALE</span>
                          <span className="font-bold text-cyan-400">{Math.round(selectedUnit.morale)}%</span>
                        </div>
                        <div className="w-full bg-[#132213] h-1.5 border border-[#1a2e1a] overflow-hidden">
                          <div className="bg-cyan-400 h-full" style={{ width: `${selectedUnit.morale}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Current Terrain Info */}
                    {(() => {
                      const tInfo = getTerrainAt(selectedUnit.x, selectedUnit.y, bridges);
                      return (
                        <div className="text-[9px] p-1.5 bg-black/40 border border-[#1a2e1a] flex justify-between items-center">
                          <span>SECTOR TERRAIN:</span>
                          <span className="font-bold text-yellow-300">
                            {tInfo.type === 'MUD'
                              ? 'ALLUVIAL MUD (-20% SPEED)'
                              : tInfo.type === 'FOREST'
                              ? 'PINE FOREST (+1 INF COMBAT)'
                              : tInfo.type === 'HILLS'
                              ? 'ELEVATION RIDGE (+2 DEF)'
                              : tInfo.type === 'URBAN'
                              ? 'METROPOLITAN (+2 DEF)'
                              : 'OPEN PLAINS'}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between text-[10px] border-t border-[#1a2e1a] pt-1">
                      <span>ENTRENCHMENT: +{Math.round(selectedUnit.entrenchment)}%</span>
                      <span className="text-yellow-400">KILLS: {selectedUnit.kills}</span>
                    </div>

                    {/* Active AI Order Card */}
                    <div className="p-2 bg-black/60 border border-blue-900/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-blue-400 flex items-center gap-1">
                          <Radio className="w-2.5 h-2.5 animate-pulse" />
                          <span>AI TACTICAL ORDER</span>
                        </span>
                        <span className={`text-[8px] px-1 py-0.5 border font-bold ${
                          selectedUnit.currentOrder?.action === 'FLANK' ? 'border-amber-500 text-amber-300 bg-amber-950/40' :
                          selectedUnit.currentOrder?.action === 'RETREAT' ? 'border-red-500 text-red-300 bg-red-950/40' :
                          selectedUnit.currentOrder?.action === 'BOMBARD' ? 'border-yellow-500 text-yellow-300 bg-yellow-950/40' :
                          'border-cyan-500 text-cyan-300 bg-cyan-950/40'
                        }`}>
                          {selectedUnit.currentOrder?.action || (selectedUnit.isRetreating ? 'RETREAT' : 'PATROL')}
                        </span>
                      </div>
                      <div className="text-[9px] text-neutral-300 font-mono italic">
                        &quot;{selectedUnit.currentOrder?.orderText || 'Conducting sector security & holding key chokepoints'}&quot;
                      </div>
                      <div className="text-[8px] opacity-60 flex justify-between">
                        <span>WAYPOINT: [{Math.round(selectedUnit.targetX)}, {Math.round(selectedUnit.targetY)}]</span>
                        <span>STATUS: {selectedUnit.inCombat ? 'IN COMBAT' : selectedUnit.isRetreating ? 'RETREATING' : 'MANEUVERING'}</span>
                      </div>
                    </div>

                    {/* Quick Tactical Command Override Buttons */}
                    <div className="pt-1 border-t border-[#1a2e1a] space-y-1">
                      <div className="text-[8px] uppercase tracking-wider text-neutral-400 font-bold">TACTICAL DIRECTIVES (DIRECT / AI)</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => {
                            const enemy = units.find(other => other.id !== selectedUnit.id && other.factionId !== selectedUnit.factionId && other.strength > 0);
                            if (enemy) {
                              const flankAngleRad = ((enemy.heading + 90) * Math.PI) / 180;
                              const flankX = Math.round(enemy.x + Math.cos(flankAngleRad) * 80);
                              const flankY = Math.round(enemy.y + Math.sin(flankAngleRad) * 80);
                              setUnits(prev => prev.map(u => u.id === selectedUnit.id ? {
                                ...u,
                                targetX: flankX,
                                targetY: flankY,
                                currentOrder: {
                                  action: 'FLANK',
                                  targetX: flankX,
                                  targetY: flankY,
                                  targetUnitId: enemy.id,
                                  orderText: `COMMAND: MANUAL FLANKING MANEUVER ON ${enemy.name.toUpperCase()}`,
                                  issuedTick: simTick,
                                  aiControlled: true
                                }
                              } : u));
                            }
                          }}
                          className="px-1.5 py-1 text-[8px] font-bold border border-amber-500/60 bg-amber-950/30 hover:bg-amber-900/60 text-amber-300 text-left"
                        >
                          ⚡ EXECUTE FLANK
                        </button>

                        <button
                          onClick={() => {
                            setUnits(prev => prev.map(u => u.id === selectedUnit.id ? {
                              ...u,
                              targetX: u.x,
                              targetY: u.y,
                              currentOrder: {
                                action: 'DEFEND',
                                targetX: u.x,
                                targetY: u.y,
                                orderText: 'COMMAND: DIG IN AND FORTIFY CURRENT PERIMETER',
                                issuedTick: simTick,
                                aiControlled: true
                              }
                            } : u));
                          }}
                          className="px-1.5 py-1 text-[8px] font-bold border border-emerald-500/60 bg-emerald-950/30 hover:bg-emerald-900/60 text-emerald-300 text-left"
                        >
                          🛡️ DIG IN & DEFEND
                        </button>

                        <button
                          onClick={() => {
                            const friendlyNodes = controlNodes.filter(n => n.owner === selectedUnit.factionId || (selectedUnit.factionId === 'unified' && n.owner === 'unified'));
                            const best = friendlyNodes[0] || controlNodes[0];
                            setUnits(prev => prev.map(u => u.id === selectedUnit.id ? {
                              ...u,
                              targetX: best.x,
                              targetY: best.y,
                              isRetreating: true,
                              currentOrder: {
                                action: 'RETREAT',
                                targetX: best.x,
                                targetY: best.y,
                                orderText: `COMMAND: TACTICAL RETREAT TO ${best.name.toUpperCase()}`,
                                issuedTick: simTick,
                                aiControlled: true
                              }
                            } : u));
                          }}
                          className="px-1.5 py-1 text-[8px] font-bold border border-red-500/60 bg-red-950/30 hover:bg-red-900/60 text-red-300 text-left"
                        >
                          🏃 TACTICAL RETREAT
                        </button>

                        <button
                          onClick={() => {
                            setUnits(prev => prev.map(u => u.id === selectedUnit.id ? {
                              ...u,
                              currentOrder: {
                                action: 'MOVE',
                                targetX: u.targetX,
                                targetY: u.targetY,
                                orderText: 'AUTONOMOUS GEMINI AI CONTROL RESTORED',
                                issuedTick: simTick,
                                aiControlled: true
                              }
                            } : u));
                          }}
                          className="px-1.5 py-1 text-[8px] font-bold border border-blue-500/60 bg-blue-950/30 hover:bg-blue-900/60 text-blue-300 text-left"
                        >
                          🤖 AI AUTONOMY
                        </button>
                      </div>

                      {/* Naval Specific Action Directives */}
                      {(selectedUnit.type === 'carrier' || selectedUnit.type === 'submarine' || selectedUnit.type === 'destroyer') && (
                        <div className="pt-1 border-t border-cyan-900/50 space-y-1">
                          <div className="text-[8px] uppercase tracking-wider text-cyan-400 font-bold">NAVAL ASSET DIRECTIVES</div>
                          <div className="grid grid-cols-2 gap-1">
                            {selectedUnit.type === 'carrier' && (
                              <button
                                onClick={() => {
                                  if ((selectedUnit.carrierAircraft || 0) > 0) {
                                    setUnits(prev => prev.map(u => u.id === selectedUnit.id ? {
                                      ...u,
                                      carrierAircraft: Math.max(0, (u.carrierAircraft || 1) - 1)
                                    } : u));
                                    appendUnitHistory(selectedUnit, 'NAVAL', 'CAG ALPHA STRIKE SCRAMBLE', `Catapult 1 launched A-4 Skyhawk flight.`, simTick, simHour, simMinute);
                                    setAirSorties(prev => [
                                      ...prev,
                                      {
                                        id: `cag-strike-${Date.now()}-${Math.random()}`,
                                        factionId: selectedUnit.factionId,
                                        airbaseId: selectedUnit.id,
                                        callsign: 'CAG-01 ALPHA',
                                        role: 'CAS',
                                        x: selectedUnit.x,
                                        y: selectedUnit.y,
                                        altitude: 450,
                                        targetX: 680,
                                        targetY: 380,
                                        speed: 3.2,
                                        heading: selectedUnit.heading,
                                        fuel: 100,
                                        maxFuel: 100,
                                        status: 'EN_ROUTE',
                                        trail: [{ x: selectedUnit.x, y: selectedUnit.y }]
                                      }
                                    ]);
                                    audioSys.playFlankAlarm();
                                  }
                                }}
                                className="px-1.5 py-1 text-[8px] font-bold border border-cyan-500/60 bg-cyan-950/30 hover:bg-cyan-900/60 text-cyan-300 text-left"
                              >
                                ⚓ LAUNCH CAG ({selectedUnit.carrierAircraft || 0})
                              </button>
                            )}

                            {selectedUnit.type === 'submarine' && (
                              <>
                                <button
                                  onClick={() => {
                                    setUnits(prev => prev.map(u => {
                                      if (u.id === selectedUnit.id) {
                                        const nextState = !u.isSubmerged;
                                        appendUnitHistory(u, 'NAVAL', nextState ? 'SUBMERGED TO PERISCOPE DEPTH' : 'EMERGENCY SURFACE', nextState ? 'Silent running enabled.' : 'Diesel snorkel engines running.', simTick, simHour, simMinute);
                                        return { ...u, isSubmerged: nextState };
                                      }
                                      return u;
                                    }));
                                  }}
                                  className="px-1.5 py-1 text-[8px] font-bold border border-cyan-500/60 bg-cyan-950/30 hover:bg-cyan-900/60 text-cyan-300 text-left"
                                >
                                  {selectedUnit.isSubmerged ? '⬆ SURFACE BOAT' : '⬇ DIVE SUBMERGED'}
                                </button>
                                <button
                                  onClick={() => {
                                    const enemyNaval = units.find(other => other.id !== selectedUnit.id && other.factionId !== selectedUnit.factionId && other.strength > 0 && (other.type === 'carrier' || other.type === 'destroyer' || other.type === 'submarine'));
                                    if (enemyNaval) {
                                      const torpAngle = (Math.atan2(enemyNaval.y - selectedUnit.y, enemyNaval.x - selectedUnit.x) * 180) / Math.PI;
                                      setTorpedoes(prev => [
                                        ...prev,
                                        {
                                          id: `torp-man-${Date.now()}`,
                                          factionId: selectedUnit.factionId,
                                          x: selectedUnit.x,
                                          y: selectedUnit.y,
                                          targetUnitId: enemyNaval.id,
                                          speed: 2.8,
                                          heading: torpAngle,
                                          damage: 42,
                                          life: 5.0,
                                          trail: [{ x: selectedUnit.x, y: selectedUnit.y }]
                                        }
                                      ]);
                                      appendUnitHistory(selectedUnit, 'NAVAL', 'TORPEDO TUBE 1 FIRED', `Acoustic homing torpedo launched against ${enemyNaval.name.toUpperCase()}.`, simTick, simHour, simMinute);
                                      audioSys.playArtillery();
                                    }
                                  }}
                                  className="px-1.5 py-1 text-[8px] font-bold border border-red-500/60 bg-red-950/30 hover:bg-red-900/60 text-red-300 text-left"
                                >
                                  💥 FIRE TORPEDO
                                </button>
                              </>
                            )}

                            {selectedUnit.type === 'destroyer' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSonarPings(prev => [
                                      ...prev,
                                      {
                                        id: `ping-${Date.now()}`,
                                        x: selectedUnit.x,
                                        y: selectedUnit.y,
                                        radius: 10,
                                        maxRadius: 280,
                                        duration: 3.5,
                                        elapsed: 0,
                                        factionId: selectedUnit.factionId
                                      }
                                    ]);
                                    appendUnitHistory(selectedUnit, 'NAVAL', 'ACTIVE SONAR SWEEP', 'Transmitting SQS-23 active ping array across sector.', simTick, simHour, simMinute);
                                    audioSys.playTeletype();
                                  }}
                                  className="px-1.5 py-1 text-[8px] font-bold border border-cyan-500/60 bg-cyan-950/30 hover:bg-cyan-900/60 text-cyan-300 text-left"
                                >
                                  📡 ACTIVE SONAR
                                </button>
                                <button
                                  onClick={() => {
                                    const enemySub = units.find(other => other.type === 'submarine' && other.factionId !== selectedUnit.factionId && distance(selectedUnit.x, selectedUnit.y, other.x, other.y) < 180);
                                    if (enemySub) {
                                      setDepthCharges(prev => [
                                        ...prev,
                                        {
                                          id: `dc-${Date.now()}`,
                                          factionId: selectedUnit.factionId,
                                          x: selectedUnit.x,
                                          y: selectedUnit.y,
                                          targetX: enemySub.x,
                                          targetY: enemySub.y,
                                          progress: 0,
                                          duration: 1.5,
                                          damage: 48
                                        }
                                      ]);
                                      appendUnitHistory(selectedUnit, 'NAVAL', 'HEDGEHOG ASW PATTERN', `Fired 24-spigot depth charge salvo at suspected contact.`, simTick, simHour, simMinute);
                                      audioSys.playArtillery();
                                    }
                                  }}
                                  className="px-1.5 py-1 text-[8px] font-bold border border-amber-500/60 bg-amber-950/30 hover:bg-amber-900/60 text-amber-300 text-left"
                                >
                                  💣 HEDGEHOG ASW
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Unit Service Record & History Log */}
                    <div className="pt-2 border-t border-[#1a2e1a] space-y-1">
                      <div className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex justify-between">
                        <span>UNIT SERVICE HISTORY LOG</span>
                        <span className="text-[8px] text-neutral-400">({selectedUnit.history?.length || 0} LOGS)</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1 border border-[#1a2e1a] p-1 bg-black/50">
                        {(!selectedUnit.history || selectedUnit.history.length === 0) ? (
                          <div className="text-[8px] text-neutral-500 italic p-1">No significant incidents logged yet. In standard deployment status.</div>
                        ) : (
                          selectedUnit.history.map(entry => (
                            <div key={entry.id} className="text-[8px] border-b border-[#1a2e1a] pb-1 last:border-0 last:pb-0">
                              <div className="flex justify-between items-center text-neutral-400">
                                <span className={`font-bold ${
                                  entry.type === 'COMBAT' ? 'text-red-400' :
                                  entry.type === 'WEATHER' ? 'text-cyan-400' :
                                  entry.type === 'PROMOTION' ? 'text-yellow-400' :
                                  entry.type === 'NAVAL' ? 'text-sky-300' : 'text-emerald-400'
                                }`}>[{entry.type}] {entry.headline}</span>
                                <span>{entry.timestamp}</span>
                              </div>
                              <div className="text-neutral-300 font-mono">{entry.detail}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Flank Alert */}
                    <div className="bg-red-950/40 border border-red-800/60 p-1.5 text-[9px] text-red-300">
                      <span className="font-bold text-red-400">TACTICAL DOCTRINE: </span>
                      Flanking arcs inflict 1.8x damage; Monsoon squalls reduce speed and sensor detection.
                    </div>
                  </div>
                ) : (
                  /* 1960s Air Wings Scramble */
                  <div>
                    <div className="flex items-center justify-between mb-1.5 text-[10px] uppercase font-bold text-cyan-300">
                      <span className="flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5" />
                        <span>1960s Air Wings & Sorties</span>
                      </span>
                      <span className="text-[9px] opacity-75">AIRBORNE: {airSorties.length}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                      <button
                        onClick={() => scrambleAirSortie('coalition', 'AIR_SUPERIORITY')}
                        className={`border p-1.5 text-left text-[10px] ${
                          crtTheme === 'amber'
                            ? 'border-amber-600/50 hover:bg-amber-950/40'
                            : 'border-cyan-500/50 hover:bg-cyan-950/40'
                        }`}
                      >
                        <div className="font-bold text-cyan-300">F-4 PHANTOM</div>
                        <div className="text-[8px] opacity-70">Air Superiority</div>
                      </button>

                      <button
                        onClick={() => scrambleAirSortie('loyalists', 'CAS')}
                        className={`border p-1.5 text-left text-[10px] ${
                          crtTheme === 'amber'
                            ? 'border-amber-600/50 hover:bg-amber-950/40'
                            : 'border-blue-500/50 hover:bg-blue-950/40'
                        }`}
                      >
                        <div className="font-bold text-blue-300">A-1 SKYRAIDER</div>
                        <div className="text-[8px] opacity-70">CAS (Napalm)</div>
                      </button>

                      <button
                        onClick={() => scrambleAirSortie('rebels', 'INTERCEPTION')}
                        className={`border p-1.5 text-left text-[10px] ${
                          crtTheme === 'amber'
                            ? 'border-amber-600/50 hover:bg-amber-950/40'
                            : 'border-red-500/50 hover:bg-red-950/40'
                        }`}
                      >
                        <div className="font-bold text-red-300">MiG-21 FISHBED</div>
                        <div className="text-[8px] opacity-70">CAP Intercept</div>
                      </button>

                      <button
                        onClick={() => scrambleAirSortie('volskan', 'RECON')}
                        className={`border p-1.5 text-left text-[10px] ${
                          crtTheme === 'amber'
                            ? 'border-amber-600/50 hover:bg-amber-950/40'
                            : 'border-yellow-500/50 hover:bg-yellow-950/40'
                        }`}
                      >
                        <div className="font-bold text-yellow-300">U-2 / RF-4 RECON</div>
                        <div className="text-[8px] opacity-70">Aerial LoS Sweep</div>
                      </button>
                    </div>

                    {airSorties.length > 0 ? (
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {airSorties.map((s, idx) => (
                          <div
                            key={`${s.id}-${idx}`}
                            className="p-1 border border-[#1a2e1a] text-[9px] bg-[#0a150a] flex justify-between items-center"
                          >
                            <span className="font-bold">
                              {s.callsign} [{s.role}]
                            </span>
                            <span className="text-amber-400">{Math.round(s.fuel)}% FUEL</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[9px] opacity-50 italic text-center py-0.5">
                        Select unit to inspect telemetry or scramble wings above.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Radio Intercepts Log */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2 text-[10px] leading-tight">
                {transmissions.map((tx, idx) => {
                  const isFlash = tx.priority === 'FLASH';
                  const isRebel = tx.callsign.includes('REBEL') || tx.callsign.includes('LIBERATION');
                  const isUS =
                    tx.callsign.includes('US') || tx.callsign.includes('COALITION') || tx.callsign.includes('SHADOW');
                  const isVolskan =
                    tx.callsign.includes('VOLSKAN') || tx.callsign.includes('SOVIET') || tx.callsign.includes('ALERT');

                  return (
                    <div
                      key={`${tx.id}-${idx}`}
                      className={
                        isFlash
                          ? 'text-amber-400 border-l-2 border-amber-500 pl-2 py-1 bg-amber-500/5'
                          : isRebel
                          ? 'text-red-400'
                          : isUS
                          ? 'text-cyan-400'
                          : isVolskan
                          ? 'text-amber-300'
                          : 'text-[#4af626] opacity-90'
                      }
                    >
                      <span className="opacity-50 text-[#4af626]">[{tx.timestamp}]</span>{' '}
                      <span className="font-bold text-white">[{tx.callsign}]</span>: {tx.message}
                    </div>
                  );
                })}
              </div>

              {/* Current Command Directive */}
              <div
                className={`min-h-20 border-t-2 p-2.5 ${
                  crtTheme === 'amber' ? 'border-[#b45309] bg-[#0c0802]' : 'border-[#1a2e1a] bg-[#050805]'
                }`}
              >
                <div className="text-[9px] uppercase opacity-50 mb-1 font-bold">Autonomous Command Directive</div>
                <div className="text-[10px] italic text-[#4af626]/80 leading-relaxed">
                  &quot;{geopoliticalAssessment ||
                    'Sever enemy resupply routes at designated river choke bridges. Leverage wooded terrain for infantry ambushes.'}&quot;
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIPLOMATIC MATRIX & GEOPOLITICAL AI */}
          {activeTab === 'diplomacy' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b pb-1.5 border-[#1a2e1a]">
                <span className="font-bold text-[10px] text-amber-400 uppercase">Geopolitical Treaty Matrix</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-yellow-950 text-yellow-400 border border-yellow-700 font-bold">
                  UN GENEVA PROTOCOL
                </span>
              </div>

              {/* Bilateral Relations Cards */}
              <div className="space-y-2">
                {Object.values(diplomaticLedger.relations).map(rel => {
                  const fA = factions[rel.factionA]?.name || rel.factionA;
                  const fB = factions[rel.factionB]?.name || rel.factionB;
                  const statusColor =
                    rel.status === 'TOTAL_WAR'
                      ? 'text-red-400 bg-red-950/80 border-red-700'
                      : rel.status === 'FULL_ALLIANCE' || rel.status === 'PROXY_ALLIANCE'
                      ? 'text-green-400 bg-green-950/80 border-green-700'
                      : rel.status === 'NON_AGGRESSION' || rel.status === 'CEASEFIRE'
                      ? 'text-cyan-400 bg-cyan-950/80 border-cyan-700'
                      : 'text-yellow-400 bg-yellow-950/80 border-yellow-700';

                  return (
                    <div
                      key={`${rel.factionA}-${rel.factionB}`}
                      className="p-2 border border-[#1a2e1a] bg-black/40 flex flex-col gap-1 text-[10px]"
                    >
                      <div className="flex justify-between items-center font-bold">
                        <span>{fA} ↔ {fB}</span>
                        <span className={`px-1.5 py-0.5 border text-[8px] font-black ${statusColor}`}>
                          {rel.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] opacity-75">
                        <span>Tension Index: {rel.tension > 0 ? `+${rel.tension}` : rel.tension}</span>
                        <span>Sanctions: {rel.activeSanctions.length > 0 ? rel.activeSanctions[0] : 'NONE'}</span>
                      </div>
                      <div className="w-full bg-[#132213] h-1 border border-[#1a2e1a]">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${Math.min(100, Math.max(10, Math.abs(rel.tension)))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Diplomatic Treaties & Ceasefire Cables */}
              <div className="border-t pt-2 border-[#1a2e1a]">
                <div className="text-[10px] font-bold text-cyan-400 uppercase mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Recent Diplomatic Accords & Cables</span>
                </div>
                <div className="space-y-1.5 text-[9px]">
                  {diplomaticLedger.recentEvents.slice(-4).map((evt, idx) => (
                    <div key={idx} className="p-1.5 border border-[#1a2e1a] bg-[#081208]">
                      <div className="text-amber-300 font-bold">CABLE #{idx + 1}</div>
                      <div className="opacity-80 mt-0.5">{evt}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Covert Espionage & Proxies */}
              <div className="p-2 border border-amber-800/40 bg-amber-950/20 text-[9px] space-y-1">
                <div className="font-bold text-amber-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>COVERT PROXY INTERVENTION DOCTRINE</span>
                </div>
                <p className="opacity-80">
                  Atlantic Coalition and Volskan Union are executing covert weapons airlift and signals espionage without formal declaration of global war to prevent Defcon 1 escalation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: WAR ECONOMY & INDUSTRIAL PRODUCTION */}
          {activeTab === 'economy' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b pb-1.5 border-[#1a2e1a]">
                <span className="font-bold text-[10px] text-amber-400 uppercase">War Production Board</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-green-950 text-green-400 border border-green-700 font-bold">
                  FACTORIES OPERATIONAL
                </span>
              </div>

              {/* Faction Economic Ledger Cards */}
              <div className="space-y-2.5">
                {(['loyalists', 'rebels', 'coalition', 'volskan'] as FactionId[]).map(fId => {
                  const fac = factions[fId];
                  const eco = economyState.factionResources[fId];
                  if (!fac || !eco) return null;

                  const factionQueue = economyState.productionQueues.filter(q => q.factionId === fId);

                  return (
                    <div key={fId} className="p-2.5 border border-[#1a2e1a] bg-black/40 text-[10px] space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs" style={{ color: fac.color }}>
                          {fac.name.toUpperCase()}
                        </span>
                        <span className="text-[9px] opacity-75 font-mono">
                          IND. OUTPUT: +{eco.ipRate}/min
                        </span>
                      </div>

                      {/* Resources grid */}
                      <div className="grid grid-cols-6 gap-1 text-[9px] font-mono text-center">
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">OIL</div>
                          <div className="font-bold text-amber-400">{Math.round(eco.oil)}</div>
                        </div>
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">IP</div>
                          <div className="font-bold text-emerald-400">{Math.round(eco.industrialProduction)}</div>
                        </div>
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">MANPWR</div>
                          <div className="font-bold text-cyan-400">{Math.round(eco.manpower)}</div>
                        </div>
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">FUNDS</div>
                          <div className="font-bold text-yellow-300">${Math.round(eco.treasury)}</div>
                        </div>
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">FOOD</div>
                          <div className="font-bold text-green-300">{Math.round(eco.food)}</div>
                        </div>
                        <div className="p-1 bg-[#101b10] border border-[#1a2e1a]">
                          <div className="opacity-60 text-[8px]">RARE E.</div>
                          <div className="font-bold text-purple-300">{Math.round(eco.rareEarths)}</div>
                        </div>
                      </div>

                      {/* Active Production Lines */}
                      <div className="mt-1 space-y-1">
                        <div className="text-[8px] opacity-60 font-bold uppercase">Active Assembly Line:</div>
                        {factionQueue.length > 0 ? (
                          factionQueue.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="p-1 bg-neutral-950/80 border border-[#1a2e1a]">
                              <div className="flex justify-between text-[9px]">
                                <span className="font-bold text-white">{item.unitName}</span>
                                <span className="text-emerald-400 font-bold">{Math.round(item.progress)}%</span>
                              </div>
                              <div className="w-full bg-[#132213] h-1.5 border border-[#1a2e1a] mt-0.5 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-[8px] opacity-50 italic">Factories idle / accumulating industrial stock</div>
                        )}
                      </div>

                      {/* Manual Requisition Button */}
                      <button
                        onClick={() => {
                          const unitType: UnitType = fId === 'loyalists' ? 'armor' : fId === 'rebels' ? 'infantry' : 'mechanized';
                          const name = `${fac.name} Emergency Division`;
                          spawnReinforcement(fId, unitType, name);
                        }}
                        className="w-full py-1 text-[9px] font-bold uppercase border border-[#1a2e1a] hover:bg-[#1a2e1a] text-yellow-400 hover:text-white mt-1"
                      >
                        + Commission Emergency {fac.name} Unit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DYNAMIC TERRAIN & FOG OF WAR INTEL */}
          {activeTab === 'terrain' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {/* Fog of War Perspective Selector */}
              <div className="border border-[#1a2e1a] p-2.5 bg-black/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[10px] text-cyan-400 uppercase flex items-center gap-1">
                    <Radar className="w-3.5 h-3.5" />
                    <span>Radar Fog of War Perspective</span>
                  </span>
                  <span className="text-[8px] font-mono opacity-60">LINE-OF-SIGHT</span>
                </div>
                <p className="text-[9px] opacity-75 leading-relaxed">
                  Switch viewpoint to observe exactly what individual faction radar and patrols detect. Units outside line of sight or concealed in cover remain invisible.
                </p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setFowPerspective('all')}
                    className={`p-1.5 border text-left text-[9px] font-bold ${
                      fowPerspective === 'all'
                        ? 'bg-white/20 border-white text-white'
                        : 'border-[#1a2e1a] hover:bg-[#1a2e1a]'
                    }`}
                  >
                    ◎ SPECTATOR (ALL)
                  </button>
                  <button
                    onClick={() => setFowPerspective('loyalists')}
                    className={`p-1.5 border text-left text-[9px] font-bold ${
                      fowPerspective === 'loyalists'
                        ? 'bg-blue-950 border-blue-500 text-blue-300'
                        : 'border-[#1a2e1a] hover:bg-[#1a2e1a]'
                    }`}
                  >
                    ● LOYALISTS RADAR
                  </button>
                  <button
                    onClick={() => setFowPerspective('rebels')}
                    className={`p-1.5 border text-left text-[9px] font-bold ${
                      fowPerspective === 'rebels'
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'border-[#1a2e1a] hover:bg-[#1a2e1a]'
                    }`}
                  >
                    ● REBELS SCOUTS
                  </button>
                  <button
                    onClick={() => setFowPerspective('coalition')}
                    className={`p-1.5 border text-left text-[9px] font-bold ${
                      fowPerspective === 'coalition'
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                        : 'border-[#1a2e1a] hover:bg-[#1a2e1a]'
                    }`}
                  >
                    ● ATLANTIC AWACS
                  </button>
                </div>

                {/* Scramble Aerial Reconnaissance */}
                <button
                  onClick={() => {
                    const activeFaction = fowPerspective === 'all' ? 'coalition' : fowPerspective;
                    scrambleAirSortie(activeFaction, 'RECON');
                  }}
                  className="w-full py-1.5 text-[9px] font-bold uppercase border border-cyan-500/80 bg-cyan-950/50 hover:bg-cyan-900 text-cyan-300 flex items-center justify-center gap-1.5 mt-1"
                >
                  <Plane className="w-3.5 h-3.5" />
                  <span>Launch High-Altitude Recon Sweep (380m Radar)</span>
                </button>
              </div>

              {/* Dynamic Terrain Archetypes & Modifiers */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-amber-400 uppercase">
                  Continuous Vector Terrain Rules
                </div>

                {/* Mud */}
                <div className="p-2 border border-amber-700/60 bg-amber-950/20 text-[9px] space-y-0.5">
                  <div className="font-bold text-amber-400">░░ ALLUVIAL DELTA MUD</div>
                  <div className="opacity-80">
                    • Vehicle Movement: <span className="font-bold text-red-400">-20% Speed</span>
                  </div>
                  <div className="opacity-80">
                    • Heavy Vehicle Strain: <span className="font-bold text-amber-400">+25% Fuel Consumption</span>
                  </div>
                </div>

                {/* Forest */}
                <div className="p-2 border border-green-700/60 bg-green-950/20 text-[9px] space-y-0.5">
                  <div className="font-bold text-green-400">▲▲ PINE TIMBER FORESTS</div>
                  <div className="opacity-80">
                    • Infantry Combat Bonus: <span className="font-bold text-emerald-300">+1 Attack Modifier (+25%)</span>
                  </div>
                  <div className="opacity-80">
                    • Concealment: <span className="font-bold text-emerald-300">Conceals units from aerial visual detection</span>
                  </div>
                </div>

                {/* Hills */}
                <div className="p-2 border border-yellow-700/60 bg-yellow-950/20 text-[9px] space-y-0.5">
                  <div className="font-bold text-yellow-400">▲ SIERRA ROJA HIGHLAND RIDGES</div>
                  <div className="opacity-80">
                    • Defensive Crest: <span className="font-bold text-yellow-300">+2 Defensive Bonus (-40% damage)</span>
                  </div>
                  <div className="opacity-80">
                    • Elevation Advantage: <span className="font-bold text-yellow-300">+50% Line-of-Sight & Radar Range</span>
                  </div>
                </div>

                {/* Urban */}
                <div className="p-2 border border-blue-700/60 bg-blue-950/20 text-[9px] space-y-0.5">
                  <div className="font-bold text-blue-400">▦▦ SANTA MARIA METROPOLITAN</div>
                  <div className="opacity-80">
                    • Urban Cover: <span className="font-bold text-cyan-300">+2 Defensive Cover (-40% damage)</span>
                  </div>
                  <div className="opacity-80">
                    • Reinforced Positions: <span className="font-bold text-cyan-300">Rapid Entrenchment Accumulation</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
      )}

      {/* 1960S NEWSPAPER DISPATCH MODAL */}
      <NewspaperModal
        isOpen={newspaperOpen}
        onClose={() => setNewspaperOpen(false)}
        battle={selectedBattleForNews}
        simTimeStr={`${String(simHour).padStart(2, '0')}:${String(Math.floor(simMinute)).padStart(2, '0')} HRS, OCT 1963`}
      />

      {/* FOOTER */}
      <footer
        className={`h-6 border-t-2 flex items-center px-4 text-[9px] justify-between shrink-0 z-10 ${
          crtTheme === 'amber' ? 'border-[#b45309] bg-[#140e03]' : 'border-[#1a2e1a] bg-[#0a120a]'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#4af626] rounded-full animate-pulse" />
            SYSTEM_STABLE
          </span>
          <span className="opacity-40 tracking-[2px] hidden md:inline">
            |||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
          </span>
        </div>
        <div className="opacity-50 tracking-wider">AUTONOMOUS ENGINE: ON // SPECTATOR MODE: FULL</div>
      </footer>
    </div>
  );
}
