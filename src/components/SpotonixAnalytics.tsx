import { useState, useMemo } from "react";
import {
  Menu, Aperture, Plus, FileText, CheckCircle2, Navigation, Layers, Bookmark,
  ExternalLink, RotateCcw, ThumbsUp, ThumbsDown, ArrowUpRight, Search,
  Maximize2, Minus, ChevronUp, ChevronDown, CheckCircle, ShieldCheck, Link, Code, Clock, Send
} from "lucide-react";
import mockData from "../data/GME_Central_Demo_Mock_Data_v2.json";
import "./spotonix.css";

export default function SpotonixAnalytics() {
  const [tab, setTab] = useState<"result" | "interpreted">("result");
  const [sqlOpen, setSqlOpen] = useState(false);
  const [popupData, setPopupData] = useState<{ show: boolean; x: number; y: number; item: any }>({ show: false, x: 0, y: 0, item: null });
  const [selectedExampleId, setSelectedExampleId] = useState("total_residents");
  const [chatInput, setChatInput] = useState("");

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;
    const q = chatInput.toLowerCase();
    if (q.includes("program") || q.includes("largest")) {
      setSelectedExampleId("top_program");
    } else if (q.includes("leave") || q.includes("absence")) {
      setSelectedExampleId("find_residents_status");
    } else if (q.includes("graduate") || q.includes("historic")) {
      setSelectedExampleId("highest_total_programs");
    } else if (q.includes("slot") || q.includes("capacity")) {
      setSelectedExampleId("slot_allocation");
    } else if (q.includes("initial") || q.includes("accreditation")) {
      setSelectedExampleId("programs_initial_accreditation");
    } else if (q.includes("fellowship")) {
      setSelectedExampleId("active_fellowships");
    } else if (q.includes("probation")) {
      setSelectedExampleId("residents_probation");
    } else {
      setSelectedExampleId("total_residents");
    }
    setChatInput("");
  };

  const computedData = useMemo(() => {
    const activeResidents = mockData.RESIDENT.filter(r => r.status === "Active").length;
    const totalPrograms = mockData.PROGRAM.length;
    
    // Top program by active residents
    const programCounts: Record<string, number> = {};
    mockData.RESIDENT.filter(r => r.status === "Active").forEach(r => {
      programCounts[r.program_id] = (programCounts[r.program_id] || 0) + 1;
    });
    let topProgramId = "";
    let topCount = 0;
    for (const [pid, count] of Object.entries(programCounts)) {
      if (count > topCount) {
        topCount = count;
        topProgramId = pid;
      }
    }
    const topProgramName = mockData.PROGRAM.find(p => p.program_id === topProgramId)?.name || "Unknown";
  
    // Total Slots
    const totalSlots = mockData.PROGRAM.reduce((acc, p) => acc + (p.slot_count || 0), 0);
    const fellowshipSlots = mockData.PROGRAM.filter(p => p.type === "Fellowship").reduce((acc, p) => acc + (p.slot_count || 0), 0);
    const residencySlots = totalSlots - fellowshipSlots;

    return { activeResidents, totalPrograms, topCount, topProgramName, totalSlots, fellowshipSlots, residencySlots };
  }, []);

  const examples = [
    {
      id: "total_residents",
      title: "Among Active Residents Total...",
      fullTitle: "Among Active Residents Total Count By Program",
      metric: computedData.activeResidents,
      metricLabel: "total active residents",
      metric2: computedData.totalPrograms,
      metric2Label: "total programs",
      metricSub: "Active Residents (all programs combined)",
      description: `The institution totals ${computedData.activeResidents} active residents across ${computedData.totalPrograms} programs.`,
      date: "27/07/2026",
      icon: Layers,
      userQuestion: "What is total residents and total programs?",
      cardTitle: `${computedData.activeResidents} Total Residents,`,
      cardTitle2: `${computedData.totalPrograms} Programs`,
      cardSubtitle: "Total Residents, All Programs Combined",
      watchMetric: "Total Residents Across All Programs",
      explorePrompts: [
        { icon: Aperture, title: "Show me total residents over time", sub: "See if there's a trend or seasonal pattern" },
        { icon: Layers, title: "Break down total residents by program", sub: "See what's driving the total" },
        { icon: Navigation, title: "How does total residents relate to total programs", sub: "See if these metrics move together" }
      ],
      sql: `SELECT COUNT(resident_id) AS total_residents,\n       (SELECT COUNT(program_id) FROM osugme.program) AS total_programs\nFROM osugme.resident\nWHERE status = 'Active'`,
      kgCards: [
        { type: 'added', title: 'Measure Total Residents', source: 'I built this for you from model primitives.', tags: ['Calculation'] },
        { type: 'added', title: 'Total Residents Across All Programs', source: 'I built this for you from model primitives.', tags: ['Calculation', 'Aggregation', 'answer plan'] },
        { type: 'found', title: 'Total Programs Across All Departments', source: 'I found this in the Knowledge Graph.', tags: ['Calculation', 'Aggregation', 'answer plan'] }
      ]
    },
    {
      id: "top_program",
      title: "Top Programs Total Residents",
      fullTitle: "Top Programs Total Residents",
      metric: computedData.topCount,
      metricLabel: "residents in top program",
      metric2: computedData.topProgramName,
      metric2Label: "largest program",
      metricSub: "Active Residents in largest program",
      description: `The ${computedData.topProgramName} has the highest number of active residents (${computedData.topCount}) overall.`,
      date: "25/09/2026",
      icon: Layers,
      userQuestion: "Which program has the most active residents?",
      cardTitle: `${computedData.topCount} Residents`,
      cardTitle2: `in ${computedData.topProgramName}`,
      cardSubtitle: "Highest Active Resident Count by Program",
      watchMetric: "Largest Program Size",
      explorePrompts: [
        { icon: Aperture, title: "Show me the top 5 programs", sub: "See the distribution of large programs" },
        { icon: Layers, title: "Compare residency vs fellowship sizes", sub: "See program type differences" }
      ],
      sql: `SELECT p.name, COUNT(r.resident_id) as resident_count\nFROM osugme.resident r\nJOIN osugme.program p ON r.program_id = p.program_id\nWHERE r.status = 'Active'\nGROUP BY p.name\nORDER BY resident_count DESC\nLIMIT 1;`,
      kgCards: [
        { type: 'found', title: 'Measure Program Size', source: 'I found this in the Knowledge Graph.', tags: ['Calculation'] },
        { type: 'added', title: 'Rank Programs by Resident Count', source: 'I built this for you from model primitives.', tags: ['Aggregation', 'Sort', 'Limit'] }
      ]
    },
    {
      id: "slot_allocation",
      title: "Total Slots Program Category Co...",
      fullTitle: "Total Slots Program Category Comparison",
      metric: computedData.totalSlots,
      metricLabel: "total approved slots",
      metric2: computedData.residencySlots,
      metric2Label: "residency slots",
      metricSub: "Total approved complement across institution",
      description: `The institution holds ${computedData.totalSlots} total slots, with ${computedData.residencySlots} dedicated to residencies and ${computedData.fellowshipSlots} for fellowships.`,
      date: "15/09/2026",
      icon: Layers,
      userQuestion: "What is the total slot allocation between residencies and fellowships?",
      cardTitle: `${computedData.totalSlots} Total Slots,`,
      cardTitle2: `${computedData.residencySlots} Residency / ${computedData.fellowshipSlots} Fellowship`,
      cardSubtitle: "Approved Complement Category Comparison",
      watchMetric: "Total Approved Complement",
      explorePrompts: [
        { icon: Layers, title: "Break down slots by specialty", sub: "See slot distribution across specialties" },
        { icon: Aperture, title: "Compare approved slots to active residents", sub: "Check for unfilled or overfilled programs" }
      ],
      sql: `SELECT \n  SUM(slot_count) as total_slots,\n  SUM(CASE WHEN type = 'Residency' THEN slot_count ELSE 0 END) as residency_slots,\n  SUM(CASE WHEN type = 'Fellowship' THEN slot_count ELSE 0 END) as fellowship_slots\nFROM osugme.program;`,
      kgCards: [
        { type: 'found', title: 'Approved Complement', source: 'Mapped from slot_count in Knowledge Graph.', tags: ['Entity Property'] },
        { type: 'added', title: 'Aggregate Slots by Program Type', source: 'I built this for you from model primitives.', tags: ['Aggregation', 'Condition'] }
      ]
    }
  ];

  const sharedExamples = [
    {
      id: "find_residents_status",
      title: "Find Residents Whose Status is...",
      fullTitle: "Find Residents Whose Status is Leave of Absence",
      metric: mockData.RESIDENT.filter(r => r.status === "Leave of Absence").length,
      metricLabel: "residents on leave",
      metricSub: "Current active leave of absence",
      description: "There are currently residents listed under 'Leave of Absence' across all programs.",
      date: "01/09/2026",
      icon: FileText,
      userQuestion: "How many residents are currently on a leave of absence?",
      cardTitle: `${mockData.RESIDENT.filter(r => r.status === "Leave of Absence").length} Residents`,
      cardTitle2: "on Leave",
      cardSubtitle: "Institutional Leave of Absence Count",
      watchMetric: "Total Residents on Leave",
      explorePrompts: [
        { icon: Layers, title: "Break down leave by program", sub: "See where leaves are concentrated" }
      ],
      sql: `SELECT COUNT(resident_id) FROM osugme.resident WHERE status = 'Leave of Absence';`,
      kgCards: [
        { type: 'added', title: 'Filter by Status', source: 'I built this for you from model primitives.', tags: ['Condition'] }
      ]
    },
    {
      id: "highest_total_programs",
      title: "Which Program Has Highest Total...",
      fullTitle: "Which Program Has Highest Total Graduates",
      metric: mockData.RESIDENT.filter(r => r.status === "Graduated").length,
      metricLabel: "total graduates historically",
      metricSub: "Graduates in system",
      description: "Across the entire system, this is the count of residents who have graduated.",
      date: "10/08/2026",
      icon: FileText,
      userQuestion: "How many residents have graduated across all programs?",
      cardTitle: `${mockData.RESIDENT.filter(r => r.status === "Graduated").length} Graduates`,
      cardTitle2: "Total",
      cardSubtitle: "All-time Graduate Count",
      watchMetric: "Total Graduates",
      explorePrompts: [
        { icon: Aperture, title: "Graduates by year", sub: "Show historical trend" }
      ],
      sql: `SELECT COUNT(*) FROM osugme.resident WHERE status = 'Graduated';`,
      kgCards: [
        { type: 'added', title: 'Filter by Graduated', source: 'I built this for you from model primitives.', tags: ['Condition'] }
      ]
    },
    {
      id: "compare_monthly_slots",
      title: "Compare Monthly Slots Top...",
      fullTitle: "Compare Monthly Slots Top Programs",
      metric: computedData.totalSlots,
      metricLabel: "total slots",
      metricSub: "Total approved complement",
      description: "Comparing slot capacity across the top programs in the institution.",
      date: "12/07/2026",
      icon: FileText,
      userQuestion: "Compare the slots between the top programs.",
      cardTitle: `${computedData.totalSlots} Slots`,
      cardTitle2: "Available",
      cardSubtitle: "Institution Wide Slot Capacity",
      watchMetric: "Total Slots Capacity",
      explorePrompts: [
        { icon: Layers, title: "View slots by specialty", sub: "See capacity by specialty" }
      ],
      sql: `SELECT name, slot_count FROM osugme.program ORDER BY slot_count DESC LIMIT 5;`,
      kgCards: [
        { type: 'found', title: 'Slot Capacity', source: 'I found this in the Knowledge Graph.', tags: ['Calculation'] }
      ]
    },
    {
      id: "programs_initial_accreditation",
      title: "Programs With Initial Accr...",
      fullTitle: "Programs With Initial Accreditation",
      metric: mockData.PROGRAM.filter(p => p.accreditation_status === "Initial Accreditation").length,
      metricLabel: "programs",
      metricSub: "Programs holding initial status",
      description: "Count of newly established programs currently holding Initial Accreditation status.",
      date: "05/09/2026",
      icon: FileText,
      userQuestion: "How many programs are currently on Initial Accreditation?",
      cardTitle: `${mockData.PROGRAM.filter(p => p.accreditation_status === "Initial Accreditation").length} Programs`,
      cardTitle2: "Initial",
      cardSubtitle: "Initial Accreditation Status Count",
      watchMetric: "Initial Accreditation Count",
      explorePrompts: [
        { icon: Aperture, title: "View time since initial accreditation", sub: "Check progress toward continued status" }
      ],
      sql: `SELECT COUNT(program_id) FROM osugme.program WHERE accreditation_status = 'Initial Accreditation';`,
      kgCards: [
        { type: 'added', title: 'Filter by Initial Accreditation', source: 'I built this for you from model primitives.', tags: ['Condition'] }
      ]
    },
    {
      id: "active_fellowships",
      title: "Total Active Fellowships...",
      fullTitle: "Total Active Fellowships Across System",
      metric: mockData.PROGRAM.filter(p => p.type === "Fellowship").length,
      metricLabel: "fellowship programs",
      metricSub: "Active fellowships",
      description: "Count of all active fellowship-level programs in the institution.",
      date: "28/08/2026",
      icon: FileText,
      userQuestion: "What is the total number of fellowship programs?",
      cardTitle: `${mockData.PROGRAM.filter(p => p.type === "Fellowship").length} Fellowships`,
      cardTitle2: "Total",
      cardSubtitle: "Institutional Fellowship Count",
      watchMetric: "Total Fellowships",
      explorePrompts: [
        { icon: Layers, title: "Compare fellowship vs residency counts", sub: "See program type distribution" }
      ],
      sql: `SELECT COUNT(program_id) FROM osugme.program WHERE type = 'Fellowship';`,
      kgCards: [
        { type: 'added', title: 'Filter by Program Type = Fellowship', source: 'I built this for you from model primitives.', tags: ['Condition'] }
      ]
    },
    {
      id: "residents_probation",
      title: "Total Trainees on Probation...",
      fullTitle: "Total Trainees on Probation",
      metric: mockData.RESIDENT.filter(r => r.status === "Probation").length,
      metricLabel: "trainees on probation",
      metricSub: "Currently active probation status",
      description: "Institution-wide count of residents or fellows currently on probation.",
      date: "15/08/2026",
      icon: FileText,
      userQuestion: "How many trainees are currently on probation?",
      cardTitle: `${mockData.RESIDENT.filter(r => r.status === "Probation").length} Trainees`,
      cardTitle2: "on Probation",
      cardSubtitle: "Active Probation Count",
      watchMetric: "Trainees on Probation",
      explorePrompts: [
        { icon: Navigation, title: "Break down by PGY level", sub: "See risk distribution" }
      ],
      sql: `SELECT COUNT(resident_id) FROM osugme.resident WHERE status = 'Probation';`,
      kgCards: [
        { type: 'added', title: 'Filter by Probation Status', source: 'I built this for you from model primitives.', tags: ['Condition'] }
      ]
    }
  ];

  const allExamples = [...examples, ...sharedExamples];
  const selectedExample = allExamples.find(e => e.id === selectedExampleId) || examples[0];

  const handleMouseEnter = (e: React.MouseEvent, item: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupData({
      show: true,
      x: rect.right + 10,
      y: rect.top,
      item
    });
  };

  const handleMouseLeave = () => {
    setPopupData({ ...popupData, show: false });
  };

  return (
    <div className="spotonix-layout">
      <div className="spotonix-left">
        <div className="spotonix-logo" style={{ display: "none" }}>
          <Menu size={20} style={{color: "#888", cursor: "pointer"}} />
          <Aperture size={24} />
          Spotonix
        </div>
        
        <button className="spotonix-new-btn">
          <Plus size={16} /> New analysis
        </button>

        <div className="spotonix-nav-list">
          <div className="spotonix-nav-item"><FileText size={16} /> Brief</div>
          <div className="spotonix-nav-item"><CheckCircle2 size={16} /> Reviews</div>
          <div className="spotonix-nav-item"><Navigation size={16} /> Trails</div>
        </div>

        <div className="spotonix-filters">
          <button className="spotonix-filter-btn active">All</button>
          <button className="spotonix-filter-btn"><Bookmark size={14} /> Bookmarks</button>
        </div>

        <div className="spotonix-section-title">Curated examples</div>
        <div className="spotonix-section-subtitle">Precomputed examples provided with this workspace</div>
        
        <div className="spotonix-curated-list">
          {examples.map((ex) => (
            <div 
              key={ex.id}
              className={`spotonix-curated-item ${selectedExampleId === ex.id ? "active" : ""}`}
              style={selectedExampleId === ex.id ? { background: "#f0f0f0" } : {}}
              onMouseEnter={(e) => handleMouseEnter(e, ex)}
              onMouseLeave={handleMouseLeave}
              onClick={() => setSelectedExampleId(ex.id)}
            >
              <ex.icon size={14} /> {ex.title}
            </div>
          ))}
        </div>

        <div className="spotonix-section-title" style={{marginTop: 24}}>Shared analyses</div>
        <div className="spotonix-curated-list">
          {sharedExamples.map((ex) => (
            <div 
              key={ex.id}
              className={`spotonix-curated-item ${selectedExampleId === ex.id ? "active" : ""}`}
              style={selectedExampleId === ex.id ? { background: "#f0f0f0" } : {}}
              onMouseEnter={(e) => handleMouseEnter(e, ex)}
              onMouseLeave={handleMouseLeave}
              onClick={() => setSelectedExampleId(ex.id)}
            >
              <ex.icon size={14} /> {ex.title}
            </div>
          ))}
        </div>
      </div>

      <div className="spotonix-middle">
        <div className="spotonix-topbar">
          <div className="spotonix-topbar-pill">
            <Layers size={14} /> Demo · Synthetic data
          </div>
          <div style={{position: "absolute", right: 16, display: "flex", gap: "12px", alignItems: "center"}}>
            <div className="spotonix-topbar-pill" style={{background: "white", padding: "4px 8px"}}>
              <Search size={14} /> Search
              <span style={{background: "#f0f0f0", border: "1px solid #e5e5e5", borderRadius: "4px", padding: "0 4px", fontSize: "10px", marginLeft: "8px"}}>⌘ /</span>
            </div>
            <div className="spotonix-avatar" style={{width: 28, height: 28}}>Y</div>
          </div>
        </div>

        <div className="spotonix-chat-area">
          <div className="spotonix-message">
            <div className="spotonix-avatar">Y</div>
            <div className="spotonix-msg-content">
              <div className="spotonix-msg-header">
                <span className="spotonix-msg-name">You</span>
              </div>
              <div className="spotonix-msg-text">
                {selectedExample.userQuestion}
              </div>
            </div>
          </div>

          <div className="spotonix-message">
            <div className="spotonix-avatar system"><Aperture size={28} /></div>
            <div className="spotonix-msg-content">
              <div className="spotonix-result-card">
                <div>
                  <h2 style={{display: "inline-block"}}>{selectedExample.cardTitle}</h2>
                  <h2 style={{display: "inline-block", marginLeft: 8}}>{selectedExample.cardTitle2}</h2>
                  <br />
                  <span style={{marginLeft: 0, marginTop: 8, display: "block"}}>{selectedExample.cardSubtitle}</span>
                </div>
                <button className="spotonix-view-result" onClick={() => setTab("result")}>View result <ArrowUpRight size={14}/></button>
              </div>
              <div className="spotonix-msg-actions">
                <button onClick={() => setTab("result")}><ExternalLink size={14} /> Results</button>
                <button onClick={() => setTab("interpreted")}><Search size={14} /> Explain</button>
                <div style={{flex: 1}}></div>
                <button><RotateCcw size={14} /></button>
                <button><ThumbsUp size={14} /></button>
                <button><ThumbsDown size={14} /></button>
                <button><Bookmark size={14} /></button>
              </div>

              <div className="spotonix-promo-box">
                <h3>Talk to us about your data</h3>
                <p>See how Spotonix can ground the same analyst workflow in your metrics and context.</p>
                <button onClick={() => window.location.href = "mailto:Sales@spotonix.com"}>Talk to us about your data <ArrowUpRight size={14}/></button>
              </div>
            </div>
          </div>

          <div className="spotonix-chat-input-container">
            <input 
              type="text"
              className="spotonix-chat-input"
              placeholder="Ask about your data..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
            />
            <button className="spotonix-chat-send" onClick={handleChatSubmit}>
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      </div>

      <div className="spotonix-right">
        <div className="spotonix-right-header">
          <div className="spotonix-right-tabs">
            <div className={`spotonix-tab ${tab === "result" ? "active" : ""}`} onClick={() => setTab("result")}>RESULT</div>
            <div className={`spotonix-tab ${tab === "interpreted" ? "active" : ""}`} onClick={() => setTab("interpreted")}>HOW I INTERPRETED THIS</div>
          </div>
          <div className="spotonix-right-actions">
            <Minus size={16} />
            <Maximize2 size={16} />
          </div>
        </div>

        {tab === "result" && (
          <div className="spotonix-right-content">
            <div className="spotonix-big-metric">
              <h1>{selectedExample.metric}</h1>
              <span>{selectedExample.metricLabel}</span>
            </div>
            {selectedExample.metric2 && (
              <div className="spotonix-big-metric" style={{marginTop: -16}}>
                <h1>{selectedExample.metric2}</h1>
                <span>{selectedExample.metric2Label}</span>
              </div>
            )}

            <div className="spotonix-panel-section" style={{marginTop: 32}}>
              <div className="spotonix-panel-header">
                <span>WATCH FROM THIS ANSWER</span>
              </div>
              <div className="spotonix-panel-body" style={{background: "#fdfdfd"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div>
                    <h3 style={{margin: "0 0 4px", fontSize: 16}}>{selectedExample.watchMetric} <span className="spotonix-badge-blue" style={{display:"inline-flex", padding:"2px 8px", fontSize: 10, marginLeft: 8}}>PRIMARY</span></h3>
                    <p style={{margin: 0, color: "#666", fontSize: 13}}>Track this over time in your Brief.</p>
                  </div>
                  <button style={{background: "#333", color: "white", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 600, display: "flex", alignItems: "center"}}>Watch <ChevronDown size={14} style={{marginLeft: 8}}/></button>
                </div>
              </div>
            </div>

            <div className="spotonix-panel-section">
              <div className="spotonix-panel-header" style={{background: "white", borderBottom: "none"}}>
                <div style={{display: "flex", alignItems: "center", gap: 8}}><Menu size={16}/> Data Table (1 rows)</div>
                <ChevronDown size={16} />
              </div>
            </div>

            <div className="spotonix-what-tells">
              <h4 style={{fontSize: 12}}>EXPLORE FURTHER</h4>
              <ul className="spotonix-bullets" style={{listStyle: "none", paddingLeft: 0, marginTop: 16}}>
                {selectedExample.explorePrompts.map((prompt, i) => (
                  <li key={i} style={{display:"flex", gap: 12, marginBottom: 16}}>
                    <prompt.icon size={16} color="#888" style={{marginTop: 2}}/>
                    <div>
                      <strong style={{display:"block", color:"#333", fontWeight: 500}}>{prompt.title}</strong>
                      <span style={{color:"#888", fontSize:13}}>{prompt.sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "interpreted" && (
          <div className="spotonix-right-content" style={{padding: 0, background: "#f9f9f9", flex: 1}}>
            <div className="spotonix-interpreted-header">
              <div className="spotonix-interpreted-header-title">
                <Aperture size={18} /> HOW I INTERPRETED THIS
              </div>
              <div className="spotonix-interpreted-badges">
                <div className="spotonix-badge-blue"><CheckCircle size={14}/> Verified</div>
                <div className="spotonix-badge-green"><span style={{width: 6, height: 6, background: "#009900", borderRadius: "50%"}}></span> 90%</div>
                <ChevronUp size={16} style={{color: "#888", alignSelf: "center", marginLeft: 4}} />
              </div>
            </div>

            <div className="spotonix-box">
              <h3 style={{color: "#0055cc"}}><ShieldCheck size={18} /> RESOLVED BEFORE SQL</h3>
              <p style={{fontSize: 16, fontWeight: 500, color: "#1a1a1a"}}>The answer was built from governed meaning before SQL ran.</p>
              <p>Spotonix resolved the question to a visible plan, used known context graph objects where available, asked for clarification when needed, and compiled SQL from the accepted plan.</p>
              
              <div className="spotonix-box-tags">
                <div className="spotonix-tag" style={{color: "#0055cc", background: "#e6f0ff", borderColor: "#cce0ff", display: "flex", alignItems: "center", gap: 4}}><CheckCircle size={14}/> Verified</div>
                <div className="spotonix-tag">90% plan confidence</div>
                <div className="spotonix-tag">{selectedExample.kgCards.length} concepts</div>
              </div>
              
              <div className="spotonix-box-footer">
                Same accepted plan. Same SQL. Every time.
              </div>
            </div>

            <div className="spotonix-kg-section">
              <div className="spotonix-kg-header">
                <span>QUESTION → INTENT → KNOWLEDGE GRAPH</span>
                <span style={{display:"flex", gap:8}}>
                  <span className="spotonix-tag" style={{padding: "2px 8px", fontSize: 11, background: "transparent", border: "1px solid #e5e5e5"}}><strong>{selectedExample.kgCards.filter(c => c.type === 'found').length}</strong> KG matches</span>
                  <span className="spotonix-tag" style={{padding: "2px 8px", fontSize: 11, background: "transparent", border: "1px solid #e5e5e5"}}><strong>{selectedExample.kgCards.filter(c => c.type === 'added').length}</strong> Built</span>
                </span>
              </div>
              <h3 className="spotonix-kg-title">Spotonix grounded the business meaning before generating SQL.</h3>
              
              <div className="spotonix-kg-question">
                "{selectedExample.userQuestion}"
              </div>

              <div className="spotonix-kg-cards">
                {selectedExample.kgCards.map((card, i) => (
                  <div key={i} className="spotonix-kg-card">
                    <div className="spotonix-kg-card-header">
                      {card.type === 'added' ? (
                        <span className="spotonix-kg-added"><Plus size={12}/> I added</span>
                      ) : (
                        <span className="spotonix-kg-found"><Link size={12}/> I found</span>
                      )}
                      <h4>{card.title}</h4>
                    </div>
                    <p>{card.source}</p>
                    <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                      {card.tags.map((tag, j) => (
                        <span key={j} className="spotonix-tag" style={{fontSize: 11, background: "#f5f5f5"}}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="spotonix-sql-evidence">
              <div className="spotonix-sql-header" onClick={() => setSqlOpen(!sqlOpen)}>
                <span>SQL evidence</span>
                {sqlOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
              </div>
              {sqlOpen && (
                <div className="spotonix-sql-body">
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom: 12}}>
                    <span style={{fontSize: 12, color: "#666", display:"flex", alignItems:"center", gap: 4}}><Code size={14}/> SQL</span>
                    <ChevronUp size={14} style={{color: "#888"}}/>
                  </div>
                  <div className="spotonix-sql-code" style={{whiteSpace: 'pre-wrap'}}>
                    {selectedExample.sql}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>

      {popupData.show && popupData.item && (
        <div className="spotonix-hover-popup" style={{ top: popupData.y, left: popupData.x }}>
          <div className="spotonix-hover-popup-header">
            <span className="spotonix-hover-popup-title">{popupData.item.fullTitle}</span>
            <Bookmark size={16} color="#888" />
          </div>
          <div className="spotonix-hover-popup-metric-box">
            <div className="spotonix-hover-popup-metric-value">{popupData.item.metric}</div>
            <div className="spotonix-hover-popup-metric-sub">{popupData.item.metricSub}</div>
          </div>
          <div className="spotonix-hover-popup-desc">
            {popupData.item.description}
          </div>
          <div className="spotonix-hover-popup-footer">
            <Clock size={12} /> {popupData.item.date}
          </div>
        </div>
      )}
    </div>
  );
}
