'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function AssetQr({ assetTag, name }: { assetTag: string; name: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    const payload = JSON.stringify({ tag: assetTag, name });
    void QRCode.toDataURL(payload, { width: 220, margin: 1, color: { dark: '#ffffff', light: '#09090b' } }).then(setDataUrl);
  }, [assetTag, name]);

  function download() {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${assetTag}.png`;
    link.click();
  }

  return (
    <div className="space-y-3">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR ${assetTag}`} className="h-40 w-40 rounded-lg border border-zinc-800" />
      ) : (
        <div className="h-40 w-40 rounded-lg border border-zinc-800 bg-zinc-950" />
      )}
      <button type="button" onClick={download} className="text-xs text-blue-300 hover:text-blue-200">
        Download QR
      </button>
    </div>
  );
}
