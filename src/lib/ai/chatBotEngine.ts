import connectToDatabase from '@/lib/mongodb';
import Product from '@/models/Product';
import Order from '@/models/Order';
import Setting from '@/models/Setting';
import ChatMessage from '@/models/ChatMessage';
import Conversation from '@/models/Conversation';
import { getProductCoverImage } from '@/lib/utils';

export interface IBotReplyResult {
  shouldReply: boolean;
  replyText?: string;
  senderName?: string;
  suggestedProducts?: Array<{
    name: string;
    price: number;
    salePrice?: number;
    image?: string;
    slug: string;
  }>;
  suggestedAction?: {
    type: 'link' | 'quick_replies';
    url?: string;
    label?: string;
    items?: string[];
  };
}

// 1. Helper: Get Chatbot Configuration
export async function getChatBotConfig() {
  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'chatbot_config' }).lean();
    if (setting && setting.value) {
      return {
        enabled: setting.value.enabled !== false,
        botName: setting.value.botName || 'AI Trợ Lý ShopBig',
        welcomeMessage:
          setting.value.welcomeMessage ||
          'Dạ chào bạn! Em là Trợ lý AI của shop. Em có thể giúp bạn tư vấn chọn size chuẩn xác, tìm kiếm sản phẩm, tra cứu đơn hàng hoặc giải đáp chính sách cửa hàng 24/7 ạ!',
        geminiApiKey: setting.value.geminiApiKey || process.env.GEMINI_API_KEY || '',
      };
    }
  } catch (err) {
    console.error('Error fetching chatbot config:', err);
  }

  return {
    enabled: true,
    botName: 'AI Trợ Lý ShopBig',
    welcomeMessage:
      'Dạ chào bạn! Em là Trợ lý AI của shop. Em có thể giúp bạn tư vấn chọn size chuẩn xác, tìm kiếm sản phẩm, tra cứu đơn hàng hoặc giải đáp chính sách cửa hàng 24/7 ạ!',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  };
}

// 2. Helper: Extract Height (cm) & Weight (kg) from Vietnamese Text
function parseBodyMeasurements(text: string): { height?: number; weight?: number; footLength?: number } {
  const t = text.toLowerCase();
  let height: number | undefined;
  let weight: number | undefined;
  let footLength: number | undefined;

  // Height matching: 1m72, 1m7, 1.72m, 172cm, m70, m75, 1m68
  const heightPatterns = [
    /(?:cao\s*)?1[m,.](\d{1,2})\b/i, // 1m72, 1.72, 1m7
    /(?:cao\s*)?m(\d{2})\b/i, // m70, m75
    /(?:cao\s*)?(\d{3})\s*(?:cm)?\b/i, // 172cm, 165
  ];

  for (const p of heightPatterns) {
    const match = t.match(p);
    if (match) {
      let num = match[1];
      if (num.length === 1) num = num + '0'; // 1m7 -> 170cm
      if (num.length === 2) {
        height = 100 + parseInt(num, 10);
      } else if (num.length === 3) {
        const val = parseInt(num, 10);
        if (val >= 140 && val <= 210) height = val;
      }
      if (height) break;
    }
  }

  // Weight matching: 65kg, 65 kg, 65 ký, 65 cân, nặng 65
  const weightPatterns = [
    /(\d{2,3})\s*(?:kg|kí|ký|cân)\b/i,
    /(?:nặng\s*)(\d{2,3})\b/i,
  ];

  for (const p of weightPatterns) {
    const match = t.match(p);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 35 && val <= 150) {
        weight = val;
        break;
      }
    }
  }

  // Foot length (giày): 25.5cm, chân 26cm
  const footPatterns = [/(?:chân|bàn chân)\s*(?:dài\s*)?(\d{2}(?:[.,]\d)?)\s*(?:cm)?/i, /(\d{2}(?:[.,]\d)?)\s*cm/i];
  for (const p of footPatterns) {
    const match = t.match(p);
    if (match) {
      const val = parseFloat(match[1].replace(',', '.'));
      if (val >= 22 && val <= 30) {
        footLength = val;
        break;
      }
    }
  }

  return { height, weight, footLength };
}

// 3. Helper: Recommend Size for Apparel / Shoes
function calculateRecommendedSize(
  height?: number,
  weight?: number,
  footLength?: number,
  productType: 'shirt' | 'pants' | 'dress' | 'shoes' = 'shirt'
): { size: string; explanation: string } {
  // Shoes
  if (footLength || productType === 'shoes') {
    const fl = footLength || 25;
    let shoeSize = '40';
    if (fl <= 24.5) shoeSize = '39';
    else if (fl <= 25.2) shoeSize = '40';
    else if (fl <= 26.0) shoeSize = '41';
    else if (fl <= 26.7) shoeSize = '42';
    else shoeSize = '43';

    return {
      size: `Size ${shoeSize}`,
      explanation: `Dựa vào chiều dài bàn chân ~${fl}cm, bạn mang vừa đẹp nhất là **Size ${shoeSize}** nhé. Nếu chân bạn bè ngang nhiều, có thể tăng thêm 1 size để êm chân hơn khi vận động ạ!`,
    };
  }

  // Dress (Đầm nữ)
  if (productType === 'dress') {
    const w = weight || 50;
    let dressSize = 'M (48-55kg)';
    if (w < 48) dressSize = 'S (40-48kg)';
    else if (w <= 55) dressSize = 'M (48-55kg)';
    else dressSize = 'L (55-62kg)';

    return {
      size: dressSize,
      explanation: `Với cân nặng ${w}kg, bạn mặc xinh và tôn dáng nhất là **${dressSize}** nhé!`,
    };
  }

  // Pants (Quần Jean / Thể thao)
  if (productType === 'pants') {
    const w = weight || 62;
    let pantSize = '30 (58-64kg)';
    if (w <= 57) pantSize = '29 (50-57kg)';
    else if (w <= 64) pantSize = '30 (58-64kg)';
    else if (w <= 70) pantSize = '31 (65-70kg)';
    else if (w <= 77) pantSize = '32 (71-77kg)';
    else pantSize = '33 (78-85kg)';

    return {
      size: pantSize,
      explanation: `Với cân nặng ${w}kg, bạn mặc vừa vặn nhất là **${pantSize}** nhé!`,
    };
  }

  // Standard Shirts / Jerseys (Áo thể thao, Áo đá bóng, Polo)
  const w = weight || 65;
  const h = height || 170;

  let shirtSize = 'L (65-75kg)';
  let note = '';

  if (w < 55) {
    shirtSize = 'S (45-55kg)';
    note = 'vừa vặn, tôn dáng';
  } else if (w < 65) {
    shirtSize = h > 173 ? 'L (65-75kg)' : 'M (55-65kg)';
    note = h > 173 ? 'chiều dài áo thoải mái theo chiều cao' : 'vừa vặn đẹp chuẩn';
  } else if (w <= 75) {
    shirtSize = 'L (65-75kg)';
    note = 'ôm vừa người rất thoải mái';
  } else if (w <= 85) {
    shirtSize = 'XL (75-85kg)';
    note = 'rộng rãi dễ chịu khi vận động';
  } else {
    shirtSize = 'XXL (85-95kg)';
    note = 'form to thoải mái';
  }

  return {
    size: shirtSize,
    explanation: `Dựa trên số đo chiều cao ${h}cm và cân nặng ${w}kg, bạn mặc đẹp và phù hợp nhất là **${shirtSize}** (${note}) ạ. Nếu bạn thích mặc rộng thoải mái khi thi đấu/vận động có thể nhích lên 1 size nhé!`,
  };
}

// 4. Helper: Intelligent Local Product Search (Zero-cost RAG with Smart Scoring)
async function searchStoreProducts(query: string) {
  try {
    await connectToDatabase();
    const clean = query
      .toLowerCase()
      .replace(/(?:shop\s+)?(?:có\s+)?(?:tìm\s+)?(?:mẫu\s+)?(?:sản\s+phẩm\s+)?(?:không\s+ạ\??|không\??|ko\??|ạ\??)/gi, '')
      .trim();

    if (!clean || clean.length < 2) return [];

    const stopWords = ['này', 'cho', 'mình', 'với', 'giúp', 'của', 'ở', 'được', 'gì', 'các', 'những'];
    const keywords = clean.split(/\s+/).filter((k) => k.length > 1 && !stopWords.includes(k));

    const allProducts = await Product.find({ status: 'active' })
      .select('name slug price salePrice images isFeatured stock')
      .lean();

    // Score products based on matching keywords & category intent
    const scored = allProducts.map((p) => {
      const pName = (p.name || '').toLowerCase();
      let score = 0;

      // Exact brand / specific token matches (e.g. akka, jgbl, kaiwin, hà nội, real, polo)
      keywords.forEach((kw) => {
        if (pName.includes(kw)) {
          score += 5;
        }
      });

      // Category matching
      if (clean.includes('giày') && pName.includes('giày')) score += 10;
      if (clean.includes('áo') && (pName.includes('áo') || pName.includes('set'))) score += 8;
      if (clean.includes('balo') && pName.includes('balo')) score += 10;
      if (clean.includes('đầm') && pName.includes('đầm')) score += 10;
      if (clean.includes('salonpas') && pName.includes('salonpas')) score += 10;
      if (clean.includes('quần') && pName.includes('quần')) score += 10;
      if (clean.includes('bóng') && !clean.includes('giày') && !clean.includes('áo') && pName.includes('bóng')) score += 10;

      return { product: p, score };
    });

    const results = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.product);

    return results;
  } catch (err) {
    console.error('Error searching store products:', err);
    return [];
  }
}

// 5. Helper: Real-time Catalog Digest Generator for AI (Catalog RAG)
async function getCatalogDigestForAI(userQuery: string): Promise<string> {
  try {
    await connectToDatabase();
    const matched = await searchStoreProducts(userQuery);
    const featured = await Product.find({ status: 'active' })
      .select('name slug price salePrice stock')
      .limit(6)
      .lean();

    const combined: any[] = [...matched];
    for (const f of featured) {
      if (!combined.some((c) => c.slug === (f as any).slug)) {
        combined.push(f);
      }
    }

    if (combined.length === 0) return '';

    let digest = 'DANH SÁCH SẢN PHẨM THỰC TẾ TRONG KHO (DÙNG ĐỂ TƯ VẤN, BÁO GIÁ VÀ GỬI LINK):\n';
    combined.slice(0, 6).forEach((p: any, idx: number) => {
      const priceStr = (p.salePrice || p.price || 0).toLocaleString('vi-VN') + '₫';
      const origStr = p.salePrice && p.price > p.salePrice ? ` (Giá gốc: ${p.price.toLocaleString('vi-VN')}₫)` : '';
      digest += `${idx + 1}. **${p.name}** | Giá sale: ${priceStr}${origStr} | Link: /product/${p.slug} | Tồn kho: ${p.stock || 'Sẵn hàng'}\n`;
    });

    return digest;
  } catch (err) {
    console.error('Error creating catalog digest:', err);
    return '';
  }
}

// 6. Main AI Bot Response Generator (Advanced Hybrid Engine)
export async function generateBotResponse(params: {
  text: string;
  conversationId: string;
  customerName?: string;
  productContext?: {
    name?: string;
    price?: number;
    image?: string;
    slug?: string;
  };
}): Promise<IBotReplyResult> {
  const config = await getChatBotConfig();
  if (!config.enabled) {
    return { shouldReply: false };
  }

  const userText = params.text.trim();
  const lowerText = userText.toLowerCase();
  const botName = config.botName;

  // CASE 1: ORDER TRACKING LOOKUP (Tra cứu đơn hàng #ST...)
  const orderCodeMatch = userText.match(/(?:#?)(ST\d{6})/i);
  if (orderCodeMatch || lowerText.includes('tra cứu') || lowerText.includes('đơn hàng') || lowerText.includes('mã đơn')) {
    if (orderCodeMatch) {
      const code = orderCodeMatch[1].toUpperCase();
      try {
        await connectToDatabase();
        const order = await Order.findOne({ orderCode: code }).lean();
        if (order) {
          const statusMap: Record<string, string> = {
            pending: '⏳ Đang chờ xác nhận',
            confirmed: '✅ Đã xác nhận đơn hàng',
            shipping: '🚚 Đang bàn giao vận chuyển',
            delivering: '🛵 Shipper đang giao hàng',
            delivered: '🎉 Đã giao hàng thành công',
            cancelled: '❌ Đã hủy đơn',
            returned: '↩️ Đã chuyển hoàn',
          };

          const statusText = statusMap[order.status] || order.status;
          const carrier = order.shippingCarrier || order.shippingProvider?.toUpperCase() || 'ĐVVC đối tác';
          const trackingCode = order.trackingCode ? ` (Mã vận đơn: \`${order.trackingCode}\`)` : '';
          const totalFormatted = (order.totalAmount || 0).toLocaleString('vi-VN') + ' ₫';

          const reply = `Dạ em đã kiểm tra thông tin đơn hàng **#${code}** của bạn:\n\n` +
            `• **Khách nhận:** ${order.customer?.name || 'Quý khách'} (${order.customer?.phone || ''})\n` +
            `• **Trạng thái:** **${statusText}**\n` +
            `• **Tổng tiền:** ${totalFormatted} (${order.paymentMethod === 'bank_transfer' ? (order.paymentStatus === 'paid' ? 'Đã thanh toán qua VietQR ✓' : 'Chờ thanh toán') : 'Thanh toán COD khi nhận'})\n` +
            `• **Vận chuyển:** ${carrier}${trackingCode}\n\n` +
            `👉 Bạn có thể xem lộ trình giao hàng trực tiếp tại: [/tracking?code=${code}](/tracking?code=${code})\n\n` +
            `Nếu bạn cần hỗ trợ thêm gì về đơn hàng, cứ nhắn em nhé! 😊`;

          return {
            shouldReply: true,
            replyText: reply,
            senderName: botName,
          };
        } else {
          return {
            shouldReply: true,
            replyText: `Dạ em tra cứu nhưng chưa tìm thấy đơn hàng **#${code}** trên hệ thống. Bạn vui lòng kiểm tra lại mã đơn hàng (dạng #STxxxxxx) giúp em nhé ạ!`,
            senderName: botName,
          };
        }
      } catch (err) {
        console.error('Bot order lookup error:', err);
      }
    }
  }

  // CASE 2: GOOGLE GEMINI GENERATIVE AI (Khi có API Key)
  if (config.geminiApiKey) {
    try {
      const catalogDigest = await getCatalogDigestForAI(userText);
      const matchedProducts = await searchStoreProducts(userText);

      // Multi-turn Conversation History Memory (6 recent messages)
      let historyContents: any[] = [];
      try {
        await connectToDatabase();
        const recentPast = await ChatMessage.find({ conversationId: params.conversationId })
          .sort({ createdAt: -1 })
          .limit(6)
          .lean();

        recentPast.reverse().forEach((pm) => {
          if (pm.text && pm.text.trim() && pm.text !== userText) {
            historyContents.push({
              role: pm.sender === 'user' ? 'user' : 'model',
              parts: [{ text: pm.text.trim() }],
            });
          }
        });
      } catch (hErr) {
        console.warn('Could not load chat history:', hErr);
      }

      const prompt = `Bạn là Chuyên Viên Tư Vấn Bán Hàng & Chuyên Gia Thể Thao Xuất Sắc của cửa hàng "ShopBig Store".

${catalogDigest}

Thông tin ngữ cảnh:
- Tên khách hàng: ${params.customerName || 'Khách hàng'}
- Sản phẩm khách đang xem: ${params.productContext?.name || 'Không có'} (Giá: ${params.productContext?.price ? params.productContext.price.toLocaleString('vi-VN') + 'đ' : 'N/A'})
- Câu hỏi mới nhất của khách: "${userText}"

Quy tắc tư vấn bán hàng đỉnh cao (Elite Sales Consultant):
1. Xưng hô "em" và gọi khách là "bạn" hoặc "anh/chị", giọng điệu nhiệt tình, am hiểu chuyên môn sâu, truyền cảm hứng và thân thiện với emoji sống động.
2. TUYỆT ĐỐI KHÔNG LIỆT KÊ TRÀN LAN danh sách dài. Hãy chọn lọc đúng 1 ĐẾN 2 SẢN PHẨM PHÙ HỢP NHẤT từ danh mục trên, nêu rõ lý do tại sao mẫu này đáng mua (chất liệu vải thun lạnh thoáng khí, da bóng êm đầm chân, đế cao su bám sân...).
3. Báo giá sale ưu đãi chính xác và CHÈN ĐƯỜNG LINK CLICKABLE dạng [Xem chi tiết & đặt mua](/product/slug) để khách bấm vào xem ngay!
4. Nhấn mạnh chính sách: Freeship toàn quốc, Đổi size miễn phí trong 7 ngày, và Kiểm tra hàng trước khi thanh toán COD.
5. Luôn kết thúc bằng 1 câu hỏi gợi mở khéo léo (về kích thước, màu sắc, vị trí thi đấu...) để tiếp tục tương tác và giúp khách chốt đơn.
6. Trả lời súc tích, tự nhiên trong khoảng 2 - 3 đoạn ngắn gọn.`;

      historyContents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const supportedModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
      let generatedText = '';

      for (const model of supportedModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: historyContents,
                generationConfig: { maxOutputTokens: 650, temperature: 0.7 },
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts
              ?.filter((p: any) => p.text && !p.thought)
              ?.map((p: any) => p.text)
              ?.join('\n');

            if (text?.trim()) {
              generatedText = text.trim();
              break;
            }
          }
        } catch (mErr) {
          // continue to next model
        }
      }

      if (generatedText) {
        const suggestedCards = matchedProducts.slice(0, 3).map((p: any) => ({
          name: p.name,
          price: p.price,
          salePrice: p.salePrice,
          image: getProductCoverImage(p, ''),
          slug: p.slug,
        }));

        return {
          shouldReply: true,
          replyText: generatedText,
          senderName: botName,
          suggestedProducts: suggestedCards.length > 0 ? suggestedCards : undefined,
        };
      }
    } catch (geminiErr: any) {
      console.warn('Gemini API call failed, falling back to smart local NLP:', geminiErr?.message || geminiErr);
    }
  }

  // CASE 3: LOCAL SIZE ADVISOR (FALLBACK KHI KHÔNG CÓ GEMINI HOẶC GEMINI LỖI)
  const measurements = parseBodyMeasurements(userText);
  const isAskingSize =
    lowerText.includes('size') ||
    lowerText.includes('kích cỡ') ||
    lowerText.includes('mặc vừa') ||
    lowerText.includes('vừa không') ||
    (lowerText.includes('tư vấn') && (lowerText.includes('áo') || lowerText.includes('quần') || lowerText.includes('giày') || lowerText.includes('đầm'))) ||
    (measurements.height !== undefined && measurements.weight !== undefined);

  if (isAskingSize) {
    let prodType: 'shirt' | 'pants' | 'dress' | 'shoes' = 'shirt';
    const prodName = (params.productContext?.name || userText).toLowerCase();

    if (prodName.includes('giày') || prodName.includes('giay') || prodName.includes('boot') || measurements.footLength) {
      prodType = 'shoes';
    } else if (prodName.includes('quần') || prodName.includes('jean')) {
      prodType = 'pants';
    } else if (prodName.includes('đầm') || prodName.includes('dam') || prodName.includes('váy')) {
      prodType = 'dress';
    }

    if (measurements.height || measurements.weight || measurements.footLength) {
      const rec = calculateRecommendedSize(measurements.height, measurements.weight, measurements.footLength, prodType);
      const prodMention = params.productContext?.name ? ` đối với sản phẩm **"${params.productContext.name}"**` : '';

      const reply = `Dạ${prodMention}, ${rec.explanation}\n\n` +
        `💡 **Shop cam kết:** Hỗ trợ đổi size miễn phí trong vòng 7 ngày nếu bạn mặc chưa vừa ý nha! Bạn có muốn đặt mẫu này luôn không ạ?`;

      return {
        shouldReply: true,
        replyText: reply,
        senderName: botName,
      };
    }
  }

  // CASE 4: LOCAL PRODUCT SEARCH
  const isExplicitSearch =
    lowerText.startsWith('tìm') ||
    lowerText.startsWith('có mẫu') ||
    lowerText.includes('có bán') ||
    lowerText.includes('có áo') ||
    lowerText.includes('có giày') ||
    lowerText.includes('có bóng') ||
    lowerText.includes('có balo') ||
    lowerText.includes('mẫu áo') ||
    lowerText.includes('mẫu giày') ||
    lowerText.includes('mẫu bóng');

  if (isExplicitSearch) {
    const matchedProducts = await searchStoreProducts(userText);
    if (matchedProducts.length > 0) {
      let reply = `Dạ bên shop có mẫu này đang có sẵn hàng và cực kỳ hot, đúng nhu cầu của bạn ạ:\n\n`;
      matchedProducts.forEach((p: any) => {
        const pPrice = (p.salePrice || p.price || 0).toLocaleString('vi-VN') + ' ₫';
        const oldPrice = p.salePrice && p.price > p.salePrice ? ` ~${p.price.toLocaleString('vi-VN')} ₫~` : '';
        reply += `🌟 **${p.name}**\n💰 Giá ưu đãi: **${pPrice}**${oldPrice}\n👉 [Bấm vào đây để xem chi tiết & chọn size](/product/${p.slug})\n\n`;
      });
      reply += `Bạn cần em tư vấn thêm màu sắc, bảng size hay quà tặng kèm của mẫu nào cứ nhắn em nhé! 😊`;

      return {
        shouldReply: true,
        replyText: reply,
        senderName: botName,
      };
    }
  }

  // CASE 5: BUYING & ORDERING INTENT
  if (lowerText.includes('mua ngay') || lowerText.includes('đặt hàng') || lowerText.includes('chốt đơn') || lowerText.includes('cách mua')) {
    return {
      shouldReply: true,
      replyText: `🚀 **Cách Đặt Hàng Nhanh Chóng Tại ShopBig:**\n\n` +
        `1. Bạn có thể bấm nút **"Mua Ngay"** trên trang sản phẩm để chọn size, điền địa chỉ nhận hàng và đặt đơn trong 30 giây.\n` +
        `2. Hoặc bạn có thể **nhắn tin SĐT + Địa chỉ** ngay tại đây, nhân viên CSKH của shop sẽ gọi điện xác nhận và gửi hàng nhanh cho bạn nhé!\n\n` +
        `🎁 Đơn hàng được **Freeship toàn quốc** và kiểm tra hàng trước khi thanh toán ạ!`,
      senderName: botName,
    };
  }

  // CASE 6: DISCOUNTS & PROMOTIONS
  if (lowerText.includes('khuyến mãi') || lowerText.includes('voucher') || lowerText.includes('giảm giá') || lowerText.includes('ưu đãi') || lowerText.includes('mã giảm')) {
    return {
      shouldReply: true,
      replyText: `🎁 **Chương Trình Khuyến Mãi & Ưu Đãi Hôm Nay:**\n\n` +
        `• 🔥 **Giảm trực tiếp 15% - 35%** trên toàn bộ sản phẩm (đã áp dụng giá sale trên web).\n` +
        `• 🚚 **Freeship toàn quốc**.\n` +
        `• ⚽ **Quà tặng kèm:** Tặng 01 kim bơm chống gỉ + túi lưới khi mua Quả bóng đá.\n` +
        `• 🛡️ **Bảo hành 1 đổi 1** và đổi size miễn phí trong 7 ngày!\n\n` +
        `Bạn đang quan tâm mẫu nào để em báo giá tốt nhất cho bạn nhé ạ?`,
      senderName: botName,
    };
  }

  // CASE 7: STORE POLICIES
  if (lowerText.includes('freeship') || lowerText.includes('phí ship') || lowerText.includes('vận chuyển') || lowerText.includes('giao hàng')) {
    return {
      shouldReply: true,
      replyText: `🚚 **Chính Sách Vận Chuyển & Giao Hàng của Shop:**\n\n` +
        `• **Miễn phí giao hàng (Freeship):** Áp dụng toàn quốc.\n` +
        `• **Thời gian giao hàng:**\n` +
        `  - Nội thành Hà Nội / TP.HCM: 1 - 2 ngày làm việc.\n` +
        `  - Các tỉnh thành khác: 2 - 4 ngày qua đối tác GHN / GHTK.\n` +
        `• **Kiểm tra hàng:** Bạn được mở kiểm tra hàng trước khi thanh toán COD nha!`,
      senderName: botName,
    };
  }

  if (lowerText.includes('đổi trả') || lowerText.includes('bảo hành') || lowerText.includes('đổi size')) {
    return {
      shouldReply: true,
      replyText: `🛡️ **Chính Sách Đổi Trả & Bảo Hành:**\n\n` +
        `• Hỗ trợ **đổi size / đổi mẫu trong 7 ngày** kể từ ngày nhận hàng nếu không vừa hoặc chưa ưng ý.\n` +
        `• Đổi mới 1:1 miễn phí 100% nếu sản phẩm có lỗi từ xưởng sản xuất (bung chỉ, lỗi in, vỡ van bóng...).\n` +
        `• Sản phẩm đổi trả cần giữ nguyên tem mác và chưa qua giặt tẩy bạn nhé!`,
      senderName: botName,
    };
  }

  if (lowerText.includes('thanh toán') || lowerText.includes('chuyển khoản') || lowerText.includes('vietqr') || lowerText.includes('cod')) {
    return {
      shouldReply: true,
      replyText: `💳 **Hình Thức Thanh Toán Tại Shop:**\n\n` +
        `1. **Thanh toán khi nhận hàng (COD):** Nhận hàng kiểm tra xong mới gửi tiền cho Shipper.\n` +
        `2. **Quét mã VietQR SePay:** Chuyển khoản tự động qua mã QR động, hệ thống xác nhận thanh toán thành công trong 1 giây mà không cần gửi bill!`,
      senderName: botName,
    };
  }

  if (lowerText.includes('xin chào') || lowerText.includes('chào shop') || lowerText.includes('hello') || lowerText.includes('hi shop') || lowerText === 'hi' || lowerText === 'alo') {
    const prodGreeting = params.productContext?.name
      ? ` Bạn đang quan tâm mẫu **"${params.productContext.name}"** đúng không ạ?`
      : '';
    return {
      shouldReply: true,
      replyText: `Dạ chào bạn! Rất vui được hỗ trợ bạn hôm nay ạ.${prodGreeting} Bạn cần em tư vấn chọn size, tìm sản phẩm hay kiểm tra đơn hàng cứ nhắn cho em nhé! 🌟`,
      senderName: botName,
    };
  }

  // DEFAULT SMART BOT FALLBACK
  return {
    shouldReply: true,
    replyText: `Dạ em đã ghi nhận tin nhắn của bạn! Em là AI Trợ Lý của shop. Bạn có thể cho em biết thêm thông tin (chiều cao, cân nặng để tư vấn size, tên mẫu bạn cần tìm hoặc mã đơn #ST... để kiểm tra đơn) để em hỗ trợ bạn nhanh nhất nhé ạ! 😊`,
    senderName: botName,
  };
}
