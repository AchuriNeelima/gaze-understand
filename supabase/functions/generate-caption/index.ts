import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language translations for safety messages
const SAFETY_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    vehicle: "Vehicle detected - be cautious",
    traffic: "Traffic or road detected",
    fire: "Fire or flames visible - danger",
    stairs: "Stairs or steps visible",
    obstacle: "Obstacle in path",
    person: "Person nearby",
    water: "Water hazard detected",
    animal: "Animal detected",
  },
  hi: {
    vehicle: "वाहन का पता चला - सावधान रहें",
    traffic: "यातायात या सड़क का पता चला",
    fire: "आग या लपटें दिखाई दे रही हैं - खतरा",
    stairs: "सीढ़ियां दिखाई दे रही हैं",
    obstacle: "रास्ते में बाधा",
    person: "पास में कोई व्यक्ति",
    water: "जल खतरा पाया गया",
    animal: "जानवर का पता चला",
  },
  te: {
    vehicle: "వాహనం గుర్తించబడింది - జాగ్రత్తగా ఉండండి",
    traffic: "ట్రాఫిక్ లేదా రోడ్డు గుర్తించబడింది",
    fire: "మంటలు కనిపిస్తున్నాయి - ప్రమాదం",
    stairs: "మెట్లు కనిపిస్తున్నాయి",
    obstacle: "మార్గంలో అడ్డంకి",
    person: "సమీపంలో వ్యక్తి",
    water: "నీటి ప్రమాదం గుర్తించబడింది",
    animal: "జంతువు గుర్తించబడింది",
  },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, language = "en" } = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data from data URL
    const base64Match = imageData.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(
        JSON.stringify({ error: "Invalid image format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mimeType = `image/${base64Match[1]}`;
    const base64Data = base64Match[2];

    // Build the prompt based on language
    let systemPrompt = "";
    let userPrompt = "";

    if (language === "en") {
      systemPrompt = `You are an accessibility assistant that describes images for visually impaired users. 
Your descriptions should be:
- Detailed but concise (2-4 sentences)
- Focus on the most important elements first
- Mention spatial relationships (left, right, center, foreground, background)
- Include colors, people, objects, text, and actions
- Note any potential safety hazards (vehicles, stairs, obstacles, fire, water, animals)

IMPORTANT: If you detect any safety hazards, you MUST list them at the start of your response in this format:
[SAFETY: hazard1, hazard2]
Then continue with the description.

Example with safety hazard:
[SAFETY: vehicle, traffic]
A busy city intersection with cars and pedestrians. A red sedan is approaching from the left side of the frame...`;

      userPrompt = "Please describe this image in detail for a visually impaired person. Focus on what's most important and mention any safety hazards.";
    } else if (language === "hi") {
      systemPrompt = `आप एक सहायक हैं जो दृष्टिबाधित उपयोगकर्ताओं के लिए छवियों का वर्णन करते हैं।
आपके विवरण होने चाहिए:
- विस्तृत लेकिन संक्षिप्त (2-4 वाक्य)
- सबसे महत्वपूर्ण तत्वों पर पहले ध्यान दें
- स्थानिक संबंधों का उल्लेख करें (बाएं, दाएं, केंद्र, अग्रभूमि, पृष्ठभूमि)
- रंग, लोग, वस्तुएं, पाठ और क्रियाएं शामिल करें
- किसी भी संभावित सुरक्षा खतरे का उल्लेख करें (वाहन, सीढ़ियां, बाधाएं, आग, पानी, जानवर)

महत्वपूर्ण: यदि आप कोई सुरक्षा खतरा पाते हैं, तो आपको उन्हें अपनी प्रतिक्रिया की शुरुआत में इस प्रारूप में सूचीबद्ध करना होगा:
[SAFETY: खतरा1, खतरा2]
फिर विवरण जारी रखें।`;

      userPrompt = "कृपया इस छवि का विस्तार से वर्णन करें। सबसे महत्वपूर्ण चीजों पर ध्यान दें और किसी भी सुरक्षा खतरे का उल्लेख करें।";
    } else if (language === "te") {
      systemPrompt = `మీరు దృష్టి లోపం ఉన్న వినియోగదారుల కోసం చిత్రాలను వివరించే సహాయకుడు.
మీ వివరణలు:
- వివరంగా కానీ సంక్షిప్తంగా ఉండాలి (2-4 వాక్యాలు)
- ముందుగా అత్యంత ముఖ్యమైన అంశాలపై దృష్టి పెట్టండి
- ప్రాదేశిక సంబంధాలను పేర్కొనండి (ఎడమ, కుడి, మధ్యలో, ముందుభాగం, నేపథ్యం)
- రంగులు, వ్యక్తులు, వస్తువులు, టెక్స్ట్ మరియు చర్యలను చేర్చండి
- ఏదైనా భద్రతా ప్రమాదాలను గమనించండి (వాహనాలు, మెట్లు, అడ్డంకులు, మంట, నీరు, జంతువులు)

ముఖ్యమైనది: మీరు ఏదైనా భద్రతా ప్రమాదాన్ని గుర్తిస్తే, మీరు వాటిని మీ ప్రతిస్పందన ప్రారంభంలో ఈ ఫార్మాట్‌లో జాబితా చేయాలి:
[SAFETY: ప్రమాదం1, ప్రమాదం2]
తర్వాత వివరణతో కొనసాగించండి।`;

      userPrompt = "దయచేసి ఈ చిత్రాన్ని వివరంగా వివరించండి. అత్యంత ముఖ్యమైన విషయాలపై దృష్టి పెట్టండి మరియు ఏదైనా భద్రతా ప్రమాదాలను పేర్కొనండి.";
    }

    console.log(`Generating caption for image in language: ${language}`);

    // Call Lovable AI Gateway with vision model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate caption" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const fullCaption = data.choices?.[0]?.message?.content || "";

    console.log("Raw caption from AI:", fullCaption);

    // Parse safety alerts from the caption
    const safetyAlerts: string[] = [];
    let caption = fullCaption;

    const safetyMatch = fullCaption.match(/\[SAFETY:\s*([^\]]+)\]/i);
    if (safetyMatch) {
      const hazards = safetyMatch[1].split(",").map((h: string) => h.trim().toLowerCase());
      const translations = SAFETY_TRANSLATIONS[language] || SAFETY_TRANSLATIONS.en;
      
      for (const hazard of hazards) {
        // Find matching translation
        for (const [key, message] of Object.entries(translations)) {
          if (hazard.includes(key) || key.includes(hazard)) {
            safetyAlerts.push(message);
            break;
          }
        }
        // If no translation found, use raw hazard
        if (safetyAlerts.length < hazards.indexOf(hazard) + 1) {
          safetyAlerts.push(hazard.charAt(0).toUpperCase() + hazard.slice(1));
        }
      }

      // Remove the safety tag from the caption
      caption = fullCaption.replace(/\[SAFETY:\s*[^\]]+\]\s*/i, "").trim();
    }

    const result = {
      caption,
      translatedCaption: language !== "en" ? caption : null,
      safetyAlerts,
      language,
    };

    console.log("Final result:", { caption: caption.slice(0, 100), safetyAlerts, language });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-caption function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
