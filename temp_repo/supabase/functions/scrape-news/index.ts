import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ScrapeRequest {
  sourceId?: string;
  jobType?: string;
}

interface NewsArticle {
  title: string;
  content: string;
  url: string;
  published_at?: Date;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sourceId, jobType = 'manual' }: ScrapeRequest = await req.json();

    let sourcesToScrape = [];

    if (sourceId) {
      const { data: source, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (error || !source) {
        return new Response(
          JSON.stringify({ error: 'Source not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      sourcesToScrape = [source];
    } else {
      const { data: sources, error } = await supabase
        .from('media_sources')
        .select('*')
        .eq('active', true)
        .limit(5);

      if (error) {
        throw error;
      }
      sourcesToScrape = sources || [];
    }

    const results = [];

    for (const source of sourcesToScrape) {
      const jobId = crypto.randomUUID();
      
      const { error: jobError } = await supabase
        .from('scraping_jobs')
        .insert({
          id: jobId,
          source_id: source.id,
          job_type: jobType,
          status: 'running',
          started_at: new Date().toISOString(),
        });

      if (jobError) {
        console.error('Error creating job:', jobError);
        continue;
      }

      try {
        const articles = await scrapeSource(source);
        
        let savedCount = 0;
        for (const article of articles) {
          const { error: insertError } = await supabase
            .from('feedback_items')
            .insert({
              source_id: source.id,
              title: article.title,
              content: article.content,
              url: article.url,
              original_language: source.language,
              region: source.region,
              status: 'processing',
              collected_at: new Date().toISOString(),
              published_at: article.published_at?.toISOString(),
            });

          if (!insertError) {
            savedCount++;
          }
        }

        await supabase
          .from('scraping_jobs')
          .update({
            status: 'completed',
            articles_found: articles.length,
            articles_saved: savedCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          articlesFound: articles.length,
          articlesSaved: savedCount,
          status: 'success',
        });
      } catch (error) {
        await supabase
          .from('scraping_jobs')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        results.push({
          sourceId: source.id,
          sourceName: source.name,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Scraped ${sourcesToScrape.length} sources`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in scrape-news:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function scrapeSource(source: any): Promise<NewsArticle[]> {
  return generateMockArticles(source);
}

function generateMockArticles(source: any): NewsArticle[] {
  const languageTopics: { [key: string]: Array<{ title: string; content: string }> } = {
    'Hindi': [
      { title: 'सरकार ने ग्रामीण विकास के लिए नई योजना की घोषणा की', content: 'सरकार ने ग्रामीण क्षेत्रों में बुनियादी ढांचे के विकास के लिए एक महत्वाकांक्षी योजना का अनावरण किया है। इस योजना में नई सड़कों, पुलों और डिजिटल बुनियादी ढांचे के निर्माण पर ध्यान केंद्रित किया गया है।' },
      { title: 'शिक्षा क्षेत्र में सुधार की नई पहल', content: 'कई राज्यों में एक व्यापक शिक्षा सुधार पहल शुरू की गई है, जो डिजिटल साक्षरता और व्यावसायिक प्रशिक्षण में सुधार पर केंद्रित है। कार्यक्रम का उद्देश्य शैक्षिक परिणामों को बेहतर बनाना है।' },
      { title: 'स्वास्थ्य सेवाओं का विस्तार ग्रामीण जिलों में', content: 'नई स्वास्थ्य सुविधाएं और मोबाइल चिकित्सा इकाइयां अविकसित ग्रामीण जिलों में तैनात की जा रही हैं। इस पहल का उद्देश्य गुणवत्तापूर्ण स्वास्थ्य सेवाओं तक बेहतर पहुंच प्रदान करना है।' },
    ],
    'Tamil': [
      { title: 'அரசு புதிய உள்கட்டமைப்பு திட்டத்தை அறிவித்துள்ளது', content: 'கிராமப்புற பகுதிகளில் இணைப்பை மேம்படுத்துவதில் கவனம் செலுத்தும் ஒரு லட்சிய உள்கட்டமைப்பு மேம்பாட்டு திட்டத்தை அரசு வெளியிட்டுள்ளது. இந்த திட்டத்தில் புதிய சாலைகள், பாலங்கள் மற்றும் டிஜிட்டல் உள்கட்டமைப்பு கட்டுமானம் அடங்கும்.' },
      { title: 'கல்வி சீர்திருத்த திட்டம் தொடங்கப்பட்டுள்ளது', content: 'பல மாநிலங்களில் ஒரு விரிவான கல்வி சீர்திருத்த முன்முயற்சி தொடங்கப்பட்டுள்ளது, இது டிஜிட்டல் எழுத்தறிவு மற்றும் தொழில் பயிற்சியை மேம்படுத்துவதில் கவனம் செலுத்துகிறது.' },
      { title: 'சுகாதார சேவைகள் விரிவாக்கம்', content: 'புதிய சுகாதார வசதிகள் மற்றும் மொபைல் மருத்துவ அலகுகள் சேவை குறைவான கிராமப்புற மாவட்டங்களில் பயன்படுத்தப்படுகின்றன.' },
    ],
    'Telugu': [
      { title: 'ప్రభుత్వం కొత్త మౌలిక సదుపాయాల ప్రణాళికను ప్రకటించింది', content: 'గ్రామీణ ప్రాంతాలలో కనెక్టివిటీని మెరుగుపరచడంపై దృష్టి సారించే ప్రతిష్టాత్మక మౌలిక సదుపాయాల అభివృద్ధి ప్రణాళికను ప్రభుత్వం ఆవిష్కరించింది. ఈ ప్రణాళికలో కొత్త రోడ్లు, వంతెనలు మరియు డిజిటల్ మౌలిక సదుపాయాల నిర్మాణం ఉన్నాయి.' },
      { title: 'విద్యా సంస్కరణ కార్యక్రమం ప్రారంభం', content: 'డిజిటల్ అక్షరాస్యత మరియు వృత్తి శిక్షణను మెరుగుపరచడంపై దృష్టి సారించి అనేక రాష్ట్రాలలో సమగ్ర విద్యా సంస్కరణ కార్యక్రమం ప్రారంభించబడింది.' },
      { title: 'ఆరోగ్య సేవలు విస్తరణ', content: 'కొత్త ఆరోగ్య సౌకర్యాలు మరియు మొబైల్ వైద్య యూనిట్లు అభివృద్ధి చెందని గ్రామీణ జిల్లాలలో మోహరించబడుతున్నాయి.' },
    ],
    'Bengali': [
      { title: 'সরকার নতুন অবকাঠামো উন্নয়ন পরিকল্পনা ঘোষণা করেছে', content: 'সরকার গ্রামীণ এলাকায় সংযোগ উন্নত করার উপর দৃষ্টি নিবদ্ধ করে একটি উচ্চাভিলাষী অবকাঠামো উন্নয়ন পরিকল্পনা উন্মোচন করেছে। পরিকল্পনায় নতুন রাস্তা, সেতু এবং ডিজিটাল অবকাঠামো নির্মাণ অন্তর্ভুক্ত রয়েছে।' },
      { title: 'শিক্ষা সংস্কার উদ্যোগ শুরু হয়েছে', content: 'ডিজিটাল সাক্ষরতা এবং বৃত্তিমূলক প্রশিক্ষণ উন্নত করার উপর দৃষ্টি নিবদ্ধ করে একাধিক রাজ্যে একটি ব্যাপক শিক্ষা সংস্কার উদ্যোগ চালু করা হয়েছে।' },
      { title: 'স্বাস্থ্যসেবা সম্প্রসারণ', content: 'নতুন স্বাস্থ্য সুবিধা এবং মোবাইল চিকিৎসা ইউনিট অনুন্নত গ্রামীণ জেলায় মোতায়েন করা হচ্ছে।' },
    ],
    'Marathi': [
      { title: 'सरकारने नवीन पायाभूत सुविधा योजना जाहीर केली', content: 'ग्रामीण भागात कनेक्टिव्हिटी सुधारण्यावर लक्ष केंद्रित करणारी महत्त्वाकांक्षी पायाभूत सुविधा विकास योजना सरकारने जाहीर केली आहे. या योजनेत नवीन रस्ते, पूल आणि डिजिटल पायाभूत सुविधा बांधकाम समाविष्ट आहे.' },
      { title: 'शिक्षण सुधारणा उपक्रम सुरू', content: 'डिजिटल साक्षरता आणि व्यावसायिक प्रशिक्षण सुधारण्यावर लक्ष केंद्रित करून अनेक राज्यांमध्ये सर्वसमावेशक शिक्षण सुधारणा उपक्रम सुरू करण्यात आला आहे.' },
      { title: 'आरोग्य सेवा विस्तार', content: 'नवीन आरोग्य सुविधा आणि मोबाइल वैद्यकीय युनिट्स अविकसित ग्रामीण जिल्ह्यांमध्ये तैनात केले जात आहेत.' },
    ],
    'Malayalam': [
      { title: 'സർക്കാർ പുതിയ അടിസ്ഥാന സൗകര്യ പദ്ധതി പ്രഖ്യാപിച്ചു', content: 'ഗ്രാമപ്രദേശങ്ങളിൽ കണക്റ്റിവിറ്റി മെച്ചപ്പെടുത്തുന്നതിൽ ശ്രദ്ധ കേന്ദ്രീകരിച്ച് അഭിലഷണീയമായ അടിസ്ഥാന സൗകര്യ വികസന പദ്ധതി സർക്കാർ അനാവരണം ചെയ്തു. പുതിയ റോഡുകൾ, പാലങ്ങൾ, ഡിജിറ്റൽ അടിസ്ഥാന സൗകര്യങ്ങൾ എന്നിവ ഈ പദ്ധതിയിൽ ഉൾപ്പെടുന്നു.' },
      { title: 'വിദ്യാഭ്യാസ പരിഷ്കരണ സംരംഭം ആരംഭിച്ചു', content: 'ഡിജിറ്റൽ സാക്ഷരതയും തൊഴിൽ പരിശീലനും മെച്ചപ്പെടുത്തുന്നതിൽ ശ്രദ്ധ കേന്ദ്രീകരിച്ച് നിരവധി സംസ്ഥാനങ്ങളിൽ സമഗ്ര വിദ്യാഭ്യാസ പരിഷ്കരണ സംരംഭം ആരംഭിച്ചു.' },
      { title: 'ആരോഗ്യ സേവനങ്ങളുടെ വിപുലീകരണം', content: 'പുതിയ ആരോഗ്യ സൗകര്യങ്ങളും മൊബൈൽ മെഡിക്കൽ യൂണിറ്റുകളും അവികസിത ഗ്രാമീണ ജില്ലകളിൽ വിന്യസിക്കപ്പെടുന്നു.' },
    ],
    'Kannada': [
      { title: 'ಸರ್ಕಾರ ಹೊಸ ಮೂಲಸೌಕರ್ಯ ಯೋಜನೆ ಘೋಷಿಸಿದೆ', content: 'ಗ್ರಾಮೀಣ ಪ್ರದೇಶಗಳಲ್ಲಿ ಸಂಪರ್ಕವನ್ನು ಸುಧಾರಿಸುವುದರ ಮೇಲೆ ಗಮನಹರಿಸುವ ಮಹತ್ವಾಕಾಂಕ್ಷಿ ಮೂಲಸೌಕರ್ಯ ಅಭಿವೃದ್ಧಿ ಯೋಜನೆಯನ್ನು ಸರ್ಕಾರ ಅನಾವರಣಗೊಳಿಸಿದೆ. ಹೊಸ ರಸ್ತೆಗಳು, ಸೇತುವೆಗಳು ಮತ್ತು ಡಿಜಿಟಲ್ ಮೂಲಸೌಕರ್ಯ ನಿರ್ಮಾಣವನ್ನು ಯೋಜನೆ ಒಳಗೊಂಡಿದೆ.' },
      { title: 'ಶಿಕ್ಷಣ ಸುಧಾರಣಾ ಉಪಕ್ರಮ ಪ್ರಾರಂಭ', content: 'ಡಿಜಿಟಲ್ ಸಾಕ್ಷರತೆ ಮತ್ತು ವೃತ್ತಿಪರ ತರಬೇತಿಯನ್ನು ಸುಧಾರಿಸುವುದರ ಮೇಲೆ ಗಮನಹರಿಸುವ ಸಮಗ್ರ ಶಿಕ್ಷಣ ಸುಧಾರಣಾ ಉಪಕ್ರಮವನ್ನು ಹಲವಾರು ರಾಜ್ಯಗಳಲ್ಲಿ ಪ್ರಾರಂಭಿಸಲಾಗಿದೆ.' },
      { title: 'ಆರೋಗ್ಯ ಸೇವೆಗಳ ವಿಸ್ತರಣೆ', content: 'ಹೊಸ ಆರೋಗ್ಯ ಸೌಲಭ್ಯಗಳು ಮತ್ತು ಮೊಬೈಲ್ ವೈದ್ಯಕೀಯ ಘಟಕಗಳನ್ನು ಅಭಿವೃದ್ಧಿಯಾಗದ ಗ್ರಾಮೀಣ ಜಿಲ್ಲೆಗಳಲ್ಲಿ ನಿಯೋಜಿಸಲಾಗುತ್ತಿದೆ.' },
    ],
    'Gujarati': [
      { title: 'સરકારે નવી માળખાકીય યોજના જાહેર કરી', content: 'ગ્રામીણ વિસ્તારોમાં કનેક્ટિવિટી સુધારવા પર ધ્યાન કેન્દ્રિત કરતી મહત્વાકાંક્ષી માળખાકીય વિકાસ યોજના સરકારે જાહેર કરી છે. આ યોજનામાં નવા રસ્તાઓ, પુલો અને ડિજિટલ માળખાગત સુવિધાઓનું નિર્માણ સમાવિષ્ટ છે.' },
      { title: 'શિક્ષણ સુધારણા પહેલ શરૂ', content: 'ડિજિટલ સાક્ષરતા અને વ્યાવસાયિક તાલીમ સુધારવા પર ધ્યાન કેન્દ્રિત કરતી વ્યાપક શિક્ષણ સુધારણા પહેલ અનેક રાજ્યોમાં શરૂ કરવામાં આવી છે.' },
      { title: 'આરોગ્ય સેવાઓનું વિસ્તરણ', content: 'નવી આરોગ્ય સુવિધાઓ અને મોબાઇલ તબીબી એકમો અવિકસિત ગ્રામીણ જિલ્લાઓમાં તૈનાત કરવામાં આવી રહ્યાં છે.' },
    ],
  };

  const englishTopics = [
    { title: 'Government Announces New Infrastructure Development Plan', content: 'The government has unveiled an ambitious infrastructure development plan focusing on improving connectivity in rural areas. The plan includes construction of new roads, bridges, and digital infrastructure to boost economic growth.' },
    { title: 'Education Reform Initiative Launched', content: 'A comprehensive education reform initiative has been launched across several states, focusing on improving digital literacy and vocational training. The program aims to enhance educational outcomes.' },
    { title: 'Healthcare Services Expanded in Rural Districts', content: 'New healthcare facilities and mobile medical units are being deployed to underserved rural districts. The initiative aims to provide better access to quality healthcare services.' },
  ];

  let topics = englishTopics;

  if (languageTopics[source.language]) {
    topics = languageTopics[source.language];
  } else if (source.language === 'Multiple') {
    const allLanguages = Object.keys(languageTopics);
    const randomLang = allLanguages[Math.floor(Math.random() * allLanguages.length)];
    topics = languageTopics[randomLang];
  }

  const selectedTopics = topics.slice(0, 2);

  return selectedTopics.map((topic, index) => ({
    title: topic.title,
    content: topic.content,
    url: source.url || `https://example.com/news/${crypto.randomUUID()}`,
    published_at: new Date(Date.now() - (index * 3600000)),
  }));
}
