// Get email data from Gmail Trigger
const emailData = $input.first().json;

// Gmail Trigger returns capitalized field names
let emailBodyHtml = emailData.html || emailData.Html || '';
let emailBodyText = emailData.text || emailData.textPlain || emailData.Text || emailData.TextPlain ||
  emailData.snippet || emailData.Snippet || '';
const emailSubject = emailData.subject || emailData.Subject || '';
const senderEmail = emailData.from || emailData.From || '';

// Preprocess: Convert HTML breaks to newlines if using HTML
if (emailBodyHtml && emailBodyText.length < 500) {
  // If plain text is short, use HTML and convert to plain text
  emailBodyText = emailBodyHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

// DEBUG: Log what we receive
console.log('=== EMAIL PARSING DEBUG ===');
console.log('Email has full text:', !!(emailData.text || emailData.textPlain));
console.log('Email text length:', emailBodyText.length);
console.log('First 500 chars:', emailBodyText.substring(0, 500));
console.log('Manager section:', emailBodyText.substring(emailBodyText.indexOf('Manager'), emailBodyText.indexOf('Manager') + 100));

// Helper: Extract text after a label (IMPROVED to handle concatenated text)
function extractField(text, label) {
  const cleanLabel = label.replace(/[*_]/g, '');

  // First try: Label with colon/dash on same line (most common format)
  // Use word boundary to avoid matching "Manager" inside "Account Manager"
  let regex = new RegExp('\\b' + cleanLabel + '\\s*[:\\-]\\s*([^\\n\\r]+)', 'i');
  let match = text.match(regex);

  if (match) {
    let value = match[1].trim();
    // Clean up HTML tags, markdown formatting (asterisks)
    value = value.replace(/<[^>]+>/g, '').replace(/\*+/g, '').trim();
    // Collapse all whitespace (including newlines, tabs, multiple spaces) into single spaces
    value = value.replace(/\s+/g, ' ').trim();
    // Fix broken words: single capital letter followed by lowercase letters (e.g., "V ictoria" -> "Victoria")
    value = value.replace(/\b([A-Z])\s+([a-z])/g, '$1$2');
    console.log(`Found ${label} (inline format):`, value);
    return value;
  }

  // Second try: Label on one line, value on next line (old format with asterisks)
  regex = new RegExp('\\*?' + cleanLabel + '\\*?\\s*\\n\\s*([^\\n\\r*]+)', 'i');
  match = text.match(regex);

  if (match) {
    let value = match[1].trim();
    // Clean up HTML tags, markdown formatting (asterisks), and extra whitespace
    value = value.replace(/<[^>]+>/g, '').replace(/\*+/g, '').replace(/\s+/g, ' ').trim();
    // Fix broken words: single capital letter followed by lowercase letters (e.g., "V ictoria" -> "Victoria")
    value = value.replace(/\b([A-Z])\s+([a-z])/g, '$1$2');
    console.log(`Found ${label} (newline format):`, value);
    return value;
  }

  console.log(`Could not find ${label}`);
  return null;
}

// === EXTRACT FIELDS FROM EMAIL BODY ===
let fullName = extractField(emailBodyText, 'Full Legal Name');
let givenName = extractField(emailBodyText, 'Given Name');
let surname = extractField(emailBodyText, 'Surname');
let preferredName = extractField(emailBodyText, 'Preferred Name');
const personalEmail = extractField(emailBodyText, 'Personal Email Address');
const manager = extractField(emailBodyText, 'Manager');
let position = extractField(emailBodyText, 'Position');
let department = extractField(emailBodyText, 'Department');
let country = extractField(emailBodyText, 'Country');

console.log('Extracted department:', department);
console.log('Extracted position:', position);

// === EXTRACT FROM SUBJECT LINE (FALLBACK) ===
// Parse subject - handles both formats:
// "New Hire Onboarding: Name - Position - Country"
// "New Hire Onboarding: Name - Position, Country"
let subjectMatch = emailSubject.match(/New Hire Onboarding:\s*([^-]+)\s*-\s*([^-,]+)\s*-\s*(.+)/i);
if (!subjectMatch) {
  // Try format with comma: "Name - Position, Country"
  subjectMatch = emailSubject.match(/New Hire Onboarding:\s*([^-]+)\s*-\s*(.+)/i);
  if (subjectMatch) {
    const namePart = subjectMatch[1].trim();
    const positionCountry = subjectMatch[2].trim();

    // Split position and country by comma if present
    const commaIndex = positionCountry.indexOf(',');
    if (commaIndex > 0) {
      const subjectPosition = positionCountry.slice(0, commaIndex).trim();
      const subjectCountry = positionCountry.slice(commaIndex + 1).trim();
      subjectMatch = [subjectMatch[0], namePart, subjectPosition, subjectCountry];
    } else {
      // No comma, treat whole thing as position
      subjectMatch = [subjectMatch[0], namePart, positionCountry, ''];
    }
  }
}

// Use subject data as fallback
if (subjectMatch) {
  if (!fullName && !givenName) fullName = subjectMatch[1].trim();
  if (!position) position = subjectMatch[2].trim();
  if (!country && subjectMatch[3]) country = subjectMatch[3].trim();
}

// === VALIDATE WE HAVE REQUIRED DATA ===
if (!fullName && !givenName) {
  throw new Error('Could not extract name from email');
}

// === PARSE NAME INTO FIRST AND LAST ===
let firstName, lastName;

// First, determine the base last name from Full Legal Name or Given Name/Surname
let baseLegalFirstName = '';
let baseLegalLastName = '';

if (givenName && surname) {
  // Separate fields provided
  baseLegalFirstName = givenName;
  baseLegalLastName = surname;
} else if (fullName) {
  // Parse Full Legal Name
  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    baseLegalFirstName = words[0];
    baseLegalLastName = words[0];
  } else if (words.length === 2) {
    baseLegalFirstName = words[0];
    baseLegalLastName = words[1];
  } else if (words.length === 3) {
    // 3 words - check for compound surnames
    const secondToLast = words[words.length - 2].toLowerCase();

    if (secondToLast === 'ben' || secondToLast === 'bat') {
      // Hebrew patronymic: "Ofek Ben Shabat" -> First: "Ofek", Last: "Ben Shabat"
      baseLegalFirstName = words[0];
      baseLegalLastName = words.slice(1).join(' ');
    }
    else if (['de', 'del', 'da', 'do', 'dos', 'das', 'di', 'van', 'von', 'y'].includes(secondToLast)) {
      // Surname particles: "Juan de la Cruz" -> First: "Juan", Last: "de la Cruz"
      baseLegalFirstName = words[0];
      baseLegalLastName = words.slice(1).join(' ');
    }
    else {
      // Default for 3 words: First + Middle + Last (only last word is surname)
      // "Ana Lia Faustini" -> First: "Ana Lia", Last: "Faustini"
      baseLegalFirstName = words.slice(0, -1).join(' ');
      baseLegalLastName = words[words.length - 1];
    }
  } else {
    // 4+ words - check for compound surnames
    const secondToLast = words[words.length - 2].toLowerCase();

    if (secondToLast === 'ben' || secondToLast === 'bat') {
      // Hebrew patronymic: "Ofek Ben Shabat" -> First: "Ofek", Last: "Ben Shabat"
      baseLegalFirstName = words.slice(0, -2).join(' ');
      baseLegalLastName = words.slice(-2).join(' ');
    }
    else if (['de', 'del', 'da', 'do', 'dos', 'das', 'di', 'van', 'von', 'y'].includes(secondToLast)) {
      // Surname particles: "Juan Carlos de la Cruz" -> First: "Juan Carlos", Last: "de la Cruz"
      baseLegalFirstName = words.slice(0, -3).join(' ');
      baseLegalLastName = words.slice(-3).join(' ');
    }
    else {
      // Default for 4+ words: Last 2 words as surname (Spanish/Portuguese double surnames)
      baseLegalFirstName = words.slice(0, -2).join(' ');
      baseLegalLastName = words.slice(-2).join(' ');
    }
  }
}

// Now apply preferred name logic
if (preferredName && preferredName.trim() !== '') {
  // Preferred name exists - check if it includes last name
  const preferredWords = preferredName.trim().split(/\s+/);

  if (preferredWords.length === 1) {
    // Single word preferred name - use it as first name, keep legal last name
    firstName = preferredName;
    lastName = baseLegalLastName;
  } else {
    // Multi-word preferred name - might include last name
    // Check if the last word matches the legal last name
    const preferredLastWord = preferredWords[preferredWords.length - 1];

    if (preferredLastWord.toLowerCase() === baseLegalLastName.toLowerCase()) {
      // Preferred name includes the last name
      firstName = preferredWords.slice(0, -1).join(' ');
      lastName = preferredLastWord;
    } else {
      // Preferred name doesn't include last name - treat whole thing as first name
      firstName = preferredName;
      lastName = baseLegalLastName;
    }
  }
} else {
  // No preferred name - use legal names
  firstName = baseLegalFirstName;
  lastName = baseLegalLastName;
}

// === GENERATE EMAIL ADDRESSES ===
const normalizeForEmail = (name) => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
};

// Use only the FIRST WORD of firstName for email generation
// This handles cases like "Victoria Briones" -> "victoria@spines.com" not "victoriabriones@spines.com"
const firstNameFirstWord = firstName.trim().split(/\s+/)[0];
const primaryEmail = normalizeForEmail(firstNameFirstWord) + '@spines.com';
const lastInitial = normalizeForEmail(lastName).charAt(0);
const alternativeEmail = lastInitial ?
  normalizeForEmail(firstNameFirstWord) + '.' + lastInitial + '@spines.com' :
  normalizeForEmail(firstNameFirstWord) + '@spines.com';

// === MAP COUNTRY TO USAGE LOCATION ===
const countryMap = {
  'afghanistan': 'AF', 'af': 'AF', 'albania': 'AL', 'al': 'AL', 'algeria': 'DZ', 'dz': 'DZ',
  'andorra': 'AD', 'ad': 'AD', 'angola': 'AO', 'ao': 'AO', 'argentina': 'AR', 'ar': 'AR',
  'armenia': 'AM', 'am': 'AM', 'australia': 'AU', 'au': 'AU', 'austria': 'AT', 'at': 'AT',
  'azerbaijan': 'AZ', 'az': 'AZ', 'bahrain': 'BH', 'bh': 'BH', 'bangladesh': 'BD', 'bd': 'BD',
  'belarus': 'BY', 'by': 'BY', 'belgium': 'BE', 'be': 'BE', 'belize': 'BZ', 'bz': 'BZ',
  'benin': 'BJ', 'bj': 'BJ', 'bhutan': 'BT', 'bt': 'BT', 'bolivia': 'BO', 'bo': 'BO',
  'bosnia and herzegovina': 'BA', 'bosnia': 'BA', 'ba': 'BA', 'botswana': 'BW', 'bw': 'BW',
  'brazil': 'BR', 'br': 'BR', 'brunei': 'BN', 'bn': 'BN', 'bulgaria': 'BG', 'bg': 'BG',
  'burkina faso': 'BF', 'bf': 'BF', 'burundi': 'BI', 'bi': 'BI', 'cambodia': 'KH', 'kh': 'KH',
  'cameroon': 'CM', 'cm': 'CM', 'canada': 'CA', 'ca': 'CA', 'cape verde': 'CV', 'cv': 'CV',
  'central african republic': 'CF', 'cf': 'CF', 'chad': 'TD', 'td': 'TD', 'chile': 'CL', 'cl': 'CL',
  'china': 'CN', 'cn': 'CN', 'colombia': 'CO', 'co': 'CO', 'comoros': 'KM', 'km': 'KM',
  'congo': 'CG', 'cg': 'CG', 'drc': 'CD', 'cd': 'CD', 'costa rica': 'CR', 'cr': 'CR',
  'croatia': 'HR', 'hr': 'HR', 'cuba': 'CU', 'cu': 'CU', 'cyprus': 'CY', 'cy': 'CY',
  'czech republic': 'CZ', 'czechia': 'CZ', 'cz': 'CZ', 'denmark': 'DK', 'dk': 'DK',
  'djibouti': 'DJ', 'dj': 'DJ', 'dominican republic': 'DO', 'do': 'DO', 'ecuador': 'EC', 'ec': 'EC',
  'egypt': 'EG', 'eg': 'EG', 'el salvador': 'SV', 'salvador': 'SV', 'sv': 'SV',
  'eritrea': 'ER', 'er': 'ER', 'estonia': 'EE', 'ee': 'EE', 'ethiopia': 'ET', 'et': 'ET',
  'fiji': 'FJ', 'fj': 'FJ', 'finland': 'FI', 'fi': 'FI', 'france': 'FR', 'fr': 'FR',
  'gabon': 'GA', 'ga': 'GA', 'gambia': 'GM', 'gm': 'GM', 'georgia': 'GE', 'ge': 'GE',
  'germany': 'DE', 'de': 'DE', 'ghana': 'GH', 'gh': 'GH', 'greece': 'GR', 'gr': 'GR',
  'guatemala': 'GT', 'gt': 'GT', 'guinea': 'GN', 'gn': 'GN', 'guinea-bissau': 'GW', 'gw': 'GW',
  'guyana': 'GY', 'gy': 'GY', 'haiti': 'HT', 'ht': 'HT', 'honduras': 'HN', 'hn': 'HN',
  'hong kong': 'HK', 'hk': 'HK', 'hungary': 'HU', 'hu': 'HU', 'iceland': 'IS', 'is': 'IS',
  'india': 'IN', 'in': 'IN', 'indonesia': 'ID', 'id': 'ID', 'iran': 'IR', 'ir': 'IR',
  'iraq': 'IQ', 'iq': 'IQ', 'ireland': 'IE', 'ie': 'IE', 'israel': 'IL', 'il': 'IL',
  'italy': 'IT', 'it': 'IT', 'jamaica': 'JM', 'jm': 'JM', 'japan': 'JP', 'jp': 'JP',
  'jordan': 'JO', 'jo': 'JO', 'kazakhstan': 'KZ', 'kz': 'KZ', 'kenya': 'KE', 'ke': 'KE',
  'north korea': 'KP', 'kp': 'KP', 'south korea': 'KR', 'korea': 'KR', 'kr': 'KR',
  'kosovo': 'XK', 'xk': 'XK', 'kuwait': 'KW', 'kw': 'KW', 'kyrgyzstan': 'KG', 'kg': 'KG',
  'laos': 'LA', 'la': 'LA', 'latvia': 'LV', 'lv': 'LV', 'lebanon': 'LB', 'lb': 'LB',
  'lesotho': 'LS', 'ls': 'LS', 'liberia': 'LR', 'lr': 'LR', 'libya': 'LY', 'ly': 'LY',
  'liechtenstein': 'LI', 'li': 'LI', 'lithuania': 'LT', 'lt': 'LT', 'luxembourg': 'LU', 'lu': 'LU',
  'madagascar': 'MG', 'mg': 'MG', 'malawi': 'MW', 'mw': 'MW', 'malaysia': 'MY', 'my': 'MY',
  'maldives': 'MV', 'mv': 'MV', 'mali': 'ML', 'ml': 'ML', 'malta': 'MT', 'mt': 'MT',
  'mauritania': 'MR', 'mr': 'MR', 'mauritius': 'MU', 'mu': 'MU', 'mexico': 'MX', 'mx': 'MX',
  'micronesia': 'FM', 'fm': 'FM', 'moldova': 'MD', 'md': 'MD', 'monaco': 'MC', 'mc': 'MC',
  'mongolia': 'MN', 'mn': 'MN', 'montenegro': 'ME', 'me': 'ME', 'morocco': 'MA', 'ma': 'MA',
  'mozambique': 'MZ', 'mz': 'MZ', 'myanmar': 'MM', 'burma': 'MM', 'mm': 'MM',
  'namibia': 'NA', 'na': 'NA', 'nauru': 'NR', 'nr': 'NR', 'nepal': 'NP', 'np': 'NP',
  'netherlands': 'NL', 'nl': 'NL', 'new zealand': 'NZ', 'nz': 'NZ', 'nicaragua': 'NI', 'ni': 'NI',
  'niger': 'NE', 'ne': 'NE', 'nigeria': 'NG', 'ng': 'NG', 'north macedonia': 'MK', 'macedonia': 'MK', 'mk': 'MK',
  'norway': 'NO', 'no': 'NO', 'oman': 'OM', 'om': 'OM', 'pakistan': 'PK', 'pk': 'PK',
  'palau': 'PW', 'pw': 'PW', 'palestine': 'PS', 'ps': 'PS', 'panama': 'PA', 'pa': 'PA',
  'papua new guinea': 'PG', 'png': 'PG', 'pg': 'PG', 'paraguay': 'PY', 'py': 'PY',
  'peru': 'PE', 'pe': 'PE', 'philippines': 'PH', 'ph': 'PH', 'poland': 'PL', 'pl': 'PL',
  'portugal': 'PT', 'pt': 'PT', 'qatar': 'QA', 'qa': 'QA', 'romania': 'RO', 'ro': 'RO',
  'russia': 'RU', 'russian federation': 'RU', 'ru': 'RU', 'rwanda': 'RW', 'rw': 'RW',
  'samoa': 'WS', 'ws': 'WS', 'san marino': 'SM', 'sm': 'SM', 'saudi arabia': 'SA', 'sa': 'SA',
  'senegal': 'SN', 'sn': 'SN', 'serbia': 'RS', 'rs': 'RS', 'seychelles': 'SC', 'sc': 'SC',
  'sierra leone': 'SL', 'sl': 'SL', 'singapore': 'SG', 'sg': 'SG', 'slovakia': 'SK', 'sk': 'SK',
  'slovenia': 'SI', 'si': 'SI', 'solomon islands': 'SB', 'sb': 'SB', 'somalia': 'SO', 'so': 'SO',
  'south africa': 'ZA', 'za': 'ZA', 'south sudan': 'SS', 'ss': 'SS', 'spain': 'ES', 'es': 'ES',
  'sri lanka': 'LK', 'lk': 'LK', 'sudan': 'SD', 'sd': 'SD', 'suriname': 'SR', 'sr': 'SR',
  'sweden': 'SE', 'se': 'SE', 'switzerland': 'CH', 'ch': 'CH', 'syria': 'SY', 'sy': 'SY',
  'taiwan': 'TW', 'tw': 'TW', 'tajikistan': 'TJ', 'tj': 'TJ', 'tanzania': 'TZ', 'tz': 'TZ',
  'thailand': 'TH', 'th': 'TH', 'timor-leste': 'TL', 'east timor': 'TL', 'tl': 'TL',
  'togo': 'TG', 'tg': 'TG', 'tonga': 'TO', 'to': 'TO', 'trinidad and tobago': 'TT', 'trinidad': 'TT', 'tt': 'TT',
  'tunisia': 'TN', 'tn': 'TN', 'turkey': 'TR', 'tr': 'TR', 'turkmenistan': 'TM', 'tm': 'TM',
  'tuvalu': 'TV', 'tv': 'TV', 'uganda': 'UG', 'ug': 'UG', 'ukraine': 'UA', 'ua': 'UA',
  'united arab emirates': 'AE', 'uae': 'AE', 'ae': 'AE',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB', 'gb': 'GB',
  'united states': 'US', 'usa': 'US', 'us': 'US', 'uruguay': 'UY', 'uy': 'UY',
  'uzbekistan': 'UZ', 'uz': 'UZ', 'vanuatu': 'VU', 'vu': 'VU',
  'vatican city': 'VA', 'vatican': 'VA', 'va': 'VA', 'venezuela': 'VE', 've': 'VE',
  'vietnam': 'VN', 'vn': 'VN', 'yemen': 'YE', 'ye': 'YE', 'zambia': 'ZM', 'zm': 'ZM',
  'zimbabwe': 'ZW', 'zw': 'ZW'
};

let usageLocation = 'US';
if (country) {
  const countryKey = country.trim().toLowerCase();
  usageLocation = countryMap[countryKey] || 'US';
}

// === GENERATE PASSWORD ===
const password = 'Temp' + Math.random().toString(36).slice(-8) + '!A1';

// === BUILD FULL NAME ===
const finalFullName = firstName + ' ' + lastName;

console.log('=== FINAL PARSED RESULT ===');
console.log('Name:', finalFullName);
console.log('Department:', department || 'General (defaulted)');
console.log('Position:', position || 'Employee (defaulted)');
console.log('Country/Location:', country, '/', usageLocation);

// === RETURN PARSED DATA ===
return [{
  json: {
    fullName: finalFullName,
    firstName,
    lastName,
    personalEmail,
    manager,
    position: position || 'Employee',
    department: department || 'General',
    usageLocation,
    country,
    primaryEmail,
    lastInitial,
    alternativeEmail,
    password,
    _emailTrigger: true,
    _senderEmail: senderEmail,
    _originalSubject: emailSubject,
    _preferredName: preferredName,
    _givenName: baseLegalFirstName,
    _surname: baseLegalLastName
  }
}];
