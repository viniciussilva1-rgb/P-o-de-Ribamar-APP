import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

// Fix: Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductionAdvice = async (currentProducts: Product[], weatherCondition: string): Promise<string> => {
  // Fix: Check process.env.API_KEY instead of local variable
  if (!process.env.API_KEY) return "API Key não configurada. Não é possível gerar conselhos.";

  try {
    const productList = currentProducts.map(p => `${p.name} (Meta: ${p.targetQuantity} ${p.unit})`).join(', ');
    
    const prompt = `
      Atue como um gerente de produção experiente da padaria "Pão de Ribamar".
      
      Lista de produtos e metas diárias atuais:
      ${productList}
      
      Cenário: A previsão do tempo para amanhã é "${weatherCondition}".
      
      Forneça um conselho curto (máximo 1 parágrafo) e prático sobre ajustes na produção considerando o clima e sugerindo talvez uma promoção ou foco específico.
      Seja motivador.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Sem conselhos no momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Erro ao consultar o assistente de produção. Verifique a conexão.";
  }
};