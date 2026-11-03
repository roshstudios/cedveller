const lesson = (id: string, day: number, start: string, end: string, name: string, room: string, teacher: string, type = "lecture", note = "") => ({
  id, day, start, end, name, room, teacher, week: "all", type, note,
});

export const template = {
  id: "tt11-source-draft",
  name: "Tələbə",
  group: "TT-11",
  isPublic: false,
  anchorDate: "2026-11-02",
  anchorWeek: "lower",
  owned: false,
  updatedAt: "2026-11-03T00:00:00.000Z",
  lessons: [
    lesson("mon-1", 1, "08:30", "10:05", "Xarici dildə işgüzar və akademik kommunikasiya", "315", "Qəhrəmanova M.", "seminar"),
    lesson("mon-2", 1, "10:15", "11:50", "Riyazi analiz", "415", "Masmalıyev H."),
    lesson("mon-3", 1, "12:00", "13:35", "Riyazi analiz", "415", "Masmalıyev H.", "seminar"),
    lesson("wed-2", 3, "10:15", "11:50", "Proqramlaşdırmanın əsasları-1", "207", "Tarıverdiyeva Ç."),
    lesson("wed-3", 3, "12:00", "13:35", "İnformasiya təhlükəsizliyinin əsasları", "310", "Həsənova N."),
    lesson("wed-4", 3, "13:50", "15:25", "Proqramlaşdırmanın əsasları", "301c / 409", "1. Tarıverdiyeva Ç. / 2. Hacı E.", "seminar", "PDF-dəki (13:50) qeydinə əsasən 4-cü dərsdir. Hüceyrə yalnız TT-11 sütunundadır: seminar. 1-ci və 2-ci alt qrupların müəllim və auditoriyaları fərqlidir; öz alt qrupunu dəqiqləşdir. 1/2 işarəsi təkbaşına laboratoriya demək deyil."),
    lesson("thu-1", 4, "08:30", "10:05", "İnformasiya təhlükəsizliyinin əsasları", "311", "Quliyev N.", "seminar"),
    lesson("thu-2", 4, "10:15", "11:50", "Azərbaycan tarixi", "204", "Süleymanova S."),
    lesson("thu-3", 4, "12:00", "13:35", "Azərbaycan tarixi", "200", "Süleymanova S.", "seminar"),
    { ...lesson("fri-2-upper", 5, "10:15", "11:50", "Riyazi analiz", "405", "Masmalıyev H.", "lecture", "10:15 blokunun üst hissəsi — Üst həftə. Hüceyrə TT-10 və TT-11 sütunlarını birlikdə tutur: mühazirə."), week: "upper" },
    { ...lesson("fri-2-lower", 5, "10:15", "11:50", "Proqramlaşdırmanın əsasları-1", "405", "Tarıverdiyeva Ç.", "lecture", "10:15 blokunun alt hissəsi — Alt həftə. Hüceyrə TT-10 və TT-11 sütunlarını birlikdə tutur: mühazirə."), week: "lower" },
    lesson("fri-3", 5, "12:00", "13:35", "Xarici dildə işgüzar və akademik kommunikasiya", "311", "Qəhrəmanova M.", "seminar", "Ayrıca 12:00 bloku yalnız TT-11 sütununu tutur və bölünməyib: hər həftə seminar."),
  ],
};

export const templateWarnings = [
  "Bu, yüklədiyin BDU PDF-indən çıxarılmış TT-11 ilkin variantıdır. Yadda saxlamazdan əvvəl bütün dərsləri təsdiqlə.",
  "Çərşənbə axşamı dərs yoxdur. Çərşənbə 08:30 dərsi yoxdur; PDF-də (13:50) qeydi olan Proqramlaşdırma 4-cü saata keçirilib.",
  "Cümə 10:15: üstdəki Riyazi analiz Üst həftə, altdakı Proqramlaşdırma Alt həftədir; hər ikisi TT-10 və TT-11 üzrə mühazirədir. 12:00 Xarici dil ayrıca blokdur, hər həftə seminardır.",
  "Dərs iki və ya daha çox qrupun sütununu tutursa mühazirə, yalnız bir qrupun blokundadırsa seminardır. Laboratoriya açıq işarə olduqda ayrıca saxlanılır.",
  "PDF yalnız başlanğıc saatlarını göstərir. 95 dəqiqəlik bitiş vaxtları ilkin olaraq müəyyən edilib; onları yoxla.",
  "Çərşənbə Proqramlaşdırmadakı 1/2 işarələri alt qruplardır, Alt/Üst həftə və ya laboratoriya işarəsi deyil. Öz alt qrupunun auditoriyasını seç.",
];

export function weekFor(date: string, anchorDate = "2026-11-02", anchorWeek = "lower") {
  const monday = (s: string) => {
    const d = new Date(`${s}T12:00:00Z`);
    const dow = d.getUTCDay() || 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow + 1);
  };
  const distance = Math.round((monday(date) - monday(anchorDate)) / 604800000);
  return ((distance % 2) + 2) % 2 === 0 ? anchorWeek : anchorWeek === "lower" ? "upper" : "lower";
}
