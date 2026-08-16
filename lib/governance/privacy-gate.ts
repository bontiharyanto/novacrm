import { redirect } from 'next/navigation';
import { getPrivacySettings } from '@/lib/governance/actions';

export async function requirePublishedPrivacy(fallback = '/portal') {
  const settings = await getPrivacySettings();
  if (!settings?.isPublished) {
    redirect(fallback);
  }
  return settings;
}
