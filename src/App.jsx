import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { loadProjects, loadWishes, fromProject, fromWish, toProject, toWish, loadNotifications, daysAgo } from "./lib/db";

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
    mango500:"#d69e2e",mango100:"#fefcbf",mango600:"#b7791f",
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
const COUNTRY_FLAG = {"PH":"🇵🇭", "TH":"🇹🇭"};

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
  nursery:  "Awaiting ExCom review",
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
const AREAS = [
  "Hiring & Recruitment","Onboarding","Learning & Development",
  "Performance & Goals","Payroll & Compensation","People Operations",
  "Employee Experience","Customer & Client Work","Internal Operations",
  "Product & Engineering","Other"
];
const TOOLS = ["Claude Chat","Claude Code","Cowork","ChatGPT","Copilot","Cursor","Zapier / Make","Other"];

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
function IcoTimeline({size=16,color=C.kangkong600}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <line x1="4" y1="2" x2="4" y2="14" stroke={color} strokeWidth="0.9" opacity="0.35"/>
      {[3,7,11].map((y,i) => (
        <g key={y}>
          <circle cx="4" cy={y} r={i===2?"2":"1.5"} fill={i===2?color:C.mushroom300} stroke={color} strokeWidth="0.8"/>
          <line x1="7" y1={y} x2="14" y2={y} stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
        </g>
      ))}
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
const GardenSizes = {seedling:{w:60,h:72},nursery:{w:60,h:72},sprout:{w:74,h:84},bloom:{w:78,h:88},thriving:{w:90,h:102}};

// Stage icon (small, inline) — named components to avoid JSX-in-object errors
// SIcoSprout — tiny sprouting bean icon for stage badges
function SIcoSprout({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      {/* bean halves */}
      <path d="M8 13 Q4 12 4 8.5 Q4 5.5 6.5 5 Q8 4.8 8 7 Q8 10 8 13Z"
        stroke={col} strokeWidth="0.9" fill={col} fillOpacity="0.35"/>
      <path d="M8 13 Q12 12 12 8.5 Q12 5.5 9.5 5 Q8 4.8 8 7 Q8 10 8 13Z"
        stroke={col} strokeWidth="0.9" fill={col} fillOpacity="0.5"/>
      {/* shoot */}
      <line x1="8" y1="7" x2="8" y2="2.5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      {/* leaves */}
      <path d="M8 5 Q5 3.5 4.5 2 Q7 2.5 8 4.5Z" fill={col} fillOpacity="0.6" stroke={col} strokeWidth="0.5"/>
      <path d="M8 4.5 Q11 3 11.5 1.5 Q9 2 8 4Z" fill={col} fillOpacity="0.55" stroke={col} strokeWidth="0.5"/>
    </svg>
  );
}
function SIcoGrowing({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <line x1="8" y1="13" x2="8" y2="5" stroke={col} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 11 Q5 10 3 12 Q5.5 9 8 11Z" fill={col} fillOpacity="0.5" stroke={col} strokeWidth="0.7"/>
      <path d="M8 9 Q11 8 13 10 Q10.5 7 8 9Z" fill={col} fillOpacity="0.45" stroke={col} strokeWidth="0.7"/>
      <ellipse cx="8" cy="4.5" rx="3" ry="2" fill={col} fillOpacity="0.35" stroke={col} strokeWidth="0.7"/>
    </svg>
  );
}
function SIcoBlooming({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2 Q6 5 8 8 Q10 5 8 2Z" fill={col} fillOpacity="0.5" stroke={col} strokeWidth="0.6"/>
      <path d="M2 8 Q5 6 8 8 Q5 10 2 8Z" fill={col} fillOpacity="0.5" stroke={col} strokeWidth="0.6"/>
      <path d="M14 8 Q11 6 8 8 Q11 10 14 8Z" fill={col} fillOpacity="0.5" stroke={col} strokeWidth="0.6"/>
      <path d="M8 14 Q6 11 8 8 Q10 11 8 14Z" fill={col} fillOpacity="0.5" stroke={col} strokeWidth="0.6"/>
      <path d="M3.5 3.5 Q6 5.5 8 8 Q5.5 6 3.5 3.5Z" fill={col} fillOpacity="0.4" stroke={col} strokeWidth="0.5"/>
      <path d="M12.5 3.5 Q10 5.5 8 8 Q10.5 6 12.5 3.5Z" fill={col} fillOpacity="0.4" stroke={col} strokeWidth="0.5"/>
      <circle cx="8" cy="8" r="2" fill={col} fillOpacity="0.8"/>
    </svg>
  );
}
function SIcoTree({size,col}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <line x1="8" y1="13" x2="8" y2="8" stroke={col} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="6.5" r="5" stroke={col} strokeWidth="0.9" fill={col} fillOpacity="0.12"/>
      <circle cx="8" cy="5" r="3.5" stroke={col} strokeWidth="0.7" fill={col} fillOpacity="0.18"/>
      <circle cx="8" cy="3.5" r="2" fill={col} fillOpacity="0.35"/>
    </svg>
  );
}
function StageIcon({stage, size=16}) {
  const c = STAGE_COLORS[stage];
  if (!c) return null;
  const col = c.text;
  if (stage==="seedling") return <SIcoSprout size={size} col={col}/>;
  if (stage==="nursery")  return <SIcoSprout size={size} col={col}/>;
  if (stage==="sprout")   return <SIcoGrowing size={size} col={col}/>;
  if (stage==="bloom")    return <SIcoBlooming size={size} col={col}/>;
  if (stage==="thriving") return <SIcoTree size={size} col={col}/>;
  return null;
}

// ── ProjectImage — inline SVG, no external dependency ────────────────────────
const CAP_ICONS = {
  "LLM":             "💬", "Computer Vision": "👁️", "Automation": "⚙️",
  "Prediction":      "📈", "NLP":             "📝",
};
const ProjectImage = ({project, width="100%", height=120, style={}}) => {
  const sc   = STAGE_COLORS[project.stage] || STAGE_COLORS.sprout;
  const icon = CAP_ICONS[project.capability] || "🤖";
  const dc   = DEPT_COLORS[project.builtBy]  || C.kangkong500;
  const id   = `grad-${project.id}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 400 ${height}`} xmlns="http://www.w3.org/2000/svg"
      style={{display:"block",flexShrink:0,...style}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={sc.bg}/>
          <stop offset="100%" stopColor={sc.border}/>
        </linearGradient>
      </defs>
      <rect width="400" height={height} fill={`url(#${id})`}/>
      {/* subtle dot grid */}
      {Array.from({length:8}).map((_,row)=>Array.from({length:16}).map((_,col)=>(
        <circle key={`${row}-${col}`} cx={col*28+14} cy={row*28+14} r={1.5} fill={sc.dot} opacity={0.25}/>
      )))}
      {/* left accent bar */}
      <rect x="0" y="0" width="4" height={height} fill={dc}/>
      {/* capability icon */}
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={Math.round(height*0.38)} style={{userSelect:"none"}}>{icon}</text>
      {/* stage label bottom-right */}
      <text x="390" y={height-8} textAnchor="end" fontSize="11" fontFamily="Rubik,sans-serif"
        fontWeight="700" fill={sc.dot} opacity={0.8}>{STAGE_LABELS[project.stage]}</text>
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
  const sc = STAGE_COLORS[stage];
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

// Logo
const SproutLogo = () => (
  <div style={{display:"flex",alignItems:"center",gap:8}}>
    <div style={{width:32,height:32,borderRadius:8,background:C.kangkong800,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <IcoGarden size={18} color={C.kangkong200}/>
    </div>
    <div>
      <div style={{fontFamily:FF,fontWeight:700,fontSize:16,color:C.mushroom900,lineHeight:1.1}}>Grove</div>
      <div style={{fontFamily:FF,fontSize:10,color:C.kangkong600,fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>by Sprout</div>
    </div>
  </div>
);

// ── Duplicate Detector ────────────────────────────────────────────────────────
// ── Related projects — score-based matching ───────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","has","have","had",
  "it","its","this","that","these","those","we","our","their","which",
  "will","can","may","do","does","did","not","no","as","up","out","so",
  "all","also","just","than","then","when","where","who","how","what",
  "each","they","them","your","more","some","into","over","used","help",
]);

const extractKeywords = (text) => {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );
};

const countOverlap = (a, b) => {
  const ka = extractKeywords(a);
  const kb = extractKeywords(b);
  let n = 0;
  for (const w of ka) { if (kb.has(w)) n++; }
  return n;
};

const findRelated = (project, allProjects) => {
  return allProjects
    .filter(p => p.id !== project.id && p.country === project.country)
    .map(p => {
      let score = 0;
      const reasons = [];
      const projArea = project.area || project.problemSpace;
      const pArea = p.area || p.problemSpace;

      if (projArea && pArea && pArea === projArea) {
        score += 2;
        reasons.push("Same area");
      }
      if (countOverlap(project.description, p.description) >= 2) {
        score += 2;
        reasons.push("Similar description");
      }
      if (project.builtFor && p.builtFor === project.builtFor) {
        score += 1;
        reasons.push("Same team");
      }

      return {...p, score, matchReason: reasons.join(" · ")};
    })
    .filter(p => p.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

// ── Executive Dashboard ───────────────────────────────────────────────────────
const ExecutiveDashboard = ({projects, wishes, onSelectProject, onNavigateGarden, onNavigateWishlist}) => {
  const [rankMode, setRankMode] = useState("builtBy"); // "builtBy" | "builtFor"

  const launched   = projects.filter(p=>p.stage==="bloom"||p.stage==="thriving");
  const inProgress = projects.filter(p=>p.stage==="sprout"||p.stage==="seedling");
  const wilting    = projects.filter(p=>p.lastUpdated>30);
  const totalImpacts = launched.filter(p=>p.impact!=="TBD");
  const spotlight  = launched.sort((a,b)=>a.lastUpdated-b.lastUpdated)[0];
  const healthPct  = Math.round((launched.length/Math.max(projects.length,1))*100);

  // Seeds = wishes (not a garden stage)
  const seedCount = wishes.length;

  const deptStats = Object.keys(DEPT_ZONES).map(dept=>{
    const ps = rankMode==="builtBy"
      ? projects.filter(p=>p.builtBy===dept)
      : projects.filter(p=>p.builtFor===dept);
    const sc = ps.reduce((s,p)=>s+STAGE_ORDER[p.stage],0);
    const la = ps.filter(p=>p.stage==="bloom"||p.stage==="thriving").length;
    return {dept,total:ps.length,launched:la,score:sc};
  }).sort((a,b)=>b.score-a.score);

  return (
    <div style={{padding:"28px 32px",background:C.mushroom50,minHeight:"100%",overflowY:"auto"}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:FF,fontSize:22,fontWeight:700,color:C.mushroom900,marginBottom:4}}>AI Program Overview</div>
        <div style={{fontFamily:FF,fontSize:14,color:C.mushroom500}}>
          Live snapshot of Sprout's AI ecosystem &middot; {projects.length} active projects
        </div>
      </div>

      {/* Key metrics — Seeds now = wishes */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16,marginBottom:24}}>
        {[
          {label:"Seed",       value:seedCount,                                             sub:STAGE_DESC.seedling,   tone:"neutral", plant:<WishSeed size={32} color={C.mushroom500}/>},
          {label:"Seedling",   value:projects.filter(p=>p.stage==="seedling").length,     sub:STAGE_DESC.seedling,   tone:"pending", plant:<PlantSprout size={36}/>},
          {label:"Sprout",     value:projects.filter(p=>p.stage==="sprout").length,       sub:STAGE_DESC.sprout,     tone:"plain",   plant:<PlantGrowing size={36}/>},
          {label:"Bloom",      value:projects.filter(p=>p.stage==="bloom").length,        sub:STAGE_DESC.bloom,      tone:"success", plant:<PlantBlooming size={36}/>},
          {label:"Thriving",   value:projects.filter(p=>p.stage==="thriving").length,     sub:STAGE_DESC.thriving,   tone:"info",    plant:<PlantTree size={36}/>},
        ].map((s,i) => {
          const isWishlist = s.label === "Seed";
          const onClick = isWishlist
            ? () => onNavigateWishlist?.()
            : () => onNavigateGarden?.("board", s.label.toLowerCase());
          return (
            <Card key={i} tone={s.tone} hoverable onClick={onClick} style={{textAlign:"center",padding:"16px 12px",cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>{s.plant}</div>
              <div style={{fontFamily:FF,fontSize:30,fontWeight:800,color:C.mushroom900,lineHeight:1}}>{s.value}</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom700,marginTop:3,fontWeight:600}}>{s.label}</div>
              <div style={{fontFamily:FF,fontSize:10,color:C.mushroom400,marginTop:2,lineHeight:1.4}}>{s.sub}</div>
              <div style={{fontFamily:FF,fontSize:10,color:C.kangkong500,marginTop:6,fontWeight:600}}>View all →</div>
            </Card>
          );
        })}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
        {spotlight&&(
          <Card tone="success" style={{gridColumn:"1/-1"}} hoverable onClick={()=>onSelectProject(spotlight)}>
            <div style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
              <PlantBlooming size={64} wilting={false}/>
              <div style={{flex:1}}>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.kangkong600,marginBottom:4}}>Project Spotlight</div>
                <div style={{fontFamily:FF,fontSize:20,fontWeight:700,color:C.mushroom900,marginBottom:6}}>{spotlight.name}</div>
                <div style={{fontFamily:FF,fontSize:13,color:C.mushroom600,lineHeight:1.5,marginBottom:8}}>{spotlight.description}</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <StageBadge stage={spotlight.stage}/>
                  <CapBadge cap={spotlight.capability}/>
                  <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500,display:"flex",alignItems:"center",gap:4}}>
                    Built by <strong style={{color:getDeptColor(spotlight.builtBy)}}>{spotlight.builtBy}</strong>{spotlight.country&&<>&nbsp;<CountryBadge country={spotlight.country}/></>}
                    &nbsp;→ for <strong style={{color:getDeptColor(spotlight.builtFor)}}>{spotlight.builtFor}</strong>
                  </span>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:FF,fontSize:36,fontWeight:800,color:C.kangkong600,lineHeight:1}}>{spotlight.impactNum}</div>
                <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,marginTop:2}}>{spotlight.impact}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Rankings with toggle */}
        <Card tone="plain" style={{gridColumn:"1/2"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:FF,fontWeight:700,fontSize:14,color:C.mushroom800,display:"flex",alignItems:"center",gap:6}}>
              <IcoImpact size={16} color={C.kangkong600}/> Rankings
            </div>
            <div style={{display:"flex",background:C.mushroom100,borderRadius:DS.radius.md,padding:2,gap:1}}>
              {[{k:"builtBy",l:"Built By"},{k:"builtFor",l:"Built For"},{k:"builder",l:"Builder"}].map(opt=>(
                <button key={opt.k} onClick={()=>setRankMode(opt.k)} style={{
                  padding:"4px 11px",border:"none",cursor:"pointer",
                  fontFamily:FF,fontSize:11,fontWeight:600,
                  borderRadius:DS.radius.sm,transition:"all 0.15s",
                  background:rankMode===opt.k?C.white:"transparent",
                  color:rankMode===opt.k?C.kangkong600:C.mushroom500,
                  boxShadow:rankMode===opt.k?DS.shadow.sm:"none",
                }}>{opt.l}</button>
              ))}
            </div>
          </div>
          <div style={{fontFamily:FF,fontSize:11,color:C.mushroom400,marginBottom:12,fontStyle:"italic"}}>
            {rankMode==="builtBy" ? "Which team owns/creates the most AI projects"
             : rankMode==="builtFor" ? "Which team benefits most from AI projects"
             : "Which Farmer has built the most AI projects"}
          </div>

          {rankMode==="builder" ? (()=>{
            // Build per-person stats
            const builderMap = {};
            projects.forEach(p => {
              if (!p.builder) return;
              if (!builderMap[p.builder]) builderMap[p.builder] = {name:p.builder, total:0, launched:0, team:p.builtBy, country:p.country};
              builderMap[p.builder].total++;
              if (p.stage==="bloom"||p.stage==="thriving") builderMap[p.builder].launched++;
            });
            const builders = Object.values(builderMap).sort((a,b)=>b.total-a.total);
            const maxTotal = builders[0]?.total||1;
            return builders.slice(0,6).map((b,i)=>{
              const dc = DEPT_COLORS[b.team]||C.mushroom400;
              return (
                <div key={b.name} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontFamily:FF,fontSize:12,color:C.mushroom400,minWidth:16}}>{["1st","2nd","3rd"][i]||i+1}</span>
                      <div style={{width:24,height:24,borderRadius:"50%",background:dc,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontFamily:FF,fontSize:10,fontWeight:700,color:C.white}}>{b.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
                      </div>
                      <div>
                        <span style={{fontFamily:FF,fontSize:13,fontWeight:600,color:C.mushroom800}}>{b.name}</span>
                        <span style={{fontFamily:FF,fontSize:10,color:dc,marginLeft:6,fontWeight:600}}>{b.team}</span>
                        <CountryBadge country={b.country}/>
                      </div>
                    </div>
                    <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{b.launched} launched · {b.total} total</span>
                  </div>
                  <ProgressBar value={(b.total/maxTotal)*100} color={dc} height={6}/>
                </div>
              );
            });
          })()
          : deptStats.slice(0,6).map((d,i)=>{
            const dc=DEPT_COLORS[d.dept];
            const maxScore=deptStats[0].score||1;
            return (
              <div key={d.dept} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontFamily:FF,fontSize:12,color:C.mushroom400,minWidth:16}}>{["1st","2nd","3rd"][i]||i+1}</span>
                    <div style={{width:8,height:8,borderRadius:"50%",background:dc}}/>
                    <span style={{fontFamily:FF,fontSize:13,fontWeight:600,color:C.mushroom800}}>{d.dept}</span>
                  </div>
                  <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{d.launched} launched · {d.total} total</span>
                </div>
                <ProgressBar value={(d.score/maxScore)*100} color={dc} height={6}/>
              </div>
            );
          })}
        </Card>

        <Card tone="plain" style={{gridColumn:"2/3"}}>
          <div style={{fontFamily:FF,fontWeight:700,fontSize:14,color:C.mushroom800,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
            <IcoImpact size={16} color={C.kangkong600}/> Impact Highlights
          </div>
          {totalImpacts.slice(0,5).map(p=>{
            const dc=getDeptColor(p.builtBy);
            return (
              <div key={p.id} onClick={()=>onSelectProject(p)} style={{
                display:"flex",alignItems:"center",gap:12,marginBottom:10,
                padding:"10px 12px",borderRadius:DS.radius.lg,
                background:C.mushroom50,border:"1px solid "+C.mushroom200,
                borderLeft:"3px solid "+dc,cursor:"pointer",transition:"all 0.15s",
              }}
                onMouseOver={e=>e.currentTarget.style.background=C.mushroom100}
                onMouseOut={e=>e.currentTarget.style.background=C.mushroom50}
              >
                <div style={{flex:1}}>
                  <div style={{fontFamily:FF,fontSize:13,fontWeight:600,color:C.mushroom900}}>{p.name}</div>
                  <div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>
                    {p.builtBy} → {p.builtFor}
                  </div>
                </div>
                <div style={{fontFamily:FF,fontSize:18,fontWeight:800,color:dc}}>{p.impactNum}</div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Tools in Use */}
      {(() => {
        const counts = TOOLS
          .map(t => ({tool:t, count:projects.filter(p=>p.toolUsed?.includes(t)).length}))
          .filter(x=>x.count>0)
          .sort((a,b)=>b.count-a.count);
        const max = counts[0]?.count||1;
        if(!counts.length) return null;
        return (
          <Card tone="plain">
            <div style={{fontFamily:FF,fontWeight:700,fontSize:14,color:C.mushroom800,marginBottom:16,display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:15}}>⚒</span> Tools in Use
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px 24px"}}>
              {counts.map(({tool,count})=>(
                <div key={tool}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontFamily:FF,fontSize:12,fontWeight:600,color:C.mushroom700}}>{tool}</span>
                    <span style={{fontFamily:FF,fontSize:11,color:C.mushroom400}}>{count} project{count!==1?"s":""}</span>
                  </div>
                  <div style={{height:6,background:C.mushroom100,borderRadius:DS.radius.full,overflow:"hidden"}}>
                    <div style={{height:"100%",width:(count/max*100)+"%",background:C.kangkong400,borderRadius:DS.radius.full}}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

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
function WishDetailPanel({wish, onClose, onClaim, onPromoteToSprout, onEdit, authUser}) {
  const deptColor = DEPT_COLORS[wish.builtFor]||C.mushroom500;
  const isBuilder  = wish.claimedByEmail === authUser?.email;
  const isGardener = authUser?.isGardener;
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
              {(authUser?.email===wish.wisherEmail||isGardener)&&!wish.fulfilledBy&&(
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
                {(isBuilder||isGardener)&&(
                  <button onClick={onPromoteToSprout} style={{width:"100%",padding:"11px",background:C.kangkong500,color:C.white,border:"none",borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 16px "+C.kangkong500+"40"}}>
                    🌿 I have a prototype — Add to Garden as Sprout
                  </button>
                )}
                {!isClaimed&&(
                  <button onClick={onClaim} style={{width:"100%",padding:"11px",background:C.kangkong700,color:C.white,border:"none",borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                    <IcoAdd size={16} color={C.white}/> I'll build this
                  </button>
                )}
                {isClaimed&&!isBuilder&&!isGardener&&(
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
const GardenHub = ({projects, wishes, selected, setSelected, authUser, onClaimWish, onMoveStage, onWishClaim, onUpdateWish, initialViewMode="directory", initialStageFilter="All"}) => {
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

  const handlePromoteToSprout = (wish) => {
    setSelectedWish(null);
    onClaimWish(wish); // opens AddProjectModal pre-filled at Sprout
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
              const dc = getDeptColor(p.builtBy);
              const sc = STAGE_COLORS[p.stage];
              const wilting = p.lastUpdated > 30;
              const related = findRelated(p, projects);
              const hasOverlap = related.length > 0;
              return (
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{background:C.white,borderRadius:DS.radius.xl,border:"1px solid "+C.mushroom200,overflow:"hidden",cursor:"pointer",transition:"all 0.18s",boxShadow:DS.shadow.sm}}
                  onMouseOver={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=DS.shadow.lg;}}
                  onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=DS.shadow.sm;}}
                >
                  <ProjectImage project={p} height={110} style={{borderBottom:"1px solid "+C.mushroom100}}/>
                  <div style={{padding:"14px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div style={{fontFamily:FF,fontSize:14,fontWeight:700,color:C.mushroom900,lineHeight:1.3,flex:1,display:"flex",alignItems:"center",gap:6}}>
                        {p.name}
                        <CountryBadge country={p.country}/>
                      </div>
                      <div style={{display:"flex",gap:4,marginLeft:8,flexShrink:0}}>
                        {wilting&&<IcoStale size={14} color={C.mango500}/>}
                        {hasOverlap&&<IcoWarning size={14} color={C.carrot500}/>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>
                      <StageBadge stage={p.stage}/>
                    </div>
                    {p.toolUsed?.length>0&&(
                      <div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap"}}>
                        {p.toolUsed.slice(0,3).map(t=><ToolChip key={t} tool={t}/>)}
                        {p.toolUsed.length>3&&<span style={{fontFamily:FF,fontSize:9,color:C.mushroom400,alignSelf:"center"}}>+{p.toolUsed.length-3}</span>}
                      </div>
                    )}
                    <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,lineHeight:1.5,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{p.description}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontFamily:FF,fontSize:11,fontWeight:600,color:dc}}>{p.builtBy}</span>
                      {p.impact!=="TBD"&&<span style={{fontFamily:FF,fontSize:11,color:C.kangkong600,fontWeight:700,display:"flex",alignItems:"center",gap:3}}><IcoImpact size={11} color={C.kangkong600}/>{p.impactNum}</span>}
                    </div>
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
            const sc = STAGE_COLORS["seed"];
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
                            ? <span style={{fontFamily:FF,fontSize:10,fontWeight:600,color:C.wintermelon500}}>🔨 {w.claimedBy.split(" ")[0]}</span>
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
                  </div>
                  <div style={{fontFamily:FF,fontSize:10,color:sc.text,opacity:0.7}}>{STAGE_FLORA[stage]}</div>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"10px"}}>
                  {col.length===0&&(
                    <div style={{textAlign:"center",padding:"20px 8px",color:C.mushroom300,fontFamily:FF,fontSize:11,fontStyle:"italic"}}>Empty</div>
                  )}
                  {col.map(p => {
                    const dc = getDeptColor(p.builtBy);
                    const wilting = p.lastUpdated>30;
                    return (
                      <div key={p.id}
                        draggable
                        onDragStart={e=>{setDragProjectId(p.id);e.dataTransfer.effectAllowed="move";}}
                        onDragEnd={()=>{setDragProjectId(null);setDragOverStage(null);}}
                        onClick={()=>setSelected(p)}
                        style={{
                          background:dragProjectId===p.id?sc.bg:C.mushroom50,
                          borderRadius:DS.radius.lg,padding:"11px 13px",marginBottom:8,
                          border:"1px solid "+C.mushroom200,borderLeft:"3px solid "+dc,
                          cursor:"grab",transition:"all 0.15s",boxShadow:DS.shadow.sm,
                          opacity:dragProjectId===p.id?0.5:1,
                        }}
                        onMouseOver={e=>{if(dragProjectId!==p.id){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.shadow.md;}}}
                        onMouseOut={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=DS.shadow.sm;}}
                      >
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                          <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom900,flex:1,lineHeight:1.3,display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                            {p.name}
                            <CountryBadge country={p.country}/>
                          </div>
                          {wilting&&<IcoStale size={13} color={C.mango500}/>}
                        </div>
                        <div style={{display:"flex",gap:4,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontFamily:FF,fontSize:10,color:dc,fontWeight:600,padding:"2px 6px",background:dc+"15",borderRadius:DS.radius.full}}>{p.builtBy}</span>
                        </div>
                        {p.toolUsed?.length>0&&(
                          <div style={{display:"flex",gap:3,marginBottom:5,flexWrap:"wrap"}}>
                            {p.toolUsed.slice(0,2).map(t=><ToolChip key={t} tool={t}/>)}
                            {p.toolUsed.length>2&&<span style={{fontFamily:FF,fontSize:9,color:C.mushroom400,alignSelf:"center"}}>+{p.toolUsed.length-2}</span>}
                          </div>
                        )}
                        {p.impact!=="TBD"&&(
                          <div style={{fontFamily:FF,fontSize:11,color:C.kangkong600,fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:3}}>
                            <IcoImpact size={11} color={C.kangkong600}/> {p.impact}
                          </div>
                        )}
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:FF,fontSize:10,color:C.mushroom400}}>{p.lastUpdated===0?"Today":p.lastUpdated+"d ago"}</span>
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
          onPromoteToSprout={()=>handlePromoteToSprout(selectedWish)}
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



// ── Garden Map View (extracted for use inside GardenHub) ──────────────────────
const GardenMapView = ({projects, filtered, wishes, selected, setSelected, deptFilter, capFilter}) => {
  const [hoverId, setHoverId] = useState(null);
  const gardenRef = useRef(null);
  const [gardenRect, setGardenRect] = useState(null);

  useEffect(()=>{
    const u=()=>{if(gardenRef.current){const r=gardenRef.current.getBoundingClientRect();setGardenRect({width:r.width,height:r.height});}};
    u(); window.addEventListener("resize",u); return()=>window.removeEventListener("resize",u);
  },[]);

  const isVisible = p => filtered.some(f=>f.id===p.id);
  const plantPos = p => {
    const z=DEPT_ZONES[p.builtBy]; if(!z) return{leftPct:50,topPct:50,scale:1};
    const px=z.x+(p.zx/100)*z.w, py=z.y+(p.zy/100)*z.h;
    return{leftPct:px,topPct:py,scale:0.65+(py/100)*0.45};
  };

  const RelatedLines = () => {
    if(!selected||!gardenRect) return null;
    const related=findRelated(selected,projects);
    const gp=p=>{const z=DEPT_ZONES[p.builtBy];if(!z)return{cx:50,cy:50};return{cx:(z.x+(p.zx/100)*z.w)/100*gardenRect.width,cy:(z.y+(p.zy/100)*z.h)/100*gardenRect.height};};
    const sel=gp(selected);
    return (
      <svg style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:12,overflow:"visible"}} width={gardenRect.width} height={gardenRect.height}>
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {related.map(p=>{
          const{cx,cy}=gp(p);
          const mx=(sel.cx+cx)/2, my=Math.max(sel.cy,cy)+50;
          const isSP=p.problemSpace===selected.problemSpace;
          const col=isSP?C.carrot500:C.kangkong500;
          return(
            <g key={p.id}>
              <path d={"M"+sel.cx+","+sel.cy+" Q"+mx+","+my+" "+cx+","+cy} stroke={col} strokeWidth={isSP?2.5:1.5} fill="none" strokeDasharray={isSP?"7,4":"3,4"} opacity="0.7" filter="url(#glow)"/>
              <circle cx={cx} cy={cy} r="6" fill={col} opacity="0.4"/>
            </g>
          );
        })}
        <circle cx={sel.cx} cy={sel.cy} r="10" fill="none" stroke={C.kangkong500} strokeWidth="2" opacity="0.8" filter="url(#glow)">
          <animate attributeName="r" values="10;16;10" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    );
  };

  return (
    <div ref={gardenRef} onClick={()=>setSelected(null)} style={{flex:1,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#dff0e8 0%,#c8e8d8 30%,#b8dcc8 60%,#c8d4a8 100%)"}}>
      {Object.entries(DEPT_ZONES).map(([dept,zone])=>{
        const dc=DEPT_COLORS[dept];
        const active=deptFilter==="All"||deptFilter===dept;
        return(
          <div key={dept} style={{position:"absolute",left:zone.x+"%",top:(zone.y+8)+"%",width:zone.w+"%",height:zone.h+"%",border:"1.5px dashed "+dc+(active?"66":"1a"),borderRadius:16,background:dc+(active?"08":"02"),transition:"all 0.4s",zIndex:4,pointerEvents:"none"}}>
            <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:C.white,border:"1px solid "+dc+"40",borderRadius:DS.radius.full,padding:"1px 10px",fontFamily:FF,fontSize:9,fontWeight:700,color:dc,whiteSpace:"nowrap",opacity:active?1:0.3,boxShadow:DS.shadow.sm,textTransform:"uppercase",letterSpacing:0.8}}>{dept}</div>
          </div>
        );
      })}
      <RelatedLines/>
      {projects.map((project,idx)=>{
        const{leftPct,topPct,scale}=plantPos(project);
        const visible=isVisible(project);
        const Plant=PlantMap[project.stage];
        const wilting=project.lastUpdated>60;
        const size=GardenSizes[project.stage];
        const isHov=hoverId===project.id;
        const isSel=selected?.id===project.id;
        const dc=getDeptColor(project.builtBy);
        const hasRelated=selected&&findRelated(selected,projects).some(r=>r.id===project.id);
        return(
          <div key={project.id}
            onClick={e=>{e.stopPropagation();setSelected(project);}}
            onMouseEnter={()=>setHoverId(project.id)}
            onMouseLeave={()=>setHoverId(null)}
            style={{position:"absolute",left:leftPct+"%",top:(topPct+8)+"%",transform:"translate(-50%,-50%) scale("+scale+")",width:size.w,height:size.h,cursor:"pointer",opacity:visible?1:0.08,transition:"opacity 0.4s",zIndex:isSel?18:isHov?16:5+Math.floor(topPct/10),animation:"sway "+(3.5+(idx%4)*0.8)+"s ease-in-out "+((idx*0.4)%3)+"s infinite",transformOrigin:"bottom center"}}>
            {isSel&&<div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"2.5px solid "+dc,boxShadow:"0 0 20px "+dc+"50",animation:"pulse 2s ease-in-out infinite"}}/>}
            {hasRelated&&!isSel&&<div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"2px dashed "+C.carrot500,opacity:0.7,animation:"pulse 2s ease-in-out 0.5s infinite"}}/>}
            {isHov&&visible&&<div style={{position:"absolute",inset:-8,borderRadius:"50%",background:"radial-gradient(circle,"+dc+"20 0%,transparent 70%)",pointerEvents:"none"}}/>}
            <Plant wilting={wilting} size={size.w}/>
            {wilting&&<div style={{position:"absolute",top:-4,right:-4}}><IcoStale size={14} color={C.mango500}/></div>}
            <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:7,height:7,borderRadius:"50%",background:dc,border:"1.5px solid white",boxShadow:"0 0 5px "+dc+"90"}}/>
            {isHov&&visible&&(
              <div style={{position:"absolute",bottom:"108%",left:"50%",transform:"translateX(-50%)",background:C.mushroom900,color:C.mushroom50,padding:"8px 12px",borderRadius:DS.radius.lg,fontFamily:FF,fontSize:11,whiteSpace:"nowrap",pointerEvents:"none",zIndex:100,boxShadow:DS.shadow.lg,border:"1px solid "+C.mushroom700}}>
                <div style={{fontWeight:700,marginBottom:2}}>{project.name}</div>
                <div style={{opacity:0.7,fontSize:10}}>{project.builtBy}{project.builtFor!==project.builtBy?" → "+project.builtFor:""}</div>
                <div style={{opacity:0.6,fontSize:10}}>{project.capability} · {STAGE_LABELS[project.stage]}</div>
                {project.impact!=="TBD"&&<div style={{marginTop:3,fontSize:10,color:C.kangkong300}}>{project.impact}</div>}
              </div>
            )}
          </div>
        );
      })}
      {/* Legend */}
      <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:14,alignItems:"center",background:"rgba(255,255,255,0.9)",backdropFilter:"blur(8px)",borderRadius:DS.radius.full,padding:"6px 18px",border:"1px solid "+C.mushroom200,boxShadow:DS.shadow.md,zIndex:20}}>
        {STAGES.map(s=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:5}}>
            <StageIcon stage={s} size={13}/>
            <span style={{fontFamily:FF,fontSize:10,color:C.mushroom600}}>{STAGE_LABELS[s]}</span>
          </div>
        ))}
        <div style={{width:1,height:12,background:C.mushroom300}}/>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:14,height:2,borderTop:"2px dashed "+C.carrot500}}/>
          <span style={{fontFamily:FF,fontSize:10,color:C.carrot500}}>Related</span>
        </div>
        {wishes&&wishes.filter(w=>!w.fulfilledBy).length>0&&(
          <>
            <div style={{width:1,height:12,background:C.mushroom300}}/>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <WishSeed size={14} color={C.mushroom500}/>
              <span style={{fontFamily:FF,fontSize:10,color:C.mushroom500,fontWeight:600}}>{wishes.filter(w=>!w.fulfilledBy).length} seeds in wishlist</span>
            </div>
          </>
        )}
        {(projects.some(p=>p.country==="PH")||projects.some(p=>p.country==="TH"))&&(
          <>
            <div style={{width:1,height:12,background:C.mushroom300}}/>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {projects.some(p=>p.country==="PH")&&(
                <span style={{fontFamily:FF,fontSize:10,color:C.mushroom500,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}><FlagSVG country="PH" w={14} h={10}/>{projects.filter(p=>p.country==="PH").length}</span>
              )}
              {projects.some(p=>p.country==="TH")&&(
                <span style={{fontFamily:FF,fontSize:10,color:C.mushroom500,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}><FlagSVG country="TH" w={14} h={10}/>{projects.filter(p=>p.country==="TH").length}</span>
              )}
            </div>
          </>
        )}
      </div>
      {selected&&findRelated(selected,projects).length>0&&(
        <div style={{position:"absolute",top:16,right:16,zIndex:20,background:C.white,border:"1.5px solid "+C.mango500,borderRadius:DS.radius.lg,padding:"10px 14px",maxWidth:220,boxShadow:DS.shadow.md}}>
          <div style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.mango600,marginBottom:4,display:"flex",alignItems:"center",gap:5}}>
            <IcoWarning size={14} color={C.mango500}/> Possible Overlap
          </div>
          <div style={{fontFamily:FF,fontSize:11,color:C.mushroom600,lineHeight:1.4}}>
            {findRelated(selected,projects).length} project(s) share the same area as <strong>{selected.name}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({project,allProjects,onClose,onNote,setSelected,authUser,onEdit}) => {
  const [noteText,setNoteText] = useState("");
  const [interested,setInterested] = useState(false);
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
            {(authUser?.email===project.builderEmail||authUser?.isGardener)&&(
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
          <CapBadge cap={project.capability}/>
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
            {l:"Impact",  v:project.impact,                                              icon:<IcoImpact size={12} color={C.kangkong600}/>},
            {l:"Builder",   v:project.owner,                                               icon:<IcoNote size={12} color={C.mushroom500}/>},
            {l:"Updated", v:project.lastUpdated===0?"Today":project.lastUpdated+"d ago", icon:project.lastUpdated>30?<IcoStale size={12} color={C.mango500}/>:<IcoCheck size={12} color={C.kangkong500}/>},
            {l:"Data",    v:project.dataSource||"—",                                     icon:<IcoNote size={12} color={C.mushroom500}/>},
          ].map(item=>(
            <div key={item.l} style={{background:C.mushroom50,borderRadius:DS.radius.md,padding:"8px 10px",border:"1px solid "+C.mushroom200}}>
              <div style={{fontFamily:FF,fontSize:9,color:C.mushroom400,textTransform:"uppercase",letterSpacing:0.8,marginBottom:2}}>{item.l}</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom800,fontWeight:500,display:"flex",alignItems:"center",gap:4}}>{item.icon}{item.v}</div>
            </div>
          ))}
        </div>

        {project.demoLink&&project.demoLink!=="#"&&(
          <a href={project.demoLink} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,fontFamily:FF,fontSize:12,fontWeight:600,color:C.kangkong600,textDecoration:"none",marginBottom:16}}>
            <IcoLink size={14} color={C.kangkong600}/> View Demo
          </a>
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

        <div style={{marginBottom:16}}>
          <div style={{fontFamily:FF,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.mushroom500,marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <IcoTimeline size={13} color={C.mushroom400}/> Growth Timeline
          </div>
          <div style={{position:"relative",paddingLeft:18}}>
            <div style={{position:"absolute",left:5,top:6,bottom:6,width:2,background:C.mushroom200,borderRadius:1}}/>
            {(project.milestones||[]).map((m,i)=>(
              <div key={i} style={{position:"relative",marginBottom:8,display:"flex",alignItems:"flex-start"}}>
                <div style={{
                  position:"absolute",left:-18,top:3,width:10,height:10,borderRadius:"50%",
                  background:i===project.milestones.length-1?C.kangkong500:C.mushroom200,
                  border:"2px solid "+(i===project.milestones.length-1?C.kangkong500:C.mushroom300),
                  boxShadow:i===project.milestones.length-1?"0 0 8px "+C.kangkong500+"60":"none",
                }}/>
                <div style={{fontFamily:FF,fontSize:11,color:C.mushroom600,lineHeight:1.4,fontWeight:i===project.milestones.length-1?600:400}}>{m}</div>
              </div>
            ))}
          </div>
        </div>

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
function WishlistView({wishes, projects, onClaim, authUser, onUpvote, onAddWish, onWishClaim, onUpdateWish, showAddWish, setShowAddWish}) {
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
                <div style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,lineHeight:1.1}}>Wishlist</div>
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
                    {wish.claimedBy
                      ? <div style={{flex:1,padding:"7px 12px",borderRadius:DS.radius.md,background:C.wintermelon100,border:"1px solid "+C.wintermelon400,fontFamily:FF,fontSize:12,fontWeight:600,color:C.wintermelon500,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          🔨 {wish.claimedBy === currentUser ? "You're building this" : `${wish.claimedBy.split(" ")[0]} is building this`}
                        </div>
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
function WelcomeModal({onExplore, onDismissPermanently, onPlantSeed, onAddToGarden}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.6)",backdropFilter:"blur(8px)"}}>
      <div style={{background:C.white,borderRadius:DS.radius.xl,padding:36,maxWidth:480,width:"92%",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,animation:"slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)"}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:12,lineHeight:1}}>🌿</div>
          <div style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,marginBottom:8}}>Welcome to Grove</div>
          <div style={{fontFamily:FF,fontSize:14,color:C.mushroom600,lineHeight:1.6}}>
            AI tools are being built across Sprout — but no one knows what exists. Grove fixes that.
          </div>
        </div>

        {/* Contribution cards — clickable */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
          <button onClick={onPlantSeed} style={{background:C.kangkong50,border:"1.5px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",textAlign:"left",transition:"all 0.15s",width:"100%"}}
            onMouseOver={e=>{e.currentTarget.style.background=C.kangkong100;e.currentTarget.style.borderColor=C.kangkong400;}}
            onMouseOut={e=>{e.currentTarget.style.background=C.kangkong50;e.currentTarget.style.borderColor=C.kangkong200;}}
          >
            <span style={{fontSize:20,lineHeight:1,flexShrink:0,marginTop:1}}>🌱</span>
            <div>
              <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.kangkong700,marginBottom:3}}>Plant a Seed</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.kangkong600,lineHeight:1.55}}>Submit an AI idea you think Sprout needs. The team can vote on it, someone can claim it, and it might get built.</div>
            </div>
          </button>
          <button onClick={onAddToGarden} style={{background:C.mushroom50,border:"1.5px solid "+C.mushroom200,borderRadius:DS.radius.lg,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",textAlign:"left",transition:"all 0.15s",width:"100%"}}
            onMouseOver={e=>{e.currentTarget.style.background=C.mushroom100;e.currentTarget.style.borderColor=C.mushroom300;}}
            onMouseOut={e=>{e.currentTarget.style.background=C.mushroom50;e.currentTarget.style.borderColor=C.mushroom200;}}
          >
            <span style={{fontSize:20,lineHeight:1,flexShrink:0,marginTop:1}}>🌾</span>
            <div>
              <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom700,marginBottom:3}}>Add to Garden</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom600,lineHeight:1.55}}>Log an AI tool you're building or already shipped. Don't let good work go unseen.</div>
            </div>
          </button>
        </div>

        <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,textAlign:"center",marginBottom:20}}>
          Start by exploring what's already growing — or plant your first seed.
        </div>

        {/* Buttons */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={onExplore} style={{width:"100%",padding:"11px 0",borderRadius:DS.radius.lg,background:C.kangkong500,border:"none",color:C.white,fontFamily:FF,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background 0.15s"}}>
            Start exploring
          </button>
          <button onClick={onDismissPermanently} style={{width:"100%",padding:"10px 0",borderRadius:DS.radius.lg,background:"none",border:"1.5px solid "+C.mushroom200,color:C.mushroom500,fontFamily:FF,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
            Got it, don't show again
          </button>
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

// ── SectionHeader — numbered section label ────────────────────────────────────
function SectionHeader({number, title, subtitle}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,margin:"20px 0 14px"}}>
      <div style={{
        width:22, height:22, borderRadius:"50%",
        background:C.kangkong600, color:C.white,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:FF, fontSize:11, fontWeight:700, flexShrink:0,
      }}>{number}</div>
      <div>
        <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom900}}>{title}</div>
        {subtitle&&<div style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{subtitle}</div>}
      </div>
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

// ── Add Project Modal (with AI Summarizer + Duplicate Detector) ───────────────
const AddProjectModal = ({onClose, onAdd, onSave, projects, prefill=null, existing=null, authUser=null}) => {
  const isEditing = !!existing;
  const DEPTS = Object.keys(DEPT_ZONES);
  const [form, setForm] = useState({
    name:        existing?.name        || prefill?.title   || "",
    description: existing?.description || prefill?.why     || "",
    builtBy:     existing?.builtBy     || "Marketing",
    builtFor:    existing?.builtFor    || prefill?.builtFor || "Marketing",
    area:        existing?.area        || existing?.problemSpace || "",
    problem:"", built:"", betterNow:"",
    builder:     existing?.builder     || authUser?.displayName || "",
    impact:      existing?.impact      || "",
    stage:       existing?.stage       || STAGES[0],
    dataSource:  existing?.dataSource  || "",
    demoLink:    existing?.demoLink    || "",
    imageUrl:    existing?.imageUrl    || "",
    toolUsed:    existing?.toolUsed    || [],
  });

  // AI states
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
    if (["name","description","area","problem","built","betterNow","builtFor"].includes(k)) {
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
        area: form.area, problem: form.problem, built: form.built,
        betterNow: form.betterNow, impact: form.impact,
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
      problemSpace: form.area,
      capability: "",
      id:Date.now(), lastUpdated:0, notes:[],
      zx:35+Math.random()*25, zy:35+Math.random()*25,
      milestones:[STAGE_LABELS[form.stage]+" — "+new Date().toLocaleDateString("en-PH",{month:"short",year:"numeric"})],
      impactNum:"TBD", interestedUsers:[],
      imageUrl: form.imageUrl||"",
    });
    onClose();
  };

  const doSave = () => {
    onSave({...existing, ...form, problemSpace: form.area, capability: ""});
    onClose();
  };

  const submit = async () => {
    if (!form.name.trim() || submitting) return;
    if (isEditing) { doSave(); return; }
    if (aiOverlapChecked && aiOverlaps?.length > 0) { doAdd(); return; }
    setSubmitting(true);
    setAiChecking(true);
    const candidates = projects.filter(p =>
      p.area === form.area || p.problemSpace === form.area
    );
    const overlaps = await detectDuplicates(
      {...form, problemSpace: form.area, capability: ""},
      candidates
    );
    setAiOverlaps(overlaps);
    setAiOverlapChecked(true);
    setAiChecking(false);
    setSubmitting(false);
    if (overlaps.length === 0) { doAdd(); }
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.55)",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:DS.radius.xl,padding:28,maxWidth:520,width:"92%",maxHeight:"92vh",overflowY:"auto",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,animation:"slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontFamily:FF,fontSize:18,fontWeight:700,color:C.mushroom900,display:"flex",alignItems:"center",gap:8}}>
              <IcoGarden size={24} color={C.kangkong600}/> {isEditing?"Edit Project":"Add to Garden"}
            </div>
            <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,marginTop:2}}>{isEditing?"Update your project details":"Plant a new AI project in the ecosystem"}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",padding:4}}><IcoClose size={18} color={C.mushroom400}/></button>
        </div>

        {prefill&&(
          <div style={{background:C.kangkong50,border:"1.5px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"10px 14px",marginBottom:16,fontFamily:FF,fontSize:12,color:C.kangkong700,display:"flex",alignItems:"center",gap:8}}>
            <WishSeed size={16} color={C.kangkong600}/>
            Pre-filled from wish: <strong>"{prefill.title}"</strong>
          </div>
        )}

        {/* ── Section 1: About the Project ── */}
        <SectionHeader number="1" title="About the project" subtitle="Who built it, and for whom?"/>

        <ModalField label="Project Name *" k="name" ph="e.g. SmartSort AI" form={form} onChange={setField}/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <ModalField label="Built By (your team)" k="builtBy" type="select" opts={DEPTS} form={form} onChange={setField}/>
          <ModalField label="Built For (beneficiary)" k="builtFor" type="select" opts={DEPTS} form={form} onChange={setField}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <ModalField label="Area (Optional)" k="area" type="select" opts={["", ...AREAS]} form={form} onChange={setField}/>
          <ModalField label="Builder" k="builder" ph="e.g. Priya Mehta" form={form} onChange={setField}/>
        </div>

        {/* Tool Used */}
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>
            Tool Used <span style={{color:C.tomato500,fontWeight:400}}>*</span>
          </label>
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

        {/* ── Section 2: Tell the Story ── */}
        <SectionHeader number="2" title="Tell the story" subtitle="Help your team understand the impact"/>

        <StoryQ k="problem" label="What was the problem?" hint="1-2 sentences" form={form} onChange={setField} ph="What challenge or pain point existed before?"/>
        <StoryQ k="built" label="What did you build?" hint="1-2 sentences" form={form} onChange={setField} ph="Describe what you created or automated."/>
        <StoryQ k="betterNow" label="What's better now?" hint="1-2 sentences" form={form} onChange={setField} ph="What changed for the team or customers?"/>

        {/* AI Summarize button */}
        <button
          onClick={handleSummarize}
          disabled={!canSummarize||aiSummarizing}
          style={{
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%",
            marginBottom:10,padding:"7px 12px",borderRadius:DS.radius.md,
            border:"1.5px solid "+(aiSummaryDone?C.kangkong400:C.ubas400),
            background:aiSummaryDone?C.kangkong50:C.ubas50,
            color:aiSummaryDone?C.kangkong600:C.ubas600,
            fontFamily:FF,fontSize:12,fontWeight:700,
            cursor:canSummarize&&!aiSummarizing?"pointer":"not-allowed",
            opacity:canSummarize?1:0.5,transition:"all 0.15s",
          }}
        >
          {aiSummarizing
            ? <><span style={{display:"inline-block",animation:"spin 1s linear infinite",fontSize:12}}>⟳</span> Writing summary…</>
            : aiSummaryDone
            ? <><IcoCheck size={12} color={C.kangkong500}/> Regenerate summary from answers above</>
            : <>✦ Craft my summary from these answers</>
          }
        </button>

        {/* Description textarea */}
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Description</label>
          <textarea rows={3} value={form.description} onChange={e=>setField("description",e.target.value)}
            placeholder="AI-generated summary will appear here — or write your own…"
            style={{...modalInputStyle,resize:"vertical",lineHeight:1.6}}/>
          {aiSummaryDone&&(
            <div style={{fontFamily:FF,fontSize:11,color:C.kangkong600,marginTop:5,display:"flex",alignItems:"center",gap:4}}>
              <IcoCheck size={11} color={C.kangkong500}/> AI-generated — feel free to edit before saving
            </div>
          )}
          {aiSummaryError&&(
            <div style={{fontFamily:FF,fontSize:11,color:C.tomato600,marginTop:5,background:C.tomato50,border:"1px solid "+C.tomato200,borderRadius:DS.radius.md,padding:"6px 10px"}}>
              AI failed: {aiSummaryError}
            </div>
          )}
        </div>

        {/* ── Section 3: Impact & Link ── */}
        <SectionHeader number="3" title="Impact & link"/>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <ModalField label="Expected Impact" k="impact" ph="e.g. Saves 2 hrs/week" form={form} onChange={setField}/>
          <ModalField label="Demo Link" k="demoLink" ph="https://..." form={form} onChange={setField}/>
        </div>

        {/* Stage selector — 4 tiles */}
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5}}>Starting Stage</label>
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

        {/* Image URL field */}
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:600,color:C.mushroom600,marginBottom:4,textTransform:"uppercase",letterSpacing:0.5}}>Project Image URL <span style={{fontWeight:400,color:C.mushroom400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
          <input type="text" value={form.imageUrl} onChange={e=>setField("imageUrl",e.target.value)}
            placeholder="https://..."
            style={{...modalInputStyle}}
          />
          {form.imageUrl&&(
            <div style={{marginTop:8,borderRadius:DS.radius.lg,overflow:"hidden",border:"1px solid "+C.mushroom200,height:120}}>
              <img src={form.imageUrl} alt="Preview" onError={e=>{e.target.style.display="none"}} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
          )}
        </div>

        {/* AI Duplicate Check — auto-runs on submit */}
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

        {(() => {
          const hasOverlaps = aiOverlapChecked && aiOverlaps?.length > 0;
          const canSubmit = form.name.trim() && !submitting;
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
                : <><IcoAdd size={16} color={C.white}/> Add to Garden</>
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
                {authUser.isGardener&&(
                  <span title="Tends the Garden — promotes seeds, manages stages, oversees the ecosystem" style={{fontFamily:FF,fontSize:11,fontWeight:700,color:C.kangkong900,background:C.kangkong100,borderRadius:DS.radius.full,padding:"2px 10px",cursor:"default"}}>🌿 Gardener</span>
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

// Prototype demo user — auto-logged in on load
const DEMO_USER = {
  email: "demo@sprout.ph",
  displayName: "Demo User",
  photoURL: `https://ui-avatars.com/api/?name=Demo+User&background=1f6e1f&color=fff&size=128`,
  isGardener: false,
  country: "PH",
};

const DEMO_USER_TH = {
  email: "demo@sproutsolutions.io",
  displayName: "Demo User TH",
  photoURL: `https://ui-avatars.com/api/?name=Demo+TH&background=1a5276&color=fff&size=128`,
  isGardener: false,
  country: "TH",
};

const ADMIN_USER = {
  email: "kvirata@sprout.ph",
  displayName: "VK Virata",
  photoURL: `https://ui-avatars.com/api/?name=VK+Virata&background=0e380e&color=d6f0d6&size=128`,
  isGardener: true,
  country: "PH",
};

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

function LoginScreen({onLogin, onSignUp, onReset, onUpdatePassword, initialMode="login", error, loading}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState(initialMode); // "login" | "signup" | "reset" | "newpassword"
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [updateDone, setUpdateDone] = useState(false);

  const isDomainValid = isAllowedEmail(email);

  return (
    <div style={{
      minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg, "+C.kangkong800+" 0%, "+C.kangkong600+" 40%, "+C.kangkong400+" 100%)",
      fontFamily:FF,
    }}>
      {/* Background botanical texture */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",opacity:0.06}}>
        <PlantTree size={400} wilting={false}/>
      </div>

      <div style={{
        background:C.white,borderRadius:DS.radius.xl,padding:"40px 36px",
        width:400,maxWidth:"92vw",boxShadow:DS.shadow.xl,
        border:"1px solid "+C.mushroom200,position:"relative",
        animation:"slideUp 0.4s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{
            width:56,height:56,borderRadius:14,background:C.kangkong800,
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 12px",boxShadow:"0 8px 24px "+C.kangkong800+"50",
          }}>
            <IcoGarden size={28} color={C.kangkong200}/>
          </div>
          <div style={{fontFamily:FF,fontWeight:800,fontSize:22,color:C.mushroom900,lineHeight:1.1}}>Grove</div>
          <div style={{fontFamily:FF,fontSize:11,color:C.kangkong600,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginTop:3}}>by Sprout</div>
        </div>

        {mode==="login" ? (
          <>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:FF,fontSize:22,fontWeight:700,color:C.mushroom900,marginBottom:4}}>Welcome back</div>
              <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>Sign in with your <strong>@sprout.ph</strong> or <strong>@sproutsolutions.io</strong> account</div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Email</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="yourname@sprout.ph"
                style={{
                  width:"100%",padding:"10px 12px",
                  border:"1.5px solid "+(email&&!isDomainValid?C.tomato500:C.mushroom300),
                  borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,
                  color:C.mushroom900,background:C.mushroom50,
                  outline:"none",boxSizing:"border-box",transition:"border-color 0.15s",
                }}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=email&&!isDomainValid?C.tomato500:C.mushroom300}
              />
              {email&&!isDomainValid&&(
                <div style={{fontFamily:FF,fontSize:11,color:C.tomato500,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                  <IcoWarning size={12} color={C.tomato500}/> Only @sprout.ph and @sproutsolutions.io addresses are allowed
                </div>
              )}
            </div>

            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Password</label>
              <input
                type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e=>e.key==="Enter"&&isDomainValid&&password&&onLogin(email,password)}
                style={{
                  width:"100%",padding:"10px 12px",
                  border:"1.5px solid "+C.mushroom300,
                  borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,
                  color:C.mushroom900,background:C.mushroom50,
                  outline:"none",boxSizing:"border-box",
                }}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=C.mushroom300}
              />
            </div>

            {error&&(
              <div style={{
                background:C.tomato100,border:"1px solid "+C.tomato500,
                borderRadius:DS.radius.md,padding:"10px 14px",marginBottom:16,
                fontFamily:FF,fontSize:12,color:C.tomato600,
                display:"flex",alignItems:"center",gap:8,
              }}>
                <IcoWarning size={14} color={C.tomato500}/> {error}
              </div>
            )}

            <button
              onClick={()=>onLogin(email,password)}
              disabled={!isDomainValid||!password||loading}
              style={{
                width:"100%",padding:"11px",
                background:isDomainValid&&password?C.kangkong600:C.mushroom300,
                color:C.white,border:"none",borderRadius:DS.radius.lg,
                cursor:isDomainValid&&password?"pointer":"not-allowed",
                fontFamily:FF,fontSize:13,fontWeight:700,
                boxShadow:isDomainValid&&password?"0 4px 16px "+C.kangkong600+"40":"none",
                transition:"all 0.2s",marginBottom:14,
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>

            <div style={{textAlign:"center",display:"flex",justifyContent:"center",gap:16}}>
              <button onClick={()=>setMode("reset")} style={{
                background:"none",border:"none",cursor:"pointer",
                fontFamily:FF,fontSize:12,color:C.kangkong600,fontWeight:600,
              }}>Forgot password?</button>
              <span style={{fontFamily:FF,fontSize:12,color:C.mushroom300}}>|</span>
              <button onClick={()=>setMode("signup")} style={{
                background:"none",border:"none",cursor:"pointer",
                fontFamily:FF,fontSize:12,color:C.kangkong600,fontWeight:600,
              }}>Create account</button>
            </div>
          </>
        ) : mode==="signup" ? (
          <>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:FF,fontSize:22,fontWeight:700,color:C.mushroom900,marginBottom:4}}>Create account</div>
              <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>Use your <strong>@sprout.ph</strong> or <strong>@sproutsolutions.io</strong> email</div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Work Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="yourname@sprout.ph"
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+(email&&!isDomainValid?C.tomato500:C.mushroom300),borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=email&&!isDomainValid?C.tomato500:C.mushroom300}
              />
              {email&&!isDomainValid&&(
                <div style={{fontFamily:FF,fontSize:11,color:C.tomato500,marginTop:4,display:"flex",alignItems:"center",gap:4}}>
                  <IcoWarning size={12} color={C.tomato500}/> Only @sprout.ph and @sproutsolutions.io addresses are allowed
                </div>
              )}
            </div>

            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+C.mushroom300,borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=C.mushroom300}
              />
            </div>

            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+(confirmPassword&&confirmPassword!==password?C.tomato500:C.mushroom300),borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.kangkong500}
                onBlur={e=>e.target.style.borderColor=confirmPassword&&confirmPassword!==password?C.tomato500:C.mushroom300}
              />
              {confirmPassword&&confirmPassword!==password&&(
                <div style={{fontFamily:FF,fontSize:11,color:C.tomato500,marginTop:4}}>Passwords do not match</div>
              )}
            </div>

            {error&&(
              <div style={{background:C.tomato100,border:"1px solid "+C.tomato500,borderRadius:DS.radius.md,padding:"10px 14px",marginBottom:16,fontFamily:FF,fontSize:12,color:C.tomato600,display:"flex",alignItems:"center",gap:8}}>
                <IcoWarning size={14} color={C.tomato500}/> {error}
              </div>
            )}

            <button
              onClick={()=>onSignUp(email,password)}
              disabled={!isDomainValid||!password||password!==confirmPassword||loading}
              style={{width:"100%",padding:"11px",background:isDomainValid&&password&&password===confirmPassword?C.kangkong600:C.mushroom300,color:C.white,border:"none",borderRadius:DS.radius.lg,cursor:isDomainValid&&password&&password===confirmPassword?"pointer":"not-allowed",fontFamily:FF,fontSize:13,fontWeight:700,transition:"all 0.2s",marginBottom:14}}
            >
              {loading ? "Creating…" : "Create Account"}
            </button>

            <div style={{textAlign:"center"}}>
              <button onClick={()=>{setMode("login");setConfirmPassword("");}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:FF,fontSize:12,color:C.kangkong600,fontWeight:600}}>
                Already have an account? Sign in
              </button>
            </div>
          </>
        ) : mode==="newpassword" ? (
          <>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:FF,fontSize:22,fontWeight:700,color:C.mushroom900,marginBottom:4}}>Set new password</div>
              <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>Choose a new password for your Sprout account</div>
            </div>

            {updateDone ? (
              <div style={{background:C.kangkong50,border:"1px solid "+C.kangkong200,borderRadius:DS.radius.md,padding:"14px",marginBottom:16,textAlign:"center",fontFamily:FF,fontSize:13,color:C.kangkong700}}>
                <IcoCheck size={18} color={C.kangkong500}/><br/>
                Password updated! <button onClick={()=>setMode("login")} style={{background:"none",border:"none",cursor:"pointer",color:C.kangkong600,fontWeight:700,fontFamily:FF,fontSize:13}}>Sign in</button>
              </div>
            ) : (
              <>
                <div style={{marginBottom:14}}>
                  <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>New Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+C.mushroom300,borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>e.target.style.borderColor=C.kangkong500}
                    onBlur={e=>e.target.style.borderColor=C.mushroom300}
                  />
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+(confirmPassword&&confirmPassword!==password?C.tomato500:C.mushroom300),borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}
                    onFocus={e=>e.target.style.borderColor=C.kangkong500}
                    onBlur={e=>e.target.style.borderColor=confirmPassword&&confirmPassword!==password?C.tomato500:C.mushroom300}
                  />
                  {confirmPassword&&confirmPassword!==password&&(
                    <div style={{fontFamily:FF,fontSize:11,color:C.tomato500,marginTop:4}}>Passwords do not match</div>
                  )}
                </div>
                {updateError&&(
                  <div style={{background:C.tomato100,border:"1px solid "+C.tomato500,borderRadius:DS.radius.md,padding:"10px 14px",marginBottom:16,fontFamily:FF,fontSize:12,color:C.tomato600,display:"flex",alignItems:"center",gap:8}}>
                    <IcoWarning size={14} color={C.tomato500}/> {updateError}
                  </div>
                )}
                <button
                  onClick={async()=>{
                    setUpdateError("");
                    const err = await onUpdatePassword(password);
                    if (err) setUpdateError(err);
                    else setUpdateDone(true);
                  }}
                  disabled={!password||password!==confirmPassword}
                  style={{width:"100%",padding:"11px",background:password&&password===confirmPassword?C.kangkong600:C.mushroom300,color:C.white,border:"none",borderRadius:DS.radius.lg,cursor:password&&password===confirmPassword?"pointer":"not-allowed",fontFamily:FF,fontSize:13,fontWeight:700,marginBottom:0}}
                >
                  Update Password
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{marginBottom:20}}>
              <div style={{fontFamily:FF,fontSize:20,fontWeight:700,color:C.mushroom900,marginBottom:4}}>Reset password</div>
              <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>We'll send a reset link to your Sprout inbox</div>
            </div>

            {resetSent ? (
              <div style={{
                background:C.kangkong50,border:"1px solid "+C.kangkong200,
                borderRadius:DS.radius.md,padding:"14px",marginBottom:16,textAlign:"center",
                fontFamily:FF,fontSize:13,color:C.kangkong700,
              }}>
                <IcoCheck size={18} color={C.kangkong500}/><br/>
                Reset link sent! Check your inbox.
              </div>
            ) : (
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontFamily:FF,fontSize:11,fontWeight:700,color:C.mushroom600,marginBottom:5,textTransform:"uppercase",letterSpacing:0.7}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="yourname@sprout.ph"
                  style={{width:"100%",padding:"10px 12px",border:"1.5px solid "+C.mushroom300,borderRadius:DS.radius.lg,fontFamily:FF,fontSize:13,color:C.mushroom900,background:C.mushroom50,outline:"none",boxSizing:"border-box"}}/>
              </div>
            )}

            {resetError&&(
              <div style={{background:C.tomato100,border:"1px solid "+C.tomato500,borderRadius:DS.radius.md,padding:"10px 14px",marginBottom:12,fontFamily:FF,fontSize:12,color:C.tomato600,display:"flex",alignItems:"center",gap:8}}>
                <IcoWarning size={14} color={C.tomato500}/> {resetError}
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setMode("login");setResetSent(false);setResetError("");}} style={{
                flex:1,padding:"10px",background:C.mushroom100,border:"1px solid "+C.mushroom200,
                borderRadius:DS.radius.lg,cursor:"pointer",fontFamily:FF,fontSize:13,color:C.mushroom600,fontWeight:600,
              }}>Back</button>
              {!resetSent&&(
                <button onClick={async()=>{setResetError("");const err=await onReset(email);if(err){setResetError(err);}else{setResetSent(true);}}} disabled={!isDomainValid} style={{
                  flex:2,padding:"10px",background:isDomainValid?C.kangkong600:C.mushroom300,
                  border:"none",borderRadius:DS.radius.lg,cursor:isDomainValid?"pointer":"not-allowed",
                  fontFamily:FF,fontSize:13,color:C.white,fontWeight:700,
                }}>Send Reset Link</button>
              )}
            </div>
          </>
        )}

        <div style={{marginTop:24,paddingTop:16,borderTop:"1px solid "+C.mushroom100,textAlign:"center",fontFamily:FF,fontSize:11,color:C.mushroom400}}>
          Access restricted to <strong>@sprout.ph</strong> and <strong>@sproutsolutions.io</strong> accounts
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

// ── Main App ──────────────────────────────────────────────────────────────────
export default function SproutAIGarden() {
  const [projects, setProjects] = useState([]);
  const [wishes, setWishes]     = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [view, setView]         = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddWish, setShowAddWish] = useState(false);
  const [prefilledWish, setPrefilledWish] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [gardenNav, setGardenNav] = useState({key:0, viewMode:"directory", stageFilter:"All"});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModal, setProfileModal] = useState(null); // null | "profile" | "about"
  const profileDropRef = useRef(null);

  // ── Auth state ────────────────────────────────────────────────────────────
  const [authUser, setAuthUser]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError]   = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Fallback: if onAuthStateChange never fires (e.g. missing env vars), unblock the UI after 5s
    const timeout = setTimeout(() => setAuthLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(timeout);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
        setAuthLoading(false);
        return;
      }
      if (!session) {
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }

      // Immediately unblock the UI using session data
      const domain      = session.user.email.split("@")[1];
      const country     = COUNTRY_MAP[domain] || "PH";
      const displayName = session.user.email.split("@")[0];
      const fallback    = { email: session.user.email, displayName, country, isGardener: false };
      setAuthUser(fallback);
      setAuthLoading(false);

      // Then sync the real profile from DB in the background
      supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()
        .then(({ data: existing }) => {
          if (existing) {
            setAuthUser({ email: existing.email, displayName: existing.display_name, country: existing.country, isGardener: existing.is_gardener, hasDismissedWelcome: existing.has_dismissed_welcome || false });
          } else {
            supabase.from("profiles").insert({
              id: session.user.id, email: session.user.email,
              display_name: displayName, country, is_gardener: false,
            }).catch(e => console.warn("Profile insert error:", e));
          }
        })
        .catch(e => console.warn("Profile select error:", e));
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);
    const domain = email.split("@")[1];
    if (!COUNTRY_MAP[domain]) {
      setAuthError("Only @sprout.ph and @sproutsolutions.io email addresses are allowed.");
      setAuthLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleSignUp = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);
    const domain = email.split("@")[1];
    if (!COUNTRY_MAP[domain]) {
      setAuthError("Only @sprout.ph and @sproutsolutions.io email addresses are allowed.");
      setAuthLoading(false);
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    setAuthLoading(false);
  };

  const handleReset = async (email) => {
    const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? error.message : null;
  };

  const handleUpdatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return error.message;
    setPasswordRecovery(false);
    return null;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    const row = fromProject(withCountry);
    const { data, error } = await supabase.from("projects").insert(row).select().single();
    if (error) { console.error("addProject:", error); return; }
    const saved = toProject(data);
    setProjects(prev => [...prev, saved]);
    if (!authUser?.hasDismissedWelcome) handleDismissWelcomePermanently();
    if (prefilledWish) {
      await supabase.from("wishes").update({ fulfilled_by: saved.name }).eq("id", prefilledWish.id);
      setWishes(prev => prev.map(w => w.id === prefilledWish.id ? {...w, fulfilledBy: saved.name} : w));
      setPrefilledWish(null);
    }
  };

  const handleUpdateProject = async (updated) => {
    const row = fromProject(updated);
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
    let next;
    if (typeof dirOrStage === "string") {
      next = dirOrStage;
    } else {
      const cur = STAGE_ORDER[project.stage];
      next = STAGES[cur + dirOrStage];
    }
    if (!next || next === project.stage) return;
    const newMilestones = [...project.milestones, STAGE_LABELS[next] + " — " + new Date().toLocaleDateString("en-PH", {month:"short", year:"numeric"})];
    setProjects(prev => prev.map(p => p.id === project.id
      ? {...p, stage: next, lastUpdated: 0, milestones: newMilestones}
      : p
    ));
    supabase.from("projects").update({ stage: next, milestones: newMilestones, last_updated: new Date().toISOString() }).eq("id", project.id)
      .then(({ error }) => { if (error) console.error("handleMoveStage:", error); });
  };

  // ── Wish mutations ────────────────────────────────────────────────────────

  const handleAddWish = async (wish) => {
    const row = fromWish(wish);
    const { data, error } = await supabase.from("wishes").insert(row).select().single();
    if (error) { console.error("handleAddWish:", error); return; }
    setWishes(prev => [toWish(data), ...prev]);
    if (!authUser?.hasDismissedWelcome) handleDismissWelcomePermanently();
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

  const handleClaimWish = (wishId) => {
    const claimedAt = new Date().toLocaleDateString("en-PH", {month:"short", day:"numeric", year:"numeric"});
    setWishes(prev => prev.map(w => w.id !== wishId ? w : {
      ...w, claimedBy: authUser.displayName, claimedByEmail: authUser.email, claimedAt,
    }));
    supabase.from("wishes").update({ claimed_by: authUser.displayName, claimed_by_email: authUser.email, claimed_at: claimedAt }).eq("id", wishId)
      .then(({ error }) => { if (error) console.error("handleClaimWish:", error); });
  };
  const handleSelectProject = p => { setSelected(p); if(view==="dashboard") setView("garden"); };
  const handlePromoteWish = w => { setPrefilledWish(w); setShowForm(true); };

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
        <LoginScreen onLogin={handleLogin} onSignUp={handleSignUp} onReset={handleReset} onUpdatePassword={handleUpdatePassword} initialMode={passwordRecovery ? "newpassword" : "login"} error={authError} loading={authLoading}/>
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

  const NAV_TABS = [
    {id:"dashboard", label:"Overview",  Icon:IcoOverview},
    {id:"garden",    label:"Garden",    Icon:IcoGarden},
    {id:"wishlist",  label:"Wishlist",  Icon:IcoWishlist},
  ];

  return (
    <div style={{fontFamily:FF,background:C.mushroom100,minHeight:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ── Top Navbar ── */}
      <div style={{padding:"0 24px",zIndex:30,position:"relative",background:C.white,borderBottom:"1px solid "+C.mushroom200,display:"flex",alignItems:"center",justifyContent:"space-between",height:56,flexShrink:0,boxShadow:DS.shadow.sm}}>

        <button onClick={()=>{setView("dashboard");setSelected(null);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center"}}><SproutLogo/></button>

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
              {authUser.isGardener&&<span style={{fontFamily:FF,fontSize:9,fontWeight:800,background:C.mango100,color:C.mango600,borderRadius:DS.radius.full,padding:"1px 6px",letterSpacing:0.5,textTransform:"uppercase",flexShrink:0}}>Gardener</span>}
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
          {view==="dashboard" && <ExecutiveDashboard projects={projects} wishes={wishes} onSelectProject={handleSelectProject} onNavigateGarden={(vm,sf)=>{setGardenNav(prev=>({key:prev.key+1,viewMode:vm,stageFilter:sf}));setView("garden");}} onNavigateWishlist={()=>setView("wishlist")}/>}
          {view==="garden"    && <GardenHub key={gardenNav.key} initialViewMode={gardenNav.viewMode} initialStageFilter={gardenNav.stageFilter} projects={projects} wishes={wishes} selected={selected} setSelected={setSelected} authUser={authUser} onClaimWish={handlePromoteWish} onMoveStage={handleMoveStage} onWishClaim={handleClaimWish} onUpdateWish={handleUpdateWish}/>}
          {view==="wishlist"  && <WishlistView wishes={wishes} projects={projects} onClaim={handlePromoteWish} authUser={authUser} onUpvote={handleUpvote} onAddWish={handleAddWish} onWishClaim={handleClaimWish} onUpdateWish={handleUpdateWish} showAddWish={showAddWish} setShowAddWish={setShowAddWish}/>}
        </div>

        {selected && (
          <DetailPanel
            project={selected} allProjects={projects}
            onClose={()=>setSelected(null)} onNote={addNote} setSelected={setSelected}
            authUser={authUser} onEdit={p=>{setEditingProject(p);setSelected(null);}}
          />
        )}
      </div>

      {showForm && (
        <AddProjectModal
          onClose={()=>{setShowForm(false);setPrefilledWish(null);}}
          onAdd={addProject} projects={projects} prefill={prefilledWish}
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

      {authUser && !authUser.hasDismissedWelcome && !welcomeSeen && !dataLoading && (
        <WelcomeModal
          onExplore={() => setWelcomeSeen(true)}
          onDismissPermanently={handleDismissWelcomePermanently}
          onPlantSeed={() => { setWelcomeSeen(true); setView("wishlist"); setShowAddWish(true); }}
          onAddToGarden={() => { setWelcomeSeen(true); setView("garden"); setShowForm(true); }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto+Mono&display=swap');
        @keyframes sway{0%,100%{transform:translate(-50%,-50%) rotate(-0.8deg)}50%{transform:translate(-50%,-50%) rotate(0.8deg)}}
        @keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
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
