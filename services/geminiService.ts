import { GoogleGenAI, Type } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

function extractJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("AI JSON Parse Error:", e, "Raw text:", text);
    return null;
  }
}

export async function interpretNoteAI(note: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [{
          text: `আপনি শান্তি মেডিকেয়ার (সরদারপাড়া বাজার, আটোয়ারী) এর একজন ফার্মাসিস্ট। নিচের ওষুধের লিস্টটি বিশ্লেষণ করুন: "${note}"। 
          Google Search ব্যবহার করে প্রতিটি ওষুধের বর্তমান সঠিক বাজারমূল্য (BDT), সঠিক বানান এবং পাওয়ার (যেমন: 20mg, 500mg) নিশ্চিত করুন। 
          
          নির্দেশনা:
          ১. প্রতিটি ওষুধের নাম ও স্ট্রেন্থ বের করুন।
          ২. বাংলাদেশে বর্তমান আনুমানিক MRP মূল্য বের করুন।
          ৩. নিচের JSON ফরম্যাটে উত্তর দিন:
          {"items": [{"name": "ওষুধের নাম ও পাওয়ার", "price": 10.0, "category": "ট্যাবলেট/সিরাপ", "quantity": 1, "unit": "piece/strip"}]}`
        }]
      },
      config: {
        tools: [{googleSearch: {}}],
      }
    });

    const text = response.text || "";
    const items = extractJSON(text.trim())?.items || [];
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "তথ্যাদি",
      uri: chunk.web?.uri
    })) || [];

    return { items, sources };
  } catch (error) {
    console.error("AI Error:", error);
    return { items: [], sources: [] };
  }
}

export async function analyzePrescriptionAI(base64Image: string) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1],
            },
          },
          {
            text: `এই প্রেসক্রিপশনটি বিশ্লেষণ করুন। Google Search ব্যবহার করে ওষুধের নাম এবং বাংলাদেশে বর্তমান সঠিক বাজারমূল্য যাচাই করুন। 
            ফলাফলটি JSON ফরম্যাটে দিন যাতে "items" কী-তে ওষুধের নাম, দাম (প্রতি পিস), এবং ক্যাটাগরি থাকে।`
          }
        ]
      },
      config: {
        tools: [{googleSearch: {}}],
      }
    });

    const text = response.text || "";
    const items = extractJSON(text.trim())?.items || [];
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "তথ্যাদি",
      uri: chunk.web?.uri
    })) || [];
    
    return { items, sources };
  } catch (error) {
    console.error("Prescription AI Error:", error);
    return { items: [], sources: [] };
  }
}