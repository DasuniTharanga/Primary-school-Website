# Website එක run කරන විදිහ

**School:** WP/MT/MEEGAHATHANNA PRIMARY COLLEGE  
**Theme:** Maroon

## 1. Node.js install කරන්න

[https://nodejs.org](https://nodejs.org/) වෙතින් **Node.js 24 LTS** install කරන්න. මේ project එකට Node.js 24 අවශ්‍යයි.

Terminal එකේ version එක බලන්න:

```bash
node -v
```

`v24...` ලෙස පෙන්විය යුතුයි.

## 2. ZIP එක extract කරන්න

ZIP එක extract කරලා `meegahathanna-primary-college` folder එක VS Code එකෙන් open කරන්න. VS Code තුළ **Terminal → New Terminal** open කරන්න.

Terminal එක තිබිය යුත්තේ `package.json` තිබෙන folder එක ඇතුළේ.

## 3. Packages install කරන්න

```bash
npm ci
```

මේ step එකට internet අවශ්‍යයි. `node_modules` ZIP එකේ දාලා නැති නිසා ZIP එක කුඩායි.

## 4. Database එක සහ admin account එක හදන්න

```bash
npm run setup
```

ඔයාගෙන් administrator name, email, password සහ password confirmation එක අහනවා.

- Password එකට අකුරු සහ ඉලක්කම් ඇතුළත් characters 12ක් හෝ වැඩියෙන් දාන්න.
- Password type කරනකොට screen එකේ පෙන්වන්නේ නැහැ. එය සාමාන්‍යයි.
- මෙහි default password එකක් නැහැ. ඔයා දුන්න email/password තමයි login කරන්න භාවිතා කරන්නේ.
- `.env` file එක සහ SQLite database එක automatically හදනවා.
- වෙනම Supabase / MySQL database එකක් හදන්න අවශ්‍ය නැහැ.

## 5. Website එක start කරන්න

```bash
npm run dev
```

Browser එකෙන් open කරන්න:

- Website: **http://localhost:5173**
- Staff login: **http://localhost:5173/login**

`localhost` URL එකම භාවිතා කරන්න. `.env` එකේ `APP_ORIGIN` ඒ URL එකට ගැළපෙනවා. වෙනත් URL එකකින් forms submit කළොත් origin check එකෙන් block වෙන්න පුළුවන්.

Website එක stop කරන්න terminal එකේ **Ctrl + C** ඔබන්න.

## 6. School details පුරවන්න

Admin login වුණාට පස්සේ:

1. **School settings:** සැබෑ telephone, email, address, office hours සහ principal details දාන්න.
2. **Teachers:** photo එකේ ලැයිස්තුවෙන් ගුරු නම් 29ක් drafts ලෙස දාලා තියෙනවා. අකුරු / initials පරීක්ෂා කරලා නිවැරදි කරන්න. Role සහ grade දාන්න. Confirmation checkbox එක tick කරලා `Published` තෝරා save කරන්න.
3. **Notices / Events:** පාසල තහවුරු කළ notices සහ dates පමණක් publish කරන්න.
4. **Gallery:** අවසර ඇති school photos upload කරන්න. Publishing permission checkbox එක tick කරන්න.
5. **Resources:** PDF files හෝ HTTPS learning links දාන්න.
6. **Staff accounts:** අවශ්‍ය staff accounts හදන්න. `Content editor` accounts වලින් public website content වෙනස් කළ හැකියි. Private messages/admissions බලන්න `Administrator` access අවශ්‍යයි.

දැනට තියෙන crest එක සහ school drawing එක website එකට හදපු generic assets. School එකේ official logo / photo ලැබුණු පසු School settings වලින් ඒවා replace කරන්න.

## Contact / Admissions forms

Form එක submit වුණාම database එකේ දත්ත save වෙනවා. Reference number එකක් පෙන්වනවා.

Adminට **Messages** සහ **Admissions** sections වලින් ඒවා බලලා status / follow-up notes update කරන්න පුළුවන්. Form submit වුණාම automatic email එකක් යන්නේ නැහැ. `Open an email reply` මගින් email app එක open වෙනවා; email එක යවන්නේ ඔයායි.

Admissions form එක enquiry එකක් පමණයි. එය school admission approval එකක් නොවේ.

## Password එක අමතක වුණොත්

Website එක තියෙන computer/server එකේ terminal එකෙන්:

```bash
npm run admin:reset-password
```

Staff email එක සහ අලුත් password එක දාන්න. Existing sessions revoke වෙනවා.

## Backup එකක් ගන්න

```bash
npm run db:backup
```

`backups` folder එකට database සහ uploaded files save වෙනවා. මේ backups වල private enquiry data තිබිය හැකි නිසා public ලෙස share කරන්න එපා.

## Build / tests

```bash
npm test
npm run lint
npm run build
```

Built website එක localව run කරන්න:

```bash
npm start
```

එවිට **http://localhost:3001** open කරන්න.

## Problem එකක් ආවොත්

- **Node SQLite import error:** Node.js 24 install කර terminal එක නැවත open කරන්න.
- **Port already in use:** පැරණි dev server terminal එකේ Ctrl + C ඔබලා නවත්වන්න.
- **Cannot reach school server:** `npm run dev` එකෙන් frontend සහ backend දෙකම start වෙලාද බලන්න.
- **Origin error:** `http://localhost:5173` URL එකෙන්ම dev website එක open කරන්න. `.env` තුළ `APP_ORIGIN=http://localhost:5173` තිබිය යුතුයි.
- **Too many attempts:** Login attempts සීමාව ඉක්මවා තිබේ නම් විනාඩි 15කට පසුව නැවත උත්සාහ කරන්න.
- **Production deployment:** [docs/OPERATIONS.md](docs/OPERATIONS.md) බලන්න. Public site එක සඳහා HTTPS සහ persistent storage අවශ්‍යයි.
