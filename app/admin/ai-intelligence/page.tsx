// app/admin/ai-intelligence/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, Layers,
  RefreshCw, CheckCircle2, ShieldAlert, Cpu
} from 'lucide-react'
import { subscribeToAllIncidents } from '@/lib/firestore'
import type { Incident } from '@/lib/types'
import { toast } from 'sonner'

export default function AdminAiIntelligencePage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  // Active AI analysis results
  const [analysisType, setAnalysisType] = useState<'patterns' | 'hotspots' | 'report_quality'>('patterns')
  const [analysisOutput, setAnalysisOutput] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    const unsub = subscribeToAllIncidents((data) => {
      setIncidents(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  async function runAiAnalysis(type: 'patterns' | 'hotspots' | 'report_quality') {
    if (incidents.length === 0) {
      toast.info('No incident data present to analyze.')
      return
    }
    setAnalysisType(type)
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidents, analysisType: type }),
      })
      const data = await res.json()
      if (data.analysis) {
        setAnalysisOutput(data.analysis)
        toast.success('AI intelligence analysis generated!')
      } else {
        toast.error('AI analysis returned no content.')
      }
    } catch {
      toast.error('AI Intelligence service unreachable.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101b2d] flex items-center gap-2">
            <Brain size={26} className="text-blue-600" />
            AI Emergency Intelligence Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Predictive pattern recognition, anomaly detection, and operational optimization powered by Groq Llama 3
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200">
          <Cpu size={14} className="text-blue-600" />
          <span>Active Dataset: {incidents.length} Real Reports</span>
        </div>
      </div>

      {/* Analysis Mode Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          hover
          className={`p-5 cursor-pointer border-2 transition-all ${
            analysisType === 'patterns' ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
          }`}
          onClick={() => runAiAnalysis('patterns')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <h3 className="font-bold text-sm text-[#101b2d]">Emergency Pattern Detection</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Identifies recurring incident types, anomalous frequency spikes, and resource demand forecasts.
          </p>
        </Card>

        <Card
          hover
          className={`p-5 cursor-pointer border-2 transition-all ${
            analysisType === 'hotspots' ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
          }`}
          onClick={() => runAiAnalysis('hotspots')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-sm text-[#101b2d]">Hotspot & Density Insights</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Synthesizes geographical hazard concentration and prioritizes unattended critical clusters.
          </p>
        </Card>

        <Card
          hover
          className={`p-5 cursor-pointer border-2 transition-all ${
            analysisType === 'report_quality' ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200'
          }`}
          onClick={() => runAiAnalysis('report_quality')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <Sparkles size={20} />
            </div>
            <h3 className="font-bold text-sm text-[#101b2d]">Operational Efficiency Audit</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Evaluates verification turnaround rates, triage accuracy, and dispatch latency.
          </p>
        </Card>
      </div>

      {/* Results Viewport */}
      <Card className="min-h-[350px]">
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600" />
            <h2 className="font-bold text-sm text-[#101b2d] capitalize">
              AI Intelligence Dossier — {analysisType.replace('_', ' ')}
            </h2>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => runAiAnalysis(analysisType)}
            loading={analyzing}
          >
            <RefreshCw size={12} /> Regenerate Analysis
          </Button>
        </CardHeader>
        <CardBody className="p-6">
          {analyzing ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">
                Llama 3 is processing {incidents.length} incident data points across categories and locations...
              </p>
            </div>
          ) : analysisOutput ? (
            <div className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed space-y-2">
              {analysisOutput}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              Select one of the analytical models above to evaluate current incident telemetry.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

