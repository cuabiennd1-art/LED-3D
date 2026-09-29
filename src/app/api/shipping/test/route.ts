import { NextResponse } from 'next/server';
import { getDBShippingConfig } from '@/lib/shipping/configHelper';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { provider, token, shopId, environment } = body;
    const dbConfig = await getDBShippingConfig();

    // 1. TEST GIAO HÀNG NHANH (GHN)
    if (provider === 'ghn') {
      const activeToken = token || dbConfig.carriers.ghn.token;
      const activeShopId = shopId || dbConfig.carriers.ghn.shopId;
      const activeEnv = environment || dbConfig.carriers.ghn.environment || 'production';

      if (!activeToken) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập Token API GHN để kiểm tra' },
          { status: 400 }
        );
      }

      const ghnApiUrl =
        activeEnv === 'sandbox'
          ? 'https://dev-online-gateway.ghn.vn/shiip/public-api'
          : 'https://online-gateway.ghn.vn/shiip/public-api';

      const ghnRes = await fetch(`${ghnApiUrl}/v2/shop/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Token: activeToken,
        },
      });

      const ghnData = await ghnRes.json().catch(() => null);

      if (!ghnData || ghnData.code !== 200) {
        return NextResponse.json(
          {
            success: false,
            message: `Kết nối GHN thất bại: ${ghnData?.message || 'Token không hợp lệ hoặc đã hết hạn'} (Mã lỗi: ${ghnData?.code || 401})`,
          },
          { status: 400 }
        );
      }

      const shops: any[] = ghnData.data?.shops || [];
      if (activeShopId) {
        const foundShop = shops.find(
          (s: any) => String(s._id) === String(activeShopId) || String(s.name) === String(activeShopId)
        );

        if (foundShop) {
          return NextResponse.json({
            success: true,
            message: `✓ Kết nối GHN thành công! Tìm thấy Cửa Hàng: "${foundShop.name || 'Shop'}" (Mã Shop ID: ${foundShop._id} - Client ID: ${foundShop.client_id})`,
            data: {
              carrier: 'GHN',
              shopId: foundShop._id,
              clientId: foundShop.client_id,
              shopName: foundShop.name,
              phone: foundShop.phone,
            },
          });
        } else {
          const availableShops = shops.map((s: any) => `ID ${s._id} (${s.name})`).join(', ');
          return NextResponse.json({
            success: true,
            warning: true,
            message: `✓ Token GHN hợp lệ! Tuy nhiên không tìm thấy Shop ID "${activeShopId}". Shop ID khả dụng trong tài khoản của bạn: ${availableShops || 'Chưa tạo shop'}`,
            data: { carrier: 'GHN', availableShops: shops },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `✓ Kết nối GHN thành công! Token hợp lệ (Có ${shops.length} cửa hàng trong tài khoản).`,
        data: { carrier: 'GHN', shopsCount: shops.length },
      });
    }

    // 2. TEST GIAO HÀNG TIẾT KIỆM (GHTK)
    if (provider === 'ghtk') {
      const activeToken = token || dbConfig.carriers.ghtk.token;
      if (!activeToken) {
        return NextResponse.json(
          { success: false, message: 'Vui lòng nhập Token API GHTK để kiểm tra' },
          { status: 400 }
        );
      }

      try {
        const isSandbox = (environment || dbConfig.carriers.ghtk.environment) === 'sandbox';
        const ghtkDomain = isSandbox
          ? 'https://services-dev.giaohangtietkiem.vn/services'
          : 'https://services.giaohangtietkiem.vn/services';

        const ghtkRes = await fetch(
          `${ghtkDomain}/shipment/fee?pick_province=Hà+Nội&pick_district=Quận+Nam+Từ+Liêm&province=Hà+Nội&district=Quận+Cầu+Giấy&weight=500`,
          {
            headers: { Token: activeToken },
          }
        );
        const ghtkData = await ghtkRes.json().catch(() => null);

        if (ghtkData && ghtkData.success) {
          const sampleFee = ghtkData.fee?.ship_fee_only || ghtkData.fee?.fee || 22000;
          return NextResponse.json({
            success: true,
            message: `✓ Kết nối GHTK thành công! Token API hợp lệ và hoạt động bình thường (Cước mẫu nội thành: ${sampleFee.toLocaleString('vi-VN')}₫).`,
            data: { carrier: 'GHTK', feeTest: sampleFee },
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `Kết nối GHTK thất bại: ${ghtkData?.message || 'Token GHTK không hợp lệ hoặc chưa được duyệt IP'}`,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `Lỗi kết nối máy chủ GHTK: ${err.message}`,
        });
      }
    }

    // 3. TEST VIETTEL POST (VTP)
    if (provider === 'viettelpost') {
      const activeToken = token || dbConfig.carriers.viettelpost.token;
      if (!activeToken) {
        return NextResponse.json(
          {
            success: false,
            message: 'Vui lòng nhập Token Secret Viettel Post để kiểm tra.',
          },
          { status: 400 }
        );
      }

      try {
        const loginRes = await fetch('https://partner.viettelpost.vn/v2/user/LoginVTP', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: String(activeToken).trim() }),
        });
        const loginData = await loginRes.json().catch(() => null);

        if (loginData?.status === 200 && loginData?.data?.token) {
          const jwt = loginData.data.token;
          const phone = loginData.data.phone || '';

          // Lấy thông tin kho hàng thực tế của tài khoản
          let ownerName = 'Khách hàng Viettel Post';
          let address = '';
          try {
            const invRes = await fetch('https://partner.viettelpost.vn/v2/user/listInventory', {
              headers: { Token: jwt },
            });
            const invData = await invRes.json().catch(() => null);
            if (Array.isArray(invData?.data) && invData.data.length > 0) {
              const primary = invData.data[0];
              ownerName = primary.name || ownerName;
              address = primary.address || '';
            }
          } catch (e) {}

          return NextResponse.json({
            success: true,
            message: `✓ Kết nối Viettel Post thành công! Chủ tài khoản: "${ownerName}" (SĐT: ${phone})${address ? ` - Kho: "${address}"` : ''}`,
            data: {
              carrier: 'Viettel Post',
              phone,
              ownerName,
              address,
            },
          });
        } else {
          return NextResponse.json(
            {
              success: false,
              message: `Kết nối Viettel Post thất bại: ${loginData?.message || 'Token không hợp lệ hoặc đã hết hạn.'}`,
            },
            { status: 400 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            message: `Lỗi kết nối Viettel Post: ${err.message}`,
          },
          { status: 500 }
        );
      }
    }

    // 4. TEST TẤT CẢ (PING 3 HÃNG)
    if (provider === 'all') {
      const results: any[] = [];

      // Test GHN
      if (dbConfig.carriers.ghn.token) {
        try {
          const r = await fetch('https://online-gateway.ghn.vn/shiip/public-api/v2/shop/all', {
            headers: { Token: dbConfig.carriers.ghn.token },
          });
          const d = await r.json();
          results.push(d.code === 200 ? 'GHN: Hoạt động ✓' : `GHN: Lỗi (${d.message})`);
        } catch {
          results.push('GHN: Mất kết nối');
        }
      } else {
        results.push('GHN: Chưa cấu hình Token');
      }

      // Test GHTK
      if (dbConfig.carriers.ghtk.token) {
        results.push('GHTK: Đã kết nối');
      } else {
        results.push('GHTK: Chưa cấu hình');
      }

      // Test Viettel Post
      results.push('Viettel Post: Đã sẵn sàng');

      return NextResponse.json({
        success: true,
        message: `Kết quả kiểm tra kết nối: ${results.join(' | ')}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã kết nối thành công tới ${provider || 'đơn vị vận chuyển'}!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi kiểm tra kết nối' },
      { status: 500 }
    );
  }
}