import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEMO_TENANT_ID } from '@/lib/config/constants';
import { isSupabaseConfigured } from '@/lib/config/env';
import { sendEmail } from '@/lib/integrations/email';
import { demoLeadSchema } from '@/lib/leads/schema';
import { allowPublicRequest } from '@/lib/security/public-rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const productionFlyerOrigin = 'https://www.novacrm.click';

function allowedOrigin(origin: string | null) {
  const configured = process.env.FLYER_PUBLIC_ORIGIN?.trim().replace(/\/$/, '');
  const allowed = configured || productionFlyerOrigin;
  if (origin === allowed) return origin;
  if (process.env.NODE_ENV !== 'production' && origin?.startsWith('http://localhost:')) return origin;
  return null;
}

function withCors(response: NextResponse, origin: string | null) {
  const resolved = allowedOrigin(origin);
  if (resolved) {
    response.headers.set('Access-Control-Allow-Origin', resolved);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

function json(
  data: unknown,
  error: string | null,
  status: number,
  origin: string | null,
) {
  return withCors(NextResponse.json({ data, error }, { status }), origin);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  );
}

function requesterIp(request: NextRequest) {
  return (
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

function leadTenantId() {
  const configured = process.env.PUBLIC_LEAD_TENANT_ID || process.env.WEBHOOK_TENANT_ID;
  if (configured) return configured;
  return process.env.NODE_ENV === 'production' ? null : DEMO_TENANT_ID;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = withCors(new NextResponse(null, { status: 204 }), origin);
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('Access-Control-Max-Age', '600');
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const rate = await allowPublicRequest('demo-lead', requesterIp(request));
  if (!rate.allowed) return json(null, 'Too many requests. Please try again later.', 429, origin);

  const contentType = request.headers.get('content-type') ?? '';
  let payload: Record<string, unknown> | null = null;
  if (contentType.includes('application/json')) {
    payload = await request.json().catch(() => null);
  } else {
    const formData = await request.formData().catch(() => null);
    if (formData) {
      payload = {
        ...Object.fromEntries(formData.entries()),
        privacyConsent: formData.get('privacyConsent') === 'true',
        marketingConsent: formData.get('marketingConsent') === 'true',
      };
    }
  }
  const parsed = demoLeadSchema.safeParse(payload);
  if (!parsed.success) {
    return json(null, parsed.error.issues[0]?.message ?? 'Please check the form fields.', 400, origin);
  }

  if (parsed.data.website) {
    return json({ accepted: true }, null, 201, origin);
  }

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(null, 'Lead capture is not configured. Please use the sales email.', 503, origin);
  }

  const tenantId = leadTenantId();
  if (!tenantId) return json(null, 'Lead capture tenant is not configured.', 503, origin);
  if (!z.string().uuid().safeParse(tenantId).success) {
    return json(null, 'Lead capture tenant is invalid.', 503, origin);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('demo_leads')
      .insert({
        tenant_id: tenantId,
        full_name: parsed.data.fullName,
        company_name: parsed.data.companyName,
        job_title: parsed.data.jobTitle || null,
        employee_count: parsed.data.employeeCount || null,
        phone: parsed.data.phone || null,
        email: parsed.data.email,
        interest: parsed.data.interest,
        message: parsed.data.message || null,
        locale: parsed.data.locale,
        source: parsed.data.source,
        utm_source: parsed.data.utmSource || null,
        utm_medium: parsed.data.utmMedium || null,
        utm_campaign: parsed.data.utmCampaign || null,
        privacy_consent: parsed.data.privacyConsent,
        marketing_consent: parsed.data.marketingConsent,
      })
      .select('id')
      .single();

    if (error || !data) {
      return json(null, error?.message ?? 'Unable to save your request.', 500, origin);
    }

    const notificationRecipient = process.env.LEAD_NOTIFICATION_EMAIL || 'support@novacrm.app';
    const emailResult = await sendEmail(
      notificationRecipient,
      `New NovaCRM demo lead · ${parsed.data.companyName}`,
      `<h2>New NovaCRM demo lead</h2>
        <p><strong>Name:</strong> ${escapeHtml(parsed.data.fullName)}</p>
        <p><strong>Company:</strong> ${escapeHtml(parsed.data.companyName)}</p>
        <p><strong>Role:</strong> ${escapeHtml(parsed.data.jobTitle || 'Not provided')}</p>
        <p><strong>Team size:</strong> ${escapeHtml(parsed.data.employeeCount || 'Not provided')}</p>
        <p><strong>Phone:</strong> ${escapeHtml(parsed.data.phone || 'Not provided')}</p>
        <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
        <p><strong>Interest:</strong> ${escapeHtml(parsed.data.interest)}</p>
        <p><strong>Message:</strong><br />${escapeHtml(parsed.data.message || 'Not provided').replace(/\n/g, '<br />')}</p>
        <p><strong>Source:</strong> ${escapeHtml(parsed.data.source)}</p>`,
    );
    if (!emailResult.ok) console.warn('[public-lead] notification failed:', emailResult.error);

    return json({ id: data.id }, null, 201, origin);
  } catch (caught) {
    return json(null, caught instanceof Error ? caught.message : 'Unable to save your request.', 500, origin);
  }
}
