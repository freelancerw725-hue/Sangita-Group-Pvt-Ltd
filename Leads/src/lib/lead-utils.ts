import { LeadFilters, LeadRecord, LeadScore, SearchHistoryEntry, SortBy, YouTubeChannelCandidate } from "@/lib/types";

const statusPriority: Record<LeadScore, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export function normalizeKeywords(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : input.split(/[\n,;,]+/g);
  return [...new Set(raw.map((value) => value.trim()).filter(Boolean))];
}

export function parsePositiveNumber(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

export function getAgeInYears(publishedAt: string): number {
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0;
  const diffMs = Date.now() - published;
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
}

export function passesAgeFilter(ageInYears: number, channelAge?: LeadFilters["channelAge"]): boolean {
  if (!channelAge || channelAge === "any") return true;
  switch (channelAge) {
    case "under1":
      return ageInYears < 1;
    case "oneToThree":
      return ageInYears >= 1 && ageInYears < 3;
    case "threeToFive":
      return ageInYears >= 3 && ageInYears < 5;
    case "overFive":
      return ageInYears >= 5;
    default:
      return true;
  }
}

export function scoreLead(subscribers: number): LeadScore {
  if (subscribers >= 100_000) return "High";
  if (subscribers >= 20_000) return "Medium";
  return "Low";
}

export function calculateLeadScore(subscribers: number, websiteAvailable: boolean, emailAvailable: boolean, ageInYears: number) {
  let score = 0;
  score += Math.min(50, Math.floor(subscribers / 2000));
  score += websiteAvailable ? 20 : 0;
  score += emailAvailable ? 20 : 0;
  score += Math.min(10, Math.floor(ageInYears));
  return Math.min(100, Math.max(0, score));
}

export function normalizeText(value: string): string {
  return value.toLowerCase().trim();
}

export function extractContactFields(description: string): {
  website: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  telegram: string;
  appAvailable: boolean;
  websiteAvailable: boolean;
} {
  const text = description || "";
  const urls = [...text.matchAll(/https?:\/\/[^\s)]+/gi)].map((match) => match[0]);
  const website = urls.find((url) => !/youtube\.com|youtu\.be|instagram\.com|facebook\.com|t\.me|telegram\.me|play\.google\.com|apps\.apple\.com/i.test(url)) ?? "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,4}\d{3,4}/)?.[0] ?? "";
  const instagram = urls.find((url) => /instagram\.com/i.test(url)) ?? "";
  const facebook = urls.find((url) => /facebook\.com/i.test(url)) ?? "";
  const telegram = urls.find((url) => /t\.me|telegram\.me/i.test(url)) ?? "";
  const appAvailable = /play\.google\.com|apps\.apple\.com|app store|google play/i.test(text);
  const websiteAvailable = Boolean(website);

  return { website, email, phone, instagram, facebook, telegram, appAvailable, websiteAvailable };
}

export function includesKeywordMatch(channel: YouTubeChannelCandidate | LeadRecord, keywordFilter?: string): boolean {
  if (!keywordFilter) return true;
  const needle = normalizeText(keywordFilter);
  const haystack = normalizeText([
    channel.channelName,
    channel.description,
    "website" in channel ? channel.website : "",
    "searchKeyword" in channel ? channel.searchKeyword : "",
  ].join(" "));
  return haystack.includes(needle);
}

export function filterCandidates<T extends { subscribers: number; country: string; description: string; ageInYears: number; channelName: string }>(
  items: T[],
  filters: LeadFilters,
): T[] {
  return items.filter((item) => {
    if (filters.minSubscribers !== undefined && item.subscribers < filters.minSubscribers) return false;
    if (filters.maxSubscribers !== undefined && item.subscribers > filters.maxSubscribers) return false;
    if (filters.country && filters.country.trim() && !normalizeText(item.country).includes(normalizeText(filters.country))) return false;
    if (filters.keywordFilter && !normalizeText([item.channelName, item.description].join(" ")).includes(normalizeText(filters.keywordFilter))) return false;
    if (!passesAgeFilter(item.ageInYears, filters.channelAge)) return false;
    return true;
  });
}

export function sortCandidates<T extends { subscribers: number; viewCount: number; videoCount: number }>(items: T[], sortBy: SortBy = "subscribers"): T[] {
  const sorted = [...items];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case "views":
        return b.viewCount - a.viewCount;
      case "videos":
        return b.videoCount - a.videoCount;
      case "subscribers":
      default:
        return b.subscribers - a.subscribers;
    }
  });
  return sorted;
}

export function buildStats(leads: LeadRecord[]) {
  return {
    totalLeads: leads.length,
    newLeads: leads.filter((lead) => lead.leadStatus === "New").length,
    contacted: leads.filter((lead) => lead.leadStatus === "Contacted").length,
    replied: leads.filter((lead) => lead.leadStatus === "Replied").length,
    highPotential: leads.filter((lead) => statusPriority[lead.leadScore] === 3).length,
  };
}

export function mergeAndDedupeLeads(existing: LeadRecord[], incoming: LeadRecord[]): { merged: LeadRecord[]; skippedDuplicates: number } {
  const seen = new Set(existing.map((lead) => lead.channelId));
  const merged = [...existing];
  let skippedDuplicates = 0;
  for (const lead of incoming) {
    if (seen.has(lead.channelId)) {
      skippedDuplicates += 1;
      continue;
    }
    seen.add(lead.channelId);
    merged.push(lead);
  }
  return { merged, skippedDuplicates };
}

export function dedupeHistory(entries: SearchHistoryEntry[]): SearchHistoryEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.searchKeyword}|${entry.searchedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Indian state inference from search keyword/location context
const STATE_KEYWORDS: Record<string, string[]> = {
  "Bihar": ["bihar", "patna", "gaya", "bhagalpur", "muzaffarpur", "darbhanga", "purnia", "araria", "kishanganj", "katihar", "madhepura", "saharsa", "supaul", "madhubani", "sitamarhi", "sheohar", "east champaran", "west champaran", "gopalganj", "siwan", "saran", "vaishali", "samastipur", "begusarai", "khagaria", "banka", "munger", "lakhisarai", "sheikhpura", "nawada", "jamui", "jehanabad", "arwal", "bhojpur", "buxar", "kaimur", "rohtas", "aurangabad"],
  "Jharkhand": ["jharkhand", "ranchi", "jamshedpur", "dhanbad", "bokaro", "deoghar", "hazaribagh", "giridih", "ramgarh", "koderma", "chatra", "latehar", "palamu", "garhwa", "lohardaga", "gumla", "simdega", "khunti", "west singhbhum", "east singhbhum", "saraikela", "pakur", "godda", "sahebganj", "dumka", "jamtara"],
  "Uttar Pradesh": ["uttar pradesh", "up ", "lucknow", "kanpur", "agra", "varanasi", "prayagraj", "meerut", "ghaziabad", "noida", "gorakhpur", "bareilly", "moradabad", "aligarh", "saharanpur", "firozabad", "jhansi", "muzaffarnagar", "mathura", "rampur", "shahjahanpur", "ayodhya", "faizabad", "basti", "gonda", "bahraich", "sitapur", "hardoi", "unnao", "raebareli", "amethi", "sultanpur", "jaunpur", "azamgarh", "mau", "ballia", "deoria", "kushinagar", "maharajganj", "siddharthnagar", "balrampur", "shravasti", "lakhimpur kheri", "pilibhit", "budaun", "etah", "kasganj", "farrukhabad", "kannauj", "etawah", "auraiya", "kanpur dehat", "fatehpur", "pratapgarh", "kaushambi", "chitrakoot", "banda", "hamirpur", "mahoba", "jalaun", "orai", "lalitpur", "jhansi"],
  "Delhi": ["delhi", "new delhi", "ncr", "gurugram", "gurgaon", "faridabad", "ghaziabad", "noida", "greater noida", "dwarka", "rohini", "pitampura", "janakpuri", "karol bagh", "connaught place", "south delhi", "north delhi", "east delhi", "west delhi", "central delhi"],
  "Maharashtra": ["maharashtra", "mumbai", "pune", "nagpur", "nashik", "aurangabad", "solapur", "amravati", "kolhapur", "sangli", "satara", "ratnagiri", "sindhudurg", "thane", "raigad", "palghar", "beed", "latur", "osmanabad", "nanded", "parbhani", "hingoli", "buldhana", "akola", "washim", "yavatmal", "wardha", "bhandara", "gondia", "chandrapur", "gadchiroli", "dhule", "nandurbar", "jalgaon", "ahmednagar"],
  "Karnataka": ["karnataka", "bangalore", "bengaluru", "mysore", "hubli", "dharwad", "mangalore", "belgaum", "gulbarga", "davangere", "bellary", "bijapur", "bidar", "raichur", "koppal", "gadag", "haveri", "uttara kannada", "dakshina kannada", "udupi", "chikmagalur", "hassan", "kodagu", "mandya", "chitradurga", "tumkur", "kolar", "chikkaballapur", "ramanagara"],
  "Tamil Nadu": ["tamil nadu", "chennai", "coimbatore", "madurai", "tiruchirappalli", "salem", "erode", "tirupur", "vellore", "tirunelveli", "thoothukudi", "dindigul", "virudhunagar", "sivaganga", "ramanathapuram", "pudukkottai", "thanjavur", "nagapattinam", "tirovarur", "cuddalore", "villupuram", "kanchipuram", "tiruvallur", "krishnagiri", "dharmapuri", "namakkal", "karur", "perambalur", "ariyalur", "the nilgiris"],
  "West Bengal": ["west bengal", "kolkata", "howrah", "north 24 parganas", "south 24 parganas", "hooghly", "purba bardhaman", "paschim bardhaman", "north dinajpur", "south dinajpur", "malda", "murshidabad", "birbhum", "bankura", "purulia", "paschim medinipur", "purba medinipur", "jhargram", "alipurduar", "cooch behar", "darjeeling", "kalimpong"],
  "Gujarat": ["gujarat", "ahmedabad", "surat", "vadodara", "rajkot", "bhavnagar", "jamnagar", "junagadh", "gandhinagar", "anand", "kheda", "panchmahal", "dahod", "vadsar", "navsari", "valsad", "dang", "tapi", "surendranagar", "morbi", "botad", "gir somnath", "devbhumi dwarka", "chhota udepur", "mahisagar", "aravalli"],
  "Rajasthan": ["rajasthan", "jaipur", "jodhpur", "kota", "bikaner", "ajmer", "udaipur", "bhilwara", "alwar", "bharatpur", "sikar", "pali", "nagaur", "tonk", "sawai madhopur", "dausa", "karauli", "dholpur", "bundi", "jhalawar", "baran", "chittorgarh", "pratapgarh", "rajasamand", "dungarpur", "banswara", "sirohi", "jaisalmer", "barmer", "jalore", "hanumangarh", "sri ganganagar"],
  "Madhya Pradesh": ["madhya pradesh", "bhopal", "indore", "gwalior", "jabalpur", "ujjain", "sagar", "dewas", "satna", "ratlam", "rewa", "katni", "singrauli", "shahdol", "anuppur", "umaria", "dindori", "mandla", "balaghat", "seoni", "chhindwara", "betul", "hoshangabad", "harda", "khandwa", "burhanpur", "khargone", "barwani", "jhabua", "dhar", "indore", "mandsaur", "neemuch", "ratlam", "ujjain", "shajapur", "dewas", "sehora", "vidisha", "raisen", "seoni", "narsinghpur", "harda", "hoshangabad"],
  "Punjab": ["punjab", "ludhiana", "amritsar", "jalandhar", "patiala", "bathinda", "mohali", "firozpur", "batala", "pathankot", "hoshiarpur", "gurdaspur", "kapurthala", "nawanshahr", "fatehgarh sahib", "moga", "muktsar", "faridkot", "barnala", "sangrur", "manasa", "ropar", "fatehgarh sahib"],
  "Haryana": ["haryana", "faridabad", "gurugram", "gurgaon", "hisar", "rohtak", "panipat", "karnal", "sonipat", "yamunanagar", "panchkula", "bhiwani", "sirsa", "fatehabad", "jind", "kaithal", "kurukshetra", "ambala", "mahendragarh", "rewari", "jhajjar", "palwal", "nuh", "charkhi dadri"],
  "Odisha": ["odisha", "orissa", "bhubaneswar", "cuttack", "rourkela", "sambalpur", "puri", "balasore", "berhampur", "baripada", "bhadrak", "kendrapara", "jagatsinghpur", "jaipur", "jajpur", "dhenkanal", "angul", "subarnapur", "bolangir", "nuapada", "kalahandi", "rayagada", "nabarangpur", "koraput", "malkangiri", "gaanjam", "gajapati", "kandhamal", "boudh", "sonepur", "deogarh", "sundargarh", "jharsuguda", "bargarh"],
  "Kerala": ["kerala", "thiruvananthapuram", "kochi", "kozhikode", "thrissur", "kollam", "palakkad", "alappuzha", "malappuram", "kannur", "kasaragod", "wayanad", "idukki", "kottayam", "pathanamthitta", "ernakulam"],
  "Assam": ["assam", "guwahati", "silchar", "dibrugarh", "jorhat", "nagaon", "tepur", "tinsukia", "golaghat", "sivasagar", "lakhimpur", "dhemaji", "karbi anglong", "diima hasao", "hajoi", "bongaigaon", "chirang", "baksa", "udalguri", "nalbari", "barpeta", "goalpara", "dhubri", "south salmara", "hajoi", "west karbi anglong"],
  "Chhattisgarh": ["chhattisgarh", "raipur", "bhilai", "bilaspur", "korba", "raigarh", "durg", "rajnandgaon", "kanker", "bastar", "dantewada", "sukma", "bijapur", "narayanpur", "kondagaon", "balod", "bemetara", "baloda bazar", "gariaband", "mahasamund", "dhamtari", "kabeerdham", "gaurella", "manendragarh", "sakti", "sarangarh"],
  "Telangana": ["telangana", "hyderabad", "warangal", "nizamabad", "khammam", "karimnagar", "ramagundam", "mahbubnagar", "nalgonda", "suryapet", "jangaon", "yadadri bhuvanagiri", "medak", "sangareddy", "siddipet", "jogulamba gadwal", "wanaparthy", "nagarkurnool", "narayanpet", "vikarabad", "kamareddy", "medchal", "shamshabad", "rangareddy"],
  "Andhra Pradesh": ["andhra pradesh", "visakhapatnam", "vijayawada", "guntur", "nellore", "kurnool", "rajahmundry", "kakinada", "tirupati", "anantapur", "kadapa", "chittoor", "srikakulam", "vizianagaram", "east godavari", "west godavari", "krishna", "guntur", "prakasam", "spsr nellore", "y.s.r."],
  "Himachal Pradesh": ["himachal pradesh", "shimla", "dharamshala", "solan", "mandi", "kullu", "kinnaur", "lahul", "spiti", "chamba", "kangra", "hamirpur", "una", "bilaspur", "sirmaur"],
  "Uttarakhand": ["uttarakhand", "dehradun", "haridwar", "roorkee", "haldwani", "rudrapur", "kashipur", "nainital", "almora", "pithoragarh", "bageshwar", "champawat", "udham singh nagar", "pauri garhwal", "tehri garhwal", "chamoli", "rudraprayag", "uttarkashi"],
  "Goa": ["goa", "panaji", "margao", "vasco", "mapusa", "ponda", "bicholim", "sanguem", "quepem", "canacona", "pernem", "bardez", "tiswadi", "mormugao", "salcete"],
  "Other": []
};

export function inferStateFromKeyword(searchKeyword: string): string {
  if (!searchKeyword) return "Other";
  const normalized = searchKeyword.toLowerCase().trim();
  
  // Check each state's keywords
  for (const [state, keywords] of Object.entries(STATE_KEYWORDS)) {
    if (state === "Other") continue;
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return state;
      }
    }
  }
  
  // Check for "India" but no specific state
  if (normalized.includes("india") && !normalized.includes("indian")) {
    return "Other";
  }
  
  return "Other";
}
