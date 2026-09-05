'use client';

import React, { useState } from 'react';
import {
  Globe,
  Globe2,
  Radio,
  Ship,
  Train,
  Crosshair,
  Newspaper,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Award,
  Maximize2,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Clock,
  Sparkles,
  Users,
  Scale,
  Wrench,
  FileText,
  Eye,
  Handshake,
  ScrollText,
  Lock,
  Unlock,
  Building,
  Target
} from 'lucide-react';
import { WarRoomState, FlashpointBattle, CommanderProfile } from '@/lib/warRoom';
import { DiplomaticLedger, EnvoyType, CovertOpType } from '@/lib/diplomacy';
import { EconomyState } from '@/lib/economy';
import { FactionId, Unit, DesignatedRepairZone } from '@/app/page';
import { NixieTube } from './NixieTube';
import { VUMeter } from './VUMeter';
import { AnnunciatorButton } from './AnnunciatorButton';
import { RotarySpeedDial } from './RotarySpeedDial';
import { JewelIndicator } from './JewelIndicator';
import { TeletypeRibbon } from './TeletypeRibbon';

interface StrategicMapRoomProps {
  warRoom: WarRoomState;
  diplomaticLedger: DiplomaticLedger;
  economyState: EconomyState;
  defcon: number;
  simTimeStr: string;
  simTick: number;
  unifiedState: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onTuneInToTactical: (flashpoint?: FlashpointBattle) => void;
  onOpenNewspaper: (battle?: FlashpointBattle) => void;
  onTriggerUnification: () => void;
  simSpeed?: number;
  onChangeSpeed?: (s: number) => void;
  transmissions?: any[];
  theaterPhase?: 'DIPLOMATIC_CRISIS' | 'TOTAL_WAR_MOBILIZATION';
  onToggleTheaterPhase?: () => void;
  onEscalateIncident?: (sectorName: string) => void;
  onAutoResolveBattle?: (battle: FlashpointBattle) => void;
  gamemasterReport?: any;
  units?: Unit[];
  repairZones?: DesignatedRepairZone[];
  onSendEnvoy?: (from: FactionId, to: FactionId, type: EnvoyType, terms?: string) => void;
  onBreakTreaty?: (factionA: FactionId, factionB: FactionId, treatyName: string) => void;
  onLaunchCovertOp?: (sponsor: FactionId, target: FactionId, type: CovertOpType) => void;
  onOrderRetreatToDepot?: (unitId: string) => void;
}

export const StrategicMapRoom: React.FC<StrategicMapRoomProps> = ({
  warRoom,
  diplomaticLedger,
  economyState,
  defcon,
  simTimeStr,
  simTick,
  unifiedState,
  isPlaying,
  onTogglePlay,
  onTuneInToTactical,
  onOpenNewspaper,
  onTriggerUnification,
  simSpeed = 1,
  onChangeSpeed = () => {},
  transmissions = [],
  theaterPhase = 'DIPLOMATIC_CRISIS',
  onToggleTheaterPhase,
  onEscalateIncident,
  onAutoResolveBattle,
  gamemasterReport,
  units = [],
  repairZones = [],
  onSendEnvoy,
  onBreakTreaty,
  onLaunchCovertOp,
  onOrderRetreatToDepot
}) => {
  const [selectedCommander, setSelectedCommander] = useState<FactionId>('loyalists');
  const [activeTab, setActiveTab] = useState<'DOSSIERS' | 'DIPLOMACY' | 'REPAIRS' | 'GM_ARBITRATION' | 'TELETYPE'>('DOSSIERS');

  // Envoy and Espionage Form States
  const [envoyFrom, setEnvoyFrom] = useState<FactionId>('loyalists');
  const [envoyTo, setEnvoyTo] = useState<FactionId>('coalition');
  const [envoyType, setEnvoyType] = useState<EnvoyType>('NON_AGGRESSION_TREATY');
  const [customTerms, setCustomTerms] = useState<string>('');

  const [covertSponsor, setCovertSponsor] = useState<FactionId>('coalition');
  const [covertTarget, setCovertTarget] = useState<FactionId>('volskan');
  const [covertType, setCovertType] = useState<CovertOpType>('INFILTRATE_INTEL');
  const [selectedIntelTarget, setSelectedIntelTarget] = useState<FactionId>('volskan');

  const activeFlashpoint = warRoom.flashpoints.find(f => f.status === 'ACTIVE_CLASH');
  const latestResolved = warRoom.flashpoints.find(f => f.status === 'RESOLVED');

  // Calculate overall tension for VU meter (0 to 100)
  const volskanTension = Math.max(0, 100 - warRoom.homefrontMorale.volskan);
  const coalitionTension = Math.max(0, 100 - warRoom.homefrontMorale.coalition);
  const avgGlobalTension = Math.round((volskanTension + coalitionTension) / 2);
  const strikeReadiness = Math.round(100 - (defcon - 1) * 22);

  // Strategic Frontline Momentum Tug-of-War calculation
  const loyalistDivisions = (warRoom.strategicDivisions || []).filter(d => d.factionId === 'loyalists');
  const rebelDivisions = (warRoom.strategicDivisions || []).filter(d => d.factionId === 'rebels');
  const loyalistTroops = loyalistDivisions.reduce((acc, d) => acc + d.troopCount, 0) || 30600;
  const rebelTroops = rebelDivisions.reduce((acc, d) => acc + d.troopCount, 0) || 21400;
  const totalTroops = Math.max(1, loyalistTroops + rebelTroops);
  const loyalistControlPct = Math.max(15, Math.min(85, Math.round((loyalistTroops / totalTroops) * 100)));

  return (
    <div className="relative w-full h-full bg-[#1b221d] text-[#e3dcce] font-industrial flex flex-col select-none overflow-hidden">
      {/* 1. TOP PHYSICAL CONSOLE CHASSIS HEADER (Powder-Coated Seafoam Green #2f4438) */}
      <div className="chassis-seafoam border-b-4 border-[#1c2920] px-4 py-2 flex items-center justify-between z-10 shadow-lg">
        {/* Left: Console Nameplate & Jewel Indicators */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <JewelIndicator color="emerald" active={true} label="PWR" size="sm" />
            <JewelIndicator
              color="amber"
              active={defcon <= 3}
              label="WARN"
              size="sm"
            />
            <JewelIndicator
              color="red"
              active={defcon <= 2}
              label="ALERT"
              size="sm"
            />
          </div>

          <div className="border-l border-[#4d6354] pl-3">
            <div className="text-xs font-space font-bold tracking-wider text-[#d1fae5] flex items-center gap-2">
              <span>PROJECT BRINK // WAR ROOM MACRO THEATRE</span>
              <span className="text-[9px] px-2 py-0.5 bg-[#1b261f] border border-[#526b5a] text-[#86efac] rounded-sm uppercase tracking-widest">
                DR. STRANGELOVE BIG BOARD
              </span>
            </div>
            <div className="text-[9px] text-[#a7f3d0]/75 tracking-wider font-space">
              1963 Demarcation Strategic Command Console • Model SAC-63
            </div>
          </div>
        </div>

        {/* Center: Nixie Tube Clock Readout & Rotary Speed Switch */}
        <div className="flex items-center gap-5">
          {/* Nixie Tube Clock */}
          <NixieTube
            value={simTimeStr.slice(0, 5)}
            label="THEATRE TIME (HRS)"
            size="sm"
          />

          {/* NASA Annunciator Controls */}
          <div className="flex items-center gap-2">
            <AnnunciatorButton
              label={isPlaying ? 'ADVANCE' : 'STANDBY'}
              sublabel={isPlaying ? 'CLOCK ACTIVE' : 'SYSTEM HELD'}
              active={isPlaying}
              color="green"
              onClick={onTogglePlay}
            />

            <AnnunciatorButton
              label={theaterPhase === 'DIPLOMATIC_CRISIS' ? 'DIPLOMATIC CRISIS' : 'OPEN WARFARE'}
              sublabel={theaterPhase === 'DIPLOMATIC_CRISIS' ? 'STANDOFF / DMZ' : 'GENERAL CLASH'}
              active={true}
              color={theaterPhase === 'DIPLOMATIC_CRISIS' ? 'blue' : 'red'}
              onClick={onToggleTheaterPhase}
            />

            {theaterPhase === 'DIPLOMATIC_CRISIS' && (
              <AnnunciatorButton
                label="ESCALATE INCIDENT"
                sublabel="DELTA BRIDGE 1v1"
                active={true}
                color="amber"
                onClick={() => onEscalateIncident?.('Delta Causeway Bridge')}
              />
            )}

            <AnnunciatorButton
              label="MORNING DISPATCH"
              sublabel="PRESS CABLES"
              active={Boolean(latestResolved || activeFlashpoint)}
              color="orange"
              onClick={() => onOpenNewspaper(latestResolved || activeFlashpoint)}
              badge={
                latestResolved ? (
                  <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                ) : undefined
              }
            />

            {/* Primary Action Button: TUNE IN TO TACTICAL PERISCOPE */}
            <AnnunciatorButton
              label="TUNE IN PERISCOPE"
              sublabel="CATHODE RAY SCOPE"
              active={Boolean(activeFlashpoint)}
              color={activeFlashpoint ? 'red' : 'blue'}
              onClick={() => onTuneInToTactical(activeFlashpoint)}
              className="scale-105"
            />
          </div>
        </div>

        {/* Right: Analog Meter Gauge & DEFCON Status */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-space font-bold tracking-widest text-[#a7f3d0]">
              DEFCON ALERT STATUS
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {[5, 4, 3, 2, 1].map((level) => (
                <div
                  key={level}
                  className={`w-4 h-5 rounded-sm flex items-center justify-center text-[10px] font-space font-bold border transition-all ${
                    defcon === level
                      ? level <= 2
                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_#ef4444] animate-pulse'
                        : level === 3
                        ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_8px_#f59e0b]'
                        : 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-[#18221b] border-[#36473b] text-neutral-500'
                  }`}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Frontline Momentum Ribbon */}
      <div className="w-full bg-[#16221a] border-b-2 border-[#2b3a2f] px-6 py-1.5 flex items-center justify-between text-xs font-space">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <span>LOYALIST JUNTA</span>
          <span className="text-[10px] font-mono opacity-70">({loyalistControlPct}%)</span>
        </div>

        {/* Tug of war bar */}
        <div className="flex-1 max-w-lg mx-6 h-2 bg-[#0d1410] border border-[#3b4d40] rounded-sm overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${loyalistControlPct}%` }} 
          />
          <div 
            className="h-full bg-red-500 transition-all duration-500" 
            style={{ width: `${100 - loyalistControlPct}%` }} 
          />
        </div>

        <div className="flex items-center gap-2 text-red-400 font-bold">
          <span className="text-[10px] font-mono opacity-70">({100 - loyalistControlPct}%)</span>
          <span>LIBERATION FRONT</span>
        </div>
      </div>

      {/* 2. MAIN DR. STRANGELOVE "BIG BOARD" THEATRE LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center: Backlit Acrylic Cartography Screen */}
        <div className="flex-1 relative bg-[#121915] border-r-4 border-[#1e2a21] overflow-hidden flex items-center justify-center p-3">
          {/* Bevelled Aluminum Frame Border & Hex Screws around map */}
          <div className="absolute top-2 left-2 hex-screw z-30" />
          <div className="absolute top-2 right-2 hex-screw z-30" />
          <div className="absolute bottom-2 left-2 hex-screw z-30" />
          <div className="absolute bottom-2 right-2 hex-screw z-30" />

          {/* Frosted Acrylic Glass Edge-Lit Backlit Map */}
          <div className="w-full h-full relative rounded border-2 border-[#37493d] shadow-[inset_0_0_40px_rgba(0,0,0,0.8),0_4px_16px_rgba(0,0,0,0.6)] overflow-hidden bg-[#0d1612]">
            {/* Top-Down Geopolitical SVG Cartography */}
            <svg className="w-full h-full" viewBox="0 0 1280 800">
              <defs>
                {/* Backlit Acrylic Grid */}
                <pattern id="bigboard-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1d2e23" strokeWidth="0.8" />
                </pattern>

                {/* Glass Edge Glow Filters */}
                <filter id="grease-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width="1280" height="800" fill="url(#bigboard-grid)" />

              {/* Deep Slate Ocean (Atlantic Coalition Sea Sector) */}
              <path
                d="M 0 0 L 300 0 L 230 320 L 170 510 L 250 800 L 0 800 Z"
                fill="#12202a"
                stroke="#1f3b4d"
                strokeWidth="2.5"
              />
              {/* Bathymetric Depth Sounding Lines */}
              <path d="M 0 120 Q 140 160 210 310 Q 150 480 210 800" fill="none" stroke="#1d4ed8" strokeWidth="1" strokeDasharray="5 5" opacity="0.4" />
              <path d="M 0 240 Q 100 280 170 380 Q 110 520 160 800" fill="none" stroke="#1e40af" strokeWidth="1" strokeDasharray="3 4" opacity="0.3" />
              <text x="40" y="160" fill="#60a5fa" opacity="0.4" fontSize="8" fontFamily="'Courier Prime', monospace">DEPTH CONTOUR -50M</text>
              <text x="30" y="320" fill="#3b82f6" opacity="0.35" fontSize="8" fontFamily="'Courier Prime', monospace">CONTINENTAL SHELF -120M</text>

              <text x="60" y="240" fill="#38bdf8" opacity="0.7" fontSize="14" fontWeight="bold" letterSpacing="5" fontFamily="'Orbitron', sans-serif">
                ATLANTIC COALITION SECTOR
              </text>
              <text x="60" y="262" fill="#7dd3fc" opacity="0.5" fontSize="10" letterSpacing="3" fontFamily="'Courier Prime', monospace">
                TASK FORCE 72 CARRIER BATTLE GROUP PATROL
              </text>

              {/* Eastern Volskan Heavy Railhead & Steppes */}
              <path
                d="M 1280 0 L 1000 0 L 1070 330 L 1030 530 L 1110 800 L 1280 800 Z"
                fill="#261715"
                stroke="#4a2520"
                strokeWidth="2.5"
              />
              <text x="1060" y="240" fill="#f87171" opacity="0.7" fontSize="14" fontWeight="bold" letterSpacing="5" fontFamily="'Orbitron', sans-serif">
                VOLSKAN UNION SECTOR
              </text>
              <text x="1060" y="262" fill="#fca5a5" opacity="0.5" fontSize="10" letterSpacing="3" fontFamily="'Courier Prime', monospace">
                TRANS-STEPPE STRATEGIC HEAVY RAILHEADS
              </text>

              {/* SAN PIETRO THEATRE (Center Landmass) */}
              {/* Northern Sector: San Pietro Junta Territory */}
              <path
                d="M 300 0 L 1000 0 L 1070 330 L 640 430 L 230 320 Z"
                fill="#1b2e22"
                stroke="#2f543c"
                strokeWidth="3"
              />
              {/* Topographic Contour Relief Elevation Bands */}
              <path d="M 360 40 Q 640 90 940 30" fill="none" stroke="#2a4533" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.7" />
              <path d="M 400 90 Q 660 140 880 80" fill="none" stroke="#375a43" strokeWidth="1.5" opacity="0.6" />
              <path d="M 460 140 Q 670 190 820 130" fill="none" stroke="#466f54" strokeWidth="1.2" opacity="0.5" />
              <text x="730" y="115" fill="#86efac" opacity="0.35" fontSize="8" fontFamily="'Courier Prime', monospace">+500M CONTOUR</text>

              <text x="500" y="180" fill="#86efac" opacity="0.8" fontSize="20" fontWeight="bold" letterSpacing="8" fontFamily="'Orbitron', sans-serif">
                NORTH SAN PIETRO
              </text>
              <text x="500" y="205" fill="#a7f3d0" opacity="0.55" fontSize="11" letterSpacing="3" fontFamily="'Courier Prime', monospace">
                PRESIDENTIAL JUNTA FORTIFIED ARMORED CORRIDOR
              </text>

              {/* Southern Sector: Sierra Rebel Highlands */}
              <path
                d="M 230 320 L 640 430 L 1070 330 L 1030 530 L 1110 800 L 250 800 L 170 510 Z"
                fill="#2a1b18"
                stroke="#543029"
                strokeWidth="3"
              />
              {/* Mountain Peaks & Ridge Contours */}
              <path d="M 300 680 Q 520 580 880 720" fill="none" stroke="#4a2c26" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6" />
              <path d="M 340 730 Q 560 630 840 760" fill="none" stroke="#5c3830" strokeWidth="1.8" opacity="0.7" />
              <text x="440" y="715" fill="#fca5a5" opacity="0.4" fontSize="9" fontFamily="'Courier Prime', monospace">▲ CORDILLERA CENTRAL (+1200M PEAKS)</text>
              <text x="760" y="650" fill="#fca5a5" opacity="0.35" fontSize="8" fontFamily="'Courier Prime', monospace">▲ MONTE ORO RIDGE +1180M</text>

              <text x="520" y="600" fill="#fca5a5" opacity="0.8" fontSize="20" fontWeight="bold" letterSpacing="8" fontFamily="'Orbitron', sans-serif">
                SIERRA HIGHLANDS
              </text>
              <text x="510" y="625" fill="#fecaca" opacity="0.55" fontSize="11" letterSpacing="3" fontFamily="'Courier Prime', monospace">
                LIBERATION FRONT AUTONOMOUS CADRES
              </text>

              {/* Rio Santo Winding River System & Delta Hydrology */}
              <path
                d="M 320 0 Q 380 180 500 280 Q 640 430 760 490 Q 880 580 940 800"
                fill="none"
                stroke="#0284c7"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.5"
              />
              <path
                d="M 320 0 Q 380 180 500 280 Q 640 430 760 490 Q 880 580 940 800"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.8"
              />
              <text x="430" y="220" fill="#7dd3fc" opacity="0.6" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="'Special Elite', monospace" transform="rotate(35, 430, 220)">
                RIO SANTO MAIN WATERWAY
              </text>

              {/* Disputed Demarcation Ceasefire Line (Grease-Pencil Orange Line) */}
              <path
                d="M 230 320 Q 430 380 640 430 Q 870 380 1070 330"
                fill="none"
                stroke="#ffaa00"
                strokeWidth="5"
                strokeDasharray="12 8"
                filter="url(#grease-glow)"
              />
              <text x="500" y="405" fill="#ffdd55" fontSize="11" fontWeight="bold" letterSpacing="3" fontFamily="'Special Elite', monospace">
                {`// UN DEMARCATION CEASEFIRE LINE [SECTOR 4] //`}
              </text>

              {/* Fortified Demarcation Bunkers & Watchtowers */}
              {[
                { x: 380, y: 360, label: 'BUNKER ALPHA-1' },
                { x: 540, y: 410, label: 'WATCHPOST BRAVO' },
                { x: 780, y: 410, label: 'PILLBOX CHARLIE' },
                { x: 920, y: 365, label: 'OUTPOST DELTA' }
              ].map((b, idx) => (
                <g key={idx} opacity="0.8">
                  <rect x={b.x - 6} y={b.y - 6} width="12" height="12" fill="#3b2b1a" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1={b.x - 4} y1={b.y} x2={b.x + 4} y2={b.y} stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1={b.x} y1={b.y - 4} x2={b.x} y2={b.y + 4} stroke="#f59e0b" strokeWidth="1.5" />
                  <text x={b.x} y={b.y + 14} textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="'Courier Prime', monospace">
                    {b.label}
                  </text>
                </g>
              ))}

              {/* Grease-Pencil Annotations (Dr. Strangelove Glass Hand-drawn Markings) */}
              <g opacity="0.9">
                {/* Grease Mark 1: Delta Bridge */}
                <path d="M 600 450 Q 640 480 690 460" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" />
                <text x="590" y="500" fill="#fef08a" fontSize="11" fontFamily="'Special Elite', monospace" fontWeight="bold" transform="rotate(-4, 590, 500)">
                  &quot;DELTA BRIDGE - CHOKEPOINT ALPHA&quot;
                </text>

                {/* Grease Mark 2: Maritime Shipping Corridor */}
                <path d="M 120 480 L 160 560" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 4" />
                <text x="50" y="575" fill="#7dd3fc" fontSize="10" fontFamily="'Special Elite', monospace">
                  [NAV-LANE CHARLIE: 4 CONVOYS INBOUND]
                </text>

                {/* Grease Mark 3: Heavy Artillery Staging */}
                <circle cx="1080" cy="510" r="32" fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="6 4" />
                <text x="1000" y="565" fill="#fca5a5" fontSize="10" fontFamily="'Special Elite', monospace">
                  [BATTERY 152MM EMPLACEMENT]
                </text>
              </g>

              {/* Radar Coverage Rings (Early Warning Dome) */}
              <g opacity="0.3">
                <circle cx="380" cy="260" r="160" fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 6" />
                <circle cx="380" cy="260" r="260" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="6 8" />
                <text x="380" y="105" textAnchor="middle" fill="#34d399" fontSize="8" fontFamily="'Courier Prime', monospace">
                  SANTA MARIA RADAR UMBRELLA [250KM]
                </text>
              </g>

              {/* Perimeter MGRS Coordinate Ticks */}
              {['ALPHA-01', 'BRAVO-02', 'CHARLIE-03', 'DELTA-04', 'ECHO-05', 'FOXTROT-06', 'GOLF-07', 'HOTEL-08'].map((lbl, idx) => (
                <g key={idx} opacity="0.5">
                  <text x={40 + idx * 150} y="20" fill="#94a3b8" fontSize="9" fontFamily="'Courier Prime', monospace" fontWeight="bold">{lbl}</text>
                  <line x1={40 + idx * 150} y1="0" x2={40 + idx * 150} y2="10" stroke="#94a3b8" strokeWidth="1.5" />
                  <text x="15" y={60 + idx * 95} fill="#94a3b8" fontSize="8" fontFamily="'Courier Prime', monospace" fontWeight="bold">SEC-{idx + 1}</text>
                  <line x1="0" y1={60 + idx * 95} x2="10" y2={60 + idx * 95} stroke="#94a3b8" strokeWidth="1.5" />
                </g>
              ))}

              {/* Monsoon Storm Front Shadow */}
              <circle
                cx={warRoom.monsoon.x}
                cy={warRoom.monsoon.y}
                r={warRoom.monsoon.radius}
                fill="rgba(30, 41, 59, 0.45)"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeDasharray="8 6"
              />
              <text
                x={warRoom.monsoon.x - 90}
                y={warRoom.monsoon.y - warRoom.monsoon.radius + 24}
                fill="#cbd5e1"
                fontSize="11"
                fontWeight="bold"
                fontFamily="'Orbitron', sans-serif"
              >
                ☁ MONSOON SQUALL FRONT (CAS GROUNDED)
              </text>

              {/* Animated Maritime Convoys & Rail Logistics Lines */}
              {warRoom.logisticsLines.map(line => {
                const curX = line.startX + (line.endX - line.startX) * (line.progress / 100);
                const curY = line.startY + (line.endY - line.startY) * (line.progress / 100);
                const isSea = line.type === 'MARITIME_CONVOY';

                return (
                  <g key={line.id}>
                    <line
                      x1={line.startX}
                      y1={line.startY}
                      x2={line.endX}
                      y2={line.endY}
                      stroke={isSea ? '#0284c7' : '#ea580c'}
                      strokeWidth="2"
                      strokeDasharray="6 6"
                      opacity="0.6"
                    />
                    <circle cx={curX} cy={curY} r="6" fill={isSea ? '#38bdf8' : '#f97316'} stroke="#ffffff" strokeWidth="1.5" />
                    {isSea ? (
                      <text x={curX + 10} y={curY + 4} fill="#bae6fd" fontSize="10" fontWeight="bold" fontFamily="'Courier Prime', monospace">
                        🚢 {line.cargo}
                      </text>
                    ) : (
                      <text x={curX + 10} y={curY + 4} fill="#fed7aa" fontSize="10" fontWeight="bold" fontFamily="'Courier Prime', monospace">
                        🚂 {line.cargo}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Strategic Key Fortress Nodes */}
              {[
                { name: 'Santa Maria Citadel', x: 380, y: 260, faction: 'loyalists' },
                { name: 'Delta Causeway Bridge', x: 640, y: 430, faction: 'disputed' },
                { name: 'Black Gold Refineries', x: 1080, y: 520, faction: 'disputed' },
                { name: 'Port Bella Docks', x: 240, y: 680, faction: 'coalition' },
                { name: 'Monte Oro Logistics Depot', x: 980, y: 680, faction: 'volskan' }
              ].map((node, i) => (
                <g key={i}>
                  <circle cx={node.x} cy={node.y} r="10" fill="#14261b" stroke="#34d399" strokeWidth="2.5" />
                  <circle cx={node.x} cy={node.y} r="4" fill="#34d399" />
                  <text x={node.x + 14} y={node.y + 5} fill="#f1f5f9" fontSize="11" fontWeight="bold" fontFamily="'Orbitron', sans-serif">
                    {node.name}
                  </text>
                </g>
              ))}

              {/* NATO DIVISION SCALE (XX / XXX) CHITS ON THE BIG BOARD */}
              {(warRoom.strategicDivisions || []).map(div => {
                const isLoyal = div.factionId === 'loyalists';
                const isRebel = div.factionId === 'rebels';
                const isCoal = div.factionId === 'coalition';
                const isVolsk = div.factionId === 'volskan';

                const borderColor = isLoyal ? '#10b981' : isRebel ? '#ef4444' : isCoal ? '#38bdf8' : '#f97316';
                const fillColor = isLoyal ? '#092517' : isRebel ? '#260d0d' : isCoal ? '#0b2031' : '#2d1409';
                const textColor = isLoyal ? '#a7f3d0' : isRebel ? '#fca5a5' : isCoal ? '#bae6fd' : '#fed7aa';

                return (
                  <g
                    key={div.id}
                    className="cursor-pointer hover:opacity-95 transition-all"
                    onClick={() => {
                      onTuneInToTactical?.({
                        id: div.id,
                        sectorName: div.currentSector,
                        x: div.x,
                        y: div.y,
                        attackerFactionId: div.factionId,
                        defenderFactionId: isLoyal || isCoal ? 'rebels' : 'loyalists',
                        attackerUnits: [],
                        defenderUnits: [],
                        attackerStrength: Math.round(div.troopCount / 160),
                        defenderStrength: 75,
                        expectedDurationHours: 4,
                        elapsedHours: 1,
                        status: 'ACTIVE_CLASH',
                        casualtiesAttacker: 110,
                        casualtiesDefender: 140,
                        armorLostAttacker: 3,
                        armorLostDefender: 2,
                        aircraftLost: 1,
                        reportedInPress: false
                      });
                    }}
                  >
                    {/* Order Directive Vector Arrow */}
                    {div.targetX && div.targetY && (
                      <g opacity="0.75">
                        <line
                          x1={div.x}
                          y1={div.y}
                          x2={div.targetX}
                          y2={div.targetY}
                          stroke={borderColor}
                          strokeWidth="2.5"
                          strokeDasharray="6 4"
                        />
                        <circle cx={div.targetX} cy={div.targetY} r="4" fill={borderColor} />
                      </g>
                    )}

                    {/* NATO Standard Rectangular Division Chit Container */}
                    <g transform={`translate(${div.x - 55}, ${div.y - 28})`}>
                      <rect
                        x="0"
                        y="0"
                        width="110"
                        height="56"
                        fill={fillColor}
                        stroke={borderColor}
                        strokeWidth="2.5"
                        rx="2"
                        className="shadow-lg"
                      />

                      {/* Division Scale Indicator Header (XX / XXX) */}
                      <rect x="0" y="0" width="110" height="14" fill={borderColor} opacity="0.3" />
                      <text
                        x="55"
                        y="10"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontFamily="'Orbitron', sans-serif"
                        fontWeight="black"
                        letterSpacing="2"
                      >
                        {`${div.scale} • ${div.battlegroupRole}`}
                      </text>

                      {/* NATO Symbol Glyph */}
                      {div.symbolType === 'ARMOR' && (
                        <ellipse cx="24" cy="30" rx="14" ry="7" fill="none" stroke={borderColor} strokeWidth="1.8" />
                      )}
                      {div.symbolType === 'INFANTRY' && (
                        <g stroke={borderColor} strokeWidth="1.6">
                          <line x1="12" y1="23" x2="36" y2="37" />
                          <line x1="12" y1="37" x2="36" y2="23" />
                        </g>
                      )}
                      {div.symbolType === 'MECHANIZED' && (
                        <g stroke={borderColor} strokeWidth="1.5">
                          <ellipse cx="24" cy="30" rx="13" ry="6.5" fill="none" />
                          <line x1="12" y1="24" x2="36" y2="36" />
                        </g>
                      )}
                      {div.symbolType === 'ARTILLERY' && (
                        <circle cx="24" cy="30" r="4.5" fill={borderColor} />
                      )}
                      {div.symbolType === 'MARINE' && (
                        <g stroke={borderColor} strokeWidth="1.5">
                          <circle cx="24" cy="26" r="3" fill="none" />
                          <line x1="24" y1="29" x2="24" y2="38" />
                          <path d="M 17 34 Q 24 39 31 34" fill="none" />
                        </g>
                      )}

                      {/* Troop Headcount & Label */}
                      <text
                        x="42"
                        y="27"
                        fill={textColor}
                        fontSize="8.5"
                        fontFamily="'Orbitron', sans-serif"
                        fontWeight="bold"
                        letterSpacing="0.5"
                      >
                        {div.troopCount.toLocaleString()} MEN
                      </text>
                      <text
                        x="42"
                        y="38"
                        fill="#f8fafc"
                        fontSize="7.5"
                        fontFamily="'Courier Prime', monospace"
                        fontWeight="bold"
                      >
                        {div.readiness}% READINESS
                      </text>

                      {/* Readiness Mini Gauge Bar */}
                      <rect x="6" y="47" width="98" height="4" fill="#0f172a" rx="1" />
                      <rect x="6" y="47" width={(98 * div.readiness) / 100} height="4" fill={borderColor} rx="1" />
                    </g>

                    {/* Designation Title Subscript */}
                    <text
                      x={div.x}
                      y={div.y + 39}
                      textAnchor="middle"
                      fill={textColor}
                      fontSize="9"
                      fontFamily="'Special Elite', monospace"
                      fontWeight="bold"
                    >
                      {div.designation}
                    </text>
                  </g>
                );
              })}

              {/* Active Flashpoint Pulsing Radar Beacon */}
              {activeFlashpoint && (
                <g
                  className="cursor-pointer"
                  onClick={() => onTuneInToTactical(activeFlashpoint)}
                >
                  <circle
                    cx={activeFlashpoint.x}
                    cy={activeFlashpoint.y}
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    className="animate-ping"
                  />
                  <circle
                    cx={activeFlashpoint.x}
                    cy={activeFlashpoint.y}
                    r="22"
                    fill="rgba(239, 68, 68, 0.45)"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />
                  <text
                    x={activeFlashpoint.x}
                    y={activeFlashpoint.y - 50}
                    textAnchor="middle"
                    fill="#fca5a5"
                    fontSize="13"
                    fontWeight="bold"
                    letterSpacing="2"
                    fontFamily="'Orbitron', sans-serif"
                  >
                    ⚡ ACTIVE CLASH: {activeFlashpoint.sectorName.toUpperCase()}
                  </text>
                  <text
                    x={activeFlashpoint.x}
                    y={activeFlashpoint.y - 34}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="'Courier Prime', monospace"
                    fontWeight="bold"
                  >
                    {activeFlashpoint.attackerStrength} STR vs {activeFlashpoint.defenderStrength} STR • [CLICK TO TUNE IN SCOPE]
                  </text>
                </g>
              )}
            </svg>

            {/* Bottom Floating Tactical Intercept Drawer */}
            {activeFlashpoint && (
              <div className="absolute bottom-4 left-4 right-4 bg-[#1f2923]/95 border-2 border-red-500 p-3 shadow-2xl backdrop-blur flex items-center justify-between z-20 rounded-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-red-950 border border-red-500 flex items-center justify-center text-red-400 animate-pulse">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-space font-bold text-red-300 flex items-center gap-2">
                      <span>FLASHPOINT ENGAGEMENT IN PROGRESS: {activeFlashpoint.sectorName.toUpperCase()}</span>
                      <span className="text-[9px] px-2 py-0.5 bg-red-950 text-red-200 border border-red-700">
                        EST. DURATION: 4 HRS
                      </span>
                    </div>
                    <div className="text-[11px] font-teletype text-neutral-300 mt-0.5">
                      Casualties: {activeFlashpoint.casualtiesAttacker + activeFlashpoint.casualtiesDefender} | Armor Lost: {activeFlashpoint.armorLostAttacker + activeFlashpoint.armorLostDefender} | Air Sorties Active
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AnnunciatorButton
                    label="GM AUTO-RESOLVE"
                    sublabel="REFEREE ARBITRATION"
                    active={true}
                    color="blue"
                    onClick={() => onAutoResolveBattle?.(activeFlashpoint)}
                  />

                  <AnnunciatorButton
                    label="WAR DISPATCH"
                    sublabel="MORNING WIRE"
                    active={true}
                    color="orange"
                    onClick={() => onOpenNewspaper(activeFlashpoint)}
                  />

                  <AnnunciatorButton
                    label="TUNE IN SCOPE"
                    sublabel="RADAR PERISCOPE"
                    active={true}
                    color="red"
                    onClick={() => onTuneInToTactical(activeFlashpoint)}
                    className="scale-105"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Physical Control Deck & Dossiers (Bakelite Ivory & Seafoam Chassis) */}
        <div className="w-[420px] chassis-grey flex flex-col overflow-hidden border-l-4 border-[#242b32]">
          {/* Top VU Meter Cluster: Global Tension & Strike Readiness */}
          <div className="p-3 bg-[#242a30] border-b-2 border-[#1c2229] flex items-center justify-around gap-2 shadow-inner">
            <VUMeter
              value={avgGlobalTension}
              label="GLOBAL TENSION"
              unit="%"
              dangerThreshold={75}
              warningThreshold={50}
              width={140}
              height={85}
            />
            <VUMeter
              value={strikeReadiness}
              label="STRIKE READINESS"
              unit="%"
              dangerThreshold={80}
              warningThreshold={55}
              width={140}
              height={85}
            />
          </div>

          {/* Tab Selector Buttons */}
          <div className="grid grid-cols-5 bg-[#2d343c] border-b border-[#1c2229]">
            <button
              onClick={() => setActiveTab('DOSSIERS')}
              className={`py-2 text-[10px] font-space font-bold transition-all text-center ${
                activeTab === 'DOSSIERS'
                  ? 'bg-[#3c4550] text-[#86efac] border-b-2 border-emerald-400 shadow-inner'
                  : 'text-neutral-400 hover:bg-[#343d46]'
              }`}
            >
              DOSSIERS
            </button>
            <button
              onClick={() => setActiveTab('DIPLOMACY')}
              className={`py-2 text-[10px] font-space font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'DIPLOMACY'
                  ? 'bg-[#3c4550] text-[#93c5fd] border-b-2 border-blue-400 shadow-inner'
                  : 'text-neutral-400 hover:bg-[#343d46]'
              }`}
            >
              <span>DIPLOMACY</span>
              {((diplomaticLedger?.envoys || []).filter(e => e.status === 'IN_TRANSIT').length + (diplomaticLedger?.activeOps || []).filter(o => o.status === 'INFILTRATING').length > 0) && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('REPAIRS')}
              className={`py-2 text-[10px] font-space font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'REPAIRS'
                  ? 'bg-[#3c4550] text-[#fcd34d] border-b-2 border-amber-400 shadow-inner'
                  : 'text-neutral-400 hover:bg-[#343d46]'
              }`}
            >
              <span>REPAIRS</span>
              {units.some(u => (u.components?.hull ?? 100) < 65 || (u.components?.engine ?? 100) < 65 || (u.components?.weapons ?? 100) < 65 || u.isRetreating) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('GM_ARBITRATION')}
              className={`py-2 text-[10px] font-space font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'GM_ARBITRATION'
                  ? 'bg-[#3c4550] text-[#f472b6] border-b-2 border-pink-400 shadow-inner'
                  : 'text-neutral-400 hover:bg-[#343d46]'
              }`}
            >
              <span>GM REF</span>
              {Boolean(gamemasterReport || activeFlashpoint) && (
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('TELETYPE')}
              className={`py-2 text-[10px] font-space font-bold transition-all text-center ${
                activeTab === 'TELETYPE'
                  ? 'bg-[#3c4550] text-[#86efac] border-b-2 border-emerald-400 shadow-inner'
                  : 'text-neutral-400 hover:bg-[#343d46]'
              }`}
            >
              WIRE
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === 'DOSSIERS' ? (
              <div className="space-y-3">
                <div className="text-[10px] font-space uppercase font-bold text-[#b4c4b2] tracking-wider">
                  Select Commander Profile:
                </div>

                {/* 4 Commander Selector Tiles */}
                <div className="grid grid-cols-2 gap-2">
                  {(['loyalists', 'rebels', 'coalition', 'volskan'] as FactionId[]).map(fId => {
                    const cmd = warRoom.commanders[fId];
                    const isSel = selectedCommander === fId;
                    return (
                      <button
                        key={fId}
                        onClick={() => setSelectedCommander(fId)}
                        className={`p-2 text-left border-2 rounded transition-all ${
                          isSel
                            ? 'bg-[#29382f] border-emerald-500 text-white shadow-md'
                            : 'bg-[#1e2621] border-[#36443a] text-neutral-400 hover:bg-[#253028]'
                        }`}
                      >
                        <div className="text-[9px] font-space uppercase text-[#a7f3d0]">{fId}</div>
                        <div className="font-space font-bold text-[11px] truncate text-[#f1f5f9]">{cmd.name}</div>
                        <div className="text-[9px] font-industrial text-amber-400 truncate">{cmd.title}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Commander Detailed Dossier Card */}
                {(() => {
                  const cmd = warRoom.commanders[selectedCommander];
                  return (
                    <div className="p-3.5 bg-[#253028] border-2 border-[#3d4d41] rounded shadow-md space-y-2.5">
                      <div className="flex justify-between items-start border-b border-[#3c4c40] pb-2">
                        <div>
                          <div className="text-[10px] text-[#93a695] uppercase font-space">{cmd.rank}</div>
                          <div className="text-sm font-space font-bold text-[#86efac]">{cmd.name}</div>
                          <div className="text-[10px] text-amber-300 font-bold font-industrial">{cmd.title}</div>
                        </div>
                        <Award className="w-5 h-5 text-amber-400" />
                      </div>

                      <div className="text-[11px] italic font-broadsheet text-[#f0ebe1] bg-[#1a231d] p-2.5 rounded border-l-4 border-amber-600">
                        &ldquo;{cmd.quote}&rdquo;
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="font-space font-bold text-[#94a896] uppercase text-[9px]">Psychological Assessment:</div>
                        <p className="text-[#d8cfbe] font-industrial leading-relaxed">{cmd.psychologicalProfile}</p>
                      </div>

                      {/* Tactical Doctrine Ratings */}
                      <div className="pt-2 border-t border-[#3c4c40] grid grid-cols-2 gap-2 text-xs font-space">
                        <div>
                          <span className="text-[#88998a] text-[9px]">Aggression: </span>
                          <span className="font-bold text-emerald-400">{Math.round(cmd.doctrine.attackBonus * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-[#88998a] text-[9px]">Defense: </span>
                          <span className="font-bold text-sky-400">{Math.round(cmd.doctrine.defenseBonus * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-[#88998a] text-[9px]">Retreat: </span>
                          <span className="font-bold text-amber-400">{Math.round(cmd.doctrine.retreatThreshold * 100)}% HP</span>
                        </div>
                        <div>
                          <span className="text-[#88998a] text-[9px]">Treaty: </span>
                          <span className="font-bold text-purple-400">{Math.round(cmd.doctrine.treatyWillingness * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Superpower Homefront Morale Meters */}
                <div className="p-3 bg-[#253028] border-2 border-[#3d4d41] rounded shadow-md space-y-2">
                  <div className="text-[10px] font-space font-bold text-[#d1fae5] flex justify-between items-center">
                    <span>SUPERPOWER HOMEFRONT STABILITY</span>
                    <Users className="w-4 h-4 text-[#a7f3d0]" />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-space mb-0.5">
                      <span className="text-sky-300">Coalition Domestic Support:</span>
                      <span className="font-bold text-white">{Math.round(warRoom.homefrontMorale.coalition)}%</span>
                    </div>
                    <div className="w-full bg-[#161f19] h-2 rounded-sm border border-[#37493d] overflow-hidden">
                      <div
                        className={`h-full ${warRoom.homefrontMorale.coalition < 50 ? 'bg-red-500' : 'bg-sky-500'}`}
                        style={{ width: `${warRoom.homefrontMorale.coalition}%` }}
                      />
                    </div>
                    {warRoom.antiWarProtestsActive.coalition && (
                      <div className="text-[9px] font-space text-red-400 font-bold mt-1">
                        ⚠ STUDENT ANTI-WAR PROTESTS IN DC • REINFORCEMENTS RESTRICTED
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-space mb-0.5">
                      <span className="text-red-400">Volskan Domestic Stability:</span>
                      <span className="font-bold text-white">{Math.round(warRoom.homefrontMorale.volskan)}%</span>
                    </div>
                    <div className="w-full bg-[#161f19] h-2 rounded-sm border border-[#37493d] overflow-hidden">
                      <div
                        className={`h-full ${warRoom.homefrontMorale.volskan < 50 ? 'bg-red-500' : 'bg-red-600'}`}
                        style={{ width: `${warRoom.homefrontMorale.volskan}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Third-Bloc Unification Action */}
                {!unifiedState ? (
                  <button
                    onClick={onTriggerUnification}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 border-2 border-emerald-400 text-white font-space text-xs font-bold flex items-center justify-center gap-2 rounded shadow-md transition-all cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-white" />
                    <span>DECLARE NON-ALIGNED UNIFICATION ACCORD</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-emerald-950 border-2 border-emerald-500 text-xs font-space text-emerald-300 rounded shadow">
                    ★ THIRD BLOC SOVEREIGN STATE DECLARED: 48H FOREIGN WITHDRAWAL ENFORCED.
                  </div>
                )}
              </div>
            ) : activeTab === 'DIPLOMACY' ? (
              /* DIPLOMACY & ESPIONAGE COMMAND CENTER */
              <div className="space-y-3 font-industrial">
                {/* 1. Geopolitical Phase & Ceasefire Status Banner */}
                <div className="p-2.5 bg-[#141d16] border-2 border-blue-600/70 rounded shadow-md">
                  <div className="flex items-center justify-between border-b border-blue-900/60 pb-1.5 mb-2">
                    <span className="text-xs font-space font-bold text-blue-300 flex items-center gap-1.5">
                      <Handshake className="w-4 h-4 text-blue-400" />
                      DIPLOMATIC CRISIS & ESCALATION PROTOCOL
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 font-mono font-bold uppercase rounded border ${
                      theaterPhase === 'DIPLOMATIC_CRISIS'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-600'
                        : 'bg-red-950/80 text-red-300 border-red-600 animate-pulse'
                    }`}>
                      {theaterPhase === 'DIPLOMATIC_CRISIS' ? 'COLD WAR STANDOFF (PRE-WAR)' : 'TOTAL WAR MOBILIZATION'}
                    </span>
                  </div>

                  <p className="text-[10px] text-neutral-300 leading-relaxed font-teletype bg-[#0a100c] p-2 border border-[#243328] rounded">
                    {theaterPhase === 'DIPLOMATIC_CRISIS'
                      ? 'Pre-War Demarcation Rules active. Border patrols are ordered to hold fire across the river. Factions resolve disputes through envoy delegations, covert intelligence gathering, and treaty negotiations.'
                      : 'Emergency mobilization active. Demarcation rules revoked; all field armies and strike wings are authorized to engage hostile targets at will.'}
                  </p>

                  <div className="mt-2 flex items-center justify-between pt-1 border-t border-[#243328]">
                    <div className="text-[10px] font-space text-amber-300">
                      Tension Meter: <span className="font-bold">{diplomaticLedger?.crisisTensionLevel ?? avgGlobalTension}%</span>
                    </div>
                    {onToggleTheaterPhase && (
                      <button
                        onClick={onToggleTheaterPhase}
                        className={`py-1 px-2.5 text-[10px] font-space font-bold rounded border transition-all cursor-pointer ${
                          theaterPhase === 'DIPLOMATIC_CRISIS'
                            ? 'bg-red-900/80 hover:bg-red-800 text-white border-red-500'
                            : 'bg-blue-900/80 hover:bg-blue-800 text-blue-100 border-blue-500'
                        }`}
                      >
                        {theaterPhase === 'DIPLOMATIC_CRISIS'
                          ? '⚡ ESCALATE CRISIS TO ACTIVE WAR'
                          : '🕊 ENFORCE EMERGENCY CEASEFIRE DETENTE'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Dispatch Diplomatic Envoy Delegation */}
                <div className="p-2.5 bg-[#17201a] border border-[#304235] rounded space-y-2">
                  <div className="text-[10px] font-space font-bold text-amber-300 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                      DISPATCH DIPLOMATIC ENVOY
                    </span>
                    <span className="text-[8px] text-neutral-400 font-mono">AUTONOMOUS EMBASSY COURIER</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-[9px] text-neutral-400 block mb-0.5">Sponsoring Faction:</label>
                      <select
                        value={envoyFrom}
                        onChange={(e) => setEnvoyFrom(e.target.value as FactionId)}
                        className="w-full bg-[#0d140f] border border-[#304235] text-[#e2e8f0] p-1 text-[10px] rounded font-space"
                      >
                        <option value="loyalists">San Pietro Loyalists</option>
                        <option value="rebels">Sierra Liberation Front</option>
                        <option value="coalition">Atlantic Coalition</option>
                        <option value="volskan">Volskan Advisory Command</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-400 block mb-0.5">Target Faction:</label>
                      <select
                        value={envoyTo}
                        onChange={(e) => setEnvoyTo(e.target.value as FactionId)}
                        className="w-full bg-[#0d140f] border border-[#304235] text-[#e2e8f0] p-1 text-[10px] rounded font-space"
                      >
                        <option value="coalition">Atlantic Coalition</option>
                        <option value="volskan">Volskan Advisory Command</option>
                        <option value="loyalists">San Pietro Loyalists</option>
                        <option value="rebels">Sierra Liberation Front</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-neutral-400 block mb-0.5">Mission Accord Type:</label>
                    <select
                      value={envoyType}
                      onChange={(e) => setEnvoyType(e.target.value as EnvoyType)}
                      className="w-full bg-[#0d140f] border border-[#304235] text-amber-300 p-1 text-[10px] rounded font-space font-bold"
                    >
                      <option value="NON_AGGRESSION_TREATY">Non-Aggression Accord (Demarcation Line Respect)</option>
                      <option value="CONCILIATION_OFFER">Conciliation & Tension De-escalation (-25 Tension)</option>
                      <option value="DEFENSIVE_ALLIANCE">Mutual Defense Pact (Joint Coalition Stance)</option>
                      <option value="ECONOMIC_TRADE_PACT">Bilateral Fuel & Spare Parts Barter (+15 Fuel)</option>
                      <option value="DEMILITARIZED_BUFFER_ZONE">Establish Demilitarized River Corridor</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-neutral-400 block mb-0.5">Custom Accord Protocol (Optional):</label>
                    <input
                      type="text"
                      placeholder="e.g. Guarantee heavy artillery fallback 1500m from Delta Bridge"
                      value={customTerms}
                      onChange={(e) => setCustomTerms(e.target.value)}
                      className="w-full bg-[#0d140f] border border-[#304235] text-neutral-200 p-1 text-[10px] rounded font-teletype"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (onSendEnvoy && envoyFrom !== envoyTo) {
                        onSendEnvoy(envoyFrom, envoyTo, envoyType, customTerms || undefined);
                        setCustomTerms('');
                      }
                    }}
                    disabled={envoyFrom === envoyTo}
                    className="w-full py-1.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 border border-blue-500 text-white font-space text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span>DISPATCH ENVOY DELEGATION</span>
                  </button>

                  {/* Active Envoys in Transit */}
                  {Array.isArray(diplomaticLedger?.envoys) && diplomaticLedger.envoys.length > 0 && (
                    <div className="pt-2 border-t border-[#25362a] space-y-1">
                      <div className="text-[9px] font-space text-neutral-400 font-bold uppercase">
                        Active Envoy Missions In Transit:
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {diplomaticLedger.envoys.map((env) => (
                          <div
                            key={env.id}
                            className="p-1.5 bg-[#0e1711] border border-[#2d4233] text-[9px] font-mono rounded flex justify-between items-center"
                          >
                            <div>
                              <span className="text-amber-300 font-bold uppercase">{env.fromFaction}</span>
                              <span className="text-neutral-400"> → </span>
                              <span className="text-blue-300 font-bold uppercase">{env.toFaction}</span>
                              <div className="text-[8px] text-neutral-400">{env.type.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-1 py-0.5 border text-[7px] font-bold ${
                                env.status === 'IN_TRANSIT' ? 'border-amber-600 text-amber-300 bg-amber-950/40' :
                                env.status === 'ACCEPTED' ? 'border-emerald-600 text-emerald-300 bg-emerald-950/40' :
                                'border-red-600 text-red-300 bg-red-950/40'
                              }`}>
                                {env.status}
                              </span>
                              <div className="text-[8px] text-neutral-400 mt-0.5">ETA: {Math.max(1, Math.round(env.etaSeconds - ((simTick - env.initiatedTick) / 2)))}s</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Treaties Registry & Instant Treaty Break */}
                <div className="p-2.5 bg-[#17201a] border border-[#304235] rounded space-y-2">
                  <div className="text-[10px] font-space font-bold text-emerald-300 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      BILATERAL RELATIONS & TREATIES
                    </span>
                    <span className="text-[8px] text-neutral-400 font-mono">ONE-CLICK ABROGATION</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { a: 'loyalists', b: 'rebels', label: 'Loyalists — Sierra Rebels' },
                      { a: 'loyalists', b: 'coalition', label: 'Loyalists — Atlantic Coalition' },
                      { a: 'coalition', b: 'volskan', label: 'Atlantic Coalition — Volskan Command' },
                      { a: 'rebels', b: 'volskan', label: 'Sierra Rebels — Volskan Command' }
                    ].map((pair) => {
                      const relKey = [pair.a, pair.b].sort().join('::');
                      const rel = diplomaticLedger?.relations?.[relKey];
                      const tension = rel ? rel.tension : 35;
                      const status = rel ? rel.status : 'COLD_WAR_TENSION';
                      const treaties = rel?.activeTreaties || [];

                      return (
                        <div key={relKey} className="p-2 bg-[#0f1712] border border-[#2b3c30] rounded space-y-1">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-space font-bold text-neutral-200">{pair.label}</span>
                            <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase rounded border ${
                              status === 'PROXY_ALLIANCE' ? 'border-emerald-600 text-emerald-300 bg-emerald-950/40' :
                              status === 'CEASEFIRE' ? 'border-blue-600 text-blue-300 bg-blue-950/40' :
                              status === 'TOTAL_WAR' ? 'border-red-600 text-red-300 bg-red-950/40' :
                              'border-amber-600 text-amber-300 bg-amber-950/40'
                            }`}>
                              {status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[9px] font-mono">
                            <span className="text-neutral-400">Tension:</span>
                            <div className="flex-1 bg-[#1a261e] h-1.5 rounded overflow-hidden">
                              <div
                                className={`h-full ${tension < 0 ? 'bg-emerald-500' : tension > 50 ? 'bg-red-500' : 'bg-amber-400'}`}
                                style={{ width: `${Math.max(5, Math.min(100, (tension + 100) / 2))}%` }}
                              />
                            </div>
                            <span className="text-neutral-300">{tension}</span>
                          </div>

                          {/* Active Treaties with Break Button */}
                          {treaties.length > 0 ? (
                            <div className="pt-1 space-y-1">
                              {treaties.map((tName, tIdx) => (
                                <div
                                  key={tIdx}
                                  className="flex justify-between items-center p-1 bg-[#16221a] border border-[#344d3b] text-[9px] font-mono text-emerald-300 rounded"
                                >
                                  <span className="flex items-center gap-1 truncate">
                                    <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="truncate">{tName}</span>
                                  </span>
                                  <button
                                    onClick={() => onBreakTreaty?.(pair.a as FactionId, pair.b as FactionId, tName)}
                                    className="px-1.5 py-0.5 bg-red-900 hover:bg-red-800 border border-red-500 text-red-100 text-[8px] font-bold rounded cursor-pointer shrink-0 ml-1"
                                    title="Break this treaty, escalating crisis and triggering diplomatic condemnation"
                                  >
                                    BREAK TREATY
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[8px] text-neutral-400 italic">No formal accords in effect.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Covert Espionage Operations (CIA / KGB / DIS) */}
                <div className="p-2.5 bg-[#17201a] border border-[#304235] rounded space-y-2">
                  <div className="text-[10px] font-space font-bold text-red-400 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-red-400" />
                      COVERT ESPIONAGE & INTEL OPERATIONS
                    </span>
                    <span className="text-[8px] text-neutral-400 font-mono">CIA / KGB / DIS</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <label className="text-[9px] text-neutral-400 block mb-0.5">Sponsor Agency:</label>
                      <select
                        value={covertSponsor}
                        onChange={(e) => setCovertSponsor(e.target.value as FactionId)}
                        className="w-full bg-[#0d140f] border border-[#304235] text-[#e2e8f0] p-1 text-[10px] rounded font-space"
                      >
                        <option value="coalition">Atlantic (CIA Special Activities)</option>
                        <option value="volskan">Volskan (KGB 1st Chief Directorate)</option>
                        <option value="loyalists">Loyalists (San Pietro D.I.S.)</option>
                        <option value="rebels">Rebels (Liberation Partisans)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-neutral-400 block mb-0.5">Target Headquarters:</label>
                      <select
                        value={covertTarget}
                        onChange={(e) => setCovertTarget(e.target.value as FactionId)}
                        className="w-full bg-[#0d140f] border border-[#304235] text-[#e2e8f0] p-1 text-[10px] rounded font-space"
                      >
                        <option value="volskan">Volskan Advisory Command</option>
                        <option value="rebels">Sierra Liberation Front</option>
                        <option value="loyalists">San Pietro Loyalists</option>
                        <option value="coalition">Atlantic Coalition</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-neutral-400 block mb-0.5">Covert Directive:</label>
                    <select
                      value={covertType}
                      onChange={(e) => setCovertType(e.target.value as CovertOpType)}
                      className="w-full bg-[#0d140f] border border-[#304235] text-red-300 p-1 text-[10px] rounded font-space font-bold"
                    >
                      <option value="INFILTRATE_INTEL">Infiltrate Staff HQ (Expose Unit Compositions & Component Status)</option>
                      <option value="SABOTAGE_DEPOT">Demolish Repair Depot Cranes (Disable Vehicle Overhaul)</option>
                      <option value="CIPHER_DECRYPT">Break Radio Cipher (Intercept AI Movement Waypoints)</option>
                      <option value="FALSE_FLAG_INCIDENT">Stage Border Provocation (Frame Target Faction)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (onLaunchCovertOp && covertSponsor !== covertTarget) {
                        onLaunchCovertOp(covertSponsor, covertTarget, covertType);
                      }
                    }}
                    disabled={covertSponsor === covertTarget}
                    className="w-full py-1.5 bg-red-950 hover:bg-red-900 border border-red-600 text-red-100 font-space text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>AUTHORIZE CLASSIFIED OPERATION</span>
                  </button>

                  {/* Active Covert Operations */}
                  {Array.isArray(diplomaticLedger?.activeOps) && diplomaticLedger.activeOps.length > 0 && (
                    <div className="pt-2 border-t border-[#25362a] space-y-1">
                      <div className="text-[9px] font-space text-neutral-400 font-bold uppercase">
                        Current Intelligence Operations:
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {diplomaticLedger.activeOps.map((op) => (
                          <div
                            key={op.id}
                            className="p-1.5 bg-[#0e1711] border border-[#2d4233] text-[9px] font-mono rounded flex justify-between items-center"
                          >
                            <div>
                              <span className="text-red-400 font-bold uppercase">{op.sponsorFaction}</span>
                              <span className="text-neutral-400"> target </span>
                              <span className="text-amber-300 font-bold uppercase">{op.targetFaction}</span>
                              <div className="text-[8px] text-neutral-300">{op.type.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-right">
                              <span className={`px-1 py-0.5 border text-[7px] font-bold ${
                                op.status === 'INFILTRATING' ? 'border-amber-500 text-amber-300 bg-amber-950/40' :
                                op.status === 'SUCCESS' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40' :
                                'border-red-500 text-red-300 bg-red-950/40'
                              }`}>
                                {op.status} ({Math.round(op.progress)}%)
                              </span>
                              <div className="text-[8px] text-neutral-400 mt-0.5">Success Chance: {op.successChance}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intercepted Enemy Intelligence Dossiers */}
                  <div className="pt-2 border-t border-[#25362a] space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-space text-neutral-300">
                      <span className="font-bold text-amber-300 uppercase">INTERCEPTED ENEMY INTELLIGENCE DOSSIER</span>
                      <select
                        value={selectedIntelTarget}
                        onChange={(e) => setSelectedIntelTarget(e.target.value as FactionId)}
                        className="bg-[#0b120d] border border-[#2b3c30] text-[9px] text-[#e2e8f0] px-1 py-0.5 rounded"
                      >
                        <option value="volskan">Volskan Command</option>
                        <option value="rebels">Sierra Rebels</option>
                        <option value="loyalists">Loyalists</option>
                        <option value="coalition">Atlantic Coalition</option>
                      </select>
                    </div>

                    {(() => {
                      const targetUnits = units.filter(u => u.factionId === selectedIntelTarget);
                      const dossierKey = `${covertSponsor}::${selectedIntelTarget}`;
                      const dossier = diplomaticLedger?.intelDossiers?.[dossierKey];
                      const totalCombatReady = targetUnits.filter(u => u.strength > 0).length;
                      const damagedCount = targetUnits.filter(u => (u.components?.hull ?? 100) < 60 || (u.components?.engine ?? 100) < 60).length;

                      return (
                        <div className="p-2 bg-[#0b120d] border border-[#27382c] rounded text-[9px] font-mono space-y-1">
                          <div className="flex justify-between text-neutral-300">
                            <span>Detected Field Units:</span>
                            <span className="text-amber-300 font-bold">{totalCombatReady} Brigades / Wings</span>
                          </div>
                          <div className="flex justify-between text-neutral-300">
                            <span>Damaged / Crippled Battalions:</span>
                            <span className="text-red-400 font-bold">{damagedCount} in need of repair</span>
                          </div>
                          <div className="flex justify-between text-neutral-300">
                            <span>Intelligence Coverage:</span>
                            <span className="text-emerald-300 font-bold">{dossier?.activeRecon ? 'ACTIVE AGENT INFILTRATION' : 'PASSIVE RADIO INTERCEPTS'}</span>
                          </div>
                          <div className="text-[8px] text-neutral-400 italic pt-1 border-t border-[#1c2920]">
                            &quot;{dossier?.interceptedOrders?.[0] || 'Holding defensive chokepoints along river demarcation zone. Awaiting supreme command directives.'}&quot;
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : activeTab === 'REPAIRS' ? (
              /* UNIT DAMAGE & REPAIR SYSTEM */
              <div className="space-y-3 font-industrial">
                {/* 1. Faction Designated Repair Depots */}
                <div className="p-2.5 bg-[#17201a] border-2 border-amber-600/70 rounded shadow-md space-y-2">
                  <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5">
                    <span className="text-xs font-space font-bold text-amber-300 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      DESIGNATED REPAIR ZONES & ARSENAL DEPOTS
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-200 border border-amber-700 font-mono">
                      OVERHAUL LOGISTICS
                    </span>
                  </div>

                  <p className="text-[10px] text-neutral-300 leading-relaxed font-teletype bg-[#0a100c] p-2 border border-[#243328] rounded">
                    Field formations suffer discrete damage to <span className="text-amber-300 font-bold">Hull Armor</span>, <span className="text-red-400 font-bold">Engine & Transmission</span>, and <span className="text-cyan-300 font-bold">Weapon Turrets</span>. Damaged units autonomously fall back to their designated home depot to restore component health and fuel.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {repairZones.map((rz) => {
                      const dockedUnits = units.filter(u => u.repairZoneId === rz.id && u.isUnderRepair);
                      return (
                        <div
                          key={rz.id}
                          className={`p-2 rounded border ${
                            rz.isSabotaged
                              ? 'bg-red-950/40 border-red-700 text-red-200'
                              : 'bg-[#121c15] border-[#2f4234] text-neutral-200'
                          }`}
                        >
                          <div className="text-[9px] font-space font-bold uppercase text-amber-300 truncate">
                            {rz.name}
                          </div>
                          <div className="text-[8px] text-neutral-400 font-mono">
                            Faction: <span className="uppercase text-neutral-200 font-bold">{rz.factionId}</span>
                          </div>
                          <div className="text-[8px] text-neutral-400 font-mono flex justify-between mt-1">
                            <span>Rate: +{rz.repairRate}%/s</span>
                            <span className={rz.isSabotaged ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {rz.isSabotaged ? 'SABOTAGED' : 'OPERATIONAL'}
                            </span>
                          </div>
                          <div className="text-[8px] text-cyan-300 font-mono mt-0.5">
                            Docked Units: {dockedUnits.length} / {rz.capacity}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Formations Detailed Component Integrity & Depot Retreat */}
                <div className="p-2.5 bg-[#17201a] border border-[#304235] rounded space-y-2">
                  <div className="text-[10px] font-space font-bold text-neutral-200 uppercase flex items-center justify-between">
                    <span>UNIT COMPONENT DAMAGE & RETREAT ORDERS</span>
                    <span className="text-[8px] text-neutral-400 font-mono">{units.length} FORMATIONS ON MAP</span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {units.map((u) => {
                      const hull = Math.round(u.components?.hull ?? u.strength);
                      const engine = Math.round(u.components?.engine ?? 100);
                      const weapons = Math.round(u.components?.weapons ?? 100);
                      const isDamaged = hull < 70 || engine < 70 || weapons < 70;

                      return (
                        <div
                          key={u.id}
                          className={`p-2 rounded border space-y-1.5 transition-all ${
                            u.isUnderRepair
                              ? 'bg-emerald-950/30 border-emerald-600'
                              : u.isRetreating
                              ? 'bg-red-950/30 border-red-600'
                              : isDamaged
                              ? 'bg-amber-950/20 border-amber-700'
                              : 'bg-[#101712] border-[#293a2e]'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px]">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-space font-bold text-white truncate">{u.name}</span>
                              <span className="text-[8px] px-1 py-0.2 bg-[#1b261f] text-neutral-300 font-mono uppercase rounded">
                                {u.type}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {u.isUnderRepair && (
                                <span className="text-[8px] px-1 py-0.5 bg-emerald-900 border border-emerald-500 text-emerald-200 font-mono font-bold animate-pulse">
                                  🛠 IN OVERHAUL
                                </span>
                              )}
                              {u.isRetreating && !u.isUnderRepair && (
                                <span className="text-[8px] px-1 py-0.5 bg-red-900 border border-red-500 text-red-200 font-mono font-bold">
                                  RETREATING
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Components Progress Bars */}
                          <div className="grid grid-cols-3 gap-2 text-[8px] font-mono">
                            {/* Hull */}
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-neutral-400">
                                <span>HULL</span>
                                <span className={hull < 30 ? 'text-red-400 font-bold' : hull < 60 ? 'text-amber-400' : 'text-emerald-400'}>
                                  {hull}%
                                </span>
                              </div>
                              <div className="w-full bg-[#1b261f] h-1.5 rounded overflow-hidden">
                                <div
                                  className={`h-full ${hull < 30 ? 'bg-red-500' : hull < 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${hull}%` }}
                                />
                              </div>
                            </div>

                            {/* Engine */}
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-neutral-400">
                                <span>ENGINE</span>
                                <span className={engine < 35 ? 'text-red-400 font-bold' : engine < 65 ? 'text-amber-400' : 'text-emerald-400'}>
                                  {engine}%
                                </span>
                              </div>
                              <div className="w-full bg-[#1b261f] h-1.5 rounded overflow-hidden">
                                <div
                                  className={`h-full ${engine < 35 ? 'bg-red-500' : engine < 65 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${engine}%` }}
                                />
                              </div>
                            </div>

                            {/* Weapons */}
                            <div className="space-y-0.5">
                              <div className="flex justify-between text-neutral-400">
                                <span>WEAPONS</span>
                                <span className={weapons < 35 ? 'text-red-400 font-bold' : weapons < 65 ? 'text-amber-400' : 'text-emerald-400'}>
                                  {weapons}%
                                </span>
                              </div>
                              <div className="w-full bg-[#1b261f] h-1.5 rounded overflow-hidden">
                                <div
                                  className={`h-full ${weapons < 35 ? 'bg-red-500' : weapons < 65 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                  style={{ width: `${weapons}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Action Directives */}
                          <div className="flex justify-between items-center pt-1 border-t border-[#1d2a21]">
                            <div className="text-[8px] text-neutral-400 font-mono truncate mr-2">
                              {u.currentOrder?.orderText || 'Conducting patrol along designated sectors'}
                            </div>
                            {onOrderRetreatToDepot && !u.isUnderRepair && (
                              <button
                                onClick={() => onOrderRetreatToDepot(u.id)}
                                className="px-2 py-0.5 bg-amber-900/80 hover:bg-amber-800 border border-amber-600 text-amber-100 text-[8px] font-space font-bold rounded cursor-pointer shrink-0"
                              >
                                🛠 RETREAT TO DEPOT
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : activeTab === 'GM_ARBITRATION' ? (
              /* Impartial Gamemaster Referee Desk */
              <div className="space-y-3 font-industrial">
                <div className="p-2.5 bg-[#17201a] border-2 border-amber-600/70 rounded shadow-md">
                  <div className="flex items-center justify-between border-b border-amber-800/60 pb-1.5 mb-2">
                    <span className="text-xs font-space font-bold text-amber-300 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-amber-400" />
                      IMPARTIAL GAMEMASTER REFEREE
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-200 border border-amber-700 font-mono">
                      GEMINI ARBITRATION
                    </span>
                  </div>

                  <div className="text-[11px] font-teletype text-[#e2e8f0] leading-relaxed bg-[#0c120e] p-2 border border-[#2b3d30] rounded">
                    {gamemasterReport?.refereeArbitration ||
                      activeFlashpoint?.refereeCommentary ||
                      'Impartial Gamemaster monitoring 1v1 discrete engagements. Morale checks, flanking realism, and rout arbitration enforced per Cold War engagement rules.'}
                  </div>
                </div>

                {/* Stance & Coherence Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#1b221d] border border-red-800/80 rounded">
                    <div className="text-[9px] font-space text-red-400 font-bold uppercase">ATTACKER COHERENCE</div>
                    <div className="text-[11px] font-space font-bold text-red-200 mt-0.5 truncate">
                      {gamemasterReport?.attacker?.corpsName || activeFlashpoint?.attackerCorpsName || 'SIERRA VANGUARD'}
                    </div>
                    <div className="text-[10px] text-amber-300/90 mt-1 font-mono">
                      Stance: {gamemasterReport?.attacker?.stance || 'FLANKING_PINCER'}
                    </div>
                    <div className="text-[9px] text-neutral-300 font-mono">
                      Status: {gamemasterReport?.attacker?.coherence || 'ORDERLY_ASSAULT'}
                    </div>
                  </div>

                  <div className="p-2 bg-[#1b221d] border border-blue-800/80 rounded">
                    <div className="text-[9px] font-space text-blue-400 font-bold uppercase">DEFENDER COHERENCE</div>
                    <div className="text-[11px] font-space font-bold text-blue-200 mt-0.5 truncate">
                      {gamemasterReport?.defender?.corpsName || activeFlashpoint?.defenderCorpsName || 'CENTAUR ARMORED'}
                    </div>
                    <div className="text-[10px] text-amber-300/90 mt-1 font-mono">
                      Stance: {gamemasterReport?.defender?.stance || 'DEFENSIVE_HOLD'}
                    </div>
                    <div className="text-[9px] text-neutral-300 font-mono">
                      Status: {gamemasterReport?.defender?.coherence || 'DUG_IN_FORTIFIED'}
                    </div>
                  </div>
                </div>

                {/* Rout & Wavering Status Checks */}
                <div className="p-2.5 bg-[#17201a] border border-[#304235] rounded">
                  <div className="text-[10px] font-space font-bold text-amber-300 mb-1.5 uppercase flex items-center justify-between">
                    <span>UNIT MORALE & ROUT ARBITRATION</span>
                    <span className="text-[8px] opacity-75 font-mono">WAVERING &lt; 25%</span>
                  </div>

                  {Array.isArray(gamemasterReport?.routStatus) && gamemasterReport.routStatus.length > 0 ? (
                    <div className="space-y-1.5">
                      {gamemasterReport.routStatus.map((rs: any, idx: number) => (
                        <div key={idx} className="p-1.5 bg-red-950/50 border border-red-800 text-[10px] font-mono text-red-200 rounded">
                          <span className="font-bold text-red-300">[{rs.status}] </span>
                          <span className="uppercase text-amber-300">{rs.unitId}: </span>
                          <span>{rs.reason}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-emerald-400/90 italic">
                      ✓ All frontline divisions maintaining tactical coherence. No wavering units broken off the map.
                    </div>
                  )}
                </div>

                {/* Decisive Verdict & Fallout */}
                <div className="p-2.5 bg-[#1f2923] border-2 border-emerald-600/80 rounded shadow">
                  <div className="text-[10px] font-space font-bold text-emerald-300 uppercase">
                    CAMPAIGN FALLOUT & VERDICT
                  </div>
                  <div className="text-xs font-space font-bold text-white mt-1">
                    {gamemasterReport?.verdict || activeFlashpoint?.verdict || 'STATUS: CLASH IN PROGRESS'}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-300 mt-1">
                    Concluded clashes result in 60px division fallback on the Big Board, control transfer of the bridgehead/refinery, and instant lithograph newspaper publication.
                  </div>
                </div>

                {/* Quick Action Buttons */}
                {activeFlashpoint && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => onTuneInToTactical(activeFlashpoint)}
                      className="py-2 px-2 bg-red-900 hover:bg-red-800 border border-red-500 text-white font-space text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>TUNE IN 1v1 SCOPE</span>
                    </button>
                    <button
                      onClick={() => onAutoResolveBattle?.(activeFlashpoint)}
                      className="py-2 px-2 bg-blue-900 hover:bg-blue-800 border border-blue-500 text-white font-space text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>AUTO-RESOLVE</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Perforated Teletype Ribbon */
              <TeletypeRibbon
                transmissions={transmissions}
                recentEvents={diplomaticLedger.recentEvents}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
