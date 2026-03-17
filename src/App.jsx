import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { loadProjects, loadWishes, fromProject, fromWish, toProject, toWish, loadNotifications, daysAgo } from "./lib/db";
import { extractKeywords, countOverlap, getRelatedProjects, getActivityFeed } from "./lib/utils.js";

// ── Sprout Design System Tokens ───────────────────────────────────────────────
const DS = {
  colors: {
    kangkong50:"#f0faf0",kangkong100:"#d6f0d6",kangkong200:"#aadcaa",
    kangkong300:"#77c277",kangkong400:"#4aaa4a",kangkong500:"#2d8c2d",
    kangkong600:"#1f6e1f",kangkong700:"#165216",kangkong800:"#0e380e",
    kangkong900:"#082008",
    mushroom50:"#fafaf8",mushroom100:"#f2f1ed",mushroom200:"#e4e2da",
    mushroom300:"#ccc9bc",mushroom400:"#b0ac9c",mushroom500:"#928e7c",
    mushroom600:"#736f5e",mushroom700:"#565244",mushroom800:"#3a372e",
    mushroom900:"#201e18",mushroom950:"#111009",
    tomato500:"#e53e3e",tomato100:"#fed7d7",tomato600:"#c53030",
    mango50:"#fffff0",mango100:"#fefcbf",mango200:"#faf089",mango300:"#f6e05e",mango400:"#ecc94b",mango500:"#d69e2e",mango600:"#b7791f",mango700:"#975a16",
    carrot500:"#dd6b20",carrot100:"#feebc8",
    wintermelon500:"#2c7a7b",wintermelon100:"#e6fffa",wintermelon400:"#38b2ac",
    blueberry500:"#3182ce",blueberry100:"#ebf8ff",blueberry400:"#63b3ed",
    ubas500:"#805ad5",ubas100:"#faf5ff",ubas400:"#9f7aea",
    white:"#ffffff",gold:"#c8960c",
  },
  fonts:{ main:"Rubik, system-ui, sans-serif", mono:"Roboto Mono, monospace" },
  radius:{ sm:"6px", md:"10px", lg:"14px", xl:"18px", full:"9999px" },
  shadow:{
    sm:"0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    md:"0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
    lg:"0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
    xl:"0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06)",
  },
};

const FF = DS.fonts.main;
const C = DS.colors;

// ── Stage / dept data ─────────────────────────────────────────────────────────
// ── Country constants ─────────────────────────────────────────────────────────
const COUNTRY_MAP  = {"sprout.ph":"PH", "sproutsolutions.io":"TH"};

// Inline SVG flag — no emoji, no external images, renders everywhere
const FlagPH = ({w=24,h=16}) => (
  <svg width={w} height={h} viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" style={{display:"inline-block",verticalAlign:"middle",borderRadius:2,flexShrink:0}}>
    {/* Blue top band */}
    <rect x="0" y="0" width="24" height="8" fill="#0038A8"/>
    {/* Red bottom band */}
    <rect x="0" y="8" width="24" height="8" fill="#CE1126"/>
    {/* White triangle over left portion — base on left edge, tip pointing right */}
    <polygon points="0,0 0,16 10,8" fill="#FFFFFF"/>
    {/* Golden sun in centre of triangle */}
    <circle cx="4.2" cy="8" r="1.5" fill="#FCD116"/>
    {/* Border */}
    <rect width="24" height="16" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5"/>
  </svg>
);

const FlagTH = ({w=24,h=16}) => (
  <svg width={w} height={h} viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" style={{display:"inline-block",verticalAlign:"middle",borderRadius:2,flexShrink:0}}>
    {/* Red top */}
    <rect x="0" y="0"     width="24" height="2.67" fill="#A51931"/>
    {/* White */}
    <rect x="0" y="2.67"  width="24" height="2.67" fill="#F4F5F8"/>
    {/* Blue center */}
    <rect x="0" y="5.33"  width="24" height="5.33" fill="#2D2A4A"/>
    {/* White */}
    <rect x="0" y="10.67" width="24" height="2.67" fill="#F4F5F8"/>
    {/* Red bottom */}
    <rect x="0" y="13.33" width="24" height="2.67" fill="#A51931"/>
    {/* Border */}
    <rect width="24" height="16" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5"/>
  </svg>
);

const FlagSVG = ({country, w=24, h=16}) => {
  if (country === "PH") return <FlagPH w={w} h={h}/>;
  if (country === "TH") return <FlagTH w={w} h={h}/>;
  return null;
};

const CountryBadge = ({country, size="sm"}) => {
  if (!country) return null;
  const isPH   = country === "PH";
  const bg     = isPH ? C.mango100     : C.blueberry100;
  const color  = isPH ? C.mango600     : C.blueberry500;
  const border = isPH ? C.mango500     : C.blueberry400;
  const label  = isPH ? "PH" : "TH";
  const flagW  = size === "lg" ? 20 : 16;
  const flagH  = size === "lg" ? 14 : 11;
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      fontFamily:FF, fontSize:size==="lg"?11:9, fontWeight:700,
      background:bg, color, border:"1px solid "+border,
      borderRadius:DS.radius.full,
      padding:size==="lg"?"2px 8px 2px 5px":"1px 6px 1px 4px",
      flexShrink:0, lineHeight:1.4, letterSpacing:0.3,
    }}>
      <FlagSVG country={country} w={flagW} h={flagH}/>
      {label}
    </span>
  );
};
const COUNTRY_NAME = {"PH":"Philippines", "TH":"Thailand"};
const getCountry   = (email="") => {
  const domain = email.split("@")[1]||"";
  return COUNTRY_MAP[domain]||null;
};

// ── Stage constants ────────────────────────────────────────────────────────────
const STAGES      = ["seedling","nursery","sprout","bloom","thriving"];
const STAGE_LABELS = {
  seedling:"Seedling", nursery:"Nursery", sprout:"Sprout", bloom:"Bloom", thriving:"Thriving",
};
const STAGE_DESC = {
  seedling: "Being built",
  nursery:  "Awaiting Approver review",
  sprout:   "Approved, in development",
  bloom:    "In user testing",
  thriving: "Live and delivering value",
};
const STAGE_FLORA = {
  seedling:"Seedling", nursery:"Nursery", sprout:"Sprout", bloom:"Bloom", thriving:"Thriving",
};
const STAGE_ORDER = {seedling:0,nursery:1,sprout:2,bloom:3,thriving:4};

const STAGE_COLORS = {
  seedling: {bg:C.mushroom100,     text:C.mushroom600,      border:C.mushroom300,    dot:C.mushroom400},
  nursery:  {bg:C.mango100,        text:C.mango600,         border:C.mango500,       dot:C.mango500},
  sprout:   {bg:C.wintermelon100,  text:C.wintermelon500,   border:C.wintermelon400, dot:C.wintermelon400},
  bloom:    {bg:C.kangkong100,     text:C.kangkong600,      border:C.kangkong200,    dot:C.kangkong500},
  thriving: {bg:C.blueberry100,    text:C.blueberry500,     border:C.blueberry400,   dot:C.blueberry500},
};

const STAGE_GUIDE = [
  {
    key: "seed", emoji: "🌰", label: "Seed",
    borderColor: C.mushroom400, textColor: C.mushroom800,
    desc: "An idea for a project, tool, or solution that could help a team or the whole company. Anyone at Sprout can plant a seed, regardless of their technical background.",
    gardenBadge: false,
    callouts: [
      {
        id: "overlap",
        bg: C.blueberry100, border: C.blueberry400, textColor: C.blueberry500,
        icon: "🔍",
        title: "Overlap detection",
        body: "When you add a Seed, Grove checks if a similar idea or project already exists. If it does, you'll see a prompt to connect with that builder instead of starting from scratch.",
      },
    ],
  },
  {
    key: "seedling", emoji: "🌱", label: "Seedling",
    borderColor: STAGE_COLORS.seedling.border, textColor: STAGE_COLORS.seedling.text,
    desc: "Someone has claimed this seed and is actively building it. This is the hands-on stage — experimenting, prototyping, and figuring out what works.",
    gardenBadge: false,
    callouts: [
      {
        id: "requirements",
        bg: C.mango100, border: C.mango500, textColor: C.mango700,
        icon: "📋",
        title: "What you need at this stage",
        body: "A working prototype (something people can try) and a short deck explaining what you're building and its impact. Both are required before moving to Nursery.",
      },
      {
        id: "ai-help",
        bg: C.kangkong100, border: C.kangkong300, textColor: C.kangkong700,
        icon: "✨",
        title: "Not sure how to make a deck?",
        body: "AI can help you put one together quickly. Ask Claude or Gemini to help you structure your idea, how it works, and the impact in a few slides.",
      },
      {
        id: "overlap-seedling",
        bg: C.blueberry100, border: C.blueberry400, textColor: C.blueberry500,
        icon: "🔍",
        title: "Overlap detection also runs here",
        body: "If your project overlaps with another Seedling or Garden project, Grove will surface it so you can reach out and collaborate.",
      },
    ],
  },
  {
    key: "nursery", emoji: "🌿", label: "Nursery",
    borderColor: STAGE_COLORS.nursery.border, textColor: STAGE_COLORS.nursery.text,
    desc: "Before spending more time building, leadership reviews your prototype and deck. The goal isn't to gatekeep — it's to make sure you get the right guidance, connections, and resources before you invest more time.",
    gardenBadge: true,
    callouts: [
      {
        id: "feedback",
        bg: C.mango100, border: C.mango500, textColor: C.mango700,
        icon: "💬",
        title: "If leadership needs changes before approving",
        body: "You'll get feedback directly in Grove. You can update your work and resubmit — your project is never stuck.",
      },
    ],
  },
  {
    key: "sprout", emoji: "🌿", label: "Sprout",
    borderColor: STAGE_COLORS.sprout.border, textColor: STAGE_COLORS.sprout.text,
    desc: "Approved by leadership. You're now building the full product with momentum, guidance, and company backing behind you.",
    gardenBadge: true,
    callouts: [],
  },
  {
    key: "bloom", emoji: "🌸", label: "Bloom",
    borderColor: STAGE_COLORS.bloom.border, textColor: STAGE_COLORS.bloom.text,
    desc: "Live and in the hands of real users. The team is testing, gathering feedback, and refining before full rollout.",
    gardenBadge: true,
    callouts: [],
  },
  {
    key: "thriving", emoji: "🌳", label: "Thriving",
    borderColor: STAGE_COLORS.thriving.border, textColor: STAGE_COLORS.thriving.text,
    desc: "Delivering real, measurable value to Sprout. This is the goal every seed is working towards.",
    gardenBadge: true,
    callouts: [],
  },
];

const CAP_COLORS = {
  LLM:              {bg:C.ubas100,        text:C.ubas500,        border:C.ubas400},
  "Computer Vision":{bg:C.blueberry100,   text:C.blueberry500,   border:C.blueberry400},
  Automation:       {bg:C.wintermelon100, text:C.wintermelon500, border:C.wintermelon400},
  Prediction:       {bg:C.carrot100,      text:C.carrot500,      border:C.carrot500},
  NLP:              {bg:C.kangkong100,    text:C.kangkong600,    border:C.kangkong200},
};

const DEPT_COLORS = {
  Marketing:C.mango500, "Product Marketing":C.mango500,
  LDU:C.blueberry500, SolCon:C.blueberry500,
  Sales:C.carrot500, RevOps:C.carrot500,
  Implementation:C.kangkong500, MPS:C.kangkong500,
  "Customer Advocacy":C.ubas500, "Customer Success Management":C.ubas500,
  Alliance:C.wintermelon500,
  Aurora:C.blueberry500, Prometheus:C.tomato500,
  Legal:C.mushroom600, "People Ops":C.ubas500,
  Finance:C.wintermelon500, Execom:C.mushroom700,
};

const DEPT_ZONES = {
  Marketing:                    {x:1,  y:1,  w:23, h:17},
  "Product Marketing":          {x:26, y:1,  w:23, h:17},
  LDU:                          {x:51, y:1,  w:23, h:17},
  SolCon:                       {x:76, y:1,  w:23, h:17},
  Sales:                        {x:1,  y:21, w:23, h:17},
  RevOps:                       {x:26, y:21, w:23, h:17},
  Implementation:               {x:51, y:21, w:23, h:17},
  MPS:                          {x:76, y:21, w:23, h:17},
  "Customer Advocacy":          {x:1,  y:41, w:23, h:17},
  "Customer Success Management":{x:26, y:41, w:23, h:17},
  Alliance:                     {x:51, y:41, w:23, h:17},
  Aurora:                       {x:76, y:41, w:23, h:17},
  Prometheus:                   {x:1,  y:61, w:23, h:17},
  Legal:                        {x:26, y:61, w:23, h:17},
  "People Ops":                 {x:51, y:61, w:23, h:17},
  Finance:                      {x:76, y:61, w:23, h:17},
  Execom:                       {x:26, y:81, w:47, h:17},
};

const CAPABILITIES = ["All","LLM","Computer Vision","Automation","Prediction","NLP"];
const TOOLS =["Claude Chat","Claude Code","Cowork","ChatGPT","Copilot","Cursor","Zapier / Make","Other"];
const DATA_SOURCES = [
  "HubSpot","NetSuite","Sprout HR","Sprout Payroll",
  "Google Drive/Docs","Product Analytics/Pendo/Userpilot","Databricks","Zendesk",
  "Website","Jira","Notion/Confluence","Meeting Transcripts",
  "Survey Responses","Others",
];

const INITIAL_PROJECTS = [
  // 🇵🇭 Philippines
  {id:1, country:"PH", name:"SmartReply",    builtBy:"Engineering",       builtFor:"Customer Experience",capability:"LLM",            stage:"bloom",    lastUpdated:5, impact:"Saves 3 hrs/agent/day",   impactNum:"3 hrs",  builder:"Maya Santos",   builderEmail:"maya@sprout.ph",    zx:30,zy:40,notes:["Great progress! — Lena"],milestones:["Ideation — Jan 2024","Prototype — Feb 2024","Pilot — Mar 2024","Launched — Apr 2024"],description:"AI-powered email response suggestions for customer support agents, cutting response time by 40%.",problemSpace:"Customer Support",  dataSource:"Customer emails",       demoLink:"#",interestedUsers:["rob@sprout.ph"],   imageUrl:"https://picsum.photos/id/1/400/200"},
  {id:2, country:"PH", name:"ForecastIQ",    builtBy:"Operations",        builtFor:"Operations",          capability:"Prediction",     stage:"thriving",  lastUpdated:12,impact:"20% waste reduction",      impactNum:"20%",    builder:"James Reyes",   builderEmail:"james@sprout.ph",   zx:40,zy:55,notes:["Saved us big last Q"],   milestones:["Ideation — Sep 2023","Model training — Nov 2023","Beta — Jan 2024","Launched — Feb 2024","Scaled — May 2024"],description:"Predictive inventory model that reduces overstock by anticipating demand shifts two weeks ahead.",problemSpace:"Data Analysis",      dataSource:"Inventory & sales data",  demoLink:"#",interestedUsers:["sofia@sprout.ph"],imageUrl:"https://picsum.photos/id/20/400/200"},
  {id:3, country:"PH", name:"DocScan AI",    builtBy:"Engineering",       builtFor:"Finance",             capability:"Computer Vision",stage:"sprout",    lastUpdated:8, impact:"800 docs/week processed",  impactNum:"800",    builder:"Lena Park",     builderEmail:"lena@sprout.ph",    zx:55,zy:55,notes:[],milestones:["Ideation — Feb 2024","Dataset — Mar 2024","Building — Apr 2024"],description:"Computer vision tool that auto-reads and categorizes incoming vendor invoices with 94% accuracy.",problemSpace:"Finance & Budgeting",dataSource:"Vendor invoices",         demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/40/400/200"},
  {id:4, country:"PH", name:"ToneGuard",     builtBy:"Marketing",         builtFor:"Marketing",           capability:"NLP",            stage:"seedling",  lastUpdated:3, impact:"Est. 15% fewer revisions",  impactNum:"15%",    builder:"Carlos Ruiz",   builderEmail:"carlos@sprout.ph",  zx:30,zy:40,notes:[],milestones:["Ideation — Mar 2024","In development — Apr 2024"],description:"NLP tool that reviews outbound comms for brand tone consistency before they're sent.",problemSpace:"Content Creation",   dataSource:"Marketing copy",          demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/60/400/200"},
  {id:5, country:"PH", name:"OnboardBot",    builtBy:"Engineering",       builtFor:"HR",                  capability:"Automation",     stage:"bloom",     lastUpdated:21,impact:"NPS +28 pts for new hires", impactNum:"+28 NPS",builder:"Dana Osei",     builderEmail:"dana@sprout.ph",    zx:50,zy:45,notes:["New hires love this"],   milestones:["Ideation — Nov 2023","Journey mapping — Jan 2024","Pilot — Feb 2024","Launched — Mar 2024"],description:"Automated onboarding assistant that guides new employees through their first 30 days.",problemSpace:"HR & Onboarding",    dataSource:"HR records & docs",       demoLink:"#",interestedUsers:["priya@sprout.ph"],imageUrl:"https://picsum.photos/id/80/400/200"},
  {id:6, country:"PH", name:"CodeReview AI", builtBy:"Engineering",       builtFor:"Engineering",         capability:"LLM",            stage:"thriving",  lastUpdated:2, impact:"30% faster PR cycles",      impactNum:"30%",    builder:"Kai Nakamura",  builderEmail:"kai@sprout.ph",     zx:60,zy:50,notes:["Team loves it"],        milestones:["Ideation — Aug 2023","Prototype — Oct 2023","Beta — Dec 2023","Launched — Jan 2024","Scaled — Mar 2024"],description:"Automated pull request review tool that catches bugs and style issues before human review.",problemSpace:"Process Automation", dataSource:"Git repositories",        demoLink:"#",interestedUsers:[],                  imageUrl:"https://picsum.photos/id/100/400/200"},
  {id:7, country:"PH", name:"SentimentPulse",builtBy:"Customer Experience",builtFor:"Customer Experience",capability:"NLP",           stage:"seedling",  lastUpdated:1, impact:"TBD",                        impactNum:"TBD",    builder:"Priya Mehta",   builderEmail:"priya@sprout.ph",   zx:70,zy:70,notes:[],milestones:["Ideation — Apr 2024"],description:"Real-time sentiment analysis of customer feedback across all channels.",problemSpace:"Customer Support",  dataSource:"Customer feedback",       demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/120/400/200"},
  {id:8, country:"PH", name:"BudgetBot",     builtBy:"Finance",           builtFor:"Finance",             capability:"LLM",            stage:"seedling",  lastUpdated:45,impact:"Est. 2 hrs saved/week",     impactNum:"2 hrs",  builder:"Tom Eriksen",   builderEmail:"tom@sprout.ph",     zx:20,zy:65,notes:["Needs update"],          milestones:["Ideation — Jan 2024","In development — Feb 2024 (stalled)"],description:"Conversational AI for querying budget reports in plain language.",problemSpace:"Finance & Budgeting",dataSource:"Budget reports",          demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/140/400/200"},
  {id:9, country:"PH", name:"AdOptimizer",   builtBy:"Marketing",         builtFor:"Marketing",           capability:"Prediction",     stage:"sprout",    lastUpdated:6, impact:"12% lower CAC",              impactNum:"12%",    builder:"Sofia Ali",     builderEmail:"sofia@sprout.ph",   zx:70,zy:50,notes:[],milestones:["Ideation — Jan 2024","Data pipeline — Feb 2024","Tuning — Apr 2024"],description:"ML model that auto-adjusts ad spend across channels based on live performance data.",problemSpace:"Sales & Marketing",  dataSource:"Ad performance data",     demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/160/400/200"},
  {id:10,country:"PH", name:"MeetingSumAI",  builtBy:"Engineering",       builtFor:"Engineering",         capability:"LLM",            stage:"seedling",  lastUpdated:2, impact:"TBD",                        impactNum:"TBD",    builder:"Rob Chen",      builderEmail:"rob@sprout.ph",     zx:25,zy:75,notes:[],milestones:["Ideation — Apr 2024"],description:"Auto-generates structured meeting summaries and action items from transcripts.",problemSpace:"Process Automation", dataSource:"Meeting transcripts",     demoLink:"", interestedUsers:[],                  imageUrl:"https://picsum.photos/id/180/400/200"},
  // 🇹🇭 Thailand
  {id:11,country:"TH", name:"LeadScore TH",  builtBy:"Marketing",         builtFor:"Marketing",           capability:"Prediction",     stage:"bloom",     lastUpdated:4, impact:"18% higher conversion",      impactNum:"18%",    builder:"Niran Kositchai",builderEmail:"niran@sproutsolutions.io", zx:45,zy:35,notes:["Converting well"],  milestones:["Ideation — Oct 2023","Model training — Dec 2023","Pilot — Feb 2024","Launched — Mar 2024"],description:"ML model that scores inbound leads by likelihood to convert, helping the sales team prioritize outreach.",problemSpace:"Sales & Marketing",  dataSource:"CRM & web analytics",     demoLink:"#",interestedUsers:[],                  imageUrl:"https://picsum.photos/id/200/400/200"},
  {id:12,country:"TH", name:"ChatAssist TH", builtBy:"Customer Experience",builtFor:"Customer Experience",capability:"LLM",           stage:"sprout",    lastUpdated:7, impact:"40% faster first response",  impactNum:"40%",    builder:"Ploy Siriwat",  builderEmail:"ploy@sproutsolutions.io",  zx:60,zy:60,notes:["Users love the speed"],milestones:["Ideation — Jan 2024","Prototype — Feb 2024","Pilot — Mar 2024"],description:"AI chat assistant that handles first-line customer queries in Thai and English, escalating complex issues to human agents.",problemSpace:"Customer Support",  dataSource:"Support ticket history",  demoLink:"",interestedUsers:[],                   imageUrl:"https://picsum.photos/id/220/400/200"},
  {id:13,country:"TH", name:"InventoryAI TH",builtBy:"Operations",        builtFor:"Operations",          capability:"Prediction",     stage:"seedling",  lastUpdated:3, impact:"TBD",                        impactNum:"TBD",    builder:"Tanawat Burin", builderEmail:"tanawat@sproutsolutions.io",zx:35,zy:60,notes:[],milestones:["Ideation — Feb 2024","In development — Mar 2024"],description:"Demand forecasting tool built for Thailand's seasonal sales patterns, reducing overstock during low-demand months.",problemSpace:"Data Analysis",      dataSource:"Sales & inventory records",demoLink:"",interestedUsers:[],                   imageUrl:"https://picsum.photos/id/240/400/200"},
];

const ORIGINS = ["Hackathon","Side Project","Leadership Directive","Customer Request","Team Initiative"];


// Helper: get dept color
const getDeptColor = (dept) => DEPT_COLORS[dept] || C.kangkong500;

const INITIAL_WISHES = [
  // 🇵🇭 Philippines
  {id:"w1",country:"PH",title:"Auto-summarize Slack threads for async teams",        why:"We're spread across 3 timezones. People miss key decisions buried in long threads. A daily digest or on-demand summary would save hours of catch-up every week.",   builtFor:"Engineering",         wisherName:"Kai Nakamura",  wisherEmail:"kai@sprout.ph",    createdDaysAgo:8,  upvoters:["Maya Santos","Dana Osei","Sofia Ali","Tom Eriksen","Carlos Ruiz","Niran Kositchai"], fulfilledBy:null, claimedBy:"Demo User",    claimedByEmail:"demo@sprout.ph",      claimedAt:"Mar 1, 2026",  readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w2",country:"PH",title:"AI that flags compliance risks in vendor contracts",   why:"Finance reviews 40+ contracts a month manually. We've missed clauses before. Even a first-pass risk scan would be hugely valuable before legal gets involved.",       builtFor:"Finance",             wisherName:"Lena Park",     wisherEmail:"lena@sprout.ph",   createdDaysAgo:14, upvoters:["Tom Eriksen","James Reyes"],                                                       fulfilledBy:null, claimedBy:"Lena Park",    claimedByEmail:"lena@sprout.ph",      claimedAt:"Feb 20, 2026", readyForReview:true,  prototypeLink:"https://demo.sprout.ph/contractscan", prototypeNote:"Built a working scanner on 12 sample contracts — 89% accuracy on flagging indemnity and auto-renewal clauses."},
  {id:"w3",country:"PH",title:"Auto-tag and route incoming support tickets by urgency",why:"Agents spend 20 mins/day just on triage. A model that reads the ticket and suggests the right queue and priority would be a massive win for the team.",           builtFor:"Customer Experience", wisherName:"Maya Santos",   wisherEmail:"maya@sprout.ph",   createdDaysAgo:3,  upvoters:["Priya Mehta","Dana Osei","Rob Chen","Ploy Siriwat"],                                fulfilledBy:null, claimedBy:null,           claimedByEmail:null,                  claimedAt:null,           readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w4",country:"PH",title:"Job description generator that matches our tone guidelines",why:"Hiring managers write JDs from scratch every time. Quality is inconsistent and it takes 2-3 rounds of editing. A guided generator would halve the time.",       builtFor:"HR",                  wisherName:"Dana Osei",     wisherEmail:"dana@sprout.ph",   createdDaysAgo:21, upvoters:["Sofia Ali","Carlos Ruiz","Kai Nakamura","Maya Santos"],                            fulfilledBy:null, claimedBy:"Dana Osei",    claimedByEmail:"dana@sprout.ph",      claimedAt:"Feb 14, 2026", readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w5",country:"PH",title:"Budget variance explainer — plain language from raw data",why:"Every month finance sends a spreadsheet and half the team can't interpret it. An AI that turns variance tables into plain language summaries would reduce confusion.", builtFor:"Finance",             wisherName:"Tom Eriksen",   wisherEmail:"tom@sprout.ph",    createdDaysAgo:5,  upvoters:["Lena Park","James Reyes","Sofia Ali"],                                             fulfilledBy:"BudgetBot",  claimedBy:"Tom Eriksen",  claimedByEmail:"tom@sprout.ph",       claimedAt:"Jan 10, 2026", readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w6",country:"PH",title:"Content brief generator from competitor analysis",    why:"Our content team spends a full day researching before writing a single brief. If we could auto-pull competitor angles and suggest our positioning, we'd ship faster.",  builtFor:"Marketing",           wisherName:"Carlos Ruiz",   wisherEmail:"carlos@sprout.ph", createdDaysAgo:11, upvoters:["Sofia Ali","Niran Kositchai"],                                                     fulfilledBy:null, claimedBy:null,           claimedByEmail:null,                  claimedAt:null,           readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w7",country:"PH",title:"Predictive attrition model for high-risk employees",  why:"We've lost 3 senior engineers in the past quarter with zero warning. If we could surface early signals — engagement drops, tenure patterns — we could act sooner.",   builtFor:"HR",                  wisherName:"Priya Mehta",   wisherEmail:"priya@sprout.ph",  createdDaysAgo:30, upvoters:["Dana Osei","Kai Nakamura","Rob Chen","Maya Santos","Tom Eriksen","James Reyes"],    fulfilledBy:null, claimedBy:"Kai Nakamura", claimedByEmail:"kai@sprout.ph",       claimedAt:"Feb 5, 2026",  readyForReview:true,  prototypeLink:"https://demo.sprout.ph/attrition",    prototypeNote:"Trained on 2 years of HR + engagement data. Model flags employees with >70% attrition risk 60 days in advance."},
  // 🇹🇭 Thailand
  {id:"w8",country:"TH",title:"Thai language FAQ bot for customer self-service",      why:"Most of our TH customer queries are the same 20 questions. Agents spend hours repeating the same answers. A Thai-language bot would free them up for real issues.",    builtFor:"Customer Experience", wisherName:"Ploy Siriwat",  wisherEmail:"ploy@sproutsolutions.io",  createdDaysAgo:6,  upvoters:["Tanawat Burin","Niran Kositchai","Maya Santos","Kai Nakamura"],                    fulfilledBy:null, claimedBy:null,           claimedByEmail:null,                  claimedAt:null,           readyForReview:false, prototypeLink:null,                              prototypeNote:null},
  {id:"w9",country:"TH",title:"Automated Thai tax document classifier",               why:"Tax filing season means 200+ documents to sort manually each quarter. An AI that reads and classifies Thai tax docs would save our Finance team weeks of work.",         builtFor:"Finance",             wisherName:"Tanawat Burin", wisherEmail:"tanawat@sproutsolutions.io",createdDaysAgo:18, upvoters:["Niran Kositchai","Ploy Siriwat","Lena Park"],                                      fulfilledBy:null, claimedBy:null,           claimedByEmail:null,                  claimedAt:null,           readyForReview:false, prototypeLink:null,                              prototypeNote:null},
];

// ══════════════════════════════════════════════════════════════════════════════
// HAND-ETCHED ICON LIBRARY
// Fine botanical line art — thin strokes, vein detail, bark texture
// ══════════════════════════════════════════════════════════════════════════════

// Nav icons (24px)
function IcoOverview({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <line x1="3" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="0.5" opacity="0.4"/>
      <line x1="3" y1="8" x2="11" y2="8" stroke={color} strokeWidth="0.5" opacity="0.4"/>
      <line x1="5.5" y1="3" x2="5.5" y2="11" stroke={color} strokeWidth="0.5" opacity="0.4"/>
      <line x1="8" y1="3" x2="8" y2="11" stroke={color} strokeWidth="0.5" opacity="0.4"/>
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      <path d="M15 16.5 C15 16.5 13.5 15 13.5 17 C13.5 18.5 15 19 16.5 17.5" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IcoGarden({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 20 C12 20 5 16 5 10 C5 6 8 4 12 4 C16 4 19 6 19 10 C19 16 12 20 12 20Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.1"/>
      <line x1="12" y1="20" x2="12" y2="8" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M12 14 C10 12 8 12 7.5 13" stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none"/>
      <path d="M12 11 C14 9 16 9 16.5 10" stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IcoDiscover({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6" stroke={color} strokeWidth="1.3" fill="none"/>
      <circle cx="10.5" cy="10.5" r="2.5" stroke={color} strokeWidth="0.7" strokeOpacity="0.4" fill="none"/>
      <line x1="10.5" y1="4.5" x2="10.5" y2="6.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="10.5" y1="14.5" x2="10.5" y2="16.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="4.5" y1="10.5" x2="6.5" y2="10.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="14.5" y1="10.5" x2="16.5" y2="10.5" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
      <line x1="15" y1="15" x2="20.5" y2="20.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IcoPipeline({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="5" height="13" rx="2" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.08"/>
      <line x1="3" y1="13" x2="8" y2="13" stroke={color} strokeWidth="0.6" opacity="0.4"/>
      <rect x="9.5" y="5" width="5" height="16" rx="2" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12"/>
      <line x1="9.5" y1="10" x2="14.5" y2="10" stroke={color} strokeWidth="0.6" opacity="0.4"/>
      <line x1="9.5" y1="15" x2="14.5" y2="15" stroke={color} strokeWidth="0.6" opacity="0.4"/>
      <rect x="16" y="11" width="5" height="10" rx="2" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.06"/>
      <line x1="16" y1="16" x2="21" y2="16" stroke={color} strokeWidth="0.6" opacity="0.4"/>
      <line x1="2" y1="21" x2="22" y2="21" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}
function IcoAdd({size=24,color=C.white}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.4" fill="none"/>
      <line x1="12" y1="7.5" x2="12" y2="16.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="7.5" y1="12" x2="16.5" y2="12" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M14.5 9.5 C14.5 9.5 13 8 13 9.5 C13 10.5 14.5 11 15.5 9.5" stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.6"/>
    </svg>
  );
}
function IcoWishlist({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 20 C12 20 4 15 4 9.5 C4 7 6 5 8.5 5 C10 5 11.2 5.8 12 6.8 C12.8 5.8 14 5 15.5 5 C18 5 20 7 20 9.5 C20 15 12 20 12 20Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.1"/>
      <line x1="12" y1="9" x2="12" y2="15" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcoWarning({size=24,color=C.mango500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3 L20 7.5 L20 13.5 C20 17.5 16.5 20.5 12 22 C7.5 20.5 4 17.5 4 13.5 L4 7.5 Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.1"/>
      <line x1="12" y1="10" x2="12" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="17.5" r="1" fill={color}/>
    </svg>
  );
}
function IcoRelated({size=24,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="5" cy="12" r="2.5" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12"/>
      <circle cx="19" cy="7" r="2.5" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12"/>
      <circle cx="19" cy="17" r="2.5" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12"/>
      <path d="M7.3 11 C11 8 14 7.5 16.5 8" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      <path d="M7.3 13 C11 16 14 16.5 16.5 16" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IcoClose({size=24,color=C.mushroom500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IcoLink({size=16,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 8 C6 8 7 6 9.5 6 L11 6 C12.7 6 14 7.3 14 9 C14 10.7 12.7 12 11 12 L9.5 12 C8.5 12 7.8 11.5 7.3 10.8" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M10 8 C10 8 9 10 6.5 10 L5 10 C3.3 10 2 8.7 2 7 C2 5.3 3.3 4 5 4 L6.5 4 C7.5 4 8.2 4.5 8.7 5.2" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IcoStale({size=16,color=C.mango500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2 C8 2 5 5 5 8 C5 10.8 6.5 12 8 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
      <path d="M8 14 C9.5 12 11 10.8 11 8 C11 5 8 2 8 2Z" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12"/>
      <path d="M6 8 C7 7 9 7.5 10 8" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  );
}
function IcoCheck({size=16,color=C.kangkong500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8 L6.5 11.5 L13 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IcoNote({size=16,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 3 C3 3 4 2 8 2 C12 2 13 3 13 3 L13 11 L10 14 L3 14 Z" stroke={color} strokeWidth="1" fill={color} fillOpacity="0.08"/>
      <line x1="5" y1="5.5" x2="11" y2="5.5" stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="7.5" x2="11" y2="7.5" stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="9.5" x2="8.5" y2="9.5" stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 11 L13 11 L10 14 Z" fill={color} fillOpacity="0.2"/>
    </svg>
  );
}

function IcoSearch({size=16,color=C.mushroom400}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke={color} strokeWidth="1.2" fill="none"/>
      <circle cx="6.5" cy="6.5" r="2" stroke={color} strokeWidth="0.6" fill="none" opacity="0.4"/>
      <line x1="10" y1="10" x2="14" y2="14" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
function IcoImpact({size=16,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <line x1="8" y1="14" x2="8" y2="3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4.5 7 L8 3 L11.5 7" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M5.5 14 Q8 12.5 10.5 14" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5"/>
    </svg>
  );
}

// Stage plant icons (large botanical illustrations)
// WishSeed — used in Wishlist cards (a closed whole seed)
function WishSeed({size=48, color}) {
  const c = color || C.mushroom600;
  return (
    <svg width={size} height={size} viewBox="0 0 60 70" fill="none">
      <ellipse cx="30" cy="64" rx="13" ry="4" fill="#a8956b" opacity="0.2"/>
      <ellipse cx="30" cy="42" rx="15" ry="13" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.12"/>
      <ellipse cx="30" cy="40" rx="10" ry="9" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.08"/>
      <path d="M22 36 Q30 32 38 36" stroke={c} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.4"/>
      <path d="M20 41 Q30 37 40 41" stroke={c} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.3"/>
      <path d="M22 46 Q30 42 38 46" stroke={c} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.25"/>
      <ellipse cx="25" cy="38" rx="3" ry="2" stroke={c} strokeWidth="0.5" fill="none" opacity="0.3" transform="rotate(-20 25 38)"/>
      <ellipse cx="35" cy="43" rx="3" ry="2" stroke={c} strokeWidth="0.5" fill="none" opacity="0.25" transform="rotate(15 35 43)"/>
    </svg>
  );
}

// PlantSprout — sprouting bean: cracked open, shoot emerging
function PlantSprout({size=56, wilting=false}) {
  const c  = wilting ? C.mushroom500 : C.kangkong700;
  const bc = wilting ? "#b8956a" : "#c8900a"; // bean coat color
  const bf = wilting ? "#d4aa70" : "#e8b830"; // bean fill
  const lc = wilting ? "#8aaa6a" : "#4a8040"; // leaf color
  return (
    <svg width={size} height={size} viewBox="0 0 70 90" fill="none">
      <ellipse cx="35" cy="84" rx="16" ry="5" fill="#a8956b" opacity="0.25"/>
      {/* soil crack line */}
      <path d="M20 72 Q28 70 35 72 Q42 74 50 72" stroke={c} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
      {/* bean — left half */}
      <path d="M35 72 Q22 68 20 58 Q20 48 28 46 Q35 44 35 52 Q35 62 35 72Z"
        stroke={c} strokeWidth="1.2" fill={bc} fillOpacity="0.55"/>
      {/* bean — right half, cracked open */}
      <path d="M35 72 Q48 68 50 58 Q50 48 42 46 Q35 44 35 52 Q35 62 35 72Z"
        stroke={c} strokeWidth="1.2" fill={bf} fillOpacity="0.5"/>
      {/* bean surface texture */}
      <path d="M26 52 Q30 56 28 62" stroke={c} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.35"/>
      <path d="M44 52 Q40 56 42 62" stroke={c} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.3"/>
      <ellipse cx="35" cy="58" rx="4" ry="3" stroke={c} strokeWidth="0.5" fill="none" opacity="0.2"/>
      {/* main shoot emerging from crack */}
      <path d="M35 52 Q34 42 35 28" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* cotyledon leaves unfurling */}
      <path d="M35 38 Q22 30 18 20 Q28 24 35 36Z"
        stroke={c} strokeWidth="0.9" fill={lc} fillOpacity="0.55"/>
      <line x1="35" y1="38" x2="22" y2="26" stroke={c} strokeWidth="0.5" opacity="0.35" strokeLinecap="round"/>
      <path d="M35 34 Q48 26 52 16 Q42 20 35 32Z"
        stroke={c} strokeWidth="0.9" fill={lc} fillOpacity="0.5"/>
      <line x1="35" y1="34" x2="48" y2="22" stroke={c} strokeWidth="0.5" opacity="0.3" strokeLinecap="round"/>
      {/* tiny shoot tip */}
      <path d="M35 28 Q33 22 35 16 Q37 22 35 28Z"
        stroke={c} strokeWidth="0.7" fill={lc} fillOpacity="0.6"/>
    </svg>
  );
}

// (Old bamboo sprout moved — now PlantSprout is the sprouting bean above)

function PlantGrowing({size=72, wilting=false}) {
  const c = wilting ? C.mushroom500 : C.kangkong700;
  const lc = wilting ? "#8aaa6a" : "#3a8040";
  const pc = wilting ? "#c8c880" : "#c8c040";
  return (
    <svg width={size} height={size} viewBox="0 0 90 110" fill="none">
      <ellipse cx="45" cy="103" rx="22" ry="6" fill="#a8956b" opacity="0.3"/>
      <path d="M43 55 Q41 75 43 103" stroke={c} strokeWidth="5" strokeLinecap="round" fill="none"/>
      <path d="M43 60 Q28 58 14 70" stroke={c} strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M43 55 Q55 48 68 56" stroke={c} strokeWidth="3" strokeLinecap="round" fill="none"/>
      {[[16,68],[22,64],[66,55],[60,60],[18,80],[66,68]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="8" ry="5" stroke={c} strokeWidth="0.8"
          fill={lc} fillOpacity="0.5" transform={"rotate("+(i%2===0?-30:30)+" "+x+" "+y+")"}/>
      ))}
      {[[14,72],[68,58]].map(([fx,fy],fi) => (
        <g key={fi}>
          {[0,60,120,180,240,300].map(a => (
            <path key={a}
              d={"M"+fx+","+fy+" Q"+(fx+8*Math.cos((a-20)*Math.PI/180))+","+(fy+8*Math.sin((a-20)*Math.PI/180))+" "+(fx+14*Math.cos(a*Math.PI/180))+","+(fy+14*Math.sin(a*Math.PI/180))}
              stroke={pc} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8"/>
          ))}
          <circle cx={fx} cy={fy} r="2.5" fill={C.gold}/>
        </g>
      ))}
      <ellipse cx="43" cy="42" rx="16" ry="12" stroke={c} strokeWidth="1" fill={lc} fillOpacity="0.4"/>
      <ellipse cx="32" cy="48" rx="10" ry="7" stroke={c} strokeWidth="0.8" fill={lc} fillOpacity="0.35" transform="rotate(-15 32 48)"/>
      <ellipse cx="54" cy="48" rx="10" ry="7" stroke={c} strokeWidth="0.8" fill={lc} fillOpacity="0.35" transform="rotate(15 54 48)"/>
    </svg>
  );
}

function PlantBlooming({size=76, wilting=false}) {
  const c = wilting ? C.mushroom500 : C.kangkong700;
  const lc = wilting ? "#8aaa6a" : "#3a8040";
  const p1 = wilting ? "#c0a0c0" : "#9040a0";
  const p2 = wilting ? "#d0b0a0" : "#c07860";
  const lip = wilting ? "#e0c0a0" : "#f0a050";
  return (
    <svg width={size} height={size} viewBox="0 0 90 110" fill="none">
      <ellipse cx="45" cy="103" rx="20" ry="5.5" fill="#a8956b" opacity="0.3"/>
      <path d="M45 60 Q44 80 45 103" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none"/>
      <path d="M45 75 Q30 72 18 78 Q28 68 45 75Z" stroke={c} strokeWidth="0.9" fill={lc} fillOpacity="0.45"/>
      <path d="M45 75 Q60 68 74 72 Q62 64 45 75Z" stroke={c} strokeWidth="0.9" fill={lc} fillOpacity="0.4"/>
      {/* Petals with vein lines */}
      <path d="M45 38 Q38 22 40 12 Q46 22 52 12 Q50 22 45 38Z" stroke={c} strokeWidth="1" fill={p1} fillOpacity="0.7"/>
      <line x1="45" y1="36" x2="44" y2="20" stroke={c} strokeWidth="0.5" opacity="0.4" strokeLinecap="round"/>
      <path d="M45 40 Q26 30 16 24 Q28 36 38 44Z" stroke={c} strokeWidth="1" fill={p2} fillOpacity="0.65"/>
      <path d="M45 40 Q64 30 74 24 Q62 36 52 44Z" stroke={c} strokeWidth="1" fill={p2} fillOpacity="0.65"/>
      <path d="M45 42 Q30 34 24 28 Q36 38 44 46Z" stroke={c} strokeWidth="1" fill={p1} fillOpacity="0.6"/>
      <path d="M45 42 Q60 34 66 28 Q54 38 46 46Z" stroke={c} strokeWidth="1" fill={p1} fillOpacity="0.6"/>
      <path d="M45 44 Q40 50 38 56 Q45 52 52 56 Q50 50 45 44Z" stroke={c} strokeWidth="1" fill={lip} fillOpacity="0.8"/>
      <circle cx="45" cy="43" r="4.5" stroke={c} strokeWidth="1.2" fill="#f8e8d0"/>
      <circle cx="45" cy="43" r="2" fill="#d0a040"/>
    </svg>
  );
}

function PlantTree({size=88, wilting=false}) {
  const c = wilting ? C.mushroom500 : C.kangkong700;
  const c1 = wilting ? "#7aaa68" : "#3a8a40";
  const c2 = wilting ? "#8ac078" : "#50a050";
  const fl = wilting ? "#d4c080" : "#f0c030";
  const flowers = [[38,26],[50,18],[62,26],[44,32],[56,30]];
  return (
    <svg width={size} height={size} viewBox="0 0 100 120" fill="none">
      <ellipse cx="50" cy="112" rx="28" ry="7" fill="#a8956b" opacity="0.3"/>
      <path d="M47 55 Q40 75 43 112 Q50 114 57 112 Q60 75 53 55 Q50 52 47 55Z" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.3"/>
      {/* bark fissures */}
      <path d="M49 60 Q48 75 49 90" stroke={c} strokeWidth="0.5" opacity="0.25" strokeLinecap="round"/>
      <path d="M51 65 Q52 78 51 95" stroke={c} strokeWidth="0.5" opacity="0.2" strokeLinecap="round"/>
      <path d="M47 60 Q32 52 18 56" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <path d="M53 58 Q68 48 82 52" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      {/* Root arcs */}
      <path d="M47 112 Q38 114 30 110" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
      <path d="M53 112 Q62 114 70 110" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.4"/>
      {/* Canopy — 3 overlapping etched rings */}
      <circle cx="50" cy="38" r="28" stroke={c} strokeWidth="1.2" fill="none"/>
      <circle cx="36" cy="44" r="19" stroke={c} strokeWidth="1" fill="none" opacity="0.6"/>
      <circle cx="64" cy="44" r="19" stroke={c} strokeWidth="1" fill="none" opacity="0.6"/>
      <circle cx="50" cy="28" r="19" stroke={c} strokeWidth="1" fill="none" opacity="0.5"/>
      {/* canopy fill hatching */}
      {Array.from({length:10},(_,i) => (
        <line key={i} x1={28+i*5} y1="14" x2={22+i*5} y2="58"
          stroke={c} strokeWidth="0.4" opacity="0.08" strokeLinecap="round"/>
      ))}
      {/* Narra flowers */}
      {flowers.map(([fx,fy],i) => (
        <g key={i}>
          {[0,72,144,216,288].map(a => {
            const ra = (a-90)*Math.PI/180;
            const ex = fx+4*Math.cos(ra);
            const ey = fy+4*Math.sin(ra);
            return (
              <ellipse key={a} cx={ex} cy={ey} rx="2.2" ry="1.4"
                fill={fl} stroke={fl} strokeWidth="0.3"
                transform={"rotate("+a+" "+ex+" "+ey+")"} opacity="0.8"/>
            );
          })}
          <circle cx={fx} cy={fy} r="1.5" fill={C.gold} opacity="0.9"/>
        </g>
      ))}
    </svg>
  );
}

const PlantMap = {seedling:PlantSprout,nursery:PlantSprout,sprout:PlantGrowing,bloom:PlantBlooming,thriving:PlantTree};
const GardenSizes = {seedling:{w:26,h:30},nursery:{w:40,h:46},sprout:{w:58,h:66},bloom:{w:74,h:84},thriving:{w:92,h:104}};

// GardenPlant — Option C solid silhouettes at garden scale, botanical colors for dark bg
function GardenPlant({stage, size=40, wilting=false}) {
  const op = wilting ? 0.55 : 1;
  if (stage === "seedling") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={op}>
      <rect x="7.5" y="9" width="1" height="5" rx="0.5" fill="#5a8040"/>
      <path d="M8 12.5 Q5.5 11 4.5 8.5 C6.5 8 8 10 8 12Z" fill="#7cb56a"/>
      <path d="M8 12.5 Q10.5 11 11.5 8.5 C9.5 8 8 10 8 12Z" fill="#7cb56a" opacity="0.8"/>
    </svg>
  );
  if (stage === "nursery") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={op}>
      <path d="M5.5 10.5 L6.5 14.5 L9.5 14.5 L10.5 10.5 Z" fill="#c8925a"/>
      <rect x="5" y="9" width="6" height="2" rx="1" fill="#b07040"/>
      <rect x="7.5" y="5" width="1" height="4.5" rx="0.5" fill="#5a8040"/>
      <path d="M8 9 Q5 7.5 4 5 C6.5 5 8 7 8 8.5Z" fill="#7cb56a"/>
      <path d="M8 9 Q11 7.5 12 5 C9.5 5 8 7 8 8.5Z" fill="#7cb56a" opacity="0.8"/>
      <path d="M8 7 Q5.5 5.5 5 3 C7 3.5 8 5.5 8 6.5Z" fill="#7cb56a" opacity="0.7"/>
      <path d="M8 7 Q10.5 5.5 11 3 C9 3.5 8 5.5 8 6.5Z" fill="#7cb56a" opacity="0.6"/>
    </svg>
  );
  if (stage === "sprout") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={op}>
      <rect x="7.5" y="3.5" width="1" height="11" rx="0.5" fill="#3a8040"/>
      <path d="M8 12 Q4.5 10 3 7 C5 6.5 7.5 8.5 8 11.5Z" fill="#5db868"/>
      <path d="M8 12 Q11.5 10 13 7 C11 6.5 8.5 8.5 8 11.5Z" fill="#5db868" opacity="0.85"/>
      <path d="M8 8.5 Q5 7 4 4.5 C6.5 4.5 8 6 8 8Z" fill="#6dc870" opacity="0.8"/>
      <path d="M8 8.5 Q11 7 12 4.5 C9.5 4.5 8 6 8 8Z" fill="#6dc870" opacity="0.75"/>
    </svg>
  );
  if (stage === "bloom") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={op}>
      <rect x="7.5" y="9" width="1" height="6" rx="0.5" fill="#3a8040"/>
      <path d="M8 12 Q5 11 3.5 9 C5.5 8.5 8 10 8 11.5Z" fill="#5db868" opacity="0.75"/>
      <path d="M8 12 Q11 11 12.5 9 C10.5 8.5 8 10 8 11.5Z" fill="#5db868" opacity="0.65"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#d884c8" opacity="0.9" transform="rotate(0 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#c870b8" opacity="0.75" transform="rotate(60 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#d884c8" opacity="0.9" transform="rotate(120 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#c870b8" opacity="0.75" transform="rotate(180 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#d884c8" opacity="0.9" transform="rotate(240 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill="#c870b8" opacity="0.75" transform="rotate(300 8 7)"/>
      <circle cx="8" cy="7" r="2.5" fill="#f5d44a"/>
      <circle cx="8" cy="7" r="1.5" fill="#e8b830"/>
    </svg>
  );
  if (stage === "thriving") return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" opacity={op}>
      <rect x="6.5" y="9.5" width="3" height="5.5" rx="1" fill="#8a6045"/>
      <circle cx="5.5" cy="8.5" r="3.5" fill="#3a7845"/>
      <circle cx="10.5" cy="8.5" r="3.5" fill="#3a7845"/>
      <circle cx="8" cy="6.5" r="4.5" fill="#4a9858"/>
      <circle cx="8" cy="4" r="3" fill="#58b06a"/>
      <circle cx="6.5" cy="3" r="1.5" fill="#6ac87c" opacity="0.7"/>
      <circle cx="9.5" cy="3.5" r="1.2" fill="#6ac87c" opacity="0.5"/>
    </svg>
  );
  return null;
}

// Stage icon (small, inline) — Option C: solid silhouettes, readable at any size
function SIcoSeedling({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="7.5" y="9" width="1" height="5" rx="0.5" fill={col}/>
      <path d="M8 12.5 Q5.5 11 4.5 8.5 C6.5 8 8 10 8 12Z" fill={col}/>
      <path d="M8 12.5 Q10.5 11 11.5 8.5 C9.5 8 8 10 8 12Z" fill={col} opacity="0.8"/>
    </svg>
  );
}
function SIcoNursery({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M5.5 10.5 L6.5 14.5 L9.5 14.5 L10.5 10.5 Z" fill={col} opacity="0.55"/>
      <rect x="5" y="9" width="6" height="2" rx="1" fill={col}/>
      <rect x="7.5" y="5" width="1" height="4.5" rx="0.5" fill={col}/>
      <path d="M8 9 Q5 7.5 4 5 C6.5 5 8 7 8 8.5Z" fill={col}/>
      <path d="M8 9 Q11 7.5 12 5 C9.5 5 8 7 8 8.5Z" fill={col} opacity="0.8"/>
      <path d="M8 7 Q5.5 5.5 5 3 C7 3.5 8 5.5 8 6.5Z" fill={col} opacity="0.7"/>
      <path d="M8 7 Q10.5 5.5 11 3 C9 3.5 8 5.5 8 6.5Z" fill={col} opacity="0.6"/>
    </svg>
  );
}
// SIcoSprout — solid sprout silhouette, used in wish-fulfillment callout
function SIcoSprout({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="7.5" y="3.5" width="1" height="11" rx="0.5" fill={col}/>
      <path d="M8 12 Q4.5 10 3 7 C5 6.5 7.5 8.5 8 11.5Z" fill={col}/>
      <path d="M8 12 Q11.5 10 13 7 C11 6.5 8.5 8.5 8 11.5Z" fill={col} opacity="0.85"/>
      <path d="M8 8.5 Q5 7 4 4.5 C6.5 4.5 8 6 8 8Z" fill={col} opacity="0.8"/>
      <path d="M8 8.5 Q11 7 12 4.5 C9.5 4.5 8 6 8 8Z" fill={col} opacity="0.75"/>
    </svg>
  );
}
function SIcoGrowing({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="7.5" y="3.5" width="1" height="11" rx="0.5" fill={col}/>
      <path d="M8 12 Q4.5 10 3 7 C5 6.5 7.5 8.5 8 11.5Z" fill={col}/>
      <path d="M8 12 Q11.5 10 13 7 C11 6.5 8.5 8.5 8 11.5Z" fill={col} opacity="0.85"/>
      <path d="M8 8.5 Q5 7 4 4.5 C6.5 4.5 8 6 8 8Z" fill={col} opacity="0.8"/>
      <path d="M8 8.5 Q11 7 12 4.5 C9.5 4.5 8 6 8 8Z" fill={col} opacity="0.75"/>
    </svg>
  );
}
function SIcoBlooming({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="7.5" y="9" width="1" height="6" rx="0.5" fill={col}/>
      <path d="M8 12 Q5 11 3.5 9 C5.5 8.5 8 10 8 11.5Z" fill={col} opacity="0.75"/>
      <path d="M8 12 Q11 11 12.5 9 C10.5 8.5 8 10 8 11.5Z" fill={col} opacity="0.65"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.8" transform="rotate(0 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.65" transform="rotate(60 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.8" transform="rotate(120 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.65" transform="rotate(180 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.8" transform="rotate(240 8 7)"/>
      <ellipse cx="8" cy="4.5" rx="2.2" ry="4" fill={col} opacity="0.65" transform="rotate(300 8 7)"/>
      <circle cx="8" cy="7" r="2.5" fill="#e8c020"/>
      <circle cx="8" cy="7" r="1.5" fill="#c8a010"/>
    </svg>
  );
}
function SIcoTree({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="6.5" y="9.5" width="3" height="5.5" rx="1" fill={col} opacity="0.7"/>
      <circle cx="5.5" cy="8.5" r="3.5" fill={col} opacity="0.8"/>
      <circle cx="10.5" cy="8.5" r="3.5" fill={col} opacity="0.8"/>
      <circle cx="8" cy="6.5" r="4.5" fill={col}/>
      <circle cx="8" cy="4" r="3" fill={col} opacity="0.9"/>
    </svg>
  );
}
function StageIcon({stage, size=16, color}) {
  const c = STAGE_COLORS[stage];
  if (!c) return null;
  const col = color || c.text;
  if (stage==="seedling") return <SIcoSeedling size={size} col={col}/>;
  if (stage==="nursery")  return <SIcoNursery size={size} col={col}/>;
  if (stage==="sprout")   return <SIcoGrowing size={size} col={col}/>;
  if (stage==="bloom")    return <SIcoBlooming size={size} col={col}/>;
  if (stage==="thriving") return <SIcoTree size={size} col={col}/>;
  return null;
}

// ── ProjectImage — auto-generated card cover ──────────────────────────────────
// Cover bg derived from dept; initials from project name; tool badge bottom-right
const COVER_COLORS = {
  Marketing:                    {bg:"#FFF8E1", text:"#F57F17"},
  "Product Marketing":          {bg:"#FFF8E1", text:"#F57F17"},
  Sales:                        {bg:"#E3F2FD", text:"#1565C0"},
  RevOps:                       {bg:"#FBE9E7", text:"#BF360C"},
  LDU:                          {bg:"#F3E5F5", text:"#6A1B9A"},
  SolCon:                       {bg:"#E8EAF6", text:"#283593"},
  Implementation:               {bg:"#E0F2F1", text:"#00695C"},
  MPS:                          {bg:"#E0F2F1", text:"#00695C"},
  "Customer Advocacy":          {bg:"#E8EAF6", text:"#283593"},
  "Customer Success Management":{bg:"#E8EAF6", text:"#283593"},
  Alliance:                     {bg:"#E8F5E9", text:"#2D7D32"},
  Aurora:                       {bg:"#E3F2FD", text:"#1565C0"},
  Prometheus:                   {bg:"#FCE4EC", text:"#C2185B"},
  Legal:                        {bg:"#EFEBE9", text:"#4E342E"},
  "People Ops":                 {bg:"#F3E5F5", text:"#6A1B9A"},
  Finance:                      {bg:"#FCE4EC", text:"#C2185B"},
  Execom:                       {bg:"#EFEBE9", text:"#4E342E"},
  default:                      {bg:"#EEEDE9", text:"#9A9890"},
};

// Darken a hex color by reducing lightness (simple approach: blend with black)
const darkenHex = (hex, amount=0.12) => {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.round(((n>>16)&0xff) * (1-amount));
  const g = Math.round(((n>>8) &0xff) * (1-amount));
  const b = Math.round(( n     &0xff) * (1-amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
};

const getInitials = (name="") => name.trim().split(/\s+/).slice(0,2).map(w=>w[0]||"").join("").toUpperCase() || "??";

const ProjectImage = ({project, width="100%", height=120, style={}}) => {
  const cc    = COVER_COLORS[project.builtBy] || COVER_COLORS.default;
  const bgEnd = darkenHex(cc.bg, 0.12);
  const id    = `grad-${project.id || "preview"}`;
  const initials = getInitials(project.name);
  const tool  = project.toolUsed?.[0] || null;
  const fontSize = Math.round(Math.min(height * 0.32, 52));
  return (
    <svg width={width} height={height} viewBox={`0 0 400 ${height}`} xmlns="http://www.w3.org/2000/svg"
      style={{display:"block",flexShrink:0,...style}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={cc.bg}/>
          <stop offset="100%" stopColor={bgEnd}/>
        </linearGradient>
      </defs>
      <rect width="400" height={height} fill={`url(#${id})`}/>
      {/* initials */}
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={fontSize} fontFamily="Rubik,sans-serif" fontWeight="700"
        fill={cc.text} opacity={0.9} style={{userSelect:"none"}}>{initials}</text>
      {/* tool badge bottom-right */}
      {tool&&(
        <>
          <rect x="316" y={height-26} width={78} height={18} rx="9" fill="white" opacity={0.85}/>
          <text x="355" y={height-14} textAnchor="middle" fontSize="9" fontFamily="Rubik,sans-serif"
            fontWeight="600" fill={cc.text} opacity={0.9}>{tool.length>10?tool.slice(0,10)+"…":tool}</text>
        </>
      )}
    </svg>
  );
};

// ── DS Component Helpers ──────────────────────────────────────────────────────
const Chip = ({label,active,onClick,color}) => (
  <button onClick={onClick} style={{
    display:"inline-flex",alignItems:"center",gap:4,
    padding:"4px 12px",borderRadius:DS.radius.full,
    border:"1.5px solid "+(active?(color||C.kangkong500):C.mushroom300),
    background:active?(color?color+"18":C.kangkong50):C.white,
    color:active?(color||C.kangkong600):C.mushroom600,
    fontFamily:FF,fontSize:13,fontWeight:active?600:400,
    cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",
  }}>{label}</button>
);

const Badge = ({label,tone="neutral",size="sm"}) => {
  const tones = {
    neutral:{bg:C.mushroom100,text:C.mushroom700},
    success:{bg:C.kangkong100,text:C.kangkong700},
    danger: {bg:C.tomato100,  text:C.tomato600},
    pending:{bg:C.mango100,   text:C.mango600},
    info:   {bg:C.blueberry100,text:C.blueberry500},
    accent: {bg:C.ubas100,    text:C.ubas500},
  };
  const t = tones[tone]||tones.neutral;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",
      padding:size==="sm"?"2px 8px":"4px 12px",
      borderRadius:DS.radius.full,
      background:t.bg,color:t.text,
      fontFamily:FF,fontSize:size==="sm"?11:12,fontWeight:600,
    }}>{label}</span>
  );
};

const StageBadge = ({stage}) => {
  const sc = STAGE_COLORS[stage] || STAGE_COLORS.seedling;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:6,
      padding:"3px 10px",borderRadius:DS.radius.full,
      background:sc.bg,color:sc.text,
      border:"1px solid "+sc.border,
      fontFamily:FF,fontSize:12,fontWeight:600,
    }}>
      <StageIcon stage={stage} size={14}/>
      {STAGE_LABELS[stage]}
    </span>
  );
};

const CapBadge = ({cap}) => {
  const c2 = CAP_COLORS[cap]||CAP_COLORS.LLM;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"2px 8px",borderRadius:DS.radius.full,
      background:c2.bg,color:c2.text,border:"1px solid "+c2.border,
      fontFamily:FF,fontSize:11,fontWeight:500,
    }}>{cap}</span>
  );
};

const ToolChip = ({tool}) => (
  <span style={{
    fontFamily:FF,fontSize:9,fontWeight:600,
    padding:"2px 7px",borderRadius:DS.radius.full,
    background:C.kangkong50,border:"1px solid "+C.kangkong200,
    color:C.kangkong700,whiteSpace:"nowrap",
  }}>{tool}</span>
);

const ProgressBar = ({value,color,height=8}) => (
  <div style={{background:C.mushroom200,borderRadius:DS.radius.full,overflow:"hidden",height}}>
    <div style={{
      width:Math.min(100,value)+"%",height:"100%",
      background:color||C.kangkong500,
      borderRadius:DS.radius.full,transition:"width 0.6s ease",
    }}/>
  </div>
);

function Card({children,tone="plain",style={},onClick,hoverable}) {
  const [hov,setHov] = useState(false);
  const tones = {
    plain:   {bg:C.white,         border:C.mushroom200},
    neutral: {bg:C.mushroom50,    border:C.mushroom200},
    success: {bg:C.kangkong50,    border:C.kangkong200},
    info:    {bg:C.blueberry100,  border:C.blueberry400},
    pending: {bg:C.mango100,      border:C.mango500},
    caution: {bg:C.carrot100,     border:"#fbd38d"},
    accent:  {bg:C.ubas100,       border:"#d6bcfa"},
    danger:  {bg:C.tomato100,     border:C.tomato500},
  };
  const t = tones[tone]||tones.plain;
  return (
    <div onClick={onClick}
      onMouseEnter={()=>hoverable&&setHov(true)}
      onMouseLeave={()=>hoverable&&setHov(false)}
      style={{
        background:t.bg,border:"1px solid "+t.border,
        borderRadius:DS.radius.xl,padding:"20px",
        boxShadow:hov?DS.shadow.lg:DS.shadow.sm,
        transform:hov&&hoverable?"translateY(-2px)":"none",
        transition:"all 0.2s ease",
        cursor:onClick?"pointer":"default",
        ...style,
      }}>{children}</div>
  );
}

const GroveLogo = ({ theme = "dark", size = 32 }) => {
  const THEMES = {
    dark:  { bg: C.kangkong800, icon: C.kangkong100, vein: C.kangkong800 },
    white: { bg: null,          icon: "#ffffff",      vein: "rgba(255,255,255,0.3)" },
    gray:  { bg: C.mushroom200, icon: C.mushroom500,  vein: C.mushroom200 },
    green: { bg: null,          icon: "rgba(255,255,255,0.92)", vein: "rgba(255,255,255,0.25)" },
  };
  const t  = THEMES[theme] || THEMES.dark;
  const br = Math.round(size * 0.25) + "px";
  const ic = Math.round(size * 0.6);
  const svg = (
    <svg width={ic} height={ic} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 2C10 2 3.5 6 3.5 12.5C3.5 16.3 6.4 19 10 19C13.6 19 16.5 16.3 16.5 12.5C16.5 6 10 2 10 2Z" fill={t.icon}/>
      <path d="M10 8V18" stroke={t.vein} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
  if (t.bg) {
    return (
      <div style={{width:size,height:size,background:t.bg,borderRadius:br,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        {svg}
      </div>
    );
  }
  return (
    <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      {svg}
    </div>
  );
};

// ── Duplicate Detector ────────────────────────────────────────────────────────
// ── Related projects — score-based matching ───────────────────────────────────
// extractKeywords, countOverlap, getRelatedProjects imported from ./lib/utils.js

const findRelated = getRelatedProjects;

// ── Overview Dashboard helpers ────────────────────────────────────────────────

const OVERVIEW_KF = `
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes ovPulse{0%,100%{opacity:1}50%{opacity:0.4}}
`;

// getActivityFeed imported from ./lib/utils.js

const getToolCounts = (projects) => {
  const counts = {};
  for (const p of projects) {
    for (const tool of (p.toolUsed || [])) {
      counts[tool] = (counts[tool] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
};

// ── Overview Dashboard ────────────────────────────────────────────────────────
const OverviewDashboard = ({ projects, wishes, authUser, onSelectProject, onNavigateGarden, onNavigateWishlist }) => {
  // ── Animation state ─────────────────────────────────────────────────────────
  const [counts, setCounts]         = useState({ seeds:0, seedling:0, nursery:0, sprout:0, bloom:0, thriving:0 });
  const [barsReady, setBarsReady]   = useState(false);
  const [hoverTile, setHoverTile]   = useState(null);
  const [clickTile, setClickTile]   = useState(null);

  // ── Computed data ────────────────────────────────────────────────────────────
  const unclaimedSeeds = wishes.filter(w => !w.claimedBy && !w.fulfilledBy);
  const seedCount      = unclaimedSeeds.length;
  const highVoteSeeds  = unclaimedSeeds.filter(w => w.upvoters.length >= 4).length;

  const pipeline = {
    seeds:    wishes.filter(w => !w.fulfilledBy).length,
    seedling: projects.filter(p => p.stage === "seedling").length,
    nursery:  projects.filter(p => p.stage === "nursery").length,
    sprout:   projects.filter(p => p.stage === "sprout").length,
    bloom:    projects.filter(p => p.stage === "bloom").length,
    thriving: projects.filter(p => p.stage === "thriving").length,
  };

  // lastUpdated = days since last update; ascending sort puts lowest (most recent) at [0] ✓
  const spotlight = projects
    .filter(p => p.stage === "thriving")
    .sort((a, b) => a.lastUpdated - b.lastUpdated)[0] || null;

  const activityFeed = getActivityFeed(projects, wishes);

  const topBuilders = (() => {
    const map = {};
    for (const p of projects) {
      if (p.stage === "seedling") continue;
      const key = p.builderEmail || p.builder;
      if (!map[key]) map[key] = { name: p.builder || p.builderEmail, email: p.builderEmail, count: 0 };
      map[key].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 4);
  })();

  const topSeeds = wishes
    .filter(w => w.upvoters.length > 0)
    .sort((a, b) => b.upvoters.length - a.upvoters.length)
    .slice(0, 3);

  const toolCounts = getToolCounts(projects);

  const deptCoverage = Object.keys(DEPT_ZONES).map(dept => ({
    dept,
    count: projects.filter(p => p.builtBy === dept).length,
  })).sort((a, b) => b.count - a.count);

  // Action zone data
  const myProjects    = projects.filter(p => p.builderEmail === authUser?.email);
  const nurseryQueue  = projects.filter(p => p.stage === "nursery")
    .sort((a, b) => {
      const aMs = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bMs = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return aMs - bMs; // ASC — oldest first
    });
  const stalePlants   = projects
    .filter(p => p.lastUpdated > 30)
    .sort((a, b) => b.lastUpdated - a.lastUpdated);
  const seedsToClaim  = wishes
    .filter(w => !w.claimedBy && !w.fulfilledBy)
    .sort((a, b) => b.upvoters.length - a.upvoters.length)
    .slice(0, 3);

  const healthPct = Math.round(
    (projects.filter(p => p.stage === "bloom" || p.stage === "thriving").length /
      Math.max(projects.length, 1)) * 100
  );

  // ── CountUp animation (200ms delay, 600ms duration) ─────────────────────────
  useEffect(() => {
    const targets = { ...pipeline };
    const steps = 600 / 16;
    const cur = { seeds: 0, seedling: 0, nursery: 0, sprout: 0, bloom: 0, thriving: 0 };
    let timerRef = null;
    const delay = setTimeout(() => {
      timerRef = setInterval(() => {
        let done = true;
        const next = { ...cur };
        for (const key of Object.keys(targets)) {
          const step = targets[key] / steps;
          next[key] = Math.min(cur[key] + step, targets[key]);
          if (next[key] < targets[key]) done = false;
          cur[key] = next[key];
        }
        setCounts({
          seeds: Math.round(next.seeds), seedling: Math.round(next.seedling),
          nursery: Math.round(next.nursery), sprout: Math.round(next.sprout),
          bloom: Math.round(next.bloom), thriving: Math.round(next.thriving),
        });
        if (done) clearInterval(timerRef);
      }, 16);
    }, 200);
    return () => { clearTimeout(delay); if (timerRef) clearInterval(timerRef); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bar grow animation (300ms delay) ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setBarsReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── Hero greeting ────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = (hour >= 6 && hour < 12) ? "Good morning" : (hour >= 12 && hour < 17) ? "Good afternoon" : "Good evening";
  const firstName = authUser?.displayName?.trim() || authUser?.email?.split("@")[0] || "";

  // ── Dot color map for activity feed ─────────────────────────────────────────
  const FEED_DOTS = {
    thriving:  C.blueberry500,
    approved:  C.blueberry400,
    nursery:   C.mango500,
    bloom:     C.kangkong500,
    sprout:    C.wintermelon400,
    added:     C.mushroom400,
    seed:      C.ubas500,
    claimed:   C.mushroom300,
    fulfilled: C.wintermelon500,
  };

  const ageLabel = (days) => days === 0 ? "today" : days === 1 ? "1d ago" : `${days}d ago`;

  // ── Tile config ──────────────────────────────────────────────────────────────
  const TILE_CFG = [
    { key:"seeds",    label:"Seeds",    sub:"Ideas waiting to be built",  bg:C.mushroom50,  border:C.mushroom200, countColor:C.mushroom900, nav:()=>onNavigateWishlist?.() },
    { key:"seedling", label:"Seedling", sub:STAGE_DESC.seedling,          bg:C.white,       border:C.mushroom200, countColor:C.mushroom900, nav:()=>onNavigateGarden?.("board","seedling") },
    { key:"nursery",  label:"Nursery",  sub:STAGE_DESC.nursery,           bg:C.mango50,     border:C.mango500,   countColor:C.mango600,   nav:()=>onNavigateGarden?.("board","nursery") },
    { key:"sprout",   label:"Sprout",   sub:STAGE_DESC.sprout,            bg:C.white,       border:C.mushroom200, countColor:C.mushroom900, nav:()=>onNavigateGarden?.("board","sprout") },
    { key:"bloom",    label:"Bloom",    sub:STAGE_DESC.bloom,             bg:C.white,       border:C.mushroom200, countColor:C.mushroom900, nav:()=>onNavigateGarden?.("board","bloom") },
    { key:"thriving", label:"Thriving", sub:STAGE_DESC.thriving,          bg:C.kangkong50,  border:C.kangkong200, countColor:C.kangkong700, nav:()=>onNavigateGarden?.("board","thriving") },
  ];

  return (
    <div style={{ padding:"28px 32px", background:C.mushroom100, minHeight:"100%", overflowY:"auto", fontFamily:FF }}>
      <style>{OVERVIEW_KF}</style>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom:20, animation:"fadeUp 0.4s ease both" }}>
        <div style={{ fontSize:19, fontWeight:700, color:C.mushroom900, letterSpacing:"-0.01em", marginBottom:3 }}>
          {greeting}, {firstName}
        </div>
        <div style={{ fontSize:12, color:C.mushroom500 }}>
          Live snapshot of Sprout&rsquo;s AI ecosystem &middot; {projects.length} active plants across PH &amp; TH
        </div>
      </div>

      {/* ── Pipeline tiles ───────────────────────────────────────────────── */}
      <div style={{
        display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:6, marginBottom:20,
        animation:"fadeUp 0.4s ease 0.05s both",
      }}>
        {TILE_CFG.map((t, i) => {
          const isHov = hoverTile === i;
          const isClk = clickTile === i;
          return (
            <div
              key={t.key}
              onMouseEnter={() => setHoverTile(i)}
              onMouseLeave={() => setHoverTile(null)}
              onClick={() => {
                setClickTile(i);
                setTimeout(() => { setClickTile(null); t.nav(); }, 120);
              }}
              style={{
                background: t.bg,
                border: `0.5px solid ${isHov ? (t.key==="nursery" ? C.mango500 : C.kangkong200) : t.border}`,
                borderRadius: 9,
                padding: "12px 10px",
                cursor: "pointer",
                textAlign: "center",
                transform: isClk ? "scale(0.97)" : isHov ? "translateY(-2px)" : "none",
                boxShadow: isHov ? DS.shadow.sm : "none",
                transition: "all 0.18s ease",
                userSelect: "none",
              }}
            >
              <div style={{ fontSize:20, fontWeight:600, color:t.countColor, lineHeight:1 }}>
                {counts[t.key]}
              </div>
              <div style={{ fontSize:10, fontWeight:600, color:C.mushroom700, marginTop:3 }}>
                {t.label}
              </div>
              <div style={{ fontSize:9, color:C.mushroom400, marginTop:2, lineHeight:1.4 }}>
                {t.sub}
              </div>
              <div style={{ fontSize:9, fontWeight:600, color:C.kangkong500, marginTop:5, opacity:isHov?1:0, transition:"opacity 0.18s" }}>
                View all →
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:16, alignItems:"start" }}>

        {/* ── LEFT COLUMN (flex 1.45) ──────────────────────────────────── */}
        <div style={{ flex:"1.45 1 0", minWidth:0, display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── Action zone — Your Focus ────────────────────────────────── */}
          <div style={{ animation:"fadeUp 0.4s ease 0.1s both" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
              Your Focus
            </div>
            <div style={{ display:"flex", gap:12 }}>

              {/* LEFT PANEL */}
              <div style={{ flex:1, background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
                {authUser?.isExcom ? (
                  /* Approver: Nursery queue */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      Nursery Queue
                    </div>
                    {nurseryQueue.length === 0 ? (
                      <div style={{ fontSize:11, color:C.mushroom400 }}>No plants awaiting review.</div>
                    ) : nurseryQueue.map((p, i) => {
                      const submitted = p.submittedAt ? Math.floor((Date.now() - new Date(p.submittedAt).getTime()) / 86400000) : p.lastUpdated;
                      const overdue = submitted > 7;
                      return (
                        <div key={p.id}
                          onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; }}
                          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; }}
                          onClick={() => onSelectProject(p)}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom: i<nurseryQueue.length-1?`0.5px solid ${C.mushroom100}`:"none", cursor:"pointer", transition:"all 0.15s" }}
                        >
                          <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:0 }}>
                            <span style={{ fontSize:9, fontWeight:600, background:C.mango100, color:C.mango600, border:`0.5px solid ${C.mango500}`, borderRadius:DS.radius.full, padding:"1px 7px", flexShrink:0 }}>
                              Nursery
                            </span>
                            <span style={{ fontSize:12, fontWeight:500, color:C.mushroom900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                          </div>
                          {overdue && (
                            <span style={{ fontSize:9, fontWeight:600, background:C.tomato100, color:C.tomato500, border:`0.5px solid ${C.tomato500}`, borderRadius:DS.radius.full, padding:"1px 7px", flexShrink:0, marginLeft:6 }}>
                              Overdue {submitted}d
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : authUser?.isGardener ? (
                  /* Admin: Garden health — stale plants */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      Garden Health
                    </div>
                    {stalePlants.length === 0 ? (
                      <div style={{ fontSize:11, color:C.mushroom400 }}>No stale plants. Garden is healthy!</div>
                    ) : stalePlants.slice(0, 5).map((p, i) => (
                      <div key={p.id}
                        onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; }}
                        onClick={() => onSelectProject(p)}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom: i<Math.min(stalePlants.length,5)-1?`0.5px solid ${C.mushroom100}`:"none", cursor:"pointer", transition:"all 0.15s" }}
                      >
                        <span style={{ fontSize:12, fontWeight:500, color:C.mushroom900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p.name}</span>
                        <span style={{ fontSize:10, color:C.mushroom400, flexShrink:0, marginLeft:8 }}>{p.lastUpdated}d ago</span>
                      </div>
                    ))}
                  </>
                ) : (
                  /* Planter: My plants with next-action CTAs */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      My Plants
                    </div>
                    {myProjects.length === 0 ? (
                      <div style={{ fontSize:11, color:C.mushroom400 }}>You haven&rsquo;t added any plants yet.</div>
                    ) : myProjects.slice(0, 5).map((p, i) => {
                      let ctaText = null;
                      if (p.stage === "seedling" && !p.prototypeLink) ctaText = "Add prototype →";
                      else if (p.stage === "seedling" && p.prototypeLink) ctaText = "Submit for review →";
                      else if (p.stage === "nursery" && p.reviewStatus === "needs_rework") ctaText = "View feedback →";
                      else if (p.stage === "nursery") ctaText = null;
                      else ctaText = "View →";
                      return (
                        <div key={p.id}
                          onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; const cta=e.currentTarget.querySelector(".ov-cta"); if(cta) cta.style.opacity=1; }}
                          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; const cta=e.currentTarget.querySelector(".ov-cta"); if(cta) cta.style.opacity=0; }}
                          onClick={() => onSelectProject(p)}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom: i<Math.min(myProjects.length,5)-1?`0.5px solid ${C.mushroom100}`:"none", cursor:"pointer", transition:"all 0.15s" }}
                        >
                          <div style={{ display:"flex", alignItems:"center", gap:6, flex:1, minWidth:0 }}>
                            <span style={{ fontSize:9, fontWeight:600, background:STAGE_COLORS[p.stage]?.bg, color:STAGE_COLORS[p.stage]?.text, border:`0.5px solid ${STAGE_COLORS[p.stage]?.border}`, borderRadius:DS.radius.full, padding:"1px 7px", flexShrink:0 }}>
                              {STAGE_LABELS[p.stage]}
                            </span>
                            <span style={{ fontSize:12, fontWeight:500, color:C.mushroom900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                          </div>
                          {ctaText ? (
                            <span className="ov-cta" style={{ fontSize:11, fontWeight:600, color:C.kangkong500, flexShrink:0, marginLeft:8, opacity:0, transition:"opacity 0.15s" }}>{ctaText}</span>
                          ) : (
                            <span className="ov-cta" style={{ fontSize:10, color:C.mushroom400, flexShrink:0, marginLeft:8, opacity:0 }}>Under review</span>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* RIGHT PANEL */}
              <div style={{ flex:1, background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
                {authUser?.isExcom ? (
                  /* Approver: My plants */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      My Plants
                    </div>
                    {myProjects.length === 0 ? (
                      <div style={{ fontSize:11, color:C.mushroom400 }}>You haven&rsquo;t added any plants yet.</div>
                    ) : myProjects.slice(0,5).map((p, i) => (
                      <div key={p.id}
                        onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; }}
                        onClick={() => onSelectProject(p)}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom: i<Math.min(myProjects.length,5)-1?`0.5px solid ${C.mushroom100}`:"none", cursor:"pointer", transition:"all 0.15s" }}
                      >
                        <span style={{ fontSize:12, fontWeight:500, color:C.mushroom900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p.name}</span>
                        <span style={{ fontSize:10, color:C.mushroom400, flexShrink:0, marginLeft:8 }}>{p.lastUpdated}d ago</span>
                      </div>
                    ))}
                  </>
                ) : authUser?.isGardener ? (
                  /* Admin: Quick stats */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      Quick Stats
                    </div>
                    {[
                      { label:"Total plants", value:projects.length },
                      { label:"Pipeline health", value:healthPct + "%" },
                      { label:"Nursery queue", value:nurseryQueue.length },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`0.5px solid ${C.mushroom100}` }}>
                        <span style={{ fontSize:11, color:C.mushroom600 }}>{label}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:C.mushroom900 }}>{value}</span>
                      </div>
                    ))}
                    <button onClick={() => onNavigateGarden?.("board","All")} style={{ marginTop:10, fontSize:11, fontWeight:600, color:C.kangkong500, background:"none", border:`0.5px solid ${C.kangkong200}`, borderRadius:DS.radius.md, padding:"5px 10px", cursor:"pointer", width:"100%" }}>
                      View Board →
                    </button>
                  </>
                ) : (
                  /* Planter: Seeds to claim */
                  <>
                    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.mushroom500, marginBottom:10 }}>
                      Seeds to Claim
                    </div>
                    {seedsToClaim.length === 0 ? (
                      <div style={{ fontSize:11, color:C.mushroom400 }}>No unclaimed Seeds right now.</div>
                    ) : seedsToClaim.map((w, i) => (
                      <div key={w.id}
                        onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; }}
                        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; }}
                        onClick={() => onNavigateWishlist?.()}
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom: i<seedsToClaim.length-1?`0.5px solid ${C.mushroom100}`:"none", cursor:"pointer", transition:"all 0.15s" }}
                      >
                        <span style={{ fontSize:12, fontWeight:500, color:C.mushroom900, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{w.title}</span>
                        <span style={{ fontSize:10, color:C.ubas500, fontWeight:600, flexShrink:0, marginLeft:8 }}>▲ {w.upvoters.length}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

            </div>{/* end action zone flex */}
          </div>{/* end action zone section */}

          {/* ── Activity feed ────────────────────────────────────────────────── */}
<div style={{ animation:"fadeUp 0.4s ease 0.15s both" }}>
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
    <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500 }}>
      What&rsquo;s Happening
    </div>
    <div style={{ fontSize:9, color:C.mushroom400 }}>Loaded just now</div>
  </div>
  <div style={{ background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, overflow:"hidden" }}>
    {activityFeed.length === 0 ? (
      <div style={{ padding:"14px", fontSize:12, color:C.mushroom400 }}>No recent activity yet.</div>
    ) : activityFeed.map((ev, i) => (
      <div key={ev.id}
        onMouseEnter={e => { e.currentTarget.style.background=C.mushroom50; e.currentTarget.style.paddingLeft="18px"; }}
        onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.paddingLeft="0"; }}
        style={{
          display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
          borderBottom: i < activityFeed.length - 1 ? `0.5px solid ${C.mushroom100}` : "none",
          transition:"all 0.15s",
          animation:`slideIn 0.25s ease ${i * 0.05}s both`,
        }}
      >
        <div style={{ width:7, height:7, borderRadius:"50%", background:FEED_DOTS[ev.type] || C.mushroom300, flexShrink:0 }}/>
        <div style={{ flex:1, fontSize:12, color:C.mushroom800, lineHeight:1.4 }}>{ev.text}</div>
        <div style={{ fontSize:10, color:C.mushroom400, flexShrink:0 }}>{ageLabel(ev.age)}</div>
      </div>
    ))}
  </div>

  {/* Seeds nudge */}
  {seedCount > 0 && (
    <div
      onMouseEnter={e => { e.currentTarget.style.background=C.ubas100; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background=C.ubas100; e.currentTarget.style.transform="none"; }}
      onClick={() => onNavigateWishlist?.()}
      style={{ marginTop:8, padding:"10px 14px", background:C.ubas100, border:`0.5px solid ${C.ubas400}`, borderRadius:DS.radius.md, display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", transition:"all 0.15s" }}
    >
      <span style={{ fontSize:11, color:C.mushroom700 }}>
        <strong style={{ color:C.ubas500 }}>{seedCount}</strong> Seeds unclaimed
        {highVoteSeeds > 0 && ` — ${highVoteSeeds} with 4+ upvotes`}
      </span>
      <span style={{ fontSize:11, fontWeight:600, color:C.ubas500 }}>Browse Seeds →</span>
    </div>
  )}
</div>

          {/* ── Tools in Use ─────────────────────────────────────────────────── */}
<div style={{ animation:"fadeUp 0.4s ease 0.2s both" }}>
  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
    Tools in Use
  </div>
  <div style={{ background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
    {toolCounts.length === 0 ? (
      <div style={{ fontSize:11, color:C.mushroom400 }}>No tool data yet.</div>
    ) : (() => {
      const maxT = toolCounts[0]?.count || 1;
      return (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"3px 20px" }}>
          {toolCounts.map(({ tool, count }) => (
            <div key={tool} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, fontWeight:500, color:C.mushroom800, width:80, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{tool}</span>
              <div style={{ flex:1, height:4, background:C.mushroom100, borderRadius:DS.radius.full, overflow:"hidden" }}>
                <div style={{ height:"100%", width: barsReady ? `${(count/maxT)*100}%` : 0, background:C.kangkong500, transition:"width 0.8s ease 0.4s", borderRadius:DS.radius.full }}/>
              </div>
              <span style={{ fontSize:10, color:C.mushroom500, width:20, textAlign:"right", flexShrink:0 }}>{count}</span>
            </div>
          ))}
        </div>
      );
    })()}
  </div>
</div>

        </div>{/* end left column */}

        {/* ── RIGHT COLUMN (flex 1) ─────────────────────────────────────── */}
        <div style={{ flex:"1 1 0", minWidth:0, display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── Spotlight ───────────────────────────────────────────────────── */}
<div style={{ animation:"fadeUp 0.4s ease 0.1s both" }}>
  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
    Project Spotlight
  </div>
  {spotlight ? (
    <div
      onMouseEnter={e => { e.currentTarget.style.borderColor=C.kangkong400; e.currentTarget.style.boxShadow=DS.shadow.sm; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=C.kangkong200; e.currentTarget.style.boxShadow="none"; e.currentTarget.style.transform="none"; }}
      onClick={() => onSelectProject(spotlight)}
      style={{ background:C.kangkong50, border:`0.5px solid ${C.kangkong200}`, borderRadius:DS.radius.md, padding:"14px", cursor:"pointer", transition:"all 0.18s" }}
    >
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:C.kangkong500, animation:"ovPulse 2s infinite", flexShrink:0 }}/>
        <span style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", color:C.kangkong700 }}>Most recently thriving</span>
      </div>
      <div style={{ fontSize:15, fontWeight:600, color:C.mushroom900, marginBottom:4 }}>{spotlight.name}</div>
      {spotlight.description && (
        <div style={{ fontSize:11, color:C.mushroom700, lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
          {spotlight.description}
        </div>
      )}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        <span style={{ fontSize:10, fontWeight:600, background:STAGE_COLORS.thriving.bg, color:STAGE_COLORS.thriving.text, border:`0.5px solid ${STAGE_COLORS.thriving.border}`, borderRadius:DS.radius.full, padding:"2px 8px" }}>Thriving</span>
        {spotlight.capability && CAP_COLORS[spotlight.capability] && (
          <span style={{ fontSize:10, fontWeight:600, background:CAP_COLORS[spotlight.capability].bg, color:CAP_COLORS[spotlight.capability].text, border:`0.5px solid ${CAP_COLORS[spotlight.capability].border}`, borderRadius:DS.radius.full, padding:"2px 8px" }}>{spotlight.capability}</span>
        )}
        <span style={{ fontSize:10, color:C.mushroom500, background:C.mushroom100, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.full, padding:"2px 8px" }}>
          {spotlight.builtBy}{spotlight.country ? ` · ${spotlight.country}` : ""}
        </span>
      </div>
    </div>
  ) : (
    <div style={{ background:C.kangkong50, border:`0.5px dashed ${C.kangkong200}`, borderRadius:DS.radius.md, padding:"28px 14px", textAlign:"center" }}>
      <div style={{ fontSize:12, fontWeight:500, color:C.kangkong500, marginBottom:4 }}>No thriving plants yet</div>
      <div style={{ fontSize:11, color:C.mushroom500 }}>Be the first to get a plant to Thriving</div>
    </div>
  )}
</div>

          {/* ── Top Builders ─────────────────────────────────────────────────── */}
<div style={{ animation:"fadeUp 0.4s ease 0.2s both" }}>
  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
    Top Builders
  </div>
  <div style={{ background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
    {topBuilders.length === 0 ? (
      <div style={{ fontSize:11, color:C.mushroom400 }}>No data yet.</div>
    ) : (() => {
      const maxB = topBuilders[0]?.count || 1;
      return topBuilders.map((b, i) => (
        <div key={b.email || b.name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom: i<topBuilders.length-1?8:0 }}>
          <span style={{ fontSize:10, color:C.mushroom300, width:12, flexShrink:0 }}>{i+1}</span>
          <div style={{ width:22, height:22, borderRadius:5, background:C.mushroom100, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:9, fontWeight:700, color:C.mushroom600 }}>
            {(b.name||"?").slice(0,2).toUpperCase()}
          </div>
          <span style={{ fontSize:11, color:C.mushroom800, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</span>
          <div style={{ width:50, height:3, background:C.mushroom100, borderRadius:DS.radius.full, overflow:"hidden", flexShrink:0 }}>
            <div style={{ height:"100%", width: barsReady ? `${(b.count/maxB)*100}%` : 0, background:C.kangkong500, transition:"width 0.8s ease 0.3s", borderRadius:DS.radius.full }}/>
          </div>
          <span style={{ fontSize:10, color:C.mushroom500, width:16, textAlign:"right", flexShrink:0 }}>{b.count}</span>
        </div>
      ));
    })()}
  </div>
</div>

{/* ── Top Seeds ─────────────────────────────────────────────────────── */}
<div style={{ animation:"fadeUp 0.4s ease 0.25s both" }}>
  <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
    Top Seeds
  </div>
  <div style={{ background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
    {topSeeds.length === 0 ? (
      <div style={{ fontSize:11, color:C.mushroom400 }}>No Seeds with upvotes yet.</div>
    ) : (() => {
      const maxS = topSeeds[0]?.upvoters.length || 1;
      return topSeeds.map((w, i) => (
        <div key={w.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom: i<topSeeds.length-1?8:0 }}>
          <span style={{ fontSize:10, color:C.mushroom300, width:12, flexShrink:0 }}>{i+1}</span>
          <div style={{ width:22, height:22, borderRadius:5, background:C.ubas100, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, color:C.ubas500 }}>▲</div>
          <span style={{ fontSize:11, color:C.mushroom800, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{w.title}</span>
          <div style={{ width:50, height:3, background:C.mushroom100, borderRadius:DS.radius.full, overflow:"hidden", flexShrink:0 }}>
            <div style={{ height:"100%", width: barsReady ? `${(w.upvoters.length/maxS)*100}%` : 0, background:C.ubas500, transition:"width 0.8s ease 0.3s", borderRadius:DS.radius.full }}/>
          </div>
          <span style={{ fontSize:10, color:C.mushroom500, width:16, textAlign:"right", flexShrink:0 }}>{w.upvoters.length}</span>
        </div>
      ));
    })()}
  </div>
</div>

          {/* ── Dept coverage ────────────────────────────────────────────────── */}
          <div style={{ animation:"fadeUp 0.4s ease 0.3s both" }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:C.mushroom500, marginBottom:8 }}>
              Dept Coverage
            </div>
            <div style={{ background:C.white, border:`0.5px solid ${C.mushroom200}`, borderRadius:DS.radius.md, padding:"12px 14px" }}>
              {(() => {
                const maxD = deptCoverage[0]?.count || 1;
                return deptCoverage.map(({ dept, count }) => {
                  const barColor = count >= 3 ? C.kangkong500 : count >= 1 ? C.mango500 : C.mushroom200;
                  const nameColor = count === 0 ? C.mushroom400 : C.mushroom800;
                  return (
                    <div key={dept} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:11, color:nameColor, width:70, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{dept}</span>
                      <div style={{ flex:1, height:4, background:C.mushroom100, borderRadius:DS.radius.full, overflow:"hidden" }}>
                        <div style={{ height:"100%", width: barsReady && maxD > 0 ? `${(count/maxD)*100}%` : 0, background:barColor, transition:"width 0.8s ease 0.5s", borderRadius:DS.radius.full }}/>
                      </div>
                      <span style={{ fontSize:10, color:C.mushroom500, width:16, textAlign:"right", flexShrink:0 }}>{count}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

        </div>{/* end right column */}

      </div>{/* end two-column body */}

    </div>
  );
};


// ── AI Features ───────────────────────────────────────────────────────────────

// AI Project Summarizer — calls Claude API to generate a clean description
async function callEdgeFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`,
      "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${name}`);
  return res.json();
}

async function generateProjectSummary({name, builtBy, builtFor, area, problem, built, betterNow, impact}) {
  const data = await callEdgeFunction("summarize", { name, builtBy, builtFor, area, problem, built, betterNow, impact });
  if (!data?.text) throw new Error("No text returned from function");
  return data.text;
}

// AI Duplicate Detector — calls Supabase edge function with pre-filtered candidates
async function detectDuplicates(newProject, candidates) {
  if (!candidates.length) return [];
  try {
    const data = await callEdgeFunction("check-duplicates", { newProject, candidates });
    return data?.overlaps || [];
  } catch(e) {
    return [];
  }
}

// ── User Avatar Component ─────────────────────────────────────────────────────
function UserAvatar({user, size=28, style={}}) {
  const [imgError, setImgError] = useState(false);
  const photoURL = user?.photoURL;
  const initials = user?.displayName
    ? user.displayName.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)
    : user?.email?.[0]?.toUpperCase() || "?";

  if (photoURL && !imgError) {
    return (
      <img
        src={photoURL} alt={user?.displayName || "User"}
        onError={()=>setImgError(true)}
        style={{
          width:size, height:size, borderRadius:"50%",
          objectFit:"cover", border:"2px solid "+C.white,
          boxShadow:DS.shadow.sm, flexShrink:0, ...style,
        }}
      />
    );
  }
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:C.kangkong600, color:C.white,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:FF, fontSize:size*0.35, fontWeight:700,
      border:"2px solid "+C.white, boxShadow:DS.shadow.sm,
      flexShrink:0, ...style,
    }}>{initials}</div>
  );
}

// ── View Mode Icons ───────────────────────────────────────────────────────────
function IcoViewGrid({size=16, color=C.mushroom500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      <rect x="9" y="2" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      <rect x="2" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      <rect x="9" y="9" width="5" height="5" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
    </svg>
  );
}
function IcoViewBoard({size=16, color=C.mushroom500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="3" height="12" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1"/>
      <rect x="6.5" y="2" width="3" height="9" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.15"/>
      <rect x="11" y="2" width="3" height="6" rx="1" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.08"/>
    </svg>
  );
}
function IcoViewGarden({size=16, color=C.mushroom500}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 14 C8 14 3 11 3 7 C3 4.5 5 3 8 3 C11 3 13 4.5 13 7 C13 11 8 14 8 14Z" stroke={color} strokeWidth="1.1" fill={color} fillOpacity="0.1"/>
      <line x1="8" y1="14" x2="8" y2="6" stroke={color} strokeWidth="1" strokeLinecap="round"/>
      <path d="M8 10 C6.5 9 5 9 4.5 10" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none"/>
      <path d="M8 8 C9.5 7 11 7 11.5 8" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}


// ── Active Filter Chip ─────────────────────────────────────────────────────────
function ActiveFilterChip({label, onRemove, color, icon}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px 3px 10px",borderRadius:DS.radius.full,background:color?color+"18":C.mushroom100,border:"1px solid "+(color?color+"40":C.mushroom300),fontFamily:FF,fontSize:11,fontWeight:600,color:color||C.mushroom700}}>
      {icon&&<span style={{display:"inline-flex",alignItems:"center"}}>{icon}</span>}
      {label}
      <button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",color:color||C.mushroom500,lineHeight:1}}>
        <svg width={12} height={12} viewBox="0 0 12 12" fill="none"><line x1="3" y1="3" x2="9" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><line x1="9" y1="3" x2="3" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}

// ── Wish Detail Panel ──────────────────────────────────────────────────────────
function WishDetailPanel({wish, onClose, onClaim, onEdit, authUser}) {
  const deptColor = DEPT_COLORS[wish.builtFor]||C.mushroom500;
  const isBuilder  = wish.claimedByEmail === authUser?.email;
  const isAdmin = authUser?.isAdmin;
  const isClaimed  = !!wish.claimedBy;
  return (
    <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.5)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,padding:0,maxWidth:480,width:"92%",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,overflow:"hidden",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{background:C.mushroom100,padding:"20px 24px",borderBottom:"1px solid "+C.mushroom200}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <StageBadge stage="seed"/>
              {isClaimed&&!wish.fulfilledBy&&<span style={{fontFamily:FF,fontSize:10,fontWeight:700,background:C.wintermelon100,color:C.wintermelon500,border:"1px solid "+C.wintermelon400,borderRadius:DS.radius.full,padding:"2px 8px"}}>🔨 Being built</span>}
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {(authUser?.email===wish.wisherEmail||isAdmin)&&!wish.fulfilledBy&&(
                <button onClick={()=>onEdit(wish)} style={{background:C.white,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.md,padding:"4px 10px",cursor:"pointer",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600}}>Edit</button>
              )}
              <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcoClose size={18} color={C.mushroom400}/></button>
            </div>
          </div>
          <div style={{fontFamily:FF,fontSize:18,fontWeight:700,color:C.mushroom900,marginBottom:6,lineHeight:1.3,display:"flex",alignItems:"flex-start",gap:8}}>{wish.title}{wish.country&&<>&nbsp;<CountryBadge country={wish.country} size="lg"/></>}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:deptColor,padding:"2px 8px",background:deptColor+"18",borderRadius:DS.radius.full}}>For {wish.builtFor}</span>
            <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>Wished by <strong style={{color:C.mushroom700}}>{wish.wisherName}</strong></span>
            <span style={{fontFamily:FF,fontSize:11,color:C.mushroom400}}>{wish.createdDaysAgo}d ago</span>
          </div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{fontFamily:FF,fontSize:13,color:C.mushroom600,lineHeight:1.7,marginBottom:16}}>{wish.why}</div>
          {isClaimed&&(
            <div style={{background:C.wintermelon100,border:"1px solid "+C.wintermelon400,borderRadius:DS.radius.lg,padding:"10px 14px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:16}}>🔨</span>
              <div>
                <div style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.wintermelon500}}>Being built by {wish.claimedBy}</div>
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>Claimed on {wish.claimedAt}</div>
              </div>
            </div>
          )}
          <div style={{background:C.mushroom50,borderRadius:DS.radius.lg,padding:"12px 16px",marginBottom:16,border:"1px solid "+C.mushroom200}}>
            <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>Upvoted by ({wish.upvoters.length})</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {wish.upvoters.length===0
                ? <span style={{fontFamily:FF,fontSize:12,color:C.mushroom400,fontStyle:"italic"}}>No upvotes yet</span>
                : wish.upvoters.map((u,i)=>(
                  <span key={i} style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom700,background:C.white,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.full,padding:"3px 10px"}}>{u}</span>
                ))
              }
            </div>
          </div>
          {wish.fulfilledBy
            ? <div style={{background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"12px 16px",fontFamily:FF,fontSize:13,color:C.kangkong700,display:"flex",alignItems:"center",gap:8}}>
                <IcoCheck size={16} color={C.kangkong500}/> Built as <strong>{wish.fulfilledBy}</strong>
              </div>
            : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {!isClaimed&&(
                  <button onClick={onClaim} style={{width:"100%",padding:"11px",background:C.kangkong700,color:C.white,border:"none",borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <IcoAdd size={16} color={C.white}/> I'll build this
                  </button>
                )}
                {isClaimed&&!isBuilder&&!isAdmin&&(
                  <div style={{padding:"10px 14px",background:C.mushroom50,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg,fontFamily:FF,fontSize:12,color:C.mushroom500,textAlign:"center"}}>
                    {wish.claimedBy} is already building this
                  </div>
                )}
              </div>
          }
        </div>
      </div>
    </div>
  );
}


// ── Unified Garden Hub (Directory + Garden + Board) ───────────────────────────
const GardenHub = ({projects, wishes, selected, setSelected, authUser, onMoveStage, onWishClaim, onUnclaimSeed, onUpdateWish, initialViewMode="directory", initialStageFilter="All"}) => {
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [deptFilter, setDeptFilter] = useState("All");
  const [capFilter, setCapFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState(initialStageFilter);
  const [builderFilter, setBuilderFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState(null);
  const [editingWish, setEditingWish] = useState(null);
  const [claimingWish, setClaimingWish] = useState(null);
  const [dragProjectId, setDragProjectId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const filterRef = useRef(null);

  // Close filter drawer on outside click
  useEffect(() => {
    const handler = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterCount = (deptFilter!=="All"?1:0)+(capFilter!=="All"?1:0)+(stageFilter!=="All"?1:0)+(builderFilter!=="All"?1:0)+(countryFilter!=="All"?1:0);

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    const ms = !q || p.name.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q) || p.builtBy.toLowerCase().includes(q) || p.builtFor.toLowerCase().includes(q) || (p.problemSpace||"").toLowerCase().includes(q);
    const md = deptFilter === "All" || p.builtBy === deptFilter || p.builtFor === deptFilter;
    const mc = capFilter === "All" || p.capability === capFilter;
    const mb = builderFilter === "All" || p.builder === builderFilter;
    const mct = countryFilter === "All" || p.country === countryFilter;
    const ms2 = stageFilter === "All" || stageFilter === "seed" ? ms && md && mc && mb : ms && md && mc && mb && p.stage === stageFilter;
    return stageFilter === "seed" ? false : ms && md && mc && mb && mct && (stageFilter==="All" || p.stage===stageFilter);
  });

  const filteredWishes = wishes.filter(w => {
    if (stageFilter !== "All" && stageFilter !== "seed") return false;
    const q = search.toLowerCase();
    const ms = !q || w.title.toLowerCase().includes(q) || (w.why||"").toLowerCase().includes(q) || w.wisherName.toLowerCase().includes(q);
    const md = deptFilter === "All" || w.builtFor === deptFilter;
    return ms && md && !w.fulfilledBy;
  });

  const showSeeds = stageFilter === "All" || stageFilter === "seed";

  const moveStage = (project, dirOrStage) => onMoveStage(project, dirOrStage);

  const handleConfirmClaim = () => {
    if (!claimingWish) return;
    onWishClaim(claimingWish.id);
    setSelectedWish(prev => prev?.id===claimingWish.id ? {...prev, claimedBy:authUser.displayName, claimedByEmail:authUser.email} : prev);
    setClaimingWish(null);
  };


  const VIEW_MODES = [
    {id:"directory", label:"Directory", Icon:IcoViewGrid},
    {id:"garden",    label:"Garden",    Icon:IcoViewGarden},
    {id:"board",     label:"Board",     Icon:IcoViewBoard},
  ];

  const ALL_STAGES_WITH_SEED = ["seed", ...STAGES];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",background:C.mushroom50}}>

      {/* ── Toolbar ── */}
      <div style={{padding:"10px 20px",background:C.white,borderBottom:"1px solid "+C.mushroom200,display:"flex",gap:10,alignItems:"center",zIndex:20,flexShrink:0}}>

        {/* Search */}
        {viewMode === "directory" && (
          <div style={{position:"relative",flex:"1",minWidth:160,maxWidth:280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}>
              <IcoSearch size={14} color={C.mushroom400}/>
            </span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search projects…"
              style={{width:"100%",padding:"7px 10px 7px 30px",border:"1.5px solid "+C.mushroom300,borderRadius:DS.radius.lg,fontFamily:FF,fontSize:12,color:C.mushroom800,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=C.kangkong500}
              onBlur={e=>e.target.style.borderColor=C.mushroom300}
            />
          </div>
        )}

        {/* Filter button */}
        <div style={{position:"relative"}} ref={filterRef}>
          <button onClick={()=>setFilterOpen(o=>!o)} style={{
            display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
            border:"1.5px solid "+(filterOpen||activeFilterCount>0?C.kangkong500:C.mushroom300),
            borderRadius:DS.radius.lg,background:filterOpen?C.kangkong50:activeFilterCount>0?C.kangkong50:C.white,
            fontFamily:FF,fontSize:12,fontWeight:600,
            color:filterOpen||activeFilterCount>0?C.kangkong600:C.mushroom600,
            cursor:"pointer",transition:"all 0.15s",
          }}>
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="3.5" y1="7" x2="10.5" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="5" y1="10" x2="9" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Filters
            {activeFilterCount>0&&(
              <span style={{background:C.kangkong500,color:C.white,borderRadius:DS.radius.full,fontSize:10,fontWeight:800,padding:"1px 6px",lineHeight:1.4}}>{activeFilterCount}</span>
            )}
          </button>

          {/* Filter Drawer */}
          {filterOpen&&(
            <div style={{
              position:"absolute",top:"calc(100% + 8px)",left:0,
              background:C.white,borderRadius:DS.radius.xl,
              border:"1px solid "+C.mushroom200,boxShadow:DS.shadow.lg,
              padding:"16px 18px",zIndex:100,minWidth:340,
              animation:"slideUp 0.2s ease",
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.mushroom700}}>Filter projects</span>
                {activeFilterCount>0&&(
                  <button onClick={()=>{setDeptFilter("All");setCapFilter("All");setStageFilter("All");setBuilderFilter("All");setCountryFilter("All");}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:FF,fontSize:11,color:C.tomato500,fontWeight:600}}>Clear all</button>
                )}
              </div>

              {/* Team */}
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>Team</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {["All",...Object.keys(DEPT_ZONES)].map(d=>(
                    <Chip key={d} label={d==="All"?"All":d} active={deptFilter===d} onClick={()=>setDeptFilter(d)} color={DEPT_COLORS[d]}/>
                  ))}
                </div>
              </div>

              {/* Stage */}
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>Stage</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {["All",...ALL_STAGES_WITH_SEED].map(s=>(
                    <Chip key={s} label={s==="All"?"All":STAGE_LABELS[s]} active={stageFilter===s} onClick={()=>setStageFilter(s)}/>
                  ))}
                </div>
              </div>

              {/* AI Type */}
              <div>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>AI Type</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {CAPABILITIES.map(c=>(
                    <Chip key={c} label={c} active={capFilter===c} onClick={()=>setCapFilter(c)}/>
                  ))}
                </div>
              </div>

              {/* Builder */}
              <div style={{marginTop:14}}>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>Builder (Farmer)</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {["All",...[...new Set(projects.map(p=>p.builder).filter(Boolean))].sort()].map(b=>(
                    <Chip key={b} label={b==="All"?"All":b} active={builderFilter===b} onClick={()=>setBuilderFilter(b)}/>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div style={{marginTop:14}}>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom400,marginBottom:8}}>Country</div>
                <div style={{display:"flex",gap:6}}>
                  {[{k:"All",label:"All",flag:null},{k:"PH",label:"Philippines",flag:"PH"},{k:"TH",label:"Thailand",flag:"TH"}].map(opt=>(
                    <button key={opt.k} onClick={()=>setCountryFilter(opt.k)} style={{
                      display:"inline-flex",alignItems:"center",gap:5,
                      padding:"6px 14px",borderRadius:DS.radius.full,border:"1.5px solid "+(countryFilter===opt.k?C.kangkong500:C.mushroom200),
                      background:countryFilter===opt.k?C.kangkong50:C.white,
                      color:countryFilter===opt.k?C.kangkong700:C.mushroom600,
                      fontFamily:FF,fontSize:12,fontWeight:countryFilter===opt.k?700:500,cursor:"pointer",transition:"all 0.12s",
                    }}>{opt.flag&&<FlagSVG country={opt.flag} w={14} h={10}/>}{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount>0&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {deptFilter!=="All"&&<ActiveFilterChip label={deptFilter} onRemove={()=>setDeptFilter("All")} color={DEPT_COLORS[deptFilter]}/>}
            {stageFilter!=="All"&&<ActiveFilterChip label={STAGE_LABELS[stageFilter]} onRemove={()=>setStageFilter("All")}/>}
            {capFilter!=="All"&&<ActiveFilterChip label={capFilter} onRemove={()=>setCapFilter("All")}/>}
            {builderFilter!=="All"&&<ActiveFilterChip label={builderFilter} onRemove={()=>setBuilderFilter("All")}/>}
            {countryFilter!=="All"&&<ActiveFilterChip label={COUNTRY_NAME[countryFilter]} onRemove={()=>setCountryFilter("All")} icon={<FlagSVG country={countryFilter} w={14} h={10}/>}/>}
          </div>
        )}

        {/* View mode switcher */}
        <div style={{marginLeft:"auto",display:"flex",background:C.mushroom100,borderRadius:DS.radius.md,padding:2,gap:1,flexShrink:0}}>
          {VIEW_MODES.map(vm=>{
            const Icon = vm.Icon;
            const active = viewMode===vm.id;
            return (
              <button key={vm.id} onClick={()=>setViewMode(vm.id)} style={{
                padding:"5px 12px",border:"none",cursor:"pointer",
                fontFamily:FF,fontSize:12,fontWeight:600,
                borderRadius:DS.radius.sm,transition:"all 0.15s",
                background:active?C.white:"transparent",
                color:active?C.kangkong600:C.mushroom500,
                boxShadow:active?DS.shadow.sm:"none",
                display:"flex",alignItems:"center",gap:5,
              }}>
                <Icon size={14} color={active?C.kangkong600:C.mushroom500}/>{vm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Directory View ── */}
      {viewMode === "directory" && (
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
          <div style={{fontFamily:FF,fontSize:12,color:C.mushroom400,marginBottom:12}}>
            {filtered.length} project{filtered.length!==1?"s":""}{showSeeds&&filteredWishes.length>0?` · ${filteredWishes.length} seed${filteredWishes.length!==1?"s":""}`:""} found
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
            {filtered.map(p => {
              const sc  = STAGE_COLORS[p.stage] || STAGE_COLORS.seedling;
              const cc  = COVER_COLORS[p.builtBy] || COVER_COLORS.default;
              const dc  = DEPT_COLORS[p.builtFor];
              return (
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{position:"relative",background:C.white,borderRadius:DS.radius.xl,border:"1px solid "+C.mushroom200,padding:16,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.shadow.lg;e.currentTarget.style.borderColor=C.mushroom300;}}
                  onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.mushroom200;}}
                >
                  {/* Stage badge — top-right corner */}
                  <span style={{position:"absolute",top:14,right:14,display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:DS.radius.full,background:sc.bg,color:sc.text,border:"0.5px solid "+sc.border,fontFamily:FF,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>
                    <span style={{width:6,height:6,borderRadius:"50%",background:sc.dot,flexShrink:0}}/>
                    {STAGE_LABELS[p.stage]||p.stage}
                  </span>

                  {/* Name */}
                  <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom900,lineHeight:1.35,marginBottom:8,paddingRight:80}}>{p.name}</div>

                  {/* Description */}
                  {p.description&&(
                    <div style={{fontFamily:FF,fontSize:12,color:C.mushroom600,lineHeight:1.6,marginBottom:12,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.description}</div>
                  )}

                  {/* Divider */}
                  <div style={{borderTop:"1px solid "+C.mushroom100,margin:"2px 0 10px"}}/>

                  {/* Footer */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:cc.bg,color:cc.text,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FF,fontSize:9,fontWeight:700,flexShrink:0}}>
                        {getInitials(p.builder)}
                      </div>
                      <span style={{fontFamily:FF,fontSize:12,color:C.mushroom600,fontWeight:500}}>{p.builder||"Unknown"}</span>
                    </div>
                    {dc&&<span style={{fontFamily:FF,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:DS.radius.full,background:dc+"18",color:dc,whiteSpace:"nowrap"}}>{p.builtFor}</span>}
                  </div>
                </div>
              );
            })}

            {/* Seed cards in directory */}
            {showSeeds&&filteredWishes.map(w=>(
              <div key={"w"+w.id} onClick={()=>setSelectedWish(w)}
                style={{background:C.white,borderRadius:DS.radius.xl,border:"1.5px dashed "+C.mushroom300,overflow:"hidden",cursor:"pointer",transition:"all 0.18s",boxShadow:"none",opacity:0.92}}
                onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.opacity="1";}}
                onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.opacity="0.92";}}
              >
                <div style={{padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom700,lineHeight:1.3,flex:1,display:"flex",alignItems:"flex-start",gap:6}}>{w.title}{w.country&&<>&nbsp;<CountryBadge country={w.country}/></>}</div>
                    <WishSeed size={28} color={C.mushroom400}/>
                  </div>
                  <StageBadge stage="seed"/>
                  <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,lineHeight:1.5,margin:"8px 0 10px",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{w.why}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>Wished by <strong style={{color:C.mushroom700}}>{w.wisherName}</strong></span>
                    <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500,display:"flex",alignItems:"center",gap:3}}>
                      <svg width={11} height={11} viewBox="0 0 12 12" fill="none"><path d="M6 1 L7.5 4.5 L11 5 L8.5 7.5 L9 11 L6 9.5 L3 11 L3.5 7.5 L1 5 L4.5 4.5 Z" stroke={C.mushroom400} strokeWidth="1" fill={C.mushroom200}/></svg>
                      {w.upvoters.length}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length===0&&(!showSeeds||filteredWishes.length===0)&&(
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:"48px 24px",color:C.mushroom400,fontFamily:FF,fontSize:14}}>No projects match your filters</div>
            )}
          </div>
        </div>
      )}

      {/* ── Garden (Visual Plant Map) View ── */}
      {viewMode === "garden" && (
        <GardenMapView
          projects={projects}
          filtered={filtered}
          wishes={wishes}
          selected={selected}
          setSelected={setSelected}
          deptFilter={deptFilter}
          capFilter={capFilter}
        />
      )}

      {/* ── Board (Kanban) View ── */}
      {viewMode === "board" && (
        <div style={{display:"flex",gap:0,flex:1,overflowX:"auto",overflowY:"hidden",padding:"16px 20px"}}>

          {/* Seed column — from wishes */}
          {(()=>{
            const seedCol = wishes.filter(w=>!w.fulfilledBy);
            const sc = {bg:C.mushroom100, text:C.mushroom600, border:C.mushroom300, dot:C.mushroom400};
            return (
              <div style={{
                minWidth:220,maxWidth:240,flex:1,marginRight:12,
                background:C.white,borderRadius:DS.radius.xl,
                border:"1.5px dashed "+C.mushroom300,
                display:"flex",flexDirection:"column",overflow:"hidden",
                boxShadow:"none",
              }}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.mushroom200,background:sc.bg,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <WishSeed size={15} color={sc.text}/>
                    <span style={{fontFamily:FF,fontSize:13,fontWeight:700,color:sc.text}}>Seed</span>
                    <span style={{marginLeft:"auto",fontFamily:FF,fontSize:11,fontWeight:700,background:sc.border,color:sc.text,borderRadius:DS.radius.full,padding:"1px 8px"}}>{seedCol.length}</span>
                  </div>
                  <div style={{fontFamily:FF,fontSize:10,color:sc.text,opacity:0.7}}>Community ideas awaiting adoption</div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"10px"}}>
                  {seedCol.length===0&&(
                    <div style={{textAlign:"center",padding:"20px 8px",color:C.mushroom300,fontFamily:FF,fontSize:11,fontStyle:"italic"}}>No wishes yet</div>
                  )}
                  {seedCol.map(w=>{
                    const deptColor = DEPT_COLORS[w.builtFor]||C.mushroom400;
                    return (
                      <div key={w.id} onClick={()=>setSelectedWish(w)}
                        style={{background:C.mushroom50,borderRadius:DS.radius.lg,padding:"11px 13px",marginBottom:8,border:"1.5px dashed "+(w.readyForReview?C.mango500:w.claimedBy?C.wintermelon400:C.mushroom300),cursor:"pointer",transition:"all 0.15s"}}
                        onMouseOver={e=>{e.currentTarget.style.background=C.white;e.currentTarget.style.boxShadow=DS.shadow.md;}}
                        onMouseOut={e=>{e.currentTarget.style.background=C.mushroom50;e.currentTarget.style.boxShadow="none";}}
                      >
                        <div style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.mushroom800,lineHeight:1.3,marginBottom:6}}>{w.title}</div>
                        <div style={{fontFamily:FF,fontSize:10,color:deptColor,fontWeight:600,marginBottom:6,padding:"2px 6px",background:deptColor+"15",borderRadius:DS.radius.full,display:"inline-block"}}>{w.builtFor}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:FF,fontSize:10,color:C.mushroom400}}>{w.upvoters.length} votes</span>
                          {w.readyForReview
                            ? <span style={{fontFamily:FF,fontSize:10,fontWeight:700,color:C.mango600,padding:"2px 6px",background:C.mango100,borderRadius:DS.radius.full}}>⏳ Review</span>
                            : w.claimedBy
                            ? (
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                {(() => {
                                  const builderCount = projects.filter(p => p.id === w.fulfilledBy).length;
                                  return builderCount > 1 ? <span style={{fontFamily:FF,fontSize:9,color:C.mushroom500,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.full,padding:"1px 5px"}}>{builderCount} builders</span> : null;
                                })()}
                                <span style={{fontFamily:FF,fontSize:10,fontWeight:600,color:C.wintermelon500}}>🔨 {w.claimedBy.split(" ")[0]}</span>
                                {w.claimedByEmail===authUser?.email && projects.find(p=>p.id===w.fulfilledBy)?.stage==="seedling" && (
                                  <button onClick={e=>{e.stopPropagation();onUnclaimSeed(w.id);}} style={{
                                    fontFamily:FF,fontSize:9,color:C.mushroom500,background:"none",
                                    border:"1px solid "+C.mushroom300,borderRadius:DS.radius.sm,padding:"1px 5px",cursor:"pointer",
                                  }}>Release</button>
                                )}
                              </div>
                            )
                            : <button onClick={e=>{e.stopPropagation();setClaimingWish(w);}} style={{
                                background:C.kangkong50,border:"1px solid "+C.kangkong300,
                                borderRadius:DS.radius.sm,padding:"2px 8px",cursor:"pointer",
                                fontFamily:FF,fontSize:11,color:C.kangkong600,fontWeight:700,
                              }}>Claim →</button>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {STAGES.map((stage,si) => {
            const col = filtered.filter(p=>p.stage===stage);
            const sc = STAGE_COLORS[stage];
            return (
              <div key={stage}
                onDragOver={e=>{e.preventDefault();setDragOverStage(stage);}}
                onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverStage(null);}}
                onDrop={e=>{
                  e.preventDefault();
                  // Nursery is not a valid drag-drop target
                  if (stage === 'nursery') { setDragProjectId(null); setDragOverStage(null); return; }
                  if(dragProjectId&&dragProjectId!==stage){
                    const p=projects.find(pr=>pr.id===dragProjectId);
                    if(p&&p.stage!==stage) moveStage(p, stage);
                  }
                  setDragProjectId(null);setDragOverStage(null);
                }}
                style={{
                  minWidth:220,maxWidth:240,flex:1,marginRight:si<STAGES.length-1?12:0,
                  background:dragOverStage===stage?sc.bg:C.white,
                  borderRadius:DS.radius.xl,
                  border:"2px solid "+(dragOverStage===stage?sc.dot:C.mushroom200),
                  display:"flex",flexDirection:"column",overflow:"hidden",
                  boxShadow:dragOverStage===stage?DS.shadow.md:DS.shadow.sm,
                  transition:"all 0.12s",
                }}>
                <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.mushroom100,background:sc.bg,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <StageIcon stage={stage} size={15}/>
                    <span style={{fontFamily:FF,fontSize:13,fontWeight:700,color:sc.text}}>{STAGE_LABELS[stage]}</span>
                    <span style={{marginLeft:"auto",fontFamily:FF,fontSize:11,fontWeight:700,background:sc.border,color:sc.text,borderRadius:DS.radius.full,padding:"1px 8px"}}>{col.length}</span>
                    {stage==="seedling"&&col.filter(p=>p.prototypeLink&&p.deckLink).length>0&&(
                      <span style={{fontFamily:FF,fontSize:10,color:C.mango600,marginLeft:4,fontWeight:600}}>
                        ({col.filter(p=>p.prototypeLink&&p.deckLink).length} ready)
                      </span>
                    )}
                  </div>
                  <div style={{fontFamily:FF,fontSize:10,color:sc.text,opacity:0.7}}>{STAGE_FLORA[stage]}</div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"10px"}}>
                  {col.length===0&&(
                    <div style={{textAlign:"center",padding:"20px 8px",color:C.mushroom300,fontFamily:FF,fontSize:11,fontStyle:"italic"}}>Empty</div>
                  )}
                  {col.map(p => {
                    const dfc = DEPT_COLORS[p.builtFor];
                    const cc  = COVER_COLORS[p.builtBy] || COVER_COLORS.default;
                    const wilting = p.lastUpdated>30;
                    const readyForNursery = stage==="seedling"&&p.prototypeLink&&p.deckLink;
                    return (
                      <div key={p.id}
                        draggable
                        onDragStart={e=>{setDragProjectId(p.id);e.dataTransfer.effectAllowed="move";}}
                        onDragEnd={()=>{setDragProjectId(null);setDragOverStage(null);}}
                        onClick={()=>setSelected(p)}
                        style={{
                          background: dragProjectId===p.id ? sc.bg : C.white,
                          borderRadius:DS.radius.xl,padding:16,marginBottom:8,
                          border:"1px solid "+(readyForNursery?C.mango300:C.mushroom200),
                          cursor:"grab",transition:"all 0.15s",
                          opacity:dragProjectId===p.id?0.5:1,
                        }}
                        onMouseOver={e=>{if(dragProjectId!==p.id){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.shadow.lg;e.currentTarget.style.borderColor=C.mushroom300;}}}
                        onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=readyForNursery?C.mango300:C.mushroom200;}}
                      >
                        {/* Name + stale indicator */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom900,flex:1,lineHeight:1.35}}>
                            {p.name}
                          </div>
                          {wilting&&<IcoStale size={13} color={C.mango500}/>}
                        </div>

                        {/* Seedling submission status */}
                        {stage==="seedling"&&(
                          <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
                            {!p.prototypeLink&&<span style={{fontFamily:FF,fontSize:9,color:C.mushroom400,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.full,padding:"1px 7px"}}>Prototype needed</span>}
                            {!p.deckLink&&<span style={{fontFamily:FF,fontSize:9,color:C.mushroom400,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.full,padding:"1px 7px"}}>Deck needed</span>}
                            {p.prototypeLink&&p.deckLink&&<span style={{fontFamily:FF,fontSize:9,color:C.mango600,fontWeight:600,border:"1px solid "+C.mango300,background:C.mango50,borderRadius:DS.radius.full,padding:"1px 7px"}}>Ready for Nursery →</span>}
                          </div>
                        )}

                        {/* Builder + dept footer */}
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <div style={{width:24,height:24,borderRadius:"50%",background:cc.bg,color:cc.text,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FF,fontSize:9,fontWeight:700,flexShrink:0}}>
                              {getInitials(p.builder)}
                            </div>
                            <span style={{fontFamily:FF,fontSize:12,color:C.mushroom600,fontWeight:500}}>{p.builder||"Unknown"}</span>
                          </div>
                          {dfc&&<span style={{fontFamily:FF,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:DS.radius.full,background:dfc+"18",color:dfc,whiteSpace:"nowrap"}}>{p.builtFor}</span>}
                        </div>

                        {/* Last updated + submitted + drag */}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:FF,fontSize:10,color:C.mushroom400}}>{p.lastUpdated===0?"Today":p.lastUpdated+"d ago"}</span>
                          {stage==="nursery"&&p.submittedAt&&(()=>{
                            const daysAgoVal = daysAgo(p.submittedAt);
                            return (
                              <span style={{fontFamily:FF,fontSize:10,color:daysAgoVal>7?C.mango600:C.mushroom400,fontWeight:daysAgoVal>7?600:400}}>
                                {daysAgoVal===0?"Submitted today":`Submitted ${daysAgoVal}d ago`}
                              </span>
                            );
                          })()}
                          <span style={{fontSize:10,color:C.mushroom300,userSelect:"none"}}>⠿ drag</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Wish detail panel */}
      {selectedWish&&(
        <WishDetailPanel
          wish={selectedWish}
          authUser={authUser}
          onClose={()=>setSelectedWish(null)}
          onClaim={()=>setClaimingWish(selectedWish)}
          onEdit={w=>{setSelectedWish(null);setEditingWish(w);}}
        />
      )}
      {editingWish&&(
        <AddWishModal authUser={authUser} existing={editingWish} onClose={()=>setEditingWish(null)} onSave={w=>{onUpdateWish?.(w);setEditingWish(null);}}/>
      )}
      {claimingWish&&(
        <ClaimModal wish={claimingWish} authUser={authUser} onClose={()=>setClaimingWish(null)} onClaim={handleConfirmClaim}/>
      )}
    </div>
  );
};



// ── Garden Horizon — theme system ─────────────────────────────────────────────

function getGardenPhase() {
  const h=new Date().getHours(), m=new Date().getMinutes(), t=h+m/60;
  if(t>=6&&t<8) return 'dawn';
  if(t>=8&&t<17.5) return 'day';
  if(t>=17.5&&t<20) return 'dusk';
  return 'night';
}

const GARDEN_THEMES = {
  night:{
    sky:'linear-gradient(180deg,#0c1e1a 0%,#112a20 25%,#1a3a2a 50%,#223a28 70%,#2a4830 85%,#1e3828 100%)',
    hillBg:"#152a1e", hillMid:"#1c3828", hillFg:"#243c30",
    ground:'linear-gradient(180deg,#243c30 0%,#1a2e22 100%)',
    divider:'rgba(255,255,255,0.07)', deptLabel:'rgba(255,255,255,0.28)',
    stars:1, moon:0.9, sun:0, clouds:0,
    legend:{bg:'rgba(8,18,12,0.78)',border:'rgba(255,255,255,0.09)',color:'rgba(255,255,255,0.55)'},
  },
  dawn:{
    sky:'linear-gradient(180deg,#1a2a38 0%,#3a4060 20%,#c8603a 40%,#e8905a 55%,#f0c080 68%,#b8d8a0 82%,#3a6040 100%)',
    hillBg:"#1e3028", hillMid:"#263c30", hillFg:"#305a3a",
    ground:'linear-gradient(180deg,#305a3a 0%,#223828 100%)',
    divider:'rgba(255,200,140,0.10)', deptLabel:'rgba(255,240,200,0.5)',
    stars:0.3, moon:0.2, sun:0, clouds:0.2,
    legend:{bg:'rgba(10,14,10,0.72)',border:'rgba(255,200,100,0.15)',color:'rgba(255,240,200,0.6)'},
  },
  day:{
    sky:'linear-gradient(180deg,#4a9ad4 0%,#74b8e8 20%,#a0d0f0 40%,#c8e8f8 58%,#d8f0e0 72%,#4a8a5a 88%,#2e5e38 100%)',
    hillBg:"#2a5a38", hillMid:"#357040", hillFg:"#407848",
    ground:'linear-gradient(180deg,#407848 0%,#2a5030 100%)',
    divider:'rgba(80,140,80,0.14)', deptLabel:'rgba(20,60,30,0.55)',
    stars:0, moon:0, sun:1, clouds:1,
    legend:{bg:'rgba(255,255,255,0.82)',border:'rgba(80,140,80,0.2)',color:'rgba(30,70,40,0.7)'},
  },
  dusk:{
    sky:'linear-gradient(180deg,#1a1a3a 0%,#3a2060 15%,#c03030 35%,#e06028 50%,#f09040 62%,#c07848 74%,#3a5830 88%,#203020 100%)',
    hillBg:"#1e2a22", hillMid:"#283830", hillFg:"#324838",
    ground:'linear-gradient(180deg,#324838 0%,#1e2c22 100%)',
    divider:'rgba(255,140,80,0.10)', deptLabel:'rgba(255,220,180,0.45)',
    stars:0.1, moon:0.1, sun:0.3, clouds:0.2,
    legend:{bg:'rgba(10,8,6,0.78)',border:'rgba(255,140,60,0.15)',color:'rgba(255,210,160,0.55)'},
  },
};

function GardenCloud({top, width, duration, delay, opacity}) {
  return (
    <div style={{position:"absolute",top,pointerEvents:"none",opacity,transition:"opacity 3s ease",animation:`cloudDrift ${duration}s linear ${delay}s infinite`}}>
      <div style={{position:"relative",width,height:22}}>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:22,background:"rgba(255,255,255,0.88)",borderRadius:50}}/>
        <div style={{position:"absolute",bottom:8,left:14,width:50,height:50,background:"rgba(255,255,255,0.88)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:4,left:50,width:35,height:35,background:"rgba(255,255,255,0.88)",borderRadius:"50%"}}/>
      </div>
    </div>
  );
}

const GARDEN_STARS = "radial-gradient(1px 1px at 5% 10%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 12% 5%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 20% 18%,rgba(255,255,255,0.35) 0%,transparent 100%),radial-gradient(1px 1px at 29% 7%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 38% 14%,rgba(255,255,255,0.4) 0%,transparent 100%),radial-gradient(1px 1px at 47% 4%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1px 1px at 54% 20%,rgba(255,255,255,0.3) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 63% 9%,rgba(255,255,255,0.5) 0%,transparent 100%),radial-gradient(1px 1px at 71% 16%,rgba(255,255,255,0.35) 0%,transparent 100%),radial-gradient(1px 1px at 78% 3%,rgba(255,255,255,0.45) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 85% 12%,rgba(255,255,255,0.4) 0%,transparent 100%),radial-gradient(1px 1px at 91% 8%,rgba(255,255,255,0.55) 0%,transparent 100%),radial-gradient(1px 1px at 43% 30%,rgba(255,255,255,0.2) 0%,transparent 100%),radial-gradient(1px 1px at 67% 26%,rgba(255,255,255,0.28) 0%,transparent 100%)";

// Row config: front row on ground + up to 2 stacked back rows
const GARDEN_ROWS = [
  {bottom:"14%", scale:1.00, baseOpacity:1.0,  zBase:2},
  {bottom:"22%", scale:0.78, baseOpacity:0.70,  zBase:1},
  {bottom:"29%", scale:0.62, baseOpacity:0.55,  zBase:0},
];
const FRONT_POS = [0.12, 0.34, 0.58, 0.80];
const BACK_POS  = [0.22, 0.50, 0.74, 0.92];

// ── Garden Map View ────────────────────────────────────────────────────────────
const GardenMapView = ({projects, filtered, wishes, selected, setSelected}) => {
  const [phase, setPhase] = useState(getGardenPhase);
  const [hoverId, setHoverId] = useState(null);

  useEffect(()=>{
    const id=setInterval(()=>setPhase(getGardenPhase()),60000);
    return()=>clearInterval(id);
  },[]);

  const theme = GARDEN_THEMES[phase];
  const isVisible = p => filtered.some(f=>f.id===p.id);

  // Stable dept order: DEPT_ZONES order first, then any unknowns
  const allBuiltBy = [...new Set(projects.map(p=>p.builtBy))];
  const depts = Object.keys(DEPT_ZONES).filter(d=>allBuiltBy.includes(d))
    .concat(allBuiltBy.filter(d=>!Object.keys(DEPT_ZONES).includes(d)));
  const N = Math.max(depts.length, 1);

  // Group projects by dept, sorted seedling → thriving
  const STAGE_IDX = {seedling:0,nursery:1,sprout:2,bloom:3,thriving:4};
  const byDept = {};
  depts.forEach(d=>{
    byDept[d]=projects.filter(p=>p.builtBy===d).sort((a,b)=>(STAGE_IDX[a.stage]||0)-(STAGE_IDX[b.stage]||0));
  });

  return (
    <div onClick={()=>setSelected(null)} style={{flex:1,overflowX:"auto",overflowY:"hidden",position:"relative"}}>
      <div style={{position:"relative",height:"100%",minWidth:`max(100%, ${N*220}px)`}}>

        {/* Sky */}
        <div style={{position:"absolute",inset:0,background:theme.sky,transition:"background 4s ease"}}/>

        {/* Stars */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:"55%",pointerEvents:"none",backgroundImage:GARDEN_STARS,opacity:theme.stars,transition:"opacity 3s ease"}}/>

        {/* Moon */}
        <div style={{position:"absolute",top:28,left:"86%",width:40,height:40,borderRadius:"50%",background:"radial-gradient(circle at 35% 35%,#fffde0,#f0e080)",boxShadow:"0 0 20px rgba(255,240,100,0.35),0 0 70px rgba(255,240,100,0.12)",pointerEvents:"none",opacity:theme.moon,transition:"opacity 3s ease"}}/>

        {/* Sun */}
        <div style={{position:"absolute",top:36,left:"84%",width:52,height:52,borderRadius:"50%",background:"radial-gradient(circle at 40% 40%,#fff8c0,#ffd740,#ffb300)",boxShadow:"0 0 30px rgba(255,200,50,0.6),0 0 80px rgba(255,200,50,0.25)",pointerEvents:"none",opacity:theme.sun,transition:"opacity 3s ease"}}/>

        {/* Clouds */}
        <GardenCloud top="12%" width={100} duration={55} delay={0}   opacity={theme.clouds}/>
        <GardenCloud top="7%"  width={70}  duration={80} delay={-20} opacity={theme.clouds}/>
        <GardenCloud top="18%" width={85}  duration={68} delay={-35} opacity={theme.clouds}/>

        {/* Hills */}
        <div style={{position:"absolute",left:"-5%",right:"-5%",bottom:0,height:"38%",borderRadius:"50% 50% 0 0",background:theme.hillBg,transition:"background 4s ease",pointerEvents:"none"}}/>
        <div style={{position:"absolute",left:"-5%",right:"-5%",bottom:0,height:"30%",borderRadius:"65% 35% 0 0",background:theme.hillMid,transition:"background 4s ease",pointerEvents:"none"}}/>
        <div style={{position:"absolute",left:"-5%",right:"-5%",bottom:0,height:"22%",borderRadius:"38% 62% 0 0",background:theme.hillFg,transition:"background 4s ease",pointerEvents:"none"}}/>

        {/* Ground */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"16%",background:theme.ground,transition:"background 4s ease",pointerEvents:"none"}}/>

        {/* Section dividers */}
        {depts.slice(0,-1).map((_,i)=>(
          <div key={i} style={{position:"absolute",bottom:0,top:"25%",left:`${(i+1)/N*100}%`,width:1,background:`linear-gradient(180deg,transparent,${theme.divider} 40%,${theme.divider} 70%,transparent)`,pointerEvents:"none",transition:"background 4s ease"}}/>
        ))}

        {/* Soil patches */}
        {depts.map((d,i)=>(
          <div key={d+"soil"} style={{position:"absolute",bottom:"10%",left:`${(i+0.5)/N*100-6}%`,width:"12%",height:90,borderRadius:"50%",transform:"scaleY(0.2)",filter:"blur(22px)",opacity:0.4,background:getDeptColor(d),pointerEvents:"none"}}/>
        ))}

        {/* Dept labels */}
        {depts.map((d,i)=>(
          <div key={d+"lbl"} style={{position:"absolute",bottom:"5.5%",left:`${(i+0.5)/N*100}%`,transform:"translateX(-50%)",fontFamily:FF,fontSize:9,fontWeight:700,letterSpacing:"1.4px",textTransform:"uppercase",whiteSpace:"nowrap",color:theme.deptLabel,pointerEvents:"none",transition:"color 4s ease"}}>
            {d}
          </div>
        ))}

        {/* Plants */}
        {depts.flatMap((dept,di)=>
          byDept[dept].map((project,pi)=>{
            const rowIdx = Math.floor(pi/4);
            const colIdx = pi%4;
            const row = GARDEN_ROWS[Math.min(rowIdx, GARDEN_ROWS.length-1)];
            const posFrac = rowIdx===0 ? FRONT_POS : BACK_POS;
            const leftPct = di/N*100 + posFrac[Math.min(colIdx,3)] * (100/N);
            const visible = isVisible(project);
            const wilting = project.lastUpdated>60;
            const size = GardenSizes[project.stage]||GardenSizes.seedling;
            const isHov = hoverId===project.id;
            const isSel = selected?.id===project.id;
            const dc = getDeptColor(project.builtBy);
            const dur = 3.5+(pi%4)*0.7;
            const del = (pi*0.4)%3;
            return (
              <div key={project.id}
                style={{position:"absolute",left:`${leftPct}%`,bottom:row.bottom,marginLeft:`-${size.w/2}px`,opacity:(visible?1:0.08)*row.baseOpacity,transition:"opacity 0.4s",zIndex:isSel?18:isHov?16:row.zBase,transform:`scale(${row.scale})`,transformOrigin:"bottom center"}}>
                {isSel&&<div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"2.5px solid "+dc,boxShadow:"0 0 20px "+dc+"50",animation:"pulse 2s ease-in-out infinite"}}/>}
                <div
                  onClick={e=>{e.stopPropagation();setSelected(project);}}
                  onMouseEnter={()=>setHoverId(project.id)}
                  onMouseLeave={()=>setHoverId(null)}
                  style={{cursor:"pointer",transformOrigin:"bottom center",animation:`gardenSway ${dur}s ease-in-out ${del}s infinite`,filter:"drop-shadow(0 3px 6px rgba(0,0,0,0.3))"}}>
                  <GardenPlant stage={project.stage} size={size.w} wilting={wilting}/>
                  {wilting&&<div style={{position:"absolute",top:-4,right:-4}}><IcoStale size={14} color={C.mango500}/></div>}
                  <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:7,height:7,borderRadius:"50%",background:dc,border:"1.5px solid white",boxShadow:"0 0 5px "+dc+"90"}}/>
                  {isHov&&visible&&(
                    <div style={{position:"absolute",bottom:"108%",left:"50%",transform:"translateX(-50%)",background:C.mushroom900,color:C.mushroom50,padding:"8px 12px",borderRadius:DS.radius.lg,fontFamily:FF,fontSize:11,whiteSpace:"nowrap",pointerEvents:"none",zIndex:100,boxShadow:DS.shadow.lg,border:"1px solid "+C.mushroom700}}>
                      <div style={{fontWeight:700,marginBottom:2}}>{project.name}</div>
                      <div style={{opacity:0.7,fontSize:10}}>{project.builtBy}{project.builtFor!==project.builtBy?" → "+project.builtFor:""}</div>
                      <div style={{opacity:0.6,fontSize:10}}>{project.capability} · {STAGE_LABELS[project.stage]}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Legend */}
        <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:14,alignItems:"center",background:theme.legend.bg,backdropFilter:"blur(10px)",borderRadius:DS.radius.full,padding:"6px 18px",border:"1px solid "+theme.legend.border,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",zIndex:20,transition:"background 4s,border-color 4s",whiteSpace:"nowrap"}}>
          {STAGES.map(s=>(
            <div key={s} style={{display:"flex",alignItems:"center",gap:5}}>
              <StageIcon stage={s} size={13} color={theme.legend.color}/>
              <span style={{fontFamily:FF,fontSize:10,color:theme.legend.color}}>{STAGE_LABELS[s]}</span>
            </div>
          ))}
          {wishes&&wishes.filter(w=>!w.fulfilledBy).length>0&&(
            <>
              <div style={{width:1,height:12,background:"rgba(255,255,255,0.15)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <WishSeed size={14} color={theme.legend.color}/>
                <span style={{fontFamily:FF,fontSize:10,color:theme.legend.color,fontWeight:600}}>{wishes.filter(w=>!w.fulfilledBy).length} seeds</span>
              </div>
            </>
          )}
          {(projects.some(p=>p.country==="PH")||projects.some(p=>p.country==="TH"))&&(
            <>
              <div style={{width:1,height:12,background:"rgba(255,255,255,0.15)"}}/>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {projects.some(p=>p.country==="PH")&&<span style={{fontFamily:FF,fontSize:10,color:theme.legend.color,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}><FlagSVG country="PH" w={14} h={10}/>{projects.filter(p=>p.country==="PH").length}</span>}
                {projects.some(p=>p.country==="TH")&&<span style={{fontFamily:FF,fontSize:10,color:theme.legend.color,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}><FlagSVG country="TH" w={14} h={10}/>{projects.filter(p=>p.country==="TH").length}</span>}
              </div>
            </>
          )}
        </div>

        {/* Overlap panel */}
        {selected&&findRelated(selected,projects).length>0&&(
          <div style={{position:"absolute",top:16,right:16,zIndex:20,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,180,60,0.4)",borderRadius:DS.radius.lg,padding:"10px 14px",maxWidth:220,boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:"rgba(255,180,60,0.9)",marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
              <IcoWarning size={14} color="rgba(255,180,60,0.9)"/> Possible Overlap
            </div>
            <div style={{fontFamily:FF,fontSize:11,color:"rgba(255,255,255,0.65)",lineHeight:1.4}}>
              {findRelated(selected,projects).length} project(s) share the same area as <strong>{selected.name}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Feedback Banner (Nursery rework) ──────────────────────────────────────────
const FeedbackBanner = ({reviewComment, reviewedBy, reviewedAt}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{marginBottom:16, border:"1px solid "+C.mango300, borderRadius:DS.radius.lg, overflow:"hidden"}}>
      <button onClick={()=>setExpanded(e=>!e)} style={{
        width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"10px 14px", background:C.mango50, border:"none", cursor:"pointer",
        fontFamily:FF, fontSize:12, fontWeight:700, color:C.mango700,
      }}>
        <span>Feedback available</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{padding:"10px 14px", background:C.white}}>
          <p style={{fontFamily:FF,fontSize:12,color:C.mushroom700,lineHeight:1.5,margin:"0 0 6px"}}>{reviewComment}</p>
          <div style={{fontFamily:FF,fontSize:10,color:C.mushroom400}}>
            Feedback from {reviewedBy}{reviewedAt ? ` — ${new Date(reviewedAt).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}` : ""}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({project,allProjects,onClose,onNote,setSelected,authUser,onEdit,onSubmitToNursery,onWithdrawFromNursery,onApproveProject,onNeedsRework,onMarkNotificationsRead}) => {
  const [noteText,setNoteText] = useState("");
  const [interested,setInterested] = useState(false);
  const [prototypeLink, setPrototypeLink]       = useState(project.prototypeLink || "");
  const [deckLink, setDeckLink]                 = useState(project.deckLink || "");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showReworkInput, setShowReworkInput]   = useState(false);
  const [reworkComment, setReworkComment]       = useState("");

  // URL validation helper
  const isValidUrl = (str) => {
    try { new URL(str); return true; } catch { return false; }
  };

  // Mark notifications read when ExCom opens a Nursery card
  useEffect(() => {
    if (project.stage === 'nursery' && authUser?.isApprover) {
      onMarkNotificationsRead?.(project.id);
    }
  }, [project.id]);

  const related = findRelated(project,allProjects);
  const dc = DEPT_COLORS[project.builtBy]||C.kangkong500;

  return (
    <div style={{
      width:340,flexShrink:0,background:C.white,
      borderLeft:"1px solid "+C.mushroom200,
      overflowY:"auto",display:"flex",flexDirection:"column",
      animation:"slideInRight 0.3s cubic-bezier(0.34,1.2,0.64,1)",
    }}>
      <div style={{padding:"16px 20px",borderBottom:"1px solid "+C.mushroom100,background:STAGE_COLORS[project.stage].bg}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <StageBadge stage={project.stage}/>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {(authUser?.email===project.builderEmail||authUser?.isAdmin) &&
              !(project.reviewStatus==='pending' && !authUser?.isAdmin) && (
              <button onClick={()=>onEdit(project)} style={{background:C.white,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.md,padding:"4px 10px",cursor:"pointer",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600}}>Edit</button>
            )}
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4,borderRadius:DS.radius.sm}}>
              <IcoClose size={18} color={C.mushroom500}/>
            </button>
          </div>
        </div>
        <div style={{fontFamily:FF,fontSize:20,fontWeight:700,color:C.mushroom900,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          {project.name}
          {project.country&&<>&nbsp;<CountryBadge country={project.country} size="lg"/></>}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {project.capability&&<CapBadge cap={project.capability}/>}
          <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:dc,padding:"2px 8px",background:dc+"18",borderRadius:DS.radius.full}}>{project.builtBy}</span>
          {project.builtFor!==project.builtBy&&(
            <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>→</span>
          )}
          {project.builtFor!==project.builtBy&&(
            <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:getDeptColor(project.builtFor),padding:"2px 8px",background:getDeptColor(project.builtFor)+"18",borderRadius:DS.radius.full}}>{project.builtFor}</span>
          )}
          {project.problemSpace&&<Badge label={project.problemSpace} tone="neutral"/>}
        </div>
      </div>

      <div style={{padding:"16px 20px",flex:1}}>
        <div style={{marginBottom:16,borderRadius:DS.radius.lg,overflow:"hidden",border:"1px solid "+C.mushroom100}}><ProjectImage project={project} height={140}/></div>
        <p style={{fontFamily:FF,fontSize:13,color:C.mushroom600,lineHeight:1.6,margin:"0 0 16px"}}>{project.description}</p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
          {[
            {l:"Tools",   v:project.toolUsed?.length?project.toolUsed.join(", "):"—",   icon:<IcoImpact size={12} color={C.kangkong600}/>},
            {l:"Builder",   v:project.builder||"—",                                        icon:<IcoNote size={12} color={C.mushroom500}/>},
            {l:"Updated", v:project.lastUpdated===0?"Today":project.lastUpdated+"d ago", icon:project.lastUpdated>30?<IcoStale size={12} color={C.mango500}/>:<IcoCheck size={12} color={C.kangkong500}/>},
            {l:"Data",    v:(project.dataSources?.length?project.dataSources.join(", "):project.dataSource)||"—", icon:<IcoNote size={12} color={C.mushroom500}/>},
          ].map(item=>(
            <div key={item.l} style={{background:C.mushroom50,borderRadius:DS.radius.md,padding:"8px 10px",border:"1px solid "+C.mushroom200}}>
              <div style={{fontFamily:FF,fontSize:9,color:C.mushroom400,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>{item.l}</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom800,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>{item.icon}{item.v}</div>
            </div>
          ))}
        </div>

        {project.collaboratorEmails?.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:FF,fontSize:9,color:C.mushroom400,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Collaborators</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {project.collaboratorEmails.map(email=>(
                <span key={email} style={{fontFamily:FF,fontSize:11,padding:"2px 8px",borderRadius:DS.radius.full,background:C.mushroom100,color:C.mushroom700,border:"1px solid "+C.mushroom200}}>{email}</span>
              ))}
            </div>
          </div>
        )}

        {project.demoLink&&project.demoLink!=="#"&&(
          <a href={project.demoLink} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,color:C.kangkong600,textDecoration:"none",marginBottom:16}}>
            <IcoLink size={14} color={C.kangkong600}/> View Demo
          </a>
        )}

        {/* ── Seedling: Submission Requirements ──────────────────────────────── */}
        {project.stage==="seedling" && (authUser?.email===project.builderEmail||authUser?.isAdmin) && (
          <div style={{marginBottom:16,padding:"12px 14px",background:C.mushroom50,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:10}}>
              Nursery Submission Requirements
            </div>
            <div style={{marginBottom:8}}>
              <label style={{fontFamily:FF,fontSize:11,color:C.mushroom500,display:"block",marginBottom:3}}>Prototype Link *</label>
              <input value={prototypeLink} onChange={e=>setPrototypeLink(e.target.value)}
                placeholder="https://your-deployed-prototype.com"
                style={{width:"100%",padding:"7px 10px",borderRadius:DS.radius.md,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:12,color:C.mushroom800,background:C.white,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=C.mushroom300}
              />
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontFamily:FF,fontSize:11,color:C.mushroom500,display:"block",marginBottom:3}}>Deck Link *</label>
              <input value={deckLink} onChange={e=>setDeckLink(e.target.value)}
                placeholder="https://docs.google.com/presentation/..."
                style={{width:"100%",padding:"7px 10px",borderRadius:DS.radius.md,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:12,color:C.mushroom800,background:C.white,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=C.mushroom300}
              />
            </div>
            {!showSubmitConfirm ? (
              <button onClick={()=>setShowSubmitConfirm(true)}
                disabled={!isValidUrl(prototypeLink)||!isValidUrl(deckLink)}
                style={{
                  width:"100%",padding:"9px",
                  background:isValidUrl(prototypeLink)&&isValidUrl(deckLink)?C.kangkong500:C.mushroom200,
                  color:isValidUrl(prototypeLink)&&isValidUrl(deckLink)?C.white:C.mushroom400,
                  border:"none",borderRadius:DS.radius.lg,
                  cursor:isValidUrl(prototypeLink)&&isValidUrl(deckLink)?"pointer":"not-allowed",
                  fontFamily:FF,fontSize:12,fontWeight:600,transition:"all 0.15s",
                }}
              >Submit for Nursery Review &#x2192;</button>
            ) : (
              <div style={{background:C.mango50,border:"1px solid "+C.mango300,borderRadius:DS.radius.lg,padding:"12px"}}>
                <div style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.mango700,marginBottom:8}}>Confirm Submission</div>
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom600,marginBottom:8,wordBreak:"break-all"}}>
                  <div><strong>Prototype:</strong> <a href={prototypeLink} target="_blank" rel="noreferrer" style={{color:C.kangkong600}}>{prototypeLink}</a></div>
                  <div><strong>Deck:</strong> <a href={deckLink} target="_blank" rel="noreferrer" style={{color:C.kangkong600}}>{deckLink}</a></div>
                </div>
                <div style={{fontFamily:FF,fontSize:11,color:C.mango600,marginBottom:10,padding:"6px 8px",background:C.mango100,borderRadius:DS.radius.sm}}>
                  Once submitted, you won't be able to edit this plant until an Approver makes a decision.
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowSubmitConfirm(false)} style={{flex:1,padding:"7px",background:C.white,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,cursor:"pointer",color:C.mushroom600}}>Cancel</button>
                  <button onClick={()=>{onSubmitToNursery(project.id,prototypeLink,deckLink);setShowSubmitConfirm(false);}}
                    style={{flex:1,padding:"7px",background:C.mango500,color:C.white,border:"none",borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,cursor:"pointer"}}
                  >Confirm Submission</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Seedling: Needs Rework feedback banner (builder only) ───────────── */}
        {project.stage==="seedling" && project.reviewStatus==="needs_rework" && authUser?.email===project.builderEmail && (
          <FeedbackBanner reviewComment={project.reviewComment} reviewedBy={project.reviewedBy} reviewedAt={project.reviewedAt}/>
        )}

        {/* ── Nursery: Locked state + ExCom decision zone ────────────────────── */}
        {project.stage==="nursery" && (
          <div style={{marginBottom:16,padding:"12px 14px",background:C.mango50,border:"1px solid "+C.mango300,borderRadius:DS.radius.lg}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mango600,marginBottom:10}}>Under Review</div>
            {project.prototypeLink&&(
              <a href={project.prototypeLink} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,color:C.kangkong600,textDecoration:"none",marginBottom:6}}>
                View Prototype
              </a>
            )}
            {project.deckLink&&(
              <a href={project.deckLink} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,color:C.kangkong600,textDecoration:"none",marginBottom:8}}>
                View Deck
              </a>
            )}
            <div style={{fontFamily:FF,fontSize:12,color:C.mango700,marginBottom:2}}>
              Submitted for review{project.submittedAt ? ` — ${new Date(project.submittedAt).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}` : ""}
            </div>
            {!authUser?.isApprover && (
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,fontStyle:"italic",marginTop:4}}>Under review by Approver.</div>
            )}

            {/* ExCom decision zone */}
            {authUser?.isApprover && (
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+C.mango200}}>
                <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:8,textTransform:"uppercase",letterSpacing:0.8}}>Approver Decision</div>
                {!showReworkInput ? (
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>onApproveProject?.(project.id)} style={{flex:1,padding:"8px",background:C.kangkong500,color:C.white,border:"none",borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      &#x2713; Approve
                    </button>
                    <button onClick={()=>setShowReworkInput(true)} style={{flex:1,padding:"8px",background:C.white,color:C.mango600,border:"1.5px solid "+C.mango400,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                      &#x21A9; Needs Rework
                    </button>
                  </div>
                ) : (
                  <div>
                    <textarea value={reworkComment} onChange={e=>setReworkComment(e.target.value)}
                      placeholder="What needs to be reworked? (required)"
                      rows={3}
                      style={{width:"100%",padding:"8px 10px",borderRadius:DS.radius.md,border:"1.5px solid "+C.mango300,fontFamily:FF,fontSize:12,color:C.mushroom800,background:C.white,outline:"none",resize:"vertical",marginBottom:8,boxSizing:"border-box"}}
                    />
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>{setShowReworkInput(false);setReworkComment("");}} style={{flex:1,padding:"7px",background:C.white,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,cursor:"pointer",color:C.mushroom600}}>Cancel</button>
                      <button disabled={!reworkComment.trim()}
                        onClick={()=>{onNeedsRework?.(project.id,reworkComment);setShowReworkInput(false);setReworkComment("");}}
                        style={{flex:1,padding:"7px",background:reworkComment.trim()?C.mango500:C.mushroom200,color:reworkComment.trim()?C.white:C.mushroom400,border:"none",borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,cursor:reworkComment.trim()?"pointer":"not-allowed"}}
                      >Send Feedback</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Withdraw button — builder or Admin */}
            {(authUser?.email===project.builderEmail||authUser?.isAdmin)&&(
              <button onClick={()=>onWithdrawFromNursery?.(project.id)} style={{
                width:"100%",padding:"7px",marginTop:12,
                background:"transparent",border:"1px solid "+C.mushroom300,
                borderRadius:DS.radius.md,fontFamily:FF,fontSize:11,
                color:C.mushroom500,cursor:"pointer",transition:"all 0.15s",
              }}>Withdraw Submission</button>
            )}
          </div>
        )}

        {project.lastUpdated>30&&(
          <div style={{background:C.mango100,border:"1px solid #f6d98a",borderRadius:DS.radius.md,padding:"10px 14px",marginBottom:16,fontFamily:FF,fontSize:12,color:C.mango600,display:"flex",gap:8,alignItems:"flex-start"}}>
            <IcoStale size={14} color={C.mango500}/>
            No updates for <strong>{project.lastUpdated} days</strong>. The project owner should check in.
          </div>
        )}

        {related.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
              <IcoRelated size={13} color={C.mushroom400}/> Related Projects
            </div>
            {related.map(r=>{
              const isHighMatch = r.score >= 3;
              return(
                <div key={r.id} onClick={()=>setSelected(r)} style={{
                  display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                  marginBottom:6,borderRadius:DS.radius.md,cursor:"pointer",
                  background:isHighMatch?C.carrot100:C.mushroom50,
                  border:"1px solid "+(isHighMatch?C.carrot500:C.mushroom200),
                  transition:"all 0.15s",
                }}
                  onMouseOver={e=>e.currentTarget.style.boxShadow=DS.shadow.sm}
                  onMouseOut={e=>e.currentTarget.style.boxShadow="none"}
                >
                  <StageIcon stage={r.stage} size={16}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</div>
                    <div style={{fontFamily:FF,fontSize:10,color:C.mushroom500}}>{r.matchReason}</div>
                  </div>
                  {isHighMatch&&<Badge label="Overlap" tone="pending"/>}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={()=>setInterested(!interested)} style={{
          width:"100%",padding:"9px",marginBottom:16,
          background:interested?C.kangkong600:C.white,
          color:interested?C.white:C.kangkong600,
          border:"1.5px solid "+C.kangkong500,
          borderRadius:DS.radius.lg,cursor:"pointer",
          fontFamily:FF,fontSize:12,fontWeight:600,
          transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        }}>
          {interested
            ?<><IcoCheck size={14} color={C.white}/> You're interested</>
            :<>I'm working on something similar</>
          }
        </button>

        <div>
          <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <IcoNote size={13} color={C.mushroom400}/> Notes
          </div>
          {(project.notes||[]).length===0&&<div style={{fontFamily:FF,fontSize:12,color:C.mushroom400,fontStyle:"italic",marginBottom:8}}>No notes yet</div>}
          {(project.notes||[]).map((n,i)=>(
            <div key={i} style={{background:C.kangkong50,border:"1px solid "+C.kangkong100,borderRadius:DS.radius.md,padding:"7px 10px",marginBottom:6,fontFamily:FF,fontSize:12,color:C.mushroom700,lineHeight:1.4,borderLeft:"3px solid "+C.kangkong400}}>{n}</div>
          ))}
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <input value={noteText} onChange={e=>setNoteText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){onNote(project.id,noteText);setNoteText("");}}}
              placeholder="Add a note..."
              style={{flex:1,padding:"7px 10px",borderRadius:DS.radius.md,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:12,color:C.mushroom800,background:C.mushroom50,outline:"none",transition:"border-color 0.15s"}}
              onFocus={e=>e.target.style.borderColor=C.kangkong500}
              onBlur={e=>e.target.style.borderColor=C.mushroom300}
            />
            <button onClick={()=>{onNote(project.id,noteText);setNoteText("");}} style={{padding:"7px 14px",background:C.kangkong500,color:C.white,border:"none",borderRadius:DS.radius.md,cursor:"pointer",fontFamily:FF,fontSize:12,fontWeight:600}}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Add Project Modal ─────────────────────────────────────────────────────────

// ── Wishlist View ─────────────────────────────────────────────────────────────
function WishlistView({wishes, projects, authUser, onUpvote, onAddWish, onWishClaim, onUnclaimSeed, onUpdateWish, showAddWish, setShowAddWish}) {
  const [deptFilter, setDeptFilter] = useState("All");
  const [sort, setSort] = useState("upvotes");
  const [claimingWish, setClaimingWish] = useState(null);
  const [editingWish, setEditingWish] = useState(null);
  const currentUser = authUser?.displayName || "You";

  const filtered = wishes
    .filter(w => deptFilter==="All" || w.builtFor===deptFilter)
    .sort((a,b) => sort==="upvotes"
      ? b.upvoters.length - a.upvoters.length
      : a.createdDaysAgo - b.createdDaysAgo
    );

  const toggleUpvote = (wishId) => onUpvote(wishId);

  const DEPTS = ["All","Marketing","Product Marketing","LDU","SolCon","Sales","RevOps","Implementation","MPS","Customer Advocacy","Customer Success Management","Alliance","Aurora","Prometheus","Legal","People Ops","Finance","Execom"];

  return (
    <div style={{flex:1,overflow:"auto",padding:"28px 32px",background:C.mushroom50}}>
      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <WishSeed size={32} color={C.mushroom600}/>
              <div>
                <div style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,lineHeight:1.1}}>Seeds</div>
                <div style={{fontFamily:FF,fontSize:12,color:C.kangkong600,fontWeight:600,marginTop:1}}>Seeds waiting to grow — ideas without a builder yet</div>
              </div>
            </div>
          </div>
          <button onClick={()=>setShowAddWish(true)} style={{
            display:"flex",alignItems:"center",gap:7,
            padding:"9px 20px",background:C.kangkong700,color:C.white,
            border:"none",borderRadius:DS.radius.lg,cursor:"pointer",
            fontFamily:FF,fontSize:13,fontWeight:700,
            boxShadow:"0 4px 16px "+C.kangkong700+"40",
          }}>
            <WishSeed size={16} color={C.white}/> Plant a Seed
          </button>
        </div>

        {/* Stats bar */}
        <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:20}}>
          {[
            {label:"Total wishes", value:wishes.length, color:C.mushroom700},
            {label:"Fulfilled", value:wishes.filter(w=>w.fulfilledBy).length, color:C.kangkong600},
            {label:"Departments", value:[...new Set(wishes.map(w=>w.builtFor))].length, color:C.blueberry500},
            {label:"Total upvotes", value:wishes.reduce((s,w)=>s+w.upvoters.length,0), color:C.mango600},
          ].map(s=>(
            <div key={s.label} style={{
              padding:"8px 16px",background:C.white,borderRadius:DS.radius.lg,
              border:"1px solid "+C.mushroom200,
            }}>
              <div style={{fontFamily:FF,fontSize:20,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontFamily:FF,fontSize:10,color:C.mushroom500,marginTop:2,textTransform:"uppercase",letterSpacing:0.6}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {DEPTS.map(d=>(
              <Chip key={d} label={d} active={deptFilter===d} onClick={()=>setDeptFilter(d)}
                color={d!=="All"?DEPT_COLORS[d]:undefined}/>
            ))}
          </div>
          <div style={{display:"flex",gap:2,background:C.mushroom100,borderRadius:DS.radius.md,padding:2}}>
            {[{k:"upvotes",l:"Most wanted"},{k:"recent",l:"Most recent"}].map(s=>(
              <button key={s.k} onClick={()=>setSort(s.k)} style={{
                padding:"5px 12px",border:"none",cursor:"pointer",fontFamily:FF,fontSize:11,fontWeight:600,
                borderRadius:DS.radius.sm,
                background:sort===s.k?C.white:"transparent",
                color:sort===s.k?C.kangkong600:C.mushroom500,
                boxShadow:sort===s.k?DS.shadow.sm:"none",transition:"all 0.15s",
              }}>{s.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Wish cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
        {filtered.map(wish=>{
          const hasUpvoted = wish.upvoters.includes(currentUser);
          const fulfilled = wish.fulfilledBy
            ? projects.find(p=>p.name===wish.fulfilledBy)
            : null;
          const deptColor = DEPT_COLORS[wish.builtFor] || C.mushroom500;
          return (
            <div key={wish.id} style={{
              background:C.white,borderRadius:DS.radius.xl,
              border:"1.5px solid "+(fulfilled?C.kangkong200:C.mushroom200),
              padding:"20px 22px",
              boxShadow:DS.shadow.sm,
              position:"relative",overflow:"hidden",
              transition:"box-shadow 0.2s",
            }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow=DS.shadow.md}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=DS.shadow.sm}
            >
              {/* Fulfilled ribbon */}
              {fulfilled&&(
                <div style={{
                  position:"absolute",top:0,right:0,
                  background:C.kangkong600,color:C.white,
                  fontFamily:FF,fontSize:9,fontWeight:800,letterSpacing:0.8,
                  padding:"3px 12px",borderBottomLeftRadius:DS.radius.md,
                  textTransform:"uppercase",
                }}>Now Growing</div>
              )}

              {/* Top row */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom900,lineHeight:1.4,marginBottom:6}}>
                    {wish.title}
                  </div>
                  <span style={{
                    display:"inline-block",padding:"2px 10px",borderRadius:DS.radius.full,
                    background:deptColor+"18",color:deptColor,
                    border:"1px solid "+deptColor+"40",
                    fontFamily:FF,fontSize:10,fontWeight:700,letterSpacing:0.3,
                  }}>{wish.builtFor}</span>
                </div>
                <WishSeed size={28} color={fulfilled?C.kangkong500:C.mushroom400}/>
              </div>

              {/* Why */}
              <p style={{fontFamily:FF,fontSize:12,color:C.mushroom600,lineHeight:1.6,marginBottom:14}}>
                {wish.why}
              </p>

              {/* Wisher */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14,
                padding:"8px 10px",background:C.mushroom50,borderRadius:DS.radius.md}}>
                <div style={{
                  width:22,height:22,borderRadius:"50%",
                  background:deptColor,color:C.white,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontFamily:FF,fontSize:9,fontWeight:700,flexShrink:0,
                }}>{wish.wisherName.split(" ").map(n=>n[0]).join("")}</div>
                <div>
                  <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom800}}>{wish.wisherName}</div>
                  <div style={{fontFamily:FF,fontSize:9,color:C.mushroom500}}>
                    {wish.createdDaysAgo===0?"Today":wish.createdDaysAgo===1?"Yesterday":wish.createdDaysAgo+" days ago"}
                    {" · "}Wisher
                  </div>
                </div>
              </div>

              {/* Upvoters */}
              <div style={{marginBottom:14}}>
                <div style={{fontFamily:FF,fontSize:10,color:C.mushroom500,marginBottom:6,textTransform:"uppercase",letterSpacing:0.6,fontWeight:600}}>
                  {wish.upvoters.length} {wish.upvoters.length===1?"person needs this":"people need this"}
                </div>
                {wish.upvoters.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {wish.upvoters.slice(0,6).map(name=>(
                      <span key={name} style={{
                        fontFamily:FF,fontSize:10,padding:"2px 8px",
                        background:C.mushroom100,color:C.mushroom700,
                        borderRadius:DS.radius.full,border:"1px solid "+C.mushroom200,
                      }}>{name}</span>
                    ))}
                    {wish.upvoters.length>6&&(
                      <span style={{fontFamily:FF,fontSize:10,color:C.mushroom500,padding:"2px 8px"}}>
                        +{wish.upvoters.length-6} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {!fulfilled&&(
                  <>
                    <button onClick={()=>toggleUpvote(wish.id)} style={{
                      flex:1,padding:"7px 12px",borderRadius:DS.radius.md,cursor:"pointer",
                      fontFamily:FF,fontSize:12,fontWeight:700,
                      border:"1.5px solid "+(hasUpvoted?C.kangkong500:C.mushroom300),
                      background:hasUpvoted?C.kangkong50:C.white,
                      color:hasUpvoted?C.kangkong600:C.mushroom600,
                      transition:"all 0.15s",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    }}>
                      {hasUpvoted?"✓ I need this":"+ I need this"}
                    </button>
                    {wish.readyForReview
                      ? <span style={{flex:1,fontFamily:FF,fontSize:12,fontWeight:700,color:C.mango600,padding:"7px 12px",background:C.mango100,borderRadius:DS.radius.md,display:"flex",alignItems:"center",justifyContent:"center"}}>⏳ Review</span>
                      : wish.claimedBy
                      ? (
                        <div style={{flex:1,display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:DS.radius.md,background:C.wintermelon100,border:"1px solid "+C.wintermelon400}}>
                          {(() => {
                            const builderCount = projects.filter(p => p.id === wish.fulfilledBy).length;
                            return builderCount > 1 ? <span style={{fontFamily:FF,fontSize:9,color:C.mushroom500,border:"1px solid "+C.mushroom300,borderRadius:DS.radius.full,padding:"1px 5px"}}>{builderCount} builders</span> : null;
                          })()}
                          <span style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.wintermelon500,flex:1}}>
                            🔨 {wish.claimedBy === currentUser ? "You're building this" : `${wish.claimedBy.split(" ")[0]} is building this`}
                          </span>
                          {wish.claimedBy === currentUser && projects.find(p=>p.id===wish.fulfilledBy)?.stage==="seedling" && (
                            <button onClick={e=>{e.stopPropagation();onUnclaimSeed(wish.id);}} style={{
                              fontFamily:FF,fontSize:10,color:C.mushroom500,background:"none",
                              border:"1px solid "+C.mushroom300,borderRadius:DS.radius.sm,padding:"2px 7px",cursor:"pointer",
                            }}>Release</button>
                          )}
                        </div>
                      )
                      : <button onClick={()=>setClaimingWish(wish)} style={{
                          flex:1,padding:"7px 12px",borderRadius:DS.radius.md,cursor:"pointer",
                          fontFamily:FF,fontSize:12,fontWeight:700,
                          border:"none",
                          background:C.kangkong700,color:C.white,
                          transition:"all 0.15s",
                          display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                          boxShadow:"0 2px 8px "+C.kangkong700+"40",
                        }}>
                          🌱 I can build this
                        </button>
                    }
                  </>
                )}
                {fulfilled&&(
                  <div style={{
                    flex:1,padding:"7px 14px",borderRadius:DS.radius.md,
                    background:C.kangkong50,
                    border:"1px solid "+C.kangkong200,
                    fontFamily:FF,fontSize:12,color:C.kangkong700,fontWeight:600,
                    display:"flex",alignItems:"center",gap:6,
                  }}>
                    <SIcoSprout size={13} col={C.kangkong500}/>
                    Built as <strong>{fulfilled.name}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Wish Modal */}
      {showAddWish&&<AddWishModal authUser={authUser} onClose={()=>setShowAddWish(false)} onAdd={w=>{onAddWish(w);setShowAddWish(false);}}/>}
      {editingWish&&<AddWishModal authUser={authUser} existing={editingWish} onClose={()=>setEditingWish(null)} onSave={w=>{onUpdateWish(w);setEditingWish(null);}}/>}
      {claimingWish&&(
        <ClaimModal
          wish={claimingWish} authUser={authUser}
          onClose={()=>setClaimingWish(null)}
          onClaim={()=>{
            onWishClaim(claimingWish.id);
            setClaimingWish(null);
          }}
        />
      )}
    </div>
  );
}

// ── Add Wish Modal ────────────────────────────────────────────────────────────
function AddWishModal({onClose, onAdd, onSave, authUser, existing=null}) {
  const isEditing = !!existing;
  const DEPTS = ["Marketing","Product Marketing","LDU","SolCon","Sales","RevOps","Implementation","MPS","Customer Advocacy","Customer Success Management","Alliance","Aurora","Prometheus","Legal","People Ops","Finance","Execom"];
  const [form,setForm] = useState({
    title: existing?.title||"",
    why: existing?.why||"",
    builtFor: existing?.builtFor||"Marketing",
    wisherName: existing?.wisherName||authUser?.displayName||"",
    wisherEmail: existing?.wisherEmail||authUser?.email||"",
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const canSubmit = form.title.trim() && form.wisherName.trim() && form.builtFor;

  const submit = () => {
    if(!canSubmit) return;
    if (isEditing) {
      onSave({...existing, title:form.title.trim(), why:form.why.trim(), builtFor:form.builtFor});
      return;
    }
    onAdd({
      id:"w"+Date.now(),
      title:form.title.trim(),
      why:form.why.trim(),
      builtFor:form.builtFor,
      wisherName:form.wisherName.trim(),
      wisherEmail:form.wisherEmail.trim() || authUser?.email || "",
      country: authUser?.country || "PH",
      createdDaysAgo:0,
      upvoters:[],
      fulfilledBy:null,
    });
  };

  const inputStyle = {
    width:"100%",padding:"9px 12px",
    border:"1.5px solid "+C.mushroom300,
    borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,
    color:C.mushroom900,background:C.white,
    outline:"none",boxSizing:"border-box",
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:100,backdropFilter:"blur(4px)",
    }} onClick={onClose}>
      <div style={{
        background:C.white,borderRadius:DS.radius.xl,
        padding:"28px 28px 24px",width:480,maxWidth:"95vw",
        boxShadow:DS.shadow.xl,
        animation:"slideUp 0.2s ease",
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <WishSeed size={24} color={C.mushroom600}/>
            <div>
              <div style={{fontFamily:FF,fontSize:16,fontWeight:800,color:C.mushroom900}}>{existing?"Edit Seed":"Plant a Seed"}</div>
              <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>A seed waiting for a builder</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
            <IcoClose size={20} color={C.mushroom400}/>
          </button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>
              What do you wish existed? <span style={{color:C.carrot500}}>*</span>
            </div>
            <input value={form.title} onChange={e=>set("title",e.target.value)}
              placeholder="e.g. Auto-summarize Slack threads for async teams"
              style={inputStyle}/>
          </div>
          <div>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>
              Why does it matter?
            </div>
            <textarea value={form.why} onChange={e=>set("why",e.target.value)}
              placeholder="Who suffers without it, and how often? What would change if it existed?"
              rows={3} style={{...inputStyle,resize:"vertical",lineHeight:1.6}}/>
          </div>
          <div>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>
              Built for <span style={{color:C.carrot500}}>*</span>
            </div>
            <select value={form.builtFor} onChange={e=>set("builtFor",e.target.value)} style={inputStyle}>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>
                Your Name <span style={{color:C.carrot500}}>*</span>
              </div>
              <input value={form.wisherName} onChange={e=>set("wisherName",e.target.value)}
                placeholder="e.g. Maya Santos" style={inputStyle}/>
            </div>
            <div>
              <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>
                Your Email
              </div>
              <input value={form.wisherEmail} onChange={e=>set("wisherEmail",e.target.value)}
                placeholder="maya@sprout.com" style={inputStyle}/>
            </div>
          </div>
        </div>

        <div style={{marginTop:22,display:"flex",gap:10}}>
          <button onClick={onClose} style={{
            flex:1,padding:"10px",background:C.mushroom100,
            border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg,
            cursor:"pointer",fontFamily:FF,fontSize:13,color:C.mushroom600,fontWeight:600,
          }}>Cancel</button>
          <button onClick={submit} disabled={!canSubmit} style={{
            flex:2,padding:"10px",
            background:canSubmit?C.kangkong700:C.mushroom300,
            border:"none",borderRadius:DS.radius.lg,cursor:canSubmit?"pointer":"not-allowed",
            fontFamily:FF,fontSize:13,color:C.white,fontWeight:700,
            boxShadow:canSubmit?"0 4px 16px "+C.kangkong700+"40":"none",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
            <WishSeed size={14} color={C.white}/> {isEditing?"Save changes":"Plant this Seed"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── WelcomeModal ──────────────────────────────────────────────────────────────
function WelcomeModal({ onExplore, onDismissPermanently, isApprover, country }) {
  const roleName  = isApprover ? "Approver" : "Planter";
  const roleEmoji = isApprover ? "🌿" : "🌱";
  const teamLabel = country === "PH" ? "PH team" : country === "TH" ? "TH team" : "Your team";
  const nudge     = isApprover ? "Review plants in the Nursery" : "Claim a seed to build";

  const stageRows = [
    { key:"seedling", emoji:"🌱", label:"Seedling", desc:"Someone is actively building",      bg:STAGE_COLORS.seedling.bg, text:STAGE_COLORS.seedling.text },
    { key:"nursery",  emoji:"🌿", label:"Nursery",  desc:"Under leadership review",           bg:STAGE_COLORS.nursery.bg,  text:STAGE_COLORS.nursery.text  },
    { key:"sprout",   emoji:"🌿", label:"Sprout",   desc:"Approved, actively developing",     bg:STAGE_COLORS.sprout.bg,   text:STAGE_COLORS.sprout.text   },
    { key:"bloom",    emoji:"🌸", label:"Bloom",    desc:"Live, in user testing",             bg:STAGE_COLORS.bloom.bg,    text:STAGE_COLORS.bloom.text    },
    { key:"thriving", emoji:"🌳", label:"Thriving", desc:"Delivering measurable value",       bg:STAGE_COLORS.thriving.bg, text:STAGE_COLORS.thriving.text },
  ];

  return (
    <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.65)",backdropFilter:"blur(8px)"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,maxWidth:480,width:"92%",boxShadow:DS.shadow.xl,overflow:"hidden",animation:"slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)"}}>

        {/* ── Dark green header ── */}
        <div style={{background:"#14532d",padding:"28px 24px 24px",position:"relative",textAlign:"center"}}>
          {/* Skip — session-only dismiss */}
          <button onClick={onExplore}
            style={{position:"absolute",top:14,right:16,background:"none",border:"none",color:"rgba(255,255,255,0.65)",fontFamily:FF,fontSize:13,cursor:"pointer",padding:"4px 8px",borderRadius:DS.radius.sm,transition:"color 0.15s"}}
            onMouseOver={e=>e.currentTarget.style.color="#fff"}
            onMouseOut={e=>e.currentTarget.style.color="rgba(255,255,255,0.65)"}
          >Skip</button>
          {/* Logo */}
          <div style={{marginBottom:10,display:"flex",justifyContent:"center"}}>
            <GroveLogo theme="green" size={40} />
          </div>
          {/* Grove + Beta pill */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
            <span style={{fontFamily:FF,fontSize:26,fontWeight:800,color:"#fff"}}>Grove</span>
            <span style={{fontFamily:FF,fontSize:11,fontWeight:600,background:"rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.88)",borderRadius:DS.radius.full,padding:"3px 9px",letterSpacing:0.3}}>Beta</span>
          </div>
          {/* Tagline */}
          <div style={{fontFamily:FF,fontSize:13,color:"rgba(255,255,255,0.80)",lineHeight:1.65,maxWidth:340,margin:"0 auto"}}>
            Every thriving AI tool started as a seed. Grove is where Sprout plants, tends, and grows its AI work — together.
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{padding:"20px 24px 24px"}}>

          {/* Role pill */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.mushroom100,border:"1.5px solid "+C.mushroom200,borderRadius:DS.radius.full,padding:"8px 16px",flexWrap:"wrap",justifyContent:"center"}}>
              <span style={{fontSize:15}}>{roleEmoji}</span>
              <span style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom800}}>{roleName}</span>
              <span style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>· {teamLabel}</span>
              <span style={{fontFamily:FF,fontSize:12,color:C.mushroom400}}>· {nudge}</span>
            </div>
          </div>

          {/* Section label */}
          <div style={{fontFamily:FF,fontSize:10,fontWeight:700,color:C.mushroom500,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>How ideas grow</div>

          {/* Stage list */}
          <div style={{border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg,overflow:"hidden",marginBottom:16}}>
            {/* Seed row */}
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.mushroom50,borderBottom:"1px solid "+C.mushroom200}}>
              <span style={{fontSize:15,flexShrink:0}}>🌰</span>
              <span style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom700,flexShrink:0}}>Seed</span>
              <span style={{fontFamily:FF,fontSize:12,color:C.mushroom500,flex:1}}>An idea for a project or tool</span>
              <span style={{display:"flex",alignItems:"center",gap:3,fontFamily:FF,fontSize:11,color:C.blueberry500,flexShrink:0,opacity:0.85}}>overlap check 🔍</span>
            </div>
            {/* Project stage rows */}
            {stageRows.map((s, i) => (
              <div key={s.key} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:s.bg,borderBottom:i < stageRows.length-1 ? "1px solid rgba(0,0,0,0.06)" : "none"}}>
                <span style={{fontSize:15,flexShrink:0}}>{s.emoji}</span>
                <span style={{fontFamily:FF,fontSize:13,fontWeight:700,color:s.text,flexShrink:0}}>{s.label}</span>
                <span style={{fontFamily:FF,fontSize:12,color:s.text,opacity:0.8}}>{s.desc}</span>
              </div>
            ))}
          </div>

          {/* Builder nudge card */}
          <div style={{background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:16,flexShrink:0,marginTop:1}}>🌱</span>
            <span style={{fontFamily:FF,fontSize:12,color:C.kangkong700,lineHeight:1.6}}>You don't need to be an engineer to build. Anyone at Sprout can claim a seed and start growing it.</span>
          </div>

          {/* Beta note + primary CTA */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:10}}>
            <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,lineHeight:1.5,flex:1}}>
              Grove is in Beta. Hit <strong style={{color:C.mushroom700}}>?</strong> for help or to learn more about each stage.
            </div>
            <button onClick={onExplore}
              style={{flexShrink:0,padding:"10px 20px",borderRadius:DS.radius.lg,background:"#14532d",border:"none",color:C.white,fontFamily:FF,fontSize:14,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",transition:"background 0.15s"}}
              onMouseOver={e=>e.currentTarget.style.background="#0f3d21"}
              onMouseOut={e=>e.currentTarget.style.background="#14532d"}
            >Take me in →</button>
          </div>

          {/* Don't show again */}
          <button onClick={onDismissPermanently}
            style={{width:"100%",padding:"9px 0",borderRadius:DS.radius.lg,background:"none",border:"1.5px solid "+C.mushroom200,color:C.mushroom500,fontFamily:FF,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}
            onMouseOver={e=>{e.currentTarget.style.background=C.mushroom50;e.currentTarget.style.borderColor=C.mushroom300;}}
            onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor=C.mushroom200;}}
          >Don't show again</button>
        </div>
      </div>
    </div>
  );
}

// ── ModalField — must be defined outside AddProjectModal to prevent focus loss ──
const modalInputStyle = {width:"100%",padding:"8px 10px",borderRadius:DS.radius.md,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:13,color:C.mushroom800,background:C.mushroom50,outline:"none",boxSizing:"border-box"};

function ModalField({label, k, type="text", ph, opts, form, onChange}) {
  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
      {type==="textarea"
        ?<textarea rows={2} value={form[k]} onChange={e=>onChange(k,e.target.value)} placeholder={ph} style={{...modalInputStyle,resize:"vertical",lineHeight:1.6}}/>
        :type==="select"
        ?<select value={form[k]} onChange={e=>onChange(k,e.target.value)} style={modalInputStyle}>
          {opts.map(o=><option key={o}>{o}</option>)}
        </select>
        :<input type="text" value={form[k]} onChange={e=>onChange(k,e.target.value)} placeholder={ph} style={modalInputStyle}/>
      }
    </div>
  );
}

// ── SectionHeader — uppercase label + rule divider ───────────────────────────
function SectionHeader({title}) {
  return (
    <div style={{margin:"22px 0 14px"}}>
      <div style={{fontFamily:FF,fontSize:10,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:C.mushroom500,marginBottom:6}}>{title}</div>
      <div style={{height:1,background:C.mushroom100}}/>
    </div>
  );
}

// ── StoryQ — green card textarea for story questions ──────────────────────────
// Must be defined outside AddProjectModal to prevent focus loss on re-render
function StoryQ({k, label, hint, form, onChange, ph}) {
  return (
    <div style={{
      background:C.kangkong50, border:"1.5px solid "+C.kangkong200,
      borderRadius:DS.radius.md, padding:"10px 12px", marginBottom:10,
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <label style={{fontFamily:FF,fontSize:10,fontWeight:700,color:C.kangkong600,textTransform:"uppercase",letterSpacing:0.5}}>{label}</label>
        <span style={{fontFamily:FF,fontSize:10,color:C.kangkong400}}>{hint}</span>
      </div>
      <textarea
        rows={2}
        value={form[k]}
        onChange={e=>onChange(k,e.target.value)}
        placeholder={ph}
        style={{
          width:"100%", background:"transparent", border:"none", outline:"none",
          fontFamily:FF, fontSize:13, color:C.mushroom800,
          resize:"vertical", lineHeight:1.6, boxSizing:"border-box", padding:0,
        }}
      />
    </div>
  );
}

// ── CollaboratorInput — tag-input with profiles search ────────────────────────
// Must be defined outside AddProjectModal to prevent focus loss on re-render
function CollaboratorInput({selected, onChange, selfEmail}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase.from("profiles")
        .select("email, display_name, first_name")
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(8);
      setResults((data||[]).filter(p => p.email !== selfEmail && !selected.includes(p.email)));
      setOpen(true);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const add = (profile) => {
    if (selected.length >= 10) return;
    onChange([...selected, profile.email]);
    setQuery(""); setResults([]); setOpen(false);
  };

  const remove = (email) => onChange(selected.filter(e => e !== email));

  const getChipName = (email) => email.split("@")[0];
  const getInitialsFromEmail = (email) => email.slice(0,2).toUpperCase();

  return (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>
        Collaborators <span style={{fontWeight:400,color:C.mushroom400,textTransform:"none",letterSpacing:0}}>(optional, max 10)</span>
      </label>
      <div style={{
        minHeight:40, padding:"6px 8px", borderRadius:DS.radius.md,
        border:"1.5px solid "+C.mushroom300, background:C.mushroom50,
        display:"flex", flexWrap:"wrap", gap:6, alignItems:"center",
        boxSizing:"border-box", position:"relative",
      }}>
        {selected.map(email => (
          <span key={email} style={{
            display:"inline-flex", alignItems:"center", gap:4,
            background:C.kangkong50, border:"1px solid "+C.kangkong100,
            color:C.kangkong700, borderRadius:DS.radius.full,
            padding:"2px 8px 2px 4px", fontFamily:FF, fontSize:11, fontWeight:600,
          }}>
            <span style={{
              width:18, height:18, borderRadius:"50%", background:C.kangkong200,
              color:C.kangkong700, display:"inline-flex", alignItems:"center",
              justifyContent:"center", fontSize:9, fontWeight:700,
            }}>{getInitialsFromEmail(email)}</span>
            {getChipName(email)}
            <button onClick={()=>remove(email)} style={{
              background:"none", border:"none", cursor:"pointer", padding:0,
              color:C.kangkong400, fontFamily:FF, fontSize:12, lineHeight:1,
            }}>×</button>
          </span>
        ))}
        <input
          value={query} onChange={e=>setQuery(e.target.value)}
          placeholder={selected.length===0 ? "Search by name or email…" : ""}
          style={{
            flex:1, minWidth:100, border:"none", outline:"none",
            background:"transparent", fontFamily:FF, fontSize:13,
            color:C.mushroom800, padding:"2px 0",
          }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{
          position:"absolute", zIndex:200, background:C.white,
          border:"1.5px solid "+C.mushroom200, borderRadius:DS.radius.md,
          boxShadow:DS.shadow.md, width:"calc(100% - 56px)", maxHeight:200, overflowY:"auto",
        }}>
          {results.map(p => (
            <div key={p.email} onClick={()=>add(p)} style={{
              padding:"8px 12px", cursor:"pointer", display:"flex",
              alignItems:"center", gap:10,
              borderBottom:"1px solid "+C.mushroom100,
            }}
              onMouseOver={e=>e.currentTarget.style.background=C.mushroom50}
              onMouseOut={e=>e.currentTarget.style.background="transparent"}
            >
              <span style={{
                width:28, height:28, borderRadius:"50%", background:C.kangkong100,
                color:C.kangkong700, display:"inline-flex", alignItems:"center",
                justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0,
              }}>{(p.display_name||p.email).slice(0,2).toUpperCase()}</span>
              <div>
                <div style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom900}}>{p.display_name||p.email}</div>
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{p.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {searching && <div style={{fontFamily:FF,fontSize:11,color:C.mushroom400,marginTop:4}}>Searching…</div>}
      {selected.length >= 10 && <div style={{fontFamily:FF,fontSize:11,color:C.mango600,marginTop:4}}>Maximum 10 collaborators reached.</div>}
    </div>
  );
}

// ── Add Project Modal (with AI Summarizer + Duplicate Detector) ───────────────
const AddProjectModal = ({onClose, onAdd, onSave, projects, prefill=null, existing=null, authUser=null}) => {
  const isEditing = !!existing;
  const DEPTS = Object.keys(DEPT_ZONES);
  const [form, setForm] = useState({
    name:               existing?.name        || prefill?.title    || "",
    description:        existing?.description || prefill?.why      || "",
    builtBy:            existing?.builtBy     || "Marketing",
    builtFor:           existing?.builtFor    || prefill?.builtFor || "Marketing",
    problem:"", built:"", betterNow:"",
    builder:            existing?.builder     || authUser?.displayName || "",
    stage:              existing?.stage       || STAGES[0],
    dataSource:         existing?.dataSource  || "",
    dataSources:        existing?.dataSources || [],
    demoLink:           existing?.demoLink    || "",
    toolUsed:           existing?.toolUsed    || [],
    collaboratorEmails: existing?.collaboratorEmails || [],
  });

  // AI / story states
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiSummaryDone, setAiSummaryDone] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiOverlaps, setAiOverlaps] = useState(null);
  const [aiOverlapChecked, setAiOverlapChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setField = (k,v) => {
    setForm(p=>({...p,[k]:v}));
    setAiSummaryDone(false);
    if (["name","description","problem","built","betterNow","builtFor","dataSources"].includes(k)) {
      setAiOverlaps(null);
      setAiOverlapChecked(false);
    }
  };

  const canSummarize = !!(form.name.trim() && (form.problem || form.built || form.betterNow));

  const handleSummarize = async () => {
    if (!canSummarize || aiSummarizing) return;
    setAiSummarizing(true);
    setAiSummaryError(null);
    try {
      const summary = await generateProjectSummary({
        name: form.name, builtBy: form.builtBy, builtFor: form.builtFor,
        problem: form.problem, built: form.built, betterNow: form.betterNow,
      });
      setForm(p=>({...p, description:summary}));
      setAiSummaryDone(true);
    } catch(e) {
      console.error("summarize error:", e);
      setAiSummaryError(e?.message || "Something went wrong. Check the browser console.");
    }
    setAiSummarizing(false);
  };

  const doAdd = () => {
    onAdd({
      ...form,
      problemSpace: "",
      capability: "",
      id:Date.now(), lastUpdated:0, notes:[],
      zx:35+Math.random()*25, zy:35+Math.random()*25,
      milestones:[STAGE_LABELS[form.stage]+" — "+new Date().toLocaleDateString("en-PH",{month:"short",year:"numeric"})],
      impactNum:"TBD", interestedUsers:[],
    });
    onClose();
  };

  const doSave = () => {
    onSave({...existing, ...form, problemSpace: "", capability: ""});
    onClose();
  };

  const submit = async () => {
    if (!form.name.trim() || !form.toolUsed.length || submitting) return;
    if (isEditing) { doSave(); return; }
    if (aiOverlapChecked && aiOverlaps?.length > 0) { doAdd(); return; }
    setSubmitting(true);
    setAiChecking(true);
    const candidates = projects.filter(p => p.builtFor === form.builtFor);
    const overlaps = await detectDuplicates(
      {...form, problemSpace: "", capability: ""},
      candidates
    );
    setAiOverlaps(overlaps);
    setAiOverlapChecked(true);
    setAiChecking(false);
    setSubmitting(false);
    if (overlaps.length === 0) { doAdd(); }
  };

  const previewProject = {
    id:"preview", name:form.name, builtBy:form.builtBy, builtFor:form.builtFor,
    stage:form.stage, toolUsed:form.toolUsed, capability:"",
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.55)",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,padding:28,maxWidth:540,width:"92%",maxHeight:"92vh",overflowY:"auto",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontFamily:FF,fontSize:18,fontWeight:700,color:C.mushroom900,display:"flex",alignItems:"center",gap:8}}>
              <IcoGarden size={24} color={C.kangkong600}/> {isEditing?"Edit Project":"Add to the Garden"}
            </div>
            <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,marginTop:2}}>{isEditing?"Update your project details":"Log a project you're working on or have shipped"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcoClose size={18} color={C.mushroom400}/></button>
        </div>

        {prefill&&(
          <div style={{background:C.kangkong50,border:"1.5px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"10px 14px",marginBottom:16,fontFamily:FF,fontSize:12,color:C.kangkong700,display:"flex",alignItems:"center",gap:8}}>
            <WishSeed size={16} color={C.kangkong600}/>
            Pre-filled from wish: <strong>"{prefill.title}"</strong>
          </div>
        )}

        {/* ── Section 1: The project ── */}
        <SectionHeader title="The project"/>

        <ModalField label="Project Name *" k="name" ph="e.g. SmartSort AI" form={form} onChange={setField}/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <ModalField label="Your team" k="builtBy" type="select" opts={DEPTS} form={form} onChange={setField}/>
          <ModalField label="For" k="builtFor" type="select" opts={DEPTS} form={form} onChange={setField}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* You — read-only */}
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>You</label>
            <div style={{
              padding:"8px 10px",borderRadius:DS.radius.md,
              border:"1.5px solid "+C.mushroom200,background:C.mushroom50,
              fontFamily:FF,fontSize:13,color:C.mushroom400,
              boxSizing:"border-box",minHeight:36,
            }}>{form.builder||authUser?.displayName||"—"}</div>
          </div>
          {/* Collaborators */}
          <div style={{position:"relative"}}>
            <CollaboratorInput
              selected={form.collaboratorEmails}
              onChange={v=>setField("collaboratorEmails",v)}
              selfEmail={authUser?.email||""}
            />
          </div>
        </div>

        {/* Tools you're using */}
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>
            Tools you're using <span style={{color:C.tomato500,fontWeight:400}}>*</span>
          </label>
          {!form.toolUsed.length&&(
            <div style={{fontFamily:FF,fontSize:11,color:C.tomato500,marginBottom:4}}>Select at least one tool</div>
          )}
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {TOOLS.map(t=>{
              const active = form.toolUsed.includes(t);
              return (
                <button key={t} onClick={()=>setField("toolUsed", active ? form.toolUsed.filter(x=>x!==t) : [...form.toolUsed,t])} style={{
                  padding:"5px 12px",borderRadius:DS.radius.full,cursor:"pointer",
                  fontFamily:FF,fontSize:11,fontWeight:600,
                  border:"1.5px solid "+(active?C.kangkong400:C.mushroom300),
                  background:active?C.kangkong50:C.white,
                  color:active?C.kangkong700:C.mushroom600,
                  transition:"all 0.15s",
                }}>
                  {active&&<span style={{marginRight:3}}>✓</span>}{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data sources */}
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>
            Data sources <span style={{fontWeight:400,color:C.mushroom400,textTransform:"none",letterSpacing:0}}>(optional)</span>
          </label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {DATA_SOURCES.map(s=>{
              const active = form.dataSources.includes(s);
              return (
                <button key={s} onClick={()=>setField("dataSources", active ? form.dataSources.filter(x=>x!==s) : [...form.dataSources,s])} style={{
                  padding:"5px 12px",borderRadius:DS.radius.full,cursor:"pointer",
                  fontFamily:FF,fontSize:11,fontWeight:600,
                  border:"1.5px solid "+(active?C.blueberry400:C.mushroom300),
                  background:active?C.blueberry50:C.white,
                  color:active?C.blueberry600:C.mushroom600,
                  transition:"all 0.15s",
                }}>
                  {active&&<span style={{marginRight:3}}>✓</span>}{s}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section 2: About the project ── */}
        <SectionHeader title="About the project"/>

        {/* Story expander */}
        <div style={{marginBottom:12}}>
          <button
            onClick={()=>setStoryExpanded(p=>!p)}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"9px 12px", borderRadius:DS.radius.md,
              border:"1px solid "+C.mushroom200, background:C.white,
              cursor:"pointer", fontFamily:FF, fontSize:12, fontWeight:600,
              color:C.blueberry500, transition:"all 0.15s",
            }}
          >
            <span>✦ Help me write this — answer 3 quick questions</span>
            <span style={{fontSize:10,color:C.mushroom400,transition:"transform 0.2s",display:"inline-block",transform:storyExpanded?"rotate(180deg)":"none"}}>▾</span>
          </button>

          {storyExpanded&&(
            <div style={{background:C.mushroom50,border:"1px solid "+C.mushroom200,borderTop:"none",borderRadius:"0 0 "+DS.radius.md+" "+DS.radius.md,padding:"14px 12px"}}>
              <StoryQ k="problem" label="What problem are you solving?" hint="" form={form} onChange={setField} ph="What challenge or gap existed before?"/>
              <StoryQ k="built" label="What are you building?" hint="" form={form} onChange={setField} ph="Describe what you're creating or automating…"/>
              <StoryQ k="betterNow" label="What will be better?" hint="" form={form} onChange={setField} ph="What changes for the team or customers?"/>

              <button
                onClick={handleSummarize}
                disabled={!canSummarize||aiSummarizing}
                style={{
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",
                  marginTop:4,padding:"7px 12px",borderRadius:DS.radius.md,
                  border:"1.5px solid "+(aiSummaryDone?C.kangkong400:C.blueberry400||"#63b3ed"),
                  background:aiSummaryDone?C.kangkong50:C.blueberry100||"#ebf8ff",
                  color:aiSummaryDone?C.kangkong600:C.blueberry500||"#3182ce",
                  fontFamily:FF,fontSize:12,fontWeight:700,
                  cursor:canSummarize&&!aiSummarizing?"pointer":"not-allowed",
                  opacity:canSummarize?1:0.5,transition:"all 0.15s",
                }}
              >
                {aiSummarizing
                  ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:12}}>⟳</span> Writing description…</>
                  : aiSummaryDone
                  ? <><IcoCheck size={12} color={C.kangkong500}/> Regenerate description from answers</>
                  : <>✦ Craft my description from these answers</>
                }
              </button>
              {aiSummaryError&&(
                <div style={{fontFamily:FF,fontSize:11,color:C.tomato600,marginTop:6,background:C.tomato50,border:"1px solid "+C.tomato200,borderRadius:DS.radius.md,padding:"6px 10px"}}>
                  AI failed: {aiSummaryError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Description textarea — always visible */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Description</label>
          <textarea rows={3} value={form.description} onChange={e=>setField("description",e.target.value)}
            placeholder="Describe your project — or use the helper above to generate a draft…"
            style={{...modalInputStyle,resize:"vertical",lineHeight:1.6}}/>
          {aiSummaryDone&&(
            <div style={{fontFamily:FF,fontSize:11,color:C.kangkong600,marginTop:5,display:"flex",alignItems:"center",gap:4}}>
              <IcoCheck size={11} color={C.kangkong500}/> AI-generated — feel free to edit before saving
            </div>
          )}
        </div>

        {/* Project link */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>
            Project link <span style={{fontWeight:400,color:C.mushroom400,textTransform:"none",letterSpacing:0}}>(optional)</span>
          </label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
              <IcoLink size={13} color={C.mushroom400}/>
            </span>
            <input type="text" value={form.demoLink} onChange={e=>setField("demoLink",e.target.value)}
              placeholder="Prototype, internal tool, or live product — whatever you have"
              style={{...modalInputStyle,paddingLeft:30}}/>
          </div>
        </div>

        {/* ── Section 3: Stage ── */}
        <SectionHeader title="Stage"/>

        {/* Stage selector */}
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom700,marginBottom:8}}>Where is this project right now?</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {STAGES.filter(s => s !== 'nursery').map(s=>{
              const sc = STAGE_COLORS[s];
              const active = form.stage===s;
              return (
                <button key={s} onClick={()=>setField("stage",s)} style={{
                  padding:"10px 8px",borderRadius:DS.radius.lg,cursor:"pointer",textAlign:"left",
                  border:"2px solid "+(active?sc.dot:C.mushroom200),
                  background:active?sc.bg:C.white,
                  transition:"all 0.15s",
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                    <StageIcon stage={s} size={13}/>
                    <span style={{fontFamily:FF,fontSize:11,fontWeight:700,color:active?sc.text:C.mushroom700}}>{STAGE_LABELS[s]}</span>
                    {active&&<IcoCheck size={11} color={sc.dot}/>}
                  </div>
                  <div style={{fontFamily:FF,fontSize:9,color:active?sc.text:C.mushroom400,lineHeight:1.4,opacity:0.85}}>{STAGE_DESC[s]}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Preview ── */}
        <SectionHeader title="Preview"/>
        <div style={{
          borderRadius:DS.radius.lg,border:"1px solid "+C.mushroom200,
          overflow:"hidden",marginBottom:16,background:C.white,
          boxShadow:DS.shadow.sm,
        }}>
          <ProjectImage project={previewProject} height={110} style={{borderBottom:"1px solid "+C.mushroom100}}/>
          <div style={{padding:"12px 14px"}}>
            <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:form.name?C.mushroom900:C.mushroom400,marginBottom:6,fontStyle:form.name?"normal":"italic"}}>
              {form.name||"Your project name will appear here"}
            </div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
              <StageBadge stage={form.stage}/>
              {form.toolUsed.slice(0,2).map(t=>(
                <span key={t} style={{fontFamily:FF,fontSize:10,fontWeight:600,color:C.mushroom600,background:C.mushroom100,borderRadius:DS.radius.full,padding:"2px 8px"}}>{t}</span>
              ))}
              {form.builtBy&&<span style={{fontFamily:FF,fontSize:10,color:C.mushroom400,marginLeft:2}}>{form.builtBy} → {form.builtFor}</span>}
            </div>
          </div>
        </div>

        {/* AI Duplicate Check result */}
        {aiOverlapChecked&&(
          <div style={{
            background:aiOverlaps?.length===0?C.kangkong50:C.mango100,
            border:"1.5px solid "+(aiOverlaps?.length===0?C.kangkong200:C.mango500),
            borderRadius:DS.radius.lg,padding:"12px 14px",marginBottom:16,
          }}>
            <div style={{fontFamily:FF,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:6,
              color:aiOverlaps?.length===0?C.kangkong600:C.mango600,
              marginBottom:aiOverlaps?.length>0?10:0,
            }}>
              {aiOverlaps?.length>0
                ? <><IcoWarning size={14} color={C.mango500}/> {aiOverlaps.length} potential overlap{aiOverlaps.length>1?"s":""} found</>
                : <><IcoCheck size={14} color={C.kangkong500}/> No overlaps found</>
              }
            </div>
            {aiOverlaps?.length>0&&(
              <div>
                {aiOverlaps.map((o,i)=>(
                  <div key={i} style={{background:C.white,border:"1px solid "+C.mango500,borderRadius:DS.radius.md,padding:"8px 10px",marginBottom:6,display:"flex",gap:8,alignItems:"flex-start"}}>
                    <span style={{background:o.severity==="high"?C.tomato100:C.mango100,color:o.severity==="high"?C.tomato600:C.mango600,fontFamily:FF,fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:DS.radius.full,textTransform:"uppercase",flexShrink:0,marginTop:1}}>{o.severity}</span>
                    <div>
                      <div style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.mushroom900}}>{o.name}</div>
                      <div style={{fontFamily:FF,fontSize:11,color:C.mushroom600,marginTop:2}}>{o.reason}</div>
                    </div>
                  </div>
                ))}
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500,marginTop:4}}>Consider collaborating with these teams instead of building separately.</div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        {(()=>{
          const hasOverlaps = aiOverlapChecked && aiOverlaps?.length > 0;
          const canSubmit = !!(form.name.trim() && form.toolUsed.length && !submitting);
          const bg = !canSubmit ? C.mushroom300 : hasOverlaps ? C.mango500 : C.kangkong500;
          const shadow = canSubmit ? "0 4px 16px "+(hasOverlaps?C.mango500:C.kangkong500)+"40" : "none";
          return (
            <button onClick={submit} disabled={!canSubmit} style={{
              width:"100%",padding:"11px",background:bg,
              color:C.white,border:"none",borderRadius:DS.radius.lg,
              cursor:canSubmit?"pointer":"not-allowed",
              fontFamily:FF,fontSize:13,fontWeight:700,
              boxShadow:shadow,transition:"all 0.2s",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            }}>
              {submitting
                ? <><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Checking for duplicates…</>
                : hasOverlaps
                ? <><IcoWarning size={16} color={C.white}/> Save anyway</>
                : isEditing
                ? <><IcoCheck size={16} color={C.white}/> Save changes</>
                : <><IcoAdd size={16} color={C.white}/> Add to the Garden</>
              }
            </button>
          );
        })()}
      </div>
    </div>
  );
};

// ── Claim Modal ────────────────────────────────────────────────────────────────
function ClaimModal({wish, authUser, onClose, onClaim}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:210,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.55)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,maxWidth:440,width:"92%",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,overflow:"hidden",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{background:C.kangkong50,padding:"22px 24px",borderBottom:"1px solid "+C.kangkong200}}>
          <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.kangkong600,marginBottom:8}}>Committing to build</div>
          <div style={{fontFamily:FF,fontSize:17,fontWeight:700,color:C.mushroom900,lineHeight:1.3}}>"{wish.title}"</div>
          <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,marginTop:6}}>Wished by <strong style={{color:C.mushroom700}}>{wish.wisherName}</strong> · For {wish.builtFor}</div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{background:C.mushroom50,borderRadius:DS.radius.lg,padding:"12px 14px",marginBottom:20,border:"1px solid "+C.mushroom200}}>
            <div style={{fontFamily:FF,fontSize:12,color:C.mushroom600,lineHeight:1.6}}>
              By claiming this seed, you're letting the team know you're working on it. This doesn't add a project to the Garden yet — come back and add it once you have a working prototype.
            </div>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:0.8,color:C.mushroom500,marginBottom:4}}>Builder</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.mushroom50,borderRadius:DS.radius.lg,border:"1px solid "+C.mushroom200}}>
              <UserAvatar user={authUser} size={32}/>
              <div>
                <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom900}}>{authUser.displayName}</div>
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{authUser.email}</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",background:C.mushroom100,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,color:C.mushroom600,fontWeight:600}}>Cancel</button>
            <button onClick={onClaim} style={{flex:2,padding:"10px",background:C.kangkong500,border:"none",borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,color:C.white,fontWeight:700,boxShadow:"0 4px 16px "+C.kangkong500+"40"}}>
              I'll build this 🌱
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ready For Review Modal ─────────────────────────────────────────────────────
function ReadyForReviewModal({wish, onClose, onSubmit}) {
  const [prototypeLink, setPrototypeLink] = useState("");
  const [prototypeNote, setPrototypeNote] = useState("");
  const canSubmit = prototypeNote.trim().length > 0;
  return (
    <div style={{position:"fixed",inset:0,zIndex:210,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.55)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,maxWidth:460,width:"92%",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,overflow:"hidden",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{background:C.mango100,padding:"22px 24px",borderBottom:"1px solid #f6d98a"}}>
          <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mango600,marginBottom:8}}>I have a working prototype</div>
          <div style={{fontFamily:FF,fontSize:17,fontWeight:700,color:C.mushroom900,lineHeight:1.3}}>"{wish.title}"</div>
          <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,marginTop:6}}>An admin will review and promote this to Sprout stage.</div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>What did you build? <span style={{color:C.tomato500}}>*</span></label>
            <textarea rows={3} value={prototypeNote} onChange={e=>setPrototypeNote(e.target.value)}
              placeholder="Describe what you built, how it works, and early results if any…"
              style={{width:"100%",padding:"9px 12px",borderRadius:DS.radius.lg,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:13,color:C.mushroom800,background:C.mushroom50,outline:"none",boxSizing:"border-box",resize:"vertical",lineHeight:1.6}}
              onFocus={e=>e.target.style.borderColor=C.kangkong500}
              onBlur={e=>e.target.style.borderColor=C.mushroom300}
            />
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.5}}>Demo / prototype link <span style={{fontWeight:400,color:C.mushroom400,textTransform:"none"}}>optional</span></label>
            <input type="text" value={prototypeLink} onChange={e=>setPrototypeLink(e.target.value)}
              placeholder="https://..."
              style={{width:"100%",padding:"9px 12px",borderRadius:DS.radius.lg,border:"1.5px solid "+C.mushroom300,fontFamily:FF,fontSize:13,color:C.mushroom800,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=C.kangkong500}
              onBlur={e=>e.target.style.borderColor=C.mushroom300}
            />
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={onClose} style={{flex:1,padding:"10px",background:C.mushroom100,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,color:C.mushroom600,fontWeight:600}}>Cancel</button>
            <button onClick={()=>canSubmit&&onSubmit({prototypeLink,prototypeNote})} disabled={!canSubmit} style={{flex:2,padding:"10px",background:canSubmit?C.mango500:C.mushroom300,border:"none",borderRadius:DS.radius.lg,cursor:canSubmit?"pointer":"not-allowed",fontFamily:FF,fontSize:13,color:C.white,fontWeight:700}}>
              Submit for review 🌿
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Modal ──────────────────────────────────────────────────────────────
function ProfileModal({authUser, projects, wishes, onClose}) {
  const myProjects = projects.filter(p => p.builderEmail === authUser.email || p.builder === authUser.displayName);
  const mySeeds = wishes.filter(w => w.wisherEmail === authUser.email || w.wisherName === authUser.displayName);
  const claimedSeeds = wishes.filter(w => w.claimedByEmail === authUser.email && !w.fulfilledBy);
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.55)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,maxWidth:480,width:"92%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:DS.shadow.xl,animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{background:"linear-gradient(135deg,"+C.kangkong800+" 0%,"+C.kangkong600+" 100%)",padding:"28px 28px 24px",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:DS.radius.md,padding:6,cursor:"pointer"}}>
            <IcoClose size={16} color={C.white}/>
          </button>
          <div style={{display:"flex",gap:16,alignItems:"center"}}>
            <UserAvatar user={authUser} size={56}/>
            <div>
              <div style={{fontFamily:FF,fontSize:20,fontWeight:700,color:C.white,lineHeight:1.2}}>
                {authUser.displayName||"Sprout Employee"}
                {authUser.country&&<>&nbsp;<CountryBadge country={authUser.country} size="lg"/></>}
              </div>
              <div style={{fontFamily:FF,fontSize:13,color:C.kangkong200,marginTop:3}}>{authUser.email}</div>
              {/* Role badges */}
              <div style={{marginTop:8,display:"flex",gap:5,flexWrap:"wrap"}}>
                {authUser.isAdmin&&(
                  <span title="Tends the Garden — promotes seeds, manages stages, oversees the ecosystem" style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.kangkong900,background:C.kangkong100,borderRadius:DS.radius.full,padding:"2px 10px",cursor:"default"}}>🌿 Admin</span>
                )}
                {claimedSeeds.length>0&&(
                  <span title="Claims seeds and builds AI projects in the Garden" style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mango600,background:C.mango100,borderRadius:DS.radius.full,padding:"2px 10px",cursor:"default"}}>🌾 Farmer</span>
                )}
                {mySeeds.length>0&&(
                  <span title="Submits seed ideas to the wishlist for the team to build" style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom700,background:"rgba(255,255,255,0.85)",borderRadius:DS.radius.full,padding:"2px 10px",cursor:"default"}}>🌱 Planter</span>
                )}
              </div>
              <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:C.kangkong800,background:C.kangkong200,borderRadius:DS.radius.full,padding:"2px 10px"}}>{myProjects.length} plants</span>
                <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,background:"rgba(255,255,255,0.9)",borderRadius:DS.radius.full,padding:"2px 10px"}}>{mySeeds.length} seeds</span>
                {claimedSeeds.length>0&&<span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:C.mango600,background:C.mango100,borderRadius:DS.radius.full,padding:"2px 10px"}}>{claimedSeeds.length} building</span>}
              </div>
            </div>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"20px 28px"}}>
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
              <IcoGarden size={14} color={C.kangkong600}/> Your Plants
            </div>
            {myProjects.length===0
              ? <div style={{fontFamily:FF,fontSize:13,color:C.mushroom400,fontStyle:"italic",padding:"16px",background:C.mushroom50,borderRadius:DS.radius.lg,textAlign:"center"}}>
                  You haven't added any projects yet. Start by clicking "Add to Garden"!
                </div>
              : myProjects.map(p=>{
                  const sc = STAGE_COLORS[p.stage];
                  return (
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",marginBottom:8,borderRadius:DS.radius.lg,background:sc.bg,border:"1px solid "+sc.border}}>
                      <ProjectImage project={p} width={40} height={40} style={{borderRadius:DS.radius.md,overflow:"hidden",flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom900}}>{p.name}</div>
                        <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{p.builtBy} → {p.builtFor}{p.country&&<>&nbsp;<CountryBadge country={p.country}/></>}</div>
                      </div>
                      <StageBadge stage={p.stage}/>
                    </div>
                  );
                })
            }
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
              <WishSeed size={14} color={C.mushroom500}/> Your Seeds
            </div>
            {mySeeds.length===0
              ? <div style={{fontFamily:FF,fontSize:13,color:C.mushroom400,fontStyle:"italic",padding:"16px",background:C.mushroom50,borderRadius:DS.radius.lg,textAlign:"center"}}>
                  No wishes submitted yet. Have an AI idea? Add it to the Wishlist!
                </div>
              : mySeeds.map(w=>(
                  <div key={w.id} style={{padding:"10px 14px",marginBottom:8,borderRadius:DS.radius.lg,background:C.mushroom50,border:"1.5px dashed "+C.mushroom300}}>
                    <div style={{fontFamily:FF,fontSize:13,fontWeight:600,color:C.mushroom800,marginBottom:4}}>{w.title}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                      <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>For {w.builtFor}</span>
                      {w.fulfilledBy
                        ? <span style={{fontFamily:FF,fontSize:11,color:C.kangkong600,fontWeight:600,display:"flex",alignItems:"center",gap:3}}><IcoCheck size={12} color={C.kangkong500}/> Built as {w.fulfilledBy}</span>
                        : w.claimedBy
                        ? <span style={{fontFamily:FF,fontSize:11,color:C.wintermelon500,fontWeight:600}}>🔨 Being built by {w.claimedBy}</span>
                        : <span style={{fontFamily:FF,fontSize:11,color:C.mushroom400}}>{w.upvoters.length} votes</span>
                      }
                    </div>
                  </div>
                ))
            }
          </div>
          <div>
            <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:13}}>🔨</span> Claimed Seeds to Work On
            </div>
            {claimedSeeds.length===0
              ? <div style={{fontFamily:FF,fontSize:13,color:C.mushroom400,fontStyle:"italic",padding:"16px",background:C.mushroom50,borderRadius:DS.radius.lg,textAlign:"center"}}>
                  You haven't claimed any seeds yet. Browse the Wishlist to find ideas to build!
                </div>
              : claimedSeeds.map(w=>{
                  return (
                    <div key={w.id} style={{padding:"12px 14px",marginBottom:10,borderRadius:DS.radius.lg,background:C.wintermelon100,border:"1.5px solid "+C.wintermelon400}}>
                      <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom900,marginBottom:4}}>{w.title}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
                        <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>For {w.builtFor} · Claimed {w.claimedAt}</span>
                        <span style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.wintermelon500,padding:"2px 8px",background:C.white,borderRadius:DS.radius.full,border:"1px solid "+C.wintermelon400}}>🔨 In progress</span>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── About Modal ────────────────────────────────────────────────────────────────

function AboutModal({onClose}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(14,56,14,0.7)",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,maxWidth:520,width:"92%",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:DS.shadow.xl,animation:"slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{background:"linear-gradient(160deg,"+C.kangkong900+" 0%,"+C.kangkong700+" 50%,"+C.kangkong500+" 100%)",padding:"36px 32px 28px",position:"relative",overflow:"hidden"}}>
          <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:DS.radius.md,padding:6,cursor:"pointer"}}>
            <IcoClose size={16} color={C.white}/>
          </button>
          <div style={{opacity:0.06,position:"absolute",right:-40,top:-20,pointerEvents:"none"}}>
            <PlantTree size={280} wilting={false}/>
          </div>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:12,background:C.kangkong800,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 16px rgba(0,0,0,0.3)"}}>
                <IcoGarden size={22} color={C.kangkong200}/>
              </div>
              <div>
                <div style={{fontFamily:FF,fontSize:20,fontWeight:800,color:C.white,lineHeight:1}}>Grove</div>
                <div style={{fontFamily:FF,fontSize:11,color:C.kangkong300,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase"}}>by Sprout</div>
              </div>
            </div>
            <div style={{fontFamily:FF,fontSize:26,fontWeight:800,color:C.white,lineHeight:1.2,marginBottom:12}}>
              Every great idea starts as a seed.
            </div>
            <div style={{fontFamily:FF,fontSize:14,color:C.kangkong200,lineHeight:1.7}}>
              Grove is where Sprout's AI transformation takes root — a living map of every AI project our teams are building, from the first spark of an idea to measurable, company-wide impact.
            </div>
          </div>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"28px 32px"}}>
          {[
            {icon:"🌱", title:"You don't need to be an engineer to start", body:"Anyone at Sprout can plant a seed. If you have a problem that AI could solve, put it in the Wishlist. Your idea could become the next ForecastIQ or CodeReview AI — tools that save hours every week."},
            {icon:"🌿", title:"Learning AI is a team sport", body:"AI isn't just for the Engineering team. Marketing, Finance, HR, Operations — every team has problems that AI can help solve. The best builders are people who deeply understand their own workflows."},
            {icon:"🌸", title:"Small experiments become big wins", body:"Every Tree-stage project you see started as a Sprout. It didn't need to be perfect. It needed to start. The Garden exists so nothing stays hidden — your work gets visibility, feedback, and the chance to grow."},
            {icon:"🌳", title:"Where to begin", body:"Browse the Garden to see what others are building. Vote on seeds in the Wishlist. Or hit 'Add to Garden' and plant your first idea today. Sprout's AI future is built by all of us — one project at a time."},
          ].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:14,marginBottom:22}}>
              <div style={{fontSize:24,flexShrink:0,marginTop:2}}>{s.icon}</div>
              <div>
                <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom900,marginBottom:5}}>{s.title}</div>
                <div style={{fontFamily:FF,fontSize:13,color:C.mushroom600,lineHeight:1.7}}>{s.body}</div>
              </div>
            </div>
          ))}
          <div style={{background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"14px 18px",textAlign:"center",marginTop:4}}>
            <div style={{fontFamily:FF,fontSize:13,color:C.kangkong700,fontWeight:600}}>Ready to grow something?</div>
            <div style={{fontFamily:FF,fontSize:12,color:C.kangkong600,marginTop:4}}>Click "Add to Garden" in the top bar — your idea is welcome here.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auth Gate (Prototype Mode) ─────────────────────────────────────────────────
// Firebase auth is stubbed out for prototype testing.
const ALLOWED_DOMAINS = ["sprout.ph", "sproutsolutions.io"];
const isAllowedEmail  = (email) => ALLOWED_DOMAINS.some(d => email.endsWith("@" + d));


function FirstTimeCountryModal({onSelect}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.6)",backdropFilter:"blur(6px)"}}>
      <div style={{background:C.white,borderRadius:DS.radius.xl,padding:"40px 36px",maxWidth:400,width:"90%",boxShadow:DS.shadow.xl,textAlign:"center",animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>
        <div style={{fontSize:40,marginBottom:16}}>🌱</div>
        <div style={{fontFamily:FF,fontSize:20,fontWeight:700,color:C.mushroom900,marginBottom:8}}>Which team are you on?</div>
        <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500,marginBottom:28,lineHeight:1.6}}>
          We'll use this to tag your projects and ideas in the shared garden.
        </div>
        <div style={{display:"flex",gap:12}}>
          {[{country:"PH",name:"Philippines",color:C.kangkong600,bg:C.kangkong50, border:C.kangkong300},
            {country:"TH",name:"Thailand",   color:C.blueberry500,bg:C.blueberry100,border:C.blueberry400}
          ].map(opt=>(
            <button key={opt.country} onClick={()=>onSelect(opt.country)} style={{
              flex:1,padding:"20px 12px",borderRadius:DS.radius.xl,cursor:"pointer",
              border:"2px solid "+opt.border, background:opt.bg,
              transition:"all 0.15s",
            }}
              onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.shadow.md;}}
              onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
            >
              <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><FlagSVG country={opt.country} w={48} h={32}/></div>
              <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:opt.color}}>{opt.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Help Panel ────────────────────────────────────────────────────────────────
function HelpPanel({ open, onClose, items, filter, setFilter, page, setPage,
  view, setView, submitType, setSubmitType, formTitle, setFormTitle,
  formDesc, setFormDesc, editItem, onOpen, onSubmit, onUpvote,
  onResolve, onDelete, onStartEdit, loading, authUser, helpTab, setHelpTab }) {


  // helpDateLabel is local to avoid conflict with imported daysAgo (which returns a number)
  const helpDateLabel = (ts) => {
    const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    return `${d} days ago`;
  };

  const ITEMS_PER_PAGE = 10;

  const filtered = items.filter(i =>
    filter === "all" ? true :
    filter === "report" ? i.type === "report" : i.type === "ask"
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const submitterName = (email) => {
    if (email === authUser?.email && authUser?.firstName) return authUser.firstName;
    return email.split("@")[0];
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={open ? onClose : onOpen}
        style={{
          position:"fixed", bottom:20, right:20, width:40, height:40,
          borderRadius:"50%", background:C.kangkong700, border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.18)",
          zIndex:50, transition:"transform 0.15s, background 0.15s",
        }}
        onMouseOver={e=>{e.currentTarget.style.background=C.kangkong800;e.currentTarget.style.transform="scale(1.05)";}}
        onMouseOut={e=>{e.currentTarget.style.background=C.kangkong700;e.currentTarget.style.transform="scale(1)";}}
        title="Help"
      >
        {/* Question mark icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="0.5" fill="white" stroke="white" strokeWidth="1.5"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position:"fixed", top:0, right:0, width:320, height:"100vh",
          background:C.white, borderLeft:"1px solid "+C.mushroom200,
          zIndex:55, display:"flex", flexDirection:"column",
          transform:"translateX(0)", animation:"slideInPanel 0.22s cubic-bezier(0.4,0,0.2,1)",
          boxShadow:"-4px 0 20px rgba(0,0,0,0.08)",
        }}>

          {/* Panel header */}
          <div style={{padding:"12px 14px 0", borderBottom:"1px solid "+C.mushroom200, flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontFamily:FF,fontSize:15,fontWeight:600,color:C.mushroom900}}>Help & Guide</span>
              <button onClick={onClose} style={{width:28,height:28,borderRadius:DS.radius.sm,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.mushroom500,fontSize:16,fontWeight:300}}
                onMouseOver={e=>e.currentTarget.style.background=C.mushroom100}
                onMouseOut={e=>e.currentTarget.style.background="none"}
              >✕</button>
            </div>

            {/* Top-level tab nav — only in feed view */}
            {view === "feed" && (
              <div style={{display:"flex",gap:0,marginBottom:8}}>
                {[
                  ["faq",          "FAQ"],
                  ["feedback",     "Feedback"],
                ].map(([val, label]) => (
                  <button key={val}
                    onClick={() => setHelpTab(val)}
                    style={{
                      padding:"6px 11px", fontFamily:FF, fontSize:12, fontWeight:500,
                      border:"none", background:"none", cursor:"pointer",
                      color: helpTab === val ? C.kangkong700 : C.mushroom500,
                      borderBottom: helpTab === val ? "2px solid "+C.kangkong600 : "2px solid transparent",
                      transition:"all 0.15s", whiteSpace:"nowrap",
                    }}
                  >{label}</button>
                ))}
              </div>
            )}

            {/* + Report and + Ask buttons — feedback tab only */}
            {view === "feed" && helpTab === "feedback" && (
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <button onClick={()=>{setSubmitType("report");setFormTitle("");setFormDesc("");setView("submit");}}
                  style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,background:"none",fontFamily:FF,fontSize:12,fontWeight:500,color:C.mushroom700,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseOver={e=>{e.currentTarget.style.background=C.tomato100;e.currentTarget.style.color=C.tomato600;e.currentTarget.style.borderColor="#FFCDD2";}}
                  onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.mushroom700;e.currentTarget.style.borderColor=C.mushroom200;}}
                >+ Report</button>
                <button onClick={()=>{setSubmitType("ask");setFormTitle("");setFormDesc("");setView("submit");}}
                  style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,background:"none",fontFamily:FF,fontSize:12,fontWeight:500,color:C.mushroom700,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseOver={e=>{e.currentTarget.style.background=C.blueberry100;e.currentTarget.style.color=C.blueberry500;e.currentTarget.style.borderColor="#BBDEFB";}}
                  onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.mushroom700;e.currentTarget.style.borderColor=C.mushroom200;}}
                >+ Ask</button>
              </div>
            )}

            {/* Filter tabs — feedback tab only */}
            {view === "feed" && helpTab === "feedback" && (
              <div style={{display:"flex",gap:0,borderBottom:"1px solid "+C.mushroom200}}>
                {[["all","All"],["report","Reports"],["ask","Asks"]].map(([val,label])=>(
                  <button key={val} onClick={()=>{setFilter(val);setPage(1);}}
                    style={{padding:"6px 12px",fontFamily:FF,fontSize:12,fontWeight:500,border:"none",background:"none",cursor:"pointer",
                      color:filter===val?C.kangkong600:C.mushroom500,
                      borderBottom:filter===val?"2px solid "+C.kangkong600:"2px solid transparent",
                      transition:"all 0.15s",
                    }}
                  >{label}</button>
                ))}
              </div>
            )}
            {/* Header bottom border when filter tabs not shown */}
            {view === "feed" && helpTab !== "feedback" && (
              <div style={{borderBottom:"1px solid "+C.mushroom200}}/>
            )}
          </div>

          {/* Panel body */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>

            {/* ── FAQ / Stages guide ── */}
            {view === "feed" && helpTab === "faq" && (
              <div style={{display:"flex",flexDirection:"column",gap:20,paddingBottom:16}}>
                {STAGE_GUIDE.map(stage => (
                  <div key={stage.key} style={{borderLeft:"4px solid "+stage.borderColor,paddingLeft:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:16}}>{stage.emoji}</span>
                      <span style={{fontFamily:FF,fontSize:14,fontWeight:700,color:stage.textColor}}>{stage.label}</span>
                      {stage.gardenBadge && (
                        <span style={{fontFamily:FF,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:DS.radius.full,background:stage.borderColor+"22",color:stage.textColor,border:"1px solid "+stage.borderColor}}>
                          Garden
                        </span>
                      )}
                    </div>
                    <div style={{fontFamily:FF,fontSize:12,color:C.mushroom700,lineHeight:1.65,marginBottom:stage.callouts.length > 0 ? 10 : 0}}>
                      {stage.desc}
                    </div>
                    {stage.callouts.map(callout => (
                      <div key={callout.id} style={{background:callout.bg,border:"1px solid "+callout.border,borderRadius:DS.radius.md,padding:"10px 12px",marginTop:8}}>
                        <div style={{display:"flex",gap:7,alignItems:"flex-start"}}>
                          <span style={{fontSize:13,flexShrink:0,marginTop:1}}>{callout.icon}</span>
                          <div>
                            <span style={{fontFamily:FF,fontSize:12,fontWeight:700,color:callout.textColor}}>
                              {callout.title}
                            </span>
                            <span style={{fontFamily:FF,fontSize:12,color:callout.textColor,lineHeight:1.6}}>
                              {" "}{callout.body}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ── Feedback feed (existing content) ── */}
            {view === "feed" && helpTab === "feedback" && (
              <>
                {pageItems.length === 0 ? (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,gap:8}}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke={C.mushroom300} strokeWidth="1.5"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={C.mushroom300} strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="0.5" fill={C.mushroom300} stroke={C.mushroom300} strokeWidth="1"/>
                    </svg>
                    <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>Nothing here yet.</div>
                    <div style={{fontFamily:FF,fontSize:12,color:C.mushroom400,textAlign:"center"}}>Be the first to submit a report or ask a question.</div>
                  </div>
                ) : (
                  pageItems.map(item => {
                    const isSettled = item.status === "resolved" || item.status === "answered";
                    const isOwn     = item.submitted_by === authUser?.email;
                    const hasVoted  = item.upvoters?.includes(authUser?.email);
                    const canEdit   = isOwn && !isSettled;
                    return (
                      <div key={item.id} style={{padding:"10px 0",borderBottom:"1px solid "+C.mushroom100,opacity:isSettled?0.5:1}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                          {/* Type dot */}
                          <div style={{width:6,height:6,borderRadius:"50%",marginTop:5,flexShrink:0,background:item.type==="report"?C.tomato600:C.blueberry500}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:FF,fontSize:13,fontWeight:500,color:C.mushroom900,lineHeight:1.4,marginBottom:4}}>{item.title}</div>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                              <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{submitterName(item.submitted_by)} · {helpDateLabel(item.created_at)}</span>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                {/* Upvote button */}
                                <button
                                  onClick={()=>!isOwn&&onUpvote(item)}
                                  disabled={isOwn}
                                  style={{display:"flex",alignItems:"center",gap:3,padding:"2px 6px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,background:hasVoted?C.kangkong50:"none",color:hasVoted?C.kangkong700:C.mushroom500,fontFamily:FF,fontSize:11,cursor:isOwn?"default":"pointer",transition:"all 0.15s",}}
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1L9 9H1L5 1Z" fill={hasVoted?C.kangkong700:C.mushroom400}/></svg>
                                  {item.upvoters?.length || 0}
                                </button>
                                {/* Status pill */}
                                <span style={{fontFamily:FF,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:DS.radius.full,background:isSettled?C.kangkong100:C.mango100,color:isSettled?C.kangkong700:C.mango700,}}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            {/* Admin + Edit actions */}
                            <div style={{display:"flex",gap:6,marginTop:6}}>
                              {canEdit && (
                                <button onClick={()=>onStartEdit(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.mushroom500,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Edit</button>
                              )}
                              {authUser?.isAdmin && !isSettled && (
                                <button onClick={()=>onResolve(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.kangkong600,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>
                                  {item.type==="report"?"Mark resolved":"Mark answered"}
                                </button>
                              )}
                              {authUser?.isAdmin && (
                                <button onClick={()=>onDelete(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.tomato600,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {(view === "submit" || view === "edit") && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Back button */}
                <button onClick={()=>setView("feed")}
                  style={{display:"flex",alignItems:"center",gap:4,fontFamily:FF,fontSize:12,color:C.mushroom500,background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"flex-start"}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke={C.mushroom500} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Back to Help
                </button>
                <div style={{fontFamily:FF,fontSize:14,fontWeight:600,color:C.mushroom900}}>
                  {view==="edit" ? "Edit your submission" : submitType==="report" ? "Submit a report" : "Ask a question"}
                </div>
                {/* Type toggle — only on new submit */}
                {view === "submit" && (
                  <div style={{display:"flex",gap:6}}>
                    {[["report","Report"],["ask","Ask"]].map(([val,label])=>(
                      <button key={val} onClick={()=>setSubmitType(val)}
                        style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,fontFamily:FF,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s",
                          border: submitType===val
                            ? (val==="report"?"1px solid #FFCDD2":"1px solid #BBDEFB")
                            : "1px solid "+C.mushroom200,
                          background: submitType===val
                            ? (val==="report"?C.tomato100:C.blueberry100)
                            : "none",
                          color: submitType===val
                            ? (val==="report"?C.tomato600:C.blueberry500)
                            : C.mushroom500,
                        }}
                      >{label}</button>
                    ))}
                  </div>
                )}
                {/* Submitter strip */}
                <div style={{display:"flex",alignItems:"center",gap:8,background:C.mushroom50,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,padding:"6px 10px"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:C.kangkong200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FF,fontSize:10,fontWeight:700,color:C.kangkong700,flexShrink:0}}>
                    {(authUser?.firstName||authUser?.displayName||"?")[0].toUpperCase()}
                  </div>
                  <span style={{fontFamily:FF,fontSize:11,color:C.mushroom600}}>Submitting as {authUser?.firstName||authUser?.displayName||authUser?.email}</span>
                </div>
                {/* Title field */}
                <input
                  value={formTitle}
                  onChange={e=>setFormTitle(e.target.value)}
                  placeholder="Brief description..."
                  style={{width:"100%",padding:"8px 10px",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,fontFamily:FF,fontSize:13,color:C.mushroom900,outline:"none"}}
                />
                {/* Description field */}
                <textarea
                  value={formDesc}
                  onChange={e=>setFormDesc(e.target.value)}
                  placeholder="Steps to reproduce, or more context... (optional)"
                  rows={4}
                  style={{width:"100%",padding:"8px 10px",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,fontFamily:FF,fontSize:13,color:C.mushroom900,outline:"none",resize:"vertical"}}
                />
                {/* Submit button */}
                <button
                  onClick={onSubmit}
                  disabled={!formTitle.trim()||loading}
                  style={{width:"100%",padding:"10px 0",borderRadius:DS.radius.md,background:formTitle.trim()?C.kangkong700:"#ccc",border:"none",color:C.white,fontFamily:FF,fontSize:13,fontWeight:600,cursor:formTitle.trim()?"pointer":"default",transition:"background 0.15s"}}
                  onMouseOver={e=>{if(formTitle.trim())e.currentTarget.style.background=C.kangkong800;}}
                  onMouseOut={e=>{if(formTitle.trim())e.currentTarget.style.background=C.kangkong700;}}
                >
                  {loading ? "Submitting…" : view==="edit" ? "Save changes" : "Submit"}
                </button>
              </div>
            )}
          </div>

          {/* Pagination footer — only in feed view, only when multiple pages */}
          {view === "feed" && helpTab === "feedback" && totalPages > 1 && (
            <div style={{borderTop:"1px solid "+C.mushroom200,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{padding:"4px 10px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,fontFamily:FF,fontSize:11,background:"none",cursor:page===1?"default":"pointer",color:page===1?C.mushroom300:C.mushroom600}}>Prev</button>
              <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{page} of {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{padding:"4px 10px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,fontFamily:FF,fontSize:11,background:"none",cursor:page===totalPages?"default":"pointer",color:page===totalPages?C.mushroom300:C.mushroom600}}>Next</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function SproutAIGarden() {
  const [projects, setProjects] = useState([]);
  const [wishes, setWishes]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [view, setView]         = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddWish, setShowAddWish] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [gardenNav, setGardenNav] = useState({key:0, viewMode:"directory", stageFilter:"All"});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(null); // null | "profile" | "about"
  const profileDropRef = useRef(null);

  // ── Auth state ────────────────────────────────────────────────────────────
  const [authUser, setAuthUser]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError]   = useState("");

  // Help panel state
  const [helpOpen,        setHelpOpen]        = useState(false);
  const [helpTab,         setHelpTab]         = useState("faq");
  const [helpItems,       setHelpItems]       = useState([]);
  const [helpFilter,      setHelpFilter]      = useState("all"); // "all" | "report" | "ask"
  const [helpPage,        setHelpPage]        = useState(1);
  const [helpView,        setHelpView]        = useState("feed"); // "feed" | "submit" | "edit"
  const [helpSubmitType,  setHelpSubmitType]  = useState("report"); // pre-selected type in submit form
  const [helpEditItem,    setHelpEditItem]    = useState(null); // item being edited
  const [helpFormTitle,   setHelpFormTitle]   = useState("");
  const [helpFormDesc,    setHelpFormDesc]    = useState("");
  const [helpLoading,     setHelpLoading]     = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAuthLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        if (!session) {
          setAuthUser(null);
          setAuthLoading(false);
          setAuthError("");
          return;
        }

        const email   = session.user?.email;
        if (!email) { setAuthLoading(false); return; }

        const domain  = email.split("@")[1];
        const country = COUNTRY_MAP[domain];

        if (!country) {
          supabase.auth.signOut();
          setAuthError("Only @sprout.ph and @sproutsolutions.io accounts can access Grove.");
          setAuthLoading(false);
          return;
        }

        const meta        = session.user.user_metadata || {};
        const firstName   = meta.full_name?.split(" ")[0] || meta.name?.split(" ")[0] || null;
        const displayName = email.split("@")[0];

        // Immediately unblock the UI — no DB await before this line
        setAuthUser({ email, firstName, displayName, country, isAdmin: false, isApprover: false, hasDismissedWelcome: false, profileLoaded: false });
        setAuthLoading(false);

        // Enrich with real DB profile in the background (non-blocking)
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()
          .then(async ({ data: existing }) => {
            if (existing) {
              if (!existing.first_name && firstName) {
                await supabase.from("profiles").update({ first_name: firstName }).eq("id", session.user.id);
              }
              setAuthUser({
                email: existing.email,
                firstName: existing.first_name || firstName || null,
                displayName: existing.display_name || displayName,
                country: existing.country,
                isAdmin: existing.is_admin || false,
                isApprover: existing.is_approver || false,
                hasDismissedWelcome: existing.has_dismissed_welcome || false,
                profileLoaded: true,
              });
            } else {
              await supabase.from("profiles").insert({
                id: session.user.id,
                email,
                display_name: displayName,
                first_name: firstName,
                country,
                is_admin: false,
                is_approver: false,
              });
              setAuthUser(prev => ({...prev, profileLoaded: true}));
            }
          })
          .catch(e => {
            console.warn("Profile load/create error:", e);
            setAuthUser(prev => ({...prev, profileLoaded: true}));
          });
      } catch (e) {
        console.error("Auth state change error:", e);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    // If error (e.g. provider not enabled), surface it and unblock
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
    // On success the browser redirects — authLoading stays true until
    // onAuthStateChange fires after the OAuth callback
  };

  const handleDismissWelcomePermanently = async () => {
    setWelcomeSeen(true);
    setAuthUser(prev => ({...prev, hasDismissedWelcome: true}));
    if (authUser?.email) {
      await supabase.from("profiles").update({ has_dismissed_welcome: true }).eq("email", authUser.email);
    }
  };

  // ── Load data from Supabase when auth is ready ───────────────────────────
  useEffect(() => {
    if (!authUser) return;
    setDataLoading(true);
    Promise.all([loadProjects(), loadWishes()]).then(([projs, wishs]) => {
      setProjects(projs);
      setWishes(wishs);
      setDataLoading(false);
    });
  }, [authUser?.email]);

  // ── Load notifications ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!authUser) return;
    loadNotifications().then(data => setNotifications(data));
  }, [authUser?.email]);

  // ── Help panel data loading & mutations ──────────────────────────────────────
  const loadHelpItems = async () => {
    const { data, error } = await supabase
      .from("help_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setHelpItems(data);
  };

  const handleHelpOpen = async () => {
    setHelpOpen(true);
    setHelpPage(1);
    setHelpFilter("all");
    setHelpView("feed");
    setHelpTab("faq");
    await loadHelpItems();
  };

  const handleHelpSubmit = async () => {
    if (!helpFormTitle.trim() || !authUser) return;
    setHelpLoading(true);
    const isEdit = helpView === "edit" && helpEditItem;
    if (isEdit) {
      const { error } = await supabase
        .from("help_items")
        .update({ title: helpFormTitle.trim(), description: helpFormDesc.trim() || null })
        .eq("id", helpEditItem.id);
      if (!error) await loadHelpItems();
    } else {
      const newItem = {
        type: helpSubmitType,
        title: helpFormTitle.trim(),
        description: helpFormDesc.trim() || null,
        submitted_by: authUser.email,
        status: helpSubmitType === "report" ? "open" : "unanswered",
      };
      const { error } = await supabase.from("help_items").insert(newItem);
      if (!error) await loadHelpItems();
    }
    setHelpFormTitle("");
    setHelpFormDesc("");
    setHelpEditItem(null);
    setHelpView("feed");
    setHelpFilter("all");
    setHelpPage(1);
    setHelpLoading(false);
  };

  const handleHelpUpvote = async (item) => {
    if (!authUser || item.submitted_by === authUser.email) return;
    const alreadyVoted = item.upvoters?.includes(authUser.email);
    const newUpvoters = alreadyVoted
      ? item.upvoters.filter(e => e !== authUser.email)
      : [...(item.upvoters || []), authUser.email];
    const { error } = await supabase
      .from("help_items")
      .update({ upvoters: newUpvoters })
      .eq("id", item.id);
    if (!error) await loadHelpItems();
  };

  const handleHelpResolve = async (item) => {
    if (!authUser?.isAdmin) return;
    const newStatus = item.type === "report" ? "resolved" : "answered";
    const { error } = await supabase
      .from("help_items")
      .update({ status: newStatus, resolved_by: authUser.email, resolved_at: new Date().toISOString() })
      .eq("id", item.id);
    if (!error) await loadHelpItems();
  };

  const handleHelpDelete = async (item) => {
    if (!authUser?.isAdmin) return;
    const { error } = await supabase.from("help_items").delete().eq("id", item.id);
    if (!error) setHelpItems(prev => prev.filter(i => i.id !== item.id));
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = e => { if (profileDropRef.current && !profileDropRef.current.contains(e.target)) setProfileOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(()=>{
    if (selected) setSelected(projects.find(p=>p.id===selected.id)||null);
  }, [projects]);

  // ── Project mutations ─────────────────────────────────────────────────────

  const addNote = (id, text) => {
    if (!authUser) return;
    if (!text.trim()) return;
    const updated = projects.find(p => p.id === id);
    if (!updated) return;
    const newNotes = [...(updated.notes || []), text.trim()];
    setProjects(prev => prev.map(p => p.id === id ? {...p, notes: newNotes} : p));
    supabase.from("projects").update({ notes: newNotes }).eq("id", id)
      .then(({ error }) => { if (error) console.error("addNote:", error); });
  };

  const addProject = async (proj) => {
    const withCountry = {...proj, country: proj.country || authUser?.country || "PH", builderEmail: proj.builderEmail || authUser?.email || ''};
    const row = {...fromProject(withCountry), country: withCountry.country}; // country excluded from fromProject (immutability), re-added for INSERT only
    const { data, error } = await supabase.from("projects").insert(row).select().single();
    if (error) { console.error("addProject:", error); return; }
    const saved = toProject(data);
    setProjects(prev => [...prev, saved]);
  };

  const handleUpdateProject = async (updated) => {
    if (!authUser || (authUser.email !== updated.builderEmail && !authUser.isAdmin)) return;
    const row = fromProject(updated);
    delete row.country; // country is immutable — never send in UPDATE
    const { error } = await supabase.from("projects").update(row).eq("id", updated.id);
    if (error) { console.error("handleUpdateProject:", error); return; }
    setProjects(prev => prev.map(p => p.id === updated.id ? {...p, ...updated} : p));
    setEditingProject(null);
  };

  const handleUpdateWish = async (updated) => {
    const { error } = await supabase.from("wishes").update({
      title: updated.title, why: updated.why, built_for: updated.builtFor,
    }).eq("id", updated.id);
    if (error) { console.error("handleUpdateWish:", error); return; }
    setWishes(prev => prev.map(w => w.id === updated.id ? {...w, ...updated} : w));
  };

  const handleMoveStage = (project, dirOrStage) => {
    // Permission: must be builder or Admin
    if (!authUser || (authUser.email !== project.builderEmail && !authUser.isAdmin)) return;

    let next;
    if (typeof dirOrStage === "string") {
      next = dirOrStage;
    } else {
      const cur = STAGE_ORDER[project.stage];
      next = STAGES[cur + dirOrStage];
    }
    if (!next || next === project.stage) return;

    // Nursery entry is form-only — never via drag or direct move
    if (next === 'nursery') return;

    // Nursery exit is ExCom-only (handled by approveProject/needsRework handlers)
    if (project.stage === 'nursery' && !authUser.isAdmin) return;

    // Non-Admins: adjacent stages only
    if (!authUser.isAdmin) {
      const curOrder = STAGE_ORDER[project.stage];
      const nextOrder = STAGE_ORDER[next];
      if (Math.abs(nextOrder - curOrder) > 1) return;
    }

    const newMilestones = [...project.milestones, STAGE_LABELS[next] + " — " + new Date().toLocaleDateString("en-PH", {month:"short", year:"numeric"})];
    setProjects(prev => prev.map(p => p.id === project.id
      ? {...p, stage: next, lastUpdated: 0, milestones: newMilestones}
      : p
    ));
    supabase.from("projects").update({ stage: next, milestones: newMilestones, last_updated: new Date().toISOString() }).eq("id", project.id)
      .then(({ error }) => { if (error) console.error("handleMoveStage:", error); });
  };

  // ── Nursery flow mutations ─────────────────────────────────────────────────

  const sendNotification = async (type, payload) => {
    try {
      await supabase.functions.invoke("send-notification", { body: { type, payload } });
    } catch (e) {
      console.warn("sendNotification failed:", e);
      // Non-blocking — notification failure should not fail the main action
    }
  };

  const handleMarkNotificationsRead = (projectId) => {
    const toMark = notifications.filter(n => !n.read && n.payload?.project_id === projectId);
    if (toMark.length === 0) return;
    const ids = toMark.map(n => n.id);
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? {...n, read:true} : n));
    supabase.from("notifications").update({ read:true }).in("id", ids)
      .then(({ error }) => { if (error) console.error("markNotificationsRead:", error); });
  };

  const submitToNursery = async (projectId, prototypeLink, deckLink) => {
    const project = projects.find(p => p.id === projectId);
    if (!authUser || !project || (authUser.email !== project.builderEmail && !authUser.isAdmin)) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("projects").update({
      stage: "nursery",
      review_status: "pending",
      prototype_link: prototypeLink,
      deck_link: deckLink,
      submitted_at: now,
      last_updated: now,
    }).eq("id", projectId);
    if (error) { console.error("submitToNursery:", error); return; }
    setProjects(prev => prev.map(p => p.id === projectId
      ? {...p, stage:"nursery", reviewStatus:"pending", prototypeLink, deckLink, submittedAt:now, lastUpdated:0}
      : p
    ));
    setSelected(null);
    // Fire notification (non-blocking)
    sendNotification("nursery-submitted", {
      project_id: projectId,
      project_name: projects.find(p=>p.id===projectId)?.name || "",
      builder_email: authUser.email,
      submitted_at: now,
    });
  };

  const withdrawFromNursery = async (projectId) => {
    const { error } = await supabase.rpc("withdraw_from_nursery", { p_id: projectId });
    if (error) { console.error("withdrawFromNursery:", error); return; }
    setProjects(prev => prev.map(p => p.id === projectId
      ? {...p, stage:"seedling", reviewStatus:null}
      : p
    ));
    setSelected(null);
  };

  const approveProject = async (projectId) => {
    if (!authUser?.isApprover && !authUser?.isAdmin) return;
    const now = new Date().toISOString();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newMilestones = [...(project.milestones || []), "Approved by Approver — " + new Date().toLocaleDateString("en-PH",{month:"short",year:"numeric"})];
    const { error } = await supabase.from("projects").update({
      stage: "sprout",
      review_status: "approved",
      reviewed_by: authUser.email,
      reviewed_at: now,
      milestones: newMilestones,
      last_updated: now,
    }).eq("id", projectId);
    if (error) { console.error("approveProject:", error); return; }
    setProjects(prev => prev.map(p => p.id === projectId
      ? {...p, stage:"sprout", reviewStatus:"approved", reviewedBy:authUser.email, reviewedAt:now, milestones:newMilestones, lastUpdated:0}
      : p
    ));
    setSelected(null);
    sendNotification("plant-approved", {
      project_id: projectId,
      project_name: project.name,
      builder_email: project.builderEmail,
    });
  };

  const needsRework = async (projectId, comment) => {
    if (!authUser?.isApprover && !authUser?.isAdmin) return;
    if (!comment?.trim()) return;
    const now = new Date().toISOString();
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const { error } = await supabase.from("projects").update({
      stage: "seedling",
      review_status: "needs_rework",
      review_comment: comment.trim(),
      reviewed_by: authUser.email,
      reviewed_at: now,
      last_updated: now,
    }).eq("id", projectId);
    if (error) { console.error("needsRework:", error); return; }
    setProjects(prev => prev.map(p => p.id === projectId
      ? {...p, stage:"seedling", reviewStatus:"needs_rework", reviewComment:comment.trim(), reviewedBy:authUser.email, reviewedAt:now, lastUpdated:0}
      : p
    ));
    setSelected(null);
    sendNotification("plant-needs-rework", {
      project_id: projectId,
      project_name: project.name,
      builder_email: project.builderEmail,
      review_comment: comment.trim(),
    });
  };

  // ── Wish mutations ────────────────────────────────────────────────────────

  const handleAddWish = async (wish) => {
    const row = fromWish(wish);
    const { data, error } = await supabase.from("wishes").insert(row).select().single();
    if (error) { console.error("handleAddWish:", error); return; }
    setWishes(prev => [toWish(data), ...prev]);
  };

  const handleUpvote = (wishId) => {
    const currentUser = authUser?.displayName || authUser?.email;
    setWishes(prev => prev.map(w => {
      if (w.id !== wishId) return w;
      const already = w.upvoters.includes(currentUser);
      const newUpvoters = already ? w.upvoters.filter(u => u !== currentUser) : [...w.upvoters, currentUser];
      supabase.from("wishes").update({ upvoters: newUpvoters }).eq("id", wishId)
        .then(({ error }) => { if (error) console.error("handleUpvote:", error); });
      return {...w, upvoters: newUpvoters};
    }));
  };

  const handleClaimWish = async (wishId) => {
    const wish = wishes.find(w => w.id === wishId);
    if (!wish) return;
    const claimedAt = new Date().toLocaleDateString("en-PH", {month:"short", day:"numeric", year:"numeric"});

    // Update the wish
    const { error: wishError } = await supabase.from("wishes").update({
      claimed_by: authUser.displayName,
      claimed_by_email: authUser.email,
      claimed_at: claimedAt,
    }).eq("id", wishId);
    if (wishError) { console.error("handleClaimWish wish:", wishError); return; }

    // Create a new Plant at seedling stage
    const newPlant = {
      country: authUser.country,
      name: wish.title,
      builtBy: authUser.displayName,
      builtFor: wish.builtFor,
      stage: "seedling",
      builder: authUser.displayName,
      builderEmail: authUser.email,
      notes: [],
      milestones: ["Seed claimed — " + claimedAt],
      description: wish.why || "",
      impact: "TBD", impactNum: "TBD",
      toolUsed: [],
      zx: 40, zy: 50,
    };
    const row = {...fromProject(newPlant), country: newPlant.country}; // country excluded from fromProject (immutability), re-added for INSERT only
    const { data: plantData, error: plantError } = await supabase
      .from("projects").insert(row).select().single();
    if (plantError) { console.error("handleClaimWish plant:", plantError); return; }

    const savedPlant = toProject(plantData);

    // Link the wish to the plant
    await supabase.from("wishes").update({
      fulfilled_by: savedPlant.id,
    }).eq("id", wishId);

    setWishes(prev => prev.map(w => w.id === wishId
      ? {...w, claimedBy:authUser.displayName, claimedByEmail:authUser.email, claimedAt, fulfilledBy:savedPlant.id}
      : w
    ));
    setProjects(prev => [...prev, savedPlant]);
  };

  const handleUnclaimSeed = async (wishId) => {
    const wish = wishes.find(w => w.id === wishId);
    if (!wish || !wish.fulfilledBy) return;
    // Only builder or Admin can un-claim
    if (authUser.email !== wish.claimedByEmail && !authUser.isAdmin) return;
    // Cannot un-claim if the Plant is in Nursery
    const plant = projects.find(p => p.id === wish.fulfilledBy);
    if (plant?.stage === "nursery") return;

    // Step 1: Delete the Plant (RLS policy: builder-delete-own-seedling)
    const { error: deleteError } = await supabase
      .from("projects").delete().eq("id", wish.fulfilledBy);
    if (deleteError) { console.error("handleUnclaimSeed delete:", deleteError); return; }
    setProjects(prev => prev.filter(p => p.id !== wish.fulfilledBy));

    // Step 2: Clear the Wish claim fields
    const { error: wishError } = await supabase.from("wishes").update({
      claimed_by: null,
      claimed_by_email: null,
      claimed_at: null,
      fulfilled_by: null,
    }).eq("id", wishId);
    if (wishError) {
      console.error("handleUnclaimSeed wish clear:", wishError);
      alert("Plant removed, but there was an error releasing the Seed. An Admin can fix this.");
      return;
    }
    setWishes(prev => prev.map(w => w.id === wishId
      ? {...w, claimedBy:null, claimedByEmail:null, claimedAt:null, fulfilledBy:null}
      : w
    ));

    // Notify original Seed submitter (in-app only)
    if (wish.wisherEmail !== authUser.email) {
      sendNotification("seed-unclaimed", {
        wish_id: wishId,
        wish_title: wish.title,
        wisher_email: wish.wisherEmail,
      });
    }
  };

  const handleSelectProject = p => { setSelected(p); if(view==="dashboard") setView("garden"); };

  // Auth gate — after all hooks
  if (authLoading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,"+C.kangkong800+" 0%,"+C.kangkong400+" 100%)"}}>
        <div style={{fontFamily:FF,color:C.kangkong200,fontSize:14,fontWeight:600}}>Loading…</div>
      </div>
    );
  }
  if (!authUser) {
    return (
      <>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,"+C.kangkong800+" 0%,"+C.kangkong400+" 100%)"}}>
          <div style={{background:C.white,borderRadius:DS.radius.xl,padding:"40px 32px",width:340,boxShadow:DS.shadow.xl,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            {/* Grove mark */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,background:C.kangkong600,borderRadius:DS.radius.md,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌿</div>
              <span style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,letterSpacing:"-0.02em"}}>Grove</span>
            </div>
            <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500,textAlign:"center"}}>Sprout's AI project tracker</div>
            {/* Error message */}
            {authError && (
              <div style={{width:"100%",background:C.tomato100,border:"1px solid #FFCDD2",borderRadius:DS.radius.sm,padding:"8px 12px",fontFamily:FF,fontSize:12,color:C.tomato600,textAlign:"center"}}>
                {authError}
              </div>
            )}
            {/* Google sign-in button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:C.white,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.md,padding:"10px 20px",fontFamily:FF,fontSize:13,fontWeight:500,color:C.mushroom900,cursor:"pointer",boxShadow:DS.shadow.sm,opacity:authLoading?0.6:1}}
            >
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {authLoading ? "Signing in…" : "Sign in with Google"}
            </button>
            <div style={{fontFamily:FF,fontSize:11,color:C.mushroom400,textAlign:"center"}}>
              @sprout.ph and @sproutsolutions.io accounts only
            </div>
          </div>
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto+Mono&display=swap');
          @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
          * { box-sizing:border-box; }
        `}</style>
      </>
    );
  }

  if (dataLoading) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.mushroom100}}>
        <div style={{fontFamily:FF,color:C.kangkong600,fontSize:14,fontWeight:600}}>Loading garden…</div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const NAV_TABS = [
    {id:"dashboard", label:"Overview",  Icon:IcoOverview},
    {id:"garden",    label:"Garden",    Icon:IcoGarden},
    {id:"wishlist",  label:"Seeds",     Icon:IcoWishlist},
  ];

  return (
    <div style={{fontFamily:FF,background:C.mushroom100,minHeight:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── Top Navbar ── */}
      <div style={{padding:"0 24px",zIndex:30,position:"relative",background:C.white,borderBottom:"1px solid "+C.mushroom200,display:"flex",alignItems:"center",justifyContent:"space-between",height:56,flexShrink:0,boxShadow:DS.shadow.sm}}>

        <button onClick={()=>{setView("dashboard");setSelected(null);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:8}}>
          <GroveLogo/>
          <div>
            <div style={{fontFamily:FF,fontWeight:700,fontSize:16,color:C.mushroom900,lineHeight:1.1}}>Grove</div>
            <div style={{fontFamily:FF,fontSize:10,color:C.kangkong600,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>by Sprout</div>
          </div>
        </button>

        {/* Nav tabs */}
        <div style={{display:"flex",gap:2,background:C.mushroom100,borderRadius:DS.radius.lg,padding:3}}>
          {NAV_TABS.map(t => {
            const NavIcon = t.Icon;
            const active = view===t.id;
            return (
              <button key={t.id} onClick={()=>{setView(t.id);setSelected(null);}} style={{
                padding:"6px 18px",border:"none",cursor:"pointer",
                fontFamily:FF,fontSize:13,fontWeight:600,
                borderRadius:DS.radius.md,transition:"all 0.2s",
                background:active?C.white:"transparent",
                color:active?C.kangkong600:C.mushroom500,
                boxShadow:active?DS.shadow.sm:"none",
                display:"flex",alignItems:"center",gap:6,
              }}>
                <NavIcon size={16} color={active?C.kangkong600:C.mushroom500}/>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Notifications badge */}
        {unreadCount > 0 && (
          <div style={{
            position:"relative",marginLeft:-8,
            width:18,height:18,borderRadius:"50%",background:C.tomato500,
            border:"2px solid "+C.white,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:9,fontWeight:700,color:C.white,fontFamily:FF,flexShrink:0,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}

        {/* Right side: add + user */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setShowForm(true)} style={{
            background:C.kangkong500,color:C.white,border:"none",borderRadius:DS.radius.lg,
            padding:"8px 16px",cursor:"pointer",fontFamily:FF,fontSize:12,fontWeight:700,
            display:"flex",alignItems:"center",gap:6,
            boxShadow:"0 3px 10px "+C.kangkong500+"40",transition:"all 0.15s",
          }}
            onMouseOver={e=>e.currentTarget.style.background=C.kangkong600}
            onMouseOut={e=>e.currentTarget.style.background=C.kangkong500}
          >
            <IcoAdd size={15} color={C.white}/> Add to Garden
          </button>

          {/* User profile dropdown */}
          <div style={{position:"relative"}} ref={profileDropRef}>
            <button onClick={()=>setProfileOpen(o=>!o)} style={{
              display:"flex",alignItems:"center",gap:7,padding:"3px 10px 3px 3px",
              borderRadius:DS.radius.full,background:profileOpen?C.mushroom100:C.mushroom50,
              border:"1px solid "+(profileOpen?C.kangkong400:C.mushroom200),
              cursor:"pointer",transition:"all 0.15s",
            }}>
              <UserAvatar user={authUser} size={26}/>
              {authUser.country&&<CountryBadge country={authUser.country}/>}
              <span style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom700,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{authUser.displayName||authUser.email.split("@")[0]}</span>
              {authUser.isAdmin&&<span style={{fontFamily:FF,fontSize:9,fontWeight:800,background:C.mango100,color:C.mango600,borderRadius:DS.radius.full,padding:"1px 6px",letterSpacing:0.5,textTransform:"uppercase",flexShrink:0}}>Admin</span>}
              {authUser.isApprover&&<span style={{fontFamily:FF,fontSize:9,fontWeight:800,background:C.wintermelon100,color:C.wintermelon500,borderRadius:DS.radius.full,padding:"1px 6px",letterSpacing:0.5,textTransform:"uppercase",flexShrink:0}}>Approver</span>}
              <svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{flexShrink:0,transition:"transform 0.2s",transform:profileOpen?"rotate(180deg)":"rotate(0deg)"}}>
                <path d="M3 4.5 L6 7.5 L9 4.5" stroke={C.mushroom500} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileOpen&&(
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:C.white,borderRadius:DS.radius.xl,border:"1px solid "+C.mushroom200,boxShadow:DS.shadow.lg,minWidth:180,overflow:"hidden",animation:"slideUp 0.15s ease",zIndex:100}}>
                <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.mushroom100,background:C.mushroom50}}>
                  <div style={{fontFamily:FF,fontSize:12,fontWeight:700,color:C.mushroom900,display:"flex",alignItems:"center",gap:6}}>
                    {authUser.displayName}
                    {authUser.country&&<CountryBadge country={authUser.country}/>}
                  </div>
                  <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500,marginTop:1}}>{authUser.email}</div>
                </div>
                {[
                  {label:"My Profile", icon:"👤", action:()=>{setProfileModal("profile");setProfileOpen(false);}},
                  {label:"About Grove", icon:"🌿", action:()=>{setProfileModal("about");setProfileOpen(false);}},
                ].map(item=>(
                  <button key={item.label} onClick={item.action} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:FF,fontSize:13,color:C.mushroom700,textAlign:"left",transition:"background 0.1s"}}
                    onMouseOver={e=>e.currentTarget.style.background=C.mushroom50}
                    onMouseOut={e=>e.currentTarget.style.background="none"}
                  >
                    <span style={{fontSize:15}}>{item.icon}</span>{item.label}
                  </button>
                ))}
                <div style={{borderTop:"1px solid "+C.mushroom100}}>
                  <button onClick={()=>{handleLogout();setProfileOpen(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"none",border:"none",cursor:"pointer",fontFamily:FF,fontSize:13,color:C.tomato500,textAlign:"left",transition:"background 0.1s"}}
                    onMouseOver={e=>e.currentTarget.style.background=C.tomato100}
                    onMouseOut={e=>e.currentTarget.style.background="none"}
                  >
                    <span style={{fontSize:15}}>🚪</span>Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content + Detail Panel ── */}
      <div style={{display:"flex",flex:1,minHeight:0,overflow:"hidden"}}>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {view==="dashboard" && <OverviewDashboard projects={projects} wishes={wishes} authUser={authUser} onSelectProject={handleSelectProject} onNavigateGarden={(vm,sf)=>{setGardenNav(prev=>({key:prev.key+1,viewMode:vm,stageFilter:sf}));setView("garden");}} onNavigateWishlist={()=>setView("wishlist")}/>}
          {view==="garden"    && <GardenHub key={gardenNav.key} initialViewMode={gardenNav.viewMode} initialStageFilter={gardenNav.stageFilter} projects={projects} wishes={wishes} selected={selected} setSelected={setSelected} authUser={authUser} onMoveStage={handleMoveStage} onWishClaim={handleClaimWish} onUnclaimSeed={handleUnclaimSeed} onUpdateWish={handleUpdateWish}/>}
          {view==="wishlist"  && <WishlistView wishes={wishes} projects={projects} authUser={authUser} onUpvote={handleUpvote} onAddWish={handleAddWish} onWishClaim={handleClaimWish} onUnclaimSeed={handleUnclaimSeed} onUpdateWish={handleUpdateWish} showAddWish={showAddWish} setShowAddWish={setShowAddWish}/>}
        </div>

        {selected && (
          <DetailPanel
            project={selected} allProjects={projects}
            onClose={()=>setSelected(null)} onNote={addNote} setSelected={setSelected}
            authUser={authUser} onEdit={p=>{setEditingProject(p);setSelected(null);}}
            onSubmitToNursery={submitToNursery}
            onWithdrawFromNursery={withdrawFromNursery}
            onApproveProject={approveProject}
            onNeedsRework={needsRework}
            onMarkNotificationsRead={handleMarkNotificationsRead}
          />
        )}
      </div>

      {showForm && (
        <AddProjectModal
          onClose={()=>setShowForm(false)}
          onAdd={addProject} projects={projects}
          authUser={authUser}
        />
      )}
      {editingProject && (
        <AddProjectModal
          onClose={()=>setEditingProject(null)}
          onSave={handleUpdateProject} projects={projects}
          existing={editingProject} authUser={authUser}
        />
      )}

      {profileModal==="profile"&&<ProfileModal authUser={authUser} projects={projects} wishes={wishes} onClose={()=>setProfileModal(null)}/>}
      {profileModal==="about"&&<AboutModal onClose={()=>setProfileModal(null)}/>}

      {authUser && authUser.profileLoaded && !authUser.hasDismissedWelcome && !welcomeSeen && !dataLoading && (
        <WelcomeModal
          onExplore={() => setWelcomeSeen(true)}
          onDismissPermanently={handleDismissWelcomePermanently}
          isApprover={authUser.isApprover}
          country={authUser.country}
        />
      )}
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpen={handleHelpOpen}
        items={helpItems}
        filter={helpFilter}
        setFilter={setHelpFilter}
        page={helpPage}
        setPage={setHelpPage}
        view={helpView}
        setView={setHelpView}
        submitType={helpSubmitType}
        setSubmitType={setHelpSubmitType}
        formTitle={helpFormTitle}
        setFormTitle={setHelpFormTitle}
        formDesc={helpFormDesc}
        setFormDesc={setHelpFormDesc}
        editItem={helpEditItem}
        onSubmit={handleHelpSubmit}
        onUpvote={handleHelpUpvote}
        onResolve={handleHelpResolve}
        onDelete={handleHelpDelete}
        onStartEdit={(item) => { setHelpEditItem(item); setHelpFormTitle(item.title); setHelpFormDesc(item.description || ""); setHelpView("edit"); }}
        loading={helpLoading}
        authUser={authUser}
        helpTab={helpTab}
        setHelpTab={setHelpTab}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto+Mono&display=swap');
        @keyframes sway{0%,100%{transform:translate(-50%,-50%) rotate(-0.8deg)}50%{transform:translate(-50%,-50%) rotate(0.8deg)}}
        @keyframes gardenSway{0%,100%{transform:rotate(-1.2deg)}50%{transform:rotate(1.2deg)}}
        @keyframes cloudDrift{from{transform:translateX(-200px)}to{transform:translateX(110vw)}}
        @keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes slideInPanel{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes pulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.1);opacity:0.3}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.mushroom300};border-radius:4px}
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
