export type PdpContact = {
  controllerName?: string | null;
  controllerAddress?: string | null;
  dpoName?: string | null;
  dpoEmail?: string | null;
  dpoPhone?: string | null;
};

export const PDP_DEFAULTS = {
  controllerName: 'NovaCRM',
  controllerAddress: 'Jakarta HQ, Indonesia',
  dpoName: 'Data Protection Officer',
  dpoEmail: 'dpo@novacrm.app',
  dpoPhone: '—',
} as const;

export function fillPdp(text: string, contact: PdpContact = {}) {
  return text
    .replaceAll('{{controller}}', contact.controllerName?.trim() || PDP_DEFAULTS.controllerName)
    .replaceAll('{{address}}', contact.controllerAddress?.trim() || PDP_DEFAULTS.controllerAddress)
    .replaceAll('{{dpoName}}', contact.dpoName?.trim() || PDP_DEFAULTS.dpoName)
    .replaceAll('{{dpoEmail}}', contact.dpoEmail?.trim() || PDP_DEFAULTS.dpoEmail)
    .replaceAll('{{dpoPhone}}', contact.dpoPhone?.trim() || PDP_DEFAULTS.dpoPhone);
}
