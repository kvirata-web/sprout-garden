// Pure utility functions — no React, no Supabase, no side effects

export const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","has","have","had",
  "it","its","this","that","these","those","we","our","their","which",
  "will","can","may","do","does","did","not","no","as","up","out","so",
  "all","also","just","than","then","when","where","who","how","what",
  "each","they","them","your","more","some","into","over","used","help",
]);

export const extractKeywords = (text) => {
  if (!text) return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );
};

export const countOverlap = (a, b) => {
  const ka = extractKeywords(a);
  const kb = extractKeywords(b);
  let n = 0;
  for (const w of ka) { if (kb.has(w)) n++; }
  return n;
};

export const getRelatedProjects = (project, projects) => {
  return projects
    .filter(p => p.id !== project.id && p.country === project.country)
    .map(p => {
      let score = 0;
      const reasons = [];

      if (countOverlap(project.description, p.description) >= 2) {
        score += 3;
        reasons.push("Similar description");
      }
      if (countOverlap(project.name, p.name) >= 1) {
        score += 1;
        reasons.push("Similar name");
      }
      if (project.builtFor && p.builtFor === project.builtFor) {
        score += 1;
        reasons.push("Same team");
      }
      const projSources = project.dataSources || [];
      const pSources    = p.dataSources || [];
      if (projSources.length && pSources.some(s => projSources.includes(s))) {
        score += 3;
        reasons.push("Shared data sources");
      }

      return {...p, score, matchReason: reasons.join(" · ")};
    })
    .filter(p => p.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
};

export const getActivityFeed = (projects, wishes) => {
  const events = [];
  for (const p of projects) {
    const mils = p.milestones || [];
    const last = (mils[mils.length - 1] || "").toLowerCase();
    const builder = p.builder || p.builderEmail;
    let type, text;
    if (p.stage === "thriving") {
      type = "thriving";
      text = `${p.name} moved to Thriving`;
    } else if (p.stage === "nursery" || last.includes("nursery")) {
      type = "nursery";
      text = `${p.name} submitted to Nursery by ${builder}`;
    } else if (last.includes("approved")) {
      type = "approved";
      text = `${p.name} approved, now in Sprout`;
    } else if (p.stage === "bloom") {
      type = "bloom";
      text = `${p.name} moved to Bloom`;
    } else if (p.stage === "sprout") {
      type = "sprout";
      text = `${p.name} moved to Sprout`;
    } else {
      type = "added";
      text = `${p.name} added by ${builder}`;
    }
    events.push({ type, text, age: p.lastUpdated, id: "p" + p.id });
  }
  for (const w of wishes) {
    let type, text;
    if (w.fulfilledBy) {
      type = "fulfilled";
      text = `Seed fulfilled: ${w.title}`;
    } else if (w.claimedBy) {
      type = "claimed";
      text = `${w.title} claimed by ${w.claimedBy}`;
    } else {
      type = "seed";
      text = `New Seed: ${w.title} — ${(w.upvoters || []).length} upvotes`;
    }
    events.push({ type, text, age: w.createdDaysAgo, id: w.id });
  }
  // age = "days ago" integer; ascending sort (lowest age first) = newest events first
  return events.sort((a, b) => a.age - b.age).slice(0, 10);
};
