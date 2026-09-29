import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Setting from '@/models/Setting';

export const dynamic = 'force-dynamic';

export interface IPaymentConfig {
  codEnabled: boolean;
  bankTransferEnabled: boolean;
  bankName: string;
  accountNumber: string;
  accountName: string;
  sepayToken: string;
}

const defaultPaymentConfig: IPaymentConfig = {
  codEnabled: true,
  bankTransferEnabled: true,
  bankName: process.env.NEXT_PUBLIC_VIETQR_BANK || 'MBBank',
  accountNumber: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || '0528438642',
  accountName: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || 'LE VAN AN',
  sepayToken: process.env.SEPAY_API_KEY || '',
};

export async function GET() {
  try {
    await connectToDatabase();
    const setting = await Setting.findOne({ key: 'payment_config' });

    if (!setting || !setting.value) {
      return NextResponse.json({
        success: true,
        data: defaultPaymentConfig,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...defaultPaymentConfig,
        ...setting.value,
        codEnabled: setting.value.codEnabled !== undefined ? !!setting.value.codEnabled : true,
        bankTransferEnabled: setting.value.bankTransferEnabled !== undefined ? !!setting.value.bankTransferEnabled : true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi tải cấu hình thanh toán' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { codEnabled, bankTransferEnabled, bankName, accountNumber, accountName, sepayToken } = body;

    const existing = await Setting.findOne({ key: 'payment_config' });
    const currentVal = existing?.value || defaultPaymentConfig;

    const updatedConfig: IPaymentConfig = {
      codEnabled: codEnabled !== undefined ? !!codEnabled : (currentVal.codEnabled ?? true),
      bankTransferEnabled: bankTransferEnabled !== undefined ? !!bankTransferEnabled : (currentVal.bankTransferEnabled ?? true),
      bankName: bankName || currentVal.bankName || 'MBBank',
      accountNumber: String(accountNumber !== undefined ? accountNumber : currentVal.accountNumber || '').trim(),
      accountName: String(accountName !== undefined ? accountName : currentVal.accountName || '').trim().toUpperCase(),
      sepayToken: sepayToken !== undefined ? sepayToken : currentVal.sepayToken || '',
    };

    const setting = await Setting.findOneAndUpdate(
      { key: 'payment_config' },
      { $set: { value: updatedConfig } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cấu hình phương thức thanh toán và tài khoản nhận tiền thành công!',
      data: setting.value,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lưu cấu hình thanh toán' },
      { status: 500 }
    );
  }
}
