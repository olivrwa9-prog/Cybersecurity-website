export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const tg = String(payload.tg || '').trim();
    const num = String(payload.num || '').trim();
    const item = String(payload.item || '').trim();
    const price = Number(payload.price ?? 0);
    const minutes = Number(payload.minutes ?? 0);
    const product = String(payload.product || '').trim();
    const screenshot = typeof payload.screenshot === 'string' ? payload.screenshot : typeof payload.img === 'string' ? payload.img : '';

    if (!tg || !num || !item || !Number.isFinite(price) || !Number.isFinite(minutes) || !product || !screenshot) {
      return res.status(400).json({ error: 'بيانات الطلب غير مكتملة' });
    }

    if (!String(screenshot).startsWith('data:image/')) {
      return res.status(400).json({ error: 'ملف التحويل غير صالح' });
    }

    const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
    if (!token || !chatId) {
      return res.status(500).json({ error: 'إعدادات البوت غير مضبوطة على الخادم' });
    }

    const dataUrl = screenshot.trim();
    const commaIndex = dataUrl.indexOf(',');
    const mime = dataUrl.slice(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';')) || 'image/jpeg';
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    const binary = Buffer.from(base64, 'base64');

    if (binary.length > 4 * 1024 * 1024) {
      return res.status(413).json({ error: 'الصورة أكبر من الحد المسموح' });
    }

    const label = product === 'plane' ? '✈️ الطيارة' : product === 'apple' ? '🍎 التفاحة' : '📦 الطلب';
    const text = `🛒 طلب كود تفعيل جديد\n\nالنوع: ${label}\nالباقة: ${item}\nالمدة: ${minutes} دقيقة\nالسعر: ${price} EGP\nTelegram: ${tg}\nرقم التحويل: ${num}\n\nراجع الصورة ثم وافق من لوحة تحكم الموقع لتوليد الكود.`;

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', text);
    form.append('photo', new Blob([binary], { type: mime }), 'payment.jpg');

    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form
    });

    const result = await tgResponse.json();
    if (!tgResponse.ok || !result.ok) {
      return res.status(502).json({ error: 'تعذر إرسال الطلب إلى تيليجرام' });
    }

    return res.status(200).json({ ok: true, messageId: result.result?.message_id });
  } catch (error) {
    console.error('Telegram order error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إرسال الطلب' });
  }
}
