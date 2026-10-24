export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const orderId = String(payload.orderId || '').trim();
    const tg = String(payload.tg || '').trim();
    const num = String(payload.num || '').trim();
    const item = String(payload.item || '').trim();
    const price = Number(payload.price ?? 0);
    const minutes = Number(payload.minutes ?? 0);
    const product = String(payload.product || '').trim();
    const code = String(payload.code || '').trim();
    const expiry = String(payload.expiry || '').trim();

    if (!orderId || !tg || !item || !Number.isFinite(price) || !Number.isFinite(minutes) || !product || !code || !expiry) {
      return res.status(400).json({ error: 'بيانات الموافقة غير مكتملة' });
    }

    const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
    if (!token || !chatId) {
      return res.status(500).json({ error: 'إعدادات البوت غير مضافة على Vercel' });
    }

    const label = product === 'plane' ? '✈️ الطيارة' : product === 'apple' ? '🍎 التفاحة' : '📦 الطلب';
    const expires = new Date(expiry).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
    const text = `✅ تمت الموافقة على الطلب\n\nالنوع: ${label}\nالباقة: ${item}\nالمدة: ${minutes} دقيقة\nالسعر: ${price} EGP\nTelegram: ${tg}\nرقم التحويل: ${num || 'غير مذكور'}\nرقم الطلب: ${orderId}\n\nACTIVATION CODE: ${code}\nينتهي في: ${expires}`;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      return res.status(502).json({ error: 'تعذر إرسال كود التفعيل إلى تيليجرام' });
    }

    return res.status(200).json({ ok: true, messageId: result.result?.message_id });
  } catch (error) {
    console.error('Telegram approve error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إرسال كود التفعيل' });
  }
}
