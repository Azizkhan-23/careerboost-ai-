
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured on the server."
    });
  }

  try {
    const { resume, jobDesc, systemPrompt, userPrompt } = req.body || {};

    if (
      typeof resume !== "string" ||
      typeof jobDesc !== "string" ||
      !resume.trim() ||
      !jobDesc.trim()
    ) {
      return res.status(400).json({
        error: "Please provide both your resume and job description."
      });
    }

    if (resume.length > 50000 || jobDesc.length > 20000) {
      return res.status(413).json({
        error: "The resume or job description is too long."
      });
    }

    if (
      typeof systemPrompt !== "string" ||
      typeof userPrompt !== "string"
    ) {
      return res.status(400).json({
        error: "The analysis prompt is missing."
      });
    }

    const prompt = systemPrompt + "\n\n" + userPrompt;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini request failed:", response.status);
      return res.status(502).json({
        error: data.error?.message || "Gemini analysis failed."
      });
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned no analysis. Please try again."
      });
    }

    return res.status(200).json({ text });
  } catch (error) {
    console.error("Analysis error:", error.message);

    return res.status(500).json({
      error: "An unexpected server error occurred."
    });
  }
};
