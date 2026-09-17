// Field messages shared by the create forms (Create Shipment 11:1497,
// Warehouse 15:1763). A present-but-malformed value gets a message that names
// the problem rather than the "required" copy used for empty fields.

export const requiredMessage = 'Bu alan zorunludur.';
export const chooseMessage = 'Bir seçim yapın.';

export function phoneError(value: string): string | undefined {
  if (value.trim() === '') return requiredMessage;
  return value.replaceAll(/\D/gu, '').length < 10 ? 'Geçerli bir telefon numarası girin.' : undefined;
}

export function emailError(value: string): string | undefined {
  if (value.trim() === '') return requiredMessage;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim()) ? undefined : 'Geçerli bir e-posta adresi girin.';
}
