import { getDBShippingConfig } from './configHelper';
import { resolveShippingAddress } from './addressHelper';

// Viettel Post Integration Base API URL
const VIETTELPOST_API_URL = process.env.VIETTELPOST_API_URL || 'https://partner.viettelpost.vn/v2';

let cachedJWT: { token: string; exp: number } | null = null;
let cachedProvinces: any[] | null = null;
const cachedDistricts = new Map<number, any[]>();
const cachedWards = new Map<number, any[]>();

/**
 * Clean & normalize location string for accurate Viettel Post matching
 */
function cleanLocationStr(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .replace(/^(tỉnh|thành phố|tp\.?|quận|huyện|thị xã|tx\.?|phường|xã|thị trấn|p\.?|q\.?)\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b1\b/g, 'i')
    .replace(/\b2\b/g, 'ii')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b5\b/g, 'v')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Authenticates with Viettel Post using the partner secret token
 */
export async function getViettelPostAuthToken(rawToken: string): Promise<string> {
  if (!rawToken) return '';
  if (rawToken.startsWith('eyJ')) return rawToken;

  if (cachedJWT && cachedJWT.exp > Date.now()) {
    return cachedJWT.token;
  }

  try {
    const res = await fetch(`${VIETTELPOST_API_URL}/user/LoginVTP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: rawToken.trim() }),
    });
    const data = await res.json();
    if (data.status === 200 && data.data?.token) {
      cachedJWT = {
        token: data.data.token,
        exp: (data.data.expired || Date.now() + 86400000) - 60000,
      };
      return data.data.token;
    }
  } catch (e) {
    console.error('Error logging in to Viettel Post via LoginVTP:', e);
  }
  return rawToken;
}

/**
 * Retrieves the store warehouse/inventory list from Viettel Post
 */
export async function getViettelPostInventories(rawToken?: string): Promise<any[]> {
  try {
    const dbConfig = await getDBShippingConfig();
    const tokenStr = rawToken || dbConfig.carriers.viettelpost.token || process.env.VIETTELPOST_TOKEN || '';
    if (!tokenStr) return [];

    const jwt = await getViettelPostAuthToken(tokenStr);
    const res = await fetch(`${VIETTELPOST_API_URL}/user/listInventory`, {
      headers: { Token: jwt },
    });
    const data = await res.json().catch(() => null);
    if (data && data.status === 200 && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (e) {
    console.error('Error fetching Viettel Post inventory list:', e);
  }
  return [];
}

/**
 * Resolves province, district, ward names to Viettel Post IDs
 */
export async function resolveViettelPostLocation(
  provinceName: string,
  districtName: string,
  wardName: string
) {
  try {
    if (!cachedProvinces) {
      const res = await fetch(`${VIETTELPOST_API_URL}/categories/listProvince`);
      const data = await res.json().catch(() => null);
      cachedProvinces = data?.data || [];
    }

    const pClean = cleanLocationStr(provinceName);
    let matchedP = (cachedProvinces || []).find((p) => cleanLocationStr(p.PROVINCE_NAME) === pClean);
    if (!matchedP) {
      matchedP =
        (cachedProvinces || []).find(
          (p) =>
            cleanLocationStr(p.PROVINCE_NAME).includes(pClean) ||
            pClean.includes(cleanLocationStr(p.PROVINCE_NAME))
        ) || cachedProvinces?.[0];
    }

    const pId = matchedP?.PROVINCE_ID || 1;

    if (!cachedDistricts.has(pId)) {
      const res = await fetch(`${VIETTELPOST_API_URL}/categories/listDistrict?provinceId=${pId}`);
      const data = await res.json().catch(() => null);
      cachedDistricts.set(pId, data?.data || []);
    }
    const districts = cachedDistricts.get(pId) || [];

    const dClean = cleanLocationStr(districtName);
    let matchedD = districts.find((d) => cleanLocationStr(d.DISTRICT_NAME) === dClean);
    if (!matchedD) {
      matchedD =
        districts.find(
          (d) =>
            cleanLocationStr(d.DISTRICT_NAME).includes(dClean) ||
            dClean.includes(cleanLocationStr(d.DISTRICT_NAME))
        ) || districts[0];
    }

    const dId = matchedD?.DISTRICT_ID || 1;

    if (!cachedWards.has(dId)) {
      const res = await fetch(`${VIETTELPOST_API_URL}/categories/listWards?districtId=${dId}`);
      const data = await res.json().catch(() => null);
      cachedWards.set(dId, data?.data || []);
    }
    const wards = cachedWards.get(dId) || [];

    const wClean = cleanLocationStr(wardName);
    let matchedW = wards.find((w) => cleanLocationStr(w.WARDS_NAME) === wClean);
    if (!matchedW) {
      matchedW =
        wards.find(
          (w) =>
            cleanLocationStr(w.WARDS_NAME).includes(wClean) ||
            wClean.includes(cleanLocationStr(w.WARDS_NAME))
        ) || wards[0];
    }

    return {
      provinceId: matchedP?.PROVINCE_ID || 1,
      provinceName: matchedP?.PROVINCE_NAME || provinceName,
      districtId: matchedD?.DISTRICT_ID || 1,
      districtName: matchedD?.DISTRICT_NAME || districtName,
      wardId: matchedW?.WARDS_ID || 0,
      wardName: matchedW?.WARDS_NAME || wardName,
    };
  } catch (err) {
    console.error('Error resolving Viettel Post location IDs:', err);
    return {
      provinceId: 1,
      provinceName,
      districtId: 1,
      districtName,
      wardId: 0,
      wardName,
    };
  }
}

/**
 * Calculates shipping fee via Viettel Post getPriceAll API with fallback
 */
export async function calculateViettelPostFee(province: string, district: string, weight = 500) {
  const dbConfig = await getDBShippingConfig();
  const rawToken = dbConfig.carriers.viettelpost.token || process.env.VIETTELPOST_TOKEN || '';

  if (rawToken && dbConfig.carriers.viettelpost.enabled) {
    try {
      const token = await getViettelPostAuthToken(rawToken);

      // Determine sender location from Viettel Post inventory or fallback to originAddress
      const inventories = await getViettelPostInventories(rawToken);
      let senderProvince = 1;
      let senderDistrict = 1;

      if (inventories.length > 0 && inventories[0].provinceId) {
        senderProvince = inventories[0].provinceId;
        senderDistrict = inventories[0].districtId || 1;
      } else {
        const originLoc = await resolveViettelPostLocation(
          dbConfig.originAddress?.province || 'Hà Nội',
          dbConfig.originAddress?.district || 'Quận Nam Từ Liêm',
          dbConfig.originAddress?.ward || 'Phường Mỹ Đình 2'
        );
        senderProvince = originLoc.provinceId;
        senderDistrict = originLoc.districtId;
      }

      // Determine receiver location
      const destLoc = await resolveViettelPostLocation(province, district, '');

      const res = await fetch(`${VIETTELPOST_API_URL}/order/getPriceAll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify({
          PRODUCT_WEIGHT: Number(weight) || 500,
          PRODUCT_PRICE: 100000,
          MONEY_COLLECTION: 100000,
          SENDER_PROVINCE: senderProvince,
          SENDER_DISTRICT: senderDistrict,
          RECEIVER_PROVINCE: destLoc.provinceId,
          RECEIVER_DISTRICT: destLoc.districtId,
          PRODUCT_TYPE: 'HH',
          TYPE: 1,
        }),
      });

      const data = await res.json().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        // Preferred standard / e-commerce services
        const preferred =
          data.find((s: any) => s.MA_DV_CHINH === 'STK') ||
          data.find((s: any) => s.MA_DV_CHINH === 'NCOD') ||
          data.find((s: any) => s.MA_DV_CHINH === 'LCOD') ||
          data.find((s: any) => s.MA_DV_CHINH === 'SCN') ||
          data[0];

        if (preferred && preferred.GIA_CUOC) {
          return {
            fee: preferred.GIA_CUOC,
            serviceName: `Viettel Post (${preferred.TEN_DICHVU || 'Tiêu chuẩn'})`,
            serviceCode: preferred.MA_DV_CHINH,
            estimatedTime: preferred.THOI_GIAN || '1-3 ngày',
          };
        }
      }
    } catch (e) {
      console.error('Viettel Post Real Fee API error, using calculated fallback:', e);
    }
  }

  // Fallback calculation if token not configured or network issue
  const pNorm = (province || '').toLowerCase();
  const dNorm = (district || '').toLowerCase();
  const isHanoi = pNorm.includes('hà nội');
  const isHCM = pNorm.includes('hồ chí minh');

  let fee = dbConfig.rates.defaultOuterFee;
  let estimatedTime = '2-3 ngày';

  if (isHanoi) {
    fee = dNorm.includes('huyện') ? 26000 : dbConfig.rates.defaultInnerFee;
    estimatedTime = '1-2 ngày';
  } else if (isHCM) {
    fee = dNorm.includes('huyện') ? 42000 : 38000;
    estimatedTime = '2-3 ngày';
  } else if (pNorm.includes('đà nẵng') || pNorm.includes('hải phòng') || pNorm.includes('huế')) {
    fee = 34000;
    estimatedTime = '2-3 ngày';
  } else if (pNorm.includes('cà mau') || pNorm.includes('kiên giang') || pNorm.includes('hà giang')) {
    fee = 44000;
    estimatedTime = '3-4 ngày';
  } else {
    fee = 30000;
    estimatedTime = '2-3 ngày';
  }

  return {
    fee,
    serviceName: 'Viettel Post Tiêu Chuẩn',
    serviceCode: 'STK',
    estimatedTime,
  };
}

/**
 * Creates an official shipping waybill on Viettel Post
 */
export async function createViettelPostOrder(data: any) {
  const dbConfig = await getDBShippingConfig();
  const rawToken = dbConfig.carriers.viettelpost.token || process.env.VIETTELPOST_TOKEN || '';

  if (!rawToken) {
    throw new Error('Chưa cấu hình Token API Viettel Post trong hệ thống. Vui lòng vào Cài đặt vận chuyển để cập nhật.');
  }

  const token = await getViettelPostAuthToken(rawToken);
  if (!token) {
    throw new Error('Xác thực với Viettel Post thất bại. Vui lòng kiểm tra lại Token API.');
  }

  // 1. Fetch user's registered warehouse inventory from Viettel Post
  let inventory: any = null;
  try {
    const invRes = await fetch(`${VIETTELPOST_API_URL}/user/listInventory`, {
      headers: { Token: token },
    });
    const invData = await invRes.json().catch(() => null);
    if (Array.isArray(invData?.data) && invData.data.length > 0) {
      inventory = invData.data[0];
    }
  } catch (err) {
    console.warn('Could not fetch inventory from Viettel Post, using config fallback:', err);
  }

  const origin = dbConfig.originAddress || {
    name: 'ShopBig Store',
    phone: '0364978796',
    address: 'Số 10 Phạm Hùng, Mỹ Đình',
    ward: 'Mỹ Đình 2',
    district: 'Nam Từ Liêm',
    province: 'Hà Nội',
  };

  // 2. Resolve warehouse location IDs
  let senderProvinceId = inventory?.provinceId;
  let senderDistrictId = inventory?.districtId;
  let senderWardId = inventory?.wardsId;
  let senderName = inventory?.name || origin.name || 'ShopBig Store';
  let senderPhone = inventory?.phone || origin.phone || '0364978796';
  let senderAddress = inventory?.address || [origin.address, origin.ward, origin.district, origin.province].filter(Boolean).join(', ');
  const groupaddressId = inventory?.groupaddressId || 0;
  const cusId = inventory?.cusId || 0;

  if (!senderProvinceId || !senderDistrictId) {
    const originLoc = await resolveViettelPostLocation(
      origin.province || 'Hà Nội',
      origin.district || 'Nam Từ Liêm',
      origin.ward || 'Mỹ Đình 2'
    );
    senderProvinceId = originLoc.provinceId;
    senderDistrictId = originLoc.districtId;
    senderWardId = originLoc.wardId;
  }

  // 3. Resolve destination customer address & IDs
  const addr = resolveShippingAddress(data.customer || data);
  const destLoc = await resolveViettelPostLocation(addr.province, addr.district, addr.ward);

  // 4. Format delivery date as dd/MM/yyyy HH:mm:ss
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const deliveryDate = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours() + 1)}:00:00`;

  // 5. Build LIST_ITEM array
  const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];
  const listItem =
    rawItems.length > 0
      ? rawItems.map((it: any) => ({
          PRODUCT_NAME: String(it.name || it.productName || 'Sản phẩm').slice(0, 200),
          PRODUCT_PRICE: Number(it.price || it.variant?.price || 100000),
          PRODUCT_WEIGHT: Math.max(50, Math.floor(Number(data.weight || 500) / rawItems.length)),
          PRODUCT_QUANTITY: Number(it.quantity || 1),
        }))
      : [
          {
            PRODUCT_NAME: String(data.productName || 'Hàng hóa ShopBig').slice(0, 200),
            PRODUCT_PRICE: Number(data.totalAmount || 100000),
            PRODUCT_WEIGHT: Number(data.weight || 500),
            PRODUCT_QUANTITY: 1,
          },
        ];

  const totalWeight = Number(data.weight || 500);
  const totalAmount = Number(data.totalAmount || 100000);
  const codAmount =
    data.paymentMethod === 'cod'
      ? Number(data.cod_amount ?? data.totalAmount ?? totalAmount)
      : 0;

  // 6. Determine service: STK (tiêu chuẩn), NCOD (nhanh), LCOD (tiết kiệm)
  const orderService = data.orderService || 'STK';

  // Order Number must be unique
  const orderNumber = data.orderCode
    ? `${data.orderCode}`
    : `VTP_${Date.now().toString().slice(-8)}`;

  const payload = {
    ORDER_NUMBER: orderNumber,
    GROUPADDRESS_ID: groupaddressId,
    CUS_ID: cusId,
    DELIVERY_DATE: deliveryDate,
    SENDER_FULLNAME: senderName,
    SENDER_ADDRESS: senderAddress,
    SENDER_PHONE: senderPhone,
    SENDER_EMAIL: 'hotro@shopbig.vn',
    SENDER_WARD: senderWardId,
    SENDER_DISTRICT: senderDistrictId,
    SENDER_PROVINCE: senderProvinceId,
    RECEIVER_FULLNAME: addr.name,
    RECEIVER_ADDRESS: addr.fullAddress,
    RECEIVER_PHONE: addr.phone,
    RECEIVER_EMAIL: addr.email || 'khachhang@gmail.com',
    RECEIVER_WARD: destLoc.wardId,
    RECEIVER_DISTRICT: destLoc.districtId,
    RECEIVER_PROVINCE: destLoc.provinceId,
    PRODUCT_NAME: listItem[0].PRODUCT_NAME,
    PRODUCT_DESCRIPTION: `Đơn hàng #${data.orderCode || ''}`,
    PRODUCT_QUANTITY: listItem.reduce((acc: number, it: any) => acc + (it.PRODUCT_QUANTITY || 1), 0),
    PRODUCT_PRICE: totalAmount,
    PRODUCT_WEIGHT: totalWeight,
    PRODUCT_TYPE: 'HH',
    ORDER_PAYMENT: data.paymentMethod === 'cod' ? 2 : 1, // 2: Người nhận thanh toán cước/tiền, 1: Người gửi trả
    ORDER_SERVICE: orderService,
    ORDER_NOTE: data.notes || 'CHO XEM HÀNG KHÔNG THỬ',
    MONEY_COLLECTION: codAmount,
    LIST_ITEM: listItem,
  };

  const res = await fetch(`${VIETTELPOST_API_URL}/order/createOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Token: token,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let result: any = null;
  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    result = null;
  }

  if (result && result.status === 200 && result.data?.ORDER_NUMBER) {
    return {
      success: true,
      trackingCode: String(result.data.ORDER_NUMBER),
      orderCode: orderNumber,
      fee: result.data.MONEY_TOTAL || 21000,
      moneyCollection: result.data.MONEY_COLLECTION,
      serviceName: 'Viettel Post Tiêu Chuẩn',
      raw: result.data,
    };
  }

  // If order number already exists, retry with timestamp suffix
  if (result?.message && (result.message.includes('tồn tại') || result.message.includes('trùng'))) {
    payload.ORDER_NUMBER = `${orderNumber}_${Date.now().toString().slice(-4)}`;
    const retryRes = await fetch(`${VIETTELPOST_API_URL}/order/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Token: token,
      },
      body: JSON.stringify(payload),
    });
    const retryText = await retryRes.text();
    let retryResult: any = null;
    try {
      retryResult = retryText ? JSON.parse(retryText) : null;
    } catch {}

    if (retryResult && retryResult.status === 200 && retryResult.data?.ORDER_NUMBER) {
      return {
        success: true,
        trackingCode: String(retryResult.data.ORDER_NUMBER),
        orderCode: payload.ORDER_NUMBER,
        fee: retryResult.data.MONEY_TOTAL || 21000,
        moneyCollection: retryResult.data.MONEY_COLLECTION,
        serviceName: 'Viettel Post Tiêu Chuẩn',
        raw: retryResult.data,
      };
    }
  }

  const errorMessage =
    result?.message ||
    (res.status !== 200 ? `Máy chủ Viettel Post trả mã lỗi HTTP ${res.status}` : 'Lỗi tạo vận đơn Viettel Post');
  console.error('Viettel Post Create Order error:', errorMessage, 'Payload:', JSON.stringify(payload));
  throw new Error(`Viettel Post: ${errorMessage}`);
}

/**
 * Cancels a Viettel Post order using UpdateOrder with TYPE: 4
 */
export async function cancelViettelPostOrder(trackingCode: string, note = 'Hủy đơn hàng') {
  const dbConfig = await getDBShippingConfig();
  const rawToken = dbConfig.carriers.viettelpost.token || process.env.VIETTELPOST_TOKEN || '';

  if (!rawToken || !trackingCode) {
    return { success: false, message: 'Thiếu thông tin mã vận đơn hoặc chưa cấu hình Token Viettel Post' };
  }

  const cleanCode = trackingCode.trim();

  try {
    const token = await getViettelPostAuthToken(rawToken);

    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await fetch(`${VIETTELPOST_API_URL}/order/UpdateOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Token: token,
        },
        body: JSON.stringify({
          TYPE: 4,
          ORDER_NUMBER: cleanCode,
          NOTE: note || 'Hủy đơn hàng',
        }),
      });
      const data = await res.json().catch(() => null);

      if (data?.status === 200) {
        return {
          success: true,
          message: data.message || 'Hủy đơn hàng Viettel Post thành công',
        };
      }

      const msg = (data?.message || '').toLowerCase();
      // If Viettel Post says the order is already cancelled (e.g., "Đơn hàng đã hủy!")
      if (msg.includes('đã hủy') || msg.includes('da huy') || msg.includes('trước đó')) {
        return {
          success: true,
          message: 'Đơn hàng đã được hủy trên hệ thống Viettel Post',
        };
      }

      // If Viettel Post DB is still indexing a brand new order, wait and retry
      if (attempt < 4 && (data?.status === 203 || res.status === 203)) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        continue;
      }

      // Double-check order status via detail-v2 before returning failure
      try {
        const detailRes = await fetch(`${VIETTELPOST_API_URL}/order/detail-v2?o=${cleanCode}`, {
          headers: { Token: token },
        });
        const detailData = await detailRes.json().catch(() => null);
        if (detailData?.data?.ORDER_STATUS === 107) {
          return {
            success: true,
            message: 'Đơn hàng đã được hủy thành công trên Viettel Post (Mã trạng thái: 107)',
          };
        }
      } catch {}

      return {
        success: false,
        message: data?.message || `Lỗi hủy vận đơn Viettel Post (Mã phản hồi: ${data?.status || res.status})`,
      };
    }
  } catch (err: any) {
    console.error('Viettel Post cancel order error:', err);
    return { success: false, message: err.message || 'Lỗi kết nối khi gửi yêu cầu hủy vận đơn' };
  }

  return { success: false, message: 'Không thể hủy đơn hàng trên Viettel Post sau nhiều lần thử' };
}

/**
 * Tracks an order status from Viettel Post live API (detail-v2)
 */
export async function trackViettelPostOrder(trackingCode: string) {
  if (!trackingCode) return null;
  const cleanCode = trackingCode.trim();
  const publicUrl = `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang?orderCode=${encodeURIComponent(cleanCode)}`;

  try {
    const dbConfig = await getDBShippingConfig();
    const rawToken = dbConfig.carriers.viettelpost.token || process.env.VIETTELPOST_TOKEN || '';
    if (rawToken) {
      const token = await getViettelPostAuthToken(rawToken);
      const res = await fetch(`${VIETTELPOST_API_URL}/order/detail-v2?o=${cleanCode}`, {
        headers: { Token: token },
      });
      const data = await res.json().catch(() => null);

      if (data && data.status === 200 && data.data) {
        const d = data.data;
        const statusCode = Number(d.ORDER_STATUS);
        const statusMap: Record<number, { name: string; desc: string }> = {
          100: { name: 'Chờ tiếp nhận', desc: 'Đơn hàng mới tạo trên Viettel Post, chờ bưu cục phân công' },
          101: { name: 'Đã tiếp nhận', desc: 'Viettel Post đã tiếp nhận thông tin đơn hàng' },
          102: { name: 'Đang lấy hàng', desc: 'Bưu tá Viettel Post đang trên đường tới lấy hàng' },
          103: { name: 'Đã lấy hàng', desc: 'Bưu tá đã lấy hàng thành công, nhập kho gửi' },
          104: { name: 'Đang vận chuyển', desc: 'Kiện hàng đang được luân chuyển giữa các bưu cục' },
          105: { name: 'Đang phát hàng', desc: 'Bưu tá đang đi giao hàng tới người nhận' },
          106: { name: 'Giao thành công', desc: 'Đã giao hàng thành công tới người nhận' },
          107: { name: 'Đã hủy đơn hàng', desc: 'Đơn hàng đã được hủy trên hệ thống Viettel Post' },
          200: { name: 'Nhận từ bưu tá gom', desc: 'Hàng đã được chuyển về kho tập kết Viettel Post' },
          201: { name: 'Hủy đơn hàng', desc: 'Đơn hàng bị hủy do duyệt hoặc khách hủy' },
          500: { name: 'Đang giao hàng', desc: 'Bưu tá đang phát hàng tận nơi' },
          501: { name: 'Giao thành công', desc: 'Giao hàng thành công - Chờ đối soát thu tiền COD' },
          502: { name: 'Chuyển hoàn', desc: 'Đơn hàng chuyển hoàn về cho người gửi' },
          504: { name: 'Giao không thành công', desc: 'Giao hàng thất bại, chờ bưu cục phát lại' },
          507: { name: 'Đã hủy', desc: 'Đơn hàng đã hủy theo yêu cầu người gửi' },
        };

        const currentStatus = statusMap[statusCode] || {
          name: d.ORDER_STATUS_NAME || `Trạng thái VTP (${statusCode})`,
          desc: d.NOTE || 'Đang cập nhật từ Viettel Post',
        };

        const logs = [
          {
            time: d.ORDER_STATUSDATE || d.ORDER_SYSTEMDATE || new Date().toLocaleString('vi-VN'),
            title: currentStatus.name,
            desc: currentStatus.desc,
            location: d.LOCAL_ADDRESS || 'Bưu cục Viettel Post',
            status_id: statusCode,
          },
        ];

        return {
          success: true,
          trackingCode: cleanCode,
          carrierName: 'Viettel Post',
          carrierCode: 'viettelpost',
          orderStatus: statusCode,
          statusName: currentStatus.name,
          publicTrackingUrl: publicUrl,
          logs,
          raw: d,
        };
      }
    }
  } catch (err) {
    console.error('Lỗi khi tra cứu đơn Viettel Post detail-v2:', err);
  }

  return {
    success: true,
    trackingCode: cleanCode,
    carrierName: 'Viettel Post',
    publicTrackingUrl: publicUrl,
  };
}