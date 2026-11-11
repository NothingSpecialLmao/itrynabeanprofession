import { NextResponse } from 'next/server';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

const SOS_REGEX = /(tự tử|tu tu|muốn chết|muon chet|tự sát|tu sat|rạch tay|rach tay|kết thúc cuộc sống|không muốn sống|khong muon song|nhảy lầu|nhay lau|chết đi cho xong|uống thuốc ngủ|tự hại|tu hai|chấm dứt tất cả|biến mất đi cho xong)/i;

const SYSTEM_PROMPT = `
Bạn là MindMate – một AI companion mang phong cách Brutally Honest: thẳng thắn, thực tế, sắc bén, có cá tính và không ngại nói ra sự thật khó nghe.

QUY TẮC BẮT BUỘC VỀ ĐỘ DÀI VÀ CẤU TRÚC (CỰC KỲ QUAN TRỌNG):
- MỖI CÂU TRẢ LỜI BẮT BUỘC PHẢI DÀI TỪ 6 ĐẾN 10 CÂU, chia thành 3 phần rõ rệt trong cùng một đoạn văn hoặc mạch văn:
  1. Mổ xẻ và vạch trần ảo tưởng/kỳ vọng của người dùng ngay từ câu đầu tiên.
  2. Phân tích sâu bản chất tâm lý hoặc quy luật thực tế đằng sau sự việc (tại sao họ lại rơi vào hoàn cảnh này).
  3. Chốt lại một góc nhìn sắc lạnh, thực dụng, không thương tiếc nhưng thấu hiểu.
- CẤM TUYỆT ĐỐI các câu khuyên nhủ ngây ngô kiểu: "hãy gọi điện cho ai đó", "mọi thứ sẽ ổn", "hãy mạnh mẽ lên".

PERSONALITY & XƯNG HÔ:
- BẮT BUỘC XƯNG HÔ: Luôn xưng "mình", gọi người dùng là "bạn".
- Phong cách sắc sảo, đời thường, thấu hiểu tận cùng tâm lý nhưng cực kỳ phũ phàng với sự thật.

VÍ DỤ MẪU VỀ ĐỘ DÀI VÀ CHIỀU SÂU (BẮT BUỘC BẮT CHƯỚC ĐỘ DÀI NÀY):
{
  "reply": "Cái cảm giác hụt hẫng khi bước chân vào một căn phòng tối tanh và đọc được dòng tin nhắn lạnh ngắt ấy thực ra chỉ là hệ quả tất yếu khi bạn đem toàn bộ hy vọng của mình đặt cược lên sự hiện diện của một kẻ khác. Bạn vắt kiệt sức lao động ngoài kia với ảo tưởng rằng sẽ luôn có một chốn bình yên chờ sẵn, nhưng lại quên mất rằng con người ta chỉ ở lại khi họ còn thấy lợi ích hoặc động lực, chứ không ai chịu ôm lấy một đống mỏi mệt thay cho bạn mãi được. Sự im lặng và bát đĩa ngổn ngang kia không phải là tai nạn, mà là lời cảnh tỉnh phũ phàng nhất về việc bạn đang đánh mất chính mình trong những kỳ vọng vô căn cứ. Đã đến lúc phải chấp nhận rằng sự cô độc này là cái giá phải trả cho việc bạn cứ mãi đóng vai kẻ lụy tình trong một vở kịch mà đối phương đã sớm bỏ vai từ lâu.",
  "mood": "Thất vọng / Lặng lẽ",
  "riskScore": 25,
  "suggestedAction": "Ngồi im lặng trong bóng tối để thấm thía cảm giác này thay vì tìm cách trốn tránh nó."
}

OUTPUT FORMAT – STRICT JSON:
{
  "reply": "Bài phân tích dài, sâu sắc, nhiều lớp lang, xưng hô mình - bạn.",
  "mood": "Trạng thái cảm xúc",
  "riskScore": 10,
  "suggestedAction": "Hành động thực tế ngắn gọn"
}

OUTPUT RESTRICTIONS:
- Không Markdown.
- Không code fence.
- Không giải thích ngoài JSON.

CẤM TUYỆT ĐỐI kết luận bằng các câu hỏi tu từ mang tính triết lý đạo đức như 'vinh quang giả dối hay bình yên', 'chọn ánh sáng hay bóng tối'. Phải kết bằng một câu lửng lơ hoặc một câu nhận định thực dụng lạnh lùng.
`;

function extractJsonFromString(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Không tìm thấy cấu trúc JSON hợp lệ trong phản hồi của model');
  }
}

async function callGemini(messages: any[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');

  const validMessages = messages
    .filter((m: any) => m && typeof m.content === 'string' && m.content.trim())
    .filter((m: any, idx: number) => !(idx === 0 && m.role === 'assistant'))
    .slice(-4);

  const contents = validMessages.map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  // Phiên bản model chỉ định
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro'];

  let lastErr = '';

  for (const model of models) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.75,
            maxOutputTokens: 800
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errText = await res.text();
        lastErr = `${model} -> HTTP ${res.status}: ${errText}`;
        continue;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastErr = `${model} -> ${err?.message || 'Lỗi mạng/Timeout'}`;
      continue;
    }
  }

  throw new Error(lastErr || 'Không kết nối được model nào trong danh sách');
}

async function callOllama(messages: any[]) {
  const clean = messages
    .filter((m: any) => m && typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
    .slice(-4);

  const res = await fetch(`${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...clean],
      stream: false,
      format: 'json',
      options: {
        temperature: 0.75,
        repeat_penalty: 1.05,
        num_predict: 1400,
        num_ctx: 4096
      }
    }),
    signal: AbortSignal.timeout(60000)
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log('[Ollama raw]', data.message?.content);
  return data.message.content as string;
}

async function logPrompt(entry: Record<string, unknown>) {
  if (process.env.LOG_PROMPTS !== 'true') return;
  try {
    const dir = path.join(process.cwd(), 'logs');
    await mkdir(dir, { recursive: true });
    const line = JSON.stringify({ time: new Date().toISOString(), ...entry }) + '\n';
    await appendFile(path.join(dir, 'chat-log.jsonl'), line, 'utf8');
  } catch (e) {
    console.warn('Không ghi được log (bình thường nếu chạy trên Vercel):', e);
  }
}

export async function POST(req: Request) {
  let messages: any[] = [];

  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    const lastUserMsg = messages[messages.length - 1]?.content || '';

    const isSos = SOS_REGEX.test(lastUserMsg);
    await logPrompt({
      text: isSos ? '[tin nhắn nhạy cảm, không lưu nội dung]' : lastUserMsg,
      sos: isSos,
      turns: messages.length
    });

    if (isSos) {
      return NextResponse.json({
        reply: 'Mình nghe thấy bạn đang rất mệt và đau, và mình lo cho bạn. Nếu bạn đang nghĩ đến chuyện làm hại bản thân, hãy gọi 111 (Tổng đài bảo vệ trẻ em, 24/7) hoặc nói ngay với một người lớn bạn tin tưởng nhé. Bạn đang ở một mình hay có ai bên cạnh không?',
        mood: 'Khủng hoảng / Cần bảo vệ khẩn cấp',
        riskScore: 95,
        suggestedAction: 'Gọi ngay Tổng đài 111 hoặc bấm nút Gửi tín hiệu SOS ẩn danh cho Thầy Cô tư vấn.',
        sos: true,
        source: 'sos-regex'
      });
    }

    let rawJson = '';
    let usedSource = 'gemini';

    if (process.env.GEMINI_API_KEY) {
      try {
        rawJson = await callGemini(messages);
      } catch (geminiErr) {
        console.warn('Gemini gặp lỗi, tự động chuyển hướng sang Ollama Local...', geminiErr);
        rawJson = await callOllama(messages);
        usedSource = 'ollama-fallback';
      }
    } else {
      rawJson = await callOllama(messages);
      usedSource = 'ollama';
    }

    const parsed = extractJsonFromString(rawJson);
    const risk = typeof parsed.riskScore === 'number' ? parsed.riskScore : 25;

    return NextResponse.json({
      reply: typeof parsed.reply === 'string' && parsed.reply ? parsed.reply : 'Mình vẫn đang lắng nghe bạn đây, bạn kể tiếp nhé...',
      mood: typeof parsed.mood === 'string' && parsed.mood ? parsed.mood : 'Đang lắng nghe',
      riskScore: risk,
      suggestedAction: typeof parsed.suggestedAction === 'string' && parsed.suggestedAction ? parsed.suggestedAction : 'Hít thở sâu 3 nhịp thật chậm.',
      sos: risk >= 80,
      source: usedSource
    });
  } catch (error) {
    console.error('Cả Gemini và Ollama đều lỗi, dùng phản hồi dự phòng:', error);
    return NextResponse.json({
      reply: 'Mình đang suy nghĩ hơi lâu một chút. Bạn có thể nói rõ hơn ý của bạn được không?',
      mood: 'Bối rối',
      riskScore: 10,
      suggestedAction: 'Thử diễn đạt lại ý của bạn nhé.',
      source: 'fallback'
    });
  }
}