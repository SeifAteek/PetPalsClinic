import { supabase } from '../supabaseClient';

/**
 * Insert a receipt row after a payment is confirmed.
 * The DB trigger `receipts_set_number` populates `receipt_number` automatically.
 *
 * @param {Object} params
 * @param {'clinic_appointment'|'clinic_billing'} params.source
 * @param {string} params.clinicId
 * @param {string} [params.invoiceId]
 * @param {string} [params.appointmentId]
 * @param {string} [params.clientId]
 * @param {string} [params.guestClientName]
 * @param {string} [params.paymentMethod]            'Card' | 'Cash' | etc.
 * @param {'Paid'|'Pending'|'Refunded'} [params.paymentStatus]
 * @param {number} [params.subtotal]
 * @param {number} [params.discount]
 * @param {number} params.totalAmount
 * @param {Object} [params.itemsSnapshot]            JSON snapshot of line items
 * @param {string} [params.issuedBy]                 user_id of the cashier
 * @param {string} [params.notes]
 * @returns {Promise<Object|null>} The inserted receipt row, or null on failure.
 */
export async function createClinicReceipt({
    source,
    clinicId,
    invoiceId = null,
    appointmentId = null,
    clientId = null,
    guestClientName = null,
    paymentMethod = null,
    paymentStatus = 'Paid',
    subtotal = null,
    discount = 0,
    totalAmount,
    itemsSnapshot = null,
    issuedBy = null,
    notes = null,
}) {
    if (!clinicId || totalAmount == null) {
        console.warn('createClinicReceipt: missing clinicId or totalAmount, skipping.');
        return null;
    }

    const { data, error } = await supabase
        .from('receipts')
        .insert({
            source,
            clinic_id: clinicId,
            invoice_id: invoiceId,
            appointment_id: appointmentId,
            client_id: clientId,
            guest_client_name: guestClientName,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
            subtotal,
            discount,
            total_amount: totalAmount,
            items_snapshot: itemsSnapshot,
            issued_by: issuedBy,
            notes,
        })
        .select()
        .single();

    if (error) {
        console.error('Failed to save receipt:', error);
        return null;
    }
    return data;
}
