# Dərs Cədvəlim — Netlify və Groq qurulması

Bu, sadəcə statik sayt deyil. AI oxuma və dostların cədvəllərini paylaşmaq üçün **Netlify Functions + PostgreSQL** lazımdır. Yalnız `dist` qovluğunu Netlify Drop-a yükləmək bu funksiyaları işlətmir.

## 1. Yeni Groq açarı yarat

1. https://console.groq.com/keys ünvanında hesabına daxil ol.
2. Söhbətdə paylaşdığın əvvəlki açarı ləğv et.
3. **Create API Key** ilə yeni açar yarat.
4. Açarı yalnız Netlify-ın gizli mühit dəyişənlərinə əlavə et. Çata, GitHub-a, `netlify.toml`-a və brauzer koduna yazma.

Kod Groq-un OpenAI-uyğun server API-sinə qoşulur:
`https://api.groq.com/openai/v1`.

Hazırkı standart model: `qwen/qwen3.8-27b`. Groq-un rəsmi sənədində görsəl giriş və JSON cavabını dəstəkləyən model kimi göstərilir. Hesabında modelə giriş olmalıdır. Model siyahısı dəyişərsə `GROQ_MODEL` dəyərini görsəl və JSON dəstəyi olan modelə dəyiş.

**Vacib:** `llama-3.3-70b-versatile` kimi yalnız mətn qəbul edən model bu şəkil-əsaslı PDF oxuma axını üçün uyğun deyil. PDF brauzerdə şəkillərə çevrilir; tətbiq xam PDF-i Groq-a göndərmir.

DOCX də qəbul olunur: Word səhifələri brauzerdə birləşdirilmiş hüceyrələr və sütun sərhədləri qorunaraq şəkillərə çevrilir. Köhnə `.doc` formatını əvvəl Word-də `.docx` və ya PDF kimi saxla. Fayl ən çox 15 MB ola bilər. Mürəkkəb Word səhifələnməsi düzgün görünmürsə, PDF kimi ixrac et.

## 2. PostgreSQL hazırla

Netlify Functions məlumatları daimi saxlamaq üçün ayrıca PostgreSQL-ə qoşulmalıdır. Məsələn, Neon və ya başqa PostgreSQL xidməti seçə bilərsən. Bu layihədə mövcud Replit verilənlər bazası dəyişdirilmir və avtomatik xaricə köçürülmür.

1. Xarici xidmətdə yeni verilənlər bazası yarat.
2. **Pooled connection string** varsa, onu seç; xidmətin verdiyi SSL parametrlərini saxla.
3. Həmin bazanın SQL redaktorunda layihədəki `deploy/schema.sql` faylının məzmununu bir dəfə icra et.
4. Bağlantını Netlify-da `DATABASE_URL` adlı gizli dəyişən kimi saxla.

Sxem `schedules` cədvəlini yaradır; cədvəl artıq varsa onu silmir. Mövcud bazaya tətbiq etməzdən əvvəl mövcud sxemi yoxla.

Replit-in inkişaf bazasındakı cədvəllər və məlumatlar Netlify-a avtomatik getmir. Xaricdə yeni baza açırsansa, cədvəlini yayımlanmış saytda yenidən təsdiqləyib saxla.

## 3. Bütün layihəni GitHub-a əlavə et

Kök qovluqdakı `netlify.toml`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json`, `artifacts`, `lib` və `deploy` daxil olmaqla layihəni Git deposuna göndər.

`node_modules`, `.env`, şəxsi açarlar və verilənlər bazasının bağlantısını repoya əlavə etmə. Repodakı `NETLIFY.md` bu təlimatın tam versiyasıdır.

## 4. Netlify-a qoş

1. https://app.netlify.com/start ünvanını aç.
2. **Import from Git / Import an existing project** seçimi ilə GitHub deponu qoş.
3. **Base directory**: depo kökü — boş saxla.
4. **Build command**:

   ```sh
   pnpm run typecheck:libs && pnpm --filter @workspace/ders-takvimim run build
   ```

5. **Publish directory**:

   ```text
   artifacts/ders-takvimim/dist/public
   ```

6. **Functions directory**:

   ```text
   artifacts/api-server/netlify
   ```

Bunlar artıq `netlify.toml` faylındadır; Netlify onları avtomatik oxumalıdır. Node 24 və pnpm 10.26.1 də orada göstərilib.

Build mühiti üçün `NODE_ENV=production` qoyma: bu, derləmə üçün lazım olan devDependencies paketlərinin quraşdırılmamasına səbəb ola bilər. Vite build özü production paketini hazırlayır.

## 5. Mühit dəyişənlərini daxil et

Netlify layihəndə **Project configuration → Environment variables → Add a variable** bölməsini aç. Menyu adı interfeysin versiyasına görə bir az fərqlənə bilər.

| Ad | Dəyər | Məxfi? |
|---|---|---|
| `AI_PROVIDER` | `groq` | Xeyr |
| `GROQ_API_KEY` | Yeni Groq açarın | Bəli |
| `GROQ_MODEL` | `qwen/qwen3.8-27b` | Xeyr |
| `DATABASE_URL` | PostgreSQL xidmətinin verdiyi bağlantı | Bəli |

Əhatə dairəsi seçimi varsa **Functions** daxil olsun; sadə seçim **All scopes**-dur. Ən azı **Production** kontekstinə tətbiq et. Deploy Preview-dan da istifadə edəcəksənsə, həmin kontekstə ayrıca düzgün dəyərlər qoy.

**Vacib:** `netlify.toml` faylında yazılan mühit dəyişənləri server funksiyalarına avtomatik verilmir. Açarları və bağlantını Netlify panelində əlavə et. Adlarını `VITE_GROQ_API_KEY` və ya `VITE_DATABASE_URL` etmə — `VITE_` dəyişənləri brauzerə çıxa bilər.

`AI_PROVIDER=groq` seçiləndə OpenAI açarı lazım deyil. Groq açarı səhvdirsə tətbiq gizlicə başqa pullu AI xidmətinə keçmir.

Alternativlər: `AI_PROVIDER=openai` + `OPENAI_API_KEY`; yaxud Replit önizləməsində avtomatik qurulmuş Replit AI bağlantısı. Replit-in idarə etdiyi açarlar Netlify-a köçürülməməlidir.

## 6. Yayımla

**Deploy project** seç. Dəyişənləri ilk yayımdan sonra əlavə etmisənsə, **Deploys → Trigger deploy → Deploy project** ilə yenidən yayımla. Dəyişənlər yalnız yeni yayımdan sonra tətbiq olunur.

Netlify-ın verdiyi HTTPS ünvanında:

1. `/api/healthz` aç: `{"status":"ok"}` görünməlidir.
2. Yeni brauzerdə ana səhifə üç addımlı quraşdırmanı göstərməlidir; heç kəsə avtomatik TT-11 nümunəsi açılmır.
3. Qrupunu yazıb PDF, DOCX və ya şəkil seç. Groq ilə ən çox 3 səhifə göndər.
4. Çıxarılan dərsləri yoxla və düzəlt. Son addımda adını yaz, gizli/hamıya açıq seçimini et və tamamla. Paylaşım əvvəlcədən bağlıdır.
5. Səhifəni yenilə: saxladığın cədvəl qalmalı, quraşdırma təkrarlanmamalıdır. Cədvəli olmayan yeni brauzerdə quraşdırma görünməlidir. Açıq paylaşım keçidi isə quraşdırma tələb etmir.
6. Ayarlarda **Hamıya açıq** seçimini aç; paylaşım keçidini başqa brauzerdə yoxla.

## 7. iPhone

### Netlify nişanını söndür

Alt sağdakı “Powered by Netlify” nişanı mobil menyunu örtə bilər. Layihənin sahibi Netlify panelində **Project configuration → General → Powered by Netlify badge** bölməsində nişanı **Off** edib yadda saxlaya bilər. Dəyişiklik növbəti sorğuda tətbiq olunur, yenidən yayım tələb olunmur.

Bu ayar bütün ziyarətçilərə aiddir. Nişanın içindəki “Hide this badge” isə yalnız həmin brauzerdə gizlədir. Nişan ayrıca iframe-dədir; tətbiqin CSS-i ilə onu dəyişdirməyə güvənmə.

Rəsmi təlimat: https://docs.netlify.com/manage/projects/powered-by-netlify-badge/

Yayımlanmış saytı Safari-də aç → Paylaş / Share → Ana ekrana əlavə et / Add to Home Screen. Dil iOS-un dilindən asılıdır.

Hesab sistemi yoxdur: redaktə icazəsi brauzerin təhlükəsiz kukisindədir. Safari ilə ana ekran tətbiqinin məlumat anbarı fərqli ola bilər; belə halda tətbiq daxilində cədvəli yenidən saxla. Kukiləri silmək redaktə icazəsini itirə bilər.

## Limitlər və problemlərin həlli

- Groq üçün bir sorğuda ən çox 3 səhifə göndərilir. Daha uzun PDF-dən lazım olan səhifələri ayrıca fayl kimi çıxar; tətbiq limitdən çox olduqda xəta göstərir, səssizcə səhifə atmır.
- Digər AI xidmətlərində brauzer ilk 8 səhifəni hazırlayır. Ümumi şəkil yükü təxminən 4.5 MB ilə məhdudlaşdırılıb. Böyük faylı kəsib kiçilt.
- **Açar və ya icazə xətası:** açarı, modelə giriş icazəsini, dəyişənin Functions əhatəsini və yenidən yayım etdiyini yoxla.
- **Limit xətası:** Groq hesabının istifadə limitlərini yoxla və sonra yenidən cəhd et. Tətbiqdə ayrıca IP üzrə saatlıq 8 oxuma məhdudiyyəti var; serverless instansiyalar arasında bu limit paylaşılan deyil.
- **Model sorğunu qəbul etmir:** `GROQ_MODEL` görsəl və JSON dəstəkləməlidir.
- **Cədvəl yadda saxlanmır:** `DATABASE_URL` dəyərinin düzgünlüyünü, SSL parametrlərini və `deploy/schema.sql` faylını düzgün xarici bazada icra etdiyini yoxla.
- **Server 500 / funksiya vaxtı bitdi:** Netlify function loglarını yoxla. Böyük PDF-ləri kiçilt. Netlify funksiyalarının limitləri hesab planından asılıdır; tətbiqin AI sorğusu 50 saniyədə dayanır.
- AI oxuma ilkin nəticədir, səhvsizlik zəmanəti yoxdur. Birləşik hüceyrələr, alt qruplar və həftələr mənbə ilə yoxlanmalıdır.
- Yüklənən fayl daimi saxlanılmır; şəkilləri AI xidmətinə göndərilir. Yalnız təsdiqlənmiş dərslər bazaya yazılır.

## Rəsmi mənbələr

- Groq Vision və model/şəkil limitləri: https://console.groq.com/docs/vision
- Groq OpenAI-uyğun API: https://console.groq.com/docs/openai
- Netlify Git deposundan yayım: https://docs.netlify.com/start/quickstarts/deploy-from-repository/
- Netlify funksiyalarında mühit dəyişənləri: https://docs.netlify.com/build/functions/environment-variables/
