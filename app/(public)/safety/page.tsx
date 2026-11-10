// app/(public)/safety/page.tsx
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import {
  Flame, Car, Heart, Waves, Building2, Cloud, ShieldAlert,
  Phone, CheckCircle2, AlertCircle, FileCheck
} from 'lucide-react'

const GUIDES = [
  {
    id: 'fire',
    title: 'Fire Emergency Protocol',
    icon: Flame,
    color: 'text-red-500',
    bg: 'bg-red-50',
    steps: [
      'Sound the alarm immediately and yell "FIRE" to alert occupants.',
      'Drop to hands and knees to stay below smoke, heat, and toxic gases.',
      'Feel closed doors with the back of your hand before opening. If hot, do not open.',
      'Use stairs only — NEVER use elevators during a fire evacuation.',
      'Once outside, stay out. Call Fire dispatch (101 / 112) immediately.',
    ],
    donts: ['Do not stop to collect valuables.', 'Do not open windows unless trapped.'],
  },
  {
    id: 'road',
    title: 'Road Accident & Collision',
    icon: Car,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    steps: [
      'Turn on hazard lights and set up warning triangles 50m behind the vehicle.',
      'Check for injuries. Do not move injured persons unless immediate threat of fire/explosion exists.',
      'Call Ambulance (108 / 112) and Police (100). State exact location and number of casualties.',
      'If certified, administer basic first aid (apply pressure to heavy bleeding, keep patient warm).',
    ],
    donts: ['Do not remove a motorcyclist’s helmet unless airway is obstructed.', 'Do not give food or drink to injured persons.'],
  },
  {
    id: 'flood',
    title: 'Flood & Water Inundation',
    icon: Waves,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    steps: [
      'Move immediately to higher ground or upper floor. Avoid basements and low-lying roads.',
      'Turn off main electricity switch and gas valves before evacuating if safe to do so.',
      'Keep emergency battery radio, power banks, drinking water, and dry rations ready.',
      'Do not walk, swim, or drive through moving water. 15 cm of moving water can knock you down.',
    ],
    donts: ['Do not drive around barricades.', 'Do not touch electrical equipment if you are wet or standing in water.'],
  },
  {
    id: 'medical',
    title: 'Urgent Medical Emergency',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-50',
    steps: [
      'Assess responsiveness: Tap shoulder and shout "Are you okay?".',
      'If unresponsive and not breathing, begin chest compressions (100–120 compressions per minute).',
      'For severe bleeding, apply firm, continuous direct pressure with a clean cloth.',
      'For suspected heart attack, keep the patient calm, seated, and call 108 immediately.',
    ],
    donts: ['Do not leave an unconscious person alone.', 'Do not move someone with suspected spinal or neck injury.'],
  },
  {
    id: 'earthquake',
    title: 'Earthquake & Building Collapse',
    icon: Building2,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    steps: [
      'DROP, COVER, and HOLD ON under a sturdy table or desk.',
      'Stay away from windows, glass, outside walls, and falling lighting fixtures.',
      'If outdoors, move to an open area away from buildings, power lines, and streetlights.',
      'After shaking stops, check for gas leaks, fires, and structural damage before exiting.',
    ],
    donts: ['Do not run outside during shaking.', 'Do not light matches or turn on electrical switches in case of gas leaks.'],
  },
]

export default function SafetyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h1 className="text-3xl font-extrabold text-[#101b2d]">Safety & Preparedness Center</h1>
        <p className="text-sm text-slate-500">
          Standard operational guidance, disaster action checklists, and immediate emergency contact numbers.
        </p>
      </div>

      {/* Emergency Helpline Banner */}
      <div className="bg-[#101b2d] text-white p-6 rounded-2xl shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Police Emergency</p>
          <p className="text-2xl font-black text-white mt-1">100 / 112</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Fire Dispatch</p>
          <p className="text-2xl font-black text-red-400 mt-1">101</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Ambulance Service</p>
          <p className="text-2xl font-black text-green-400 mt-1">108</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase font-semibold">Disaster Management</p>
          <p className="text-2xl font-black text-blue-400 mt-1">1070</p>
        </div>
      </div>

      {/* Category Guides */}
      <div className="space-y-6">
        {GUIDES.map((guide) => {
          const Icon = guide.icon
          return (
            <Card key={guide.id} id={guide.id} className="scroll-mt-20">
              <CardHeader className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${guide.bg}`}>
                  <Icon size={22} className={guide.color} />
                </div>
                <h2 className="text-lg font-bold text-[#101b2d]">{guide.title}</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Immediate Action Steps:
                  </h3>
                  <ul className="space-y-2">
                    {guide.steps.map((s, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span className="font-bold text-slate-400 text-xs shrink-0 mt-0.5">
                          {idx + 1}.
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle size={14} /> What NOT to do:
                  </h3>
                  <ul className="space-y-1">
                    {guide.donts.map((d, idx) => (
                      <li key={idx} className="text-xs text-slate-600 list-disc list-inside">
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Disaster Checklist */}
      <Card className="p-6 bg-blue-50/50 border-blue-200 space-y-4">
        <h2 className="text-base font-bold text-blue-950 flex items-center gap-2">
          <FileCheck size={20} className="text-blue-600" />
          Recommended 72-Hour Disaster Preparedness Kit
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-blue-900">
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            💧 <strong>Water:</strong> 3-4 liters per person per day (min 3 days)
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            🥫 <strong>Non-perishable Food:</strong> Canned goods, energy bars, dry rations
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            🔦 <strong>Lighting:</strong> LED flashlights & extra alkaline batteries
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            🩹 <strong>First Aid Kit:</strong> Bandages, antiseptic, prescribed medications
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            🔋 <strong>Power Bank:</strong> High-capacity mobile power banks & charging cables
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-blue-100">
            📄 <strong>Documents:</strong> ID cards & insurance in waterproof zip pouch
          </div>
        </div>
      </Card>
    </div>
  )
}

